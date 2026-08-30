import type { VerifiedIdentity } from '../domain/auth.ts';
import type { Role } from '../domain/types.ts';
import type { AgentRate, AgentRun, ControlMember, ControlSpace, ControlUser, MemberRoute, Service, Wallet } from './types.ts';
import { ControlError } from './types.ts';

const TRIAL_CREDITS = 0;
const WORKSPACE_CREDITS = 100;
const SITE_CREDITS = 50;

function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

function nextMonth(timestamp: number): number {
  const date = new Date(timestamp * 1000);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return Math.floor(date.getTime() / 1000);
}

function databaseError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('funds')) throw new ControlError('funds', 'Not enough credits');
  if (message.includes('budget')) throw new ControlError('budget', 'Member credit budget exceeded');
  if (message.includes('access')) throw new ControlError('access', 'Workspace access denied');
  if (message.includes('UNIQUE')) throw new ControlError('conflict', 'The record already exists');
  throw error;
}

export class ControlRepository {
  constructor(private readonly db: D1Database) {}

  async bootstrapUser(identity: VerifiedIdentity, name = '', region = 'apac'): Promise<ControlUser> {
    const now = unixNow();
    const wallet = `wal_${identity.userId}`;
    try {
      const statements = [
        this.db.prepare(
          `INSERT INTO users (id, email, name, region, state, created, updated)
           VALUES (?, ?, ?, ?, 'provisioning', ?, ?)
           ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = CASE WHEN excluded.name = '' THEN users.name ELSE excluded.name END, updated = excluded.updated`,
        ).bind(identity.userId, identity.email, name, region, now, now),
        this.db.prepare(
          `INSERT INTO wallets (id, user, balance, created, updated) VALUES (?, ?, 0, ?, ?)
           ON CONFLICT(user) DO NOTHING`,
        ).bind(wallet, identity.userId, now, now),
      ];
      if (TRIAL_CREDITS > 0) {
        statements.push(this.db.prepare(
          `INSERT INTO ledger (id, wallet, amount, kind, ref, idem, meta, created)
           VALUES (?, ?, ?, 'trial', ?, ?, '{}', ?)
           ON CONFLICT(idem) DO NOTHING`,
        ).bind(`led_${crypto.randomUUID()}`, wallet, TRIAL_CREDITS, identity.userId, `trial:${identity.userId}`, now));
      }
      await this.db.batch(statements);
    } catch (error) {
      databaseError(error);
    }
    const user = await this.getUser(identity.userId);
    if (!user) throw new ControlError('missing', 'User bootstrap failed');
    return user;
  }

  getUser(id: string): Promise<ControlUser | null> {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<ControlUser>();
  }

  getUserByEmail(email: string): Promise<ControlUser | null> {
    return this.db.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first<ControlUser>();
  }

  getWallet(user: string): Promise<Wallet | null> {
    return this.db.prepare('SELECT * FROM wallets WHERE user = ?').bind(user).first<Wallet>();
  }

  async listSpaces(user: string): Promise<ControlSpace[]> {
    const result = await this.db.prepare(
      `SELECT s.*, m.role FROM spaces s
       INNER JOIN members m ON m.space = s.id
       WHERE m.user = ? AND m.state = 'active'
       ORDER BY s.created ASC`,
    ).bind(user).all<ControlSpace>();
    return result.results;
  }

  async retireOwnedSpace(space: string, owner: string): Promise<boolean> {
    const target = await this.getSpace(space);
    if (!target) throw new ControlError('missing', 'Workspace not found');
    if (target.owner !== owner) throw new ControlError('access', 'Only the workspace owner can remove it');
    const now = unixNow();
    const result = await this.db.batch([
      this.db.prepare(`UPDATE spaces SET state = 'archived', updated = ? WHERE id = ? AND owner = ? AND state != 'archived'`).bind(now, space, owner),
      this.db.prepare(`UPDATE members SET state = 'revoked', updated = ? WHERE space = ? AND state = 'active'`).bind(now, space),
      this.db.prepare(`UPDATE services SET state = 'ended', updated = ? WHERE space = ? AND state != 'ended'`).bind(now, space),
    ]);
    return result[0].meta.changes === 1;
  }

