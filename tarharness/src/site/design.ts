/**
 * Site design system: typed tokens, design.md import/export and contrast checks.
 *
 * Markdown is the readable view of the typed design, never a second source of
 * truth. Import records the original reference, its hash and every decision that
 * resolved a conflict, ambiguity or unsupported value.
 */

import { DENSITY_VALUES, EASING_VALUES, LIMITS, type Style } from './document.ts';

export interface DesignDirection {
  audience: string;
  purpose: string;
  voice: string;
  density: string;
  idea: string;
}

export interface DesignColor {
  canvas: string;
  ink: string;
  accent: string;
  accentink: string;
  surface: string;
  border: string;
  muted: string;
  success: string;
  danger: string;
}

export interface DesignType {
  display: string;
  heading: string;
  body: string;
  base: number;
  scale: number;
  leading: number;
  weight: number;
  /** Global letter-spacing in em (0 default); the lookbook uses 0.025. */
  tracking?: number;
}

export interface DesignSpace {
  unit: number;
  section: number;
  container: number;
}

export interface DesignShape {
  sm: number;
  md: number;
  lg: number;
  pill: number;
}

export interface DesignElevation {
  low: number;
  high: number;
}

export interface DesignLayout {
  columns: number;
  gap: number;
  align: 'start' | 'center';
}

export interface DesignMotion {
  duration: number;
  easing: string;
  reduce: boolean;
}

export interface DesignDecision {
  area: string;
  question: string;
  choice: string;
  alternatives?: string[];
  note?: string;
}

export interface DesignSource {
  reference: string;
  hash: string;
  revision: number;
  decisions: DesignDecision[];
}

export interface Design {
  theme: string;
  direction: DesignDirection;
  color: DesignColor;
  type: DesignType;
  space: DesignSpace;
  shape: DesignShape;
  elevation: DesignElevation;
  layout: DesignLayout;
  motion: DesignMotion;
  guidance: string[];
  source?: DesignSource;
}

export const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
export const SERIF = 'Georgia, "Times New Roman", serif';

import { DEFAULT_DESIGN, THEMES, THEME_IDS } from './themes/index.ts';
export { DEFAULT_DESIGN, THEMES, THEME_IDS };

/** Home-page section orders the builder and the `flow` judgment share. */
export const FLOWS = ['classic_lookbook', 'commerce_first', 'editorial_first'] as const;
export type Flow = typeof FLOWS[number];

/** A commerce gate: which rail, binding and journey a category carries. */
export type Gate = 'product' | 'service';

export interface CategorySpec {
  readonly id: string;
  readonly sector: string;
  /** Plain words the `category` judgment uses to match a brief. */
  readonly criteria: string;
  readonly flow: Flow;
  readonly theme: string;
  readonly gates: readonly Gate[];
}

/**
 * Registered category archetypes (siteai.md §4). A category is catalog data: it
 * sets the default flow, the floor theme and the commerce-gate priors, and the
 * `category` judgment may only choose among these ids.
 */
