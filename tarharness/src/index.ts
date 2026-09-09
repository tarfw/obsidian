import { Effect } from 'effect';
import type { Client } from '@libsql/client/web';
import { verifyGoogleIdentity } from './auth/google.ts';
import { ControlStore } from './db/control.ts';
import { openWorkspaceDatabase, provisionWorkspaceDatabase, query } from './db/turso.ts';
import { executeGateway, type GatewayRequest } from './gateway/actions.ts';
import { HarnessError, badRequest, forbidden, notFound, unavailable } from './errors.ts';
import type { AccessContext, RecordItem } from './types.ts';
import { actionCatalog, interfaceCatalog } from './registry/catalog.ts';
import { buildWorkspaceCanvas } from './registry/canvas.ts';
import { botDirectory, directoryDefinitionIds } from './registry/directory.ts';
import { posSummary, readPos, readPosInbox } from './pos/store.ts';
import { readProductContent } from './pos/content.ts';
import { canExecute, canReadRecord, isCook, kitchenOrder, managesMembers } from './access.ts';
import { inviteMember, listMembers, updateMember } from './team.ts';
import { providers, providerStatus, verifyEvent, chatResponse, type ChannelEnv, type Provider } from './channels/providers.ts';
import { beginLink, channelState, confirmLink, disconnect, proveLink, resolveSender } from './channels/store.ts';
import { enqueueCommand, processCommand } from './channels/jobs.ts';

type RuntimeEnv = Env & ChannelEnv & { readonly TURSO_PLATFORM_TOKEN?: string };
const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS' };
const now = () => Date.now();
const cleanSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const identityKey = (value: string) => value.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 32);

function response(value: unknown, status = 200, extra: HeadersInit = {}): Response { return new Response(JSON.stringify(value), { status, headers: { ...jsonHeaders, ...corsHeaders, ...extra } }); }
function errorResponse(error: unknown): Response {
  if (error instanceof HarnessError) return response({ error: error.message }, error.status);
  console.error(JSON.stringify({ event: 'tarharness.error', error: error instanceof Error ? error.message : String(error) }));
  return response({ error: 'Internal server error.' }, 500);
}
function parseJson(request: Request): Effect.Effect<Record<string, unknown>, HarnessError> {
  const length = Number(request.headers.get('Content-Length') || '0');
  if (length > 100_000) return Effect.fail(badRequest('Request is too large.'));
  return Effect.tryPromise({ try: async () => object(await request.json()), catch: () => badRequest('Request body must be JSON.') });
}
function tursoEnv(env: RuntimeEnv) {
  if (!env.TURSO_PLATFORM_TOKEN || !env.TURSO_ORG || env.TURSO_ORG.startsWith('REPLACE_')) throw unavailable('Turso provisioning is not configured.');
  return { TURSO_ORG: env.TURSO_ORG, TURSO_PLATFORM_TOKEN: env.TURSO_PLATFORM_TOKEN, TURSO_GROUP: env.TURSO_GROUP || 'default' };
}
function record(row: Record<string, unknown>): RecordItem {
  return { id: String(row.id), type: String(row.type), title: String(row.title), state: String(row.state), data: object(JSON.parse(String(row.data))), owner: typeof row.owner_id === 'string' ? row.owner_id : null, assignee: typeof row.assignee_id === 'string' ? row.assignee_id : null, version: Number(row.version), createdAt: Number(row.created_at), updatedAt: Number(row.updated_at) };
}

async function identity(request: Request, env: RuntimeEnv) {
  const value = await Effect.runPromise(verifyGoogleIdentity(request.headers.get('Authorization'), env));
  const control = new ControlStore(env.CONTROL);
  await Effect.runPromise(control.upsertUser(value));
  return { value, control };
}
async function access(request: Request, env: RuntimeEnv, slug: string): Promise<{ readonly access: AccessContext; readonly control: ControlStore }> {
  const current = await identity(request, env);
  return { access: await Effect.runPromise(current.control.access(current.value, slug)), control: current.control };
}
async function withWorkspace<A>(env: RuntimeEnv, current: AccessContext, work: (client: Client) => Promise<A>): Promise<A> {
  const client = await Effect.runPromise(openWorkspaceDatabase(tursoEnv(env), current.workspace.databaseName, current.workspace.databaseHost!));
  try { return await work(client); } finally { client.close(); }
}

