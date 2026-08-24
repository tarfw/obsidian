/**
 * Routine Repository - Atomic Scheduled Chore Management & Job Leasing
 */
import type { Client } from '@libsql/client';
import { executeQuery } from '../turso.ts';
import type { Routine } from '../../domain/types.ts';

export class RoutineRepository {
  constructor(private client: Client) {}

  async create(routine: Omit<Routine, 'status' | 'leaseHolder' | 'leasedUntil'>): Promise<Routine> {
    await this.client.execute({
      sql: `INSERT INTO routines (id, workspace_id, name, schedule_cron, last_run_at, next_run_at, status, config)
            VALUES (?, ?, ?, ?, ?, ?, 'idle', ?)`,
      args: [
        routine.id,
        routine.workspaceId,
        routine.name,
        routine.scheduleCron,
        routine.lastRunAt || null,
        routine.nextRunAt,
        JSON.stringify(routine.config || {}),
      ],
    });

    return {
      ...routine,
      status: 'idle',
    };
  }

  async findDueRoutines(currentTimeIso: string): Promise<Routine[]> {
    const rows = await executeQuery<{
      id: string;
      workspace_id: string;
      name: string;
      schedule_cron: string;
      last_run_at: string | null;
      next_run_at: string;
      lease_holder: string | null;
      leased_until: string | null;
      status: Routine['status'];
      config: string;
    }>(
      this.client,
      `SELECT * FROM routines
       WHERE status IN ('idle', 'running')
         AND next_run_at <= ?
         AND (leased_until IS NULL OR leased_until < ?)`,
      [currentTimeIso, currentTimeIso]
    );

    return rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      name: r.name,
      scheduleCron: r.schedule_cron,
      lastRunAt: r.last_run_at || undefined,
      nextRunAt: r.next_run_at,
      leaseHolder: r.lease_holder || undefined,
      leasedUntil: r.leased_until || undefined,
      status: r.status,
      config: JSON.parse(r.config || '{}'),
    }));
  }

  /**
   * Atomically claims a routine for execution by setting lease_holder and leased_until.
   * If another worker claimed it or the lease has not expired, rowsAffected will be 0.
   */
  async claimRoutine(
    id: string,
    workerId: string,
    leaseDurationSeconds: number,
    currentTimeIso: string
  ): Promise<boolean> {
    const leasedUntil = new Date(
      new Date(currentTimeIso).getTime() + leaseDurationSeconds * 1000
    ).toISOString();

    const result = await this.client.execute({
      sql: `UPDATE routines
            SET lease_holder = ?, leased_until = ?, status = 'running'
            WHERE id = ?
              AND status != 'disabled'
              AND (leased_until IS NULL OR leased_until < ?)`,
      args: [workerId, leasedUntil, id, currentTimeIso],
    });

    return result.rowsAffected > 0;
  }

  async completeRoutine(
    id: string,
    workerId: string,
    nextRunAtIso: string,
    completedAtIso: string
  ): Promise<boolean> {
    const result = await this.client.execute({
      sql: `UPDATE routines
            SET status = 'idle',
                lease_holder = NULL,
                leased_until = NULL,
                last_run_at = ?,
                next_run_at = ?
            WHERE id = ? AND lease_holder = ?`,
      args: [completedAtIso, nextRunAtIso, id, workerId],
    });

    return result.rowsAffected > 0;
  }
}
