/**
 * Device Outbox & Queue State Machine (matter.md §8)
 * States: pending -> inflight -> accepted | retry_wait | needs_review | rejected_final
 */

import { getDeviceDb } from './db';
import { tar } from './tar';

export type OutboxState = 'pending' | 'inflight' | 'accepted' | 'retry_wait' | 'needs_review' | 'rejected_final';

export interface OutboxItem {
  id: string;
  type: string;
  scope: string;
  payload: Record<string, unknown>;
  idem: string;
  status: OutboxState;
  attempts: number;
  next_attempt: number;
  last_error?: string;
  created: number;
  updated: number;
}

export async function initOfflineQueue(): Promise<void> {
  const db = getDeviceDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS offline_queue (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      scope TEXT NOT NULL,
      payload TEXT NOT NULL,
      idem TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      next_attempt INTEGER DEFAULT 0,
      last_error TEXT,
      created INTEGER NOT NULL,
      updated INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_queue(status, next_attempt);
  `);
}

/**
 * Enqueue mutation into device outbox with deterministic idempotency key
 */
export async function enqueueOutbox(type: string, scope: string, payload: Record<string, unknown>): Promise<string> {
  const db = getDeviceDb();
  const now = Date.now();
  const id = `out_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const idem = `outidem_${scope}_${type}_${now}_${Math.random().toString(36).slice(2, 8)}`;

  await db.run(
    `INSERT INTO offline_queue (id, type, scope, payload, idem, status, attempts, next_attempt, created, updated)
     VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
    [id, type, scope, JSON.stringify(payload), idem, now, now, now]
  );

  return id;
}

export async function getPendingOutboxItems(): Promise<OutboxItem[]> {
  const db = getDeviceDb();
  const now = Date.now();
  const rows = await db.all(
    `SELECT * FROM offline_queue WHERE status IN ('pending', 'retry_wait') AND next_attempt <= ? ORDER BY created ASC`,
    [now]
  ).catch(() => []);

  return (rows || []).map((r: any) => ({
    id: r.id,
    type: r.type,
    scope: r.scope,
    payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : (r.payload || {}),
    idem: r.idem,
    status: r.status as OutboxState,
    attempts: r.attempts || 0,
    next_attempt: r.next_attempt || 0,
    last_error: r.last_error || undefined,
    created: r.created,
    updated: r.updated,
  }));
}

/**
 * Calculate exponential backoff with jitter (initial 1s, max 60s)
 */
function calculateBackoffMs(attempts: number): number {
  const baseMs = 1000;
  const maxMs = 60000;
  const exp = Math.min(attempts, 6);
  const rawBackoff = baseMs * Math.pow(2, exp);
  const jitter = Math.floor(Math.random() * 500);
  return Math.min(rawBackoff + jitter, maxMs);
}

/**
 * Flush outbox items to Tarai gateway with full state transitions
 */
export async function flushOutbox(): Promise<{ processed: number; succeeded: number; failed: number }> {
  const db = getDeviceDb();
  const items = await getPendingOutboxItems();
  let succeeded = 0;
  let failed = 0;

  for (const item of items) {
    const now = Date.now();
    // 1. Transition: pending/retry_wait -> inflight
    await db.run(
      `UPDATE offline_queue SET status = 'inflight', updated = ? WHERE id = ?`,
      [now, item.id]
    );

    try {
      if (item.type.startsWith('sale') || item.type.startsWith('action_record_sale')) {
        await tar.writeEvent(item.scope, 'sale', item.payload, item.idem);
      } else {
        await tar.tool('create', { ...item.payload, scope: item.scope, idem: item.idem });
      }

      // 2. Transition: inflight -> accepted
      const successNow = Date.now();
      await db.run(
        `UPDATE offline_queue SET status = 'accepted', updated = ? WHERE id = ?`,
        [successNow, item.id]
      );
      succeeded++;
    } catch (err: any) {
      failed++;
      const nextAttempts = item.attempts + 1;
      const errorMsg = err?.message || String(err);
      const isValidationOrFatal = errorMsg.includes('400') || errorMsg.includes('schema') || errorMsg.includes('Validation');
      const isBusinessConflict = errorMsg.includes('409') || errorMsg.includes('conflict') || errorMsg.includes('stock');

      let nextState: OutboxState = 'retry_wait';
      if (isValidationOrFatal) {
        nextState = 'rejected_final';
      } else if (isBusinessConflict || nextAttempts >= 10) {
        nextState = 'needs_review';
      }

      const nextAttemptTime = Date.now() + calculateBackoffMs(nextAttempts);
      await db.run(
        `UPDATE offline_queue SET status = ?, attempts = ?, next_attempt = ?, last_error = ?, updated = ? WHERE id = ?`,
        [nextState, nextAttempts, nextAttemptTime, errorMsg, Date.now(), item.id]
      );
    }
  }

  return { processed: items.length, succeeded, failed };
}

export async function getEffectiveStock(productId: string, lastKnownQty: number): Promise<number> {
  const db = getDeviceDb();
  const rows = await db.all(
    "SELECT payload FROM offline_queue WHERE status IN ('pending', 'inflight', 'retry_wait')"
  ).catch(() => []);

  let offlineSold = 0;
  for (const row of rows || []) {
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    const items = payload.items || [];
    const item = items.find((i: any) => i.productId === productId || i.sku === productId);
    if (item) offlineSold += (item.qty || item.quantity || 0);
  }

  return Math.max(0, lastKnownQty - offlineSold);
}

export async function getQueueStats(): Promise<{
  pending: number;
  inflight: number;
  accepted: number;
  retry_wait: number;
  needs_review: number;
  rejected_final: number;
}> {
  const db = getDeviceDb();
  const rows = await db.all(
    "SELECT status, COUNT(*) as count FROM offline_queue GROUP BY status"
  ).catch(() => []);

  const counts: Record<string, number> = {};
  for (const r of (rows as any[]) || []) {
    const statusKey = String(r.status || '');
    counts[statusKey] = Number(r.count) || 0;
  }

  return {
    pending: counts.pending || 0,
    inflight: counts.inflight || 0,
    accepted: counts.accepted || 0,
    retry_wait: counts.retry_wait || 0,
    needs_review: counts.needs_review || 0,
    rejected_final: counts.rejected_final || 0,
  };
}
