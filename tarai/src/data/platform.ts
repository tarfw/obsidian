import { createClient } from '@libsql/client';
import { PERSONAL_SCHEMA, WORKSPACE_SCHEMA } from './dedicated-schema.ts';
import { initializeSchema } from './turso.ts';

export interface TursoPlatformEnv {
  TURSO_ORG?: string;
  TURSO_PLATFORM_TOKEN?: string;
  TURSO_GROUP_APAC?: string;
  TURSO_GROUP_EU?: string;
  TURSO_GROUP_US?: string;
}

interface PlatformDatabase {
  DbId: string;
  Hostname: string;
  Name: string;
}

function requireSetting(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function groupFor(env: TursoPlatformEnv, region: string): string {
  if (region === 'eu') return env.TURSO_GROUP_EU || 'default';
  if (region === 'us') return env.TURSO_GROUP_US || 'default';
  return env.TURSO_GROUP_APAC || 'default';
}

async function platformRequest<T>(env: TursoPlatformEnv, path: string, init?: RequestInit): Promise<T> {
  const org = encodeURIComponent(requireSetting(env.TURSO_ORG, 'TURSO_ORG'));
  const token = requireSetting(env.TURSO_PLATFORM_TOKEN, 'TURSO_PLATFORM_TOKEN');
  const response = await fetch(`https://api.turso.tech/v1/organizations/${org}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(`Turso Platform API ${response.status}`);
  return response.json<T>();
}

async function getDatabase(env: TursoPlatformEnv, name: string): Promise<PlatformDatabase> {
  const result = await platformRequest<{ database: PlatformDatabase }>(env, `/databases/${encodeURIComponent(name)}`);
  return result.database;
}

export async function deleteDatabase(env: TursoPlatformEnv, name: string): Promise<boolean> {
  try {
    await platformRequest<{ database: string }>(env, `/databases/${encodeURIComponent(name)}`, { method: 'DELETE' });
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.endsWith('404')) return false;
    throw error;
  }
}

async function createDatabase(env: TursoPlatformEnv, name: string, region: string): Promise<PlatformDatabase> {
  try {
    const result = await platformRequest<{ database: PlatformDatabase }>(env, '/databases', {
      method: 'POST',
      body: JSON.stringify({ name, group: groupFor(env, region) }),
    });
    return result.database;
  } catch (error) {
    if (error instanceof Error && error.message.endsWith('409')) return getDatabase(env, name);
    throw error;
  }
}

async function createToken(env: TursoPlatformEnv, name: string, authorization: 'full-access' | 'read-only' = 'full-access', expiration = '10m'): Promise<string> {
  const result = await platformRequest<{ jwt: string }>(
    env,
    `/databases/${encodeURIComponent(name)}/auth/tokens?expiration=${encodeURIComponent(expiration)}&authorization=${authorization}`,
    { method: 'POST' },
  );
  return result.jwt;
}

export function createReadToken(env: TursoPlatformEnv, name: string): Promise<string> {
  return createToken(env, name, 'read-only', '1h');
}

export async function provisionDatabase(
  env: TursoPlatformEnv,
  input: { kind: 'user' | 'space'; id: string; name: string; region: string },
): Promise<{ db: string; host: string; schema: number }> {
  const database = await createDatabase(env, input.name, input.region);
  const token = await createToken(env, input.name);
  const host = database.Hostname;
  const client = createClient({ url: `libsql://${host}`, authToken: token });
  try {
    await initializeSchema(client, input.kind === 'user' ? PERSONAL_SCHEMA : WORKSPACE_SCHEMA);
  } finally {
    client.close();
  }
  return { db: database.Name, host, schema: 1 };
}
