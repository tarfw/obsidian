import type { Client } from '@libsql/client/web';
import { badRequest, conflict, notFound, unavailable } from '../errors.ts';
import { eventStatement } from '../gateway/commit.ts';
import type { AccessContext } from '../types.ts';
import { compileSiteHtml } from './renderer.ts';
import { compileDocument, type CompiledFile } from './compile.ts';
import { validateDocument } from './validate.ts';
import { applyLegacyOperations, isV2, readDocument, upgrade, THEMES, type LegacyOperation } from './adapt.ts';
import { inspectDocument } from './inspect.ts';
import { assetReader } from './asset.ts';
import { DEFAULT_DESIGN, type Design } from './design.ts';
import { BudgetExceeded, ModelRunner, SITE_MODEL_FALLBACKS, composeSite, planSite } from './model.ts';
import { slugify } from './html.ts';
import { checkClaim, chooseSiteTheme } from './judgment.ts';
import {
  CARD_KINDS, DEFAULT_DESIGN_TOKENS, type CardDefinition, type PageDefinition,
  type ReleaseFile, type ReleaseManifest, type SiteDefinition, type SitePatchOperation, type ThemeName,
} from './schema.ts';
import type { Page, Section, SiteDocument } from './document.ts';

const now = () => Date.now();
const reserved = new Set(['www', 'api', 'app', 'admin', 'mail', 'static', 'assets', 'preview', 'support', 'help', 'status']);
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

