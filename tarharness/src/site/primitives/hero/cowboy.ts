import type { Section } from '../../document.ts';
import { escapeAttribute, escapeHtml, safeHref } from '../../html.ts';
import type { RenderContext } from '../nodes.ts';
import { styleClass } from '../../styles.ts';
import { EXT } from '../hero.ts';

export function render(section: Section, context: RenderContext): string {
  const doc = context.doc;
  const style = styleClass(context.collector, section.style);
  const id = escapeAttribute(section.id || 'hero');

  let headline = 'Riding reinvented';
  let subline = 'Meet the e-bike that thinks for itself.';
  let ctaLabel = 'Discover Cruiser';
  let ctaHref = '#catalog';
  let imgSrc = '';

  for (const node of section.nodes || []) {
    if (node.kind === 'heading' && node.props?.text) headline = String(node.props.text);
    else if (node.kind === 'text' && node.props?.text) subline = String(node.props.text);
    else if (node.kind === 'button' && node.props?.href) {
      ctaHref = safeHref(node.props.href) || '#catalog';
      if (node.props?.label) ctaLabel = String(node.props.label);
    } else if (node.kind === 'image' && node.props?.asset) {
      const asset = doc.assets.find((a) => a.id === node.props?.asset);
      if (asset) imgSrc = `/media/${asset.id}.${EXT[asset.mime] || 'jpg'}`;
    }
  }

  if (!imgSrc) {
    const firstImgAsset = doc.assets.find((a) => a.kind === 'image');
    if (firstImgAsset) {
      imgSrc = `/media/${firstImgAsset.id}.${EXT[firstImgAsset.mime] || 'jpg'}`;
    }
  }

  // Fallback background image if no image asset is yet uploaded
  const bgStyle = imgSrc
    ? ` style="background-image: url('${escapeAttribute(imgSrc)}');"`
    : ` style="background: radial-gradient(circle at 60% 50%, #4a5568 0%, #1a202c 100%);"`;

  return `<section id="${id}" class="tar-hero tar-hero-cowboy${style}" data-purpose="hero"${bgStyle}>
  <div class="tar-hero-cowboy-overlay"></div>
  <div class="tar-hero-cowboy-content">
    <div class="tar-hero-cowboy-text-wrap">
      <h1 class="tar-hero-cowboy-title">${escapeHtml(headline)}</h1>
      <p class="tar-hero-cowboy-subline">${escapeHtml(subline)}</p>
      <div class="tar-hero-cowboy-cta-wrap">
        <a href="${escapeAttribute(ctaHref)}" class="tar-btn-cowboy-discover">${escapeHtml(ctaLabel)}</a>
      </div>
    </div>
  </div>

  <div class="tar-hero-cowboy-bottom-bar">
    <div class="tar-hero-cowboy-features">
      <div class="tar-feature-item">
        <div class="tar-feature-badge-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill="#e11d48"/>
            <path d="M4 12C4 8 8 4 12 4M20 12C20 16 16 20 12 20M4 8C8 8 16 16 20 16" stroke="#ffffff" stroke-width="2"/>
          </svg>
        </div>
        <div class="tar-feature-text">
          <span class="tar-feature-title">Award-winning design</span>
          <span class="tar-feature-desc">Assembled in France</span>
        </div>
      </div>

      <div class="tar-feature-item">
        <div class="tar-feature-text">
          <span class="tar-feature-title">Natural ride feel</span>
          <span class="tar-feature-desc">AdaptivePower™ technology</span>
        </div>
      </div>

      <div class="tar-feature-item">
        <div class="tar-feature-text">
          <span class="tar-feature-title">On guard 24/7</span>
          <span class="tar-feature-desc">Pioneering theft detection</span>
        </div>
      </div>
    </div>

    <div class="tar-hero-cowboy-chat-widget">
      <button class="tar-chat-pill-btn" aria-label="Customer Support Chat">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      </button>
    </div>
  </div>
</section>`;
}
