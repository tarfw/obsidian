import type { Client, InStatement, InValue } from '@libsql/client';
import { executeQuery } from './turso.ts';
import type { R2StorageService } from './r2.ts';

const TABLES = ['matter', 'motion', 'graph'] as const;
type ArchiveTable = typeof TABLES[number];

const COLUMNS: Record<ArchiveTable, string[]> = {
  matter: ['id', 'type', 'data', 'state', 'created', 'updated'],
  motion: ['id', 'type', 'actor', 'ref', 'data', 'created'],
  graph: ['id', 'source', 'target', 'kind', 'data', 'created', 'updated'],
};

interface ArchiveManifest {
  version: 1;
  space: string;
  db: string;
  schema: number;
  created: number;
  pages: Record<ArchiveTable, number>;
}

export async function archiveTenant(
  client: Client,
  storage: R2StorageService,
  input: { space: string; db: string; schema: number },
): Promise<ArchiveManifest> {
  const prefix = `archives/spaces/${input.space}`;
  const pages: ArchiveManifest['pages'] = { matter: 0, motion: 0, graph: 0 };
  for (const table of TABLES) {
    let offset = 0;
    for (;;) {
      const rows = await executeQuery<Record<string, unknown>>(
        client,
        `SELECT * FROM ${table} ORDER BY created, id LIMIT 500 OFFSET ?`,
        [offset],
      );
      if (!rows.length) break;
      await storage.writeText(`${prefix}/${table}/${pages[table]}.json`, JSON.stringify(rows));
      pages[table] += 1;
      offset += rows.length;
      if (rows.length < 500) break;
    }
  }
  const manifest: ArchiveManifest = {
    version: 1,
    space: input.space,
    db: input.db,
    schema: input.schema,
    created: Math.floor(Date.now() / 1000),
    pages,
  };
  await storage.writeText(`${prefix}/manifest.json`, JSON.stringify(manifest));
  return manifest;
}

export async function restoreTenant(client: Client, storage: R2StorageService, space: string): Promise<ArchiveManifest> {
  const prefix = `archives/spaces/${space}`;
  const raw = await storage.readText(`${prefix}/manifest.json`);
  if (!raw) throw new Error('Workspace archive manifest not found');
  const manifest = JSON.parse(raw) as ArchiveManifest;
  if (manifest.version !== 1 || manifest.space !== space) throw new Error('Workspace archive manifest is invalid');
  for (const table of TABLES) {
    const columns = COLUMNS[table];
    for (let page = 0; page < manifest.pages[table]; page += 1) {
      const pageRaw = await storage.readText(`${prefix}/${table}/${page}.json`);
      if (!pageRaw) throw new Error(`Workspace archive page missing: ${table}/${page}`);
      const rows = JSON.parse(pageRaw) as Array<Record<string, InValue>>;
      for (let offset = 0; offset < rows.length; offset += 100) {
        const statements: InStatement[] = rows.slice(offset, offset + 100).map((row) => ({
          sql: `INSERT OR REPLACE INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
          args: columns.map((column) => row[column] ?? null),
        }));
        if (statements.length) await client.batch(statements, 'write');
      }
    }
  }
  return manifest;
}
