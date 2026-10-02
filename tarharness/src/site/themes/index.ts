import type { Design } from '../design.ts';
import { editorialLight } from './editorial.ts';
import { editorialLookbook } from './lookbook.ts';
import { editorialChalk } from './chalk.ts';
import { streetwearDark } from './streetwear.ts';
import { minimalClean } from './minimal.ts';

export { editorialLight, editorialLookbook, editorialChalk, streetwearDark, minimalClean };

/** The universal default design token set. */
export const DEFAULT_DESIGN: Design = editorialLight;

/**
 * Registered theme catalog (siteai.md §5).
 * Adding a theme is catalog data: adding one needs no engine change.
 */
export const THEMES: Record<string, Design> = {
  'editorial-light': editorialLight,
  'editorial-lookbook': editorialLookbook,
  'editorial-chalk': editorialChalk,
  'streetwear-dark': streetwearDark,
  'minimal-clean': minimalClean,
};

export const THEME_IDS: readonly string[] = Object.keys(THEMES);
