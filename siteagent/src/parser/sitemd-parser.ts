/**
 * sitemd-parser.ts
 * Invariant: Strict YAML parsing for frontmatter and section bodies using the `yaml` engine.
 */

import { parse as parseYaml } from 'yaml';
import { SiteConfig, SiteConfigSchema, SectionBlock, PageDocument, ArchetypeType } from '../types';

export function parseSiteMarkdown(markdown: string, route = '/'): PageDocument {
  // 1. Separate YAML Frontmatter and Body
  let rawFrontmatter = '';
  let bodyMarkdown = markdown;

  if (markdown.startsWith('---')) {
    const endFm = markdown.indexOf('---', 3);
    if (endFm !== -1) {
      rawFrontmatter = markdown.substring(3, endFm).trim();
      bodyMarkdown = markdown.substring(endFm + 3).trim();
    }
  }

  // 2. Parse Frontmatter with strict YAML parser
  let rawConfig: any = {};
  if (rawFrontmatter) {
    try {
      rawConfig = parseYaml(rawFrontmatter) || {};
    } catch (err) {
      console.warn('[sitemd-parser] Frontmatter YAML parse warning:', err);
    }
  }

  const config: SiteConfig = SiteConfigSchema.parse({
    brand: rawConfig.brand || 'Storefront',
    tagline: rawConfig.tagline,
    logo: rawConfig.logo,
    style: rawConfig.style || 'eathungrytiger.md',
    subdomain: rawConfig.subdomain || 'store',
    currency: rawConfig.currency || 'USD',
    cart_mode: rawConfig.cart_mode || 'drawer',
    nav: rawConfig.nav || [],
    header_cta: rawConfig.header_cta,
    socials: rawConfig.socials,
    footer_text: rawConfig.footer_text
  });

  // 3. Parse Sections by `# ` header blocks
  const sections: SectionBlock[] = [];
  const sectionChunks = bodyMarkdown.split(/\n(?=#\s+)/);

  let sectionIndex = 0;
  for (const chunk of sectionChunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    // First line is `# [Index.] [Name] [(variant)]`
    const lines = trimmed.split('\n');
    const headerLine = lines[0].replace(/^#\s+/, '').trim();
    const rawYaml = lines.slice(1).join('\n').trim();

    // Parse header archetype & variant
    // e.g. "1. Hero (poster)", "Products (grid)", "Bento (asymmetric-3col)"
    const typeMatch = headerLine.match(/(?:[0-9]+\.\s*)?([a-zA-Z0-9\-_]+)(?:\s*\(([^)]+)\))?/);
    const rawTypeName = (typeMatch ? typeMatch[1] : 'custom').toLowerCase();
    const variant = typeMatch && typeMatch[2] ? typeMatch[2].toLowerCase() : undefined;

    const archetype = normalizeArchetypeType(rawTypeName);

    // Parse section body as strict YAML
    let data: Record<string, any> = {};
    if (rawYaml) {
      try {
        data = parseYaml(rawYaml) || {};
      } catch (err) {
        console.warn(`[sitemd-parser] Section "${headerLine}" YAML parse warning:`, err);
        data = { rawText: rawYaml };
      }
    }

    sections.push({
      index: sectionIndex++,
      type: archetype,
      variant,
      title: headerLine,
      rawYaml,
      data
    });
  }

  return {
    route,
    config,
    sections
  };
}

function normalizeArchetypeType(name: string): ArchetypeType {
  const map: Record<string, ArchetypeType> = {
    nav: 'nav-header',
    header: 'nav-header',
    'nav-header': 'nav-header',
    marquee: 'marquee',
    ticker: 'marquee',
    announcement: 'marquee',
    hero: 'hero-poster',
    'hero-poster': 'hero-poster',
    'hero-split': 'hero-split',
    product: 'product-grid',
    products: 'product-grid',
    'product-grid': 'product-grid',
    catalog: 'product-grid',
    variant: 'variant-matrix',
    'variant-matrix': 'variant-matrix',
    'quick-buy': 'quick-buy-bar',
    'quick-buy-bar': 'quick-buy-bar',
    bento: 'bento',
    'bento-grid': 'bento',
    menu: 'food-menu',
    'food-menu': 'food-menu',
    story: 'story-banner',
    'story-banner': 'story-banner',
    heritage: 'story-banner',
    trust: 'trust-bar',
    'trust-bar': 'trust-bar',
    reviews: 'testimonials',
    testimonials: 'testimonials',
    faq: 'faq',
    faqs: 'faq',
    location: 'location-card',
    'location-card': 'location-card',
    footer: 'footer-sitemap',
    'footer-sitemap': 'footer-sitemap',
    custom: 'custom'
  };

  return map[name] || 'custom';
}
