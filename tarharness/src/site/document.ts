/**
 * TAR Site document - the typed, versioned source of truth for a site.
 *
 * The document contract lives in siteai.md. Fields
 * and identifiers use one lowercase semantic word; structure supplies
 * qualification. Retained v1 card records are readable through adapt.ts.
 */

export const DOCUMENT_VERSION = '2.0.0';

export const NODE_KINDS = [
  'heading', 'text', 'image', 'video', 'icon', 'list', 'link', 'button', 'divider', 'spacer',
  'flex', 'grid', 'stack', 'card', 'collection', 'navigation', 'footer',
  'menu', 'tabs', 'accordion', 'gallery', 'search', 'form',
] as const;

export type NodeKind = typeof NODE_KINDS[number];

/** Nodes that render one or more child nodes. */
export const CONTAINER_KINDS = ['flex', 'grid', 'stack', 'card', 'navigation', 'footer', 'tabs', 'accordion', 'gallery', 'form'] as const;

/** Interaction components backed by the tiny progressive runtime. */
export const INTERACTION_KINDS = ['menu', 'tabs', 'accordion', 'gallery', 'search', 'form'] as const;

export const SECTION_LAYOUTS = ['flow', 'flex', 'grid', 'stack'] as const;
export type SectionLayout = typeof SECTION_LAYOUTS[number];

export const STYLE_KEYS = [
  'background', 'color', 'pad', 'gap', 'radius', 'border', 'shadow', 'align', 'width',
  'aspect', 'gradient', 'mask', 'size', 'weight', 'columns',
] as const;

export type StyleKey = typeof STYLE_KEYS[number];

export const PAD_VALUES = ['none', 'sm', 'md', 'lg', 'xl'] as const;
export const ALIGN_VALUES = ['start', 'center', 'end', 'between'] as const;
export const WIDTH_VALUES = ['content', 'wide', 'full'] as const;
export const ASPECT_VALUES = ['square', 'portrait', 'landscape', 'wide'] as const;
export const SHADOW_VALUES = ['none', 'low', 'high'] as const;
export const BORDER_VALUES = ['none', 'hairline'] as const;
export const MASK_VALUES = ['none', 'soft'] as const;
export const SIZE_VALUES = ['display', 'heading', 'body', 'label'] as const;
export const DENSITY_VALUES = ['airy', 'balanced', 'compact'] as const;
export const EASING_VALUES = ['linear', 'ease', 'easeout', 'easeinout'] as const;
export const EASING_CSS: Record<string, string> = {
  linear: 'linear', ease: 'ease', easeout: 'cubic-bezier(0.2, 0.7, 0.2, 1)', easeinout: 'ease-in-out',
};

export interface Gradient {
  readonly from: string;
  readonly to: string;
  readonly angle: number;
}

export interface Style {
  readonly background?: string;
  readonly color?: string;
  readonly pad?: string;
  readonly gap?: string;
  readonly radius?: string | number;
  readonly border?: string;
  readonly shadow?: string;
  readonly align?: string;
  readonly width?: string;
  readonly aspect?: string;
  readonly gradient?: Gradient;
  readonly mask?: string;
  readonly size?: string;
  readonly weight?: number;
  readonly columns?: number;
}

/** Fluid base values with explicit small/medium/large overrides. */
export interface StyleSet {
  base?: Style;
  small?: Style;
  medium?: Style;
  large?: Style;
}

export interface Node {
  id: string;
  kind: NodeKind;
  props: Record<string, unknown>;
  style?: StyleSet;
  children?: Node[];
  component?: string;
  variant?: string;
}

export interface SectionLayoutSpec {
  readonly kind: SectionLayout;
  readonly columns?: number;
  readonly gap?: string;
  readonly align?: string;
  readonly width?: string;
}

export interface NodeAction {
  readonly id: string;
  readonly label: string;
  readonly target: string;
  readonly journey?: string;
  readonly variant?: string;
  readonly payload?: Record<string, unknown>;
}

export interface Binding {
  readonly id: string;
  readonly slot: string;
  readonly query: 'catalog.public' | 'records.public';
  readonly version: number;
  readonly params?: { records?: string[]; channel?: string; type?: string };
  readonly access: 'public';
  readonly freshness: number;
  readonly limit?: number;
  readonly paginate?: { size: number };
  readonly empty?: { text?: string };
  readonly detail?: { path: string };
}

export interface Section {
  id: string;
  purpose: string;
  layout: SectionLayoutSpec;
  style?: StyleSet;
  nodes: Node[];
  bindings?: Binding[];
  actions?: NodeAction[];
}

export interface PageMeta {
  readonly description?: string;
  readonly ogImage?: string;
  readonly keywords?: readonly string[];
}

export interface Page {
  id: string;
  path: string;
  title: string;
  meta?: PageMeta;
  sections: Section[];
}

export interface JourneyField {
  readonly key: string;
  readonly label: string;
  readonly kind: 'text' | 'email' | 'tel' | 'textarea' | 'number' | 'date' | 'select';
  readonly required?: boolean;
  readonly options?: readonly string[];
  readonly max?: number;
}

