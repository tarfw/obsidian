/**
 * Client-Side Personal Inbox (matter.md §5, §6, §9, §11)
 *
 * Contracts:
 * 1. Digest — concise summary of completed background activity.
 * 2. Approvals — immutable proposals waiting for an authorized decision.
 * 3. Signals — assigned work, deadlines, anomalies, and urgent changes.
 *
 * Rules:
 * - Personal DB inbox is durable truth (0ms read latency from local SQLite replica).
 * - Push notifications are hints; pending tasks are NOT removed merely due to age.
 * - Completion (status=2) and dismissal (status=0) mutate local SQLite with optimistic update
 *   and execute through authoritative Tarai gateway.
 */

import { getUserDb, scheduleSyncPush } from './db';
import { tar } from './tar';
import { INBOX_TYPE_NAMES, INBOX_TYPES, INBOX_STATUS, APPROVAL_STATUS } from '../constants/types-config';

export type InboxContractKind = 'digest' | 'approval' | 'signal';

export interface InboxItem<T = any> {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  workspace_name?: string | null;
  type: number;
  typeName: string;
  contract: InboxContractKind;
  title: string;
  ref?: string | null;
  priority: number;
  status: number; // 0=dismissed, 1=pending, 2=done
  due?: number | null;
  data: T;
  version: number;
  created: number;
  created_at: string;
  updated: number;
  updated_at: string;
}

let _userId = 'guest';

export function setInboxUserId(id: string) {
  _userId = id;
}

export function resolveInboxContract(type: number): InboxContractKind {
  if (type === INBOX_TYPES.approval) {
    return 'approval';
  }
  if (type === INBOX_TYPES.notification || type === INBOX_TYPES.suggestion) {
    return 'digest';
  }
  // task, alert, reminder, etc.
  return 'signal';
}

/**
 * Fetch unified inbox items from local SQLite Personal DB replica (0ms read latency).
 */
export async function getLocalInbox(
  scopeOrOptions?: string | {
    userId?: string;
    workspaceId?: string | null;
    contract?: InboxContractKind;
    status?: number; // default: 1 (pending)
    limit?: number;
  }
): Promise<InboxItem[]> {
  try {
    const db = getUserDb();
    if (!db) return [];

    const options = typeof scopeOrOptions === 'string' ? { workspaceId: scopeOrOptions } : (scopeOrOptions || {});
    const activeUser = options.userId || _userId;
    const status = options.status !== undefined ? options.status : INBOX_STATUS.pending;
    const limit = options.limit || 100;

    let sql = `
      SELECT id, user_id, workspace_id, type, title, ref, priority, status, data, version, created, updated
      FROM inbox
      WHERE (user_id = ? OR user_id = 'guest' OR user_id = 'all')
        AND status = ?
        AND deleted_at IS NULL
    `;
    const params: any[] = [activeUser, status];

    if (options.workspaceId) {
      sql += ` AND (workspace_id = ? OR workspace_id IS NULL)`;
      params.push(options.workspaceId.replace(/^w:/, ''));
    }

    sql += ` ORDER BY priority DESC, created DESC LIMIT ?`;
    params.push(limit);

    const rows = await db.all(sql, params).catch(() => []);

    return (rows || []).map((r: any) => {
      const parsedData = typeof r.data === 'string' ? JSON.parse(r.data || '{}') : (r.data || {});
      const createdMs = typeof r.created === 'number' ? r.created : Date.now();
      const updatedMs = typeof r.updated === 'number' ? r.updated : createdMs;
      const numType = typeof r.type === 'number' ? r.type : INBOX_TYPES.task;
      const contract = resolveInboxContract(numType);

      return {
        id: r.id,
        user_id: r.user_id,
        workspace_id: r.workspace_id,
        workspace_name: r.workspace_id ? r.workspace_id.replace(/^ws_/, '') : 'Personal',
        type: numType,
        typeName: INBOX_TYPE_NAMES[numType] || 'task',
        contract,
        title: r.title,
        ref: r.ref,
        priority: r.priority || 1,
        status: r.status,
        due: parsedData.due || parsedData.dueDate || null,
        data: parsedData,
        version: r.version || 1,
        created: createdMs,
        created_at: new Date(createdMs).toISOString(),
        updated: updatedMs,
        updated_at: new Date(updatedMs).toISOString(),
      };
    }).filter((item) => {
      if (options.contract && item.contract !== options.contract) return false;
      return true;
    });
  } catch (err) {
    console.warn('[Inbox] Local query failed:', err);
    return [];
  }
}

