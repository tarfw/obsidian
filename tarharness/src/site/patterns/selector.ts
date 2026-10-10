/**
 * JEV Pattern Selection Rules for the 70 pre-designed section types.
 *
 * Implements System One prompts and deterministic fallbacks to select the
 * best sequence of sections for a merchant's trade, brief, and facts.
 */

import type { SystemOneQuestion } from '../../brain/systemone.ts';
import { SECTION_CATALOG, type SectionPattern } from './catalog.ts';

export interface SelectorInput {
  trade: string;
  bullets: readonly string[];
  facts: {
    items?: number;
    proofs?: string[];
    season?: string;
    notice?: string;
    hasPhone?: boolean;
    hasAddress?: boolean;
  };
}

export interface SelectedSectionResult {
  patternId: number;
  slug: string;
  name: string;
  primitive: string;
  priority: number;
  reason: string;
}

/**
 * Returns System One questions for choosing auxiliary patterns beyond the code floor.
 */
export function buildPatternQuestions(input: SelectorInput): Record<string, SystemOneQuestion> {
  const isFestival = Boolean(input.facts.season || input.bullets.some((t) => /diwali|deepavali|pongal|festiv|offer|sale|discount/i.test(t)));
  const isLuxury = input.bullets.some((t) => /luxury|heritage|handcrafted|silk|pure|bridal|gold/i.test(t));
  const hasProof = (input.facts.proofs?.length ?? 0) > 0;

  const questions: Record<string, SystemOneQuestion> = {
    heroChoice: {
      type: 'choice',
      instructions: 'Which hero pattern best reflects the merchant tone and trade?',
      criteria: {
        split: 'Pattern #4: Split 50/50 editorial text + craft image',
        commerce: 'Pattern #16: Commerce hero with instant pricing and CTA',
        typography: 'Pattern #24: Typography hero with dark ink statement serif',
        seasonal: 'Pattern #17: Festive holiday banner with celebratory mood',
        minimal: 'Pattern #26: Clean minimalist layout with refined white space',
      },
    },
    merchandising: {
      type: 'choice',
      instructions: 'Which product collection section should lead the product presentation?',
      criteria: {
        bestsellers: 'Pattern #10: Best Sellers (social proof first)',
        featured: 'Pattern #6: Featured Products (curated loom showcase)',
        catalog: 'Pattern #7: Full Catalog (direct product listing)',
        categories: 'Pattern #8: Department Categories (broad discovery)',
      },
    },
  };

  if (isFestival) {
    questions.promotions = {
      type: 'choice',
      instructions: 'Which promotion ribbon best matches the festive context?',
      criteria: {
        banner: 'Pattern #5: Wide promotional announcement banner',
        flash: 'Pattern #13: Flash sale with festival urgency',
        offers: 'Pattern #12: Rupee discount savings strip',
      },
    };
  }

  if (hasProof || isLuxury) {
    questions.trustStyle = {
      type: 'choice',
      instructions: 'How should trust and authenticity be highlighted?',
      criteria: {
        badges: 'Pattern #46: Hallmark trust badges (Silk Mark, Handloom Mark)',
        values: 'Pattern #20: 3-column value propositions (Craft, COD, Delivery)',
        story: 'Pattern #23: Master weaver heritage & founding story',
      },
    };
  }

  return questions;
}

/**
 * Deterministic selector rules that guarantee a reliable, robust set of 6-8 sections
 * for any merchant trade, even if the LLM is offline.
 */
