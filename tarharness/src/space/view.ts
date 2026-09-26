import type { Client } from '@libsql/client/web';
import { Effect } from 'effect';
import { canExecute, canReadRecord, isCook, kitchenOrder, managesMembers } from '../access.ts';
import { query } from '../db/turso.ts';
import { readPosInbox } from '../pos/store.ts';
import type { CanvasCard } from '../registry/canvas.ts';
import type { AccessContext, RecordItem } from '../types.ts';
import type { ContextDecision } from './context.ts';

type SpaceCard = CanvasCard | { readonly id: string; readonly kind: 'inbox'; readonly title: string; readonly description: string };
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

function record(row: Record<string, unknown>): RecordItem {
  return {
    id: String(row.id), type: String(row.type), title: String(row.title), state: String(row.state),
    data: object(JSON.parse(String(row.data))), owner: typeof row.owner === 'string' ? row.owner : null,
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

function orderAccess(access: AccessContext): boolean {
  return managesMembers(access.member) || isCook(access.member) || access.member.workRole === 'cashier';
}

async function visibleOrders(client: Client, access: AccessContext) {
  if (!orderAccess(access)) return [];
  const orders = (await readPosInbox(client)).orders;
  if (!isCook(access.member)) return orders;
  return orders.filter((order) => Array.isArray(order.data.lines)
    && (order.data.lines as Array<Record<string, unknown>>).some((line) => line.status !== 'ready'));
}

export async function buildSpaceView(client: Client, access: AccessContext, decision: ContextDecision) {
  const [taskRows, runRows, stockRows] = await Promise.all([
    Effect.runPromise(query<Record<string, unknown>>(client, {
      sql: "SELECT * FROM records WHERE type='task' AND state IN ('open','waiting','blocked') AND (assignee=? OR assignee IS NULL) AND archived IS NULL ORDER BY updated DESC LIMIT 100",
      args: [access.identity.id],
    })),
    Effect.runPromise(query<Record<string, unknown>>(client, {
      sql: "SELECT r.id,r.flow_id,r.record_id,r.state,r.context,r.updated_at,d.name FROM runs r LEFT JOIN definitions d ON d.id=r.flow_id WHERE r.state IN ('ready','blocked') ORDER BY r.updated_at DESC LIMIT 30",
    })),
    managesMembers(access.member)
      ? Effect.runPromise(query<Record<string, unknown>>(client, {
        sql: "SELECT COUNT(*) AS count FROM records WHERE type='pos.product' AND archived IS NULL AND json_extract(data,'$.stock')<=json_extract(data,'$.lowStock')",
      }))
      : Promise.resolve([]),
  ]);
  const tasks = taskRows.map(record).filter((item) => canReadRecord(access.member, item));
  const orders = await visibleOrders(client, access);
  const waiting = tasks.filter((item) => item.state === 'waiting' || item.state === 'blocked').length;
  const signals: SpaceCard[] = [];
  if (orders.length) signals.push({ id: 'orders', kind: 'data', title: 'Open orders', display: 'value', value: orders.length });
  if (waiting) signals.push({ id: 'waiting', kind: 'data', title: 'Waiting', display: 'value', value: waiting });
  const stock = Number(stockRows[0]?.count || 0);
  if (stock) signals.push({ id: 'stock', kind: 'data', title: 'Low stock', display: 'value', value: stock });

  const actions: SpaceCard[] = [];
  if (orders.length) {
    const first = orders[0];
    const line = isCook(access.member) && Array.isArray(first.data.lines)
      ? (first.data.lines as Array<Record<string, unknown>>).find((item) => item.status !== 'ready')
      : undefined;
    actions.push({ id: first.id, kind: 'inbox', title: line && typeof line.title === 'string' ? `Prepare ${line.title}` : 'Review open orders', description: orders.length === 1 ? 'Open order in Inbox' : `${orders.length} open orders in Inbox` });
  }
  if (canExecute(access.member, 'task.complete')) {
    const next = tasks.filter((item) => item.state === 'open').sort((left, right) => due(left) - due(right) || right.updatedAt - left.updatedAt);
    actions.push(...next.slice(0, 3).map((item): SpaceCard => ({ id: item.id, kind: 'action', title: item.title, description: '', actionId: 'task.complete', initialInput: { taskId: item.id } })));
  }

  const visibleRuns = await Promise.all(runRows.map(async (row): Promise<SpaceCard | null> => {
    if (access.member.role === 'guest') return null;
    const context = object(JSON.parse(String(row.context)));
    if (context.startedBy !== access.identity.id && !managesMembers(access.member)) {
      if (typeof row.record_id !== 'string') return null;
      const linked = await Effect.runPromise(query<Record<string, unknown>>(client, {
        sql: 'SELECT * FROM records WHERE id=? AND archived IS NULL', args: [row.record_id],
      }));
      if (!linked[0] || !canReadRecord(access.member, record(linked[0]))) return null;
    }
    const step = Number(context.step || 0);
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
  const rows = await Effect.runPromise(query<Record<string, unknown>>(client, {
    sql: "SELECT * FROM records WHERE type='task' AND state IN ('open','waiting','blocked') AND (assignee=? OR assignee IS NULL) AND archived IS NULL ORDER BY COALESCE(due,updated),updated DESC LIMIT 150",
    args: [access.identity.id],
  }));
  const orders = await visibleOrders(client, access);
  const tasks = rows.map(record).filter((item) => canReadRecord(access.member, item));
  const orderRecords: RecordItem[] = orders.map((item) => ({
    ...item, type: 'pos.order', owner: null, assignee: null, updatedAt: item.createdAt,
  }));
  return {
    workspace: {
      id: access.workspace.id, name: access.workspace.mode === 'personal' ? 'Personal' : access.workspace.name,
      slug: access.workspace.slug, scope: access.workspace.slug, role: access.member.role,
      workRole: access.member.workRole || 'general', mode: access.workspace.mode, state: access.workspace.state,
    },
    tasks, orders: isCook(access.member) ? orderRecords.map(kitchenOrder) : orderRecords,
    permissions: {
      prepare: canExecute(access.member, 'pos.order.item.update'), collect: canExecute(access.member, 'pos.checkout'),
      completeTask: canExecute(access.member, 'task.complete'), openOrder: canExecute(access.member, 'pos.open'),
    },
  };
}

export function groupInbox(sources: readonly Awaited<ReturnType<typeof readInboxSource>>[], actor: string) {
  const seen = new Set<string>();
  const items = sources.flatMap((source) => [
    ...source.tasks.map((item) => ({ kind: 'task' as const, item, workspace: source.workspace })),
    ...source.orders.map((item) => ({ kind: 'order' as const, item, workspace: source.workspace })),
  ]).filter((entry) => {
    const key = `${entry.workspace.id}:${entry.kind}:${entry.item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const sort = (left: typeof items[number], right: typeof items[number]) => due(left.item) - due(right.item) || right.item.updatedAt - left.item.updatedAt;
  return {
    mine: items.filter((entry) => entry.kind === 'order' || (entry.item.state === 'open' && entry.item.assignee === actor)).sort(sort),
    available: items.filter((entry) => entry.kind === 'task' && entry.item.state === 'open' && !entry.item.assignee).sort(sort),
    waiting: items.filter((entry) => entry.kind === 'task' && (entry.item.state === 'waiting' || entry.item.state === 'blocked')).sort(sort),
  };
}
