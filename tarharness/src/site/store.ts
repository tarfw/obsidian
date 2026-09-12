/**
 * TAR Site Bot Store & Action Handlers (parv2.md §5, §13, §15)
 *
 * Implements Effect-based execution for site actions:
 * site.generate, site.update, site.compile, site.publish, site.rollback,
 * and site.refresh.
 */

import type { Client } from '@libsql/client/web';
import { Effect } from 'effect';
import { badRequest, conflict, forbidden, notFound, unavailable } from '../errors.ts';
import type { AccessContext } from '../types.ts';
import {
  DEFAULT_DESIGN_TOKENS,
  type CardDefinition,
  type DesignTokens,
  type PageDefinition,
  type ReleaseManifest,
  type SiteDefinition,
  type SitePatchOperation,
  type ThemeName,
} from './schema.ts';
import { compileSiteHtml } from './renderer.ts';

type SiteError = ReturnType<typeof badRequest> | ReturnType<typeof conflict> | ReturnType<typeof forbidden> | ReturnType<typeof notFound> | ReturnType<typeof unavailable>;

const now = () => Date.now();
const object = (val: unknown): Record<string, unknown> => (val !== null && typeof val === 'object' && !Array.isArray(val) ? (val as Record<string, unknown>) : {});

export function createDefaultSite(title: string, prompt: string, theme: ThemeName = 'editorial-chalk'): SiteDefinition {
  const design: DesignTokens = DEFAULT_DESIGN_TOKENS[theme] || DEFAULT_DESIGN_TOKENS['editorial-chalk'];

  const homeCards: CardDefinition[] = [
    {
      id: 'nav',
      kind: 'navigation',
      version: 1,
      props: {
        brand: title,
        links: [
          { label: 'Home', href: '#' },
          { label: 'Menu', href: '#menu' },
          { label: 'About', href: '#about' },
          { label: 'Hours', href: '#hours' },
          { label: 'Contact', href: '#contact' },
        ],
      },
    },
    {
      id: 'hero',
      kind: 'hero',
      version: 1,
      title: title,
      props: {
        badge: 'Crafted Daily',
        headline: title,
        subtext: prompt.length > 10 ? prompt : `Fresh, authentic food and drinks made with the finest local ingredients.`,
        primaryCta: { label: 'Explore Offerings', href: '#menu' },
        secondaryCta: { label: 'Find Us', href: '#contact' },
      },
    },
    {
      id: 'content-about',
      kind: 'content',
      version: 1,
      title: 'Our Story',
      props: {
        body: `At ${title}, we believe quality ingredients and dedicated craft speak for themselves. We prepare everything with attention to detail and a commitment to genuine hospitality.`,
      },
    },
    {
      id: 'menu',
      kind: 'collection',
      version: 1,
      title: 'Our Favorites',
      props: {
        items: [
          { title: 'Signature Margherita', price: 24900, description: 'San Marzano tomatoes, fresh buffalo mozzarella, fresh basil, extra virgin olive oil.' },
          { title: 'Truffle & Mushroom', price: 32900, description: 'Wild mushrooms, truffle cream, smoked mozzarella, fresh thyme.' },
          { title: 'Classic Cold Brew', price: 12000, description: 'Steeped for 18 hours, smooth with subtle chocolate notes.' },
        ],
      },
    },
    {
      id: 'features',
      kind: 'features',
      version: 1,
      title: 'Why Slice House',
      props: {
        features: [
          { icon: '🌾', title: 'Stoneground Flour', description: 'Naturally fermented 48-hour slow dough for ideal texture and digestion.' },
          { icon: '🔥', title: 'Wood-Fired Oven', description: 'Cooked at 450°C in under 90 seconds for a perfect blistered crust.' },
          { icon: '🌱', title: 'Local Sourcing', description: 'Fresh produce sourced directly from nearby organic farms.' },
        ],
      },
    },
    {
      id: 'proof',
      kind: 'proof',
      version: 1,
      title: 'Reviews',
      props: {
        testimonials: [
          { quote: 'Hands down the best crust in town. The attention to detail is unmatched.', author: 'Kavitha R.', role: 'Food Critic' },
          { quote: 'Warm atmosphere, incredible food, and fast service every single time.', author: 'Senthil M.', role: 'Regular' },
        ],
      },
    },
    {
      id: 'faq',
      kind: 'faq',
      version: 1,
      title: 'Questions & Answers',
      props: {
        items: [
          { q: 'Do you offer vegan or gluten-sensitive options?', a: 'Yes! We offer vegan cheese and gluten-friendly crust options upon request.' },
          { q: 'Can I book for large parties or private events?', a: 'Absolutely. Contact us directly or submit an enquiry below for parties of 8 or more.' },
        ],
      },
    },
    {
      id: 'hours',
      kind: 'hours',
      version: 1,
      title: 'Operating Hours',
      props: {
        schedule: [
          { days: 'Monday – Thursday', hours: '12:00 PM – 10:30 PM' },
          { days: 'Friday – Sunday', hours: '11:30 AM – 11:30 PM' },
        ],
      },
    },
    {
      id: 'contact',
      kind: 'contact',
      version: 1,
      title: 'Visit Us',
      props: {
        address: '12 Temple Road, Anna Nagar, Chennai, Tamil Nadu',
        phone: '+91 98400 12345',
        email: 'hello@slicehouse.in',
      },
    },
    {
      id: 'form',
      kind: 'form',
      version: 1,
      title: 'Book a Table or Request Catering',
      props: {
        submitLabel: 'Send Request',
      },
    },
    {
      id: 'cta',
      kind: 'cta',
      version: 1,
      title: 'Join Us Today',
      props: {
        headline: 'Experience Slice House Tonight',
        text: 'Dine in with us or place a takeaway order for pickup.',
        buttonLabel: 'Order Pickup',
        href: '#contact',
      },
    },
    {
      id: 'footer',
      kind: 'footer',
      version: 1,
      props: {
        brand: title,
        text: `© ${new Date().getFullYear()} ${title}. All rights reserved. Powered by TAR.`,
        links: [
          { label: 'Privacy', href: '#' },
          { label: 'Terms', href: '#' },
          { label: 'Nutrition', href: '#' },
        ],
      },
    },
  ];

  const homePage: PageDefinition = {
    id: 'page-home',
    path: '/',
    title: 'Home',
    meta: {
      description: `${title} — Artisanal food, drinks and catering.`,
    },
    cards: homeCards,
  };

  return {
    schema: '1.0.0',
    design,
    locale: 'en',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    pages: [homePage],
    journeys: [
      {
        id: 'journey-enquiry',
        title: 'Customer Enquiry',
        target: 'record.create',
        version: 1,
        input: { type: 'lead' },
        outcome: 'Enquiry captured and routed to team Inbox',
      },
    ],
    variants: [],
    surfaces: [],
    policy: {
      publicOrdering: true,
      publicEnquiry: true,
      allowedCurrencies: ['INR'],
    },
  };
}

