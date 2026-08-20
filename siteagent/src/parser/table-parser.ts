/**
 * table-parser.ts
 * Invariant: Parses markdown tables to enrich metadata (semantic roles, type scales, Do's/Don'ts).
 */

import { ColorToken, TypographyScaleItem, FontDefinition } from '../types';

export interface ParsedTableMetadata {
  title: string;
  lead: string;
  theme: 'light' | 'dark' | 'mixed';
  colorTokens: ColorToken[];
  fontDefinitions: FontDefinition[];
  typeScale: TypographyScaleItem[];
  dos: string[];
  donts: string[];
}

export function parseTableMetadata(markdown: string): ParsedTableMetadata {
  const result: ParsedTableMetadata = {
    title: 'Refero Style',
    lead: '',
    theme: 'light',
    colorTokens: [],
    fontDefinitions: [],
    typeScale: [],
    dos: [],
    donts: []
  };

  // 1. Title & Lead
  const titleMatch = markdown.match(/^#\s+([^\n—–]+)/m);
  if (titleMatch) result.title = titleMatch[1].trim();

  const leadMatch = markdown.match(/^>\s+([^\n]+)/m);
  if (leadMatch) result.lead = leadMatch[1].trim();

  const themeMatch = markdown.match(/\*\*Theme:\*\*\s*(light|dark|mixed)/i);
  if (themeMatch) result.theme = themeMatch[1].toLowerCase() as any;

  // 2. Color Table
  const colorSection = markdown.match(/## Tokens — Colors[\s\S]*?(?=## Tokens — Typography|## Tokens — Spacing|$)/i);
  if (colorSection) {
    const rows = colorSection[0].split('\n');
    for (const row of rows) {
      if (!row.startsWith('|') || row.includes('---') || row.includes('Value')) continue;
      const parts = row.split('|').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 3) {
        const name = parts[0];
        const value = parts[1].replace(/`/g, '');
        const token = parts[2].replace(/`/g, '');
        const role = parts[3] ? parts[3] : '';
        result.colorTokens.push({ name, value, token, role });
      }
    }
  }

  // 3. Type Scale Table
  const typeSection = markdown.match(/### Type Scale[\s\S]*?(?=## Tokens — Spacing|## Components|$)/i);
  if (typeSection) {
    const rows = typeSection[0].split('\n');
    for (const row of rows) {
      if (!row.startsWith('|') || row.includes('---') || row.includes('Line Height')) continue;
      const parts = row.split('|').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 4) {
        const role = parts[0];
        const size = parts[1];
        const lineHeight = parts[2];
        const letterSpacing = parts.length >= 5 ? parts[3] : undefined;
        const token = parts[parts.length - 1].replace(/`/g, '');
        result.typeScale.push({ role, size, lineHeight, letterSpacing, token });
      }
    }
  }

  // 4. Do's and Don'ts
  const dosMatch = markdown.match(/### Do[\s\S]*?(?=### Don't|## |$)/i);
  if (dosMatch) {
    result.dos = dosMatch[0]
      .split('\n')
      .filter(l => l.trim().startsWith('-'))
      .map(l => l.replace(/^-\s*/, '').trim());
  }

  const dontsMatch = markdown.match(/### Don't[\s\S]*?(?=## |$)/i);
  if (dontsMatch) {
    result.donts = dontsMatch[0]
      .split('\n')
      .filter(l => l.trim().startsWith('-'))
      .map(l => l.replace(/^-\s*/, '').trim());
  }

  return result;
}