async function provision(control: ControlStore, env: RuntimeEnv, pending: { id: string; databaseName: string }) {
  try {
    const provisioned = await Effect.runPromise(provisionWorkspaceDatabase(tursoEnv(env), pending.databaseName));
    await Effect.runPromise(control.activateWorkspace(pending.id, provisioned.host));
    return provisioned;
  } catch (cause) {
    await Effect.runPromise(control.failWorkspace(pending.id, cause)).catch(() => undefined);
    throw cause;
  }
}

async function ensurePersonalWorkspace(owner: Awaited<ReturnType<typeof identity>>['value'], control: ControlStore, env: RuntimeEnv) {
  const key = identityKey(owner.id);
  const pending = await Effect.runPromise(control.ensurePersonalWorkspace({ identity: owner, name: 'Personal', slug: `personal-${key}`, databaseName: key, mode: 'personal' }));
  if (pending.state !== 'active') await provision(control, env, pending);
}

async function createWorkspace(request: Request, env: RuntimeEnv): Promise<Response> {
  const { value: owner, control } = await identity(request, env);
  const body = await Effect.runPromise(parseJson(request));
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  const slug = cleanSlug(typeof body.slug === 'string' ? body.slug : name);
  if (!name || !slug) throw badRequest('Workspace name is required.');
  const databaseName = `${identityKey(owner.id)}-${slug}`.slice(0, 56);
  const input = { identity: owner, name, slug, databaseName, mode: 'work' as const };
  const pending = await Effect.runPromise(control.resumeErroredWorkspace(input)) ?? await Effect.runPromise(control.createPendingWorkspace(input));
  await provision(control, env, pending);
  return response({ workspace: { ...pending, databaseHost: undefined, state: 'active' } }, 201);
}

async function listDefinitions(client: Client) {
  const rows = await Effect.runPromise(query<Record<string, unknown>>(client, { sql: 'SELECT id,kind,name,version,state,data FROM definitions WHERE state != \'archived\' ORDER BY updated_at DESC' }));
  return rows.map((item) => ({ id: String(item.id), kind: String(item.kind), name: String(item.name), version: Number(item.version), state: String(item.state), data: object(JSON.parse(String(item.data))) }));
}

async function workspaceCanvas(client: Client, member: AccessContext['member']) {
  if (isCook(member)) return [{ id: 'kitchen', kind: 'data', title: 'Kitchen', display: 'value', value: 'Open Inbox', caption: 'Prepare assigned orders in Inbox' }];
  const [definitions, counts] = await Promise.all([
    listDefinitions(client),
    Effect.runPromise(query<Record<string, unknown>>(client, { sql: `SELECT COUNT(*) AS records,
      SUM(CASE WHEN type='task' AND state='open' THEN 1 ELSE 0 END) AS open_tasks
      FROM records WHERE archived_at IS NULL` })),
  ]);
  const count = counts[0] || {};
  const pos = definitions.some((item) => item.id === 'directory.pos.bot' && item.state === 'published') ? await posSummary(client) : undefined;
  return buildWorkspaceCanvas(definitions, { records: Number(count.records || 0), openTasks: Number(count.open_tasks || 0), pos }, member.role)
    .filter((card) => card.kind === 'data' ? member.workRole !== 'cashier' || !['pos-sales','records-total'].includes(card.id)
      : canExecute(member, card.kind === 'action' ? card.actionId : card.actionId || 'flow.start'));
}

