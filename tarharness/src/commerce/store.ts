import type { Client, Transaction } from '@libsql/client/web';
import { badRequest, conflict, notFound } from '../errors.ts';
import { eventStatement, findReplay } from '../gateway/commit.ts';
import type { AccessContext } from '../types.ts';

type Data = Record<string, unknown>;
type Row = { id: string; type: string; title: string; state: string; data: Data; version: number };
type Line = { variant: string; quantity: number; cost?: number };
const json = (value: unknown) => JSON.stringify(value);
const text = (value: unknown, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const object = (value: unknown): Data => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Data : {};
const integer = (value: unknown, label: string, minimum = 0) => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > 100_000_000) throw badRequest(`${label} is invalid.`);
  return value;
};
const decode = (value: Record<string, unknown>): Row => ({ id: String(value.id), type: String(value.type), title: String(value.title), state: String(value.state), data: object(JSON.parse(String(value.data))), version: Number(value.version) });

function lines(value: unknown, cost = false): Line[] {
  let source = value;
  if (typeof source === 'string') {
    try { source = JSON.parse(source); } catch { throw badRequest('Lines must be valid JSON.'); }
  }
  if (!Array.isArray(source) || source.length < 1 || source.length > 100) throw badRequest('One to 100 lines are required.');
  const parsed = source.map((entry) => {
    const item = object(entry); const variant = text(item.variant, 160); const quantity = integer(item.quantity, 'Line quantity', 1);
    if (!variant) throw badRequest('Every line needs a variant.');
    return { variant, quantity, ...(cost ? { cost: integer(item.cost, 'Line cost') } : {}) };
  });
  if (new Set(parsed.map((line) => line.variant)).size !== parsed.length) throw badRequest('Combine duplicate variant lines.');
  return parsed;
}

async function get(db: Pick<Transaction, 'execute'>, id: string, type?: string): Promise<Row> {
  const result = await db.execute({ sql: `SELECT * FROM records WHERE id=?${type ? ' AND type=?' : ''} AND archived IS NULL`, args: type ? [id, type] : [id] });
  if (!result.rows[0]) throw notFound(`${type || 'Record'} not found.`);
  return decode(result.rows[0]);
}

async function insert(db: Transaction, type: string, title: string, state: string, data: Data, actor: string, at: number, id = `rec_${crypto.randomUUID()}`): Promise<Row> {
  await db.execute({ sql: 'INSERT INTO records(id,type,title,state,data,owner,version,created,updated) VALUES(?,?,?,?,?,?,1,?,?)', args: [id, type, title, state, json(data), actor, at, at] });
  return { id, type, title, state, data, version: 1 };
}

async function stock(db: Transaction, variant: string, at: number, actor: string): Promise<Row> {
  const found = await db.execute({ sql: "SELECT * FROM records WHERE type='stock' AND json_extract(data,'$.variant')=? AND archived IS NULL", args: [variant] });
  if (found.rows[0]) return decode(found.rows[0]);
  return insert(db, 'stock', `Stock ${variant}`, 'active', { variant, onhand: 0, reserved: 0 }, actor, at);
}

async function setStock(db: Transaction, current: Row, onhand: number, reserved: number, at: number) {
  if (onhand < 0 || reserved < 0 || reserved > onhand) throw conflict('Stock is no longer sufficient. Refresh and try again.');
  const update = await db.execute({ sql: 'UPDATE records SET data=?,version=version+1,updated=? WHERE id=? AND version=?', args: [json({ ...current.data, onhand, reserved }), at, current.id, current.version] });
  if (update.rowsAffected !== 1) throw conflict('Stock changed. Refresh and try again.');
}

async function posting(db: Transaction, reference: string, lines: Data[], actor: string, at: number) {
  const debit = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const credit = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
  if (!Number.isSafeInteger(debit) || debit !== credit) throw new Error('Unbalanced posting.');
  return insert(db, 'posting', `Posting ${reference}`, 'posted', { reference, lines, debit, credit }, actor, at);
}

