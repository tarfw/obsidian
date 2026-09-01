/**
 * TARAI Domain Types & Canonical Type Registry (matter.md §5 & §6)
 */

export type Role = 'owner' | 'admin' | 'member' | 'guest';
export type MemberStatus = 'active' | 'suspended' | 'revoked';
export type RiskClass = 'read' | 'draft' | 'reversible_write' | 'consequential' | 'restricted';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  currency: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  workspaceId: string;
  userId: string;
  email: string;
  role: Role;
  status: MemberStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContext {
  userId: string;
  workspaceId: string;
  email: string;
  role: Role;
  status: MemberStatus;
  audience: 'owner' | 'member' | 'customer' | 'system';
}

// ── Canonical Immutable Type Registry (matter.md §6) ──────────────────

export const MATTER_TYPES = {
  person: 1,
  organization: 2,
  company: 2,
  product: 3,
  service: 4,
  listing: 5,
  document: 6,
  asset: 7,
  location: 8,
  flow_definition: 9,
  pipeline: 9,
  flow_def: 9,
  flow: 10,
  card: 10,
  deal: 10,
  note: 11,
  goal: 12,
  expense: 13,
  order: 14,
  ticket: 15,
  booking: 16,
  invoice: 17,
  quote: 18,
  shipment: 19,
  task: 20,
  resource: 21,
  payment: 22,
} as const;

export type MatterTypeName = keyof typeof MATTER_TYPES;
export type MatterTypeCode = typeof MATTER_TYPES[MatterTypeName];

export const MATTER_TYPE_NAMES: Record<number, string> = {
  1: 'person',
  2: 'organization',
  3: 'product',
  4: 'service',
  5: 'listing',
  6: 'document',
  7: 'asset',
  8: 'location',
  9: 'flow_definition',
  10: 'flow',
  11: 'note',
  12: 'goal',
  13: 'expense',
  14: 'order',
  15: 'ticket',
  16: 'booking',
  17: 'invoice',
  18: 'quote',
  19: 'shipment',
  20: 'task',
  21: 'resource',
  22: 'payment',
};

export const MOTION_TYPES = {
  // Workspace Motions (101-199)
  sale: 101,
  refund: 102,
  quote_issued: 103,
  quote: 103,
  invoice_issued: 104,
  invoice: 104,
  purchase_order_issued: 105,
  purchase_order: 105,
  vendor_bill_received: 106,
  vendor_bill: 106,
  payment_recorded: 107,
  payment: 107,
  stock_received: 108,
  stock_receive: 108,
  stock_transferred: 109,
  stock_transfer: 109,
  stock_adjusted: 110,
  stock_adjust: 110,
  inventory_adjusted: 110,
  inventory_adjust: 110,
  'inventory.adjusted': 110,
  stock_written_off: 111,
  stock_writeoff: 111,
  booking_created: 112,
  booking: 112,
  booking_cancelled: 113,
  booking_cancel: 113,
  shipment_created: 114,
  shipment: 114,
  delivery_completed: 115,
  delivery: 115,
  activity_recorded: 116,
  activity: 116,
  assignment_changed: 117,
  assignment: 117,
  clocked_in: 118,
  clock_in: 118,
  clocked_out: 119,
  clock_out: 119,
  flow_stage_changed: 120,
  flow_stage: 120,
  card_stage: 120,
  flow_completed: 121,
  flow_complete: 121,
  flow_won: 121,
  card_won: 121,
  flow_dropped: 122,
  flow_lost: 122,
  card_lost: 122,
  status_changed: 123,
  status_change: 123,
  order_placed: 124,
  order_ready: 125,
  order_served: 126,
  ticket_opened: 127,
  ticket_resolved: 128,
  approval_requested: 129,
  approval_decided: 130,
  low_stock_detected: 131,

  // Personal Motions (201-299)
  expense_logged: 201,
  expense_log: 201,
  reminder_triggered: 202,
  goal_updated: 203,
  goal_update: 203,
  personal_note_added: 204,
  personal_note: 204,
} as const;

export type MotionTypeName = keyof typeof MOTION_TYPES;
export type MotionTypeCode = typeof MOTION_TYPES[MotionTypeName];

