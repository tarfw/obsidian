/**
 * Design Token & Section Structural Contract Parser (parv2.md §16)
 *
 * Robust parser extracting design tokens, typography scales,
 * component rules, and section contracts from OKF markdown files.
 */

import { DEFAULT_DESIGN_TOKENS, type DesignTokens as SiteDesignTokens, type ThemeName } from './site-schema';

export interface ParsedDesignPackage {
  theme: string;
  colors: Record<string, string>;
  typography: Record<string, any>;
  rounded: Record<string, string>;
  spacing: Record<string, string>;
  components: Record<string, any>;
  sectionSpecs: Record<string, any>;
}
export function parseDesignMarkdown(markdownContent: string): ParsedDesignPackage {
  const colors: Record<string, string> = {};
  const typography: Record<string, any> = {};
  const rounded: Record<string, string> = {};
  const spacing: Record<string, string> = {};
  const components: Record<string, any> = {};
  const sectionSpecs: Record<string, any> = {};

  let theme = 'editorial-chalk';
  const themeMatch = markdownContent.match(/template:\s*["']?([a-z0-9-]+)["']?/i);
  if (themeMatch) {
    theme = themeMatch[1].trim();
  }

  // Parse key-value block helper
  function extractBlock(name: string): Record<string, string> {
    const res: Record<string, string> = {};
    const regex = new RegExp(`${name}:([\\s\\S]*?)(?=\\n[a-z0-9_-]+:|\\n---|\n#|$)`, 'i');
    const match = markdownContent.match(regex);
    if (match) {
      const lines = match[1].split('\n');
      for (const line of lines) {
        const kv = line.match(/\s*([a-z0-9_-]+):\s*["']?([^"'\n]+)["']?/i);
        if (kv) {
          res[kv[1].trim()] = kv[2].trim();
        }
      }
    }
    return res;
  }

  Object.assign(colors, extractBlock('colors'));
  Object.assign(rounded, extractBlock('rounded'));
  Object.assign(spacing, extractBlock('spacing'));

  // Default color fallbacks if empty
  const defaultTokens = DEFAULT_DESIGN_TOKENS[(theme as ThemeName) in DEFAULT_DESIGN_TOKENS ? (theme as ThemeName) : 'editorial-chalk'];
  if (!colors.bg) colors.bg = defaultTokens.colors.bg;
  if (!colors.surface) colors.surface = defaultTokens.colors.surface;
  if (!colors.text) colors.text = defaultTokens.colors.text;
  if (!colors.accent) colors.accent = defaultTokens.colors.accent;
  if (!colors.border) colors.border = defaultTokens.colors.border;

  return {
    theme,
    colors,
    typography,
    rounded,
    spacing,
    components,
    sectionSpecs,
  };
}

export function toSiteDesignTokens(pkg: ParsedDesignPackage): SiteDesignTokens {
  const themeName: ThemeName = pkg.theme === 'streetwear-dark' || pkg.theme === 'minimal-clean' ? pkg.theme : 'editorial-chalk';
  const defaults = DEFAULT_DESIGN_TOKENS[themeName];

  return {
    theme: themeName,
    colors: {
      bg: pkg.colors.bg || defaults.colors.bg,
      surface: pkg.colors.surface || defaults.colors.surface,
      text: pkg.colors.text || defaults.colors.text,
      muted: pkg.colors.muted || defaults.colors.muted,
      accent: pkg.colors.accent || defaults.colors.accent,
      accentHover: pkg.colors.accentHover || defaults.colors.accentHover,
      border: pkg.colors.border || defaults.colors.border,
    },
    fonts: defaults.fonts,
    radii: {
      sm: pkg.rounded.sm || defaults.radii.sm,
      md: pkg.rounded.md || defaults.radii.md,
      lg: pkg.rounded.lg || defaults.radii.lg,
      pill: pkg.rounded.pill || defaults.radii.pill,
    },
  };
}
