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

  for (const node of section.nodes || []) {
    if (node.kind === 'heading' && node.props?.text) headline = String(node.props.text);
    else if (node.kind === 'text' && node.props?.text) subline = String(node.props.text);
    else if (node.kind === 'button' && node.props?.href) catalogHref = safeHref(node.props.href) || '#catalog';
    else if (node.kind === 'image' && node.props?.asset) {
      const asset = doc.assets.find((a) => a.id === node.props?.asset);
      if (asset) imgSrc = `/media/${asset.id}.${EXT[asset.mime] || 'jpg'}`;
    }
  }

  if (!imgSrc) {
    const firstImgAsset = doc.assets.find((a) => a.kind === 'image');
    if (firstImgAsset) imgSrc = `/media/${firstImgAsset.id}.${EXT[firstImgAsset.mime] || 'jpg'}`;
  }

  const bgStyle = imgSrc
    ? ` style="background-image:url('${escapeAttribute(imgSrc)}');background-size:cover;background-position:center top;"`
    : '';

  const canisterHtml = `<div class="tar-canister-mockup"><div class="tar-canister-cap"></div><div class="tar-canister-jar"></div></div>`;

  return `<section id="${id}" class="tar-hero tar-hero-centered-atmospheric${style}" data-purpose="hero"${bgStyle}>
  <div class="tar-wrap tar-hero-centered-wrap">
    <h1 class="tar-hero-centered-title">${escapeHtml(headline)}</h1>
    ${subline ? `<p class="tar-hero-centered-desc">${escapeHtml(subline)}</p>` : ''}
    <div class="tar-hero-centered-actions">
      <a href="${escapeAttribute(catalogHref)}" class="tar-hero-pill-btn">Get Started</a>
    </div>
    <div class="tar-hero-canister-peek">
      ${canisterHtml}
    </div>
  </div>
</section>`;
}
