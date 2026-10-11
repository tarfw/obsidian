import type { Section } from '../../document.ts';
import { escapeAttribute, escapeHtml } from '../../html.ts';
import type { RenderContext } from '../nodes.ts';

export function render(section: Section, context: RenderContext): string {
  const doc = context.doc;
  const brand = doc.pages[0]?.title || 'COWBOY';
  const listId = 'site-main-nav';
  const page = doc.pages[0];

  const links: { label: string; href: string }[] = [{ label: 'Home', href: '/' }];
  for (const s of page?.sections || []) {
    if (s.purpose === 'catalog' || s.purpose === 'collection' || s.id === 'catalog') {
      const label = s.purpose === 'menu' ? 'Menu' : s.purpose === 'services' ? 'Services' : 'Products';
      if (!links.some((l) => l.href.includes('catalog') || l.href.includes('menu'))) {
        links.push({ label, href: `#${s.id || 'catalog'}` });
      }
    } else if (s.purpose === 'menu' || s.id === 'menu') {
      if (!links.some((l) => l.href.includes('menu'))) links.push({ label: 'Menu', href: `#${s.id || 'menu'}` });
    } else if (s.purpose === 'services' || s.id === 'services') {
      if (!links.some((l) => l.href.includes('services'))) links.push({ label: 'Services', href: `#${s.id || 'services'}` });
    } else if (s.purpose === 'spotlight' || s.id === 'spotlight') {
      if (!links.some((l) => l.href.includes('spotlight'))) links.push({ label: 'Offers', href: `#${s.id || 'spotlight'}` });
    }
  }
  if (!links.some((l) => l.href.includes('contact'))) {
    links.push({ label: 'Stores', href: '#contact' });
  }

  const renderedLinks = links.map((l) => `<li><a href="${escapeAttribute(l.href)}">${escapeHtml(l.label)}</a></li>`).join('');

  return `<header id="site-header" class="tar-nav tar-nav-cowboy" data-purpose="navigation">
  <div class="tar-nav-cowboy-inner">
    <div class="tar-nav-cowboy-left">
      <a class="tar-brand tar-brand-cowboy" href="/">${escapeHtml(brand)}<span class="tar-brand-star">✳</span></a>
    </div>

    <nav class="tar-menu tar-nav-cowboy-center" data-menu="${listId}" aria-label="Main Navigation">
      <ul id="${listId}" class="tar-navlinks tar-navlinks-cowboy">
        ${renderedLinks}
      </ul>
    </nav>

    <div class="tar-nav-cowboy-right">
      <a href="/account" class="tar-icon-btn" aria-label="Account">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </a>
      <a href="#catalog" class="tar-icon-btn" aria-label="Cart / Bag">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      </a>
      <a href="#catalog" class="tar-btn-cowboy-pill">Book a test ride</a>
      <button class="tar-menu-btn" type="button" aria-expanded="false" aria-label="Toggle navigation">☰</button>
    </div>
  </div>
</header>`;
}
