import { SiteConfig, SectionBlock } from '../types';

export function renderFooterSitemap(config: SiteConfig, _section?: SectionBlock): string {
  const currentYear = new Date().getFullYear();
  const navItems = config.nav || [];
  const navLinksHtml = navItems.map(n => `<li><a href="${n.link}" style="color: var(--color-text-muted); transition: color 0.2s;">${n.label}</a></li>`).join('');

  return `
<footer class="tar-footer" style="border-top: 1px solid var(--color-border); background-color: var(--color-canvas); padding: 64px 0 32px; font-size: 14px;">
  <div class="tar-container">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 40px; margin-bottom: 48px;">
      <!-- Brand Column -->
      <div>
        <div style="font-family: var(--font-heading); font-size: 20px; font-weight: 700; margin-bottom: 12px;">${config.brand}</div>
        <p style="color: var(--color-text-muted); font-size: 13px; line-height: 1.6; max-width: 280px;">
          ${config.tagline || 'Crafted with precision on Cloudflare edge runtime.'}
        </p>
      </div>

      <!-- Navigation -->
      <div>
        <div style="font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text); margin-bottom: 16px;">Navigation</div>
        <ul style="list-style: none; display: flex; flex-direction: column; gap: 10px;">
          ${navLinksHtml}
        </ul>
      </div>

      <!-- Legal / Support -->
      <div>
        <div style="font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text); margin-bottom: 16px;">Assurance</div>
        <ul style="list-style: none; display: flex; flex-direction: column; gap: 10px; color: var(--color-text-muted);">
          <li>100% Secure Checkout</li>
          <li>Cold-Chain Insulated Shipping</li>
          <li>Privacy Policy & Terms</li>
        </ul>
      </div>
    </div>

    <!-- Bottom Copyright -->
    <div style="border-top: 1px solid var(--color-border); padding-top: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 12px; color: var(--color-text-muted);">
      <div>© ${currentYear} ${config.brand}. All rights reserved.</div>
      <div>Powered by TAR Framework Edge Engine</div>
    </div>
  </div>
</footer>
`;
}
