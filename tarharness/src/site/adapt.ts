/**
 * Version adapters.
 *
 * `upgrade` converts a retained v1 card definition into a v2 document once, so
 * old sites stay editable. The v1 compiler in renderer.ts stays frozen and keeps
 * compiling retained releases from their stored sources; `compileSource` picks
 * the compiler by the source's own schema version.
 */

import { badRequest, notFound } from '../errors.ts';
import { DEFAULT_DESIGN, type Design } from './design.ts';
import {
  DOCUMENT_VERSION, type Binding, type Journey, type Node, type Page, type Section, type SiteDocument,
} from './document.ts';
import type { CardDefinition, CardKind, DesignTokens, SiteDefinition } from './schema.ts';

export function isV2(source: unknown): source is SiteDocument {
  return Boolean(source) && (source as SiteDocument).schema === DOCUMENT_VERSION;
}

export function isV1(source: unknown): source is SiteDefinition {
  return Boolean(source) && (source as SiteDefinition).schema === '1.0.0';
}

export function designFromTokens(tokens: DesignTokens): Design {
  const unit = tokens.spacing.unit || 8;
  return {
    ...DEFAULT_DESIGN,
    theme: tokens.theme,
    color: {
      canvas: tokens.colors.bg, ink: tokens.colors.text, accent: tokens.colors.accent,
      accentink: '#ffffff', surface: tokens.colors.surface, border: tokens.colors.border,
      muted: tokens.colors.muted, success: DEFAULT_DESIGN.color.success, danger: DEFAULT_DESIGN.color.danger,
    },
    type: {
      display: tokens.typography.headingFont, heading: tokens.typography.headingFont,
      body: tokens.typography.bodyFont, base: tokens.typography.baseFontSize,
      scale: tokens.typography.scale, leading: 1.6, weight: 600,
    },
    space: { unit, section: Math.round(unit * 12), container: tokens.spacing.containerMax },
    shape: { sm: tokens.rounded.sm, md: tokens.rounded.md, lg: tokens.rounded.lg, pill: tokens.rounded.full },
  };
}

