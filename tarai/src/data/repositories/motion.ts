import type { Client } from '@libsql/client';
import { executeQuery } from '../turso.ts';
import { toMotionTypeCode, MOTION_TYPE_NAMES, type MotionEvent } from '../../domain/types.ts';
import { hashPayload } from '../../domain/idempotency.ts';

export class MotionRepository {
  constructor(private client: Client) {}

  async record(
    workspaceId: string,
    id: string,
    eventType: string | number,
    actorId: string,
    payload: Record<string, unknown>,
    matterId?: string,
    diff?: Record<string, unknown>
  ): Promise<MotionEvent> {
    const now = Date.now();
    const typeCode = typeof eventType === 'number' ? eventType : toMotionTypeCode(eventType);
    const payloadHash = await hashPayload(payload);
    const idem = `mot_${id}_${now}`;
    const motionData = typeof eventType === 'string' ? { ...payload, _eventType: eventType } : payload;

    await this.client.execute({
      sql: `INSERT INTO motion (id, type, actor, ref, data, idem, payload_hash, created)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        typeCode,
        actorId,
        matterId || null,
        JSON.stringify(motionData),
        idem,
        payloadHash,
        now,
      ],
    });

    return {
      id,
      workspaceId,
      eventType: String(eventType),
      actorId,
      matterId,
      diff,
      payload,
      createdAt: new Date(now).toISOString(),
    };
  }

  async listByWorkspace(workspaceId: string, limit = 50): Promise<MotionEvent[]> {
    const rows = await executeQuery<{
      id: string;
      type: number;
      actor: string;
      ref: string | null;
      data: string;
      created: number;
    }>(
      this.client,
      `SELECT * FROM motion WHERE deleted_at IS NULL ORDER BY created DESC LIMIT ?`,
      [limit]
    );

    return rows.map((r) => {
      const parsed = JSON.parse(r.data);
      const eventType = parsed._eventType || MOTION_TYPE_NAMES[r.type] || String(r.type);
      return {
        id: r.id,
        workspaceId,
        eventType,
        actorId: r.actor,
        matterId: r.ref || undefined,
        payload: parsed,
        createdAt: new Date(r.created).toISOString(),
      };
    });
  }
}



