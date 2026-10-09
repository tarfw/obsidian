/**
 * Banner Engine Primitive:
 * Compiles Promotional Banner (#5), Sale / Offers (#12), Flash Sale (#13),
 * Countdown Ribbon (#41), Delivery Banner (#45), and Trust Badges (#46).
 */

import { escapeAttribute, escapeHtml } from '../html.ts';

export interface BannerProps {
  kind: 'promo' | 'flash' | 'trust_badges' | 'delivery';
  badge?: string;
  headline?: string;
  subtext?: string;
  ctaText?: string;
  ctaHref?: string;
  items?: string[];
}

export function renderBannerPrimitive(props: BannerProps): string {
  if (props.kind === 'trust_badges') {
    const badges = props.items || ['Silk Mark Certified', 'Direct Handloom Weaver', 'Cash on Delivery', 'Insured Dispatch'];
    const pills = badges.map((b) => `<div class="tar-trust-pill"><span class="tar-check-icon">✓</span> <span>${escapeHtml(b)}</span></div>`).join('');
    return `<section class="tar-banner tar-banner-trust" data-purpose="trust-badges">
  <div class="tar-wrap tar-trust-row">
    ${pills}
  </div>
</section>`;
  }

  const badgeHtml = props.badge ? `<span class="tar-banner-badge">${escapeHtml(props.badge)}</span>` : '';
  const ctaHtml = props.ctaText ? `<a href="${escapeAttribute(props.ctaHref || '#catalog')}" class="tar-btn tar-btn-sm tar-btn-banner">${escapeHtml(props.ctaText)}</a>` : '';

  return `<section class="tar-banner tar-banner-${props.kind}" data-purpose="banner">
  <div class="tar-wrap tar-banner-inner">
    <div class="tar-banner-text">
      ${badgeHtml}
      <h3 class="tar-banner-title">${escapeHtml(props.headline)}</h3>
      ${props.subtext ? `<p class="tar-banner-desc">${escapeHtml(props.subtext)}</p>` : ''}
    </div>
    ${ctaHtml}
  </div>
</section>`;
}
