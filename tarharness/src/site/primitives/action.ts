/**
 * Action Engine Primitive:
 * Compiles Product Finder (#14), Search (#15), Quick Order (#19),
 * Newsletter (#38), Contact Form (#43), and WhatsApp Float (#65).
 */

import { escapeAttribute, escapeHtml, safeHref } from '../html.ts';
import type { Page, SiteDocument } from '../document.ts';

export interface ActionProps {
  kind: 'whatsapp_float' | 'newsletter' | 'search' | 'contact_form';
  phone?: string;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  buttonText?: string;
}

export function renderActionPrimitive(props: ActionProps): string {
  if (props.kind === 'whatsapp_float') {
    const phone = props.phone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const href = cleanPhone ? `https://wa.me/${cleanPhone}` : '#contact';

    return `<aside class="tar-whatsapp-float" data-purpose="whatsapp-float">
  <a class="tar-whatsapp-float-btn" href="${escapeAttribute(href)}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 6.46 17.5 2 12.04 2M12.05 20.15C10.56 20.15 9.11 19.75 7.85 19L7.55 18.82L4.43 19.64L5.26 16.59L5.06 16.27C4.24 14.97 3.8 13.46 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67C16.6 3.67 20.29 7.37 20.29 11.92C20.29 16.46 16.6 20.15 12.05 20.15Z"/>
    </svg>
    <span>Chat</span>
  </a>
</aside>`;
  }

  if (props.kind === 'newsletter') {
    return `<section class="tar-section tar-newsletter-section" data-purpose="newsletter">
  <div class="tar-wrap tar-newsletter-wrap">
    <h2 class="tar-section-title">${escapeHtml(props.title || 'Join VIP Loom Broadcast')}</h2>
    <p class="tar-section-sub">${escapeHtml(props.subtitle || 'Receive early notifications before new silk releases go live.')}</p>
    <form class="tar-inline-form" onsubmit="event.preventDefault()">
      <input type="tel" class="tar-input" placeholder="${escapeAttribute(props.placeholder || 'Your WhatsApp Number')}" required />
      <button type="submit" class="tar-btn tar-btn-primary">${escapeHtml(props.buttonText || 'Subscribe')}</button>
    </form>
  </div>
</section>`;
  }

  // Contact Form fallback
  const phone = props.phone || '';
  const waLink = phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : '#';

  return `<section id="contact" class="tar-section tar-contact-section" data-purpose="contact">
  <div class="tar-wrap tar-contact-wrap">
    <h2 class="tar-section-title">${escapeHtml(props.title || 'Direct Weaver Support')}</h2>
    <p class="tar-section-sub">${escapeHtml(props.subtitle || 'Have questions about zari purity or custom orders? Speak with us directly.')}</p>
    <div class="tar-actions">
      <a class="tar-btn tar-btn-primary" href="${escapeAttribute(waLink)}">Contact Us</a>
    </div>
  </div>
</section>`;
}