export function selectSectionsDeterministically(input: SelectorInput): SelectedSectionResult[] {
  const results: SelectedSectionResult[] = [];
  const bulletsStr = input.bullets.join(' ').toLowerCase();
  const tradeStr = input.trade.toLowerCase();

  const isFestival = Boolean(input.facts.season || /diwali|deepavali|pongal|festiv|offer|sale|discount/.test(bulletsStr));
  const isLuxury = /luxury|heritage|handcrafted|silk|kanchipuram|pure|zari|gold|handloom/.test(bulletsStr) || /silk|saree|jewel/.test(tradeStr);
  const hasProof = (input.facts.proofs?.length ?? 0) > 0;
  const itemCount = input.facts.items ?? 0;

  // 1. Mandatory Topbar: Announcement Bar (#1)
  if (input.facts.notice || isFestival) {
    results.push({
      patternId: 1,
      slug: 'announcement',
      name: 'Announcement Bar',
      primitive: 'nav',
      priority: 10,
      reason: isFestival ? 'Festive sale notice' : 'Shop notice',
    });
  }

  // 2. Mandatory Header: Brand Navigation (#2)
  results.push({
    patternId: 2,
    slug: 'header',
    name: 'Header / Brand Nav',
    primitive: 'nav',
    priority: 20,
    reason: 'Store brand header and navigation links',
  });

  // 3. Hero Section (#4 Split, #16 Commerce, #24 Typography, or #17 Seasonal)
  if (isFestival) {
    results.push({
      patternId: 17,
      slug: 'hero_seasonal',
      name: 'Seasonal / Festive Hero',
      primitive: 'hero',
      priority: 30,
      reason: 'Diwali festive lead hero banner',
    });
  } else if (isLuxury) {
    results.push({
      patternId: 4,
      slug: 'hero_split',
      name: 'Hero (Split 50/50)',
      primitive: 'hero',
      priority: 30,
      reason: 'Editorial craft showcase left with loom photo right',
    });
  } else {
    results.push({
      patternId: 16,
      slug: 'hero_commerce',
      name: 'Commerce Hero',
      primitive: 'hero',
      priority: 30,
      reason: 'Direct commerce spotlight with order action',
    });
  }

  // 4. Promo Banner (#5 or #12)
  if (isFestival) {
    results.push({
      patternId: 5,
      slug: 'banner_promo',
      name: 'Promotional Banner',
      primitive: 'banner',
      priority: 40,
      reason: 'Festival festive discount ribbon',
    });
  }

  // 5. Best Sellers (#10) or Featured Products (#6)
  if (itemCount > 4) {
    results.push({
      patternId: 10,
      slug: 'bestsellers',
      name: 'Best Sellers',
      primitive: 'collection',
      priority: 50,
      reason: 'Proven customer favorites',
    });
  }

  // 6. Core Product Catalog (#7)
  results.push({
    patternId: 7,
    slug: 'catalog',
    name: 'Product Collection / Catalog',
    primitive: 'collection',
    priority: 60,
    reason: 'Full catalog with WhatsApp quick order',
  });

  // 7. Value Props (#20) or Trust Badges (#46)
  if (hasProof || isLuxury) {
    results.push({
      patternId: 46,
      slug: 'trust_badges',
      name: 'Trust & Hallmark Badges',
      primitive: 'banner',
      priority: 70,
      reason: 'Verified Silk Mark and Handloom authenticity seals',
    });
  }

  // 8. Brand Story (#23)
  if (isLuxury || /story|weaver|craft|founder|heritage/.test(bulletsStr)) {
    results.push({
      patternId: 23,
      slug: 'brand_story',
      name: 'Brand Story / Heritage',
      primitive: 'cards',
      priority: 80,
      reason: 'Weaver craftsmanship and heritage story',
    });
  }

  // 9. FAQ (#37)
  results.push({
    patternId: 37,
    slug: 'faq',
    name: 'Frequently Asked Questions',
    primitive: 'accordion',
    priority: 90,
    reason: 'Assures delivery, COD, and fabric care before checkout',
  });

  // 10. Floating WhatsApp CTA (#65)
  results.push({
    patternId: 65,
    slug: 'whatsapp_float',
    name: 'WhatsApp Quick Chat Button',
    primitive: 'action',
    priority: 95,
    reason: 'Instant mobile messaging access',
  });

  // 11. Mandatory Footer (#68)
  results.push({
    patternId: 68,
    slug: 'footer',
    name: 'Footer (Shopify-Style)',
    primitive: 'nav',
    priority: 100,
    reason: 'Store links, contact details, payment seals',
  });

  return results.sort((a, b) => a.priority - b.priority);
}
