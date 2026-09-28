import type { Client, InStatement } from '@libsql/client/web';
import type { AccessContext, RecordItem } from '../types.ts';
import type { readInboxSource } from '../space/view.ts';
import { INBOX_SCHEMA } from '../db/schema.ts';

type Source = Awaited<ReturnType<typeof readInboxSource>>;
export type NowKind = 'action' | 'flow' | 'status' | 'artifact';
export type NowLane = 'mine' | 'available' | 'waiting';
export interface NowEntry {
  id: string; source: string; target: string; kind: NowKind; role: string;
  lane: NowLane; title: string; parent: string | null; quantity: number | null;
  state: string; due: number | null; ordinal: number; version: number;
  action: string | null; input: Record<string, unknown>; updated: number;
}

export function authorityKey(access: AccessContext): string {
  return JSON.stringify([access.member.role, [...new Set(access.member.roles?.length
    ? access.member.roles : [access.member.workRole || 'general'])].map((value) => value.toLowerCase()).sort()]);
}

const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const finite = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
const due = (item: RecordItem) => finite(item.data.dueAt ?? item.data.due ?? item.data.scheduledAt);
const role = (source: Source) => source.workspace.workRole || source.workspace.role;
const orderKey = (id: string) => `#${id.slice(-6).toUpperCase()}`;

