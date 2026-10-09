/**
 * Site v2 compiler: one deterministic compiler for pages, sections, nodes and
 * components.
 *
 * Owns semantic HTML, escaped content, validated styles, safe URLs, canonical
 * metadata, sitemap, robots and the tiny progressive interaction runtime.
 * Emits no arbitrary JavaScript; interaction behaviour is a fixed tested file.
 */

import { EASING_CSS, type SectionLayoutSpec } from './document.ts';
import type { Asset, Binding, Node, Page, Persona, Section, SiteDocument, Style, StyleSet } from './document.ts';
import { escapeAttribute, escapeHtml, formatMoney, isSafeHref, safeHref, slugify } from './html.ts';
import { resolveToken, TONE_STYLE, type Design } from './design.ts';

export interface CompiledFile {
  path: string;
  mime: string;
  body: string | Uint8Array;
  hash: string;
}

export interface ResolvedItem {
  id?: string;
  slug?: string;
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  image?: string;
  image2?: string;
  badge?: string;
  colours?: number;
  swatches?: string[];
}

export interface CompileOptions {
  origin?: string;
  release?: string;
  media?: (asset: Asset) => Promise<Uint8Array | null>;
}

export interface CompileResult {
  files: CompiledFile[];
  hash: string;
  itemCount: number;
  redirects: { from: string; to: string; status: 308 }[];
  /** Match rules for the variants this release compiled, in the order the edge tests them. */
  personas: { id: string; when: Persona['when']; priority: number }[];
}

const sha = async (value: string): Promise<string> => {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const short = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
};

const EXT: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/avif': 'avif',
  'image/gif': 'gif', 'image/svg+xml': 'svg', 'video/mp4': 'mp4', 'video/webm': 'webm', 'font/woff2': 'woff2',
};

const ICONS: Record<string, string> = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  check: 'M4 12l5 5L20 6',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  phone: 'M6 3h4l2 5-3 2a12 12 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 014 5a2 2 0 012-2z',
  pin: 'M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11zM12 10a2 2 0 100-4 2 2 0 000 4z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  bag: 'M6 7h12l1 13H5zM9 7a3 3 0 016 0',
  heart: 'M12 20s-7-4.5-7-9.5A3.5 3.5 0 0112 8a3.5 3.5 0 017 2.5c0 5-7 9.5-7 9.5z',
  search: 'M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z',
  user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  person: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
};

function padUnit(design: Design, value: string | undefined): string | null {
  if (!value) return null;
  if (value === 'token:space.unit') return 'var(--space-unit)';
  if (value === 'token:space.section') return 'var(--space-section)';
  const steps: Record<string, number> = { none: 0, sm: 2, md: 4, lg: 8, xl: 12 };
  return steps[value] === undefined ? null : `calc(var(--space-unit) * ${steps[value]})`;
}

function colorValue(design: Design, value: string): string {
  const token = resolveToken(design, value);
  if (typeof token === 'string') return token;
  return value;
}

function styleDeclarations(design: Design, style: Style | undefined): string[] {
  if (!style) return [];
  const out: string[] = [];
  if (style.background) out.push(`background:${colorValue(design, style.background)}`);
  if (style.gradient) out.push(`background-image:linear-gradient(${style.gradient.angle}deg, ${colorValue(design, style.gradient.from)}, ${colorValue(design, style.gradient.to)})`);
  if (style.color) out.push(`color:${colorValue(design, style.color)}`);
  if (style.pad) { const pad = padUnit(design, style.pad); if (pad) out.push(`padding:${pad}`); }
  if (style.gap) { const gap = padUnit(design, style.gap); if (gap) out.push(`gap:${gap}`); }
  if (style.radius !== undefined) {
    const resolved = typeof style.radius === 'number' ? style.radius : resolveToken(design, style.radius) ?? 0;
    out.push(`border-radius:${typeof resolved === 'number' ? `${resolved}px` : resolved}`);
  }
  if (style.border === 'hairline') out.push('border:1px solid var(--color-border)');
  else if (style.border && style.border !== 'none') out.push(`border:1px solid ${colorValue(design, style.border)}`);
  if (style.shadow && style.shadow !== 'none') out.push(`box-shadow:var(--elevation-${style.shadow})`);
  if (style.align) out.push(`justify-content:${({ start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between' } as Record<string, string>)[style.align] || 'flex-start'}`);
  if (style.width === 'content') out.push('max-width:var(--layout-content)');
  else if (style.width === 'wide') out.push('max-width:var(--layout-wide)');
  if (style.aspect) out.push(`aspect-ratio:${({ square: '1 / 1', portrait: '3 / 4', landscape: '4 / 3', wide: '16 / 9' } as Record<string, string>)[style.aspect] || 'auto'}`);
  if (style.mask === 'soft') out.push('mask-image:linear-gradient(to bottom, #000 72%, transparent)');
  if (style.size) out.push(`font-size:var(--type-${style.size})`);
  if (style.weight) out.push(`font-weight:${style.weight}`);
  if (style.columns) out.push(`grid-template-columns:repeat(${style.columns}, minmax(0, 1fr))`);
  return out;
}

interface CssCollector {
  classes: Map<string, StyleSet>;
  runtime: Set<string>;
}

function styleClass(collector: CssCollector, style: StyleSet | undefined): string {
  if (!style || !Object.keys(style).length) return '';
  const key = JSON.stringify(style);
  const name = `s-${short(key)}`;
  collector.classes.set(name, style);
  return ` ${name}`;
}

