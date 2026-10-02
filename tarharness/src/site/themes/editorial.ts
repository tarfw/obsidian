import type { Design } from '../design.ts';

const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

/**
 * Editorial Light Theme
 * Mood: Warm literary elegance, classic serif
 * Best fit: Law, real estate, advisory, bookshops, consulting
 */
export const editorialLight: Design = {
  theme: 'editorial-light',
  direction: {
    audience: 'the workspace audience',
    purpose: 'present the workspace clearly and convert interest',
    voice: 'confident, plain and specific',
    density: 'balanced',
    idea: 'editorial white canvas with one decisive accent and generous section spacing',
  },
  color: {
    canvas: '#ffffff',
    ink: '#0b0b0c',
    accent: '#4d49fc',
    accentink: '#ffffff',
    surface: '#f7f7f8',
    border: '#e6e6ea',
    muted: '#5b6169',
    success: '#16794c',
    danger: '#b42318',
  },
  type: {
    display: SERIF,
    heading: SERIF,
    body: SANS,
    base: 16,
    scale: 1.25,
    leading: 1.6,
    weight: 600,
  },
  space: { unit: 4, section: 96, container: 1140 },
  shape: { sm: 4, md: 8, lg: 16, pill: 9999 },
  elevation: { low: 2, high: 14 },
  layout: { columns: 3, gap: 24, align: 'center' },
  motion: { duration: 200, easing: 'easeout', reduce: true },
  guidance: [],
};
