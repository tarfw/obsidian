/**
 * html-compiler.ts
 * Invariant: Single-pass pre-baking HTML compiler that inlines scoped CSS variables and non-blocking fonts.
 */

import { PageDocument, DesignTokens } from '../types';
import { generateScopedCss } from '../styles/css-generator';
import { generateFontLinks } from '../styles/typography';
import { renderSection, renderNavHeader, renderQuickBuyBar, renderFooterSitemap } from '../archetypes/index';
import { generateClientScripts } from './client-scripts';

export function compileHtml(page: PageDocument, tokens: DesignTokens): string {
  const config = page.config;
  const fontLinks = generateFontLinks(tokens);
  const scopedCss = generateScopedCss(tokens);
  const clientScripts = generateClientScripts(config.subdomain);

  // Compile section HTML
  const hasCustomNav = page.sections.some(s => s.type === 'nav-header');
  const hasCustomFooter = page.sections.some(s => s.type === 'footer-sitemap');

  const navHtml = hasCustomNav ? '' : renderNavHeader(config);
  const sectionsHtml = page.sections.map(sec => renderSection(sec, config)).join('\n');
  const quickBuyHtml = renderQuickBuyBar(config);
  const footerHtml = hasCustomFooter ? '' : renderFooterSitemap(config);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.brand}${config.tagline ? ` — ${config.tagline}` : ''}</title>
  
  ${fontLinks}

  <style id="tar-theme-tokens">
${scopedCss}
  </style>
</head>
<body>
  ${navHtml}
  <main>
    ${sectionsHtml}
  </main>
  ${quickBuyHtml}
  ${footerHtml}
  ${clientScripts}
</body>
</html>`;
}
