/**
 * Member Repository
 */
import type { Client } from '@libsql/client';
import { executeQuery } from '../turso.ts';
import type { Member, MemberStatus, Role } from '../../domain/types.ts';

export class MemberRepository {
  constructor(private client: Client) {}

  async create(member: Omit<Member, 'createdAt' | 'updatedAt'>): Promise<Member> {
    const now = new Date().toISOString();
    await this.client.execute({
      sql: `INSERT INTO members (id, workspace_id, user_id, email, role, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        member.id,
        member.workspaceId,
        member.userId,
        member.email,
        member.role,
        member.status,
        now,
        now,
      ],
    });

    return {
      ...member,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findByUserIdAndWorkspace(userId: string, workspaceId: string): Promise<Member | null> {
    const rows = await executeQuery<{
      id: string;
      workspace_id: string;
      user_id: string;
      email: string;
      role: Role;
      status: MemberStatus;
      created_at: string;
      updated_at: string;
    }>(
      this.client,
      `SELECT * FROM members WHERE user_id = ? AND workspace_id = ?`,
      [userId, workspaceId]
    );

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      userId: r.user_id,
      email: r.email,
      role: r.role,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async updateStatus(id: string, workspaceId: string, status: MemberStatus): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await this.client.execute({
      sql: `UPDATE members SET status = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`,
      args: [status, now, id, workspaceId],
    });
    return result.rowsAffected > 0;
  }

  async listByWorkspace(workspaceId: string): Promise<Member[]> {
    const rows = await executeQuery<{
      id: string;
      workspace_id: string;
      user_id: string;
      email: string;
      role: Role;
      status: MemberStatus;
      created_at: string;
      updated_at: string;
    }>(
      this.client,
      `SELECT * FROM members WHERE workspace_id = ? ORDER BY created_at ASC`,
      [workspaceId]
    );

    return rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      userId: r.user_id,
      email: r.email,
      role: r.role,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }
}
