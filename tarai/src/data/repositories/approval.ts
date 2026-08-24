/**
 * Approval Repository - High-Risk Action State Machine & Governance
 */
import type { Client } from '@libsql/client';
import { executeQuery } from '../turso.ts';
import type { ApprovalRecord, ApprovalStatus, Role } from '../../domain/types.ts';

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
    expiresAt: string;
    policyVersion?: string;
    idempotencyKey: string;
  }): Promise<ApprovalRecord> {
    const now = new Date().toISOString();
    const policyVersion = record.policyVersion || '1.0';

    await this.client.execute({
      sql: `INSERT INTO approvals (
              id, workspace_id, actor_id, required_role, action_type, payload_hash, payload,
              status, expires_at, policy_version, idempotency_key, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
      args: [
        record.id,
        record.workspaceId,
        record.actorId,
        record.requiredRole,
        record.actionType,
        record.payloadHash,
        JSON.stringify(record.payload),
        record.expiresAt,
        policyVersion,
        record.idempotencyKey,
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
      expiresAt: record.expiresAt,
      policyVersion,
      idempotencyKey: record.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findById(workspaceId: string, id: string): Promise<ApprovalRecord | null> {
    const rows = await executeQuery<{
      id: string;
      workspace_id: string;
      actor_id: string;
      required_role: Role;
      action_type: string;
      payload_hash: string;
      payload: string;
      status: ApprovalStatus;
      expires_at: string;
      policy_version: string;
      idempotency_key: string;
      decided_by: string | null;
      decision_reason: string | null;
      created_at: string;
      updated_at: string;
    }>(this.client, `SELECT * FROM approvals WHERE workspace_id = ? AND id = ?`, [
      workspaceId,
      id,
    ]);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      actorId: r.actor_id,
      requiredRole: r.required_role,
      actionType: r.action_type,
      payloadHash: r.payload_hash,
      payload: JSON.parse(r.payload),
      status: r.status,
      expiresAt: r.expires_at,
      policyVersion: r.policy_version,
      idempotencyKey: r.idempotency_key,
      decidedBy: r.decided_by || undefined,
      decisionReason: r.decision_reason || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async listPending(workspaceId: string): Promise<ApprovalRecord[]> {
    const rows = await executeQuery<{
      id: string;
      workspace_id: string;
      actor_id: string;
      required_role: Role;
      action_type: string;
      payload_hash: string;
      payload: string;
      status: ApprovalStatus;
      expires_at: string;
      policy_version: string;
      idempotency_key: string;
      decided_by: string | null;
      decision_reason: string | null;
      created_at: string;
      updated_at: string;
    }>(
      this.client,
      `SELECT * FROM approvals
       WHERE workspace_id = ? AND status = 'pending' AND expires_at > ?
       ORDER BY created_at DESC`,
      [workspaceId, new Date().toISOString()]
    );

    return rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      actorId: r.actor_id,
      requiredRole: r.required_role,
      actionType: r.action_type,
      payloadHash: r.payload_hash,
      payload: JSON.parse(r.payload),
      status: r.status,
      expiresAt: r.expires_at,
      policyVersion: r.policy_version,
      idempotencyKey: r.idempotency_key,
      decidedBy: r.decided_by || undefined,
      decisionReason: r.decision_reason || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async decide(
    workspaceId: string,
    id: string,
    status: 'approved' | 'rejected',
    decidedBy: string,
    reason?: string
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await this.client.execute({
      sql: `UPDATE approvals
            SET status = ?, decided_by = ?, decision_reason = ?, updated_at = ?
            WHERE workspace_id = ? AND id = ? AND status = 'pending' AND expires_at > ?`,
      args: [status, decidedBy, reason || null, now, workspaceId, id, now],
    });

    return result.rowsAffected > 0;
  }

  async markExecuted(workspaceId: string, id: string): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await this.client.execute({
      sql: `UPDATE approvals
            SET status = 'executed', updated_at = ?
            WHERE workspace_id = ? AND id = ? AND status = 'approved' AND expires_at > ?`,
      args: [now, workspaceId, id, now],
    });
    return result.rowsAffected > 0;
  }
}