function compileCss(design: Design, collector: CssCollector): string {
  const space = (steps: number) => `calc(var(--space-unit) * ${steps})`;
  const blocks: string[] = [];
  collector.classes.forEach((style, name) => {
    for (const level of ['base', 'small', 'medium', 'large'] as const) {
      const declarations = styleDeclarations(design, style[level]);
      if (!declarations.length) continue;
      const rule = `.${name}{${declarations.join(';')}}`;
      if (level === 'base') blocks.push(rule);
      else if (level === 'small') blocks.push(`@media (max-width: 640px){${rule}}`);
      else if (level === 'medium') blocks.push(`@media (min-width: 641px) and (max-width: 1024px){${rule}}`);
      else blocks.push(`@media (min-width: 1025px){${rule}}`);
    }
  });
  return `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,600;1,400&family=Mukta+Malar:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap');

:root {
  --color-canvas: ${design.color.canvas};
  --color-ink: ${design.color.ink};
  --color-accent: ${design.color.accent};
  --color-accentink: ${design.color.accentink};
  --color-surface: ${design.color.surface};
  --color-border: ${design.color.border};
  --color-muted: ${design.color.muted};
  --color-success: ${design.color.success};
  --color-danger: ${design.color.danger};
  --font-display: ${design.type.display};
  --font-heading: ${design.type.heading};
  --font-body: ${design.type.body};
  --type-base: ${design.type.base}px;
  --type-display: clamp(2rem, 5vw, ${(design.type.base * design.type.scale ** 3).toFixed(0)}px);
  --type-heading: clamp(1.5rem, 3vw, ${(design.type.base * design.type.scale ** 2).toFixed(0)}px);
  --type-body: ${design.type.base}px;
  --type-label: ${Math.max(12, Math.round(design.type.base * 0.875))}px;
  --type-tracking: ${design.type.tracking || 0}em;
  --leading: ${design.type.leading};
  --space-unit: ${design.space.unit}px;
  --space-section: ${design.space.section}px;
  --layout-content: ${design.space.container}px;
  --layout-wide: ${(design.space.container + 240).toFixed(0)}px;
  --radius-sm: ${design.shape.sm}px;
  --radius-md: ${design.shape.md}px;
  --radius-lg: ${design.shape.lg}px;
  --radius-pill: ${design.shape.pill}px;
  --elevation-low: 0 1px ${design.elevation.low}px rgba(15, 15, 20, 0.08);
  --elevation-high: 0 12px ${design.elevation.high}px rgba(15, 15, 20, 0.16);
  --motion: ${design.motion.duration}ms;
  --ease: ${EASING_CSS[design.motion.easing] || 'ease'};
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: var(--type-base); -webkit-text-size-adjust: 100%; }
body { background: var(--color-canvas); color: var(--color-ink); font-family: var(--font-body); line-height: var(--leading); letter-spacing: var(--type-tracking); min-height: 100vh; display: flex; flex-direction: column; }
main { flex: 1; }
img, video { max-width: 100%; height: auto; display: block; }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
.tar-skip { position: absolute; top: -9999px; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
.tar-skip:focus { position: static; display: inline-block; padding: ${space(2)} ${space(4)}; background: var(--color-accent); color: var(--color-accentink); width: auto; height: auto; }
.tar-wrap { width: 100%; max-width: var(--layout-content); margin: 0 auto; padding: 0 clamp(16px, 4vw, 48px); }
.tar-section { padding: var(--space-section) 0; }
.tar-section[data-purpose="chrome"], .tar-chrome { padding: 0 !important; margin: 0; width: 100%; }
.tar-flex { display: flex; flex-direction: row; gap: ${space(4)}; align-items: flex-start; flex-wrap: wrap; }
.tar-stack { display: flex; flex-direction: column; gap: ${space(4)}; }
.tar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr)); gap: ${space(4)}; }
.tar-grid > .tar-title { grid-column: 1 / -1; width: 100%; }
.tar-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: ${space(4)}; display: flex; flex-direction: column; gap: ${space(2)}; }
.tar-prose { max-width: 72ch; }
.tar-title { font-family: var(--font-display); font-weight: ${design.type.weight}; line-height: 1.15; }
h1.tar-title { font-size: var(--type-display); }
h2.tar-title { font-size: var(--type-heading); }
h3.tar-title { font-size: var(--type-body); font-weight: ${Math.min(900, design.type.weight + 100)}; }
.tar-muted { color: var(--color-muted); }
.tar-label { font-size: var(--type-label); font-weight: 600; }
.tar-btn { display: inline-flex; align-items: center; justify-content: center; gap: ${space(2)}; padding: ${space(3)} ${space(6)}; border-radius: var(--radius-pill); font-weight: 600; font-size: var(--type-body); text-decoration: none; cursor: pointer; border: 1px solid transparent; transition: opacity var(--motion) var(--ease), transform var(--motion) var(--ease); }
.tar-btn:hover { opacity: 0.88; }
.tar-btn:active { transform: scale(0.985); }
.tar-btn-primary { background: var(--color-accent); color: var(--color-accentink); }
.tar-btn-secondary { background: transparent; color: var(--color-ink); border-color: var(--color-border); }
.tar-btn-outline { background: transparent; color: var(--color-ink); border: 1px solid var(--color-ink); font-size: 13px; font-weight: 600; padding: 8px 20px; border-radius: var(--radius-pill); }
.tar-btn-outline:hover { background: var(--color-ink); color: var(--color-canvas); }
.tar-btn-whatsapp, .tar-btn.tar-btn-whatsapp { background: #25D366; color: #ffffff; font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: var(--radius-pill); text-decoration: none; border: none; display: inline-flex; align-items: center; gap: 6px; }
.tar-btn-whatsapp:hover, .tar-btn.tar-btn-whatsapp:hover { opacity: 0.9; }
.tar-link { text-decoration: underline; text-underline-offset: 3px; }
.tar-divider { border: 0; border-top: 1px solid var(--color-border); }
.tar-spacer { height: var(--space-section); }
.tar-icon { width: 1.5em; height: 1.5em; stroke: currentColor; fill: none; stroke-width: 1.6; }
.tar-price { font-weight: 700; color: var(--color-accent); }
.tar-item img { width: 100%; border-radius: var(--radius-sm); }
.tar-cardlink { text-decoration: none; display: block; }
.tar-item[hidden] { display: none; }
.tar-empty { color: var(--color-muted); font-style: italic; }

/* Notice Banner */
.tar-notice {
  background: var(--color-surface);
  color: var(--color-ink);
  border-bottom: 1px solid var(--color-border);
  padding: 10px 16px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  width: 100%;
  position: sticky;
  top: 0;
  z-index: 45;
}

/* Header & Navigation */
.tar-nav { position: sticky; top: 0; z-index: 50; background: var(--color-canvas); border-bottom: 1px solid var(--color-border); width: 100%; }
.tar-nav-inner { display: flex; align-items: center; justify-content: space-between; gap: ${space(4)}; min-height: 56px; padding: 0 clamp(16px, 4vw, 48px); max-width: var(--layout-content); margin: 0 auto; }
.tar-brand { font-family: var(--font-display); font-size: 22px; font-weight: 800; letter-spacing: 0.02em; text-decoration: none; color: var(--color-ink); }
.tar-navlinks { display: flex; gap: 20px; list-style: none; flex-wrap: wrap; font-size: 13px; font-weight: 600; margin: 0; padding: 0; align-items: center; }
.tar-navlinks a { text-decoration: none; color: var(--color-ink); transition: opacity 0.15s ease; }
.tar-navlinks a:hover { opacity: 0.7; }
.tar-menu-btn { display: none; background: none; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: ${space(1)} ${space(2)}; font-size: 1.1rem; cursor: pointer; color: var(--color-ink); }

/* ========================================================
   HIGH-CRAFT HERO PATTERNS (METHOD 2)
   ======================================================== */
.tar-hero { position: relative; width: 100%; min-height: 75vh; display: flex; align-items: center; padding: clamp(40px, 6vw, 76px) 0; overflow: hidden; }
.tar-hero-inner { width: 100%; max-width: var(--layout-content); margin: 0 auto; padding: 0 clamp(16px, 4vw, 48px); }
.tar-hero-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-accent); margin-bottom: 6px; }
.tar-hero-title { font-family: var(--font-display); font-size: clamp(2.2rem, 4.2vw, 3.8rem); font-weight: 700; line-height: 1.12; letter-spacing: -0.02em; color: var(--color-ink); margin: 0 0 12px 0; }
.tar-hero-desc { font-size: clamp(1rem, 1.25vw, 1.15rem); line-height: 1.6; color: var(--color-muted); max-width: 52ch; margin: 0 0 20px 0; }
.tar-hero-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 4px; }
.tar-hero-actions .tar-btn { font-size: 14px; padding: 10px 22px; }

/* 1. Split Hero 50/50 (#4) */
.tar-hero-split .tar-hero-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; align-items: center; gap: clamp(32px, 5vw, 64px); }
.tar-hero-split .tar-hero-text { display: flex; flex-direction: column; }
.tar-hero-split .tar-hero-media { position: relative; width: 100%; border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--elevation-high); aspect-ratio: 4 / 3; background: var(--color-surface); }
.tar-hero-split .tar-hero-media img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: var(--radius-lg); }
.tar-hero-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-border) 100%); }
.tar-brand-mark { font-family: var(--font-display); font-size: 48px; font-weight: 800; color: var(--color-muted); letter-spacing: 0.05em; }

/* 2. Commerce Hero (#16) */
.tar-hero-commerce .tar-hero-grid { display: grid; grid-template-columns: 1.15fr 0.85fr; align-items: center; gap: clamp(32px, 5vw, 64px); }
.tar-hero-spotlight-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px; box-shadow: var(--elevation-high); display: flex; flex-direction: column; gap: 12px; position: relative; }
.tar-hero-spotlight-img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: var(--radius-md); background: #f1f5f9; display: block; }
.tar-hero-spotlight-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.tar-hero-spotlight-title { font-size: 16px; font-weight: 700; color: var(--color-ink); }
.tar-hero-spotlight-price { font-size: 18px; font-weight: 800; color: var(--color-accent); }

/* 3. Typography Hero (#24) */
.tar-hero-typography { text-align: center; padding: clamp(48px, 8vw, 96px) 0; }
.tar-hero-typography .tar-hero-text { max-width: 820px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; }
.tar-hero-typography .tar-hero-title { font-family: var(--font-display); font-size: clamp(2.6rem, 5.5vw, 4.6rem); font-weight: 700; line-height: 1.08; letter-spacing: -0.025em; color: var(--color-ink); }
.tar-hero-typography .tar-hero-desc { font-size: clamp(1.05rem, 1.4vw, 1.25rem); line-height: 1.65; color: var(--color-muted); max-width: 58ch; }
.tar-hero-typography .tar-hero-actions { justify-content: center; }

/* 4. Background Image Hero (#7) */
.tar-hero-bgimage { min-height: 75vh; display: flex; align-items: center; background-size: cover; background-position: center; position: relative; color: #ffffff; }
.tar-hero-scrim { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.85) 100%); z-index: 1; }
.tar-hero-bgimage .tar-hero-inner { position: relative; z-index: 2; }
.tar-hero-bgimage .tar-hero-title { color: #ffffff !important; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
.tar-hero-bgimage .tar-hero-desc { color: rgba(255, 255, 255, 0.9) !important; text-shadow: 0 1px 4px rgba(0,0,0,0.4); }
.tar-hero-bgimage .tar-btn-outline { border-color: rgba(255,255,255,0.7); color: #ffffff; }
.tar-hero-bgimage .tar-btn-outline:hover { background: #ffffff; color: #0f172a; }

/* 5. Minimal Hero (#23) */
.tar-hero-minimal { min-height: 75vh; display: flex; align-items: center; padding: clamp(40px, 6vw, 64px) 0; border-bottom: 1px solid var(--color-border); }
.tar-hero-minimal .tar-hero-grid { display: flex; justify-content: space-between; align-items: center; gap: 32px; flex-wrap: wrap; width: 100%; }
.tar-hero-minimal .tar-hero-title { font-family: var(--font-display); font-size: clamp(2rem, 3.8vw, 3.2rem); font-weight: 600; line-height: 1.2; margin-bottom: 8px; }

/* Collection Grid and Cards */
.tar-collection-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; width: 100%; }
.tar-collection-title { font-size: 22px; font-weight: 700; margin: 0; color: var(--color-ink); }
.tar-product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr)); gap: 20px; width: 100%; }
.tar-collection-card { width: 100%; display: block; }
.tar-product-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 12px; gap: 12px; position: relative; display: flex; flex-direction: column; width: 100%; }
.tar-card-media { position: relative; overflow: hidden; width: 100%; aspect-ratio: 4 / 3; background: #f1f5f9; border-radius: var(--radius-sm); }
.tar-card-media img, .tar-card-media .tar-card-img { width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius-sm); display: block; }
.tar-card-media-placeholder { background: #f1f5f9; display: flex; align-items: center; justify-content: center; width: 100%; aspect-ratio: 4 / 3; border-radius: var(--radius-sm); }
.tar-card-placeholder-box { font-family: var(--font-display); font-size: 26px; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em; }
.tar-card-badge { position: absolute; top: 8px; left: 8px; background: var(--color-accent); color: var(--color-accentink); font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: var(--radius-sm); z-index: 2; line-height: 1.2; }
.tar-card-badge-wrap { margin-bottom: 4px; }
.tar-card-meta { display: flex; flex-direction: column; gap: 6px; width: 100%; flex: 1; }
.tar-product-title { font-size: 15px; font-weight: 600; color: var(--color-ink); line-height: 1.35; font-family: var(--font-body); }
.tar-card-desc { font-size: 13px; color: var(--color-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tar-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; padding-top: 8px; width: 100%; }
.tar-card-footer .tar-price { font-size: 15px; font-weight: 700; color: var(--color-accent); white-space: nowrap; }

/* Semantic Footer (Shopify-Inspired) */
.tar-footer { border-top: 1px solid var(--color-border); background: var(--color-surface); margin-top: auto; width: 100%; color: var(--color-ink); }
.tar-footer-wrap { width: 100%; max-width: var(--layout-content); margin: 0 auto; padding: clamp(40px, 5vw, 64px) clamp(16px, 4vw, 48px) clamp(24px, 3vw, 36px); }
.tar-footer-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1.2fr; gap: clamp(24px, 4vw, 48px); margin-bottom: clamp(32px, 4vw, 48px); }
.tar-footer-col { display: flex; flex-direction: column; gap: 12px; }
.tar-footer-brand { font-family: var(--font-display); font-size: 20px; font-weight: 800; letter-spacing: 0.02em; color: var(--color-ink); text-decoration: none; }
.tar-footer-bio { font-size: 13px; line-height: 1.6; color: var(--color-muted); max-width: 32ch; }
.tar-footer-badge-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #16a34a; background: rgba(22, 163, 74, 0.1); padding: 4px 10px; border-radius: var(--radius-pill); width: fit-content; }
.tar-footer-col-title { font-family: var(--font-heading); font-size: 14px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-ink); margin-bottom: 2px; }
.tar-footer-list { list-style: none; display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 0; }
.tar-footer-list a { font-size: 13px; color: var(--color-muted); text-decoration: none; transition: color 0.15s ease; }
.tar-footer-list a:hover { color: var(--color-ink); text-decoration: underline; }
.tar-footer-contact-item { font-size: 13px; color: var(--color-muted); line-height: 1.5; }
.tar-footer-contact-item strong { color: var(--color-ink); }
.tar-footer-bottom { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; padding-top: 24px; border-top: 1px solid var(--color-border); font-size: 12px; color: var(--color-muted); }
.tar-footer-payments { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tar-pay-pill { font-size: 11px; font-weight: 600; background: var(--color-canvas); border: 1px solid var(--color-border); padding: 3px 8px; border-radius: 4px; color: var(--color-ink); }

.tar-tabs [role="tablist"] { display: flex; gap: ${space(2)}; border-bottom: 1px solid var(--color-border); flex-wrap: wrap; }
.tar-tabs [role="tab"] { background: none; border: 0; padding: ${space(2)} ${space(3)}; font: inherit; cursor: pointer; border-bottom: 2px solid transparent; }
.tar-tabs [role="tab"][aria-selected="true"] { border-color: var(--color-accent); color: var(--color-accent); font-weight: 600; }
.tar-tabs [role="tabpanel"] { padding-top: ${space(4)}; }
.tar-tabs[data-ready] [role="tabpanel"][hidden] { display: none; }
.tar-acc { border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); margin-bottom: ${space(2)}; }
.tar-acc summary { padding: ${space(3)} ${space(4)}; font-weight: 600; cursor: pointer; }
.tar-acc > div { padding: 0 ${space(4)} ${space(4)}; color: var(--color-muted); }
.tar-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr)); gap: ${space(2)}; }
.tar-gallery img { border-radius: var(--radius-sm); cursor: zoom-in; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
.tar-lightbox { position: fixed; inset: 0; background: rgba(10, 10, 14, 0.86); display: none; align-items: center; justify-content: center; padding: ${space(6)}; z-index: 60; }
.tar-lightbox[data-open] { display: flex; }
.tar-lightbox img { max-width: 92vw; max-height: 88vh; border-radius: var(--radius-md); }
.tar-search { display: flex; gap: ${space(2)}; margin-bottom: ${space(4)}; }
.tar-search input { flex: 1; padding: ${space(2)} ${space(3)}; border: 1px solid var(--color-border); border-radius: var(--radius-md); font: inherit; background: var(--color-canvas); color: inherit; }
.tar-visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.tar-form { display: flex; flex-direction: column; gap: ${space(3)}; max-width: 560px; }
.tar-field { display: flex; flex-direction: column; gap: ${space(1)}; }
.tar-field label { font-size: var(--type-label); font-weight: 600; }
.tar-field input, .tar-field textarea, .tar-field select { padding: ${space(2)} ${space(3)}; border: 1px solid var(--color-border); border-radius: var(--radius-md); font: inherit; background: var(--color-canvas); color: inherit; }
.tar-field textarea { min-height: 130px; resize: vertical; }
.tar-honeypot { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
.tar-cta { background: var(--color-surface); border-radius: var(--radius-lg); padding: ${space(10)}; text-align: center; }
${blocks.join('\n')}
@media (max-width: 768px) {
  .tar-nav-inner { position: relative; }
  .tar-hero { min-height: 75vh; padding: 36px 0; }
  .tar-hero-split .tar-hero-grid,
  .tar-hero-commerce .tar-hero-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
  .tar-hero-split .tar-hero-media { aspect-ratio: 16 / 10 !important; }
  .tar-hero-actions { flex-direction: column; align-items: stretch; width: 100%; }
  .tar-hero-actions .tar-btn { width: 100%; justify-content: center; }
  .tar-flex { flex-direction: column; }
  .tar-menu[data-ready] .tar-navlinks { display: none; }
  .tar-menu[data-ready][data-open] .tar-navlinks {
    display: flex;
    flex-direction: column;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    box-shadow: var(--elevation-high);
    padding: 16px 24px;
    gap: 14px;
    z-index: 60;
  }
  .tar-menu-btn { display: inline-flex; align-items: center; justify-content: center; }
  .tar-section { padding: 36px 0; }
  .tar-grid, .tar-product-grid { grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr)) !important; gap: 12px !important; }
  .tar-footer-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
  .tar-footer-bottom { flex-direction: column; align-items: flex-start; gap: 14px; }
}
@media (min-width: 769px) and (max-width: 1024px) {
  .tar-grid, .tar-product-grid { grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr)) !important; gap: 16px !important; }
  .tar-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; animation: none !important; scroll-behavior: auto !important; }
}
`.trim();
}