export async function getSiteRecord(client: Client, siteId?: string): Promise<{ id: string; version: number; state: string; data: unknown } | null> {
  const result = await client.execute(siteId
    ? { sql: "SELECT * FROM records WHERE id=? AND type='site' AND archived IS NULL LIMIT 1", args: [siteId] }
    : "SELECT * FROM records WHERE type='site' AND archived IS NULL ORDER BY CASE WHEN state='live' THEN 0 ELSE 1 END,updated DESC,created DESC LIMIT 1");
  const row = result.rows[0];
  return row ? { id: String(row.id), version: Number(row.version), state: String(row.state), data: JSON.parse(String(row.data)) as unknown } : null;
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
        const params = binding.params || {};
        const records = params.records ?? [];
        if (Object.keys(params).some((key) => !['records', 'channel'].includes(key)) || !Array.isArray(records) || records.length > 100
          || records.some((id) => typeof id !== 'string' || !/^[a-zA-Z0-9._:-]{1,160}$/.test(id))
          || new Set(records).size !== records.length || (params.channel !== undefined && (typeof params.channel !== 'string' || !/^[a-zA-Z0-9-]{1,40}$/.test(params.channel))))
          throw badRequest('Choose explicit public catalog records and a valid price channel.');
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

async function publicCatalog(client: Client, records: readonly string[], channel: string): Promise<Record<string, unknown>[]> {
  if (!records.length) return [];
  const placeholders = records.map(() => '?').join(',');
  const at = now();
  const variants = await client.execute({ sql: `SELECT v.id AS id,v.title AS title,v.data AS variant,p.data AS price FROM records v
    JOIN records p ON p.type='price' AND p.state='active' AND p.archived IS NULL AND json_extract(p.data,'$.variant')=v.id
    WHERE v.type='variant' AND v.state='active' AND v.archived IS NULL AND v.id IN (${placeholders})
    AND p.id=(SELECT current.id FROM records current WHERE current.type='price' AND current.state='active' AND current.archived IS NULL
      AND json_extract(current.data,'$.variant')=v.id AND json_extract(current.data,'$.channel')=?
      AND json_extract(current.data,'$.starts')<=? AND (json_extract(current.data,'$.ends') IS NULL OR json_extract(current.data,'$.ends')>?)
      ORDER BY json_extract(current.data,'$.starts') DESC,current.updated DESC,current.id LIMIT 1)
    ORDER BY v.title,v.id LIMIT 100`, args: [...records, channel, at, at] });
  const items = variants.rows.map((row) => {
    const variant = object(JSON.parse(String(row.variant)));
    const price = object(JSON.parse(String(row.price)));
    const amount = Number(price.amount);
    const title = String(row.title);
    return {
      id: String(row.id), slug: slugify(title),
      title, description: text(variant.description, 500),
      ...(Number.isSafeInteger(amount) && amount >= 0 && /^[A-Z]{3}$/.test(String(price.currency))
        ? { price: amount, currency: String(price.currency) } : {}),
    };
  });
  const settings = await client.execute("SELECT data FROM records WHERE type='pos.settings' AND archived IS NULL LIMIT 1");
  const currency = settings.rows[0] ? text(object(JSON.parse(String(settings.rows[0].data))).currency, 3) : '';
  const products = await client.execute({ sql: `SELECT id,title,data FROM records WHERE type='pos.product' AND state='active' AND archived IS NULL AND id IN (${placeholders}) ORDER BY title,id LIMIT 100`, args: [...records] });
  return [...items, ...products.rows.map((row) => {
    const product = object(JSON.parse(String(row.data)));
    const amount = Number(product.price);
    const title = String(row.title);
    const image = text(product.imageUrl, 500);
    return {
      id: String(row.id), slug: slugify(title),
      title, description: text(product.shortDescription || product.contentSummary, 500),
      ...(image.startsWith('https://') ? { image } : {}),
      ...(Number.isSafeInteger(amount) && amount >= 0 && /^[A-Z]{3}$/.test(currency)
        ? { price: amount, currency } : {}),
    };
  })];
}

/** Public projection for declared non-catalog collections (services, articles, projects). */
async function publicRecords(client: Client, records: readonly string[], type: string): Promise<Record<string, unknown>[]> {
  if (!records.length) return [];
  const placeholders = records.map(() => '?').join(',');
  const result = await client.execute({
    sql: `SELECT id,title,data FROM records WHERE type=? AND state='active' AND archived IS NULL AND id IN (${placeholders}) ORDER BY title,id LIMIT 100`,
    args: [type, ...records],
  });
  return result.rows.map((row) => {
    const data = object(JSON.parse(String(row.data)));
    const title = String(row.title);
    const amount = Number(data.price);
    const currency = text(data.currency, 3);
    const image = text(data.imageUrl, 500);
    return {
      id: String(row.id), slug: slugify(title), title,
      description: text(data.shortDescription || data.summary || data.description, 500),
      ...(image.startsWith('https://') ? { image } : {}),
      ...(Number.isSafeInteger(amount) && amount >= 0 && /^[A-Z]{3}$/.test(currency) ? { price: amount, currency } : {}),
    };
  });
}

async function resolveBindings(client: Client, site: SiteDefinition): Promise<{ site: SiteDefinition; itemCount: number }> {
  if (!site.pages.some((page) => page.cards.some((card) => card.bindings?.length))) return { site, itemCount: 0 };
  const pages: PageDefinition[] = [];
  let itemCount = 0;
  for (const page of site.pages) {
    const cards: CardDefinition[] = [];
    for (const card of page.cards) {
      const binding = card.bindings?.find((entry) => entry.query === 'catalog.public' && entry.slot === 'items');
      if (!binding) { cards.push(card); continue; }
      const items = await publicCatalog(client, (binding.params?.records || []) as string[], String(binding.params?.channel || 'default'));
      itemCount += items.length;
      cards.push({ ...card, props: { ...card.props, items } });
    }
    pages.push({ ...page, cards });
  }
  return { site: { ...site, pages }, itemCount };
}

function siteOrigin(domain: string | undefined, slug: string): string | undefined {
  if (domain?.startsWith('https://')) {
    try {
      const url = new URL(domain);
      if (/^tar-sites\.[a-z0-9-]+\.workers\.dev$/.test(url.hostname)
        && url.pathname === '/' && !url.search && !url.hash && !url.port && !url.username && !url.password)
        return `${url.origin}/${slug}`;
    } catch { /* Invalid configuration is rejected when publishing. */ }
    return undefined;
  }
  const base = domain?.trim().toLowerCase().replace(/^\.+|\.+$/g, '');
  return base && /^(?:[a-z0-9-]+\.)+[a-z0-9-]+$/.test(base) && !base.endsWith('.example.com')
    ? `https://${slug}.${base}` : undefined;
}
function siteHost(domain: string | undefined, slug: string): string | undefined {
  const origin = siteOrigin(domain, slug);
  return origin ? new URL(origin).hostname : undefined;
}

async function resolveDocumentBindings(client: Client, doc: SiteDocument): Promise<{ doc: SiteDocument; itemCount: number }> {
  if (!doc.pages.some((page) => page.sections.some((section) => section.bindings?.length))) return { doc, itemCount: 0 };
  const pages: Page[] = [];
  let itemCount = 0;
  for (const page of doc.pages) {
    const sections: Section[] = [];
    for (const section of page.sections) {
      const binding = section.bindings?.[0];
      if (!binding) { sections.push(section); continue; }
      const records = (binding.params?.records || []) as string[];
      const items = binding.query === 'records.public'
        ? await publicRecords(client, records, String(binding.params?.type || 'pos.product'))
        : await publicCatalog(client, records, String(binding.params?.channel || 'default'));
      const limited = binding.limit ? items.slice(0, binding.limit) : items;
      const used = new Set<string>();
      const resolved = limited.map((item, index) => {
        const base = String(item.slug || slugify(String(item.title || 'item')));
        const unique = used.has(base) ? `${base}-${index + 1}` : base;
        used.add(unique);
        return { ...item, slug: unique };
      });
      itemCount += resolved.length;
      sections.push({ ...section, nodes: section.nodes.map((node) => node.kind === 'collection' && (node.id === binding.slot || (node.props || {}).slot === binding.slot)
        ? { ...node, props: { ...node.props, items: resolved } } : node) });
    }
    pages.push({ ...page, sections });
  }
  return { doc: { ...doc, pages }, itemCount };
}

async function compileAll(client: Client, source: unknown, origin?: string, media?: (asset: import('./document.ts').Asset) => Promise<Uint8Array | null>): Promise<{ files: CompiledFile[]; hash: string; itemCount: number; redirects: { from: string; to: string; status: 308 }[] }> {
  if (isV2(source)) {
    validateDocument(source);
    const resolved = await resolveDocumentBindings(client, source);
    const compiled = await compileDocument(resolved.doc, { origin, media });
    return { files: compiled.files, hash: compiled.hash, itemCount: resolved.itemCount, redirects: compiled.redirects };
  }
  if (source && typeof source === 'object' && (source as { schema?: string }).schema !== '1.0.0') throw badRequest('Site definition is invalid.');
  const site = source as SiteDefinition;
  validateSite(site);
  const resolved = await resolveBindings(client, site);
  const rendered = await Promise.all(resolved.site.pages.map(async (page, index) => ({ page, rendered: await compileSiteHtml(resolved.site, index, origin) })));
  const files = await Promise.all(rendered.map(async ({ page, rendered }) => ({ path: filePath(page), mime: 'text/html; charset=utf-8', body: rendered.html, hash: await hash(rendered.html) })));
  const css = rendered[0].rendered.css;
  files.push({ path: '/style.css', mime: 'text/css; charset=utf-8', body: css, hash: await hash(css) });
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${origin ? resolved.site.pages.map((page) => `<url><loc>${origin}${page.path}</loc></url>`).join('') : ''}</urlset>`;
  files.push({ path: '/sitemap.xml', mime: 'application/xml; charset=utf-8', body: sitemap, hash: await hash(sitemap) });
  const robots = `User-agent: *\nAllow: /\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ''}`;
  files.push({ path: '/robots.txt', mime: 'text/plain; charset=utf-8', body: robots, hash: await hash(robots) });
  return { files, hash: await hash(files.map((file) => `${file.path}:${file.hash}`).join('|')), itemCount: resolved.itemCount, redirects: [] };
}

function manifestFile(prefix: string, release: string, file: CompiledFile): ReleaseFile {
  const bytes = typeof file.body === 'string' ? new TextEncoder().encode(file.body).byteLength : file.body.byteLength;
  return { path: file.path, mime: file.mime, bytes, hash: file.hash, key: `${prefix}/${release}${file.path}` };
}

/** Store the document in its current schema; v1 records upgrade on first edit. */
async function saveRelease(client: Client, bucket: R2Bucket, content: R2Bucket | undefined, context: AccessContext, site: { id: string; version: number; data: unknown }, release: string, generation: number, domain?: string, epoch = 0) {
  const origin = siteOrigin(domain, context.workspace.slug);
  const source = site.data;
  const compiled = await compileAll(client, source, origin, assetReader(content, context, site.id)); const prefix = `workspaces/${context.workspace.id}/sites/${site.id}/releases`;
  const files = compiled.files.map((file) => manifestFile(prefix, release, file));
  for (let index = 0; index < files.length; index += 1) await bucket.put(files[index].key, compiled.files[index].body as string | Uint8Array, { httpMetadata: { contentType: files[index].mime } });
  const document = readDocument(source).doc;
  const inspection = inspectDocument(document, { compiled, origin, secrets: [context.workspace.id, site.id] });
  const manifest = {
    id: release, siteId: site.id, epoch, ...(origin ? { host: siteHost(domain, context.workspace.slug) } : {}),
    version: site.version, generation, created: now(), hash: compiled.hash, files,
    compiler: isV2(source) ? '2.0.0' : '1.0.0', redirects: compiled.redirects,
    checks: { blocking: inspection.blocking.length, advisory: inspection.advisory.length },
  } satisfies ReleaseManifest;
  // Keep the published definition with the release. Refresh must never compile later draft edits.
  await bucket.put(`${prefix}/${release}/source.json`, JSON.stringify({ ...(source as Record<string, unknown>), currentRelease: null, releases: [] }), { httpMetadata: { contentType: 'application/json; charset=utf-8' } });
  // The check report lives beside the release but outside manifest.files, so it is never served.
  await bucket.put(`${prefix}/${release}/report.json`, JSON.stringify({ inspection, created: now() }), { httpMetadata: { contentType: 'application/json; charset=utf-8' } });
  await bucket.put(`${prefix}/${release}/manifest.json`, JSON.stringify(manifest), { httpMetadata: { contentType: 'application/json; charset=utf-8' } });
  return { manifest, itemCount: compiled.itemCount, inspection };
}

async function readCandidate(bucket: R2Bucket, context: AccessContext, site: string, release: string): Promise<{ manifest: ReleaseManifest; source: unknown }> {
  if (!/^rel_[a-f0-9-]{36}$/.test(release)) throw badRequest('Choose a compiled site candidate.');
  const prefix = `workspaces/${context.workspace.id}/sites/${site}/releases/${release}`;
  const [manifestObject, sourceObject] = await Promise.all([bucket.get(`${prefix}/manifest.json`), bucket.get(`${prefix}/source.json`)]);
  if (!manifestObject || !sourceObject || manifestObject.size > 1_000_000 || sourceObject.size > 1_000_000) throw notFound('Site candidate was not found.');
  const manifest = JSON.parse(await manifestObject.text()) as ReleaseManifest;
  const source = JSON.parse(await sourceObject.text()) as unknown;
  if (isV2(source)) validateDocument(source); else validateSite(source as SiteDefinition);
  if (manifest.id !== release || manifest.siteId !== site || !Array.isArray(manifest.files) || !manifest.files.length
    || manifest.files.some((file) => !file.path.startsWith('/') || file.key !== `${prefix}${file.path}`)) throw badRequest('Site candidate is invalid.');
  return { manifest, source };
}

/** The D1 pointer is the public serving authority. R2 files and manifest are written first. */
async function activatePublication(control: D1Database | undefined, domain: string | undefined, context: AccessContext, site: string, manifest: ReleaseManifest, expected?: number): Promise<string | null> {
  if (!control) return null;
  const origin = siteOrigin(domain, context.workspace.slug);
  if (!origin) throw unavailable('A valid site Worker origin or platform domain is required.');
  if (reserved.has(context.workspace.slug) || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(context.workspace.slug)) throw badRequest('This workspace slug cannot be used as a site address.');
  const host = new URL(origin).hostname;
  const mode = domain?.startsWith('https://') ? 'path' : 'host';
  const primary = control.withSession('first-primary');
  const owned = mode === 'host' ? await primary.prepare('SELECT workspace,site FROM hosts WHERE name=?').bind(host).first<{ workspace: string; site: string }>() : null;
  if (owned && (owned.workspace !== context.workspace.id || owned.site !== site)) throw conflict('This site hostname is already assigned.');
  const previous = await primary.prepare('SELECT site,epoch,release,hash,domain,mode,status FROM sites WHERE workspace=?').bind(context.workspace.id)
    .first<{ site: string; epoch: number; release: string; hash: string; domain: string; mode: string; status: string }>();
  if (previous && previous.site !== site) throw conflict('Another site already owns this workspace publication.');
  if (previous?.release === manifest.id && previous.hash === manifest.hash && previous.domain === host && previous.mode === mode && previous.status === 'active') return origin;
  if (expected !== undefined && (previous?.epoch || 0) !== expected) throw conflict('Live publication changed since this candidate was prepared. Compile and review it again.');
  const at = now();
  const statements = [
    previous
      ? control.prepare("UPDATE sites SET release=?,hash=?,epoch=epoch+1,domain=?,mode=?,status='active',updated=? WHERE workspace=? AND site=? AND epoch=?")
        .bind(manifest.id, manifest.hash, host, mode, at, context.workspace.id, site, previous.epoch)
      : control.prepare("INSERT INTO sites(workspace,site,release,hash,epoch,domain,mode,status,updated) VALUES(?,?,?,?,1,?,?,'active',?)")
        .bind(context.workspace.id, site, manifest.id, manifest.hash, host, mode, at),
  ];
  if (mode === 'host') statements.push(owned
    ? control.prepare("UPDATE hosts SET status='active',updated=? WHERE name=? AND workspace=? AND site=?").bind(at, host, context.workspace.id, site)
    : control.prepare("INSERT INTO hosts(name,workspace,site,status,updated) VALUES(?,?,?,'active',?)").bind(host, context.workspace.id, site, at));
  if (previous?.mode === 'host' && (mode === 'path' || previous.domain !== host)) statements.push(
    control.prepare("UPDATE hosts SET status='pending',updated=? WHERE name=? AND workspace=? AND site=? AND status='active'")
      .bind(at, previous.domain, context.workspace.id, site));
  const results = await control.batch(statements);
  if (results.some((result) => result.meta.changes !== 1)) throw conflict('Site publication changed concurrently. Refresh and try again.');
  return origin;
}

async function saveEvent(client: Client, context: AccessContext, action: string, record: string, key: string, inputHash: string, result: Record<string, unknown>) {
  await client.execute(eventStatement({ action, actor: context.identity.id, recordId: record, key, hash: inputHash, result }));
}

export async function executeSiteGenerate(client: Client, context: AccessContext, input: Record<string, unknown>, key: string, inputHash: string, typesafe?: string, ai?: Ai, control?: D1Database, model?: string): Promise<Record<string, unknown>> {
  const prompt = text(input.prompt ?? input.description, 2000); const title = text(input.title) || context.workspace.name || 'Workspace';
  if (input.theme !== undefined && !Object.hasOwn(DEFAULT_DESIGN_TOKENS, input.theme as string)) throw badRequest('Choose a registered site theme.');
  const theme = (input.theme as ThemeName | undefined) || await chooseSiteTheme(typesafe, title, prompt) || 'editorial-chalk';
  const existing = await getSiteRecord(client);
  const previous = existing ? readDocument(existing.data).doc : null;
  const design = input.theme ? THEMES[String(input.theme)] || DEFAULT_DESIGN : previous?.design || DEFAULT_DESIGN;
  const facts = await publicFacts(client, input);
  const attempt = ai && prompt
    ? await tryCompose(ai, model, { goal: prompt, audience: text(input.audience, 200), tone: text(input.tone, 120) }, facts, design, typesafe, control, context)
    : { document: null, note: '' };
  const composed = attempt.document;
  const site = composed || upgrade({
    ...createDefaultSite(title, prompt, theme),
    currentRelease: previous?.currentRelease ?? null,
    releases: previous?.releases || [],
  });
  if (composed && previous) { site.currentRelease = previous.currentRelease ?? null; site.releases = previous.releases || []; }
  if (!composed) site.claims = previous?.claims || [];
  validateDocument(site);
  const siteId = existing?.id || `site_${crypto.randomUUID()}`; const at = now();
  const compiled = await compileDocument(site);
  const preview = {
    html: String(compiled.files.find((file) => file.path === '/index.html')?.body || ''),
    css: String(compiled.files.find((file) => file.path === '/style.css')?.body || ''),
    hash: compiled.hash,
  };
  const version = existing ? existing.version + 1 : 1;
  const state = existing?.state === 'live' ? 'live' : 'draft';
  const result = { siteId, version, state, site, preview, composed: Boolean(composed), ...(attempt.note ? { note: attempt.note } : {}) };
  if (existing) {
    const saved = await client.batch([
      { sql: 'UPDATE records SET title=?,data=?,version=?,updated=? WHERE id=? AND version=?', args: [title, JSON.stringify(site), version, at, siteId, existing.version] },
      { sql: `INSERT INTO events(id,kind,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at)
        SELECT ?, 'action', ?, 'site.generate', 'accepted', ?, ?, ?, ?, ?, ? WHERE changes()=1`, args: [`evt_${crypto.randomUUID()}`, siteId, context.identity.id, inputHash, key, JSON.stringify({ result }), at, at] },
    ], 'write');
    if (saved[0].rowsAffected !== 1 || saved[1].rowsAffected !== 1) throw conflict('Site was modified concurrently. Refresh and try again.');
    return result;
  }
  const created = await client.batch([
    { sql: "INSERT INTO records(id,type,title,state,data,owner,version,created,updated) SELECT ?,'site',?,'draft',?,?,1,?,? WHERE NOT EXISTS(SELECT 1 FROM records WHERE type='site' AND archived IS NULL)", args: [siteId, title, JSON.stringify(site), context.identity.id, at, at] },
    { sql: `INSERT INTO events(id,kind,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at)
      SELECT ?, 'action', ?, 'site.generate', 'accepted', ?, ?, ?, ?, ?, ? WHERE changes()=1`, args: [`evt_${crypto.randomUUID()}`, siteId, context.identity.id, inputHash, key, JSON.stringify({ result }), at, at] },
  ], 'write');
  if (created[0].rowsAffected !== 1 || created[1].rowsAffected !== 1) throw conflict('A site was created concurrently. Refresh and edit that site.');
  return result;
}

export async function executeSiteUpdate(client: Client, context: AccessContext, input: Record<string, unknown>, key: string, inputHash: string): Promise<Record<string, unknown>> {
  const siteId = text(input.siteId, 160); const base = Number(input.baseVersion); const current = await getSiteRecord(client, siteId);
  if (!siteId || !Number.isSafeInteger(base) || !current) throw notFound('Site was not found.');
  if (current.version !== base) throw conflict('Site was modified concurrently. Refresh and try again.');
  const operations = Array.isArray(input.operations) ? input.operations as SitePatchOperation[] : [];
  if (operations.length > 100) throw badRequest('Too many site changes.');
  const { doc } = readDocument(current.data);
  const site = applyLegacyOperations(doc, operations as LegacyOperation[]);
  site.revision = doc.revision + 1;
  validateDocument(site); const at = now(); const version = base + 1; const result = { siteId, version, site };
  const saved = await client.batch([
    { sql: 'UPDATE records SET data=?,version=?,updated=? WHERE id=? AND version=?', args: [JSON.stringify(site), version, at, siteId, base] },
    { sql: `INSERT INTO events(id,kind,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at)
      SELECT ?, 'action', ?, 'site.update', 'accepted', ?, ?, ?, ?, ?, ? WHERE changes()=1`, args: [`evt_${crypto.randomUUID()}`, siteId, context.identity.id, inputHash, key, JSON.stringify({ result }), at, at] },
  ], 'write');
  if (saved[0].rowsAffected !== 1 || saved[1].rowsAffected !== 1) throw conflict('Site was modified concurrently. Refresh and try again.');
  return result;
}

export async function executeSiteCompile(client: Client, bucket: R2Bucket | undefined, context: AccessContext, input: Record<string, unknown>, key: string, inputHash: string, control?: D1Database, domain?: string, content?: R2Bucket): Promise<Record<string, unknown>> {
  if (!bucket) throw unavailable('Site release storage is not configured.');
  const current = await getSiteRecord(client, text(input.siteId, 160) || undefined); if (!current) throw notFound('Site was not found.');
  const authority = control ? await control.withSession('first-primary').prepare('SELECT site,epoch FROM sites WHERE workspace=?')
    .bind(context.workspace.id).first<{ site: string; epoch: number }>() : null;
  if (authority && authority.site !== current.id) throw conflict('Another site owns this workspace publication.');
  const releaseId = `rel_${crypto.randomUUID()}`;
  const currentDocument = readDocument(current.data).doc;
  const { manifest } = await saveRelease(client, bucket, content, context, current, releaseId, (currentDocument.releases?.length || 0) + 1, domain, authority?.epoch || 0);
  const token = crypto.randomUUID();
  if (control) await control.prepare('INSERT INTO previews(token,workspace,site,release,expires) VALUES(?,?,?,?,?)')
    .bind(token, context.workspace.id, current.id, releaseId, now() + 30 * 60_000).run();
  const result = { releaseId, hash: manifest.hash, version: current.version, ...(control ? { previewUrl: `/v1/site-previews/${token}/` } : {}) };
  await saveEvent(client, context, 'site.compile', current.id, key, inputHash, result);
  return result;
}

async function publishCurrent(client: Client, bucket: R2Bucket | undefined, context: AccessContext, input: Record<string, unknown>, key: string, inputHash: string, action: 'site.publish' | 'site.refresh', control?: D1Database, domain?: string, content?: R2Bucket): Promise<Record<string, unknown>> {
  if (!bucket) throw unavailable('Site release storage is not configured.');
  const current = await getSiteRecord(client, text(input.siteId, 160) || undefined); if (!current) throw notFound('Site was not found.');
  const document = readDocument(current.data).doc;
  if (action === 'site.refresh' && (current.state !== 'live' || !document.currentRelease)) throw badRequest('Publish the site before refreshing its public bindings.');
  let epoch = 0;
  if (action === 'site.refresh' && control) {
    const live = await control.withSession('first-primary').prepare('SELECT site,release,status,epoch FROM sites WHERE workspace=?')
      .bind(context.workspace.id).first<{ site: string; release: string; status: string; epoch: number }>();
    if (!live || live.site !== current.id || live.status !== 'active' || live.release !== document.currentRelease)
      throw conflict('Live publication changed. Refresh the site state before updating public facts.');
    epoch = live.epoch;
  }
  let source: unknown = current.data;
  let candidate: ReleaseManifest | undefined;
  if (action === 'site.publish') {
    const release = text(input.releaseId, 160);
    const reviewed = await readCandidate(bucket, context, current.id, release);
    if (reviewed.manifest.version !== current.version || reviewed.manifest.hash !== input.hash) throw conflict('The reviewed candidate is stale or does not match this draft. Compile and review it again.');
    if (control && reviewed.manifest.host !== siteHost(domain, context.workspace.slug))
      throw conflict('The site address changed since review. Compile and review a new candidate.');
    if (control && (typeof reviewed.manifest.epoch !== 'number' || !Number.isSafeInteger(reviewed.manifest.epoch) || reviewed.manifest.epoch < 0))
      throw conflict('Compile and review a new candidate with current publication authority.');
    candidate = reviewed.manifest;
    source = reviewed.source;
    const report = await bucket.get(`workspaces/${context.workspace.id}/sites/${current.id}/releases/${release}/report.json`);
    if (!report) throw conflict('Compile and review this candidate before publishing it.');
    const parsed = JSON.parse(await report.text()) as { inspection?: { blocking?: { message?: string }[] } };
    const blocking = parsed.inspection?.blocking || [];
    if (blocking.length) throw conflict(`This candidate has ${blocking.length} blocking check${blocking.length === 1 ? '' : 's'}: ${String(blocking[0]?.message || 'resolve the blocking checks')}. Compile again after fixing them.`);
  }
  if (action === 'site.refresh') {
    const key = `workspaces/${context.workspace.id}/sites/${current.id}/releases/${document.currentRelease}/source.json`;
    const snapshot = await bucket.get(key);
    if (!snapshot) throw unavailable('Published source snapshot is unavailable. Publish the site again before refreshing.');
    source = JSON.parse(await snapshot.text()) as unknown;
    if (isV2(source)) validateDocument(source); else validateSite(source as SiteDefinition);
  }
  const generation = (document.releases?.length || 0) + 1;
  const releaseId = candidate?.id || `rel_${crypto.randomUUID()}`;
  const built = candidate ? null : await saveRelease(client, bucket, content, context, { ...current, data: source, version: current.version }, releaseId, generation, domain, epoch);
  const manifest = candidate || built!.manifest;
  const itemCount = built?.itemCount || 0;
  const site = { ...document, currentRelease: releaseId, releases: [...(document.releases || []), manifest] }; const at = now(); const version = current.version + 1;
  const common = { siteId: current.id, releaseId, liveUrl: `/v1/sites/${encodeURIComponent(context.workspace.slug)}`, generation, state: 'live' };
  const result: Record<string, unknown> = action === 'site.refresh' ? { ...common, refreshed: true, itemCount } : common;
  const publicUrl = await activatePublication(control, domain, context, current.id, manifest, manifest.epoch);
  if (publicUrl) { result.publicUrl = publicUrl; result.liveUrl = publicUrl; }
  const saved = await client.batch([
    { sql: "UPDATE records SET state='live',data=?,version=?,updated=? WHERE id=? AND version=?", args: [JSON.stringify(site), version, at, current.id, current.version] },
    { sql: `INSERT INTO events(id,kind,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at)
      SELECT ?, 'action', ?, ?, 'accepted', ?, ?, ?, ?, ?, ? WHERE changes()=1`, args: [`evt_${crypto.randomUUID()}`, current.id, action, context.identity.id, inputHash, key, JSON.stringify({ result }), at, at] },
    { sql: "UPDATE records SET state='replaced',version=version+1,updated=? WHERE type='site' AND state='live' AND id<>? AND EXISTS(SELECT 1 FROM events WHERE action_id=? AND idempotency_key=? AND record_id=?)", args: [at, current.id, action, key, current.id] },
  ], 'write');
  if (saved[0].rowsAffected !== 1 || saved[1].rowsAffected !== 1) throw conflict('The reviewed release may be live, but the workspace projection changed. Reload the site before retrying.');
  return publicUrl ? { ...result, publicUrl } : result;
}

export async function executeSitePublish(client: Client, bucket: R2Bucket | undefined, context: AccessContext, input: Record<string, unknown>, key: string, inputHash: string, control?: D1Database, domain?: string, content?: R2Bucket): Promise<Record<string, unknown>> {
  return publishCurrent(client, bucket, context, input, key, inputHash, 'site.publish', control, domain, content);
}

export async function executeSiteRollback(client: Client, context: AccessContext, input: Record<string, unknown>, key: string, inputHash: string, control?: D1Database, domain?: string, bucket?: R2Bucket, content?: R2Bucket): Promise<Record<string, unknown>> {
  const current = await getSiteRecord(client, text(input.siteId, 160) || undefined); if (!current) throw notFound('Site was not found.');
  const document = readDocument(current.data).doc;
  const releaseId = text(input.releaseId, 160); if (!document.releases?.some((release) => release.id === releaseId)) throw notFound('Site release was not found.');
  const site = { ...document, currentRelease: releaseId }; const at = now();
  const result: Record<string, unknown> = { siteId: current.id, releaseId, rolledBack: true, state: 'live' };
  const release = document.releases.find((entry) => entry.id === releaseId)!;
  const authority = control ? await control.withSession('first-primary').prepare('SELECT site,epoch FROM sites WHERE workspace=?')
    .bind(context.workspace.id).first<{ site: string; epoch: number }>() : null;
  if (authority && authority.site !== current.id) throw conflict('Another site owns this workspace publication.');
  if (control && release.host !== siteHost(domain, context.workspace.slug))
    throw conflict('This release was built for another primary address. Compile a new candidate for the current address.');
  if (control) {
    if (!bucket) throw unavailable('Site release storage is not configured.');
    const retained = await readCandidate(bucket, context, current.id, releaseId);
    const checked = await compileAll(client, retained.source, siteOrigin(domain, context.workspace.slug), assetReader(content, context, current.id));
    if (retained.manifest.hash !== release.hash || checked.hash !== release.hash)
      throw conflict('Public facts changed since this release. Compile and review a new candidate instead of restoring stale content.');
  }
  const publicUrl = await activatePublication(control, domain, context, current.id, release, authority?.epoch || 0);
  if (publicUrl) result.publicUrl = publicUrl;
  const saved = await client.batch([
    { sql: "UPDATE records SET state='live',data=?,version=version+1,updated=? WHERE id=? AND version=?", args: [JSON.stringify(site), at, current.id, current.version] },
    { sql: `INSERT INTO events(id,kind,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at)
      SELECT ?, 'action', ?, 'site.rollback', 'accepted', ?, ?, ?, ?, ?, ? WHERE changes()=1`, args: [`evt_${crypto.randomUUID()}`, current.id, context.identity.id, inputHash, key, JSON.stringify({ result }), at, at] },
  ], 'write');
  if (saved[0].rowsAffected !== 1 || saved[1].rowsAffected !== 1) throw conflict('The restored release may be live, but the workspace projection changed. Reload the site before retrying.');
  return result;
}

export async function executeSiteRefresh(client: Client, bucket: R2Bucket | undefined, context: AccessContext, input: Record<string, unknown>, key: string, inputHash: string, control?: D1Database, domain?: string, content?: R2Bucket): Promise<Record<string, unknown>> {
  return publishCurrent(client, bucket, context, input, key, inputHash, 'site.refresh', control, domain, content);
}

export async function executeSiteUnpublish(client: Client, context: AccessContext, input: Record<string, unknown>, key: string, inputHash: string, control?: D1Database): Promise<Record<string, unknown>> {
  if (!control) throw unavailable('Site publication authority is not configured.');
  const current = await getSiteRecord(client, text(input.siteId, 160) || undefined);
  if (!current) throw notFound('Site was not found.');
  const live = await control.withSession('first-primary').prepare('SELECT site,epoch,status FROM sites WHERE workspace=?')
    .bind(context.workspace.id).first<{ site: string; epoch: number; status: string }>();
  if (live && live.site !== current.id) throw conflict('Another site owns this workspace publication.');
  if (live?.status === 'active') {
    const blocked = await control.prepare("UPDATE sites SET status='paused',release='',hash='',epoch=epoch+1,updated=? WHERE workspace=? AND site=? AND epoch=? AND status='active'")
      .bind(now(), context.workspace.id, current.id, live.epoch).run();
    if (blocked.meta.changes !== 1) throw conflict('Site publication changed concurrently. Refresh and try again.');
  }
  const site = { ...readDocument(current.data).doc, currentRelease: null };
  const at = now();
  const result = { siteId: current.id, unpublished: true };
  const saved = await client.batch([
    { sql: "UPDATE records SET state='draft',data=?,version=version+1,updated=? WHERE id=? AND version=?", args: [JSON.stringify(site), at, current.id, current.version] },
    { sql: `INSERT INTO events(id,kind,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at)
      SELECT ?, 'action', ?, 'site.unpublish', 'accepted', ?, ?, ?, ?, ?, ? WHERE changes()=1`, args: [`evt_${crypto.randomUUID()}`, current.id, context.identity.id, inputHash, key, JSON.stringify({ result }), at, at] },
  ], 'write');
  if (saved[0].rowsAffected !== 1 || saved[1].rowsAffected !== 1) throw conflict('Site changed while unpublishing. Public serving is blocked; refresh to reconcile the draft.');
  return result;
}

/** Approved public facts only: private workspace records never reach a model or a draft. */
async function publicFacts(client: Client, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const records = Array.isArray(input.records) ? (input.records as unknown[]).filter((id): id is string => typeof id === 'string').slice(0, 40) : [];
  const facts: Record<string, unknown> = {};
  if (typeof input.goal === 'string') facts.goal = text(input.goal, 300);
  if (!records.length) return facts;
  const collected = await publicRecords(client, records, 'pos.product');
  if (collected.length) facts.catalog = collected.slice(0, 20);
  return facts;
}

/**
 * One bounded plan -> compose pass, followed by evidence checks on prose claims.
 * A model outage keeps the product usable: the retained generator drafts the
 * site and the reason is reported instead of failing the request.
 */
async function tryCompose(
  ai: Ai,
  model: string | undefined,
  brief: { goal: string; audience: string; tone: string },
  facts: Record<string, unknown>,
  design: Design,
  typesafe: string | undefined,
  control: D1Database | undefined,
  context: AccessContext,
): Promise<{ document: SiteDocument | null; note: string }> {
  const runner = new ModelRunner(ai, model || SITE_MODEL_FALLBACKS[0]);
  try {
    const plan = await planSite(runner, { brief, facts, design });
    const composed = await composeSite(runner, plan, { brief, facts, design });
    const document = composed.document;
    document.brief = brief;
    document.design = design;
    const cache = { control, workspace: context.workspace.id, version: 'claims-1' };
    const checked: NonNullable<SiteDocument['claims']> = [];
    for (const claim of composed.claims.slice(0, 8)) {
      const verdict = typesafe ? await checkClaim(typesafe, cache, { claim: claim.text, evidence: claim.evidence || [] }) : { verdict: 'unsupported' as const, confidence: null };
      checked.push({ text: claim.text, verdict: verdict.verdict, ...(claim.evidence?.length ? { evidence: [...claim.evidence] } : {}) });
    }
    document.claims = checked;
    return { document, note: '' };
  } catch (error) {
    const reason = error instanceof BudgetExceeded
      ? 'The model budget for this run was reached.'
      : 'The model was unavailable, so the standard structure was used.';
    return { document: null, note: reason };
  }
}

/** Release history retained for rollback, newest last. */
export async function executeSiteReleases(client: Client, context: AccessContext, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const current = await getSiteRecord(client, text(input.siteId, 160) || undefined);
  if (!current) throw notFound('Site was not found.');
  const document = readDocument(current.data).doc;
  return { siteId: current.id, revision: document.revision, releases: document.releases || [] };
}

/** Read the stored release checks. Report files sit outside manifest.files and are never served. */
export async function executeSiteChecks(client: Client, bucket: R2Bucket | undefined, context: AccessContext, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!bucket) throw unavailable('Site release storage is not configured.');
  const current = await getSiteRecord(client, text(input.siteId, 160) || undefined);
  if (!current) throw notFound('Site was not found.');
  const release = text(input.releaseId, 160) || readDocument(current.data).doc.currentRelease || '';
  if (!/^rel_[a-f0-9-]{36}$/.test(release)) throw badRequest('Choose a compiled site candidate.');
  const report = await bucket.get(`workspaces/${context.workspace.id}/sites/${current.id}/releases/${release}/report.json`);
  if (!report) throw notFound('No checks were stored for this candidate.');
  const parsed = JSON.parse(await report.text()) as { inspection?: Record<string, unknown>; created?: number };
  return { siteId: current.id, releaseId: release, checks: parsed.inspection || null, created: parsed.created || null };
}
