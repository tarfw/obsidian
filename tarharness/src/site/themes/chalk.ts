import type { Design } from '../design.ts';
import { editorialLight } from './editorial.ts';

const SERIF = 'Georgia, "Times New Roman", serif';

/**
 * Editorial Chalk Theme
 * Mood: Artisanal warm paper canvas with cobalt pop
 * Best fit: Cafes, bakeries, craft food, restaurants, causes
 */
export const editorialChalk: Design = {
  ...editorialLight,
  theme: 'editorial-chalk',
  direction: {
    ...editorialLight.direction,
    idea: 'warm editorial paper canvas with a single blue accent',
  },
  color: {
    canvas: '#edebe4',
    ink: '#01273e',
    accent: '#000bfa',
    accentink: '#ffffff',
    surface: '#f6f5f0',
    border: '#dcd9cf',
    muted: '#617282',
    success: editorialLight.color.success,
    danger: editorialLight.color.danger,
  },
  type: {
    ...editorialLight.type,
    display: SERIF,
    heading: SERIF,
  },
  space: { unit: 8, section: 96, container: 1140 },
  shape: { sm: 4, md: 8, lg: 16, pill: 9999 },
};
