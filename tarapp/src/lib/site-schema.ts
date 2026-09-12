/**
 * TAR Site Bot Schema & Types (parv2.md §2, §4, §16)
 *
 * Strict, versioned schema definitions for TAR Site Bot:
 * - 12 Card families
 * - 3 Design themes
 * - SiteDefinition, PageDefinition, CardDefinition, ReleaseManifest
 * - Bi-directional legacy compatibility adapters (SiteLayout <-> SiteDefinition)
 */

export const CARD_KINDS = [
  'navigation',
  'hero',
  'content',
  'collection',
  'features',
  'proof',
  'faq',
  'hours',
  'contact',
  'form',
  'cta',
  'footer',
] as const;
export type CardKind = typeof CARD_KINDS[number];

export const THEME_NAMES = ['editorial-chalk', 'streetwear-dark', 'minimal-clean'] as const;
export type ThemeName = typeof THEME_NAMES[number];

export interface DesignTokens {
  theme: ThemeName;
  colors: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    accentHover: string;
    border: string;
  };
  fonts: {
    sans: string;
    serif?: string;
    mono?: string;
  };
  radii: {
    sm: string;
    md: string;
    lg: string;
    pill: string;
  };
}

export const DEFAULT_DESIGN_TOKENS: Record<ThemeName, DesignTokens> = {
  'editorial-chalk': {
    theme: 'editorial-chalk',
    colors: {
      bg: '#edebe4',
      surface: '#f5f4ef',
      text: '#01273e',
      muted: '#52667a',
      accent: '#000bfa',
      accentHover: '#0008b8',
      border: '#d7d4c7',
    },
    fonts: {
      sans: 'Inter, system-ui, -apple-system, sans-serif',
      serif: 'Georgia, Cambria, serif',
      mono: 'ui-monospace, SFMono-Regular, monospace',
    },
    radii: {
      sm: '4px',
      md: '8px',
      lg: '16px',
      pill: '9999px',
    },
  },
  'streetwear-dark': {
    theme: 'streetwear-dark',
    colors: {
      bg: '#0a0a0a',
      surface: '#171717',
      text: '#fafafa',
      muted: '#a3a3a3',
      accent: '#e11d48',
      accentHover: '#be123c',
      border: '#262626',
    },
    fonts: {
      sans: 'Inter, system-ui, -apple-system, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, monospace',
    },
    radii: {
      sm: '2px',
      md: '4px',
      lg: '8px',
      pill: '9999px',
    },
  },
  'minimal-clean': {
    theme: 'minimal-clean',
    colors: {
      bg: '#ffffff',
      surface: '#f8fafc',
      text: '#0f172a',
      muted: '#64748b',
      accent: '#2563eb',
      accentHover: '#1d4ed8',
      border: '#e2e8f0',
    },
    fonts: {
      sans: 'Inter, system-ui, -apple-system, sans-serif',
    },
    radii: {
      sm: '6px',
      md: '12px',
      lg: '20px',
      pill: '9999px',
    },
  },
};

export interface CardBinding {
  recordType: string;
  filter?: Record<string, unknown>;
  map: Record<string, string>;
}

export interface CardDefinition {
  id: string;
  kind: CardKind;
  version: number;
  title?: string;
  description?: string;
  props: Record<string, any>;
  binding?: CardBinding;
  visibility?: {
    guest?: boolean;
    member?: boolean;
  };
}

export interface PageDefinition {
  id: string;
  path: string;
  title: string;
  meta?: {
    description?: string;
    ogImage?: string;
  };
  cards: CardDefinition[];
}

export interface JourneyDefinition {
  id: string;
  title: string;
  target: string;
  version: number;
  input: Record<string, unknown>;
  outcome: string;
}

export interface VariantDefinition {
  id: string;
  name: string;
  weight: number;
  patches: SitePatchOperation[];
}

export interface SurfaceDefinition {
  id: string;
  cardId: string;
  streamUrl: string;
  fallbackHtml?: string;
}

export interface ReleaseFile {
  path: string;
  mime: string;
  bytes: number;
  hash: string;
}

export interface ReleaseManifest {
  id: string;
  siteId: string;
  version: number;
  generation: number;
  created: number;
  html: string;
  css: string;
  hash: string;
  files: ReleaseFile[];
}

export interface SiteDefinition {
  schema: '1.0.0';
  design: DesignTokens;
  locale: string;
  timezone: string;
  currency: string;
  pages: PageDefinition[];
  journeys: JourneyDefinition[];
  variants: VariantDefinition[];
  surfaces: SurfaceDefinition[];
  currentRelease?: string | null;
  releases?: ReleaseManifest[];
  policy?: {
    publicOrdering: boolean;
    publicEnquiry: boolean;
    allowedCurrencies: string[];
  };
}

export type SitePatchOperation =
  | { op: 'set_theme'; value: ThemeName }
  | { op: 'set_locale'; value: string }
  | { op: 'add_card'; pageId?: string; index?: number; value: CardDefinition }
  | { op: 'remove_card'; pageId?: string; value: string }
  | { op: 'update_card'; pageId?: string; value: Partial<CardDefinition> & { id: string } };

// =========================================================================
// Legacy Compatibility Types & Adapters
// =========================================================================

export const TEMPLATES = [
  'editorial-chalk',
  'streetwear-dark',
  'minimal-clean',
  'milo',
  'kith',
  'luxury-black',
  'minimal-white',
  'modern-gradient',
  'editorial',
] as const;
export type TemplateName = typeof TEMPLATES[number];

