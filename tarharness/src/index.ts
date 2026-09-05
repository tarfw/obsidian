import { Effect } from 'effect';
import type { Client } from '@libsql/client/web';
import { verifyGoogleIdentity } from './auth/google.ts';
import { ControlStore } from './db/control.ts';
import { openWorkspaceDatabase, provisionWorkspaceDatabase, query } from './db/turso.ts';
import { executeGateway, type GatewayRequest } from './gateway/actions.ts';
import { HarnessError, badRequest, forbidden, notFound, unavailable } from './errors.ts';
import { actionCatalog, type AccessContext, type RecordItem } from './types.ts';

type RuntimeEnv = Env & { readonly TURSO_PLATFORM_TOKEN?: string };
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

async function handle(request: Request, env: RuntimeEnv): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  const url = new URL(request.url); const path = url.pathname;
  if (request.method === 'GET' && path === '/health') return response({ ok: true, service: 'tarharness', now: new Date().toISOString(), tursoProvisioning: Boolean(env.TURSO_PLATFORM_TOKEN && env.TURSO_ORG && !env.TURSO_ORG.startsWith('REPLACE_')) });
  if (request.method === 'GET' && path === '/v1/actions') return response({ actions: actionCatalog });
  if (request.method === 'GET' && path === '/v1/workspaces') {
    const { value, control } = await identity(request, env); await ensurePersonalWorkspace(value, control, env); const workspaces = await Effect.runPromise(control.listWorkspaces(value.id));
    return response({ workspaces: workspaces.map(({ workspace, role }) => ({ id: workspace.id, name: workspace.name, slug: workspace.slug, scope: workspace.slug, role, mode: workspace.mode, state: workspace.state })) });
  }
  if (request.method === 'POST' && path === '/v1/workspaces') return createWorkspace(request, env);
  const match = /^\/v1\/workspaces\/([a-z0-9-]+)(?:\/(.*))?$/.exec(path);
  if (!match) throw notFound('Route not found.');
  const slug = match[1]; const nested = match[2] || '';
  const { access: current, control } = await access(request, env, slug);
  if (request.method === 'POST' && nested === 'members') {
    if (current.member.role !== 'owner' && current.member.role !== 'admin') throw forbidden();
    const body = await Effect.runPromise(parseJson(request)); const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''; const role = body.role === 'admin' || body.role === 'guest' ? body.role : 'member';
    if (!/^\S+@\S+\.\S+$/.test(email)) throw badRequest('A valid email is required.');
    await Effect.runPromise(control.inviteMember({ workspaceId: current.workspace.id, email, role, invitedBy: current.identity.id }));
    return response({ invitation: { email, role, state: 'pending' } }, 201);
  }
  return withWorkspace(env, current, async (client) => {
    if (request.method === 'GET' && nested === 'records') {
      const type = url.searchParams.get('type');
      const rows = await Effect.runPromise(query<Record<string, unknown>>(client, type ? { sql: 'SELECT * FROM records WHERE type=? AND archived_at IS NULL ORDER BY updated_at DESC LIMIT 100', args: [type] } : { sql: 'SELECT * FROM records WHERE archived_at IS NULL ORDER BY updated_at DESC LIMIT 100' }));
      return response({ records: rows.map(record) });
    }
    if (request.method === 'GET' && nested === 'inbox') {
      const rows = await Effect.runPromise(query<Record<string, unknown>>(client, { sql: 'SELECT * FROM records WHERE type=\'task\' AND state=\'open\' AND (assignee_id=? OR assignee_id IS NULL) AND archived_at IS NULL ORDER BY updated_at DESC LIMIT 100', args: [current.identity.id] }));
      return response({ tasks: rows.map(record) });
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
    const actionMatch = /^actions\/(record\.create|record\.update|task\.create|task\.complete|flow\.start)$/.exec(nested);
    if (request.method === 'POST' && actionMatch) {
      const key = request.headers.get('Idempotency-Key') || ''; const input = await Effect.runPromise(parseJson(request));
      const result = await Effect.runPromise(executeGateway(client, current, { actionId: actionMatch[1] as GatewayRequest['actionId'], idempotencyKey: key, input }));
      return response(result, 201);
    }
    throw notFound('Route not found.');
  });
}

export default {
  fetch(request: Request, env: RuntimeEnv): Promise<Response> { return handle(request, env).catch(errorResponse); },
  async queue(_batch: MessageBatch<unknown>, _env: RuntimeEnv): Promise<void> {
    // Only approved connector Actions enqueue work. No connector is installed in the foundation release.
  },
  async scheduled(_controller: ScheduledController, _env: RuntimeEnv): Promise<void> {
    // Due-work recovery is enabled when the first connector or schedule Action is installed.
  },
} satisfies ExportedHandler<RuntimeEnv>;
