import { useState, useEffect, useCallback } from 'react';
import { useDb } from '@/db/provider';

export interface MatterRow {
  id: string;
  type: number | string;
  status?: number;
  parent_id?: string;
  title?: string;
  data?: string;
  scope?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export function useMatter(scope?: string) {
  const db = useDb();
  const [rows, setRows] = useState<MatterRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    let query = 'SELECT * FROM matter WHERE deleted_at IS NULL';
    const params: any[] = [];
    if (scope) { query += ' AND scope = ?'; params.push(scope); }
    query += ' ORDER BY created_at DESC';
    setRows(await db.getAllAsync<MatterRow>(query, params).catch(() => []));
    setLoading(false);
  }, [db, scope]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [refresh]);

  return { rows, loading, refresh };
}
