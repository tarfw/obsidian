/**
 * Projection Pipeline & Local Cache (matter.md §4, §5, §6, §9)
 *
 * Rule: TarApp achieves partial sync by querying authorized read models
 * projected into each user's Personal DB. 0ms local reads from SQLite.
 *
 * Projection delivery is idempotent and version-aware:
 * an older workflow/sync cannot overwrite a newer projection.
 */

import { getUserDb, scheduleSyncPush } from './db';
import { PROJECTION_COLLECTION, toMatterTypeCode } from '../constants/types-config';
import { tar } from './tar';

export interface ProjectionRecord<T = any> {
  id: string;
  workspace_id: string;
  collection: number; // 1=matter, 2=motion, 3=graph, 4=module_read_model
  source_id: string;
  type: number;
  data: T;
  source_version: number;
  expires?: number | null;
  updated: number;
  deleted_at?: number | null;
}

export interface ProjectionUpsertInput<T = any> {
  id?: string;
  workspace_id: string;
  collection: number;
  source_id: string;
  type: number | string;
  data: T;
  source_version: number;
  expires?: number | null;
  deleted_at?: number | null;
}

/**
 * Upserts a projection record into local Personal DB.
 * Idempotent & version-aware: rejects incoming records if existing source_version >= incoming.
 */
export async function upsertProjection(input: ProjectionUpsertInput): Promise<boolean> {
  try {
    const db = getUserDb();
    if (!db) return false;

    const numType = typeof input.type === 'number' ? input.type : toMatterTypeCode(input.type);
    const deterministicId = input.id || `proj_${input.workspace_id}_${input.collection}_${input.source_id}`;
    const now = Date.now();
    const dataJson = typeof input.data === 'string' ? input.data : JSON.stringify(input.data || {});

    // Check existing version first for version awareness
    const existing = await db.all(
      `SELECT source_version, updated FROM projection WHERE workspace_id = ? AND collection = ? AND source_id = ?`,
      [input.workspace_id, input.collection, input.source_id]
    ).catch(() => []);

    if (existing && existing.length > 0) {
      const currentVersion = Number(existing[0].source_version) || 0;
      if (input.source_version < currentVersion) {
        // Reject stale projection overwrite
        return false;
      }
    }

    await db.run(
      `INSERT INTO projection (id, workspace_id, collection, source_id, type, data, source_version, expires, updated, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(workspace_id, collection, source_id) DO UPDATE SET
         id = excluded.id,
         type = excluded.type,
         data = excluded.data,
         source_version = excluded.source_version,
         expires = excluded.expires,
         updated = excluded.updated,
         deleted_at = excluded.deleted_at
       WHERE excluded.source_version >= projection.source_version`,
      [
        deterministicId,
        input.workspace_id,
        input.collection,
        input.source_id,
        numType,
        dataJson,
        input.source_version,
        input.expires || null,
        now,
        input.deleted_at || null,
      ]
    );

    scheduleSyncPush();
    return true;
  } catch (err) {
    console.warn('[Projection] Upsert failed:', err);
    return false;
  }
}

/**
 * Fetch authorized live projections from local SQLite (0ms read latency).
 */
export async function getLocalProjections<T = any>(
  workspaceId: string,
  collection?: number,
  type?: number | string,
  limit: number = 100
): Promise<ProjectionRecord<T>[]> {
  try {
    const db = getUserDb();
    if (!db) return [];

    const now = Date.now();
    let query = `
      SELECT id, workspace_id, collection, source_id, type, data, source_version, expires, updated, deleted_at
      FROM projection
      WHERE workspace_id = ?
        AND deleted_at IS NULL
        AND (expires IS NULL OR expires > ?)
    `;
    const params: any[] = [workspaceId, now];

    if (collection !== undefined) {
      query += ` AND collection = ?`;
      params.push(collection);
    }

    if (type !== undefined) {
      query += ` AND type = ?`;
      params.push(typeof type === 'number' ? type : toMatterTypeCode(type));
    }

    query += ` ORDER BY updated DESC LIMIT ?`;
    params.push(limit);

    const rows = await db.all(query, params).catch(() => []);
    return (rows || []).map((r: any) => ({
      id: r.id,
      workspace_id: r.workspace_id,
      collection: r.collection,
      source_id: r.source_id,
      type: r.type,
      data: typeof r.data === 'string' ? JSON.parse(r.data || '{}') : (r.data || {}),
      source_version: r.source_version,
      expires: r.expires,
      updated: r.updated,
      deleted_at: r.deleted_at,
    }));
  } catch (err) {
    console.warn('[Projection] Local query failed:', err);
    return [];
  }
}

