import { SectionBlock } from '../types';

export function renderMarqueeTicker(section: SectionBlock): string {
  const items: string[] = Array.isArray(section.data.items)
    ? section.data.items.map((it: any) => (typeof it === 'string' ? it : it.text || ''))
    : Array.isArray(section.data)
      ? section.data.map((it: any) => (typeof it === 'string' ? it : it.text || ''))
      : ['Free Worldwide Shipping on Orders Over $45', '100% Organic & Small Batch Formulated'];

  const contentString = items
    .map(text => `<span style="padding: 0 32px; font-family: var(--font-heading); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 12px;">${text} <span style="opacity: 0.4;">✦</span></span>`)
    .join('');

  return `
<section class="tar-marquee" style="background-color: var(--color-surface); border-bottom: 1px solid var(--color-border); overflow: hidden; padding: 12px 0; user-select: none;">
  <div class="tar-marquee-track">
    ${contentString}
    ${contentString}
  </div>
</section>
`;
}
