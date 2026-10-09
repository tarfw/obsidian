/**
 * Navigation Engine Primitive:
 * Compiles Announcement Bar (#1), Header (#2), Mega Menu (#3), and Footer (#68, #69).
 */

import { escapeAttribute, escapeHtml } from '../html.ts';

export interface NavProps {
  kind: 'announcement' | 'header' | 'footer' | 'sticky_bar';
  brand?: string;
  notice?: string;
  links?: Array<{ label: string; href: string }>;
  phone?: string;
  address?: string;
  paymentMethods?: string[];
}

export function renderNavPrimitive(props: NavProps): string {
  switch (props.kind) {
    case 'announcement': {
      const text = props.notice || 'Free shipping on orders over ₹999 • Handcrafted Quality Guaranteed';
      return `<div class="tar-notice" data-purpose="notice" role="region" aria-label="Announcement">
  <div class="tar-wrap tar-notice-inner">
    <span>${escapeHtml(text)}</span>
  </div>
</div>`;
    }

    case 'header': {
      const brand = props.brand || 'Store';
      const listId = 'nav-links';
      const links = props.links || [
        { label: 'Catalog', href: '#catalog' },
        { label: 'Offers', href: '#spotlight' },
        { label: 'Contact', href: '#contact' },
      ];
      const itemsHtml = links.map((l) => `<li><a href="${escapeAttribute(l.href)}">${escapeHtml(l.label)}</a></li>`).join('');

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