export interface Journey {
  id: string;
  title: string;
  target: string;
  version: number;
  input: Record<string, unknown>;
  outcome: string;
  enabled: boolean;
  kind: 'enquiry' | 'order' | 'booking' | 'payment';
  fields: JourneyField[];
  message?: string;
  limit?: number;
}

export interface Redirect {
  readonly from: string;
  readonly to: string;
  readonly status: 308;
}

export interface Lock {
  readonly target: string;
  readonly kind: 'section' | 'node' | 'token' | 'component' | 'brand';
  readonly at: number;
}

export interface AssetRights {
  readonly source: string;
  readonly license: string;
  readonly approved: boolean;
  readonly note?: string;
}

export interface Asset {
  id: string;
  kind: 'image' | 'video' | 'font' | 'icon';
  key: string;
  mime: string;
  bytes: number;
  hash: string;
  width?: number;
  height?: number;
  alt?: string;
  rights: AssetRights;
  generated?: boolean;
  prompt?: string;
  /** Stand-in media (for example Pexels) the owner should replace with real photography. */
  placeholder?: boolean;
}

export interface ComponentVariant {
  readonly style?: StyleSet;
  readonly props?: Record<string, unknown>;
}

export interface Component {
  id: string;
  name: string;
  slots: string[];
  variants: Record<string, ComponentVariant>;
  nodes: Node[];
}

export interface Brief {
  goal: string;
  audience: string;
  tone: string;
}

export interface SitePolicy {
  readonly publicEnquiry?: boolean;
  readonly publicOrdering?: boolean;
  readonly allowedCurrencies?: readonly string[];
  readonly turnstile?: string;
}

/** A compiled persona branch: a code-resolved patch over this document. */
export interface Persona {
  readonly id: string;
  readonly when: PersonaWhen;
  readonly priority: number;
  readonly hide?: readonly string[];
  readonly order?: readonly string[];
  readonly tone?: Record<string, string>;
}

export interface PersonaWhen {
  readonly channel?: string;
  readonly device?: string;
  readonly returning?: boolean;
}

/** What the edge needs to pick a variant: match rules only, never content. */
export type PersonaRule = Pick<Persona, 'id' | 'when' | 'priority'>;

/** Learned taste from accepted and rejected edits; biases defaults, never decides. */
export interface Taste {
  readonly accepted?: readonly string[];
  readonly rejected?: readonly string[];
  readonly voice?: string;
}

export interface ReleaseFile {
  readonly path: string;
  readonly mime: string;
  readonly bytes: number;
  readonly hash: string;
  readonly key: string;
}

export interface ReleaseManifest {
  readonly id: string;
  readonly siteId: string;
  readonly host?: string;
  readonly epoch?: number;
  readonly version: number;
  readonly generation: number;
  readonly created: number;
  readonly hash: string;
  readonly files: ReleaseFile[];
  /** Document schema the compiler consumed. */
  readonly compiler?: string;
  /** Compiled persona variants, best match first; content stays in the release files. */
  readonly personas?: readonly PersonaRule[];
  readonly redirects?: readonly { readonly from: string; readonly to: string; readonly status: 308 }[];
  readonly checks?: { readonly blocking: number; readonly advisory: number };
}

export interface SiteDocument {
  schema: typeof DOCUMENT_VERSION;
  revision: number;
  brief: Brief;
  locale: string;
  timezone: string;
  currency: string;
  design: import('./design.ts').Design;
  assets: Asset[];
  components: Component[];
  pages: Page[];
  journeys: Journey[];
  redirects: Redirect[];
  locks: Lock[];
  policy: SitePolicy;
  personas?: Persona[];
  taste?: Taste;
  /** Prose claims checked against supplied evidence; unresolved claims block publish. */
  claims?: { text: string; verdict: 'supported' | 'contradicted' | 'unsupported'; evidence?: string[] }[];
  /** Compatibility projection of the live release. CONTROL D1 remains the authority. */
  currentRelease?: string | null;
  releases?: ReleaseManifest[];
}

export const LIMITS = {
  pages: 50,
  sections: 40,
  nodes: 200,
  depth: 5,
  document: 1_000_000,
  components: 40,
  assets: 200,
  typography: 16,
} as const;

/** Reserved public routes that a page path may never claim. */
export const RESERVED_PATHS = ['/_tar', '/v1'] as const;

export const PUBLIC_TYPES = ['pos.product', 'item', 'service', 'article', 'project'] as const;

export const JOURNEY_TARGETS: Record<string, readonly string[]> = {
  enquiry: ['record.create'],
  booking: ['record.create'],
  order: ['order.place'],
  payment: [],
};

export function isNodeKind(value: unknown): value is NodeKind {
  return typeof value === 'string' && (NODE_KINDS as readonly string[]).includes(value);
}

export function isContainerKind(kind: NodeKind): boolean {
  return (CONTAINER_KINDS as readonly string[]).includes(kind);
}

export function isInteractionKind(kind: NodeKind): boolean {
  return (INTERACTION_KINDS as readonly string[]).includes(kind);
}