  getSpaceBySlug(slug: string): Promise<ControlSpace | null> {
    return this.db.prepare('SELECT * FROM spaces WHERE slug = ?').bind(slug.toLowerCase()).first<ControlSpace>();
  }

  getSpace(id: string): Promise<ControlSpace | null> {
    return this.db.prepare('SELECT * FROM spaces WHERE id = ?').bind(id).first<ControlSpace>();
  }

  getMember(user: string, space: string): Promise<ControlMember | null> {
    return this.db.prepare('SELECT * FROM members WHERE user = ? AND space = ?').bind(user, space).first<ControlMember>();
  }

  async listMemberRoutes(space: string): Promise<MemberRoute[]> {
    const result = await this.db.prepare(
      `SELECT m.user, m.role, u.db, u.host, u.region, u.state
       FROM members m INNER JOIN users u ON u.id = m.user
       WHERE m.space = ? AND m.state = 'active'`,
    ).bind(space).all<MemberRoute>();
    return result.results;
  }

  async listMembers(space: string): Promise<ControlMember[]> {
    const result = await this.db.prepare(
      `SELECT * FROM members WHERE space = ? ORDER BY created`,
    ).bind(space).all<ControlMember>();
    return result.results;
  }

  async addMember(input: { space: string; actor: string; email: string; role: 'admin' | 'member' | 'guest'; budget: number }): Promise<ControlMember> {
    const actorRole = await this.getOwnerRole(input.actor, input.space);
    if (actorRole !== 'owner' && actorRole !== 'admin') throw new ControlError('access', 'Only owners and admins can add members');
    if (!Number.isInteger(input.budget) || input.budget < 0) throw new ControlError('conflict', 'Budget must be a non-negative integer');
    const user = await this.getUserByEmail(input.email);
    if (!user || user.state !== 'active') throw new ControlError('missing', 'The user must join Tar before being added');
    const now = unixNow();
    const id = `mem_${crypto.randomUUID()}`;
    try {
      await this.db.prepare(
        `INSERT INTO members (id,space,user,role,state,budget,spent,reset,created,updated)
         VALUES (?,?,?,?,'active',?,0,?,?,?)
         ON CONFLICT(space,user) DO UPDATE SET role=excluded.role,state='active',budget=excluded.budget,updated=excluded.updated`,
      ).bind(id, input.space, user.id, input.role, input.budget, nextMonth(now), now, now).run();
    } catch (error) {
      databaseError(error);
    }
    const member = await this.getMember(user.id, input.space);
    if (!member) throw new ControlError('missing', 'Member creation failed');
    return member;
  }

  async createSpace(input: { id: string; owner: string; slug: string; name: string; region: string; idem: string }): Promise<ControlSpace> {
    const now = unixNow();
    const renewal = nextMonth(now);
    const wallet = `wal_${input.owner}`;
    try {
      await this.db.batch([
        this.db.prepare(
          `INSERT INTO ledger (id, wallet, amount, kind, ref, idem, meta, created)
           VALUES (?, ?, ?, 'workspace', ?, ?, '{}', ?)`,
        ).bind(`led_${crypto.randomUUID()}`, wallet, -WORKSPACE_CREDITS, input.id, `workspace:${input.idem}`, now),
        this.db.prepare(
          `INSERT INTO spaces (id, owner, slug, name, region, workspace_number, state, created, updated)
           SELECT ?, ?, ?, ?, ?, COALESCE(MAX(workspace_number), 0) + 1, 'provisioning', ?, ?
           FROM spaces WHERE owner = ?`,
        ).bind(input.id, input.owner, input.slug.toLowerCase(), input.name, input.region, now, now, input.owner),
        this.db.prepare(
          `INSERT INTO members (id, space, user, role, state, budget, spent, reset, created, updated)
           VALUES (?, ?, ?, 'owner', 'active', 0, 0, ?, ?, ?)`,
        ).bind(`mem_${crypto.randomUUID()}`, input.id, input.owner, renewal, now, now),
        this.db.prepare(
          `INSERT INTO services (id, user, space, kind, credits, state, renewal, created, updated)
           VALUES (?, ?, ?, 'workspace', ?, 'active', ?, ?, ?)`,
        ).bind(`svc_${crypto.randomUUID()}`, input.owner, input.id, WORKSPACE_CREDITS, renewal, now, now),
      ]);
    } catch (error) {
      databaseError(error);
    }
    const space = await this.getSpace(input.id);
    if (!space) throw new ControlError('missing', 'Workspace creation failed');
    return space;
  }