const RUNTIME = `
(function () {
  var menus = document.querySelectorAll('[data-menu]');
  for (var index = 0; index < menus.length; index += 1) {
    (function (menu) {
      var button = menu.querySelector('.tar-menu-btn');
      var id = menu.getAttribute('data-menu');
      var list = document.getElementById(id);
      if (!button || !list) return;
      menu.setAttribute('data-ready', '');
      button.setAttribute('aria-controls', id);
      button.addEventListener('click', function () {
        var open = menu.hasAttribute('data-open');
        if (open) menu.removeAttribute('data-open'); else menu.setAttribute('data-open', '');
        button.setAttribute('aria-expanded', String(!open));
      });
      var links = list.querySelectorAll('a');
      for (var k = 0; k < links.length; k += 1) {
        links[k].addEventListener('click', function () {
          menu.removeAttribute('data-open');
          button.setAttribute('aria-expanded', 'false');
        });
      }
    })(menus[index]);
  }
  var tabs = document.querySelectorAll('[data-tabs]');
  for (var t = 0; t < tabs.length; t += 1) {
    (function (group) {
      var buttons = group.querySelectorAll('[role="tab"]');
      var panels = group.querySelectorAll('[role="tabpanel"]');
      if (!buttons.length) return;
      group.setAttribute('data-ready', '');
      var activate = function (active) {
        for (var i = 0; i < buttons.length; i += 1) {
          var selected = buttons[i] === active;
          buttons[i].setAttribute('aria-selected', String(selected));
          buttons[i].setAttribute('tabindex', selected ? '0' : '-1');
          if (panels[i]) { if (selected) panels[i].removeAttribute('hidden'); else panels[i].setAttribute('hidden', ''); }
        }
      };
      for (var i = 0; i < buttons.length; i += 1) {
        buttons[i].addEventListener('click', function (event) { activate(event.currentTarget); });
      }
      activate(buttons[0]);
    })(tabs[t]);
  }
  var searches = document.querySelectorAll('[data-search]');
  for (var s = 0; s < searches.length; s += 1) {
    (function (input) {
      var form = input.form;
      if (form) form.addEventListener('submit', function (event) { event.preventDefault(); });
      var target = document.getElementById(input.getAttribute('data-search'));
      if (!target) return;
      var items = target.querySelectorAll('[data-item]');
      input.addEventListener('input', function () {
        var value = input.value.toLowerCase();
        for (var i = 0; i < items.length; i += 1) {
          var match = items[i].getAttribute('data-item').indexOf(value) !== -1;
          if (match) items[i].removeAttribute('hidden'); else items[i].setAttribute('hidden', '');
        }
      });
    })(searches[s]);
  }
  var galleries = document.querySelectorAll('[data-gallery]');
  if (galleries.length) {
    var box = document.createElement('div');
    box.className = 'tar-lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Image');
    box.addEventListener('click', function () { box.removeAttribute('data-open'); });
    document.body.appendChild(box);
    for (var g = 0; g < galleries.length; g += 1) {
      galleries[g].addEventListener('click', function (event) {
        var image = event.target && event.target.tagName === 'IMG' ? event.target : null;
        if (!image) return;
        box.innerHTML = '';
        var clone = document.createElement('img');
        clone.src = image.src;
        clone.alt = image.alt || '';
        box.appendChild(clone);
        box.setAttribute('data-open', '');
      });
    }
  }
})();
`.trim();

