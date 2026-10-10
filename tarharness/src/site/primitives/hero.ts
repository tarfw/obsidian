/**
 * Hero Engine Primitive:
 * Compiles Split 50/50 (#4), Commerce Hero (#16), Seasonal Festive (#17),
 * Typography Hero (#24), Media Hero (#25), and Minimal Hero (#26).
 */

import { escapeAttribute, escapeHtml } from '../html.ts';
import type { Section, SiteDocument } from '../document.ts';
import { styleClass, type CssCollector } from '../styles.ts';

export const EXT: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/avif': 'avif',
  'image/gif': 'gif', 'image/svg+xml': 'svg', 'video/mp4': 'mp4', 'video/webm': 'webm', 'font/woff2': 'woff2',
};

export interface HeroProps {
  pattern: 'split' | 'commerce' | 'seasonal' | 'typography' | 'minimal' | 'fullbleed' | 'bg_image' | 'centered_atmospheric';
  eyebrow?: string;
  title: string;
  subtitle?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  imageSrc?: string;
  imageAlt?: string;
  price?: string;
  canisterImg?: string;
}

export function renderHeroPrimitive(props: HeroProps): string {
  const eyebrowHtml = props.eyebrow ? `<span class="tar-eyebrow">${escapeHtml(props.eyebrow)}</span>` : '';
  const subtitleHtml = props.subtitle ? `<p class="tar-lead">${escapeHtml(props.subtitle)}</p>` : '';
  const primaryHref = escapeAttribute(props.primaryCta?.href || '#catalog');
  const primaryText = escapeHtml(props.primaryCta?.label || 'Explore Collection');
  const secondaryBtn = props.secondaryCta ? `<a href="${escapeAttribute(props.secondaryCta.href)}" class="tar-btn tar-btn-secondary">${escapeHtml(props.secondaryCta.label)}</a>` : '';

  // Centered atmospheric hero (GutGutGoose pixel-perfect sky/cloud canvas)
  if (props.pattern === 'centered_atmospheric') {
    const bgStyle = props.imageSrc
      ? ` style="background-image:url('${escapeAttribute(props.imageSrc)}');background-size:cover;background-position:center top;"`
      : ` style="background:linear-gradient(180deg, #427eb3 0%, #68a0d0 40%, #8dbde3 75%, #a6cdf0 100%);"`;

    const canisterHtml = props.canisterImg
      ? `<img class="tar-canister-img" src="${escapeAttribute(props.canisterImg)}" alt="Product Canister" />`
      : `<div class="tar-canister-mockup"><div class="tar-canister-cap"></div><div class="tar-canister-jar"></div></div>`;

    return `<section class="tar-hero tar-hero-centered-atmospheric" data-purpose="hero"${bgStyle}>
  <div class="tar-wrap tar-hero-centered-wrap">
    ${eyebrowHtml}
    <h1 class="tar-hero-centered-title">${escapeHtml(props.title)}</h1>
    ${subtitleHtml ? `<p class="tar-hero-centered-desc">${escapeHtml(props.subtitle)}</p>` : ''}
    <div class="tar-hero-centered-actions">
      <a href="${primaryHref}" class="tar-hero-pill-btn">${primaryText}</a>
    </div>
    <div class="tar-hero-canister-peek">
      ${canisterHtml}
    </div>
  </div>
</section>`;
  }

  if (props.pattern === 'typography') {
    return `<section class="tar-hero tar-hero-typography" data-purpose="hero" style="min-height:75vh">
  <div class="tar-wrap tar-hero-inner tar-hero-typography-inner">
    ${eyebrowHtml}
    <h1 class="tar-hero-statement">${escapeHtml(props.title)}</h1>
    ${subtitleHtml}
    <div class="tar-actions">
      <a href="${primaryHref}" class="tar-btn tar-btn-primary">${primaryText}</a>
      ${secondaryBtn}
    </div>
  </div>
</section>`;
  }

  if (props.pattern === 'commerce') {
    const pricePill = props.price ? `<span class="tar-price-pill">${escapeHtml(props.price)}</span>` : '';
    return `<section class="tar-hero tar-hero-commerce" data-purpose="hero" style="min-height:75vh">
  <div class="tar-wrap tar-hero-inner tar-hero-grid">
    <div class="tar-hero-content">
      ${eyebrowHtml}
      <h1>${escapeHtml(props.title)}</h1>
      ${subtitleHtml}
      <div class="tar-hero-price-row">
        ${pricePill}
        <a href="${primaryHref}" class="tar-btn tar-btn-primary">${primaryText}</a>
      </div>
    </div>
    <div class="tar-hero-media">
      ${props.imageSrc ? `<img class="tar-hero-img" src="${escapeAttribute(props.imageSrc)}" alt="${escapeAttribute(props.imageAlt || props.title)}" loading="eager" />` : '<div class="tar-card-media-placeholder"><span>Special Edition</span></div>'}
    </div>
  </div>
</section>`;
  }

  if (props.pattern === 'minimal') {
    return `<section class="tar-hero tar-hero-minimal" data-purpose="hero" style="min-height:75vh">
  <div class="tar-wrap tar-hero-inner">
    <div class="tar-hero-grid">
      <div class="tar-hero-text">
        ${eyebrowHtml}
        <h1 class="tar-hero-title">${escapeHtml(props.title)}</h1>
        ${subtitleHtml}
      </div>
      <div class="tar-actions">
        <a href="${primaryHref}" class="tar-btn tar-btn-primary">${primaryText}</a>
        ${secondaryBtn}
      </div>
    </div>
  </div>
</section>`;
  }

  if (props.pattern === 'bg_image' || props.pattern === 'fullbleed') {
    const bgStyle = props.imageSrc ? ` style="background-image:url('${escapeAttribute(props.imageSrc)}');background-size:cover;background-position:center;"` : '';
    return `<section class="tar-hero tar-hero-bgimage" data-purpose="hero"${bgStyle}>
  <div class="tar-hero-scrim"></div>
  <div class="tar-wrap tar-hero-inner">
    <div class="tar-hero-text">
      ${eyebrowHtml}
      <h1 class="tar-hero-title" style="color:#ffffff;">${escapeHtml(props.title)}</h1>
      ${subtitleHtml ? `<p class="tar-hero-desc" style="color:rgba(255,255,255,0.9);">${escapeHtml(props.subtitle)}</p>` : ''}
      <div class="tar-actions">
        <a href="${primaryHref}" class="tar-btn tar-btn-outline" style="border-color:#ffffff;color:#ffffff;">${primaryText}</a>
        ${secondaryBtn}
      </div>
    </div>
  </div>
</section>`;
  }

  // Default: Split 50/50 (#4) or Seasonal (#17)
  return `<section class="tar-hero tar-hero-split" data-purpose="hero" style="min-height:75vh">
  <div class="tar-wrap tar-hero-inner tar-hero-grid">
    <div class="tar-hero-content">
      ${eyebrowHtml}
      <h1>${escapeHtml(props.title)}</h1>
      ${subtitleHtml}
      <div class="tar-actions">
        <a href="${primaryHref}" class="tar-btn tar-btn-primary">${primaryText}</a>
        ${secondaryBtn}
      </div>
    </div>
    <div class="tar-hero-media">
      ${props.imageSrc ? `<img class="tar-hero-img" src="${escapeAttribute(props.imageSrc)}" alt="${escapeAttribute(props.imageAlt || props.title)}" loading="eager" />` : '<div class="tar-card-media-placeholder"><span>Heritage Collection</span></div>'}
    </div>
  </div>
</section>`;
}

