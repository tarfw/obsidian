/**
 * Retained v1 reader.
 *
 * Stored v1 card records are a read-only legacy shape: `upgrade` converts one
 * into the current document model, once, in memory, and the caller saves the
 * result as v2. There is no v1 write path and no v1 compiler.
 */

import { badRequest } from '../errors.ts';
import { DEFAULT_DESIGN, THEMES, type Design } from './design.ts';
import {
  DOCUMENT_VERSION, type Binding, type Journey, type Node, type Page, type Section, type SiteDocument,
} from './document.ts';

export function isV2(source: unknown): source is SiteDocument {
  return Boolean(source) && (source as SiteDocument).schema === DOCUMENT_VERSION;
}

/** The v1 shape, typed only as far as the reader needs. */
interface CardDefinition {
  readonly id: string;
  readonly kind: string;
  readonly version: number;
  readonly title?: string;
  readonly props: Record<string, unknown>;
  readonly bindings?: CardBinding[];
}

interface CardBinding {
  readonly slot?: string;
  readonly query?: string;
  readonly version?: number;
  readonly params?: Record<string, unknown>;
  readonly access?: string;
  readonly freshness?: number;
  readonly empty?: Record<string, unknown>;
}

interface PageDefinition {
  readonly id: string;
  readonly path: string;
  readonly title: string;
  readonly meta?: { description?: string; keywords?: readonly string[] };
  readonly cards: CardDefinition[];
}

interface DesignTokens {
  readonly theme: string;
  readonly colors: Record<string, string>;
  readonly typography: Record<string, string | number>;
  readonly rounded: Record<string, number>;
  readonly spacing: Record<string, number>;
}

interface SiteDefinition {
  readonly schema: '1.0.0';
  readonly design?: DesignTokens;
  readonly locale?: string;
  readonly timezone?: string;
  readonly currency?: string;
  readonly pages: PageDefinition[];
  readonly journeys: { id: string; title: string; target: string; version: number; input: Record<string, unknown>; outcome: string }[];
  readonly policy: Record<string, unknown>;
  readonly currentRelease?: string | null;
  readonly releases?: SiteDocument['releases'];
}

export function isV1(source: unknown): source is SiteDefinition {
  return Boolean(source) && (source as SiteDefinition).schema === '1.0.0';
}

export function designFromTokens(tokens: DesignTokens): Design {
  const unit = tokens.spacing.unit || 8;
  const number = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  const string = (value: unknown, fallback: string) => typeof value === 'string' && value.trim() ? value : fallback;
  return {
    ...DEFAULT_DESIGN,
    theme: string(tokens.theme, DEFAULT_DESIGN.theme),
    color: {
      canvas: string(tokens.colors.bg, DEFAULT_DESIGN.color.canvas), ink: string(tokens.colors.text, DEFAULT_DESIGN.color.ink),
      accent: string(tokens.colors.accent, DEFAULT_DESIGN.color.accent), accentink: '#ffffff',
      surface: string(tokens.colors.surface, DEFAULT_DESIGN.color.surface), border: string(tokens.colors.border, DEFAULT_DESIGN.color.border),
      muted: string(tokens.colors.muted, DEFAULT_DESIGN.color.muted),
      success: DEFAULT_DESIGN.color.success, danger: DEFAULT_DESIGN.color.danger,
    },
    type: {
      ...DEFAULT_DESIGN.type,
      display: string(tokens.typography.headingFont, DEFAULT_DESIGN.type.display),
      heading: string(tokens.typography.headingFont, DEFAULT_DESIGN.type.heading),
      body: string(tokens.typography.bodyFont, DEFAULT_DESIGN.type.body),
      base: number(tokens.typography.baseFontSize, DEFAULT_DESIGN.type.base),
      scale: number(tokens.typography.scale, DEFAULT_DESIGN.type.scale),
    },
    space: { unit, section: Math.round(unit * 12), container: tokens.spacing.containerMax || DEFAULT_DESIGN.space.container },
    shape: {
      sm: number(tokens.rounded.sm, DEFAULT_DESIGN.shape.sm), md: number(tokens.rounded.md, DEFAULT_DESIGN.shape.md),
      lg: number(tokens.rounded.lg, DEFAULT_DESIGN.shape.lg), pill: number(tokens.rounded.full, DEFAULT_DESIGN.shape.pill),
    },
  };
}

const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const nodes = (...entries: (Node | null)[]): Node[] => entries.filter((entry): entry is Node => entry !== null);
const list = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.map(object) : [];

function heading(id: string, text: string, level: 1 | 2 | 3): Node | null {
  return text.trim() ? { id, kind: 'heading', props: { text, level } } : null;
}

