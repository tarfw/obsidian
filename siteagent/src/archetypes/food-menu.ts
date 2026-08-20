import { SectionBlock } from '../types';

export function renderFoodMenu(section: SectionBlock): string {
  const d = section.data;
  const items: any[] = Array.isArray(d.items) ? d.items : Array.isArray(d) ? d : [];

  const itemsHtml = items.map(item => `
    <div style="display: flex; justify-content: space-between; align-items: baseline; padding: 16px 0; border-bottom: 1px dashed var(--color-border);">
      <div style="max-width: 75%;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-family: var(--font-heading); font-size: 17px; font-weight: 600;">${item.item || item.title || ''}</span>
          ${item.tag ? `<span class="tar-badge" style="font-size: 10px; padding: 1px 6px;">${item.tag}</span>` : ''}
        </div>
        ${item.desc ? `<p style="font-size: 13px; color: var(--color-text-muted); margin-top: 4px;">${item.desc}</p>` : ''}
      </div>
      <div style="font-family: var(--font-heading); font-weight: 700; font-size: 16px; color: var(--color-primary);">
        ${item.price || ''}
      </div>
    </div>
  `).join('');

  return `
<section class="tar-food-menu" style="padding: var(--section-gap) 0;">
  <div class="tar-container" style="max-width: 860px;">
    <div style="text-align: center; margin-bottom: 36px;">
      <h2 style="font-family: var(--font-heading); font-size: var(--text-heading); font-weight: 700;">
        ${d.category || d.title || 'Menu & Small Plates'}
      </h2>
      ${d.subtitle ? `<p style="color: var(--color-text-muted); margin-top: 8px;">${d.subtitle}</p>` : ''}
    </div>

    <div style="display: flex; flex-direction: column;">
      ${itemsHtml}
    </div>
  </div>
</section>
`;
}
