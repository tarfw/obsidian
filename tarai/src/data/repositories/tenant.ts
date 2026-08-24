import type { Client, InValue } from '@libsql/client';
import { executeQuery } from '../turso.ts';

export type TenantTable = 'matter' | 'motion' | 'graph' | 'inbox';

export interface TenantRow {
  id: string;
  type: string;
  data: Record<string, unknown>;
  state?: string;
  ref?: string | null;
  actor?: string;
  space?: string;
  created: number;
  updated?: number;
}

interface RawRow extends Record<string, unknown> {
  id: string;
  type: string;
  data: string;
  state?: string;
  ref?: string | null;
  actor?: string;
  space?: string;
  created: number;
  updated?: number;
  source?: string;
  target?: string;
  kind?: string;
}

function present(row: RawRow): TenantRow {
  const data = JSON.parse(row.data) as Record<string, unknown>;
  if (row.source) Object.assign(data, { source: row.source, target: row.target, kind: row.kind });
  return { ...row, type: row.type || row.kind || 'link', data };
}

export class TenantRepository {
  constructor(private readonly client: Client) {}

  async list(table: TenantTable, filter: { id?: string; type?: string; space?: string; ref?: string } = {}): Promise<TenantRow[]> {
    const where: string[] = [];
    const args: InValue[] = [];
    if (filter.id) { where.push('id = ?'); args.push(filter.id); }
    if (filter.type) { where.push('type = ?'); args.push(filter.type); }
    if (filter.ref && (table === 'motion' || table === 'inbox')) { where.push('ref = ?'); args.push(filter.ref); }
    if (filter.space && table === 'inbox') { where.push('space = ?'); args.push(filter.space); }
    const rows = await executeQuery<RawRow>(
      this.client,
      `SELECT *${table === 'graph' ? ', kind AS type' : ''} FROM ${table}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY created DESC LIMIT 200`,
      args,
    );
    return rows.map(present);
  }

  async create(table: Exclude<TenantTable, 'graph'>, input: {
    id: string; type: string; data: Record<string, unknown>; actor: string; ref?: string; space?: string;
  }): Promise<TenantRow> {
    const now = Math.floor(Date.now() / 1000);
    if (table === 'motion') {
      await this.client.execute({
        sql: 'INSERT INTO motion (id, type, actor, ref, data, created) VALUES (?, ?, ?, ?, ?, ?)',
        args: [input.id, input.type, input.actor, input.ref || null, JSON.stringify(input.data), now],
      });
    } else if (table === 'inbox') {
      await this.client.execute({
        sql: "INSERT INTO inbox (id, space, type, ref, data, state, created, updated) VALUES (?, ?, ?, ?, ?, 'unread', ?, ?)",
        args: [input.id, input.space || '', input.type, input.ref || null, JSON.stringify(input.data), now, now],
      });
    } else {
      await this.client.execute({
        sql: "INSERT INTO matter (id, type, data, state, created, updated) VALUES (?, ?, ?, 'active', ?, ?)",
        args: [input.id, input.type, JSON.stringify(input.data), now, now],
      });
    }
    const [row] = await this.list(table, { id: input.id });
    return row;
  }

  async link(input: { id: string; source: string; target: string; kind: string; data?: Record<string, unknown> }): Promise<Record<string, unknown>> {
    const now = Math.floor(Date.now() / 1000);
    await this.client.execute({
      sql: `INSERT INTO graph (id,source,target,kind,data,created,updated) VALUES (?,?,?,?,?,?,?)`,
      args: [input.id, input.source, input.target, input.kind, JSON.stringify(input.data || {}), now, now],
    });
    return { ...input, data: input.data || {}, created: now, updated: now };
  }

  async update(table: 'matter' | 'inbox', id: string, patch: Record<string, unknown>): Promise<TenantRow | null> {
    const [current] = await this.list(table, { id });
    if (!current) return null;
    const state = typeof patch.state === 'string' ? patch.state : typeof patch.status === 'string' ? patch.status : current.state;
    const nested = typeof patch.data === 'object' && patch.data ? patch.data as Record<string, unknown> : {};
    const data = { ...current.data, ...nested, ...patch };
    delete data.state;
    delete data.data;
    const now = Math.floor(Date.now() / 1000);
    await this.client.execute({
      sql: `UPDATE ${table} SET data = ?, state = ?, updated = ? WHERE id = ?`,
      args: [JSON.stringify(data), state || 'active', now, id],
    });
    const [updated] = await this.list(table, { id });
    return updated || null;
  }
}
