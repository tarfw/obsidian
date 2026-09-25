import type { Client } from '@libsql/client/web';
import { Effect } from 'effect';
import { canExecute, canReadRecord, isCook, kitchenOrder } from '../access.ts';
import { query } from '../db/turso.ts';
import { posSummary, readPosInbox } from '../pos/store.ts';
import { buildWorkspaceCanvas, type CanvasCard } from '../registry/canvas.ts';
import type { AccessContext, RecordItem } from '../types.ts';
import type { ContextDecision } from './context.ts';

const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

function record(row: Record<string, unknown>): RecordItem {
  return {
    id: String(row.id), type: String(row.type), title: String(row.title), state: String(row.state),
    data: object(JSON.parse(String(row.data))), owner: typeof row.owner === 'string' ? row.owner : null,
    assignee: typeof row.assignee === 'string' ? row.assignee : null, version: Number(row.version),
    createdAt: Number(row.created), updatedAt: Number(row.updated),
  };
}

export async function buildSpaceView(client: Client, access: AccessContext, decision: ContextDecision) {
  if (isCook(access.member)) {
    const card: CanvasCard = { id: 'kitchen', kind: 'data', title: 'Kitchen queue', display: 'value', value: 'Open Inbox', caption: 'Prepare assigned order items' };
    return { ...decision, sections: [{ id: 'now', title: 'Now', cards: [card] }] };
  }
  const [definitionRows, countRows] = await Promise.all([
    Effect.runPromise(query<Record<string, unknown>>(client, { sql: "SELECT id,kind,name,version,state,data FROM definitions WHERE state!='archived' ORDER BY updated_at DESC" })),
    Effect.runPromise(query<Record<string, unknown>>(client, { sql: `SELECT COUNT(*) AS records,
      SUM(CASE WHEN type='task' AND state IN ('open','waiting','blocked') THEN 1 ELSE 0 END) AS tasks,
      SUM(CASE WHEN type LIKE 'pos.%' THEN 1 ELSE 0 END) AS commerce FROM records WHERE archived IS NULL` })),
  ]);
  const count = countRows[0] || {};
  const definitions = definitionRows.map((item) => ({ id: String(item.id), kind: String(item.kind), name: String(item.name), version: Number(item.version), state: String(item.state), data: object(JSON.parse(String(item.data))) }));
  const pos = Number(count.commerce || 0) ? await posSummary(client) : undefined;
  const cards = buildWorkspaceCanvas(definitions, { records: Number(count.records || 0), openTasks: Number(count.tasks || 0), pos }, access.member.role)
    .filter((card) => card.kind === 'data'
      ? access.member.workRole !== 'cashier' || !['pos-sales', 'records-total'].includes(card.id)
      : canExecute(access.member, card.kind === 'action' ? card.actionId : card.actionId || 'flow.start'));
  return {
    ...decision,
    sections: [
      { id: 'signals', title: 'At a glance', cards: cards.filter((card) => card.kind === 'data') },
      { id: 'actions', title: 'Do', cards: cards.filter((card) => card.kind === 'action') },
      { id: 'flows', title: 'Flow Books', cards: cards.filter((card) => card.kind === 'flow') },
    ].filter((section) => section.cards.length),
  };
}

export async function readInboxSource(client: Client, access: AccessContext) {
  const rows = await Effect.runPromise(query<Record<string, unknown>>(client, {
    sql: "SELECT * FROM records WHERE type='task' AND state IN ('open','waiting','blocked') AND (assignee=? OR assignee IS NULL) AND archived IS NULL ORDER BY COALESCE(due,updated),updated DESC LIMIT 150",
    args: [access.identity.id],
  }));
  const pos = access.member.role === 'guest' ? { orders: [] } : await readPosInbox(client).catch(() => ({ orders: [] }));
  const tasks = rows.map(record).filter((item) => canReadRecord(access.member, item));
  const orderRecords: RecordItem[] = pos.orders.map((item) => ({
    ...item, type: 'pos.order', owner: null, assignee: null, updatedAt: item.createdAt,
  }));
  const orders = isCook(access.member) ? orderRecords.map(kitchenOrder) : orderRecords;
  return {
    workspace: {
      id: access.workspace.id, name: access.workspace.mode === 'personal' ? 'Personal' : access.workspace.name,
      slug: access.workspace.slug, scope: access.workspace.slug, role: access.member.role,
      workRole: access.member.workRole || 'general', mode: access.workspace.mode, state: access.workspace.state,
    },
    tasks, orders,
    permissions: {
      prepare: canExecute(access.member, 'pos.order.item.update'), collect: canExecute(access.member, 'pos.checkout'),
      completeTask: canExecute(access.member, 'task.complete'), openOrder: canExecute(access.member, 'pos.open'),
    },
  };
}

export function groupInbox(sources: readonly Awaited<ReturnType<typeof readInboxSource>>[], actor: string) {
  const items = sources.flatMap((source) => [
    ...source.tasks.map((item) => ({ kind: 'task' as const, item, workspace: source.workspace })),
    ...source.orders.map((item) => ({ kind: 'order' as const, item, workspace: source.workspace })),
  ]);
  const due = (entry: typeof items[number]) => typeof entry.item.data.dueAt === 'number' ? entry.item.data.dueAt : entry.item.updatedAt;
  const sort = (left: typeof items[number], right: typeof items[number]) => due(left) - due(right) || right.item.updatedAt - left.item.updatedAt;
  return {
    mine: items.filter((entry) => entry.kind === 'order' || entry.item.assignee === actor).sort(sort),
    available: items.filter((entry) => entry.kind === 'task' && !entry.item.assignee && entry.item.state === 'open').sort(sort),
    waiting: items.filter((entry) => entry.kind === 'task' && ['waiting', 'blocked'].includes(entry.item.state)).sort(sort),
  };
}