export const THEMES: Record<string, Design> = {
  'editorial-light': DEFAULT_DESIGN,
  'editorial-chalk': designFromTokens({
    theme: 'editorial-chalk',
    colors: { bg: '#edebe4', text: '#01273e', accent: '#000bfa', surface: '#f6f5f0', border: '#dcd9cf', muted: '#617282' },
    typography: { headingFont: 'Georgia, serif', bodyFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', baseFontSize: 16, scale: 1.25 },
    rounded: { sm: 4, md: 8, lg: 16, full: 9999 },
    spacing: { unit: 8, containerMax: 1140 },
  }),
  'streetwear-dark': designFromTokens({
    theme: 'streetwear-dark',
    colors: { bg: '#111111', text: '#f8fafc', accent: '#5e6ad2', surface: '#1a1a1a', border: '#2a2a2a', muted: '#94a3b8' },
    typography: { headingFont: 'Impact, "Arial Black", sans-serif', bodyFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', baseFontSize: 16, scale: 1.333 },
    rounded: { sm: 2, md: 4, lg: 8, full: 9999 },
    spacing: { unit: 8, containerMax: 1200 },
  }),
  'minimal-clean': designFromTokens({
    theme: 'minimal-clean',
    colors: { bg: '#ffffff', text: '#18181b', accent: '#2563eb', surface: '#fafafa', border: '#e4e4e7', muted: '#71717a' },
    typography: { headingFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', bodyFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', baseFontSize: 16, scale: 1.2 },
    rounded: { sm: 6, md: 10, lg: 14, full: 9999 },
    spacing: { unit: 8, containerMax: 1100 },
  }),
};

const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const nodes = (...entries: (Node | null)[]): Node[] => entries.filter((entry): entry is Node => entry !== null);

function heading(id: string, text: string, level: 1 | 2 | 3): Node | null {
  return text.trim() ? { id, kind: 'heading', props: { text, level } } : null;
}

function linkNodes(items: { label: string; href: string }[], prefix: string): Node[] {
  return items.map((item, index) => ({ id: `${prefix}${index + 1}`, kind: 'link', props: { label: item.label, href: item.href } }));
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
    case 'collection': {
      const items = Array.isArray(props.items) ? props.items : [];
      return nodes(
        heading(`${card.id}-title`, String(card.title || ''), 2),
        { id: card.id, kind: 'collection', props: { title: card.title || '', items, slot: 'items' } },
      );
    }
    case 'features': {
      const features = Array.isArray(props.features) ? props.features : [];
      if (!features.length) return [];
      return nodes(
        heading(`${card.id}-title`, String(card.title || ''), 2),
        { id: card.id, kind: 'grid', props: {}, children: features.map((entry, index) => {
          const feature = object(entry);
          return { id: `${card.id}-${index + 1}`, kind: 'card', props: {}, children: nodes(
            feature.icon ? { id: `${card.id}-${index + 1}-icon`, kind: 'icon', props: { name: String(feature.icon) } } : null,
            heading(`${card.id}-${index + 1}-title`, String(feature.title || ''), 3),
            { id: `${card.id}-${index + 1}-text`, kind: 'text', props: { text: String(feature.description || '') } },
          ) };
        }) },
      );
    }
    case 'proof': {
      const testimonials = Array.isArray(props.testimonials) ? props.testimonials : [];
      if (!testimonials.length) return [];
      return nodes(
        heading(`${card.id}-title`, String(card.title || ''), 2),
        { id: card.id, kind: 'grid', props: {}, children: testimonials.map((entry, index) => {
          const quote = object(entry);
          return { id: `${card.id}-${index + 1}`, kind: 'card', props: {}, children: nodes(
            { id: `${card.id}-${index + 1}-quote`, kind: 'text', props: { text: `“${String(quote.quote || quote.text || '')}” — ${String(quote.author || quote.name || '')}` } },
          ) };
        }) },
      );
    }
    case 'faq': {
      const items = Array.isArray(props.items) ? props.items : [];
      if (!items.length) return [];
      return nodes(
        heading(`${card.id}-title`, String(card.title || ''), 2),
        { id: card.id, kind: 'accordion', props: {}, children: items.map((entry, index) => {
          const faq = object(entry);
          return { id: `${card.id}-${index + 1}`, kind: 'stack', props: { label: String(faq.q || faq.question || '') }, children: nodes(
            { id: `${card.id}-${index + 1}-answer`, kind: 'text', props: { text: String(faq.a || faq.answer || '') } },
          ) };
        }) },
      );
    }
    case 'hours': {
      const schedule = Array.isArray(props.schedule) ? props.schedule : [];
      if (!schedule.length) return [];
      return nodes(
        heading(`${card.id}-title`, String(card.title || ''), 2),
        { id: card.id, kind: 'list', props: { items: schedule.map((entry) => {
          const row = object(entry);
          return `${String(row.days || '')} — ${String(row.hours || '')}`;
        }) } },
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
    case 'cta': {
      const cta = nodes(
        heading(`${card.id}-title`, String(props.headline || card.title || ''), 2),
        props.text ? { id: `${card.id}-text`, kind: 'text', props: { text: String(props.text) } } : null,
        props.href ? { id: `${card.id}-button`, kind: 'button', props: { label: props.buttonLabel || 'Contact us', href: props.href } } : null,
      );
      return [{ id: card.id, kind: 'card', props: {}, children: cta }];
    }
    case 'footer':
      return [{ id: card.id, kind: 'footer', props: { brand: props.brand || '', text: props.text || '', links: props.links || [] } }];
    default:
      return [];
  }
}

const SECTION_PURPOSE: Record<CardKind, string> = {
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
  return {
    id: card.id, purpose: SECTION_PURPOSE[card.kind] || 'content',
    layout: { kind: card.kind === 'collection' || card.kind === 'features' || card.kind === 'proof' ? 'grid' : 'stack' },
    nodes: body,
    ...(card.bindings?.length ? {
      bindings: card.bindings.map((binding, index) => v2Binding(binding, card.id, index)),
    } : {}),
  };
}

function v2Binding(binding: { slot?: string; query?: string; version?: number; access?: string; freshness?: number; params?: Record<string, unknown>; empty?: Record<string, unknown> }, cardId: string, index: number): Binding {
  const params = object(binding.params);
  return {
    id: `${cardId}-binding${index + 1}`,
    slot: binding.slot || 'items',
    query: binding.query === 'records.public' ? 'records.public' : 'catalog.public',
    version: 1,
    access: 'public',
    freshness: Number.isSafeInteger(binding.freshness) ? Number(binding.freshness) : 300,
    ...(Array.isArray(params.records) || params.channel || params.type ? {
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
  const design = THEMES[String(site.design?.theme)] || (site.design ? designFromTokens(site.design) : DEFAULT_DESIGN);
  return {
    schema: DOCUMENT_VERSION,
    revision: 1,
    brief: {
      goal: String(site.pages[0]?.meta?.description || ''),
      audience: '', tone: '',
    },
    locale: site.locale || 'en', timezone: site.timezone || 'UTC', currency: site.currency || 'USD',
    design,
    assets: [], components: [],
    pages,
    journeys: journeyFor(site, hasForm),
    redirects: [], locks: [],
    policy: {
      publicEnquiry: Boolean(site.policy.publicEnquiry),
      publicOrdering: Boolean(site.policy.publicOrdering),
      allowedCurrencies: site.policy.allowedCurrencies,
    },
    currentRelease: site.currentRelease ?? null,
    releases: site.releases || [],
  };
}

/** Read a stored site record as a v2 document, upgrading v1 in memory. */
export function readDocument(value: unknown): { doc: SiteDocument; migrated: boolean } {
  if (isV2(value)) return { doc: value, migrated: false };
  if (isV1(value)) return { doc: upgrade(value), migrated: true };
  if (value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).pages)) {
    return { doc: { ...(value as object), schema: DOCUMENT_VERSION } as unknown as SiteDocument, migrated: true };
  }
  throw badRequest('Site definition is invalid.');
}

function findNodes(list: Node[], id: string): Node | undefined {
  for (const node of list) {
    if (node.id === id) return node;
    const nested = node.children ? findNodes(node.children, id) : undefined;
    if (nested) return nested;
  }
  return undefined;
}

/**
 * Apply a retained card-level edit to the section the card became.
 * This keeps the shipped editor working until it moves to v2 patches.
 */
function mergeLegacyProps(section: Section, patch: Record<string, unknown>): void {
  const props = object(patch.props);
  const value = { ...props, ...object(patch) };
  const setText = (node: Node | undefined, text: unknown) => {
    if (node && typeof text === 'string') node.props = { ...node.props, text };
  };
  const headings = section.nodes.filter((node) => node.kind === 'heading');
  const texts = section.nodes.filter((node) => node.kind === 'text');
  const buttons = section.nodes.filter((node) => node.kind === 'button');
  setText(headings[0], value.headline ?? value.title);
  setText(texts[0], value.subtext ?? value.body ?? value.text);
  const primary = object(value.primaryCta);
  const secondary = object(value.secondaryCta);
  if (buttons[0] && (primary.label !== undefined || primary.href !== undefined)) {
    buttons[0].props = { ...buttons[0].props, ...(typeof primary.label === 'string' ? { label: primary.label } : {}), ...(typeof primary.href === 'string' ? { href: primary.href } : {}) };
  }
  if (buttons[1] && (secondary.label !== undefined || secondary.href !== undefined)) {
    buttons[1].props = { ...buttons[1].props, ...(typeof secondary.label === 'string' ? { label: secondary.label } : {}), ...(typeof secondary.href === 'string' ? { href: secondary.href } : {}) };
  }
  if (buttons[0] && (typeof value.buttonLabel === 'string' || typeof value.href === 'string')) {
    buttons[0].props = { ...buttons[0].props, ...(typeof value.buttonLabel === 'string' ? { label: value.buttonLabel } : {}), ...(typeof value.href === 'string' ? { href: value.href } : {}) };
  }
  for (const node of section.nodes) {
    if (node.kind === 'navigation' || node.kind === 'footer') {
      node.props = {
        ...node.props,
        ...(typeof value.brand === 'string' ? { brand: value.brand } : {}),
        ...(Array.isArray(value.links) ? { links: value.links } : {}),
        ...(node.kind === 'footer' && typeof value.text === 'string' ? { text: value.text } : {}),
      };
    } else if (node.kind === 'collection') {
      node.props = {
        ...node.props,
        ...(Array.isArray(value.items) ? { items: value.items } : {}),
        ...(typeof value.title === 'string' ? { title: value.title } : {}),
        ...(typeof value.empty === 'string' ? { empty: value.empty } : {}),
      };
    } else if (node.kind === 'list') {
      if (Array.isArray(value.items)) node.props = { ...node.props, items: value.items.map(String) };
      else if (Array.isArray(value.schedule)) node.props = { ...node.props, items: (value.schedule as Record<string, unknown>[]).map((row) => `${String(object(row).days ?? '')} — ${String(object(row).hours ?? '')}`) };
    } else if (node.kind === 'form' && typeof value.submitLabel === 'string') {
      node.props = { ...node.props, submitLabel: value.submitLabel };
    } else if (node.kind === 'accordion' && Array.isArray(value.items)) {
      node.children = (value.items as Record<string, unknown>[]).map((entry, index) => {
        const faq = object(entry);
        return {
          id: `${node.id}-${index + 1}`, kind: 'stack' as const, props: { label: String(faq.q ?? faq.question ?? '') },
          children: [{ id: `${node.id}-${index + 1}-answer`, kind: 'text' as const, props: { text: String(faq.a ?? faq.answer ?? '') } }],
        };
      });
    } else if (node.kind === 'grid' && (Array.isArray(value.features) || Array.isArray(value.testimonials))) {
      const entries = (Array.isArray(value.features) ? value.features : value.testimonials) as Record<string, unknown>[];
      node.children = entries.map((entry, index) => {
        const row = object(entry);
        const children: Node[] = [];
        if (row.icon) children.push({ id: `${node.id}-${index + 1}-icon`, kind: 'icon', props: { name: String(row.icon) } });
        if (row.title ?? row.author ?? row.name) children.push({ id: `${node.id}-${index + 1}-title`, kind: 'heading', props: { text: String(row.title ?? row.author ?? row.name), level: 3 } });
        const body = row.description ?? row.quote ?? row.text;
        if (body) children.push({ id: `${node.id}-${index + 1}-text`, kind: 'text', props: { text: String(body) } });
        return { id: `${node.id}-${index + 1}`, kind: 'card' as const, props: {}, children };
      });
    }
  }
}

function removeNodes(list: Node[], id: string): Node[] {
  return list.filter((node) => node.id !== id).map((node) => node.children ? { ...node, children: removeNodes(node.children, id) } : node);
}

export interface LegacyOperation {
  readonly op: 'set_theme' | 'set_locale' | 'add_card' | 'update_card' | 'remove_card' | 'update_page' | 'set_policy';
  readonly path?: string;
  readonly value: unknown;
}

/**
 * Compatibility path: the shipped app still sends v1 operations. They are
 * translated onto the v2 document so editing keeps working during migration.
 */
export function applyLegacyOperations(doc: SiteDocument, operations: readonly LegacyOperation[]): SiteDocument {
  const next: SiteDocument = structuredClone(doc);
  const pageFor = (value?: string): Page => {
    if (!value) return next.pages[0];
    const index = next.pages.findIndex((page) => page.id === value || page.path === value);
    if (index < 0) throw notFound('Site page was not found.');
    return next.pages[index];
  };
  for (const operation of operations) {
    if (operation.op === 'set_theme' && typeof operation.value === 'string') {
      if (!THEMES[operation.value]) throw badRequest('Choose a registered site theme.');
      next.design = structuredClone(THEMES[operation.value]);
    } else if (operation.op === 'set_locale' && typeof operation.value === 'string') {
      next.locale = operation.value.trim().slice(0, 20);
    } else if (operation.op === 'set_policy') {
      next.policy = { ...next.policy, ...object(operation.value) } as SiteDocument['policy'];
    } else if (operation.op === 'update_page') {
      const page = pageFor(operation.path);
      const patch = object(operation.value);
      if (typeof patch.title === 'string' && patch.title.trim()) page.title = patch.title.trim().slice(0, 200);
      const meta = object(patch.meta);
      if (typeof meta.description === 'string') page.meta = { ...page.meta, description: meta.description.trim().slice(0, 300) };
      if (typeof patch.description === 'string') page.meta = { ...page.meta, description: patch.description.trim().slice(0, 300) };
    } else {
      const page = pageFor(operation.path);
      const id = typeof operation.value === 'string' ? operation.value : String(object(operation.value).id || '');
      if (operation.op === 'add_card') {
        const section = sectionFor(operation.value as CardDefinition);
        if (!section) throw badRequest('Site change is invalid.');
        if (page.sections.some((entry) => entry.id === section.id)) throw badRequest('Site card already exists.');
        page.sections.push(section);
      } else if (operation.op === 'remove_card') {
        const before = page.sections.length;
        page.sections = page.sections.filter((section) => section.id !== id);
        if (page.sections.length === before) throw notFound('Site card was not found.');
      } else if (operation.op === 'update_card') {
        const patch = object(operation.value);
        const section = page.sections.find((entry) => entry.id === id);
        const node = findNodes(page.sections.flatMap((entry) => entry.nodes), id);
        if (node) {
          const props = object(patch.props);
          node.props = { ...node.props, ...props };
          if (typeof patch.title === 'string' && (node.kind === 'heading' || node.kind === 'text')) node.props.text = patch.title;
          if (Array.isArray(props.links)) node.props.links = props.links;
          const bindings = Array.isArray((patch as Record<string, unknown>).bindings) ? (patch as Record<string, unknown>).bindings as { params?: Record<string, unknown> }[] : null;
          if (bindings?.length) {
            const owner = page.sections.find((entry) => findNodes(entry.nodes, id));
            if (owner) owner.bindings = bindings.map((binding, index) => v2Binding(binding as never, owner.id, index));
          }
        } else if (section) {
          mergeLegacyProps(section, patch);
          const bindings = Array.isArray((patch as Record<string, unknown>).bindings) ? (patch as Record<string, unknown>).bindings as { params?: Record<string, unknown> }[] : null;
          if (bindings?.length) section.bindings = bindings.map((binding, index) => v2Binding(binding as never, section.id, index));
        } else {
          throw notFound('Site card was not found.');
        }
      } else {
        throw badRequest('Site change is invalid.');
      }
    }
  }
  return next;
}
