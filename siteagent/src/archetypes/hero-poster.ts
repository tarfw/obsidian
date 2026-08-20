import { SectionBlock } from '../types';

export function renderHeroPoster(section: SectionBlock): string {
  const d = section.data;
  const headline = d.headline || d.title || 'FLAVOUR BEYOND BOUNDARIES';
  const lead = d.lead || d.desc || 'Small batch formulations crafted with wild heirlooms and organic botanicals.';
  const ctaPrimary = d.cta_primary || { label: 'Shop The Collection', link: '#products' };
  const ctaSecondary = d.cta_secondary || { label: 'Our Story', link: '#story' };
  const image = d.image || d.media || '';

  return `
<section class="tar-hero-poster" style="padding: calc(var(--section-gap) * 0.8) 0 var(--section-gap); text-align: center; position: relative; overflow: hidden;">
  <div class="tar-container" style="display: flex; flex-direction: column; align-items: center;">
    ${d.badge ? `<div class="tar-badge" style="margin-bottom: 24px;">${d.badge}</div>` : ''}
    
    <!-- Ultra-Display Headline -->
    <h1 style="font-family: var(--font-heading); font-size: var(--text-display); font-weight: 700; line-height: 0.95; text-transform: var(--heading-transform, none); letter-spacing: var(--heading-letter-spacing, -0.02em); max-width: 1100px; margin-bottom: 24px; text-wrap: balance;">
      ${headline}
    </h1>

    <!-- Lead Paragraph -->
    <p style="font-size: var(--text-subheading); color: var(--color-text-muted); max-width: 680px; margin-bottom: 36px; line-height: 1.6;">
      ${lead}
    </p>

    <!-- CTAs -->
    <div style="display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap; margin-bottom: 48px;">
      <a href="${ctaPrimary.link || '#products'}" class="tar-btn-primary">${ctaPrimary.label || ctaPrimary}</a>
      ${ctaSecondary ? `<a href="${ctaSecondary.link || '#story'}" class="tar-btn-secondary">${ctaSecondary.label || ctaSecondary}</a>` : ''}
    </div>

    <!-- Floating Product Hero Image -->
    ${image ? `
    <div style="width: 100%; max-width: 960px; margin-top: 16px;">
      <img src="${image}" alt="${headline}" style="width: 100%; height: auto; object-fit: contain; filter: drop-shadow(0 20px 40px rgba(0,0,0,0.25));" />
    </div>` : ''}
  </div>
</section>
`;
}
