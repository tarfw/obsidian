import { createClient, type Client, type InStatement } from '@libsql/client/web';
import { Effect } from 'effect';
import { unavailable } from '../errors.ts';
import { WORKSPACE_SCHEMA } from './schema.ts';

type TursoEnv = { readonly TURSO_ORG: string; readonly TURSO_PLATFORM_TOKEN: string; readonly TURSO_GROUP: string; };
type Database = { readonly Name: string; readonly Hostname: string; };
type Group = { readonly name: string; };

async function platform<T>(env: TursoEnv, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.turso.tech/v1/organizations/${encodeURIComponent(env.TURSO_ORG)}${path}`, {
    ...init, headers: { Authorization: `Bearer ${env.TURSO_PLATFORM_TOKEN}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  });
  if (!response.ok) throw new Error(`Turso Platform API ${response.status}`);
  return response.json<T>();
}

async function token(env: TursoEnv, name: string): Promise<string> {
  return (await platform<{ jwt: string }>(env, `/databases/${encodeURIComponent(name)}/auth/tokens?expiration=10m&authorization=full-access`, { method: 'POST' })).jwt;
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
      try { for (const statement of WORKSPACE_SCHEMA) await client.execute(statement); } finally { client.close(); }
      return { host: database.Hostname };
    },
    catch: (cause) => unavailable('Workspace database provisioning failed.', cause),
  });
}

export function openWorkspaceDatabase(env: TursoEnv, databaseName: string, host: string): Effect.Effect<Client, ReturnType<typeof unavailable>> {
  return Effect.tryPromise({ try: async () => createClient({ url: `libsql://${host}`, authToken: await token(env, databaseName) }), catch: (cause) => unavailable('Workspace database is unavailable.', cause) });
}

export function query<T extends Record<string, unknown>>(client: Client, statement: InStatement): Effect.Effect<T[], ReturnType<typeof unavailable>> {
  return Effect.tryPromise({ try: async () => {
    const result = await client.execute(statement);
    return result.rows.map((values) => Object.fromEntries(result.columns.map((column, index) => [column, values[index]])) as T);
  }, catch: (cause) => unavailable('Workspace query failed.', cause) });
}
