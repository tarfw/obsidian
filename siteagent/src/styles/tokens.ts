/**
 * tokens.ts
 * Invariant: Complete, authentic design system DNA for all 25 Refero styles.
 */

import { DesignTokens } from '../types';

export interface ResolvedThemeTokens {
  primary: string;
  canvas: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  fontHeading: string;
  fontBody: string;
  fontMono: string;
  radiusCard: string;
  radiusButton: string;
  radiusBadge: string;
  pageMaxWidth: string;
  sectionGap: string;
}

interface StyleArchetypeDna {
  primary: string;
  canvas: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  fontHeading: string;
  fontBody: string;
  fontMono: string;
  radiusCard: string;
  radiusButton: string;
  radiusBadge: string;
  isDark: boolean;
}

const STYLE_DNA_MAP: Record<string, StyleArchetypeDna> = {
  hungrytiger: {
    primary: '#faae33',
    canvas: '#823513',
    surface: '#402011',
    surfaceAlt: '#281006',
    text: '#ffffff',
    textMuted: 'rgba(255, 255, 255, 0.75)',
    border: 'rgba(250, 174, 51, 0.25)',
    accent: '#faae33',
    fontHeading: '"Antonio", sans-serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    radiusCard: '16px',
    radiusButton: '9999px',
    radiusBadge: '9999px',
    isDark: true,
  },
  sweetgreen: {
    primary: '#00473c',
    canvas: '#f4f3e7',
    surface: '#ffffff',
    surfaceAlt: '#d8e5d6',
    text: '#0e150e',
    textMuted: '#555555',
    border: '#d8e5d6',
    accent: '#e6ff55',
    fontHeading: '"Playfair Display", Georgia, serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    fontMono: 'ui-monospace, monospace',
    radiusCard: '24px',
    radiusButton: '9999px',
    radiusBadge: '9999px',
    isDark: false,
  },
  adanola: {
    primary: '#000000',
    canvas: '#ffffff',
    surface: '#ffffff',
    surfaceAlt: '#f0efe7',
    text: '#000000',
    textMuted: '#666666',
    border: '#e5e7eb',
    accent: '#000000',
    fontHeading: '"Syne", sans-serif',
    fontBody: '"Inter", sans-serif',
    fontMono: 'ui-monospace, monospace',
    radiusCard: '0px',
    radiusButton: '4px',
    radiusBadge: '0px',
    isDark: false,
  },
  redbrick: {
    primary: '#d9381e',
    canvas: '#fffbf7',
    surface: '#ffffff',
    surfaceAlt: '#fbeee6',
    text: '#1a1a1a',
    textMuted: '#737373',
    border: '#f2ded4',
    accent: '#d9381e',
    fontHeading: '"Space Grotesk", sans-serif',
    fontBody: '"DM Sans", sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    radiusCard: '8px',
    radiusButton: '6px',
    radiusBadge: '4px',
    isDark: false,
  },
  seed: {
    primary: '#004d40',
    canvas: '#f7f9f6',
    surface: '#ffffff',
    surfaceAlt: '#e8ede6',
    text: '#112211',
    textMuted: '#556655',
    border: '#d8e2d6',
    accent: '#004d40',
    fontHeading: '"Marcellus", Georgia, serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    fontMono: 'ui-monospace, monospace',
    radiusCard: '12px',
    radiusButton: '9999px',
    radiusBadge: '9999px',
    isDark: false,
  },
  supermush: {
    primary: '#ff4081',
    canvas: '#fff0f5',
    surface: '#ffffff',
    surfaceAlt: '#ffe4ee',
    text: '#1a0510',
    textMuted: '#703350',
    border: '#ffd0e0',
    accent: '#ff4081',
    fontHeading: '"Outfit", sans-serif',
    fontBody: '"Inter", sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    radiusCard: '24px',
    radiusButton: '9999px',
    radiusBadge: '9999px',
    isDark: false,
  },
  cos: {
    primary: '#111827',
    canvas: '#f9fafb',
    surface: '#ffffff',
    surfaceAlt: '#f3f4f6',
    text: '#111827',
    textMuted: '#6b7280',
    border: '#e5e7eb',
    accent: '#111827',
    fontHeading: '"Syne", sans-serif',
    fontBody: '"Inter", sans-serif',
    fontMono: 'ui-monospace, monospace',
    radiusCard: '0px',
    radiusButton: '0px',
    radiusBadge: '0px',
    isDark: false,
  },
  arte: {
    primary: '#b45309',
    canvas: '#faf5ef',
    surface: '#ffffff',
    surfaceAlt: '#f3ebd9',
    text: '#292524',
    textMuted: '#78716c',
    border: '#e7dcce',
    accent: '#b45309',
    fontHeading: '"Plus Jakarta Sans", sans-serif',
    fontBody: '"Inter", sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    radiusCard: '8px',
    radiusButton: '6px',
    radiusBadge: '4px',
    isDark: false,
  },
  afabrica: {
    primary: '#2563eb',
    canvas: '#f8fafc',
    surface: '#ffffff',
    surfaceAlt: '#eff6ff',
    text: '#0f172a',
    textMuted: '#64748b',
    border: '#e2e8f0',
    accent: '#2563eb',
    fontHeading: '"Plus Jakarta Sans", sans-serif',
    fontBody: '"Inter", sans-serif',
    fontMono: 'ui-monospace, monospace',
    radiusCard: '10px',
    radiusButton: '8px',
    radiusBadge: '6px',
    isDark: false,
  },
  also: {
    primary: '#059669',
    canvas: '#f0fdf4',
    surface: '#ffffff',
    surfaceAlt: '#dcfce7',
    text: '#064e3b',
    textMuted: '#047857',
    border: '#bbf7d0',
    accent: '#059669',
    fontHeading: '"Space Grotesk", sans-serif',
    fontBody: '"Inter", sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    radiusCard: '8px',
    radiusButton: '6px',
    radiusBadge: '4px',
    isDark: false,
  },
  aware: {
    primary: '#65a30d',
    canvas: '#f7fee7',
    surface: '#ffffff',
    surfaceAlt: '#ecfccb',
    text: '#1a2e05',
    textMuted: '#4d7c0f',
    border: '#d9f99d',
    accent: '#65a30d',
    fontHeading: '"Marcellus", serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    fontMono: 'ui-monospace, monospace',
    radiusCard: '12px',
    radiusButton: '9999px',
    radiusBadge: '9999px',
    isDark: false,
  },
  basicspace: {
    primary: '#4f46e5',
    canvas: '#f5f3ff',
    surface: '#ffffff',
    surfaceAlt: '#ede9fe',
    text: '#1e1b4b',
    textMuted: '#6366f1',
    border: '#ddd6fe',
    accent: '#4f46e5',
    fontHeading: '"Space Grotesk", sans-serif',
    fontBody: '"Inter", sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    radiusCard: '6px',
    radiusButton: '4px',
    radiusBadge: '4px',
    isDark: false,
  },
  counterprint: {
    primary: '#dc2626',
    canvas: '#ffffff',
    surface: '#ffffff',
    surfaceAlt: '#fef2f2',
    text: '#18181b',
    textMuted: '#71717a',
    border: '#e4e4e7',
    accent: '#dc2626',
    fontHeading: '"Public Sans", sans-serif',
    fontBody: '"Inter", sans-serif',
    fontMono: 'ui-monospace, monospace',
    radiusCard: '0px',
    radiusButton: '0px',
    radiusBadge: '0px',
    isDark: false,
  },
  eatbehave: {
    primary: '#db2777',
    canvas: '#fdf2f8',
    surface: '#ffffff',
    surfaceAlt: '#fce7f3',
    text: '#500724',
    textMuted: '#be185d',
    border: '#fbcfe8',
    accent: '#db2777',
    fontHeading: '"Outfit", sans-serif',
    fontBody: '"Inter", sans-serif',
    fontMono: 'ui-monospace, monospace',
    radiusCard: '20px',
    radiusButton: '9999px',
    radiusBadge: '9999px',
    isDark: false,
  },
  freitag: {
    primary: '#0284c7',
    canvas: '#f8fafc',
    surface: '#ffffff',
    surfaceAlt: '#f1f5f9',
    text: '#0f172a',
    textMuted: '#64748b',
    border: '#cbd5e1',
    accent: '#0284c7',
    fontHeading: '"Public Sans", sans-serif',
    fontBody: '"JetBrains Mono", monospace',
    fontMono: '"JetBrains Mono", monospace',
    radiusCard: '0px',
    radiusButton: '0px',
    radiusBadge: '0px',
    isDark: false,
  },
  hartzler: {
    primary: '#d97706',
    canvas: '#fffbeb',
    surface: '#ffffff',
    surfaceAlt: '#fef3c7',
    text: '#451a03',
    textMuted: '#92400e',
    border: '#fde68a',
    accent: '#d97706',
    fontHeading: '"Playfair Display", serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    fontMono: 'ui-monospace, monospace',
    radiusCard: '16px',
    radiusButton: '9999px',
    radiusBadge: '9999px',
    isDark: false,
  },
  herono1: {
    primary: '#0d9488',
    canvas: '#f0fdfa',
    surface: '#ffffff',
    surfaceAlt: '#ccfbf1',
    text: '#134e4a',
    textMuted: '#0f766e',
    border: '#99f6e4',
    accent: '#0d9488',
    fontHeading: '"Cinzel", serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    fontMono: 'ui-monospace, monospace',
    radiusCard: '8px',
    radiusButton: '6px',
    radiusBadge: '4px',
    isDark: false,
  },
  houseplant: {
    primary: '#78350f',
    canvas: '#fefce8',
    surface: '#ffffff',
    surfaceAlt: '#fef08a',
    text: '#451a03',
    textMuted: '#854d0e',
    border: '#fef08a',
    accent: '#78350f',
    fontHeading: '"Cinzel", serif',
    fontBody: '"Newsreader", serif',
    fontMono: 'ui-monospace, monospace',
    radiusCard: '12px',
    radiusButton: '9999px',
    radiusBadge: '9999px',
    isDark: false,
  },
  lego: {
    primary: '#e11d48',
    canvas: '#fff1f2',
    surface: '#ffffff',
    surfaceAlt: '#ffe4e6',
    text: '#881337',
    textMuted: '#be123c',
    border: '#fecdd3',
    accent: '#f59e0b',
    fontHeading: '"Plus Jakarta Sans", sans-serif',
    fontBody: '"Inter", sans-serif',
    fontMono: 'ui-monospace, monospace',
    radiusCard: '16px',
    radiusButton: '9999px',
    radiusBadge: '9999px',
    isDark: false,
  },
  limon: {
    primary: '#d97706',
    canvas: '#18181b',
    surface: '#27272a',
    surfaceAlt: '#3f3f46',
    text: '#ffffff',
    textMuted: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(217, 119, 6, 0.3)',
    accent: '#d97706',
    fontHeading: '"Cinzel", serif',
    fontBody: '"Newsreader", serif',
    fontMono: 'ui-monospace, monospace',
    radiusCard: '12px',
    radiusButton: '9999px',
    radiusBadge: '9999px',
    isDark: true,
  },
  misuko: {
    primary: '#ea580c',
    canvas: '#fff7ed',
    surface: '#ffffff',
    surfaceAlt: '#ffedd5',
    text: '#431407',
    textMuted: '#9a3412',
    border: '#fed7aa',
    accent: '#ea580c',
    fontHeading: '"Marcellus", serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    fontMono: 'ui-monospace, monospace',
    radiusCard: '14px',
    radiusButton: '9999px',
    radiusBadge: '9999px',
    isDark: false,
  },
  swimclub: {
    primary: '#0891b2',
    canvas: '#ecfeff',
    surface: '#ffffff',
    surfaceAlt: '#cffafe',
    text: '#164e63',
    textMuted: '#0e7490',
    border: '#a5f3fc',
    accent: '#0891b2',
    fontHeading: '"Space Grotesk", sans-serif',
    fontBody: '"JetBrains Mono", monospace',
    fontMono: '"JetBrains Mono", monospace',
    radiusCard: '4px',
    radiusButton: '4px',
    radiusBadge: '2px',
    isDark: false,
  },
  symbolaudio: {
    primary: '#9333ea',
    canvas: '#18181b',
    surface: '#27272a',
    surfaceAlt: '#3f3f46',
    text: '#ffffff',
    textMuted: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(147, 51, 234, 0.3)',
    accent: '#9333ea',
    fontHeading: '"Cinzel", serif',
    fontBody: '"Newsreader", serif',
    fontMono: 'ui-monospace, monospace',
    radiusCard: '8px',
    radiusButton: '6px',
    radiusBadge: '4px',
    isDark: true,
  },
  telepathicins: {
    primary: '#f43f5e',
    canvas: '#fff1f2',
    surface: '#ffffff',
    surfaceAlt: '#ffe4e6',
    text: '#1e293b',
    textMuted: '#64748b',
    border: '#fecdd3',
    accent: '#f43f5e',
    fontHeading: '"Space Grotesk", sans-serif',
    fontBody: '"JetBrains Mono", monospace',
    fontMono: '"JetBrains Mono", monospace',
    radiusCard: '0px',
    radiusButton: '0px',
    radiusBadge: '0px',
    isDark: false,
  },
  zellerfeld: {
    primary: '#6366f1',
    canvas: '#090d16',
    surface: '#131b2e',
    surfaceAlt: '#1e293b',
    text: '#ffffff',
    textMuted: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(99, 102, 241, 0.3)',
    accent: '#6366f1',
    fontHeading: '"Syne", sans-serif',
    fontBody: '"JetBrains Mono", monospace',
    fontMono: '"JetBrains Mono", monospace',
    radiusCard: '12px',
    radiusButton: '8px',
    radiusBadge: '6px',
    isDark: true,
  },
};

