/**
 * Accordion Engine Primitive:
 * Compiles Frequently Asked Questions (#37), Shipping Policy (#58),
 * Return Policy (#61), Size Guide (#62), and Care Guide (#63).
 */

import { escapeHtml } from '../html.ts';

export interface AccordionItem {
  question: string;
  answer: string;
}

export interface AccordionProps {
  id?: string;
  title: string;
  subtitle?: string;
  items: AccordionItem[];
}

export function renderAccordionPrimitive(props: AccordionProps): string {
  const sectionId = props.id || 'faq';

  const itemsHtml = props.items.map((item, idx) => {
    return `<details class="tar-accordion-item" ${idx === 0 ? 'open' : ''}>
  <summary class="tar-accordion-summary">
    <span>${escapeHtml(item.question)}</span>
    <span class="tar-accordion-icon" aria-hidden="true">+</span>
  </summary>
  <div class="tar-accordion-content">
    <p>${escapeHtml(item.answer)}</p>
  </div>
</details>`;
  }).join('\n');

  return `<section id="${sectionId}" class="tar-section tar-accordion-section" data-purpose="faq">
  <div class="tar-wrap tar-accordion-wrap">
    <div class="tar-section-header">
      <h2 class="tar-section-title">${escapeHtml(props.title)}</h2>
      ${props.subtitle ? `<p class="tar-section-sub">${escapeHtml(props.subtitle)}</p>` : ''}
    </div>
    <div class="tar-accordion-list">
      ${itemsHtml}
    </div>
  </div>
</section>`;
}