interface RenderContext {
  doc: SiteDocument;
  collector: CssCollector;
  base: string;
  binding?: Binding;
  item?: ResolvedItem;
  index: number;
  sectionLayout?: SectionLayoutSpec;
}

function itemSlug(item: ResolvedItem, index: number): string {
  return item.slug || `${slugify(item.title)}-${index + 1}`;
}

function renderNodes(nodes: Node[] | undefined, context: RenderContext): string {
  if (!Array.isArray(nodes)) return '';
  return nodes.map((node) => renderNode(node, context)).join('\n');
}

/** Container body: component composition, instance children or defaults. */
function renderChildren(node: Node, context: RenderContext): string {
  const component = node.component ? context.doc.components.find((entry) => entry.id === node.component) : undefined;
  if (component && (!node.children || !node.children.length)) return renderNodes(component.nodes, context);
  return renderNodes(node.children, context);
}

function renderNode(node: Node, context: RenderContext): string {
  const style = styleClass(context.collector, node.style);
  const id = escapeAttribute(node.id);
  const props = node.props || {};
  const component = node.component ? context.doc.components.find((entry) => entry.id === node.component) : undefined;
  const variant = component?.variants?.[node.variant || ''];
  const merged = variant?.props ? { ...variant.props, ...props } : props;
  const item = context.item;

  switch (node.kind) {
    case 'heading': {
      const level = Math.min(3, Math.max(1, Number(merged.level) || 2));
      const field = String(merged.field || '');
      const content = item && field ? (field === 'title' ? item.title : field === 'description' ? item.description || '' : '') : String(merged.text || '');
      return `<h${level} id="${id}" class="tar-title${style}">${escapeHtml(content)}</h${level}>`;
    }
    case 'text': {
      const field = String(merged.field || '');
      const content = item && field === 'description' ? item.description || '' : String(merged.text || '');
      return `<p id="${id}" class="tar-prose${style}">${escapeHtml(content).replace(/\n/g, '<br>')}</p>`;
    }
    case 'image': {
      const asset = context.doc.assets.find((entry) => entry.id === merged.asset);
      if (!asset) return '';
      const source = `/media/${asset.id}.${EXT[asset.mime] || 'bin'}`;
      const alt = merged.decorative ? '' : escapeAttribute(merged.alt ?? asset.alt ?? '');
      const dimensions = asset.width && asset.height ? ` width="${asset.width}" height="${asset.height}"` : '';
      return `<img id="${id}" class="tar-media${style}" src="${source}" alt="${alt}"${dimensions} loading="lazy" decoding="async">`;
    }
    case 'video': {
      const asset = context.doc.assets.find((entry) => entry.id === merged.asset);
      const remote = safeHref(merged.url);
      const source = asset ? `/media/${asset.id}.${EXT[asset.mime] || 'bin'}` : remote;
      if (!source) return '';
      return `<video id="${id}" class="tar-media${style}" src="${escapeAttribute(source)}" controls preload="metadata" playsinline></video>`;
    }
    case 'icon': {
      const path = ICONS[String(merged.name)] || ICONS.sparkle;
      return `<svg id="${id}" class="tar-icon${style}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"></path></svg>`;
    }
    case 'list': {
      const items = Array.isArray(merged.items) ? merged.items as unknown[] : [];
      return `<ul id="${id}" class="tar-list${style}">${items.map((entry) => `<li>${escapeHtml(entry)}</li>`).join('')}</ul>`;
    }
    case 'link': {
      const href = safeHref(merged.href) || '#';
      return `<a id="${id}" class="tar-link${style}" href="${href}">${escapeHtml(merged.label)}</a>`;
    }
    case 'button': {
      const label = escapeHtml(merged.label);
      const journey = String(merged.journey || '');
      const href = journey ? `#journey-${escapeAttribute(journey)}` : safeHref(merged.href) || '#';
      const variantClass = merged.variant === 'secondary' ? ' tar-btn-secondary' : merged.variant === 'outline' ? ' tar-btn-outline' : ' tar-btn-primary';
      return `<a id="${id}" class="tar-btn${variantClass}${style}" href="${href}">${label}</a>`;
    }
    case 'divider': return `<hr id="${id}" class="tar-divider">`;
    case 'spacer': return `<div id="${id}" class="tar-spacer" aria-hidden="true"></div>`;
    case 'flex': return `<div id="${id}" class="tar-flex${style}">${renderChildren(node, context)}</div>`;
    case 'stack': return `<div id="${id}" class="tar-stack${style}">${renderChildren(node, context)}</div>`;
    case 'grid': return `<div id="${id}" class="tar-grid${style}">${renderChildren(node, context)}</div>`;
    case 'card': return `<div id="${id}" class="tar-card${style}">${renderChildren(node, context)}</div>`;
    case 'collection': {
      let items = Array.isArray(merged.items) ? merged.items as (ResolvedItem & { whatsapp?: string; badge?: string })[] : [];
      const title = merged.title ? `<div class="tar-collection-header"><h2 class="tar-title tar-collection-title">${escapeHtml(merged.title)}</h2></div>` : '';
      const binding = context.binding;
      const detail = binding?.detail?.path;
      if (!items.length) {
        items = defaultSampleProducts(context.doc.pages[0]?.title || 'Store', (merged.whatsappPhone as string) || (context.doc.brief as unknown as Record<string, unknown>)?.phone as string);
      }
      const cards = items.map((entry, index) => {
        const slug = itemSlug(entry, index);
        const cardImg = entry.image && /^https?:\/\//.test(entry.image) ? entry.image : (entry.image ? `/media/${entry.image}` : '');
        const badge = entry.badge ? `<span class="tar-card-badge">${escapeHtml(entry.badge)}</span>` : '';
        const media = cardImg ? `<div class="tar-card-media">
          ${badge}
          <img class="tar-card-img" src="${escapeAttribute(cardImg)}" alt="${escapeAttribute(entry.title)}" loading="lazy" decoding="async">
        </div>` : `<div class="tar-card-media tar-card-media-placeholder">
          ${badge}
          <div class="tar-card-placeholder-box">${escapeHtml(entry.title.slice(0, 2).toUpperCase())}</div>
        </div>`;
        const priceHtml = entry.price !== undefined
          ? `<span class="tar-price">${formatMoney(entry.price, entry.currency || context.doc.currency || 'INR', context.doc.locale)}</span>`
          : '';
        const descHtml = entry.description ? `<p class="tar-card-desc">${escapeHtml(entry.description)}</p>` : '';
        const ctaHtml = '';
        const body = `<div class="tar-card tar-product-card">
              ${media}
              <div class="tar-card-meta">
                <strong class="tar-product-title">${escapeHtml(entry.title)}</strong>
                ${descHtml}
                <div class="tar-card-footer">
                  ${priceHtml}
                  ${ctaHtml}
                </div>
              </div>
            </div>`;
        const href = detail ? `${detail.replace('/:item', '')}/${encodeURIComponent(slug)}` : null;
        const card = `<div class="tar-collection-card" data-item="${escapeAttribute(`${entry.title} ${entry.description || ''}`.toLowerCase())}">${body}</div>`;
        return href ? `<a class="tar-cardlink" href="${escapeAttribute(href)}">${card}</a>` : card;
      }).join('\n');
      const secCols = (merged.columns as number | undefined) || context.sectionLayout?.columns || context.doc.design.layout.columns;
      const secKind = context.sectionLayout?.kind;
      const isStack = secKind === 'stack' && secCols === 1;
      const cols = isStack ? 1 : (typeof secCols === 'number' && secCols > 0 ? secCols : 3);
      const gridStyle = isStack
        ? 'display:flex;flex-direction:column;gap:24px;max-width:720px;margin:0 auto;width:100%;'
        : `grid-template-columns:repeat(auto-fill, minmax(min(260px, 100%), 1fr));gap:20px;width:100%;`;
      return `<div id="${id}" class="tar-stack${style}" style="width:100%">${title}<div class="${isStack ? 'tar-stack' : 'tar-grid tar-product-grid'}" style="${gridStyle}">${cards}</div></div>`;
    }
    case 'navigation': {
      const links = Array.isArray(merged.links) ? merged.links as { label?: string; href?: string }[] : [];
      const listId = `nav-${escapeAttribute(node.id)}`;
      const rendered = links.map((link) => {
        const href = safeHref(link.href);
        return href ? `<li><a href="${href}">${escapeHtml(link.label)}</a></li>` : '';
      }).join('');
      return `<header id="${escapeAttribute(node.id)}" class="tar-nav">
        <div class="tar-wrap tar-nav-inner">
          <a class="tar-brand" href="/">${escapeHtml(merged.brand || '')}</a>
          <nav class="tar-menu" data-menu="${listId}" aria-label="Main">
            ${rendered ? `<button class="tar-menu-btn" type="button" aria-expanded="false">☰</button><ul id="${listId}" class="tar-navlinks">${rendered}</ul>` : ''}
          </nav>
        </div>
      </header>`;
    }
    case 'footer': {
      return renderShopifyFooter(context.doc, context.doc.pages[0] || { sections: [] } as never, merged, node.id);
    }
    case 'menu': {
      const links = Array.isArray(merged.links) ? merged.links as { label?: string; href?: string }[] : [];
      const listId = `menu-${escapeAttribute(node.id)}`;
      const rendered = links.map((link) => {
        const href = safeHref(link.href);
        return href ? `<li><a href="${href}">${escapeHtml(link.label)}</a></li>` : '';
      }).join('');
      context.collector.runtime.add('menu');
      return `<nav id="${id}" class="tar-stack${style}"><button class="tar-menu-btn" type="button" aria-expanded="false">${escapeHtml(merged.label || 'Menu')}</button><ul class="tar-navlinks">${rendered}</ul></nav>`;
    }
    case 'tabs': {
      context.collector.runtime.add('tabs');
      const children = node.children || [];
      const buttons = children.map((child, index) => `<button role="tab" type="button" id="${escapeAttribute(child.id)}-tab" aria-controls="${escapeAttribute(child.id)}" aria-selected="${index === 0}" tabindex="${index === 0 ? '0' : '-1'}">${escapeHtml((child.props || {}).label)}</button>`).join('');
      const panels = children.map((child, index) => `<div role="tabpanel" id="${escapeAttribute(child.id)}" aria-labelledby="${escapeAttribute(child.id)}-tab"${index === 0 ? '' : ' hidden'}>${renderNodes(child.children, context)}</div>`).join('');
      return `<div id="${id}" class="tar-tabs${style}" data-tabs><div role="tablist">${buttons}</div>${panels}</div>`;
    }
    case 'accordion': {
      const children = node.children || [];
      return `<div id="${id}" class="tar-stack${style}">${children.map((child) => `<details class="tar-acc"><summary>${escapeHtml((child.props || {}).label)}</summary><div>${renderNodes(child.children, context)}</div></details>`).join('')}</div>`;
    }
    case 'gallery': {
      const assets = Array.isArray(merged.assets) ? merged.assets as string[] : [];
      context.collector.runtime.add('gallery');
      const images = assets.map((assetId) => {
        const asset = context.doc.assets.find((entry) => entry.id === assetId);
        if (!asset) return '';
        return `<img src="/media/${asset.id}.${EXT[asset.mime] || 'bin'}" alt="${escapeAttribute(asset.alt || '')}" loading="lazy" decoding="async">`;
      }).join('');
      return `<div id="${id}" class="tar-gallery${style}" data-gallery>${images}</div>`;
    }
    case 'search': {
      context.collector.runtime.add('search');
      const target = escapeAttribute(merged.target);
      return `<form id="${id}" class="tar-search${style}" role="search"><label class="tar-visually-hidden" for="${id}-input">Search</label><input id="${id}-input" type="search" data-search="${target}" placeholder="${escapeAttribute(merged.placeholder || 'Search')}"><button class="tar-btn tar-btn-secondary" type="submit">Search</button></form>`;
    }
    case 'form': {
      const journey = context.doc.journeys.find((entry) => entry.id === String(merged.journey || ''));
      if (!journey || !journey.enabled) return '';
      const fields = journey.fields.map((field) => {
        const fieldId = `${escapeAttribute(node.id)}-${escapeAttribute(field.key)}`;
        const required = field.required ? ' required' : '';
        const max = field.max ? ` maxlength="${field.max}"` : '';
        const control = field.kind === 'textarea'
          ? `<textarea id="${fieldId}" name="${escapeAttribute(field.key)}"${required}${max}></textarea>`
          : field.kind === 'select'
            ? `<select id="${fieldId}" name="${escapeAttribute(field.key)}"${required}>${(field.options || []).map((option) => `<option>${escapeHtml(option)}</option>`).join('')}</select>`
            : `<input id="${fieldId}" name="${escapeAttribute(field.key)}" type="${field.kind}"${required}${max}>`;
        return `<div class="tar-field"><label for="${fieldId}">${escapeHtml(field.label)}${field.required ? ' *' : ''}</label>${control}</div>`;
      }).join('');
      const honeypot = `<div class="tar-honeypot" aria-hidden="true"><label for="${escapeAttribute(node.id)}-extra">Leave empty</label><input id="${escapeAttribute(node.id)}-extra" name="extra" tabindex="-1" autocomplete="off"></div>`;
      return `<form id="journey-${escapeAttribute(journey.id)}" class="tar-form${style}" method="post" action="${escapeAttribute(`${context.base}/_tar/${journey.id}`)}">${fields}${honeypot}<button class="tar-btn tar-btn-primary" type="submit">${escapeHtml(merged.submitLabel || 'Send')}</button></form>`;
    }
    default:
      return '';
  }
}

