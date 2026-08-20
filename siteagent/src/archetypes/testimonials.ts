import { SectionBlock } from '../types';

export function renderTestimonials(section: SectionBlock): string {
  const quotes: any[] = Array.isArray(section.data.quotes)
    ? section.data.quotes
    : Array.isArray(section.data)
      ? section.data
      : [];

  const cardsHtml = quotes.map(q => {
    const stars = '★'.repeat(q.rating || 5);
    return `
    <div class="tar-card" style="display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="color: var(--color-primary); margin-bottom: 12px; font-size: 16px; letter-spacing: 2px;">${stars}</div>
        <p style="font-size: var(--text-body); line-height: 1.6; margin-bottom: 16px; font-style: italic;">"${q.quote || ''}"</p>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--color-border); padding-top: 12px; margin-top: 8px;">
        <span style="font-weight: 600; font-size: 14px;">${q.author || 'Verified Customer'}</span>
        <span class="tar-badge" style="font-size: 10px; padding: 2px 6px;">Verified Buyer</span>
      </div>
    </div>
    `;
  }).join('');

  return `
<section class="tar-testimonials" style="padding: var(--section-gap) 0;">
  <div class="tar-container">
    <div style="text-align: center; margin-bottom: 40px;">
      <h2 style="font-family: var(--font-heading); font-size: var(--text-heading); font-weight: 700;">
        ${section.data.title || 'Community & Press Reviews'}
      </h2>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
      ${cardsHtml}
    </div>
  </div>
</section>
`;
}
