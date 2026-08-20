/**
 * test-render.ts
 * Validation harness: Compiles sample merchant site against all 25 Refero styles.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseDesignMarkdown } from './parser/designmd-parser';
import { parseSiteMarkdown } from './parser/sitemd-parser';
import { compileHtml } from './compiler/html-compiler';

const SAMPLE_SITE_MD = `---
brand: "Hungry Tiger"
tagline: "Fire-Roasted Condiments & Spices"
style: "eathungrytiger.md"
subdomain: "hungrytiger"
currency: "USD"
cart_mode: "drawer"

nav:
  - label: "Shop Drops"
    link: "#products"
  - label: "Menu & Tasting"
    link: "/menu"
  - label: "Our Story"
    link: "#story"
  - label: "Locations"
    link: "#location"

header_cta:
  label: "Quick Order"
  link: "#products"
  type: "pill"
---

# 1. Announcement (marquee)
items:
  - text: "🔥 Batch #04 Live: Free shipping on all orders over $45"
  - text: "🚚 Next-day delivery across California"

# 2. Hero (poster)
headline: "TURMERIC FIRE & CHARRED CLOVE"
lead: "Small-batch condiments crafted with heirloom chillies and slow-roasted whole spices."
cta_primary:
  label: "Shop The Drops — $18"
  link: "#products"
cta_secondary:
  label: "Explore Taste Notes"
  link: "#story"
image: "/assets/bottles-hero.png"

# 3. Category Filter
tabs:
  - "All"
  - "Hot Sauces"
  - "Crunch Oils"
  - "Dry Rubs"

# 4. Products (grid)
items:
  - title: "Golden Turmeric Crunch"
    price: "$18.00"
    badge: "BESTSELLER"
    desc: "Crispy shallots, ground turmeric, and cold-pressed sesame oil."
    image: "/assets/jar-turmeric.png"
  - title: "Smoked Chili Oil"
    price: "$16.00"
    badge: "EXTRA HOT"
    desc: "Charred habanero and whole smoked black cardamom."
    image: "/assets/jar-chili.png"

# 5. Variant (variant-matrix)
title: "Select Your Supply & Formulation"
variants:
  - label: "Single Jar (250g)"
    price: "$18"
    active: true
  - label: "Tasting Bundle (3 x 250g)"
    price: "$48"
    save: "Save 15%"
  - label: "Chef Flagon (1 Liter)"
    price: "$64"
    save: "Best Value"

# 6. Menu (food-menu)
category: "Tasting Plates & Small Bites"
items:
  - item: "Fire-Roasted Paneer Tikka"
    price: "$14.00"
    tag: "VEGETARIAN"
    desc: "Marinated overnight in charred clove and wild mustard oil."
  - item: "Tandoori Chicken Roll"
    price: "$16.00"
    desc: "Lacha paratha, pickled onions, mint turmeric chutney."

# 7. Bento (bento)
title: "Craft & Formulation"
subtitle: "Every jar is cooked in small cast-iron batches"
cards:
  - title: "100% Heirloom Chillies"
    desc: "Directly sourced from organic family farms in Tamil Nadu."
    stat: "100%"
  - title: "Slow Fire-Roasted"
    desc: "Cooked in small cast-iron batches for 6 hours."
    stat: "6 Hours"
  - title: "Zero Preservatives"
    desc: "Pure cold-pressed oils, natural salt, and organic vinegars."
    stat: "0 Chemical"

# 8. Story (story-banner)
headline: "OUR SOURCING MANIFESTO"
body: "We partner directly with heritage spice growers to revive lost cultivars of South Asian chillies."
author: "Marcus Lin, Founder"

# 9. Trust (trust-bar)
badges:
  - "100% Heirloom Ingredients"
  - "Zero Preservatives"
  - "Direct Fair Trade Sourcing"
  - "30-Day Taste Guarantee"

# 10. Reviews (testimonials)
title: "Community & Press Reviews"
quotes:
  - quote: "The deepest, richest condiment I've ever tasted. Bought 4 jars."
    author: "Chef Marcus Lin"
    rating: 5
  - quote: "A pantry staple. The smoked cardamom crunch is unmatched."
    author: "Elena Rostova"
    rating: 5

# 11. FAQ (faq)
title: "Frequently Asked Questions"
questions:
  - q: "How long does an open jar last?"
    a: "Unopened jars last 12 months. Once opened, refrigerate and consume within 90 days."
  - q: "Is this suitable for vegans?"
    a: "Yes, 100% of our products are vegan and gluten-free."

# 12. Location (location-card)
title: "Tasting Studio & Kitchen"
address: "482 Market Street, San Francisco, CA"
hours: "Tue - Sun: 11:00 AM – 9:00 PM"
phone: "+1 (415) 890-4421"
`;

async function runValidation() {
  console.log('====================================================');
  console.log('  SITEAGENT TEST HARNESS: 25 REFERO STYLES TEST     ');
  console.log('====================================================\n');

  const designMdsDir = path.resolve('..', 'designmds');
  const files = fs.readdirSync(designMdsDir).filter(f => f.endsWith('.md'));

  console.log(`Found ${files.length} Refero style specifications in ${designMdsDir}\n`);

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(designMdsDir, file);
    const designMd = fs.readFileSync(filePath, 'utf-8');

    try {
      const startTime = performance.now();
      
      // 1. Parse Design Tokens
      const tokens = parseDesignMarkdown(designMd);
      
      // 2. Parse Site Markdown
      const pageDoc = parseSiteMarkdown(SAMPLE_SITE_MD);
      
      // 3. Compile HTML
      const html = compileHtml(pageDoc, tokens);
      const durationMs = (performance.now() - startTime).toFixed(2);

      // Verify HTML integrity
      if (!html.includes('<!DOCTYPE html>') || !html.includes('var(--color-primary)') || !html.includes('tar-cart-drawer')) {
        throw new Error('Compiled HTML missing required design token elements');
      }

      console.log(`✅ [${passed + 1}/${files.length}] ${file.padEnd(22)} ➔ Theme: ${tokens.name.padEnd(20)} (${durationMs}ms, ${(html.length / 1024).toFixed(1)} KB)`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAILED ${file}:`, err.message);
      failed++;
    }
  }

  console.log('\n====================================================');
  console.log(`RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runValidation();
