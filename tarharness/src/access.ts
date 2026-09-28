import type { Member, RecordItem } from './types.ts';
import { findAction } from './registry/catalog.ts';

export type WorkRole = string;
export const managesMembers = (member: Member) => member.state === 'active' && (member.role === 'owner' || member.role === 'admin');
const workRole = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const kitchenRoles = new Set(['chef', 'cook', 'kitchen']);
const grantedRoles = (member: Member) => member.roles?.length ? member.roles.map(workRole) : [workRole(member.workRole)];
export const hasWorkRole = (member: Member, role: string) => member.role === 'member' && grantedRoles(member).includes(workRole(role));
export const isCook = (member: Member) => member.role === 'member' && grantedRoles(member).every((role) => kitchenRoles.has(role));
export const isCourier = (member: Member) => member.role === 'member' && grantedRoles(member).every((role) => role === 'courier');
export const isCustomer = (member: Member) => member.role === 'member' && grantedRoles(member).every((role) => role === 'customer');
const cookActions = new Set(['task.complete', 'pos.order.item.update', 'pos.order.handoff']);
const cashierActions = new Set(['task.create', 'task.complete', 'flow.start', 'flow.advance', 'pos.open', 'pos.customer.save', 'pos.order.save', 'pos.order.cancel', 'pos.checkout', 'pos.register.open', 'pos.register.count', 'order.create', 'order.fulfill', 'order.cancel', 'invoice.issue', 'payment.record']);
const courierActions = new Set(['task.create', 'task.complete', 'flow.start', 'flow.advance', 'pos.order.reach', 'pos.order.collect', 'pos.order.deliver']);
const customerActions = new Set(['pos.order.receive', 'pos.order.rate']);
const generalWorkActions = new Set(['record.create', 'record.update', 'contact.create', 'organization.create', 'relationship.create', 'relationship.end', 'consent.record', 'task.create', 'task.complete', 'flow.start', 'flow.advance', 'web.search', 'pos.order.handoff']);
const managerActions = new Set([...generalWorkActions, 'pos.open', 'pos.customer.save', 'pos.order.save', 'pos.order.cancel', 'pos.checkout', 'pos.register.open', 'pos.register.count', 'pos.register.close', 'order.create', 'order.fulfill', 'order.cancel', 'invoice.issue', 'payment.record', 'refund.record']);
export const workRoleNames = ['general', 'chef', 'cook', 'kitchen', 'cashier', 'manager', 'server', 'floor', 'kds', 'courier', 'customer'] as const;
function workRoleActions(role: string): ReadonlySet<string> {
  if (!role || role === 'general') return generalWorkActions;
  if (kitchenRoles.has(role)) return cookActions;
  if (role === 'cashier') return cashierActions;
  if (role === 'manager') return managerActions;
  if (['server', 'floor', 'kds'].includes(role)) return generalWorkActions;
  if (role === 'courier') return courierActions;
  if (role === 'customer') return customerActions;
  return generalWorkActions;
}

export function canUseWorkRole(role: string, actionId: string): boolean {
  const action = findAction(actionId);
  return Boolean(action?.roles.includes('member') && workRoleActions(workRole(role)).has(actionId));
}

export function canExecute(member: Member, actionId: string): boolean {
  const action = findAction(actionId);
  if (member.state !== 'active' || !action || !action.roles.includes(member.role)) return false;
  if (member.role !== 'member') return true;
  return grantedRoles(member).some((role) => workRoleActions(role).has(actionId));
}

export function canRunFlowStep(member: Member, step: Record<string, unknown>, starter: string): boolean {
  const actionId = workRole(step.id);
  if (!actionId || !canExecute(member, actionId)) return false;
  const assigned = workRole(step.role);
  if (assigned === 'any') return member.role !== 'guest';
  if (assigned) return hasWorkRole(member, assigned);
  return member.userId === starter || managesMembers(member);
}

export function canReadRecord(member: Member, record: Pick<RecordItem, 'type' | 'data' | 'assignee'> & { owner?: string | null }): boolean {
  if (member.state !== 'active') return false;
  const roles = grantedRoles(member);
  if (record.type === 'task') {
    if (managesMembers(member)) return true;
    if (record.assignee && record.assignee !== member.userId) return false;
    const required = workRole(record.data.workRole);
    return roles.some((role) => {
      if (!required && !record.assignee && role && role !== 'general') return false;
      return !required || (kitchenRoles.has(required) && kitchenRoles.has(role)) || required === (role || 'general');
    });
  }
  if (member.role === 'guest') return false;
  if (member.role !== 'member') return true;
  if (record.type === 'pos.register' && grantedRoles(member).some((role) => ['cashier', 'manager'].includes(role))) return true;
  return roles.some((role) => {
    if (!role || role === 'general') return true;
    if (kitchenRoles.has(role) || role === 'courier' || role === 'customer') return false;
    if (role === 'cashier') return ['contact', 'person', 'pos.order', 'pos.customer', 'pos.product'].includes(record.type);
    return record.owner === member.userId || record.assignee === member.userId || workRole(record.data.workRole) === role;
  });
}

export function kitchenOrder<T extends { data: Record<string, unknown> }>(order: T): T {
  const lines = Array.isArray(order.data.lines) ? order.data.lines as Record<string, unknown>[] : [];
  return { ...order, data: { orderType: order.data.orderType, table: order.data.table, handedOffAt: order.data.handedOffAt,
    lines: lines.map((line) => ({ productId: line.productId, title: line.title, quantity: line.quantity, status: line.status })) } };
}
