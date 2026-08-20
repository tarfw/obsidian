# siteagent — Universal Refero Design.md & Edge AI Agent Runtime
**Architecture Blueprint & Execution Plan**

---

## 1. Core Architectural Invariants

| Invariant | Implementation Rule | Performance Impact |
|---|---|---|
| **1. Zero Compilation on GET** | `GET /*` performs strictly `KV.get()` $\rightarrow$ HTML stream. Zero parsing or AST work on visitor path. | **< 2ms TTFB** edge delivery worldwide |
| **2. Machine-Readable Tokens First** | Parse `:root {}` & `@theme {}` (Section 8) first. Markdown tables are used only for metadata & LLM guardrails. | Eliminates markdown syntax parsing fragility |
| **3. Strict YAML Grammar** | Frontmatter + each `# Section (archetype)` body is parsed with standard YAML parser (`yaml`). No hand-rolled line splitting. | 100% robust handling of multiline text, quotes & arrays |
| **4. Pre-Compiled Scoped CSS** | Bespoke Tailwind slots are compiled at publish time. Zero runtime Tailwind JS in client. | Ships **< 4KB** micro-JS payload |
| **5. Non-Blocking Fonts** | Self-hosted cached `.woff2` via Cloudflare Fonts with `font-display: swap`. | Zero third-party render-blocking network hops |

---

