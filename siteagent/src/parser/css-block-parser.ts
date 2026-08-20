/**
 * css-block-parser.ts
 * Invariant: Machine-readable `:root {}` and `@theme {}` blocks are the primary token truth.
 */

export interface ParsedCssBlocks {
  rawRoot: string;
  rawTheme: string;
  variables: Record<string, string>;
  colors: Record<string, string>;
  fonts: Record<string, string>;
  radii: {
    cards?: string;
    buttons?: string;
    badges?: string;
    inputs?: string;
  };
  spacing: {
    pageMaxWidth?: string;
    sectionGap?: string;
    cardPadding?: string;
  };
}

export function parseCssBlocks(markdown: string): ParsedCssBlocks {
  const result: ParsedCssBlocks = {
    rawRoot: '',
    rawTheme: '',
    variables: {},
    colors: {},
    fonts: {},
    radii: {},
    spacing: {}
  };

  // 1. Extract `:root { ... }` block
  const rootMatch = markdown.match(/:root\s*\{([\s\S]*?)\}/);
  if (rootMatch && rootMatch[1]) {
    result.rawRoot = rootMatch[1].trim();
    
    // Parse individual CSS custom properties
    const lines = result.rawRoot.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
      
      const declMatch = trimmed.match(/^(--[a-zA-Z0-9\-_]+)\s*:\s*([^;]+);/);
      if (declMatch) {
        const [, token, rawVal] = declMatch;
        const val = rawVal.trim();
        result.variables[token] = val;

        // Classify token by category
        if (token.startsWith('--color-')) {
          result.colors[token] = val;
        } else if (token.startsWith('--font-')) {
          result.fonts[token] = val;
        } else if (token === '--radius-cards') {
          result.radii.cards = val;
        } else if (token === '--radius-buttons') {
          result.radii.buttons = val;
        } else if (token === '--radius-badges') {
          result.radii.badges = val;
        } else if (token === '--radius-inputs') {
          result.radii.inputs = val;
        } else if (token === '--page-max-width') {
          result.spacing.pageMaxWidth = val;
        } else if (token === '--section-gap') {
          result.spacing.sectionGap = val;
        }
      }
    }
  }

  // 2. Extract `@theme { ... }` block if present
  const themeMatch = markdown.match(/@theme\s*\{([\s\S]*?)\}/);
  if (themeMatch && themeMatch[1]) {
    result.rawTheme = themeMatch[1].trim();
  }

  return result;
}