async function channelRequest(request: Request, env: RuntimeEnv, provider: Provider, ctx: ExecutionContext) {
  const verified = await verifyEvent(request, provider, env);
  if (verified.ping) return Response.json({ type: 1 });
  const event = verified.event!;
  if (!event.userId || !event.tenantId || !event.channelId || !event.eventId) throw badRequest('A team channel and verified sender are required.');
  try {
    const link = /^link\s+([a-f0-9]{32})$/i.exec(event.text.trim());
    if (link) return chatResponse(provider, await proveLink(env.CONTROL, event, link[1]), event.userId);
    const sender = await resolveSender(env.CONTROL, event);
    const current = await Effect.runPromise(new ControlStore(env.CONTROL).access(sender.identity, sender.slug));
    if (/^(help|hi|hello)?$/i.test(event.text.trim())) return chatResponse(provider, 'Use TAR for your Canvas and Inbox. Commands: done <task-id>, start <order-id> <product-id>, ready <order-id> <product-id>. Your TAR role applies here.', event.userId);
    if (event.text.trim().toLowerCase() === 'status') {
      const result = await env.CONTROL.prepare('SELECT state,result FROM channel_commands WHERE workspace_id=? AND user_id=? ORDER BY created_at DESC LIMIT 1').bind(current.workspace.id, current.identity.id).first<{ state: string; result: string | null }>();
      return chatResponse(provider, result ? `${result.state}: ${result.result || 'Your request is being processed.'}` : 'No chat requests yet.', event.userId);
    }
    const id = await enqueueCommand(env.CONTROL, current, event);
    ctx.waitUntil(env.OUTBOX.send({ kind: 'chat.command', id }).catch(() => { console.error(JSON.stringify({ event: 'chat.queue.unavailable', id })); }));
    return chatResponse(provider, 'Request saved. Use “status” to check the result, or open TAR → Members & chat.', event.userId);
  } catch (error) {
    // Never post business payloads, provider roles, or private details to the room.
    const message = error instanceof HarnessError ? error.message : 'Could not complete this request. Check TAR before trying again.';
    return chatResponse(provider, message, event.userId);
  }
}

