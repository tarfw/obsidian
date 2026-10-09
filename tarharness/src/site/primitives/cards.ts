/**
 * Cards Engine Primitive:
 * Compiles Value Propositions (#20), Brand Story (#23), Customer Reviews (#28),
 * Testimonials (#29), Features Grid (#40), and Store Location (#42).
 */

import { escapeHtml } from '../html.ts';

export interface CardItem {
  icon?: string;
  title: string;
  description: string;
  meta?: string;
}

export interface CardsProps {
  id?: string;
  kind?: 'story' | 'reviews' | 'features' | 'location';
  title: string;
  subtitle?: string;
  cards: CardItem[];
  columns?: 2 | 3 | 4;
}

export function renderCardsPrimitive(props: CardsProps): string {
  const sectionId = props.id || props.kind || 'features';
  const columns = props.columns || 3;

  const cardsHtml = props.cards.map((card) => {
    return `<div class="tar-info-card">
  ${card.icon ? `<div class="tar-card-icon">${escapeHtml(card.icon)}</div>` : ''}
  <h3 class="tar-info-title">${escapeHtml(card.title)}</h3>
  <p class="tar-info-desc">${escapeHtml(card.description)}</p>
  ${card.meta ? `<span class="tar-info-meta">${escapeHtml(card.meta)}</span>` : ''}
</div>`;
  }).join('\n');

  return `<section id="${sectionId}" class="tar-section tar-cards-section" data-purpose="${sectionId}">
  <div class="tar-wrap">
    <div class="tar-section-header">
      <h2 class="tar-section-title">${escapeHtml(props.title)}</h2>
      ${props.subtitle ? `<p class="tar-section-sub">${escapeHtml(props.subtitle)}</p>` : ''}
    </div>
    <div class="tar-grid tar-grid-cols-${columns}">
      ${cardsHtml}
    </div>
  </div>
</section>`;
}
