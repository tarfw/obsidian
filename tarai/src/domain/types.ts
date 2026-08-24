/**
 * TARAI Domain Types & Strongly-Typed Schemas
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

// Discriminated Matter Schemas

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

// GenUI Types
export type NativeBlockType =
  | 'task-inbox'
  | 'metric-card'
  | 'quick-pos'
  | 'stock-sheet'
  | 'pipeline-card'
  | 'contact-card'
  | 'action-confirm'
  | 'data-grid';

export interface NativeBlockConfig {
  id: string;
  type: NativeBlockType;
  title: string;
  dataSource: string;
  filters?: Record<string, unknown>;
  roleVisibility?: Role[];
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