  async getSpaceByCreateIdem(idem: string): Promise<ControlSpace | null> {
    return this.db.prepare(
      `SELECT s.* FROM spaces s INNER JOIN ledger l ON l.ref = s.id
       WHERE l.idem = ? AND l.kind = 'workspace'`,
    ).bind(`workspace:${idem}`).first<ControlSpace>();
  }

  async activateUser(user: string, route: { db: string; host: string; schema: number }): Promise<void> {
    const result = await this.db.prepare(
      `UPDATE users SET db = ?, host = ?, schema = ?, state = 'active', updated = ? WHERE id = ?`,
    ).bind(route.db, route.host, route.schema, unixNow(), user).run();
    if (result.meta.changes !== 1) throw new ControlError('missing', 'User not found');
  }

  async activateSpace(space: string, route: { db: string; host: string; schema: number }): Promise<void> {
    const result = await this.db.prepare(
      `UPDATE spaces SET db = ?, host = ?, schema = ?, state = 'active', updated = ? WHERE id = ?`,
    ).bind(route.db, route.host, route.schema, unixNow(), space).run();
    if (result.meta.changes !== 1) throw new ControlError('missing', 'Workspace not found');
  }

  async failUser(user: string): Promise<void> {
    await this.db.prepare(`UPDATE users SET state = 'error', updated = ? WHERE id = ? AND state = 'provisioning'`).bind(unixNow(), user).run();
  }

  async failSpace(space: string, reason: string): Promise<void> {
    const current = await this.getSpace(space);
    if (!current) return;
    const now = unixNow();
    await this.db.batch([
      this.db.prepare(`UPDATE spaces SET state = 'error', updated = ? WHERE id = ?`).bind(now, space),
      this.db.prepare(`UPDATE services SET state = 'ended', updated = ? WHERE space = ? AND kind = 'workspace'`).bind(now, space),
      this.db.prepare(
        `INSERT INTO ledger (id, wallet, amount, kind, ref, idem, meta, created)
         VALUES (?, ?, ?, 'refund', ?, ?, json_object('reason', ?), ?)
         ON CONFLICT(idem) DO NOTHING`,
      ).bind(`led_${crypto.randomUUID()}`, `wal_${current.owner}`, WORKSPACE_CREDITS, space, `refund:workspace:${space}`, reason, now),
    ]);
  }

  async setMemberBudget(space: string, member: string, budget: number): Promise<void> {
    if (!Number.isInteger(budget) || budget < 0) throw new ControlError('conflict', 'Budget must be a non-negative integer');
    const result = await this.db.prepare(
      'UPDATE members SET budget = ?, updated = ? WHERE id = ? AND space = ?',
    ).bind(budget, unixNow(), member, space).run();
    if (result.meta.changes !== 1) throw new ControlError('missing', 'Member not found');
  }

  getService(space: string, kind: 'workspace' | 'site'): Promise<Service | null> {
    return this.db.prepare('SELECT * FROM services WHERE space = ? AND kind = ?').bind(space, kind).first<Service>();
  }

