/**
 * Approval Repository - High-Risk Action State Machine & Governance (matter.md §5)
 */
import type { Client } from '@libsql/client';
import { executeQuery } from '../turso.ts';
import type { ApprovalRecord, ApprovalStatus, Role } from '../../domain/types.ts';
import { hashPayload } from '../../domain/idempotency.ts';

export class ApprovalRepository {
  constructor(private client: Client) {}

  async create(record: {
    id: string;
    workspaceId: string;
    actorId: string;
    requiredRole: Role;
    actionType: string;
    payloadHash: string;
    payload: Record<string, unknown>;
    expiresAt: string | number;
    policyVersion?: string;
    idempotencyKey: string;
  }): Promise<ApprovalRecord> {
    const now = Date.now();
    const expiresMs = typeof record.expiresAt === 'number' ? record.expiresAt : new Date(record.expiresAt).getTime();
    const policyVersion = record.policyVersion || '1.0';

    await this.client.execute({
      sql: `INSERT INTO approval (
              id, action, actor, required_role, payload, payload_hash,
              policy_version, status, expires, created, updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      args: [
        record.id,
        record.actionType,
        record.actorId,
        record.requiredRole,
        JSON.stringify(record.payload),
        record.payloadHash,
        policyVersion,
        expiresMs,
        now,
        now,
      ],
    });

    return {
      id: record.id,
      workspaceId: record.workspaceId,
      actorId: record.actorId,
      requiredRole: record.requiredRole,
      actionType: record.actionType,
      payloadHash: record.payloadHash,
      payload: record.payload,
      status: 'pending',
      expiresAt: new Date(expiresMs).toISOString(),
      policyVersion,
      idempotencyKey: record.idempotencyKey,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    };
  }

  async findById(workspaceId: string, id: string): Promise<ApprovalRecord | null> {
    const rows = await executeQuery<{
      id: string;
      action: string;
      actor: string;
      required_role: Role;
      payload: string;
      payload_hash: string;
      policy_version: string;
      status: number;
      expires: number;
      decided_by: string | null;
      decision_reason: string | null;
      created: number;
      updated: number;
    }>(this.client, `SELECT * FROM approval WHERE id = ? AND deleted_at IS NULL`, [id]);

    if (rows.length === 0) return null;
    const r = rows[0];
    const statusMap: Record<number, ApprovalStatus> = { 1: 'pending', 2: 'approved', 3: 'rejected', 4: 'executed' };

    return {
      id: r.id,
      workspaceId,
      actorId: r.actor,
      requiredRole: r.required_role,
      actionType: r.action,
      payloadHash: r.payload_hash,
      payload: JSON.parse(r.payload),
      status: statusMap[r.status] || 'pending',
      expiresAt: new Date(r.expires).toISOString(),
      policyVersion: r.policy_version,
      idempotencyKey: `idemp_${r.id}`,
      decidedBy: r.decided_by || undefined,
      decisionReason: r.decision_reason || undefined,
      createdAt: new Date(r.created).toISOString(),
      updatedAt: new Date(r.updated).toISOString(),
    };
  }

  async listPending(workspaceId: string): Promise<ApprovalRecord[]> {
    const now = Date.now();
    const rows = await executeQuery<{
      id: string;
      action: string;
      actor: string;
      required_role: Role;
      payload: string;
      payload_hash: string;
      policy_version: string;
      status: number;
      expires: number;
      decided_by: string | null;
      decision_reason: string | null;
      created: number;
      updated: number;
    }>(
      this.client,
      `SELECT * FROM approval
       WHERE status = 1 AND expires > ? AND deleted_at IS NULL
       ORDER BY created DESC`,
      [now]
    );

    return rows.map((r) => ({
      id: r.id,
      workspaceId,
      actorId: r.actor,
      requiredRole: r.required_role,
      actionType: r.action,
      payloadHash: r.payload_hash,
      payload: JSON.parse(r.payload),
      status: 'pending' as ApprovalStatus,
      expiresAt: new Date(r.expires).toISOString(),
      policyVersion: r.policy_version,
      idempotencyKey: `idemp_${r.id}`,
      decidedBy: r.decided_by || undefined,
      decisionReason: r.decision_reason || undefined,
      createdAt: new Date(r.created).toISOString(),
      updatedAt: new Date(r.updated).toISOString(),
    }));
  }

  async decide(
    workspaceId: string,
    id: string,
    status: 'approved' | 'rejected',
    decidedBy: string,
    reason?: string
  ): Promise<boolean> {
    const now = Date.now();
    const statusCode = status === 'approved' ? 2 : 3;
    const result = await this.client.execute({
      sql: `UPDATE approval
            SET status = ?, decided_by = ?, decision_reason = ?, updated = ?
            WHERE id = ? AND status = 1 AND expires > ? AND deleted_at IS NULL`,
      args: [statusCode, decidedBy, reason || null, now, id, now],
    });

    return result.rowsAffected > 0;
  }

  async markExecuted(workspaceId: string, id: string): Promise<boolean> {
    const now = Date.now();
    const result = await this.client.execute({
      sql: `UPDATE approval
            SET status = 4, updated = ?
            WHERE id = ? AND status = 2 AND expires > ? AND deleted_at IS NULL`,
      args: [now, id, now],
    });
    return result.rowsAffected > 0;
  }
}

