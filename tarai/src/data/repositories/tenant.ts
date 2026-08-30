import type { Client, InValue, Transaction } from '@libsql/client';
import { executeQuery } from '../turso.ts';
import { hashPayload } from '../../domain/idempotency.ts';
import {
  toMatterTypeCode,
  toMotionTypeCode,
  toGraphRelCode,
  toInboxTypeCode,
  MATTER_TYPE_NAMES,
  MOTION_TYPE_NAMES,
  GRAPH_KIND_NAMES,
  INBOX_TYPE_NAMES,
  MATTER_STATE,
  REQUEST_STATUS,
  APPROVAL_STATUS,
  OUTBOX_STATUS,
  type MatterRow,
  type MotionRow,
  type GraphRow,
  type InboxRow,
  type ProjectionRow,
  type RequestRow,
  type ApprovalRow,
  type OutboxRow,
  type RoutineRow,
  type JobRow,
} from '../../domain/types.ts';

export type TenantTable = 'matter' | 'motion' | 'graph' | 'inbox' | 'projection' | 'request' | 'routine' | 'job' | 'approval' | 'outbox';

export interface PresentEntity {
  id: string;
  type: number | string;
  typeName?: string;
  data: Record<string, unknown>;
  state?: number | string;
  status?: number | string;
  version?: number;
  ref?: string | null;
  actor?: string;
  space?: string;
  workspace_id?: string | null;
  created?: number;
  updated?: number;
  created_at?: number | string;
  updated_at?: number | string;
  deleted_at?: number | null;
  source?: string;
  target?: string;
  kind?: number | string;
  title?: string;
  priority?: number;
  source_id?: string;
  source_version?: number;
  collection?: number;
  [key: string]: unknown;
}

function formatRow(table: TenantTable, row: Record<string, unknown>): PresentEntity {
  let data: Record<string, unknown> = {};
  if (typeof row.data === 'string') {
    try { data = JSON.parse(row.data); } catch { data = {}; }
  } else if (typeof row.data === 'object' && row.data !== null) {
    data = row.data as Record<string, unknown>;
  }

  let payload: Record<string, unknown> = {};
  if (typeof row.payload === 'string') {
    try { payload = JSON.parse(row.payload); } catch { payload = {}; }
  } else if (typeof row.payload === 'object' && row.payload !== null) {
    payload = row.payload as Record<string, unknown>;
  }

  const numericType = typeof row.type === 'number' ? row.type : undefined;
  let typeName = '';
  if (table === 'matter' && numericType !== undefined) typeName = MATTER_TYPE_NAMES[numericType] || String(numericType);
  else if (table === 'motion' && numericType !== undefined) typeName = MOTION_TYPE_NAMES[numericType] || String(numericType);
  else if (table === 'inbox' && numericType !== undefined) typeName = INBOX_TYPE_NAMES[numericType] || String(numericType);
  else if (table === 'graph' && typeof row.kind === 'number') typeName = GRAPH_KIND_NAMES[row.kind] || String(row.kind);

  return {
    ...data,
    id: String(row.id || row.idem || ''),
    type: (row.type as number | string) ?? (row.kind as number | string) ?? 1,
    typeName: typeName || undefined,
    data: Object.keys(data).length > 0 ? data : payload,
    state: row.state as number | string | undefined,
    status: (row.status ?? row.state) as number | string | undefined,
    version: typeof row.version === 'number' ? row.version : 1,
    ref: (row.ref as string) || null,
    actor: row.actor as string | undefined,
    created: typeof row.created === 'number' ? row.created : undefined,
    updated: typeof row.updated === 'number' ? row.updated : undefined,
    created_at: typeof row.created === 'number' ? row.created : (row.created_at as string | number),
    updated_at: typeof row.updated === 'number' ? row.updated : (row.updated_at as string | number),
    deleted_at: (row.deleted_at as number) || null,
    source: row.source as string | undefined,
    target: row.target as string | undefined,
    kind: row.kind as number | string | undefined,
    title: row.title as string | undefined,
    priority: row.priority as number | undefined,
    workspace_id: row.workspace_id as string | undefined,
    source_id: row.source_id as string | undefined,
    source_version: row.source_version as number | undefined,
    collection: row.collection as number | undefined,
  };
}

export class TenantRepository {
  constructor(private readonly client: Client | Transaction) {}

