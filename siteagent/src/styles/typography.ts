/**
 * typography.ts
 * Invariant: Non-blocking web fonts with `font-display: swap` + fluid clamp() scales.
 */

import { DesignTokens } from '../types';

export function generateFontLinks(tokens: DesignTokens): string {
  const fonts = new Set<string>();
  const name = (tokens.name || '').toLowerCase();

  if (name.includes('tiger') || name.includes('hungry')) {
    fonts.add('Antonio:wght@700');
    fonts.add('Plus+Jakarta+Sans:wght@400;500;600;700');
  } else if (name.includes('sweetgreen') || name.includes('hartzler')) {
    fonts.add('Playfair+Display:ital,wght@0,600;0,700;1,400');
    fonts.add('Plus+Jakarta+Sans:wght@400;500;600');
  } else if (name.includes('adanola') || name.includes('cos') || name.includes('zellerfeld')) {
    fonts.add('Inter:wght@300;400;500;600;700');
    fonts.add('Syne:wght@600;700;800');
    fonts.add('JetBrains+Mono:wght@400;500');
  } else if (name.includes('redbrick') || name.includes('coffee')) {
    fonts.add('Space+Grotesk:wght@500;600;700');
    fonts.add('DM+Sans:wght@400;500;700');
  } else if (name.includes('seed') || name.includes('aware') || name.includes('misuko')) {
    fonts.add('Marcellus');
    fonts.add('Plus+Jakarta+Sans:wght@400;500;600');
  } else if (name.includes('supermush') || name.includes('behave')) {
    fonts.add('Outfit:wght@600;700;800;900');
    fonts.add('Inter:wght@400;500;600');
  } else if (name.includes('symbol') || name.includes('limon') || name.includes('houseplant') || name.includes('herono1')) {
    fonts.add('Cinzel:wght@600;700');
    fonts.add('Newsreader:ital,wght@0,400;0,500;1,400');
    fonts.add('Plus+Jakarta+Sans:wght@400;500');
  } else if (name.includes('telepathic') || name.includes('swimclub') || name.includes('basic') || name.includes('also')) {
    fonts.add('Space+Grotesk:wght@600;700');
    fonts.add('JetBrains+Mono:wght@400;500;600');
    fonts.add('Inter:wght@400;500;600');
  } else if (name.includes('freitag') || name.includes('counterprint')) {
    fonts.add('Public+Sans:wght@600;700;800');
    fonts.add('Inter:wght@400;500');
  } else if (name.includes('arte') || name.includes('afabrica') || name.includes('lego')) {
    fonts.add('Plus+Jakarta+Sans:wght@500;600;700;800');
    fonts.add('Inter:wght@400;500;600');
  } else {
    fonts.add('Plus+Jakarta+Sans:wght@500;600;700;800');
    fonts.add('Inter:wght@400;500;600');
  }

  const fontQuery = Array.from(fonts).map(f => `family=${f}`).join('&');
  return `<!-- Cloudflare / Google Fonts (Non-blocking with font-display: swap) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${fontQuery}&display=swap" rel="stylesheet">`;
}

export function generateFluidTypeScale(tokens: DesignTokens): string {
  return `
  --text-caption: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --text-body: clamp(0.875rem, 0.825rem + 0.25vw, 1rem);
  --text-subheading: clamp(1.125rem, 1rem + 0.5vw, 1.35rem);
  --text-heading: clamp(1.5rem, 1.25rem + 1.2vw, 2.25rem);
  --text-display: clamp(2.25rem, 1.5rem + 3.5vw, 4.5rem);
  `;
}
