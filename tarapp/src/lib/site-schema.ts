export const CARD_KINDS = ['navigation', 'hero', 'content', 'collection', 'features', 'proof', 'faq', 'hours', 'contact', 'form', 'cta', 'footer'] as const;
export type CardKind = typeof CARD_KINDS[number];
export const THEME_NAMES = ['editorial-chalk', 'streetwear-dark', 'minimal-clean'] as const;
export type ThemeName = typeof THEME_NAMES[number];

export interface DesignTokens {
  theme: ThemeName;
  colors: { bg: string; text: string; accent: string; surface: string; border: string; muted: string };
  typography: { headingFont: string; bodyFont: string; baseFontSize: number; scale: number };
  rounded: { sm: number; md: number; lg: number; full: number };
  spacing: { unit: number; containerMax: number };
}
export interface CardAction { id: string; label: string; target: string; variant?: 'primary' | 'secondary' | 'outline'; payload?: Record<string, unknown> }
export interface CardBinding { slot: string; query: string; version: number; params?: Record<string, unknown>; access: 'public' | 'private'; freshness: number; empty?: Record<string, unknown> }
export interface CardDefinition { id: string; kind: CardKind; version: number; variant?: string; title?: string; props: Record<string, unknown>; bindings?: CardBinding[]; actions?: CardAction[] }
export interface PageDefinition { id: string; path: string; title: string; meta?: { description?: string; ogImage?: string; keywords?: string[] }; cards: CardDefinition[] }
export interface JourneyDefinition { id: string; title: string; target: string; version: number; input: Record<string, unknown>; outcome: string }
export interface VariantDefinition { id: string; when: Record<string, unknown>; priority: number; patch: Record<string, unknown> }
export interface SurfaceDefinition { id: string; catalog: string[]; scope: string; design?: Partial<DesignTokens>; budget?: number; fallback?: Record<string, unknown> }
export interface SitePolicy { publicOrdering?: boolean; publicEnquiry?: boolean; allowedCurrencies?: string[] }
export interface ReleaseFile { path: string; mime: string; bytes: number; hash: string; key: string }
export interface ReleaseManifest { id: string; siteId: string; version: number; generation: number; created: number; hash: string; files: ReleaseFile[] }
export interface SiteDefinition {
  schema: '1.0.0'; design: DesignTokens; locale: string; timezone: string; currency: string;
  pages: PageDefinition[]; journeys: JourneyDefinition[]; variants: VariantDefinition[]; surfaces: SurfaceDefinition[];
  policy: SitePolicy; currentRelease?: string | null; releases?: ReleaseManifest[];
}
export type SitePatchOperation =
  | { op: 'set_theme' | 'set_locale' | 'set_policy'; path?: string; value: unknown }
  | { op: 'add_card'; path?: string; value: CardDefinition }
  | { op: 'remove_card'; path?: string; value: string }
  | { op: 'update_card'; path?: string; value: Partial<CardDefinition> & { id: string } }
  | { op: 'update_page'; path?: string; value: Partial<PageDefinition> };

export const DEFAULT_DESIGN_TOKENS: Record<ThemeName, DesignTokens> = {
  'editorial-chalk': { theme: 'editorial-chalk', colors: { bg: '#edebe4', text: '#01273e', accent: '#000bfa', surface: '#f6f5f0', border: '#dcd9cf', muted: '#617282' }, typography: { headingFont: 'Georgia, serif', bodyFont: 'system-ui, sans-serif', baseFontSize: 16, scale: 1.25 }, rounded: { sm: 4, md: 8, lg: 16, full: 9999 }, spacing: { unit: 8, containerMax: 1140 } },
  'streetwear-dark': { theme: 'streetwear-dark', colors: { bg: '#111111', text: '#f8fafc', accent: '#5e6ad2', surface: '#1a1a1a', border: '#2a2a2a', muted: '#94a3b8' }, typography: { headingFont: 'Impact, sans-serif', bodyFont: 'system-ui, sans-serif', baseFontSize: 16, scale: 1.333 }, rounded: { sm: 2, md: 4, lg: 8, full: 9999 }, spacing: { unit: 8, containerMax: 1200 } },
  'minimal-clean': { theme: 'minimal-clean', colors: { bg: '#ffffff', text: '#18181b', accent: '#2563eb', surface: '#fafafa', border: '#e4e4e7', muted: '#71717a' }, typography: { headingFont: 'system-ui, sans-serif', bodyFont: 'system-ui, sans-serif', baseFontSize: 16, scale: 1.2 }, rounded: { sm: 6, md: 10, lg: 14, full: 9999 }, spacing: { unit: 8, containerMax: 1100 } },
};
