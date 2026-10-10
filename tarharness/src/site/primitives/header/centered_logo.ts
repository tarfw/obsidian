import type { Section } from '../../document.ts';
import { escapeAttribute, escapeHtml } from '../../html.ts';
import type { RenderContext } from '../nodes.ts';

export function render(section: Section, context: RenderContext): string {
  const doc = context.doc;
  const brand = doc.pages[0]?.title || 'Store';
  const listId = 'site-main-nav';

  return `<header id="site-header" class="tar-nav tar-nav-centered" data-purpose="navigation">
  <div class="tar-wrap tar-nav-inner" style="justify-content:center;position:relative;">
    <a class="tar-brand" href="/" style="text-align:center;">${escapeHtml(brand)}</a>
    <nav class="tar-menu" data-menu="${listId}" aria-label="Main Navigation" style="position:absolute;right:clamp(16px,4vw,48px);">
      <button class="tar-menu-btn" type="button" aria-expanded="false" aria-label="Toggle navigation">☰</button>
      <ul id="${listId}" class="tar-navlinks">
        <li><a href="/">Home</a></li>
        <li><a href="#catalog">Catalog</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </nav>
  </div>
</header>`;
}
