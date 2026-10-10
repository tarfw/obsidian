import type { Section } from '../../document.ts';
import { escapeAttribute, escapeHtml } from '../../html.ts';
import type { RenderContext } from '../nodes.ts';

export function render(section: Section, context: RenderContext): string {
  const doc = context.doc;
  const brand = doc.pages[0]?.title || 'Store';
  const listId = 'site-main-nav';
  const page = doc.pages[0];

  const links: { label: string; href: string }[] = [{ label: 'Home', href: '/' }];
  for (const s of page?.sections || []) {
    if (s.purpose === 'catalog' || s.purpose === 'collection' || s.id === 'catalog') {
      const label = s.purpose === 'menu' ? 'Menu' : s.purpose === 'services' ? 'Services' : 'Catalog';
      if (!links.some((l) => l.href.includes('catalog') || l.href.includes('menu'))) {
        links.push({ label, href: `#${s.id || 'catalog'}` });
      }
    } else if (s.purpose === 'menu' || s.id === 'menu') {
      if (!links.some((l) => l.href.includes('menu'))) links.push({ label: 'Menu', href: `#${s.id || 'menu'}` });
    } else if (s.purpose === 'services' || s.id === 'services') {
      if (!links.some((l) => l.href.includes('services'))) links.push({ label: 'Services', href: `#${s.id || 'services'}` });
    } else if (s.purpose === 'spotlight' || s.id === 'spotlight') {
      if (!links.some((l) => l.href.includes('spotlight'))) links.push({ label: 'Offers', href: `#${s.id || 'spotlight'}` });
    } else if (s.purpose === 'story' || s.id === 'story') {
      if (!links.some((l) => l.href.includes('story'))) links.push({ label: 'Story', href: `#${s.id || 'story'}` });
    }
  }
  if (!links.some((l) => l.href.includes('contact'))) {
    links.push({ label: 'Contact', href: '#contact' });
  }

  const rendered = links.map((l) => `<li><a href="${escapeAttribute(l.href)}">${escapeHtml(l.label)}</a></li>`).join('');

  const initial = brand ? escapeHtml(brand.trim().charAt(0).toUpperCase()) : '★';
  return `<header id="site-header" class="tar-nav tar-nav-floating" data-purpose="navigation">
  <div class="tar-wrap tar-nav-floating-inner">
    <a class="tar-brand-pill" href="/" aria-label="${escapeAttribute(brand)}">
      <span class="tar-brand-pill-avatar"><span class="tar-brand-pill-letter">${initial}</span></span>
      <span class="tar-brand-pill-name">${escapeHtml(brand)}</span>
    </a>
    <nav class="tar-menu" data-menu="${listId}" aria-label="Main Navigation">
      <button class="tar-menu-circle-btn" type="button" aria-expanded="false" aria-label="Toggle navigation">
        <span class="tar-hamburger-bar"></span>
        <span class="tar-hamburger-bar"></span>
        <span class="tar-hamburger-bar"></span>
      </button>
      <ul id="${listId}" class="tar-navlinks tar-navlinks-floating">
        ${rendered}
      </ul>
    </nav>
  </div>
</header>`;
}