function renderHeroSection(section: Section, context: RenderContext): string {
  const doc = context.doc;
  const style = styleClass(context.collector, section.style);
  const id = escapeAttribute(section.id || 'hero');

  let headline = doc.pages[0]?.title || '';
  let subline = doc.brief?.goal || '';
  let whatsappHref = '';
  let catalogHref = '#catalog';
  let imgSrc = '';
  let imgAlt = '';

  for (const node of section.nodes) {
    if (node.kind === 'heading' && node.props?.text) {
      headline = String(node.props.text);
    } else if (node.kind === 'text' && node.props?.text) {
      subline = String(node.props.text);
    } else if (node.kind === 'button' && node.props?.href) {
      const href = String(node.props.href);
      if (href.includes('wa.me') || href.includes('whatsapp') || String(node.props.label || '').toLowerCase().includes('whatsapp')) {
        whatsappHref = href;
      } else {
        catalogHref = href;
      }
    } else if (node.kind === 'image' && node.props?.asset) {
      const asset = doc.assets.find((a) => a.id === node.props?.asset);
      if (asset) {
        imgSrc = `/media/${asset.id}.${EXT[asset.mime] || 'jpg'}`;
        imgAlt = node.props.alt !== undefined ? String(node.props.alt) : (asset.alt || '');
      }
    } else if (node.kind === 'flex' && Array.isArray(node.children)) {
      for (const child of node.children) {
        if (child.kind === 'button' && child.props?.href) {
          const href = String(child.props.href);
          if (href.includes('wa.me') || href.includes('whatsapp') || String(child.props.label || '').toLowerCase().includes('whatsapp')) {
            whatsappHref = href;
          } else {
            catalogHref = href;
          }
        } else if (child.kind === 'image' && child.props?.asset && !imgSrc) {
          const asset = doc.assets.find((a) => a.id === child.props?.asset);
          if (asset) {
            imgSrc = `/media/${asset.id}.${EXT[asset.mime] || 'jpg'}`;
            imgAlt = child.props.alt !== undefined ? String(child.props.alt) : (asset.alt || '');
          }
        }
      }
    }
  }

  if (!imgSrc) {
    const firstImgAsset = doc.assets.find((a) => a.kind === 'image');
    if (firstImgAsset) {
      imgSrc = `/media/${firstImgAsset.id}.${EXT[firstImgAsset.mime] || 'jpg'}`;
      imgAlt = firstImgAsset.alt || '';
    }
  }

  const altText = imgAlt || headline;
  const heroPattern = doc.blueprint?.heroPattern || (doc.blueprint?.headerStyle === 'fullbleed' ? 'bg_image' : 'split');

  const catalogBtn = `<a href="${escapeAttribute(catalogHref)}" class="tar-btn tar-btn-outline">View Collection</a>`;
  const actionsHtml = `<div class="tar-hero-actions">${catalogBtn}</div>`;

  if (heroPattern === 'typography') {
    return `<section id="${id}" class="tar-hero tar-hero-typography${style}" data-purpose="hero">
  <div class="tar-hero-inner">
    <div class="tar-hero-text">
      <span class="tar-hero-eyebrow">Atelier & Boutique</span>
      <h1 class="tar-hero-title">${escapeHtml(headline)}</h1>
      ${subline ? `<p class="tar-hero-desc">${escapeHtml(subline)}</p>` : ''}
      ${actionsHtml}
    </div>
  </div>
</section>`;
  }

  if (heroPattern === 'bg_image' && imgSrc) {
    return `<section id="${id}" class="tar-hero tar-hero-bgimage${style}" style="background-image:url('${escapeAttribute(imgSrc)}');" data-purpose="hero">
  <div class="tar-hero-scrim"></div>
  <div class="tar-hero-inner">
    <div class="tar-hero-text">
      <span class="tar-hero-eyebrow">Signature Collection</span>
      <h1 class="tar-hero-title">${escapeHtml(headline)}</h1>
      ${subline ? `<p class="tar-hero-desc">${escapeHtml(subline)}</p>` : ''}
      ${actionsHtml}
    </div>
  </div>
</section>`;
  }

  if (heroPattern === 'commerce') {
    return `<section id="${id}" class="tar-hero tar-hero-commerce${style}" data-purpose="hero">
  <div class="tar-hero-inner">
    <div class="tar-hero-grid">
      <div class="tar-hero-text">
        <span class="tar-hero-eyebrow">Official Store</span>
        <h1 class="tar-hero-title">${escapeHtml(headline)}</h1>
        ${subline ? `<p class="tar-hero-desc">${escapeHtml(subline)}</p>` : ''}
        ${actionsHtml}
      </div>
      <div class="tar-hero-spotlight-card">
        ${imgSrc ? `<img class="tar-hero-spotlight-img" src="${escapeAttribute(imgSrc)}" alt="${escapeAttribute(altText)}" loading="eager" fetchpriority="high">` : `<div class="tar-hero-placeholder"><div class="tar-brand-mark">${escapeHtml(headline.slice(0, 2).toUpperCase())}</div></div>`}
        <div class="tar-hero-spotlight-meta">
          <span class="tar-hero-spotlight-title">${escapeHtml(headline)}</span>
          <span class="tar-card-badge">Featured</span>
        </div>
      </div>
    </div>
  </div>
</section>`;
  }

  if (heroPattern === 'minimal') {
    return `<section id="${id}" class="tar-hero tar-hero-minimal${style}" data-purpose="hero">
  <div class="tar-hero-inner">
    <div class="tar-hero-grid">
      <div class="tar-hero-text">
        <h1 class="tar-hero-title">${escapeHtml(headline)}</h1>
        ${subline ? `<p class="tar-hero-desc">${escapeHtml(subline)}</p>` : ''}
      </div>
      ${actionsHtml}
    </div>
  </div>
</section>`;
  }

  const mediaHtml = imgSrc
    ? `<img src="${escapeAttribute(imgSrc)}" alt="${escapeAttribute(altText)}" loading="eager" fetchpriority="high">`
    : `<div class="tar-hero-placeholder"><div class="tar-brand-mark">${escapeHtml(headline.slice(0, 2).toUpperCase())}</div></div>`;

  return `<section id="${id}" class="tar-hero tar-hero-split${style}" data-purpose="hero">
  <div class="tar-hero-inner">
    <div class="tar-hero-grid">
      <div class="tar-hero-text">
        <span class="tar-hero-eyebrow">Handcrafted & Verified</span>
        <h1 class="tar-hero-title">${escapeHtml(headline)}</h1>
        ${subline ? `<p class="tar-hero-desc">${escapeHtml(subline)}</p>` : ''}
        ${actionsHtml}
      </div>
      <div class="tar-hero-media">
        ${mediaHtml}
      </div>
    </div>
  </div>
</section>`;
}