export async function executeCommerce(client: Client, context: AccessContext, action: string, input: Data, key: string, hash: string): Promise<Data> {
  const db = await client.transaction('write');
  try {
    const replay = await findReplay(db, key, hash);
    if (replay) { await db.commit(); return replay.result as Data; }
    const at = Date.now(); const actor = context.identity.id;
    let result: Data;

    if (action === 'catalog.item.save') {
      const name = text(input.name); const sku = text(input.sku, 80);
      if (!name || !sku) throw badRequest('Item name and code are required.');
      result = { item: await insert(db, 'item', name, 'active', { sku }, actor, at) };
    } else if (action === 'catalog.variant.save') {
      const item = await get(db, text(input.item, 160), 'item'); const name = text(input.name); const sku = text(input.sku, 80);
      if (!name || !sku) throw badRequest('Variant name and SKU are required.');
      result = { variant: await insert(db, 'variant', name, 'active', { item: item.id, sku }, actor, at) };
    } else if (action === 'price.set') {
      const variant = await get(db, text(input.variant, 160), 'variant'); const amount = integer(input.amount, 'Price'); const currency = text(input.currency, 3).toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) throw badRequest('A three letter currency is required.');
      await db.execute({ sql: "UPDATE records SET state='replaced',version=version+1,updated=? WHERE type='price' AND state='active' AND json_extract(data,'$.variant')=?", args: [at, variant.id] });
      result = { price: await insert(db, 'price', `${variant.title} price`, 'active', { variant: variant.id, amount, currency }, actor, at) };
    } else if (action === 'stock.adjust') {
      const variant = await get(db, text(input.variant, 160), 'variant'); const quantity = integer(Math.abs(Number(input.quantity)), 'Quantity', 1) * (Number(input.quantity) < 0 ? -1 : 1); const reason = text(input.reason);
      if (!reason) throw badRequest('A stock adjustment reason is required.');
      const current = await stock(db, variant.id, at, actor); const onhand = Number(current.data.onhand) + quantity; const reserved = Number(current.data.reserved);
      await setStock(db, current, onhand, reserved, at);
      result = { stock: { id: current.id, onhand, reserved, version: current.version + 1 }, movement: await insert(db, 'movement', reason, 'posted', { variant: variant.id, quantity, balance: onhand, reason }, actor, at) };
    } else if (action === 'purchase.create') {
      const supplier = text(input.supplier, 160); await get(db, supplier); const purchaseLines = lines(input.lines, true); let total = 0;
      for (const line of purchaseLines) { await get(db, line.variant, 'variant'); total += line.quantity * (line.cost || 0); }
      result = { purchase: await insert(db, 'purchase', `Purchase ${supplier}`, 'ordered', { supplier, lines: purchaseLines.map((line) => ({ ...line, received: 0 })), total }, actor, at) };
    } else if (action === 'purchase.receive') {
      const purchase = await get(db, text(input.purchase, 160), 'purchase'); const version = integer(input.version, 'Version', 1);
      if (purchase.version !== version || purchase.state !== 'ordered') throw conflict('Purchase order changed or is not open.');
      const ordered = (Array.isArray(purchase.data.lines) ? purchase.data.lines : []).map(object);
      const receivedLines = input.lines ? lines(input.lines) : ordered.map((line) => ({ variant: String(line.variant), quantity: Number(line.quantity) - Number(line.received || 0) })).filter((line) => line.quantity > 0);
      for (const received of receivedLines) {
        const line = ordered.find((item) => item.variant === received.variant); if (!line || received.quantity > Number(line.quantity) - Number(line.received || 0)) throw conflict('Received quantity exceeds the purchase remainder.');
        const current = await stock(db, received.variant, at, actor); const onhand = Number(current.data.onhand) + received.quantity;
        await setStock(db, current, onhand, Number(current.data.reserved), at);
        await insert(db, 'movement', 'Purchase receipt', 'posted', { variant: received.variant, quantity: received.quantity, balance: onhand, purchase: purchase.id }, actor, at);
        line.received = Number(line.received || 0) + received.quantity;
      }
      const complete = ordered.every((line) => Number(line.received) === Number(line.quantity));
      const update = await db.execute({ sql: 'UPDATE records SET state=?,data=?,version=version+1,updated=? WHERE id=? AND version=?', args: [complete ? 'received' : 'ordered', json({ ...purchase.data, lines: ordered }), at, purchase.id, version] });
      if (update.rowsAffected !== 1) throw conflict('Purchase order changed.');
      result = { receipt: await insert(db, 'receipt', `Receipt ${purchase.id}`, 'posted', { purchase: purchase.id, lines: receivedLines }, actor, at), purchase: { id: purchase.id, state: complete ? 'received' : 'ordered', version: version + 1 } };
    } else if (action === 'order.create') {
      const requested = lines(input.lines); const priced: Data[] = []; let total = 0; let currency = '';
      for (const line of requested) {
        const variant = await get(db, line.variant, 'variant'); const priceRows = await db.execute({ sql: "SELECT * FROM records WHERE type='price' AND state='active' AND json_extract(data,'$.variant')=? AND archived IS NULL ORDER BY updated DESC LIMIT 1", args: [variant.id] });
        if (!priceRows.rows[0]) throw conflict(`No active price exists for ${variant.title}.`);
        const price = decode(priceRows.rows[0]); const current = await stock(db, variant.id, at, actor); const onhand = Number(current.data.onhand); const reserved = Number(current.data.reserved);
        if (onhand - reserved < line.quantity) throw conflict(`${variant.title} has insufficient available stock.`);
        await setStock(db, current, onhand, reserved + line.quantity, at);
        const amount = Number(price.data.amount); const lineCurrency = String(price.data.currency);
        if (currency && currency !== lineCurrency) throw conflict('An order cannot mix currencies.');
        currency = lineCurrency; total += amount * line.quantity; priced.push({ variant: variant.id, title: variant.title, quantity: line.quantity, price: amount, total: amount * line.quantity });
      }
      const customer = text(input.customer, 160) || null; if (customer) await get(db, customer);
      result = { order: await insert(db, 'order', `Order ${new Date(at).toISOString()}`, 'open', { customer, lines: priced, total, currency }, actor, at) };
    } else if (action === 'order.fulfill' || action === 'order.cancel') {
      const order = await get(db, text(input.order, 160), 'order'); const version = integer(input.version, 'Version', 1);
      if (order.version !== version || order.state !== 'open') throw conflict('Order changed or is not open.');
      for (const item of (Array.isArray(order.data.lines) ? order.data.lines : []).map(object)) {
        const current = await stock(db, String(item.variant), at, actor); const quantity = Number(item.quantity);
        const onhand = Number(current.data.onhand) - (action === 'order.fulfill' ? quantity : 0); const reserved = Number(current.data.reserved) - quantity;
        await setStock(db, current, onhand, reserved, at);
        if (action === 'order.fulfill') await insert(db, 'movement', 'Order fulfilment', 'posted', { variant: item.variant, quantity: -quantity, balance: onhand, order: order.id }, actor, at);
      }
      const state = action === 'order.fulfill' ? 'fulfilled' : 'cancelled'; const update = await db.execute({ sql: 'UPDATE records SET state=?,version=version+1,updated=? WHERE id=? AND version=?', args: [state, at, order.id, version] });
      if (update.rowsAffected !== 1) throw conflict('Order changed.'); result = { order: { id: order.id, state, version: version + 1 } };
    } else if (action === 'invoice.issue') {
      const order = await get(db, text(input.order, 160), 'order');
      const existing = await db.execute({ sql: "SELECT id FROM records WHERE type='invoice' AND json_extract(data,'$.order')=? AND archived IS NULL", args: [order.id] });
      if (existing.rows.length) throw conflict('This order already has an invoice.');
      const invoice = await insert(db, 'invoice', `Invoice ${order.id}`, 'issued', { order: order.id, customer: order.data.customer || null, total: order.data.total, paid: 0, currency: order.data.currency }, actor, at);
      const ledger = await posting(db, invoice.id, [{ account: 'receivable', debit: order.data.total }, { account: 'revenue', credit: order.data.total }], actor, at);
      result = { invoice, posting: ledger };
    } else if (action === 'payment.record') {
      const invoice = await get(db, text(input.invoice, 160), 'invoice'); const amount = integer(input.amount, 'Payment', 1); const paid = Number(invoice.data.paid || 0); const total = Number(invoice.data.total);
      if (!['issued', 'partial'].includes(invoice.state) || paid + amount > total) throw conflict('Payment exceeds the open invoice balance.');
      const method = text(input.method, 40); if (!method) throw badRequest('Payment method is required.');
      const payment = await insert(db, 'payment', `Payment ${invoice.id}`, 'confirmed', { invoice: invoice.id, amount, method, reference: text(input.reference, 160) || null, currency: invoice.data.currency }, actor, at);
      const nextPaid = paid + amount; const state = nextPaid === total ? 'paid' : 'partial';
      await db.execute({ sql: 'UPDATE records SET state=?,data=?,version=version+1,updated=? WHERE id=? AND version=?', args: [state, json({ ...invoice.data, paid: nextPaid }), at, invoice.id, invoice.version] });
      const ledger = await posting(db, payment.id, [{ account: method === 'cash' ? 'cash' : 'bank', debit: amount }, { account: 'receivable', credit: amount }], actor, at);
      result = { payment, invoice: { id: invoice.id, state, paid: nextPaid, version: invoice.version + 1 }, posting: ledger };
    } else if (action === 'refund.record') {
      const payment = await get(db, text(input.payment, 160), 'payment'); const invoice = await get(db, String(payment.data.invoice), 'invoice'); const amount = integer(input.amount, 'Refund', 1); const previous = await db.execute({ sql: "SELECT COALESCE(SUM(json_extract(data,'$.amount')),0) AS amount FROM records WHERE type='refund' AND json_extract(data,'$.payment')=? AND archived IS NULL", args: [payment.id] });
      if (Number(previous.rows[0].amount) + amount > Number(payment.data.amount)) throw conflict('Refund exceeds the remaining payment amount.');
      const reason = text(input.reason); if (!reason) throw badRequest('Refund reason is required.');
      const refund = await insert(db, 'refund', `Refund ${payment.id}`, 'confirmed', { payment: payment.id, invoice: invoice.id, amount, reason, reference: text(input.reference, 160) || null, currency: payment.data.currency }, actor, at);
      const paid = Number(invoice.data.paid) - amount; const state = paid === 0 ? 'issued' : 'partial';
      await db.execute({ sql: 'UPDATE records SET state=?,data=?,version=version+1,updated=? WHERE id=? AND version=?', args: [state, json({ ...invoice.data, paid }), at, invoice.id, invoice.version] });
      const ledger = await posting(db, refund.id, [{ account: 'returns', debit: amount }, { account: payment.data.method === 'cash' ? 'cash' : 'bank', credit: amount }], actor, at);
      result = { refund, invoice: { id: invoice.id, state, paid, version: invoice.version + 1 }, posting: ledger };
    } else throw badRequest('Commerce action is unavailable.');

    await db.execute(eventStatement({ action, actor, key, hash, result }));
    await db.commit();
    return result;
  } catch (cause) {
    await db.rollback().catch(() => undefined);
    throw cause;
  } finally { db.close(); }
}
