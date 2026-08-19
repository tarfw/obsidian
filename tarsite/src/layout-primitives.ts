/**
 * Universal Composable Spatial Primitives Engine (tarsite)
 * 5 Spatial Layout Primitives mathematically covering 100% of 2D web designs:
 * 1. poster     — Z-Index Layering, Large Display Typography & Cutout Asset
 * 2. split      — 2-Column Directional Asymmetrical Layout & Surface Inset
 * 3. grid       — Dynamic Multi-Item Responsive Matrix
 * 4. rail       — Horizontal Continuous Scroll & Infinite Loop Marquee
 * 5. accordion  — Collapsible Sequential Disclosure Rows
 * Plus Universal HeaderNav, FooterStrip, and DividerStrip.
 */

import { type UINode, type DesignTokens } from './types';

/**
 * Builds scoped CSS Custom Properties from node contracts and design tokens.
 */
export function buildStyleCssVars(contract: Record<string, any> = {}, tokens?: DesignTokens): string {
  const vars: string[] = [];

  // 1. Direct Contract Overrides
  if (contract.bg) vars.push(`--section-bg: ${contract.bg}`);
  if (contract.text_color || contract.color) vars.push(`--section-text: ${contract.text_color || contract.color}`);
  if (contract.hover_zoom) vars.push(`--hover-zoom: ${contract.hover_zoom}`);
  if (contract.gap) vars.push(`--grid-gap: ${contract.gap}`);
  if (contract.card_bg) vars.push(`--card-bg: ${contract.card_bg}`);
  if (contract.card_border) vars.push(`--card-border: ${contract.card_border}`);
  if (contract.card_radius) vars.push(`--card-radius: ${contract.card_radius}`);
  if (contract.cta_bg) vars.push(`--cta-bg: ${contract.cta_bg}`);
  if (contract.cta_text) vars.push(`--cta-text: ${contract.cta_text}`);

  // 2. Global Token Fallbacks
  if (tokens) {
    if (tokens.typography?.fontHeading) vars.push(`--font-heading: '${tokens.typography.fontHeading}', sans-serif`);
    if (tokens.typography?.fontBody) vars.push(`--font-body: '${tokens.typography.fontBody}', sans-serif`);
    if (tokens.colors?.primary) vars.push(`--color-primary: ${tokens.colors.primary}`);
    if (tokens.colors?.secondary) vars.push(`--color-secondary: ${tokens.colors.secondary}`);
    if (tokens.colors?.tertiary) vars.push(`--color-tertiary: ${tokens.colors.tertiary}`);
    if (tokens.colors?.background) {
      vars.push(`--color-background: ${tokens.colors.background}`);
      vars.push(`--color-bg: ${tokens.colors.background}`);
    }
    if (tokens.colors?.surface) vars.push(`--color-surface: ${tokens.colors.surface}`);
    if (tokens.colors?.text) vars.push(`--color-text: ${tokens.colors.text}`);
    if (tokens.colors?.muted) vars.push(`--color-muted: ${tokens.colors.muted}`);
    if (tokens.colors?.border) vars.push(`--color-border: ${tokens.colors.border}`);

    if (tokens.radii?.sm) vars.push(`--radius-sm: ${tokens.radii.sm}`);
    if (tokens.radii?.md) vars.push(`--radius-md: ${tokens.radii.md}`);
    if (tokens.radii?.lg) vars.push(`--radius-lg: ${tokens.radii.lg}`);
    if (tokens.radii?.full) vars.push(`--radius-full: ${tokens.radii.full}`);

    if (tokens.spacing?.xs) vars.push(`--space-xs: ${tokens.spacing.xs}`);
    if (tokens.spacing?.sm) vars.push(`--space-sm: ${tokens.spacing.sm}`);
    if (tokens.spacing?.md) vars.push(`--space-md: ${tokens.spacing.md}`);
    if (tokens.spacing?.lg) vars.push(`--space-lg: ${tokens.spacing.lg}`);
    if (tokens.spacing?.xl) vars.push(`--space-xl: ${tokens.spacing.xl}`);
  }

  return vars.join('; ');
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. POSTER PRIMITIVE (Z-Index Layering, Display Typography & Cutout Asset)
// ─────────────────────────────────────────────────────────────────────────────
export function renderPoster(node: UINode, tokens?: DesignTokens): string {
  const c = node.contract || {};
  const p = node.props || {};
  const cssVars = buildStyleCssVars(c, tokens);

  const eyebrow = p.eyebrow || p.badge || '';
  const headline = p.headline || p.title || tokens?.name || 'WELCOME';
  const subtitle = p.subtitle || p.description || '';
  const image = p.image || (Array.isArray(p.items) && p.items[0]?.image) || '';
  const ctaText = p.ctaText || p.buttonText || p.cta_label || 'EXPLORE NOW';
  const secondaryCtaText = p.secondaryCtaText;
  const sideText = p.sideText || p.side_note || '';

  const ctaShape = c.cta_shape === 'pill' || tokens?.radii?.full === '9999px' ? '9999px' : 'var(--radius-md, 6px)';
  const minHeight = c.height || '80vh';

  return `
    <section class="poster-section" style="${cssVars}; position: relative; width: 100%; min-height: ${minHeight}; background: var(--section-bg, var(--color-background, #ffffff)); color: var(--color-text, #111827); padding: clamp(48px, 8vw, 80px) clamp(16px, 4vw, 32px); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; overflow: hidden;">
      <div style="max-width: 1340px; width: 100%; margin: 0 auto; display: flex; flex-direction: column; align-items: center; position: relative; z-index: 10;">
        ${eyebrow ? `<p style="color: var(--color-primary, #007aff); font-size: clamp(11px, 1.2vw, 13px); font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: clamp(10px, 2vw, 18px);">${eyebrow}</p>` : ''}
        
        <h1 style="font-family: var(--font-heading, sans-serif); font-size: clamp(48px, 10vw, 120px); font-weight: 800; line-height: 0.95; letter-spacing: -0.025em; color: var(--color-text, #111827); text-transform: uppercase; margin-bottom: clamp(10px, 2vw, 20px); width: 100%;">
          ${headline.replace(/\n/g, '<br>')}
        </h1>

        ${subtitle ? `<h2 style="font-family: var(--font-body, sans-serif); font-size: clamp(16px, 2.5vw, 28px); font-weight: 500; color: var(--color-muted, #6b7280); letter-spacing: 0.02em; margin-bottom: clamp(24px, 4vw, 36px); max-width: 720px;">${subtitle}</h2>` : ''}

        ${image ? `
          <div style="position: relative; max-width: 480px; width: 100%; margin: 0 auto clamp(24px, 4vw, 36px);">
            <img src="${image}" alt="${headline}" style="width: 100%; height: auto; object-fit: contain; display: block; filter: drop-shadow(0 16px 32px rgba(0,0,0,0.15));" />
          </div>
        ` : ''}

        <div style="display: flex; gap: 16px; align-items: center; justify-content: center; flex-wrap: wrap; z-index: 20;">
          <a href="${p.ctaUrl || '#products'}" style="background: var(--cta-bg, var(--color-primary, #007aff)); color: var(--cta-text, #ffffff); padding: 12px clamp(24px, 4vw, 36px); border-radius: ${ctaShape}; font-weight: 700; font-size: 0.88rem; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1.0)'">${ctaText}</a>
          ${secondaryCtaText ? `<a href="${p.secondaryCtaUrl || '#about'}" style="background: transparent; color: var(--color-text, #111827); border: 1px solid var(--color-border, rgba(0,0,0,0.2)); padding: 12px clamp(24px, 4vw, 36px); border-radius: ${ctaShape}; font-weight: 700; font-size: 0.88rem; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none;">${secondaryCtaText}</a>` : ''}
        </div>
      </div>

      ${sideText ? `
        <div style="position: absolute; left: clamp(16px, 4vw, 48px); bottom: clamp(24px, 5vw, 60px); max-width: 260px; text-align: left; z-index: 20;">
          <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; line-height: 1.4; color: var(--color-muted, #6b7280); margin-bottom: 10px;">
            ${sideText}
          </div>
          <a href="${p.ctaUrl || '#products'}" style="display: inline-block; background: var(--color-primary, #007aff); color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase; text-decoration: none;">${ctaText}</a>
        </div>
      ` : ''}
    </section>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SPLIT PRIMITIVE (2-Column Directional Asymmetrical Layout & Surface Inset)
// ─────────────────────────────────────────────────────────────────────────────
export function renderSplit(node: UINode, tokens?: DesignTokens): string {
  const c = node.contract || {};
  const p = node.props || {};
  const cssVars = buildStyleCssVars(c, tokens);

  const topBadge = p.top_badge || p.badge || '';
  const headline = p.headline || p.title || 'Exceptional Quality & Design';
  const subtitle = p.subtitle || '';
  const body = p.body || p.description || p.text || '';
  const bottomLabel = p.bottom_label || p.category || '';
  const image = p.image || 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&h=800&fit=crop';
  const highlights = Array.isArray(p.highlights) ? p.highlights : [];
  const cta = p.cta || { label: p.ctaText || 'Learn More', href: p.ctaUrl || '#about', icon: '▶' };

  const reverse = c.reverse ? 'direction: rtl;' : '';

  return `
    <section class="split-section" style="${cssVars}; background: var(--section-bg, var(--color-background, transparent)); color: var(--color-text, #111827); padding: clamp(48px, 8vw, 96px) clamp(16px, 4vw, 48px); min-height: 70vh; display: flex; align-items: center;">
      <div style="max-width: 1340px; margin: 0 auto; width: 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr)); gap: clamp(32px, 6vw, 64px); align-items: center; ${reverse}">
        
        <!-- Column 1: Text & UI Stack -->
        <div style="display: flex; flex-direction: column; justify-content: space-between; text-align: left; direction: ltr;">
          ${topBadge ? `<div style="font-size: 13px; font-weight: 700; color: var(--color-primary, #007aff); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 20px;">${topBadge}</div>` : ''}

          <div>
            <h2 style="font-family: var(--font-heading, sans-serif); font-size: clamp(32px, 4.5vw, 56px); font-weight: 800; line-height: 1.1; color: var(--color-text, #111827); letter-spacing: -0.02em; margin-bottom: 18px;">
              ${headline}
            </h2>
            ${subtitle ? `<h3 style="font-size: 16px; font-weight: 600; color: var(--color-muted, #6b7280); margin-bottom: 16px;">${subtitle}</h3>` : ''}
            ${body ? `<p style="font-family: var(--font-body, sans-serif); font-size: clamp(14px, 1.5vw, 16px); line-height: 1.6; color: var(--color-text, #111827); opacity: 0.88; max-width: 480px; margin-bottom: 24px;">${body}</p>` : ''}

            ${highlights.length > 0 ? `
              <ul style="list-style: none; display: flex; flex-direction: column; gap: 12px; margin-bottom: 28px;">
                ${highlights.map((h: string) => `
                  <li style="display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 600; color: var(--color-text, #111827);">
                    <span style="width: 20px; height: 20px; background: var(--color-primary, #007aff); color: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0;">✓</span>
                    ${h}
                  </li>
                `).join('')}
              </ul>
            ` : ''}

            ${cta?.label ? `
              <a href="${cta.href || '#'}" style="display: inline-flex; align-items: center; gap: 12px; background: var(--cta-bg, var(--color-primary, #007aff)); color: var(--cta-text, #ffffff); padding: 10px clamp(20px, 2.5vw, 28px); border-radius: 9999px; font-size: 13px; font-weight: 700; text-decoration: none; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1.0)'">
                <span>${cta.label}</span>
                ${cta.icon ? `<span style="width: 20px; height: 20px; border-radius: 50%; background: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; font-size: 9px;">${cta.icon}</span>` : ''}
              </a>
            ` : ''}
          </div>

          ${bottomLabel ? `<div style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-primary, #007aff); margin-top: 32px;">${bottomLabel}</div>` : ''}
        </div>

        <!-- Column 2: Surface Media Frame -->
        <div style="background: var(--card-bg, var(--color-surface, #ffffff)); border: var(--card-border, 1px solid var(--color-border, rgba(0,0,0,0.08))); border-radius: var(--card-radius, 16px); aspect-ratio: 1/1; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 16px; direction: ltr;">
          <img src="${image}" alt="${headline}" style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit; display: block;" />
        </div>

      </div>
    </section>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. GRID PRIMITIVE (Dynamic Multi-Item Responsive Matrix)
// ─────────────────────────────────────────────────────────────────────────────
export function renderGrid(node: UINode, tokens?: DesignTokens): string {
  const c = node.contract || {};
  const p = node.props || {};
  const cssVars = buildStyleCssVars(c, tokens);

  const title = p.title || p.headline || 'Featured Collection';
  const subtitle = p.subtitle || p.description || '';
  const items = Array.isArray(p.items) && p.items.length > 0 ? p.items : [
    { title: 'Item 01', price: 29, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=800&fit=crop' },
    { title: 'Item 02', price: 39, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=800&fit=crop' },
    { title: 'Item 03', price: 49, image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=800&fit=crop' },
  ];

  const cardRadius = c.card_radius || (tokens?.radii as any)?.card || tokens?.radii?.sm || '8px';
  const cardBg = c.card_bg || 'var(--color-surface, #ffffff)';
  const cardBorder = c.card_border || '1px solid var(--color-border, rgba(0,0,0,0.08))';

  return `
    <section id="products" class="grid-section" style="${cssVars}; background: var(--section-bg, var(--color-background, transparent)); color: var(--color-text, #111827); padding: clamp(48px, 8vw, 80px) clamp(16px, 4vw, 32px); max-width: 1440px; margin: 0 auto; width: 100%;">
      
      ${title ? `
        <div style="text-align: center; margin-bottom: clamp(32px, 5vw, 56px);">
          <h2 style="font-family: var(--font-heading, sans-serif); font-size: clamp(28px, 4.5vw, 56px); font-weight: 800; line-height: 1.0; color: var(--color-text, #111827); text-transform: uppercase; margin-bottom: 12px; letter-spacing: -0.015em;">${title}</h2>
          ${subtitle ? `<p style="font-family: var(--font-body, sans-serif); color: var(--color-muted, #6b7280); font-size: clamp(13px, 1.5vw, 15px); max-width: 640px; margin: 0 auto; line-height: 1.5;">${subtitle}</p>` : ''}
        </div>
      ` : ''}

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: clamp(16px, 3vw, 24px);">
        ${items.map((item: any) => {
          const itemTitle = item.title || item.name || 'Featured Item';
          const itemBadge = item.badge || '';
          const itemPrice = item.price !== undefined ? (typeof item.price === 'number' ? `$${item.price}` : item.price) : '';
          const itemSub = item.subtitle || item.sub || '';
          const itemDesc = item.description || item.text || item.desc || '';
          const itemImg = item.image || item.img || '';

          return `
            <div style="background: ${cardBg}; border: ${cardBorder}; border-radius: ${cardRadius}; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.3s ease, border-color 0.3s ease;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
              <div>
                ${itemBadge ? `<span style="display: inline-block; background: var(--color-primary, #007aff); color: #ffffff; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; margin-bottom: 14px;">${itemBadge}</span>` : ''}
                
                ${itemImg ? `
                  <div style="aspect-ratio: 4/3; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border-radius: var(--radius-sm, 4px); background: rgba(0,0,0,0.03);">
                    <img src="${itemImg}" alt="${itemTitle}" style="max-height: 100%; width: 100%; object-fit: cover; transition: transform 0.3s ease;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1.0)'" />
                  </div>
                ` : ''}

                <div>
                  <h3 style="font-family: var(--font-heading, sans-serif); font-size: 20px; font-weight: 700; color: var(--color-text, #111827); text-transform: uppercase; margin-bottom: 4px;">${itemTitle}</h3>
                  ${itemSub ? `<div style="font-size: 11px; font-weight: 700; color: var(--color-muted, #6b7280); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px;">${itemSub}</div>` : ''}
                  ${itemDesc ? `<p style="font-family: var(--font-body, sans-serif); font-size: 13px; color: var(--color-muted, #6b7280); line-height: 1.45; margin-bottom: 16px;">${itemDesc}</p>` : ''}
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid var(--color-border, rgba(0,0,0,0.08));">
                ${itemPrice ? `<span style="font-family: var(--font-heading, sans-serif); font-size: 18px; font-weight: 700; color: var(--color-text, #111827);">${itemPrice}</span>` : '<span></span>'}
                <a href="#order" style="background: var(--color-primary, #007aff); color: #ffffff; padding: 8px 18px; border-radius: 9999px; font-weight: 700; font-size: 11px; text-transform: uppercase; text-decoration: none; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">${item.ctaText || 'VIEW DETAILS'}</a>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. RAIL / MARQUEE PRIMITIVE (Horizontal Continuous Scroll & Infinite Ticker)
// ─────────────────────────────────────────────────────────────────────────────
export function renderRail(node: UINode, tokens?: DesignTokens): string {
  const c = node.contract || {};
  const p = node.props || {};
  const cssVars = buildStyleCssVars(c, tokens);

  const text = p.text || (Array.isArray(p.items) ? p.items.map((i: any) => typeof i === 'string' ? i : (i.title || i.name)).join(' · ') : 'ANNOUNCEMENT · EXCLUSIVE LIVE UPDATES');
  const speed = c.speed || '25s';
  const bg = c.bg || 'var(--section-bg, var(--color-primary, #111827))';
  const textColor = c.text_color || c.color || 'var(--section-text, #ffffff)';

  return `
    <div class="marquee-rail" style="${cssVars}; background: ${bg}; color: ${textColor}; padding: 10px 16px; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; overflow: hidden; white-space: nowrap; border-bottom: 1px solid var(--color-border, rgba(0,0,0,0.1));">
      <div style="display: inline-block; animation: marquee-scroll ${speed} linear infinite;">
        ${text} · ${text} · ${text} · ${text}
      </div>
      <style>
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      </style>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ACCORDION PRIMITIVE (Collapsible Sequential Disclosure Rows)
// ─────────────────────────────────────────────────────────────────────────────
export function renderAccordion(node: UINode, tokens?: DesignTokens): string {
  const c = node.contract || {};
  const p = node.props || {};
  const cssVars = buildStyleCssVars(c, tokens);

  const title = p.title || 'Frequently Asked Questions';
  const items = Array.isArray(p.items) ? p.items : [
    { question: 'What are the delivery terms?', answer: 'We offer fast delivery on all domestic and global orders.' },
    { question: 'How can I reach support?', answer: 'Our dedicated team is available 24/7 via WhatsApp and email.' },
  ];

  return `
    <section class="accordion-section" style="${cssVars}; background: var(--section-bg, var(--color-background, transparent)); color: var(--color-text, #111827); padding: clamp(48px, 8vw, 80px) clamp(16px, 4vw, 32px); max-width: 960px; margin: 0 auto; width: 100%;">
      ${title ? `<h2 style="font-family: var(--font-heading, sans-serif); font-size: clamp(28px, 4vw, 48px); font-weight: 800; color: var(--color-text, #111827); text-align: center; margin-bottom: 36px; text-transform: uppercase;">${title}</h2>` : ''}

      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${items.map((item: any, idx: number) => `
          <details style="background: var(--card-bg, var(--color-surface, #ffffff)); border: 1px solid var(--color-border, rgba(0,0,0,0.08)); border-radius: 8px; padding: 18px 24px; cursor: pointer;">
            <summary style="font-family: var(--font-heading, sans-serif); font-size: 17px; font-weight: 700; color: var(--color-text, #111827); display: flex; justify-content: space-between; align-items: center; list-style: none;">
              <span>${item.question || item.title || `Question ${idx + 1}`}</span>
              <span style="font-size: 18px; font-weight: 400; opacity: 0.7;">+</span>
            </summary>
            <div style="font-family: var(--font-body, sans-serif); font-size: 14px; line-height: 1.6; color: var(--color-muted, #6b7280); margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--color-border, rgba(0,0,0,0.08));">
              ${item.answer || item.text || item.description}
            </div>
          </details>
        `).join('')}
      </div>
    </section>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Universal Navigation Header
// ─────────────────────────────────────────────────────────────────────────────
export function renderHeaderNav(node: UINode, tokens?: DesignTokens): string {
  const c = node.contract || {};
  const p = node.props || {};
  const cssVars = buildStyleCssVars(c, tokens);

  const brand = (p.brand_name || p.title || p.name || tokens?.name || 'Store').replace(/\.$/, '');
  const links = Array.isArray(p.nav_links) ? p.nav_links : Array.isArray(p.links) ? p.links : [
    { label: 'Shop', url: '#products' },
    { label: 'About', url: '#about' },
  ];

  const ctaText = p.cta_label || p.ctaText || 'Get Started';
  const isSticky = c.sticky !== false;
  const positionStyle = isSticky ? 'position: sticky; top: 0; z-index: 100;' : 'position: relative;';

  return `
    <header class="header-nav" style="${cssVars}; ${positionStyle} background: var(--section-bg, var(--color-background, rgba(255,255,255,0.95))); backdrop-filter: blur(12px); border-bottom: 1px solid var(--color-border, rgba(0,0,0,0.08)); padding: 16px clamp(16px, 4vw, 40px); display: flex; justify-content: space-between; align-items: center; gap: 16px;">
      <div class="nav-links" style="display: flex; gap: 10px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; flex-wrap: wrap;">
        ${links.map((l: any) => {
          const text = typeof l === 'string' ? l : (l.label || l.name || l.title || l.text || 'Link');
          const href = typeof l === 'string' ? `#${l.toLowerCase()}` : (l.url || l.href || '#');
          return `<a href="${href}" style="display: inline-flex; align-items: center; padding: 6px 14px; border: 1px solid var(--color-border, rgba(0,0,0,0.15)); border-radius: 9999px; text-decoration: none; color: var(--color-text, #111827); transition: opacity 0.2s;" onmouseover="this.style.opacity='0.6'" onmouseout="this.style.opacity='1'">${text}</a>`;
        }).join('')}
      </div>

      <a href="/" style="font-family: var(--font-heading, sans-serif); font-size: clamp(20px, 3vw, 30px); font-weight: 800; color: var(--color-primary, var(--color-text, #111827)); text-decoration: none; letter-spacing: -0.02em; text-transform: uppercase;">
        ${brand}
      </a>

      <div class="header-cta">
        <a href="#cta" style="background: var(--color-primary, #007aff); color: #ffffff; padding: 9px clamp(16px, 2vw, 24px); border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
          ${ctaText}
        </a>
      </div>
    </header>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Universal Footer Strip
// ─────────────────────────────────────────────────────────────────────────────
export function renderFooterStrip(node: UINode, tokens?: DesignTokens): string {
  const c = node.contract || {};
  const p = node.props || {};
  const cssVars = buildStyleCssVars(c, tokens);
  const brand = p.brand_name || tokens?.name || 'Store';

  return `
    <footer class="footer-strip" style="${cssVars}; background: var(--section-bg, var(--color-surface, #111827)); color: var(--color-text, #ffffff); border-top: 1px solid var(--color-border, rgba(0,0,0,0.1)); padding: clamp(40px, 6vw, 64px) clamp(16px, 4vw, 40px); font-size: 13px;">
      <div style="max-width: 1340px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
        <div>
          <h4 style="font-family: var(--font-heading, sans-serif); font-size: 20px; font-weight: 700; color: var(--color-primary, #007aff); text-transform: uppercase; margin-bottom: 4px;">${brand}</h4>
          <p style="color: var(--color-muted, #9ca3af); font-size: 12px;">${p.text || `© 2026 ${brand}. All Rights Reserved.`}</p>
        </div>
        <div style="display: flex; gap: clamp(14px, 2.5vw, 24px); font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--color-muted, #9ca3af); flex-wrap: wrap;">
          <a href="#privacy" style="text-decoration: none; color: inherit;">Privacy</a>
          <a href="#terms" style="text-decoration: none; color: inherit;">Terms</a>
          <a href="#contact" style="text-decoration: none; color: inherit;">Contact</a>
        </div>
      </div>
    </footer>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Universal Section Divider
// ─────────────────────────────────────────────────────────────────────────────
export function renderDividerStrip(node: UINode, tokens?: DesignTokens): string {
  const c = node.contract || {};
  const cssVars = buildStyleCssVars(c, tokens);
  const borderStyle = c.border_style || 'solid';
  const borderColor = c.border_color || 'var(--color-border, rgba(0,0,0,0.1))';
  const borderWidth = c.border_width || '1px';

  return `
    <div class="section-divider" style="${cssVars}; width: 100%; border-bottom: ${borderWidth} ${borderStyle} ${borderColor}; margin: 0; opacity: 0.85;"></div>
  `;
}
