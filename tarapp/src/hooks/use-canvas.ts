import { useState, useEffect, useCallback, useMemo } from 'react';
import { tar } from '@/lib/tar';
import {
  parseCanvasMarkdown,
  resolveRoleCanvas,
  getDefaultCanvasDoc,
  type CanvasDocument,
  type CanvasBlock,
  type CanvasChip,
  type CanvasAction,
} from '@/lib/canvas';
import { getCachedManifest, cacheManifest } from '@/lib/manifest';

export function useCanvas(workspaceScope?: string, userRole: string = 'owner') {
  const [canvasDoc, setCanvasDoc] = useState<CanvasDocument>(() =>
    getDefaultCanvasDoc(workspaceScope || 'ws_default')
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cleanScope = (workspaceScope || '').replace(/^w:/, '');

  const loadCanvas = useCallback(async (silent = false) => {
    if (!cleanScope || cleanScope === 'p') {
      setCanvasDoc(getDefaultCanvasDoc('personal'));
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    try {
      // 1. Instant load from cached manifest if available
      const cached = await getCachedManifest(cleanScope);
      if (cached && cached.blocks?.length) {
        setCanvasDoc({
          schema: 1,
          version: cached.canvas_version || 1,
          blocks: cached.blocks,
          chips: cached.chips,
          actions: cached.actions,
        });
        if (!silent) setLoading(false);
      }

      // 2. Fetch authoritative canvas.md from OKF
      const canvasRes = await tar.okf.read(cleanScope, 'team/canvas.md')
        .catch(() => tar.okf.read(cleanScope, 'canvas.md'))
        .catch(() => null);

      if (canvasRes?.content) {
        const doc = parseCanvasMarkdown(canvasRes.content, cleanScope);
        setCanvasDoc(doc);

        // Update local manifest cache
        void cacheManifest({
          workspace_id: cleanScope,
          name: doc.title || cleanScope,
          subdomain: cleanScope,
          is_owner: userRole === 'owner',
          role: userRole,
          membership_version: 1,
          canvas_version: doc.version,
          registry_version: 1,
          manifest_version: `1.${doc.version}.1`,
          blocks: doc.blocks,
          chips: doc.chips,
          actions: doc.actions,
          cached_at: Date.now(),
        });
      }
    } catch (err) {
      console.warn('[useCanvas] Failed to load canvas:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cleanScope, userRole]);

  useEffect(() => {
    loadCanvas();
  }, [loadCanvas]);

  const roleResolved = useMemo(() => {
    return resolveRoleCanvas(canvasDoc, userRole);
  }, [canvasDoc, userRole]);

  return {
    doc: canvasDoc,
    blocks: roleResolved.visibleBlocks,
    chips: roleResolved.visibleChips,
    actions: roleResolved.searchableActions,
    loading,
    refreshing,
    refresh: () => {
      setRefreshing(true);
      return loadCanvas(true);
    },
  };
}
