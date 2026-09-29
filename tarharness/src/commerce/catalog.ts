import type { ActionDefinition } from '../registry/catalog.ts';

const managers = ['owner', 'admin'] as const;
const operators = ['owner', 'admin', 'member'] as const;

export const commerceActions = [
  { id: 'catalog.item.save', version: 1, type: 'app', title: 'Save item', description: 'Create a sellable or purchasable catalog item.', interfaceKey: 'form', fields: [
    { key: 'id', label: 'Item', kind: 'record', hidden: true }, { key: 'version', label: 'Version', kind: 'number', hidden: true },
    { key: 'name', label: 'Item name', kind: 'text', required: true }, { key: 'sku', label: 'Item code', kind: 'text', required: true },
    { key: 'unit', label: 'Base unit', kind: 'text', defaultValue: 'each' }, { key: 'tax', label: 'Tax basis points', kind: 'number', defaultValue: '0' },
    { key: 'status', label: 'Status (active or archived)', kind: 'text', defaultValue: 'active' },
  ], output: ['item'], roles: managers, effects: ['record_create'] },
  { id: 'catalog.variant.save', version: 1, type: 'app', title: 'Save variant', description: 'Create a concrete stock keeping variant for an item.', interfaceKey: 'form', fields: [
    { key: 'id', label: 'Variant', kind: 'record', hidden: true }, { key: 'version', label: 'Version', kind: 'number', hidden: true },
    { key: 'item', label: 'Item ID', kind: 'record', required: true }, { key: 'name', label: 'Variant name', kind: 'text', required: true }, { key: 'sku', label: 'SKU', kind: 'text', required: true },
    { key: 'barcode', label: 'Barcode', kind: 'text' }, { key: 'attributes', label: 'Attributes as JSON', kind: 'textarea' },
    { key: 'status', label: 'Status (active or archived)', kind: 'text', defaultValue: 'active' },
  ], output: ['variant'], roles: managers, effects: ['record_create'] },
  { id: 'price.set', version: 1, type: 'app', title: 'Set price', description: 'Set the current exact unit price for a variant.', interfaceKey: 'form', fields: [
    { key: 'variant', label: 'Variant ID', kind: 'record', required: true }, { key: 'amount', label: 'Minor units', kind: 'number', required: true }, { key: 'currency', label: 'Currency', kind: 'text', required: true, defaultValue: 'INR' },
    { key: 'channel', label: 'Channel', kind: 'text', defaultValue: 'default' }, { key: 'starts', label: 'Start timestamp', kind: 'number' }, { key: 'ends', label: 'End timestamp', kind: 'number' },
  ], output: ['price'], roles: managers, effects: ['record_create'] },
  { id: 'stock.adjust', version: 1, type: 'app', title: 'Adjust stock', description: 'Post a counted stock correction with a reason.', interfaceKey: 'form', fields: [
    { key: 'variant', label: 'Variant ID', kind: 'record', required: true }, { key: 'quantity', label: 'Quantity change', kind: 'number', required: true }, { key: 'reason', label: 'Reason', kind: 'text', required: true },
    { key: 'location', label: 'Location', kind: 'text', defaultValue: 'main' },
  ], output: ['stock', 'movement'], roles: managers, effects: ['stock_commit'] },
  { id: 'purchase.create', version: 1, type: 'app', title: 'Create purchase order', description: 'Commit an order to a supplier using exact variant, quantity and cost lines.', interfaceKey: 'form', fields: [
    { key: 'supplier', label: 'Supplier record ID', kind: 'record', required: true }, { key: 'lines', label: 'Lines as JSON', kind: 'textarea', required: true },
    { key: 'currency', label: 'Currency', kind: 'text', required: true, defaultValue: 'INR' }, { key: 'location', label: 'Receiving location', kind: 'text', defaultValue: 'main' },
  ], output: ['purchase'], roles: managers, effects: ['record_create'] },
  { id: 'purchase.receive', version: 1, type: 'app', title: 'Receive purchase', description: 'Receive ordered quantities and post stock movements atomically.', interfaceKey: 'form', fields: [
    { key: 'purchase', label: 'Purchase order ID', kind: 'record', required: true }, { key: 'version', label: 'Version', kind: 'number', required: true }, { key: 'lines', label: 'Received lines as JSON; blank receives remaining', kind: 'textarea' },
  ], output: ['receipt', 'purchase', 'posting'], roles: managers, effects: ['stock_commit', 'record_update', 'ledger_post'] },
  { id: 'order.create', version: 1, type: 'app', title: 'Create order', description: 'Price an order from current catalog truth and reserve stock.', interfaceKey: 'form', fields: [
    { key: 'customer', label: 'Customer record ID', kind: 'record' }, { key: 'lines', label: 'Lines as JSON', kind: 'textarea', required: true },
    { key: 'channel', label: 'Price channel', kind: 'text', defaultValue: 'default' }, { key: 'location', label: 'Stock location', kind: 'text', defaultValue: 'main' },
  ], output: ['order'], roles: operators, effects: ['stock_reserve', 'record_create'] },
  { id: 'order.fulfill', version: 1, type: 'app', title: 'Fulfil order', description: 'Commit reserved stock and mark an order fulfilled.', interfaceKey: 'confirmation', fields: [
    { key: 'order', label: 'Order ID', kind: 'record', required: true }, { key: 'version', label: 'Version', kind: 'number', required: true },
  ], output: ['order'], roles: operators, effects: ['stock_commit', 'record_update'] },
  { id: 'order.cancel', version: 1, type: 'app', title: 'Cancel order', description: 'Release reserved stock and cancel an open order.', interfaceKey: 'confirmation', fields: [
    { key: 'order', label: 'Order ID', kind: 'record', required: true }, { key: 'version', label: 'Version', kind: 'number', required: true },
  ], output: ['order'], roles: operators, effects: ['stock_release', 'record_update'] },
  { id: 'invoice.issue', version: 1, type: 'app', title: 'Issue invoice', description: 'Issue an exact invoice and balanced receivable posting.', interfaceKey: 'form', fields: [
    { key: 'order', label: 'Order ID', kind: 'record', required: true }, { key: 'due', label: 'Due timestamp', kind: 'number' },
  ], output: ['invoice', 'posting'], roles: operators, effects: ['ledger_post', 'record_create'] },
  { id: 'payment.record', version: 1, type: 'app', title: 'Record payment', description: 'Record money received against an invoice and post it exactly.', interfaceKey: 'form', fields: [
    { key: 'invoice', label: 'Invoice ID', kind: 'record', required: true }, { key: 'amount', label: 'Minor units', kind: 'number', required: true }, { key: 'method', label: 'Method', kind: 'text', required: true }, { key: 'provider', label: 'Provider', kind: 'text' }, { key: 'reference', label: 'Provider reference', kind: 'text' },
  ], output: ['payment', 'invoice', 'posting'], roles: operators, effects: ['money_commit', 'ledger_post'] },
  { id: 'refund.record', version: 1, type: 'app', title: 'Record refund', description: 'Record a refund against a payment and reverse the invoice balance.', interfaceKey: 'form', fields: [
    { key: 'payment', label: 'Payment ID', kind: 'record', required: true }, { key: 'amount', label: 'Minor units', kind: 'number', required: true }, { key: 'reason', label: 'Reason', kind: 'text', required: true }, { key: 'provider', label: 'Provider', kind: 'text' }, { key: 'reference', label: 'Provider reference', kind: 'text' },
  ], output: ['refund', 'invoice', 'posting'], roles: managers, effects: ['money_commit', 'ledger_post'] },
  // 1. Supplier payments
  {
    id: 'purchase.pay', version: 1, type: 'app', title: 'Pay purchase order',
    description: 'Record payment against a purchase order.', interfaceKey: 'form',
    fields: [
      { key: 'purchase', label: 'Purchase ID', kind: 'record', required: true },
      { key: 'amount', label: 'Minor units', kind: 'number', required: true },
      { key: 'method', label: 'Payment method', kind: 'text', required: true },
      { key: 'account', label: 'Account', kind: 'text', defaultValue: 'main' },
      { key: 'reference', label: 'Payment reference', kind: 'text' },
    ],
    output: ['payment', 'purchase', 'posting'], roles: managers, effects: ['money_commit', 'ledger_post'],
  },
  // 2. Expenses
  {
    id: 'expense.record', version: 1, type: 'app', title: 'Record expense',
    description: 'Record a business expense with category and cost.', interfaceKey: 'form',
    fields: [
      { key: 'payee', label: 'Payee or vendor', kind: 'text', required: true },
      { key: 'category', label: 'Expense category', kind: 'text', required: true },
      { key: 'amount', label: 'Minor units', kind: 'number', required: true },
      { key: 'currency', label: 'Currency', kind: 'text', required: true, defaultValue: 'INR' },
      { key: 'note', label: 'Description', kind: 'textarea' },
      { key: 'lines', label: 'Expense lines as JSON', kind: 'textarea' },
    ],
    output: ['expense', 'posting'], roles: operators, effects: ['ledger_post', 'record_create'],
  },
  {
    id: 'expense.reverse', version: 1, type: 'app', title: 'Reverse expense',
    description: 'Reverse an existing expense record.', interfaceKey: 'confirmation',
    fields: [
      { key: 'expense', label: 'Expense ID', kind: 'record', required: true },
      { key: 'reason', label: 'Reason for reversal', kind: 'textarea', required: true },
    ],
    output: ['expense', 'posting'], roles: managers, effects: ['ledger_post', 'record_update'],
  },
  // 3. Bank reconciliation
  {
    id: 'bank.import', version: 1, type: 'app', title: 'Import bank statement',
    description: 'Import bank statement lines for reconciliation.', interfaceKey: 'form',
    fields: [
      { key: 'account', label: 'Bank account', kind: 'text', required: true },
      { key: 'statement', label: 'Statement JSON or CSV', kind: 'textarea', required: true },
      { key: 'format', label: 'Format (csv or json)', kind: 'text', defaultValue: 'json' },
    ],
    output: ['statement', 'count'], roles: managers, effects: ['record_create'],
  },
  {
    id: 'bank.reconcile', version: 1, type: 'app', title: 'Reconcile bank account',
    description: 'Reconcile matched bank transactions against ledger.', interfaceKey: 'form',
    fields: [
      { key: 'account', label: 'Bank account', kind: 'text', required: true },
      { key: 'period', label: 'Reconciliation period', kind: 'text', required: true },
      { key: 'balance', label: 'Closing balance in minor units', kind: 'number', required: true },
    ],
    output: ['reconciliation', 'difference'], roles: managers, effects: ['ledger_post', 'record_update'],
  },
  // 4. Period closing
  {
    id: 'period.close', version: 1, type: 'app', title: 'Close accounting period',
    description: 'Close accounting period to lock entries.', interfaceKey: 'confirmation',
    fields: [
      { key: 'period', label: 'Period name or date', kind: 'text', required: true },
      { key: 'note', label: 'Closing notes', kind: 'textarea' },
    ],
    output: ['period', 'closed'], roles: managers, effects: ['ledger_post', 'record_update'],
  },
  {
    id: 'period.reopen', version: 1, type: 'app', title: 'Reopen accounting period',
    description: 'Reopen a closed accounting period.', interfaceKey: 'confirmation',
    fields: [
      { key: 'period', label: 'Period name or date', kind: 'text', required: true },
      { key: 'reason', label: 'Reason to reopen', kind: 'textarea', required: true },
    ],
    output: ['period', 'reopened'], roles: ['owner'], effects: ['record_update'],
  },
  // 5. Stock transfers
  {
    id: 'stock.transfer', version: 1, type: 'app', title: 'Transfer stock',
    description: 'Transfer inventory between locations or warehouses.', interfaceKey: 'form',
    fields: [
      { key: 'variant', label: 'Variant ID', kind: 'record', required: true },
      { key: 'quantity', label: 'Transfer quantity', kind: 'number', required: true },
      { key: 'source', label: 'Source location', kind: 'text', required: true, defaultValue: 'main' },
      { key: 'target', label: 'Target location', kind: 'text', required: true },
      { key: 'reason', label: 'Transfer reason', kind: 'text' },
    ],
    output: ['movement', 'transfer'], roles: operators, effects: ['stock_commit'],
  },
  // 6. Batches / expiry
  {
    id: 'batch.save', version: 1, type: 'app', title: 'Save batch',
    description: 'Record a batch or lot with manufacture and expiry details.', interfaceKey: 'form',
    fields: [
      { key: 'variant', label: 'Variant ID', kind: 'record', required: true },
      { key: 'batch', label: 'Batch number or code', kind: 'text', required: true },
      { key: 'quantity', label: 'Batch quantity', kind: 'number', required: true },
      { key: 'expiry', label: 'Expiry timestamp', kind: 'number', required: true },
    ],
    output: ['batch'], roles: managers, effects: ['record_create'],
  },
  {
    id: 'batch.dispose', version: 1, type: 'app', title: 'Dispose batch',
    description: 'Dispose expired or damaged batch inventory.', interfaceKey: 'confirmation',
    fields: [
      { key: 'batch', label: 'Batch ID', kind: 'record', required: true },
      { key: 'quantity', label: 'Disposed quantity', kind: 'number', required: true },
      { key: 'reason', label: 'Disposal reason', kind: 'textarea', required: true },
    ],
    output: ['batch', 'movement'], roles: managers, effects: ['stock_commit', 'record_update'],
  },
  // 7. Recipes / production
  {
    id: 'recipe.save', version: 1, type: 'app', title: 'Save recipe',
    description: 'Define bill of materials and recipe ingredients.', interfaceKey: 'form',
    fields: [
      { key: 'name', label: 'Recipe name', kind: 'text', required: true },
      { key: 'variant', label: 'Produced variant ID', kind: 'record', required: true },
      { key: 'yield', label: 'Output quantity', kind: 'number', required: true, defaultValue: '1' },
      { key: 'ingredients', label: 'Ingredients as JSON', kind: 'textarea', required: true },
    ],
    output: ['recipe'], roles: managers, effects: ['record_create'],
  },
  {
    id: 'production.start', version: 1, type: 'app', title: 'Start production',
    description: 'Start a production run and consume ingredients.', interfaceKey: 'form',
    fields: [
      { key: 'recipe', label: 'Recipe ID', kind: 'record', required: true },
      { key: 'quantity', label: 'Planned output quantity', kind: 'number', required: true },
      { key: 'location', label: 'Production facility', kind: 'text', defaultValue: 'main' },
    ],
    output: ['production', 'movement'], roles: operators, effects: ['stock_reserve', 'record_create'],
  },
  {
    id: 'production.complete', version: 1, type: 'app', title: 'Complete production',
    description: 'Complete production run and yield finished goods.', interfaceKey: 'confirmation',
    fields: [
      { key: 'production', label: 'Production ID', kind: 'record', required: true },
      { key: 'yield', label: 'Actual completed units', kind: 'number', required: true },
      { key: 'waste', label: 'Scrap or waste units', kind: 'number', defaultValue: '0' },
    ],
    output: ['production', 'movement'], roles: operators, effects: ['stock_commit', 'record_update'],
  },
  // 8. Bookings / time
  {
    id: 'booking.create', version: 1, type: 'app', title: 'Create booking',
    description: 'Create an appointment, reservation or service booking.', interfaceKey: 'form',
    fields: [
      { key: 'customer', label: 'Customer record ID', kind: 'record' },
      { key: 'service', label: 'Service name or ID', kind: 'text', required: true },
      { key: 'start', label: 'Start timestamp', kind: 'number', required: true },
      { key: 'end', label: 'End timestamp', kind: 'number', required: true },
      { key: 'resource', label: 'Table, room or staff', kind: 'text' },
    ],
    output: ['booking'], roles: operators, effects: ['record_create'],
  },
  {
    id: 'booking.cancel', version: 1, type: 'app', title: 'Cancel booking',
    description: 'Cancel a scheduled booking.', interfaceKey: 'confirmation',
    fields: [
      { key: 'booking', label: 'Booking ID', kind: 'record', required: true },
      { key: 'reason', label: 'Cancellation reason', kind: 'textarea' },
    ],
    output: ['booking'], roles: operators, effects: ['record_update'],
  },
  {
    id: 'time.record', version: 1, type: 'app', title: 'Record time log',
    description: 'Record billable hours or labor time logs.', interfaceKey: 'form',
    fields: [
      { key: 'member', label: 'Worker or member ID', kind: 'text', required: true },
      { key: 'hours', label: 'Hours worked', kind: 'number', required: true },
      { key: 'task', label: 'Task or project ID', kind: 'record' },
      { key: 'note', label: 'Work performed', kind: 'textarea' },
    ],
    output: ['time'], roles: operators, effects: ['record_create'],
  },
  // 9. Taxi trips / fares
  {
    id: 'trip.start', version: 1, type: 'app', title: 'Start trip',
    description: 'Start a taxi or rideshare trip with pickup coordinates.', interfaceKey: 'form',
    fields: [
      { key: 'passenger', label: 'Passenger contact or name', kind: 'text', required: true },
      { key: 'pickup', label: 'Pickup location', kind: 'text', required: true },
      { key: 'destination', label: 'Dropoff destination', kind: 'text', required: true },
      { key: 'driver', label: 'Driver ID or name', kind: 'text' },
    ],
    output: ['trip'], roles: operators, effects: ['record_create'],
  },
  {
    id: 'trip.complete', version: 1, type: 'app', title: 'Complete trip',
    description: 'End a trip and calculate actual fare and distance.', interfaceKey: 'form',
    fields: [
      { key: 'trip', label: 'Trip ID', kind: 'record', required: true },
      { key: 'fare', label: 'Total fare in minor units', kind: 'number', required: true },
      { key: 'distance', label: 'Distance in km', kind: 'number' },
      { key: 'duration', label: 'Minutes elapsed', kind: 'number' },
    ],
    output: ['trip', 'posting'], roles: operators, effects: ['record_update', 'ledger_post'],
  },
  {
    id: 'fare.set', version: 1, type: 'app', title: 'Set fare rate',
    description: 'Configure base and per-kilometer taxi fare rates.', interfaceKey: 'form',
    fields: [
      { key: 'base', label: 'Base fare in minor units', kind: 'number', required: true },
      { key: 'rate', label: 'Rate per km in minor units', kind: 'number', required: true },
      { key: 'currency', label: 'Currency', kind: 'text', required: true, defaultValue: 'INR' },
      { key: 'tier', label: 'Vehicle class or tier', kind: 'text', defaultValue: 'standard' },
    ],
    output: ['fare'], roles: managers, effects: ['settings_update'],
  },
  // 10. Workforce / payroll
  {
    id: 'shift.assign', version: 1, type: 'app', title: 'Assign shift',
    description: 'Schedule a work shift for a team member.', interfaceKey: 'form',
    fields: [
      { key: 'member', label: 'Member email or ID', kind: 'text', required: true },
      { key: 'role', label: 'Assigned work role', kind: 'text', required: true },
      { key: 'start', label: 'Shift start timestamp', kind: 'number', required: true },
      { key: 'end', label: 'Shift end timestamp', kind: 'number', required: true },
      { key: 'location', label: 'Workstation or venue', kind: 'text' },
    ],
    output: ['shift'], roles: managers, effects: ['record_create'],
  },
  {
    id: 'attendance.record', version: 1, type: 'app', title: 'Record attendance',
    description: 'Clock-in, clock-out or mark member attendance.', interfaceKey: 'form',
    fields: [
      { key: 'member', label: 'Member email or ID', kind: 'text', required: true },
      { key: 'status', label: 'Attendance status', kind: 'text', required: true },
      { key: 'timestamp', label: 'Timestamp', kind: 'number', required: true },
      { key: 'note', label: 'Notes', kind: 'text' },
    ],
    output: ['attendance'], roles: operators, effects: ['record_create'],
  },
  {
    id: 'payroll.run', version: 1, type: 'app', title: 'Run payroll',
    description: 'Calculate payroll deductions, earnings and totals for a period.', interfaceKey: 'form',
    fields: [
      { key: 'period', label: 'Pay period (e.g. 2026-09)', kind: 'text', required: true },
      { key: 'currency', label: 'Currency', kind: 'text', required: true, defaultValue: 'INR' },
      { key: 'note', label: 'Payroll run notes', kind: 'textarea' },
    ],
    output: ['payroll', 'summary'], roles: managers, effects: ['ledger_post', 'record_create'],
  },
  {
    id: 'payroll.pay', version: 1, type: 'app', title: 'Disburse payroll',
    description: 'Commit and disburse wage payments for a payroll run.', interfaceKey: 'confirmation',
    fields: [
      { key: 'payroll', label: 'Payroll run ID', kind: 'record', required: true },
      { key: 'method', label: 'Disbursement method', kind: 'text', required: true, defaultValue: 'bank' },
    ],
    output: ['payroll', 'posting'], roles: ['owner'], effects: ['money_commit', 'ledger_post'],
  },
  // 11. Supplier sourcing / quotes
  {
    id: 'supplier.qualify', version: 1, type: 'app', title: 'Qualify supplier',
    description: 'Qualify a supplier with certifications, terms and tiers.', interfaceKey: 'form',
    fields: [
      { key: 'supplier', label: 'Supplier organization ID', kind: 'record', required: true },
      { key: 'tier', label: 'Supplier tier or status', kind: 'text', required: true, defaultValue: 'approved' },
      { key: 'terms', label: 'Payment terms (e.g. net30)', kind: 'text', defaultValue: 'net30' },
      { key: 'note', label: 'Evaluation notes', kind: 'textarea' },
    ],
    output: ['supplier'], roles: managers, effects: ['record_update'],
  },
  {
    id: 'quote.request', version: 1, type: 'app', title: 'Request quotation',
    description: 'Request pricing quotation from suppliers for catalog items.', interfaceKey: 'form',
    fields: [
      { key: 'supplier', label: 'Supplier organization ID', kind: 'record', required: true },
      { key: 'lines', label: 'Requested items JSON', kind: 'textarea', required: true },
      { key: 'deadline', label: 'Response deadline timestamp', kind: 'number' },
    ],
    output: ['quote'], roles: operators, effects: ['record_create'],
  },
  {
    id: 'quote.record', version: 1, type: 'app', title: 'Record quotation',
    description: 'Record received supplier price quotation.', interfaceKey: 'form',
    fields: [
      { key: 'supplier', label: 'Supplier organization ID', kind: 'record', required: true },
      { key: 'lines', label: 'Quoted lines as JSON', kind: 'textarea', required: true },
      { key: 'currency', label: 'Currency', kind: 'text', required: true, defaultValue: 'INR' },
      { key: 'validity', label: 'Valid until timestamp', kind: 'number' },
    ],
    output: ['quote'], roles: operators, effects: ['record_create'],
  },
  // 12. Purchase approvals
  {
    id: 'purchase.submit', version: 1, type: 'app', title: 'Submit purchase order',
    description: 'Submit a purchase order draft for management approval.', interfaceKey: 'confirmation',
    fields: [
      { key: 'purchase', label: 'Purchase ID', kind: 'record', required: true },
      { key: 'note', label: 'Justification note', kind: 'textarea' },
    ],
    output: ['purchase'], roles: operators, effects: ['record_update', 'inbox'],
  },
  {
    id: 'purchase.approve', version: 1, type: 'app', title: 'Approve purchase order',
    description: 'Approve a submitted purchase order.', interfaceKey: 'confirmation',
    fields: [
      { key: 'purchase', label: 'Purchase ID', kind: 'record', required: true },
      { key: 'comment', label: 'Approval comments', kind: 'text' },
    ],
    output: ['purchase'], roles: managers, effects: ['record_update', 'inbox'],
  },
  {
    id: 'purchase.reject', version: 1, type: 'app', title: 'Reject purchase order',
    description: 'Reject a submitted purchase order.', interfaceKey: 'form',
    fields: [
      { key: 'purchase', label: 'Purchase ID', kind: 'record', required: true },
      { key: 'reason', label: 'Rejection reason', kind: 'textarea', required: true },
    ],
    output: ['purchase'], roles: managers, effects: ['record_update', 'inbox'],
  },
  // 13. Warehouse picking / packing
  {
    id: 'warehouse.pick', version: 1, type: 'app', title: 'Pick warehouse items',
    description: 'Pick ordered inventory items from warehouse bin locations.', interfaceKey: 'form',
    fields: [
      { key: 'order', label: 'Order ID', kind: 'record', required: true },
      { key: 'lines', label: 'Picked lines JSON', kind: 'textarea', required: true },
      { key: 'warehouse', label: 'Warehouse ID or name', kind: 'text', defaultValue: 'main' },
    ],
    output: ['pick', 'order'], roles: operators, effects: ['stock_commit', 'record_update'],
  },
  {
    id: 'warehouse.pack', version: 1, type: 'app', title: 'Pack shipment parcel',
    description: 'Pack picked inventory into parcels with weights and dimensions.', interfaceKey: 'form',
    fields: [
      { key: 'order', label: 'Order ID', kind: 'record', required: true },
      { key: 'packages', label: 'Package details JSON', kind: 'textarea', required: true },
      { key: 'weight', label: 'Weight in grams', kind: 'number' },
    ],
    output: ['pack', 'order'], roles: operators, effects: ['record_update'],
  },
  // 14. Shipping / tracking
  {
    id: 'shipment.dispatch', version: 1, type: 'app', title: 'Dispatch shipment',
    description: 'Dispatch package with carrier and tracking number.', interfaceKey: 'form',
    fields: [
      { key: 'order', label: 'Order ID', kind: 'record', required: true },
      { key: 'carrier', label: 'Carrier name', kind: 'text', required: true },
      { key: 'tracking', label: 'Tracking number', kind: 'text', required: true },
    ],
    output: ['shipment', 'order'], roles: operators, effects: ['record_update'],
  },
  {
    id: 'shipment.track', version: 1, type: 'app', title: 'Update tracking status',
    description: 'Update tracking status or milestone location for a shipment.', interfaceKey: 'form',
    fields: [
      { key: 'shipment', label: 'Shipment ID', kind: 'record', required: true },
      { key: 'status', label: 'Status', kind: 'text', required: true },
      { key: 'location', label: 'Current location', kind: 'text' },
      { key: 'note', label: 'Status note', kind: 'text' },
    ],
    output: ['shipment'], roles: operators, effects: ['record_update'],
  },
  {
    id: 'shipment.deliver', version: 1, type: 'app', title: 'Confirm delivery',
    description: 'Confirm customer parcel delivery and proof of delivery.', interfaceKey: 'confirmation',
    fields: [
      { key: 'shipment', label: 'Shipment ID', kind: 'record', required: true },
      { key: 'signature', label: 'Receiver signature or name', kind: 'text' },
    ],
    output: ['shipment', 'order'], roles: operators, effects: ['record_update'],
  },
  // 15. Supplier returns / quality
  {
    id: 'purchase.return', version: 1, type: 'app', title: 'Return supplier purchase',
    description: 'Return damaged or incorrect goods to a supplier.', interfaceKey: 'form',
    fields: [
      { key: 'purchase', label: 'Purchase ID', kind: 'record', required: true },
      { key: 'lines', label: 'Returned lines JSON', kind: 'textarea', required: true },
      { key: 'reason', label: 'Reason for return', kind: 'textarea', required: true },
    ],
    output: ['return', 'purchase', 'movement'], roles: managers, effects: ['stock_commit', 'record_update'],
  },
  {
    id: 'quality.inspect', version: 1, type: 'app', title: 'Inspect batch quality',
    description: 'Record quality inspection results for incoming or produced batches.', interfaceKey: 'form',
    fields: [
      { key: 'target', label: 'Inspected batch or item ID', kind: 'record', required: true },
      { key: 'result', label: 'Inspection result', kind: 'text', required: true },
      { key: 'metrics', label: 'Test metrics as JSON', kind: 'textarea' },
      { key: 'notes', label: 'Inspection notes', kind: 'textarea' },
    ],
    output: ['inspection'], roles: operators, effects: ['record_create'],
  },
  {
    id: 'quality.release', version: 1, type: 'app', title: 'Release inspected batch',
    description: 'Release inspected batch for sale or production.', interfaceKey: 'confirmation',
    fields: [
      { key: 'batch', label: 'Batch ID', kind: 'record', required: true },
      { key: 'disposition', label: 'Disposition decision', kind: 'text', defaultValue: 'released' },
    ],
    output: ['batch', 'quality'], roles: managers, effects: ['record_update'],
  },
  // 16. Demand / replenishment
  {
    id: 'forecast.generate', version: 1, type: 'app', title: 'Generate demand forecast',
    description: 'Generate demand forecast from historical sales and seasonality.', interfaceKey: 'form',
    fields: [
      { key: 'horizon', label: 'Forecast horizon in days', kind: 'number', required: true, defaultValue: '30' },
      { key: 'channel', label: 'Sales channel', kind: 'text', defaultValue: 'default' },
      { key: 'notes', label: 'Forecast assumptions', kind: 'textarea' },
    ],
    output: ['forecast'], roles: managers, effects: ['record_create'],
  },
  {
    id: 'replenishment.plan', version: 1, type: 'app', title: 'Plan inventory replenishment',
    description: 'Calculate replenishment purchase orders based on stock and lead times.', interfaceKey: 'form',
    fields: [
      { key: 'location', label: 'Location', kind: 'text', defaultValue: 'main' },
      { key: 'horizon', label: 'Replenishment days', kind: 'number', required: true, defaultValue: '14' },
    ],
    output: ['plan', 'recommendations'], roles: managers, effects: ['record_create'],
  },
] as const satisfies readonly ActionDefinition[];

export const commerceActionIds = new Set<string>(commerceActions.map((action) => action.id));