export function projectNow(source: Source, actor: string): NowEntry[] {
  const entries: NowEntry[] = [];
  const append = (item: RecordItem, unit: string, value: Omit<NowEntry, 'id' | 'source' | 'target' | 'ordinal' | 'version' | 'updated'>) => {
    entries.push({ ...value, id: `${source.workspace.id}:${item.id}:${unit}`, source: source.workspace.id, ordinal: entries.length,
      target: item.id, version: item.version, updated: item.updatedAt });
  };
  for (const task of source.tasks) {
    const lane: NowLane = task.state !== 'open' || !source.permissions.completeTask ? 'waiting' : task.assignee === actor ? 'mine' : 'available';
    append(task, 'task', { kind: lane === 'waiting' ? 'status' : 'action', role: role(source), lane,
      title: task.title, parent: null, quantity: null, state: task.state, due: due(task),
      action: lane === 'waiting' ? null : 'task.complete', input: { taskId: task.id } });
  }
  for (const order of source.orders) {
    const data = order.data;
    const projectionRole = typeof data.projectionRole === 'string' ? data.projectionRole : role(source);
    const lane: NowLane = data.group === 'waiting' ? 'waiting' : data.group === 'available' ? 'available' : 'mine';
    const actions = Array.isArray(data.actions) ? data.actions.map(object).filter((action) => typeof action.id === 'string') : [];
    const lines = Array.isArray(data.lines) ? data.lines.map(object) : [];
    const parent = orderKey(order.id);
    const common = { role: projectionRole, lane, parent, due: due(order) };
    const isKitchen = source.workspace.role === 'member' && ['chef', 'cook', 'kitchen'].includes(projectionRole.toLowerCase()) && source.permissions.prepare;
    if (isKitchen) {
      lines.forEach((line, index) => {
        const state = typeof line.status === 'string' ? line.status : 'pending';
        const productId = typeof line.productId === 'string' ? line.productId : null;
        const next = state === 'pending' ? 'preparing' : state === 'preparing' ? 'ready' : null;
        append(order, `line:${projectionRole}:${productId || index}`, { ...common, kind: next && productId ? 'action' : 'status',
          title: String(line.title || 'Order line'), quantity: Number.isFinite(Number(line.quantity)) ? Number(line.quantity) : null,
          state, action: next && productId ? 'pos.order.item.update' : null,
          input: next && productId ? { orderId: order.id, version: order.version, productId, status: next } : {} });
      });
      continue;
    }
    if (source.workspace.role === 'member' && projectionRole.toLowerCase() === 'courier') {
      const stage = String(data.delivery || 'unassigned');
      const steps = [
        ['reach', 'Reach pickup', 'unassigned'], ['collect', 'Collect order', 'reached'], ['deliver', 'Deliver order', 'collected'],
      ] as const;
      const index = Math.max(0, steps.findIndex((step) => step[2] === stage));
      steps.forEach((step, position) => {
        if (position < index) return;
        const current = position === index && lane !== 'waiting';
        append(order, `${projectionRole}:${step[0]}`, { ...common, kind: current ? 'action' : 'status', lane: current ? lane : 'waiting',
          title: `${step[1]} ${parent}`, quantity: null, state: current ? 'open' : 'waiting',
          action: current ? `pos.order.${step[0]}` : null,
          input: current ? { orderId: order.id, version: order.version } : {} });
      });
      continue;
    }
    if (source.workspace.role === 'member' && projectionRole.toLowerCase() === 'customer') {
      const first = actions[0];
      const received = first?.id === 'pos.order.rate' || Boolean(data.receivedAt);
      for (const [unit, title, action] of [
        ['receive', `Receive order ${parent}`, 'pos.order.receive'],
        ['rate', `Rate order ${parent}`, 'pos.order.rate'],
      ]) {
        if (unit === 'receive' && received) continue;
        const current = first?.id === action;
        append(order, `${projectionRole}:${unit}`, { ...common, kind: current ? 'action' : 'status', lane: current ? 'mine' : 'waiting',
          title, quantity: null, state: current ? 'open' : 'waiting', action: current ? action : null,
          input: current ? object(first.input) : {} });
      }
      continue;
    }
    if (actions.length) {
      const accept = actions.find((action) => action.id === 'pos.order.accept');
      if (accept && actions.some((action) => action.id === 'pos.order.reject')) {
        append(order, `${projectionRole}:decision`, { ...common, kind: 'action', title: `Review order ${parent}`,
          quantity: null, state: 'pending', action: 'pos.order.accept', input: object(accept.input) });
        continue;
      }
      for (const action of actions) append(order, `${projectionRole}:${String(action.id)}`, { ...common, kind: 'action',
        title: `${String(action.label || 'Review order')} ${parent}`, quantity: null, state: 'open',
        action: String(action.id), input: object(action.input) });
      continue;
    }
    if (['server', 'floor', 'kds'].includes(projectionRole.toLowerCase()) && lane === 'waiting') {
      append(order, `${projectionRole}:service`, { ...common, kind: 'status', title: `Serve order ${parent}`,
        quantity: null, state: 'waiting', action: null, input: {} });
      continue;
    }
    if (projectionRole.toLowerCase() === 'cashier' && order.state === 'open') {
      append(order, `${projectionRole}:payment`, { ...common, kind: lane === 'waiting' ? 'status' : 'action',
        title: `Record payment ${parent}`, quantity: null, state: lane === 'waiting' ? 'waiting' : 'open',
        action: lane === 'waiting' ? null : 'pos.open', input: { section: 'sell', orderId: order.id } });
    }
  }
  for (const run of source.runs) {
    entries.push({ id: `${source.workspace.id}:${run.id}:flow`, source: source.workspace.id, target: run.id,
      kind: 'flow', role: run.role, lane: run.state === 'blocked' ? 'waiting' : 'mine',
      title: run.title, parent: run.parent, quantity: null, state: run.state === 'blocked' ? `WAIT / STEP ${run.step + 1}` : `STEP ${run.step + 1}`,
      due: null, ordinal: entries.length, version: run.version, action: 'flow.start',
      input: { flowId: run.flow, runId: run.id }, updated: run.updated });
  }
  for (const item of source.work) {
    const common = { role: role(source), lane: 'mine' as const, parent: item.id, due: due(item) };
    if (item.type === 'purchase') {
      const lines = Array.isArray(item.data.lines) ? item.data.lines.map(object) : [];
      lines.forEach((line, index) => {
        const remaining = Number(line.quantity) - Number(line.received || 0);
        if (!Number.isSafeInteger(remaining) || remaining <= 0 || typeof line.variant !== 'string') return;
        append(item, `receive:${line.variant}:${index}`, { ...common, kind: 'action', title: `Receive ${String(line.title || line.variant)}`,
          quantity: remaining, state: item.state, action: 'purchase.receive',
          input: { purchase: item.id, version: item.version, lines: [{ variant: line.variant, quantity: remaining }] } });
      });
    } else if (item.type === 'order' && item.state === 'open') {
      append(item, 'fulfil', { ...common, kind: 'action', title: `Fulfil ${item.title}`,
        quantity: null, state: item.state, action: 'order.fulfill', input: { order: item.id, version: item.version } });
    } else if (item.type === 'order' && item.state === 'fulfilled') {
      append(item, 'invoice', { ...common, kind: 'action', title: `Issue invoice for ${item.title}`,
        quantity: null, state: item.state, action: 'invoice.issue', input: { order: item.id } });
    } else if (item.type === 'invoice') {
      append(item, 'payment', { ...common, kind: 'status', lane: 'waiting', title: `Payment for ${item.title}`,
        quantity: null, state: item.state, action: null, input: {} });
    } else if (typeof item.data.action === 'string') {
      append(item, 'step', { ...common, kind: item.state === 'open' ? 'action' : 'status',
        lane: item.state === 'open' ? 'mine' : 'waiting', title: item.title,
        quantity: typeof item.data.quantity === 'number' ? item.data.quantity : null,
        state: item.state, action: item.state === 'open' ? item.data.action : null,
        input: { recordId: item.id, version: item.version } });
    }
  }
  return entries;
}

