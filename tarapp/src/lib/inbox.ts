/**
 * Client-Side Personal Inbox (matter.md §6, §9, §11)
 *
 * Reads directly from local SQLite replica of Personal DB (0ms read latency).
 * Unified tasks and notifications across personal and all joined workspaces.
 */

import { getUserDb } from './db';
import { tar } from './tar';
import { INBOX_TYPE_NAMES, INBOX_TYPES } from '../constants/types-config';

export interface InboxItem {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  workspace_name?: string | null;
  type: number;
  typeName?: string;
  title: string;
  ref?: string | null;
  priority: number;
  due?: number | null;
  status: number; // 1=pending, 2=done, 3=dismissed
  data?: any;
  created: number;
  created_at: string;
  updated: number;
  updated_at: string;
}

let _userId = 'guest';

export function setInboxUserId(id: string) {
  _userId = id;
}

/**
 * Fetch unified inbox items from local SQLite Personal DB replica (0ms read latency).
 */
export async function getLocalInboxItems(
  status: number = 1,
  limit: number = 50
): Promise<InboxItem[]> {
  try {
    const db = getUserDb();
    if (!db) return [];

    const sql = `
      SELECT id, user_id, workspace_id, type, title, ref, priority, status, data, version, created, updated
      FROM inbox
      WHERE (user_id = ? OR user_id = 'guest' OR user_id = 'all')
        AND status = ?
        AND deleted_at IS NULL
      ORDER BY priority DESC, created DESC
      LIMIT ?
    `;

    const rows = await db.all(sql, [_userId, status, limit]).catch(() => []);
    return (rows || []).map((r: any) => {
      const parsedData = typeof r.data === 'string' ? JSON.parse(r.data || '{}') : (r.data || {});
      const createdMs = typeof r.created === 'number' ? r.created : Date.now();
      const updatedMs = typeof r.updated === 'number' ? r.updated : createdMs;
      return {
        id: r.id,
        user_id: r.user_id,
        workspace_id: r.workspace_id,
        workspace_name: r.workspace_id ? r.workspace_id.replace(/^ws_/, '') : undefined,
        type: typeof r.type === 'number' ? r.type : INBOX_TYPES.task,
        typeName: INBOX_TYPE_NAMES[r.type] || 'task',
        title: r.title,
        ref: r.ref,
        priority: r.priority || 1,
        due: parsedData.due || parsedData.dueDate || null,
        status: r.status,
        data: parsedData,
        created: createdMs,
        created_at: new Date(createdMs).toISOString(),
        updated: updatedMs,
        updated_at: new Date(updatedMs).toISOString(),
      };
    });
  } catch (err) {
    console.warn('[inbox] Local DB query failed:', err);
    return [];
  }
}

/**
 * Mark a task as done (local DB update + remote sync).
 */
export async function markTaskDone(
  taskId: string,
  workspaceScope?: string
): Promise<boolean> {
  try {
    const db = getUserDb();
    const now = Date.now();
    if (db) {
      await db.run(
        `UPDATE inbox SET status = 2, updated = ? WHERE id = ? AND deleted_at IS NULL`,
        [now, taskId]
      ).catch(() => {});
    }

    if (workspaceScope) {
      await tar.markTaskDone(taskId, workspaceScope).catch(() => {});
    }

    return true;
  } catch (err) {
    console.warn('[inbox] Failed to mark done:', err);
    return false;
  }
}

/**
 * Fetch inbox from remote worker if local replica is pending sync.
 */
export async function fetchRemoteInbox(
  scope: string,
  limit: number = 50
): Promise<InboxItem[]> {
  try {
    const data = await tar.getInbox(scope);
    return (data.rows || []).slice(0, limit).map((r: any) => {
      const createdMs = typeof r.created === 'number' ? r.created : Date.now();
      const updatedMs = typeof r.updated === 'number' ? r.updated : createdMs;
      return {
        id: r.id,
        user_id: r.user_id || _userId,
        workspace_id: r.workspace_id || scope,
        workspace_name: r.workspace_id || scope,
        type: typeof r.type === 'number' ? r.type : INBOX_TYPES.task,
        typeName: typeof r.type === 'number' ? INBOX_TYPE_NAMES[r.type] : r.type,
        title: r.title || String(r.data?.title || 'Inbox Item'),
        ref: r.ref,
        priority: r.priority || 1,
        due: r.due,
        status: r.status === 'done' || r.status === 2 ? 2 : 1,
        data: r.data,
        created: createdMs,
        created_at: new Date(createdMs).toISOString(),
        updated: updatedMs,
        updated_at: new Date(updatedMs).toISOString(),
      };
    });
  } catch (err) {
    console.warn('[inbox] Failed to fetch remote inbox:', err);
    return [];
  }
}

export const fetchInbox = fetchRemoteInbox;
export type InboxTask = InboxItem;

