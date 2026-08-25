import { useState, useEffect, useCallback } from 'react';
import { useDb } from '@/db/provider';
import { toGraphRelCode, GRAPH_KIND_NAMES } from '@/constants/types-config';
import { tar } from '@/lib/tar';

export interface GraphRow {
  id?: string;
  source: string;
  target: string;
  kind: number;
  kindName?: string;
  src: string;
  tgt: string;
  rel: number;
  data?: Record<string, unknown>;
  version?: number;
  created?: number;
  updated?: number;
  created_at?: string;
  deleted_at?: number | null;
}

function parseGraphRow(row: any): GraphRow {
  let data: Record<string, unknown> = {};
  if (typeof row.data === 'string') {
    try { data = JSON.parse(row.data); } catch { data = {}; }
  } else if (typeof row.data === 'object' && row.data !== null) {
    data = row.data;
  }

  const source = String(row.source || row.src || '');
  const target = String(row.target || row.tgt || '');
  const kind = typeof row.kind === 'number' ? row.kind : (typeof row.rel === 'number' ? row.rel : toGraphRelCode(row.kind || row.rel));

  return {
    id: row.id,
    source,
    target,
    kind,
    kindName: GRAPH_KIND_NAMES[kind] || String(kind),
    src: source,
    tgt: target,
    rel: kind,
    data,
    version: row.version || 1,
    created: typeof row.created === 'number' ? row.created : undefined,
    updated: typeof row.updated === 'number' ? row.updated : undefined,
    created_at: typeof row.created === 'number' ? new Date(row.created).toISOString() : (row.created_at || ''),
    deleted_at: row.deleted_at || null,
  };
}

export function useGraph(sourceId?: string, kindRel?: string | number, scope?: string) {
  const db = useDb();
  const [rows, setRows] = useState<GraphRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      let query = 'SELECT * FROM graph WHERE deleted_at IS NULL';
      const params: any[] = [];
      if (sourceId) {
        query += ' AND (source = ? OR target = ?)';
        params.push(sourceId, sourceId);
      }
      if (kindRel !== undefined) {
        query += ' AND kind = ?';
        params.push(typeof kindRel === 'number' ? kindRel : toGraphRelCode(kindRel));
      }
      query += ' ORDER BY updated DESC';
      const rawRows = await db.getAllAsync<any>(query, params).catch(() => []);
      setRows(rawRows.map(parseGraphRow));
    } catch (e) {
      console.warn('[useGraph] query error:', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [db, sourceId, kindRel]);

  useEffect(() => { refresh(); }, [refresh]);

  const link = useCallback(async (srcId: string, tgtId: string, linkKind: string | number) => {
    await tar.tool('create', {
      table: 'graph',
      source: srcId,
      target: tgtId,
      kind: linkKind,
      scope: scope || 'p',
    }).catch((e) => console.warn('[useGraph] link failed:', e));
    await refresh();
  }, [refresh, scope]);

  const unlink = useCallback(async (srcId: string, tgtId: string, linkKind: string | number) => {
    await tar.tool('delete', {
      table: 'graph',
      source: srcId,
      target: tgtId,
      kind: linkKind,
      scope: scope || 'p',
    }).catch((e) => console.warn('[useGraph] unlink failed:', e));
    await refresh();
  }, [refresh, scope]);

  return { rows, loading, refresh, link, unlink };
}

