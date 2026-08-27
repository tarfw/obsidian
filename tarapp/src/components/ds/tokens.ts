/**
 * Calm, restrained design tokens for the workspace surface.
 *
 * The product chrome (auth, credits, agents) keeps its existing brand styling.
 * The workspace path — home canvas, wizard, customizer, switcher — uses these
 * tokens only. No gradients, no shadows, no sparkles, no mascot.
 */

export const tokens = {
  color: {
    ink: '#172033',
    inkSoft: '#243047',
    inkMuted: '#68758c',
    inkFaint: '#7b879a',
    surface: '#ffffff',
    surfaceSunk: '#f7f8fc',
    surfaceSunken: '#f1f3f8',
    border: '#e3e7ef',
    borderSoft: '#e0e5ee',
    accent: '#172033',
    accentInk: '#ffffff',
    danger: '#b42318',
    dangerBg: '#fff1f0',
    success: '#18865b',
    successBg: '#e8f7f0',
    warningBg: '#fff7e6',
    pressedOverlay: 'rgba(22, 32, 51, 0.06)',
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 18,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  type: {
    meta: { fontSize: 11, lineHeight: 14, fontWeight: '600' as const, letterSpacing: 0.2 },
    label: { fontSize: 12, lineHeight: 16, fontWeight: '700' as const, letterSpacing: 0.4 },
    bodySm: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
    body: { fontSize: 15, lineHeight: 22, fontWeight: '500' as const },
    bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '700' as const },
    heading: { fontSize: 20, lineHeight: 26, fontWeight: '800' as const, letterSpacing: -0.4 },
    headingLg: { fontSize: 24, lineHeight: 30, fontWeight: '800' as const, letterSpacing: -0.6 },
    headingXl: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const, letterSpacing: -0.8 },
  },
} as const;

export type Tokens = typeof tokens;