  async activateSite(space: string, actor: string, idem: string): Promise<Service> {
    const current = await this.getService(space, 'site');
    if (current?.state === 'active' || current?.state === 'grace') return current;
    const target = await this.getSpace(space);
    if (!target) throw new ControlError('missing', 'Workspace not found');
    const role = await this.getOwnerRole(actor, space);
    if (role !== 'owner' && role !== 'admin') throw new ControlError('access', 'Only owners and admins can activate a site');
    const wallet = await this.getWallet(target.owner);
    if (!wallet) throw new ControlError('missing', 'Workspace wallet not found');
    const now = unixNow();
    const renewal = nextMonth(now);
    const serviceId = current?.id || `svc_${crypto.randomUUID()}`;
    try {
      await this.db.batch([
        this.db.prepare(
          `INSERT INTO ledger (id,wallet,amount,kind,ref,idem,meta,created)
           SELECT ?, ?, ?, 'site', ?, ?, '{}', ? WHERE NOT EXISTS (SELECT 1 FROM ledger WHERE idem = ?)`,
        ).bind(`led_${crypto.randomUUID()}`, wallet.id, -SITE_CREDITS, serviceId, `site:${idem}`, now, `site:${idem}`),
        this.db.prepare(
          `INSERT INTO services (id,user,space,kind,credits,state,renewal,grace,created,updated)
           VALUES (?,?,?,'site',?,'active',?,NULL,?,?)
           ON CONFLICT(space,kind) DO UPDATE SET state='active', renewal=excluded.renewal, grace=NULL, updated=excluded.updated`,
        ).bind(serviceId, target.owner, space, SITE_CREDITS, renewal, now, now),
      ]);
    } catch (error) {
      databaseError(error);
    }
    const service = await this.getService(space, 'site');
    if (!service) throw new ControlError('missing', 'Site activation failed');
    return service;
  }

  getAgent(action: string): Promise<AgentRate | null> {
    return this.db.prepare(
      `SELECT id, name, action, credits, version FROM agents WHERE action = ? AND state = 'active'`,
    ).bind(action).first<AgentRate>();
  }

  async listAgents(): Promise<AgentRate[]> {
    const result = await this.db.prepare(
      `SELECT id, name, action, credits, version FROM agents WHERE state = 'active' ORDER BY credits, action`,
    ).all<AgentRate>();
    return result.results;
  }

  async listPacks(): Promise<Array<{ id: string; credits: number; price: number; currency: string }>> {
    const result = await this.db.prepare(
      `SELECT id, credits, price, currency FROM packs WHERE state = 'active' ORDER BY credits`,
    ).all<{ id: string; credits: number; price: number; currency: string }>();
    return result.results;
  }

  async reserveRun(input: { user: string; space?: string; action: string; idem: string }): Promise<AgentRun> {
    const existing = await this.db.prepare('SELECT * FROM runs WHERE idem = ?').bind(input.idem).first<AgentRun>();
    if (existing) return existing;
    const [agent, space] = await Promise.all([
      this.getAgent(input.action),
      input.space ? this.getSpace(input.space) : Promise.resolve(null),
    ]);
    const payer = space?.owner || input.user;
    const wallet = await this.getWallet(payer);
    if (!agent) throw new ControlError('missing', 'Agent action not found');
    if (!wallet) throw new ControlError('missing', 'Wallet not found');
    const run = `run_${crypto.randomUUID()}`;
    const now = unixNow();
    try {
      await this.db.batch([
        this.db.prepare(
          `INSERT INTO ledger (id, wallet, amount, kind, ref, idem, meta, created)
           VALUES (?, ?, ?, 'agent', ?, ?, json_object('action', ?), ?)`,
        ).bind(`led_${crypto.randomUUID()}`, wallet.id, -agent.credits, run, `agent:${input.idem}`, input.action, now),
        this.db.prepare(
          `INSERT INTO runs (id, user, space, agent, credits, state, idem, created)
           VALUES (?, ?, ?, ?, ?, 'reserved', ?, ?)`,
        ).bind(run, input.user, input.space || null, agent.id, agent.credits, input.idem, now),
      ]);
    } catch (error) {
      const raced = await this.db.prepare('SELECT * FROM runs WHERE idem = ?').bind(input.idem).first<AgentRun>();
      if (raced) return raced;
      databaseError(error);
    }
    const created = await this.db.prepare('SELECT * FROM runs WHERE id = ?').bind(run).first<AgentRun>();
    if (!created) throw new ControlError('missing', 'Agent reservation failed');
    return created;
  }