export const MOTION_TYPE_NAMES: Record<number, string> = {
  101: 'sale',
  102: 'refund',
  103: 'quote_issued',
  104: 'invoice_issued',
  105: 'purchase_order_issued',
  106: 'vendor_bill_received',
  107: 'payment_recorded',
  108: 'stock_received',
  109: 'stock_transferred',
  110: 'stock_adjusted',
  111: 'stock_written_off',
  112: 'booking_created',
  113: 'booking_cancelled',
  114: 'shipment_created',
  115: 'delivery_completed',
  116: 'activity_recorded',
  117: 'assignment_changed',
  118: 'clocked_in',
  119: 'clocked_out',
  120: 'flow_stage_changed',
  121: 'flow_completed',
  122: 'flow_dropped',
  123: 'status_changed',
  124: 'order_placed',
  125: 'order_ready',
  126: 'order_served',
  127: 'ticket_opened',
  128: 'ticket_resolved',
  129: 'approval_requested',
  130: 'approval_decided',
  131: 'low_stock_detected',
  201: 'expense_logged',
  202: 'reminder_triggered',
  203: 'goal_updated',
  204: 'personal_note_added',
};

export const GRAPH_KINDS = {
  placed_by: 1,
  supplied_by: 2,
  fulfills: 3,
  works_at: 4,
  assigned_to: 5,
  stored_at: 6,
  issued_by: 7,
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
  responsible_for: 16,
} as const;

export type GraphKindName = keyof typeof GRAPH_KINDS;
export type GraphKindCode = typeof GRAPH_KINDS[GraphKindName];

export const GRAPH_KIND_NAMES: Record<number, string> = {
  1: 'placed_by',
  2: 'supplied_by',
  3: 'fulfills',
  4: 'works_at',
  5: 'assigned_to',
  6: 'stored_at',
  7: 'issued_by',
  8: 'for_contact',
  9: 'in_flow',
  10: 'owned_by',
  11: 'about',
  12: 'member_of',
  13: 'linked_to',
  14: 'variant_of',
  15: 'served_by',
  16: 'responsible_for',
};

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

export const INBOX_TYPE_NAMES: Record<number, string> = {
  1: 'task',
  2: 'alert',
  3: 'approval',
  4: 'reminder',
  5: 'notification',
  6: 'suggestion',
};

export const MATTER_STATE = {
  inactive: 0,
  active: 1,
  pending: 2,
  closed: 3,
  archived: 4,
} as const;

export const INBOX_STATUS = {
  dismissed: 0,
  pending: 1,
  done: 2,
} as const;

export const REQUEST_STATUS = {
  processing: 1,
  completed: 2,
} as const;

export const APPROVAL_STATUS = {
  pending: 1,
  approved: 2,
  rejected: 3,
  expired: 4,
  executed: 5,
} as const;

export const OUTBOX_STATUS = {
  pending: 1,
  leased: 2,
  delivered: 3,
  retry: 4,
  dead: 5,
} as const;

export const ROUTINE_STATE = {
  paused: 0,
  active: 1,
  disabled: 2,
} as const;

export const JOB_STATUS = {
  queued: 1,
  leased_running: 2,
  completed: 3,
  retry: 4,
  failed_dead: 5,
  cancelled: 6,
} as const;

export const PROJECTION_COLLECTION = {
  matter: 1,
  motion: 2,
  graph: 3,
  module_read_model: 4,
} as const;

// Helper Resolvers
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
  const lower = String(rel).toLowerCase().trim() as GraphKindName;
  return GRAPH_KINDS[lower] ?? 4;
}

// ── Canonical Table Row Interfaces (matter.md §5) ─────────────────────

export interface MatterRow {
  id: string;
  type: number;
  data: Record<string, unknown>;
  state: number;
  version: number;
  created: number;
  updated: number;
  deleted_at?: number | null;
}

export interface MotionRow {
  id: string;
  type: number;
  actor: string;
  ref?: string | null;
  data: Record<string, unknown>;
  idem: string;
  payload_hash: string;
  created: number;
  deleted_at?: number | null;
}

export interface GraphRow {
  id: string;
  source: string;
  target: string;
  kind: number;
  data: Record<string, unknown>;
  version: number;
  created: number;
  updated: number;
  deleted_at?: number | null;
}

export interface InboxRow {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  type: number;
  title: string;
  ref?: string | null;
  priority: number;
  status: number;
  data: Record<string, unknown>;
  version: number;
  created: number;
  updated: number;
  deleted_at?: number | null;
}

export interface ProjectionRow {
  id: string;
  workspace_id: string;
  collection: number;
  source_id: string;
  type: number;
  data: Record<string, unknown>;
  source_version: number;
  expires?: number | null;
  updated: number;
  deleted_at?: number | null;
}

export interface RequestRow {
  idem: string;
  actor: string;
  action: string;
  payload_hash: string;
  status: number;
  response?: string | null;
  created: number;
  completed?: number | null;
  expires?: number | null;
}

