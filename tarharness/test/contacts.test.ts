import { createClient } from '@libsql/client';
import { describe, expect, it } from 'vitest';
import { WORKSPACE_SCHEMA } from '../src/db/schema.ts';
import { searchContacts } from '../src/contacts/search.ts';
import type { Member } from '../src/types.ts';

const owner: Member = { workspaceId: 'ws', userId: 'owner', role: 'owner', state: 'active' };

describe('contact search', () => {
  it('pages identities, searches channels, and excludes business records', async () => {
    const client = createClient({ url: 'file::memory:' });
    try {
      for (const statement of WORKSPACE_SCHEMA) await client.execute(statement);
      const entries = [
        ['a', 'person', 'Ada', '{"email":"ada@example.com"}'],
        ['b', 'organization', 'Analytical Engines', '{"phone":"123456"}'],
        ['c', 'task', 'Ada follow up', '{}'],
      ];
      for (const [id, type, title, data] of entries) await client.execute({
        sql: 'INSERT INTO records(id,type,title,state,data,version,created,updated) VALUES(?,?,?,?,?,1,1,1)',
        args: [id, type, title, 'active', data],
      });
      expect((await searchContacts(client, owner, 'ada@example.com', 0)).contacts.map((item) => item.id)).toEqual(['a']);
      expect((await searchContacts(client, owner, '', 0)).contacts.map((item) => item.id)).toEqual(['a', 'b']);
      expect((await searchContacts(client, { ...owner, role: 'member', workRole: 'cashier' }, '', 0)).contacts.map((item) => item.id)).toEqual(['a']);
      await expect(searchContacts(client, { ...owner, role: 'guest' }, '', 0)).rejects.toThrow();
      await expect(searchContacts(client, owner, '', -1)).rejects.toThrow();
    } finally { client.close(); }
  });
});
