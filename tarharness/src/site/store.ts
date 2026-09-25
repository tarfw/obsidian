import type { Client, InStatement } from '@libsql/client/web';
import { badRequest, conflict, notFound, unavailable } from '../errors.ts';
import { eventStatement } from '../gateway/commit.ts';
import type { AccessContext } from '../types.ts';
import { compileSiteHtml } from './renderer.ts';
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
    journeys: [{ id: 'enquiry', title: 'Customer enquiry', target: 'record.create', version: 1, input: { type: 'enquiry' }, outcome: 'Enquiry appears in the workspace Inbox' }],
    variants: [], surfaces: [], policy: { publicOrdering: false, publicEnquiry: false, allowedCurrencies: ['INR'] },
  };
}

export async function getSiteRecord(client: Client, siteId?: string): Promise<{ id: string; version: number; state: string; data: SiteDefinition } | null> {
  const result = await client.execute(siteId
    ? { sql: "SELECT * FROM records WHERE id=? AND type='site' AND archived IS NULL LIMIT 1", args: [siteId] }
    : "SELECT * FROM records WHERE type='site' AND archived IS NULL ORDER BY updated DESC,created DESC LIMIT 1");
  const row = result.rows[0];
  return row ? { id: String(row.id), version: Number(row.version), state: String(row.state), data: object(JSON.parse(String(row.data))) as unknown as SiteDefinition } : null;
}

function validateSite(site: SiteDefinition): void {
  if (site.schema !== '1.0.0' || !site.pages.length || site.pages.length > 50) throw badRequest('Site definition is invalid.');
  const paths = new Set<string>();
  for (const page of site.pages) {
    if (!/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(page.path) || paths.has(page.path) || page.cards.length > 100) throw badRequest('Site page path or card count is invalid.');
    paths.add(page.path);
    const ids = new Set<string>();
    for (const card of page.cards) {
      if (!CARD_KINDS.includes(card.kind) || !card.id || ids.has(card.id)) throw badRequest('Site card is invalid.');
      ids.add(card.id);
    }
  }
}

async function compileAll(site: SiteDefinition) {
  validateSite(site);
  const rendered = await Promise.all(site.pages.map(async (page, index) => ({ page, rendered: await compileSiteHtml(site, index) })));
  const files = rendered.map(({ page, rendered }) => ({ path: filePath(page), mime: 'text/html; charset=utf-8', body: rendered.html, hash: rendered.hash }));
  const css = rendered[0].rendered.css;
  files.push({ path: '/style.css', mime: 'text/css; charset=utf-8', body: css, hash: await hash(css) });
  return { files, hash: await hash(files.map((file) => `${file.path}:${file.hash}`).join('|')) };
}

function manifestFile(prefix: string, release: string, file: { path: string; mime: string; body: string; hash: string }): ReleaseFile {
  return { path: file.path, mime: file.mime, bytes: new TextEncoder().encode(file.body).byteLength, hash: file.hash, key: `${prefix}/${release}${file.path}` };
}

async function saveRelease(bucket: R2Bucket, context: AccessContext, site: { id: string; version: number; data: SiteDefinition }, release: string, generation: number) {
  const compiled = await compileAll(site.data); const prefix = `workspaces/${context.workspace.id}/sites/${site.id}/releases`;
  const files = compiled.files.map((file) => manifestFile(prefix, release, file));
  for (let index = 0; index < files.length; index += 1) await bucket.put(files[index].key, compiled.files[index].body, { httpMetadata: { contentType: files[index].mime } });
  return { id: release, siteId: site.id, version: site.version, generation, created: now(), hash: compiled.hash, files } satisfies ReleaseManifest;
}

async function saveEvent(client: Client, context: AccessContext, action: string, record: string, key: string, inputHash: string, result: Record<string, unknown>) {
  await client.execute(eventStatement({ action, actor: context.identity.id, recordId: record, key, hash: inputHash, result }));
}

