/**
 * Personal DB Inbox Router (plan6.md §2A, §3, §14, §18)
 *
 * Each user has exactly ONE personal DB (user_{id}).
 * All tasks and notifications across personal and all joined workspaces
 * are unified into the user's personal DB `inbox` table.
 */

import { executeWorkspaceTursoQuery, envContext } from './db';
import { toInboxTypeCode, INBOX_TYPES, GRAPH_REL_TYPES } from './types-config';

export interface PushInboxItemParams {
  userId: string;
  workspaceId?: string | null;
  workspaceName?: string | null;
  type: number | string; // Integer code or type name (task, alert, approval, reminder, notification, suggestion)
  title: string;
  ref?: string | null;
  priority?: number; // 1=low, 2=medium, 3=high, 4=urgent
  due?: number | null;
  status?: number; // 1=pending/open, 2=done, 3=dismissed
  data?: Record<string, any> | string | null;
}

/**
 * Push an actionable item or notification directly into a user's Personal DB inbox.
 */
export async function pushToPersonalInbox(
  params: PushInboxItemParams,
  personalDbCredentials?: { url: string; authToken: string }
): Promise<string> {
  const id = `ibx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const typeCode = toInboxTypeCode(params.type);
  const dataStr = params.data
    ? (typeof params.data === 'string' ? params.data : JSON.stringify(params.data))
    : null;

  const sql = `
    INSERT INTO inbox (
      id, user_id, workspace_id, workspace_name, type, title, ref, priority, due, status, data, created_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), NULL)
  `;

  const args = [
    id,
    params.userId,
    params.workspaceId || null,
    params.workspaceName || null,
    typeCode,
    params.title,
    params.ref || null,
    params.priority ?? 1,
    params.due || null,
    params.status ?? 1,
    dataStr,
  ];

  // If specific personal DB credentials are supplied, query directly; otherwise execute standard query
  if (personalDbCredentials?.url && personalDbCredentials?.authToken) {
    await executeWorkspaceTursoQuery(
      personalDbCredentials.url,
      personalDbCredentials.authToken,
      sql,
      args
    );
  } else {
    // Look up personal DB in env context or global DB
    const env = envContext.getStore();
    if (env?.DB) {
      try {
        const userDbRecord = await (env.DB as any).prepare(
          'SELECT turso_url, turso_auth_token FROM workspaces WHERE scope = ? OR subdomain = ?'
        ).bind(`u:${params.userId}`, `user-${params.userId}`).first();

        if (userDbRecord?.turso_url && userDbRecord?.turso_auth_token) {
          await executeWorkspaceTursoQuery(
            userDbRecord.turso_url,
            userDbRecord.turso_auth_token,
            sql,
            args
          );
          return id;
        }
      } catch (err) {
        console.warn(`[inbox] Failed to resolve personal DB for user ${params.userId}:`, err);
      }
    }
  }

  return id;
}

/**
 * Selective SELECT query for a user's Inbox Screen (Rule 5 & Soft Delete Rule 4)
 */
export async function getUserInboxItems(
  dbUrl: string,
  authToken: string,
  userId: string,
  options: {
    status?: number;
    limit?: number;
    offset?: number;
  } = {}
): Promise<any[]> {
  const limit = options.limit ?? 50;
  const status = options.status ?? 1;

  const sql = `
    SELECT id, user_id, workspace_id, workspace_name, type, title, ref, priority, due, status, created_at
    FROM inbox
    WHERE user_id = ? AND status = ? AND deleted_at IS NULL
    ORDER BY priority DESC, created_at DESC
    LIMIT ?
  `;

  return (await executeWorkspaceTursoQuery(dbUrl, authToken, sql, [userId, status, limit])) || [];
}

/**
 * Soft delete an inbox item (Rule 4)
 */
export async function softDeleteInboxItem(
  dbUrl: string,
  authToken: string,
  inboxId: string
): Promise<void> {
  const sql = `UPDATE inbox SET deleted_at = unixepoch() WHERE id = ?`;
  await executeWorkspaceTursoQuery(dbUrl, authToken, sql, [inboxId]);
}

/**
 * Mark an inbox item status (e.g. status=2 for done/completed)
 */
export async function updateInboxItemStatus(
  dbUrl: string,
  authToken: string,
  inboxId: string,
  status: number = 2
): Promise<void> {
  const sql = `UPDATE inbox SET status = ? WHERE id = ? AND deleted_at IS NULL`;
  await executeWorkspaceTursoQuery(dbUrl, authToken, sql, [status, inboxId]);
}

/**
 * Routes a workspace motion event to target staff's personal DBs.
 * Uses structural graph queries (assigned_to, served_by, works_at, owned_by).
 */
export async function routeWorkspaceMotionToInbox(
  workspaceDbUrl: string,
  workspaceAuthToken: string,
  workspaceId: string,
  workspaceName: string,
  motion: {
    type: number;
    ref?: string;
    data?: any;
    by?: string;
  }
): Promise<void> {
  try {
    const data = typeof motion.data === 'string' ? JSON.parse(motion.data || '{}') : (motion.data || {});
    let targetUserIds: string[] = [];

    // 1. If assigned or served target exists in motion data
    if (data.assigned_to) targetUserIds.push(data.assigned_to);
    if (data.served_by) targetUserIds.push(data.served_by);
    if (data.staff_id) targetUserIds.push(data.staff_id);

    // 2. Query workspace graph for assigned staff on the entity / table / card
    const targetEntityId = motion.ref || data.table_id || data.order_id || data.card_id;
    if (targetEntityId) {
      // Find staff assigned_to (5), served_by (15), owned_by (10), or placed_by (1)
      const graphLinks = await executeWorkspaceTursoQuery(
        workspaceDbUrl,
        workspaceAuthToken,
        `SELECT tgt FROM graph WHERE src = ? AND rel IN (?, ?, ?, ?) AND deleted_at IS NULL`,
        [
          targetEntityId,
          GRAPH_REL_TYPES.assigned_to,
          GRAPH_REL_TYPES.served_by,
          GRAPH_REL_TYPES.owned_by,
          GRAPH_REL_TYPES.works_at,
        ]
      );
      if (Array.isArray(graphLinks)) {
        for (const row of graphLinks) {
          if (row.tgt) targetUserIds.push(row.tgt);
        }
      }
    }

    // Deduplicate
    targetUserIds = Array.from(new Set(targetUserIds.filter(Boolean)));

    // Generate inbox item based on motion type
    let inboxTitle = 'New workspace task';
    let inboxType: number = INBOX_TYPES.task;
    let priority = 2;

    switch (motion.type) {
      case 124: // order_placed
        inboxTitle = `Order placed: #${motion.ref || 'new'}`;
        inboxType = INBOX_TYPES.task;
        priority = 3;
        break;
      case 125: // order_ready
        inboxTitle = `Order #${motion.ref || 'order'} is ready — serve now`;
        inboxType = INBOX_TYPES.task;
        priority = 3;
        break;
      case 126: // order_served
        inboxTitle = `Order #${motion.ref || 'order'} served`;
        inboxType = INBOX_TYPES.notification;
        priority = 1;
        break;
      case 101: // sale
        inboxTitle = `Sale completed ($${data.amt || data.total || 0})`;
        inboxType = INBOX_TYPES.notification;
        priority = 1;
        break;
      case 102: // refund
        inboxTitle = `Approval required: Refund request ($${data.amt || data.amount || 0})`;
        inboxType = INBOX_TYPES.approval;
        priority = 3;
        break;
      case 110: // stock_adjust
      case 111: // stock_writeoff
        if (data.qty !== undefined && data.min_qty !== undefined && data.qty < data.min_qty) {
          inboxTitle = `Low stock alert: ${data.name || data.sku || 'Item'} (${data.qty} remaining)`;
          inboxType = INBOX_TYPES.alert;
          priority = 3;
        }
        break;
      case 118: // clock_in
        inboxTitle = `Clocked in successfully`;
        inboxType = INBOX_TYPES.notification;
        priority = 1;
        break;
      case 119: // clock_out
        inboxTitle = `Shift complete — handover ready`;
        inboxType = INBOX_TYPES.notification;
        priority = 1;
        break;
    }

    // Push to all identified target users' personal DBs
    for (const userId of targetUserIds) {
      await pushToPersonalInbox({
        userId,
        workspaceId,
        workspaceName,
        type: inboxType,
        title: inboxTitle,
        ref: motion.ref,
        priority,
        status: 1,
        data,
      });
    }
  } catch (err) {
    console.warn('[inbox] routeWorkspaceMotionToInbox failed:', err);
  }
}

/**
 * Query user timeline (motions) across joined workspaces.
 */
export async function getUserTimeline(
  userId: string,
  options: { limit?: number; since?: string } = {}
): Promise<{ rows: any[]; count: number }> {
  const env = envContext.getStore();
  if (env?.DB) {
    try {
      const userDbRecord = await (env.DB as any).prepare(
        'SELECT turso_url, turso_auth_token FROM workspaces WHERE scope = ? OR subdomain = ?'
      ).bind(`u:${userId}`, `user-${userId}`).first();

      if (userDbRecord?.turso_url && userDbRecord?.turso_auth_token) {
        const rows = (await executeWorkspaceTursoQuery(
          userDbRecord.turso_url,
          userDbRecord.turso_auth_token,
          'SELECT id, type, ref, data, by, at, scope FROM motion WHERE deleted_at IS NULL ORDER BY at DESC LIMIT ?',
          [options.limit || 50]
        )) || [];
        return { rows, count: rows.length };
      }
    } catch (err) {
      console.warn('[inbox] getUserTimeline error:', err);
    }
  }
  return { rows: [], count: 0 };
}