function renderSection(section: Section, context: RenderContext): string {
  const layout = section.layout || { kind: 'flow' };
  const hasCollectionChild = Array.isArray(section.nodes) && section.nodes.some((node) => node.kind === 'collection');
  const columns = (layout.kind === 'grid' && !hasCollectionChild && typeof layout.columns === 'number')
    ? ` style="grid-template-columns:repeat(${layout.columns}, minmax(0, 1fr))"` : '';
  const kind = layout.kind === 'flow' ? '' : (hasCollectionChild ? ' tar-stack' : ` tar-${layout.kind}`);
  const style = styleClass(context.collector, section.style);
  const body = renderNodes(section.nodes, { ...context, binding: section.bindings?.[0], sectionLayout: section.layout });
  if (!body.trim()) return '';
  if (section.purpose === 'chrome') {
    return `<section id="${escapeAttribute(section.id)}" class="tar-chrome${style}" data-purpose="chrome">${body}</section>`;
  }
  if (section.purpose === 'notice') {
    return `<aside id="${escapeAttribute(section.id)}" class="tar-notice${style}" role="note" data-purpose="notice">${body}</aside>`;
  }
  if (section.purpose === 'navigation' || section.purpose === 'nav') {
    return body;
  }
  if (section.purpose === 'footer') {
    return renderShopifyFooter(context.doc, context.doc.pages[0] || { sections: [] } as never, undefined, section.id);
  }
  if (section.purpose === 'header' || section.purpose === 'hero') {
    return renderHeroSection(section, context);
  }
  return `<section id="${escapeAttribute(section.id)}" class="tar-section${style}" data-purpose="${escapeAttribute(section.purpose)}"><div class="tar-wrap${kind}"${columns}>${body}</div></section>`;
}

function pageMeta(doc: SiteDocument, page: Page, origin: string | undefined, canonicalPath: string, titleOverride?: string): string {
  const title = escapeHtml(`${titleOverride || page.title} — ${doc.pages[0].title}`);
  const description = escapeHtml(page.meta?.description || doc.brief.goal || `${doc.pages[0].title}`);
  const canonical = origin ? `${origin}${canonicalPath === '/' ? '/' : canonicalPath}` : null;
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: titleOverride || page.title,
    description: page.meta?.description || doc.brief.goal || undefined,
    inLanguage: doc.locale,
  };
  return `<title>${title}</title>
  <meta name="description" content="${description}">
  ${canonical ? `<link rel="canonical" href="${escapeAttribute(canonical)}">` : ''}
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  ${canonical ? `<meta property="og:url" content="${escapeAttribute(canonical)}">` : ''}
  <meta property="og:type" content="website">
  <script type="application/ld+json">
${JSON.stringify(structured, null, 2).replace(/</g, '\\u003c')}
  </script>`;
}

function pageHtml(doc: SiteDocument, page: Page, body: string, origin: string | undefined, canonicalPath: string, cssPath: string, runtime: boolean, titleOverride?: string): string {
  return `<!DOCTYPE html>
<html lang="${escapeAttribute(doc.locale || 'en')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${pageMeta(doc, page, origin, canonicalPath, titleOverride)}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,600;1,400&family=Mukta+Malar:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${cssPath}?v=${doc.revision || 1}">
  ${runtime ? '<script src="/site.js" defer></script>' : ''}
</head>
<body>
  <a class="tar-skip" href="#main">Skip to content</a>
  <main id="main">
${body}
  </main>
</body>
</html>`;
}

/** Hiding a node never removes the page's level-one heading; an emptied container goes with it. */
function withoutHidden(nodes: Node[], hidden: Set<string>): Node[] {
  const kept: Node[] = [];
  for (const node of nodes) {
    if (hidden.has(node.id) && !(node.kind === 'heading' && Number(node.props.level) === 1)) continue;
    const children = node.children ? withoutHidden(node.children, hidden) : undefined;
    if (node.children && !children?.length) continue;
    kept.push({ ...node, ...(children ? { children } : {}) });
  }
  return kept;
}

/**
 * A persona variant is a projection of the same document: it can hide, reorder
 * or retint what is already there, never add a fact. Resolution happens at the
 * edge from these compiled files, so a visit costs one path lookup.
 */
function variantOf(doc: SiteDocument, persona: Persona): SiteDocument {
  const hidden = new Set(persona.hide || []);
  const rank = new Map((persona.order || []).map((id, index) => [id, index]));
  const pages = doc.pages.map((page) => {
    const sections = page.sections
      .filter((section) => !hidden.has(section.id))
      .map((section) => {
        const nodes = withoutHidden(section.nodes, hidden);
        if (!nodes.length) return null;
        const tint = TONE_STYLE[String(persona.tone?.[section.id] || '')];
        const base = { ...(section.style?.base || {}), ...(tint || {}) };
        return { ...section, nodes, ...(section.style || tint ? { style: { ...section.style, base } } : {}) } as Section;
      })
      .filter((section): section is Section => section !== null)
      .sort((left, right) => (rank.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(right.id) ?? Number.MAX_SAFE_INTEGER));
    return { ...page, sections: sections.length ? sections : page.sections };
  });
  return { ...doc, pages };
}

function hasCatalogSection(page: Page): boolean {
  return page.sections.some((s) => s.purpose === 'catalog' || s.purpose === 'collection' || s.purpose === 'menu' || s.purpose === 'services' || s.nodes.some((n) => n.kind === 'collection'));
}

