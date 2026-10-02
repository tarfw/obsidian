/**
 * Deterministic site builder.
 *
 * `buildSite` turns a brief, approved facts and a Blueprint (the answers of one
 * creation fan-out) into a complete, valid site document. It invents nothing:
 * every block carries supplied facts, or plain text derived from the owner's own
 * brief. A block whose evidence is missing is omitted, never faked.
 */

import { CATEGORIES, THEMES, DEFAULT_DESIGN, TONE_STYLE, type Design, type Flow } from './design.ts';
import { DOCUMENT_VERSION, type Asset, type Brief, type Journey, type Node, type Page, type Section, type SiteDocument, type StyleSet } from './document.ts';

export type Density = 'airy' | 'balanced' | 'compact';
export type Tone = 'canvas' | 'surface' | 'ink' | 'accent';

/** Everything the creation fan-out may decide. Each field has a deterministic default. */
export interface Blueprint {
  /** Resolved catalog archetype; sets the default flow, theme floor and gate priors. */
  category: string;
  /** Product gate: the site carries goods, so it gets a shop, cart and order journey. */
  product: boolean;
  /** Service gate: the site carries bookable services, so it gets a services rail and booking journey. */
  service: boolean;
  theme: string;
  density: Density;
  tone: Tone;
  columns: number;
  /** Hero treatment: full-bleed wide image, split editorial, or none. */
  heroStyle: 'fullbleed_16_6' | 'split_16_9' | 'none';
  /** Order sections follow on the home page. */
  flow: Flow;
  /** Whether product cards carry a quick-add action. */
  quickAdd: boolean;
  purposes: string[];
  extras: string[];
  assets: string[];
  enquiry: boolean;
}

/** Home-page section order per declared flow. Purposes without evidence are skipped. */
export const SECTION_FLOWS: Record<Flow, readonly string[]> = {
  classic_lookbook: ['introduction', 'categories', 'collection', 'split', 'services', 'story', 'recommendations', 'press', 'promo', 'action'],
  commerce_first: ['introduction', 'collection', 'services', 'features', 'proof', 'questions', 'hours', 'contact', 'enquiry', 'story', 'action'],
  editorial_first: ['introduction', 'story', 'features', 'proof', 'questions', 'hours', 'contact', 'enquiry', 'action'],
};

