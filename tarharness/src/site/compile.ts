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
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');

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
.tar-flex { display: flex; flex-direction: row; gap: ${space(4)}; align-items: flex-start; flex-wrap: wrap; }
.tar-stack { display: flex; flex-direction: column; gap: ${space(4)}; }
.tar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr)); gap: ${space(4)}; }
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
.tar-btn-outline { background: #ffffff; color: #000000; border: 1px solid #000000; text-transform: uppercase; font-size: 12px; font-weight: 500; letter-spacing: 0.05em; padding: 10px 24px; border-radius: 4px; }
.tar-btn-outline:hover { background: #000000; color: #ffffff; }
.tar-link { text-decoration: underline; text-underline-offset: 3px; }
.tar-divider { border: 0; border-top: 1px solid var(--color-border); }
.tar-spacer { height: var(--space-section); }
.tar-icon { width: 1.5em; height: 1.5em; stroke: currentColor; fill: none; stroke-width: 1.6; }
.tar-price { font-weight: 700; color: var(--color-accent); }
.tar-item img { width: 100%; border-radius: var(--radius-sm); }
.tar-cardlink { text-decoration: none; display: block; }
.tar-item[hidden] { display: none; }
.tar-empty { color: var(--color-muted); font-style: italic; }

/* Announcement Bar */
.tar-announcement {
  background: #000000;
  color: #ffffff;
  font-family: var(--font-body);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
  padding: 6px 16px;
  width: 100%;
}

.tar-nav { position: sticky; top: 0; z-index: 50; background: var(--color-canvas); border-bottom: 1px solid var(--color-border); }
.tar-nav-inner { display: flex; align-items: center; justify-content: space-between; gap: ${space(4)}; min-height: 56px; padding: 0 24px; max-width: var(--layout-content); margin: 0 auto; }
.tar-brand { font-family: var(--font-display); font-size: 22px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; text-decoration: none; color: var(--color-ink); }
.tar-navlinks { display: flex; gap: 20px; list-style: none; flex-wrap: wrap; text-transform: uppercase; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; margin: 0; padding: 0; }
.tar-navlinks a { text-decoration: none; color: var(--color-ink); transition: opacity 0.15s ease; }
.tar-navlinks a:hover { opacity: 0.6; }
.tar-nav-actions { display: flex; align-items: center; gap: 18px; }
.tar-nav-icon { display: inline-flex; align-items: center; cursor: pointer; color: var(--color-ink); position: relative; }
.tar-bag-count { position: absolute; top: -4px; right: -8px; background: #000000; color: #ffffff; font-size: 9px; font-weight: 700; border-radius: 9999px; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; }
.tar-menu-btn { display: none; background: none; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: ${space(1)} ${space(2)}; font-size: 1.1rem; cursor: pointer; }

/* Product Grid and Card */
.tar-product-card { background: var(--color-canvas); border: none; border-radius: 0; padding: 0; gap: 6px; position: relative; display: flex; flex-direction: column; width: 100%; }
.tar-card-media { position: relative; overflow: hidden; width: 100%; aspect-ratio: 3 / 4; background: #f3f4f6; border-radius: 0; }
.tar-card-media img, .tar-card-media .tar-card-img { width: 100%; height: 100%; object-fit: cover; border-radius: 0; display: block; transition: opacity var(--motion) var(--ease); }
.tar-card-media .tar-card-img-alt { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity var(--motion) var(--ease); border-radius: 0; }
.tar-product-card:hover .tar-card-img-alt { opacity: 1; }
.tar-card-badge { position: absolute; top: 8px; left: 8px; background: #000000; color: #ffffff; font-size: 9px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 6px; border-radius: 0; z-index: 3; }
.tar-card-wishlist { position: absolute; top: 8px; right: 8px; background: rgba(255, 255, 255, 0.85); border: none; border-radius: 50%; cursor: pointer; color: var(--color-ink); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; z-index: 3; transition: background 0.15s ease; }
.tar-card-wishlist:hover { background: #ffffff; }
.tar-card-wishlist svg { width: 14px; height: 14px; stroke: #000000; fill: none; stroke-width: 1.5; transition: fill 0.15s ease; }
.tar-card-wishlist:hover svg { fill: #000000; }
.tar-card-sizes { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; gap: 4px; padding: 8px 6px; transform: translateY(100%); transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1); z-index: 4; }
.tar-product-card:hover .tar-card-sizes { transform: translateY(0); }
.tar-size-btn { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 2px; color: #000000; font-family: var(--font-body); font-size: 11px; font-weight: 500; padding: 4px 8px; cursor: pointer; transition: all 0.15s ease; flex: 1; text-align: center; }
.tar-size-btn:hover { background: #000000; color: #ffffff; border-color: #000000; }
.tar-swatches { display: flex; gap: 5px; padding: 6px 0 2px; align-items: center; }
.tar-swatch { width: 12px; height: 12px; border-radius: 50%; display: inline-block; cursor: pointer; border: 1px solid rgba(0,0,0,0.1); }
.tar-swatch[data-active] { outline: 1px solid #000000; outline-offset: 1px; }
.tar-card-colours { font-size: 11px; color: var(--color-muted); }
.tar-card-meta { display: flex; flex-direction: column; gap: 3px; }
.tar-product-title { font-size: 13px; font-weight: 400; color: var(--color-ink); line-height: 1.35; font-family: var(--font-body); letter-spacing: -0.01em; }
.tar-card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 2px; }
.tar-card-footer .tar-price { font-size: 13px; font-weight: 500; color: var(--color-ink); font-family: var(--font-body); }
.tar-quick-add { background: var(--color-ink); color: var(--color-canvas); font-size: 11px; font-weight: 500; padding: 4px 10px; border: none; border-radius: 4px; cursor: pointer; transition: opacity 0.15s ease; }
.tar-quick-add:hover { opacity: 0.85; }

/* Lookbook Full-Width Hero */
.tar-lookbook-hero {
  position: relative;
  width: 100%;
  min-height: 75vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #111111;
  color: #ffffff;
  text-align: center;
  overflow: hidden;
  padding: 100px 24px;
}
.tar-lookbook-hero .tar-hero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.85;
}
.tar-lookbook-hero .tar-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 100%);
}
.tar-lookbook-hero .tar-wrap {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  max-width: 840px;
}
.tar-lookbook-hero h1, .tar-lookbook-hero .tar-title {
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 36px);
  font-weight: 400;
  letter-spacing: 0.02em;
  color: #ffffff;
  margin: 0;
}
.tar-lookbook-hero p {
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: rgba(255,255,255,0.92);
  max-width: 560px;
  margin: 0;
}
.tar-lookbook-hero .tar-btn, .tar-lookbook-hero .tar-btn-outline {
  background: transparent;
  color: #ffffff;
  border: 1px solid #ffffff;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.06em;
  padding: 10px 32px;
  border-radius: 4px;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 8px;
}
.tar-lookbook-hero .tar-btn:hover, .tar-lookbook-hero .tar-btn-outline:hover {
  background: #ffffff;
  color: #000000;
}

/* Lookbook Editorial Mid-Hero Banner */
.tar-lookbook-midhero {
  position: relative;
  width: 100%;
  min-height: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #2b211b;
  color: #ffffff;
  text-align: center;
  padding: 100px 24px;
  overflow: hidden;
}
.tar-lookbook-midhero .tar-midhero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.85;
}
.tar-lookbook-midhero .tar-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%);
}
.tar-lookbook-midhero .tar-wrap {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  max-width: 680px;
}
.tar-lookbook-midhero h2, .tar-lookbook-midhero .tar-title {
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 3.5vw, 32px);
  font-weight: 400;
  letter-spacing: 0.02em;
  color: #ffffff;
  margin: 0;
}
.tar-lookbook-midhero p, .tar-lookbook-midhero .tar-prose {
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.015em;
  color: rgba(255,255,255,0.92);
  margin: 0;
  max-width: 520px;
}
.tar-lookbook-midhero .tar-btn, .tar-lookbook-midhero .tar-btn-outline {
  background: transparent;
  color: #ffffff;
  border: 1px solid #ffffff;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.05em;
  padding: 10px 32px;
  border-radius: 4px;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 8px;
}
.tar-lookbook-midhero .tar-btn:hover, .tar-lookbook-midhero .tar-btn-outline:hover {
  background: #ffffff;
  color: #000000;
}

/* Lookbook Action Ribbon */
.tar-lookbook-action {
  background: #000000;
  color: #ffffff;
  padding: 64px 24px;
  text-align: center;
  width: 100%;
}
.tar-lookbook-action .tar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}
.tar-lookbook-action h2 {
  font-family: var(--font-display);
  font-size: clamp(1.4rem, 2.5vw, 24px);
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #ffffff;
}
.tar-lookbook-action .tar-btn-outline {
  background: #ffffff;
  color: #000000;
  border: 1px solid #ffffff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  padding: 10px 32px;
  border-radius: 4px;
  text-transform: uppercase;
}
.tar-lookbook-action .tar-btn-outline:hover {
  background: transparent;
  color: #ffffff;
}

