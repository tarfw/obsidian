import type { Client, Transaction } from '@libsql/client/web';
import { badRequest, conflict, forbidden, notFound } from '../errors.ts';
import type { AccessContext } from '../types.ts';
import { isCook } from '../access.ts';

type DB = Pick<Client, 'execute'>;
type Data = Record<string, unknown>;
export const POS_INDEXES = [
  "CREATE INDEX IF NOT EXISTS pos_payment_day ON records(json_extract(data,'$.businessDate')) WHERE type='pos.payment'",
  "CREATE INDEX IF NOT EXISTS pos_order_day ON records(json_extract(data,'$.businessDate')) WHERE type='pos.order'",
  "CREATE INDEX IF NOT EXISTS pos_payment_register ON records(json_extract(data,'$.registerId')) WHERE type='pos.payment'",
  "CREATE INDEX IF NOT EXISTS pos_customer_orders ON records(json_extract(data,'$.customerId')) WHERE type='pos.order'",
  "CREATE UNIQUE INDEX IF NOT EXISTS pos_unique_reference ON records(json_extract(data,'$.reference')) WHERE type='pos.payment' AND json_extract(data,'$.reference') IS NOT NULL",
  "CREATE UNIQUE INDEX IF NOT EXISTS pos_unique_barcode ON records(json_extract(data,'$.barcode')) WHERE type='pos.product' AND json_extract(data,'$.barcode')!='' AND archived IS NULL",
  "CREATE UNIQUE INDEX IF NOT EXISTS pos_unique_sku ON records(json_extract(data,'$.sku')) WHERE type='pos.product' AND json_extract(data,'$.sku')!='' AND archived IS NULL",
  "CREATE UNIQUE INDEX IF NOT EXISTS pos_one_open_register ON records(type) WHERE type='pos.register' AND state='open'",
  "CREATE UNIQUE INDEX IF NOT EXISTS pos_unique_draft_key ON records(owner,json_extract(data,'$.draftKey')) WHERE type='pos.order' AND json_extract(data,'$.draftKey') IS NOT NULL",
];
export interface PosRecord { id: string; title: string; state: string; data: Data; version: number; createdAt: number }
const object = (value: unknown): Data => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Data : {};
const text = (value: unknown, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const decode = (row: Data): PosRecord => ({ id: String(row.id), title: String(row.title), state: String(row.state), data: object(JSON.parse(String(row.data))), version: Number(row.version), createdAt: Number(row.created) });
export function integer(value: unknown, label: string, min = 0, max = 100_000_000): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw badRequest(label + ' is invalid.');
  return value;
}
async function get(db: DB, id: string, type: string) {
  const result = await db.execute({ sql: 'SELECT * FROM records WHERE id=? AND type=? AND archived IS NULL', args: [id, type] });
  return result.rows[0] ? decode(result.rows[0]) : null;
}
async function list(db: DB, type: string, search = '', offset = 0) {
  const result = await db.execute({ sql: "SELECT * FROM records WHERE type=? AND archived IS NULL AND (title LIKE ? OR id LIKE ? OR json_extract(data,'$.barcode')=? OR json_extract(data,'$.customerId')=? OR json_extract(data,'$.phone') LIKE ?) ORDER BY updated DESC,id LIMIT 100 OFFSET ?", args: [type, '%' + search + '%', '%' + search + '%', search, search, '%' + search + '%', offset] });
  return result.rows.map(decode);
}
async function put(db: DB, type: string, title: string, data: Data, actor: string, id = 'pos_' + crypto.randomUUID(), state = 'active') {
  const at = Date.now();
  await db.execute({ sql: "INSERT INTO records(id,type,title,state,data,owner,version,created,updated) VALUES(?,?,?,?,?,?,1,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,state=excluded.state,data=excluded.data,version=records.version+1,updated=excluded.updated",
    args: [id, type, title, state, JSON.stringify(data), actor, at, at] });
  return (await get(db, id, type))!;
}
export async function requirePos(db: DB) {
  const installed = await db.execute("SELECT id FROM definitions WHERE id='directory.pos.bot' AND state='published'");
  if (!installed.rows.length) throw forbidden();
}
async function register(db: DB) {
  const rows = await db.execute("SELECT * FROM records WHERE type='pos.register' AND state='open' AND archived IS NULL LIMIT 1");
  return rows.rows[0] ? decode(rows.rows[0]) : null;
}
async function balance(db: DB, session: PosRecord) {
  const result = await db.execute({ sql: "SELECT COALESCE(SUM(json_extract(data,'$.amount')),0) AS amount FROM records WHERE type='pos.payment' AND json_extract(data,'$.method')='cash' AND json_extract(data,'$.registerId')=?", args: [session.id] });
  return Number(session.data.opening) + Number(result.rows[0].amount);
}
export async function posSummary(db: DB) {
  const settings = await get(db, 'pos.settings', 'pos.settings');
  const timezone = String(settings?.data.timezone || 'Asia/Kolkata');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const result = await db.execute({ sql: "SELECT COALESCE(SUM(json_extract(data,'$.amount')),0) AS sales FROM records WHERE type='pos.payment' AND json_extract(data,'$.businessDate')=?", args: [today] });
  const orders = await db.execute({ sql: "SELECT COUNT(*) AS count FROM records WHERE type='pos.order' AND json_extract(data,'$.businessDate')=?", args: [today] });
  const stock = await db.execute("SELECT COUNT(*) AS count FROM records WHERE type='pos.product' AND archived IS NULL AND json_extract(data,'$.stock')<=json_extract(data,'$.lowStock')");
  return { sales: Number(result.rows[0].sales), orders: Number(orders.rows[0].count), lowStock: Number(stock.rows[0].count), currency: String(settings?.data.currency || 'INR'), businessDate: today };
}
export async function readPos(db: DB, context: AccessContext, section: string, search = '', offset = 0) {
  if (isCook(context.member)) throw forbidden();
  await requirePos(db);
  if (section === 'products' || section === 'orders' || section === 'customers') {
    const types = { products: 'pos.product', orders: 'pos.order', customers: 'pos.customer' };
    return { items: await list(db, types[section], search.slice(0, 100), offset), nextOffset: offset + 100 };
  }
  const session = await register(db);
  return { settings: await get(db, 'pos.settings', 'pos.settings'), register: session ? { ...session, expected: await balance(db, session) } : null,
    summary: await posSummary(db), canManage: context.member.role === 'owner' || context.member.role === 'admin', paymentMethods: ['cash', 'upi'] };
}