export function renderShopifyFooter(doc: SiteDocument, page: Page, footerNodeProps?: Record<string, unknown>, footerId = 'site-footer'): string {
  const brand = escapeHtml(String(footerNodeProps?.brand || doc.pages[0]?.title || 'Storefront'));
  const year = new Date().getFullYear();
  const goal = doc.brief?.goal || `${brand} online storefront.`;
  const customLinks = Array.isArray(footerNodeProps?.links) ? footerNodeProps?.links as { label?: string; href?: string }[] : [];

  const quickLinks: { label: string; href: string }[] = [];
  quickLinks.push({ label: 'Home', href: '/' });
  for (const s of (page.sections || [])) {
    if (s.purpose === 'catalog' || s.purpose === 'collection' || s.id === 'catalog') {
      const label = s.purpose === 'menu' ? 'Menu' : s.purpose === 'services' ? 'Services' : 'Catalog';
      if (!quickLinks.some((q) => q.href.includes('catalog') || q.href.includes('menu'))) {
        quickLinks.push({ label, href: `#${s.id || 'catalog'}` });
      }
    } else if (s.purpose === 'menu' || s.id === 'menu') {
      if (!quickLinks.some((q) => q.href.includes('menu'))) quickLinks.push({ label: 'Menu', href: `#${s.id || 'menu'}` });
    } else if (s.purpose === 'services' || s.id === 'services') {
      if (!quickLinks.some((q) => q.href.includes('services'))) quickLinks.push({ label: 'Services', href: `#${s.id || 'services'}` });
    } else if (s.purpose === 'spotlight' || s.id === 'spotlight') {
      if (!quickLinks.some((q) => q.href.includes('spotlight'))) quickLinks.push({ label: 'Offers', href: `#${s.id || 'spotlight'}` });
    }
  }
  for (const l of customLinks) {
    if (l.label && l.href && !quickLinks.some((q) => q.href === l.href)) {
      quickLinks.push({ label: l.label, href: l.href });
    }
  }

  const quickLinksHtml = quickLinks.map((l) => `<li><a href="${escapeAttribute(safeHref(l.href) || '#')}">${escapeHtml(l.label)}</a></li>`).join('');

  const briefData = (doc.brief as unknown as Record<string, unknown>) || {};
  const phone = String(briefData.phone || briefData.whatsappPhone || '');
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const address = String(briefData.address || '');
  const email = String(briefData.email || '');

  return `<footer id="${escapeAttribute(footerId)}" class="tar-footer" data-purpose="footer">
  <div class="tar-footer-wrap">
    <div class="tar-footer-grid">
      <div class="tar-footer-col">
        <a class="tar-footer-brand" href="/">${brand}</a>
        <p class="tar-footer-bio">${escapeHtml(goal)}</p>
        <span class="tar-footer-badge-pill">✓ Verified Merchant</span>
      </div>
      <div class="tar-footer-col">
        <h4 class="tar-footer-col-title">Quick Links</h4>
        <ul class="tar-footer-list">
          ${quickLinksHtml}
        </ul>
      </div>
      <div class="tar-footer-col">
        <h4 class="tar-footer-col-title">Customer Care</h4>
        <ul class="tar-footer-list">
          <li><a href="#shipping">Shipping Policy</a></li>
          <li><a href="#returns">Returns & Refunds</a></li>
          <li><a href="#privacy">Privacy & Terms</a></li>
        </ul>
      </div>
      <div class="tar-footer-col">
        <h4 class="tar-footer-col-title">Orders & Support</h4>
        <div class="tar-footer-contact-item">
          <strong>Direct WhatsApp Support</strong><br>
          ${cleanPhone ? `<a href="https://wa.me/${cleanPhone}" class="tar-btn-whatsapp" style="margin-top:8px;display:inline-flex;" target="_blank" rel="noopener">Chat on WhatsApp</a>` : 'Instant assistance on WhatsApp'}
        </div>
        ${phone ? `<div class="tar-footer-contact-item" style="margin-top: 8px;"><strong>Phone:</strong> <a href="tel:${escapeAttribute(phone)}">${escapeHtml(phone)}</a></div>` : ''}
        ${email ? `<div class="tar-footer-contact-item" style="margin-top: 4px;"><strong>Email:</strong> <a href="mailto:${escapeAttribute(email)}">${escapeHtml(email)}</a></div>` : ''}
        ${address ? `<div class="tar-footer-contact-item" style="margin-top: 4px;"><strong>Address:</strong> ${escapeHtml(address)}</div>` : ''}
      </div>
    </div>
    <div class="tar-footer-bottom">
      <span>© ${year} ${brand}. All rights reserved.</span>
      <div class="tar-footer-payments" aria-label="Payment methods accepted">
        <span class="tar-pay-pill">UPI</span>
        <span class="tar-pay-pill">GPay</span>
        <span class="tar-pay-pill">PhonePe</span>
        <span class="tar-pay-pill">Cards</span>
        <span class="tar-pay-pill">Cash on Delivery</span>
      </div>
    </div>
  </div>
</footer>`;
}

