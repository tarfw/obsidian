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
import { posSummary, readPos, readPosInbox } from './pos/store.ts';
import { readProductContent } from './pos/content.ts';
import { canExecute, canReadRecord, isCook, kitchenOrder, managesMembers } from './access.ts';
import { inviteMember, listMembers, updateMember } from './team.ts';
import { providers, providerStatus, verifyEvent, chatResponse, type ChannelEnv, type Provider } from './channels/providers.ts';
import { beginLink, channelState, confirmLink, disconnect, proveLink, resolveSender } from './channels/store.ts';
import { enqueueCommand, processCommand } from './channels/jobs.ts';
import { searchContacts } from './contacts/search.ts';
import { acceptFlowRequest, sweepFlowDispatches } from './flows/dispatch.ts';
import { resolveContext, routineFromRecord } from './space/context.ts';
import { buildSpaceView, groupInbox, readInboxSource } from './space/view.ts';
export { FlowWorkflow } from './flows/workflow.ts';

type RuntimeEnv = Env & ChannelEnv & { readonly TURSO_PLATFORM_TOKEN?: string; readonly TINYFISH_API_KEY?: string; readonly TYPESAFE_API_KEY?: string };
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
  return {
    id: String(row.id), type: String(row.type), title: String(row.title), state: String(row.state), data: object(JSON.parse(String(row.data))),
    owner: typeof row.owner === 'string' ? row.owner : null,
    assignee: typeof row.assignee === 'string' ? row.assignee : null,
    version: Number(row.version),
    createdAt: Number(row.created),
    updatedAt: Number(row.updated)
  };
}

