/**
 * Deterministic site builder.
 *
 * `buildSite` turns a brief, approved facts and a Blueprint (the answers of one
 * creation fan-out) into a complete, valid site document. It invents nothing:
 * every block carries supplied facts, or plain text derived from the owner's own
 * brief. A block whose evidence is missing is omitted, never faked.
 */

import { THEMES, DEFAULT_DESIGN, TONE_STYLE, type Design } from './design.ts';
import { DOCUMENT_VERSION, type Asset, type Brief, type Journey, type Node, type Page, type Section, type SiteDocument, type StyleSet } from './document.ts';

export type Density = 'airy' | 'balanced' | 'compact';
export type Tone = 'canvas' | 'surface' | 'ink' | 'accent';

/** Everything the creation fan-out may decide. Each field has a deterministic default. */
export interface Blueprint {
  theme: string;
  density: Density;
  tone: Tone;
  columns: number;
  /** Hero treatment: full-bleed wide image, split editorial, or none. */
  heroStyle: 'fullbleed_16_6' | 'split_16_9' | 'none';
  /** Order sections follow on the home page. */
  flow: 'classic_lookbook' | 'commerce_first' | 'editorial_first';
  /** Whether product cards carry a quick-add action. */
  quickAdd: boolean;
  purposes: string[];
  extras: string[];
  assets: string[];
  enquiry: boolean;
}

/** Home-page section order per declared flow. Purposes without evidence are skipped. */
export const SECTION_FLOWS: Record<Blueprint['flow'], readonly string[]> = {
  classic_lookbook: ['introduction', 'collection', 'split', 'story', 'recommendations', 'categories', 'promo'],
  commerce_first: ['introduction', 'collection', 'recommendations', 'promo', 'split', 'categories', 'story'],
  editorial_first: ['introduction', 'split', 'collection', 'story', 'categories', 'recommendations', 'promo'],
};

/** Approved facts, gathered by code. The builder never queries the database itself. */
export interface Facts {
  items?: Record<string, unknown>[];
  channel?: string;
  features?: string[];
  proof?: { quote: string; author: string }[];
  questions?: { q: string; a: string }[];
  hours?: string[];
  address?: string;
  phone?: string;
  email?: string;
}

/** One text slot the prose pass may rewrite. Headings and facts are never slots. */
export interface Slot {
  id: string;
  limit: number;
  purpose: string;
  current: string;
}

export interface BuildInput {
  title: string;
  brief: Brief;
  facts: Facts;
  blueprint: Blueprint;
  assets?: Asset[];
  previous?: SiteDocument | null;
}

/** Answers a taste profile prefers, so a rejected choice is never re-offered. */
export function tasteBias(taste: SiteDocument['taste']): Set<string> {
  return new Set([...(taste?.rejected || [])].map((entry) => entry.split(':').slice(-1)[0]));
}

const slug = (value: string, fallback: string): string => {
  const clean = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return /^[a-z][a-z0-9-]*$/.test(clean) ? clean : fallback;
};

const padFor = (density: Density): string => density === 'airy' ? 'token:space.section' : density === 'compact' ? 'token:space.unit' : 'lg';

const style = (density: Density, tone?: Tone): StyleSet => ({
  base: { pad: padFor(density), ...(tone ? TONE_STYLE[tone] : {}) },
});

export function defaultBlueprint(brief: Brief, taste?: SiteDocument['taste']): Blueprint {
  const avoid = tasteBias(taste);
  const themes = Object.keys(THEMES).filter((id) => !avoid.has(id));
  const isLookbook = /adanola|lookbook|fashion|apparel|editorial/i.test(brief.goal || '') || /adanola|lookbook|fashion|apparel|editorial/i.test(brief.audience || '');
  const chosenTheme = isLookbook && themes.includes('editorial-lookbook')
    ? 'editorial-lookbook'
    : (themes.includes('minimal-clean') ? 'minimal-clean' : themes[0] || DEFAULT_DESIGN.theme);
  const density: Density = isLookbook ? 'compact' : (avoid.has('compact') ? 'airy' : 'balanced');
  return {
    theme: chosenTheme,
    density,
    tone: 'canvas',
    columns: isLookbook ? 4 : 3,
    heroStyle: isLookbook ? 'fullbleed_16_6' : 'none',
    flow: 'classic_lookbook',
    quickAdd: isLookbook,
    purposes: ['introduction', 'collection', 'story', 'action'],
    extras: isLookbook ? ['shop'] : [],
    assets: [],
    enquiry: false,
  };
}