## 2. Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                1. PUBLISH PATH (Async / Write)                         │
│                                                                                        │
│  [designmds/*.md]               [workspaces/<merchant>/site.md]                        │
│  (:root CSS block parsed first)  (Strict YAML Frontmatter + Section Blocks)            │
│                 │                               │                                      │
│                 ▼                               ▼                                      │
│  ┌──────────────────────────────┬────────────────────────────────────────────────────┐ │
│  │ 2. SITEAGENT COMPILER CORE   │ • Parses strict YAML section blocks                │ │
│  │                              │ • Resolves 14 Framer-grade archetypes              │ │
│  │                              │ • Compiles bespoke Tailwind slots into static CSS  │ │
│  │                              │ • Pre-bakes minified HTML + CSS variables + JS (<4KB)│
│  └──────────────────────────────┴─────────────────────────┬──────────────────────────┘ │
│                                                           │                            │
│                                                           ▼                            │
│                                            ┌──────────────────────────────┐            │
│                                            │ Writes to Cloudflare KV & R2 │            │
│                                            │ (key: `site:<subdomain>:<p>`)│            │
│                                            └──────────────────────────────┘            │
└───────────────────────────────────────────────────────────┬────────────────────────────┘
                                                            │
                                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                3. VISITOR PATH (Sync / Read)                           │
│                                                                                        │
│   GET https://brand.tarai.space/* ──▶ KV.get() ──▶ Stream HTML directly in < 2ms       │
│   (Zero AST parsing, Zero regex, Zero runtime JS compiler)                             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Layout

```
tar/
├── designmds/                        # Single source of truth (25 Curated E-Commerce Styles)
│   ├── adanola.md                    # Adanola (Activewear Lookbook)
│   ├── afabrica.md                   # Arsenijs Fabrica (Artisanal Beauty)
│   ├── also.md                       # ALSO (Urban Mobility & Goods)
│   ├── arte.md                       # Arte Antwerp (Streetwear Harvest)
│   ├── aware.md                      # A-WARE (Alpine Apothecary)
│   ├── basicspace.md                 # Basic.Space (Curated Drops & Vintage)
│   ├── cos.md                        # COS (Minimalist Tailoring)
│   ├── counterprint.md               # Counter-Print (Design Publishing)
│   ├── eatbehave.md                  # BEHAVE (Neon Confectionery)
│   ├── eathungrytiger.md             # Hungry Tiger (Fire-Roasted Condiments)
│   ├── freitag.md                    # FREITAG (Recycled Truck Tarp Bags)
│   ├── hartzler.md                   # Hartzler Family Dairy (Creamery Milk)
│   ├── herono1.md                    # Hero No. 1 (Fragrance & Bodycare)
│   ├── houseplant.md                 # HOUSEPLANT (Seth Rogen Ceramics)
│   ├── lego.md                       # LEGO (Primary-Color Bricks)
│   ├── limon.md                      # Limón (Moody Brasserie & Dining)
│   ├── misuko.md                     # Misuko (Cold-Pressed Juices)
│   ├── redbrickcoffee.md             # Redbrick Coffee (Specialty Roasters)
│   ├── seed.md                       # Seed Health (Synbiotic Probiotics)
│   ├── supermush.md                  # SuperMush (Functional Mushroom Mists)
│   ├── sweetgreen.md                 # Sweetgreen (Farm-Fresh Salads)
│   ├── swimclub.md                   # SwimClub (Performance Swimwear)
│   ├── symbolaudio.md                # Symbol Audio (Audiophile Consoles)
│   ├── telepathicins.md              # Telepathic Instruments (Synthesizers)
│   └── zellerfeld.md                 # Zellerfeld (3D-Printed Footwear)
│
└── siteagent/
    ├── package.json
    ├── tsconfig.json
    ├── wrangler.jsonc
    └── src/
        ├── index.ts                  # Worker fetch entrypoint (KV streaming on GET)
        ├── app.ts                    # Hono Router (/publish, /draft, /planner, /api/*)
        ├── types.ts                  # Strict Zod schemas (SiteConfig, DesignTokens, Section)
        ├── parser/
        │   ├── css-block-parser.ts   # Parses :root {} and @theme {} (Primary token truth)
        │   ├── table-parser.ts       # Parses markdown tables for metadata enrichment
        │   ├── designmd-parser.ts    # Merges CSS tokens + metadata into DesignTokens AST
        │   └── sitemd-parser.ts      # Strict YAML parser for site.md & pages/*.md
        ├── styles/
        │   ├── tokens.ts             # Token fallbacks & WCAG contrast verification
        │   ├── typography.ts         # Fluid clamp() scales & Cloudflare Fonts loader
        │   ├── shadows.ts            # Soft diffusion shadows & glassmorphism filters
        │   └── css-generator.ts      # Scoped CSS generator & minifier
        ├── archetypes/               # 14 Framer-Grade Primitives + Bespoke Slot
        │   ├── nav-header.ts         # Sticky glass header, search & mobile drawer
        │   ├── marquee-ticker.ts     # Infinite announcement rail
        │   ├── hero-poster.ts        # Display type with floating product cutouts
        │   ├── hero-split.ts         # Asymmetric 2-column editorial hero
        │   ├── product-grid.ts       # Catalog cards with badges, prices & quick-buy
        │   ├── variant-matrix.ts     # Size/color swatches, grind & subscription toggles
        │   ├── quick-buy-bar.ts      # Sticky bottom buy bar & slide-up cart drawer
        │   ├── bento-grid.ts         # 3-column & 2x2 asymmetric bento matrices
        │   ├── food-menu.ts          # Cafe / restaurant menu with dietary tags
        │   ├── story-banner.ts       # Narrative heritage spread with founder note
        │   ├── trust-bar.ts          # Trust badges (Organic, Vegan, Fair Trade)
        │   ├── testimonials.ts       # Customer review cards with verified buyer tags
        │   ├── accordion-faq.ts      # Smooth <details> disclosure FAQ rows
        │   ├── location-card.ts      # Address, hours, map & table reservation trigger
        │   ├── footer-sitemap.ts     # Multi-column sitemap & copyright
        │   └── custom-slot.ts        # Ahead-of-time compiled Tailwind bespoke slot
        ├── compiler/
        │   ├── html-compiler.ts      # Single-pass pre-baking compiler (Runs on /publish)
        │   └── client-scripts.ts     # < 4KB vanilla JS (drawer, cart, accordion, smooth scroll)
        ├── planner/
        │   ├── deterministic.ts      # Sub-1ms regex AST mutator
        │   └── llm-mutator.ts        # Groq LLaMA 3.3 70B surgical AST patcher
        ├── storage/
        │   ├── kv.ts                 # KV cache manager (STOREFRONT_CACHE)
        │   ├── r2.ts                 # R2 bucket sync (SITES_BUCKET, THEMES_BUCKET)
        │   └── turso.ts              # Turso event pipeline (orders, messages, bookings)
        └── test-render.ts            # Local validation test harness
```

---

## 4. Ground-Truth Refero E-Commerce Registry (25 Styles)

| # | Brand / Style | File Path | Theme | Aesthetic Character & Vertical |
|---|---|---|---|---|
| 1 | **Adanola** | [`adanola.md`](file:///c:/tarfwk/tar/designmds/adanola.md) | `light` | Editorial lookbook on white paper. Activewear & Athleisure |
| 2 | **Arsenijs Fabrica** | [`afabrica.md`](file:///c:/tarfwk/tar/designmds/afabrica.md) | `light` | Editorial beauty spread under gallery lights. Artisanal Cosmetics |
| 3 | **ALSO** | [`also.md`](file:///c:/tarfwk/tar/designmds/also.md) | `light` | Bicycle zine on cream paper. Urban Mobility & Lifestyle Goods |
| 4 | **Arte Antwerp** | [`arte.md`](file:///c:/tarfwk/tar/designmds/arte.md) | `light` | Golden hour harvest editorial. Streetwear & Outerwear |
| 5 | **A-WARE** | [`aware.md`](file:///c:/tarfwk/tar/designmds/aware.md) | `light` | Apothecary editorial on warm parchment. Performance Nutrition |
| 6 | **Basic.Space** | [`basicspace.md`](file:///c:/tarfwk/tar/designmds/basicspace.md) | `light` | Curated gallery on white marble. Limited Drops & Vintage Design |
| 7 | **COS** | [`cos.md`](file:///c:/tarfwk/tar/designmds/cos.md) | `light` | White-walled fashion gallery. Minimalist Tailoring & Apparel |
| 8 | **Counterprint** | [`counterprint.md`](file:///c:/tarfwk/tar/designmds/counterprint.md) | `light` | White gallery wall, books as art. Design Publishing & Books |
| 9 | **BEHAVE Candy** | [`eatbehave.md`](file:///c:/tarfwk/tar/designmds/eatbehave.md) | `light` | Neon candy-aisle pop. Low-Sugar Confectionery & Sweets |
| 10 | **Hungry Tiger** | [`eathungrytiger.md`](file:///c:/tarfwk/tar/designmds/eathungrytiger.md) | `dark` | Turmeric-bright graffiti on a tandoor wall. Fire-Roasted Condiments |
| 11 | **FREITAG** | [`freitag.md`](file:///c:/tarfwk/tar/designmds/freitag.md) | `light` | Swiss industrial catalog. Recycled Truck Tarp Bags & Accessories |
| 12 | **Hartzler Family Dairy** | [`hartzler.md`](file:///c:/tarfwk/tar/designmds/hartzler.md) | `light` | Creamery billboard at golden hour. Glass-Bottled Dairy & Milk |
| 13 | **Hero No. 1** | [`herono1.md`](file:///c:/tarfwk/tar/designmds/herono1.md) | `light` | Sculptor's atelier on white marble. High-End Bodycare & Fragrance |
| 14 | **HOUSEPLANT** | [`houseplant.md`](file:///c:/tarfwk/tar/designmds/houseplant.md) | `light` | Walnut bookstore on linen paper. Seth Rogen Ceramics & Goods |
| 15 | **LEGO** | [`lego.md`](file:///c:/tarfwk/tar/designmds/lego.md) | `light` | Primary-color toy aisle on white table. Bricks & Collectibles |
| 16 | **Limón** | [`limon.md`](file:///c:/tarfwk/tar/designmds/limon.md) | `dark` | Moody brasserie under candlelight. Specialty Dining & Beverages |
| 17 | **Misuko** | [`misuko.md`](file:///c:/tarfwk/tar/designmds/misuko.md) | `light` | Linen-bound brand cookbook. Cold-Pressed Organic Juices |
| 18 | **Redbrick Coffee** | [`redbrickcoffee.md`](file:///c:/tarfwk/tar/designmds/redbrickcoffee.md) | `light` | Scarlet ink editorial on butcher paper. Specialty Roasters & Beans |
| 19 | **Seed Health** | [`seed.md`](file:///c:/tarfwk/tar/designmds/seed.md) | `light` | Living organism under laboratory glass. Synbiotic Probiotics |
| 20 | **SuperMush** | [`supermush.md`](file:///c:/tarfwk/tar/designmds/supermush.md) | `light` | Skate ramp meets wellness billboard. Functional Mushroom Mists |
| 21 | **Sweetgreen** | [`sweetgreen.md`](file:///c:/tarfwk/tar/designmds/sweetgreen.md) | `light` | Farm-stand chalkboard at golden hour. Salads & Warm Bowls |
| 22 | **SwimClub** | [`swimclub.md`](file:///c:/tarfwk/tar/designmds/swimclub.md) | `mixed` | Clinical dossier behind pixelated LCD readouts. Performance Swimwear |
| 23 | **Symbol Audio** | [`symbolaudio.md`](file:///c:/tarfwk/tar/designmds/symbolaudio.md) | `dark` | Midcentury listening room after dusk. Vinyl Consoles & Storage |
| 24 | **Telepathic Instruments** | [`telepathicins.md`](file:///c:/tarfwk/tar/designmds/telepathicins.md) | `light` | Broadcast control room at golden hour. Analog Synthesizers |
| 25 | **Zellerfeld** | [`zellerfeld.md`](file:///c:/tarfwk/tar/designmds/zellerfeld.md) | `light` | Sculptor's atelier on white marble. 3D-Printed Footwear |

---

## 5. Merchant Workspace Spec (`site.md` & `pages/*.md`)

### Strict YAML Grammar Specification
```markdown
---
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
    link: "/story"
  - label: "Locations"
    link: "/contact"

header_cta:
  label: "Quick Order"
  link: "#quick-buy"
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

# 5. Bento (asymmetric-3col)
cards:
  - title: "100% Heirloom Chillies"
    desc: "Directly sourced from organic family farms in Tamil Nadu."
  - title: "Slow Fire-Roasted"
    desc: "Cooked in small cast-iron batches for 6 hours."
  - title: "Zero Preservatives"
    desc: "Pure cold-pressed oils, natural salt, and organic vinegars."

# 6. Reviews (masonry)
quotes:
  - quote: "The deepest, richest condiment I've ever tasted. Bought 4 jars."
    author: "Chef Marcus Lin"
    rating: 5

# 7. FAQ (accordion)
questions:
  - q: "How long does a jar last?"
    a: "Unopened jars last 12 months. Once opened, refrigerate and consume within 90 days."
```

### Multi-Page Edge Routing
* `GET /` $\rightarrow$ Compiles `pages/index.md` (or master `site.md`)
* `GET /menu` $\rightarrow$ Compiles `pages/menu.md` (inherits master theme & nav)
* `GET /catalog` $\rightarrow$ Compiles `pages/catalog.md` (catalog with category filters)
* `GET /story` $\rightarrow$ Compiles `pages/story.md` (narrative spreads)
* `GET /contact` $\rightarrow$ Compiles `pages/contact.md` (hours, map, table booking)

---

## 6. The 14 Visual Archetypes + Bespoke Slot

| # | Archetype Primitive | Visual Variants & Modes | E-Commerce Capabilities |
|---|---|---|---|
| 1 | **Header & Navigation** | `sticky-blur` \| `floating-pill` \| `minimal-split` | Logo, nav links, search trigger, cart counter pill |
| 2 | **Announcement Rail** | `infinite-marquee` \| `countdown-urgency` \| `static-bar` | Drop timers, shipping thresholds, flash announcements |
| 3 | **Hero Display** | `floating-cutout` \| `split-editorial` \| `cinematic-cover` | Massive display type, primary buy CTA, rating pill |
| 4 | **Product Showcase** | `high-heat-grid` \| `lookbook-masonry` \| `horizontal-rail` | Price badge, discount strike, quick-add button, tags |
| 5 | **Variant Selector Matrix** | `swatch-pills` \| `tier-cards` \| `sub-toggle` | Size, color, weight, one-time vs subscription selector |
| 6 | **Sticky Quick-Buy Bar** | `bottom-drawer` \| `floating-capsule` | Instant slide-up cart drawer, 1-tap checkout trigger |
| 7 | **Bento Feature Matrix** | `asymmetric-3col` \| `2x2-balanced` \| `stats-strip` | Ingredients, sourcing notes, material durability specs |
| 8 | **Restaurant / Cafe Menu** | `category-list` \| `tasting-grid` \| `split-columns` | Food/drink items, dietary icons (VG, GF), prices |
| 9 | **Brand Story & Heritage** | `journal-spread` \| `timeline` \| `quote-monument` | Founder note, craft manifesto, heritage imagery |
| 10 | **Trust & Certification Bar**| `badge-row` \| `icon-ticker` | Organic, Fair Trade, Dermatologist-tested, 30-Day Guarantee |
| 11 | **Customer Reviews Wall** | `star-cards` \| `masonry-quotes` \| `ugc-carousel` | Star rating, verified buyer badge, customer photo cards |
| 12 | **Accordion FAQ** | `smooth-disclosure` \| `split-questions` | Animated height transition, search filtering |
| 13 | **Location / Hours / Contact**| `store-locator` \| `map-card` \| `hours-table` | For cafes, bakeries, physical boutiques & restaurants |
| 14 | **Footer & Sitemap** | `multi-column-sitemap` \| `minimal-legal` | Navigation columns, copyright, currency/language selector |
| 🌟 | **Open Bespoke Slot** | `type: custom` (Ahead-of-Time Compiled CSS) | **100% arbitrary HTML/Tailwind for completely unique sections** |

---

## 7. Storage, Caching & API Endpoints

```
┌────────────────────────────────────────────────────────────────────────┐
│                              siteagent API                             │
├────────┬─────────────────┬─────────────────────────────────────────────┤
│ Method │ Route           │ Description                                 │
├────────┼─────────────────┼─────────────────────────────────────────────┤
│ GET    │ /*              │ Pure KV Read ──▶ Instant < 2ms HTML Stream  │
│ GET    │ /styles         │ Live JSON catalog of installed Refero styles│
│ POST   │ /publish        │ Parses YAML, builds HTML/CSS, writes to KV  │
│ POST   │ /draft          │ Fast draft preview compiler for app sandbox │
│ POST   │ /planner        │ Deterministic regex + LLM surgical mutator  │
│ POST   │ /api/order      │ E-commerce checkout writing to Turso DB     │
│ POST   │ /api/contact    │ Lead form pipeline to Turso inbox           │
│ POST   │ /api/booking    │ Reservation pipeline to workspace calendar  │
│ GET    │ /health         │ Worker health & bindings inspection         │
└────────┴─────────────────┴─────────────────────────────────────────────┘
```

---

## 8. Build & Execution Roadmap

1. **Step 1: Scaffolding `siteagent/`**: Initialize `package.json` (`hono`, `zod`, `yaml`, `@libsql/client`), `tsconfig.json`, and `wrangler.jsonc`.
2. **Step 2: Core Types & Tokens Engine**: Implement `src/types.ts`, `src/parser/css-block-parser.ts`, and `src/styles/tokens.ts`.
3. **Step 3: Refero Archetype Components**: Implement the 14 visual archetype renderers and `< 4KB` client micro-scripts.
4. **Step 4: Compilers (`designmd` & `sitemd`)**: Implement `src/parser/designmd-parser.ts`, `src/parser/sitemd-parser.ts`, and `src/compiler/html-compiler.ts`.
5. **Step 5: Planner & AI Mutation Engine**: Implement `src/planner/deterministic.ts` and `src/planner/llm-mutator.ts`.
6. **Step 6: Hono Edge Worker & Turso Event Pipeline**: Implement `src/app.ts` with pure KV stream on `GET /*` and Turso checkout events.
7. **Step 7: Reference Templates & Test Suite**: Validate live compilation across all 25 files in `c:\tarfwk\tar\designmds\` with `npx tsx test-render.ts`.
