/**
 * TARAI Turso / LibSQL Database Adapter
 */
import { createClient, type Client, type InArgs, type ResultSet } from '@libsql/client';

export interface DatabaseEnv {
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
}

export function createDatabaseClientForHost(host: string, authToken: string): Client {
  return createClient({
    url: host.startsWith('libsql://') || host.startsWith('https://') ? host : `libsql://${host}`,
    authToken,
  });
}

export function createDatabaseClient(env?: DatabaseEnv): Client {
  const url = env?.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL || 'file::memory:';
  const authToken = env?.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

  return createClient({
    url,
    authToken,
  });
}

export async function executeQuery<T = Record<string, unknown>>(
  client: Client,
  sql: string,
  args: InArgs = []
): Promise<T[]> {
  const rs: ResultSet = await client.execute({ sql, args });
  const columns = rs.columns;
  return rs.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < columns.length; i++) {
      obj[columns[i]] = row[i];
    }
    return obj as T;
  });
}

export async function initializeSchema(client: Client, schemaSql: string): Promise<void> {
  // Split statements by semicolon and execute each
  const statements = schemaSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await client.execute(statement);
  }
}
