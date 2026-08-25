import { useState, useEffect, useCallback } from 'react';
import { useDb } from '@/db/provider';
import { MATTER_TYPE_NAMES, toMatterTypeCode } from '@/constants/types-config';

export interface MatterRow {
  id: string;
  type: number | string;
  typeName?: string;
  state?: number;
  status?: number;
  version?: number;
  title?: string;
  data?: Record<string, unknown>;
  created?: number;
  updated?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: number | null;
  [key: string]: unknown;
}

function parseRow(row: any): MatterRow {
  let parsedData: Record<string, unknown> = {};
  if (typeof row.data === 'string') {
    try { parsedData = JSON.parse(row.data); } catch { parsedData = {}; }
  } else if (typeof row.data === 'object' && row.data !== null) {
    parsedData = row.data;
  }

  const numType = typeof row.type === 'number' ? row.type : toMatterTypeCode(row.type);
  const typeName = MATTER_TYPE_NAMES[numType] || String(numType);

  return {
    ...parsedData,
    id: String(row.source_id || row.id || ''),
    type: numType,
    typeName,
    state: typeof row.state === 'number' ? row.state : 1,
    status: typeof row.status === 'number' ? row.status : (typeof row.state === 'number' ? row.state : 1),
    version: typeof row.version === 'number' ? row.version : (typeof row.source_version === 'number' ? row.source_version : 1),
    title: String(parsedData.title || parsedData.name || parsedData.fn || `Item #${String(row.id || '').slice(-4)}`),
    data: parsedData,
    created: typeof row.created === 'number' ? row.created : undefined,
    updated: typeof row.updated === 'number' ? row.updated : undefined,
    created_at: typeof row.created === 'number' ? new Date(row.created).toISOString() : (row.created_at || ''),
    updated_at: typeof row.updated === 'number' ? new Date(row.updated).toISOString() : (row.updated_at || ''),
    deleted_at: row.deleted_at || null,
  };
}

export function useMatter(scope?: string, filterType?: string | number) {
  const db = useDb();
  const [rows, setRows] = useState<MatterRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      let rawRows: any[] = [];
      const cleanScope = scope?.replace(/^w:/, '');

      if (cleanScope && cleanScope !== 'p' && cleanScope !== 'personal') {
        // Query authorized projections from Personal DB
        let query = 'SELECT * FROM projection WHERE deleted_at IS NULL AND workspace_id = ?';
        const params: any[] = [cleanScope];
        if (filterType !== undefined) {
          query += ' AND type = ?';
          params.push(typeof filterType === 'number' ? filterType : toMatterTypeCode(filterType));
        }
        query += ' ORDER BY updated DESC';
        rawRows = await db.getAllAsync<any>(query, params).catch(() => []);
      } else {
        // Query personal matter
        let query = 'SELECT * FROM matter WHERE deleted_at IS NULL';
        const params: any[] = [];
        if (filterType !== undefined) {
          query += ' AND type = ?';
          params.push(typeof filterType === 'number' ? filterType : toMatterTypeCode(filterType));
        }
        query += ' ORDER BY updated DESC';
        rawRows = await db.getAllAsync<any>(query, params).catch(() => []);
      }

      setRows(rawRows.map(parseRow));
    } catch (e) {
      console.warn('[useMatter] query error:', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [db, scope, filterType]);

  useEffect(() => { refresh(); }, [refresh]);

  return { rows, loading, refresh };
}

