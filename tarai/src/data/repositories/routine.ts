/**
 * Routine Repository - Atomic Scheduled Chore Management & Job Leasing (matter.md §5)
 */
import type { Client } from '@libsql/client';
import { executeQuery } from '../turso.ts';
import type { Routine } from '../../domain/types.ts';

export class RoutineRepository {
  constructor(private client: Client) {}

  async create(routine: Omit<Routine, 'status' | 'leaseHolder' | 'leasedUntil'>): Promise<Routine> {
    const now = Date.now();
    const nextRunMs = typeof routine.nextRunAt === 'number' ? routine.nextRunAt : new Date(routine.nextRunAt).getTime();
    const lastRunMs = routine.lastRunAt ? (typeof routine.lastRunAt === 'number' ? routine.lastRunAt : new Date(routine.lastRunAt).getTime()) : null;

    await this.client.execute({
      sql: `INSERT INTO routine (id, name, cron, timezone, state, payload, next_run, last_run, version, created, updated)
            VALUES (?, ?, ?, 'UTC', 1, ?, ?, ?, 1, ?, ?)`,
      args: [
        routine.id,
        routine.name,
        routine.scheduleCron,
        JSON.stringify(routine.config || {}),
        nextRunMs,
        lastRunMs,
        now,
        now,
      ],
    });

    return {
      ...routine,
      status: 'idle',
    };
  }

  async findDueRoutines(currentTimeIso: string): Promise<Routine[]> {
    const currentMs = new Date(currentTimeIso).getTime();
    const rows = await executeQuery<{
      id: string;
      name: string;
      cron: string;
      last_run: number | null;
      next_run: number;
      lease_token: string | null;
      leased_at: number | null;
      state: number;
      payload: string;
    }>(
      this.client,
      `SELECT * FROM routine
       WHERE state = 1
         AND next_run <= ?
         AND (leased_at IS NULL OR leased_at < ?)
         AND deleted_at IS NULL`,
      [currentMs, currentMs - 300000]
    );

    return rows.map((r) => ({
      id: r.id,
      workspaceId: 'ws_default',
      name: r.name,
      scheduleCron: r.cron,
      lastRunAt: r.last_run ? new Date(r.last_run).toISOString() : undefined,
      nextRunAt: new Date(r.next_run).toISOString(),
      leaseHolder: r.lease_token || undefined,
      leasedUntil: r.leased_at ? new Date(r.leased_at + 300000).toISOString() : undefined,
      status: 'idle',
      config: JSON.parse(r.payload || '{}'),
    }));
  }

  async claimRoutine(
    id: string,
    workerId: string,
    leaseDurationSeconds: number,
    currentTimeIso: string
  ): Promise<boolean> {
    const currentMs = new Date(currentTimeIso).getTime();
    const leaseDurationMs = leaseDurationSeconds * 1000;
    const leasedUntilMs = currentMs + leaseDurationMs;

    const result = await this.client.execute({
      sql: `UPDATE routine
            SET lease_token = ?, leased_at = ?, updated = ?
            WHERE id = ?
              AND (leased_at IS NULL OR leased_at < ?)
              AND deleted_at IS NULL`,
      args: [workerId, leasedUntilMs, currentMs, id, currentMs],
    });

    return result.rowsAffected > 0;
  }

  async acquireLease(
    workspaceId: string,
    routineId: string,
    workerId: string,
    leaseDurationMs = 300000
  ): Promise<boolean> {
    const now = Date.now();
    const result = await this.client.execute({
      sql: `UPDATE routine
            SET lease_token = ?, leased_at = ?, updated = ?
            WHERE id = ?
              AND (leased_at IS NULL OR leased_at < ?)
              AND deleted_at IS NULL`,
      args: [workerId, now + leaseDurationMs, now, routineId, now],
    });

    return result.rowsAffected > 0;
  }

  async completeRoutine(
    workspaceIdOrId: string,
    routineIdOrWorkerId: string,
    workerIdOrNextRunAt: string,
    nextRunAtIso?: string,
    completedAtIso?: string
  ): Promise<boolean> {
    const now = Date.now();
    const routineId = nextRunAtIso ? routineIdOrWorkerId : workspaceIdOrId;
    const workerId = nextRunAtIso ? workerIdOrNextRunAt : routineIdOrWorkerId;
    const nextRun = nextRunAtIso || workerIdOrNextRunAt;
    const nextRunMs = new Date(nextRun).getTime();

    const result = await this.client.execute({
      sql: `UPDATE routine
            SET last_run = ?, next_run = ?, lease_token = NULL, leased_at = NULL, updated = ?
            WHERE id = ? AND lease_token = ? AND deleted_at IS NULL`,
      args: [now, nextRunMs, now, routineId, workerId],
    });

    return result.rowsAffected > 0;
  }
}
