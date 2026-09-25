import { createClient } from '@libsql/client';
import { describe, expect, it } from 'vitest';
import { WORKSPACE_SCHEMA } from '../src/db/schema.ts';

describe('workspace schema', () => {
  it('creates the complete clean schema idempotently', async () => {
    const db = createClient({ url: 'file::memory:' });
    try {
      for (const sql of WORKSPACE_SCHEMA) await db.execute(sql);
      for (const sql of WORKSPACE_SCHEMA) await db.execute(sql);
      const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
      expect(tables.rows.map((row) => row.name)).toEqual(expect.arrayContaining([
        'approvals', 'assessments', 'consents', 'definitions', 'editions', 'effects', 'events', 'links', 'records', 'runs', 'steps', 'turns',
      ]));
      expect(tables.rows.map((row) => row.name)).not.toContain('patches');
    } finally { db.close(); }
  });
});
