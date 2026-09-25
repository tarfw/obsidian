import type { ActionDefinition } from '../registry/catalog.ts';

const managers = ['owner', 'admin'] as const;
const operators = ['owner', 'admin', 'member'] as const;

export const commerceActions = [
  { id: 'catalog.item.save', version: 1, type: 'app', title: 'Save item', description: 'Create a sellable or purchasable catalog item.', interfaceKey: 'form', fields: [
    { key: 'name', label: 'Item name', kind: 'text', required: true }, { key: 'sku', label: 'Item code', kind: 'text', required: true },
  ], output: ['item'], roles: managers, effects: ['record_create'] },
  { id: 'catalog.variant.save', version: 1, type: 'app', title: 'Save variant', description: 'Create a concrete stock keeping variant for an item.', interfaceKey: 'form', fields: [
    { key: 'item', label: 'Item ID', kind: 'record', required: true }, { key: 'name', label: 'Variant name', kind: 'text', required: true }, { key: 'sku', label: 'SKU', kind: 'text', required: true },
  ], output: ['variant'], roles: managers, effects: ['record_create'] },
  { id: 'price.set', version: 1, type: 'app', title: 'Set price', description: 'Set the current exact unit price for a variant.', interfaceKey: 'form', fields: [
    { key: 'variant', label: 'Variant ID', kind: 'record', required: true }, { key: 'amount', label: 'Minor units', kind: 'number', required: true }, { key: 'currency', label: 'Currency', kind: 'text', required: true, defaultValue: 'INR' },
  ], output: ['price'], roles: managers, effects: ['record_create'] },
  { id: 'stock.adjust', version: 1, type: 'app', title: 'Adjust stock', description: 'Post a counted stock correction with a reason.', interfaceKey: 'form', fields: [
    { key: 'variant', label: 'Variant ID', kind: 'record', required: true }, { key: 'quantity', label: 'Quantity change', kind: 'number', required: true }, { key: 'reason', label: 'Reason', kind: 'text', required: true },
  ], output: ['stock', 'movement'], roles: managers, effects: ['stock_commit'] },
  { id: 'purchase.create', version: 1, type: 'app', title: 'Create purchase order', description: 'Commit an order to a supplier using exact variant, quantity and cost lines.', interfaceKey: 'form', fields: [
    { key: 'supplier', label: 'Supplier record ID', kind: 'record', required: true }, { key: 'lines', label: 'Lines as JSON', kind: 'textarea', required: true },
  ], output: ['purchase'], roles: managers, effects: ['record_create'] },
  { id: 'purchase.receive', version: 1, type: 'app', title: 'Receive purchase', description: 'Receive ordered quantities and post stock movements atomically.', interfaceKey: 'form', fields: [
    { key: 'purchase', label: 'Purchase order ID', kind: 'record', required: true }, { key: 'version', label: 'Version', kind: 'number', required: true }, { key: 'lines', label: 'Received lines as JSON; blank receives remaining', kind: 'textarea' },
  ], output: ['receipt', 'purchase'], roles: managers, effects: ['stock_commit', 'record_update'] },
  { id: 'order.create', version: 1, type: 'app', title: 'Create order', description: 'Price an order from current catalog truth and reserve stock.', interfaceKey: 'form', fields: [
    { key: 'customer', label: 'Customer record ID', kind: 'record' }, { key: 'lines', label: 'Lines as JSON', kind: 'textarea', required: true },
  ], output: ['order'], roles: operators, effects: ['stock_reserve', 'record_create'] },
  { id: 'order.fulfill', version: 1, type: 'app', title: 'Fulfil order', description: 'Commit reserved stock and mark an order fulfilled.', interfaceKey: 'confirmation', fields: [
    { key: 'order', label: 'Order ID', kind: 'record', required: true }, { key: 'version', label: 'Version', kind: 'number', required: true },
  ], output: ['order'], roles: operators, effects: ['stock_commit', 'record_update'] },
  { id: 'order.cancel', version: 1, type: 'app', title: 'Cancel order', description: 'Release reserved stock and cancel an open order.', interfaceKey: 'confirmation', fields: [
    { key: 'order', label: 'Order ID', kind: 'record', required: true }, { key: 'version', label: 'Version', kind: 'number', required: true },
  ], output: ['order'], roles: operators, effects: ['stock_release', 'record_update'] },
  { id: 'invoice.issue', version: 1, type: 'app', title: 'Issue invoice', description: 'Issue an exact invoice and balanced receivable posting.', interfaceKey: 'form', fields: [
    { key: 'order', label: 'Order ID', kind: 'record', required: true },
  ], output: ['invoice', 'posting'], roles: operators, effects: ['ledger_post', 'record_create'] },
  { id: 'payment.record', version: 1, type: 'app', title: 'Record payment', description: 'Record money received against an invoice and post it exactly.', interfaceKey: 'form', fields: [
    { key: 'invoice', label: 'Invoice ID', kind: 'record', required: true }, { key: 'amount', label: 'Minor units', kind: 'number', required: true }, { key: 'method', label: 'Method', kind: 'text', required: true }, { key: 'reference', label: 'Provider reference', kind: 'text' },
  ], output: ['payment', 'invoice', 'posting'], roles: operators, effects: ['money_commit', 'ledger_post'] },
  { id: 'refund.record', version: 1, type: 'app', title: 'Record refund', description: 'Record a refund against a payment and reverse the invoice balance.', interfaceKey: 'form', fields: [
    { key: 'payment', label: 'Payment ID', kind: 'record', required: true }, { key: 'amount', label: 'Minor units', kind: 'number', required: true }, { key: 'reason', label: 'Reason', kind: 'text', required: true }, { key: 'reference', label: 'Provider reference', kind: 'text' },
  ], output: ['refund', 'invoice', 'posting'], roles: managers, effects: ['money_commit', 'ledger_post'] },
] as const satisfies readonly ActionDefinition[];

export const commerceActionIds = new Set<string>(commerceActions.map((action) => action.id));