export async function readPosInbox(db: DB) {
  await requirePos(db);
  const result = await db.execute({ sql: "SELECT * FROM records WHERE type='pos.order' AND state='open' AND archived IS NULL ORDER BY updated DESC,id LIMIT 100" });
  return { orders: result.rows.map(decode) };
}

async function movement(db: DB, product: PosRecord, delta: number, reason: string, actor: string, reference?: string) {
  const stock = integer(Number(product.data.stock) + delta, 'Stock');
  await put(db, 'pos.product', product.title, { ...product.data, stock }, actor, product.id);
  await put(db, 'pos.movement', reason, { productId: product.id, delta, balance: stock, reference: reference || null }, actor);
}
export async function executePos(client: Client, context: AccessContext, actionId: string, input: Data, key: string, hash: string): Promise<Data> {
  const tx = await client.transaction('write');
  try {
    await requirePos(tx);
    // Recheck under the write lock: concurrent retries must never sell twice.
    const previous = await tx.execute({ sql: 'SELECT input_hash,data FROM events WHERE idempotency_key=?', args: [key] });
    if (previous.rows[0]) {
      if (previous.rows[0].input_hash !== hash) throw conflict('Operation key was used with different input.');
      await tx.commit();
      return object(JSON.parse(String(previous.rows[0].data))).result as Data;
    }
    const result = await mutate(tx, context, actionId, input);
    const at = Date.now();
    const templateId = actionId === 'pos.checkout' || actionId.startsWith('pos.order.') ? 'sell' : actionId === 'pos.refund' ? 'orders' : actionId.startsWith('pos.product.') || actionId.startsWith('pos.stock.') ? 'stock' : actionId.startsWith('pos.customer.') ? 'customers' : actionId.startsWith('pos.register.') ? 'register' : null;
    const flowId = templateId ? 'directory.pos.' + templateId + '.flow' : null;
    let runId: string | null = null;
    if (flowId) {
      const flow = await tx.execute({ sql: "SELECT version FROM definitions WHERE id=? AND state='published'", args: [flowId] });
      if (flow.rows.length) {
        runId = 'run_' + crypto.randomUUID();
        await tx.execute({ sql: "INSERT INTO runs(id,flow_id,flow_version,occurrence,state,action_id,context,version,started_at,finished_at,created_at,updated_at) VALUES(?,?,?,?,'completed',?,?,1,?,?,?,?)",
          args: [runId, flowId, Number(flow.rows[0].version), key, actionId, JSON.stringify({ result }), at, at, at, at] });
      }
    }
    await tx.execute({ sql: "INSERT INTO events(id,kind,run_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at) VALUES(?,'action',?,?,'accepted',?,?,?,?,?,?)",
      args: ['evt_' + crypto.randomUUID(), runId, actionId, context.identity.id, hash, key, JSON.stringify({ result }), at, at] });
    await tx.commit();
    return result;
  } catch (error) { await tx.rollback().catch(() => undefined); throw error; }
  finally { tx.close(); }
}

