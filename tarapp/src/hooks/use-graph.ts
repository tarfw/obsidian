import { useState, useEffect, useCallback } from 'react';
import { useDb } from '@/db/provider';

export interface GraphRow {
  src: string;
  rel: number | string;
  tgt: string;
  data?: string;
  scope?: string;
  created_at?: string;
  deleted_at?: string;
}

export function useGraph(src?: string, rel?: string | number) {
  const db = useDb();
  const [rows, setRows] = useState<GraphRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    let query = 'SELECT * FROM graph WHERE deleted_at IS NULL';
    const params: any[] = [];
    if (src) { query += ' AND src = ?'; params.push(src); }
    if (rel !== undefined) { query += ' AND rel = ?'; params.push(rel); }
    query += ' ORDER BY created_at DESC';
    setRows(await db.getAllAsync<GraphRow>(query, params).catch(() => []));
    setLoading(false);
  }, [db, src, rel]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [refresh]);

  const link = useCallback(async (srcId: string, tgtId: string, linkRel: string | number) => {
    await db.runAsync(
      'INSERT OR REPLACE INTO graph (src, rel, tgt, created_at) VALUES (?, ?, ?, ?)',
      srcId, linkRel, tgtId, new Date().toISOString()
    );
    await refresh();
  }, [db, refresh]);

  const unlink = useCallback(async (srcId: string, tgtId: string, linkRel: string | number) => {
    await db.runAsync(
      'UPDATE graph SET deleted_at = ? WHERE src = ? AND rel = ? AND tgt = ?',
      new Date().toISOString(), srcId, linkRel, tgtId
    );
    await refresh();
  }, [db, refresh]);

  return { rows, loading, refresh, link, unlink };
}
