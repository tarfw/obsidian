import type { Client } from '@libsql/client/web';
import { Effect } from 'effect';
import { badRequest, conflict, forbidden, notFound, unavailable } from '../errors.ts';
import { query } from '../db/turso.ts';
import type { AccessContext, FlowDefinition, FlowRun, RecordItem } from '../types.ts';
import { findAction, type ActionId } from '../registry/catalog.ts';
import { directoryDefinitionIds, findDirectoryBot } from '../registry/directory.ts';
import { executePos, POS_INDEXES } from '../pos/store.ts';
import { draftProduct, saveProductContent } from '../pos/content.ts';
import { canExecute, canReadRecord } from '../access.ts';

type GatewayError = ReturnType<typeof badRequest> | ReturnType<typeof conflict> | ReturnType<typeof forbidden> | ReturnType<typeof notFound> | ReturnType<typeof unavailable>;
export interface GatewayRequest { readonly idempotencyKey: string; readonly actionId: ActionId; readonly input: Record<string, unknown>; }
export interface GatewayServices { readonly productContent?: R2Bucket; readonly ai?: Ai }

const stamp = () => Date.now();
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, max = 200): string => typeof value === 'string' ? value.trim().slice(0, max) : '';
const json = (value: unknown) => JSON.stringify(value);
const rowToRecord = (row: Record<string, unknown>): RecordItem => ({
  id: String(row.id), type: String(row.type), title: String(row.title), state: String(row.state), data: object(typeof row.data === 'string' ? JSON.parse(row.data) : row.data),
  owner: typeof row.owner_id === 'string' ? row.owner_id : null, assignee: typeof row.assignee_id === 'string' ? row.assignee_id : null,
  version: Number(row.version), createdAt: Number(row.created_at), updatedAt: Number(row.updated_at),
});

