import { createClient } from '@libsql/client';
import { describe, expect, it } from 'vitest';
import { WORKSPACE_PATCHES, WORKSPACE_SCHEMA } from '../src/db/schema.ts';
import { ensureLinks, ensureRecordColumns } from '../src/db/turso.ts';

describe('older workspace schema', () => {
  it('adds missing record columns before creating current indexes without losing records', async () => {
    const db = createClient({ url: 'file::memory:' });
    try {
      for (const sql of WORKSPACE_SCHEMA.filter((statement) => statement.startsWith('CREATE TABLE'))) {
        await db.execute(sql.replace('owner TEXT, assignee TEXT, due INTEGER, ', '').replace(', archived INTEGER', ''));
      }
      await db.execute('DROP TABLE links');
      await db.execute('CREATE TABLE links (id TEXT PRIMARY KEY, relation TEXT NOT NULL)');
      await db.execute("INSERT INTO links(id,relation) VALUES('old1','legacy')");
      await db.execute({
        sql: 'INSERT INTO records(id,type,title,state,data,version,created,updated) VALUES(?,?,?,?,?,?,?,?)',
        args: ['product1', 'pos.product', 'Tea', 'active', '{}', 1, 1, 1],
      });

      await ensureRecordColumns(db);
      await ensureRecordColumns(db);
      await ensureLinks(db);
      await ensureLinks(db);
      for (const patch of WORKSPACE_PATCHES) {
        await db.batch(patch.statements.map((sql) => ({ sql, args: [] })), 'write');
      }

      const records = await db.execute("SELECT id FROM records WHERE archived IS NULL AND type='pos.product'");
      expect(records.rows.map((row) => row.id)).toEqual(['product1']);
      const columns = await db.execute('PRAGMA table_info(records)');
      for (const name of ['owner', 'assignee', 'due', 'archived']) {
        expect(columns.rows.filter((column) => column.name === name)).toHaveLength(1);
      }
      expect((await db.execute('SELECT relation FROM archive')).rows[0]?.relation).toBe('legacy');
      expect((await db.execute('PRAGMA table_info(links)')).rows.some((column) => column.name === 'source')).toBe(true);
    } finally {
      db.close();
    }
  });
});
