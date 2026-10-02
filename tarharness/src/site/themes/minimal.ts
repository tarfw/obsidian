import type { Design } from '../design.ts';
import { editorialLight } from './editorial.ts';

const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/**
 * Minimal Clean Theme
 * Mood: Modern neutral balanced canvas
 * Best fit: Clinics, wellness, software apps, trade services
 */
export const minimalClean: Design = {
  ...editorialLight,
  theme: 'minimal-clean',
  direction: {
    ...editorialLight.direction,
    idea: 'neutral restrained white canvas for a broad range of businesses',
  },
  color: {
    canvas: '#ffffff',
    ink: '#18181b',
    accent: '#2563eb',
    accentink: '#ffffff',
    surface: '#fafafa',
    border: '#e4e4e7',
    muted: '#71717a',
    success: editorialLight.color.success,
    danger: editorialLight.color.danger,
  },
  type: {
    ...editorialLight.type,
    display: SANS,
    heading: SANS,
    scale: 1.2,
  },
  space: { unit: 8, section: 96, container: 1100 },
  shape: { sm: 6, md: 10, lg: 14, pill: 9999 },
};