export interface Theme {
  primary: string;
  secondary?: string;
  background: string;
  surface?: string;
  text: string;
  font: string;
  fontHeading: string;
}

export interface Section {
  id: string;
  type: string;
  variant?: string;
  contract?: Record<string, any>;
  config?: Record<string, any>;
  title?: string;
  subtitle?: string;
  text?: string;
  layout?: string;
  ctaText?: string;
  items?: Array<Record<string, any>>;
  [key: string]: any;
}

export interface WidgetConfig {
  type: 'cart' | 'booking' | 'contact' | 'tracking' | 'quote' | 'chat';
  config: Record<string, any>;
}

export interface SiteLayout {
  template: TemplateName;
  theme: Theme;
  sections: Section[];
  widgets?: WidgetConfig[];
}

export const DEFAULT_THEME: Theme = {
  primary: '#000bfa',
  background: '#edebe4',
  text: '#01273e',
  font: 'Inter',
  fontHeading: 'Inter',
};

export const DEFAULT_LAYOUT: SiteLayout = {
  template: 'editorial-chalk',
  theme: DEFAULT_THEME,
  sections: [
    { id: 'nav', type: 'navigation', config: { brand: 'Workspace', links: [{ label: 'Home', href: '#' }] } },
    { id: 'hero', type: 'hero', config: { headline: 'Welcome', subtext: 'Discover our workspace', cta: 'Explore' } },
    { id: 'footer', type: 'footer', config: { text: 'All rights reserved' } },
  ],
};

export function parseLayout(value: unknown): SiteLayout | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  const sections = Array.isArray(obj.sections)
    ? obj.sections
    : Array.isArray((obj as any).routes?.[0]?.nodes)
    ? (obj as any).routes[0].nodes
    : null;
  if (!sections) return null;

  return {
    template: (typeof obj.template === 'string' ? obj.template : 'editorial-chalk') as TemplateName,
    theme: (obj.theme && typeof obj.theme === 'object' ? obj.theme : DEFAULT_THEME) as Theme,
    sections: sections as Section[],
    widgets: (Array.isArray(obj.widgets) ? obj.widgets : []) as WidgetConfig[],
  };
}

export function sectionSummary(section: Section): string {
  const c: Record<string, any> = { ...(section.config || {}), ...(section as any) };
  switch (section.type) {
    case 'hero':
    case 'hero_banner':
      return c.headline || c.title ? String(c.headline || c.title) : 'Hero banner';
    case 'hero_carousel':
      return `${(c.slides ?? []).length || 1}-slide carousel`;
    case 'product_grid':
    case 'collection':
      return c.title ? `Products · ${c.title}` : 'Product collection';
    case 'menu_grid':
      return c.title ? `Menu · ${c.title}` : 'Menu grid';
    case 'service_list':
    case 'features':
      return c.title ? `Features · ${c.title}` : 'Features list';
    case 'proof':
    case 'testimonials':
      return `${(c.items ?? c.testimonials ?? []).length || 0} reviews`;
    case 'faq':
      return `${(c.items ?? []).length || 0} FAQs`;
    case 'hours':
      return c.title || c.hours ? String(c.title || c.hours) : 'Operating hours';
    case 'contact':
    case 'contact_form':
      return c.title ? String(c.title) : 'Contact';
    case 'form':
      return c.title ? String(c.title) : 'Form';
    case 'cta':
      return c.headline || c.title ? String(c.headline || c.title) : 'Call to action';
    case 'footer':
      return c.text ? String(c.text) : 'Footer';
    default:
      return c.title || c.headline || String(section.type).replace(/_/g, ' ');
  }
}

/**
 * Bi-directional adapter: Converts a strict SiteDefinition into legacy SiteLayout
 */
export function siteDefinitionToLayout(site: SiteDefinition): SiteLayout {
  const template: TemplateName = (site.design.theme as TemplateName) || 'editorial-chalk';
  const theme: Theme = {
    primary: site.design.colors.accent,
    secondary: site.design.colors.accentHover,
    background: site.design.colors.bg,
    surface: site.design.colors.surface,
    text: site.design.colors.text,
    font: site.design.fonts.sans,
    fontHeading: site.design.fonts.serif || site.design.fonts.sans,
  };

  const page = site.pages[0];
  const sections: Section[] = (page?.cards || []).map((card) => ({
    id: card.id,
    type: card.kind,
    title: card.title,
    description: card.description,
    config: card.props,
    ...card.props,
  }));

  return {
    template,
    theme,
    sections,
    widgets: [],
  };
}

/**
 * Bi-directional adapter: Converts a legacy SiteLayout into a strict SiteDefinition
 */
export function layoutToSiteDefinition(layout: SiteLayout, title = 'Workspace Site'): SiteDefinition {
  const themeName: ThemeName = (layout.template === 'streetwear-dark' || layout.template === 'minimal-clean')
    ? layout.template
    : 'editorial-chalk';
  const design = DEFAULT_DESIGN_TOKENS[themeName];

  const cards: CardDefinition[] = (layout.sections || []).map((s, idx) => {
    const kind: CardKind = (CARD_KINDS.includes(s.type as CardKind) ? s.type : 'content') as CardKind;
    return {
      id: s.id || `card_${idx + 1}`,
      kind,
      version: 1,
      title: s.title,
      description: s.description,
      props: s.config || {},
    };
  });

  return {
    schema: '1.0.0',
    design,
    locale: 'en',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    pages: [
      {
        id: 'page-home',
        path: '/',
        title,
        cards,
      },
    ],
    journeys: [],
    variants: [],
    surfaces: [],
  };
}
