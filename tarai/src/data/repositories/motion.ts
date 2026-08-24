/**
 * Motion Repository - Append-Only Immutable Audit Log
 */
import type { Client } from '@libsql/client';
import { executeQuery } from '../turso.ts';
import type { MotionEvent } from '../../domain/types.ts';

export class MotionRepository {
  constructor(private client: Client) {}

  async record(
    workspaceId: string,
    id: string,
    eventType: string,
    actorId: string,
    payload: Record<string, unknown>,
    matterId?: string,
    diff?: Record<string, unknown>
  ): Promise<MotionEvent> {
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `INSERT INTO motion (id, workspace_id, event_type, actor_id, matter_id, diff, payload, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        workspaceId,
        eventType,
        actorId,
        matterId || null,
        diff ? JSON.stringify(diff) : null,
        JSON.stringify(payload),
        now,
      ],
    });

    return {
      id,
      workspaceId,
      eventType,
      actorId,
      matterId,
      diff,
      payload,
      createdAt: now,
    };
  }

  async listByWorkspace(workspaceId: string, limit = 50): Promise<MotionEvent[]> {
    const rows = await executeQuery<{
      id: string;
      workspace_id: string;
      event_type: string;
      actor_id: string;
      matter_id: string | null;
      diff: string | null;
      payload: string;
      created_at: string;
    }>(
      this.client,
      `SELECT * FROM motion WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?`,
      [workspaceId, limit]
    );

    return rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      eventType: r.event_type,
      actorId: r.actor_id,
      matterId: r.matter_id || undefined,
      diff: r.diff ? JSON.parse(r.diff) : undefined,
      payload: JSON.parse(r.payload),
      createdAt: r.created_at,
    }));
  }
}