async function mutate(db: Transaction, context: AccessContext, action: string, input: Data): Promise<Data> {
  const actor = context.identity.id;
  if (action === 'pos.open') return { opened: true };
  if (action === 'pos.setup') {
    const name = text(input.name);
    const currency = text(input.currency);
    const timezone = text(input.timezone);
    if (!name || !['INR', 'USD', 'EUR', 'GBP'].includes(currency)) throw badRequest('Store name and supported currency are required.');
    try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(); } catch { throw badRequest('Choose a valid timezone.'); }
    const current = await get(db, 'pos.settings', 'pos.settings');
    if (current && current.data.currency !== currency) {
      const products = await db.execute("SELECT id FROM records WHERE type IN ('pos.product','pos.order') LIMIT 1");
      if (products.rows.length) throw conflict('Currency cannot change after products or sales exist.');
    }
    return { settings: await put(db, 'pos.settings', name, { currency, timezone, location: text(input.location), receiptFooter: text(input.receiptFooter) }, actor, 'pos.settings') };
  }
  const settings = await get(db, 'pos.settings', 'pos.settings');
  if (!settings) throw badRequest('Set up the store first.');
  if (action === 'pos.product.save') {
    const title = text(input.title);
    if (!title) throw badRequest('Product name is required.');
    const id = text(input.id);
    const current = id ? await get(db, id, 'pos.product') : null;
    if (id && !current) throw notFound('Product not found.');
    if (current && input.version !== current.version) throw conflict('Product changed. Reload before saving.');
    const barcode = text(input.barcode);
    const sku = text(input.sku);
    if (barcode || sku) {
      const duplicates = await db.execute({ sql: "SELECT id,json_extract(data,'$.barcode') AS barcode,json_extract(data,'$.sku') AS sku FROM records WHERE type='pos.product' AND ((?!='' AND json_extract(data,'$.barcode')=?) OR (?!='' AND json_extract(data,'$.sku')=?)) AND id!=? AND archived IS NULL", args: [barcode, barcode, sku, sku, id] });
      if (duplicates.rows.length) throw conflict(barcode && duplicates.rows[0].barcode === barcode ? 'Barcode already belongs to another product.' : 'SKU already belongs to another product.');
    }
    const stock = current ? Number(current.data.stock) : integer(input.stock, 'Opening stock');
    const imageUrl = text(input.imageUrl);
    if (imageUrl && !imageUrl.startsWith('https://')) throw badRequest('Product image must use an HTTPS URL.');
    const data = { ...current?.data, price: integer(input.price, 'Price'), cost: integer(input.cost ?? 0, 'Cost price'), taxBps: integer(input.taxBps, 'Tax rate', 0, 10000), stock,
      lowStock: integer(input.lowStock ?? 5, 'Low stock threshold'), sku, barcode, category: text(input.category), brand: text(input.brand),
      variant: text(input.variant), unit: text(input.unit), supplier: text(input.supplier), shortDescription: text(input.shortDescription, 500), imageUrl };
    const product = await put(db, 'pos.product', title, data, actor, id || undefined);
    if (!current && stock) await put(db, 'pos.movement', 'Opening stock', { productId: product.id, delta: stock, balance: stock }, actor);
    return { product };
  }
  if (action === 'pos.stock.adjust') {
    const product = await get(db, text(input.productId), 'pos.product');
    if (!product) throw notFound('Product not found.');
    if (input.version !== product.version) throw conflict('Stock changed. Reload before adjusting.');
    const delta = integer(input.delta, 'Stock change', -100000, 100000);
    if (!delta || !text(input.reason)) throw badRequest('Enter a stock change and reason.');
    await movement(db, product, delta, text(input.reason), actor);
    return { product: await get(db, product.id, 'pos.product') };
  }
  if (action === 'pos.customer.save') {
    if (!text(input.title)) throw badRequest('Customer name is required.');
    const id = text(input.id);
    const current = id ? await get(db, id, 'pos.customer') : null;
    if (id && !current) throw notFound('Customer not found.');
    if (current && current.version !== input.version) throw conflict('Customer changed. Reload before saving.');
    return { customer: await put(db, 'pos.customer', text(input.title), { email: text(input.email), phone: text(input.phone) }, actor, id || undefined) };
  }
  if (action === 'pos.register.open') {
    if (await register(db)) throw conflict('A register is already open.');
    return { register: await put(db, 'pos.register', settings.title, { opening: integer(input.opening, 'Opening cash'), openedBy: actor, currency: settings.data.currency }, actor, undefined, 'open') };
  }
  if (action === 'pos.order.save') {
    const orderId = text(input.orderId);
    const clientDraftKey = text(input.draftKey);
    let current = orderId ? await get(db, orderId, 'pos.order') : null;
    if (!current && clientDraftKey) {
      const existing = await db.execute({ sql: "SELECT * FROM records WHERE type='pos.order' AND owner=? AND json_extract(data,'$.draftKey')=? AND archived IS NULL LIMIT 1", args: [actor, clientDraftKey] });
      current = existing.rows[0] ? decode(existing.rows[0]) : null;
    }
    if (orderId && (!current || current.state !== 'open')) throw conflict('This order is no longer open.');
    if (current && current.state !== 'open') throw conflict('This order is no longer open.');
    if (current && orderId && current.version !== input.version) throw conflict('Order changed. Reload the Inbox.');
    const cart = Array.isArray(input.items) ? input.items.map(object) : [];
    if (!cart.length || cart.length > 100) throw badRequest('Add between 1 and 100 products.');
    if (new Set(cart.map((line) => line.productId)).size !== cart.length) throw badRequest('Combine duplicate products into one line.');
    const discountBps = integer(input.discountBps ?? 0, 'Discount', 0, 10000);
    const lines: Data[] = [];
    let subtotal = 0, discount = 0, tax = 0;
    for (const line of cart) {
      const product = await get(db, text(line.productId), 'pos.product');
      if (!product) throw notFound('Product no longer available.');
      if (line.version !== product.version) throw conflict(product.title + ' changed. Reload the cart.');
      const quantity = integer(line.quantity, 'Quantity', 1, 10000);
      if (quantity > Number(product.data.stock)) throw conflict('Not enough stock for ' + product.title + '.');
      const gross = integer(Number(product.data.price) * quantity, 'Line total');
      const lineDiscount = Math.round(gross * discountBps / 10000);
      const lineTax = Math.round((gross - lineDiscount) * Number(product.data.taxBps) / 10000);
      subtotal += gross; discount += lineDiscount; tax += lineTax;
      const prior = Array.isArray(current?.data.lines) ? current.data.lines.map(object).find((item) => String(item.productId) === product.id) : null;
      lines.push({ productId: product.id, title: product.title, quantity, price: product.data.price, discount: lineDiscount, tax: lineTax, total: gross - lineDiscount + lineTax, status: text(prior?.status, 40) || 'pending' });
    }
    const customerId = text(input.customerId) || text(current?.data.customerId);
    const customer = customerId ? await get(db, customerId, 'pos.customer') : null;
    if (customerId && !customer) throw notFound('Customer not found.');
    const requestedType = text(input.orderType) || text(current?.data.orderType);
    const orderType = ['counter', 'dine-in', 'takeaway', 'delivery'].includes(requestedType) ? requestedType : 'counter';
    const total = integer(subtotal - discount + tax, 'Sale total');
    const order = await put(db, 'pos.order', 'Open order', { ...current?.data, draftKey: clientDraftKey || current?.data.draftKey || null, lines, subtotal, discount, discountBps, tax, total, currency: settings.data.currency,
      paymentStatus: 'unpaid', customerId: customerId || null, customerName: customer?.title || null, table: text(input.table, 80) || current?.data.table || null, orderType,
      storeName: settings.title, location: settings.data.location }, actor, current?.id, 'open');
    return { order };
  }
  if (action === 'pos.order.item.update') {
    const order = await get(db, text(input.orderId), 'pos.order');
    if (!order || order.state !== 'open') throw notFound('Open order not found.');
    if (order.version !== input.version) throw conflict('Order changed. Reload the Inbox.');
    const productId = text(input.productId);
    const next = text(input.status, 40);
    const transitions: Record<string, readonly string[]> = { pending: ['preparing'], preparing: ['ready'], ready: [] };
    const lines = Array.isArray(order.data.lines) ? order.data.lines.map(object) : [];
    const line = lines.find((item) => String(item.productId) === productId);
    if (!line) throw notFound('Order item not found.');
    const current = text(line.status, 40) || 'pending';
    if (!transitions[current]?.includes(next)) throw conflict('That item cannot move to this status.');
    line.status = next;
    return { order: await put(db, 'pos.order', order.title, { ...order.data, lines }, actor, order.id, order.state) };
  }
  if (action === 'pos.order.cancel') {
    const order = await get(db, text(input.orderId), 'pos.order');
    if (!order || order.state !== 'open') throw notFound('Open order not found.');
    if (order.version !== input.version) throw conflict('Order changed. Reload the Inbox.');
    return { order: await put(db, 'pos.order', order.title, { ...order.data, cancelledAt: Date.now() }, actor, order.id, 'cancelled') };
  }
  const session = await register(db);
  if (!session) throw badRequest('Open the register first.');
  if (action === 'pos.register.close') {
    if (input.registerId !== session.id) throw conflict('Register changed. Reload before closing.');
    const expected = await balance(db, session);
    const counted = integer(input.counted, 'Counted cash');
    return { register: await put(db, 'pos.register', session.title, { ...session.data, expected, counted, difference: counted - expected, closedBy: actor, closedAt: Date.now() }, actor, session.id, 'closed') };
  }
  const businessDate = new Intl.DateTimeFormat('en-CA', { timeZone: String(settings.data.timezone), year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (action === 'pos.checkout') {
    if (input.method !== 'cash' && input.method !== 'upi') throw badRequest('Choose Cash or UPI.');
    const reference = text(input.reference);
    if (input.method === 'upi') {
      if (!reference || input.received !== true) throw badRequest('Confirm UPI receipt and enter its transaction reference.');
      const duplicate = await db.execute({ sql: "SELECT id FROM records WHERE type='pos.payment' AND json_extract(data,'$.reference')=?", args: [reference] });
      if (duplicate.rows.length) throw conflict('This UPI reference is already recorded.');
    }
    const draftId = text(input.orderId);
    const draft = draftId ? await get(db, draftId, 'pos.order') : null;
    if (draftId && (!draft || draft.state !== 'open')) throw conflict('This order is no longer awaiting payment.');
    const cart = Array.isArray(input.items) ? input.items.map(object) : [];
    if (!cart.length || cart.length > 100) throw badRequest('Add between 1 and 100 products.');
    if (new Set(cart.map((line) => line.productId)).size !== cart.length) throw badRequest('Combine duplicate products into one line.');
    const discountBps = integer(input.discountBps ?? 0, 'Discount', 0, 10000);
    if (draft) {
      const savedLines = Array.isArray(draft.data.lines) ? draft.data.lines.map(object) : [];
      const sameCart = savedLines.length === cart.length && savedLines.every((line) => cart.some((item) => String(item.productId) === String(line.productId) && Number(item.quantity) === Number(line.quantity)));
      if (!sameCart || discountBps !== Number(draft.data.discountBps || 0)) throw conflict('Order changed. Return to the Inbox and save the updated cart.');
    }
    const lines: Data[] = [];
    let subtotal = 0, discount = 0, tax = 0;
    for (const line of cart) {
      const product = await get(db, text(line.productId), 'pos.product');
      if (!product) throw notFound('Product no longer available.');
      if (line.version !== product.version) throw conflict(product.title + ' changed. Reload the cart.');
      const quantity = integer(line.quantity, 'Quantity', 1, 10000);
      if (quantity > Number(product.data.stock)) throw conflict('Not enough stock for ' + product.title + '.');
      const gross = integer(Number(product.data.price) * quantity, 'Line total');
      const lineDiscount = Math.round(gross * discountBps / 10000);
      const lineTax = Math.round((gross - lineDiscount) * Number(product.data.taxBps) / 10000);
      subtotal += gross; discount += lineDiscount; tax += lineTax;
      lines.push({ productId: product.id, title: product.title, quantity, price: product.data.price, discount: lineDiscount, tax: lineTax, total: gross - lineDiscount + lineTax });
    }
    const total = integer(subtotal - discount + tax, 'Sale total');
    if (input.expectedTotal !== total) throw conflict('Total changed. Review the cart.');
    const tendered = input.method === 'upi' ? total : integer(input.tendered, 'Cash received');
    if (tendered < total) throw badRequest('Cash received is below the total.');
    const customerId = draft ? text(draft.data.customerId) : text(input.customerId);
    const customer = customerId ? await get(db, customerId, 'pos.customer') : null;
    if (customerId && !customer) throw notFound('Customer not found.');
    const order = await put(db, 'pos.order', 'Sale', { ...draft?.data, lines, subtotal, discount, tax, total, currency: settings.data.currency, businessDate,
      method: input.method, reference, verification: input.method === 'upi' ? 'cashier_confirmed' : 'cash', tendered, change: tendered - total, customerId: customerId || null, customerName: customer?.title || null,
      paymentStatus: 'paid', registerId: session.id, storeName: settings.title, location: settings.data.location, receiptFooter: settings.data.receiptFooter }, actor, draft?.id, 'paid');
    for (const line of lines) await movement(db, (await get(db, String(line.productId), 'pos.product'))!, -Number(line.quantity), 'Sale', actor, order.id);
    await put(db, 'pos.payment', 'Sale payment', { orderId: order.id, amount: total, method: input.method, reference: reference || null, registerId: session.id, businessDate }, actor);
    return { order };
  }
  if (action === 'pos.refund') {
    const order = await get(db, text(input.orderId), 'pos.order');
    if (!order) throw notFound('Sale not found.');
    if (order.state !== 'paid' && order.state !== 'partially_refunded') throw conflict('Sale has already been returned.');
    if (!text(input.reason)) throw badRequest('Return reason is required.');
    if (input.returned !== true) throw badRequest('Confirm the payment was returned to the customer.');
    if (order.data.method === 'upi') {
      if (!text(input.reference)) throw badRequest('Enter the UPI refund reference.');
      const duplicate = await db.execute({ sql: "SELECT id FROM records WHERE type='pos.payment' AND json_extract(data,'$.reference')=?", args: [text(input.reference)] });
      if (duplicate.rows.length) throw conflict('This UPI reference is already recorded.');
    }
    const lines = order.data.lines as Data[];
    const returned = object(order.data.returnedQuantities);
    const quantities = input.quantities === undefined ? Object.fromEntries(lines.map((line) => [String(line.productId), Number(line.quantity) - Number(returned[String(line.productId)] || 0)])) : object(input.quantities);
    if (Object.keys(quantities).some((id) => !lines.some((line) => line.productId === id))) throw badRequest('Unknown return item.');
    let refundTotal = 0;
    const changes: { line: Data; quantity: number }[] = [];
    for (const line of lines) {
      const id = String(line.productId);
      const before = Number(returned[id] || 0);
      const quantity = integer(quantities[id] ?? 0, 'Return quantity', 0, Number(line.quantity) - before);
      refundTotal += Math.round(Number(line.total) * (before + quantity) / Number(line.quantity)) - Math.round(Number(line.total) * before / Number(line.quantity));
      returned[id] = before + quantity;
      if (quantity) changes.push({ line, quantity });
    }
    if (!changes.length) throw badRequest('Choose at least one item to return.');
    if (input.restock === true) {
      for (const { line, quantity } of changes) {
        const product = await get(db, String(line.productId), 'pos.product');
        if (!product) throw conflict('A product is unavailable for restocking.');
        await movement(db, product, quantity, 'Return', actor, order.id);
      }
    }
    const fullyReturned = lines.every((line) => returned[String(line.productId)] === line.quantity);
    const updated = await put(db, 'pos.order', order.title, { ...order.data, returnedQuantities: returned, refundedTotal: Number(order.data.refundedTotal || 0) + refundTotal, refundReason: text(input.reason), refundedAt: Date.now(), restocked: input.restock === true }, actor, order.id, fullyReturned ? 'refunded' : 'partially_refunded');
    await put(db, 'pos.payment', 'Refund', { orderId: order.id, amount: -refundTotal, method: order.data.method, reference: text(input.reference) || null, quantities, registerId: session.id, businessDate }, actor);
    return { order: updated };
  }
  throw badRequest('Unsupported POS action.');
}
