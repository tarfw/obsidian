/**
 * 70 Pre-designed section types categorized into the 8 engine primitives.
 *
 * Each pattern specifies its semantic id, human label, engine primitive,
 * typical trade suitability, and default layout parameters.
 *
 * JEV selects from this catalog; the 8 engine primitives render them.
 */

export type EnginePrimitiveKind =
  | 'nav'
  | 'hero'
  | 'banner'
  | 'collection'
  | 'cards'
  | 'accordion'
  | 'media'
  | 'action';

export interface SectionPattern {
  id: number;
  slug: string;
  name: string;
  primitive: EnginePrimitiveKind;
  description: string;
  category: 'header_nav' | 'hero_spotlight' | 'products_merch' | 'social_trust' | 'info_service' | 'conversion_action';
  defaultSuitability?: string[];
}

export const SECTION_CATALOG: readonly SectionPattern[] = [
  // 1-5 Header & Intro
  { id: 1, slug: 'announcement', name: 'Announcement Bar', primitive: 'nav', category: 'header_nav', description: 'Top promo ribbon for shipping, festive sale, or operational notice.' },
  { id: 2, slug: 'header', name: 'Header / Brand Nav', primitive: 'nav', category: 'header_nav', description: 'Primary brand identity, logo, and core menu links.' },
  { id: 3, slug: 'megamenu', name: 'Navigation / Mega Menu', primitive: 'nav', category: 'header_nav', description: 'Multi-column category navigation for large catalogs.' },
  { id: 4, slug: 'hero_split', name: 'Hero (Split 50/50)', primitive: 'hero', category: 'hero_spotlight', description: 'Editorial headline left with product/craft photo right.' },
  { id: 5, slug: 'banner_promo', name: 'Promotional Banner', primitive: 'banner', category: 'hero_spotlight', description: 'Wide full-width banner highlight for sales or promotions.' },

  // 6-13 Products & Commerce Merchandising
  { id: 6, slug: 'products_featured', name: 'Featured Products', primitive: 'collection', category: 'products_merch', description: 'Hand-picked hero items curated for immediate purchase.' },
  { id: 7, slug: 'catalog', name: 'Product Collection / Catalog', primitive: 'collection', category: 'products_merch', description: 'Core product grid with price pill and instant WhatsApp order.' },
  { id: 8, slug: 'categories', name: 'Product Categories', primitive: 'collection', category: 'products_merch', description: 'Visual tiles for exploring catalog departments and varieties.' },
  { id: 9, slug: 'showcase', name: 'Product Showcase', primitive: 'collection', category: 'products_merch', description: 'Detailed focus spotlight on single flagship artisan creation.' },
  { id: 10, slug: 'bestsellers', name: 'Best Sellers', primitive: 'collection', category: 'products_merch', description: 'Socially proven popular products that sell most frequently.' },
  { id: 11, slug: 'newarrivals', name: 'New Arrivals', primitive: 'collection', category: 'products_merch', description: 'Latest additions from the loom or seasonal release.' },
  { id: 12, slug: 'sale_offers', name: 'Sale / Offers', primitive: 'banner', category: 'products_merch', description: 'Discount deals strip with clear rupee savings.' },
  { id: 13, slug: 'flash_sale', name: 'Flash Sale', primitive: 'banner', category: 'products_merch', description: 'Time-limited festive discount strip with countdown urgency.' },

  // 14-19 Discovery & Hero Variants
  { id: 14, slug: 'finder_quiz', name: 'Product Finder / Quiz', primitive: 'action', category: 'conversion_action', description: 'Interactive guided selection for finding the right saree/item.' },
  { id: 15, slug: 'search', name: 'Search Bar', primitive: 'action', category: 'conversion_action', description: 'Direct search input with quick suggestions.' },
  { id: 16, slug: 'hero_commerce', name: 'Commerce Hero', primitive: 'hero', category: 'hero_spotlight', description: 'Hero section with immediate price pill and direct order button.' },
  { id: 17, slug: 'hero_seasonal', name: 'Seasonal / Festive Hero', primitive: 'hero', category: 'hero_spotlight', description: 'Festival thematic banner (Diwali, Pongal, Wedding season).' },
  { id: 18, slug: 'product_carousel', name: 'Product Carousel', primitive: 'collection', category: 'products_merch', description: 'Horizontal swipeable product card rail for compact screens.' },
  { id: 19, slug: 'quick_order', name: 'Quick Order Strip', primitive: 'action', category: 'conversion_action', description: 'One-tap WhatsApp bulk or repeat ordering prompt.' },

  // 20-24 Brand Value & Luxury
  { id: 20, slug: 'value_props', name: 'Value Propositions', primitive: 'cards', category: 'social_trust', description: '3-4 core pillars: Genuine handloom, Free shipping, COD.' },
  { id: 21, slug: 'usp_strip', name: 'USP Icon Strip', primitive: 'cards', category: 'social_trust', description: 'Compact horizontal icons showing hallmark features.' },
  { id: 22, slug: 'brand_intro', name: 'Brand Intro', primitive: 'cards', category: 'social_trust', description: 'Brief statement of who the merchant is and what they craft.' },
  { id: 23, slug: 'brand_story', name: 'Brand Story / Heritage', primitive: 'cards', category: 'social_trust', description: 'Weaver or founder background, history, and craftsmanship lineage.' },
  { id: 24, slug: 'hero_typography', name: 'Typography Hero', primitive: 'hero', category: 'hero_spotlight', description: 'Oversized statement typography on dark ink or warm canvas.' },

  // 25-30 Media & Visual Proof
  { id: 25, slug: 'hero_media', name: 'Video / Media Hero', primitive: 'hero', category: 'hero_spotlight', description: 'Loom video or atmospheric visual banner.' },
  { id: 26, slug: 'hero_minimal', name: 'Minimal Hero', primitive: 'hero', category: 'hero_spotlight', description: 'Ultra-clean balanced spacing with minimal text and fast CTA.' },
  { id: 27, slug: 'brand_values', name: 'Brand Values', primitive: 'cards', category: 'social_trust', description: 'Artisan welfare, pure natural dyes, fair wages.' },
  { id: 28, slug: 'reviews', name: 'Customer Reviews', primitive: 'cards', category: 'social_trust', description: 'Star ratings and buyer quotes from real deliveries.' },
  { id: 29, slug: 'testimonials', name: 'Testimonials Carousel', primitive: 'cards', category: 'social_trust', description: 'Detailed patron stories with customer city and photo.' },
  { id: 30, slug: 'instagram_grid', name: 'Instagram Grid', primitive: 'media', category: 'social_trust', description: 'Visual social grid linking directly to merchant handle.' },

  // 31-36 Social Proof & Lookbooks
  { id: 31, slug: 'press_logos', name: 'Press / Media Mentions', primitive: 'cards', category: 'social_trust', description: 'Features in newspapers, weaver exhibitions, or craft guilds.' },
  { id: 32, slug: 'ugc_gallery', name: 'User Generated Gallery', primitive: 'media', category: 'social_trust', description: 'Real customer photos wearing the sarees or products.' },
  { id: 33, slug: 'influencer_picks', name: 'Influencer / Stylist Picks', primitive: 'collection', category: 'products_merch', description: 'Curated collection recommended by well-known stylists.' },
  { id: 34, slug: 'lookbook', name: 'Lookbook / Moodboard', primitive: 'media', category: 'social_trust', description: 'High-fashion editorial spread with lifestyle imagery.' },
  { id: 35, slug: 'before_after', name: 'Before & After / Making', primitive: 'media', category: 'social_trust', description: 'Raw silk yarn turning into woven zari Kanchipuram.' },
  { id: 36, slug: 'stats_counter', name: 'Key Statistics', primitive: 'cards', category: 'social_trust', description: 'Numbers: 40+ Years, 10,000+ Happy Brides, 100% Pure Silk.' },

  // 37-41 Service, FAQs & Engagement
  { id: 37, slug: 'faq', name: 'Frequently Asked Questions', primitive: 'accordion', category: 'info_service', description: 'Expandable Q&A covering shipping, payment, returns, and authenticity.' },
  { id: 38, slug: 'newsletter', name: 'Newsletter / Updates', primitive: 'action', category: 'conversion_action', description: 'WhatsApp broadcast or email subscription for new loom drops.' },
  { id: 39, slug: 'pricing_table', name: 'Tiered Pricing Table', primitive: 'cards', category: 'info_service', description: 'Clear tiered options for tailoring or wholesale packages.' },
  { id: 40, slug: 'features_grid', name: 'Features Grid', primitive: 'cards', category: 'info_service', description: 'Detailed technical points (Thread count, zari purity, weight).' },
  { id: 41, slug: 'countdown_timer', name: 'Countdown Ribbon', primitive: 'banner', category: 'conversion_action', description: 'Urgency ribbon for festival cut-off or seasonal shipping deadline.' },

  // 42-49 Interactive, Location & Trust
  { id: 42, slug: 'interactive_map', name: 'Store Location / Map', primitive: 'cards', category: 'info_service', description: 'Physical shop address, Google Maps link, and visiting hours.' },
  { id: 43, slug: 'contact_form', name: 'Contact / Enquiry Form', primitive: 'action', category: 'conversion_action', description: 'Direct order form with instant WhatsApp dispatch.' },
  { id: 44, slug: 'hours_info', name: 'Business Hours & Timings', primitive: 'cards', category: 'info_service', description: 'Daily shop opening hours, closed days, and best call times.' },
  { id: 45, slug: 'delivery_banner', name: 'Delivery Information Ribbon', primitive: 'banner', category: 'info_service', description: 'Same-day delivery in Chennai, 2-day delivery across South India.' },
  { id: 46, slug: 'trust_badges', name: 'Trust & Hallmark Badges', primitive: 'banner', category: 'social_trust', description: 'Silk Mark, Handloom Mark, 100% Genuine Zari verified seals.' },
  { id: 47, slug: 'security_guarantee', name: 'Security & Safe Checkout', primitive: 'cards', category: 'social_trust', description: 'Cash on delivery, safe packaging, insured transit.' },
  { id: 48, slug: 'expert_quote', name: 'Master Weaver Quote', primitive: 'cards', category: 'social_trust', description: 'Statement from the senior artisan on authenticity.' },
  { id: 49, slug: 'story_timeline', name: 'Heritage Milestones', primitive: 'cards', category: 'social_trust', description: '1974 Loom Founded -> 1995 Silk Mark -> 2026 Online Store.' },

  // 50-57 Rich Context & Custom Orders
  { id: 50, slug: 'behind_scenes', name: 'Behind the Scenes', primitive: 'media', category: 'social_trust', description: 'Photos of the dye vats, jacquard cards, and handloom pit.' },
  { id: 51, slug: 'meet_team', name: 'Meet the Artisans', primitive: 'cards', category: 'social_trust', description: 'Profiles of the master weavers behind the pieces.' },
  { id: 52, slug: 'sustainability', name: 'Sustainable & Natural Craft', primitive: 'cards', category: 'social_trust', description: 'Zero toxic runoff, eco-friendly natural dyes, cruelty-free ahimsa silk.' },
  { id: 53, slug: 'custom_order', name: 'Custom / Bridal Booking', primitive: 'action', category: 'conversion_action', description: 'Special order request for custom color or zari bespoke weaving.' },
  { id: 54, slug: 'bundle_builder', name: 'Festival Gift Box', primitive: 'collection', category: 'products_merch', description: 'Saree + blouse + veshti festive combo bundle.' },
  { id: 55, slug: 'gift_cards', name: 'Gift Vouchers', primitive: 'collection', category: 'products_merch', description: 'Wedding gift voucher denominations.' },
  { id: 56, slug: 'membership_vip', name: 'Patron Club / VIP Club', primitive: 'action', category: 'conversion_action', description: 'Exclusive early access to limited loom runs.' },
  { id: 57, slug: 'recently_viewed', name: 'Recently Viewed', primitive: 'collection', category: 'products_merch', description: 'Client-side memory of sarees viewed in current session.' },

  // 58-64 Guides, Policies & Specs
  { id: 58, slug: 'shipping_policy', name: 'Shipping & Delivery Policy', primitive: 'accordion', category: 'info_service', description: 'Dispatch times, domestic courier partners, international rates.' },
  { id: 59, slug: 'comparison_table', name: 'Silk Comparison Guide', primitive: 'cards', category: 'info_service', description: 'Kanchipuram vs Arani vs Banarasi silk differentiation guide.' },
  { id: 60, slug: 'video_walkthrough', name: 'Saree Draping Walkthrough', primitive: 'media', category: 'info_service', description: 'Helpful styling instructions and pleating advice.' },
  { id: 61, slug: 'return_policy', name: 'Returns & Exchange Terms', primitive: 'accordion', category: 'info_service', description: 'Clear 7-day exchange window with hassle-free pickup.' },
  { id: 62, slug: 'size_guide', name: 'Size & Dimension Guide', primitive: 'accordion', category: 'info_service', description: 'Saree length (6.2m including blouse), border width details.' },
  { id: 63, slug: 'care_guide', name: 'Silk Care & Storage Guide', primitive: 'accordion', category: 'info_service', description: 'Dry cleaning instructions, neem leaves, roll-storage advice.' },
  { id: 64, slug: 'live_chat_strip', name: 'Direct WhatsApp Helpline', primitive: 'banner', category: 'conversion_action', description: 'Call our Chennai boutique directly: +91 98400 xxxxx.' },

  // 65-70 Conversion, Bottom Utility & Footers
  { id: 65, slug: 'whatsapp_float', name: 'WhatsApp Quick Chat Button', primitive: 'action', category: 'conversion_action', description: 'Floating green WhatsApp action button pinned to bottom-right.' },
  { id: 66, slug: 'back_to_top', name: 'Back to Top Button', primitive: 'action', category: 'conversion_action', description: 'Smooth scroll button for quick navigation to top.' },
  { id: 67, slug: 'cookie_privacy', name: 'Privacy Notice', primitive: 'banner', category: 'info_service', description: 'Privacy & buyer protection disclosure.' },
  { id: 68, slug: 'footer', name: 'Footer (Shopify-Style)', primitive: 'nav', category: 'header_nav', description: 'Full brand footer with links, copyright, and payment method icons.' },
  { id: 69, slug: 'sticky_order_bar', name: 'Sticky Mobile Order Bar', primitive: 'nav', category: 'conversion_action', description: 'Bottom sticky bar on mobile showing total items and Checkout CTA.' },
  { id: 70, slug: 'order_status', name: 'Track Order / Courier Status', primitive: 'action', category: 'info_service', description: 'Enter order number to view WhatsApp courier tracking status.' },
] as const;

export function getPatternById(id: number): SectionPattern | undefined {
  return SECTION_CATALOG.find((p) => p.id === id);
}

export function getPatternBySlug(slug: string): SectionPattern | undefined {
  return SECTION_CATALOG.find((p) => p.slug === slug);
}

export function getPatternsByPrimitive(primitive: EnginePrimitiveKind): SectionPattern[] {
  return SECTION_CATALOG.filter((p) => p.primitive === primitive);
}
