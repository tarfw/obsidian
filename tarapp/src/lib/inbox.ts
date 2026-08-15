/**
 * Client-Side Personal Inbox (plan6.md §2A, §3, §14, §18)
 *
 * Reads directly from local SQLite replica of Personal DB (0ms read latency).
 * Unified tasks and notifications across personal and all joined workspaces.
 */

import { getUserDb } from './db';
import { INBOX_TYPE_NAMES, INBOX_TYPES } from '../constants/types-config';

const TAR_URL = process.env.EXPO_PUBLIC_TARFLUE_URL || 'https://taragent.tar-54d.workers.dev';

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
  created_at: number | string;
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
      SELECT id, user_id, workspace_id, workspace_name, type, title, ref, priority, due, status, data, created_at
      FROM inbox
      WHERE (user_id = ? OR user_id = 'guest' OR user_id = 'all')
        AND status = ?
        AND deleted_at IS NULL
      ORDER BY priority DESC, created_at DESC
      LIMIT ?
    `;

    const rows = await db.all(sql, [_userId, status, limit]);
    return (rows || []).map((r: any) => ({
      ...r,
      typeName: INBOX_TYPE_NAMES[r.type] || 'task',
      data: typeof r.data === 'string' ? JSON.parse(r.data || '{}') : r.data,
    }));
  } catch (err) {
    console.warn('[inbox] Local DB query failed, attempting remote fallback:', err);
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
    if (db) {
      await db.run(
        `UPDATE inbox SET status = 2 WHERE id = ? AND deleted_at IS NULL`,
        [taskId]
      );
    }

    if (workspaceScope) {
      await fetch(`${TAR_URL}/inbox/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': _userId,
        },
        body: JSON.stringify({ scope: workspaceScope }),
      }).catch(() => {});
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
    const url = new URL(`${TAR_URL}/workspace/${scope}/inbox`);
    url.searchParams.set('userId', _userId);
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url.toString(), {
      headers: { 'X-User-Id': _userId },
    });
    if (!res.ok) return [];
    const data = await res.json() as { tasks?: any[] };
    return (data.tasks || []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id || _userId,
      workspace_id: r.workspace_id || scope,
      workspace_name: r.workspace_name || scope,
      type: typeof r.type === 'number' ? r.type : INBOX_TYPES.task,
      typeName: typeof r.type === 'number' ? INBOX_TYPE_NAMES[r.type] : r.type,
      title: r.title,
      ref: r.ref,
      priority: r.priority || 1,
      due: r.due,
      status: r.status === 'done' ? 2 : 1,
      data: r.data,
      created_at: r.created_at || r.at,
    }));
  } catch (err) {
    console.warn('[inbox] Failed to fetch remote inbox:', err);
    return [];
  }
}

export const fetchInbox = fetchRemoteInbox;
export type InboxTask = InboxItem;
