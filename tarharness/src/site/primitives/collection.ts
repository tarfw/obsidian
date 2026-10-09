/**
 * Collection Engine Primitive:
 * Compiles Featured Products (#6), Product Catalog (#7), Categories (#8),
 * Product Showcase (#9), Best Sellers (#10), New Arrivals (#11), and Product Carousel (#18).
 */

import { escapeAttribute, escapeHtml } from '../html.ts';

export interface CollectionItem {
  id: string;
  title: string;
  price?: number;
  currency?: string;
  image?: string;
  badge?: string;
  description?: string;
}

export interface CollectionProps {
  id?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  items: CollectionItem[];
  phone?: string;
  columns?: 2 | 3 | 4;
}

export function renderCollectionPrimitive(props: CollectionProps): string {
  const sectionId = props.id || 'catalog';
  const columns = props.columns || 3;
  const currency = props.items[0]?.currency || '₹';
  const phone = props.phone || '';

  const cardsHtml = props.items.map((item) => {
    const formattedPrice = item.price !== undefined ? `${currency}${item.price.toLocaleString('en-IN')}` : '';
    const waText = encodeURIComponent(`Hi, I would like to order "${item.title}"`);
    const waLink = phone ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${waText}` : '#contact';

    const mediaHtml = item.image
      ? `<img class="tar-card-media" src="${escapeAttribute(item.image)}" alt="${escapeAttribute(item.title)}" loading="lazy" />`
      : `<div class="tar-card-media-placeholder"><span>${escapeHtml(item.title)}</span></div>`;

    const badgeHtml = item.badge ? `<span class="tar-card-badge">${escapeHtml(item.badge)}</span>` : '';

    return `<article class="tar-card tar-product-card" data-item-id="${escapeAttribute(item.id)}">
  <div class="tar-card-media-box">
    ${mediaHtml}
    ${badgeHtml}
  </div>
  <div class="tar-card-body">
    <h3 class="tar-card-title">${escapeHtml(item.title)}</h3>
    ${item.description ? `<p class="tar-card-desc">${escapeHtml(item.description)}</p>` : ''}
    <div class="tar-card-footer">
      ${formattedPrice ? `<span class="tar-card-price">${escapeHtml(formattedPrice)}</span>` : ''}
    </div>
  </div>
</article>`;
  }).join('\n');

  return `<section id="${escapeAttribute(sectionId)}" class="tar-section tar-collection-section" data-purpose="catalog">
  <div class="tar-wrap">
    <div class="tar-section-header">
      ${props.badge ? `<span class="tar-section-kicker">${escapeHtml(props.badge)}</span>` : ''}
      <h2 class="tar-section-title">${escapeHtml(props.title)}</h2>
      ${props.subtitle ? `<p class="tar-section-sub">${escapeHtml(props.subtitle)}</p>` : ''}
    </div>
    <div class="tar-grid tar-grid-cols-${columns}">
      ${cardsHtml}
    </div>
  </div>
</section>`;
}
