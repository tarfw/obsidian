import { createClient, type Client, type InStatement } from '@libsql/client/web';
import { Effect } from 'effect';
import { unavailable } from '../errors.ts';
import { INBOX_SCHEMA, WORKSPACE_SCHEMA } from './schema.ts';

type TursoEnv = { readonly TURSO_ORG: string; readonly TURSO_PLATFORM_TOKEN: string; readonly TURSO_GROUP: string; };
type Database = { readonly Name: string; readonly Hostname: string; };
type Group = { readonly name: string; };
const tokenCache = new Map<string, { expires: number; value: Promise<string> }>();
const nowCache = new Map<string, Promise<Database>>();
class TursoPlatformError extends Error {
  constructor(readonly status: number) { super(`Turso Platform API ${status}`); }
}

async function platform<T>(env: TursoEnv, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.turso.tech/v1/organizations/${encodeURIComponent(env.TURSO_ORG)}${path}`, {
    ...init, headers: { Authorization: `Bearer ${env.TURSO_PLATFORM_TOKEN}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  });
  if (!response.ok) throw new TursoPlatformError(response.status);
  return response.json<T>();
}

async function token(env: TursoEnv, name: string): Promise<string> {
  const key = `${env.TURSO_ORG}/${name}`;
  const cached = tokenCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  for (const [entry, token] of tokenCache) if (token.expires <= Date.now()) tokenCache.delete(entry);
  const value = platform<{ jwt: string }>(env, `/databases/${encodeURIComponent(name)}/auth/tokens?expiration=10m&authorization=full-access`, { method: 'POST' })
    .then((result) => {
      if (!result.jwt) throw new Error('Turso did not return a database token.');
      return result.jwt;
    });
  tokenCache.set(key, { expires: Date.now() + 8 * 60_000, value });
  if (tokenCache.size > 256) tokenCache.delete(tokenCache.keys().next().value!);
  try { return await value; }
  catch (cause) {
    if (tokenCache.get(key)?.value === value) tokenCache.delete(key);
    throw cause;
  }
}

export async function mintReplicaToken(env: TursoEnv, name: string): Promise<string> {
  const result = await platform<{ jwt: string }>(env,
    `/databases/${encodeURIComponent(name)}/auth/tokens?expiration=10m&authorization=read-only`, { method: 'POST' });
  if (!result.jwt) throw new Error('Turso did not return a read-only database token.');
  return result.jwt;
}

export async function ensureNowDatabase(env: TursoEnv, user: string): Promise<Database> {
  const name = `now-${user.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 32)}`;
  if (name === 'now-') throw new Error('Now database identity is invalid.');
  const cached = nowCache.get(name);
  if (cached) return cached;
  const pending = (async () => {
    let database: Database;
    try {
      database = (await platform<{ database: Database }>(env, `/databases/${encodeURIComponent(name)}`)).database;
    } catch (cause) {
      if (!(cause instanceof TursoPlatformError) || cause.status !== 404) throw cause;
      await ensureGroup(env);
      try {
        database = (await platform<{ database: Database }>(env, '/databases', {
          method: 'POST', body: JSON.stringify({ name, group: env.TURSO_GROUP || 'default' }),
        })).database;
      } catch (createCause) {
        if (!(createCause instanceof TursoPlatformError) || createCause.status !== 409) throw createCause;
        database = (await platform<{ database: Database }>(env, `/databases/${encodeURIComponent(name)}`)).database;
      }
    }
    const client = createClient({ url: `libsql://${database.Hostname}`, authToken: await token(env, name) });
    try { for (const statement of INBOX_SCHEMA) await client.execute(statement); }
    finally { client.close(); }
    return database;
  })();
  nowCache.set(name, pending);
  if (nowCache.size > 256) nowCache.delete(nowCache.keys().next().value!);
  try { return await pending; }
  catch (cause) { if (nowCache.get(name) === pending) nowCache.delete(name); throw cause; }
}

