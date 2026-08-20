import { z } from 'zod';

// ==========================================
// 1. Core Design Token Schemas
// ==========================================

export const ColorTokenSchema = z.object({
  name: z.string(),
  value: z.string(),
  token: z.string(),
  role: z.string().optional()
});
export type ColorToken = z.infer<typeof ColorTokenSchema>;

export const TypographyScaleItemSchema = z.object({
  role: z.string(),
  size: z.string(),
  lineHeight: z.string().or(z.number()),
  letterSpacing: z.string().optional(),
  token: z.string()
});
export type TypographyScaleItem = z.infer<typeof TypographyScaleItemSchema>;

export const FontDefinitionSchema = z.object({
  name: z.string(),
  substitute: z.string().optional(),
  weights: z.array(z.number()).default([400, 500, 600, 700]),
  token: z.string().default('--font-body')
});
export type FontDefinition = z.infer<typeof FontDefinitionSchema>;

export const DesignTokensSchema = z.object({
  name: z.string(),
  lead: z.string().default(''),
  theme: z.enum(['light', 'dark', 'mixed']).default('light'),
  colors: z.record(z.string(), z.string()), // token -> hex/rgba
  rawColorTokens: z.array(ColorTokenSchema).default([]),
  fonts: z.record(z.string(), z.string()), // role -> font family
  fontDefinitions: z.array(FontDefinitionSchema).default([]),
  typeScale: z.array(TypographyScaleItemSchema).default([]),
  radii: z.object({
    cards: z.string().default('12px'),
    buttons: z.string().default('9999px'),
    badges: z.string().default('9999px'),
    inputs: z.string().default('9999px')
  }).default({}),
  spacing: z.object({
    pageMaxWidth: z.string().default('1280px'),
    sectionGap: z.string().default('80px'),
    cardPadding: z.string().default('20px')
  }).default({}),
  rawCssRoot: z.string().default(''),
  rawThemeBlock: z.string().default('')
});
export type DesignTokens = z.infer<typeof DesignTokensSchema>;

// ==========================================
// 2. Navigation & Header
// ==========================================

export const NavItemSchema = z.object({
  label: z.string(),
  link: z.string()
});
export type NavItem = z.infer<typeof NavItemSchema>;

export const HeaderCtaSchema = z.object({
  label: z.string(),
  link: z.string(),
  type: z.enum(['pill', 'outline', 'ghost', 'solid']).default('pill')
});
export type HeaderCta = z.infer<typeof HeaderCtaSchema>;

// ==========================================
// 3. Site Config & Frontmatter
// ==========================================

export const SiteConfigSchema = z.object({
  brand: z.string(),
  tagline: z.string().optional(),
  logo: z.string().optional(),
  style: z.string().default('eathungrytiger.md'),
  subdomain: z.string(),
  currency: z.string().default('USD'),
  cart_mode: z.enum(['drawer', 'whatsapp', 'stripe', 'inquiry']).default('drawer'),
  nav: z.array(NavItemSchema).default([]),
  header_cta: HeaderCtaSchema.optional(),
  socials: z.record(z.string(), z.string()).optional(),
  footer_text: z.string().optional()
});
export type SiteConfig = z.infer<typeof SiteConfigSchema>;

// ==========================================
// 4. Section Blocks & 14 Visual Archetypes
// ==========================================

export type ArchetypeType =
  | 'nav-header'
  | 'marquee'
  | 'hero-poster'
  | 'hero-split'
  | 'product-grid'
  | 'variant-matrix'
  | 'quick-buy-bar'
  | 'bento'
  | 'food-menu'
  | 'story-banner'
  | 'trust-bar'
  | 'testimonials'
  | 'faq'
  | 'location-card'
  | 'footer-sitemap'
  | 'custom';

export interface SectionBlock {
  index: number;
  type: ArchetypeType;
  variant?: string;
  title?: string;
  rawYaml: string;
  data: Record<string, any>;
}

export interface PageDocument {
  route: string; // e.g. '/', '/menu', '/catalog', '/story', '/contact'
  config: SiteConfig;
  sections: SectionBlock[];
}

// ==========================================
// 5. Cloudflare Worker Environment Bindings
// ==========================================

export interface Env {
  STOREFRONT_CACHE: KVNamespace;
  SITES_BUCKET: R2Bucket;
  ENVIRONMENT?: string;
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
  GROQ_API_KEY?: string;
}