  async list(table: TenantTable, filter: {
    id?: string;
    type?: string | number;
    space?: string;
    workspace_id?: string;
    user_id?: string;
    ref?: string;
    actor?: string;
    state?: number;
    status?: number;
    limit?: number;
  } = {}): Promise<PresentEntity[]> {
    const where: string[] = ['deleted_at IS NULL'];
    const args: InValue[] = [];

    if (filter.id) {
      where.push('id = ?');
      args.push(filter.id);
    }
    if (filter.type !== undefined) {
      where.push('type = ?');
      args.push(typeof filter.type === 'number' ? filter.type : toMatterTypeCode(filter.type));
    }
    if (filter.ref && (table === 'motion' || table === 'inbox' || table === 'outbox')) {
      where.push('ref = ?');
      args.push(filter.ref);
    }
    if (filter.actor && (table === 'motion' || table === 'approval' || table === 'request')) {
      where.push('actor = ?');
      args.push(filter.actor);
    }
    if (filter.workspace_id && (table === 'inbox' || table === 'projection')) {
      where.push('workspace_id = ?');
      args.push(filter.workspace_id);
    }
    if (filter.user_id && table === 'inbox') {
      where.push('user_id = ?');
      args.push(filter.user_id);
    }
    if (filter.state !== undefined && (table === 'matter' || table === 'routine')) {
      where.push('state = ?');
      args.push(filter.state);
    }
    if (filter.status !== undefined && (table === 'inbox' || table === 'request' || table === 'approval' || table === 'outbox' || table === 'job')) {
      where.push('status = ?');
      args.push(filter.status);
    }

    const limit = filter.limit || 200;
    const orderColumn = table === 'matter' || table === 'graph' || table === 'projection' ? 'updated' : 'created';
    const sql = `SELECT * FROM ${table} WHERE ${where.join(' AND ')} ORDER BY ${orderColumn} DESC LIMIT ${limit}`;
    const rows = await executeQuery<Record<string, unknown>>(this.client, sql, args);
    return rows.map((r) => formatRow(table, r));
  }

  async findById(table: TenantTable, id: string): Promise<PresentEntity | null> {
    const rows = await executeQuery<Record<string, unknown>>(
      this.client,
      `SELECT * FROM ${table} WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id],
    );
    if (!rows || rows.length === 0) return null;
    return formatRow(table, rows[0]);
  }

  /**
   * Authoritative Idempotent Mutation Transaction (matter.md §7)
   */
  async executeIdempotentMutation<T>(options: {
    idem: string;
    actor: string;
    action: string;
    payload: unknown;
    mutate: (repository: TenantRepository) => Promise<T>;
  }): Promise<{ response: T; cached: boolean }> {
    const now = Date.now();
    const payloadHash = await hashPayload(options.payload);

    // 1. Check existing request
    const existing = await executeQuery<RequestRow>(
      this.client,
      `SELECT * FROM request WHERE idem = ? LIMIT 1`,
      [options.idem],
    );

    if (existing.length > 0) {
      const req = existing[0];
      if (req.payload_hash !== payloadHash) {
        throw new Error('Idempotency conflict: identical idempotency key provided with different payload');
      }
      if (req.status === REQUEST_STATUS.completed && req.response) {
        return { response: JSON.parse(req.response) as T, cached: true };
      }
      if (req.status === REQUEST_STATUS.processing) {
        throw new Error('Concurrent request in progress for this idempotency key');
      }
    }

    if (!('transaction' in this.client)) throw new Error('Idempotent mutations require a database client');
    const transaction = await this.client.transaction('write');
    try {
      await transaction.execute({
        sql: `INSERT INTO request (idem, actor, action, payload_hash, status, created)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [options.idem, options.actor, options.action, payloadHash, REQUEST_STATUS.processing, now],
      });
      const result = await options.mutate(new TenantRepository(transaction));