export function resolveTokens(tokens: DesignTokens): ResolvedThemeTokens {
  const isDark = tokens.theme === 'dark';
  const name = (tokens.name || '').toLowerCase();
  const cleanName = name.replace(/[^a-z0-9]/g, '');
  
  // Find matching style DNA
  let matchedDna: StyleArchetypeDna | null = null;
  for (const [key, dna] of Object.entries(STYLE_DNA_MAP)) {
    const cleanKey = key.replace(/[^a-z0-9]/g, '');
    if (
      cleanName.includes(cleanKey) ||
      cleanKey.includes(cleanName) ||
      (cleanKey === 'misuko' && cleanName.includes('belge')) ||
      (cleanKey === 'eatbehave' && cleanName.includes('behave')) ||
      (cleanKey === 'limon' && cleanName.includes('limon'))
    ) {
      matchedDna = dna;
      break;
    }
  }

  if (matchedDna) {
    return {
      primary: matchedDna.primary,
      canvas: matchedDna.canvas,
      surface: matchedDna.surface,
      surfaceAlt: matchedDna.surfaceAlt,
      text: matchedDna.text,
      textMuted: matchedDna.textMuted,
      border: matchedDna.border,
      accent: matchedDna.accent,
      fontHeading: matchedDna.fontHeading,
      fontBody: matchedDna.fontBody,
      fontMono: matchedDna.fontMono,
      radiusCard: matchedDna.radiusCard,
      radiusButton: matchedDna.radiusButton,
      radiusBadge: matchedDna.radiusBadge,
      pageMaxWidth: tokens.spacing.pageMaxWidth || '1280px',
      sectionGap: tokens.spacing.sectionGap || '80px',
    };
  }

  // Fallback if no exact DNA matched
  const c = tokens.colors;
  const primary = c['--color-primary'] || (isDark ? '#faae33' : '#004733');
  const canvas = c['--color-canvas'] || (isDark ? '#121212' : '#ffffff');
  const surface = c['--color-surface'] || (isDark ? '#1e1e1e' : '#ffffff');
  const surfaceAlt = c['--color-surface-alt'] || (isDark ? '#282828' : '#f4f4f5');
  const text = isDark ? '#ffffff' : '#111827';
  const textMuted = isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.6)';
  const border = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)';

  return {
    primary,
    canvas,
    surface,
    surfaceAlt,
    text,
    textMuted,
    border,
    accent: primary,
    fontHeading: tokens.fonts['--font-heading'] || '"Plus Jakarta Sans", sans-serif',
    fontBody: tokens.fonts['--font-body'] || '"Inter", sans-serif',
    fontMono: tokens.fonts['--font-mono'] || 'ui-monospace, monospace',
    radiusCard: tokens.radii.cards || (isDark ? '16px' : '12px'),
    radiusButton: tokens.radii.buttons || '9999px',
    radiusBadge: tokens.radii.badges || '9999px',
    pageMaxWidth: tokens.spacing.pageMaxWidth || '1280px',
    sectionGap: tokens.spacing.sectionGap || '80px',
  };
}
