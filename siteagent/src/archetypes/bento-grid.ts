import { SectionBlock } from '../types';

export function renderBentoGrid(section: SectionBlock): string {
  const cards: any[] = Array.isArray(section.data.cards)
    ? section.data.cards
    : Array.isArray(section.data)
      ? section.data
      : [];

  const cardsHtml = cards.map((c, idx) => {
    const isSpan2 = c.span === 2 || (idx === 0 && cards.length % 2 !== 0);
    return `
    <div class="tar-card ${isSpan2 ? 'tar-bento-card-span2' : ''}" style="${isSpan2 ? 'grid-column: span 2;' : ''} display: flex; flex-direction: column; justify-content: space-between; min-height: 180px;">
      <div>
        ${c.badge ? `<div class="tar-badge" style="margin-bottom: 12px;">${c.badge}</div>` : ''}
        <h3 style="font-family: var(--font-heading); font-size: var(--text-subheading); font-weight: 600; margin-bottom: 8px;">
          ${c.title || ''}
        </h3>
        <p style="font-size: var(--text-body); color: var(--color-text-muted); line-height: 1.5;">
          ${c.desc || c.description || ''}
        </p>
      </div>
      ${c.stat ? `<div style="font-family: var(--font-heading); font-size: var(--text-heading-sm); font-weight: 700; color: var(--color-primary); margin-top: 16px;">${c.stat}</div>` : ''}
    </div>
    `;
  }).join('');

  return `
<section class="tar-bento" style="padding: var(--section-gap) 0;">
  <div class="tar-container">
    ${section.data.title ? `
    <div style="text-align: center; margin-bottom: 40px;">
      <h2 style="font-family: var(--font-heading); font-size: var(--text-heading); font-weight: 700;">${section.data.title}</h2>
      ${section.data.subtitle ? `<p style="color: var(--color-text-muted); font-size: var(--text-body); margin-top: 8px;">${section.data.subtitle}</p>` : ''}
    </div>` : ''}

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 20px;">
      ${cardsHtml}
    </div>
  </div>
</section>
`;
}