async function fingerprint(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(json(value));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function existing(client: Client, key: string, inputHash: string): Promise<Record<string, unknown> | null> {
  const result = await client.execute({ sql: 'SELECT input_hash,data FROM events WHERE idempotency_key=?', args: [key] });
  if (!result.rows[0]) return null;
  const storedHash = String(result.rows[0][0]);
  if (storedHash !== inputHash) throw conflict('This idempotency key was already used with different input.');
  return object(JSON.parse(String(result.rows[0][1])));
}

async function appendEvent(client: Client, input: { action: string; actor: string; recordId?: string; runId?: string; key: string; hash: string; result: Record<string, unknown> }): Promise<void> {
  const at = stamp();
  await client.execute({ sql: `INSERT INTO events (id,kind,run_id,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at)
    VALUES (?,?,?,?,?,'accepted',?,?,?,?,?,?)`, args: [`evt_${crypto.randomUUID()}`, 'action', input.runId ?? null, input.recordId ?? null, input.action, input.actor, input.hash, input.key, json({ result: input.result }), at, at] });
}

export function executeGateway(client: Client, context: AccessContext, request: GatewayRequest, services: GatewayServices = {}): Effect.Effect<Record<string, unknown>, GatewayError> {
  return Effect.tryPromise({
    try: async () => {
      if (!request.idempotencyKey || request.idempotencyKey.length > 200) throw badRequest('Idempotency-Key is required.');
      const registeredAction = findAction(request.actionId);
      if (!registeredAction) throw notFound('Action is not registered.');
      if (!canExecute(context.member, request.actionId)) throw forbidden();
      for (const field of registeredAction.fields) {
        const value = request.input[field.key];
        if (field.required && (value === undefined || value === null || (typeof value === 'string' && !value.trim()))) throw badRequest(`${field.label} is required.`);
        if (field.kind === 'number' && value !== undefined && (!Number.isFinite(Number(value)))) throw badRequest(`${field.label} must be a number.`);
      }
      const hash = await fingerprint({ actor: context.identity.id, action: request.actionId, input: request.input });
      const replay = await existing(client, request.idempotencyKey, hash);
      if (replay) return object(replay.result);
      const at = stamp();
      if (request.actionId === 'pos.product.content.save') return saveProductContent(client, services.productContent, context, request.input, { key: request.idempotencyKey, hash });
      if (request.actionId === 'pos.product.draft') {
        const result = await draftProduct(services.ai, request.input);
        await appendEvent(client, { action: request.actionId, actor: context.identity.id, key: request.idempotencyKey, hash, result });
        return result;
      }
      if (request.actionId.startsWith('pos.')) return executePos(client, context, request.actionId, request.input, request.idempotencyKey, hash);

      if (request.actionId === 'flow.publish') {
        const botId = text(request.input.botId, 80); const flowId = text(request.input.flowId, 160); const name = text(request.input.name, 100); const description = text(request.input.description, 400);
        const actions = Array.isArray(request.input.actions) ? request.input.actions.map(object).map((item) => ({ id: text(item.id, 160) })).filter((item) => item.id) : [];
        const bot = findDirectoryBot(botId);
        if (!bot || !flowId || flowId !== `custom.${botId}.${flowId.split('.').at(-1)}` || !/^custom\.[a-z0-9-]+\.[a-z0-9-]+$/.test(flowId) || !name || !actions.length) throw badRequest('An installed Bot, Flow name and at least one Action are required.');
        const installedBot = await query<Record<string, unknown>>(client, { sql: "SELECT id FROM definitions WHERE id=? AND kind='bot' AND state='published'", args: [directoryDefinitionIds(botId).bot] }).pipe(Effect.runPromise);
        if (!installedBot.length) throw badRequest('Install the Bot before creating a custom Flow.');
        if (actions.some((item) => !findAction(item.id) || item.id === 'flow.start' || item.id === 'flow.publish' || item.id === 'directory.install' || item.id === 'directory.remove')) throw badRequest('Flow contains an unavailable Action.');
        const kitId = `${flowId}.kit`; const card = { id: `flow-${flowId}`, kind: 'flow', title: name, description: description || 'A custom workspace process.', flowId };
        const result = { flowId, published: true };
        await client.batch([
          { sql: `INSERT INTO definitions (id,kind,name,version,state,data,created_at,updated_at) VALUES (?, 'flow', ?, 1, 'published', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name,version=definitions.version+1,state='published',data=excluded.data,updated_at=excluded.updated_at`, args: [flowId, name, json({ source: 'custom', botId, description, actions }), at, at] },
          { sql: `INSERT INTO definitions (id,kind,name,version,state,data,created_at,updated_at) VALUES (?, 'kit', ?, 1, 'published', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name,version=definitions.version+1,state='published',data=excluded.data,updated_at=excluded.updated_at`, args: [kitId, name, json({ source: 'custom', flowId, canvas: { cards: [card] } }), at, at] },
          { sql: `INSERT INTO events (id,kind,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`, args: [`evt_${crypto.randomUUID()}`, 'action', request.actionId, 'accepted', context.identity.id, hash, request.idempotencyKey, json({ result }), at, at] },
        ], 'write');
        return result;
      }

      if (request.actionId === 'directory.install') {
        const itemId = text(request.input.itemId, 160); const item = findDirectoryBot(itemId);
        if (!item) throw notFound('Bot not found.');
        const flowIds = Array.isArray(request.input.flowIds) ? [...new Set(request.input.flowIds.map((value) => text(value, 80)).filter(Boolean))] : [];
        const selected = item.flows.filter((flow) => flowIds.includes(flow.id));
        if (!selected.length || selected.length !== flowIds.length) throw badRequest('Choose at least one available Flow.');
        const ids = directoryDefinitionIds(item.id);
        const cards = selected.map((flow) => ({ id: `flow-${item.id}-${flow.id}`, kind: 'flow', title: flow.title, description: flow.description, flowId: directoryDefinitionIds(item.id, flow.id).flow! }));
        const statements = [
          { sql: `INSERT INTO definitions (id,kind,name,version,state,data,created_at,updated_at) VALUES (?, 'bot', ?, 1, 'published', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name,version=definitions.version+1,state='published',data=excluded.data,updated_at=excluded.updated_at`, args: [ids.bot, item.title, json({ source: 'directory', itemId: item.id, description: item.description, guidance: item.guidance, flowIds }), at, at] },
          { sql: `INSERT INTO definitions (id,kind,name,version,state,data,created_at,updated_at) VALUES (?, 'kit', ?, 1, 'published', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name,version=definitions.version+1,state='published',data=excluded.data,updated_at=excluded.updated_at`, args: [ids.kit, item.title, json({ source: 'directory', itemId: item.id, canvas: { cards } }), at, at] },
        ];
        for (const flow of item.flows) {
          const flowId = directoryDefinitionIds(item.id, flow.id).flow!;
          if (flowIds.includes(flow.id)) statements.push({ sql: `INSERT INTO definitions (id,kind,name,version,state,data,created_at,updated_at) VALUES (?, 'flow', ?, 1, 'published', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name,version=definitions.version+1,state='published',data=excluded.data,updated_at=excluded.updated_at`, args: [flowId, flow.title, json({ source: 'directory', botId: item.id, templateId: flow.id, description: flow.description, actions: flow.actions }), at, at] });
          else statements.push({ sql: "UPDATE definitions SET state='archived',version=version+1,updated_at=? WHERE id=?", args: [at, flowId] });
        }
        const result = { itemId: item.id, flowIds, installed: true };
        if (item.id === 'pos') for (const sql of POS_INDEXES) statements.push({ sql, args: [] });
        statements.push({ sql: `INSERT INTO events (id,kind,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`, args: [`evt_${crypto.randomUUID()}`, 'action', request.actionId, 'accepted', context.identity.id, hash, request.idempotencyKey, json({ result }), at, at] });
        await client.batch(statements, 'write');
        return result;
      }

      if (request.actionId === 'directory.remove') {
        const itemId = text(request.input.itemId, 160); const item = findDirectoryBot(itemId);
        if (!item) throw notFound('Bot not found.');
        const ids = directoryDefinitionIds(item.id); const result = { itemId: item.id, installed: false };
        const statements = [
          { sql: "UPDATE definitions SET state='archived',version=version+1,updated_at=? WHERE id=?", args: [at, ids.bot] },
          { sql: "UPDATE definitions SET state='archived',version=version+1,updated_at=? WHERE id=?", args: [at, ids.kit] },
          { sql: "UPDATE definitions SET state='archived',version=version+1,updated_at=? WHERE id LIKE ?", args: [at, `custom.${item.id}.%`] },
          { sql: `INSERT INTO events (id,kind,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`, args: [`evt_${crypto.randomUUID()}`, 'action', request.actionId, 'accepted', context.identity.id, hash, request.idempotencyKey, json({ result }), at, at] },
        ];
        for (const flow of item.flows) statements.splice(-1, 0, { sql: "UPDATE definitions SET state='archived',version=version+1,updated_at=? WHERE id=?", args: [at, directoryDefinitionIds(item.id, flow.id).flow!] });
        await client.batch(statements, 'write');
        return result;
      }

      if (request.actionId === 'record.create' || request.actionId === 'task.create') {
        const type = request.actionId === 'task.create' ? 'task' : text(request.input.type, 80);
        const title = text(request.input.title, 240);
        if (!type || !title) throw badRequest('Record type and title are required.');
        if (type.startsWith('pos.')) throw forbidden();
        const assignee = request.actionId === 'task.create' ? text(request.input.assigneeId, 160) || context.identity.id : text(request.input.assigneeId, 160) || null;
        const record: RecordItem = { id: `rec_${crypto.randomUUID()}`, type, title, state: request.actionId === 'task.create' ? 'open' : 'active', data: object(request.input.data), owner: context.identity.id, assignee, version: 1, createdAt: at, updatedAt: at };
        await client.batch([
          { sql: `INSERT INTO records (id,type,title,state,data,owner_id,assignee_id,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`, args: [record.id, record.type, record.title, record.state, json(record.data), record.owner, record.assignee, 1, at, at] },
          { sql: `INSERT INTO events (id,kind,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, args: [`evt_${crypto.randomUUID()}`, 'action', record.id, request.actionId, 'accepted', context.identity.id, hash, request.idempotencyKey, json({ result: { record } }), at, at] },
        ], 'write');
        return { record };
      }

      if (request.actionId === 'record.update') {
        const recordId = text(request.input.recordId, 160); const baseVersion = Number(request.input.baseVersion);
        if (!recordId || !Number.isInteger(baseVersion)) throw badRequest('Record ID and base version are required.');
        const records = await query<Record<string, unknown>>(client, { sql: 'SELECT * FROM records WHERE id=? AND archived_at IS NULL', args: [recordId] }).pipe(Effect.runPromise);
        const current = records[0]; if (!current) throw notFound('Record not found.');
        if (String(current.type).startsWith('pos.')) throw forbidden();
        if (Number(current.version) !== baseVersion) throw conflict('Record changed. Refresh and try again.');
        const title = text(request.input.title, 240) || String(current.title);
        const nextData = { ...object(JSON.parse(String(current.data))), ...object(request.input.data) };
        const state = text(request.input.state, 80) || String(current.state);
        await client.batch([
          { sql: 'UPDATE records SET title=?,state=?,data=?,version=version+1,updated_at=? WHERE id=? AND version=?', args: [title, state, json(nextData), at, recordId, baseVersion] },
          { sql: `INSERT INTO events (id,kind,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, args: [`evt_${crypto.randomUUID()}`, 'action', recordId, request.actionId, 'accepted', context.identity.id, hash, request.idempotencyKey, json({ result: { recordId, version: baseVersion + 1 } }), at, at] },
        ], 'write');
        return { recordId, version: baseVersion + 1 };
      }

      if (request.actionId === 'task.complete') {
        const taskId = text(request.input.taskId, 160); if (!taskId) throw badRequest('Task ID is required.');
        const records = await query<Record<string, unknown>>(client, { sql: 'SELECT * FROM records WHERE id=? AND type=\'task\' AND archived_at IS NULL', args: [taskId] }).pipe(Effect.runPromise);
        const task = records[0]; if (!task) throw notFound('Task not found.');
        if (!canReadRecord(context.member, rowToRecord(task))) throw forbidden();
        if (task.assignee_id && task.assignee_id !== context.identity.id && context.member.role !== 'owner' && context.member.role !== 'admin') throw forbidden();
        if (task.state === 'completed') throw conflict('Task is already complete.');
        const transaction = await client.transaction('write');
        try {
          const update = await transaction.execute({ sql: 'UPDATE records SET state=\'completed\',version=version+1,updated_at=? WHERE id=? AND version=?', args: [at, taskId, Number(task.version)] });
          if (update.rowsAffected !== 1) throw conflict('Task changed. Refresh and try again.');
          await transaction.execute({ sql: `INSERT INTO events (id,kind,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, args: [`evt_${crypto.randomUUID()}`, 'action', taskId, request.actionId, 'accepted', context.identity.id, hash, request.idempotencyKey, json({ result: { taskId, state: 'completed' } }), at, at] });
          await transaction.commit();
        } catch (cause) {
          await transaction.rollback().catch(() => undefined);
          throw cause;
        } finally { transaction.close(); }
        return { taskId, state: 'completed' };
      }

      const flowId = text(request.input.flowId, 160); if (!flowId) throw badRequest('Flow ID is required.');
      const definitions = await query<Record<string, unknown>>(client, { sql: 'SELECT * FROM definitions WHERE id=? AND kind=\'flow\' AND state=\'published\'', args: [flowId] }).pipe(Effect.runPromise);
      const flowDefinition = definitions[0]; if (!flowDefinition) throw notFound('Published Flow not found.');
      const data = object(JSON.parse(String(flowDefinition.data))); const actions = Array.isArray(data.actions) ? data.actions.map(object) : [];
      const first = actions[0]; if (!first || !text(first.id)) throw badRequest('Flow needs at least one Action.');
      const run: FlowRun = { id: `run_${crypto.randomUUID()}`, flowId, flowVersion: Number(flowDefinition.version), occurrence: request.idempotencyKey, recordId: text(request.input.recordId, 160) || null, state: 'ready', actionId: text(first.id), context: object(request.input.context), version: 1, dueAt: null };
      await client.batch([
        { sql: `INSERT INTO runs (id,flow_id,flow_version,occurrence,record_id,state,action_id,context,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, args: [run.id, run.flowId, run.flowVersion, run.occurrence, run.recordId, run.state, run.actionId, json(run.context), 1, at, at] },
        { sql: `INSERT INTO events (id,kind,run_id,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, args: [`evt_${crypto.randomUUID()}`, 'action', run.id, run.recordId, request.actionId, 'accepted', context.identity.id, hash, request.idempotencyKey, json({ result: { run } }), at, at] },
      ], 'write');
      return { run };
    },
    catch: (cause) => cause instanceof Error && '_tag' in cause ? cause as GatewayError : unavailable('Action execution failed.', cause),
  });
}