async function runVisible(client: Client, member: AccessContext['member'], actor: string, recordId: unknown) {
  if (member.role === 'guest') return false;
  if (actor === member.userId || member.role === 'owner' || member.role === 'admin') return true;
  if (typeof recordId !== 'string') return false;
  const rows = await Effect.runPromise(query<Record<string, unknown>>(client, { sql: 'SELECT * FROM records WHERE id=? AND archived IS NULL', args: [recordId] }));
  return Boolean(rows[0] && canReadRecord(member, record(rows[0])));
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

async function activeAccesses(request: Request, env: RuntimeEnv) {
  const { value, control } = await identity(request, env);
  await ensurePersonalWorkspace(value, control, env);
  let workspaces = await Effect.runPromise(control.listWorkspaces(value.id));
  for (const entry of workspaces) {
    if (entry.role === 'owner' && entry.workspace.state === 'provisioning') await provision(control, env, entry.workspace);
  }
  return { value, control, accesses: await Effect.runPromise(control.listAccess(value)) };
}

async function routines(env: RuntimeEnv, accesses: readonly AccessContext[]) {
  const personal = accesses.find((item) => item.workspace.mode === 'personal');
  if (!personal) return [];
  return withWorkspace(env, personal, async (client) => {
    const rows = await Effect.runPromise(query<Record<string, unknown>>(client, { sql: "SELECT id,data FROM records WHERE type='routine' AND state='active' AND archived IS NULL ORDER BY updated DESC" }));
    return rows.map((row) => routineFromRecord({ id: String(row.id), data: object(JSON.parse(String(row.data))) })).filter((item): item is NonNullable<typeof item> => Boolean(item));
  });
}

async function spaceResponse(request: Request, env: RuntimeEnv, url: URL) {
  const { value, control, accesses } = await activeAccesses(request, env);
  if (!accesses.length) throw notFound('No active workspace is available.');
  const saved = await Effect.runPromise(control.context(value.id));
  const requested = (url.searchParams.get('scope') || '').trim();
  const override = requested || (saved?.mode === 'hold' ? saved.workspace : undefined);
  const zone = (url.searchParams.get('zone') || 'Asia/Kolkata').slice(0, 80);
  const suppliedAt = Number(url.searchParams.get('at') || Date.now());
  const at = Number.isSafeInteger(suppliedAt) && Math.abs(suppliedAt - Date.now()) < 86_400_000 ? suppliedAt : Date.now();
  const decision = resolveContext(accesses, await routines(env, accesses), { at, zone, override, held: saved?.mode === 'hold' && !requested });
  const selected = accesses.find((item) => item.workspace.id === decision.context.workspace.id);
  if (!selected) throw notFound('Space context is no longer available.');
  return withWorkspace(env, selected, (client) => buildSpaceView(client, selected, decision));
}

async function inboxResponse(request: Request, env: RuntimeEnv) {
  const { value, accesses } = await activeAccesses(request, env);
  const settled = await Promise.allSettled(accesses.map((current) => withWorkspace(env, current, (client) => readInboxSource(client, current))));
  const sources = settled.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
  return { sources, groups: groupInbox(sources, value.id), partial: sources.length !== accesses.length };
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
      SUM(CASE WHEN type='task' AND state='open' THEN 1 ELSE 0 END) AS open_tasks,
      SUM(CASE WHEN type LIKE 'pos.%' THEN 1 ELSE 0 END) AS pos_records
      FROM records WHERE archived IS NULL` })),
  ]);
  const count = counts[0] || {};
  const pos = Number(count.pos_records || 0) ? await posSummary(client) : undefined;
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
  if (request.method === 'GET' && path === '/v1/actions') return response({ actions: actionCatalog.filter((action) => action.id !== 'flow.suggest' || Boolean(env.TYPESAFE_API_KEY)), interfaces: interfaceCatalog });
  if (request.method === 'GET' && path === '/v1/space') return response(await spaceResponse(request, env, url));
  if (request.method === 'GET' && path === '/v1/inbox') return response(await inboxResponse(request, env));
  if (request.method === 'PUT' && path === '/v1/context') {
    const { value, control, accesses } = await activeAccesses(request, env);
    const body = await Effect.runPromise(parseJson(request));
    const mode = body.mode === 'auto' ? 'auto' : body.mode === 'hold' ? 'hold' : null;
    if (!mode) throw badRequest('Context mode must be auto or hold.');
    const selected = mode === 'hold' ? accesses.find((item) => item.workspace.slug === body.scope || item.workspace.id === body.scope) : accesses[0];
    if (!selected) throw forbidden();
    const duration = typeof body.duration === 'number' && Number.isSafeInteger(body.duration) ? Math.min(Math.max(body.duration, 900_000), 604_800_000) : 43_200_000;
    await Effect.runPromise(control.saveContext(value.id, selected.workspace.id, mode, mode === 'hold' ? Date.now() + duration : null));
    return response({ context: { mode, scope: mode === 'hold' ? selected.workspace.slug : null, expires: mode === 'hold' ? Date.now() + duration : null } });
  }
  if (request.method === 'GET' && path === '/v1/workspaces') {
    const { value, control } = await identity(request, env);
    await ensurePersonalWorkspace(value, control, env);
    let workspaces = await Effect.runPromise(control.listWorkspaces(value.id));
    for (const entry of workspaces) {
      if (entry.role === 'owner' && entry.workspace.mode === 'work' && entry.workspace.state === 'provisioning') {
        await provision(control, env, entry.workspace);
      }
    }
    workspaces = await Effect.runPromise(control.listWorkspaces(value.id));
    return response({ workspaces: workspaces.map(({ workspace, role, workRole }) => ({ id: workspace.id, name: workspace.name, slug: workspace.slug, scope: workspace.slug, role, workRole, owner: workspace.mode === 'personal' ? 'You' : workspace.ownerName || 'Workspace owner', mode: workspace.mode, state: workspace.state })) });
  }
  if (request.method === 'POST' && path === '/v1/workspaces') return createWorkspace(request, env);
  const publicSiteMatch = /^\/v1\/sites\/([a-z0-9-]+)(\/.*)?$/.exec(path);
  if (request.method === 'GET' && publicSiteMatch) {
    const siteSlug = publicSiteMatch[1];
    const wsRow = await env.CONTROL.prepare("SELECT * FROM workspaces WHERE slug=? AND state='active' LIMIT 1").bind(siteSlug).first<Record<string, unknown>>();
    if (!wsRow) throw notFound('Site not found.');
    const ws = { id: String(wsRow.id), name: String(wsRow.name), slug: String(wsRow.slug), mode: wsRow.mode === 'personal' ? 'personal' as const : 'work' as const, databaseName: String(wsRow.database_name), databaseHost: typeof wsRow.database_host === 'string' ? wsRow.database_host : null, state: 'active' as const };
    const client = await Effect.runPromise(openWorkspaceDatabase(tursoEnv(env), ws.databaseName, ws.databaseHost!));
    try {
      const siteRows = await client.execute("SELECT data FROM records WHERE type='site' AND state='live' AND archived IS NULL ORDER BY updated DESC LIMIT 1");
      if (!siteRows.rows.length) throw notFound('No published site found.');
      const siteData = object(JSON.parse(String(siteRows.rows[0].data)));
      const releases = Array.isArray(siteData.releases) ? siteData.releases : [];
      const currentReleaseId = String(siteData.currentRelease || '');
      const release = releases.find((r: any) => r.id === currentReleaseId) || releases[releases.length - 1];
      const requestedPath = (publicSiteMatch[2] || '/').replace(/\/+$/, '') || '/';
      const releasePath = requestedPath === '/' ? '/index.html' : /\.[a-z0-9]+$/i.test(requestedPath) ? requestedPath : `${requestedPath}/index.html`;
      const file = release && Array.isArray(release.files) ? (release.files as Array<{ path?: string; key?: string; mime?: string }>).find((item) => item.path === releasePath) : undefined;
      const artifact = file?.key ? await env.SITE_RELEASES.get(file.key) : null;
      if (!artifact) throw notFound('Site content unavailable.');
      const contentType = file?.mime || artifact.httpMetadata?.contentType || 'application/octet-stream';
      let body = await artifact.text();
      if (contentType.startsWith('text/html')) {
        const base = `/v1/sites/${encodeURIComponent(siteSlug)}`;
        body = body.replaceAll('href="/', `href="${base}/`);
      }
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=60, s-maxage=300',
          'X-Frame-Options': 'SAMEORIGIN',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } finally {
      client.close();
    }
  }
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
    if (request.method === 'GET' && nested === 'actions') return response({ actions: actionCatalog.filter((action) => canExecute(current.member, action.id) && (action.id !== 'flow.suggest' || Boolean(env.TYPESAFE_API_KEY))), interfaces: interfaceCatalog });
  if (request.method === 'POST' && /^actions\/flow\.(start|advance)$/.test(nested)) {
    const key = request.headers.get('Idempotency-Key') || '';
    const input = await Effect.runPromise(parseJson(request));
    const actionId = nested.slice(8) as GatewayRequest['actionId'];
    return response(await acceptFlowRequest(env, current, { actionId, idempotencyKey: key, input }), 201);
  }
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
    if (request.method === 'GET' && nested === 'site') {
      const siteRows = await Effect.runPromise(query<Record<string, unknown>>(client, { sql: "SELECT * FROM records WHERE type='site' AND archived IS NULL ORDER BY updated DESC LIMIT 1" }));
      if (!siteRows.length) return response({ site: null });
      const row = siteRows[0];
      return response({ site: { id: String(row.id), version: Number(row.version), state: String(row.state), data: object(typeof row.data === 'string' ? JSON.parse(row.data) : row.data) } });
    }
    if (request.method === 'GET' && nested === 'records') {
      const type = url.searchParams.get('type');
      const search = (url.searchParams.get('q') || '').trim();
      const offset = Number(url.searchParams.get('offset') || 0);
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10000) throw badRequest('Invalid record page.');
      if (search.length > 120) throw badRequest('Record search is too long.');
      if (current.member.role === 'guest' && type?.startsWith('pos.')) throw forbidden();
      const rows = await Effect.runPromise(query<Record<string, unknown>>(client, type
        ? { sql: "SELECT * FROM records WHERE type=? AND archived IS NULL AND (?='' OR instr(lower(title),lower(?))>0 OR instr(lower(data),lower(?))>0) ORDER BY updated DESC,id LIMIT 101 OFFSET ?", args: [type, search, search, search, offset] }
        : { sql: "SELECT * FROM records WHERE archived IS NULL AND (?='' OR instr(lower(title),lower(?))>0 OR instr(lower(data),lower(?))>0) ORDER BY updated DESC,id LIMIT 101 OFFSET ?", args: [search, search, search, offset] }));
      return response({ records: rows.slice(0, 100).map(record).filter((item) => canReadRecord(current.member, item)), next: rows.length > 100 ? offset + 100 : null });
    }
    if (request.method === 'GET' && nested === 'contacts') {
      const offset = Number(url.searchParams.get('offset') || 0);
      return response(await searchContacts(client, current.member, url.searchParams.get('q') || '', offset));
    }
    const linksMatch = /^records\/([A-Za-z0-9_-]+)\/links$/.exec(nested);
    if (request.method === 'GET' && linksMatch) {
      const id = decodeURIComponent(linksMatch[1]);
      const found = await Effect.runPromise(query<Record<string, unknown>>(client, { sql: 'SELECT * FROM records WHERE id=? AND archived IS NULL', args: [id] }));
      if (!found[0]) throw notFound('Record not found.');
      if (!canReadRecord(current.member, record(found[0]))) throw forbidden();
      const rows = await Effect.runPromise(query<Record<string, unknown>>(client, { sql: `SELECT l.id,l.source,l.target,l.role,l.since,l.until,
        CASE WHEN l.source=? THEN target.id ELSE source.id END AS otherid,
        CASE WHEN l.source=? THEN target.type ELSE source.type END AS othertype,
        CASE WHEN l.source=? THEN target.title ELSE source.title END AS othername,
        CASE WHEN l.source=? THEN target.data ELSE source.data END AS otherdata,
        CASE WHEN l.source=? THEN target.assignee ELSE source.assignee END AS otherassignee
        FROM links l JOIN records source ON source.id=l.source AND source.archived IS NULL JOIN records target ON target.id=l.target AND target.archived IS NULL
        WHERE l.source=? OR l.target=? ORDER BY COALESCE(l.since,l.created) DESC`, args: [id, id, id, id, id, id, id] }));
      const visible = rows.filter((item) => canReadRecord(current.member, { type: String(item.othertype), data: object(JSON.parse(String(item.otherdata))), assignee: typeof item.otherassignee === 'string' ? item.otherassignee : null }));
      return response({ links: visible.map((item) => ({ id: String(item.id), role: String(item.role), since: item.since === null ? null : Number(item.since), until: item.until === null ? null : Number(item.until), other: { id: String(item.otherid), type: String(item.othertype), name: String(item.othername) } })) });
    }
    const consentMatch = /^records\/([A-Za-z0-9_-]+)\/consents$/.exec(nested);
    if (request.method === 'GET' && consentMatch) {
      if (current.member.role === 'guest' || isCook(current.member)) throw forbidden();
      const id = consentMatch[1];
      const found = await Effect.runPromise(query<Record<string, unknown>>(client, { sql: "SELECT * FROM records WHERE id=? AND type IN ('person','organization') AND archived IS NULL", args: [id] }));
      if (!found[0]) throw notFound('Contact not found.');
      if (!canReadRecord(current.member, record(found[0]))) throw forbidden();
      const rows = await Effect.runPromise(query<Record<string, unknown>>(client, { sql: 'SELECT id,contact,channel,purpose,state,source,actor,created FROM consents WHERE contact=? ORDER BY created DESC,id DESC LIMIT 100', args: [id] }));
      return response({ consents: rows.map((item) => ({ id: String(item.id), contact: String(item.contact), channel: String(item.channel), purpose: String(item.purpose), state: String(item.state), source: String(item.source), actor: String(item.actor), created: Number(item.created) })) });
    }
    if (request.method === 'GET' && nested === 'flows') {
      const definitions = await Effect.runPromise(query<Record<string, unknown>>(client, { sql: "SELECT id,name,version,state,data FROM definitions WHERE kind='flow' AND state='published' ORDER BY name COLLATE NOCASE" }));
      const runs = await Effect.runPromise(query<Record<string, unknown>>(client, { sql: "SELECT * FROM runs WHERE state IN ('ready','blocked') ORDER BY updated_at DESC LIMIT 100" }));
      const books = definitions.map((item) => ({ id: String(item.id), name: String(item.name), version: Number(item.version), data: object(JSON.parse(String(item.data))) }));
      const active = await Promise.all(runs.map(async (item) => {
        const context = object(JSON.parse(String(item.context)));
        const owner = String(context.startedBy || '');
        if (!(await runVisible(client, current.member, owner, item.record_id))) return null;
        const book = books.find((candidate) => candidate.id === String(item.flow_id));
        if (!book) return null;
        return { id: String(item.id), flowId: String(item.flow_id), name: book.name, flowVersion: Number(item.flow_version), state: String(item.state), actionId: typeof item.action_id === 'string' ? item.action_id : null, recordId: typeof item.record_id === 'string' ? item.record_id : null, step: Number(context.step || 0), version: Number(item.version), updatedAt: Number(item.updated_at) };
      }));
      return response({ books, runs: active.filter((item): item is NonNullable<typeof item> => item !== null) });
    }
    const runMatch = /^runs\/([A-Za-z0-9_-]+)$/.exec(nested);
    if (request.method === 'GET' && runMatch) {
      const rows = await Effect.runPromise(query<Record<string, unknown>>(client, { sql: 'SELECT * FROM runs WHERE id=?', args: [decodeURIComponent(runMatch[1])] }));
      const item = rows[0]; if (!item) throw notFound('Flow Book run not found.');
      const runContext = object(JSON.parse(String(item.context)));
      const owner = String(runContext.startedBy || '');
      if (!(await runVisible(client, current.member, owner, item.record_id))) throw forbidden();
      const full = owner === current.identity.id || managesMembers(current.member);
      const saved = await Effect.runPromise(query<Record<string, unknown>>(client, { sql: 'SELECT id,action,occurrence,state,input,output,version,created,updated FROM steps WHERE run=? ORDER BY occurrence', args: [String(item.id)] }));
      const steps = saved.map((row) => ({ id: String(row.id), action: String(row.action), occurrence: Number(row.occurrence), state: String(row.state), input: full ? object(JSON.parse(String(row.input))) : {}, output: full && row.output !== null ? object(JSON.parse(String(row.output))) : null, version: Number(row.version), created: Number(row.created), updated: Number(row.updated) }));
      const visibleContext = full ? runContext : { source: runContext.source, step: runContext.step, actions: Array.isArray(runContext.actions) ? runContext.actions.map((entry) => { const action = object(entry); return { id: action.id, version: action.version, auto: action.auto }; }) : [] };
      return response({ run: { id: String(item.id), flowId: String(item.flow_id), flowVersion: Number(item.flow_version), state: String(item.state), actionId: typeof item.action_id === 'string' ? item.action_id : null, recordId: typeof item.record_id === 'string' ? item.record_id : null, context: visibleContext, version: Number(item.version), updatedAt: Number(item.updated_at), steps } });
    }
    if (request.method === 'GET' && nested === 'inbox') {
      const rows = await Effect.runPromise(query<Record<string, unknown>>(client, { sql: 'SELECT * FROM records WHERE type=\'task\' AND state=\'open\' AND (assignee=? OR assignee IS NULL) AND archived IS NULL ORDER BY updated DESC LIMIT 100', args: [current.identity.id] }));
      const pos = current.member.role === 'guest' ? { orders: [] } : await readPosInbox(client).catch(() => ({ orders: [] }));
      return response({ tasks: rows.map(record).filter((item) => canReadRecord(current.member, item)), orders: isCook(current.member) ? pos.orders.map(kitchenOrder) : pos.orders, permissions: { prepare: canExecute(current.member, 'pos.order.item.update'), collect: canExecute(current.member, 'pos.checkout'), completeTask: canExecute(current.member, 'task.complete'), openOrder: canExecute(current.member, 'pos.open') } });
    }
    if (request.method === 'GET' && nested === 'canvas') return response({ cards: await workspaceCanvas(client, current.member) });
    if (request.method === 'GET' && nested === 'definitions') return response({ definitions: await listDefinitions(client) });
    const actionMatch = /^actions\/([a-z.]+)$/.exec(nested);
    if (request.method === 'POST' && actionMatch) {
      const key = request.headers.get('Idempotency-Key') || ''; const input = await Effect.runPromise(parseJson(request));
      const actionId = actionMatch[1] as GatewayRequest['actionId'];
      const action = { actionId, idempotencyKey: key, input };
      const result = await Effect.runPromise(executeGateway(client, current, action, { productContent: env.PRODUCT_CONTENT, siteReleases: env.SITE_RELEASES, ai: env.AI, tinyfish: env.TINYFISH_API_KEY, typesafe: env.TYPESAFE_API_KEY }));
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
        await processCommand(env.CONTROL, body.id, (current, work) => withWorkspace(env, current, work), { productContent: env.PRODUCT_CONTENT, siteReleases: env.SITE_RELEASES, ai: env.AI, typesafe: env.TYPESAFE_API_KEY });
        message.ack();
      } catch { message.retry({ delaySeconds: 60 }); }
    }
  },
  async scheduled(_controller: ScheduledController, env: RuntimeEnv): Promise<void> {
    await sweepFlowDispatches(env);
    await env.CONTROL.prepare('DELETE FROM channel_link_requests WHERE expires_at<=?').bind(Date.now()).run();
    await env.CONTROL.prepare("UPDATE channel_commands SET state='failed',result='Processing interrupted. Check TAR before retrying.' WHERE state='processing' AND attempts>=5 AND due_at<=?").bind(Date.now()).run();
    const due = await env.CONTROL.prepare("SELECT id FROM channel_commands WHERE state IN ('pending','processing') AND due_at<=? AND attempts<5 ORDER BY due_at LIMIT 100").bind(Date.now()).all<{id: string}>();
    if (due.results.length) await env.OUTBOX.sendBatch(due.results.map((item) => ({ body: { kind: 'chat.command', id: item.id } })));
  },
} satisfies ExportedHandler<RuntimeEnv>;
