import { SectionBlock } from '../types';

export function renderTrustBar(section: SectionBlock): string {
  const badges: string[] = Array.isArray(section.data.badges)
    ? section.data.badges
    : Array.isArray(section.data)
      ? section.data
      : ['100% Organic Heirlooms', 'Carbon Neutral Delivery', 'Zero Artificial Additives', '30-Day Guarantee'];

  const badgesHtml = badges.map(b => `
    <div style="display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600;">
      <span style="color: var(--color-primary); font-size: 18px;">✓</span>
      <span>${b}</span>
    </div>
  `).join('');

  return `
<section class="tar-trust-bar" style="padding: 32px 0; border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); background-color: var(--color-surface-alt);">
  <div class="tar-container" style="display: flex; justify-content: space-around; align-items: center; gap: 24px; flex-wrap: wrap;">
    ${badgesHtml}
  </div>
</section>
`;
}