function defaultSampleProducts(brand: string, phone?: string): (ResolvedItem & { whatsapp?: string; badge?: string })[] {
  const cleanPhone = phone ? String(phone).replace(/[^0-9]/g, '') : '';
  const wa = (title: string) => cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${brand}, I want to order "${title}".`)}`
    : '#contact';

  return [
    {
      id: 'sample-1',
      title: 'Product 1',
      description: 'Handcrafted signature item made with premium materials.',
      price: 49900,
      currency: 'INR',
      badge: 'Best Seller',
      whatsapp: wa('Product 1'),
    },
    {
      id: 'sample-2',
      title: 'Product 2',
      description: 'Exclusive artisanal collection piece with authentic finish.',
      price: 79900,
      currency: 'INR',
      badge: 'Trending',
      whatsapp: wa('Product 2'),
    },
    {
      id: 'sample-3',
      title: 'Product 3',
      description: 'Popular everyday favourite verified for premium quality.',
      price: 129900,
      currency: 'INR',
      badge: 'Featured',
      whatsapp: wa('Product 3'),
    },
    {
      id: 'sample-4',
      title: 'Product 4',
      description: 'Limited edition seasonal release crafted to perfection.',
      price: 189900,
      currency: 'INR',
      whatsapp: wa('Product 4'),
    },
  ];
}

function renderDefaultCatalogSection(doc: SiteDocument): string {
  const brand = doc.pages[0]?.title || 'Store';
  const sampleItems = defaultSampleProducts(brand);
  const cards = sampleItems.map((entry) => {
    const badge = entry.badge ? `<span class="tar-card-badge">${escapeHtml(entry.badge)}</span>` : '';
    const media = `<div class="tar-card-media tar-card-media-placeholder">${badge}<div class="tar-card-placeholder-box">${escapeHtml(entry.title.slice(0, 2).toUpperCase())}</div></div>`;
    const priceHtml = `<span class="tar-price">${formatMoney(entry.price!, 'INR', doc.locale)}</span>`;
    const descHtml = entry.description ? `<p class="tar-card-desc">${escapeHtml(entry.description)}</p>` : '';
    const ctaHtml = '';
    return `<div class="tar-collection-card" data-item="${escapeAttribute(entry.title.toLowerCase())}">
      <div class="tar-card tar-product-card">
        ${media}
        <div class="tar-card-meta">
          <strong class="tar-product-title">${escapeHtml(entry.title)}</strong>
          ${descHtml}
          <div class="tar-card-footer">
            ${priceHtml}
            ${ctaHtml}
          </div>
        </div>
      </div>
    </div>`;
  }).join('\n');

  return `<section id="catalog" class="tar-section" data-purpose="catalog">
  <div class="tar-wrap tar-stack">
    <div class="tar-collection-header">
      <h2 class="tar-title tar-collection-title">Product Catalog</h2>
    </div>
    <div class="tar-grid tar-product-grid">
      ${cards}
    </div>
  </div>
</section>`;
}

function hasNavSection(page: Page): boolean {
  return page.sections.some((s) => s.purpose === 'navigation' || s.purpose === 'nav' || s.nodes.some((n) => n.kind === 'navigation'));
}

function hasFooterSection(page: Page): boolean {
  return page.sections.some((s) => s.purpose === 'footer' || s.nodes.some((n) => n.kind === 'footer'));
}

function renderShopifyFooter(doc: SiteDocument, page: Page, footerNodeProps?: Record<string, unknown>, footerId = 'site-footer'): string {
  const brand = escapeHtml(String(footerNodeProps?.brand || doc.pages[0]?.title || 'Storefront'));
  const year = new Date().getFullYear();
  const goal = doc.brief?.goal || `${brand} online storefront.`;
  const customLinks = Array.isArray(footerNodeProps?.links) ? footerNodeProps?.links as { label?: string; href?: string }[] : [];

  const quickLinks: { label: string; href: string }[] = [];
  quickLinks.push({ label: 'Home', href: '/' });
  for (const s of (page.sections || [])) {
    if (s.purpose === 'catalog' || s.purpose === 'collection' || s.id === 'catalog') {
      const label = s.purpose === 'menu' ? 'Menu' : s.purpose === 'services' ? 'Services' : 'Catalog';
      if (!quickLinks.some((q) => q.href.includes('catalog') || q.href.includes('menu'))) {
        quickLinks.push({ label, href: `#${s.id || 'catalog'}` });
      }
    } else if (s.purpose === 'menu' || s.id === 'menu') {
      if (!quickLinks.some((q) => q.href.includes('menu'))) quickLinks.push({ label: 'Menu', href: `#${s.id || 'menu'}` });
    } else if (s.purpose === 'services' || s.id === 'services') {
      if (!quickLinks.some((q) => q.href.includes('services'))) quickLinks.push({ label: 'Services', href: `#${s.id || 'services'}` });
    } else if (s.purpose === 'spotlight' || s.id === 'spotlight') {
      if (!quickLinks.some((q) => q.href.includes('spotlight'))) quickLinks.push({ label: 'Offers', href: `#${s.id || 'spotlight'}` });
    }
  }
  for (const l of customLinks) {
    if (l.label && l.href && !quickLinks.some((q) => q.href === l.href)) {
      quickLinks.push({ label: l.label, href: l.href });
    }
  }

  const quickLinksHtml = quickLinks.map((l) => `<li><a href="${escapeAttribute(safeHref(l.href) || '#')}">${escapeHtml(l.label)}</a></li>`).join('');

  const briefData = (doc.brief as unknown as Record<string, unknown>) || {};
  const phone = String(briefData.phone || briefData.whatsappPhone || '');
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const address = String(briefData.address || '');
  const email = String(briefData.email || '');

  return `<footer id="${escapeAttribute(footerId)}" class="tar-footer" data-purpose="footer">
  <div class="tar-footer-wrap">
    <div class="tar-footer-grid">
      <div class="tar-footer-col">
        <a class="tar-footer-brand" href="/">${brand}</a>
        <p class="tar-footer-bio">${escapeHtml(goal)}</p>
        <span class="tar-footer-badge-pill">✓ Verified Merchant</span>
      </div>
      <div class="tar-footer-col">
        <h4 class="tar-footer-col-title">Quick Links</h4>
        <ul class="tar-footer-list">
          ${quickLinksHtml}
        </ul>
      </div>
      <div class="tar-footer-col">
        <h4 class="tar-footer-col-title">Customer Care</h4>
        <ul class="tar-footer-list">
          <li><a href="#shipping">Shipping Policy</a></li>
          <li><a href="#returns">Returns & Refunds</a></li>
          <li><a href="#privacy">Privacy & Terms</a></li>
        </ul>
      </div>
      <div class="tar-footer-col">
        <h4 class="tar-footer-col-title">Orders & Support</h4>
        <div class="tar-footer-contact-item">
          <strong>Direct WhatsApp Support</strong><br>
          ${cleanPhone ? `<a href="https://wa.me/${cleanPhone}" class="tar-btn-whatsapp" style="margin-top:8px;display:inline-flex;" target="_blank" rel="noopener">Chat on WhatsApp</a>` : 'Instant assistance on WhatsApp'}
        </div>
        ${phone ? `<div class="tar-footer-contact-item" style="margin-top: 8px;"><strong>Phone:</strong> <a href="tel:${escapeAttribute(phone)}">${escapeHtml(phone)}</a></div>` : ''}
        ${email ? `<div class="tar-footer-contact-item" style="margin-top: 4px;"><strong>Email:</strong> <a href="mailto:${escapeAttribute(email)}">${escapeHtml(email)}</a></div>` : ''}
        ${address ? `<div class="tar-footer-contact-item" style="margin-top: 4px;"><strong>Address:</strong> ${escapeHtml(address)}</div>` : ''}
      </div>
    </div>
    <div class="tar-footer-bottom">
      <span>© ${year} ${brand}. All rights reserved.</span>
      <div class="tar-footer-payments" aria-label="Payment methods accepted">
        <span class="tar-pay-pill">UPI</span>
        <span class="tar-pay-pill">GPay</span>
        <span class="tar-pay-pill">PhonePe</span>
        <span class="tar-pay-pill">Cards</span>
        <span class="tar-pay-pill">Cash on Delivery</span>
      </div>
    </div>
  </div>
</footer>`;
}

function renderDefaultHeaderNav(doc: SiteDocument, page: Page): string {
  const brand = doc.pages[0]?.title || 'Store';
  const listId = 'nav-main-menu';
  const links: { label: string; href: string }[] = [];

  links.push({ label: 'Home', href: page.path === '/' ? '#hero' : '/' });

  for (const p of doc.pages) {
    if (p.path !== '/' && p.path !== page.path) {
      links.push({ label: p.title, href: p.path });
    }
  }

  for (const s of page.sections) {
    if (s.purpose === 'catalog' || s.purpose === 'collection' || s.id === 'catalog') {
      const label = s.purpose === 'menu' ? 'Menu' : s.purpose === 'services' ? 'Services' : 'Catalog';
      if (!links.some((l) => l.href.includes('catalog') || l.href.includes('menu'))) {
        links.push({ label, href: `#${s.id || 'catalog'}` });
      }
    } else if (s.purpose === 'menu' || s.id === 'menu') {
      if (!links.some((l) => l.href.includes('menu'))) links.push({ label: 'Menu', href: `#${s.id || 'menu'}` });
    } else if (s.purpose === 'services' || s.id === 'services') {
      if (!links.some((l) => l.href.includes('services'))) links.push({ label: 'Services', href: `#${s.id || 'services'}` });
    } else if (s.purpose === 'spotlight' || s.id === 'spotlight') {
      if (!links.some((l) => l.href.includes('spotlight'))) links.push({ label: 'Offers', href: `#${s.id || 'spotlight'}` });
    } else if (s.purpose === 'contact' || s.id === 'contact') {
      if (!links.some((l) => l.href.includes('contact'))) links.push({ label: 'Contact', href: `#${s.id || 'contact'}` });
    }
  }

  const rendered = links.map((l) => `<li><a href="${escapeAttribute(l.href)}">${escapeHtml(l.label)}</a></li>`).join('');

  return `<header id="site-header" class="tar-nav" data-purpose="navigation">
  <div class="tar-wrap tar-nav-inner">
    <a class="tar-brand" href="/">${escapeHtml(brand)}</a>
    <nav class="tar-menu" data-menu="${listId}" aria-label="Main Navigation">
      <button class="tar-menu-btn" type="button" aria-expanded="false" aria-label="Toggle navigation">☰</button>
      <ul id="${listId}" class="tar-navlinks">
        ${rendered}
      </ul>
    </nav>
  </div>
</header>`;
}

