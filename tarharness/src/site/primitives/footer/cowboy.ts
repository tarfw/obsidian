import type { Section } from '../../document.ts';
import { escapeAttribute, escapeHtml, safeHref } from '../../html.ts';
import type { RenderContext } from '../nodes.ts';

export function render(section: Section, context: RenderContext): string {
  const doc = context.doc;
  const brand = doc.pages[0]?.title || 'COWBOY';
  const year = new Date().getFullYear();
  const page = doc.pages[0];

  const briefData = (doc.brief as unknown as Record<string, unknown>) || {};
  const phone = String(briefData.phone || briefData.whatsappPhone || '');
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  // Extract catalog items/categories dynamically from workspace
  const catalogSection = page?.sections?.find(
    (s) =>
      s.purpose === 'catalog' ||
      s.purpose === 'collection' ||
      s.purpose === 'menu' ||
      s.purpose === 'services' ||
      s.id === 'catalog'
  );
  const collectionNode = catalogSection?.nodes?.find((n) => n.kind === 'collection');
  const items = Array.isArray(collectionNode?.props?.items)
    ? (collectionNode.props.items as Array<{ title?: string; category?: string }>)
    : [];

  const exploreLinks: { label: string; href: string }[] = [];
  const seenLabels = new Set<string>();

  // Use unique workspace categories if available
  for (const item of items) {
    const cat = item.category?.trim();
    if (cat && !seenLabels.has(cat.toLowerCase())) {
      seenLabels.add(cat.toLowerCase());
      exploreLinks.push({ label: cat, href: '#catalog' });
      if (exploreLinks.length >= 6) break;
    }
  }

  // If not enough categories, use top item titles
  if (exploreLinks.length < 3) {
    for (const item of items) {
      const title = item.title?.trim();
      if (title && !seenLabels.has(title.toLowerCase())) {
        seenLabels.add(title.toLowerCase());
        exploreLinks.push({ label: title, href: '#catalog' });
        if (exploreLinks.length >= 6) break;
      }
    }
  }

  // Fallback to pixel-perfect Cowboy screenshot defaults if no items found
  if (exploreLinks.length === 0) {
    exploreLinks.push(
      { label: 'Classic', href: '#catalog' },
      { label: 'Cruiser', href: '#catalog' },
      { label: 'Cruiser ST', href: '#catalog' },
      { label: 'Cross', href: '#catalog' },
      { label: 'Cross ST', href: '#catalog' },
      { label: 'Circular', href: '#catalog' },
      { label: 'Accessories & parts', href: '#catalog' },
      { label: 'Book a test ride', href: cleanPhone ? `https://wa.me/${cleanPhone}` : '#contact' }
    );
  } else {
    if (!seenLabels.has('accessories & parts')) {
      exploreLinks.push({ label: 'Accessories & parts', href: '#catalog' });
    }
    exploreLinks.push({
      label: 'Book a consultation',
      href: cleanPhone ? `https://wa.me/${cleanPhone}` : '#contact',
    });
  }

  const serviceLinks: { label: string; href: string }[] = [
    { label: 'Care', href: '#contact' },
    { label: 'Theft Insurance', href: '#contact' },
    { label: 'Payment methods', href: '#contact' },
    { label: 'Leasing', href: '#contact' },
    { label: 'Warranty', href: '#contact' },
    { label: 'Business', href: '#contact' },
    { label: 'Students', href: '#contact' },
  ];

  const aboutLinks: { label: string; href: string }[] = [
    { label: 'Reviews', href: '#story' },
    { label: 'Press', href: '#story' },
    { label: 'Blog', href: '#story' },
    { label: 'Stores', href: '#contact' },
    { label: 'Become a dealer', href: '#contact' },
    { label: 'Careers', href: '#contact' },
  ];

  const helpLinks: { label: string; href: string }[] = [
    { label: 'Support', href: '#contact' },
    { label: 'Contact', href: cleanPhone ? `https://wa.me/${cleanPhone}` : '#contact' },
    { label: 'Delivery', href: '#contact' },
    { label: 'Returns', href: '#contact' },
  ];

  const renderedExplore = exploreLinks
    .map(
      (l) =>
        `<li><a href="${escapeAttribute(safeHref(l.href) || '#')}">${escapeHtml(l.label)}</a></li>`
    )
    .join('\n          ');

  const renderedServices = serviceLinks
    .map(
      (l) =>
        `<li><a href="${escapeAttribute(safeHref(l.href) || '#')}">${escapeHtml(l.label)}</a></li>`
    )
    .join('\n          ');

  const renderedAbout = aboutLinks
    .map(
      (l) =>
        `<li><a href="${escapeAttribute(safeHref(l.href) || '#')}">${escapeHtml(l.label)}</a></li>`
    )
    .join('\n          ');

  const renderedHelp = helpLinks
    .map(
      (l) =>
        `<li><a href="${escapeAttribute(safeHref(l.href) || '#')}">${escapeHtml(l.label)}</a></li>`
    )
    .join('\n          ');

  return `<footer id="${escapeAttribute(section.id || 'site-footer')}" class="tar-footer-cowboy" data-purpose="footer">
  <div class="tar-footer-cowboy-inner">
    <!-- Top 5 Columns -->
    <div class="tar-footer-cowboy-grid">
      <!-- Col 1: Explore -->
      <div class="tar-footer-cowboy-col">
        <h4 class="tar-footer-cowboy-heading">Explore</h4>
        <ul class="tar-footer-cowboy-links">
          ${renderedExplore}
        </ul>
      </div>

      <!-- Col 2: Services -->
      <div class="tar-footer-cowboy-col">
        <h4 class="tar-footer-cowboy-heading">Services</h4>
        <ul class="tar-footer-cowboy-links">
          ${renderedServices}
        </ul>
      </div>

      <!-- Col 3: About us -->
      <div class="tar-footer-cowboy-col">
        <h4 class="tar-footer-cowboy-heading">About us</h4>
        <ul class="tar-footer-cowboy-links">
          ${renderedAbout}
        </ul>
      </div>

      <!-- Col 4: Help -->
      <div class="tar-footer-cowboy-col">
        <h4 class="tar-footer-cowboy-heading">Help</h4>
        <ul class="tar-footer-cowboy-links">
          ${renderedHelp}
        </ul>
      </div>

      <!-- Col 5: Newsletter & Socials -->
      <div class="tar-footer-cowboy-col tar-footer-cowboy-newsletter-col">
        <h4 class="tar-footer-cowboy-heading">Stay in the loop</h4>
        <form class="tar-footer-cowboy-form" onsubmit="event.preventDefault()">
          <div class="tar-footer-input-row">
            <input type="email" class="tar-footer-cowboy-input" placeholder="Enter your email" required />
            <button type="submit" class="tar-footer-cowboy-submit">Subscribe</button>
          </div>
          <p class="tar-footer-disclaimer">By signing up, I agree with the <a href="#privacy">data protection policy</a> of ${escapeHtml(brand)}.</p>
        </form>

        <div class="tar-footer-cowboy-socials">
          <a href="#" class="tar-social-icon-btn" aria-label="Instagram">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </a>
          <a href="#" class="tar-social-icon-btn" aria-label="Facebook">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          </a>
          <a href="#" class="tar-social-icon-btn" aria-label="YouTube">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
          </a>
        </div>
      </div>
    </div>

    <!-- Massive Typography Brand Name -->
    <div class="tar-footer-cowboy-hero-brand">
      <span class="tar-cowboy-giant-word">${escapeHtml(brand.toUpperCase())}<span class="tar-cowboy-star">✳</span></span>
    </div>

    <!-- Bottom Bar with Locale, Legal & Rating -->
    <div class="tar-footer-cowboy-bottom-bar">
      <div class="tar-footer-cowboy-lang">
        <span class="tar-lang-flag">🇪🇺</span>
        <span class="tar-lang-text">English ▾</span>
      </div>

      <div class="tar-footer-cowboy-legal">
        <a href="#terms">Terms of use</a>
        <a href="#privacy">Data protection policy</a>
        <a href="#withdrawal">Right of withdrawal</a>
        <a href="#cookies">Cookie settings</a>
        <span class="tar-footer-copyright">© ${year} ${escapeHtml(brand)}</span>
      </div>

      <div class="tar-footer-cowboy-reviews">
        <div class="tar-stars-row">★★★★<span class="tar-star-dim">★</span></div>
        <span class="tar-reviews-count">Verified Customer Satisfaction</span>
      </div>
    </div>
  </div>

  <!-- Chat Floating Icon (Docked at bottom-right corner) -->
  <div class="tar-chat-corner-pill" aria-label="Customer Support Chat" title="Chat with support">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#171717">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
    </svg>
  </div>
</footer>`;
}
