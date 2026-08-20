import { SiteConfig, SectionBlock } from '../types';

export function renderNavHeader(config: SiteConfig, _section?: SectionBlock): string {
  const navItems = config.nav || [];
  const navLinksHtml = navItems
    .map(item => `<a href="${item.link}" class="tar-nav-link" style="transition: color 0.2s;">${item.label}</a>`)
    .join('');

  const mobileNavLinksHtml = navItems
    .map(item => `<a href="${item.link}" onclick="window.tarToggleMobileMenu()" style="font-family: var(--font-heading); font-size: 20px; font-weight: 600; padding: 12px 0; border-bottom: 1px solid var(--color-border);">${item.label}</a>`)
    .join('');

  const ctaHtml = config.header_cta
    ? `<a href="${config.header_cta.link}" class="tar-btn-primary" style="padding: 8px 18px; font-size: 13px;">${config.header_cta.label}</a>`
    : `<button class="tar-btn-primary tar-cart-trigger" style="padding: 8px 18px; font-size: 13px;" onclick="window.tarToggleCart()">Cart (<span id="tar-cart-count">0</span>)</button>`;

  return `
<header class="tar-header" style="position: sticky; top: 0; z-index: 100; backdrop-filter: var(--glass-blur); background-color: var(--glass-bg); border-bottom: 1px solid var(--glass-border);">
  <div class="tar-container" style="display: flex; align-items: center; justify-content: space-between; height: 68px;">
    <!-- Brand Logo / Wordmark -->
    <a href="/" style="display: flex; align-items: center; gap: 10px; font-family: var(--font-heading); font-weight: 700; font-size: 20px; letter-spacing: -0.02em;">
      ${config.logo ? `<img src="${config.logo}" alt="${config.brand}" style="height: 28px; width: auto;" />` : ''}
      <span>${config.brand}</span>
    </a>

    <!-- Desktop Navigation -->
    <nav class="tar-desktop-nav" style="display: flex; align-items: center; gap: 28px; font-size: 14px; font-weight: 500;">
      ${navLinksHtml}
    </nav>

    <!-- Header Actions & Mobile Hamburger -->
    <div style="display: flex; align-items: center; gap: 10px;">
      ${ctaHtml}
      <button class="tar-mobile-menu-btn" onclick="window.tarToggleMobileMenu()" aria-label="Toggle Menu" style="display: none; padding: 6px 10px; font-size: 22px; border-radius: 8px; background: var(--color-surface); border: 1px solid var(--color-border);">
        ☰
      </button>
    </div>
  </div>

  <!-- Mobile Slide-In Drawer -->
  <div id="tar-mobile-drawer" class="tar-mobile-drawer" style="display: none; position: fixed; inset: 68px 0 0 0; background: var(--color-canvas); z-index: 99; padding: 24px; flex-direction: column; gap: 16px; border-top: 1px solid var(--color-border); overflow-y: auto;">
    ${mobileNavLinksHtml}
  </div>
</header>
`;
}
