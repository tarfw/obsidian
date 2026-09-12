/**
 * TAR Site Bot Schema & Minimal Data Contract (parv2.md §5 & §6)
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

export const THEME_NAMES = [
  'editorial-chalk',
  'streetwear-dark',
  'minimal-clean',
] as const;

export type ThemeName = typeof THEME_NAMES[number];

export interface DesignTokens {
  theme: ThemeName;
  colors: {
    bg: string;
    text: string;
    accent: string;
    surface: string;
    border: string;
    muted: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    baseFontSize: number;
    scale: number;
  };
  rounded: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
  spacing: {
    unit: number;
    containerMax: number;
  };
}

export interface CardAction {
  readonly id: string;
  readonly label: string;
  readonly target: string; // Registered Gateway Action ID, e.g. 'order.place', 'record.create'
  readonly variant?: 'primary' | 'secondary' | 'outline';
  readonly payload?: Record<string, unknown>;
}

export interface CardBinding {
  readonly slot: string;
  readonly query: string;
  readonly version: number;
  readonly params?: Record<string, unknown>;
  readonly access: 'public' | 'private';
  readonly freshness: number; // TTL in seconds
  readonly empty?: Record<string, unknown>;
}

export interface CardDefinition {
  readonly id: string;
  readonly kind: CardKind;
  readonly version: number;
  readonly variant?: string;
  readonly title?: string;
  readonly props: Record<string, unknown>;
  readonly bindings?: CardBinding[];
  readonly actions?: CardAction[];
}

export interface PageMeta {
  readonly description?: string;
  readonly ogImage?: string;
  readonly keywords?: readonly string[];
}

export interface PageDefinition {
  readonly id: string;
  readonly path: string;
  readonly title: string;
  readonly meta?: PageMeta;
  readonly cards: CardDefinition[];
}

export interface JourneyDefinition {
  readonly id: string;
  readonly title: string;
  readonly target: string;
  readonly version: number;
  readonly input: Record<string, unknown>;
  readonly outcome: string;
}

export interface VariantDefinition {
  readonly id: string;
  readonly when: Record<string, unknown>;
  readonly priority: number;
  readonly patch: Record<string, unknown>;
}

export interface SurfaceDefinition {
  readonly id: string;
  readonly catalog: readonly string[];
  readonly scope: string;
  readonly design?: Partial<DesignTokens>;
  readonly budget?: number;
  readonly fallback?: Record<string, unknown>;
}

export interface SitePolicy {
  readonly publicOrdering?: boolean;
  readonly publicEnquiry?: boolean;
  readonly allowedCurrencies?: readonly string[];
}

export interface ReleaseFile {
  readonly path: string;
  readonly mime: string;
  readonly bytes: number;
  readonly hash: string;
}

export interface ReleaseManifest {
  readonly id: string;
  readonly siteId: string;
  readonly version: number;
  readonly generation: number;
  readonly created: number;
  readonly html: string;
  readonly css: string;
  readonly hash: string;
  readonly files: ReleaseFile[];
}

export interface SiteDefinition {
  readonly schema: '1.0.0';
  readonly design: DesignTokens;
  readonly locale: string;
  readonly timezone: string;
  readonly currency: string;
  readonly pages: PageDefinition[];
  readonly journeys: JourneyDefinition[];
  readonly variants: VariantDefinition[];
  readonly surfaces: SurfaceDefinition[];
  readonly policy: SitePolicy;
  readonly currentRelease?: string | null;
  readonly releases?: ReleaseManifest[];
}

export interface SitePatchOperation {
  readonly op: 'set_theme' | 'set_locale' | 'add_card' | 'update_card' | 'remove_card' | 'update_page' | 'set_policy';
  readonly path?: string;
  readonly value: unknown;
}

export const DEFAULT_DESIGN_TOKENS: Record<ThemeName, DesignTokens> = {
  'editorial-chalk': {
    theme: 'editorial-chalk',
    colors: {
      bg: '#edebe4',
      text: '#01273e',
      accent: '#000bfa',
      surface: '#f6f5f0',
      border: '#dcd9cf',
      muted: '#617282',
    },
    typography: {
      headingFont: 'Georgia, serif',
      bodyFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      baseFontSize: 16,
      scale: 1.25,
    },
    rounded: { sm: 4, md: 8, lg: 16, full: 9999 },
    spacing: { unit: 8, containerMax: 1140 },
  },
  'streetwear-dark': {
    theme: 'streetwear-dark',
    colors: {
      bg: '#111111',
      text: '#f8fafc',
      accent: '#5e6ad2',
      surface: '#1a1a1a',
      border: '#2a2a2a',
      muted: '#94a3b8',
    },
    typography: {
      headingFont: 'Impact, "Arial Black", sans-serif',
      bodyFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      baseFontSize: 16,
      scale: 1.333,
    },
    rounded: { sm: 2, md: 4, lg: 8, full: 9999 },
    spacing: { unit: 8, containerMax: 1200 },
  },
  'minimal-clean': {
    theme: 'minimal-clean',
    colors: {
      bg: '#ffffff',
      text: '#18181b',
      accent: '#2563eb',
      surface: '#fafafa',
      border: '#e4e4e7',
      muted: '#71717a',
    },
    typography: {
      headingFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      bodyFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      baseFontSize: 16,
      scale: 1.2,
    },
    rounded: { sm: 6, md: 10, lg: 14, full: 9999 },
    spacing: { unit: 8, containerMax: 1100 },
  },
};