export const CATEGORIES: Record<string, CategorySpec> = {
  retail: { id: 'retail', sector: 'Goods', criteria: 'Physical goods, catalog, shipping', flow: 'classic_lookbook', theme: 'editorial-lookbook', gates: ['product'] },
  estate: { id: 'estate', sector: 'Goods', criteria: 'Property listings, viewings', flow: 'editorial_first', theme: 'editorial-light', gates: ['product', 'service'] },
  food: { id: 'food', sector: 'Hospitality', criteria: 'Food and drink, menu, hours', flow: 'commerce_first', theme: 'editorial-chalk', gates: ['product', 'service'] },
  stay: { id: 'stay', sector: 'Hospitality', criteria: 'Room bookings, availability', flow: 'editorial_first', theme: 'editorial-light', gates: ['product', 'service'] },
  event: { id: 'event', sector: 'Hospitality', criteria: 'Gatherings, tickets, schedule', flow: 'commerce_first', theme: 'streetwear-dark', gates: ['product'] },
  care: { id: 'care', sector: 'Service', criteria: 'Personal or wellness appointments', flow: 'classic_lookbook', theme: 'minimal-clean', gates: ['service'] },
  health: { id: 'health', sector: 'Service', criteria: 'Medical care, appointments, trust', flow: 'classic_lookbook', theme: 'minimal-clean', gates: ['service'] },
  trade: { id: 'trade', sector: 'Service', criteria: 'Field work, quotes, jobs', flow: 'editorial_first', theme: 'minimal-clean', gates: ['service'] },
  firm: { id: 'firm', sector: 'Professional', criteria: 'Scoped professional engagements', flow: 'editorial_first', theme: 'editorial-light', gates: ['service'] },
  company: { id: 'company', sector: 'Professional', criteria: 'Business presence without a direct sale', flow: 'editorial_first', theme: 'editorial-light', gates: [] },
  software: { id: 'software', sector: 'Professional', criteria: 'Software apps, features, demo', flow: 'commerce_first', theme: 'minimal-clean', gates: ['product', 'service'] },
  expert: { id: 'expert', sector: 'Knowledge', criteria: 'Talks, reports, advisory', flow: 'editorial_first', theme: 'editorial-light', gates: ['product', 'service'] },
  learning: { id: 'learning', sector: 'Knowledge', criteria: 'Courses, curriculum, coaching', flow: 'commerce_first', theme: 'minimal-clean', gates: ['product', 'service'] },
  studio: { id: 'studio', sector: 'Knowledge', criteria: 'Creative portfolio, visual work', flow: 'editorial_first', theme: 'streetwear-dark', gates: [] },
  media: { id: 'media', sector: 'Content', criteria: 'Articles, episodes, newsletter', flow: 'editorial_first', theme: 'editorial-light', gates: [] },
  personal: { id: 'personal', sector: 'Content', criteria: 'Individual resume, creator identity', flow: 'editorial_first', theme: 'minimal-clean', gates: [] },
  cause: { id: 'cause', sector: 'Mission', criteria: 'Non-profit, donations, volunteers', flow: 'editorial_first', theme: 'editorial-chalk', gates: [] },
  civic: { id: 'civic', sector: 'Public', criteria: 'Official public body, notices', flow: 'classic_lookbook', theme: 'minimal-clean', gates: ['service'] },
  club: { id: 'club', sector: 'Public', criteria: 'Member activities, joining', flow: 'classic_lookbook', theme: 'minimal-clean', gates: ['service'] },
  none: { id: 'none', sector: 'Fallback', criteria: 'No clear archetype; gates come from supplied facts', flow: 'commerce_first', theme: 'minimal-clean', gates: [] },
};

export const CATEGORY_IDS: readonly string[] = Object.keys(CATEGORIES);

/** Registered section purposes a creation fan-out may include, by any domain. */
export const PURPOSE_IDEAS: Record<string, string> = {
  introduction: 'open the page with the offer in one line',
  collection: 'show bound products with live prices and availability',
  services: 'show bound bookable services with live availability',
  recommendations: 'surface more bound items the visitor may like',
  split: 'present two approved media assets side by side as an editorial break',
  categories: 'link the declared pages as a text-tab filter',
  promo: 'a full-width band carrying one clear call to action',
  press: 'monochrome publication press logos affirming brand trust',
  community: 'community photo mosaic and social hashtag grid',
  features: 'state what makes the offer practical',
  proof: 'carry evidence such as results or reviews',
  story: 'explain the business in its own words',
  questions: 'answer common questions',
  hours: 'state when the business is open',
  contact: 'show how to reach the business',
  action: 'invite the visitor to start one clear next step',
};

export const COLOR_KEYS: readonly (keyof DesignColor)[] = [
  'canvas', 'ink', 'accent', 'accentink', 'surface', 'border', 'muted', 'success', 'danger',
];

