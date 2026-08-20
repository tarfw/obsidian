import { SectionBlock } from '../types';

export function renderHeroSplit(section: SectionBlock): string {
  const d = section.data;
  const headline = d.headline || d.title || 'ARCHITECTURAL APPAREL & GOODS';
  const lead = d.lead || d.desc || 'Formulated with organic materials and uncompromising precision.';
  const ctaPrimary = d.cta_primary || { label: 'Explore Shop', link: '#products' };
  const image = d.image || d.media || '';

  return `
<section class="tar-hero-split" style="padding: calc(var(--section-gap) * 0.8) 0 var(--section-gap);">
  <div class="tar-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 48px; align-items: center;">
    <!-- Content Column -->
    <div>
      ${d.badge ? `<div class="tar-badge" style="margin-bottom: 20px;">${d.badge}</div>` : ''}
      <h1 style="font-family: var(--font-heading); font-size: var(--text-heading-lg); font-weight: 700; line-height: 1.0; letter-spacing: -0.02em; margin-bottom: 20px;">
        ${headline}
      </h1>
      <p style="font-size: var(--text-body); color: var(--color-text-muted); line-height: 1.6; margin-bottom: 32px; max-width: 520px;">
        ${lead}
      </p>
      <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
        <a href="${ctaPrimary.link || '#products'}" class="tar-btn-primary">${ctaPrimary.label || ctaPrimary}</a>
        ${d.cta_secondary ? `<a href="${d.cta_secondary.link || '#story'}" class="tar-btn-secondary">${d.cta_secondary.label || d.cta_secondary}</a>` : ''}
      </div>
    </div>

    <!-- Media Column -->
    <div>
      ${image ? `
      <div style="border-radius: var(--radius-cards); overflow: hidden; border: 1px solid var(--color-border); box-shadow: var(--shadow-lg);">
        <img src="${image}" alt="${headline}" style="width: 100%; height: auto; display: block; object-fit: cover;" />
      </div>` : ''}
    </div>
  </div>
</section>
`;
}
