import type { Client } from '@libsql/client/web';
import { Effect } from 'effect';
import { canExecute, canReadRecord, canRunFlowStep, hasWorkRole, isCook, isCourier, isCustomer, kitchenOrder, managesMembers } from '../access.ts';
import { query } from '../db/turso.ts';
import { readPosInbox } from '../pos/store.ts';
import type { CanvasCard } from '../registry/canvas.ts';
import type { AccessContext, RecordItem } from '../types.ts';
import type { ContextDecision } from './context.ts';

type SpaceCard = CanvasCard | { readonly id: string; readonly kind: 'now'; readonly title: string; readonly description: string };
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

function record(row: Record<string, unknown>): RecordItem {
  const data = object(JSON.parse(String(row.data)));
  return {
    id: String(row.id), type: String(row.type), title: String(row.title), state: String(row.state),
    data: row.due !== null && row.due !== undefined && data.dueAt === undefined ? { ...data, dueAt: Number(row.due) } : data,
    owner: typeof row.owner === 'string' ? row.owner : null,
    assignee: typeof row.assignee === 'string' ? row.assignee : null, version: Number(row.version),
    createdAt: Number(row.created), updatedAt: Number(row.updated),
  };
}

function due(item: RecordItem): number {
  const value = item.data.dueAt ?? item.data.scheduledAt;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.POSITIVE_INFINITY;
}

interface OrderAction { readonly id: string; readonly label: string; readonly input: Record<string, unknown> }

function projectOrder(order: Awaited<ReturnType<typeof readPosInbox>>['orders'][number], access: AccessContext): RecordItem | null {
  const data = order.data;
  const lines = Array.isArray(data.lines) ? data.lines.map(object) : [];
  const ready = lines.length > 0 && lines.every((line) => line.status === 'ready');
  const approval = String(data.approval || (order.type === 'order' ? 'accepted' : ''));
  const delivery = String(data.delivery || '');
  const type = String(data.orderType || (order.type === 'order' ? (data.channel === 'delivery' ? 'delivery' : data.channel === 'dinein' ? 'dine-in' : 'counter') : 'counter'));
  const input = { orderId: order.id, version: order.version };
  const actions: OrderAction[] = [];
  let group: 'mine' | 'available' | 'waiting';
  let projected: Record<string, unknown>;
  let assignee: string | null = access.identity.id;

  if (managesMembers(access.member)) {
    if (approval === 'pending') {
      group = 'mine';
      actions.push({ id: 'pos.order.accept', label: 'Accept', input }, { id: 'pos.order.reject', label: 'Reject', input });
    } else if (order.state === 'open' && (approval === 'accepted' || order.type === 'order')) {
      group = 'mine';
    } else return null;
    projected = { orderType: type, table: data.table, approval, lines, total: data.total, currency: data.currency };
  } else if (isCook(access.member)) {
    if ((approval !== 'accepted' && order.type !== 'order') || data.handedOffAt) return null;
    group = 'mine';
    projected = kitchenOrder({ data }).data;
  } else if (['server', 'floor', 'kds'].some((role) => hasWorkRole(access.member, role))) {
    if ((approval !== 'accepted' && order.type !== 'order') || data.handedOffAt) return null;
    group = ready ? 'mine' : 'waiting';
    if (ready && type !== 'delivery') actions.push({ id: 'pos.order.handoff', label: 'Serve order', input });
    projected = { orderType: type, table: data.table,
      lines: lines.map((line) => ({ title: line.title, quantity: line.quantity, status: line.status })),
      ...(group === 'waiting' ? { note: 'Waiting for kitchen' } : {}) };
  } else if (isCourier(access.member)) {
    if (type !== 'delivery' || approval !== 'accepted' || delivery === 'delivered') return null;
    const claimed = data.courier === access.identity.id;
    if (delivery === 'unassigned' && !data.courier) {
      group = 'available';
      assignee = null;
      actions.push({ id: 'pos.order.reach', label: 'Reach pickup', input });
    } else if (claimed && delivery === 'reached') {
      if (ready && order.state === 'paid') {
        group = 'mine';
        actions.push({ id: 'pos.order.collect', label: 'Collect order', input });
      } else {
        group = 'waiting';
      }
    } else if (claimed && delivery === 'collected') {
      group = 'mine';
      actions.push({ id: 'pos.order.deliver', label: 'Mark delivered', input });
    } else return null;
    projected = {
      orderType: type, delivery, location: data.location,
      ...(claimed ? { destination: data.destination } : {}),
      lines: lines.map((line) => ({ title: line.title, quantity: line.quantity, status: line.status })),
      ...(group === 'waiting' ? { note: ready ? 'Waiting for payment' : 'Waiting for kitchen' } : {}),
    };
  } else if (isCustomer(access.member)) {
    if (!data.customerEmail || String(data.customerEmail).trim().toLowerCase() !== access.identity.email.trim().toLowerCase() || approval === 'rejected') return null;
    if (order.state === 'paid' && !data.receivedAt && (type === 'delivery' ? delivery === 'delivered' : ready && Boolean(data.handedOffAt))) {
      group = 'mine';
      actions.push({ id: 'pos.order.receive', label: 'Confirm receipt', input });
    } else if (order.state === 'paid' && data.receivedAt && data.receivedBy === access.identity.id && !data.rating) {
      group = 'mine';
      actions.push({ id: 'pos.order.rate', label: 'Rate order', input });
    } else if (order.state === 'open' || (order.state === 'paid' && !data.receivedAt)) {
      group = 'waiting';
    } else return null;
    projected = { orderType: type, lines: lines.map((line) => ({ title: line.title, quantity: line.quantity, status: line.status })),
      total: data.total, currency: data.currency, paymentStatus: data.paymentStatus,
      ...(group === 'waiting' ? { note: order.state === 'open' ? 'Waiting for payment at the business' : 'Waiting for your order' } : {}) };
  } else if (access.member.workRole?.trim().toLowerCase() === 'cashier') {
    if (order.state !== 'open') return null;
    group = approval === 'pending' ? 'waiting' : 'mine';
    projected = { orderType: type, table: data.table, approval, lines, total: data.total, currency: data.currency,
      ...(group === 'waiting' ? { note: 'Waiting for owner approval' } : {}) };
  } else return null;

  return {
    id: order.id, type: 'pos.order', title: order.title, state: order.state,
    data: { ...projected, group, actions }, owner: null, assignee,
    version: order.version, createdAt: order.createdAt, updatedAt: order.createdAt,
  };
}

