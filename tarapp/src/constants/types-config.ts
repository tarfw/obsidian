/**
 * Canonical Type Codes and Mapping System (plan6.md)
 *
 * All DB records store integer type codes for storage efficiency and query speed.
 * This registry provides bi-directional mapping between type names and integer IDs.
 */

// ── Matter Types (1–49 core, 50–99 reserved, 100–199 custom) ────────
export const MATTER_TYPES = {
  person: 1,
  company: 2,
  product: 3,
  service: 4,
  listing: 5,
  document: 6,
  asset: 7,
  location: 8,
  flow_def: 9,
  pipeline: 9,
  flow: 10,
  card: 10,
  deal: 10,
  note: 11,
  goal: 12,
  expense: 13,
  order: 14,
} as const;

export type MatterTypeName = keyof typeof MATTER_TYPES;
export type MatterTypeCode = typeof MATTER_TYPES[MatterTypeName];

export const MATTER_TYPE_NAMES: Record<number, MatterTypeName> = {
  1: 'person',
  2: 'company',
  3: 'product',
  4: 'service',
  5: 'listing',
  6: 'document',
  7: 'asset',
  8: 'location',
  9: 'flow_def',
  10: 'flow',
  11: 'note',
  12: 'goal',
  13: 'expense',
  14: 'order',
};

// ── Motion Types (101–199 workspace, 200–299 personal) ───────────────
export const MOTION_TYPES = {
  // Workspace Motions (101–199)
  sale: 101,
  refund: 102,
  quote: 103,
  invoice: 104,
  purchase_order: 105,
  vendor_bill: 106,
  payment: 107,
  stock_receive: 108,
  stock_transfer: 109,
  stock_adjust: 110,
  stock_writeoff: 111,
  booking: 112,
  booking_cancel: 113,
  shipment: 114,
  delivery: 115,
  activity: 116,
  assignment: 117,
  clock_in: 118,
  clock_out: 119,
  flow_stage: 120,
  card_stage: 120,
  flow_complete: 121,
  flow_won: 121,
  card_won: 121,
  flow_dropped: 122,
  flow_lost: 122,
  card_lost: 122,
  status_change: 123,
  order_placed: 124,
  order_ready: 125,
  order_served: 126,

  // Personal Motions (201–299)
  expense_log: 201,
  reminder_triggered: 202,
  goal_update: 203,
  personal_note: 204,
} as const;

export type MotionTypeName = keyof typeof MOTION_TYPES;
export type MotionTypeCode = typeof MOTION_TYPES[MotionTypeName];

export const MOTION_TYPE_NAMES: Record<number, MotionTypeName> = {
  101: 'sale',
  102: 'refund',
  103: 'quote',
  104: 'invoice',
  105: 'purchase_order',
  106: 'vendor_bill',
  107: 'payment',
  108: 'stock_receive',
  109: 'stock_transfer',
  110: 'stock_adjust',
  111: 'stock_writeoff',
  112: 'booking',
  113: 'booking_cancel',
  114: 'shipment',
  115: 'delivery',
  116: 'activity',
  117: 'assignment',
  118: 'clock_in',
  119: 'clock_out',
  120: 'flow_stage',
  121: 'flow_complete',
  122: 'flow_dropped',
  123: 'status_change',
  124: 'order_placed',
  125: 'order_ready',
  126: 'order_served',
  201: 'expense_log',
  202: 'reminder_triggered',
  203: 'goal_update',
  204: 'personal_note',
};

// ── Inbox Types (1–9 core, 10+ reserved) ─────────────────────────────
export const INBOX_TYPES = {
  task: 1,
  alert: 2,
  approval: 3,
  reminder: 4,
  notification: 5,
  suggestion: 6,
} as const;

export type InboxTypeName = keyof typeof INBOX_TYPES;
export type InboxTypeCode = typeof INBOX_TYPES[InboxTypeName];

export const INBOX_TYPE_NAMES: Record<number, InboxTypeName> = Object.fromEntries(
  Object.entries(INBOX_TYPES).map(([k, v]) => [v, k as InboxTypeName])
);

// ── Graph Relationship Types (1–49 core, 50+ custom) ─────────────────
export const GRAPH_REL_TYPES = {
  placed_by: 1,
  fulfills: 3,
  works_at: 4,
  assigned_to: 5,
  stored_at: 6,
  from: 7,
  for_contact: 8,
  in_flow: 9,
  in_pipeline: 9,
  owned_by: 10,
  about: 11,
  member_of: 12,
  linked_to: 13,
  variant_of: 14,
  served_by: 15,
} as const;

export type GraphRelTypeName = keyof typeof GRAPH_REL_TYPES;
export type GraphRelTypeCode = typeof GRAPH_REL_TYPES[GraphRelTypeName];

export const GRAPH_REL_TYPE_NAMES: Record<number, GraphRelTypeName> = {
  1: 'placed_by',
  3: 'fulfills',
  4: 'works_at',
  5: 'assigned_to',
  6: 'stored_at',
  7: 'from',
  8: 'for_contact',
  9: 'in_flow',
  10: 'owned_by',
  11: 'about',
  12: 'member_of',
  13: 'linked_to',
  14: 'variant_of',
  15: 'served_by',
};

// ── Helper Resolvers ─────────────────────────────────────────────────
export function toMatterTypeCode(type?: string | number | null): number {
  if (type === undefined || type === null || type === '') return 1;
  if (typeof type === 'number') return type;
  const lower = String(type).toLowerCase().trim() as MatterTypeName;
  return MATTER_TYPES[lower] ?? 1;
}

export function toMotionTypeCode(type?: string | number | null): number {
  if (type === undefined || type === null || type === '') return 123;
  if (typeof type === 'number') return type;
  const lower = String(type).toLowerCase().trim() as MotionTypeName;
  return MOTION_TYPES[lower] ?? 123;
}

export function toInboxTypeCode(type?: string | number | null): number {
  if (type === undefined || type === null || type === '') return 1;
  if (typeof type === 'number') return type;
  const lower = String(type).toLowerCase().trim() as InboxTypeName;
  return INBOX_TYPES[lower] ?? 1;
}

export function toGraphRelCode(rel?: string | number | null): number {
  if (rel === undefined || rel === null || rel === '') return 4;
  if (typeof rel === 'number') return rel;
  const lower = String(rel).toLowerCase().trim() as GraphRelTypeName;
  return GRAPH_REL_TYPES[lower] ?? 4;
}

// ── Compact JSON Key Mappings (Rule 2) ───────────────────────────────
export const COMPACT_KEYS = {
  fn: 'first_name',
  ln: 'last_name',
  ph: 'phone',
  em: 'email',
  amt: 'amount',
  cur: 'currency',
  sku: 'sku',
  qty: 'quantity',
  prc: 'price',
  sts: 'status',
  hdl: 'handle',
  sec: 'section',
  tbl: 'tables',
} as const;