export function renderHeroSection(section: Section, context: { doc: SiteDocument; collector: CssCollector }): string {
  const doc = context.doc;
  const style = styleClass(context.collector, section.style);
  const id = escapeAttribute(section.id || 'hero');

  let headline = doc.pages[0]?.title || '';
  let subline = doc.brief?.goal || '';
  let whatsappHref = '';
  let catalogHref = '#catalog';
  let imgSrc = '';
  let imgAlt = '';

  for (const node of section.nodes) {
    if (node.kind === 'heading' && node.props?.text) {
      headline = String(node.props.text);
    } else if (node.kind === 'text' && node.props?.text) {
      subline = String(node.props.text);
    } else if (node.kind === 'button' && node.props?.href) {
      const href = String(node.props.href);
      if (href.includes('wa.me') || href.includes('whatsapp') || String(node.props.label || '').toLowerCase().includes('whatsapp')) {
        whatsappHref = href;
      } else {
        catalogHref = href;
      }
    } else if (node.kind === 'image' && node.props?.asset) {
      const asset = doc.assets.find((a) => a.id === node.props?.asset);
      if (asset) {
        imgSrc = `/media/${asset.id}.${EXT[asset.mime] || 'jpg'}`;
        imgAlt = node.props.alt !== undefined ? String(node.props.alt) : (asset.alt || '');
      }
    } else if (node.kind === 'flex' && Array.isArray(node.children)) {
      for (const child of node.children) {
        if (child.kind === 'button' && child.props?.href) {
          const href = String(child.props.href);
          if (href.includes('wa.me') || href.includes('whatsapp') || String(child.props.label || '').toLowerCase().includes('whatsapp')) {
            whatsappHref = href;
          } else {
            catalogHref = href;
          }
        } else if (child.kind === 'image' && child.props?.asset && !imgSrc) {
          const asset = doc.assets.find((a) => a.id === child.props?.asset);
          if (asset) {
            imgSrc = `/media/${asset.id}.${EXT[asset.mime] || 'jpg'}`;
            imgAlt = child.props.alt !== undefined ? String(child.props.alt) : (asset.alt || '');
          }
        }
      }
    }
  }

  if (!imgSrc) {
    const firstImgAsset = doc.assets.find((a) => a.kind === 'image');
    if (firstImgAsset) {
      imgSrc = `/media/${firstImgAsset.id}.${EXT[firstImgAsset.mime] || 'jpg'}`;
      imgAlt = firstImgAsset.alt || '';
    }
  }

  const altText = imgAlt || headline;
  const heroPattern = doc.blueprint?.heroPattern || (doc.blueprint?.headerStyle === 'fullbleed' ? 'bg_image' : 'split');

  const catalogBtn = `<a href="${escapeAttribute(catalogHref)}" class="tar-btn tar-btn-outline">View Collection</a>`;
  const actionsHtml = `<div class="tar-hero-actions">${catalogBtn}</div>`;

  if (heroPattern === 'centered_atmospheric') {
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

  if (heroPattern === 'typography') {
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

  if (heroPattern === 'bg_image' || heroPattern === 'fullbleed') {
    const bgStyle = imgSrc ? ` style="background-image:url('${escapeAttribute(imgSrc)}');"` : '';
    return `<section id="${id}" class="tar-hero tar-hero-bgimage${style}" data-purpose="hero"${bgStyle}>
  <div class="tar-hero-scrim"></div>
  <div class="tar-hero-inner">
    <div class="tar-hero-text">
      <h1 class="tar-hero-title">${escapeHtml(headline)}</h1>
      ${subline ? `<p class="tar-hero-desc">${escapeHtml(subline)}</p>` : ''}
      ${actionsHtml}
    </div>
  </div>
</section>`;
  }

  if (heroPattern === 'commerce') {
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

  if (heroPattern === 'minimal') {
    return `<section id="${id}" class="tar-hero tar-hero-minimal${style}" data-purpose="hero">
  <div class="tar-hero-inner">
    <div class="tar-hero-grid">
      <div class="tar-hero-text">
        <h1 class="tar-hero-title">${escapeHtml(headline)}</h1>
        ${subline ? `<p class="tar-hero-desc">${escapeHtml(subline)}</p>` : ''}
      </div>
      ${actionsHtml}
    </div>
  </div>
</section>`;
  }

  const mediaHtml = imgSrc
    ? `<img src="${escapeAttribute(imgSrc)}" alt="${escapeAttribute(altText)}" loading="eager" fetchpriority="high">`
    : `<div class="tar-hero-placeholder"><div class="tar-brand-mark">${escapeHtml(headline.slice(0, 2).toUpperCase())}</div></div>`;

  return `<section id="${id}" class="tar-hero tar-hero-split${style}" data-purpose="hero">
  <div class="tar-hero-inner">
    <div class="tar-hero-grid">
      <div class="tar-hero-text">
        <span class="tar-hero-eyebrow">Handcrafted & Verified</span>
        <h1 class="tar-hero-title">${escapeHtml(headline)}</h1>
        ${subline ? `<p class="tar-hero-desc">${escapeHtml(subline)}</p>` : ''}
        ${actionsHtml}
      </div>
      <div class="tar-hero-media">
        ${mediaHtml}
      </div>
    </div>
  </div>
</section>`;
}