function mergeOrderViews(views: readonly RecordItem[], actor: string): RecordItem | null {
  if (!views.length) return null;
  const priority = { mine: 0, available: 1, waiting: 2 } as const;
  const group = views.map((item) => String(item.data.group) as keyof typeof priority)
    .sort((left, right) => (priority[left] ?? 3) - (priority[right] ?? 3))[0];
  const actions = views.flatMap((item) => Array.isArray(item.data.actions) ? item.data.actions : []);
  const unique = [...new Map(actions.map((action) => [String(object(action).id), action])).values()];
  return { ...views[0], assignee: group === 'available' ? null : actor,
    data: { ...Object.assign({}, ...views.map((item) => item.data)), group, actions: unique } };
}

async function visibleOrders(client: Client, access: AccessContext, allRoles = false, separate = false): Promise<RecordItem[]> {
  const member = access.member as AccessContext['member'] & { readonly roles?: readonly string[] };
  const roles = allRoles && member.role === 'member' && member.roles?.length ? member.roles : [member.workRole || 'general'];
  if (!managesMembers(member) && !roles.some((role) => ['chef', 'cook', 'kitchen', 'courier', 'cashier', 'customer', 'server', 'floor', 'kds'].includes(role.trim().toLowerCase()))) return [];
  const orders = (await readPosInbox(client)).orders;
  if (!allRoles || member.role !== 'member' || roles.length === 1) {
    return orders.map((order) => projectOrder(order, access)).filter((order): order is RecordItem => order !== null)
      .map((order) => separate ? { ...order, data: { ...order.data, projectionRole: roles[0] } } : order);
  }
  if (separate) return orders.flatMap((order) => roles.flatMap((role) => {
    const narrowed = { ...access, member: { ...member, workRole: role, roles: [role] } } as AccessContext;
    const projected = projectOrder(order, narrowed);
    return projected ? [{ ...projected, data: { ...projected.data, projectionRole: role } }] : [];
  }));
  return orders.map((order) => mergeOrderViews(roles.flatMap((role) => {
    const narrowed = { ...access, member: { ...member, workRole: role, roles: [role] } } as AccessContext;
    const projected = projectOrder(order, narrowed);
    return projected ? [projected] : [];
  }), access.identity.id)).filter((order): order is RecordItem => order !== null);
}