export async function getSiteRecord(client: Client, siteId?: string): Promise<{ id: string; version: number; state: string; data: SiteDefinition } | null> {
  const query = siteId
    ? { sql: "SELECT * FROM records WHERE id=? AND type='site' AND archived IS NULL LIMIT 1", args: [siteId] }
    : { sql: "SELECT * FROM records WHERE type='site' AND archived IS NULL ORDER BY updated DESC, created DESC LIMIT 1", args: [] };

  const res = await client.execute(query);
  const row = res.rows[0];
  if (!row) return null;

  return {
    id: String(row.id),
    version: Number(row.version),
    state: String(row.state),
    data: object(typeof row.data === 'string' ? JSON.parse(row.data) : row.data) as unknown as SiteDefinition,
  };
}

export async function executeSiteGenerate(
  client: Client,
  context: AccessContext,
  input: Record<string, unknown>,
  key: string,
  hash: string
): Promise<Record<string, unknown>> {
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : typeof input.description === 'string' ? input.description.trim() : '';
  const title = typeof input.title === 'string' ? input.title.trim() : context.workspace.name || 'Workspace Site';
  const theme = (typeof input.theme === 'string' && (input.theme === 'streetwear-dark' || input.theme === 'minimal-clean') ? input.theme : 'editorial-chalk') as ThemeName;

  const siteDef = createDefaultSite(title, prompt, theme);
  const siteId = `site_${crypto.randomUUID().slice(0, 8)}`;
  const stamp = now();

  const rendered = await compileSiteHtml(siteDef);

  const fullData: SiteDefinition = {
    ...siteDef,
    currentRelease: null,
    releases: [],
  };

  const result = {
    siteId,
    version: 1,
    state: 'draft',
    site: fullData,
    preview: {
      html: rendered.html,
      css: rendered.css,
      hash: rendered.hash,
    },
  };

  await client.batch([
    {
      sql: `INSERT INTO records (id, type, title, state, data, owner, version, created, updated)
            VALUES (?, 'site', ?, 'draft', ?, ?, 1, ?, ?)`,
      args: [siteId, title, JSON.stringify(fullData), context.identity.id, stamp, stamp],
    },
    {
      sql: `INSERT INTO events (id, kind, record_id, action_id, state, actor_id, input_hash, idempotency_key, data, created_at, updated_at)
            VALUES (?, 'action', ?, 'site.generate', 'accepted', ?, ?, ?, ?, ?, ?)`,
      args: [`evt_${crypto.randomUUID()}`, siteId, context.identity.id, hash, key, JSON.stringify({ result }), stamp, stamp],
    },
  ], 'write');

  return result;
}

