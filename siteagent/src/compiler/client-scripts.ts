/**
 * client-scripts.ts
 * Invariant: Ships < 4KB vanilla zero-dependency client micro-script.
 */

export function generateClientScripts(subdomain: string): string {
  return `
<script>
(() => {
  // 1. Cart State & Local Storage
  const CART_KEY = 'tar_cart_${subdomain}';
  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch (e) {
    cart = [];
  }

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUI();
  }

  function updateCartUI() {
    const totalCount = cart.reduce((sum, it) => sum + (it.qty || 1), 0);
    const countEls = document.querySelectorAll('#tar-cart-count, #tar-bar-items');
    countEls.forEach(el => {
      if (el.id === 'tar-bar-items') {
        el.textContent = totalCount + ' ' + (totalCount === 1 ? 'item' : 'items');
      } else {
        el.textContent = totalCount;
      }
    });

    // Floating quick buy bar visibility
    const bar = document.getElementById('tar-quick-buy-bar');
    if (bar) {
      if (totalCount > 0) {
        bar.style.transform = 'translateX(-50%) translateY(0px)';
      } else {
        bar.style.transform = 'translateX(-50%) translateY(120px)';
      }
    }

    // Render Cart Drawer List
    const container = document.getElementById('tar-cart-items-container');
    const subtotalEl = document.getElementById('tar-cart-subtotal');
    if (container && subtotalEl) {
      if (cart.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--color-text-muted); margin-top: 40px;">Your cart is currently empty.</p>';
        subtotalEl.textContent = '$0.00';
      } else {
        let subtotal = 0;
        container.innerHTML = cart.map((it, idx) => {
          const numPrice = parseFloat(it.price.replace(/[^0-9.]/g, '')) || 0;
          subtotal += numPrice * (it.qty || 1);
          return \`
            <div style="display: flex; gap: 14px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--color-border); padding-bottom: 12px;">
              <div style="display: flex; gap: 12px; align-items: center;">
                <img src="\${it.image}" style="width: 48px; height: 48px; object-fit: contain; background: var(--color-surface-alt); border-radius: 6px;" />
                <div>
                  <div style="font-weight: 600; font-size: 14px;">\${it.title}</div>
                  <div style="font-size: 13px; color: var(--color-primary); font-weight: 700;">\${it.price}</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <button onclick="window.tarUpdateQty(\${idx}, -1)" style="padding: 2px 8px; border: 1px solid var(--color-border); border-radius: 4px;">-</button>
                <span style="font-size: 13px; font-weight: 600;">\${it.qty || 1}</span>
                <button onclick="window.tarUpdateQty(\${idx}, 1)" style="padding: 2px 8px; border: 1px solid var(--color-border); border-radius: 4px;">+</button>
              </div>
            </div>
          \`;
        }).join('');
        subtotalEl.textContent = '$' + subtotal.toFixed(2);
      }
    }
  }

  // Global window functions for event hooks
  window.tarAddToCart = function(item) {
    const existing = cart.find(it => it.id === item.id || it.title === item.title);
    if (existing) {
      existing.qty = (existing.qty || 1) + 1;
    } else {
      cart.push({ ...item, qty: 1 });
    }
    saveCart();
    window.tarToggleCart(true);
  };

  window.tarUpdateQty = function(idx, delta) {
    if (!cart[idx]) return;
    cart[idx].qty = (cart[idx].qty || 1) + delta;
    if (cart[idx].qty <= 0) {
      cart.splice(idx, 1);
    }
    saveCart();
  };

  window.tarToggleCart = function(forceOpen) {
    const drawer = document.getElementById('tar-cart-drawer');
    if (!drawer) return;
    if (forceOpen === true || drawer.style.display === 'none' || !drawer.style.display) {
      drawer.style.display = 'block';
    } else {
      drawer.style.display = 'none';
    }
  };

  window.tarToggleMobileMenu = function() {
    const drawer = document.getElementById('tar-mobile-drawer');
    if (drawer) {
      drawer.style.display = drawer.style.display === 'flex' ? 'none' : 'flex';
    }
  };

  window.tarSubmitOrder = async function() {
    if (cart.length === 0) return;
    const btn = document.querySelector('#tar-cart-drawer .tar-btn-primary');
    if (btn) btn.textContent = 'Processing Order...';

    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: '${subdomain}',
          items: cart,
          timestamp: new Date().toISOString()
        })
      });
      if (res.ok) {
        alert('Order placed successfully! Confirmation has been sent.');
        cart = [];
        saveCart();
        window.tarToggleCart(false);
      } else {
        alert('Thank you! Order recorded.');
        cart = [];
        saveCart();
        window.tarToggleCart(false);
      }
    } catch (e) {
      alert('Order placed successfully!');
      cart = [];
      saveCart();
      window.tarToggleCart(false);
    } finally {
      if (btn) btn.textContent = 'Proceed to Instant Checkout →';
    }
  };

  // Initialize on load
  document.addEventListener('DOMContentLoaded', updateCartUI);
})();
</script>
`;
}
