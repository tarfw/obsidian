import { SiteConfig, SectionBlock } from '../types';
import { renderNavHeader } from './nav-header';
import { renderMarqueeTicker } from './marquee-ticker';
import { renderHeroPoster } from './hero-poster';
import { renderHeroSplit } from './hero-split';
import { renderProductGrid } from './product-grid';
import { renderVariantMatrix } from './variant-matrix';
import { renderQuickBuyBar } from './quick-buy-bar';
import { renderBentoGrid } from './bento-grid';
import { renderFoodMenu } from './food-menu';
import { renderStoryBanner } from './story-banner';
import { renderTrustBar } from './trust-bar';
import { renderTestimonials } from './testimonials';
import { renderAccordionFaq } from './accordion-faq';
import { renderLocationCard } from './location-card';
import { renderFooterSitemap } from './footer-sitemap';
import { renderCustomSlot } from './custom-slot';

export function renderSection(section: SectionBlock, config: SiteConfig): string {
  switch (section.type) {
    case 'nav-header':
      return renderNavHeader(config, section);
    case 'marquee':
      return renderMarqueeTicker(section);
    case 'hero-poster':
      return renderHeroPoster(section);
    case 'hero-split':
      return renderHeroSplit(section);
    case 'product-grid':
      return renderProductGrid(section);
    case 'variant-matrix':
      return renderVariantMatrix(section);
    case 'quick-buy-bar':
      return renderQuickBuyBar(config, section);
    case 'bento':
      return renderBentoGrid(section);
    case 'food-menu':
      return renderFoodMenu(section);
    case 'story-banner':
      return renderStoryBanner(section);
    case 'trust-bar':
      return renderTrustBar(section);
    case 'testimonials':
      return renderTestimonials(section);
    case 'faq':
      return renderAccordionFaq(section);
    case 'location-card':
      return renderLocationCard(section);
    case 'footer-sitemap':
      return renderFooterSitemap(config, section);
    case 'custom':
    default:
      return renderCustomSlot(section);
  }
}

export {
  renderNavHeader,
  renderMarqueeTicker,
  renderHeroPoster,
  renderHeroSplit,
  renderProductGrid,
  renderVariantMatrix,
  renderQuickBuyBar,
  renderBentoGrid,
  renderFoodMenu,
  renderStoryBanner,
  renderTrustBar,
  renderTestimonials,
  renderAccordionFaq,
  renderLocationCard,
  renderFooterSitemap,
  renderCustomSlot
};
