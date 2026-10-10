/**
 * Collection Engine Primitive:
 * Compiles Featured Products (#6), Product Catalog (#7), Categories (#8),
 * Product Showcase (#9), Best Sellers (#10), New Arrivals (#11), and Product Carousel (#18).
 */

import { escapeAttribute, escapeHtml, formatMoney } from '../html.ts';
import type { SiteDocument } from '../document.ts';

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

export function defaultSampleProducts(brand: string, phone?: string): (CollectionItem & { whatsapp?: string })[] {
  const cleanPhone = phone ? String(phone).replace(/[^0-9]/g, '') : '';
  const wa = (title: string) => cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${brand}, I want to order "${title}".`)}`
    : '#contact';

  return [
    {
      id: 'sample-1',
      title: 'Product 1',
      description: 'Handcrafted signature item made with premium materials.',
      price: 49900,
      currency: 'INR',
      badge: 'Best Seller',
      whatsapp: wa('Product 1'),
    },
    {
      id: 'sample-2',
      title: 'Product 2',
      description: 'Exclusive artisanal collection piece with authentic finish.',
      price: 79900,
      currency: 'INR',
      badge: 'Trending',
      whatsapp: wa('Product 2'),
    },
    {
      id: 'sample-3',
      title: 'Product 3',
      description: 'Popular everyday favourite verified for premium quality.',
      price: 129900,
      currency: 'INR',
      badge: 'Featured',
      whatsapp: wa('Product 3'),
    },
    {
      id: 'sample-4',
      title: 'Product 4',
      description: 'Limited edition seasonal release crafted to perfection.',
      price: 189900,
      currency: 'INR',
      whatsapp: wa('Product 4'),
    },
  ];
}

export function renderDefaultCatalogSection(doc: SiteDocument): string {
  const brand = doc.pages[0]?.title || 'Store';
  const sampleItems = defaultSampleProducts(brand);
  const cards = sampleItems.map((entry) => {
    const badge = entry.badge ? `<span class="tar-card-badge">${escapeHtml(entry.badge)}</span>` : '';
    const media = `<div class="tar-card-media tar-card-media-placeholder">${badge}<div class="tar-card-placeholder-box">${escapeHtml(entry.title.slice(0, 2).toUpperCase())}</div></div>`;
    const priceHtml = `<span class="tar-price">${formatMoney(entry.price!, 'INR', doc.locale)}</span>`;
    const descHtml = entry.description ? `<p class="tar-card-desc">${escapeHtml(entry.description)}</p>` : '';
    return `<div class="tar-collection-card" data-item="${escapeAttribute(entry.title.toLowerCase())}">
      <div class="tar-card tar-product-card">
        ${media}
        <div class="tar-card-meta">
          <strong class="tar-product-title">${escapeHtml(entry.title)}</strong>
          ${descHtml}
          <div class="tar-card-footer">
            ${priceHtml}
          </div>
        </div>
      </div>
    </div>`;
  }).join('\n');

  return `<section id="catalog" class="tar-section" data-purpose="catalog">
  <div class="tar-wrap tar-stack">
    <div class="tar-collection-header">
      <h2 class="tar-title tar-collection-title">Product Catalog</h2>
    </div>
    <div class="tar-grid tar-product-grid">
      ${cards}
    </div>
  </div>
</section>`;
}
