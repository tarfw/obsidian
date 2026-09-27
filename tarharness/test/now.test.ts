import { createClient } from '@libsql/client';
import { describe, expect, it } from 'vitest';
import { WORKSPACE_SCHEMA } from '../src/db/schema.ts';
import { authorityKey, ensureNowSchema, projectNow, readNow, replaceSource, retractMissing } from '../src/inbox/now.ts';
import { readInboxSource } from '../src/space/view.ts';
import type { AccessContext } from '../src/types.ts';

const base: AccessContext = {
  identity: { id: 'person', email: 'person@example.com', name: 'Person' },
  workspace: { id: 'work', slug: 'work', name: 'Kitchen', mode: 'work', databaseName: 'work', databaseHost: 'work', state: 'active' },
  member: { workspaceId: 'work', userId: 'person', role: 'member', workRole: 'chef', roles: ['chef'], state: 'active' },
};

async function database() {
  const db = createClient({ url: 'file::memory:' });
  for (const sql of WORKSPACE_SCHEMA) await db.execute(sql);
  return db;
}

describe('Now projection', () => {
  it('keeps every kitchen line with quantity and ready status', async () => {
    const db = await database();
    try {
      await db.execute({ sql: `INSERT INTO records(id,type,title,state,data,owner,version,created,updated)
        VALUES ('order','pos.order','Order','open',?,'person',2,0,10)`, args: [JSON.stringify({ submitted: true, approval: 'accepted',
        lines: [{ productId: 'one', title: 'Chicken', quantity: 2, status: 'preparing' },
          { productId: 'two', title: 'Rice', quantity: 1, status: 'pending' },
          { productId: 'three', title: 'Salad', quantity: 1, status: 'ready' }] })] });
      const source = await readInboxSource(db, base);
      const rows = projectNow(source, 'person');
      expect(rows.map((row) => [row.title, row.quantity, row.kind, row.state])).toEqual([
        ['Chicken', 2, 'action', 'preparing'], ['Rice', 1, 'action', 'pending'], ['Salad', 1, 'status', 'ready'],
      ]);
      expect(rows[0].input).toMatchObject({ orderId: 'order', version: 2, productId: 'one', status: 'ready' });
      const personal = createClient({ url: 'file::memory:' });
      try {
        await ensureNowSchema(personal);
        await replaceSource(personal, 'work', rows, authorityKey(base));
        await replaceSource(personal, 'work', rows, authorityKey(base));
        const feed = await readNow(personal, [base]);
        expect(feed.rows).toHaveLength(3);
        expect(feed.rows[0]).not.toHaveProperty('data');
        expect(feed.rows.map((row) => row.title)).toEqual(['Chicken', 'Rice', 'Salad']);
        expect((await readNow(personal, [{ ...base, member: { ...base.member, workRole: 'cashier', roles: ['cashier'] } }])).rows).toEqual([]);
        await replaceSource(personal, 'work', rows.slice(0, 1), authorityKey(base));
        expect((await readNow(personal, [base])).rows).toHaveLength(1);
        expect((await readNow(personal, [])).rows).toEqual([]);
        await retractMissing(personal, new Set());
        expect((await personal.execute('SELECT id FROM inbox')).rows).toHaveLength(0);
      } finally { personal.close(); }
    } finally { db.close(); }
  });

  it('shows a courier future dependency without a finished step or private destination', async () => {
    const db = await database();
    try {
      await db.execute({ sql: `INSERT INTO records(id,type,title,state,data,owner,version,created,updated)
        VALUES ('delivery','pos.order','Delivery','open',?,'person',1,0,0)`, args: [JSON.stringify({ submitted: true, approval: 'accepted',
        orderType: 'delivery', delivery: 'reached', courier: 'person', destination: 'Private address',
        lines: [{ productId: 'one', title: 'Soup', quantity: 1, status: 'pending' }] })] });
      const courier = { ...base, member: { ...base.member, workRole: 'courier', roles: ['courier'] } };
      const rows = projectNow(await readInboxSource(db, courier), 'person');
      expect(rows.map((row) => row.title)).toEqual(['Collect order #LIVERY', 'Deliver order #LIVERY']);
      expect(rows.every((row) => row.lane === 'waiting')).toBe(true);
      expect(rows.every((row) => !JSON.stringify(row).includes('Private address'))).toBe(true);
    } finally { db.close(); }
  });

  it('shows one owner decision for accept or reject', async () => {
    const db = await database();
    try {
      await db.execute({ sql: `INSERT INTO records(id,type,title,state,data,owner,version,created,updated)
        VALUES ('order','pos.order','Order','open',?,'person',1,0,0)`, args: [JSON.stringify({ submitted: true,
        approval: 'pending', lines: [{ productId: 'one', title: 'Soup', quantity: 1, status: 'pending' }] })] });
      const owner = { ...base, member: { ...base.member, role: 'owner' as const } };
      const rows = projectNow(await readInboxSource(db, owner), 'person');
      expect(rows).toEqual([expect.objectContaining({ title: 'Review order #ORDER', action: 'pos.order.accept' })]);
    } finally { db.close(); }
  });

  it('includes an active Flow Book without copying its saved context', async () => {
    const db = await database();
    try {
      await db.execute("INSERT INTO definitions(id,kind,name,version,state,data,created_at,updated_at) VALUES ('book','flow','Close register',1,'published','{}',0,0)");
      await db.execute("INSERT INTO runs(id,flow_id,flow_version,occurrence,state,context,version,created_at,updated_at) VALUES ('run','book',1,'once','ready','{\"startedBy\":\"person\",\"step\":2,\"secret\":\"private\"}',1,0,10)");
      const rows = projectNow(await readInboxSource(db, base), 'person');
      expect(rows).toEqual([expect.objectContaining({ kind: 'flow', title: 'Close register', state: 'STEP 3', action: 'flow.start' })]);
      expect(JSON.stringify(rows)).not.toContain('private');
    } finally { db.close(); }
  });

  it('projects source-owned commerce steps and waiting payment status', async () => {
    const db = await database();
    const owner = { ...base, member: { ...base.member, role: 'owner' as const } };
    try {
      for (const [id, type, state, data] of [
        ['purchase', 'purchase', 'partial', { lines: [{ variant: 'flour', title: 'Flour', quantity: 12, received: 5 }] }],
        ['order', 'order', 'fulfilled', {}],
        ['invoice', 'invoice', 'issued', { dueAt: 1000, total: 500 }],
      ] as const) await db.execute({ sql: 'INSERT INTO records(id,type,title,state,data,owner,version,created,updated) VALUES (?,?,?,?,?,\'person\',1,0,0)',
        args: [id, type, id, state, JSON.stringify(data)] });
      const rows = projectNow(await readInboxSource(db, owner), 'person');
      expect(rows).toEqual(expect.arrayContaining([
        expect.objectContaining({ title: 'Receive Flour', quantity: 7, action: 'purchase.receive' }),
        expect.objectContaining({ title: 'Issue invoice for order', action: 'invoice.issue' }),
        expect.objectContaining({ title: 'Payment for invoice', kind: 'status', lane: 'waiting', due: 1000 }),
      ]));
      expect(rows.find((row) => row.action === 'purchase.receive')?.input).toEqual({ purchase: 'purchase', version: 1,
        lines: [{ variant: 'flour', quantity: 7 }] });
    } finally { db.close(); }
  });
});