export async function replaceSource(client: Client, source: string, entries: readonly NowEntry[], authority = '', at = Date.now()): Promise<void> {
  const ids = entries.map((entry) => entry.id);
  const statements: InStatement[] = [{ sql: ids.length ? `DELETE FROM inbox WHERE source=? AND id NOT IN (${ids.map(() => '?').join(',')})` : 'DELETE FROM inbox WHERE source=?', args: [source, ...ids] }];
  for (const entry of entries) statements.push({ sql: `INSERT INTO inbox
      (id,source,target,kind,role,lane,title,parent,quantity,state,due,ordinal,version,action,input,updated)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
      role=excluded.role,lane=excluded.lane,title=excluded.title,parent=excluded.parent,
      quantity=excluded.quantity,state=excluded.state,due=excluded.due,ordinal=excluded.ordinal,version=excluded.version,
      action=excluded.action,input=excluded.input,updated=excluded.updated
      WHERE inbox.version!=excluded.version OR inbox.role!=excluded.role OR inbox.lane!=excluded.lane
      OR inbox.title!=excluded.title OR inbox.state!=excluded.state OR inbox.action IS NOT excluded.action
      OR inbox.due IS NOT excluded.due OR inbox.input!=excluded.input OR inbox.ordinal!=excluded.ordinal
      OR inbox.parent IS NOT excluded.parent OR inbox.quantity IS NOT excluded.quantity OR inbox.kind!=excluded.kind`,
      args: [entry.id, entry.source, entry.target, entry.kind, entry.role, entry.lane, entry.title,
        entry.parent, entry.quantity, entry.state, entry.due, entry.ordinal, entry.version, entry.action, JSON.stringify(entry.input), entry.updated] });
  statements.push({ sql: 'INSERT INTO projection(source,updated,authority) VALUES(?,?,?) ON CONFLICT(source) DO UPDATE SET updated=excluded.updated,authority=excluded.authority', args: [source, at, authority] });
  await client.batch(statements, 'write');
}

export async function ensureNowSchema(client: Client): Promise<void> {
  for (const statement of INBOX_SCHEMA) await client.execute(statement);
  const columns = await client.execute('PRAGMA table_info(projection)');
  if (!columns.rows.some((column) => column.name === 'authority')) {
    await client.execute("ALTER TABLE projection ADD COLUMN authority TEXT NOT NULL DEFAULT ''");
  }
}

export async function retractSource(client: Client, source: string): Promise<void> {
  await client.batch([
    { sql: 'DELETE FROM inbox WHERE source=?', args: [source] },
    { sql: 'DELETE FROM projection WHERE source=?', args: [source] },
  ], 'write');
}

export async function retractMissing(client: Client, allowed: ReadonlySet<string>): Promise<void> {
  const sources = await client.execute('SELECT source FROM projection');
  for (const row of sources.rows) {
    const source = String(row.source);
    if (!allowed.has(source)) await retractSource(client, source);
  }
}

export async function readNow(client: Client, accesses: readonly AccessContext[]) {
  const allowed = new Set(accesses.map((access) => access.workspace.id));
  const expected = new Map(accesses.map((access) => [access.workspace.id, authorityKey(access)]));
  const workspaces = new Map(accesses.map((access) => [access.workspace.id, {
    id: access.workspace.id, name: access.workspace.mode === 'personal' ? 'Personal' : access.workspace.name,
    slug: access.workspace.slug, scope: access.workspace.slug, role: access.member.role,
    workRole: access.member.workRole || 'general', mode: access.workspace.mode, state: access.workspace.state,
    owner: access.workspace.mode === 'personal' ? 'You' : access.workspace.ownerName || 'Workspace owner',
  }]));
  const rows = await client.execute(`SELECT * FROM inbox ORDER BY
    CASE WHEN due IS NULL THEN 1 ELSE 0 END,due,
    CASE lane WHEN 'mine' THEN 0 WHEN 'available' THEN 1 ELSE 2 END,
    updated DESC,source,parent,ordinal,id`);
  const sync = await client.execute('SELECT source,updated,authority FROM projection');
  const authority = Object.fromEntries(sync.rows.filter((row) => allowed.has(String(row.source))).map((row) => [String(row.source), String(row.authority)]));
  return {
    rows: rows.rows.filter((row) => allowed.has(String(row.source)) && authority[String(row.source)] === expected.get(String(row.source))).map((row) => ({
      id: String(row.id), source: String(row.source), target: String(row.target), kind: String(row.kind) as NowKind,
      role: String(row.role), lane: String(row.lane) as NowLane, title: String(row.title),
      parent: row.parent === null ? null : String(row.parent), quantity: row.quantity === null ? null : Number(row.quantity),
      state: String(row.state), due: row.due === null ? null : Number(row.due), ordinal: Number(row.ordinal), version: Number(row.version),
      action: row.action === null ? null : String(row.action), input: object(JSON.parse(String(row.input))),
      updated: Number(row.updated), workspace: workspaces.get(String(row.source))!,
    })),
    sync: Object.fromEntries(sync.rows.filter((row) => allowed.has(String(row.source))).map((row) => [String(row.source), Number(row.updated)])),
    authority,
  };
}
