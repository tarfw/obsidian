/**
 * TAR Site Bot React Hook (parv2.md §13, §16)
 *
 * Workspace-isolated state management for Site Studio.
 * Routes all operations through Harness Gateway actions:
 * - site.get
 * - site.generate
 * - site.update
 * - site.publish
 * - site.rollback
 * - site.refresh
 *
 * Fully removes legacy matter queries and unverified *.tarai.space endpoints.
 */

import { useState, useEffect, useCallback } from 'react';
import { harness } from '@/lib/harness';
import {
  type CardDefinition,
  type ReleaseManifest,
  type SiteDefinition,
  type SiteLayout,
  type SitePatchOperation,
  siteDefinitionToLayout,
  layoutToSiteDefinition,
} from '@/lib/site-schema';

export interface UseSiteState {
  site: SiteDefinition | null;
  siteId: string | null;
  version: number;
  state: 'idle' | 'draft' | 'live' | 'error';
  loading: boolean;
  error: string | null;
  liveUrl: string | null;
  preview: { html: string; css: string; hash: string } | null;
  releases: ReleaseManifest[];
  cards: CardDefinition[];

  // Legacy compatibility fields
  draft: SiteLayout | null;
  published: SiteLayout | null;

  // Actions
  refresh: () => Promise<void>;
  generate: (input: { title?: string; prompt?: string; theme?: string }) => Promise<void>;
  updateCards: (operations: SitePatchOperation[]) => Promise<void>;
  publish: (subdomainOverride?: string) => Promise<void>;
  rollback: (releaseId: string) => Promise<void>;
  refreshPosCatalog: () => Promise<{ itemCount: number }>;
  saveDraft: (layout: SiteLayout) => Promise<void>;
}

export function useSite(slugOrScope?: string): UseSiteState {
  const slug = (slugOrScope || '').replace(/^w:/, '').trim();

  const [site, setSite] = useState<SiteDefinition | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [version, setVersion] = useState<number>(1);
  const [siteState, setSiteState] = useState<'idle' | 'draft' | 'live' | 'error'>('idle');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ html: string; css: string; hash: string } | null>(null);

  const refresh = useCallback(async () => {
    if (!slug) {
      setSite(null);
      setSiteId(null);
      setSiteState('idle');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await harness.site.get(slug);
      if (res.site && res.site.data) {
        const data = res.site.data;
        setSite(data);
        setSiteId(res.site.id);
        setVersion(res.site.version);
        setSiteState(res.site.state === 'live' ? 'live' : 'draft');
        if (res.site.state === 'live') {
          setLiveUrl(`/v1/sites/${encodeURIComponent(slug)}`);
        }
      } else {
        // Explicit empty state (no cross-workspace fallback)
        setSite(null);
        setSiteId(null);
        setSiteState('idle');
        setLiveUrl(null);
      }
    } catch (err: any) {
      console.warn('[useSite] Refresh error:', err?.message || err);
      setError(err?.message || 'Failed to fetch site.');
      setSiteState('error');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    refresh();
  }, [slug, refresh]);

  const generate = useCallback(
    async (input: { title?: string; prompt?: string; theme?: string }) => {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const res = await harness.site.generate(slug, input);
        setSite(res.site);
        setSiteId(res.siteId);
        setVersion(res.version);
        setSiteState('draft');
        setPreview(res.preview);
      } catch (err: any) {
        setError(err?.message || 'Site generation failed.');
        setSiteState('error');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [slug]
  );

  const updateCards = useCallback(
    async (operations: SitePatchOperation[]) => {
      if (!slug || !siteId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await harness.site.update(slug, siteId, version, operations);
        setSite(res.site);
        setVersion(res.version);
      } catch (err: any) {
        setError(err?.message || 'Site update failed.');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [slug, siteId, version]
  );

  const publish = useCallback(
    async (subdomainOverride?: string) => {
      if (!slug) return;
      if (!siteId) {
        // Auto-generate draft first if publishing without existing site
        await generate({ title: slug });
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const sub = subdomainOverride || slug;
        const res = await harness.site.publish(slug, siteId, sub);
        setSiteState('live');
        setLiveUrl(res.liveUrl);
        await refresh();
      } catch (err: any) {
        setError(err?.message || 'Site publication failed.');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [slug, siteId, generate, refresh]
  );

  const rollback = useCallback(
    async (releaseId: string) => {
      if (!slug || !siteId) return;
      setLoading(true);
      setError(null);
      try {
        await harness.site.rollback(slug, siteId, releaseId);
        await refresh();
      } catch (err: any) {
        setError(err?.message || 'Site rollback failed.');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [slug, siteId, refresh]
  );

  const refreshPosCatalog = useCallback(async () => {
    if (!slug || !siteId) return { itemCount: 0 };
    const res = await harness.site.refresh(slug, siteId);
    await refresh();
    return { itemCount: res.itemCount };
  }, [slug, siteId, refresh]);

  // Compatibility adapters for existing UI
  const draft: SiteLayout | null = site ? siteDefinitionToLayout(site) : null;
  const published: SiteLayout | null = siteState === 'live' && site ? siteDefinitionToLayout(site) : null;

  const saveDraft = useCallback(
    async (layout: SiteLayout) => {
      const converted = layoutToSiteDefinition(layout, slug);
      if (!siteId) {
        await generate({ title: slug, theme: layout.template });
      } else {
        const ops: SitePatchOperation[] = [
          { op: 'set_theme', value: converted.design.theme },
          ...(converted.pages[0]?.cards || []).map(
            (c): SitePatchOperation => ({
              op: 'update_card',
              value: c,
            })
          ),
        ];
        await updateCards(ops);
      }
    },
    [slug, siteId, generate, updateCards]
  );

  const cards = site?.pages[0]?.cards || [];
  const releases = site?.releases || [];

  return {
    site,
    siteId,
    version,
    state: siteState,
    loading,
    error,
    liveUrl,
    preview,
    releases,
    cards,
    draft,
    published,
    refresh,
    generate,
    updateCards,
    publish,
    rollback,
    refreshPosCatalog,
    saveDraft,
  };
}