export async function buildSpaceView(client: Client, access: AccessContext, decision: ContextDecision) {
  // An equal-priority overlap is a question, not permission to present the
  // first candidate as the selected workspace.
  if (decision.decision === 'confirm') return { ...decision, sections: [] };
  const selectedRole = (decision.context.source === 'routine' || (decision.context.source === 'override' && decision.context.held)) && access.member.role === 'member'
    ? decision.context.role.trim().toLowerCase() : '';
  const active: AccessContext = selectedRole ? { ...access, member: { ...access.member, workRole: selectedRole,
    roles: [selectedRole] } } as AccessContext : access;
  const [taskRows, runRows, stockRows] = await Promise.all([
    Effect.runPromise(query<Record<string, unknown>>(client, {
      sql: "SELECT * FROM records WHERE type='task' AND state IN ('open','waiting','blocked') AND (assignee=? OR assignee IS NULL) AND archived IS NULL ORDER BY updated DESC",
      args: [active.identity.id],
    })),
    Effect.runPromise(query<Record<string, unknown>>(client, {
      sql: "SELECT r.id,r.flow_id,r.record_id,r.state,r.context,r.updated_at,d.name FROM runs r LEFT JOIN definitions d ON d.id=r.flow_id WHERE r.state IN ('ready','blocked') ORDER BY r.updated_at DESC",
    })),
    managesMembers(active.member)
      ? Effect.runPromise(query<Record<string, unknown>>(client, {
        sql: "SELECT COUNT(*) AS count FROM records WHERE type='pos.product' AND archived IS NULL AND json_extract(data,'$.stock')<=json_extract(data,'$.lowStock')",
      }))
      : Promise.resolve([]),
  ]);
  const tasks = taskRows.map(record).filter((item) => canReadRecord(active.member, item));
  const orders = await visibleOrders(client, active);
  const actionableOrders = isCook(active.member) ? orders.filter((item) => Array.isArray(item.data.lines)
    && item.data.lines.some((line) => object(line).status !== 'ready')) : orders;
  const waiting = tasks.filter((item) => item.state === 'waiting' || item.state === 'blocked').length
    + orders.filter((item) => item.data.group === 'waiting').length;
  const signals: SpaceCard[] = [];
  if (actionableOrders.length) signals.push({ id: 'orders', kind: 'data', title: 'Open orders', display: 'value', value: actionableOrders.length });
  if (waiting) signals.push({ id: 'waiting', kind: 'data', title: 'Waiting', display: 'value', value: waiting });
  const stock = Number(stockRows[0]?.count || 0);
  if (stock) signals.push({ id: 'stock', kind: 'data', title: 'Low stock', display: 'value', value: stock });

  const actions: SpaceCard[] = [];
  const activeOrders = actionableOrders.filter((item) => item.data.group !== 'waiting');
  if (activeOrders.length) {
    const first = activeOrders[0];
    const line = isCook(active.member) && Array.isArray(first.data.lines)
      ? (first.data.lines as Array<Record<string, unknown>>).find((item) => item.status !== 'ready')
      : undefined;
    const stage = Array.isArray(first.data.actions) ? object(first.data.actions[0]) : {};
    const title = line && typeof line.title === 'string' ? `Prepare ${line.title}`
      : typeof stage.label === 'string' ? stage.label : 'Review open orders';
    actions.push({ id: first.id, kind: 'now', title, description: activeOrders.length === 1 ? 'Open order in Now' : `${activeOrders.length} open orders in Now` });
  }
  if (canExecute(active.member, 'task.complete')) {
    const next = tasks.filter((item) => item.state === 'open').sort((left, right) => due(left) - due(right) || right.updatedAt - left.updatedAt);
    actions.push(...next.slice(0, 3).map((item): SpaceCard => ({ id: item.id, kind: 'action', title: item.title, description: '', actionId: 'task.complete', initialInput: { taskId: item.id } })));
  }

  const visibleRuns = await Promise.all(runRows.map(async (row): Promise<SpaceCard | null> => {
    if (active.member.role === 'guest') return null;
    const context = object(JSON.parse(String(row.context)));
    const actions = Array.isArray(context.actions) ? context.actions.map(object) : [];
    const step = Number(context.step || 0);
    const current = Number.isSafeInteger(step) && step >= 0 ? actions[step] : undefined;
    if (!current || !canRunFlowStep(active.member, current, String(context.startedBy || ''))) return null;
    if (context.startedBy !== active.identity.id && !managesMembers(active.member) && typeof row.record_id === 'string') {
      const linked = await Effect.runPromise(query<Record<string, unknown>>(client, {
        sql: 'SELECT * FROM records WHERE id=? AND archived IS NULL', args: [row.record_id],
      }));
      if (!linked[0] || !canReadRecord(active.member, record(linked[0]))) return null;
    }
    const flowId = String(row.flow_id);
    return { id: String(row.id), kind: 'flow', title: typeof row.name === 'string' ? row.name : 'Flow Book', description: row.state === 'blocked' ? `Waiting at step ${step + 1}` : `Continue at step ${step + 1}`, flowId, actionId: 'flow.start', initialInput: { flowId, runId: String(row.id) } };
  }));
  const flows = visibleRuns.filter((item): item is SpaceCard => item !== null).slice(0, 3);

  return {
    ...decision,
    sections: [
      { id: 'signals', title: 'At a glance', cards: signals },
      { id: 'actions', title: 'Do', cards: actions },
      { id: 'flows', title: 'Flow Books', cards: flows },
    ].filter((section) => section.cards.length > 0),
  };
}