async function handle(request: Request, env: RuntimeEnv, ctx: ExecutionContext): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  const url = new URL(request.url); const path = url.pathname;
  const channelMatch = /^\/v1\/channels\/(slack|discord|google-chat)\/events$/.exec(path);
  if (request.method === 'POST' && channelMatch) return channelRequest(request, env, channelMatch[1] as Provider, ctx);
  if (request.method === 'GET' && path === '/health') return response({ ok: true, service: 'tarharness', now: new Date().toISOString(), tursoProvisioning: Boolean(env.TURSO_PLATFORM_TOKEN && env.TURSO_ORG && !env.TURSO_ORG.startsWith('REPLACE_')) });
  if (request.method === 'GET' && path === '/v1/actions') return response({ actions: actionCatalog, interfaces: interfaceCatalog });
  if (request.method === 'GET' && path === '/v1/workspaces') {
    const { value, control } = await identity(request, env); await ensurePersonalWorkspace(value, control, env); const workspaces = await Effect.runPromise(control.listWorkspaces(value.id));
    return response({ workspaces: workspaces.map(({ workspace, role }) => ({ id: workspace.id, name: workspace.name, slug: workspace.slug, scope: workspace.slug, role, mode: workspace.mode, state: workspace.state })) });
  }
  if (request.method === 'POST' && path === '/v1/workspaces') return createWorkspace(request, env);
  const match = /^\/v1\/workspaces\/([a-z0-9-]+)(?:\/(.*))?$/.exec(path);
  if (!match) throw notFound('Route not found.');
  const slug = match[1]; const nested = match[2] || '';
  const { access: current } = await access(request, env, slug);
  if (request.method === 'GET' && nested === 'members') return response({ members: await listMembers(env.CONTROL, current), currentUserId: current.identity.id });
  if (request.method === 'POST' && nested === 'members') {
    return response({ invitation: await inviteMember(env.CONTROL, current, await Effect.runPromise(parseJson(request))) }, 201);
  }
  if (request.method === 'PUT' && nested.startsWith('members/')) return response(await updateMember(env.CONTROL, current, decodeURIComponent(nested.slice(8)), await Effect.runPromise(parseJson(request))));
  if (request.method === 'GET' && nested === 'team-chat') return response({ ...await channelState(env.CONTROL, current), providers: providerStatus(env), canManage: managesMembers(current.member), role: current.member.role, workRole: current.member.workRole || 'general' });
  if (request.method === 'POST' && nested === 'team-chat/link') {
    const body = await Effect.runPromise(parseJson(request)); const provider = body.provider as Provider;
    if (!providers.includes(provider)) throw badRequest('Choose Slack, Discord or Google Chat.');
    if (!providerStatus(env).find((item) => item.id === provider)?.configured) throw unavailable('Provider setup is required before linking.');
    return response(await beginLink(env.CONTROL, current, provider, String(body.purpose)), 201);
  }
  if (request.method === 'POST' && nested === 'team-chat/confirm') {
    const body = await Effect.runPromise(parseJson(request));
    return response(await confirmLink(env.CONTROL, current, String(body.id), body.joinUrl));
  }
  if (request.method === 'POST' && nested === 'team-chat/disconnect') {
    const body = await Effect.runPromise(parseJson(request));
    return response(await disconnect(env.CONTROL, current, body.destination === true));
  }
  if (request.method === 'GET' && nested === 'actions') return response({ actions: actionCatalog.filter((action) => canExecute(current.member, action.id)), interfaces: interfaceCatalog });
  return withWorkspace(env, current, async (client) => {
    const productContentMatch = /^pos\/products\/([^/]+)\/content$/.exec(nested);
    if (request.method === 'GET' && productContentMatch) {
      if (isCook(current.member)) throw forbidden();
      if (current.member.role === 'guest') throw forbidden();
      return response({ content: await readProductContent(client, env.PRODUCT_CONTENT, current, decodeURIComponent(productContentMatch[1])) });
    }
    if (request.method === 'GET' && /^pos\/(overview|products|orders|customers)$/.test(nested)) {
      const offset = Number(url.searchParams.get('offset') || 0);
      if (!Number.isSafeInteger(offset) || offset < 0) throw badRequest('Invalid page.');
      if (current.member.role === 'guest') throw forbidden();
      return response(await readPos(client, current, nested.slice(4), url.searchParams.get('q') || '', offset));
    }
    if (request.method === 'GET' && nested === 'records') {
      const type = url.searchParams.get('type');
      if (current.member.role === 'guest' && type?.startsWith('pos.')) throw forbidden();
      const rows = await Effect.runPromise(query<Record<string, unknown>>(client, type ? { sql: 'SELECT * FROM records WHERE type=? AND archived_at IS NULL ORDER BY updated_at DESC LIMIT 100', args: [type] } : { sql: 'SELECT * FROM records WHERE archived_at IS NULL ORDER BY updated_at DESC LIMIT 100' }));
      return response({ records: rows.map(record).filter((item) => canReadRecord(current.member, item)) });
    }
    if (request.method === 'GET' && nested === 'inbox') {
      const rows = await Effect.runPromise(query<Record<string, unknown>>(client, { sql: 'SELECT * FROM records WHERE type=\'task\' AND state=\'open\' AND (assignee_id=? OR assignee_id IS NULL) AND archived_at IS NULL ORDER BY updated_at DESC LIMIT 100', args: [current.identity.id] }));
      const pos = current.member.role === 'guest' ? { orders: [] } : await readPosInbox(client).catch(() => ({ orders: [] }));
      return response({ tasks: rows.map(record).filter((item) => canReadRecord(current.member, item)), orders: isCook(current.member) ? pos.orders.map(kitchenOrder) : pos.orders, permissions: { prepare: canExecute(current.member, 'pos.order.item.update'), collect: canExecute(current.member, 'pos.checkout'), completeTask: canExecute(current.member, 'task.complete'), openOrder: canExecute(current.member, 'pos.open') } });
    }
    if (request.method === 'GET' && nested === 'canvas') return response({ cards: await workspaceCanvas(client, current.member) });
    if (request.method === 'GET' && nested === 'directory') {
      const definitions = await listDefinitions(client);
      const published = new Set(definitions.filter((item) => item.state === 'published').map((item) => item.id));
      return response({ bots: botDirectory.map((bot) => ({
        ...bot,
        installed: published.has(directoryDefinitionIds(bot.id).bot),
        flows: [
          ...bot.flows.map((flow) => ({ ...flow, template: true, installed: published.has(directoryDefinitionIds(bot.id, flow.id).flow!) })),
          ...definitions.filter((item) => item.kind === 'flow' && item.state === 'published' && item.data.source === 'custom' && item.data.botId === bot.id).map((item) => ({ id: item.id, title: item.name, description: String(item.data.description || 'Custom Flow'), records: [], actions: Array.isArray(item.data.actions) ? item.data.actions : [], template: false, installed: true })),
        ],
      })) });
    }
    if (request.method === 'GET' && nested === 'definitions') return response({ definitions: await listDefinitions(client) });
    if (request.method === 'PUT' && nested.startsWith('definitions/')) {
      if (current.member.role !== 'owner' && current.member.role !== 'admin') throw forbidden();
      const id = decodeURIComponent(nested.slice('definitions/'.length)); const body = await Effect.runPromise(parseJson(request));
      const kind = typeof body.kind === 'string' ? body.kind : ''; const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : ''; const data = object(body.data);
      if (!/^(flow|record_type|bot|kit)$/.test(kind) || !name) throw badRequest('Definition kind and name are required.');
      if (kind === 'flow' && (!Array.isArray(data.actions) || data.actions.length === 0)) throw badRequest('A Flow needs at least one Action.');
      const at = now();
      await client.execute({ sql: `INSERT INTO definitions (id,kind,name,version,state,data,created_at,updated_at) VALUES (?,?,?,1,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name,version=definitions.version+1,state=excluded.state,data=excluded.data,updated_at=excluded.updated_at`, args: [id, kind, name, body.state === 'published' ? 'published' : 'draft', JSON.stringify(data), at, at] });
      return response({ definition: { id, kind, name, state: body.state === 'published' ? 'published' : 'draft' } });
    }
    const actionMatch = /^actions\/([a-z.]+)$/.exec(nested);
    if (request.method === 'POST' && actionMatch) {
      const key = request.headers.get('Idempotency-Key') || ''; const input = await Effect.runPromise(parseJson(request));
      const result = await Effect.runPromise(executeGateway(client, current, { actionId: actionMatch[1] as GatewayRequest['actionId'], idempotencyKey: key, input }, { productContent: env.PRODUCT_CONTENT, ai: env.AI }));
      return response(result, 201);
    }
    throw notFound('Route not found.');
  });
}