export async function compileDocument(doc: SiteDocument, options: CompileOptions = {}): Promise<CompileResult> {
  const collector: CssCollector = { classes: new Map(), runtime: new Set() };
  const files: CompiledFile[] = [];
  let itemCount = 0;
  const base = options.origin ? new URL(options.origin).pathname.replace(/\/$/, '') : '';
  const detailPages: { path: string; page: Page; item: ResolvedItem; detailNodes: Node[] }[] = [];
  const routes: string[] = [];

  const contexts = (item?: ResolvedItem, index = 0): RenderContext => ({ doc, collector, base, item, index });

  for (const page of doc.pages) {
    const hasNav = hasNavSection(page);
    const hasCatalog = hasCatalogSection(page);
    const hasFooter = hasFooterSection(page);
    const renderedSections = page.sections
      .filter((section) => section.purpose !== 'contact' && section.id !== 'contact')
      .map((section) => renderSection(section, contexts()))
      .filter(Boolean);
    if (!hasNav) {
      const navHtml = renderDefaultHeaderNav(doc, page);
      const noticeIndex = page.sections.findIndex((s) => s.purpose === 'notice');
      if (noticeIndex === 0) {
        renderedSections.splice(1, 0, navHtml);
      } else {
        renderedSections.unshift(navHtml);
      }
    }
    if (!hasCatalog) {
      const catalogHtml = renderDefaultCatalogSection(doc);
      const contactIndex = renderedSections.findIndex((s) => s.includes('data-purpose="contact"'));
      if (contactIndex >= 0) {
        renderedSections.splice(contactIndex, 0, catalogHtml);
      } else {
        renderedSections.push(catalogHtml);
      }
    }
    if (!hasFooter) {
      renderedSections.push(renderShopifyFooter(doc, page));
    }
    const body = renderedSections.join('\n');
    const runtime = collector.runtime.size > 0;
    const html = pageHtml(doc, page, body, options.origin, page.path, '/style.css', runtime);
    files.push({ path: page.path === '/' ? '/index.html' : `${page.path}/index.html`, mime: 'text/html; charset=utf-8', body: html, hash: await sha(html) });
    routes.push(page.path);

    for (const section of page.sections) {
      for (const binding of section.bindings || []) {
        const node = section.nodes.find((entry) => entry.kind === 'collection' && (entry.id === binding.slot || (entry.props || {}).slot === binding.slot || entry.id === (entry.props || {}).slot));
        if (!node) continue;
        const items = Array.isArray(node.props.items) ? node.props.items as ResolvedItem[] : [];
        itemCount += items.length;
        const size = binding.paginate?.size;
        if (size && items.length > size) {
          for (let number = 2; number * size - size < items.length; number += 1) {
            const slice = items.slice((number - 1) * size, number * size);
            const paged = { ...node, props: { ...node.props, items: slice } };
            const sectionCopy = { ...section, nodes: section.nodes.map((entry) => entry === node ? paged : entry) };
            const pagedBody = page.sections.map((entry) => entry === section ? renderSection(sectionCopy, contexts()) : renderSection(entry, contexts())).join('\n');
            const path = `${page.path === '/' ? '' : page.path}/page/${number}`;
            const html2 = pageHtml(doc, page, pagedBody, options.origin, path, '/style.css', collector.runtime.size > 0, `${page.title} (page ${number})`);
            files.push({ path: `${path}/index.html`, mime: 'text/html; charset=utf-8', body: html2, hash: await sha(html2) });
            routes.push(path);
          }
        }
        if (binding.detail && node.children?.length) {
          items.forEach((item, index) => {
            const path = `${binding.detail!.path.replace('/:item', '')}/${itemSlug(item, index)}`;
            detailPages.push({ path, page, item, detailNodes: node.children! });
          });
        }
      }
    }
  }

  // Persona variants compile beside the base pages so the edge only picks a path.
  const variants = [...(doc.personas || [])].sort((left, right) => right.priority - left.priority).slice(0, 4);
  for (const persona of variants) {
    const variant = variantOf(doc, persona);
    for (const page of variant.pages) {
      const hasNav = hasNavSection(page);
      const hasCatalog = hasCatalogSection(page);
      const hasFooter = hasFooterSection(page);
      const renderedSections = page.sections
        .filter((section) => section.purpose !== 'contact' && section.id !== 'contact')
        .map((section) => renderSection(section, contexts()))
        .filter(Boolean);
      if (!hasNav) {
        const navHtml = renderDefaultHeaderNav(variant, page);
        const noticeIndex = page.sections.findIndex((s) => s.purpose === 'notice');
        if (noticeIndex === 0) {
          renderedSections.splice(1, 0, navHtml);
        } else {
          renderedSections.unshift(navHtml);
        }
      }
      if (!hasCatalog) {
        const catalogHtml = renderDefaultCatalogSection(variant);
        const contactIndex = renderedSections.findIndex((s) => s.includes('data-purpose="contact"'));
        if (contactIndex >= 0) {
          renderedSections.splice(contactIndex, 0, catalogHtml);
        } else {
          renderedSections.push(catalogHtml);
        }
      }
      if (!hasFooter) {
        renderedSections.push(renderShopifyFooter(variant, page));
      }
      const body = renderedSections.join('\n');
      const html = pageHtml(variant, page, body, options.origin, page.path, '/style.css', collector.runtime.size > 0);
      const path = `/.persona/${persona.id}${page.path === '/' ? '' : page.path}/index.html`;
      files.push({ path, mime: 'text/html; charset=utf-8', body: html, hash: await sha(html) });
    }
  }

  for (const entry of detailPages) {
    const inner = renderNodes(entry.detailNodes, { ...contexts(entry.item) });
    const body = `<section class="tar-section" data-purpose="detail"><div class="tar-wrap tar-stack">${inner}</div></section>`;
    const html = pageHtml(doc, entry.page, body, options.origin, entry.path, '/style.css', false, entry.item.title);
    files.push({ path: `${entry.path}/index.html`, mime: 'text/html; charset=utf-8', body: html, hash: await sha(html) });
    routes.push(entry.path);
  }

  const usedAssets = new Set<string>();
  const walk = (nodes: Node[] | undefined) => (nodes || []).forEach((node) => {
    if (typeof node.props?.asset === 'string') usedAssets.add(String(node.props.asset));
    if (Array.isArray(node.props?.assets)) (node.props.assets as unknown[]).forEach((id) => usedAssets.add(String(id)));
    walk(node.children);
  });
  doc.pages.forEach((page) => page.sections.forEach((section) => walk(section.nodes)));
  for (const asset of doc.assets) if (usedAssets.has(asset.id) && asset.rights.approved && options.media) {
    const bytes = await options.media(asset);
    if (bytes) files.push({ path: `/media/${asset.id}.${EXT[asset.mime] || 'bin'}`, mime: asset.mime, body: bytes, hash: asset.hash });
  }

  const css = compileCss(doc.design, collector);
  files.push({ path: '/style.css', mime: 'text/css; charset=utf-8', body: css, hash: await sha(css) });
  if (collector.runtime.size) files.push({ path: '/site.js', mime: 'text/javascript; charset=utf-8', body: RUNTIME, hash: await sha(RUNTIME) });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${options.origin ? routes.map((route) => `<url><loc>${escapeAttribute(`${options.origin}${route}`)}</loc></url>`).join('') : ''}</urlset>`;
  files.push({ path: '/sitemap.xml', mime: 'application/xml; charset=utf-8', body: sitemap, hash: await sha(sitemap) });
  const robots = `User-agent: *\nAllow: /\n${options.origin ? `Sitemap: ${options.origin}/sitemap.xml\n` : ''}`;
  files.push({ path: '/robots.txt', mime: 'text/plain; charset=utf-8', body: robots, hash: await sha(robots) });

  const hash = await sha(files.map((file) => `${file.path}:${file.hash}`).join('|'));
  return { files, hash, itemCount, redirects: doc.redirects.map((redirect) => ({ ...redirect })), personas: variants.map((persona) => ({ id: persona.id, when: persona.when, priority: persona.priority })) };
}