  getRun(id: string): Promise<AgentRun | null> {
    return this.db.prepare('SELECT * FROM runs WHERE id = ?').bind(id).first<AgentRun>();
  }

  async startRun(id: string): Promise<void> {
    await this.db.prepare(`UPDATE runs SET state = 'running' WHERE id = ? AND state = 'reserved'`).bind(id).run();
  }

  async finishRun(run: string, usage: { model?: string; input?: number; output?: number; cached?: number; cost?: number }): Promise<void> {
    const now = unixNow();
    const result = await this.db.prepare(
      `UPDATE runs SET state = 'done', model = ?, input = ?, output = ?, cached = ?, cost = ?, ended = ?
       WHERE id = ? AND state IN ('reserved', 'running')`,
    ).bind(usage.model || null, usage.input || 0, usage.output || 0, usage.cached || 0, usage.cost || 0, now, run).run();
    if (result.meta.changes !== 1) throw new ControlError('conflict', 'Agent run is already settled');
  }

  async refundRun(run: string, reason: string): Promise<void> {
    const current = await this.db.prepare('SELECT * FROM runs WHERE id = ?').bind(run).first<AgentRun>();
    if (!current || !['reserved', 'running', 'failed'].includes(current.state)) return;
    const space = current.space ? await this.getSpace(current.space) : null;
    const wallet = await this.getWallet(space?.owner || current.user);
    if (!wallet) throw new ControlError('missing', 'Wallet not found');
    const now = unixNow();
    await this.db.batch([
      this.db.prepare(`UPDATE runs SET state = 'refunded', ended = ? WHERE id = ? AND state IN ('reserved','running','failed')`).bind(now, run),
      this.db.prepare(
        `INSERT INTO ledger (id, wallet, amount, kind, ref, idem, meta, created)
         VALUES (?, ?, ?, 'refund', ?, ?, json_object('reason', ?), ?)
         ON CONFLICT(idem) DO NOTHING`,
      ).bind(`led_${crypto.randomUUID()}`, wallet.id, current.credits, run, `refund:agent:${run}`, reason, now),
    ]);
  }

  async listLedger(user: string, limit = 50): Promise<Record<string, unknown>[]> {
    const size = Math.min(Math.max(Math.trunc(limit), 1), 100);
    const result = await this.db.prepare(
      `SELECT l.id, l.amount, l.kind, l.ref, l.meta, l.created
       FROM ledger l INNER JOIN wallets w ON w.id = l.wallet
       WHERE w.user = ? ORDER BY l.created DESC LIMIT ?`,
    ).bind(user, size).all();
    return result.results;
  }

  async grantDevelopmentCredits(input: { user: string; credits: number; idem: string }): Promise<Wallet> {
    const wallet = await this.getWallet(input.user);
    if (!wallet) throw new ControlError('missing', 'Wallet not found');
    const credits = Math.trunc(input.credits);
    if (credits < 1 || credits > 100_000) throw new ControlError('conflict', 'Development credits must be between 1 and 100,000');
    const now = unixNow();
    try {
      await this.db.prepare(
        `INSERT INTO ledger (id, wallet, amount, kind, ref, idem, meta, created)
         VALUES (?, ?, ?, 'adjust', 'development', ?, json_object('source', 'development'), ?)
         ON CONFLICT(idem) DO NOTHING`,
      ).bind(`led_${crypto.randomUUID()}`, wallet.id, credits, `development:${input.idem}`, now).run();
    } catch (error) {
      databaseError(error);
    }
    const updated = await this.getWallet(input.user);
    if (!updated) throw new ControlError('missing', 'Wallet not found');
    return updated;
  }

