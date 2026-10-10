import type { Section } from '../../document.ts';
import { escapeHtml } from '../../html.ts';
import type { RenderContext } from '../nodes.ts';
import { styleClass } from '../../styles.ts';

export function render(section: Section, context: RenderContext): string {
  const style = styleClass(context.collector, section.style);
  const textNode = section.nodes?.find((n) => n.kind === 'text');
  const noticeText = String(textNode?.props?.text || 'Are personalized probiotics right for you? Take the quiz.');

  return `<aside id="${section.id || 'notice'}" class="tar-notice tar-notice-quiz${style}" role="region" data-purpose="notice">
  <div class="tar-wrap tar-notice-inner">
    <a href="#quiz" class="tar-notice-quiz-link">
      <span>${escapeHtml(noticeText)}</span>
      <span class="tar-notice-arrow-pill">➔</span>
    </a>
  </div>
</aside>`;
}