export async function executeSiteUpdate(
  client: Client,
  context: AccessContext,
  input: Record<string, unknown>,
  key: string,
  hash: string
): Promise<Record<string, unknown>> {
  const siteId = String(input.siteId || '');
  const baseVersion = Number(input.baseVersion);
  if (!siteId || !Number.isInteger(baseVersion)) throw badRequest('siteId and baseVersion are required.');

  const existing = await getSiteRecord(client, siteId);
  if (!existing) throw notFound('Site record not found.');
  if (existing.version !== baseVersion) throw conflict('Site was modified concurrently. Refresh and try again.');

  const operations = Array.isArray(input.operations) ? (input.operations as SitePatchOperation[]) : [];
  let updatedDef: SiteDefinition = { ...existing.data };

  for (const op of operations) {
    if (op.op === 'set_theme' && typeof op.value === 'string' && op.value in DEFAULT_DESIGN_TOKENS) {
      updatedDef = { ...updatedDef, design: DEFAULT_DESIGN_TOKENS[op.value as ThemeName] };
    } else if (op.op === 'set_locale' && typeof op.value === 'string') {
      updatedDef = { ...updatedDef, locale: op.value };
    } else if (op.op === 'add_card' && op.value && typeof op.value === 'object') {
      const page = updatedDef.pages[0];
      if (page) {
        const nextCards = [...page.cards, op.value as CardDefinition];
        updatedDef = { ...updatedDef, pages: [{ ...page, cards: nextCards }] };
      }
    } else if (op.op === 'remove_card' && typeof op.value === 'string') {
      const page = updatedDef.pages[0];
      if (page) {
        const nextCards = page.cards.filter((c) => c.id !== op.value);
        updatedDef = { ...updatedDef, pages: [{ ...page, cards: nextCards }] };
      }
    } else if (op.op === 'update_card' && op.value && typeof op.value === 'object') {
      const cardVal = op.value as Partial<CardDefinition> & { id: string };
      const page = updatedDef.pages[0];
      if (page && cardVal.id) {
        const nextCards = page.cards.map((c) => (c.id === cardVal.id ? { ...c, ...cardVal, props: { ...c.props, ...cardVal.props } } : c));
        updatedDef = { ...updatedDef, pages: [{ ...page, cards: nextCards }] };
      }
    }
  }

  const stamp = now();
  const nextVersion = baseVersion + 1;
  const result = { siteId, version: nextVersion, site: updatedDef };

  await client.batch([
    {
      sql: `UPDATE records SET data=?, version=?, updated=? WHERE id=? AND version=?`,
      args: [JSON.stringify(updatedDef), nextVersion, stamp, siteId, baseVersion],
    },
    {
      sql: `INSERT INTO events (id, kind, record_id, action_id, state, actor_id, input_hash, idempotency_key, data, created_at, updated_at)
            VALUES (?, 'action', ?, 'site.update', 'accepted', ?, ?, ?, ?, ?, ?)`,
      args: [`evt_${crypto.randomUUID()}`, siteId, context.identity.id, hash, key, JSON.stringify({ result }), stamp, stamp],
    },
  ], 'write');

  return result;
}

