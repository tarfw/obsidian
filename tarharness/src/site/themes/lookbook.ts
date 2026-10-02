import type { Design } from '../design.ts';
import { editorialLight } from './editorial.ts';

/**
 * Editorial Lookbook Theme
 * Mood: Ultra-clean, monochrome fashion magazine on white paper
 * Best fit: Fashion, activewear, sarees, luxury apparel, jewelry
 */
export const editorialLookbook: Design = {
  ...editorialLight,
  theme: 'editorial-lookbook',
  direction: {
    ...editorialLight.direction,
    audience: 'fashion, activewear and editorial apparel audience',
    purpose: 'editorial lookbook on white paper with live catalog and photography',
    voice: 'understated, editorial and precise',
    density: 'balanced',
    idea: 'editorial lookbook on white paper with Favorit typography, black hairlines, and full-bleed photography',
  },
  color: {
    canvas: '#ffffff',
    ink: '#000000',
    accent: '#000000',
    accentink: '#ffffff',
    surface: '#e5e7eb',
    border: '#e5e5e5',
    muted: '#333333',
    success: editorialLight.color.success,
    danger: editorialLight.color.danger,
  },
  type: {
    ...editorialLight.type,
    display: 'Favorit, "Plus Jakarta Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    heading: 'Favorit, "Plus Jakarta Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    body: 'Favorit, "Plus Jakarta Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    base: 16,
    scale: 1.2,
    leading: 1.33,
    weight: 400,
    tracking: 0.025,
  },
  space: { unit: 4, section: 64, container: 1440 },
  shape: { sm: 0, md: 0, lg: 0, pill: 4 },
  elevation: { low: 0, high: 0 },
  layout: { columns: 4, gap: 16, align: 'start' },
  guidance: [
    'Warm fog #f0efe7 and blush sand #f5ebd5 are section banding tones; soft mist #e5e7eb alternates surfaces.',
    'Product photography carries all colour; chrome stays monochrome.',
  ],
};