function designFor(theme: string, density: Density, brief: Brief): Design {
  const base = THEMES[theme] || DEFAULT_DESIGN;
  return {
    ...structuredClone(base),
    direction: {
      ...base.direction,
      audience: brief.audience || base.direction.audience,
      purpose: brief.goal || base.direction.purpose,
      voice: brief.tone || base.direction.voice,
      density,
    },
  };
}

function navigation(title: string, paths: string[]): Node {
  return {
    id: 'bar', kind: 'navigation',
    props: { brand: title, links: paths.map((path) => ({ label: path === '/' ? 'Home' : path.slice(1).replace(/-/g, ' '), href: path })) },
  };
}

function buttons(at: string, paths: string[], enquiry: boolean): Node[] {
  const entries: Node[] = [];
  if (enquiry) entries.push({ id: `${at}-ask`, kind: 'button', props: { label: 'Enquire', journey: 'enquiry' } });
  else entries.push({ id: `${at}-more`, kind: 'button', props: { label: 'Explore', href: paths.find((path) => path !== '/') || '/' } });
  return [{ id: `${at}-row`, kind: 'flex', props: {}, children: entries }];
}

/** Approved media among the blueprint's chosen assets, best match first. */
function approvedMedia(input: BuildInput, kinds: readonly Asset['kind'][]): Asset[] {
  const wanted = new Set(input.blueprint.assets);
  return (input.assets || []).filter((asset) => wanted.has(asset.id) && asset.rights.approved && kinds.includes(asset.kind));
}

