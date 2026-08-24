import { createClient, type Client } from '@libsql/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const schema = readFileSync(`${root}d1/migrations/0001_control.sql`, 'utf8');
const catalog = readFileSync(`${root}d1/migrations/0002_catalog.sql`, 'utf8');
const pricing = readFileSync(`${root}d1/migrations/0003_credit_pricing.sql`, 'utf8');
let db: Client;

async function seedUser(id: string, credits = 100) {
  await db.batch([
    { sql: "INSERT INTO users (id,email,state,created,updated) VALUES (?,?, 'active',1,1)", args: [id, `${id}@test.invalid`] },
    { sql: 'INSERT INTO wallets (id,user,balance,created,updated) VALUES (?,?,0,1,1)', args: [`wal_${id}`, id] },
    { sql: "INSERT INTO ledger (id,wallet,amount,kind,idem,created) VALUES (?,?,?,'trial',?,1)", args: [`led_${id}`, `wal_${id}`, credits, `trial:${id}`] },
  ], 'write');
}

beforeEach(async () => {
  db = createClient({ url: 'file::memory:' });
  await db.executeMultiple(schema);
  await db.executeMultiple(catalog);
  await db.executeMultiple(pricing);
});

describe('D1 control invariants', () => {
  it('serializes concurrent debits and never makes a wallet negative', async () => {
    await seedUser('owner');
    const attempts = await Promise.allSettled([
      db.execute({ sql: "INSERT INTO ledger (id,wallet,amount,kind,idem,created) VALUES ('a','wal_owner',-60,'agent','a',2)" }),
      db.execute({ sql: "INSERT INTO ledger (id,wallet,amount,kind,idem,created) VALUES ('b','wal_owner',-60,'agent','b',2)" }),
    ]);
    expect(attempts.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    const wallet = await db.execute("SELECT balance FROM wallets WHERE id = 'wal_owner'");
    expect(Number(wallet.rows[0][0])).toBe(40);
  });

  it('makes the ledger idempotent and immutable', async () => {
    await seedUser('owner');
    await db.execute("INSERT INTO ledger (id,wallet,amount,kind,idem,created) VALUES ('buy','wal_owner',50,'purchase','pay:1',2)");
    await expect(db.execute("INSERT INTO ledger (id,wallet,amount,kind,idem,created) VALUES ('again','wal_owner',50,'purchase','pay:1',2) ON CONFLICT(idem) DO NOTHING")).resolves.toBeTruthy();
    await expect(db.execute("UPDATE ledger SET amount = 500 WHERE id = 'buy'")).rejects.toThrow(/ledger_immutable/);
    const wallet = await db.execute("SELECT balance FROM wallets WHERE id = 'wal_owner'");
    expect(Number(wallet.rows[0][0])).toBe(150);
  });

  it('enforces member budgets and restores spend after a refund', async () => {
    await seedUser('owner');
    await seedUser('member');
    await db.executeMultiple(`
      INSERT INTO spaces (id,owner,slug,name,region,state,created,updated) VALUES ('space','owner','space','Space','apac','active',1,1);
      INSERT INTO members (id,space,user,role,state,budget,spent,reset,created,updated) VALUES ('owner-member','space','owner','owner','active',0,0,10,1,1);
      INSERT INTO members (id,space,user,role,state,budget,spent,reset,created,updated) VALUES ('member-member','space','member','member','active',3,0,10,1,1);
      INSERT INTO runs (id,user,space,agent,credits,state,idem,created) VALUES ('run1','member','space','workspace-summary',2,'reserved','run:1',2);
    `);
    await expect(db.execute("INSERT INTO runs (id,user,space,agent,credits,state,idem,created) VALUES ('run2','member','space','workspace-summary',2,'reserved','run:2',3)")).rejects.toThrow(/budget/);
    await db.execute("UPDATE runs SET state = 'refunded', ended = 4 WHERE id = 'run1'");
    const member = await db.execute("SELECT spent FROM members WHERE id = 'member-member'");
    expect(Number(member.rows[0][0])).toBe(0);
  });

  it('keeps customer business content out of D1', async () => {
    const result = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table'");
    const tables = new Set(result.rows.map((row) => String(row[0])));
    for (const forbidden of ['orders', 'products', 'inbox', 'matter', 'motion', 'okf']) {
      expect(tables.has(forbidden)).toBe(false);
    }
  });

  it('settles a duplicated payment only once', async () => {
    await seedUser('buyer', 10);
    await db.execute("INSERT INTO payments (id,user,pack,provider,checkout,amount,currency,credits,state,idem,created,updated) VALUES ('payment','buyer','inr-500','razorpay','order',9900,'INR',500,'created','checkout:1',1,1)");
    const settle = () => db.batch([
      "UPDATE payments SET receipt = 'receipt', state = 'paid', updated = 2 WHERE checkout = 'order' AND amount = 9900 AND currency = 'INR' AND state IN ('created','paid')",
      "INSERT INTO ledger (id,wallet,amount,kind,ref,idem,created) SELECT lower(hex(randomblob(16))),w.id,p.credits,'purchase',p.id,'payment:' || p.id,2 FROM payments p JOIN wallets w ON w.user=p.user WHERE p.checkout='order' AND p.receipt='receipt' AND p.state='paid' ON CONFLICT(idem) DO NOTHING",
    ], 'write');
    await settle();
    await settle();
    const wallet = await db.execute("SELECT balance FROM wallets WHERE id = 'wal_buyer'");
    expect(Number(wallet.rows[0][0])).toBe(510);
  });

  it('rejects a user from another workspace', async () => {
    await seedUser('owner');
    await seedUser('outsider');
    await db.executeMultiple(`
      INSERT INTO spaces (id,owner,slug,name,region,state,created,updated) VALUES ('private','owner','private','Private','apac','active',1,1);
      INSERT INTO members (id,space,user,role,state,budget,spent,reset,created,updated) VALUES ('private-owner','private','owner','owner','active',0,0,10,1,1);
    `);
    await expect(db.execute("INSERT INTO runs (id,user,space,agent,credits,state,idem,created) VALUES ('denied','outsider','private','workspace-summary',2,'reserved','denied',2)")).rejects.toThrow(/access/);
  });

  it('matches the published credit packs and agent rates', async () => {
    const packs = await db.execute("SELECT id, credits, price, currency FROM packs WHERE state = 'active' ORDER BY price");
    expect(packs.rows.map((row) => [String(row[0]), Number(row[1]), Number(row[2]), String(row[3])])).toEqual([
      ['topup-starter-1000', 1000, 10000, 'INR'],
      ['activation-1000', 1000, 50000, 'INR'],
      ['topup-growth-5000', 5000, 50000, 'INR'],
      ['topup-scale-10000', 10000, 100000, 'INR'],
    ]);
    const rates = await db.execute('SELECT action, credits FROM agents');
    const byAction = Object.fromEntries(rates.rows.map((row) => [String(row[0]), Number(row[1])]));
    expect(byAction).toMatchObject({
      'workspace.summary': 2,
      'sales.reply': 2,
      'sales.quote': 10,
      'ops.workflow': 10,
      'analyst.report': 20,
      'site.generate': 100,
      'site.edit': 10,
      'site.publish': 5,
      'research.task': 100,
    });
  });

  it('does not update wallet balances in application code', () => {
    const controlSource = readFileSync(`${root}src/control/control.ts`, 'utf8');
    expect(controlSource).not.toMatch(/UPDATE\s+wallets\s+SET\s+balance/i);
  });
});