export async function executeSiteCompile(
  client: Client,
  context: AccessContext,
  input: Record<string, unknown>,
  key: string,
  hash: string
): Promise<Record<string, unknown>> {
  const siteId = String(input.siteId || '');
  const existing = await getSiteRecord(client, siteId || undefined);
  if (!existing) throw notFound('Site record not found.');

  const rendered = await compileSiteHtml(existing.data);
  const stamp = now();
  const releaseId = `rel_${stamp}`;

  const manifest: ReleaseManifest = {
    id: releaseId,
    siteId: existing.id,
    version: existing.version,
    generation: (existing.data.releases?.length || 0) + 1,
    created: stamp,
    html: rendered.html,
    css: rendered.css,
    hash: rendered.hash,
    files: [
      { path: '/index.html', mime: 'text/html; charset=utf-8', bytes: rendered.html.length, hash: rendered.hash },
      { path: '/style.css', mime: 'text/css; charset=utf-8', bytes: rendered.css.length, hash: rendered.hash },
    ],
  };

  const result = {
    releaseId,
    manifest,
    hash: rendered.hash,
  };

  await client.execute({
    sql: `INSERT INTO events (id, kind, record_id, action_id, state, actor_id, input_hash, idempotency_key, data, created_at, updated_at)
          VALUES (?, 'action', ?, 'site.compile', 'accepted', ?, ?, ?, ?, ?, ?)`,
    args: [`evt_${crypto.randomUUID()}`, existing.id, context.identity.id, hash, key, JSON.stringify({ result }), stamp, stamp],
  });

  return result;
}

export async function executeSitePublish(
  client: Client,
  context: AccessContext,
  input: Record<string, unknown>,
  key: string,
  hash: string
): Promise<Record<string, unknown>> {
  const siteId = String(input.siteId || '');
  const existing = await getSiteRecord(client, siteId || undefined);
  if (!existing) throw notFound('Site record not found.');

  const rendered = await compileSiteHtml(existing.data);
  const stamp = now();
  const generation = (existing.data.releases?.length || 0) + 1;
  const releaseId = `rel_${stamp}`;

  const manifest: ReleaseManifest = {
    id: releaseId,
    siteId: existing.id,
    version: existing.version + 1,
    generation,
    created: stamp,
    html: rendered.html,
    css: rendered.css,
    hash: rendered.hash,
    files: [
      { path: '/index.html', mime: 'text/html; charset=utf-8', bytes: rendered.html.length, hash: rendered.hash },
      { path: '/style.css', mime: 'text/css; charset=utf-8', bytes: rendered.css.length, hash: rendered.hash },
    ],
  };

  const updatedDef: SiteDefinition = {
    ...existing.data,
    currentRelease: releaseId,
    releases: [...(existing.data.releases || []), manifest],
  };

  const subdomain = String(input.subdomain || context.workspace.slug || 'site');
  const liveUrl = `/v1/sites/${encodeURIComponent(subdomain)}`;
  const nextVersion = existing.version + 1;

  const result = {
    siteId: existing.id,
    releaseId,
    liveUrl,
    generation,
    state: 'live',
  };

  await client.batch([
    {
      sql: `UPDATE records SET state='live', data=?, version=?, updated=? WHERE id=?`,
      args: [JSON.stringify(updatedDef), nextVersion, stamp, existing.id],
    },
    {
      sql: `INSERT INTO events (id, kind, record_id, action_id, state, actor_id, input_hash, idempotency_key, data, created_at, updated_at)
            VALUES (?, 'action', ?, 'site.publish', 'accepted', ?, ?, ?, ?, ?, ?)`,
      args: [`evt_${crypto.randomUUID()}`, existing.id, context.identity.id, hash, key, JSON.stringify({ result }), stamp, stamp],
    },
  ], 'write');

  return result;
}