export async function readInboxSource(client: Client, access: AccessContext) {
  const [rows, runRows, workRows] = await Promise.all([
    Effect.runPromise(query<Record<string, unknown>>(client, {
      sql: "SELECT * FROM records WHERE type='task' AND state IN ('open','waiting','blocked') AND (assignee=? OR assignee IS NULL) AND archived IS NULL ORDER BY COALESCE(due,updated),updated DESC",
      args: [access.identity.id],
    })),
    access.member.role === 'guest' ? Promise.resolve([]) : Effect.runPromise(query<Record<string, unknown>>(client, {
      sql: "SELECT r.id,r.flow_id,r.record_id,r.state,r.context,r.version,r.updated_at,d.name FROM runs r JOIN definitions d ON d.id=r.flow_id WHERE r.state IN ('ready','blocked') ORDER BY r.updated_at DESC",
    })),
    Effect.runPromise(query<Record<string, unknown>>(client, {
      sql: `SELECT r.* FROM records r WHERE r.archived IS NULL AND (
        (r.type='purchase' AND r.state IN ('ordered','partial')) OR
        (r.type='order' AND (r.state='open' OR (r.state='fulfilled' AND NOT EXISTS
          (SELECT 1 FROM records i WHERE i.type='invoice' AND i.archived IS NULL AND json_extract(i.data,'$.order')=r.id)))) OR
        (r.type='invoice' AND r.state IN ('issued','partial')) OR
        (r.type NOT IN ('task','purchase','order','invoice') AND r.type NOT LIKE 'pos.%' AND
          r.state IN ('open','waiting','blocked') AND json_extract(r.data,'$.action') IS NOT NULL)
      ) ORDER BY r.updated DESC,r.id`,
    })),
  ]);
  const orders = await visibleOrders(client, access, true, true);
  const tasks = rows.map(record).filter((item) => canReadRecord(access.member, item));
  const work = workRows.map(record).filter((item) => {
    if (!canReadRecord(access.member, item)) return false;
    if (item.type === 'purchase') return canExecute(access.member, 'purchase.receive');
    if (item.type === 'order') return canExecute(access.member, item.state === 'open' ? 'order.fulfill' : 'invoice.issue');
    if (item.type === 'invoice') return true;
    return typeof item.data.action === 'string' && canExecute(access.member, item.data.action);
  });
  const runs = (await Promise.all(runRows.map(async (row) => {
    const context = object(JSON.parse(String(row.context)));
    const actions = Array.isArray(context.actions) ? context.actions.map(object) : [];
    const step = Number(context.step || 0);
    const current = Number.isSafeInteger(step) && step >= 0 ? actions[step] : undefined;
    if (!current || !canRunFlowStep(access.member, current, String(context.startedBy || ''))) return null;
    if (context.startedBy !== access.identity.id && !managesMembers(access.member) && typeof row.record_id === 'string') {
      const linked = await Effect.runPromise(query<Record<string, unknown>>(client, {
        sql: 'SELECT * FROM records WHERE id=? AND archived IS NULL', args: [row.record_id],
      }));
      if (!linked[0] || !canReadRecord(access.member, record(linked[0]))) return null;
    }
    return { id: String(row.id), flow: String(row.flow_id), title: typeof row.name === 'string' ? row.name : 'Flow Book',
      state: String(row.state), step: Number(context.step || 0), version: Number(row.version), updated: Number(row.updated_at),
      role: typeof current.role === 'string' && current.role !== 'any' ? current.role : access.member.workRole || 'general',
      parent: typeof row.record_id === 'string' ? row.record_id : null };
  }))).filter((item): item is NonNullable<typeof item> => item !== null);
  return {
    workspace: {
      id: access.workspace.id, name: access.workspace.mode === 'personal' ? 'Personal' : access.workspace.name,
      slug: access.workspace.slug, scope: access.workspace.slug, role: access.member.role,
      workRole: access.member.workRole || 'general', mode: access.workspace.mode, state: access.workspace.state,
    },
    tasks, orders, runs, work,
    permissions: {
      prepare: canExecute(access.member, 'pos.order.item.update'), collect: canExecute(access.member, 'pos.checkout'),
      completeTask: canExecute(access.member, 'task.complete'), openOrder: canExecute(access.member, 'pos.open'),
    },
  };
}
