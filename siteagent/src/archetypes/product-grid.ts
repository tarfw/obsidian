import { SectionBlock } from '../types';

export function renderProductGrid(section: SectionBlock): string {
  const items: any[] = Array.isArray(section.data.items)
    ? section.data.items
    : Array.isArray(section.data)
      ? section.data
      : [];

  const cardsHtml = items.map((item, idx) => {
    const title = item.title || `Product Item ${idx + 1}`;
    const price = item.price || '$18.00';
    const oldPrice = item.old_price ? `<span style="text-decoration: line-through; opacity: 0.5; margin-left: 8px; font-size: 0.9em;">${item.old_price}</span>` : '';
    const badge = item.badge ? `<span class="tar-badge" style="position: absolute; top: 16px; left: 16px; z-index: 2;">${item.badge}</span>` : '';
    const desc = item.desc || '';
    const image = item.image || '/assets/placeholder-product.png';

    return `
    <div class="tar-card" style="position: relative; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; padding: 20px;">
      ${badge}
      
      <!-- Product Image Container -->
      <div style="aspect-ratio: 1; width: 100%; border-radius: calc(var(--radius-cards) - 4px); overflow: hidden; background-color: var(--color-surface-alt); margin-bottom: 20px; display: flex; align-items: center; justify-content: center;">
        <img src="${image}" alt="${title}" style="width: 85%; height: 85%; object-fit: contain; transition: transform 0.4s ease;" loading="lazy" />
      </div>

      <!-- Info -->
      <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
            <h3 style="font-family: var(--font-heading); font-size: var(--text-subheading); font-weight: 600;">${title}</h3>
            <span style="font-family: var(--font-heading); font-weight: 700; color: var(--color-primary); font-size: var(--text-body);">${price}${oldPrice}</span>
          </div>
          ${desc ? `<p style="font-size: var(--text-caption); color: var(--color-text-muted); margin-bottom: 20px; line-height: 1.5;">${desc}</p>` : ''}
        </div>

        <!-- 1-Tap Add to Cart Button -->
        <button class="tar-btn-primary" style="width: 100%; font-size: 13px; padding: 10px 16px;" onclick="window.tarAddToCart({ id: '${idx}', title: '${title.replace(/'/g, "\\'")}', price: '${price}', image: '${image}' })">
          Quick Add +
        </button>
      </div>
    </div>
    `;
  }).join('');

  return `
<section id="products" class="tar-product-grid" style="padding: var(--section-gap) 0;">
  <div class="tar-container">
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; flex-wrap: wrap; gap: 16px;">
      <div>
        <h2 style="font-family: var(--font-heading); font-size: var(--text-heading); font-weight: 700; letter-spacing: -0.02em;">
          ${section.data.title || 'Selected Collection'}
        </h2>
        ${section.data.subtitle ? `<p style="color: var(--color-text-muted); font-size: var(--text-body); margin-top: 8px;">${section.data.subtitle}</p>` : ''}
      </div>
    </div>

    <!-- Responsive Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;">
      ${cardsHtml}
    </div>
  </div>
</section>
`;
}
