import type { Client } from '@libsql/client/web';
import { badRequest, conflict, notFound, unavailable } from '../errors.ts';
import { eventStatement } from '../gateway/commit.ts';
import type { AccessContext } from '../types.ts';
import { compileSiteHtml } from './renderer.ts';
import { chooseSiteTheme } from './judgment.ts';
import {
  CARD_KINDS, DEFAULT_DESIGN_TOKENS, type CardDefinition, type PageDefinition,
  type ReleaseFile, type ReleaseManifest, type SiteDefinition, type SitePatchOperation, type ThemeName,
} from './schema.ts';

const now = () => Date.now();
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, max = 240) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const hash = async (value: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const filePath = (page: PageDefinition) => page.path === '/' ? '/index.html' : `/${page.path.replace(/^\/+|\/+$/g, '')}/index.html`;

function navigation(title: string): CardDefinition {
  return { id: 'navigation', kind: 'navigation', version: 1, props: { brand: title, links: [
    { label: 'Home', href: '/' }, { label: 'Catalog', href: '/catalog' }, { label: 'About', href: '/about' }, { label: 'Contact', href: '/contact' },
  ] } };
}

function footer(title: string): CardDefinition {
  return { id: 'footer', kind: 'footer', version: 1, props: { brand: title, text: `© ${new Date().getFullYear()} ${title}`, links: [] } };
}

export function createDefaultSite(title: string, prompt: string, theme: ThemeName = 'editorial-chalk'): SiteDefinition {
  const description = text(prompt, 500) || `${title} online`;
  const pages: PageDefinition[] = [
    { id: 'home', path: '/', title: 'Home', meta: { description }, cards: [
      navigation(title),
      { id: 'hero', kind: 'hero', version: 1, title, props: { headline: title, subtext: description, primaryCta: { label: 'Explore', href: '/catalog' }, secondaryCta: { label: 'Contact', href: '/contact' } } },
      { id: 'features', kind: 'features', version: 1, title: 'What we offer', props: { features: [] } },
      { id: 'proof', kind: 'proof', version: 1, title: 'Trusted by customers', props: { testimonials: [] } },
      { id: 'cta', kind: 'cta', version: 1, title: 'Ready to begin?', props: { headline: `Talk to ${title}`, text: description, buttonLabel: 'Contact us', href: '/contact' } },
      footer(title),
    ] },
    { id: 'catalog', path: '/catalog', title: 'Catalog', meta: { description: `Browse ${title}` }, cards: [
      navigation(title),
      { id: 'catalog', kind: 'collection', version: 1, title: 'Catalog', props: { items: [] }, bindings: [{ slot: 'items', query: 'catalog.public', version: 1, access: 'public', freshness: 300, empty: { items: [] } }] },
      { id: 'faq', kind: 'faq', version: 1, title: 'Questions', props: { items: [] } },
      footer(title),
    ] },
    { id: 'about', path: '/about', title: 'About', meta: { description: `About ${title}` }, cards: [
      navigation(title), { id: 'about', kind: 'content', version: 1, title: `About ${title}`, props: { body: description } },
      { id: 'about-proof', kind: 'proof', version: 1, title: 'Our work', props: { testimonials: [] } }, footer(title),
    ] },
    { id: 'contact', path: '/contact', title: 'Contact', meta: { description: `Contact ${title}` }, cards: [
      navigation(title), { id: 'hours', kind: 'hours', version: 1, title: 'Hours', props: { schedule: [] } },
      { id: 'contact-details', kind: 'contact', version: 1, title: 'Contact', props: {} },
      { id: 'enquiry', kind: 'form', version: 1, title: 'Send an enquiry', props: { submitLabel: 'Send enquiry' }, actions: [{ id: 'enquiry', label: 'Send enquiry', target: 'record.create', payload: { type: 'enquiry' } }] },
      footer(title),
    ] },
  ];
  return {
    schema: '1.0.0', design: DEFAULT_DESIGN_TOKENS[theme] || DEFAULT_DESIGN_TOKENS['editorial-chalk'],
    locale: 'en', timezone: 'Asia/Kolkata', currency: 'INR', pages,
    journeys: [{ id: 'enquiry', title: 'Customer enquiry', target: 'record.create', version: 1, input: { type: 'enquiry' }, outcome: 'Enquiry appears in Now' }],
    variants: [], surfaces: [], policy: { publicOrdering: false, publicEnquiry: false, allowedCurrencies: ['INR'] },
  };
}

export async function getSiteRecord(client: Client, siteId?: string): Promise<{ id: string; version: number; state: string; data: SiteDefinition } | null> {
  const result = await client.execute(siteId
    ? { sql: "SELECT * FROM records WHERE id=? AND type='site' AND archived IS NULL LIMIT 1", args: [siteId] }
    : "SELECT * FROM records WHERE type='site' AND archived IS NULL ORDER BY CASE WHEN state='live' THEN 0 ELSE 1 END,updated DESC,created DESC LIMIT 1");
  const row = result.rows[0];
  return row ? { id: String(row.id), version: Number(row.version), state: String(row.state), data: object(JSON.parse(String(row.data))) as unknown as SiteDefinition } : null;
}

function validateSite(site: SiteDefinition): void {
  if (!site || site.schema !== '1.0.0' || !Array.isArray(site.pages) || !site.pages.length || site.pages.length > 50
    || JSON.stringify(site).length > 1_000_000) throw badRequest('Site definition is invalid.');
  if (site.policy.publicEnquiry || site.policy.publicOrdering) {
    throw badRequest('Public journeys require a configured public Action Gateway.');
  }
  const paths = new Set<string>();
  for (const page of site.pages) {
    if (typeof page.path !== 'string' || !/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(page.path)
      || paths.has(page.path) || !Array.isArray(page.cards) || page.cards.length > 100
      || typeof page.title !== 'string' || !page.title.trim() || page.title.length > 200) throw badRequest('Site page path or card count is invalid.');
    paths.add(page.path);
    const ids = new Set<string>();
    for (const card of page.cards) {
      if (!card || !CARD_KINDS.includes(card.kind) || typeof card.id !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(card.id)
        || ids.has(card.id) || card.version !== 1 || !card.props || typeof card.props !== 'object' || Array.isArray(card.props)) throw badRequest('Site card is invalid.');
      ids.add(card.id);
      if ((card.kind === 'navigation' || card.kind === 'footer') && card.props.links !== undefined && !Array.isArray(card.props.links)) throw badRequest('Site links are invalid.');
      for (const link of Array.isArray(card.props.links) ? card.props.links : []) {
        const href = object(link).href;
        if (typeof href !== 'string' || !safePublicHref(href)) throw badRequest('Site link must use a page path, HTTPS URL, email or phone link.');
      }
      const hrefs = card.kind === 'hero' ? [object(card.props.primaryCta).href, object(card.props.secondaryCta).href]
        : card.kind === 'cta' ? [card.props.href] : [];
      if (hrefs.some((href) => href !== undefined && (typeof href !== 'string' || !safePublicHref(href)))) throw badRequest('Site action link is invalid.');
      for (const binding of card.bindings || []) {
        if (binding.query !== 'catalog.public' || binding.slot !== 'items' || card.kind !== 'collection'
          || binding.version !== 1 || binding.access !== 'public' || !Number.isSafeInteger(binding.freshness)
          || binding.freshness < 0 || binding.freshness > 86_400) throw badRequest('Site binding is not registered.');
      }
    }
  }
}

function safePublicHref(value: string): boolean {
  if (!value || /[\u0000-\u001f\u007f\\]/.test(value)) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  if (/^#[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) return true;
  try { return ['https:', 'mailto:', 'tel:'].includes(new URL(value).protocol); }
  catch { return false; }
}

async function publicCatalog(client: Client): Promise<Record<string, unknown>[]> {
  const variants = await client.execute(`SELECT v.title AS title,v.data AS variant,p.data AS price FROM records v
    JOIN records p ON p.type='price' AND p.state='active' AND p.archived IS NULL AND json_extract(p.data,'$.variant')=v.id
    WHERE v.type='variant' AND v.state='active' AND v.archived IS NULL ORDER BY v.title,v.id LIMIT 100`);
  if (variants.rows.length) return variants.rows.map((row) => {
    const variant = object(JSON.parse(String(row.variant)));
    const price = object(JSON.parse(String(row.price)));
    const amount = Number(price.amount);
    return {
      title: String(row.title), description: text(variant.description, 500),
      ...(Number.isSafeInteger(amount) && amount >= 0 && /^[A-Z]{3}$/.test(String(price.currency))
        ? { price: amount, currency: String(price.currency) } : {}),
    };
  });
  const settings = await client.execute("SELECT data FROM records WHERE type='pos.settings' AND archived IS NULL LIMIT 1");
  const currency = settings.rows[0] ? text(object(JSON.parse(String(settings.rows[0].data))).currency, 3) : '';
  const products = await client.execute("SELECT title,data FROM records WHERE type='pos.product' AND state='active' AND archived IS NULL ORDER BY title,id LIMIT 100");
  return products.rows.map((row) => {
    const product = object(JSON.parse(String(row.data)));
    const amount = Number(product.price);
    return {
      title: String(row.title), description: text(product.shortDescription || product.contentSummary, 500),
      ...(Number.isSafeInteger(amount) && amount >= 0 && /^[A-Z]{3}$/.test(currency)
        ? { price: amount, currency } : {}),
    };
  });
}

async function resolveBindings(client: Client, site: SiteDefinition): Promise<{ site: SiteDefinition; itemCount: number }> {
  if (!site.pages.some((page) => page.cards.some((card) => card.bindings?.length))) return { site, itemCount: 0 };
  const items = await publicCatalog(client);
  const pages = site.pages.map((page) => ({ ...page, cards: page.cards.map((card) =>
    card.bindings?.some((binding) => binding.query === 'catalog.public' && binding.slot === 'items')
      ? { ...card, props: { ...card.props, items } } : card) }));
  return { site: { ...site, pages }, itemCount: items.length };
}

async function compileAll(client: Client, site: SiteDefinition) {
  validateSite(site);
  const resolved = await resolveBindings(client, site);
  const rendered = await Promise.all(resolved.site.pages.map(async (page, index) => ({ page, rendered: await compileSiteHtml(resolved.site, index) })));
  const files = await Promise.all(rendered.map(async ({ page, rendered }) => ({ path: filePath(page), mime: 'text/html; charset=utf-8', body: rendered.html, hash: await hash(rendered.html) })));
  const css = rendered[0].rendered.css;
  files.push({ path: '/style.css', mime: 'text/css; charset=utf-8', body: css, hash: await hash(css) });
  return { files, hash: await hash(files.map((file) => `${file.path}:${file.hash}`).join('|')), itemCount: resolved.itemCount };
}

function manifestFile(prefix: string, release: string, file: { path: string; mime: string; body: string; hash: string }): ReleaseFile {
  return { path: file.path, mime: file.mime, bytes: new TextEncoder().encode(file.body).byteLength, hash: file.hash, key: `${prefix}/${release}${file.path}` };
}

async function saveRelease(client: Client, bucket: R2Bucket, context: AccessContext, site: { id: string; version: number; data: SiteDefinition }, release: string, generation: number) {
  const compiled = await compileAll(client, site.data); const prefix = `workspaces/${context.workspace.id}/sites/${site.id}/releases`;
  const files = compiled.files.map((file) => manifestFile(prefix, release, file));
  for (let index = 0; index < files.length; index += 1) await bucket.put(files[index].key, compiled.files[index].body, { httpMetadata: { contentType: files[index].mime } });
  return { manifest: { id: release, siteId: site.id, version: site.version, generation, created: now(), hash: compiled.hash, files } satisfies ReleaseManifest, itemCount: compiled.itemCount };
}

async function saveEvent(client: Client, context: AccessContext, action: string, record: string, key: string, inputHash: string, result: Record<string, unknown>) {
  await client.execute(eventStatement({ action, actor: context.identity.id, recordId: record, key, hash: inputHash, result }));
}

export async function executeSiteGenerate(client: Client, context: AccessContext, input: Record<string, unknown>, key: string, inputHash: string, typesafe?: string): Promise<Record<string, unknown>> {
  const prompt = text(input.prompt ?? input.description, 2000); const title = text(input.title) || context.workspace.name || 'Workspace';
  if (input.theme !== undefined && !Object.hasOwn(DEFAULT_DESIGN_TOKENS, input.theme as string)) throw badRequest('Choose a registered site theme.');
  const theme = (input.theme as ThemeName | undefined) || await chooseSiteTheme(typesafe, title, prompt) || 'editorial-chalk';
  const existing = await getSiteRecord(client);
  const site = { ...createDefaultSite(title, prompt, theme), currentRelease: existing?.data.currentRelease || null, releases: existing?.data.releases || [] } satisfies SiteDefinition;
  const siteId = existing?.id || `site_${crypto.randomUUID()}`; const at = now(); const preview = await compileSiteHtml(site);
  const version = existing ? existing.version + 1 : 1;
  const state = existing?.state === 'live' ? 'live' : 'draft';
  const result = { siteId, version, state, site, preview };
  if (existing) {
    const saved = await client.batch([
      { sql: 'UPDATE records SET title=?,data=?,version=?,updated=? WHERE id=? AND version=?', args: [title, JSON.stringify(site), version, at, siteId, existing.version] },
      { sql: `INSERT INTO events(id,kind,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at)
        SELECT ?, 'action', ?, 'site.generate', 'accepted', ?, ?, ?, ?, ?, ? WHERE changes()=1`, args: [`evt_${crypto.randomUUID()}`, siteId, context.identity.id, inputHash, key, JSON.stringify({ result }), at, at] },
    ], 'write');
    if (saved[0].rowsAffected !== 1 || saved[1].rowsAffected !== 1) throw conflict('Site was modified concurrently. Refresh and try again.');
    return result;
  }
  await client.batch([
    { sql: "INSERT INTO records(id,type,title,state,data,owner,version,created,updated) VALUES(?,'site',?,'draft',?,?,1,?,?)", args: [siteId, title, JSON.stringify(site), context.identity.id, at, at] },
    eventStatement({ action: 'site.generate', actor: context.identity.id, recordId: siteId, key, hash: inputHash, result }),
  ], 'write');
  return result;
}

function pageIndex(site: SiteDefinition, operation: SitePatchOperation): number {
  const value = operation.path;
  if (!value) return 0;
  const index = site.pages.findIndex((page) => page.id === value || page.path === value);
  if (index < 0) throw badRequest('Site page was not found.');
  return index;
}

export async function executeSiteUpdate(client: Client, context: AccessContext, input: Record<string, unknown>, key: string, inputHash: string): Promise<Record<string, unknown>> {
  const siteId = text(input.siteId, 160); const base = Number(input.baseVersion); const current = await getSiteRecord(client, siteId);
  if (!siteId || !Number.isSafeInteger(base) || !current) throw notFound('Site was not found.');
  if (current.version !== base) throw conflict('Site was modified concurrently. Refresh and try again.');
  const operations = Array.isArray(input.operations) ? input.operations as SitePatchOperation[] : [];
  if (operations.length > 100) throw badRequest('Too many site changes.');
  let site: SiteDefinition = structuredClone(current.data);
  for (const operation of operations) {
    if (operation.op === 'set_theme' && typeof operation.value === 'string' && operation.value in DEFAULT_DESIGN_TOKENS) site = { ...site, design: DEFAULT_DESIGN_TOKENS[operation.value as ThemeName] };
    else if (operation.op === 'set_locale' && typeof operation.value === 'string') site = { ...site, locale: text(operation.value, 20) };
    else if (operation.op === 'set_policy') site = { ...site, policy: { ...site.policy, ...object(operation.value) } };
    else if (operation.op === 'update_page') {
      const index = pageIndex(site, operation); const pages = [...site.pages];
      pages[index] = { ...pages[index], ...object(operation.value), cards: pages[index].cards } as PageDefinition;
      site = { ...site, pages };
    } else {
      const index = pageIndex(site, operation); const page = site.pages[index]; let cards = [...page.cards];
      if (operation.op === 'add_card') cards = [...cards, operation.value as CardDefinition];
      else if (operation.op === 'remove_card' && typeof operation.value === 'string') {
        if (!cards.some((card) => card.id === operation.value)) throw notFound('Site card was not found.');
        cards = cards.filter((card) => card.id !== operation.value);
      }
      else if (operation.op === 'update_card') {
        const patch = object(operation.value); const id = text(patch.id, 120);
        if (!id || !cards.some((card) => card.id === id)) throw notFound('Site card was not found.');
        cards = cards.map((card) => card.id === id ? { ...card, ...patch, props: { ...card.props, ...object(patch.props) } } as CardDefinition : card);
      } else throw badRequest('Site change is invalid.');
      const pages = [...site.pages]; pages[index] = { ...page, cards }; site = { ...site, pages };
    }
  }
  validateSite(site); const at = now(); const version = base + 1; const result = { siteId, version, site };
  const saved = await client.batch([
    { sql: 'UPDATE records SET data=?,version=?,updated=? WHERE id=? AND version=?', args: [JSON.stringify(site), version, at, siteId, base] },
    { sql: `INSERT INTO events(id,kind,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at)
      SELECT ?, 'action', ?, 'site.update', 'accepted', ?, ?, ?, ?, ?, ? WHERE changes()=1`, args: [`evt_${crypto.randomUUID()}`, siteId, context.identity.id, inputHash, key, JSON.stringify({ result }), at, at] },
  ], 'write');
  if (saved[0].rowsAffected !== 1 || saved[1].rowsAffected !== 1) throw conflict('Site was modified concurrently. Refresh and try again.');
  return result;
}

export async function executeSiteCompile(client: Client, context: AccessContext, input: Record<string, unknown>, key: string, inputHash: string): Promise<Record<string, unknown>> {
  const current = await getSiteRecord(client, text(input.siteId, 160) || undefined); if (!current) throw notFound('Site was not found.');
  const compiled = await compileAll(client, current.data); const releaseId = `rel_${crypto.randomUUID()}`;
  const manifest: ReleaseManifest = { id: releaseId, siteId: current.id, version: current.version, generation: (current.data.releases?.length || 0) + 1, created: now(), hash: compiled.hash, files: compiled.files.map((file) => ({ path: file.path, mime: file.mime, bytes: new TextEncoder().encode(file.body).byteLength, hash: file.hash, key: '' })) };
  const result = { releaseId, manifest, hash: compiled.hash }; await saveEvent(client, context, 'site.compile', current.id, key, inputHash, result); return result;
}

async function publishCurrent(client: Client, bucket: R2Bucket | undefined, context: AccessContext, input: Record<string, unknown>, key: string, inputHash: string, action: 'site.publish' | 'site.refresh'): Promise<Record<string, unknown>> {
  if (!bucket) throw unavailable('Site release storage is not configured.');
  const current = await getSiteRecord(client, text(input.siteId, 160) || undefined); if (!current) throw notFound('Site was not found.');
  if (action === 'site.refresh' && (current.state !== 'live' || !current.data.currentRelease)) throw badRequest('Publish the site before refreshing its public bindings.');
  const generation = (current.data.releases?.length || 0) + 1; const releaseId = `rel_${crypto.randomUUID()}`;
  const { manifest, itemCount } = await saveRelease(client, bucket, context, { ...current, version: current.version + 1 }, releaseId, generation);
  const site = { ...current.data, currentRelease: releaseId, releases: [...(current.data.releases || []), manifest] }; const at = now(); const version = current.version + 1;
  const common = { siteId: current.id, releaseId, liveUrl: `/v1/sites/${encodeURIComponent(context.workspace.slug)}`, generation, state: 'live' };
  const result = action === 'site.refresh' ? { ...common, refreshed: true, itemCount } : common;
  const saved = await client.batch([
    { sql: "UPDATE records SET state='live',data=?,version=?,updated=? WHERE id=? AND version=?", args: [JSON.stringify(site), version, at, current.id, current.version] },
    { sql: `INSERT INTO events(id,kind,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at)
      SELECT ?, 'action', ?, ?, 'accepted', ?, ?, ?, ?, ?, ? WHERE changes()=1`, args: [`evt_${crypto.randomUUID()}`, current.id, action, context.identity.id, inputHash, key, JSON.stringify({ result }), at, at] },
    { sql: "UPDATE records SET state='replaced',version=version+1,updated=? WHERE type='site' AND state='live' AND id<>? AND EXISTS(SELECT 1 FROM events WHERE action_id=? AND idempotency_key=? AND record_id=?)", args: [at, current.id, action, key, current.id] },
  ], 'write');
  if (saved[0].rowsAffected !== 1 || saved[1].rowsAffected !== 1) throw conflict('Site changed while publishing. The stored candidate was not promoted.');
  return result;
}

export async function executeSitePublish(client: Client, bucket: R2Bucket | undefined, context: AccessContext, input: Record<string, unknown>, key: string, inputHash: string): Promise<Record<string, unknown>> {
  return publishCurrent(client, bucket, context, input, key, inputHash, 'site.publish');
}

export async function executeSiteRollback(client: Client, context: AccessContext, input: Record<string, unknown>, key: string, inputHash: string): Promise<Record<string, unknown>> {
  const current = await getSiteRecord(client, text(input.siteId, 160) || undefined); if (!current) throw notFound('Site was not found.');
  const releaseId = text(input.releaseId, 160); if (!current.data.releases?.some((release) => release.id === releaseId)) throw notFound('Site release was not found.');
  const site = { ...current.data, currentRelease: releaseId }; const at = now(); const result = { siteId: current.id, releaseId, rolledBack: true };
  const saved = await client.batch([
    { sql: 'UPDATE records SET data=?,version=version+1,updated=? WHERE id=? AND version=?', args: [JSON.stringify(site), at, current.id, current.version] },
    { sql: `INSERT INTO events(id,kind,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at)
      SELECT ?, 'action', ?, 'site.rollback', 'accepted', ?, ?, ?, ?, ?, ? WHERE changes()=1`, args: [`evt_${crypto.randomUUID()}`, current.id, context.identity.id, inputHash, key, JSON.stringify({ result }), at, at] },
  ], 'write');
  if (saved[0].rowsAffected !== 1 || saved[1].rowsAffected !== 1) throw conflict('Site changed while rolling back. Refresh and try again.');
  return result;
}

export async function executeSiteRefresh(client: Client, bucket: R2Bucket | undefined, context: AccessContext, input: Record<string, unknown>, key: string, inputHash: string): Promise<Record<string, unknown>> {
  return publishCurrent(client, bucket, context, input, key, inputHash, 'site.refresh');
}
