/**
 * Pexels placeholder photography: fetched at design time only, stored as
 * approved workspace assets, and wired into the hero and split slots.
 *
 * Public pages never touch Pexels — visitors read compiled releases from R2.
 * Every asset carries provenance (source page, Pexels License, photographer
 * credit) and is marked `placeholder` so the studio invites the owner to
 * swap in their own photography. If no key is configured the site keeps its
 * typographic skeleton.
 */

import type { Client } from '@libsql/client/web';
import type { AccessContext } from '../types.ts';
import type { Asset, SiteDocument } from './document.ts';
import { attach, store, type StoredAsset } from './asset.ts';
import type { PatchOperation } from './patch.ts';

const STOPWORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'build', 'but', 'by', 'for', 'from', 'give', 'in', 'into', 'is', 'it', 'like', 'make', 'me', 'my', 'of', 'on', 'or', 'our', 'shop', 'site', 'store', 'style', 'that', 'the', 'this', 'to', 'us', 'use', 'want', 'website', 'with', 'live', 'prices', 'page']);

export function termsFromBrief(goal: string, title: string): string {
  const words = `${title} ${goal}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word) && !/^\d+$/.test(word));
  return [...new Set(words)].slice(0, 3).join(' ') || 'fashion editorial';
}

interface PexelsPhoto {
  id: number;
  alt?: string;
  photographer?: string;
  url?: string;
  width?: number;
  height?: number;
  src?: Record<string, string>;
}

async function download(url: string): Promise<Uint8Array | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  const buffer = await response.arrayBuffer();
  return buffer.byteLength ? new Uint8Array(buffer) : null;
}

/**
 * Fetch up to three approved placeholder images and wire them into the
 * document: the first landscape crop becomes the hero media, the next two
 * become a split editorial section when the home page has none.
 */
export async function applyPexels(
  bucket: R2Bucket | undefined,
  client: Client,
  context: AccessContext,
  siteId: string,
  apiKey: string,
  doc: SiteDocument,
): Promise<{ version: number; revision: number; assets: (Asset | StoredAsset)[]; site: SiteDocument } | null> {
  if (!bucket) return null;
  const title = doc.pages[0]?.title || '';
  const query = termsFromBrief(doc.brief?.goal || '', title);
  const search = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=8&orientation=landscape`, {
    headers: { Authorization: apiKey },
  });
  if (!search.ok) return null;
  const photos = ((await search.json().catch(() => null)) as { photos?: PexelsPhoto[] } | null)?.photos || [];
  const chosen = photos.filter((photo) => photo.src?.landscape || photo.src?.large).slice(0, 3);
  if (!chosen.length) return null;

  const stored: StoredAsset[] = [];
  for (const [index, photo] of chosen.entries()) {
    const url = index === 0 ? (photo.src!.landscape || photo.src!.large) : photo.src!.large;
    const bytes = await download(url);
    if (!bytes) continue;
    const asset = await store(bucket, context, siteId, {
      mime: 'image/jpeg', kind: 'image', bytes,
      alt: (photo.alt || `Placeholder photography by ${photo.photographer || 'Pexels'}`).slice(0, 300),
      source: photo.url || 'https://www.pexels.com',
      license: 'Pexels License',
      approved: true,
      ...(photo.width ? { width: photo.width } : {}),
      ...(photo.height ? { height: photo.height } : {}),
      placeholder: true,
    });
    stored.push(asset);
  }
  if (!stored.length) return null;

  const operations: PatchOperation[] = stored.map((asset): PatchOperation => ({ op: 'add_asset', asset: asset as never }));
  const home = doc.pages.find((page) => page.path === '/') || doc.pages[0];
  const hero = home?.sections.find((section) => section.id === 'hero' || section.purpose === 'introduction');
  const hasImage = hero?.nodes.some((node) => node.kind === 'image');
  if (hero && !hasImage && stored[0]) {
    operations.push({ op: 'add_node', parent: hero.id, index: 0, node: { id: `${hero.id}-media`, kind: 'image', props: { asset: stored[0].id, alt: stored[0].alt || title } } });
  }
  const hasSplit = home?.sections.some((section) => section.purpose === 'split');
  if (home && !hasSplit && stored.length >= 3) {
    operations.push({
      op: 'add_section', page: home.id, index: Math.min(3, home.sections.length),
      section: {
        id: 'split', purpose: 'split', layout: { kind: 'flex' },
        style: { base: { gap: 'sm', align: 'stretch' } },
        nodes: stored.slice(1, 3).map((asset): { id: string; kind: 'image'; props: Record<string, unknown> } => ({ id: `split-${asset.id}`, kind: 'image', props: { asset: asset.id, alt: asset.alt || title } })),
      },
    });
  }
  const result = await attach(client, context, siteId, operations, `pexels_${crypto.randomUUID()}`, `pexels_${crypto.randomUUID()}`, 'site.pexels');
  return { version: Number(result.version), revision: Number(result.revision), assets: result.assets as (Asset | StoredAsset)[], site: result.site as unknown as SiteDocument };
}
