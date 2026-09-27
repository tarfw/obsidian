import { createClient } from '@libsql/client';
import { describe, expect, it } from 'vitest';
import { WORKSPACE_SCHEMA } from '../src/db/schema.ts';
import { buildSpaceView, readInboxSource } from '../src/space/view.ts';
import { projectNow } from '../src/inbox/now.ts';
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

  it('does not present one overlapping context before the person chooses', async () => {
    const db = await database();
    try {
      await task(db, 'mine', 'open', 'user');
      const overlap = resolveContext([owner], [
        { id: 'one', workspace: owner.workspace.slug, label: 'One', start: '09:00', end: '12:00' },
        { id: 'two', workspace: owner.workspace.slug, label: 'Two', start: '09:00', end: '12:00' },
      ], { at: Date.parse('2026-09-25T09:30:00Z'), zone: 'UTC' });
      expect(overlap.decision).toBe('confirm');
      expect((await buildSpaceView(db, owner, overlap)).sections).toEqual([]);
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
      await db.execute("INSERT INTO records(id,type,title,state,data,owner,version,created,updated) VALUES ('order','pos.order','Order','open','{\"submitted\":true,\"approval\":\"accepted\",\"total\":500,\"lines\":[{\"title\":\"Soup\",\"quantity\":1,\"status\":\"pending\"}]}','user',1,0,0)");
      const source = await readInboxSource(db, owner);
      const rows = projectNow(source, 'user');
      expect(rows.filter((item) => item.lane === 'mine').map((item) => item.target)).toEqual(['mine']);
      expect(rows.filter((item) => item.lane === 'available').map((item) => item.target)).toEqual(['available']);
      expect(rows.filter((item) => item.lane === 'waiting').map((item) => item.target)).toEqual(['waiting']);
      const cook = { ...owner, member: { ...owner.member, role: 'member' as const, workRole: 'cook' } };
      const courier = { ...owner, member: { ...owner.member, role: 'member' as const, workRole: 'courier' } };
      expect((await readInboxSource(db, cook)).orders[0].data).not.toHaveProperty('total');
      expect((await readInboxSource(db, courier)).orders).toEqual([]);
      await db.execute("UPDATE records SET data='{\"submitted\":true,\"approval\":\"accepted\",\"lines\":[{\"title\":\"Soup\",\"status\":\"ready\"}]}' WHERE id='order'");
      expect((await readInboxSource(db, cook)).orders[0].data.lines).toEqual([expect.objectContaining({ title: 'Soup', status: 'ready' })]);
      expect((await buildSpaceView(db, cook, decision)).sections.flatMap((section) => section.cards).some((card) => card.id === 'orders')).toBe(false);
    } finally { db.close(); }
  });

  it('projects a single workspace as chef then cashier using only granted routine roles', async () => {
    const db = await database();
    try {
      await db.execute("INSERT INTO records(id,type,title,state,data,owner,version,created,updated) VALUES ('order','pos.order','Order','open','{\"submitted\":true,\"approval\":\"accepted\",\"total\":500,\"lines\":[{\"title\":\"Soup\",\"quantity\":1,\"status\":\"pending\"}]}','user',1,0,0)");
      const member = { ...owner, member: { ...owner.member, role: 'member' as const, workRole: 'chef', roles: ['chef', 'cashier'] } } as AccessContext;
      const routines = [
        { id: 'kitchen', workspace: owner.workspace.slug, label: 'Kitchen', role: 'Chef', start: '09:00', end: '12:00' },
        { id: 'counter', workspace: owner.workspace.slug, label: 'Counter', role: 'Cashier', start: '12:00', end: '15:00' },
      ];
      const chef = await buildSpaceView(db, member, resolveContext([member], routines, { at: Date.parse('2026-09-25T10:00:00Z'), zone: 'UTC' }));
      const cashier = await buildSpaceView(db, member, resolveContext([member], routines, { at: Date.parse('2026-09-25T13:00:00Z'), zone: 'UTC' }));
      const heldCashier = await buildSpaceView(db, member, resolveContext([member], routines, { at: 0, zone: 'UTC', override: 'personal', role: 'Cashier', held: true }));
      expect(chef.sections.find((section) => section.id === 'actions')?.cards[0]).toMatchObject({ title: 'Prepare Soup' });
      expect(cashier.sections.find((section) => section.id === 'actions')?.cards[0]).toMatchObject({ title: 'Review open orders' });
      expect(heldCashier.sections.find((section) => section.id === 'actions')?.cards[0]).toMatchObject({ title: 'Review open orders' });
      const inbox = await readInboxSource(db, member);
      expect(inbox.orders).toHaveLength(2);
      expect(inbox.orders.find((order) => order.data.projectionRole === 'cashier')?.data.total).toBe(500);
      expect(inbox.orders.find((order) => order.data.projectionRole === 'chef')?.data).not.toHaveProperty('total');
      expect(projectNow(inbox, 'user').map((row) => row.role)).toEqual(['chef', 'cashier']);
    } finally { db.close(); }
  });

  it('shows only safe courier handoff facts and never leaks another courier assignment', async () => {
    const db = await database();
    try {
      await db.execute("INSERT INTO records(id,type,title,state,data,owner,version,created,updated) VALUES ('delivery','pos.order','Delivery','open','{\"submitted\":true,\"approval\":\"accepted\",\"orderType\":\"delivery\",\"delivery\":\"unassigned\",\"location\":\"Restaurant\",\"destination\":\"Private address\",\"customerName\":\"Secret\",\"total\":500,\"lines\":[{\"title\":\"Soup\",\"quantity\":1,\"status\":\"pending\"}]}','user',1,0,0)");
      const courier = { ...owner, member: { ...owner.member, role: 'member' as const, workRole: 'courier' } };
      const available = await readInboxSource(db, courier);
      expect(available.orders).toHaveLength(1);
      expect(available.orders[0].data).not.toHaveProperty('destination');
      expect(available.orders[0].data).not.toHaveProperty('customerName');
      expect(available.orders[0].data).not.toHaveProperty('total');
      expect(projectNow(available, 'user').filter((row) => row.lane === 'available')).toHaveLength(1);
      await db.execute("UPDATE records SET data=json_set(data,'$.delivery','reached','$.courier','user') WHERE id='delivery'");
      const claimed = await readInboxSource(db, courier);
      expect(claimed.orders[0].data.destination).toBe('Private address');
      expect(projectNow(claimed, 'user').filter((row) => row.lane === 'waiting')).toHaveLength(2);
      const other = { ...courier, identity: { ...courier.identity, id: 'other' }, member: { ...courier.member, userId: 'other' } };
      expect((await readInboxSource(db, other)).orders).toEqual([]);
    } finally { db.close(); }
  });
});