/**
 * Resolves a typed data view reference (matter.md §9: `data_view: sales.today`, `tasks.assigned`, etc.).
 * Queries local SQLite projections first; falls back to or refreshes via Tarai API.
 */
export async function resolveDataView<T = any>(
  workspaceScope: string,
  dataView: string,
  limit: number = 50
): Promise<T[]> {
  const cleanScope = workspaceScope.replace(/^w:/, '');
  if (!cleanScope || cleanScope === 'p') return [];

  try {
    // 1. Map data_view string to projection collection / type if standard
    let collection: number = PROJECTION_COLLECTION.module_read_model;
    let typeCode: number | undefined = undefined;

    if (dataView.startsWith('sales.') || dataView === 'metrics.get' || dataView === 'revenue.today') {
      collection = PROJECTION_COLLECTION.module_read_model;
    } else if (dataView.startsWith('tasks.') || dataView === 'tasks.assigned') {
      collection = PROJECTION_COLLECTION.matter;
      typeCode = toMatterTypeCode('task');
    } else if (dataView.startsWith('inventory.') || dataView === 'products.catalog' || dataView === 'pos.catalog') {
      collection = PROJECTION_COLLECTION.matter;
      typeCode = toMatterTypeCode('product');
    } else if (dataView.startsWith('contacts.') || dataView === 'people.directory') {
      collection = PROJECTION_COLLECTION.matter;
      typeCode = toMatterTypeCode('person');
    } else if (dataView.startsWith('deals.') || dataView === 'pipeline.deals') {
      collection = PROJECTION_COLLECTION.matter;
      typeCode = toMatterTypeCode('flow');
    }

    // 2. Query local SQLite Personal DB first (0ms latency)
    const local = await getLocalProjections<T>(cleanScope, collection, typeCode, limit);
    if (local.length > 0) {
      return local.map((p) => ({
        ...p.data,
        id: p.source_id || p.id,
        _projectionId: p.id,
        _version: p.source_version,
      }));
    }

    // 3. If local cache is empty, fetch authoritative data view from Tarai and cache into local SQLite
    const remote = await tar.dataView(cleanScope, dataView, { limit }).catch(() => ({ rows: [] }));
    const rows = (remote.rows || []) as any[];

    if (rows.length > 0) {
      // Upsert into local projections asynchronously
      for (const row of rows) {
        const sourceId = row.id || `view_${dataView}_${Date.now()}`;
        void upsertProjection({
          workspace_id: cleanScope,
          collection,
          source_id: String(sourceId),
          type: typeCode ?? 1,
          data: row,
          source_version: row.version || row._version || 1,
          expires: Date.now() + 86400000, // 24h freshness
        });
      }
      return rows as T[];
    }

    return [];
  } catch (err) {
    console.warn(`[Projection] resolveDataView failed for "${dataView}":`, err);
    return [];
  }
}

/**
 * Emits tombstones for all projections of a workspace when access ends or membership is revoked.
 */
export async function tombstoneProjections(workspaceId: string): Promise<void> {
  try {
    const db = getUserDb();
    if (!db) return;
    const now = Date.now();
    await db.run(
      `UPDATE projection SET deleted_at = ?, updated = ? WHERE workspace_id = ? AND deleted_at IS NULL`,
      [now, now, workspaceId]
    );
    scheduleSyncPush();
  } catch (err) {
    console.warn('[Projection] Tombstone failed:', err);
  }
}

/**
 * Purge expired projections and old tombstones to keep local SQLite storage bounded.
 */
export async function purgeExpiredProjections(): Promise<void> {
  try {
    const db = getUserDb();
    if (!db) return;
    const now = Date.now();
    // Delete expired projections or tombstones older than 7 days
    const sevenDaysAgo = now - 7 * 86400000;
    await db.run(
      `DELETE FROM projection WHERE (expires IS NOT NULL AND expires < ?) OR (deleted_at IS NOT NULL AND deleted_at < ?)`,
      [now, sevenDaysAgo]
    );
  } catch (err) {
    console.warn('[Projection] Purge expired failed:', err);
  }
}
