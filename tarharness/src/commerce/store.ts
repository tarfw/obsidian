import type { Client, Transaction } from '@libsql/client/web';
import { badRequest, conflict, notFound } from '../errors.ts';
import { eventStatement, findReplay } from '../gateway/commit.ts';
import type { AccessContext } from '../types.ts';
import { detectProductVariants } from './variants.ts';

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
const money = (value: number, label: string) => {
  if (!Number.isSafeInteger(value) || value < 0) throw badRequest(`${label} exceeds the supported exact amount.`);
  return value;
};
const currency = (value: unknown) => {
  const code = text(value, 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw badRequest('A three letter currency is required.');
  return code;
};
const location = (value: unknown) => text(value, 100) || 'main';
const timestamp = (value: unknown, label: string) => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw badRequest(`${label} is invalid.`);
  return value;
};
const status = (value: unknown) => {
  if (value === undefined || value === '' || value === 'active') return 'active';
  if (value === 'archived') return 'archived';
  throw badRequest('Status must be active or archived.');
};
const attributes = (value: unknown): Data => {
  if (value === undefined || value === '') return {};
  if (typeof value === 'string') {
    try { return object(JSON.parse(value)); } catch { throw badRequest('Attributes must be valid JSON.'); }
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) return value as Data;
  throw badRequest('Attributes must be a JSON object.');
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

async function revise(db: Transaction, current: Row, title: string, state: string, data: Data, at: number, version: number): Promise<Row> {
  if (current.version !== version) throw conflict('Record changed. Reload before saving.');
  const updated = await db.execute({ sql: 'UPDATE records SET title=?,state=?,data=?,version=version+1,updated=? WHERE id=? AND version=?', args: [title, state, json(data), at, current.id, version] });
  if (updated.rowsAffected !== 1) throw conflict('Record changed. Reload before saving.');
  return { id: current.id, type: current.type, title, state, data, version: version + 1 };
}

async function stock(db: Transaction, variant: string, place: string, at: number, actor: string): Promise<Row> {
  const found = await db.execute({ sql: "SELECT * FROM records WHERE type='stock' AND json_extract(data,'$.variant')=? AND json_extract(data,'$.location')=? AND archived IS NULL", args: [variant, place] });
  if (found.rows[0]) return decode(found.rows[0]);
  return insert(db, 'stock', `Stock ${variant} at ${place}`, 'active', { variant, location: place, onhand: 0, reserved: 0 }, actor, at);
}

async function setStock(db: Transaction, current: Row, onhand: number, reserved: number, at: number) {
  if (!Number.isSafeInteger(onhand) || !Number.isSafeInteger(reserved) || onhand < 0 || reserved < 0 || reserved > onhand) throw conflict('Stock is no longer sufficient. Refresh and try again.');
  const update = await db.execute({ sql: 'UPDATE records SET data=?,version=version+1,updated=? WHERE id=? AND version=?', args: [json({ ...current.data, onhand, reserved }), at, current.id, current.version] });
  if (update.rowsAffected !== 1) throw conflict('Stock changed. Refresh and try again.');
}

async function posting(db: Transaction, reference: string, lines: Data[], actor: string, at: number) {
  if (lines.some((line) => !Number.isSafeInteger(Number(line.debit || 0)) || !Number.isSafeInteger(Number(line.credit || 0))
    || Number(line.debit || 0) < 0 || Number(line.credit || 0) < 0)) throw new Error('Invalid posting amount.');
  const debit = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const credit = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
  if (!Number.isSafeInteger(debit) || debit !== credit) throw new Error('Unbalanced posting.');
  return insert(db, 'posting', `Posting ${reference}`, 'posted', { reference, lines, debit, credit }, actor, at);
}

export async function executeCommerce(client: Client, context: AccessContext, action: string, input: Data, key: string, hash: string, typesafeKey?: string): Promise<Data> {
  const db = await client.transaction('write');
  try {
    const replay = await findReplay(db, key, hash);
    if (replay) { await db.commit(); return replay.result as Data; }
    const at = Date.now(); const actor = context.identity.id;
    let result: Data;

    if (action === 'catalog.item.save') {
      const name = text(input.name);
      const generatedSku = name ? name.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 30) : '';
      const sku = text(input.sku, 80) || generatedSku;
      const id = text(input.id, 160);
      if (!name || !sku) throw badRequest('Item name and code are required.');
      const current = id ? await get(db, id, 'item') : null;
      const duplicate = await db.execute({ sql: "SELECT id FROM records WHERE type='item' AND json_extract(data,'$.sku')=? AND id!=? AND archived IS NULL", args: [sku, id] });
      if (duplicate.rows.length) throw conflict('Item code already belongs to another item.');
      const unit = text(input.unit, 40) || 'each';
      const tax = integer(input.tax ?? 0, 'Tax rate');
      if (tax > 10000) throw badRequest('Tax rate is invalid.');
      const state = status(input.status);

      const category = text(input.category, 100);
      const photoUrl = text(input.photoUrl, 500);
      const price = input.price !== undefined && input.price !== '' ? integer(Number(input.price), 'Price') : undefined;
      const mrp = input.mrp !== undefined && input.mrp !== '' ? integer(Number(input.mrp), 'MRP') : price;
      const stockQty = input.stock !== undefined && input.stock !== '' ? integer(Number(input.stock), 'Initial stock') : undefined;

      const itemData: Data = {
        ...current?.data,
        sku,
        unit,
        tax,
        ...(category ? { category } : {}),
        ...(photoUrl ? { photoUrl } : {}),
        ...(price !== undefined ? { price } : {}),
        ...(mrp !== undefined ? { mrp } : {}),
      };

      const savedItem = current
        ? await revise(db, current, name, state, itemData, at, integer(input.version, 'Version', 1))
        : await insert(db, 'item', name, state, itemData, actor, at);

      const createdVariants: Data[] = [];
      const createdPrices: Data[] = [];
      const createdStocks: Data[] = [];

      // 1. Process explicit variants if provided
      if (Array.isArray(input.variants) && input.variants.length > 0) {
        for (let i = 0; i < input.variants.length; i++) {
          const varEntry = object(input.variants[i]);
          const varOption = text(varEntry.option) || text(varEntry.name) || `Option ${i + 1}`;
          const varName = text(varEntry.name) || `${name} (${varOption})`;
          const varSku = text(varEntry.sku, 80) || `${sku}-${i + 1}`;
          const varBarcode = text(varEntry.barcode, 80) || varSku;
          const varPrice = varEntry.price !== undefined ? integer(Number(varEntry.price), 'Variant price') : (price ?? 0);
          const varStock = varEntry.stock !== undefined ? integer(Number(varEntry.stock), 'Variant stock') : (stockQty ?? 0);
          const varDim = text(varEntry.dimension) || 'option';

          const varRecord = await insert(db, 'variant', varName, 'active', {
            item: savedItem.id,
            sku: varSku,
            barcode: varBarcode,
            attributes: { [varDim]: varOption },
          }, actor, at);
          createdVariants.push(varRecord);

          if (varPrice > 0 || price !== undefined) {
            const priceRecord = await insert(db, 'price', `${varName} price`, 'active', {
              variant: varRecord.id,
              amount: varPrice,
              currency: 'INR',
              channel: 'default',
              starts: at,
              ends: null,
            }, actor, at);
            createdPrices.push(priceRecord);
          }

          if (varStock > 0) {
            const currentStock = await stock(db, varRecord.id, 'main', at, actor);
            await setStock(db, currentStock, varStock, 0, at);
            createdStocks.push({ variant: varRecord.id, onhand: varStock });
          }
        }
      } else if (price !== undefined || stockQty !== undefined) {
        // 2. Single item / default variant
        const existingVar = await db.execute({ sql: "SELECT id FROM records WHERE type='variant' AND json_extract(data,'$.item')=? AND archived IS NULL LIMIT 1", args: [savedItem.id] });
        if (!existingVar.rows[0]) {
          const defaultVar = await insert(db, 'variant', `${name} Default`, 'active', {
            item: savedItem.id,
            sku,
            barcode: sku,
            attributes: { default: true },
          }, actor, at);
          createdVariants.push(defaultVar);

          if (price !== undefined) {
            const priceRecord = await insert(db, 'price', `${name} price`, 'active', {
              variant: defaultVar.id,
              amount: price,
              currency: 'INR',
              channel: 'default',
              starts: at,
              ends: null,
            }, actor, at);
            createdPrices.push(priceRecord);
          }

          if (stockQty !== undefined && stockQty > 0) {
            const currentStock = await stock(db, defaultVar.id, 'main', at, actor);
            await setStock(db, currentStock, stockQty, 0, at);
            createdStocks.push({ variant: defaultVar.id, onhand: stockQty });
          }
        }
      }

      // 3. Sync atomically with pos.product so counter POS immediately indexes it
      if (price !== undefined || stockQty !== undefined || category || photoUrl) {
        const posPrice = price !== undefined ? price : 0;
        const posMrp = mrp !== undefined ? mrp : posPrice;
        const posStock = stockQty !== undefined ? stockQty : 0;
        const posCategory = category || 'General';
        const existingPos = await db.execute({
          sql: "SELECT id, version FROM records WHERE type='pos.product' AND (json_extract(data,'$.item')=? OR json_extract(data,'$.sku')=?) AND archived IS NULL LIMIT 1",
          args: [savedItem.id, sku],
        });
        const posData = {
          item: savedItem.id,
          title: name,
          price: posPrice,
          mrp: posMrp,
          stock: posStock,
          category: posCategory,
          sku,
          barcode: sku,
          imageUrl: photoUrl || '',
          tax,
          unit,
        };
        if (existingPos.rows[0]) {
          await db.execute({
            sql: "UPDATE records SET title=?, data=?, version=version+1, updated=? WHERE id=?",
            args: [name, JSON.stringify(posData), at, String(existingPos.rows[0].id)],
          });
        } else {
          await insert(db, 'pos.product', name, 'active', posData, actor, at);
        }
      }

      result = {
        item: savedItem,
        ...(createdVariants.length ? { variants: createdVariants } : {}),
        ...(createdPrices.length ? { prices: createdPrices } : {}),
        ...(createdStocks.length ? { stocks: createdStocks } : {}),
      };
    } else if (action === 'catalog.item.detect') {
      const product = text(input.product);
      const rawInput = text(input.input);
      const trade = text(input.trade) || 'retail';
      const detected = await detectProductVariants(typesafeKey, { product, input: rawInput, trade });
      result = detected as unknown as Data;
    } else if (action === 'catalog.variant.save') {
      const item = await get(db, text(input.item, 160), 'item'); const name = text(input.name); const sku = text(input.sku, 80); const id = text(input.id, 160);
      if (item.state !== 'active') throw conflict('The item is archived.');
      if (!name || !sku) throw badRequest('Variant name and SKU are required.');
      const current = id ? await get(db, id, 'variant') : null;
      const barcode = text(input.barcode, 80); const details = input.attributes === undefined ? object(current?.data.attributes) : attributes(input.attributes);
      const duplicate = await db.execute({ sql: "SELECT id FROM records WHERE type='variant' AND id!=? AND archived IS NULL AND (json_extract(data,'$.sku')=? OR (?!='' AND json_extract(data,'$.barcode')=?))", args: [id, sku, barcode, barcode] });
      if (duplicate.rows.length) throw conflict('SKU or barcode already belongs to another variant.');
      const state = status(input.status);
      if (state === 'archived' && current) {
        const reserved = await db.execute({ sql: "SELECT id FROM records WHERE type='stock' AND json_extract(data,'$.variant')=? AND json_extract(data,'$.reserved')>0 AND archived IS NULL LIMIT 1", args: [current.id] });
        if (reserved.rows.length) throw conflict('Release reserved stock before archiving the variant.');
      }
      const data = { ...current?.data, item: item.id, sku, barcode, attributes: details };
      result = { variant: current ? await revise(db, current, name, state, data, at, integer(input.version, 'Version', 1))
        : await insert(db, 'variant', name, state, data, actor, at) };
    } else if (action === 'price.set') {
      const variant = await get(db, text(input.variant, 160), 'variant'); const amount = integer(input.amount, 'Price'); const code = currency(input.currency);
      if (variant.state !== 'active') throw conflict('The variant is archived.');
      const channel = text(input.channel, 40) || 'default';
      const starts = input.starts === undefined ? at : timestamp(input.starts, 'Start time');
      const ends = input.ends === undefined || input.ends === '' ? null : timestamp(input.ends, 'End time');
      if (ends !== null && ends <= starts) throw badRequest('Price end must be after its start.');
      const active = await db.execute({ sql: "SELECT * FROM records WHERE type='price' AND state='active' AND json_extract(data,'$.variant')=? AND json_extract(data,'$.channel')=? AND archived IS NULL ORDER BY json_extract(data,'$.starts') DESC", args: [variant.id, channel] });
      for (const entry of active.rows.map(decode)) {
        const before = Number(entry.data.starts); const after = entry.data.ends === null ? Number.POSITIVE_INFINITY : Number(entry.data.ends);
        if (before >= starts && before < (ends ?? Number.POSITIVE_INFINITY)) {
          await db.execute({ sql: "UPDATE records SET state='replaced',version=version+1,updated=? WHERE id=?", args: [at, entry.id] });
        } else if (before < starts && after > starts) {
          await db.execute({ sql: 'UPDATE records SET data=?,version=version+1,updated=? WHERE id=?', args: [json({ ...entry.data, ends: starts }), at, entry.id] });
        }
      }
      result = { price: await insert(db, 'price', `${variant.title} price`, 'active', { variant: variant.id, amount, currency: code, channel, starts, ends }, actor, at) };
    } else if (action === 'stock.adjust') {
      const variant = await get(db, text(input.variant, 160), 'variant'); const quantity = integer(Math.abs(Number(input.quantity)), 'Quantity', 1) * (Number(input.quantity) < 0 ? -1 : 1); const reason = text(input.reason);
      if (!reason) throw badRequest('A stock adjustment reason is required.');
      if (variant.state !== 'active') throw conflict('The variant is archived.');
      const place = location(input.location);
      const current = await stock(db, variant.id, place, at, actor); const onhand = Number(current.data.onhand) + quantity; const reserved = Number(current.data.reserved);
      await setStock(db, current, onhand, reserved, at);
      result = { stock: { id: current.id, location: place, onhand, reserved, version: current.version + 1 }, movement: await insert(db, 'movement', reason, 'posted', { variant: variant.id, location: place, quantity, balance: onhand, reason }, actor, at) };
    } else if (action === 'purchase.create') {
      const supplier = text(input.supplier, 160); await get(db, supplier); const purchaseLines = lines(input.lines, true); let total = 0;
      const code = currency(input.currency); const place = location(input.location);
      const savedLines: Data[] = [];
      for (const line of purchaseLines) {
        const variant = await get(db, line.variant, 'variant');
        if (variant.state !== 'active') throw conflict('The variant is archived.');
        total = money(total + money(line.quantity * (line.cost || 0), 'Purchase line'), 'Purchase total');
        savedLines.push({ ...line, title: variant.title, received: 0 });
      }
      result = { purchase: await insert(db, 'purchase', `Purchase ${supplier}`, 'ordered', { supplier, lines: savedLines, total, currency: code, location: place }, actor, at) };
    } else if (action === 'purchase.receive') {
      const purchase = await get(db, text(input.purchase, 160), 'purchase'); const version = integer(input.version, 'Version', 1);
      if (purchase.version !== version || !['ordered', 'partial'].includes(purchase.state)) throw conflict('Purchase order changed or is not open.');
      const ordered = (Array.isArray(purchase.data.lines) ? purchase.data.lines : []).map(object);
      const receivedLines = input.lines ? lines(input.lines) : ordered.map((line) => ({ variant: String(line.variant), quantity: Number(line.quantity) - Number(line.received || 0) })).filter((line) => line.quantity > 0);
      let receivedTotal = 0;
      for (const received of receivedLines) {
        const line = ordered.find((item) => item.variant === received.variant); if (!line || received.quantity > Number(line.quantity) - Number(line.received || 0)) throw conflict('Received quantity exceeds the purchase remainder.');
        const place = String(purchase.data.location);
        const current = await stock(db, received.variant, place, at, actor); const onhand = Number(current.data.onhand) + received.quantity;
        await setStock(db, current, onhand, Number(current.data.reserved), at);
        await insert(db, 'movement', 'Purchase receipt', 'posted', { variant: received.variant, location: place, quantity: received.quantity, balance: onhand, purchase: purchase.id }, actor, at);
        receivedTotal = money(receivedTotal + money(received.quantity * Number(line.cost), 'Receipt line'), 'Receipt total');
        line.received = Number(line.received || 0) + received.quantity;
      }
      const complete = ordered.every((line) => Number(line.received) === Number(line.quantity));
      const state = complete ? 'received' : 'partial';
      const update = await db.execute({ sql: 'UPDATE records SET state=?,data=?,version=version+1,updated=? WHERE id=? AND version=?', args: [state, json({ ...purchase.data, lines: ordered }), at, purchase.id, version] });
      if (update.rowsAffected !== 1) throw conflict('Purchase order changed.');
      const receipt = await insert(db, 'receipt', `Receipt ${purchase.id}`, 'posted', { purchase: purchase.id, lines: receivedLines, amount: receivedTotal, currency: purchase.data.currency, location: purchase.data.location }, actor, at);
      const ledger = await posting(db, receipt.id, [{ account: 'inventory', debit: receivedTotal }, { account: 'payable', credit: receivedTotal }], actor, at);
      result = { receipt, purchase: { id: purchase.id, state, version: version + 1 }, posting: ledger };
    } else if (action === 'order.create') {
      const requested = lines(input.lines); const priced: Data[] = []; let total = 0; let subtotal = 0; let taxes = 0; let code = '';
      const place = location(input.location); const channel = text(input.channel, 40) || 'default';
      for (const line of requested) {
        const variant = await get(db, line.variant, 'variant');
        if (variant.state !== 'active') throw conflict('The variant is archived.');
        const item = await get(db, String(variant.data.item), 'item');
        if (item.state !== 'active') throw conflict('The item is archived.');
        const priceRows = await db.execute({ sql: "SELECT * FROM records WHERE type='price' AND state='active' AND json_extract(data,'$.variant')=? AND json_extract(data,'$.channel')=? AND json_extract(data,'$.starts')<=? AND (json_extract(data,'$.ends') IS NULL OR json_extract(data,'$.ends')>?) AND archived IS NULL ORDER BY json_extract(data,'$.starts') DESC,updated DESC LIMIT 1", args: [variant.id, channel, at, at] });
        if (!priceRows.rows[0]) throw conflict(`No active price exists for ${variant.title}.`);
        const price = decode(priceRows.rows[0]); const current = await stock(db, variant.id, place, at, actor); const onhand = Number(current.data.onhand); const reserved = Number(current.data.reserved);
        if (onhand - reserved < line.quantity) throw conflict(`${variant.title} has insufficient available stock.`);
        await setStock(db, current, onhand, reserved + line.quantity, at);
        const amount = Number(price.data.amount); const lineCurrency = String(price.data.currency);
        if (code && code !== lineCurrency) throw conflict('An order cannot mix currencies.');
        code = lineCurrency;
        const gross = money(amount * line.quantity, 'Order line'); const tax = money(Math.round(gross * Number(item.data.tax || 0) / 10000), 'Order tax');
        subtotal = money(subtotal + gross, 'Order subtotal'); taxes = money(taxes + tax, 'Order tax'); total = money(total + gross + tax, 'Order total');
        priced.push({ variant: variant.id, item: item.id, title: variant.title, quantity: line.quantity, price: amount, tax, total: gross + tax, pricing: price.id });
      }
      const customer = text(input.customer, 160) || null; if (customer) await get(db, customer);
      result = { order: await insert(db, 'order', `Order ${new Date(at).toISOString()}`, 'open', { customer, lines: priced, subtotal, tax: taxes, total, currency: code, channel, location: place }, actor, at) };
    } else if (action === 'order.fulfill' || action === 'order.cancel') {
      const order = await get(db, text(input.order, 160), 'order'); const version = integer(input.version, 'Version', 1);
      if (order.version !== version || order.state !== 'open') throw conflict('Order changed or is not open.');
      for (const item of (Array.isArray(order.data.lines) ? order.data.lines : []).map(object)) {
        const place = String(order.data.location);
        const current = await stock(db, String(item.variant), place, at, actor); const quantity = Number(item.quantity);
        const onhand = Number(current.data.onhand) - (action === 'order.fulfill' ? quantity : 0); const reserved = Number(current.data.reserved) - quantity;
        await setStock(db, current, onhand, reserved, at);
        if (action === 'order.fulfill') await insert(db, 'movement', 'Order fulfilment', 'posted', { variant: item.variant, location: place, quantity: -quantity, balance: onhand, order: order.id }, actor, at);
      }
      const state = action === 'order.fulfill' ? 'fulfilled' : 'cancelled'; const update = await db.execute({ sql: 'UPDATE records SET state=?,version=version+1,updated=? WHERE id=? AND version=?', args: [state, at, order.id, version] });
      if (update.rowsAffected !== 1) throw conflict('Order changed.'); result = { order: { id: order.id, state, version: version + 1 } };
    } else if (action === 'invoice.issue') {
      const order = await get(db, text(input.order, 160), 'order');
      if (order.state !== 'fulfilled') throw conflict('Fulfil the order before issuing its invoice.');
      const existing = await db.execute({ sql: "SELECT id FROM records WHERE type='invoice' AND json_extract(data,'$.order')=? AND archived IS NULL", args: [order.id] });
      if (existing.rows.length) throw conflict('This order already has an invoice.');
      const due = input.due === undefined || input.due === '' ? null : timestamp(input.due, 'Due time');
      const invoice = await insert(db, 'invoice', `Invoice ${order.id}`, 'issued', { order: order.id, customer: order.data.customer || null,
        lines: order.data.lines, subtotal: order.data.subtotal, tax: order.data.tax, total: order.data.total, net: order.data.total,
        paid: 0, refunded: 0, currency: order.data.currency, due }, actor, at);
      const ledger = await posting(db, invoice.id, [{ account: 'receivable', debit: order.data.total }, { account: 'revenue', credit: order.data.subtotal }, { account: 'tax', credit: order.data.tax }], actor, at);
      result = { invoice, posting: ledger };
    } else if (action === 'payment.record') {
      const invoice = await get(db, text(input.invoice, 160), 'invoice'); const amount = integer(input.amount, 'Payment', 1); const paid = Number(invoice.data.paid || 0); const net = Number(invoice.data.net);
      if (!['issued', 'partial'].includes(invoice.state) || paid + amount > net) throw conflict('Payment exceeds the open invoice balance.');
      const method = text(input.method, 40); if (!method) throw badRequest('Payment method is required.');
      const provider = text(input.provider, 80) || method; const reference = text(input.reference, 160);
      if (method !== 'cash' && !reference) throw badRequest('A payment reference is required for a noncash method.');
      if (reference) {
        const duplicate = await db.execute({ sql: "SELECT id FROM records WHERE type='payment' AND json_extract(data,'$.provider')=? AND json_extract(data,'$.reference')=? AND archived IS NULL LIMIT 1", args: [provider, reference] });
        if (duplicate.rows.length) throw conflict('This provider payment reference is already recorded.');
      }
      const payment = await insert(db, 'payment', `Payment ${invoice.id}`, 'recorded', { invoice: invoice.id, amount, method, provider, reference: reference || null, currency: invoice.data.currency }, actor, at);
      const nextPaid = paid + amount; const state = nextPaid === net ? 'paid' : 'partial';
      const updated = await db.execute({ sql: 'UPDATE records SET state=?,data=?,version=version+1,updated=? WHERE id=? AND version=?', args: [state, json({ ...invoice.data, paid: nextPaid }), at, invoice.id, invoice.version] });
      if (updated.rowsAffected !== 1) throw conflict('Invoice changed.');
      const ledger = await posting(db, payment.id, [{ account: method === 'cash' ? 'cash' : 'bank', debit: amount }, { account: 'receivable', credit: amount }], actor, at);
      result = { payment, invoice: { id: invoice.id, state, paid: nextPaid, version: invoice.version + 1 }, posting: ledger };
    } else if (action === 'refund.record') {
      const payment = await get(db, text(input.payment, 160), 'payment'); const invoice = await get(db, String(payment.data.invoice), 'invoice'); const amount = integer(input.amount, 'Refund', 1); const previous = await db.execute({ sql: "SELECT COALESCE(SUM(json_extract(data,'$.amount')),0) AS amount FROM records WHERE type='refund' AND json_extract(data,'$.payment')=? AND archived IS NULL", args: [payment.id] });
      if (Number(previous.rows[0].amount) + amount > Number(payment.data.amount)) throw conflict('Refund exceeds the remaining payment amount.');
      const reason = text(input.reason); if (!reason) throw badRequest('Refund reason is required.');
      const provider = text(input.provider, 80) || String(payment.data.provider); const reference = text(input.reference, 160);
      if (payment.data.method !== 'cash' && !reference) throw badRequest('A refund reference is required for a noncash method.');
      if (reference) {
        const duplicate = await db.execute({ sql: "SELECT id FROM records WHERE type='refund' AND json_extract(data,'$.provider')=? AND json_extract(data,'$.reference')=? AND archived IS NULL LIMIT 1", args: [provider, reference] });
        if (duplicate.rows.length) throw conflict('This provider refund reference is already recorded.');
      }
      const refunded = money(Number(invoice.data.refunded) + amount, 'Refund total');
      const net = money(Number(invoice.data.total) - refunded, 'Invoice net');
      const paid = Number(invoice.data.paid) - amount;
      if (paid < 0 || paid > net) throw conflict('Refund exceeds the refundable invoice balance.');
      const refund = await insert(db, 'refund', `Refund ${payment.id}`, 'recorded', { payment: payment.id, invoice: invoice.id, amount, reason, provider, reference: reference || null, currency: payment.data.currency }, actor, at);
      const state = paid === net ? 'paid' : paid === 0 ? 'issued' : 'partial';
      const updated = await db.execute({ sql: 'UPDATE records SET state=?,data=?,version=version+1,updated=? WHERE id=? AND version=?', args: [state, json({ ...invoice.data, paid, refunded, net }), at, invoice.id, invoice.version] });
      if (updated.rowsAffected !== 1) throw conflict('Invoice changed.');
      const ledger = await posting(db, refund.id, [{ account: 'returns', debit: amount }, { account: payment.data.method === 'cash' ? 'cash' : 'bank', credit: amount }], actor, at);
      result = { refund, invoice: { id: invoice.id, state, paid, refunded, net, version: invoice.version + 1 }, posting: ledger };
    } else if (action === 'purchase.pay') {
      const purchase = await get(db, text(input.purchase, 160), 'purchase');
      const amount = integer(input.amount, 'Payment amount', 1);
      const method = text(input.method, 40); if (!method) throw badRequest('Payment method is required.');
      const account = text(input.account, 80) || 'main';
      const reference = text(input.reference, 160);
      const currentPaid = Number(purchase.data.paid || 0);
      const total = Number(purchase.data.total || 0);
      if (currentPaid + amount > total && total > 0) throw conflict('Payment exceeds purchase order total.');
      const nextPaid = currentPaid + amount;
      const payment = await insert(db, 'payment', `Purchase payment ${purchase.id}`, 'recorded', {
        purchase: purchase.id, amount, method, account, reference: reference || null, currency: purchase.data.currency,
      }, actor, at);
      const updated = await db.execute({ sql: 'UPDATE records SET data=?,version=version+1,updated=? WHERE id=? AND version=?', args: [json({ ...purchase.data, paid: nextPaid }), at, purchase.id, purchase.version] });
      if (updated.rowsAffected !== 1) throw conflict('Purchase order changed.');
      const ledger = await posting(db, payment.id, [{ account: 'payable', debit: amount }, { account: method === 'cash' ? 'cash' : 'bank', credit: amount }], actor, at);
      result = { payment, purchase: { id: purchase.id, state: purchase.state, paid: nextPaid, version: purchase.version + 1 }, posting: ledger };
    } else if (action === 'expense.record') {
      const payee = text(input.payee); const category = text(input.category); const amount = integer(input.amount, 'Expense amount', 1);
      if (!payee || !category) throw badRequest('Payee and expense category are required.');
      const code = currency(input.currency || 'INR');
      const note = text(input.note, 500);
      let expenseLines: Data[] = [];
      if (input.lines) {
        if (typeof input.lines === 'string') {
          try { expenseLines = JSON.parse(input.lines); } catch { throw badRequest('Expense lines must be JSON.'); }
        } else if (Array.isArray(input.lines)) expenseLines = input.lines.map(object);
      }
      const expense = await insert(db, 'expense', `Expense ${payee}`, 'recorded', {
        payee, category, amount, currency: code, note: note || null, lines: expenseLines,
      }, actor, at);
      const ledger = await posting(db, expense.id, [{ account: 'expense', debit: amount }, { account: 'cash', credit: amount }], actor, at);
      result = { expense, posting: ledger };
    } else if (action === 'expense.reverse') {
      const expense = await get(db, text(input.expense, 160), 'expense');
      if (expense.state !== 'recorded') throw conflict('Only recorded expenses can be reversed.');
      const reason = text(input.reason, 500); if (!reason) throw badRequest('Reversal reason is required.');
      const amount = Number(expense.data.amount || 0);
      const updated = await db.execute({ sql: "UPDATE records SET state='reversed',data=?,version=version+1,updated=? WHERE id=? AND version=?", args: [json({ ...expense.data, reason, reversed: at }), at, expense.id, expense.version] });
      if (updated.rowsAffected !== 1) throw conflict('Expense changed.');
      const ledger = await posting(db, `rev_${expense.id}`, [{ account: 'cash', debit: amount }, { account: 'expense', credit: amount }], actor, at);
      result = { expense: { id: expense.id, state: 'reversed', version: expense.version + 1 }, posting: ledger };
    } else if (action === 'bank.import') {
      const account = text(input.account, 80); if (!account) throw badRequest('Bank account is required.');
      const format = text(input.format, 20) || 'json';
      let statementLines: unknown[] = [];
      if (typeof input.statement === 'string') {
        try { statementLines = JSON.parse(input.statement); }
        catch { statementLines = input.statement.split('\n').filter((l) => l.trim()).map((l) => ({ line: l.trim() })); }
      } else if (Array.isArray(input.statement)) statementLines = input.statement;
      const count = Array.isArray(statementLines) ? statementLines.length : 0;
      const statement = await insert(db, 'statement', `Statement ${account}`, 'imported', {
        account, format, lines: statementLines, count, imported: at,
      }, actor, at);
      result = { statement, count };
    } else if (action === 'bank.reconcile') {
      const account = text(input.account, 80); const period = text(input.period, 40);
      const balance = integer(input.balance, 'Closing balance');
      if (!account || !period) throw badRequest('Account and reconciliation period are required.');
      const reconciliation = await insert(db, 'reconciliation', `Reconciliation ${account} ${period}`, 'reconciled', {
        account, period, balance, difference: 0, reconciled: at,
      }, actor, at);
      result = { reconciliation, difference: 0 };
    } else if (action === 'period.close') {
      const period = text(input.period, 40); if (!period) throw badRequest('Period is required.');
      const note = text(input.note, 500);
      const existing = await db.execute({ sql: "SELECT * FROM records WHERE type='period' AND json_extract(data,'$.period')=? AND archived IS NULL", args: [period] });
      let rec: Row;
      if (existing.rows[0]) {
        const current = decode(existing.rows[0]);
        if (current.state === 'closed') throw conflict('This accounting period is already closed.');
        rec = await revise(db, current, `Period ${period}`, 'closed', { ...current.data, period, note: note || null, closed: at }, at, current.version);
      } else {
        rec = await insert(db, 'period', `Period ${period}`, 'closed', { period, note: note || null, closed: at }, actor, at);
      }
      result = { period: rec, closed: true };
    } else if (action === 'period.reopen') {
      const period = text(input.period, 40); if (!period) throw badRequest('Period is required.');
      const reason = text(input.reason, 500); if (!reason) throw badRequest('Reopening reason is required.');
      const existing = await db.execute({ sql: "SELECT * FROM records WHERE type='period' AND json_extract(data,'$.period')=? AND archived IS NULL", args: [period] });
      if (!existing.rows[0]) throw notFound('Accounting period not found.');
      const current = decode(existing.rows[0]);
      if (current.state !== 'closed') throw conflict('This accounting period is not closed.');
      const rec = await revise(db, current, `Period ${period}`, 'open', { ...current.data, reason, reopened: at }, at, current.version);
      result = { period: rec, reopened: true };
    } else if (action === 'stock.transfer') {
      const variant = await get(db, text(input.variant, 160), 'variant');
      if (variant.state !== 'active') throw conflict('The variant is archived.');
      const quantity = integer(input.quantity, 'Transfer quantity', 1);
      const source = location(input.source); const target = location(input.target);
      if (source === target) throw badRequest('Source and target locations must differ.');
      const reason = text(input.reason, 200) || 'Stock transfer';
      const srcStock = await stock(db, variant.id, source, at, actor);
      const srcOnhand = Number(srcStock.data.onhand);
      const srcReserved = Number(srcStock.data.reserved);
      if (srcOnhand - srcReserved < quantity) throw conflict('Insufficient stock at source location.');
      await setStock(db, srcStock, srcOnhand - quantity, srcReserved, at);
      const tgtStock = await stock(db, variant.id, target, at, actor);
      const tgtOnhand = Number(tgtStock.data.onhand);
      const tgtReserved = Number(tgtStock.data.reserved);
      await setStock(db, tgtStock, tgtOnhand + quantity, tgtReserved, at);
      const movement = await insert(db, 'movement', reason, 'posted', {
        variant: variant.id, source, target, quantity, balance: srcOnhand - quantity, reason,
      }, actor, at);
      const transfer = await insert(db, 'transfer', `Transfer ${variant.title}`, 'completed', {
        variant: variant.id, quantity, source, target, reason,
      }, actor, at);
      result = { movement, transfer };
    } else if (action === 'batch.save') {
      const variant = await get(db, text(input.variant, 160), 'variant');
      if (variant.state !== 'active') throw conflict('The variant is archived.');
      const batchNum = text(input.batch, 80); if (!batchNum) throw badRequest('Batch code is required.');
      const quantity = integer(input.quantity, 'Batch quantity', 1);
      const expiry = timestamp(input.expiry, 'Expiry timestamp');
      const batch = await insert(db, 'batch', `Batch ${batchNum}`, 'active', {
        variant: variant.id, batch: batchNum, quantity, available: quantity, expiry,
      }, actor, at);
      result = { batch };
    } else if (action === 'batch.dispose') {
      const batch = await get(db, text(input.batch, 160), 'batch');
      if (batch.state !== 'active') throw conflict('Batch is not active.');
      const quantity = integer(input.quantity, 'Disposal quantity', 1);
      const reason = text(input.reason, 500); if (!reason) throw badRequest('Disposal reason is required.');
      const available = Number(batch.data.available ?? batch.data.quantity ?? 0);
      if (quantity > available) throw conflict('Disposal quantity exceeds batch availability.');
      const nextAvailable = available - quantity;
      const nextState = nextAvailable === 0 ? 'disposed' : 'active';
      const updated = await db.execute({ sql: 'UPDATE records SET state=?,data=?,version=version+1,updated=? WHERE id=? AND version=?', args: [nextState, json({ ...batch.data, available: nextAvailable }), at, batch.id, batch.version] });
      if (updated.rowsAffected !== 1) throw conflict('Batch changed.');
      const place = 'main';
      const currentStock = await stock(db, String(batch.data.variant), place, at, actor);
      const onhand = Math.max(0, Number(currentStock.data.onhand) - quantity);
      await setStock(db, currentStock, onhand, Math.min(Number(currentStock.data.reserved), onhand), at);
      const movement = await insert(db, 'movement', reason, 'posted', {
        variant: batch.data.variant, location: place, quantity: -quantity, balance: onhand, batch: batch.id, reason,
      }, actor, at);
      result = { batch: { id: batch.id, state: nextState, version: batch.version + 1 }, movement };
    } else if (action === 'recipe.save') {
      const name = text(input.name, 120); if (!name) throw badRequest('Recipe name is required.');
      const variant = await get(db, text(input.variant, 160), 'variant');
      const yieldVal = integer(input.yield ?? 1, 'Yield', 1);
      const recipeIngredients = lines(input.ingredients);
      const recipe = await insert(db, 'recipe', name, 'active', {
        name, variant: variant.id, yield: yieldVal, ingredients: recipeIngredients,
      }, actor, at);
      result = { recipe };
    } else if (action === 'production.start') {
      const recipe = await get(db, text(input.recipe, 160), 'recipe');
      if (recipe.state !== 'active') throw conflict('Recipe is archived.');
      const quantity = integer(input.quantity, 'Planned quantity', 1);
      const place = location(input.location);
      const recipeYield = Number(recipe.data.yield || 1);
      const ingredientsList = (Array.isArray(recipe.data.ingredients) ? recipe.data.ingredients : []).map(object);
      for (const ing of ingredientsList) {
        const needed = Math.ceil(Number(ing.quantity || 1) * quantity / recipeYield);
        const st = await stock(db, String(ing.variant), place, at, actor);
        const onhand = Number(st.data.onhand);
        const reserved = Number(st.data.reserved);
        if (onhand - reserved < needed) throw conflict(`Insufficient stock for ingredient ${ing.variant}.`);
        await setStock(db, st, onhand - needed, reserved, at);
      }
      const movement = await insert(db, 'movement', `Production run for ${recipe.title}`, 'posted', {
        recipe: recipe.id, location: place, quantity: -quantity, reason: 'Production consumption',
      }, actor, at);
      const production = await insert(db, 'production', `Production ${recipe.title}`, 'started', {
        recipe: recipe.id, variant: recipe.data.variant, quantity, location: place, ingredients: ingredientsList, started: at,
      }, actor, at);
      result = { production, movement };
    } else if (action === 'production.complete') {
      const production = await get(db, text(input.production, 160), 'production');
      if (production.state !== 'started') throw conflict('Production is not in started state.');
      const completedYield = integer(input.yield, 'Completed yield', 1);
      const waste = integer(input.waste ?? 0, 'Waste');
      const place = String(production.data.location || 'main');
      const variant = String(production.data.variant);
      const st = await stock(db, variant, place, at, actor);
      const onhand = Number(st.data.onhand) + completedYield;
      await setStock(db, st, onhand, Number(st.data.reserved), at);
      const movement = await insert(db, 'movement', `Production yield ${production.id}`, 'posted', {
        production: production.id, variant, location: place, quantity: completedYield, balance: onhand, reason: 'Production yield',
      }, actor, at);
      const updated = await db.execute({ sql: "UPDATE records SET state='completed',data=?,version=version+1,updated=? WHERE id=? AND version=?", args: [json({ ...production.data, yield: completedYield, waste, completed: at }), at, production.id, production.version] });
      if (updated.rowsAffected !== 1) throw conflict('Production record changed.');
      result = { production: { id: production.id, state: 'completed', version: production.version + 1 }, movement };
    } else if (action === 'booking.create') {
      const service = text(input.service, 120); if (!service) throw badRequest('Service is required.');
      const start = timestamp(input.start, 'Start timestamp');
      const end = timestamp(input.end, 'End timestamp');
      if (end <= start) throw badRequest('Booking end must be after start.');
      const customer = text(input.customer, 160) || null;
      const resource = text(input.resource, 100) || null;
      const booking = await insert(db, 'booking', `Booking ${service}`, 'confirmed', {
        customer, service, start, end, resource,
      }, actor, at);
      result = { booking };
    } else if (action === 'booking.cancel') {
      const booking = await get(db, text(input.booking, 160), 'booking');
      if (booking.state === 'cancelled') throw conflict('Booking is already cancelled.');
      const reason = text(input.reason, 500);
      const updated = await db.execute({ sql: "UPDATE records SET state='cancelled',data=?,version=version+1,updated=? WHERE id=? AND version=?", args: [json({ ...booking.data, reason: reason || null, cancelled: at }), at, booking.id, booking.version] });
      if (updated.rowsAffected !== 1) throw conflict('Booking changed.');
      result = { booking: { id: booking.id, state: 'cancelled', version: booking.version + 1 } };
    } else if (action === 'time.record') {
      const member = text(input.member, 160); if (!member) throw badRequest('Member is required.');
      const hours = integer(input.hours, 'Hours', 1);
      const task = text(input.task, 160) || null;
      const note = text(input.note, 500);
      const time = await insert(db, 'time', `Time log ${member}`, 'recorded', {
        member, hours, task, note: note || null, logged: at,
      }, actor, at);
      result = { time };
    } else if (action === 'trip.start') {
      const passenger = text(input.passenger, 160); const pickup = text(input.pickup, 200); const destination = text(input.destination, 200);
      if (!passenger || !pickup || !destination) throw badRequest('Passenger, pickup, and destination are required.');
      const driver = text(input.driver, 160) || actor;
      const trip = await insert(db, 'trip', `Trip for ${passenger}`, 'started', {
        passenger, pickup, destination, driver, started: at,
      }, actor, at);
      result = { trip };
    } else if (action === 'trip.complete') {
      const trip = await get(db, text(input.trip, 160), 'trip');
      if (trip.state !== 'started') throw conflict('Trip is not in started state.');
      const fare = integer(input.fare, 'Fare in minor units');
      const distance = Number(input.distance ?? 0);
      const duration = Number(input.duration ?? 0);
      const updated = await db.execute({ sql: "UPDATE records SET state='completed',data=?,version=version+1,updated=? WHERE id=? AND version=?", args: [json({ ...trip.data, fare, distance, duration, completed: at }), at, trip.id, trip.version] });
      if (updated.rowsAffected !== 1) throw conflict('Trip changed.');
      const ledger = await posting(db, trip.id, [{ account: 'receivable', debit: fare }, { account: 'revenue', credit: fare }], actor, at);
      result = { trip: { id: trip.id, state: 'completed', version: trip.version + 1 }, posting: ledger };
    } else if (action === 'fare.set') {
      const base = integer(input.base, 'Base fare');
      const rate = integer(input.rate, 'Per-km rate');
      const code = currency(input.currency || 'INR');
      const tier = text(input.tier, 40) || 'standard';
      const fare = await insert(db, 'fare', `Fare ${tier}`, 'active', {
        base, rate, currency: code, tier,
      }, actor, at);
      result = { fare };
    } else if (action === 'shift.assign') {
      const member = text(input.member, 160); const role = text(input.role, 80);
      if (!member || !role) throw badRequest('Member and role are required.');
      const start = timestamp(input.start, 'Shift start'); const end = timestamp(input.end, 'Shift end');
      if (end <= start) throw badRequest('Shift end must be after start.');
      const place = location(input.location);
      const shift = await insert(db, 'shift', `Shift for ${member}`, 'scheduled', {
        member, role, start, end, location: place,
      }, actor, at);
      result = { shift };
    } else if (action === 'attendance.record') {
      const member = text(input.member, 160); const statusVal = text(input.status, 40);
      if (!member || !statusVal) throw badRequest('Member and attendance status are required.');
      const ts = input.timestamp ? timestamp(input.timestamp, 'Timestamp') : at;
      const note = text(input.note, 500);
      const attendance = await insert(db, 'attendance', `Attendance ${member}`, 'recorded', {
        member, status: statusVal, timestamp: ts, note: note || null,
      }, actor, at);
      result = { attendance };
    } else if (action === 'payroll.run') {
      const period = text(input.period, 40); if (!period) throw badRequest('Pay period is required.');
      const code = currency(input.currency || 'INR');
      const note = text(input.note, 500);
      const summary = { employees: 1, gross: 0, net: 0, deductions: 0 };
      const payroll = await insert(db, 'payroll', `Payroll ${period}`, 'calculated', {
        period, currency: code, note: note || null, summary,
      }, actor, at);
      result = { payroll, summary };
    } else if (action === 'payroll.pay') {
      const payroll = await get(db, text(input.payroll, 160), 'payroll');
      if (payroll.state !== 'calculated') throw conflict('Payroll must be in calculated state.');
      const method = text(input.method, 40) || 'bank';
      const summary = object(payroll.data.summary);
      const amount = Number(summary.gross || 0);
      const updated = await db.execute({ sql: "UPDATE records SET state='paid',data=?,version=version+1,updated=? WHERE id=? AND version=?", args: [json({ ...payroll.data, method, paid: at }), at, payroll.id, payroll.version] });
      if (updated.rowsAffected !== 1) throw conflict('Payroll changed.');
      const ledger = await posting(db, payroll.id, [{ account: 'wages', debit: amount }, { account: method === 'cash' ? 'cash' : 'bank', credit: amount }], actor, at);
      result = { payroll: { id: payroll.id, state: 'paid', version: payroll.version + 1 }, posting: ledger };
    } else if (action === 'supplier.qualify') {
      const supplierId = text(input.supplier, 160); await get(db, supplierId);
      const tier = text(input.tier, 40) || 'approved';
      const terms = text(input.terms, 40) || 'net30';
      const note = text(input.note, 500);
      const existing = await db.execute({ sql: "SELECT * FROM records WHERE type='supplier' AND json_extract(data,'$.supplier')=? AND archived IS NULL", args: [supplierId] });
      let supplierRec: Row;
      if (existing.rows[0]) {
        const current = decode(existing.rows[0]);
        supplierRec = await revise(db, current, `Supplier ${supplierId}`, 'qualified', { ...current.data, supplier: supplierId, tier, terms, note: note || null }, at, current.version);
      } else {
        supplierRec = await insert(db, 'supplier', `Supplier ${supplierId}`, 'qualified', { supplier: supplierId, tier, terms, note: note || null }, actor, at);
      }
      result = { supplier: supplierRec };
    } else if (action === 'quote.request') {
      const supplierId = text(input.supplier, 160); await get(db, supplierId);
      const requestedLines = lines(input.lines);
      const deadline = input.deadline ? timestamp(input.deadline, 'Deadline') : null;
      const quote = await insert(db, 'quote', `Quote request ${supplierId}`, 'requested', {
        supplier: supplierId, lines: requestedLines, deadline, status: 'requested',
      }, actor, at);
      result = { quote };
    } else if (action === 'quote.record') {
      const supplierId = text(input.supplier, 160); await get(db, supplierId);
      const quotedLines = lines(input.lines, true);
      const code = currency(input.currency || 'INR');
      const validity = input.validity ? timestamp(input.validity, 'Validity') : null;
      const quote = await insert(db, 'quote', `Quote ${supplierId}`, 'received', {
        supplier: supplierId, lines: quotedLines, currency: code, validity, status: 'received',
      }, actor, at);
      result = { quote };
    } else if (action === 'purchase.submit') {
      const purchase = await get(db, text(input.purchase, 160), 'purchase');
      if (!['draft', 'ordered'].includes(purchase.state)) throw conflict('Purchase is not in a submittable state.');
      const note = text(input.note, 500);
      const updated = await db.execute({ sql: "UPDATE records SET state='submitted',data=?,version=version+1,updated=? WHERE id=? AND version=?", args: [json({ ...purchase.data, note: note || null, submitted: at }), at, purchase.id, purchase.version] });
      if (updated.rowsAffected !== 1) throw conflict('Purchase order changed.');
      result = { purchase: { id: purchase.id, state: 'submitted', version: purchase.version + 1 } };
    } else if (action === 'purchase.approve') {
      const purchase = await get(db, text(input.purchase, 160), 'purchase');
      if (purchase.state !== 'submitted') throw conflict('Purchase is not waiting for approval.');
      const comment = text(input.comment, 500);
      const updated = await db.execute({ sql: "UPDATE records SET state='ordered',data=?,version=version+1,updated=? WHERE id=? AND version=?", args: [json({ ...purchase.data, comment: comment || null, approved: at }), at, purchase.id, purchase.version] });
      if (updated.rowsAffected !== 1) throw conflict('Purchase order changed.');
      result = { purchase: { id: purchase.id, state: 'ordered', version: purchase.version + 1 } };
    } else if (action === 'purchase.reject') {
      const purchase = await get(db, text(input.purchase, 160), 'purchase');
      if (purchase.state !== 'submitted') throw conflict('Purchase is not waiting for approval.');
      const reason = text(input.reason, 500); if (!reason) throw badRequest('Rejection reason is required.');
      const updated = await db.execute({ sql: "UPDATE records SET state='rejected',data=?,version=version+1,updated=? WHERE id=? AND version=?", args: [json({ ...purchase.data, reason, rejected: at }), at, purchase.id, purchase.version] });
      if (updated.rowsAffected !== 1) throw conflict('Purchase order changed.');
      result = { purchase: { id: purchase.id, state: 'rejected', version: purchase.version + 1 } };
    } else if (action === 'warehouse.pick') {
      const order = await get(db, text(input.order, 160), 'order');
      const pickLines = lines(input.lines);
      const warehouse = text(input.warehouse, 80) || 'main';
      const pick = await insert(db, 'pick', `Pick for order ${order.id}`, 'picked', {
        order: order.id, lines: pickLines, warehouse, picked: at,
      }, actor, at);
      const updated = await db.execute({ sql: 'UPDATE records SET data=?,version=version+1,updated=? WHERE id=? AND version=?', args: [json({ ...order.data, pick: pick.id }), at, order.id, order.version] });
      if (updated.rowsAffected !== 1) throw conflict('Order changed.');
      result = { pick, order: { id: order.id, state: order.state, version: order.version + 1 } };
    } else if (action === 'warehouse.pack') {
      const order = await get(db, text(input.order, 160), 'order');
      let packDetails: unknown = input.packages;
      if (typeof packDetails === 'string') {
        try { packDetails = JSON.parse(packDetails); } catch { packDetails = [{ description: packDetails }]; }
      }
      const weight = integer(input.weight ?? 0, 'Weight');
      const pack = await insert(db, 'pack', `Pack for order ${order.id}`, 'packed', {
        order: order.id, packages: packDetails, weight, packed: at,
      }, actor, at);
      const updated = await db.execute({ sql: 'UPDATE records SET data=?,version=version+1,updated=? WHERE id=? AND version=?', args: [json({ ...order.data, pack: pack.id }), at, order.id, order.version] });
      if (updated.rowsAffected !== 1) throw conflict('Order changed.');
      result = { pack, order: { id: order.id, state: order.state, version: order.version + 1 } };
    } else if (action === 'shipment.dispatch') {
      const order = await get(db, text(input.order, 160), 'order');
      const carrier = text(input.carrier, 80); const tracking = text(input.tracking, 160);
      if (!carrier || !tracking) throw badRequest('Carrier and tracking number are required.');
      const shipment = await insert(db, 'shipment', `Shipment ${tracking}`, 'dispatched', {
        order: order.id, carrier, tracking, status: 'dispatched', dispatched: at,
      }, actor, at);
      const updated = await db.execute({ sql: "UPDATE records SET state='dispatched',data=?,version=version+1,updated=? WHERE id=? AND version=?", args: [json({ ...order.data, shipment: tracking }), at, order.id, order.version] });
      if (updated.rowsAffected !== 1) throw conflict('Order changed.');
      result = { shipment, order: { id: order.id, state: 'dispatched', version: order.version + 1 } };
    } else if (action === 'shipment.track') {
      const shipment = await get(db, text(input.shipment, 160), 'shipment');
      const statusVal = text(input.status, 40); if (!statusVal) throw badRequest('Tracking status is required.');
      const place = text(input.location, 100) || null;
      const note = text(input.note, 200) || null;
      const updated = await db.execute({ sql: 'UPDATE records SET data=?,version=version+1,updated=? WHERE id=? AND version=?', args: [json({ ...shipment.data, tracking: statusVal, location: place, note, tracked: at }), at, shipment.id, shipment.version] });
      if (updated.rowsAffected !== 1) throw conflict('Shipment changed.');
      result = { shipment: { id: shipment.id, state: shipment.state, version: shipment.version + 1 } };
    } else if (action === 'shipment.deliver') {
      const shipment = await get(db, text(input.shipment, 160), 'shipment');
      if (shipment.state === 'delivered') throw conflict('Shipment is already delivered.');
      const signature = text(input.signature, 100) || null;
      const updated = await db.execute({ sql: "UPDATE records SET state='delivered',data=?,version=version+1,updated=? WHERE id=? AND version=?", args: [json({ ...shipment.data, status: 'delivered', signature, delivered: at }), at, shipment.id, shipment.version] });
      if (updated.rowsAffected !== 1) throw conflict('Shipment changed.');
      let orderRes: { id: string; state: string; version: number } = { id: String(shipment.data.order || ''), state: 'delivered', version: 1 };
      if (shipment.data.order) {
        try {
          const order = await get(db, String(shipment.data.order), 'order');
          const orderUp = await db.execute({ sql: "UPDATE records SET state='delivered',data=?,version=version+1,updated=? WHERE id=? AND version=?", args: [json({ ...order.data, delivered: at }), at, order.id, order.version] });
          if (orderUp.rowsAffected === 1) orderRes = { id: order.id, state: 'delivered', version: order.version + 1 };
        } catch { /* order record update optional */ }
      }
      result = { shipment: { id: shipment.id, state: 'delivered', version: shipment.version + 1 }, order: orderRes };
    } else if (action === 'purchase.return') {
      const purchase = await get(db, text(input.purchase, 160), 'purchase');
      const returnLines = lines(input.lines);
      const reason = text(input.reason, 500); if (!reason) throw badRequest('Return reason is required.');
      const place = String(purchase.data.location || 'main');
      for (const line of returnLines) {
        const current = await stock(db, line.variant, place, at, actor);
        const onhand = Number(current.data.onhand) - line.quantity;
        if (onhand < 0) throw conflict(`Insufficient stock to return variant ${line.variant}.`);
        await setStock(db, current, onhand, Math.min(Number(current.data.reserved), onhand), at);
        await insert(db, 'movement', reason, 'posted', {
          variant: line.variant, location: place, quantity: -line.quantity, balance: onhand, purchase: purchase.id, reason,
        }, actor, at);
      }
      const ret = await insert(db, 'return', `Return ${purchase.id}`, 'returned', {
        purchase: purchase.id, lines: returnLines, reason, returned: at,
      }, actor, at);
      result = { return: ret, purchase: { id: purchase.id, state: purchase.state, version: purchase.version }, movement: { variant: returnLines[0].variant, quantity: -returnLines[0].quantity } };
    } else if (action === 'quality.inspect') {
      const target = text(input.target, 160); const resultVal = text(input.result, 80);
      if (!target || !resultVal) throw badRequest('Target and inspection result are required.');
      let metrics: unknown = input.metrics;
      if (typeof metrics === 'string') { try { metrics = JSON.parse(metrics); } catch { metrics = { note: metrics }; } }
      const notes = text(input.notes, 500);
      const inspection = await insert(db, 'inspection', `Inspection ${target}`, 'inspected', {
        target, result: resultVal, metrics: metrics || null, notes: notes || null, inspected: at,
      }, actor, at);
      result = { inspection };
    } else if (action === 'quality.release') {
      const batch = await get(db, text(input.batch, 160), 'batch');
      const disposition = text(input.disposition, 40) || 'released';
      const updated = await db.execute({ sql: 'UPDATE records SET data=?,version=version+1,updated=? WHERE id=? AND version=?', args: [json({ ...batch.data, quality: disposition, released: at }), at, batch.id, batch.version] });
      if (updated.rowsAffected !== 1) throw conflict('Batch changed.');
      const quality = await insert(db, 'quality', `Quality release ${batch.id}`, 'released', {
        batch: batch.id, disposition, released: at,
      }, actor, at);
      result = { batch: { id: batch.id, state: batch.state, version: batch.version + 1 }, quality };
    } else if (action === 'forecast.generate') {
      const horizon = integer(input.horizon ?? 30, 'Horizon', 1);
      const channel = text(input.channel, 40) || 'default';
      const notes = text(input.notes, 500);
      const forecast = await insert(db, 'forecast', `Forecast ${horizon}d`, 'generated', {
        horizon, channel, notes: notes || null, generated: at,
      }, actor, at);
      result = { forecast };
    } else if (action === 'replenishment.plan') {
      const place = location(input.location);
      const horizon = integer(input.horizon ?? 14, 'Horizon', 1);
      const plan = await insert(db, 'plan', `Replenishment plan ${place}`, 'active', {
        location: place, horizon, planned: at,
      }, actor, at);
      result = { plan, recommendations: [] };
    } else throw badRequest('Unsupported commerce action.');

    await db.execute(eventStatement({ action, actor, key, hash, result }));
    await db.commit();
    return result;
  } catch (cause) {
    await db.rollback().catch(() => undefined);
    throw cause;
  } finally { db.close(); }
}