/* Press Strip */
.tar-press-strip {
  padding: 48px 0;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
  text-align: center;
  width: 100%;
}
.tar-press-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6b7280;
  margin-bottom: 24px;
}
.tar-press-logos {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(24px, 5vw, 64px);
  flex-wrap: wrap;
}
.tar-press-logo {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #111827;
  opacity: 0.65;
  transition: opacity 0.2s ease;
}
.tar-press-logo:hover { opacity: 1; }
.tar-press-vogue { font-family: 'Didot', 'Bodoni MT', 'Cinzel', 'Georgia', serif; font-weight: 700; letter-spacing: 0.18em; font-size: 20px; }
.tar-press-elle { font-family: 'Didot', 'Bodoni MT', 'Cinzel', 'Georgia', serif; font-weight: 900; letter-spacing: 0.22em; font-size: 22px; }
.tar-press-grazia { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 800; letter-spacing: 0.2em; font-size: 17px; }
.tar-press-harpers { font-family: 'Didot', 'Bodoni MT', 'Cinzel', 'Georgia', serif; font-weight: 600; letter-spacing: 0.15em; font-size: 16px; }
.tar-press-dazed { font-family: Impact, "Arial Black", sans-serif; font-weight: 900; letter-spacing: 0.15em; font-size: 19px; }
.tar-press-gq { font-family: 'Didot', 'Bodoni MT', 'Cinzel', 'Georgia', serif; font-weight: 800; letter-spacing: 0.12em; font-size: 22px; }