/** One section per declared purpose. Purposes without evidence are skipped. */
function block(purpose: string, at: string, input: BuildInput, paths: string[], slots: Slot[]): Section | null {
  const { brief, facts, blueprint } = input;
  const isLookbook = blueprint.theme === 'editorial-lookbook' || /adanola|lookbook/i.test(brief.goal || '');
  const plain = brief.goal || `${input.title} online`;
  switch (purpose) {
    case 'chrome':
      return null;
    case 'introduction': {
      if (isLookbook) {
        // Every word derives from the owner's own title and brief; the prose pass may rewrite the slots.
        const headline = input.title || brief.goal.slice(0, 60);
        const shop = paths.find((path) => path !== '/') || '/shop';
        const hero: Section = {
          id: at, purpose: 'introduction', layout: { kind: blueprint.heroStyle === 'split_16_9' ? 'flex' : 'stack' }, style: style(blueprint.density, blueprint.tone),
          nodes: [
            { id: `${at}-title`, kind: 'heading', props: { text: headline, level: 1 } },
            { id: `${at}-cta`, kind: 'button', props: { label: 'Shop now', href: shop, variant: 'outline' } },
          ],
        };
        const [media] = approvedMedia(input, ['image']);
        if (media && blueprint.heroStyle !== 'none') hero.nodes.unshift({ id: `${at}-media`, kind: 'image', props: { asset: media.id, alt: media.alt || input.title } });
        slots.push({ id: `${at}-title`, limit: 60, purpose, current: headline });
        return hero;
      }
      const headline = input.title;
      const children: Node[] = [
        { id: `${at}-title`, kind: 'heading', props: { text: headline, level: 1 } },
        { id: `${at}-line`, kind: 'text', props: { text: plain } },
        ...buttons(at, paths, blueprint.enquiry),
      ];
      const image = blueprint.assets.find((id) => (input.assets || []).some((asset) => asset.id === id && asset.kind === 'image'));
      if (image) children.push({ id: `${at}-image`, kind: 'image', props: { asset: image, alt: `${input.title}` } });
      slots.push({ id: `${at}-line`, limit: 220, purpose, current: plain });
      return { id: at, purpose: 'introduction', layout: { kind: 'stack' }, style: style(blueprint.density, blueprint.tone), nodes: children };
    }
    case 'collection': {
      const ids = (facts.items || []).map((item) => String(item.id || '')).filter(Boolean);
      if (!ids.length) {
        // No catalog records yet: lookbook stores show placeholder cards the
        // owner replaces the moment products exist. No prices, no fake stock.
        if (!isLookbook) return null;
        return {
          id: at, purpose: 'collection', layout: { kind: 'grid', columns: blueprint.columns },
          style: style(blueprint.density),
          nodes: [{ id: `${at}-list`, kind: 'collection', props: { placeholders: blueprint.columns * 2 } }],
        };
      }
      return {
        id: at, purpose: 'collection', layout: { kind: 'grid', columns: blueprint.columns },
        style: style(blueprint.density),
        nodes: [
          { id: `${at}-list`, kind: 'collection', props: { title: isLookbook ? '' : 'What we offer', slot: 'items', ...(isLookbook && blueprint.quickAdd ? { quickAdd: true } : {}) } },
        ],
        ...(ids.length ? {
          bindings: [{
            id: `${at}-bind`, slot: 'items', query: 'catalog.public', version: 1, access: 'public',
            freshness: 300, params: { records: ids, channel: facts.channel || 'default' },
            empty: { text: 'Availability is published here.' },
          }],
        } : {}),
      };
    }
    case 'recommendations': {
      // Second catalog slot: the tail of the same approved list, resolved by the same public query.
      const ids = (facts.items || []).map((item) => String(item.id || '')).filter(Boolean).slice(-4).reverse();
      if (!ids.length) return null;
      return {
        id: at, purpose: 'recommendations', layout: { kind: 'grid', columns: blueprint.columns },
        style: style(blueprint.density),
        nodes: [
          { id: `${at}-list`, kind: 'collection', props: { slot: 'reco', ...(isLookbook && blueprint.quickAdd ? { quickAdd: true } : {}) } },
        ],
        bindings: [{
          id: `${at}-bind`, slot: 'reco', query: 'catalog.public', version: 1, access: 'public',
          freshness: 300, params: { records: ids, channel: facts.channel || 'default' },
          empty: { text: 'More pieces are published here.' },
        }],
      };
    }
    case 'split': {
      // Editorial two-up: only when two approved media assets exist. Never stock imagery.
      const media = approvedMedia(input, ['image', 'video']).slice(0, 2);
      if (media.length < 2) return null;
      return {
        id: at, purpose: 'split', layout: { kind: 'flex' }, style: style(blueprint.density),
        nodes: media.map((asset): Node => ({ id: `${at}-${asset.id}`, kind: asset.kind === 'video' ? 'video' : 'image', props: { asset: asset.id, alt: asset.alt || input.title } })),
      };
    }
    case 'categories': {
      // Text-tab filter over the pages the owner actually declared. No invented category names.
      const links = paths.filter((path) => path !== '/').slice(0, 6);
      if (!links.length) return null;
      return {
        id: at, purpose: 'categories', layout: { kind: 'flex' }, style: { base: { gap: 'sm', align: 'center' } },
        nodes: links.map((path): Node => ({ id: `${at}-${slug(path, 'cat')}`, kind: 'button', props: { label: path.slice(1).replace(/-/g, ' ').toUpperCase(), href: path, variant: 'outline' } })),
      };
    }
    case 'promo': {
      if (!(facts.items || []).length) return null;
      const text = brief.goal || plain;
      slots.push({ id: `${at}-line`, limit: 200, purpose, current: text });
      return {
        id: at, purpose: 'promo', layout: { kind: 'stack' }, style: { base: { ...TONE_STYLE.ink, pad: padFor(blueprint.density), align: 'center' } },
        nodes: [
          { id: `${at}-line`, kind: 'text', props: { text } },
          { id: `${at}-cta`, kind: 'button', props: { label: isLookbook ? 'Shop now' : 'Explore', href: paths.find((path) => path !== '/') || '/', variant: 'outline' } },
        ],
      };
    }
    case 'features': {
      const entries = (facts.features || []).slice(0, 6);
      if (!entries.length) return null;
      return {
        id: at, purpose: 'features', layout: { kind: 'grid', columns: Math.min(3, entries.length) },
        style: style(blueprint.density),
        nodes: [
          { id: `${at}-title`, kind: 'heading', props: { text: 'Details', level: 2 } },
          ...entries.map((entry, index): Node => ({ id: `${at}-${index + 1}`, kind: 'card', props: {}, children: [{ id: `${at}-${index + 1}-text`, kind: 'text', props: { text: entry } }] })),
        ],
      };
    }
    case 'proof': {
      const entries = (facts.proof || []).slice(0, 6);
      if (!entries.length) return null;
      return {
        id: at, purpose: 'proof', layout: { kind: 'grid', columns: Math.min(3, entries.length) },
        style: style(blueprint.density),
        nodes: [
          { id: `${at}-title`, kind: 'heading', props: { text: 'In their words', level: 2 } },
          ...entries.map((entry, index): Node => ({ id: `${at}-${index + 1}`, kind: 'card', props: {}, children: [{ id: `${at}-${index + 1}-quote`, kind: 'text', props: { text: `“${entry.quote}” — ${entry.author}` } }] })),
        ],
      };
    }
    case 'story': {
      if (isLookbook) {
        const text = brief.goal || plain;
        slots.push({ id: `${at}-body`, limit: 600, purpose, current: text });
        const shop = paths.find((path) => path !== '/') || '/shop';
        return {
          id: at, purpose: 'story', layout: { kind: 'stack' }, style: style(blueprint.density),
          nodes: [
            { id: `${at}-body`, kind: 'text', props: { text } },
            { id: `${at}-row`, kind: 'flex', props: {}, children: [
              { id: `${at}-cta`, kind: 'button', props: { label: 'Shop now', href: shop, variant: 'outline' } },
            ] },
          ],
        };
      }
      const text = brief.audience ? `${plain} Built for ${brief.audience}.` : plain;
      slots.push({ id: `${at}-body`, limit: 600, purpose, current: text });
      return {
        id: at, purpose: 'story', layout: { kind: 'stack' }, style: style(blueprint.density),
        nodes: [
          { id: `${at}-title`, kind: 'heading', props: { text: `About ${input.title}`, level: 2 } },
          { id: `${at}-body`, kind: 'text', props: { text } },
        ],
      };
    }
    case 'questions': {
      const entries = (facts.questions || []).slice(0, 12);
      if (!entries.length) return null;
      return {
        id: at, purpose: 'questions', layout: { kind: 'stack' }, style: style(blueprint.density),
        nodes: [
          { id: `${at}-title`, kind: 'heading', props: { text: 'Questions', level: 2 } },
          { id: `${at}-list`, kind: 'accordion', props: {}, children: entries.map((entry, index): Node => ({
            id: `${at}-${index + 1}`, kind: 'stack', props: { label: entry.q }, children: [{ id: `${at}-${index + 1}-a`, kind: 'text', props: { text: entry.a } }],
          })) },
        ],
      };
    }
    case 'hours': {
      const entries = (facts.hours || []).slice(0, 8);
      if (!entries.length) return null;
      return {
        id: at, purpose: 'hours', layout: { kind: 'stack' }, style: style(blueprint.density),
        nodes: [
          { id: `${at}-title`, kind: 'heading', props: { text: 'Hours', level: 2 } },
          { id: `${at}-list`, kind: 'list', props: { items: entries } },
        ],
      };
    }
    case 'contact': {
      const details = [facts.address, facts.phone && `Phone: ${facts.phone}`, facts.email && `Email: ${facts.email}`].filter((entry): entry is string => Boolean(entry));
      if (!details.length) return null;
      return {
        id: at, purpose: 'contact', layout: { kind: 'stack' }, style: style(blueprint.density),
        nodes: [
          { id: `${at}-title`, kind: 'heading', props: { text: 'Find us', level: 2 } },
          { id: `${at}-list`, kind: 'list', props: { items: details } },
        ],
      };
    }
    case 'enquiry': {
      if (!blueprint.enquiry) return null;
      return {
        id: at, purpose: 'enquiry', layout: { kind: 'stack' }, style: style(blueprint.density, 'surface'),
        nodes: [
          { id: `${at}-title`, kind: 'heading', props: { text: 'Send an enquiry', level: 2 } },
          { id: at, kind: 'form', props: { journey: 'enquiry', submitLabel: 'Send' } },
        ],
      };
    }
    case 'action': {
      const text = enquiryLabel(facts.email);
      return {
        id: at, purpose: 'action', layout: { kind: 'stack' }, style: style(blueprint.density, blueprint.tone === 'ink' ? 'surface' : 'ink'),
        nodes: [
          { id: `${at}-title`, kind: 'heading', props: { text: `Talk to ${input.title}`, level: 2 } },
          { id: `${at}-row`, kind: 'flex', props: {}, children: [
            blueprint.enquiry
              ? { id: `${at}-ask`, kind: 'button', props: { label: 'Enquire', journey: 'enquiry' } }
              : { id: `${at}-mail`, kind: 'button', props: { label: text, href: facts.email ? `mailto:${facts.email}` : '/' } },
          ] },
        ],
      };
    }
    default:
      return null;
  }
}

