import { useState, useEffect, useCallback } from 'react';
import { useDb } from '@/db/provider';
import { getLocalProjections, resolveDataView, type ProjectionRecord } from '@/lib/projection';
import { toMatterTypeCode } from '@/constants/types-config';

export interface UseProjectionsOptions {
  collection?: number;
  type?: number | string;
  dataView?: string;
  limit?: number;
  autoRefreshRemote?: boolean;
}

export function useProjections<T = any>(
  workspaceScope?: string,
  options: UseProjectionsOptions = {}
) {
  const db = useDb();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const cleanScope = (workspaceScope || '').replace(/^w:/, '');

  const refresh = useCallback(async () => {
    if (!cleanScope || cleanScope === 'p' || cleanScope === 'personal') {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (options.dataView) {
        const rows = await resolveDataView<T>(cleanScope, options.dataView, options.limit || 50);
        setData(rows);
      } else {
        const projections = await getLocalProjections<T>(
          cleanScope,
          options.collection,
          options.type,
          options.limit || 50
        );
        setData(projections.map((p) => ({
          ...p.data,
          id: p.source_id || p.id,
          _projectionId: p.id,
          _version: p.source_version,
        })));
      }
    } catch (err) {
      console.warn('[useProjections] Query failed:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [cleanScope, options.collection, options.type, options.dataView, options.limit, db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}