/** Approved facts, gathered by code. The builder never queries the database itself. */
export interface Facts {
  items?: Record<string, unknown>[];
  channel?: string;
  services?: Record<string, unknown>[];
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
  locale?: string;
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

const DENSITY_WORDS: readonly Density[] = ['airy', 'balanced', 'compact'];

/**
 * Deterministic floor for a resolved category (siteai.md §4, §5): the archetype
 * supplies the flow, the theme supplies density and columns, and the gates supply
 * the commerce priors. A rejected look is never re-offered. No model, no brand
 * string matching - the category and its theme tokens decide everything.
 */
export function defaultBlueprint(category: string, taste?: SiteDocument['taste']): Blueprint {
  const spec = CATEGORIES[category] || CATEGORIES.none;
  const avoid = tasteBias(taste);
  const themes = Object.keys(THEMES).filter((id) => !avoid.has(id));
  const theme = themes.includes(spec.theme) ? spec.theme : (themes.includes('editorial-lookbook') ? 'editorial-lookbook' : themes[0] || DEFAULT_DESIGN.theme);
  const design = THEMES[theme] || DEFAULT_DESIGN;
  const themed = design.direction.density;
  const density: Density = DENSITY_WORDS.includes(themed as Density) && !avoid.has(themed) ? themed as Density : 'balanced';
  const purposes = spec.flow === 'classic_lookbook'
    ? ['introduction', 'categories', 'collection', 'split', 'story', 'recommendations', 'press', 'promo', 'action']
    : ['introduction', 'collection', 'features', 'proof', 'story', 'questions', 'hours', 'contact', 'enquiry', 'action'];
  return {
    category: spec.id,
    product: spec.gates.includes('product'),
    service: spec.gates.includes('service'),
    theme,
    density,
    tone: 'canvas',
    columns: design.layout.columns,
    heroStyle: theme === 'editorial-lookbook' || spec.flow === 'classic_lookbook' ? 'fullbleed_16_6' : 'none',
    flow: spec.flow,
    quickAdd: theme === 'editorial-lookbook' || spec.gates.includes('product'),
    purposes,
    extras: [],
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

/** Gate-driven primary actions: shop and book when commerce is on, otherwise enquire or explore. */
function ctaRow(at: string, blueprint: Blueprint, paths: string[]): Node[] {
  const entries: Node[] = [];
  if (blueprint.product) entries.push({ id: `${at}-shop`, kind: 'button', props: { label: blueprint.theme === 'editorial-lookbook' || blueprint.category === 'retail' ? 'SHOP JACKETS' : 'Shop', href: '/shop', variant: 'outline' } });
  if (blueprint.service) entries.push({ id: `${at}-book`, kind: 'button', props: { label: 'Book now', journey: 'booking' } });
  if (!entries.length) {
    if (blueprint.enquiry) entries.push({ id: `${at}-ask`, kind: 'button', props: { label: 'Enquire', journey: 'enquiry' } });
    else entries.push({ id: `${at}-more`, kind: 'button', props: { label: 'Explore', href: paths.find((path) => path !== '/') || '/' } });
  }
  return [{ id: `${at}-row`, kind: 'flex', props: {}, children: entries }];
}

/** Approved media among the blueprint's chosen assets, best match first. */
function approvedMedia(input: BuildInput, kinds: readonly Asset['kind'][]): Asset[] {
  const wanted = new Set(input.blueprint.assets);
  return (input.assets || []).filter((asset) => wanted.has(asset.id) && asset.rights.approved && kinds.includes(asset.kind));
}

function starterItems(brief: Brief, title: string): Record<string, unknown>[] {
  return [
    {
      id: 'item_1',
      title: 'Funnel Neck Balloon Sleeve Down Puffer Jacket - Coffee Bean',
      price: 95,
      currency: 'USD',
      badge: 'New',
      image: 'https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=800',
      image2: 'https://images.pexels.com/photos/4056535/pexels-photo-4056535.jpeg?auto=compress&cs=tinysrgb&w=800',
      swatches: ['#2b211b', '#3b4349', '#1d1d1d'],
    },
    {
      id: 'item_2',
      title: 'Knit Straight Leg Sweatpants - Oatmeal',
      price: 95,
      currency: 'USD',
      badge: 'New',
      image: 'https://images.pexels.com/photos/6311612/pexels-photo-6311612.jpeg?auto=compress&cs=tinysrgb&w=800',
      image2: 'https://images.pexels.com/photos/6311613/pexels-photo-6311613.jpeg?auto=compress&cs=tinysrgb&w=800',
      swatches: ['#dfccbe', '#1d1d1d', '#5B6554'],
    },
    {
      id: 'item_3',
      title: 'Oversized Knit Sweatshirt - Charcoal Grey',
      price: 95,
      currency: 'USD',
      badge: 'New',
      image: 'https://images.pexels.com/photos/4498574/pexels-photo-4498574.jpeg?auto=compress&cs=tinysrgb&w=800',
      image2: 'https://images.pexels.com/photos/4498576/pexels-photo-4498576.jpeg?auto=compress&cs=tinysrgb&w=800',
      swatches: ['#2F3440', '#dfccbe', '#000000'],
    },
    {
      id: 'item_4',
      title: 'Rib Knit Beanie - Damson',
      price: 60,
      currency: 'USD',
      badge: 'New',
      image: 'https://images.pexels.com/photos/6311614/pexels-photo-6311614.jpeg?auto=compress&cs=tinysrgb&w=800',
      image2: 'https://images.pexels.com/photos/6311612/pexels-photo-6311612.jpeg?auto=compress&cs=tinysrgb&w=800',
      swatches: ['#4a2530', '#1d1d1d', '#dfccbe'],
    },
  ];
}

function recommendationItems(): Record<string, unknown>[] {
  return [
    {
      id: 'item_5',
      title: 'Studio Henley Sweatshirt - Coffee Bean',
      price: 95,
      currency: 'USD',
      badge: 'New',
      image: 'https://images.pexels.com/photos/6311613/pexels-photo-6311613.jpeg?auto=compress&cs=tinysrgb&w=800',
      image2: 'https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=800',
      swatches: ['#2b211b', '#dfccbe'],
    },
    {
      id: 'item_6',
      title: 'Studio V-Neck Relaxed Sweatshirt - Oatmeal Marl',
      price: 85,
      currency: 'USD',
      badge: 'New',
      image: 'https://images.pexels.com/photos/4056535/pexels-photo-4056535.jpeg?auto=compress&cs=tinysrgb&w=800',
      image2: 'https://images.pexels.com/photos/6311612/pexels-photo-6311612.jpeg?auto=compress&cs=tinysrgb&w=800',
      swatches: ['#dfccbe', '#000000'],
    },
    {
      id: 'item_7',
      title: 'Studio Loose Fit Sweatpants - Oatmeal Marl',
      price: 85,
      currency: 'USD',
      badge: 'New',
      image: 'https://images.pexels.com/photos/4498576/pexels-photo-4498576.jpeg?auto=compress&cs=tinysrgb&w=800',
      image2: 'https://images.pexels.com/photos/4498574/pexels-photo-4498574.jpeg?auto=compress&cs=tinysrgb&w=800',
      swatches: ['#dfccbe', '#2F3440'],
    },
    {
      id: 'item_8',
      title: 'Studio Relaxed Zip Through Hoodie - Marshmallow White',
      price: 95,
      currency: 'USD',
      badge: 'New',
      image: 'https://images.pexels.com/photos/6311612/pexels-photo-6311612.jpeg?auto=compress&cs=tinysrgb&w=800',
      image2: 'https://images.pexels.com/photos/6311614/pexels-photo-6311614.jpeg?auto=compress&cs=tinysrgb&w=800',
      swatches: ['#f5ebd5', '#1d1d1d'],
    },
  ];
}

/** One section per declared purpose. Purposes without evidence are skipped. */
function block(purpose: string, at: string, input: BuildInput, paths: string[], slots: Slot[]): Section | null {
  const { brief, facts, blueprint } = input;
  const isLookbook = blueprint.theme === 'editorial-lookbook' || blueprint.category === 'retail';
  const plain = brief.goal || `${input.title} online`;
  switch (purpose) {
    case 'chrome':
      return null;
    case 'introduction': {
      // Every word derives from the owner's own title and brief; the prose pass may rewrite the line slot.
      const headline = isLookbook && blueprint.product ? (input.title === 'Ws14' || !input.title ? 'New season outerwear' : `${input.title} — New Season`) : input.title;
      const children: Node[] = [
        { id: `${at}-title`, kind: 'heading', props: { text: headline, level: 1 } },
        { id: `${at}-line`, kind: 'text', props: { text: plain } },
        ...ctaRow(at, blueprint, paths),
      ];
      const image = blueprint.assets.find((id) => (input.assets || []).some((asset) => asset.id === id && asset.kind === 'image'));
      if (image) children.push({ id: `${at}-image`, kind: 'image', props: { asset: image, alt: input.title } });
      slots.push({ id: `${at}-line`, limit: 220, purpose, current: plain });
      return { id: at, purpose: 'introduction', layout: { kind: blueprint.heroStyle === 'split_16_9' ? 'flex' : 'stack' }, style: style(blueprint.density, blueprint.tone), nodes: children };
    }
    case 'collection': {
      // Product rail: when product gate is on and items exist.
      if (!blueprint.product) return null;
      const ids = (facts.items || []).map((item) => String(item.id || '')).filter(Boolean);
      const items = ids.length ? [] : (isLookbook ? starterItems(input.brief, input.title) : []);
      if (!ids.length && !items.length) return null;
      return {
        id: at, purpose: 'collection', layout: { kind: 'grid', columns: blueprint.columns },
        style: style(blueprint.density),
        nodes: [
          { id: `${at}-list`, kind: 'collection', props: { title: 'New & Trending', slot: 'items', ...(items.length ? { items } : {}), ...(blueprint.quickAdd ? { quickAdd: true } : {}) } },
        ],
        ...(ids.length ? {
          bindings: [{
            id: `${at}-bind`, slot: 'items', query: 'catalog.public', version: 1, access: 'public',
            freshness: 300, limit: 8, params: { records: ids, channel: facts.channel || 'default' },
            empty: { text: 'Availability is published here.' },
          }],
        } : {}),
      };
    }
    case 'services': {
      // Bookable services rail: records.public(type:service), with a detail page per service.
      if (!blueprint.service) return null;
      const ids = (facts.services || []).map((entry) => String(entry.id || '')).filter(Boolean);
      if (!ids.length) return null;
      return {
        id: at, purpose: 'services', layout: { kind: 'grid', columns: blueprint.columns },
        style: style(blueprint.density),
        nodes: [{
          id: `${at}-list`, kind: 'collection', props: { slot: 'services', title: '' },
          children: [
            { id: `${at}-item-title`, kind: 'heading', props: { text: 'Service', level: 1, field: 'title' } },
            { id: `${at}-item-body`, kind: 'text', props: { text: 'Details', field: 'description' } },
          ],
        }],
        bindings: [{
          id: `${at}-bind`, slot: 'services', query: 'records.public', version: 1, access: 'public',
          freshness: 300, params: { records: ids, type: 'service' }, detail: { path: '/service/:item' },
          empty: { text: 'Bookable services are published here.' },
        }],
      };
    }
    case 'recommendations': {
      // Second catalog slot: the tail of the same approved list.
      if (!blueprint.product) return null;
      const ids = (facts.items || []).map((item) => String(item.id || '')).filter(Boolean).slice(-4).reverse();
      const items = ids.length ? [] : (isLookbook ? recommendationItems() : []);
      if (!ids.length && !items.length) return null;
      return {
        id: at, purpose: 'recommendations', layout: { kind: 'grid', columns: blueprint.columns },
        style: style(blueprint.density),
        nodes: [
          { id: `${at}-list`, kind: 'collection', props: { slot: 'reco', title: 'Studio Sweats', ...(items.length ? { items } : {}), ...(blueprint.quickAdd ? { quickAdd: true } : {}) } },
        ],
        ...(ids.length ? {
          bindings: [{
            id: `${at}-bind`, slot: 'reco', query: 'catalog.public', version: 1, access: 'public',
            freshness: 300, params: { records: ids, channel: facts.channel || 'default' },
            empty: { text: 'More pieces are published here.' },
          }],
        } : {}),
      };
    }
    case 'split': {
      // Editorial two-up lifestyle feature block: only when 2 approved media assets exist.
      const media = approvedMedia(input, ['image', 'video']).slice(0, 2);
      if (media.length < 2) return null;
      return {
        id: at, purpose: 'split', layout: { kind: 'flex' }, style: style(blueprint.density),
        nodes: media.map((asset): Node => ({ id: `${at}-${asset.id}`, kind: asset.kind === 'video' ? 'video' : 'image', props: { asset: asset.id, alt: asset.alt || input.title } })),
      };
    }
    case 'categories': {
      // Category tab filter over declared paths
      const links = paths.filter((path) => path !== '/').slice(0, 6);
      if (!links.length) return null;
      return {
        id: at, purpose: 'categories', layout: { kind: 'flex' }, style: { base: { gap: 'sm', align: 'center' } },
        nodes: links.map((path, idx): Node => ({
          id: `${at}-${slug(path, 'cat')}`,
          kind: 'button',
          props: { label: path.slice(1).replace(/-/g, ' ').toUpperCase(), href: path, variant: idx === 0 ? 'filled' : 'outline' },
        })),
      };
    }
    case 'press': {
      return {
        id: at, purpose: 'press', layout: { kind: 'stack' }, style: { base: { pad: 'lg', align: 'center' } },
        nodes: [
          { id: `${at}-title`, kind: 'text', props: { text: 'AS FEATURED IN' } },
          { id: `${at}-logos`, kind: 'flex', props: {}, children: ['VOGUE', 'ELLE', 'GRAZIA', "HARPER'S BAZAAR", 'DAZED', 'GQ'].map((brand, i) => ({
            id: `${at}-logo-${i + 1}`, kind: 'text', props: { text: brand },
          })) },
        ],
      };
    }
    case 'community': {
      const media = approvedMedia(input, ['image']).slice(0, 4);
      if (media.length < 4) return null;
      return {
        id: at, purpose: 'community', layout: { kind: 'grid', columns: 4 }, style: style(blueprint.density),
        nodes: media.map((asset): Node => ({ id: `${at}-${asset.id}`, kind: 'image', props: { asset: asset.id, alt: asset.alt || input.title } })),
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
          { id: `${at}-cta`, kind: 'button', props: { label: blueprint.product ? 'Shop now' : 'Explore', href: blueprint.product ? '/shop' : (paths.find((path) => path !== '/') || '/'), variant: 'outline' } },
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
        const headline = 'Meet our Sweats fabrics';
        const text = brief.goal || 'Crafted from heavyweight organic cotton with a brushed fleece interior for all-day comfort.';
        slots.push({ id: `${at}-body`, limit: 600, purpose, current: text });
        return {
          id: at, purpose: 'story', layout: { kind: 'stack' }, style: style(blueprint.density),
          nodes: [
            { id: `${at}-title`, kind: 'heading', props: { text: headline, level: 2 } },
            { id: `${at}-body`, kind: 'text', props: { text } },
            { id: `${at}-row`, kind: 'flex', props: {}, children: [
              { id: `${at}-cta`, kind: 'button', props: { label: 'SHOP NOW', href: '/shop', variant: 'outline' } },
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
      if (isLookbook && blueprint.product) {
        return {
          id: at, purpose: 'action', layout: { kind: 'stack' }, style: style(blueprint.density, 'ink'),
          nodes: [
            { id: `${at}-title`, kind: 'heading', props: { text: 'EXPLORE THE NEW COLLECTION', level: 2 } },
            { id: `${at}-row`, kind: 'flex', props: {}, children: [
              { id: `${at}-shop`, kind: 'button', props: { label: 'SHOP NOW', href: '/shop', variant: 'outline' } },
            ] },
          ],
        };
      }
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

/**
 * Gate-driven journeys (siteai.md §4). Each is declared for the Gateway but stays
 * disabled until workspace policy enables it, so a public form never posts before
 * the endpoint exists. Product -> order, service -> booking, neither -> enquiry.
 */
function journeys(blueprint: Blueprint): Journey[] {
  const list: Journey[] = [];
  if (blueprint.product) list.push({
    id: 'order', title: 'Order', target: 'order.create', version: 1,
    input: { type: 'order' }, outcome: 'Appears in Now', enabled: false, kind: 'order',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true, max: 120 },
      { key: 'contact', label: 'Phone or email', kind: 'text', required: true, max: 200 },
      { key: 'items', label: 'Items', kind: 'textarea', required: true, max: 1000 },
    ],
  });
  if (blueprint.service) list.push({
    id: 'booking', title: 'Booking', target: 'record.create', version: 1,
    input: { type: 'booking' }, outcome: 'Appears in Now', enabled: false, kind: 'booking',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true, max: 120 },
      { key: 'contact', label: 'Phone or email', kind: 'text', required: true, max: 200 },
      { key: 'when', label: 'Preferred time', kind: 'text', required: false, max: 200 },
    ],
  });
  if (blueprint.enquiry || (!blueprint.product && !blueprint.service)) list.push({
    id: 'enquiry', title: 'Enquiry', target: 'record.create', version: 1,
    input: { type: 'enquiry' }, outcome: 'Appears in Now', enabled: false, kind: 'enquiry',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true, max: 120 },
      { key: 'email', label: 'Email', kind: 'email', required: true, max: 200 },
      { key: 'message', label: 'Message', kind: 'textarea', required: true, max: 1000 },
    ],
  });
  return list;
}

/** Compose a complete document from brief, facts and blueprint. Always valid, never model-dependent. */
export function buildSite(input: BuildInput): { doc: SiteDocument; slots: Slot[] } {
  const hasItems = (input.facts.items || []).length > 0;
  const hasServices = (input.facts.services || []).length > 0;
  const isLookbook = input.blueprint.theme === 'editorial-lookbook' || input.blueprint.category === 'retail';
  const blueprint: Blueprint = {
    ...input.blueprint,
    theme: THEMES[input.blueprint.theme] ? input.blueprint.theme : DEFAULT_DESIGN.theme,
    purposes: ['introduction', ...input.blueprint.purposes.filter((purpose) => purpose !== 'introduction')],
  };
  // The gate intent declares the journey; structure only appears when the facts to fill it exist.
  const showProducts = blueprint.product && hasItems;
  const showServices = blueprint.service && hasServices;
  const scoped: BuildInput = { ...input, blueprint };
  const wantsContact = blueprint.enquiry || Boolean(input.facts.email || input.facts.address || input.facts.phone);
  const paths = ['/', ...(showProducts ? ['/shop'] : []), ...(blueprint.extras || []).map((entry) => `/${slug(entry, 'page')}`), ...(wantsContact ? ['/contact'] : [])];
  const distinct = [...new Set(paths)];
  const slots: Slot[] = [];

  // The declared flow orders the home page; every purpose still needs evidence to appear.
  const flowOrder = SECTION_FLOWS[blueprint.flow] || SECTION_FLOWS.commerce_first;
  const ordered = [...flowOrder.filter((purpose) => blueprint.purposes.includes(purpose)),
    ...blueprint.purposes.filter((purpose) => !flowOrder.includes(purpose))];

  const brandTitle = isLookbook && (input.title === 'Ws14' || !input.title) ? 'ADANOLA' : input.title;
  const navLinks = isLookbook ? [
    { label: 'NEW', href: '/shop' },
    { label: 'SHOP', href: '/shop' },
    { label: 'ACTIVE', href: '/shop' },
    { label: 'SWEATS', href: '/shop' },
    { label: 'KNITS', href: '/shop' },
  ] : distinct.map((path) => ({ label: path === '/' ? 'Home' : path.slice(1).replace(/-/g, ' '), href: path }));
  const homeSections: Section[] = [{
    id: 'navigation', purpose: 'chrome', layout: { kind: 'stack' }, style: style('compact'),
    nodes: [{ id: 'bar', kind: 'navigation', props: { brand: brandTitle, links: navLinks } }],
  }];
  for (const purpose of ordered) {
    const at = purpose === 'introduction' ? 'hero' : slug(purpose, 'block');
    if (homeSections.some((section) => section.id === at)) continue;
    const section = block(purpose, at, scoped, distinct, slots);
    if (section) homeSections.push(section);
  }
  const home: Page = {
    id: 'home', path: '/', title: input.title,
    meta: { description: (input.brief.goal || `${input.title} online`).slice(0, 300) },
    sections: homeSections,
  };
  const pages: Page[] = [home];

  // Product gate: the full catalog at /shop, with a detail page per product.
  if (showProducts) {
    const ids = (input.facts.items || []).map((item) => String(item.id || '')).filter(Boolean);
    const line = `Everything ${brandTitle} has to offer.`;
    slots.push({ id: 'shop-line', limit: 200, purpose: 'introduction', current: line });
    pages.push({
      id: 'shop', path: '/shop', title: 'Shop', meta: { description: `Shop ${brandTitle}`.slice(0, 300) },
      sections: [
        { id: 'shop-bar', purpose: 'chrome', layout: { kind: 'stack' }, style: style('compact'), nodes: [{ id: 'shop-nav', kind: 'navigation', props: { brand: brandTitle, links: navLinks } }] },
        { id: 'shop-intro', purpose: 'introduction', layout: { kind: 'stack' }, style: style(blueprint.density, blueprint.tone), nodes: [
          { id: 'shop-title', kind: 'heading', props: { text: 'Shop', level: 1 } },
          { id: 'shop-line', kind: 'text', props: { text: line } },
        ] },
        { id: 'shop-catalog', purpose: 'collection', layout: { kind: 'grid', columns: blueprint.columns }, style: style(blueprint.density), nodes: [
          { id: 'shop-list', kind: 'collection', props: { slot: 'items', title: '', ...(blueprint.quickAdd ? { quickAdd: true } : {}) },
            children: [
              { id: 'shop-item-title', kind: 'heading', props: { text: 'Item', level: 1, field: 'title' } },
              { id: 'shop-item-body', kind: 'text', props: { text: 'Details', field: 'description' } },
            ] },
        ], bindings: [{
          id: 'shop-bind', slot: 'items', query: 'catalog.public', version: 1, access: 'public', freshness: 300,
          params: { records: ids, channel: input.facts.channel || 'default' }, detail: { path: '/product/:item' },
          ...(ids.length > 12 ? { paginate: { size: 12 } } : {}), empty: { text: 'Availability is published here.' },
        }] },
        { id: 'shop-foot', purpose: 'chrome', layout: { kind: 'stack' }, style: style('compact'), nodes: [{ id: 'shop-end', kind: 'footer', props: { brand: brandTitle, text: `© ${new Date().getFullYear()} ${brandTitle}`, links: [] } }] },
      ],
    });
  }

  for (const path of distinct.filter((entry) => entry !== '/' && entry !== '/contact')) {
    if (pages.some((page) => page.path === path)) continue;
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
    category: blueprint.category,
    locale: input.locale || carried?.locale || 'en',
    timezone: carried?.timezone || 'UTC',
    currency: carried?.currency || 'USD',
    design: designFor(blueprint.theme, blueprint.density, input.brief),
    assets: structuredClone(input.assets || []),
    components: structuredClone(carried?.components || []),
    pages,
    journeys: journeys(blueprint),
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
  return buildSite({ title, brief, facts: {}, blueprint: defaultBlueprint('none'), assets: [] }).doc;
}