export async function executeSiteRollback(
  client: Client,
  context: AccessContext,
  input: Record<string, unknown>,
  key: string,
  hash: string
): Promise<Record<string, unknown>> {
  const siteId = String(input.siteId || '');
  const releaseId = String(input.releaseId || '');
  if (!releaseId) throw badRequest('releaseId is required for rollback.');

  const existing = await getSiteRecord(client, siteId || undefined);
  if (!existing) throw notFound('Site record not found.');

  const targetRelease = existing.data.releases?.find((r) => r.id === releaseId);
  if (!targetRelease) throw notFound(`Release ${releaseId} not found in site history.`);

  const stamp = now();
  const nextVersion = existing.version + 1;
  const updatedDef: SiteDefinition = {
    ...existing.data,
    currentRelease: releaseId,
  };

  const result = { siteId: existing.id, releaseId, rolledBack: true };

  await client.batch([
    {
      sql: `UPDATE records SET data=?, version=?, updated=? WHERE id=?`,
      args: [JSON.stringify(updatedDef), nextVersion, stamp, existing.id],
    },
    {
      sql: `INSERT INTO events (id, kind, record_id, action_id, state, actor_id, input_hash, idempotency_key, data, created_at, updated_at)
            VALUES (?, 'action', ?, 'site.rollback', 'accepted', ?, ?, ?, ?, ?, ?)`,
      args: [`evt_${crypto.randomUUID()}`, existing.id, context.identity.id, hash, key, JSON.stringify({ result }), stamp, stamp],
    },
  ], 'write');

  return result;
}

export async function executeSiteRefresh(
  client: Client,
  context: AccessContext,
  input: Record<string, unknown>,
  key?: string,
  hash?: string
): Promise<Record<string, unknown>> {
  const siteId = String(input.siteId || '');
  const existing = await getSiteRecord(client, siteId || undefined);
  if (!existing) throw notFound('Site record not found.');

  let itemCount = 0;
  let updatedDef = existing.data;

  // Refresh products from workspace POS catalog if present
  const productRows = await client.execute("SELECT title, data FROM records WHERE type='pos.product' AND archived IS NULL LIMIT 12");
  if (productRows.rows.length > 0) {
    const freshItems = productRows.rows.map((row) => {
      const data = object(typeof row.data === 'string' ? JSON.parse(row.data) : row.data);
      return {
        title: String(row.title),
        price: Number(data.price || 0),
        description: String(data.description || ''),
      };
    });
    itemCount = freshItems.length;

    const page = existing.data.pages[0];
    if (page) {
      const nextCards = page.cards.map((c) => (c.kind === 'collection' ? { ...c, props: { ...c.props, items: freshItems } } : c));
      updatedDef = { ...existing.data, pages: [{ ...page, cards: nextCards }] };
    }
  }

  const stamp = now();
  const nextVersion = existing.version + 1;
  const result = { refreshed: true, itemCount };

  const stmts: { sql: string; args: (string | number | null)[] }[] = [
    {
      sql: `UPDATE records SET data=?, version=?, updated=? WHERE id=?`,
      args: [JSON.stringify(updatedDef), nextVersion, stamp, existing.id],
    },
  ];

  if (key && hash) {
    stmts.push({
      sql: `INSERT INTO events (id, kind, record_id, action_id, state, actor_id, input_hash, idempotency_key, data, created_at, updated_at)
            VALUES (?, 'action', ?, 'site.refresh', 'accepted', ?, ?, ?, ?, ?, ?)`,
      args: [`evt_${crypto.randomUUID()}`, existing.id, context.identity.id, hash, key, JSON.stringify({ result }), stamp, stamp],
    });
  }

  await client.batch(stmts, 'write');
  return result;
}
