import { SiteConfig, SectionBlock } from '../types';

export function renderQuickBuyBar(config: SiteConfig, _section?: SectionBlock): string {
  return `
<!-- Floating Bottom Quick-Buy Bar (Mobile & Desktop) -->
<div id="tar-quick-buy-bar" style="position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(120px); z-index: 90; transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
  <div style="background-color: var(--glass-bg); backdrop-filter: var(--glass-blur); border: 1px solid var(--glass-border); box-shadow: var(--shadow-lg); padding: 10px 20px; border-radius: var(--radius-buttons); display: flex; align-items: center; gap: 16px;">
    <div style="font-size: 13px; font-weight: 500;">
      <span id="tar-bar-items">0 items</span> in bag
    </div>
    <button class="tar-btn-primary" style="padding: 8px 18px; font-size: 13px;" onclick="window.tarToggleCart()">
      Checkout Now →
    </button>
  </div>
</div>

<!-- Slide-Up Edge Cart Drawer -->
<div id="tar-cart-drawer" style="position: fixed; inset: 0; z-index: 200; display: none; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);">
  <div style="position: absolute; top: 0; right: 0; bottom: 0; width: 100%; max-width: 440px; background-color: var(--color-canvas); border-left: 1px solid var(--color-border); display: flex; flex-direction: column; box-shadow: var(--shadow-lg);">
    <!-- Cart Header -->
    <div style="padding: 20px 24px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between;">
      <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 700;">Your Cart</h3>
      <button onclick="window.tarToggleCart()" style="font-size: 20px; padding: 4px;">✕</button>
    </div>

    <!-- Cart Item List -->
    <div id="tar-cart-items-container" style="flex-grow: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px;">
      <p style="text-align: center; color: var(--color-text-muted); margin-top: 40px;">Your cart is currently empty.</p>
    </div>

    <!-- Cart Footer & 1-Tap Checkout -->
    <div style="padding: 20px 24px; border-top: 1px solid var(--color-border); background-color: var(--color-surface);">
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 16px; font-weight: 600;">
        <span>Subtotal</span>
        <span id="tar-cart-subtotal">$0.00</span>
      </div>
      <button class="tar-btn-primary" style="width: 100%; padding: 14px; font-size: 15px;" onclick="window.tarSubmitOrder()">
        Proceed to Instant Checkout →
      </button>
    </div>
  </div>
</div>
`;
}
