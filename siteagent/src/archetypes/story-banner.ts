import { SectionBlock } from '../types';

export function renderStoryBanner(section: SectionBlock): string {
  const d = section.data;
  const headline = d.headline || d.title || 'OUR SOURCING PHILOSOPHY';
  const body = d.body || d.desc || d.content || 'Every single ingredient is traceable to generational smallholder farms.';
  const image = d.image || d.media || '';

  return `
<section id="story" class="tar-story-banner" style="padding: var(--section-gap) 0; background-color: var(--color-surface);">
  <div class="tar-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 48px; align-items: center;">
    ${image ? `
    <div style="border-radius: var(--radius-cards); overflow: hidden; border: 1px solid var(--color-border);">
      <img src="${image}" alt="${headline}" style="width: 100%; height: auto; display: block; object-fit: cover;" loading="lazy" />
    </div>` : ''}

    <div>
      <div class="tar-badge" style="margin-bottom: 16px;">Heritage & Sourcing</div>
      <h2 style="font-family: var(--font-heading); font-size: var(--text-heading); font-weight: 700; line-height: 1.05; margin-bottom: 20px;">
        ${headline}
      </h2>
      <div style="font-size: var(--text-body); color: var(--color-text-muted); line-height: 1.6; display: flex; flex-direction: column; gap: 16px;">
        <p>${body}</p>
        ${d.author ? `<div style="font-weight: 600; color: var(--color-text); margin-top: 8px;">— ${d.author}</div>` : ''}
      </div>
    </div>
  </div>
</section>
`;
}
