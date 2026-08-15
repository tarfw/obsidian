/**
 * Events + Idempotency Engine (plan6.md §5, §14)
 *
 * Events: append-only writes to the motion table with integer type codes and idempotency key (idem).
 * All motion inserts use INSERT OR IGNORE INTO motion (idem).
 * Automatic routing of motion events to personal DB inboxes.
 */

import { executeWorkspaceTursoQuery } from './db';
import { toMotionTypeCode } from './types-config';
import { routeWorkspaceMotionToInbox } from './inbox';

export interface EventData {
  type: string | number;
  ref?: string;
  data?: Record<string, any> | string;
  by?: string;
  created_by?: string;
  scope: string;
  idem?: string;
  workspaceId?: string;
  workspaceName?: string;
}

/**
 * Write motion event to Turso motion table with integer type and idempotency check.
 */
export async function writeEvent(
  dbUrl: string,
  dbToken: string,
  event: EventData
): Promise<{ id: string; duplicate?: boolean }> {
  const id = `mot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const typeCode = toMotionTypeCode(event.type);
  const dataStr = event.data
    ? (typeof event.data === 'string' ? event.data : JSON.stringify(event.data))
    : null;
  const author = event.by || event.created_by || 'system';
  const idemKey = event.idem || `${event.scope}:${author}:${Date.now()}:${event.type}:${Math.random().toString(36).substring(2, 6)}`;

  const sql = `
    INSERT OR IGNORE INTO motion (id, type, ref, data, by, at, scope, idem, deleted_at)
    VALUES (?, ?, ?, ?, ?, unixepoch(), ?, ?, NULL)
  `;

  const args = [
    id,
    typeCode,
    event.ref || null,
    dataStr,
    author,
    event.scope,
    idemKey,
  ];

  await executeWorkspaceTursoQuery(dbUrl, dbToken, sql, args);

  // Trigger inbox routing asynchronously
  routeWorkspaceMotionToInbox(
    dbUrl,
    dbToken,
    event.workspaceId || event.scope.replace('w:', ''),
    event.workspaceName || event.scope.replace('w:', ''),
    {
      type: typeCode,
      ref: event.ref,
      data: event.data,
      by: event.by,
    }
  ).catch(err => {
    console.warn('[events] routeWorkspaceMotionToInbox failed:', err);
  });

  return { id };
}

/**
 * Query recent motion events with selective SELECT and soft-delete filtering.
 */
export async function getRecentMotionEvents(
  dbUrl: string,
  dbToken: string,
  type?: number | string,
  limit: number = 50
): Promise<any[]> {
  let sql = 'SELECT id, type, ref, data, by, at, scope FROM motion WHERE deleted_at IS NULL';
  const args: any[] = [];

  if (type !== undefined) {
    sql += ' AND type = ?';
    args.push(toMotionTypeCode(type));
  }

  sql += ' ORDER BY at DESC LIMIT ?';
  args.push(limit);

  return await executeWorkspaceTursoQuery(dbUrl, dbToken, sql, args);
}

/**
 * Get user pending inbox tasks.
 */
export async function getUserInbox(
  dbUrl: string,
  dbToken: string,
  userId: string,
  limit: number = 50
): Promise<any[]> {
  const sql = `
    SELECT id, user_id, workspace_id, workspace_name, type, title, ref, priority, due, status, created_at
    FROM inbox
    WHERE (user_id = ? OR user_id = 'all') AND status = 1 AND deleted_at IS NULL
    ORDER BY priority DESC, created_at DESC
    LIMIT ?
  `;
  return await executeWorkspaceTursoQuery(dbUrl, dbToken, sql, [userId, limit]).catch(() => []);
}

/**
 * Mark inbox task completed.
 */
export async function markTaskDone(
  dbUrl: string,
  dbToken: string,
  taskId: string
): Promise<void> {
  const sql = `UPDATE inbox SET status = 2 WHERE id = ? AND deleted_at IS NULL`;
  await executeWorkspaceTursoQuery(dbUrl, dbToken, sql, [taskId]).catch(() => {});
}
