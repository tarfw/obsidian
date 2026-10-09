/**
 * Media Engine Primitive:
 * Compiles Instagram Grid (#30), UGC Gallery (#32), Lookbook (#34),
 * Before & After (#35), and Behind the Scenes (#50).
 */

import { escapeAttribute, escapeHtml } from '../html.ts';

export interface MediaItem {
  src: string;
  alt: string;
  caption?: string;
  href?: string;
}

export interface MediaProps {
  id?: string;
  kind?: 'instagram' | 'lookbook' | 'gallery';
  title?: string;
  subtitle?: string;
  items: MediaItem[];
  handle?: string;
}

export function renderMediaPrimitive(props: MediaProps): string {
  const sectionId = props.id || props.kind || 'media';

  const gridHtml = props.items.map((item) => {
    const imgHtml = `<img class="tar-media-tile-img" src="${escapeAttribute(item.src)}" alt="${escapeAttribute(item.alt)}" loading="lazy" />`;
    if (item.href) {
      return `<a class="tar-media-tile" href="${escapeAttribute(item.href)}" target="_blank" rel="noopener">${imgHtml}</a>`;
    }
    return `<div class="tar-media-tile">${imgHtml}</div>`;
  }).join('\n');

  return `<section id="${sectionId}" class="tar-section tar-media-section" data-purpose="${sectionId}">
  <div class="tar-wrap">
    ${props.title ? `<div class="tar-section-header">
      <h2 class="tar-section-title">${escapeHtml(props.title)}</h2>
      ${props.subtitle ? `<p class="tar-section-sub">${escapeHtml(props.subtitle)}</p>` : ''}
      ${props.handle ? `<p class="tar-media-handle"><a href="https://instagram.com/${escapeAttribute(props.handle)}" target="_blank" rel="noopener">@${escapeHtml(props.handle)}</a></p>` : ''}
    </div>` : ''}
    <div class="tar-media-grid">
      ${gridHtml}
    </div>
  </div>
</section>`;
}
