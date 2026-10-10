import type { Section } from '../../document.ts';
import { escapeHtml } from '../../html.ts';
import type { RenderContext } from '../nodes.ts';
import { styleClass } from '../../styles.ts';

export function render(section: Section, context: RenderContext): string {
  const style = styleClass(context.collector, section.style);
  const textNode = section.nodes?.find((n) => n.kind === 'text');
  const noticeText = String(textNode?.props?.text || 'Complimentary Shipping Across India • Handcrafted Authenticity Guaranteed');

  return `<aside id="${section.id || 'notice'}" class="tar-notice${style}" role="region" data-purpose="notice">
  <div class="tar-wrap tar-notice-inner">
    <span>${escapeHtml(noticeText)}</span>
  </div>
</aside>`;
}
