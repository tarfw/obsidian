/**
 * designmd-parser.ts
 * Invariant: Merges machine-readable :root {} tokens with table metadata (semantic roles & font mappings).
 */

import { parseCssBlocks } from './css-block-parser';
import { parseTableMetadata } from './table-parser';
import { DesignTokens } from '../types';

export function parseDesignMarkdown(markdown: string): DesignTokens {
  const css = parseCssBlocks(markdown);
  const meta = parseTableMetadata(markdown);

  // Combine CSS colors with table color tokens
  const colors: Record<string, string> = { ...css.colors };
  
  // 1. Populate all color tokens from table
  for (const ct of meta.colorTokens) {
    if (ct.token && ct.value) {
      colors[ct.token] = ct.value;
      
      const role = (ct.role || '').toLowerCase();
      const token = ct.token.toLowerCase();

      // Semantic Primary
      if (!colors['--color-primary']) {
        if (role.includes('primary action') || role.includes('primary brand') || role.includes('primary color') || token.includes('primary') || token.includes('gold') || token.includes('forest') || token.includes('volt')) {
          colors['--color-primary'] = ct.value;
        }
      }

      // Semantic Canvas / Page Background
      if (!colors['--color-canvas']) {
        if (role.includes('page background') || role.includes('page canvas') || role.includes('canvas') || token.includes('canvas') || token.includes('rust') || token.includes('void')) {
          colors['--color-canvas'] = ct.value;
        }
      }

      // Semantic Surface / Card Background
      if (!colors['--color-surface']) {
        if (role.includes('card surface') || role.includes('card') || role.includes('surface') || token.includes('surface') || token.includes('spice') || token.includes('sand') || token.includes('mist')) {
          colors['--color-surface'] = ct.value;
        }
      }

      // Semantic Text Color
      if (!colors['--color-text']) {
        if (role.includes('primary text') || token.includes('text') || token.includes('shadow') || token.includes('ink')) {
          colors['--color-text'] = ct.value;
        }
      }
    }
  }

  // Fallbacks if any core semantic variable is missing
  if (!colors['--color-primary'] && meta.colorTokens.length > 0) {
    colors['--color-primary'] = meta.colorTokens[0].value;
  }
  if (!colors['--color-canvas']) {
    colors['--color-canvas'] = meta.theme === 'dark' ? '#121212' : '#ffffff';
  }
  if (!colors['--color-surface']) {
    colors['--color-surface'] = meta.theme === 'dark' ? '#1e1e1e' : '#ffffff';
  }
  if (!colors['--color-text']) {
    colors['--color-text'] = meta.theme === 'dark' ? '#ffffff' : '#111827';
  }

  // 2. Resolve Fonts from Typography Table
  const fonts: Record<string, string> = { ...css.fonts };
  if (!fonts['--font-heading'] && meta.fontDefinitions.length > 0) {
    const headFont = meta.fontDefinitions[0];
    const sub = headFont.substitute || headFont.name;
    fonts['--font-heading'] = `"${headFont.name}", "${sub.split(',')[0].trim()}", sans-serif`;
  }
  if (!fonts['--font-body'] && meta.fontDefinitions.length > 1) {
    const bodyFont = meta.fontDefinitions[meta.fontDefinitions.length - 1];
    const sub = bodyFont.substitute || bodyFont.name;
    fonts['--font-body'] = `"${bodyFont.name}", "${sub.split(',')[0].trim()}", sans-serif`;
  }

  // 3. Resolve Radii
  const radii = {
    cards: css.radii.cards || (meta.theme === 'dark' ? '16px' : '12px'),
    buttons: css.radii.buttons || '9999px',
    badges: css.radii.badges || '9999px',
    inputs: css.radii.inputs || '9999px'
  };

  // 4. Spacing
  const spacing = {
    pageMaxWidth: css.spacing.pageMaxWidth || '1280px',
    sectionGap: css.spacing.sectionGap || '80px',
    cardPadding: '20px'
  };

  return {
    name: meta.title,
    lead: meta.lead,
    theme: meta.theme,
    colors,
    rawColorTokens: meta.colorTokens,
    fonts,
    fontDefinitions: meta.fontDefinitions,
    typeScale: meta.typeScale,
    radii,
    spacing,
    rawCssRoot: css.rawRoot,
    rawThemeBlock: css.rawTheme
  };
}
