import type { Design } from '../design.ts';
import { editorialLight } from './editorial.ts';

/**
 * Streetwear Dark Theme
 * Mood: Bold high-contrast dark canvas for expressive, high-energy brands
 * Best fit: Events, music, nightlife, creative studios, streetwear
 */
export const streetwearDark: Design = {
  ...editorialLight,
  theme: 'streetwear-dark',
  direction: {
    ...editorialLight.direction,
    idea: 'bold high-contrast dark canvas for expressive brands',
  },
  color: {
    canvas: '#111111',
    ink: '#f8fafc',
    accent: '#5e6ad2',
    accentink: '#ffffff',
    surface: '#1a1a1a',
    border: '#2a2a2a',
    muted: '#94a3b8',
    success: editorialLight.color.success,
    danger: editorialLight.color.danger,
  },
  type: {
    ...editorialLight.type,
    display: 'Impact, "Arial Black", sans-serif',
    heading: 'Impact, "Arial Black", sans-serif',
    scale: 1.333,
  },
  space: { unit: 8, section: 96, container: 1200 },
  shape: { sm: 2, md: 4, lg: 8, pill: 9999 },
};
