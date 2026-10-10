/**
 * Navigation Engine Primitive:
 * Compiles Announcement Bar (#1), Header (#2), Mega Menu (#3), and Footer (#68, #69).
 */

import { escapeAttribute, escapeHtml } from '../html.ts';
import type { Page, SiteDocument } from '../document.ts';

export interface NavProps {
  kind: 'announcement' | 'header' | 'footer' | 'sticky_bar';
  variant?: 'minimal' | 'floating_pill' | 'quiz_pill';
  brand?: string;
  logoSrc?: string;
  notice?: string;
  quizText?: string;
  quizHref?: string;
  links?: Array<{ label: string; href: string }>;
  phone?: string;
  address?: string;
  paymentMethods?: string[];
}

export function renderNavPrimitive(props: NavProps): string {
  switch (props.kind) {
    case 'announcement': {
      const text = props.notice || 'Free shipping on orders over ₹999 • Handcrafted Quality Guaranteed';
      if (props.variant === 'quiz_pill' || props.quizText) {
        const quizText = props.quizText || text;
        const quizHref = escapeAttribute(props.quizHref || '#quiz');
        return `<aside class="tar-notice tar-notice-quiz" data-purpose="notice" role="region" aria-label="Announcement">
  <div class="tar-wrap tar-notice-inner">
    <a href="${quizHref}" class="tar-notice-quiz-link">
      <span>${escapeHtml(quizText)}</span>
      <span class="tar-notice-arrow-pill">➔</span>
    </a>
  </div>
</aside>`;
      }
      return `<aside class="tar-notice" data-purpose="notice" role="region" aria-label="Announcement">
  <div class="tar-wrap tar-notice-inner">
    <span>${escapeHtml(text)}</span>
  </div>
</aside>`;
    }

    case 'header': {
      const brand = props.brand || 'Store';
      const listId = 'nav-links';
      const links = props.links || [
        { label: 'Home', href: '#hero' },
        { label: 'Catalog', href: '#catalog' },
        { label: 'Offers', href: '#spotlight' },
        { label: 'Contact', href: '#contact' },
      ];
      const itemsHtml = links.map((l) => `<li><a href="${escapeAttribute(l.href)}">${escapeHtml(l.label)}</a></li>`).join('');

      // Floating pill header (GutGutGoose style: frosted pill badge left, circle hamburger right)
      if (props.variant === 'floating_pill') {
        const logoHtml = props.logoSrc
          ? `<img class="tar-brand-pill-img" src="${escapeAttribute(props.logoSrc)}" alt="${escapeAttribute(brand)}" />`
          : `<span class="tar-brand-pill-icon">🦆</span>`;
        return `<header id="site-header" class="tar-nav tar-nav-floating" data-purpose="navigation">
  <div class="tar-wrap tar-nav-floating-inner">
    <a class="tar-brand-pill" href="/" aria-label="${escapeAttribute(brand)}">
      <span class="tar-brand-pill-avatar">${logoHtml}</span>
      <span class="tar-brand-pill-name">${escapeHtml(brand)}</span>
    </a>
    <nav class="tar-menu" data-menu="${listId}" aria-label="Main Navigation">
      <button class="tar-menu-circle-btn" type="button" aria-expanded="false" aria-label="Toggle navigation">
        <span class="tar-hamburger-bar"></span>
        <span class="tar-hamburger-bar"></span>
        <span class="tar-hamburger-bar"></span>
      </button>
      <ul id="${listId}" class="tar-navlinks tar-navlinks-floating">
        ${itemsHtml}
      </ul>
    </nav>
  </div>
</header>`;
      }

      return `<header id="site-header" class="tar-nav" data-purpose="navigation">
  <div class="tar-wrap tar-nav-inner">
    <a class="tar-brand" href="/">${escapeHtml(brand)}</a>
    <nav class="tar-menu" data-menu="${listId}" aria-label="Main Navigation">
      <button class="tar-menu-btn" type="button" aria-expanded="false" aria-label="Toggle navigation">☰</button>
      <ul id="${listId}" class="tar-navlinks">
        ${itemsHtml}
      </ul>
    </nav>
  </div>
</header>`;
    }

    case 'footer': {
      const brand = props.brand || 'Store';
      const year = new Date().getFullYear();
      const phone = props.phone || '';
      const address = props.address || '';

      return `<footer id="site-footer" class="tar-shopify-footer" data-purpose="footer">
  <div class="tar-wrap">
    <div class="tar-footer-grid">
      <div class="tar-footer-col tar-footer-brand">
        <h3 class="tar-footer-heading">${escapeHtml(brand)}</h3>
        <p class="tar-footer-desc">Direct from master weavers and artisans. Certified authenticity.</p>
        ${phone ? `<p class="tar-footer-contact"><strong>WhatsApp:</strong> <a href="https://wa.me/${phone.replace(/\D/g, '')}">${escapeHtml(phone)}</a></p>` : ''}
        ${address ? `<p class="tar-footer-address">${escapeHtml(address)}</p>` : ''}
      </div>
      <div class="tar-footer-col">
        <h4 class="tar-footer-subheading">Quick Links</h4>
        <ul class="tar-footer-links">
          <li><a href="#catalog">Collection</a></li>
          <li><a href="#faq">Delivery & FAQs</a></li>
          <li><a href="#contact">Order Help</a></li>
        </ul>
      </div>
      <div class="tar-footer-col">
        <h4 class="tar-footer-subheading">Secure Commerce</h4>
        <div class="tar-footer-badges">
          <span class="tar-badge-pill">✓ Verified Handloom</span>
          <span class="tar-badge-pill">✓ Cash on Delivery</span>
          <span class="tar-badge-pill">✓ Direct Dispatch</span>
        </div>
      </div>
    </div>
    <div class="tar-footer-bottom">
      <p class="tar-footer-copy">© ${year} ${escapeHtml(brand)}. Powered by TAR.</p>
    </div>
  </div>
</footer>`;
    }

    case 'sticky_bar': {
      return `<aside class="tar-sticky-cart-bar" data-purpose="sticky-cart" aria-label="Quick Checkout">
  <div class="tar-wrap tar-sticky-inner">
    <div class="tar-sticky-info"><span class="tar-sticky-count">0 items</span> in bag</div>
    <a href="#catalog" class="tar-btn tar-btn-sm">View Catalog</a>
  </div>
</aside>`;
    }
  }
}

export function renderDefaultHeaderNav(doc: SiteDocument, page: Page): string {
  const brand = doc.pages[0]?.title || 'Store';
  const listId = 'site-main-nav';
  const links: { label: string; href: string }[] = [];
  links.push({ label: 'Home', href: '/' });
  for (const s of (page.sections || [])) {
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

  if (doc.blueprint?.headerStyle === 'floating_pill' || doc.blueprint?.heroPattern === 'centered_atmospheric') {
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

  return `<header id="site-header" class="tar-nav" data-purpose="navigation">
  <div class="tar-wrap tar-nav-inner">
    <a class="tar-brand" href="/">${escapeHtml(brand)}</a>
    <nav class="tar-menu" data-menu="${listId}" aria-label="Main Navigation">
      <button class="tar-menu-btn" type="button" aria-expanded="false" aria-label="Toggle navigation">☰</button>
      <ul id="${listId}" class="tar-navlinks">
        ${rendered}
      </ul>
    </nav>
  </div>
</header>`;
}
