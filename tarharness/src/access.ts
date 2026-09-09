import type { Member, RecordItem } from './types.ts';
import { findAction } from './registry/catalog.ts';

export type WorkRole = 'general' | 'cook' | 'cashier';
export const managesMembers = (member: Member) => member.state === 'active' && (member.role === 'owner' || member.role === 'admin');
export const isCook = (member: Member) => member.role === 'member' && member.workRole === 'cook';
const cookActions = new Set(['task.complete', 'pos.order.item.update']);
const cashierActions = new Set(['task.create', 'task.complete', 'pos.open', 'pos.customer.save', 'pos.order.save', 'pos.order.cancel', 'pos.checkout', 'pos.register.open', 'pos.register.close']);

export function canExecute(member: Member, actionId: string): boolean {
  const action = findAction(actionId);
  if (member.state !== 'active' || !action || !action.roles.includes(member.role)) return false;
  if (member.role !== 'member' || !member.workRole || member.workRole === 'general') return true;
  return (member.workRole === 'cook' ? cookActions : cashierActions).has(actionId);
}

export function canReadRecord(member: Member, record: Pick<RecordItem, 'type' | 'data' | 'assignee'>): boolean {
  if (member.state !== 'active') return false;
  if (record.type === 'task') {
    if (managesMembers(member)) return true;
    if (record.assignee && record.assignee !== member.userId) return false;
    const required = record.data.workRole;
    if (!required && !record.assignee && member.workRole && member.workRole !== 'general') return false;
    return !required || required === (member.workRole || 'general');
  }
  if (isCook(member)) return false; // Kitchen orders use an explicit projection, without customer/payment data.
  if (member.role === 'guest' && record.type.startsWith('pos.')) return false;
  if (member.role === 'member' && member.workRole === 'cashier') return ['contact', 'pos.order', 'pos.customer', 'pos.product'].includes(record.type);
  return true;
}

export function kitchenOrder<T extends { data: Record<string, unknown> }>(order: T): T {
  const lines = Array.isArray(order.data.lines) ? order.data.lines as Record<string, unknown>[] : [];
  return { ...order, data: { orderType: order.data.orderType, table: order.data.table,
    lines: lines.map((line) => ({ productId: line.productId, title: line.title, quantity: line.quantity, status: line.status })) } };
}