const enquiryLabel = (email?: string): string => email ? 'Email us' : 'Get in touch';

function journey(enquiry: boolean): Journey[] {
  if (!enquiry) return [];
  return [{
    id: 'enquiry', title: 'Enquiry', target: 'record.create', version: 1,
    input: { type: 'enquiry' }, outcome: 'Appears in Now', enabled: false, kind: 'enquiry',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true, max: 120 },
      { key: 'email', label: 'Email', kind: 'email', required: true, max: 200 },
      { key: 'message', label: 'Message', kind: 'textarea', required: true, max: 1000 },
    ],
  }];
}

/** Compose a complete document from brief, facts and blueprint. Always valid, never model-dependent. */
export function buildSite(input: BuildInput): { doc: SiteDocument; slots: Slot[] } {
  const blueprint: Blueprint = {
    ...input.blueprint,
    theme: THEMES[input.blueprint.theme] ? input.blueprint.theme : DEFAULT_DESIGN.theme,
    purposes: ['introduction', ...input.blueprint.purposes.filter((purpose) => purpose !== 'introduction')],
  };
  const isLookbook = blueprint.theme === 'editorial-lookbook' || /adanola|lookbook/i.test(input.brief.goal || '');
  const lookbookExtras = isLookbook ? ['shop'] : [];
  const allExtras = [...new Set([...(blueprint.extras || []), ...lookbookExtras])];
  const wantsContact = blueprint.purposes.some((purpose) => ['contact', 'hours', 'enquiry'].includes(purpose)) || blueprint.enquiry
    || Boolean(input.facts.email || input.facts.address || input.facts.phone);
  const paths = ['/', ...allExtras.map((entry) => `/${slug(entry, 'page')}`), ...(wantsContact ? ['/contact'] : [])];
  const distinct = [...new Set(paths)];
  const slots: Slot[] = [];

  // The declared flow orders the home page; every purpose still needs evidence to appear.
  const flowOrder = SECTION_FLOWS[blueprint.flow] || SECTION_FLOWS.classic_lookbook;
  const ordered = isLookbook
    ? [...flowOrder.filter((purpose) => blueprint.purposes.includes(purpose)),
       ...blueprint.purposes.filter((purpose) => !flowOrder.includes(purpose))]
    : blueprint.purposes;

  const homeSections: Section[] = [];
  if (isLookbook) {
    const announcement = (input.title || '').toUpperCase();
    if (announcement) homeSections.push({
      id: 'announcement', purpose: 'chrome', layout: { kind: 'stack' },
      style: { base: { background: 'token:color.ink', color: 'token:color.canvas', pad: 'token:space.unit', align: 'center' } },
      nodes: [{ id: 'announcement-text', kind: 'text', props: { text: announcement }, style: { base: { size: 'label', align: 'center' } } }],
    });
  }
  const brandTitle = input.title;
  const navLinks = distinct.map((path) => ({ label: path === '/' ? 'Home' : path.slice(1).replace(/-/g, ' '), href: path }));

  homeSections.push({
    id: 'navigation', purpose: 'chrome', layout: { kind: 'stack' }, style: style('compact'),
    nodes: [{
      id: 'bar', kind: 'navigation',
      props: { brand: brandTitle, links: navLinks },
    }],
  });
  for (const purpose of ordered) {
    const at = purpose === 'introduction' ? 'hero' : slug(purpose, 'block');
    if (homeSections.some((section) => section.id === at)) continue;
    const section = block(purpose, at, input, distinct, slots);
    if (section) homeSections.push(section);
  }
  const home: Page = {
    id: 'home', path: '/', title: input.title,
    meta: { description: (input.brief.goal || `${input.title} online`).slice(0, 300) },
    sections: homeSections,
  };
  const pages: Page[] = [home];

  for (const path of distinct.filter((entry) => entry !== '/' && entry !== '/contact')) {
    const id = slug(path.slice(1), 'page');
    const text = input.brief.goal || `${brandTitle} ${id.replace(/-/g, ' ')}`;
    slots.push({ id: `${id}-body`, limit: 600, purpose: 'story', current: text });
    pages.push({
      id, path, title: id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()),
      meta: { description: text.slice(0, 300) },
      sections: [
        { id: `${id}-bar`, purpose: 'chrome', layout: { kind: 'stack' }, style: style('compact'), nodes: [{ id: `${id}-nav`, kind: 'navigation', props: { brand: brandTitle, links: navLinks } }] },
        { id: `${id}-intro`, purpose: 'introduction', layout: { kind: 'stack' }, style: style(blueprint.density, blueprint.tone), nodes: [
          { id: `${id}-title`, kind: 'heading', props: { text: id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()), level: 1 } },
          { id: `${id}-body`, kind: 'text', props: { text } },
        ] },
        { id: `${id}-foot`, purpose: 'chrome', layout: { kind: 'stack' }, style: style('compact'), nodes: [{ id: `${id}-end`, kind: 'footer', props: { brand: brandTitle, text: `© ${new Date().getFullYear()} ${brandTitle}`, links: [] } }] },
      ],
    });
  }

  if (wantsContact) {
    slots.push({ id: 'contact-body', limit: 300, purpose: 'contact', current: `Message ${brandTitle}.` });
    pages.push({
      id: 'contact', path: '/contact', title: 'Contact', meta: { description: `Contact ${brandTitle}` },
      sections: [
        { id: 'contact-bar', purpose: 'chrome', layout: { kind: 'stack' }, style: style('compact'), nodes: [{ id: 'contact-nav', kind: 'navigation', props: { brand: brandTitle, links: navLinks } }] },
        { id: 'contact-hours', purpose: 'hours', layout: { kind: 'stack' }, style: style(blueprint.density), nodes: [
          { id: 'contact-title', kind: 'heading', props: { text: 'Hours', level: 1 } },
          ...(input.facts.hours?.length ? [{ id: 'contact-list', kind: 'list' as const, props: { items: input.facts.hours.slice(0, 8) } }] : []),
        ] },
        { id: 'contact-details', purpose: 'contact', layout: { kind: 'stack' }, style: style(blueprint.density), nodes: [
          { id: 'contact-body', kind: 'text', props: { text: `Message ${brandTitle}.` } },
        ] },
        ...(blueprint.enquiry ? [{
          id: 'contact-form', purpose: 'enquiry', layout: { kind: 'stack' as const }, style: style(blueprint.density, 'surface'),
          nodes: [{ id: 'contact-form-node', kind: 'form' as const, props: { journey: 'enquiry', submitLabel: 'Send' } }],
        }] : []),
        { id: 'contact-foot', purpose: 'chrome', layout: { kind: 'stack' }, style: style('compact'), nodes: [{ id: 'contact-end', kind: 'footer', props: { brand: brandTitle, text: `© ${new Date().getFullYear()} ${brandTitle}`, links: [] } }] },
      ],
    });
  }

  const carried = input.previous;
  const doc: SiteDocument = {
    schema: DOCUMENT_VERSION,
    revision: 1,
    brief: input.brief,
    locale: carried?.locale || 'en',
    timezone: carried?.timezone || 'UTC',
    currency: carried?.currency || 'USD',
    design: designFor(blueprint.theme, blueprint.density, input.brief),
    assets: structuredClone(input.assets || []),
    components: structuredClone(carried?.components || []),
    pages,
    journeys: journey(blueprint.enquiry),
    redirects: [],
    locks: structuredClone(carried?.locks || []),
    policy: structuredClone(carried?.policy || { allowedCurrencies: [] }),
    personas: structuredClone(carried?.personas || []),
    taste: structuredClone(carried?.taste || { accepted: [], rejected: [] }),
    claims: [],
    currentRelease: carried?.currentRelease ?? null,
    releases: structuredClone(carried?.releases || []),
  };
  for (const page of doc.pages) {
    if (page.sections.some((section) => section.nodes.some((node) => node.kind === 'footer'))) continue;
    page.sections.push({
      id: page.id === 'home' ? 'footer' : `${page.id}-foot`, purpose: 'chrome', layout: { kind: 'stack' }, style: style('compact'),
      nodes: [{ id: `${page.id}-end`, kind: 'footer', props: { brand: input.title, text: `© ${new Date().getFullYear()} ${input.title}`, links: page.id === 'home' && input.facts.email ? [{ label: 'Email', href: `mailto:${input.facts.email}` }] : [] } }],
    });
  }
  return { doc, slots };
}

/** A valid, plain draft for a workspace that has not asked for a site yet. */
export function defaultSite(title: string, goal: string): SiteDocument {
  const brief = { goal, audience: '', tone: '' };
  return buildSite({ title, brief, facts: {}, blueprint: defaultBlueprint(brief), assets: [] }).doc;
}
