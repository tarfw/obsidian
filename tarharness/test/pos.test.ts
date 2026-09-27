import { createClient } from '@libsql/client';
import { Effect } from 'effect';
import { afterEach, describe, expect, it } from 'vitest';
import { WORKSPACE_SCHEMA } from '../src/db/schema.ts';
import { executeGateway } from '../src/gateway/actions.ts';
import { posSummary, readPos, readPosInbox } from '../src/pos/store.ts';
import { readInboxSource } from '../src/space/view.ts';
import type { AccessContext } from '../src/types.ts';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const clients: ReturnType<typeof createClient>[] = [];
afterEach(() => {
  clients.splice(0).forEach((client) => client.close());
});
const access: AccessContext = {
  identity: { id: 'owner', email: 'owner@example.com', name: 'Owner' },
  workspace: { id: 'ws', name: 'Shop', slug: 'shop', mode: 'work', databaseName: 'shop', databaseHost: 'shop', state: 'active' },
  member: { workspaceId: 'ws', userId: 'owner', role: 'owner', state: 'active' },
};
async function fixture() {
  // The native libsql driver retains transaction handles until process exit on Windows.
  const directory = mkdtempSync(join(tmpdir(), 'tar-pos-test-'));
  const client = createClient({ url: pathToFileURL(join(directory, 'workspace.db')).href }); clients.push(client);
  for (const sql of WORKSPACE_SCHEMA) await client.execute(sql);
  const run = (actionId: string, input: Record<string, unknown>, key: string = crypto.randomUUID(), context = access) =>
    Effect.runPromise(executeGateway(client, context, { actionId, input, idempotencyKey: key }));
  await run('pos.setup', { name: 'Shop', currency: 'INR', timezone: 'Asia/Kolkata', location: 'Main' });
  const result = await run('pos.product.save', { title: 'Tea', price: 1001, stock: 5, taxBps: 500, lowStock: 2, barcode: 'TEA' });
  const product = result.product as { id: string; version: number };
  await run('pos.register.open', { opening: 10000 });
  const sale = { items: [{ productId: product.id, quantity: 2, version: product.version }], method: 'cash', discountBps: 1000, expectedTotal: 1892, tendered: 2000 };
  return { client, run, product, sale };
}
describe('POS ledger', { timeout: 20000 }, () => {
  it('persists open carts for the Inbox, advances item work, then pays the same order', async () => {
    const { client, run, sale } = await fixture();
    const input = { items: sale.items, discountBps: sale.discountBps, customerId: '', orderType: 'dine-in', table: '7', draftKey: 'device-sale-1' };
    const draft = await run('pos.order.save', input);
    const retry = await run('pos.order.save', input);
    const order = retry.order as { id: string; version: number; state: string; data: { lines: { productId: string; status: string }[] } };
    expect((draft.order as { id: string }).id).toBe(order.id);
    expect(order).toMatchObject({ state: 'open', data: { paymentStatus: 'unpaid', table: '7', orderType: 'dine-in' } });
    expect((await readPosInbox(client)).orders).toHaveLength(1);
    await expect(run('pos.order.item.update', { orderId: order.id, version: order.version, productId: order.data.lines[0].productId, status: 'preparing' })).rejects.toThrow('accepted');
    const accepted = (await run('pos.order.accept', { orderId: order.id, version: order.version })).order as typeof order;
    const advanced = await run('pos.order.item.update', { orderId: order.id, version: accepted.version, productId: order.data.lines[0].productId, status: 'preparing' });
    expect((advanced.order as { data: { lines: { status: string }[] } }).data.lines[0].status).toBe('preparing');
    const paid = await run('pos.checkout', { ...sale, orderId: order.id });
    expect((paid.order as { id: string; state: string; data: { paymentStatus: string } }).id).toBe(order.id);
    expect((paid.order as { state: string; data: { paymentStatus: string } }).state).toBe('paid');
    expect((await readPosInbox(client)).orders).toHaveLength(1);
    const ready = await run('pos.order.item.update', { orderId: order.id, version: (paid.order as { version: number }).version, productId: order.data.lines[0].productId, status: 'ready' });
    expect((ready.order as { data: { lines: { status: string }[] } }).data.lines[0].status).toBe('ready');
    expect((await readPosInbox(client)).orders).toHaveLength(1);
    await run('pos.order.handoff', { orderId: order.id, version: (ready.order as { version: number }).version });
    expect((await readPosInbox(client)).orders).toHaveLength(0);
  });
  it('commits server-priced sale, stock, receipt and cash balance exactly once', async () => {
    const { client, run, product, sale } = await fixture();
    const first = await run('pos.checkout', sale, 'sale-once');
    expect(await run('pos.checkout', sale, 'sale-once')).toEqual(first);
    expect((first.posting as { data: { debit: number; credit: number; lines: { account: string; credit?: number }[] } }).data).toMatchObject({ debit: 1892, credit: 1892 });
    const order = first.order as { data: Record<string, unknown> };
    expect(order.data).toMatchObject({ subtotal: 2002, discount: 200, tax: 90, total: 1892, change: 108 });
    const stock = await client.execute({ sql: 'SELECT data FROM records WHERE id=?', args: [product.id] });
    expect(JSON.parse(String(stock.rows[0].data)).stock).toBe(3);
    const overview = await readPos(client, access, 'overview');
    expect(overview.register).toMatchObject({ expected: 11892 });
    expect(await posSummary(client)).toMatchObject({ sales: 1892, orders: 1, lowStock: 0 });
  });
  it('rolls back a bad total or stock shortage without payments', async () => {
    const { client, run, sale } = await fixture();
    await expect(run('pos.checkout', { ...sale, expectedTotal: 1 })).rejects.toThrow('Total changed');
    await expect(run('pos.checkout', { ...sale, items: [{ ...sale.items[0], quantity: 6 }] })).rejects.toThrow('Not enough stock');
    expect((await client.execute("SELECT id FROM records WHERE type IN ('pos.order','pos.payment')")).rows).toHaveLength(0);
  });
  it('rejects stale products and reuse of a payment key with changed input', async () => {
    const { run, sale, product } = await fixture();
    await run('pos.checkout', sale, 'fixed-key');
    await expect(run('pos.checkout', { ...sale, tendered: 3000 }, 'fixed-key')).rejects.toThrow('different input');
    await expect(run('pos.checkout', { ...sale, items: [{ productId: product.id, quantity: 1, version: product.version }] })).rejects.toThrow('changed');
  });
  it('records UPI separately from cash and rejects duplicate references', async () => {
    const { client, run, sale } = await fixture();
    const upi = { ...sale, method: 'upi', reference: 'UTR-123', received: true };
    await expect(run('pos.checkout', { ...upi, received: false })).rejects.toThrow('Confirm UPI');
    await run('pos.checkout', upi);
    expect((await readPos(client, access, 'overview')).register).toMatchObject({ expected: 10000 });
    await expect(run('pos.checkout', upi)).rejects.toThrow('already recorded');
  });
  it('returns a sale once, restores stock and reconciles the register', async () => {
    const { client, run, sale, product } = await fixture();
    const { order } = await run('pos.checkout', sale) as { order: { id: string } };
    await run('pos.refund', { orderId: order.id, reason: 'Wrong item', restock: true, returned: true });
    const postings = await client.execute("SELECT data FROM records WHERE type='posting'");
    expect(postings.rows).toHaveLength(2);
    expect(postings.rows.map((row) => JSON.parse(String(row.data)).debit)).toEqual([1892, 1892]);
    await expect(run('pos.refund', { orderId: order.id, reason: 'Again', returned: true })).rejects.toThrow('already been returned');
    const stock = await client.execute({ sql: 'SELECT data FROM records WHERE id=?', args: [product.id] });
    expect(JSON.parse(String(stock.rows[0].data)).stock).toBe(5);
    const overview = await readPos(client, access, 'overview');
    const session = overview.register as { id: string };
    const closed = await run('pos.register.close', { registerId: session.id, counted: 9900 });
    expect(closed.register).toMatchObject({ state: 'closed', data: { expected: 10000, difference: -100 } });
    await expect(run('pos.checkout', sale)).rejects.toThrow('Open the register');
  });
  it('protects managed retail records and admin-only actions', async () => {
    const { run, product } = await fixture();
    const member: AccessContext = { ...access, member: { ...access.member, role: 'member' } };
    await expect(run('pos.product.save', {}, undefined, member)).rejects.toThrow();
    await expect(run('record.update', { recordId: product.id, baseVersion: 1, title: 'Tampered' }, undefined, member)).rejects.toThrow();
    await expect(run('record.create', { type: 'pos.product', title: 'Bypass' })).rejects.toThrow();
    await expect(run('pos.setup', { name: 'Shop', currency: 'USD', timezone: 'UTC' })).rejects.toThrow('Currency cannot change');
  });
  it('stores compact catalog fields and enforces unique SKUs', async () => {
    const { client, run } = await fixture();
    await run('pos.product.save', { title: 'Coffee', price: 2500, cost: 1400, stock: 8, taxBps: 500, lowStock: 3, sku: 'COF-250', barcode: '890000000001', category: 'Beverages', brand: 'TAR', unit: 'bag', supplier: 'Local roaster', shortDescription: 'Medium roast coffee.' });
    const products = await readPos(client, access, 'products', 'Coffee') as { items: { data: Record<string, unknown> }[] };
    expect(products.items[0].data).toMatchObject({ cost: 1400, sku: 'COF-250', category: 'Beverages', brand: 'TAR', unit: 'bag', supplier: 'Local roaster' });
    await expect(run('pos.product.save', { title: 'Duplicate', price: 100, stock: 1, taxBps: 0, lowStock: 0, sku: 'COF-250' })).rejects.toThrow('SKU already');
  });
  it('allocates partial refund rounding without over-refunding', async () => {
    const { client, run, sale } = await fixture();
    const { order } = await run('pos.checkout', sale) as { order: { id: string } };
    const input = { orderId: order.id, reason: 'One item', returned: true, restock: true, quantities: { [sale.items[0].productId]: 1 } };
    const partial = await run('pos.refund', input);
    expect(partial.order).toMatchObject({ state: 'partially_refunded', data: { refundedTotal: 946 } });
    await run('pos.refund', input);
    expect(await posSummary(client)).toMatchObject({ sales: 0 });
    await expect(run('pos.refund', input)).rejects.toThrow('already been returned');
  });
  it('records retail mutations directly without manufacturing a Flow run', async () => {
    const { client, run, sale } = await fixture();
    await run('pos.checkout', sale, 'sale-run');
    const runs = await client.execute("SELECT flow_id,state FROM runs WHERE occurrence='sale-run'");
    expect(runs.rows).toHaveLength(0);
    const events = await client.execute("SELECT action_id,run_id FROM events WHERE idempotency_key='sale-run'");
    expect(events.rows[0]).toMatchObject({ action_id: 'pos.checkout', run_id: null });
  });
  it('keeps autosaved carts out of Inbox and reviews submitted restaurant orders once', async () => {
    const { client, run, sale } = await fixture();
    const draft = (await run('pos.order.save', { items: sale.items, orderType: 'dine-in', submitted: false, draftKey: 'local-cart' })).order as { id: string; version: number };
    expect((await readPosInbox(client)).orders).toHaveLength(0);
    const submitted = (await run('pos.order.save', { items: sale.items, orderId: draft.id, version: draft.version, submitted: true, orderType: 'dine-in' })).order as { id: string; version: number; data: { approval: string } };
    expect(submitted.data.approval).toBe('pending');
    const accepted = await run('pos.order.accept', { orderId: draft.id, version: submitted.version }, 'accept-once');
    expect(await run('pos.order.accept', { orderId: draft.id, version: submitted.version }, 'accept-once')).toEqual(accepted);
    await expect(run('pos.order.reject', { orderId: draft.id, version: submitted.version, reason: 'Unavailable' })).rejects.toThrow('changed');
    expect((await readPosInbox(client)).orders).toHaveLength(1);
    const reviewEvents = await client.execute("SELECT action_id FROM events WHERE action_id='pos.order.accept'");
    expect(reviewEvents.rows).toHaveLength(1);
  });
  it('rejects a pending order and prevents checkout', async () => {
    const { run, sale } = await fixture();
    const order = (await run('pos.order.save', { items: sale.items, orderType: 'delivery', destination: '12 Market Street', submitted: true })).order as { id: string; version: number };
    await expect(run('pos.order.reject', { orderId: order.id, version: order.version })).rejects.toThrow('Reason');
    const rejected = (await run('pos.order.reject', { orderId: order.id, version: order.version, reason: 'Not serviceable' })).order as { state: string; data: { approval: string } };
    expect(rejected).toMatchObject({ state: 'cancelled', data: { approval: 'rejected' } });
    await expect(run('pos.checkout', { ...sale, orderId: order.id })).rejects.toThrow('no longer awaiting payment');
  });
  it('lets one courier claim, collect and deliver a paid order without exposing a claim override', async () => {
    const { client, run, sale } = await fixture();
    const order = (await run('pos.order.save', { items: sale.items, orderType: 'delivery', destination: '12 Market Street', discountBps: sale.discountBps, submitted: true })).order as { id: string; version: number };
    const accepted = (await run('pos.order.accept', { orderId: order.id, version: order.version })).order as { version: number };
    const courier: AccessContext = { ...access, identity: { id: 'courier-a', email: 'a@example.com', name: 'A' }, member: { ...access.member, userId: 'courier-a', role: 'member', workRole: 'courier' } };
    await expect(readPos(client, courier, 'orders')).rejects.toThrow('access');
    const other: AccessContext = { ...courier, identity: { id: 'courier-b', email: 'b@example.com', name: 'B' }, member: { ...courier.member, userId: 'courier-b' } };
    const reached = (await run('pos.order.reach', { orderId: order.id, version: accepted.version }, 'reach-once', courier)).order as { version: number; data: { courier: string; delivery: string } };
    expect(reached.data).toMatchObject({ courier: 'courier-a', delivery: 'reached' });
    await expect(run('pos.order.collect', { orderId: order.id, version: reached.version }, undefined, other)).rejects.toThrow();
    await expect(run('pos.order.collect', { orderId: order.id, version: reached.version }, undefined, courier)).rejects.toThrow('Payment and preparation');
    const preparing = (await run('pos.order.item.update', { orderId: order.id, version: reached.version, productId: sale.items[0].productId, status: 'preparing' })).order as { version: number };
    await run('pos.order.item.update', { orderId: order.id, version: preparing.version, productId: sale.items[0].productId, status: 'ready' });
    const paid = await run('pos.checkout', { ...sale, orderId: order.id });
    expect((paid.order as { data: { courier: string; delivery: string } }).data).toMatchObject({ courier: 'courier-a', delivery: 'reached' });
    const collected = (await run('pos.order.collect', { orderId: order.id, version: (paid.order as { version: number }).version }, undefined, courier)).order as { version: number; data: { delivery: string } };
    expect(collected.data.delivery).toBe('collected');
    expect((await readPosInbox(client)).orders).toHaveLength(1);
    const delivered = (await run('pos.order.deliver', { orderId: order.id, version: collected.version }, undefined, courier)).order as { data: { delivery: string } };
    expect(delivered.data.delivery).toBe('delivered');
    expect((await readPosInbox(client)).orders).toHaveLength(0);
  });
  it('lets only the verified customer receive and rate a paid order', async () => {
    const { client, run, sale } = await fixture();
    const customer = (await run('pos.customer.save', { title: 'Ada', email: 'Ada@Example.com' })).customer as { id: string };
    const submitted = (await run('pos.order.save', { items: sale.items, orderType: 'dine-in', table: '4', customerId: customer.id, discountBps: sale.discountBps, submitted: true })).order as { id: string; version: number; data: { customerEmail: string } };
    expect(submitted.data.customerEmail).toBe('ada@example.com');
    const buyer: AccessContext = { ...access, identity: { id: 'ada', email: 'ada@example.com', name: 'Ada' }, member: { ...access.member, userId: 'ada', role: 'member', workRole: 'customer' } };
    const stranger: AccessContext = { ...buyer, identity: { id: 'other', email: 'other@example.com', name: 'Other' }, member: { ...buyer.member, userId: 'other' } };
    expect((await readInboxSource(client, buyer)).orders).toHaveLength(1);
    expect((await readInboxSource(client, stranger)).orders).toHaveLength(0);
    await expect(run('pos.order.receive', { orderId: submitted.id, version: submitted.version }, undefined, buyer)).rejects.toThrow();
    const accepted = (await run('pos.order.accept', { orderId: submitted.id, version: submitted.version })).order as { version: number };
    const paid = (await run('pos.checkout', { ...sale, orderId: submitted.id })).order as { version: number };
    const preparing = (await run('pos.order.item.update', { orderId: submitted.id, version: paid.version, productId: sale.items[0].productId, status: 'preparing' })).order as { version: number };
    const ready = (await run('pos.order.item.update', { orderId: submitted.id, version: preparing.version, productId: sale.items[0].productId, status: 'ready' })).order as { version: number };
    expect(accepted.version).toBeLessThan(ready.version);
    await expect(run('pos.order.receive', { orderId: submitted.id, version: ready.version }, undefined, stranger)).rejects.toThrow();
    expect((await readInboxSource(client, buyer)).orders[0].data.group).toBe('waiting');
    await expect(run('pos.order.receive', { orderId: submitted.id, version: ready.version }, undefined, buyer)).rejects.toThrow('not ready');
    const handed = (await run('pos.order.handoff', { orderId: submitted.id, version: ready.version })).order as { version: number };
    expect((await readInboxSource(client, buyer)).orders[0].data.actions).toEqual([expect.objectContaining({ id: 'pos.order.receive' })]);
    const received = (await run('pos.order.receive', { orderId: submitted.id, version: handed.version }, undefined, buyer)).order as { version: number };
    expect((await readInboxSource(client, buyer)).orders[0].data.actions).toEqual([expect.objectContaining({ id: 'pos.order.rate' })]);
    await expect(run('pos.order.rate', { orderId: submitted.id, version: received.version, rating: 6 }, undefined, buyer)).rejects.toThrow('Rating');
    await run('pos.order.rate', { orderId: submitted.id, version: received.version, rating: 5, comment: 'Good' }, 'rating-once', buyer);
    expect((await readInboxSource(client, buyer)).orders).toHaveLength(0);
    expect((await readInboxSource(client, stranger)).orders).toHaveLength(0);
  });
});
