import { SectionBlock } from '../types';

export function renderVariantMatrix(section: SectionBlock): string {
  const d = section.data;
  const variants: any[] = Array.isArray(d.variants) ? d.variants : [
    { label: 'Single Jar (250g)', price: '$18', active: true },
    { label: 'Tasting Bundle (3 x 250g)', price: '$48', save: 'Save 15%' },
    { label: 'Chef Flagon (1 Liter)', price: '$64', save: 'Best Value' }
  ];

  const variantsHtml = variants.map((v, i) => `
    <label class="tar-card" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 18px 24px; border: 1.5px solid ${v.active ? 'var(--color-primary)' : 'var(--color-border)'};">
      <div style="display: flex; align-items: center; gap: 14px;">
        <input type="radio" name="tar-variant" value="${i}" ${v.active ? 'checked' : ''} style="accent-color: var(--color-primary); transform: scale(1.2);" />
        <div>
          <div style="font-weight: 600; font-size: var(--text-body);">${v.label}</div>
          ${v.save ? `<span class="tar-badge" style="font-size: 11px; margin-top: 4px; padding: 2px 8px;">${v.save}</span>` : ''}
        </div>
      </div>
      <div style="font-family: var(--font-heading); font-weight: 700; font-size: var(--text-subheading);">${v.price}</div>
    </label>
  `).join('');

  return `
<section class="tar-variant-matrix" style="padding: var(--section-gap) 0; background-color: var(--color-surface-alt);">
  <div class="tar-container" style="max-width: 760px;">
    <h2 style="font-family: var(--font-heading); font-size: var(--text-heading-sm); text-align: center; margin-bottom: 32px;">
      ${d.title || 'Select Your Supply & Formulation'}
    </h2>
    <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px;">
      ${variantsHtml}
    </div>
    <button class="tar-btn-primary" style="width: 100%; padding: 16px; font-size: 16px;">
      ${d.cta || 'Subscribe & Save 15% — Instant Dispatch'}
    </button>
  </div>
</section>
`;
}
