import type { Section } from '../../document.ts';
import { escapeAttribute, escapeHtml, safeHref } from '../../html.ts';
import type { RenderContext } from '../nodes.ts';
import { styleClass } from '../../styles.ts';
import { EXT } from '../hero.ts';

export function render(section: Section, context: RenderContext): string {
  const doc = context.doc;
  const style = styleClass(context.collector, section.style);
  const id = escapeAttribute(section.id || 'hero');

  let headline = doc.pages[0]?.title || '';
  let subline = doc.brief?.goal || '';
  let catalogHref = '#catalog';
  let imgSrc = '';
  let imgAlt = '';

  for (const node of section.nodes || []) {
    if (node.kind === 'heading' && node.props?.text) headline = String(node.props.text);
    else if (node.kind === 'text' && node.props?.text) subline = String(node.props.text);
    else if (node.kind === 'button' && node.props?.href) catalogHref = safeHref(node.props.href) || '#catalog';
    else if (node.kind === 'image' && node.props?.asset) {
      const asset = doc.assets.find((a) => a.id === node.props?.asset);
      if (asset) {
        imgSrc = `/media/${asset.id}.${EXT[asset.mime] || 'jpg'}`;
        imgAlt = node.props.alt !== undefined ? String(node.props.alt) : (asset.alt || '');
      }
    }
  }

  const altText = imgAlt || headline;
  const actionsHtml = `<div class="tar-hero-actions"><a href="${escapeAttribute(catalogHref)}" class="tar-btn tar-btn-outline">View Collection</a></div>`;

  return `<section id="${id}" class="tar-hero tar-hero-commerce${style}" data-purpose="hero">
  <div class="tar-hero-inner">
    <div class="tar-hero-grid">
      <div class="tar-hero-text">
        <span class="tar-hero-eyebrow">Featured Product</span>
        <h1 class="tar-hero-title">${escapeHtml(headline)}</h1>
        ${subline ? `<p class="tar-hero-desc">${escapeHtml(subline)}</p>` : ''}
        ${actionsHtml}
      </div>
      <div class="tar-hero-spotlight-card">
        ${imgSrc ? `<img class="tar-hero-spotlight-img" src="${escapeAttribute(imgSrc)}" alt="${escapeAttribute(altText)}">` : '<div class="tar-hero-placeholder"><div class="tar-brand-mark">★</div></div>'}
        <div class="tar-hero-spotlight-meta">
          <span class="tar-hero-spotlight-title">${escapeHtml(headline)}</span>
          <span class="tar-card-badge">Featured</span>
        </div>
      </div>
    </div>
  </div>
</section>`;
}
