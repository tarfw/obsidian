import { createClient } from '@libsql/client';
import { Effect } from 'effect';
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WORKSPACE_SCHEMA } from '../src/db/schema.ts';
import { executeGateway } from '../src/gateway/actions.ts';
import type { AccessContext } from '../src/types.ts';

const clients: ReturnType<typeof createClient>[] = [];
afterEach(() => clients.splice(0).forEach((client) => client.close()));
const access: AccessContext = {
  identity: { id: 'owner', email: 'owner@example.com', name: 'Owner' },
  workspace: { id: 'ws', name: 'Business', slug: 'business', mode: 'work', databaseName: 'business', databaseHost: 'db', state: 'active' },
  member: { workspaceId: 'ws', userId: 'owner', role: 'owner', state: 'active', workRole: 'general' },
};

async function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'tar-commerce-test-'));
  const client = createClient({ url: pathToFileURL(join(directory, 'workspace.db')).href }); clients.push(client);
  for (const sql of WORKSPACE_SCHEMA) await client.execute(sql);
  const run = (actionId: string, input: Record<string, unknown>, key: string = crypto.randomUUID()) => Effect.runPromise(executeGateway(client, access, { actionId, input, idempotencyKey: key }));
  const supplier = (await run('organization.create', { name: 'Supplier' })).record as { id: string };
  const item = (await run('catalog.item.save', { name: 'Tea', sku: 'TEA' })).item as { id: string };
  const variant = (await run('catalog.variant.save', { item: item.id, name: 'Tea 250g', sku: 'TEA-250' })).variant as { id: string };
  await run('price.set', { variant: variant.id, amount: 12500, currency: 'INR' });
  await run('stock.adjust', { variant: variant.id, quantity: 10, reason: 'Opening count' });
  return { client, run, supplier, variant };
}

describe('commerce core', { timeout: 20000 }, () => {
  it('reserves, fulfils, invoices, receives payment and records a balanced refund', async () => {
    const { client, run, variant } = await fixture();
    const order = (await run('order.create', { lines: [{ variant: variant.id, quantity: 2 }] }, 'order-once')).order as { id: string; version: number; data: { total: number } };
    expect((await run('order.create', { lines: [{ variant: variant.id, quantity: 2 }] }, 'order-once')).order).toEqual(order);
    expect(order.data.total).toBe(25000);
    await run('order.fulfill', { order: order.id, version: order.version });
    const invoice = (await run('invoice.issue', { order: order.id })).invoice as { id: string };
    const paid = await run('payment.record', { invoice: invoice.id, amount: 25000, method: 'upi', reference: 'pay-1' });
    const payment = paid.payment as { id: string };
    expect(paid.invoice).toMatchObject({ state: 'paid', paid: 25000 });
    expect((await run('refund.record', { payment: payment.id, amount: 5000, reason: 'Partial return', reference: 'refund-1' })).invoice).toMatchObject({ state: 'partial', paid: 20000 });
    const stock = await client.execute({ sql: "SELECT data FROM records WHERE type='stock' AND json_extract(data,'$.variant')=?", args: [variant.id] });
    expect(JSON.parse(String(stock.rows[0].data))).toMatchObject({ onhand: 8, reserved: 0 });
    const postings = await client.execute("SELECT data FROM records WHERE type='posting'");
    expect(postings.rows).toHaveLength(3);
    for (const row of postings.rows) { const data = JSON.parse(String(row.data)); expect(data.debit).toBe(data.credit); }
  });

  it('receives a purchase atomically and rejects over-receipt', async () => {
    const { client, run, supplier, variant } = await fixture();
    const purchase = (await run('purchase.create', { supplier: supplier.id, lines: JSON.stringify([{ variant: variant.id, quantity: 5, cost: 8000 }]) })).purchase as { id: string; version: number };
    await expect(run('purchase.receive', { purchase: purchase.id, version: purchase.version, lines: [{ variant: variant.id, quantity: 6 }] })).rejects.toThrow('exceeds');
    const received = await run('purchase.receive', { purchase: purchase.id, version: purchase.version });
    expect(received.purchase).toMatchObject({ state: 'received' });
    const stock = await client.execute({ sql: "SELECT data FROM records WHERE type='stock' AND json_extract(data,'$.variant')=?", args: [variant.id] });
    expect(JSON.parse(String(stock.rows[0].data)).onhand).toBe(15);
  });
});
