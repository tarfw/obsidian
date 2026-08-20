import { SectionBlock } from '../types';

export function renderLocationCard(section: SectionBlock): string {
  const d = section.data;

  return `
<section class="tar-location" style="padding: var(--section-gap) 0; background-color: var(--color-surface);">
  <div class="tar-container" style="max-width: 960px;">
    <div style="text-align: center; margin-bottom: 36px;">
      <h2 style="font-family: var(--font-heading); font-size: var(--text-heading); font-weight: 700;">
        ${d.title || 'Storefront & Tasting Studio'}
      </h2>
    </div>

    <div class="tar-card" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 32px; padding: 36px;">
      <div>
        <div style="font-weight: 600; font-size: 13px; text-transform: uppercase; color: var(--color-primary); margin-bottom: 8px;">Address</div>
        <p style="font-size: 16px; line-height: 1.5;">${d.address || '482 Market Street, San Francisco, CA'}</p>
      </div>

      <div>
        <div style="font-weight: 600; font-size: 13px; text-transform: uppercase; color: var(--color-primary); margin-bottom: 8px;">Hours</div>
        <p style="font-size: 16px; line-height: 1.5;">${d.hours || 'Tuesday – Sunday: 11:00 AM – 9:00 PM'}</p>
      </div>

      <div>
        <div style="font-weight: 600; font-size: 13px; text-transform: uppercase; color: var(--color-primary); margin-bottom: 8px;">Contact & Bookings</div>
        <p style="font-size: 16px; line-height: 1.5;">${d.phone || '+1 (415) 890-4421'}</p>
        <button class="tar-btn-primary" style="margin-top: 12px; padding: 8px 18px; font-size: 13px;">Reserve Tasting</button>
      </div>
    </div>
  </div>
</section>
`;
}