  async getPack(id: string): Promise<{ id: string; credits: number; price: number; currency: string } | null> {
    return this.db.prepare(`SELECT id, credits, price, currency FROM packs WHERE id = ? AND state = 'active'`).bind(id).first();
  }

  async getPaymentByIdem(idem: string): Promise<Record<string, unknown> | null> {
    return this.db.prepare('SELECT * FROM payments WHERE idem = ?').bind(idem).first();
  }

  async getPayment(id: string): Promise<Record<string, unknown> | null> {
    return this.db.prepare(
      'SELECT id, checkout, amount, currency, credits, state FROM payments WHERE id = ?',
    ).bind(id).first();
  }

  async createPayment(input: { id: string; user: string; pack: string; checkout: string; idem: string }): Promise<Record<string, unknown>> {
    const pack = await this.getPack(input.pack);
    if (!pack) throw new ControlError('missing', 'Credit pack not found');
    const now = unixNow();
    try {
      await this.db.prepare(
        `INSERT INTO payments (id,user,pack,provider,checkout,amount,currency,credits,state,idem,created,updated)
         VALUES (?,?,?,'razorpay',?,?,?,?, 'created',?,?,?)`,
      ).bind(input.id, input.user, pack.id, input.checkout, pack.price, pack.currency, pack.credits, input.idem, now, now).run();
    } catch (error) {
      const existing = await this.getPaymentByIdem(input.idem);
      if (existing) return existing;
      databaseError(error);
    }
    const payment = await this.getPaymentByIdem(input.idem);
    if (!payment) throw new ControlError('missing', 'Payment creation failed');
    return payment;
  }

  async settlePayment(input: { checkout: string; receipt: string; amount: number; currency: string }): Promise<void> {
    const now = unixNow();
    try {
      await this.db.batch([
        this.db.prepare(
          `UPDATE payments SET receipt = ?, state = 'paid', updated = ?
           WHERE checkout = ? AND amount = ? AND currency = ? AND state IN ('created','paid')`,
        ).bind(input.receipt, now, input.checkout, input.amount, input.currency),
        this.db.prepare(
          `INSERT INTO ledger (id,wallet,amount,kind,ref,idem,meta,created)
           SELECT ?, w.id, p.credits, 'purchase', p.id, 'payment:' || p.id, '{}', ?
           FROM payments p INNER JOIN wallets w ON w.user = p.user
           WHERE p.checkout = ? AND p.receipt = ? AND p.state = 'paid'
           ON CONFLICT(idem) DO NOTHING`,
        ).bind(`led_${crypto.randomUUID()}`, now, input.checkout, input.receipt),
      ]);
    } catch (error) {
      databaseError(error);
    }
    const paid = await this.db.prepare(
      `SELECT id FROM payments WHERE checkout = ? AND receipt = ? AND amount = ? AND currency = ? AND state = 'paid'`,
    ).bind(input.checkout, input.receipt, input.amount, input.currency).first();
    if (!paid) throw new ControlError('conflict', 'Payment details do not match the order');
  }

  async getOwnerRole(user: string, space: string): Promise<Role | null> {
    const member = await this.getMember(user, space);
    return member?.state === 'active' ? member.role : null;
  }

  async listDueServices(now = unixNow()): Promise<Array<{ id: string; renewal: number }>> {
    const result = await this.db.prepare(
      `SELECT id, renewal FROM services WHERE state IN ('active','grace') AND renewal <= ? ORDER BY renewal LIMIT 100`,
    ).bind(now).all<{ id: string; renewal: number }>();
    return result.results;
  }

