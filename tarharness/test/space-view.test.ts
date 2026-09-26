import { createClient } from '@libsql/client';
import { describe, expect, it } from 'vitest';
import { WORKSPACE_SCHEMA } from '../src/db/schema.ts';
import { buildSpaceView, groupInbox, readInboxSource } from '../src/space/view.ts';
import { resolveContext } from '../src/space/context.ts';
import type { AccessContext } from '../src/types.ts';

const owner: AccessContext = {
  identity: { id: 'user', email: 'user@example.com', name: 'User' },
  workspace: { id: 'ws', slug: 'personal', name: 'Personal', mode: 'personal', databaseName: 'db', databaseHost: 'db', state: 'active' },
  member: { workspaceId: 'ws', userId: 'user', role: 'owner', workRole: 'general', state: 'active' },
};
const decision = resolveContext([owner], [], { at: 0, zone: 'UTC' });

async function database() {
  const db = createClient({ url: 'file::memory:' });
  for (const sql of WORKSPACE_SCHEMA) await db.execute(sql);
  return db;
}

async function task(db: Awaited<ReturnType<typeof database>>, id: string, state: string, assignee: string | null) {
  await db.execute({
    sql: 'INSERT INTO records(id,type,title,state,data,owner,assignee,version,created,updated) VALUES (?,\'task\',?,?,?,?,?,1,0,0)',
    args: [id, id, state, '{}', 'user', assignee],
  });
}

describe('Space projection', () => {
  it('stays empty without work and never shows generic dashboard cards', async () => {
    const db = await database();
    try {
      expect((await buildSpaceView(db, owner, decision)).sections).toEqual([]);
    } finally { db.close(); }
  });

  it('shows waiting signals, next tasks, and active visible flows', async () => {
    const db = await database();
    try {
      await task(db, 'mine', 'open', 'user');
      await task(db, 'waiting', 'blocked', 'user');
      await db.execute("INSERT INTO definitions(id,kind,name,version,state,data,created_at,updated_at) VALUES ('book','flow','Closing',1,'published','{}',0,0)");
      await db.execute("INSERT INTO runs(id,flow_id,flow_version,occurrence,state,context,version,created_at,updated_at) VALUES ('run','book',1,'once','ready','{\"startedBy\":\"user\",\"step\":2}',1,0,0)");
      const view = await buildSpaceView(db, owner, decision);
      expect(view.sections.map((section) => section.id)).toEqual(['signals', 'actions', 'flows']);
      expect(view.sections[0].cards).toEqual([expect.objectContaining({ id: 'waiting', value: 1 })]);
      expect(view.sections[1].cards).toEqual([expect.objectContaining({ id: 'mine', actionId: 'task.complete' })]);
      expect(view.sections[2].cards).toEqual([expect.objectContaining({ id: 'run', description: 'Continue at step 3' })]);
      const guest = { ...owner, member: { ...owner.member, role: 'guest' as const } };
      expect((await buildSpaceView(db, guest, decision)).sections.some((section) => section.id === 'flows')).toBe(false);
    } finally { db.close(); }
  });

  it('keeps Inbox groups disjoint and hides order details from unrelated roles', async () => {
    const db = await database();
    try {
      await task(db, 'mine', 'open', 'user');
      await task(db, 'available', 'open', null);
      await task(db, 'waiting', 'waiting', 'user');
      await db.execute("INSERT INTO records(id,type,title,state,data,owner,version,created,updated) VALUES ('order','pos.order','Order','open','{\"total\":500,\"lines\":[{\"title\":\"Soup\",\"quantity\":1,\"status\":\"pending\"}]}','user',1,0,0)");
      const source = await readInboxSource(db, owner);
      const groups = groupInbox([source], 'user');
      expect(groups.mine.map((item) => item.item.id)).toEqual(['mine', 'order']);
      expect(groups.available.map((item) => item.item.id)).toEqual(['available']);
      expect(groups.waiting.map((item) => item.item.id)).toEqual(['waiting']);
      const cook = { ...owner, member: { ...owner.member, role: 'member' as const, workRole: 'cook' } };
      const courier = { ...owner, member: { ...owner.member, role: 'member' as const, workRole: 'courier' } };
      expect((await readInboxSource(db, cook)).orders[0].data).not.toHaveProperty('total');
      expect((await readInboxSource(db, courier)).orders).toEqual([]);
      await db.execute("UPDATE records SET data='{\"lines\":[{\"title\":\"Soup\",\"status\":\"ready\"}]}' WHERE id='order'");
      expect((await readInboxSource(db, cook)).orders).toEqual([]);
      expect((await buildSpaceView(db, cook, decision)).sections.flatMap((section) => section.cards).some((card) => card.id === 'orders')).toBe(false);
    } finally { db.close(); }
  });
});
