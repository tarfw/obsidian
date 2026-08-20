import { SectionBlock } from '../types';

export function renderCustomSlot(section: SectionBlock): string {
  const rawHtml = section.data.html || section.data.rawText || section.rawYaml || '';

  return `
<section class="tar-custom-slot" style="padding: var(--section-gap) 0;">
  <div class="tar-container">
    ${rawHtml}
  </div>
</section>
`;
}