/* Multi-Column Footer */
.tar-footer { border-top: 1px solid #e5e5e5; background: #ffffff; margin-top: auto; }
.tar-footer-inner { display: flex; justify-content: space-between; flex-wrap: wrap; gap: ${space(3)}; padding: ${space(8)} 0; font-size: 0.9rem; color: var(--color-muted); }
.tar-footer-grid { display: grid; grid-template-columns: 1.2fr 2.8fr; gap: 48px; padding: 64px 0 48px; border-bottom: 1px solid #e5e5e5; }
.tar-footer-newsletter-title { font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px; color: #000000; }
.tar-footer-newsletter-text { font-size: 12px; color: #6b7280; margin-bottom: 16px; line-height: 1.5; }
.tar-footer-form { display: flex; max-width: 360px; margin-bottom: 10px; }
.tar-footer-input { flex: 1; padding: 10px 14px; border: 1px solid #000000; border-right: none; font-size: 12px; outline: none; border-radius: 0; background: #ffffff; color: #000000; }
.tar-footer-submit { background: #000000; color: #ffffff; border: 1px solid #000000; padding: 10px 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; border-radius: 0; transition: background 0.15s ease; }
.tar-footer-submit:hover { background: #333333; }
.tar-footer-disclaimer { font-size: 10px; color: #9ca3af; line-height: 1.4; margin-bottom: 24px; max-width: 360px; }
.tar-footer-wordmark { font-family: var(--font-heading); font-size: 28px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #000000; }
.tar-footer-nav { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
.tar-footer-col { display: flex; flex-direction: column; gap: 12px; }
.tar-footer-title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #000000; }
.tar-footer-links { list-style: none; display: flex; flex-direction: column; gap: 8px; font-size: 12px; color: #6b7280; margin: 0; padding: 0; }
.tar-footer-links a { text-decoration: none; color: inherit; transition: color 0.15s ease; }
.tar-footer-links a:hover { color: #000000; text-decoration: underline; }
.tar-footer-bottom { display: flex; align-items: center; justify-content: space-between; padding: 28px 0; font-size: 11px; color: #6b7280; flex-wrap: wrap; gap: 16px; }
.tar-footer-payments { display: flex; gap: 10px; color: #6b7280; font-size: 11px; font-weight: 500; }
.tar-footer-country { display: flex; align-items: center; gap: 8px; }

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
  .tar-flex { flex-direction: column; }
  .tar-menu[data-ready] .tar-navlinks { display: none; }
  .tar-menu[data-ready][data-open] .tar-navlinks { display: flex; flex-direction: column; padding: ${space(3)} 0; }
  .tar-menu-btn { display: inline-block; }
  .tar-section { padding: 48px 0; }
  .tar-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 12px !important; }
  .tar-footer-grid { grid-template-columns: 1fr; gap: 32px; padding: 40px 0 32px; }
  .tar-footer-nav { grid-template-columns: repeat(2, 1fr); gap: 24px; }
  .tar-press-logos { gap: 20px; }
  .tar-press-logo { font-size: 14px; }
  .tar-lookbook-hero { min-height: 60vh; padding: 60px 16px; margin-bottom: 24px; }
  .tar-lookbook-midhero { min-height: 380px; padding: 60px 16px; margin: 24px 0; }
}
@media (min-width: 769px) and (max-width: 1024px) {
  .tar-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 14px !important; }
  .tar-footer-grid { grid-template-columns: 1fr 2fr; }
  .tar-footer-nav { grid-template-columns: repeat(4, 1fr); }
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
      const isLookbook = context.doc.design.theme === 'editorial-lookbook';
      const items = Array.isArray(merged.items) ? merged.items as (ResolvedItem & { swatches?: string[]; image2?: string; badge?: string })[] : [];
      const title = merged.title ? `<div class="tar-flex" style="justify-content:space-between;align-items:center;margin-bottom:24px"><h2 class="tar-title" style="font-size:20px;font-weight:700;letter-spacing:0.025em;text-transform:uppercase">${escapeHtml(merged.title)}</h2><a href="/shop" class="tar-btn-outline">VIEW ALL</a></div>` : '';
      const binding = context.binding;
      const detail = binding?.detail?.path;
      const quickAdd = merged.quickAdd === true;
      if (!items.length) {
        // A bound slot with no live records shows its empty text, never invented cards.
        const empty = String(merged.empty || binding?.empty?.text || '');
        return `<div id="${id}" class="tar-stack${style}">${title}${empty ? `<p class="tar-empty">${escapeHtml(empty)}</p>` : ''}</div>`;
      }
      const cards = items.map((entry, index) => {
        const slug = itemSlug(entry, index);
        const cardImg = entry.image && /^https:\/\//.test(entry.image) ? entry.image : '';
        const cardImg2 = entry.image2 && /^https:\/\//.test(entry.image2) ? entry.image2 : '';
        const media = `<div class="tar-card-media">
          ${cardImg ? `<img class="tar-card-img" src="${escapeAttribute(cardImg)}" alt="${escapeAttribute(entry.title)}" loading="lazy">` : ''}
          ${cardImg2 ? `<img class="tar-card-img-alt" src="${escapeAttribute(cardImg2)}" alt="" loading="lazy">` : ''}
          <button type="button" class="tar-card-wishlist" aria-label="Wishlist"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-9.5A3.5 3.5 0 0112 8a3.5 3.5 0 017 2.5c0 5-7 9.5-7 9.5z"></path></svg></button>
          <div class="tar-card-sizes">
            <button type="button" class="tar-size-btn" data-action="cart.add" data-item="${escapeAttribute(slug)}" data-size="XS">XS</button>
            <button type="button" class="tar-size-btn" data-action="cart.add" data-item="${escapeAttribute(slug)}" data-size="S">S</button>
            <button type="button" class="tar-size-btn" data-action="cart.add" data-item="${escapeAttribute(slug)}" data-size="M">M</button>
            <button type="button" class="tar-size-btn" data-action="cart.add" data-item="${escapeAttribute(slug)}" data-size="L">L</button>
            <button type="button" class="tar-size-btn" data-action="cart.add" data-item="${escapeAttribute(slug)}" data-size="XL">XL</button>
          </div>
        </div>`;
        const cardSwatches = (Array.isArray(entry.swatches) && entry.swatches.length ? entry.swatches : ['#000000', '#5B6554', '#8C7C6D', '#E5E7EB'])
          .map((color: string, swatch: number) => `<span class="tar-swatch"${swatch === 0 ? ' data-active' : ''} style="background:${escapeAttribute(color)}"></span>`).join('');
        const badge = entry.badge ? `<span class="tar-card-badge">${escapeHtml(entry.badge)}</span>` : '';
        const colours = Number(entry.colours) > 1 ? `<span class="tar-card-colours">${Number(entry.colours)} colours</span>` : '';
        // Cards always render this default body; a collection's children template feeds its detail pages only.
        const body = `<div class="tar-card tar-product-card">
              ${media}
              <div class="tar-swatches">${cardSwatches}</div>
              <div class="tar-card-meta">
                <strong class="tar-product-title">${escapeHtml(entry.title)}</strong>
                ${colours}
                <div class="tar-card-footer">
                  <span class="tar-price">${entry.price !== undefined && entry.currency ? formatMoney(entry.price, entry.currency, context.doc.locale) : (entry.price !== undefined ? `$${entry.price}` : '')}</span>
                  ${quickAdd && !isLookbook ? `<button type="button" class="tar-quick-add" data-action="cart.add" data-item="${escapeAttribute(slug)}">Quick add</button>` : ''}
                </div>
              </div>
            </div>`;
        const href = detail ? `${detail.replace('/:item', '')}/${encodeURIComponent(slug)}` : null;
        const card = `<div data-item="${escapeAttribute(`${entry.title} ${entry.description || ''}`.toLowerCase())}">${badge}${body}</div>`;
        return href ? `<a class="tar-cardlink" href="${escapeAttribute(href)}">${card}</a>` : card;
      }).join('\n');
      const secCols = context.sectionLayout?.columns;
      const secKind = context.sectionLayout?.kind;
      const isStack = secKind === 'stack' || secCols === 1;
      const cols = isStack ? 1 : (typeof secCols === 'number' && secCols > 0 ? secCols : (isLookbook ? 4 : 3));
      const gridStyle = isStack
        ? (isLookbook ? 'grid-template-columns:repeat(4, minmax(0, 1fr));gap:16px;' : 'display:flex;flex-direction:column;gap:24px;max-width:720px;margin:0 auto;')
        : `grid-template-columns:repeat(${cols}, minmax(0, 1fr));gap:16px;`;
      return `<div id="${id}" class="tar-stack${style}">${title}<div class="${isStack && !isLookbook ? 'tar-stack' : 'tar-grid'}" style="${gridStyle}">${cards}</div></div>`;
    }
    case 'navigation': {
      const isLookbook = context.doc.design.theme === 'editorial-lookbook';
      const links = Array.isArray(merged.links) ? merged.links as { label?: string; href?: string }[] : [];
      const listId = `nav-${escapeAttribute(node.id)}`;
      const rendered = links.map((link) => {
        const href = safeHref(link.href);
        return href ? `<li><a href="${href}">${escapeHtml(link.label)}</a></li>` : '';
      }).join('');
      const actionIcons = ['heart', 'search', 'user', 'bag'].map((icon) => {
        const path = ICONS[icon] || ICONS.sparkle;
        const badge = icon === 'bag' ? '<span class="tar-bag-count">0</span>' : '';
        return `<span class="tar-nav-icon" aria-label="${icon}"><svg class="tar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="${path}"></path></svg>${badge}</span>`;
      }).join('');
      return `<header id="${escapeAttribute(node.id)}" class="tar-nav">
        ${isLookbook ? '<div class="tar-announcement">FREE WORLDWIDE SHIPPING ON ORDERS OVER $150 · EASY 30-DAY RETURNS</div>' : ''}
        <div class="tar-wrap tar-nav-inner">
          <nav class="tar-menu" data-menu="${listId}" aria-label="Main">
            <button class="tar-menu-btn" type="button" aria-expanded="false">☰</button>
            <ul id="${listId}" class="tar-navlinks">${rendered}</ul>
          </nav>
          <a class="tar-brand" href="/">${escapeHtml(merged.brand)}</a>
          <div class="tar-nav-actions">${actionIcons}</div>
        </div>
      </header>`;
    }
    case 'footer': {
      const isLookbook = context.doc.design.theme === 'editorial-lookbook';
      const brand = escapeHtml(merged.brand || context.doc.pages[0]?.title || '');
      const year = new Date().getFullYear();
      if (isLookbook) {
        return `<footer id="${escapeAttribute(node.id)}" class="tar-footer">
          <div class="tar-wrap">
            <div class="tar-footer-grid">
              <div class="tar-footer-newsletter">
                <div class="tar-footer-newsletter-title">SIGN UP FOR 10% OFF</div>
                <div class="tar-footer-newsletter-text">Be the first to know about new collection drops and seasonal lookbooks.</div>
                <form class="tar-footer-form" onsubmit="event.preventDefault()">
                  <input class="tar-footer-input" type="email" placeholder="Enter your email" aria-label="Email address" required>
                  <button class="tar-footer-submit" type="submit">JOIN</button>
                </form>
                <div class="tar-footer-disclaimer">By subscribing you agree to our Terms and Privacy Policy.</div>
              </div>
              <div class="tar-footer-nav">
                <div class="tar-footer-col">
                  <span class="tar-footer-title">SHOP</span>
                  <ul class="tar-footer-links">
                    <li><a href="/shop">New Arrivals</a></li>
                    <li><a href="/shop">Best Sellers</a></li>
                    <li><a href="/shop">Core Collection</a></li>
                    <li><a href="/shop">Lookbook</a></li>
                  </ul>
                </div>
                <div class="tar-footer-col">
                  <span class="tar-footer-title">HELP</span>
                  <ul class="tar-footer-links">
                    <li><a href="/contact">Shipping & Returns</a></li>
                    <li><a href="/contact">Order Tracking</a></li>
                    <li><a href="/contact">Size Guide</a></li>
                    <li><a href="/contact">Customer Care</a></li>
                  </ul>
                </div>
                <div class="tar-footer-col">
                  <span class="tar-footer-title">ABOUT</span>
                  <ul class="tar-footer-links">
                    <li><a href="/">Our Story</a></li>
                    <li><a href="/">Sustainability</a></li>
                    <li><a href="/">Press</a></li>
                    <li><a href="/">Careers</a></li>
                  </ul>
                </div>
                <div class="tar-footer-col">
                  <span class="tar-footer-title">LEGAL</span>
                  <ul class="tar-footer-links">
                    <li><a href="/">Privacy Policy</a></li>
                    <li><a href="/">Terms of Service</a></li>
                    <li><a href="/">Cookie Settings</a></li>
                  </ul>
                </div>
              </div>
            </div>
            <div class="tar-footer-bottom">
              <div class="tar-footer-wordmark">${brand}</div>
              <div class="tar-footer-payments">
                <span>Apple Pay</span> · <span>Visa</span> · <span>Mastercard</span> · <span>Klarna</span> · <span>UPI</span>
              </div>
              <span>© ${year} ${brand}. All rights reserved.</span>
            </div>
          </div>
        </footer>`;
      }
      const links = Array.isArray(merged.links) ? merged.links as { label?: string; href?: string }[] : [];
      const rendered = links.map((link) => {
        const href = safeHref(link.href);
        return href ? `<li><a href="${href}">${escapeHtml(link.label)}</a></li>` : '';
      }).join('');
      const text = escapeHtml(merged.text || `© ${year} ${brand}`);
      return `<footer id="${escapeAttribute(node.id)}" class="tar-footer"><div class="tar-wrap tar-footer-inner"><span>${text}</span><ul class="tar-footer-links">${rendered}</ul></div></footer>`;
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

function renderSection(section: Section, context: RenderContext): string {
  const isLookbook = context.doc.design.theme === 'editorial-lookbook';
  const layout = section.layout || { kind: 'flow' };
  const columns = typeof layout.columns === 'number' ? ` style="grid-template-columns:repeat(${layout.columns}, minmax(0, 1fr))"` : '';
  const kind = layout.kind === 'flow' ? '' : ` tar-${layout.kind}`;
  const style = styleClass(context.collector, section.style);
  const body = renderNodes(section.nodes, { ...context, binding: section.bindings?.[0], sectionLayout: section.layout });
  if (!body.trim()) return '';
  if (section.purpose === 'press') {
    return `<section id="${escapeAttribute(section.id)}" class="tar-section tar-press-strip${style}" data-purpose="press">
      <div class="tar-wrap">
        <div class="tar-press-title">AS FEATURED IN</div>
        <div class="tar-press-logos">
          <span class="tar-press-logo tar-press-vogue">VOGUE</span>
          <span class="tar-press-logo tar-press-elle">ELLE</span>
          <span class="tar-press-logo tar-press-grazia">GRAZIA</span>
          <span class="tar-press-logo tar-press-harpers">HARPER'S BAZAAR</span>
          <span class="tar-press-logo tar-press-dazed">DAZED</span>
          <span class="tar-press-logo tar-press-gq">GQ</span>
        </div>
      </div>
    </section>`;
  }
  if (isLookbook && (section.purpose === 'hero' || section.purpose === 'introduction')) {
    const heroBg = 'https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=1920';
    return `<section id="${escapeAttribute(section.id)}" class="tar-section tar-lookbook-hero${style}" data-purpose="${escapeAttribute(section.purpose)}">
      <img class="tar-hero-bg" src="${heroBg}" alt="Hero lifestyle background" loading="eager">
      <div class="tar-hero-overlay"></div>
      <div class="tar-wrap${kind}"${columns}>${body}</div>
    </section>`;
  }
  if (isLookbook && section.purpose === 'story') {
    const midheroBg = 'https://images.pexels.com/photos/6311612/pexels-photo-6311612.jpeg?auto=compress&cs=tinysrgb&w=1920';
    return `<section id="${escapeAttribute(section.id)}" class="tar-section tar-lookbook-midhero${style}" data-purpose="story">
      <img class="tar-midhero-bg" src="${midheroBg}" alt="Sweats fabrics lifestyle banner" loading="lazy">
      <div class="tar-hero-overlay"></div>
      <div class="tar-wrap${kind}"${columns}>${body}</div>
    </section>`;
  }
  if (isLookbook && section.purpose === 'action') {
    return `<section id="${escapeAttribute(section.id)}" class="tar-section tar-lookbook-action${style}" data-purpose="action"><div class="tar-wrap">${body}</div></section>`;
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
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${cssPath}">
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

export async function compileDocument(doc: SiteDocument, options: CompileOptions = {}): Promise<CompileResult> {
  const collector: CssCollector = { classes: new Map(), runtime: new Set() };
  const files: CompiledFile[] = [];
  let itemCount = 0;
  const base = options.origin ? new URL(options.origin).pathname.replace(/\/$/, '') : '';
  const detailPages: { path: string; page: Page; item: ResolvedItem; detailNodes: Node[] }[] = [];
  const routes: string[] = [];

  const contexts = (item?: ResolvedItem, index = 0): RenderContext => ({ doc, collector, base, item, index });

  for (const page of doc.pages) {
    const body = page.sections.map((section) => renderSection(section, contexts())).join('\n');
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
      const body = page.sections.map((section) => renderSection(section, contexts())).join('\n');
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