      const completedNow = Date.now();
      await transaction.execute({
        sql: `UPDATE request SET status = ?, response = ?, completed = ? WHERE idem = ?`,
        args: [REQUEST_STATUS.completed, JSON.stringify(result), completedNow, options.idem],
      });
      await transaction.commit();
      return { response: result, cached: false };
    } catch (error) {
      await transaction.rollback().catch(() => {});
      throw error;
    } finally {
      transaction.close();
    }
  }

  async createMatter(input: {
    id: string;
    type: number | string;
    data: Record<string, unknown>;
    state?: number;
  }): Promise<PresentEntity> {
    const now = Date.now();
    const typeCode = typeof input.type === 'number' ? input.type : toMatterTypeCode(input.type);
    const state = input.state !== undefined ? input.state : MATTER_STATE.active;

    await this.client.execute({
      sql: `INSERT INTO matter (id, type, data, state, version, created, updated)
            VALUES (?, ?, ?, ?, 1, ?, ?)`,
      args: [input.id, typeCode, JSON.stringify(input.data), state, now, now],
    });

    const created = await this.findById('matter', input.id);
    return created!;
  }

  async updateMatter(id: string, patch: {
    data?: Record<string, unknown>;
    state?: number | string;
    expectedVersion?: number;
  }): Promise<PresentEntity | null> {
    const current = await this.findById('matter', id);
    if (!current) return null;

    if (patch.expectedVersion !== undefined && current.version !== patch.expectedVersion) {
      throw new Error(`Version conflict: expected version ${patch.expectedVersion}, found ${current.version}`);
    }

    const nextVersion = (current.version || 1) + 1;
    const now = Date.now();
    const stateCode: InValue = patch.state !== undefined
      ? (typeof patch.state === 'number' ? patch.state : (MATTER_STATE[patch.state as keyof typeof MATTER_STATE] ?? (typeof current.state === 'number' ? current.state : MATTER_STATE.active)))
      : (typeof current.state === 'number' ? current.state : MATTER_STATE.active);

    const mergedData = { ...current.data, ...(patch.data || {}) };

    const result = await this.client.execute({
      sql: `UPDATE matter SET data = ?, state = ?, version = ?, updated = ? WHERE id = ? AND deleted_at IS NULL`,
      args: [JSON.stringify(mergedData), stateCode, nextVersion, now, id],
    });

    if (result.rowsAffected === 0) return null;
    return this.findById('matter', id);
  }

  async softDeleteMatter(id: string): Promise<boolean> {
    const now = Date.now();
    const result = await this.client.execute({
      sql: `UPDATE matter SET deleted_at = ?, state = ?, updated = ? WHERE id = ? AND deleted_at IS NULL`,
      args: [now, MATTER_STATE.inactive, now, id],
    });
    return result.rowsAffected > 0;
  }

  async appendMotion(input: {
    id: string;
    type: number | string;
    actor: string;
    ref?: string;
    data: Record<string, unknown>;
    idem?: string;
  }): Promise<PresentEntity> {
    const now = Date.now();
    const typeCode = typeof input.type === 'number' ? input.type : toMotionTypeCode(input.type);
    const payloadHash = await hashPayload(input.data);
    const idemKey = input.idem || `motion_${input.id}_${now}`;

    await this.client.execute({
      sql: `INSERT INTO motion (id, type, actor, ref, data, idem, payload_hash, created)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [input.id, typeCode, input.actor, input.ref || null, JSON.stringify(input.data), idemKey, payloadHash, now],
    });

    return formatRow('motion', {
      id: input.id,
      type: typeCode,
      actor: input.actor,
      ref: input.ref || null,
      data: JSON.stringify(input.data),
      idem: idemKey,
      payload_hash: payloadHash,
      created: now,
    });
  }

  async linkGraph(input: {
    id: string;
    source: string;
    target: string;
    kind: number | string;
    data?: Record<string, unknown>;
  }): Promise<PresentEntity> {
    const now = Date.now();
    const kindCode = typeof input.kind === 'number' ? input.kind : toGraphRelCode(input.kind);

    await this.client.execute({
      sql: `INSERT INTO graph (id, source, target, kind, data, version, created, updated)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            ON CONFLICT(source, target, kind) WHERE deleted_at IS NULL
            DO UPDATE SET data = ?, version = version + 1, updated = ?`,
      args: [input.id, input.source, input.target, kindCode, JSON.stringify(input.data || {}), now, now, JSON.stringify(input.data || {}), now],
    });

    return formatRow('graph', {
      id: input.id,
      source: input.source,
      target: input.target,
      kind: kindCode,
      data: JSON.stringify(input.data || {}),
      version: 1,
      created: now,
      updated: now,
    });
  }

  async unlinkGraph(source: string, target: string, kind: number | string): Promise<boolean> {
    const now = Date.now();
    const kindCode = typeof kind === 'number' ? kind : toGraphRelCode(kind);
    const result = await this.client.execute({
      sql: `UPDATE graph SET deleted_at = ?, updated = ? WHERE source = ? AND target = ? AND kind = ? AND deleted_at IS NULL`,
      args: [now, now, source, target, kindCode],
    });
    return result.rowsAffected > 0;
  }

  async createInboxItem(input: {
    id: string;
    userId: string;
    workspaceId?: string;
    type: number | string;
    title: string;
    ref?: string;
    priority?: number;
    status?: number;
    data?: Record<string, unknown>;
  }): Promise<PresentEntity> {
    const now = Date.now();
    const typeCode = typeof input.type === 'number' ? input.type : toInboxTypeCode(input.type);

    await this.client.execute({
      sql: `INSERT INTO inbox (id, user_id, workspace_id, type, title, ref, priority, status, data, version, created, updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            ON CONFLICT(id) DO NOTHING`,
      args: [input.id, input.userId, input.workspaceId || null, typeCode, input.title, input.ref || null, input.priority || 1, input.status || 1, JSON.stringify(input.data || {}), now, now],
    });

    return formatRow('inbox', {
      id: input.id,
      user_id: input.userId,
      workspace_id: input.workspaceId || null,
      type: typeCode,
      title: input.title,
      ref: input.ref || null,
      priority: input.priority || 1,
      status: input.status || 1,
      data: JSON.stringify(input.data || {}),
      version: 1,
      created: now,
      updated: now,
    });
  }

  async updateInboxItem(id: string, patch: {
    status?: number;
    expectedVersion?: number;
  }): Promise<PresentEntity | null> {
    const rows = await executeQuery<Record<string, unknown>>(
      this.client,
      `SELECT * FROM inbox WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id],
    );
    if (rows.length === 0) return null;
    const current = rows[0];
    const currentVersion = typeof current.version === 'number' ? current.version : 1;
    if (patch.expectedVersion !== undefined && currentVersion !== patch.expectedVersion) {
      throw new Error(`Version conflict: expected version ${patch.expectedVersion}, found ${currentVersion}`);
    }
    const now = Date.now();
    const result = await this.client.execute({
      sql: `UPDATE inbox SET status = ?, version = version + 1, updated = ?
            WHERE id = ? AND deleted_at IS NULL AND version = ?`,
      args: [patch.status ?? current.status as number, now, id, currentVersion],
    });
    if (result.rowsAffected === 0) throw new Error('Version conflict while updating inbox');
    const updated = await executeQuery<Record<string, unknown>>(
      this.client,
      `SELECT * FROM inbox WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id],
    );
    return updated.length ? formatRow('inbox', updated[0]) : null;
  }

  async upsertProjection(input: {
    id: string;
    workspaceId: string;
    collection: number;
    sourceId: string;
    type: number | string;
    data: Record<string, unknown>;
    sourceVersion: number;
    expires?: number;
  }): Promise<void> {
    const now = Date.now();
    const typeCode = typeof input.type === 'number' ? input.type : toMatterTypeCode(input.type);

    await this.client.execute({
      sql: `INSERT INTO projection (id, workspace_id, collection, source_id, type, data, source_version, expires, updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(workspace_id, collection, source_id)
            DO UPDATE SET data = ?, type = ?, source_version = ?, expires = ?, updated = ?, deleted_at = NULL
            WHERE source_version <= ?`,
      args: [
        input.id,
        input.workspaceId,
        input.collection,
        input.sourceId,
        typeCode,
        JSON.stringify(input.data),
        input.sourceVersion,
        input.expires || null,
        now,
        JSON.stringify(input.data),
        typeCode,
        input.sourceVersion,
        input.expires || null,
        now,
        input.sourceVersion,
      ],
    });
  }

  async enqueueOutbox(input: {
    id: string;
    kind: number;
    ref?: string;
    destination: string;
    payload: Record<string, unknown>;
    idem: string;
  }): Promise<void> {
    const now = Date.now();
    await this.client.execute({
      sql: `INSERT INTO outbox (id, kind, ref, destination, payload, idem, status, attempts, next_attempt, created, updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
            ON CONFLICT(idem) DO NOTHING`,
      args: [input.id, input.kind, input.ref || null, input.destination, JSON.stringify(input.payload), input.idem, OUTBOX_STATUS.pending, now, now, now],
    });
  }

  async createApproval(input: {
    id: string;
    action: string;
    actor: string;
    requiredRole: string;
    payload: Record<string, unknown>;
    policyVersion?: string;
    expiresInMs?: number;
  }): Promise<PresentEntity> {
    const now = Date.now();
    const expires = now + (input.expiresInMs || 7 * 86400 * 1000);
    const payloadHash = await hashPayload(input.payload);

    await this.client.execute({
      sql: `INSERT INTO approval (id, action, actor, required_role, payload, payload_hash, policy_version, status, expires, created, updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [input.id, input.action, input.actor, input.requiredRole, JSON.stringify(input.payload), payloadHash, input.policyVersion || '1.0', APPROVAL_STATUS.pending, expires, now, now],
    });

    return formatRow('approval', {
      id: input.id,
      action: input.action,
      actor: input.actor,
      required_role: input.requiredRole,
      payload: JSON.stringify(input.payload),
      payload_hash: payloadHash,
      policy_version: input.policyVersion || '1.0',
      status: APPROVAL_STATUS.pending,
      expires,
      created: now,
      updated: now,
    });
  }
}
