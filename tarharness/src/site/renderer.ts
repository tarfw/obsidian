/**
 * TAR Site Bot Pure HTML/CSS Static Compiler (parv2.md §2, §6, §7)
 *
 * Implements deterministic rendering for 12 Card families and 3 design themes:
 * Navigation, Hero, Content, Collection, Features, Proof, FAQ, Hours, Contact, Form, CTA, Footer.
 * Emits semantic HTML, CSS custom properties, OpenGraph metadata, JSON-LD Schema.org,
 * and requires zero mandatory client-side JavaScript.
 */

import type { CardDefinition, DesignTokens, PageDefinition, SiteDefinition } from './schema.ts';

function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoney(minorUnits: number, currency: string): string {
  const major = minorUnits / 100;
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : `${currency} `;
  return `${symbol}${major.toFixed(2)}`;
}

export function compileCss(tokens: DesignTokens): string {
  const { colors, typography, rounded, spacing } = tokens;
  return `
:root {
  --color-bg: ${colors.bg};
  --color-text: ${colors.text};
  --color-accent: ${colors.accent};
  --color-surface: ${colors.surface};
  --color-border: ${colors.border};
  --color-muted: ${colors.muted};
  --font-heading: ${typography.headingFont};
  --font-body: ${typography.bodyFont};
  --font-size-base: ${typography.baseFontSize}px;
  --font-scale: ${typography.scale};
  --radius-sm: ${rounded.sm}px;
  --radius-md: ${rounded.md}px;
  --radius-lg: ${rounded.lg}px;
  --radius-full: ${rounded.full}px;
  --space-unit: ${spacing.unit}px;
  --container-max: ${spacing.containerMax}px;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: var(--font-size-base);
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  line-height: 1.6;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
}

.tar-container {
  width: 100%;
  max-width: var(--container-max);
  margin-left: auto;
  margin-right: auto;
  padding-left: calc(var(--space-unit) * 3);
  padding-right: calc(var(--space-unit) * 3);
}

.tar-section {
  padding-top: calc(var(--space-unit) * 8);
  padding-bottom: calc(var(--space-unit) * 8);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  line-height: 1.2;
  color: var(--color-text);
  margin-bottom: calc(var(--space-unit) * 2);
}

h1 { font-size: calc(var(--font-size-base) * var(--font-scale) * var(--font-scale) * var(--font-scale)); }
h2 { font-size: calc(var(--font-size-base) * var(--font-scale) * var(--font-scale)); }
h3 { font-size: calc(var(--font-size-base) * var(--font-scale)); }

p {
  margin-bottom: calc(var(--space-unit) * 2);
  color: var(--color-text);
}

.tar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--space-unit) * 1.5) calc(var(--space-unit) * 3);
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 1rem;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 0.2s ease, transform 0.1s ease;
}

.tar-btn:hover { opacity: 0.9; }
.tar-btn:active { transform: scale(0.98); }

.tar-btn-primary {
  background-color: var(--color-accent);
  color: #ffffff;
}

.tar-btn-secondary {
  background-color: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-border);
}

.tar-btn-outline {
  background-color: transparent;
  color: var(--color-accent);
  border-color: var(--color-accent);
}

/* Card: Navigation */
.tar-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background-color: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(12px);
}
.tar-nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: calc(var(--space-unit) * 8);
}
.tar-brand {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  text-decoration: none;
}
.tar-nav-links {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 3);
  list-style: none;
}
.tar-nav-links a {
  color: var(--color-text);
  text-decoration: none;
  font-weight: 500;
}
.tar-nav-links a:hover { color: var(--color-accent); }

/* Card: Hero */
.tar-hero {
  text-align: center;
  padding-top: calc(var(--space-unit) * 12);
  padding-bottom: calc(var(--space-unit) * 12);
}
.tar-hero-badge {
  display: inline-block;
  padding: calc(var(--space-unit) * 0.75) calc(var(--space-unit) * 2);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: calc(var(--space-unit) * 3);
}
.tar-hero-sub {
  font-size: 1.25rem;
  color: var(--color-muted);
  max-width: 680px;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: calc(var(--space-unit) * 4);
}
.tar-hero-actions {
  display: flex;
  justify-content: center;
  gap: calc(var(--space-unit) * 2);
  flex-wrap: wrap;
}

/* Card: Content / Prose */
.tar-prose {
  max-width: 780px;
  margin-left: auto;
  margin-right: auto;
}
.tar-prose p {
  font-size: 1.125rem;
  line-height: 1.75;
  color: var(--color-text);
}

/* Card: Collection / Menu */
.tar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: calc(var(--space-unit) * 3);
}
.tar-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: calc(var(--space-unit) * 3);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.tar-card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: calc(var(--space-unit) * 1.5);
}
.tar-card-title {
  font-size: 1.125rem;
  font-weight: 700;
}
.tar-card-price {
  font-weight: 700;
  color: var(--color-accent);
}
.tar-card-desc {
  font-size: 0.9375rem;
  color: var(--color-muted);
  margin-bottom: calc(var(--space-unit) * 2);
  flex: 1;
}

/* Card: Features */
.tar-feature-icon {
  font-size: 1.75rem;
  margin-bottom: calc(var(--space-unit) * 1.5);
}

/* Card: Proof / Testimonials */
.tar-quote {
  font-style: italic;
  margin-bottom: calc(var(--space-unit) * 2);
}
.tar-author {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-muted);
}

/* Card: FAQ */
.tar-faq-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: calc(var(--space-unit) * 1.5);
  background-color: var(--color-surface);
}
.tar-faq-item summary {
  padding: calc(var(--space-unit) * 2);
  font-weight: 600;
  cursor: pointer;
  outline: none;
}
.tar-faq-item[open] summary {
  border-bottom: 1px solid var(--color-border);
}
.tar-faq-answer {
  padding: calc(var(--space-unit) * 2);
  color: var(--color-muted);
}

/* Card: Hours & Status */
.tar-hours-table {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  border-collapse: collapse;
}
.tar-hours-table td {
  padding: calc(var(--space-unit) * 1) 0;
  border-bottom: 1px solid var(--color-border);
}
.tar-hours-table td:last-child {
  text-align: right;
  font-weight: 600;
}
.tar-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 0.8125rem;
  font-weight: 700;
  background-color: #dcfce7;
  color: #166534;
  margin-bottom: calc(var(--space-unit) * 2);
}

/* Card: Contact */
.tar-contact-info {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  max-width: 480px;
  margin: 0 auto;
}
.tar-contact-row {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
}

/* Card: Form */
.tar-form {
  max-width: 520px;
  margin: 0 auto;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: calc(var(--space-unit) * 4);
}
.tar-field {
  margin-bottom: calc(var(--space-unit) * 2.5);
}
.tar-label {
  display: block;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: calc(var(--space-unit) * 0.75);
}
.tar-input, .tar-textarea {
  width: 100%;
  padding: calc(var(--space-unit) * 1.25);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: inherit;
  font-size: 1rem;
}
.tar-textarea { min-height: 110px; resize: vertical; }

/* Card: CTA */
.tar-cta-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: calc(var(--space-unit) * 6);
  text-align: center;
}

/* Card: Footer */
.tar-footer {
  border-top: 1px solid var(--color-border);
  padding-top: calc(var(--space-unit) * 6);
  padding-bottom: calc(var(--space-unit) * 6);
  background-color: var(--color-surface);
  margin-top: auto;
}
.tar-footer-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 2);
  font-size: 0.875rem;
  color: var(--color-muted);
}
.tar-footer-links {
  display: flex;
  gap: calc(var(--space-unit) * 2.5);
  list-style: none;
}
.tar-footer-links a {
  color: var(--color-muted);
  text-decoration: none;
}
.tar-footer-links a:hover { color: var(--color-text); }

@media (max-width: 640px) {
  .tar-nav-inner { flex-direction: column; height: auto; padding: calc(var(--space-unit) * 2) 0; gap: calc(var(--space-unit) * 1.5); }
  .tar-hero { padding-top: calc(var(--space-unit) * 6); padding-bottom: calc(var(--space-unit) * 6); }
  .tar-grid { grid-template-columns: 1fr; }
  .tar-footer-inner { flex-direction: column; text-align: center; }
}
`.trim();
}