function cardNodes(card: CardDefinition): Node[] {
  const props = card.props;
  switch (card.kind) {
    case 'navigation':
      return [{ id: card.id, kind: 'navigation', props: { brand: props.brand || '', links: props.links || [] } }];
    case 'hero': {
      const primary = object(props.primaryCta);
      const secondary = object(props.secondaryCta);
      return nodes(
        heading(`${card.id}-title`, String(props.headline || card.title || ''), 1),
        props.subtext ? { id: `${card.id}-text`, kind: 'text', props: { text: String(props.subtext) } } : null,
        { id: `${card.id}-actions`, kind: 'flex', props: {}, children: nodes(
          primary.href ? { id: `${card.id}-primary`, kind: 'button', props: { label: primary.label || 'Explore', href: primary.href } } : null,
          secondary.href ? { id: `${card.id}-secondary`, kind: 'button', props: { label: secondary.label || 'Learn more', href: secondary.href, variant: 'secondary' } } : null,
        ) },
      );
    }
    case 'content':
      return nodes(
        heading(`${card.id}-title`, String(card.title || ''), 2),
        { id: `${card.id}-body`, kind: 'text', props: { text: String(props.body || props.text || '') } },
      );
    case 'collection':
      return nodes(
        heading(`${card.id}-title`, String(card.title || ''), 2),
        { id: card.id, kind: 'collection', props: { title: card.title || '', items: Array.isArray(props.items) ? props.items : [], slot: 'items' } },
      );
    case 'features': {
      const features = list(props.features);
      if (!features.length) return [];
      return nodes(
        heading(`${card.id}-title`, String(card.title || ''), 2),
        { id: card.id, kind: 'grid', props: {}, children: features.map((feature, index) => ({
          id: `${card.id}-${index + 1}`, kind: 'card' as const, props: {}, children: nodes(
            feature.icon ? { id: `${card.id}-${index + 1}-icon`, kind: 'icon', props: { name: String(feature.icon) } } : null,
            heading(`${card.id}-${index + 1}-title`, String(feature.title || ''), 3),
            { id: `${card.id}-${index + 1}-text`, kind: 'text', props: { text: String(feature.description || '') } },
          ) })) },
      );
    }
    case 'proof': {
      const quotes = list(props.testimonials);
      if (!quotes.length) return [];
      return nodes(
        heading(`${card.id}-title`, String(card.title || ''), 2),
        { id: card.id, kind: 'grid', props: {}, children: quotes.map((quote, index) => ({
          id: `${card.id}-${index + 1}`, kind: 'card' as const, props: {}, children: nodes(
            { id: `${card.id}-${index + 1}-quote`, kind: 'text', props: { text: `“${String(quote.quote || quote.text || '')}” — ${String(quote.author || quote.name || '')}` } },
          ) })) },
      );
    }
    case 'faq': {
      const items = list(props.items);
      if (!items.length) return [];
      return nodes(
        heading(`${card.id}-title`, String(card.title || ''), 2),
        { id: card.id, kind: 'accordion', props: {}, children: items.map((faq, index) => ({
          id: `${card.id}-${index + 1}`, kind: 'stack' as const, props: { label: String(faq.q || faq.question || '') },
          children: nodes({ id: `${card.id}-${index + 1}-answer`, kind: 'text', props: { text: String(faq.a || faq.answer || '') } }),
        })) },
      );
    }
    case 'hours': {
      const schedule = list(props.schedule);
      if (!schedule.length) return [];
      return nodes(
        heading(`${card.id}-title`, String(card.title || ''), 2),
        { id: card.id, kind: 'list', props: { items: schedule.map((row) => `${String(row.days || '')} — ${String(row.hours || '')}`) } },
      );
    }
    case 'contact': {
      const details: string[] = [];
      if (props.address) details.push(String(props.address));
      if (props.phone) details.push(`Phone: ${String(props.phone)}`);
      if (props.email) details.push(`Email: ${String(props.email)}`);
      if (!details.length) return [];
      return nodes(
        heading(`${card.id}-title`, String(card.title || ''), 2),
        { id: card.id, kind: 'list', props: { items: details } },
      );
    }
    case 'form':
      return nodes(
        heading(`${card.id}-title`, String(card.title || 'Get in touch'), 2),
        { id: card.id, kind: 'form', props: { journey: 'enquiry', submitLabel: String(props.submitLabel || 'Send') } },
      );
    case 'cta':
      return [{ id: card.id, kind: 'card', props: {}, children: nodes(
        heading(`${card.id}-title`, String(props.headline || card.title || ''), 2),
        props.text ? { id: `${card.id}-text`, kind: 'text', props: { text: String(props.text) } } : null,
        props.href ? { id: `${card.id}-button`, kind: 'button', props: { label: props.buttonLabel || 'Contact us', href: props.href } } : null,
      ) }];
    case 'footer':
      return [{ id: card.id, kind: 'footer', props: { brand: props.brand || '', text: props.text || '', links: props.links || [] } }];
    default:
      return [];
  }
}

