import { SectionBlock } from '../types';

export function renderAccordionFaq(section: SectionBlock): string {
  const questions: any[] = Array.isArray(section.data.questions)
    ? section.data.questions
    : Array.isArray(section.data)
      ? section.data
      : [];

  const itemsHtml = questions.map(q => `
    <details class="tar-faq-item" style="border: 1px solid var(--color-border); border-radius: var(--radius-cards); padding: 18px 24px; background-color: var(--color-surface); cursor: pointer; transition: background-color 0.2s ease;">
      <summary style="font-family: var(--font-heading); font-size: var(--text-subheading); font-weight: 600; list-style: none; display: flex; justify-content: space-between; align-items: center;">
        <span>${q.q || q.question || ''}</span>
        <span style="font-size: 20px; font-weight: 300; transition: transform 0.2s ease;">+</span>
      </summary>
      <p style="font-size: var(--text-body); color: var(--color-text-muted); line-height: 1.6; margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--color-border);">
        ${q.a || q.answer || ''}
      </p>
    </details>
  `).join('');

  return `
<section id="faq" class="tar-faq" style="padding: var(--section-gap) 0;">
  <div class="tar-container" style="max-width: 820px;">
    <div style="text-align: center; margin-bottom: 40px;">
      <h2 style="font-family: var(--font-heading); font-size: var(--text-heading); font-weight: 700;">
        ${section.data.title || 'Frequently Asked Questions'}
      </h2>
    </div>

    <div style="display: flex; flex-direction: column; gap: 14px;">
      ${itemsHtml}
    </div>
  </div>
</section>
`;
}
