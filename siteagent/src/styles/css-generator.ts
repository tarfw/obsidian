/**
 * css-generator.ts
 * Invariant: Emits minified scoped CSS variables, fluid type, and modern resets.
 */

import { DesignTokens } from '../types';
import { resolveTokens } from './tokens';
import { generateFluidTypeScale } from './typography';
import { generateShadowTokens } from './shadows';

export function generateScopedCss(tokens: DesignTokens): string {
  const resolved = resolveTokens(tokens);
  const isDark = tokens.theme === 'dark';
  const fluidType = generateFluidTypeScale(tokens);
  const shadowTokens = generateShadowTokens(isDark);

  return `
/* ---------------------------------------------------- */
/* TAR THEME DESIGN TOKENS                              */
/* ---------------------------------------------------- */
:root {
  --color-primary: ${resolved.primary};
  --color-canvas: ${resolved.canvas};
  --color-surface: ${resolved.surface};
  --color-surface-alt: ${resolved.surfaceAlt};
  --color-text: ${resolved.text};
  --color-text-muted: ${resolved.textMuted};
  --color-border: ${resolved.border};
  --color-accent: ${resolved.accent};

  --font-heading: ${resolved.fontHeading};
  --font-body: ${resolved.fontBody};
  --font-mono: ${resolved.fontMono};

  --radius-cards: ${resolved.radiusCard};
  --radius-buttons: ${resolved.radiusButton};
  --radius-badges: ${resolved.radiusBadge};

  --page-max-width: ${resolved.pageMaxWidth};
  --section-gap: clamp(48px, 6vw, ${resolved.sectionGap});

  ${fluidType}
  ${shadowTokens}

  ${tokens.rawCssRoot}
}

/* ---------------------------------------------------- */
/* MODERN CSS RESETS & HIGH-PERFORMANCE BASE            */
/* ---------------------------------------------------- */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-family: var(--font-body);
  background-color: var(--color-canvas);
  color: var(--color-text);
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  min-height: 100vh;
  line-height: 1.5;
  overflow-x: hidden;
  background-color: var(--color-canvas);
}

img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
  height: auto;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  background: none;
}

/* ---------------------------------------------------- */
/* REUSABLE RESPONSIVE UTILITIES                        */
/* ---------------------------------------------------- */
.tar-container {
  width: 100%;
  max-width: var(--page-max-width);
  margin-left: auto;
  margin-right: auto;
  padding-left: clamp(16px, 4vw, 32px);
  padding-right: clamp(16px, 4vw, 32px);
}

.tar-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: var(--color-primary);
  color: ${isDark ? '#000000' : '#ffffff'};
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: var(--text-body);
  padding: 12px 28px;
  border-radius: var(--radius-buttons);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
  white-space: nowrap;
}
.tar-btn-primary:hover {
  transform: translateY(-2px);
  opacity: 0.95;
}

.tar-btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: transparent;
  color: var(--color-text);
  font-family: var(--font-heading);
  font-weight: 500;
  font-size: var(--text-body);
  padding: 11px 26px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-buttons);
  transition: background-color 0.2s ease, border-color 0.2s ease;
  white-space: nowrap;
}
.tar-btn-secondary:hover {
  background-color: var(--color-surface);
  border-color: var(--color-text);
}

.tar-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 12px;
  border-radius: var(--radius-badges);
  background-color: var(--color-surface);
  color: var(--color-primary);
  border: 1px solid var(--color-border);
}

.tar-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-cards);
  padding: clamp(16px, 3vw, 28px);
  box-shadow: var(--shadow-sm);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
}
.tar-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

/* ---------------------------------------------------- */
/* RESPONSIVE BREAKPOINTS & MEDIA QUERIES               */
/* ---------------------------------------------------- */
@media (max-width: 768px) {
  .tar-desktop-nav {
    display: none !important;
  }
  .tar-mobile-menu-btn {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
  }
  .tar-bento-card-span2 {
    grid-column: span 1 !important;
  }
  .tar-hero-poster h1 {
    font-size: clamp(2.5rem, 10vw, 4rem) !important;
  }
  .tar-footer-grid {
    grid-template-columns: 1fr !important;
    gap: 32px !important;
  }
}

@media (min-width: 769px) {
  .tar-mobile-drawer {
    display: none !important;
  }
}

/* ---------------------------------------------------- */
/* ANIMATION UTILITIES                                  */
/* ---------------------------------------------------- */
@keyframes tarMarquee {
  0% { transform: translateX(0%); }
  100% { transform: translateX(-50%); }
}

.tar-marquee-track {
  display: flex;
  width: max-content;
  animation: tarMarquee 28s linear infinite;
}
.tar-marquee-track:hover {
  animation-play-state: paused;
}
`;
}