export interface RoutineRow {
  id: string;
  action: string;
  schedule: string;
  timezone: string;
  config: Record<string, unknown>;
  policy_version: string;
  state: number;
  next_run: number;
  last_run?: number | null;
  version: number;
  created: number;
  updated: number;
}

export interface JobRow {
  id: string;
  routine_id?: string | null;
  action: string;
  idem: string;
  input: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  status: number;
  attempts: number;
  run_after: number;
  lease_owner?: string | null;
  lease_until?: number | null;
  last_error?: string | null;
  created: number;
  updated: number;
}

export interface ApprovalRow {
  id: string;
  action: string;
  actor: string;
  required_role: string;
  payload: Record<string, unknown>;
  payload_hash: string;
  policy_version: string;
  status: number;
  expires: number;
  decided_by?: string | null;
  reason?: string | null;
  created: number;
  updated: number;
}

export interface OutboxRow {
  id: string;
  kind: number;
  ref?: string | null;
  destination: string;
  payload: Record<string, unknown>;
  idem: string;
  status: number;
  attempts: number;
  next_attempt: number;
  lease_owner?: string | null;
  lease_until?: number | null;
  provider_ref?: string | null;
  last_error?: string | null;
  created: number;
  updated: number;
}

// ── Discriminated Matter Schemas & Payloads ──────────────────────────

export interface TaskMatter {
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done' | 'archived';
  assigneeId?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ProductMatter {
  sku: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  stockLevel: number;
  lowStockThreshold: number;
  status: 'active' | 'draft' | 'archived';
}

export interface BookingMatter {
  customerId: string;
  resourceId: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'cancelled' | 'pending_payment';
}

export interface CustomerMatter {
  name: string;
  email?: string;
  phone?: string;
  tags: string[];
  totalSpendCents: number;
}

export interface InvoiceItem {
  description: string;
  amountCents: number;
  quantity: number;
}

export interface InvoiceMatter {
  customerId: string;
  items: InvoiceItem[];
  totalCents: number;
  status: 'draft' | 'issued' | 'paid' | 'void';
}

export type MatterType = 'task' | 'product' | 'booking' | 'customer' | 'invoice';

export type MatterPayloadMap = {
  task: TaskMatter;
  product: ProductMatter;
  booking: BookingMatter;
  customer: CustomerMatter;
  invoice: InvoiceMatter;
};

export interface Matter<T extends MatterType = MatterType> {
  id: string;
  workspaceId: string;
  type: T;
  data: MatterPayloadMap[T];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface MotionEvent {
  id: string;
  workspaceId: string;
  eventType: string;
  actorId: string;
  matterId?: string;
  diff?: Record<string, unknown>;
  payload: Record<string, unknown>;
  createdAt: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'executed';

export interface ApprovalRecord {
  id: string;
  workspaceId: string;
  actorId: string;
  requiredRole: Role;
  actionType: string;
  payloadHash: string;
  payload: Record<string, unknown>;
  status: ApprovalStatus;
  expiresAt: string;
  policyVersion: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  decidedBy?: string;
  decisionReason?: string;
}

export interface Routine {
  id: string;
  workspaceId: string;
  name: string;
  scheduleCron: string;
  lastRunAt?: string;
  nextRunAt: string;
  leaseHolder?: string;
  leasedUntil?: string;
  status: 'idle' | 'running' | 'paused' | 'disabled';
  config: Record<string, unknown>;
}

export interface Job {
  id: string;
  workspaceId: string;
  type: string;
  routineId?: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  leaseHolder?: string;
  leasedUntil?: string;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IdempotencyRecord {
  key: string;
  workspaceId: string;
  actionType: string;
  payloadHash: string;
  status: 'pending' | 'completed' | 'failed';
  response?: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
}

// ── GenUI Types ──────────────────────────────────────────────────────

export type NativeBlockType =
  | 'task-inbox'
  | 'metric-card'
  | 'quick-pos'
  | 'stock-sheet'
  | 'pipeline-card'
  | 'contact-card'
  | 'action-confirm'
  | 'data-grid'
  | 'record-profile';

export interface NativeBlockConfig {
  id: string;
  type: NativeBlockType;
  title: string;
  dataSource: string;
  dataView?: string;
  params?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  roleVisibility?: Role[];
  roles?: string[];
}

export interface CanvasAST {
  version: string;
  glanceBar: {
    mode: string;
    notice: string;
  };
  liveActionStream: NativeBlockConfig[]; // Strictly capped at 3 cards maximum
  actionDock: {
    chips: string[];
    intentEnabled: boolean;
  };
}