  async renewService(id: string, period: number): Promise<'renewed' | 'grace' | 'stale'> {
    const service = await this.db.prepare(
      `SELECT s.*, p.owner FROM services s LEFT JOIN spaces p ON p.id = s.space WHERE s.id = ?`,
    ).bind(id).first<{ id: string; user: string; space: string | null; kind: string; credits: number; renewal: number; owner: string | null }>();
    if (!service || service.renewal !== period) return 'stale';
    const payer = service.owner || service.user;
    const wallet = await this.getWallet(payer);
    if (!wallet) throw new ControlError('missing', 'Service wallet not found');
    const now = unixNow();
    const renewal = nextMonth(period);
    try {
      await this.db.batch([
        this.db.prepare(
          `INSERT INTO ledger (id,wallet,amount,kind,ref,idem,meta,created)
           SELECT ?, ?, ?, ?, ?, ?, '{}', ? WHERE NOT EXISTS (SELECT 1 FROM ledger WHERE idem = ?)`,
        ).bind(`led_${crypto.randomUUID()}`, wallet.id, -service.credits, service.kind, service.id, `renewal:${service.id}:${period}`, now, `renewal:${service.id}:${period}`),
        this.db.prepare(
          `UPDATE services SET state = 'active', renewal = ?, grace = NULL, updated = ? WHERE id = ? AND renewal = ?`,
        ).bind(renewal, now, service.id, period),
        ...(service.space ? [this.db.prepare(`UPDATE spaces SET state = 'active', updated = ? WHERE id = ?`).bind(now, service.space)] : []),
      ]);
      return 'renewed';
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('funds')) throw error;
      const grace = now + 7 * 86400;
      await this.db.batch([
        this.db.prepare(`UPDATE services SET state = 'grace', grace = COALESCE(grace, ?), updated = ? WHERE id = ? AND renewal = ?`).bind(grace, now, service.id, period),
        ...(service.space ? [this.db.prepare(`UPDATE spaces SET state = 'grace', updated = ? WHERE id = ?`).bind(now, service.space)] : []),
      ]);
      return 'grace';
    }
  }

  async advanceLifecycle(now = unixNow()): Promise<void> {
    await this.db.prepare(
      `UPDATE spaces SET state = 'readonly', updated = ? WHERE id IN
       (SELECT space FROM services WHERE state = 'grace' AND grace IS NOT NULL AND grace <= ?)`,
    ).bind(now, now).run();
  }

  async listArchiveCandidates(now = unixNow()): Promise<ControlSpace[]> {
    const result = await this.db.prepare(
      `SELECT * FROM spaces WHERE state = 'readonly' AND updated <= ? ORDER BY updated LIMIT 20`,
    ).bind(now - 30 * 86400).all<ControlSpace>();
    return result.results;
  }

  async markArchiving(space: string): Promise<boolean> {
    const now = unixNow();
    const result = await this.db.prepare(
      `UPDATE spaces SET state = 'archived', updated = ? WHERE id = ? AND state = 'readonly'`,
    ).bind(now, space).run();
    if (result.meta.changes === 1) {
      await this.db.prepare(
        `UPDATE services SET state = 'ended', updated = ? WHERE space = ? AND kind = 'workspace'`,
      ).bind(now, space).run();
    }
    return result.meta.changes === 1;
  }

  async releaseArchive(space: string): Promise<void> {
    const now = unixNow();
    await this.db.batch([
      this.db.prepare(`UPDATE spaces SET state = 'readonly', updated = ? WHERE id = ? AND state = 'archived'`).bind(now, space),
      this.db.prepare(`UPDATE services SET state = 'grace', updated = ? WHERE space = ? AND kind = 'workspace' AND state = 'ended'`).bind(now, space),
    ]);
  }

  async markCold(space: string): Promise<void> {
    await this.db.prepare(
      `UPDATE spaces SET host = NULL, state = 'cold', updated = ? WHERE id = ? AND state = 'archived'`,
    ).bind(unixNow(), space).run();
  }

  async markRestoring(space: string): Promise<boolean> {
    const result = await this.db.prepare(
      `UPDATE spaces SET state = 'restoring', updated = ? WHERE id = ? AND state = 'cold'`,
    ).bind(unixNow(), space).run();
    return result.meta.changes === 1;
  }

  async beginRestore(space: string, actor: string, idem: string): Promise<boolean> {
    const target = await this.getSpace(space);
    if (!target) throw new ControlError('missing', 'Workspace not found');
    if (target.owner !== actor) throw new ControlError('access', 'Only the owner can restore this workspace');
    if (target.state === 'restoring') return true;
    if (target.state !== 'cold') return false;
    const wallet = await this.getWallet(target.owner);
    const service = await this.getService(space, 'workspace');
    if (!wallet || !service) throw new ControlError('missing', 'Workspace billing record not found');
    const now = unixNow();
    try {
      await this.db.batch([
        this.db.prepare(
          `INSERT INTO ledger (id,wallet,amount,kind,ref,idem,meta,created)
           SELECT ?, ?, ?, 'workspace', ?, ?, '{}', ? WHERE NOT EXISTS (SELECT 1 FROM ledger WHERE idem = ?)`,
        ).bind(`led_${crypto.randomUUID()}`, wallet.id, -WORKSPACE_CREDITS, space, `restore:${idem}`, now, `restore:${idem}`),
        this.db.prepare(`UPDATE services SET state='active',renewal=?,grace=NULL,updated=? WHERE id=?`).bind(nextMonth(now), now, service.id),
        this.db.prepare(`UPDATE spaces SET state='restoring',updated=? WHERE id=? AND state='cold'`).bind(now, space),
      ]);
    } catch (error) {
      databaseError(error);
    }
    return true;
  }

  async failRestore(space: string, reason: string): Promise<void> {
    const target = await this.getSpace(space);
    if (!target || target.state !== 'restoring') return;
    const service = await this.getService(space, 'workspace');
    const wallet = await this.getWallet(target.owner);
    if (!service || !wallet) return;
    const debit = await this.db.prepare(
      `SELECT amount, idem FROM ledger WHERE ref = ? AND kind = 'workspace' AND idem LIKE 'restore:%' ORDER BY created DESC LIMIT 1`,
    ).bind(space).first<{ amount: number; idem: string }>();
    const now = unixNow();
    const statements = [
      this.db.prepare(`UPDATE spaces SET state='cold',updated=? WHERE id=? AND state='restoring'`).bind(now, space),
      this.db.prepare(`UPDATE services SET state='ended',updated=? WHERE id=?`).bind(now, service.id),
    ];
    if (debit?.amount && debit.amount < 0) {
      statements.push(this.db.prepare(
        `INSERT INTO ledger (id,wallet,amount,kind,ref,idem,meta,created)
         VALUES (?,?,?,?,?,?,json_object('reason',?),?) ON CONFLICT(idem) DO NOTHING`,
      ).bind(`led_${crypto.randomUUID()}`, wallet.id, -debit.amount, 'refund', space, `refund:${debit.idem}`, reason, now));
    }
    await this.db.batch(statements);
  }

  async takeExpiredRuns(cutoff: number, limit = 500): Promise<Record<string, unknown>[]> {
    const result = await this.db.prepare(
      `SELECT * FROM runs WHERE ended IS NOT NULL AND ended < ? ORDER BY ended LIMIT ?`,
    ).bind(cutoff, limit).all();
    return result.results;
  }

  async deleteRuns(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const statements = ids.map((id) => this.db.prepare('DELETE FROM runs WHERE id = ?').bind(id));
    await this.db.batch(statements);
  }

  async sizeBytes(): Promise<number> {
    const [pages, size] = await Promise.all([
      this.db.prepare('PRAGMA page_count').first<Record<string, number>>(),
      this.db.prepare('PRAGMA page_size').first<Record<string, number>>(),
    ]);
    return Number(Object.values(pages || {})[0] || 0) * Number(Object.values(size || {})[0] || 0);
  }
}