/**
 * Mark an inbox task or signal as completed (status = 2).
 */
export async function markInboxDone(
  itemId: string,
  workspaceScope?: string
): Promise<boolean> {
  try {
    const db = getUserDb();
    const now = Date.now();
    if (db) {
      await db.run(
        `UPDATE inbox SET status = ?, updated = ?, version = version + 1 WHERE id = ? AND deleted_at IS NULL`,
        [INBOX_STATUS.done, now, itemId]
      ).catch(() => {});
      scheduleSyncPush();
    }

    if (workspaceScope && workspaceScope !== 'p') {
      await tar.markTaskDone(itemId, workspaceScope).catch(() => {});
    }

    return true;
  } catch (err) {
    console.warn('[Inbox] Failed to mark done:', err);
    return false;
  }
}

/**
 * Dismiss an inbox item (status = 0).
 */
export async function dismissInboxItem(
  itemId: string,
  _workspaceScope?: string
): Promise<boolean> {
  try {
    const db = getUserDb();
    const now = Date.now();
    if (db) {
      await db.run(
        `UPDATE inbox SET status = ?, updated = ?, version = version + 1 WHERE id = ? AND deleted_at IS NULL`,
        [INBOX_STATUS.dismissed, now, itemId]
      ).catch(() => {});
      scheduleSyncPush();
    }
    return true;
  } catch (err) {
    console.warn('[Inbox] Failed to dismiss item:', err);
    return false;
  }
}

/**
 * Decide an approval item (matter.md §9 Approvals contract).
 * Submits decision (approved / rejected) to Tarai and marks local approval state.
 */
export async function decideInboxApproval(
  approvalId: string,
  decision: 'approved' | 'rejected',
  workspaceScope: string,
  reason = ''
): Promise<boolean> {
  try {
    const db = getUserDb();
    const now = Date.now();

    // 1. Optimistic local update
    if (db) {
      await db.run(
        `UPDATE inbox SET status = ?, updated = ?, version = version + 1 WHERE id = ? AND deleted_at IS NULL`,
        [decision === 'approved' ? INBOX_STATUS.done : INBOX_STATUS.dismissed, now, approvalId]
      ).catch(() => {});
      scheduleSyncPush();
    }

    // 2. Authoritative Tarai decision dispatch
    await tar.decideApproval(approvalId, decision, workspaceScope, reason);
    return true;
  } catch (err) {
    console.warn('[Inbox] Failed to decide approval:', err);
    return false;
  }
}

/**
 * Upsert an inbox item into Personal DB (e.g. from local signal or remote push).
 */
export async function upsertInboxItem(item: {
  id?: string;
  user_id?: string;
  workspace_id?: string | null;
  type: number | string;
  title: string;
  ref?: string | null;
  priority?: number;
  status?: number;
  data?: any;
  version?: number;
}): Promise<boolean> {
  try {
    const db = getUserDb();
    if (!db) return false;

    const numType = typeof item.type === 'number' ? item.type : (INBOX_TYPES as any)[item.type] || INBOX_TYPES.task;
    const deterministicId = item.id || `ibx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const dataJson = typeof item.data === 'string' ? item.data : JSON.stringify(item.data || {});
    const userId = item.user_id || _userId;

    await db.run(
      `INSERT INTO inbox (id, user_id, workspace_id, type, title, ref, priority, status, data, version, created, updated, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
       ON CONFLICT(id) DO UPDATE SET
         type = excluded.type,
         title = excluded.title,
         ref = excluded.ref,
         priority = excluded.priority,
         status = excluded.status,
         data = excluded.data,
         version = excluded.version,
         updated = excluded.updated
       WHERE excluded.version >= inbox.version`,
      [
        deterministicId,
        userId,
        item.workspace_id || null,
        numType,
        item.title,
        item.ref || null,
        item.priority ?? 1,
        item.status ?? INBOX_STATUS.pending,
        dataJson,
        item.version ?? 1,
        now,
        now,
      ]
    );

    scheduleSyncPush();
    return true;
  } catch (err) {
    console.warn('[Inbox] Upsert failed:', err);
    return false;
  }
}

// Backwards compatibility alias
export const markTaskDone = markInboxDone;
export const fetchInbox = getLocalInbox;
export const getLocalInboxItems = getLocalInbox;