export function renderCard(card: CardDefinition, site: SiteDefinition): string {
  const p = card.props;
  switch (card.kind) {
    case 'navigation': {
      const brand = escapeHtml(p.brand || site.pages[0]?.title || 'TAR Site');
      const links = Array.isArray(p.links) ? p.links : [{ label: 'Home', href: '#' }, { label: 'Contact', href: '#contact' }];
      const renderedLinks = links
        .map((link: any) => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`)
        .join('');
      return `
<header class="tar-nav" role="banner">
  <div class="tar-container tar-nav-inner">
    <a href="#" class="tar-brand">${brand}</a>
    <nav aria-label="Main Navigation">
      <ul class="tar-nav-links">
        ${renderedLinks}
      </ul>
    </nav>
  </div>
</header>`;
    }

    case 'hero': {
      const badge = p.badge ? `<div class="tar-hero-badge">${escapeHtml(p.badge)}</div>` : '';
      const headline = escapeHtml(p.headline || card.title || 'Welcome');
      const subtext = escapeHtml(p.subtext || '');
      const primaryCta = p.primaryCta ? `<a href="${escapeHtml((p.primaryCta as any).href || '#contact')}" class="tar-btn tar-btn-primary">${escapeHtml((p.primaryCta as any).label || 'Get Started')}</a>` : '';
      const secondaryCta = p.secondaryCta ? `<a href="${escapeHtml((p.secondaryCta as any).href || '#menu')}" class="tar-btn tar-btn-secondary">${escapeHtml((p.secondaryCta as any).label || 'Learn More')}</a>` : '';

      return `
<section class="tar-section tar-hero" id="${escapeHtml(card.id)}">
  <div class="tar-container">
    ${badge}
    <h1>${headline}</h1>
    ${subtext ? `<p class="tar-hero-sub">${subtext}</p>` : ''}
    <div class="tar-hero-actions">
      ${primaryCta}
      ${secondaryCta}
    </div>
  </div>
</section>`;
    }

    case 'content': {
      const title = card.title ? `<h2>${escapeHtml(card.title)}</h2>` : '';
      const body = escapeHtml(p.body || p.text || '');
      return `
<section class="tar-section" id="${escapeHtml(card.id)}">
  <div class="tar-container tar-prose">
    ${title}
    <p>${body}</p>
  </div>
</section>`;
    }

    case 'collection': {
      const title = card.title ? `<h2>${escapeHtml(card.title)}</h2>` : '<h2>Offerings</h2>';
      const items = Array.isArray(p.items) ? p.items : [];
      const renderedItems = items.map((item: any) => {
        const itemTitle = escapeHtml(item.title || item.name || 'Item');
        const price = typeof item.price === 'number' ? formatMoney(item.price, site.currency) : '';
        const desc = escapeHtml(item.description || '');
        return `
      <div class="tar-card">
        <div>
          <div class="tar-card-header">
            <h3 class="tar-card-title">${itemTitle}</h3>
            ${price ? `<span class="tar-card-price">${price}</span>` : ''}
          </div>
          ${desc ? `<p class="tar-card-desc">${desc}</p>` : ''}
        </div>
        <div>
          <a href="#contact" class="tar-btn tar-btn-outline" style="width: 100%;">Order</a>
        </div>
      </div>`;
      }).join('');

      return `
<section class="tar-section" id="${escapeHtml(card.id)}">
  <div class="tar-container">
    ${title}
    <div class="tar-grid">
      ${renderedItems}
    </div>
  </div>
</section>`;
    }

    case 'features': {
      const title = card.title ? `<h2>${escapeHtml(card.title)}</h2>` : '<h2>Why Choose Us</h2>';
      const features = Array.isArray(p.features) ? p.features : [];
      const renderedFeatures = features.map((feat: any) => {
        const fTitle = escapeHtml(feat.title || 'Feature');
        const fDesc = escapeHtml(feat.description || '');
        const fIcon = escapeHtml(feat.icon || '✓');
        return `
      <div class="tar-card">
        <div class="tar-feature-icon">${fIcon}</div>
        <h3 class="tar-card-title">${fTitle}</h3>
        <p class="tar-card-desc">${fDesc}</p>
      </div>`;
      }).join('');

      return `
<section class="tar-section" id="${escapeHtml(card.id)}">
  <div class="tar-container">
    ${title}
    <div class="tar-grid">
      ${renderedFeatures}
    </div>
  </div>
</section>`;
    }

    case 'proof': {
      const title = card.title ? `<h2>${escapeHtml(card.title)}</h2>` : '<h2>What Our Customers Say</h2>';
      const testimonials = Array.isArray(p.testimonials) ? p.testimonials : [];
      const renderedQuotes = testimonials.map((item: any) => {
        const quote = escapeHtml(item.quote || item.text || '');
        const author = escapeHtml(item.author || item.name || 'Verified Customer');
        const role = item.role ? ` · ${escapeHtml(item.role)}` : '';
        return `
      <div class="tar-card">
        <p class="tar-quote">“${quote}”</p>
        <span class="tar-author">— ${author}${role}</span>
      </div>`;
      }).join('');

      return `
<section class="tar-section" id="${escapeHtml(card.id)}">
  <div class="tar-container">
    ${title}
    <div class="tar-grid">
      ${renderedQuotes}
    </div>
  </div>
</section>`;
    }

    case 'faq': {
      const title = card.title ? `<h2>${escapeHtml(card.title)}</h2>` : '<h2>Frequently Asked Questions</h2>';
      const items = Array.isArray(p.items) ? p.items : [];
      const renderedFaq = items.map((faq: any) => {
        const question = escapeHtml(faq.q || faq.question || '');
        const answer = escapeHtml(faq.a || faq.answer || '');
        return `
      <details class="tar-faq-item">
        <summary>${question}</summary>
        <div class="tar-faq-answer">${answer}</div>
      </details>`;
      }).join('');

      return `
<section class="tar-section" id="${escapeHtml(card.id)}">
  <div class="tar-container tar-prose">
    ${title}
    <div class="tar-faq-list">
      ${renderedFaq}
    </div>
  </div>
</section>`;
    }

    case 'hours': {
      const title = card.title ? `<h2>${escapeHtml(card.title)}</h2>` : '<h2>Hours & Location</h2>';
      const schedule = Array.isArray(p.schedule) ? p.schedule : [
        { days: 'Monday – Friday', hours: '11:00 AM – 10:00 PM' },
        { days: 'Saturday – Sunday', hours: '10:00 AM – 11:00 PM' },
      ];
      const renderedSchedule = schedule.map((row: any) => `
      <tr>
        <td>${escapeHtml(row.days)}</td>
        <td>${escapeHtml(row.hours)}</td>
      </tr>`).join('');

      return `
<section class="tar-section" id="${escapeHtml(card.id)}" style="text-align: center;">
  <div class="tar-container">
    <div class="tar-status-badge">● Open Now</div>
    ${title}
    <table class="tar-hours-table">
      <tbody>
        ${renderedSchedule}
      </tbody>
    </table>
  </div>
</section>`;
    }

    case 'contact': {
      const title = card.title ? `<h2>${escapeHtml(card.title)}</h2>` : '<h2>Contact Us</h2>';
      const address = p.address ? `<div class="tar-contact-row"><span>📍</span><span>${escapeHtml(p.address)}</span></div>` : '';
      const phone = p.phone ? `<div class="tar-contact-row"><span>📞</span><a href="tel:${escapeHtml(p.phone)}" style="color: inherit;">${escapeHtml(p.phone)}</a></div>` : '';
      const email = p.email ? `<div class="tar-contact-row"><span>✉️</span><a href="mailto:${escapeHtml(p.email)}" style="color: inherit;">${escapeHtml(p.email)}</a></div>` : '';

      return `
<section class="tar-section" id="${escapeHtml(card.id)}">
  <div class="tar-container" style="text-align: center;">
    ${title}
    <div class="tar-contact-info">
      ${address}
      ${phone}
      ${email}
    </div>
  </div>
</section>`;
    }

    case 'form': {
      const title = card.title ? `<h2>${escapeHtml(card.title)}</h2>` : '<h2>Send an Enquiry</h2>';
      const submitLabel = escapeHtml(p.submitLabel || 'Submit');

      return `
<section class="tar-section" id="${escapeHtml(card.id)}">
  <div class="tar-container">
    <div class="tar-form">
      ${title}
      <form action="#submitted" method="POST">
        <div class="tar-field">
          <label class="tar-label" for="form-name">Name</label>
          <input class="tar-input" id="form-name" name="name" type="text" required />
        </div>
        <div class="tar-field">
          <label class="tar-label" for="form-contact">Email or Phone</label>
          <input class="tar-input" id="form-contact" name="contact" type="text" required />
        </div>
        <div class="tar-field">
          <label class="tar-label" for="form-message">Message</label>
          <textarea class="tar-textarea" id="form-message" name="message" required></textarea>
        </div>
        <button type="submit" class="tar-btn tar-btn-primary" style="width: 100%;">${submitLabel}</button>
      </form>
    </div>
  </div>
</section>`;
    }

    case 'cta': {
      const headline = escapeHtml(p.headline || card.title || 'Ready to Get Started?');
      const text = escapeHtml(p.text || '');
      const buttonLabel = escapeHtml(p.buttonLabel || 'Contact Us');
      const href = escapeHtml(p.href || '#contact');

      return `
<section class="tar-section" id="${escapeHtml(card.id)}">
  <div class="tar-container">
    <div class="tar-cta-card">
      <h2>${headline}</h2>
      ${text ? `<p style="max-width: 600px; margin: 0 auto calc(var(--space-unit)*3); color: var(--color-muted);">${text}</p>` : ''}
      <a href="${href}" class="tar-btn tar-btn-primary">${buttonLabel}</a>
    </div>
  </div>
</section>`;
    }

    case 'footer': {
      const brand = escapeHtml(p.brand || site.pages[0]?.title || 'TAR');
      const year = new Date().getFullYear();
      const text = escapeHtml(p.text || `© ${year} ${brand}. Built on TAR.`);
      const links = Array.isArray(p.links) ? p.links : [{ label: 'Privacy', href: '#' }, { label: 'Terms', href: '#' }];
      const renderedLinks = links
        .map((link: any) => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`)
        .join('');

      return `
<footer class="tar-footer" role="contentinfo">
  <div class="tar-container tar-footer-inner">
    <span>${text}</span>
    <ul class="tar-footer-links">
      ${renderedLinks}
    </ul>
  </div>
</footer>`;
    }

    default:
      return '';
  }
}

export async function compileSiteHtml(site: SiteDefinition, pageIndex = 0): Promise<{ html: string; css: string; hash: string }> {
  const page = site.pages[pageIndex] || site.pages[0];
  const css = compileCss(site.design);
  const cardMarkup = page.cards.map((card) => renderCard(card, site)).join('\n');

  const pageTitle = escapeHtml(page.title ? `${page.title} — ${site.pages[0]?.title || 'TAR'}` : 'TAR Site');
  const metaDesc = escapeHtml(page.meta?.description || 'Built on TAR.');

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: pageTitle,
    description: metaDesc,
    inLanguage: site.locale,
  };

  const html = `<!DOCTYPE html>
<html lang="${escapeHtml(site.locale || 'en')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <meta name="description" content="${metaDesc}">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:type" content="website">
  <script type="application/ld+json">
${JSON.stringify(structuredData, null, 2)}
  </script>
  <style>
${css}
  </style>
</head>
<body>
  <main>
${cardMarkup}
  </main>
</body>
</html>`;

  const bytes = new TextEncoder().encode(html + css);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hash = [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

  return { html, css, hash };
}