export default {
  fetch(request: Request, env: RuntimeEnv, ctx: ExecutionContext): Promise<Response> { return handle(request, env, ctx).catch(errorResponse); },
  async queue(batch: MessageBatch<unknown>, env: RuntimeEnv): Promise<void> {
    for (const message of batch.messages) {
      const body = object(message.body);
      if (body.kind !== 'chat.command' || typeof body.id !== 'string') { message.ack(); continue; }
      try {
        await processCommand(env.CONTROL, body.id, (current, work) => withWorkspace(env, current, work), { productContent: env.PRODUCT_CONTENT, ai: env.AI });
        message.ack();
      } catch { message.retry({ delaySeconds: 60 }); }
    }
  },
  async scheduled(_controller: ScheduledController, env: RuntimeEnv): Promise<void> {
    await env.CONTROL.prepare('DELETE FROM channel_link_requests WHERE expires_at<=?').bind(Date.now()).run();
    await env.CONTROL.prepare("UPDATE channel_commands SET state='failed',result='Processing interrupted. Check TAR before retrying.' WHERE state='processing' AND attempts>=5 AND due_at<=?").bind(Date.now()).run();
    const due = await env.CONTROL.prepare("SELECT id FROM channel_commands WHERE state IN ('pending','processing') AND due_at<=? AND attempts<5 ORDER BY due_at LIMIT 100").bind(Date.now()).all<{id: string}>();
    if (due.results.length) await env.OUTBOX.sendBatch(due.results.map((item) => ({ body: { kind: 'chat.command', id: item.id } })));
  },
} satisfies ExportedHandler<RuntimeEnv>;