/** The four colour pairs an owner can name for a section, shared by builder, router and variants. */
export const TONE_STYLE: Record<string, Style> = {
  canvas: { background: 'token:color.canvas', color: 'token:color.ink' },
  surface: { background: 'token:color.surface', color: 'token:color.ink' },
  ink: { background: 'token:color.ink', color: 'token:color.canvas' },
  accent: { background: 'token:color.accent', color: 'token:color.accentink' },
};
export const TONE_KEYS: readonly string[] = Object.keys(TONE_STYLE);

interface TokenEntry { group: string; key: string; kind: 'color' | 'number' | 'font' | 'enum' }

export const TOKENS: readonly TokenEntry[] = [
  ...COLOR_KEYS.map((key) => ({ group: 'color', key, kind: 'color' as const })),
  { group: 'type', key: 'display', kind: 'font' }, { group: 'type', key: 'heading', kind: 'font' },
  { group: 'type', key: 'body', kind: 'font' }, { group: 'type', key: 'base', kind: 'number' },
  { group: 'type', key: 'scale', kind: 'number' }, { group: 'type', key: 'leading', kind: 'number' },
  { group: 'type', key: 'weight', kind: 'number' }, { group: 'type', key: 'tracking', kind: 'number' },
  { group: 'space', key: 'unit', kind: 'number' }, { group: 'space', key: 'section', kind: 'number' },
  { group: 'space', key: 'container', kind: 'number' },
  { group: 'shape', key: 'sm', kind: 'number' }, { group: 'shape', key: 'md', kind: 'number' },
  { group: 'shape', key: 'lg', kind: 'number' }, { group: 'shape', key: 'pill', kind: 'number' },
  { group: 'elevation', key: 'low', kind: 'number' }, { group: 'elevation', key: 'high', kind: 'number' },
  { group: 'layout', key: 'columns', kind: 'number' }, { group: 'layout', key: 'gap', kind: 'number' },
  { group: 'motion', key: 'duration', kind: 'number' }, { group: 'motion', key: 'easing', kind: 'enum' },
];

