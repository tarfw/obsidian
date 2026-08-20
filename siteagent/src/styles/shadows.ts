/**
 * shadows.ts
 * Invariant: Diffusion shadows, glassmorphism blurs, and soft ambient glows.
 */

export function generateShadowTokens(isDark: boolean): string {
  if (isDark) {
    return `
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 12px -2px rgba(0, 0, 0, 0.6), 0 2px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 12px 28px -4px rgba(0, 0, 0, 0.7), 0 4px 12px -2px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 32px -4px var(--color-primary);
  --glass-blur: blur(16px);
  --glass-bg: rgba(18, 18, 18, 0.85);
  --glass-border: rgba(255, 255, 255, 0.12);
`;
  }

  return `
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 14px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 16px 36px -4px rgba(0, 0, 0, 0.1), 0 6px 16px -2px rgba(0, 0, 0, 0.04);
  --shadow-glow: 0 0 24px -2px rgba(0, 0, 0, 0.15);
  --glass-blur: blur(16px);
  --glass-bg: rgba(255, 255, 255, 0.85);
  --glass-border: rgba(0, 0, 0, 0.08);
`;
}
