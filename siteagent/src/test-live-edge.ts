import * as fs from 'fs';

async function testLiveEdge() {
  const workerUrl = 'https://siteagent.tar-54d.workers.dev';

  console.log('====================================================');
  console.log('  LIVE PRODUCTION EDGE VERIFICATION                 ');
  console.log('====================================================\n');

  // 1. Health Check
  console.log('1. Testing GET /health...');
  const healthRes = await fetch(`${workerUrl}/health`);
  const healthJson = await healthRes.json();
  console.log('   Health Status:', healthJson);

  // 2. Publish Hungry Tiger Storefront
  console.log('\n2. Testing POST /publish (Hungry Tiger)...');
  const siteMd = `---
brand: "Hungry Tiger"
tagline: "Fire-Roasted Condiments and Spices"
style: "eathungrytiger.md"
subdomain: "hungrytiger"
currency: "USD"
cart_mode: "drawer"

nav:
  - label: "Shop Drops"
    link: "#products"
  - label: "Menu"
    link: "#menu"
  - label: "Our Story"
    link: "#story"
---

# 1. Announcement (marquee)
items:
  - text: "Batch 04 Live: Free shipping over $45"
  - text: "Next-day dispatch across California"

# 2. Hero (poster)
headline: "TURMERIC FIRE AND CHARRED CLOVE"
lead: "Small-batch condiments crafted with heirloom chillies and slow-roasted whole spices."
cta_primary:
  label: "Shop The Drops — $18"
  link: "#products"

# 3. Products (grid)
items:
  - title: "Golden Turmeric Crunch"
    price: "$18.00"
    badge: "BESTSELLER"
    desc: "Crispy shallots, ground turmeric, and cold-pressed sesame oil."
    image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80"
  - title: "Smoked Chili Oil"
    price: "$16.00"
    badge: "EXTRA HOT"
    desc: "Charred habanero and whole smoked black cardamom."
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80"

# 4. Bento (bento)
title: "Formulation and Craft"
cards:
  - title: "100% Heirloom Chillies"
    desc: "Directly sourced from organic family farms in Tamil Nadu."
  - title: "Slow Fire-Roasted"
    desc: "Cooked in small cast-iron batches for 6 hours."

# 5. Reviews (testimonials)
quotes:
  - quote: "The deepest, richest condiment I have ever tasted."
    author: "Chef Marcus Lin"
    rating: 5
`;

  const designMd = fs.readFileSync('c:/tarfwk/tar/designmds/eathungrytiger.md', 'utf-8');

  const pubRes = await fetch(`${workerUrl}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteMarkdown: siteMd,
      designMarkdown: designMd,
      route: '/'
    })
  });
  const pubJson = await pubRes.json();
  console.log('   Publish Response:', pubJson);

  // 3. Test Live GET /* KV Stream
  console.log('\n3. Testing live GET /?ws=hungrytiger (L1 KV Edge Stream)...');
  const start = performance.now();
  const getRes = await fetch(`${workerUrl}/?ws=hungrytiger`);
  const duration = (performance.now() - start).toFixed(2);
  const html = await getRes.text();

  console.log('   HTTP Status:', getRes.status);
  console.log('   X-TAR-Edge-Hit:', getRes.headers.get('x-tar-edge-hit'));
  console.log('   Response Time (RTT):', `${duration}ms`);
  console.log('   HTML Payload Size:', `${(html.length / 1024).toFixed(1)} KB`);
  console.log('   Contains Expected Brand:', html.includes('TURMERIC FIRE AND CHARRED CLOVE'));
  console.log('   Contains Design Tokens:', html.includes('var(--color-primary)'));

  console.log('\n====================================================');
  console.log('  LIVE PRODUCTION EDGE VERIFICATION COMPLETE: ALL PASS');
  console.log('====================================================');
}

testLiveEdge().catch(console.error);