/** Resolve `token:group.key` against the design. Returns undefined for unknown tokens. */
export function resolveToken(design: Design, ref: string): string | number | undefined {
  if (!ref.startsWith('token:')) return undefined;
  const [group, key] = ref.slice('token:'.length).split('.');
  if (!group || !key || !TOKENS.some((token) => token.group === group && token.key === key)) return undefined;
  const value = (design as unknown as Record<string, Record<string, unknown>>)[group]?.[key];
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

export function isTokenRef(value: string): boolean {
  return value.startsWith('token:');
}

export function hexRgb(value: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const int = parseInt(match[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

export function luminance(value: string): number | null {
  const rgb = hexRgb(value);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((channel) => {
    const scaled = channel / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, or null when either colour is not a plain hex value. */
export function contrast(a: string, b: string): number | null {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  const [high, low] = la >= lb ? [la, lb] : [lb, la];
  return (high + 0.05) / (low + 0.05);
}

export interface DesignReport {
  level: 'blocking' | 'advisory';
  area: string;
  message: string;
}

export function auditDesign(design: Design): DesignReport[] {
  const reports: DesignReport[] = [];
  const pairs: [keyof DesignColor, keyof DesignColor, number, string, 'blocking' | 'advisory'][] = [
    ['ink', 'canvas', 4.5, 'Body text', 'blocking'],
    ['ink', 'surface', 4.5, 'Text on raised surfaces', 'blocking'],
    ['accentink', 'accent', 4.5, 'Button text', 'blocking'],
    ['muted', 'canvas', 4.5, 'Secondary text', 'advisory'],
    ['muted', 'surface', 4.5, 'Secondary text on raised surfaces', 'advisory'],
    ['border', 'canvas', 1.2, 'Visible borders', 'advisory'],
  ];
  for (const [fg, bg, minimum, label, level] of pairs) {
    const ratio = contrast(design.color[fg], design.color[bg]);
    if (ratio === null) { reports.push({ level: 'blocking', area: 'color', message: `${label} colour must be a plain hex value.` }); continue; }
    if (ratio < minimum) reports.push({ level, area: 'color', message: `${label} contrast is ${ratio.toFixed(2)}:1, below ${minimum}:1.` });
  }
  if (design.type.base < LIMITS.typography) reports.push({ level: 'blocking', area: 'type', message: 'Base type size must be at least 16px.' });
  if (design.space.unit <= 0 || design.space.unit > 32) reports.push({ level: 'blocking', area: 'space', message: 'Spacing unit must be between 1 and 32px.' });
  if (design.space.section < 32) reports.push({ level: 'advisory', area: 'space', message: 'Section spacing is tight; generous spacing reads better.' });
  if (design.type.scale < 1.1 || design.type.scale > 1.6) reports.push({ level: 'advisory', area: 'type', message: 'Type scale outside the familiar 1.1-1.6 range.' });
  if (design.shape.pill < 100) reports.push({ level: 'advisory', area: 'shape', message: 'Pill radius should stay large enough to read as a pill.' });
  if (design.motion.reduce !== true) reports.push({ level: 'blocking', area: 'motion', message: 'Reduced-motion fallback must stay enabled.' });
  if (!(DENSITY_VALUES as readonly string[]).includes(design.direction.density)) reports.push({ level: 'blocking', area: 'direction', message: 'Density must be airy, balanced or compact.' });
  if (!(EASING_VALUES as readonly string[]).includes(design.motion.easing)) reports.push({ level: 'blocking', area: 'motion', message: 'Easing must be linear, ease, easeout or easeinout.' });
  return reports;
}

const AREA_ALIASES: Record<string, string> = {
  direction: 'direction', voice: 'direction', audience: 'direction', purpose: 'direction',
  foundation: 'color', foundations: 'color', color: 'color', colours: 'color', colors: 'color',
  typography: 'type', type: 'type', fonts: 'type', font: 'type',
  spacing: 'space', space: 'space',
  shape: 'shape', radius: 'shape', corner: 'shape', corners: 'shape',
  surface: 'surface', surfaces: 'surface', elevation: 'elevation', shadow: 'elevation', shadows: 'elevation',
  layout: 'layout', grid: 'layout',
  motion: 'motion', transition: 'motion', transitions: 'motion', animation: 'motion',
  guidance: 'guidance', rules: 'guidance', notes: 'guidance',
  component: 'guidance', components: 'guidance', imagery: 'guidance', image: 'guidance', images: 'guidance',
};

const COLOR_WORDS: Record<string, keyof DesignColor> = {
  accent: 'accent', primary: 'accent', brand: 'accent',
  canvas: 'canvas', background: 'canvas', bg: 'canvas', page: 'canvas',
  ink: 'ink', text: 'ink', foreground: 'ink',
  surface: 'surface', panel: 'surface', card: 'surface',
  border: 'border', line: 'border', divider: 'border', outline: 'border',
  muted: 'muted', secondary: 'muted', subtle: 'muted',
  success: 'success', positive: 'success',
  danger: 'danger', error: 'danger', destructive: 'danger',
  accentink: 'accentink', onaccent: 'accentink',
};

const FONT_ALIASES: Record<string, string> = {
  serif: SERIF, sans: SANS, sansserif: SANS, system: SANS, monospace: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

function clone(design: Design): Design {
  return JSON.parse(JSON.stringify(design)) as Design;
}

export interface DesignParse {
  design: Design;
  decisions: DesignDecision[];
  notes: string[];
}

/**
 * Parse the readable design.md view into a proposed typed design.
 * Never grants permission or instructions: only known areas and keys are read.
 */
export function parseDesign(markdown: string, previous: Design = DEFAULT_DESIGN): DesignParse {
  const design = clone(previous);
  const decisions: DesignDecision[] = [];
  const notes: string[] = [];
  let area = '';
  const seen = new Set<string>();

  const decide = (decision: DesignDecision) => {
    if (decisions.some((entry) => entry.area === decision.area && entry.question === decision.question)) return;
    decisions.push(decision);
  };
  const assign = (key: string, value: string) => {
    const marker = `${area}.${key}`;
    const current = (design as unknown as Record<string, Record<string, unknown>>)[area]?.[key];
    if (seen.has(marker)) {
      if (String(current) !== value) decide({ area, question: `Use one ${key} value`, choice: String(current), alternatives: [String(value)] });
      return;
    }
    seen.add(marker);
    const target = (design as unknown as Record<string, Record<string, unknown>>)[area];
    if (!target) return;
    if (typeof current === 'boolean') {
      target[key] = value === 'true';
      return;
    }
    if (typeof current === 'number') {
      const number = Number.parseFloat(value);
      if (Number.isFinite(number)) target[key] = Math.round(number * 100) / 100;
      return;
    }
    target[key] = value;
  };

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const text = heading[2].toLowerCase().replace(/[^a-z ]/g, '').trim();
      const word = text.split(/\s+/).find((part) => AREA_ALIASES[part]) || '';
      area = AREA_ALIASES[word] || '';
      continue;
    }
    if (!line || !area) continue;
    const body = line.replace(/^[-*+]\s+/, '').replace(/\*\*/g, '').trim();
    const pair = /^([a-z][a-z ]{1,24}?)\s*[:=]\s*(.+)$/i.exec(body);
    const key = pair ? pair[1].trim().toLowerCase().replace(/\s+/g, '') : '';
    const value = pair ? pair[2].trim() : body;

    if (area === 'color') {
      const hex = value.match(/#[0-9a-f]{6}/i)?.[0];
      if (!hex) continue;
      const named = pair ? COLOR_WORDS[key] : undefined;
      if (named) assign(named, hex.toLowerCase());
      else notes.push(`Unnamed colour ${hex} was kept as guidance.`);
      continue;
    }
    if (area === 'type') {
      const size = /^(\d+(?:\.\d+)?)\s*(?:px)?$/i.exec(value)?.[1] ?? /(\d+(?:\.\d+)?)\s*px/i.exec(value)?.[1];
      if (size && /size|base|body/i.test(key || value)) {
        const px = Number.parseFloat(size);
        if (px < LIMITS.typography) decide({ area: 'type', question: 'Keep a readable minimum type size', choice: `Raise ${px}px to ${LIMITS.typography}px for body text`, note: 'Smaller sizes stay available only as labeled exceptions.' });
        assign('base', String(Math.max(px, LIMITS.typography)));
        continue;
      }
      const scale = /^(\d\.\d+)$/.exec(value)?.[1];
      if (scale && /scale|ratio/i.test(key)) { assign('scale', scale); continue; }
      const leading = /^(\d\.\d+)$/.exec(value)?.[1];
      if (leading && /leading|line/i.test(key)) { assign('leading', leading); continue; }
      const tracking = /^(0\.\d+)em$/i.exec(value)?.[1] ?? (/tracking/i.test(key) ? /^0\.\d+$/.exec(value)?.[1] : undefined);
      if (tracking && /tracking/i.test(key)) { assign('tracking', tracking); continue; }
      const font = FONT_ALIASES[value.toLowerCase().replace(/[^a-z]/g, '')];
      if (font && /display|heading|body|font/i.test(key)) { assign(key.includes('body') ? 'body' : 'heading', font); continue; }
      if (/figma|google|licensed|font/i.test(body)) {
        decide({ area: 'type', question: 'Substitute named fonts', choice: 'Use system font stacks', note: `Reference font "${value}" is not licensed for embedding; a suitable system stack is used instead.` });
      }
      continue;
    }
    if (area === 'space') {
      const numbers = [...value.matchAll(/(\d+(?:\.\d+)?)\s*(px)?/gi)].map((match) => Number.parseFloat(match[1]));
      if (!numbers.length) continue;
      if (/unit|increment|step|base/i.test(key || value)) assign('unit', String(numbers[0]));
      else if (/section|block|gutter|vertical/i.test(key)) assign('section', String(numbers[0]));
      else if (/container|max|width/i.test(key)) assign('container', String(numbers[0]));
      if (numbers.length > 1 && /unit|increment/i.test(key || value) && numbers.some((value) => value % numbers[0] !== 0)) {
        decide({ area: 'space', question: 'Keep spacing consistent', choice: `Use ${numbers[0]}px increments`, alternatives: numbers.map(String), note: 'Values outside the increment are rounded to the nearest step.' });
      }
      continue;
    }
    if (area === 'shape') {
      const numbers = [...value.matchAll(/(\d+)\s*(px)?/gi)].map((match) => Number.parseInt(match[1], 10));
      if (!numbers.length) continue;
      const roles: (keyof DesignShape)[] = ['sm', 'md', 'lg', 'pill'];
      if (key && (roles as readonly string[]).includes(key)) { assign(key, String(numbers[0])); continue; }
      if (numbers.length === 3) notes.push('Three radius values were read as sm, md and lg; the pill radius keeps its full value.');
      if (numbers.length === 4) decide({ area: 'shape', question: 'Normalise the radius scale', choice: 'sm, md, lg and pill roles', alternatives: numbers.map(String) });
      numbers.slice(0, roles.length).forEach((number, index) => assign(roles[index], String(number)));
      continue;
    }
    if (area === 'surface' || area === 'elevation') {
      const numbers = [...value.matchAll(/(\d+)\s*(px)?/gi)].map((match) => Number.parseInt(match[1], 10));
      if (!numbers.length) continue;
      if (/high|strong|lg|large/i.test(key || value)) assign('high', String(numbers[0]));
      else assign('low', String(numbers[0]));
      continue;
    }
    if (area === 'layout') {
      const numbers = [...value.matchAll(/(\d+(?:\.\d+)?)\s*(px)?/gi)].map((match) => Number.parseFloat(match[1]));
      if (!numbers.length) continue;
      if (/column/i.test(key || value)) assign('columns', String(numbers[0]));
      else if (/gap|gutter/i.test(key)) assign('gap', String(numbers[0]));
      else if (/container|width|max/i.test(key)) assign('container', String(numbers[0]));
      continue;
    }
    if (area === 'motion') {
      const numbers = [...value.matchAll(/(\d+(?:\.\d+)?)\s*(ms|s)?/gi)].map((match) => Number.parseFloat(match[1]) * (match[2] === 's' ? 1000 : 1));
      if (numbers.length && /duration|speed|time/i.test(key || value)) assign('duration', String(numbers[0]));
      const easing = (EASING_VALUES as readonly string[]).find((value2) => value.toLowerCase().includes(value2)) || (value.toLowerCase().includes('ease-in-out') ? 'easeinout' : '');
      if (easing) assign('easing', easing);
      if (/reduce|prefers/i.test(value)) assign('reduce', 'true');
      continue;
    }
    if (area === 'guidance') {
      const clean = body.replace(/[#*`]/g, '').trim().slice(0, 200);
      if (clean && !/http/i.test(clean)) design.guidance = [...design.guidance.slice(0, 40), clean];
      continue;
    }
    if (area === 'direction') {
      if (/audience|who/i.test(key)) assign('audience', value.slice(0, 200));
      else if (/purpose|goal/i.test(key)) assign('purpose', value.slice(0, 200));
      else if (/voice|tone/i.test(key)) assign('voice', value.slice(0, 200));
      else if (/density/i.test(key)) assign('density', (DENSITY_VALUES as readonly string[]).find((option) => value.toLowerCase().includes(option)) || design.direction.density);
      else if (/idea|concept|direction/i.test(key)) assign('idea', value.slice(0, 200));
    }
  }

  design.guidance = design.guidance.filter((entry) => typeof entry === 'string' && entry.length > 0).slice(0, 40);
  return { design, decisions, notes };
}

/** Export the typed design as its readable markdown view. */
export function exportDesign(design: Design | undefined | null): string {
  if (!design) return '';
  const direction = design.direction || DEFAULT_DESIGN.direction;
  const color = design.color || DEFAULT_DESIGN.color;
  const type = design.type || DEFAULT_DESIGN.type;
  const space = design.space || DEFAULT_DESIGN.space;
  const shape = design.shape || DEFAULT_DESIGN.shape;
  const elevation = design.elevation || DEFAULT_DESIGN.elevation;
  const layout = design.layout || DEFAULT_DESIGN.layout;
  const motion = design.motion || DEFAULT_DESIGN.motion;
  const guidance = Array.isArray(design.guidance) ? design.guidance : [];

  const lines: string[] = [];
  lines.push('# Design');
  lines.push('');
  lines.push('## Direction');
  lines.push(`- audience: ${direction.audience || ''}`);
  lines.push(`- purpose: ${direction.purpose || ''}`);
  lines.push(`- voice: ${direction.voice || ''}`);
  lines.push(`- density: ${direction.density || 'balanced'}`);
  lines.push(`- idea: ${direction.idea || ''}`);
  lines.push('');
  lines.push('## Foundations');
  for (const key of COLOR_KEYS) lines.push(`- ${key}: ${color[key] || DEFAULT_DESIGN.color[key]}`);
  lines.push('');
  lines.push('## Typography');
  lines.push(`- display: ${type.display || DEFAULT_DESIGN.type.display}`);
  lines.push(`- heading: ${type.heading || DEFAULT_DESIGN.type.heading}`);
  lines.push(`- body: ${type.body || DEFAULT_DESIGN.type.body}`);
  lines.push(`- base: ${type.base || 16}px`);
  lines.push(`- scale: ${type.scale || 1.25}`);
  lines.push(`- leading: ${type.leading || 1.6}`);
  lines.push(`- weight: ${type.weight || 600}`);
  if (type.tracking) lines.push(`- tracking: ${type.tracking}em`);
  lines.push('');
  lines.push('## Spacing');
  lines.push(`- unit: ${space.unit || 8}px`);
  lines.push(`- section: ${space.section || 96}px`);
  lines.push(`- container: ${space.container || 1200}px`);
  lines.push('');
  lines.push('## Shape');
  lines.push(`- sm: ${shape.sm ?? 4}px`);
  lines.push(`- md: ${shape.md ?? 8}px`);
  lines.push(`- lg: ${shape.lg ?? 16}px`);
  lines.push(`- pill: ${shape.pill ?? 9999}px`);
  lines.push('');
  lines.push('## Elevation');
  lines.push(`- low: ${elevation.low ?? 2}px`);
  lines.push(`- high: ${elevation.high ?? 8}px`);
  lines.push('');
  lines.push('## Layout');
  lines.push(`- columns: ${layout.columns || 1}`);
  lines.push(`- gap: ${layout.gap || 16}px`);
  lines.push(`- align: ${layout.align || 'start'}`);
  lines.push('');
  lines.push('## Motion');
  lines.push(`- duration: ${motion.duration || 200}ms`);
  lines.push(`- easing: ${motion.easing || 'easeout'}`);
  lines.push(`- reduce: ${motion.reduce ? 'true' : 'false'}`);
  if (guidance.length) {
    lines.push('');
    lines.push('## Guidance');
    for (const entry of guidance) lines.push(`- ${entry}`);
  }
  if (design.source) {
    lines.push('');
    lines.push('## Source');
    lines.push(`- reference: ${design.source.reference || ''}`);
    lines.push(`- hash: ${design.source.hash || ''}`);
    lines.push(`- revision: ${design.source.revision || 1}`);
    for (const decision of design.source.decisions || []) lines.push(`- decision: ${decision.area} - ${decision.question} - ${decision.choice}`);
  }
  return `${lines.join('\n')}\n`;
}