const SECTION_PURPOSE: Record<string, string> = {
  navigation: 'chrome', hero: 'introduction', content: 'story', collection: 'collection',
  features: 'features', proof: 'proof', faq: 'questions', hours: 'hours', contact: 'contact',
  form: 'enquiry', cta: 'action', footer: 'chrome',
};

/** Every page needs exactly one level-one heading; v1 pages often lack one. */
function ensureTitle(page: Page): void {
  const sections = page.sections.filter((section) => section.purpose !== 'chrome');
  const headings = sections.flatMap((section) => section.nodes).filter((node) => node.kind === 'heading');
  if (headings.some((node) => Number(node.props.level) === 1)) return;
  if (headings.length) { headings[0].props = { ...headings[0].props, level: 1 }; return; }
  page.sections.unshift({
    id: `${page.id}-intro`, purpose: 'introduction', layout: { kind: 'stack' },
    nodes: [{ id: `${page.id}-title`, kind: 'heading', props: { text: page.title, level: 1 } }],
  });
}

function sectionFor(card: CardDefinition): Section | null {
  const body = cardNodes(card);
  if (!body.length) return null;
  const grid = card.kind === 'collection' || card.kind === 'features' || card.kind === 'proof';
  return {
    id: card.id, purpose: SECTION_PURPOSE[card.kind] || 'story',
    layout: { kind: grid ? 'grid' : 'stack' },
    nodes: body,
    ...(card.bindings?.length ? { bindings: card.bindings.map((binding, index) => v2Binding(binding, card.id, index)) } : {}),
  };
}

function v2Binding(binding: CardBinding, cardId: string, index: number): Binding {
  const params = object(binding.params);
  return {
    id: `${cardId}-binding${index + 1}`,
    slot: binding.slot || 'items',
    query: binding.query === 'records.public' ? 'records.public' : 'catalog.public',
    version: 1,
    access: 'public',
    freshness: Number.isSafeInteger(binding.freshness) ? Number(binding.freshness) : 300,
    ...(Array.isArray(params.records) || typeof params.channel === 'string' || typeof params.type === 'string' ? {
      params: {
        ...(Array.isArray(params.records) ? { records: params.records as string[] } : {}),
        ...(typeof params.channel === 'string' ? { channel: params.channel } : {}),
        ...(typeof params.type === 'string' ? { type: params.type } : {}),
      },
    } : {}),
    ...(binding.empty && typeof binding.empty.text === 'string' ? { empty: { text: String(binding.empty.text) } } : {}),
  };
}

function journeyFor(site: SiteDefinition, hasForm: boolean): Journey[] {
  if (!site.journeys.length || !hasForm) return [];
  return site.journeys.map((journey) => ({
    id: journey.id, title: journey.title, target: journey.target, version: 1,
    input: journey.input, outcome: journey.outcome, enabled: false,
    kind: 'enquiry',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true, max: 120 },
      { key: 'email', label: 'Email', kind: 'email', required: true, max: 200 },
      { key: 'message', label: 'Message', kind: 'textarea', required: true, max: 1000 },
    ],
  }));
}

/** Convert a retained v1 definition into the v2 document model. */
export function upgrade(site: SiteDefinition): SiteDocument {
  const pages: Page[] = site.pages.map((page) => ({
    id: page.id, path: page.path, title: page.title,
    ...(page.meta ? { meta: { description: page.meta.description, keywords: page.meta.keywords } } : {}),
    sections: page.cards.map(sectionFor).filter((section): section is Section => section !== null),
  }));
  pages.forEach(ensureTitle);
  const hasForm = pages.some((page) => page.sections.some((section) => section.nodes.some((node) => node.kind === 'form')));
  const theme = String(site.design?.theme || '');
  const design = THEMES[theme] || (site.design ? designFromTokens(site.design) : DEFAULT_DESIGN);
  const policy = object(site.policy);
  return {
    schema: DOCUMENT_VERSION,
    revision: 1,
    brief: { goal: String(site.pages[0]?.meta?.description || ''), audience: '', tone: '' },
    locale: site.locale || 'en', timezone: site.timezone || 'UTC', currency: site.currency || 'USD',
    design,
    assets: [], components: [],
    pages,
    journeys: journeyFor(site, hasForm),
    redirects: [], locks: [],
    policy: {
      publicEnquiry: Boolean(policy.publicEnquiry),
      publicOrdering: Boolean(policy.publicOrdering),
      allowedCurrencies: Array.isArray(policy.allowedCurrencies) ? policy.allowedCurrencies as string[] : undefined,
    },
    currentRelease: site.currentRelease ?? null,
    releases: site.releases || [],
  };
}

/** Read a stored site record as a current document, upgrading v1 in memory. */
export function readDocument(value: unknown): { doc: SiteDocument; migrated: boolean } {
  if (isV2(value)) return { doc: value, migrated: false };
  if (isV1(value)) return { doc: upgrade(value), migrated: true };
  throw badRequest('Site definition is invalid.');
}