export async function executeSiteGenerate(client: Client, context: AccessContext, input: Record<string, unknown>, key: string, inputHash: string): Promise<Record<string, unknown>> {
  const prompt = text(input.prompt ?? input.description, 2000); const title = text(input.title) || context.workspace.name || 'Workspace';
  const theme = (input.theme === 'streetwear-dark' || input.theme === 'minimal-clean' ? input.theme : 'editorial-chalk') as ThemeName;
  const site = { ...createDefaultSite(title, prompt, theme), currentRelease: null, releases: [] } satisfies SiteDefinition;
  const siteId = `site_${crypto.randomUUID()}`; const at = now(); const preview = await compileSiteHtml(site);
  const result = { siteId, version: 1, state: 'draft', site, preview };
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
      else if (operation.op === 'remove_card' && typeof operation.value === 'string') cards = cards.filter((card) => card.id !== operation.value);
      else if (operation.op === 'update_card') {
        const patch = object(operation.value); const id = text(patch.id, 120);
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
  const compiled = await compileAll(current.data); const releaseId = `rel_${crypto.randomUUID()}`;
  const manifest: ReleaseManifest = { id: releaseId, siteId: current.id, version: current.version, generation: (current.data.releases?.length || 0) + 1, created: now(), hash: compiled.hash, files: compiled.files.map((file) => ({ path: file.path, mime: file.mime, bytes: new TextEncoder().encode(file.body).byteLength, hash: file.hash, key: '' })) };
  const result = { releaseId, manifest, hash: compiled.hash }; await saveEvent(client, context, 'site.compile', current.id, key, inputHash, result); return result;
}

export async function executeSitePublish(client: Client, bucket: R2Bucket | undefined, context: AccessContext, input: Record<string, unknown>, key: string, inputHash: string): Promise<Record<string, unknown>> {
  if (!bucket) throw unavailable('Site release storage is not configured.');
  const current = await getSiteRecord(client, text(input.siteId, 160) || undefined); if (!current) throw notFound('Site was not found.');
  const generation = (current.data.releases?.length || 0) + 1; const releaseId = `rel_${crypto.randomUUID()}`;
  const manifest = await saveRelease(bucket, context, { ...current, version: current.version + 1 }, releaseId, generation);
  const site = { ...current.data, currentRelease: releaseId, releases: [...(current.data.releases || []), manifest] }; const at = now(); const version = current.version + 1;
  const result = { siteId: current.id, releaseId, liveUrl: `/v1/sites/${encodeURIComponent(text(input.subdomain, 80) || context.workspace.slug)}`, generation, state: 'live' };
  const saved = await client.batch([
    { sql: "UPDATE records SET state='live',data=?,version=?,updated=? WHERE id=? AND version=?", args: [JSON.stringify(site), version, at, current.id, current.version] },
    { sql: `INSERT INTO events(id,kind,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at)
      SELECT ?, 'action', ?, 'site.publish', 'accepted', ?, ?, ?, ?, ?, ? WHERE changes()=1`, args: [`evt_${crypto.randomUUID()}`, current.id, context.identity.id, inputHash, key, JSON.stringify({ result }), at, at] },
  ], 'write');
  if (saved[0].rowsAffected !== 1 || saved[1].rowsAffected !== 1) throw conflict('Site changed while publishing. The stored candidate was not promoted.');
  return result;
}

export async function executeSiteRollback(client: Client, context: AccessContext, input: Record<string, unknown>, key: string, inputHash: string): Promise<Record<string, unknown>> {
  const current = await getSiteRecord(client, text(input.siteId, 160) || undefined); if (!current) throw notFound('Site was not found.');
  const releaseId = text(input.releaseId, 160); if (!current.data.releases?.some((release) => release.id === releaseId)) throw notFound('Site release was not found.');
  const site = { ...current.data, currentRelease: releaseId }; const at = now(); const result = { siteId: current.id, releaseId, rolledBack: true };
  await client.batch([
    { sql: 'UPDATE records SET data=?,version=version+1,updated=? WHERE id=?', args: [JSON.stringify(site), at, current.id] },
    eventStatement({ action: 'site.rollback', actor: context.identity.id, recordId: current.id, key, hash: inputHash, result }),
  ], 'write'); return result;
}

export async function executeSiteRefresh(client: Client, context: AccessContext, input: Record<string, unknown>, key?: string, inputHash?: string): Promise<Record<string, unknown>> {
  const current = await getSiteRecord(client, text(input.siteId, 160) || undefined); if (!current) throw notFound('Site was not found.');
  let rows = await client.execute(`SELECT v.title,p.data FROM records v JOIN records p ON p.type='price' AND p.state='active'
    AND json_extract(p.data,'$.variant')=v.id WHERE v.type='variant' AND v.state='active' AND v.archived IS NULL LIMIT 100`);
  if (!rows.rows.length) rows = await client.execute("SELECT title,data FROM records WHERE type='pos.product' AND state='active' AND archived IS NULL LIMIT 100");
  const items = rows.rows.map((row) => { const data = object(JSON.parse(String(row.data))); return { title: String(row.title), price: Number(data.amount ?? data.price ?? 0), description: text(data.description, 500) }; });
  const site = { ...current.data, pages: current.data.pages.map((page) => ({ ...page, cards: page.cards.map((card) => card.kind === 'collection' ? { ...card, props: { ...card.props, items } } : card) })) };
  const at = now(); const result = { refreshed: true, itemCount: items.length };
  const statements: InStatement[] = [{ sql: 'UPDATE records SET data=?,version=version+1,updated=? WHERE id=?', args: [JSON.stringify(site), at, current.id] }];
  if (key && inputHash) statements.push(eventStatement({ action: 'site.refresh', actor: context.identity.id, recordId: current.id, key, hash: inputHash, result }));
  await client.batch(statements, 'write'); return result;
}
