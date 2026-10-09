/**
 * Hero Engine Primitive:
 * Compiles Split 50/50 (#4), Commerce Hero (#16), Seasonal Festive (#17),
 * Typography Hero (#24), Media Hero (#25), and Minimal Hero (#26).
 */

import { escapeAttribute, escapeHtml } from '../html.ts';

export interface HeroProps {
  pattern: 'split' | 'commerce' | 'seasonal' | 'typography' | 'minimal' | 'fullbleed';
  eyebrow?: string;
  title: string;
  subtitle?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  imageSrc?: string;
  imageAlt?: string;
  price?: string;
}

export function renderHeroPrimitive(props: HeroProps): string {
  const eyebrowHtml = props.eyebrow ? `<span class="tar-eyebrow">${escapeHtml(props.eyebrow)}</span>` : '';
  const subtitleHtml = props.subtitle ? `<p class="tar-lead">${escapeHtml(props.subtitle)}</p>` : '';
  const primaryHref = escapeAttribute(props.primaryCta?.href || '#catalog');
  const primaryText = escapeHtml(props.primaryCta?.label || 'Explore Collection');
  const secondaryBtn = props.secondaryCta ? `<a href="${escapeAttribute(props.secondaryCta.href)}" class="tar-btn tar-btn-secondary">${escapeHtml(props.secondaryCta.label)}</a>` : '';

  if (props.pattern === 'typography') {
    return `<section class="tar-hero tar-hero-typography" data-purpose="hero" style="min-height:75vh">
  <div class="tar-wrap tar-hero-inner tar-hero-typography-inner">
    ${eyebrowHtml}
    <h1 class="tar-hero-statement">${escapeHtml(props.title)}</h1>
    ${subtitleHtml}
    <div class="tar-actions">
      <a href="${primaryHref}" class="tar-btn tar-btn-primary">${primaryText}</a>
      ${secondaryBtn}
    </div>
  </div>
</section>`;
  }

  if (props.pattern === 'commerce') {
    const pricePill = props.price ? `<span class="tar-price-pill">${escapeHtml(props.price)}</span>` : '';
    return `<section class="tar-hero tar-hero-commerce" data-purpose="hero" style="min-height:75vh">
  <div class="tar-wrap tar-hero-inner tar-hero-grid">
    <div class="tar-hero-content">
      ${eyebrowHtml}
      <h1>${escapeHtml(props.title)}</h1>
      ${subtitleHtml}
      <div class="tar-hero-price-row">
        ${pricePill}
        <a href="${primaryHref}" class="tar-btn tar-btn-primary">${primaryText}</a>
      </div>
    </div>
    <div class="tar-hero-media">
      ${props.imageSrc ? `<img class="tar-hero-img" src="${escapeAttribute(props.imageSrc)}" alt="${escapeAttribute(props.imageAlt || props.title)}" loading="eager" />` : '<div class="tar-card-media-placeholder"><span>Special Edition</span></div>'}
    </div>
  </div>
</section>`;
  }

  // Default: Split 50/50 (#4) or Seasonal (#17)
  return `<section class="tar-hero tar-hero-split" data-purpose="hero" style="min-height:75vh">
  <div class="tar-wrap tar-hero-inner tar-hero-grid">
    <div class="tar-hero-content">
      ${eyebrowHtml}
      <h1>${escapeHtml(props.title)}</h1>
      ${subtitleHtml}
      <div class="tar-actions">
        <a href="${primaryHref}" class="tar-btn tar-btn-primary">${primaryText}</a>
        ${secondaryBtn}
      </div>
    </div>
    <div class="tar-hero-media">
      ${props.imageSrc ? `<img class="tar-hero-img" src="${escapeAttribute(props.imageSrc)}" alt="${escapeAttribute(props.imageAlt || props.title)}" loading="eager" />` : '<div class="tar-card-media-placeholder"><span>Heritage Collection</span></div>'}
    </div>
  </div>
</section>`;
}
