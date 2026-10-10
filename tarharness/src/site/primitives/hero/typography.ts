import type { Section } from '../../document.ts';
import { escapeAttribute, escapeHtml, safeHref } from '../../html.ts';
import type { RenderContext } from '../nodes.ts';
import { styleClass } from '../../styles.ts';

export function render(section: Section, context: RenderContext): string {
  const doc = context.doc;
  const style = styleClass(context.collector, section.style);
  const id = escapeAttribute(section.id || 'hero');

  let headline = doc.pages[0]?.title || '';
  let subline = doc.brief?.goal || '';
  let catalogHref = '#catalog';

  for (const node of section.nodes || []) {
    if (node.kind === 'heading' && node.props?.text) headline = String(node.props.text);
    else if (node.kind === 'text' && node.props?.text) subline = String(node.props.text);
    else if (node.kind === 'button' && node.props?.href) catalogHref = safeHref(node.props.href) || '#catalog';
  }

  const actionsHtml = `<div class="tar-hero-actions"><a href="${escapeAttribute(catalogHref)}" class="tar-btn tar-btn-outline">View Collection</a></div>`;

  return `<section id="${id}" class="tar-hero tar-hero-typography${style}" data-purpose="hero">
  <div class="tar-hero-inner">
    <div class="tar-hero-text">
      <h1 class="tar-hero-title">${escapeHtml(headline)}</h1>
      ${subline ? `<p class="tar-hero-desc">${escapeHtml(subline)}</p>` : ''}
      ${actionsHtml}
    </div>
  </div>
</section>`;
}