async function ensureGroup(env: TursoEnv): Promise<void> {
  const groups = await platform<{ groups: Group[] }>(env, '/groups');
  if (groups.groups.some((group) => group.name === env.TURSO_GROUP)) return;
  const locationsResponse = await fetch('https://api.turso.tech/v1/locations', { headers: { Authorization: `Bearer ${env.TURSO_PLATFORM_TOKEN}` } });
  if (!locationsResponse.ok) throw new Error(`Turso Platform API ${locationsResponse.status}`);
  const locations = (await locationsResponse.json() as { locations: Record<string, string> }).locations;
  const location = locations['aws-ap-south-1'] ? 'aws-ap-south-1' : Object.keys(locations)[0];
  if (!location) throw new Error('Turso has no available locations.');
  try {
    await platform(env, '/groups', { method: 'POST', body: JSON.stringify({ name: env.TURSO_GROUP, location }) });
  } catch (cause) {
    if (!(cause instanceof Error) || !cause.message.endsWith('409')) throw cause;
  }
}

async function initialize(client: Client): Promise<void> {
  for (const [index, statement] of WORKSPACE_SCHEMA.entries()) {
    try { await client.execute(statement); }
    catch (cause) { throw new Error(`Workspace schema statement ${index + 1} failed.`, { cause }); }
  }
}

export function provisionWorkspaceDatabase(env: TursoEnv, databaseName: string): Effect.Effect<{ readonly host: string }, ReturnType<typeof unavailable>> {
  return Effect.tryPromise({
    try: async () => {
      await ensureGroup(env);
      let database: Database;
      try {
        database = (await platform<{ database: Database }>(env, '/databases', { method: 'POST', body: JSON.stringify({ name: databaseName, group: env.TURSO_GROUP || 'default' }) })).database;
      } catch (cause) {
        if (!(cause instanceof Error) || !cause.message.endsWith('409')) throw cause;
        database = (await platform<{ database: Database }>(env, `/databases/${encodeURIComponent(databaseName)}`)).database;
      }
      const client = createClient({ url: `libsql://${database.Hostname}`, authToken: await token(env, database.Name) });
      try { await initialize(client); } finally { client.close(); }
      return { host: database.Hostname };
    },
    catch: (cause) => {
      console.error(JSON.stringify({ event: 'workspace.provision.failed', database: databaseName, error: cause instanceof Error ? cause.message.slice(0, 300) : String(cause).slice(0, 300) }));
      return unavailable('Workspace database provisioning failed.', cause);
    },
  });
}

export function openWorkspaceDatabase(env: TursoEnv, databaseName: string, host: string): Effect.Effect<Client, ReturnType<typeof unavailable>> {
  return Effect.tryPromise({
    try: async () => {
      const authToken = await token(env, databaseName);
      return createClient({ url: `libsql://${host}`, authToken });
    },
    catch: (cause) => {
      const code = cause instanceof TursoPlatformError ? `workspace_token_${cause.status}` : 'workspace_client';
      console.error(JSON.stringify({ event: 'workspace.open.failed', code, error: cause instanceof Error ? cause.message.slice(0, 300) : String(cause).slice(0, 300) }));
      return unavailable('Workspace database is unavailable.', cause, code);
    },
  });
}

export function query<T extends Record<string, unknown>>(client: Client, statement: InStatement): Effect.Effect<T[], ReturnType<typeof unavailable>> {
  return Effect.tryPromise({ try: async () => {
    const result = await client.execute(statement);
    return result.rows.map((values) => Object.fromEntries(result.columns.map((column, index) => [column, values[index]])) as T);
  }, catch: (cause) => {
    const sql = typeof statement === 'string' ? statement : 'sql' in statement ? statement.sql : '';
    console.error(JSON.stringify({ event: 'workspace.query.failed', sql: sql.slice(0, 300), error: cause instanceof Error ? cause.message.slice(0, 300) : String(cause).slice(0, 300) }));
    return unavailable('Workspace query failed.', cause, 'workspace_query');
  } });
}
