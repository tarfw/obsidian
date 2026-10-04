# Autonomous Store Agent — Jev-Based Complete Blueprint (v1 Launch)

> **Core Principle:** Autonomous-First, Approval-Based. AI does 95% of the work; the merchant approves with one tap. Manual editing is optional, never required.
> Jev decides, LLM writes, code assembles and guards money, edge serves for ₹0/visit.

> **Merchant's only job:** 📷 add products (photo) · ✅ confirm orders · 📦 ship.
> Everything else — design, content, SEO, translations, offers, agentic channels, maintenance — is done by AI agents.

---

## 1. System Overview

```
┌──────────────┐   ┌───────────┐   ┌───────────┐   ┌────────────┐   ┌───────────┐   ┌───────────┐
│ Merchant     │──►│  Agents   │──►│    Jev    │──►│    LLM     │──►│  Worker   │──►│ Edge (R2) │
│ photo / fact │   │ (plan)    │   │ (decide)  │   │ (write)    │   │ (assemble)│   │ (serve)   │
└──────────────┘   └───────────┘   └───────────┘   └────────────┘   └───────────┘   └───────────┘
   3 jobs only       code-owned       1 batched        slots only       validated       ₹0 / visit
                     workflow         call/signal      TA + EN          AST + audits
                                          │
                                          ▼
                              ┌─────────────────────────┐
                              │  MERCHANT APPROVAL TAP  │  one card, one tap, undo anytime
                              └─────────────────────────┘
```

### Autonomy Contract

| Invariant | Rule |
| :--- | :--- |
| **Zero design questions** | Agent decides theme, layout, sections, language. Asking the merchant to design is a failure mode |
| **Zero developer** | No code, no theme editor, no plugin, no SEO tool, no translator needed — ever |
| **Approval-based** | Agent proposes, merchant approves with 1 tap; safe changes auto-apply (see Autonomy Ladder) |
| **Money stays in code** | Prices, stock, tax, orders, payments are never decided by Jev or LLM |
| **Zero visit cost** | Public visits run 0 model calls; edge serves compiled pages |
| **Bounded AI** | At most 1 batched Jev call per signal; never chain, never loop, never re-ask |
| **Always reversible** | Every change is an immutable revision; 1-tap Undo restores it |
| **Always publish-ready** | Without any AI key, a deterministic category floor still yields a valid store |

---

## 2. Merchant Reality (Tamil Nadu & India SMB)

| Reality | Implication for the agent |
| :--- | :--- |
| Owner runs the shop alone (saree shop, bakery, jewellery, electronics, boutique) | One-person ops: **no admin panels**, only cards and taps |
| Phone is the only computer | Mobile-first merchant app; store is built and managed from the phone |
| Speaks Tamil / Tanglish, types little | Voice and photo are primary inputs; Tamil + English are first-class |
| Customers live on WhatsApp | WhatsApp order, share and float-button on every page; WhatsApp is a **channel**, not an add-on |
| Pay by UPI and COD, trust is low | UPI + COD journeys, COD confirmation, clear return and delivery promises |
| Local festivals drive sales (Pongal, Tamil New Year, Aadi, Deepavali) | Festival agent prepares offers and banners ahead of time |
| No design or SEO knowledge | Agent owns look, copy, SEO, sitemap, schema, speed |
| Tight margins, fear of tech bills | Cost per store per month in rupees, not dollars (see §13) |
| Mid-size businesses add staff and branches later | Same store scales to multiple categories, locations, staff roles without redesign |

### What the Merchant Never Sees

```
themes · templates · sections · variants · CSS · SEO tags · alt text · sitemap · schema ·
translations · contrast checks · image resizing · cache · deployment · plugins · updates
```

---

## 3. Agent Roster & Autonomy Ladder

### The AI Agents (all code-orchestrated; Jev/LLM are tools, not free-running loops)

| Agent | Job | Uses | Trigger |
| :--- | :--- | :--- | :--- |
| **Builder** | Business facts → complete store (category, theme, pages, sections) | Code + Jev | Onboarding |
| **Merchandiser** | Arranges rails, best sellers, featured, hides out-of-stock | Code + Jev (composite score) | Daily + stock/sales signal |
| **Writer** | Product titles, descriptions, story, FAQ, SEO meta in slots | LLM + Jev claims check | New product / edit |
| **Translator** | Tamil ↔ English parity for every visible string | LLM + Jev meaning check | Any text change |
| **Marketer** | Festival banners, offers, WhatsApp status text, share cards | Code calendar + Jev + LLM | Festival calendar |
| **Guardian** | Contrast, speed, broken links, price/stock drift, policy pages | Pure code (+ Jev for copy) | Every release + nightly |
| **Channel** | Syncs to WhatsApp catalog, Google feed, agent-readable endpoints | Code | Publish |
| **Concierge** | Triage customer WhatsApp / enquiries, draft replies | Jev (intent) + LLM draft | Inbound message |
| **Director** | Turns merchant voice / text fragments into surgical edits | 3-lane router | Merchant command |

### Autonomy Ladder (risk decides who acts)

| Level | Examples | Who decides | Jev gate |
| :--- | :--- | :--- | :--- |
| 🟢 **Auto-apply** | Hide sold-out item, resize/compress image, fix contrast, sitemap, alt text, broken link, stock badge | Agent | Code rule only |
| 🟡 **One-tap approve** | New store publish, festival banner, new product copy, price-neutral section reorder, Tamil text, discount badge | Agent proposes → merchant taps | Confidence ≥ policy, otherwise defer |
| 🔴 **Merchant-only** | Price changes, refunds, cancelling orders, taking payments live, deleting products | Merchant | Jev never decides; code asks |
| ⚫ **Never** | Inventing claims, reviews, certifications, discounts, delivery promises | Nobody | Blocked by claims registry |

### Approval Inbox (the merchant's only management surface)

```
┌────────────────────────────────────────────┐
│ KANCHI SILKS · Today                       │
│ ✅ Store live · 24 products · TA + EN      │
├────────────────────────────────────────────┤
│ DO NOW                                     │
│  ● Confirm 3 new orders                  › │
│  ● Ship 2 packed orders                  › │
├────────────────────────────────────────────┤
│ AGENT PROPOSALS (1 tap)                    │
│  🪔 Deepavali banner + 10% badge           │
│     [ Approve ] [ Change ] [ Skip ]        │
│  📝 Tamil text for "Silk Saree Red"        │
│     [ Approve ] [ Skip ]                   │
│  📦 Low stock: Blue Saree (2 left)         │
│     [ Hide when 0 ] [ Ignore ]             │
├────────────────────────────────────────────┤
│  📷 Add product      🎤 Tell your agent... │
└────────────────────────────────────────────┘
```

Every card shows **before / after preview** and a one-line reason.

---

## 4. Merchant Journey: Day 0 → Day 365

```
DAY 0 · 5 MINUTES
 phone OTP → business name + 1-line "what I sell" (voice or text) → WhatsApp / UPI / pincode → 3–10 photos
      │
      ▼
 Builder: 1 batched Jev call → category, theme, pages, sections, language → live PREVIEW
      │
      ▼
 Merchant taps [ Publish ] ──► tamilnadu.shop/kanchi-silks live in < 5 s (custom domain optional)

DAY 1..365 · AUTOPILOT
 new photo ──► Writer + Translator ──► product page card ──► 1 tap
 stock hits 0 ──► auto-hide + badge ──► nothing to do
 festival in 14 days ──► Marketer proposal ──► 1 tap
 order arrives ──► Inbox card ──► Confirm ──► Ship
 any time ──► 🎤 "banner konjam periya aakku" ──► Director patch ──► Undo available
```

### Onboarding: Only These Questions Are Ever Asked

| Question | Why Code/AI cannot guess |
| :--- | :--- |
| Business name | Identity |
| What do you sell? (one line, voice OK) | Source of category, tone, language |
| WhatsApp number, UPI ID, pincode / address | Legal and payment facts |
| Photos (3–10, then one at a time) | Source of products |

Never asked: theme, colors, fonts, layout, sections, SEO, language, domain.

---

## 5. Pages Plan (Generated Automatically)

All pages exist from Day 0 as deterministic templates; AI chooses variants and fills copy.

| Page | Route | Purpose | Auto Sections (Jev picks presence) |
| :--- | :--- | :--- | :--- |
| **Home** | `/` | First impression, trust, entry to catalog | Announcement, Nav, Hero, Trust strip, Category tiles, Featured, Offer banner, Story, Proof, FAQ teaser, Footer |
| **Shop** | `/shop` | All products with filters | Nav, Filters, Product grid, Footer |
| **Collection** | `/collection/[slug]` | One category or festival | Hero, Grid, Related, Footer |
| **Product (PDP)** | `/product/[slug]` | Convert a visitor | Gallery, Price, Variants, Stock badge, Quick Order (WhatsApp), Sizing, Delivery check, Details, Reviews, Related, Sticky Add-to-cart |
| **Search** | `/search` | Find by name, Tamil or English | Search box, results grid |
| **Cart** | drawer / `/cart` | Review, apply offer | Lines, totals, COD/UPI choice |
| **Checkout** | `/checkout` | Order by UPI / COD / WhatsApp | Address, Pincode serviceability, Payment, Confirm |
| **Order Success** | `/order/[id]` | Reassurance, next step | Summary, WhatsApp share, Track |
| **Order Tracking** | `/track` | Status without phone call | Order id lookup, timeline |
| **Offers / Festival** | `/offers`, `/festival/[slug]` | Seasonal landing | Hero, Countdown, Offer grid |
| **About / Story** | `/about` | Trust and brand | Story, Photos, Proof |
| **Contact** | `/contact` | Reach the owner | WhatsApp, Call, Map, Hours |
| **FAQ** | `/faq` | Remove objections | Accordion (questions from catalog and policy facts) |
| **Policies** | `/shipping`, `/returns`, `/privacy`, `/terms` | Trust and compliance | Generated from merchant facts only, never invented |
| **404 / Empty** | `/*` | Never a dead end | Search + best sellers |
| **Language Switch** | every page | Tamil ↔ English | Pre-rendered per language, no runtime AI |

---

## 6. Component Library (Hand-Built Moat)

> **Zero Hallucination Guarantee:** Every variant is hand-built, tested, accessible and SEO-optimized. Jev only selects from these strict presets.

| Section Type | Variants | Tunable Props |
| :--- | :--- | :--- |
| **Announcement Bar** | `static`, `ticker`, `countdown` | `text`, `tone` |
| **Nav** | `sticky`, `transparent`, `solid` | `search`, `language` |
| **Hero** | `split-left`, `split-right`, `centered`, `minimal-text`, `video`, `fullbleed` | `image`, `textAlign`, `ctaStyle` |
| **Trust Strip** | `icons`, `badges`, `numbers` | `items` (UPI, COD, returns, delivery, authentic) |
| **Category Tiles** | `circles`, `cards`, `tabs` | `columns` |
| **Product Grid** | `masonry`, `uniform-3`, `uniform-4`, `featured-row`, `carousel` | `columns`, `gap`, `quickAdd` |
| **Offer Banner** | `strip`, `split`, `countdown` | `tone`, `badge` |
| **Testimonials** | `carousel`, `grid`, `single-quote` | `count`, `style` |
| **Lookbook** | `full-bleed`, `collage`, `slider` | `imageCount` |
| **Story / About** | `text-only`, `image-left`, `image-right`, `founder` | — |
| **FAQ** | `accordion`, `two-column` | `count` |
| **PDP** | `gallery-left`, `gallery-top`, `sticky-buy` | `zoom`, `sizing`, `delivery` |
| **Contact** | `whatsapp-first`, `map-split` | `hours` |
| **WhatsApp Float** | `bubble`, `bar` | `message` |
| **Footer** | `minimal`, `multi-column`, `newsletter` | `links`, `social` |
| **Cart / Checkout** | `drawer`, `single-page`, `multi-step` | `cod`, `upi` |

Language-ready: every slot carries `ta` and `en`; layout never changes with language, only text and font stack.

---

## 7. Jev Decision Layer

### 7.1 How Jev Works (read before building)

Verified against the live TypeSafe docs (`how-to-build-with-system-one`, `confidence`, `primitives/*`):

| Fact | What it means for this plan |
| :--- | :--- |
| System One is **not an agent**; code owns control flow | Agents above are code workflows; Jev answers narrow questions inside them |
| Jev returns **typed answers**, never prose | Cannot write copy or invent IDs; copy is the LLM's job |
| Questions run **in parallel**, cannot see each other | Ask many independent questions in **one** request (speculative fan-out) |
| Question IDs are **not sent** to the model | Put the full meaning in `instructions` / `criteria`; ids are only for code |
| **Choice** → picks one option, has `probabilities` + `confidence` | Variants, themes, intents, targets |
| **Noul** → probability of yes (`noul`), **no** separate confidence | Presence toggles and verifications; treat near 0.5 as "unsure", not "medium" |
| **Score** → position on ordered levels (max 10), `score` + `confidence` | Tuning (warmth, density, boldness). Normalize each by `levels − 1` before combining |
| Confidence ≈ distribution concentration, not workflow correctness | Thresholds scale with **risk**, tested on our own Tamil/Tanglish data |
| Choose from **code-supplied menus**; the model can't pick an omitted value | Always include a no-match option when nothing may fit |

Question shape (API form used in snippets below):

```typescript
{ type: "choice", instructions: "…", criteria: { optionA: "meaning", optionB: "meaning" } }
{ type: "noul",   instructions: "Does `facts.x` … ?" }
{ type: "score",  instructions: "How … ?", criteria: ["level 0 situation", "level 1 situation", "level 2 situation"] }
```

### 7.2 Complete Judgment Catalog

| Agent | Judgment | Primitive | Options / Scope | Runs at |
| :--- | :--- | :---: | :--- | :--- |
| **Builder** | `category` | Choice | Registered store archetypes + `none` | Onboarding |
| | `hero`, `grid`, `nav`, `footer`, `checkout` | Choice | Component variants (§6) | Onboarding |
| | `palette` | Choice | Registered themes | Onboarding |
| | `warmth`, `density`, `weight`, `radius` | Score | Design tuning | Onboarding |
| | `proof`, `lookbook`, `video`, `newsletter`, `blog`, `story` | Noul | Section presence | Onboarding |
| | `sizing`, `delivery`, `cod`, `chat`, `festival` | Noul | Commerce / local feature presence | Onboarding |
| | `language` | Choice | `tamil`, `english`, `both` | Onboarding |
| **Intake** | `section` | Choice | Merchant's own category list + `new` | New product |
| | `sizing`, `perishable`, `giftable`, `variants` | Noul | Product traits that change page layout | New product |
| | `tier` | Score | Budget → premium (relative to own catalog) | New product |
| **Writer / Translator** | `supported` (per claim) | Noul | Claim backed by registered facts | Before approval card |
| | `meaning` (per string) | Noul | Tamil/English meaning preserved | Before approval card |
| | `register` | Choice | `formal`, `friendly`, `colloquial` | Translate |
| **Merchandiser** | `fit` (per product) | Score | Fit to season / festival / theme | Daily + signal |
| | `pair` (per product pair) | Noul | Sensible cross-sell | New product |
| **Marketer** | `offer` | Choice | Code-supplied offer types from margin rules | Festival window |
| **Director** | `lane`, `target`, `property` | Choice | Code / Jev / LLM lane, section, property | Merchant command |
| | 8-dimension redesign | Choice / Score / Noul | See §10 | Merchant command |
| **Concierge** | `intent` | Choice | `status`, `price`, `stock`, `complaint`, `other` | Inbound message |
| | `urgent` | Noul | Needs merchant now | Inbound message |
| **Order Shield** | `vague` | Noul | Address incomplete or unreachable | New COD order |
| | `risk` | Score | Low → high return-to-origin risk (hint only) | New COD order |

### 7.3 Store Genesis — One Batched Call, Whole Store

```typescript
// 1 request. ~25 independent questions run in parallel. Code consumes only applicable answers.
const response = await client.systemOne({
  state: {
    business: {
      name: "Kanchi Silks",
      brief: "kanchipuram pattu sarees, wedding and festival wear, small family shop in Kanchipuram",
      language_hint: "Tanglish, owner prefers Tamil",
    },
    catalog: {
      product_count: 18,
      price_range_inr: [1800, 18500],
      titles: ["Red Pattu Saree", "Green Kanchi Saree", "Maroon Bridal Saree"],
    },
    registered: {
      themes: ["editorial-lookbook", "editorial-light", "editorial-chalk", "streetwear-dark", "minimal-clean"],
    },
  },
  questions: {
    // ── CHOICE: structure, always from code-supplied menus ──
    category: {
      type: "choice",
      instructions: { question: "Which store archetype fits `business.brief`?", focus: "Judge what the shop sells, not how it wants to look." },
      criteria: {
        retail: { what: "Physical goods shipped to customers", not_for: "Bookings or service work", examples: ["sarees", "phone shop", "bakery packs"] },
        food: { what: "Food and drink with menu and hours", not_for: "Packaged goods shipped nationwide", examples: ["restaurant", "tiffin service"] },
        care: { what: "Personal appointments", not_for: "Selling goods", examples: ["salon", "clinic"] },
        none: { what: "Nothing fits clearly", not_for: "", examples: [] },
      },
    },
    palette: {
      type: "choice",
      instructions: "Which registered theme best suits `business.brief` and the customer it implies?",
      criteria: {
        "editorial-lookbook": "Fashion, apparel, sarees, jewellery, luxury boutique",
        "editorial-light": "Advisory, books, real estate, classic premium",
        "editorial-chalk": "Cafes, bakeries, artisan food, craft",
        "streetwear-dark": "Events, music, youth, streetwear",
        "minimal-clean": "Clinics, electronics, software, general utility",
      },
    },
    hero: { type: "choice", instructions: "Which hero fits a shop with `catalog.product_count` products?", criteria: { fullbleed: "Few strong photos, premium feel", "split-left": "Offer text beside one product", centered: "Brand-led, simple", none: "Many products, go straight to the grid" } },
    grid: { type: "choice", instructions: "Which product grid layout fits `catalog.price_range_inr` and photo style?", criteria: { "uniform-3": "Balanced catalogue", "uniform-4": "Many cheap items", "featured-row": "A few hero products", masonry: "Mixed photo shapes" } },
    // …nav, footer, checkout are the same pattern

    // ── SCORE: continuous tuning, always normalized in code ──
    warmth: { type: "score", instructions: "How warm and earthy should the palette feel for `business.brief`?", criteria: ["cool and neutral", "slightly warm", "very warm, festive, traditional"] },
    density: { type: "score", instructions: "How dense should the layout be for `catalog.product_count` products?", criteria: ["airy, few products", "balanced", "compact, many products"] },
    weight: { type: "score", instructions: "How bold should headings be for this brand voice?", criteria: ["light, elegant", "medium", "bold, loud"] },

    // ── NOUL: presence toggles; the probability IS the answer ──
    proof: { type: "noul", instructions: "Would a shop like `business.brief` benefit from a customer proof section?" },
    lookbook: { type: "noul", instructions: "Do the `catalog.titles` suggest a visual lookbook section helps sell them?" },
    sizing: { type: "noul", instructions: "Do the `catalog.titles` need a size or fit guide?" },
    delivery: { type: "noul", instructions: "Does a physical-goods shop like `business.brief` benefit from a delivery pincode checker?" },
    cod: { type: "noul", instructions: "Is cash on delivery likely to be expected by customers of `business.brief` in India?" },
    festival: { type: "noul", instructions: "Do sales of `business.brief` rise around Tamil festivals?" },

    language: { type: "choice", instructions: "Which language should the storefront lead with?", criteria: { tamil: "Local Tamil-speaking customers first", english: "Mixed or urban customers first", both: "Show a Tamil / English switch" } },
  },
});

// Code: for each answer, confidence ≥ 0.5 → use; otherwise category default floor (see §11).
// Noul < 0.35 → off, > 0.65 → on, between → code default for the category.
```

### 7.4 Product Intake — Photo Becomes a Product Page

```
photo ──► vision model (code-side): caption + attributes (colour, fabric, shape)  [draft only]
      ──► code: image quality gate (resolution, blur, duplicate, crop)             [deterministic]
      ──► Jev (1 batch): section, sizing, perishable, giftable, variants, tier     [judgment]
      ──► Writer (LLM): TA + EN title/description in slots                         [prose]
      ──► Jev: supported / meaning checks                                          [verification]
      ──► Approval card (1 tap)                                                    [merchant]
```

> Jev reads text, not pixels. A vision model turns the photo into a caption; Jev judges the caption plus merchant facts.

```typescript
const intake = await client.systemOne({
  state: {
    product: { caption: "red silk saree with gold zari border", price_inr: 8200, merchant_note: "pure pattu, wedding" },
    catalog: { sections: ["Bridal", "Festival", "Daily Wear"], price_median_inr: 6500 },
  },
  questions: {
    section: { type: "choice", instructions: "Which catalogue section should `product` go to?", criteria: { Bridal: "Wedding and heavy occasion wear", Festival: "Festive wear", "Daily Wear": "Light everyday wear", new: "None of the existing sections fits" } },
    sizing: { type: "noul", instructions: "Does `product` need a size or fit guide?" },
    giftable: { type: "noul", instructions: "Is `product` commonly bought as a gift?" },
    tier: { type: "score", instructions: "How premium is `product.price_inr` compared with `catalog.price_median_inr`?", criteria: ["well below typical", "typical", "clearly premium"] },
  },
});
```

### 7.5 Claims Guard — The Hallucination Firewall

The Writer may only assert **registered facts**. Code splits each draft sentence into claims and asks one Noul per claim (questions built in code, as the docs recommend).

```typescript
// Facts come from merchant input only: "pure pattu", "handwoven", "ships in 3 days", etc.
const guard = await client.systemOne({
  state: {
    facts: ["pure pattu silk", "handwoven in Kanchipuram", "ships in 3 working days", "COD available"],
    draft: ["Pure Mulberry silk", "Handwoven in Kanchipuram", "Free 24-hour delivery"],
  },
  questions: {
    claim0: { type: "noul", instructions: "Is `draft[0]` fully supported by something in `facts`?" },
    claim1: { type: "noul", instructions: "Is `draft[1]` fully supported by something in `facts`?" },
    claim2: { type: "noul", instructions: "Is `draft[2]` fully supported by something in `facts`?" },
  },
});
// Code: noul ≥ 0.85 keep; 0.35–0.85 drop claim and flag; < 0.35 drop claim.
// "Pure Mulberry silk" (specific) and "Free 24-hour delivery" are removed before the merchant ever sees the card.
```

### 7.6 Translation Parity — Tamil and English Always Match

```typescript
const parity = await client.systemOne({
  state: { english: "Handwoven pattu saree with gold zari border", tamil: "தங்க ஜரி பார்டருடன் கைத்தறி பட்டு புடவை" },
  questions: {
    meaning: { type: "noul", instructions: "Does `tamil` mean the same thing as `english`, with nothing added or missing?" },
    register: { type: "choice", instructions: "Which register is `tamil` written in?", criteria: { formal: "Literary or formal Tamil", friendly: "Polite everyday Tamil", colloquial: "Spoken slang" } },
  },
});
// Code: meaning < 0.8 → regenerate once → else English shows, Tamil queued for merchant review.
// Prices, numbers, units never go through translation: code formats them (₹ and Indian grouping).
```

### 7.7 Autopilot Merchandising — Composite Scoring

Raw judgments are stored once; weights change without rerunning Jev (composite-scoring pattern).

```typescript
// One Score question per product, same state, same levels so scores are comparable.
const fit = await client.systemOne({
  state: { season: { festival: "Deepavali", days_away: 14, region: "Tamil Nadu" }, product: { title: "Maroon Bridal Saree", section: "Bridal" } },
  questions: {
    fit: { type: "score", instructions: "How well does `product` fit buying demand for `season.festival`?", criteria: ["unlikely to sell in this season", "possible", "strong seasonal fit"] },
    giftable: { type: "noul", instructions: "Would customers buy `product` as a `season.festival` gift?" },
  },
});
// Code: rank = 0.5 * (fit.score / 2) + 0.2 * giftable.noul + 0.2 * stockHealth + 0.1 * margin   ← money and stock stay code
// Top N fill "Featured". Out-of-stock never ranks. Result → 🟡 one-tap proposal.
```

### 7.8 Order Shield and Inbox Concierge

```typescript
const order = await client.systemOne({
  state: { order: { payment: "COD", address: "Near temple, Kanchi", phone_verified: false }, rules: { needs: ["door no", "street", "pincode"] } },
  questions: {
    vague: { type: "noul", instructions: "Is `order.address` missing information required by `rules.needs`?" },
    risk: { type: "score", instructions: "How likely is a COD order with `order.address` and `order.phone_verified` to be refused at delivery?", criteria: ["very unlikely", "some risk", "high risk"] },
  },
});
// Code: hint on the order card ("Call to confirm address"); never auto-cancels. Merchant confirms.

const inbound = await client.systemOne({
  state: { message: "அண்ணா என் ஆர்டர் எப்ப வரும்?" },
  questions: {
    intent: { type: "choice", instructions: "What does the customer want in `message`?", criteria: { status: "Where is my order", price: "Price or discount", stock: "Availability", complaint: "Problem with a delivered order", other: "None of these" } },
    urgent: { type: "noul", instructions: "Does `message` express anger, a complaint, or a deadline that needs the owner now?" },
  },
});
// status → code answers from the order record. price/stock → code answers from catalog. complaint/urgent → merchant card.
// other → LLM drafts, merchant approves with 1 tap.
```

### 7.9 Confidence Policy — Thresholds Scale With Risk

| Answer type | Value consumed | Act automatically | Ask merchant (1 tap) | Do not act |
| :--- | :--- | :--- | :--- | :--- |
| **Choice** (variant, theme) | `confidence` | ≥ 0.5 (harmless preference, recoverable) | < 0.5 → pick category default | — |
| **Choice** (intent, lane) | `confidence` | ≥ 0.8 | 0.5–0.8 | < 0.5 → ask |
| **Noul** (section on/off) | `noul` | ≥ 0.65 on · ≤ 0.35 off | 0.35–0.65 → category default | — |
| **Noul** (claims, meaning) | `noul` | ≥ 0.85 keep | 0.35–0.85 → drop and flag | < 0.35 → drop |
| **Score** (tuning) | `score ÷ (levels−1)` | `confidence` ≥ 0.4 | Below → category default | — |
| **Anything touching money** | — | **never** | Merchant | Code only |

```typescript
// Noul has no confidence field; use distance from 0.5 only if one gate must handle both types.
const noulConfidence = (p: number) => Math.abs(2 * p - 1);
```

> Thresholds above are **starting values**. Calibrate on our own Tamil/Tanglish test sets (§14) by plotting confidence against accuracy, as the docs advise.

---

## 8. LLM Copy Layer (Prose Only, Slots Only)

```
Jev decides what sections exist  →  LLM fills only declared slots  →  Jev claims + meaning check  →  Merchant 1 tap
```

| Slot | Limit | Languages | Rule |
| :--- | :--- | :--- | :--- |
| Hero headline / subtext | 6 / 18 words | TA + EN | Uses registered brand facts only |
| Product title / description | 12 / 60 words | TA + EN | Uses caption + merchant note + claims registry |
| About / story | 120 words | TA + EN | From onboarding line + merchant facts; founder lines only if given |
| FAQ answers | 40 words | TA + EN | Generated from policy facts, never invented |
| SEO title / meta | 60 / 155 chars | TA + EN | Includes product, city, category |
| Festival banner | 10 words | TA + EN | Uses approved offer values only |

LLM output is escaped into typed slots; raw HTML is never accepted. If copy fails validation, deterministic fallbacks apply (`Welcome to {storeName}`).

---

## 9. Assembly Engine and Full Request Lifecycle

```
BUILD (Day 0)
  validate facts → 1 Jev batch → LLM copy (TA + EN) → claims + meaning checks
  → assemble AST (pages, sections, tokens) → WCAG + touch + speed audit
  → PREVIEW draft (rev 1) → merchant taps Publish → freeze → atomic edge release

SIGNAL (Day 1..365)
  stock / price / photo / festival / order event
  → agent selects workflow → at most 1 Jev batch (+ LLM only if prose changed)
  → validated AST patch → rev N+1 → 🟢 auto-apply or 🟡 approval card

SERVE (every visit)
  GET /:store/*
    ├── cache HIT  → pre-rendered HTML    (~5ms, ₹0)
    └── cache MISS → release bucket → compile → cache   (~30ms, ₹0)

LIVE FACTS
  price and stock come from the commerce core at request time (binding), never baked into prose.
  Checkout re-checks price and stock at the Gateway before commit.
```

---

## 10. Director — Framer-Grade Section Redesign with Jev (360° Dimension Engine)

> **Optional layer.** The merchant never needs it. When they say "make it darker" or "banner periya aakku", the Director routes it to the cheapest correct lane.

### 3-Lane Router

```
merchant fragment (voice → text)
   ├── exact literal ("change headline to Pongal Sale") ──► pure code patch     0 ms     ₹0
   ├── ambiguous style / target ("konjam dark-aa aakku") ──► 1 batched Jev       <70 ms   ₹0.10
   └── creative rewrite ("write a better story")        ──► 1 LLM + claims guard ~1.2 s   ₹1.50
        ▼
   validated AST patch → rev N+1 → instant preview → [ Undo ]
```

```
┌───────────────────────────┐     ┌────────────────────────────────────────────────────────┐     ┌────────────────────────────┐
│   Director Fragment       │ ──► │                  Jev Decision Engine                   │ ──► │    Surgical AST Patch      │
│ "hero ah konjam dark,     │     │  • Target: "hero"                                      │     │  • Layout: Bento 3-up      │
│  periya font, festive"    │     │  • Layout: "bento"            • Motion: "gentle"       │     │  • Typography: Display Ser.│
│                           │     │  • Typography: "serif"        • Blur: 16px frosted     │     │  • Physics: cubic-bezier   │
│                           │     │  • Radius: 16px               • Glow: ambient highlight│     │  • CSS Tokens: Injected    │
└───────────────────────────┘     └────────────────────────────────────────────────────────┘     └────────────────────────────┘
                                                   1 parallel call · <70ms · ₹0.10                    <5ms instant preview
```

### The 8 Redesign Dimensions Controlled by Jev

| # | Dimension | Jev Primitive | Tunable Scope / Choices | Output & Visual Effect |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Target & Purpose** | `Choice` | `hero`, `shop`, `proof`, `story`, `footer`, `global` | Directs surgery to the exact section node |
| **2** | **Layout & Geometry** | `Choice` | `bento`, `split`, `island`, `masonry`, `fullbleed` | Rearranges structural grid and card hierarchy |
| **3** | **Typography & Scale** | `Choice` + `Score` | Display Serif, Modern Sans, Heavy Grotesque · Scale | Proportional font scale, letter-spacing, line-height |
| **4** | **Color & Surfaces** | `Choice` + `Score` | `canvas`, `surface`, `ink`, `accent` · Warmth, Saturation | Background tones, contrast inversion, palette temperature |
| **5** | **Glass, Borders & Depth** | `Score` x 3 | Border hairline, Glass blur, Elevation shadow | Frosted cards, edge glows, layered depth |
| **6** | **Media & Aspect Ratio** | `Choice` + `Score` | `16:9`, `4:5`, `1:1`, `21:9` · Hover zoom | Image framing, parallax, hover scale |
| **7** | **Motion & Spring Physics** | `Choice` + `Score` | `snappy`, `gentle`, `cinematic`, `none` · Entrance reveal | `cubic-bezier` curves, staggered cascade |
| **8** | **Feature Toggles** | `Noul` x N | Badges, Quick-add, Rating stars, Stock tags | Toggles sub-elements without rewriting DOM |

### Complete 360° Parallel Redesign Query

```typescript
// Single parallel call evaluating all 8 aesthetic dimensions. Merchant fragment may be Tamil, English or Tanglish.
const redesign = await client.systemOne({
  state: {
    command: "shop section ah konjam dark-aa, periya font, glowing border, festive feel",
    sections: ["hero", "shop", "proof", "story", "footer"],
    tokens: activeDocument.design,
  },
  questions: {
    target: {
      type: "choice",
      instructions: "Which section does `command` ask to change? Use `global` when it clearly means the whole site.",
      criteria: { hero: "Top banner", shop: "Product grid area", proof: "Reviews", story: "About text", footer: "Bottom area", global: "Whole site" },
    },
    layout: { type: "choice", instructions: "Which layout archetype best fits `command`?", criteria: { bento: "Featured card plus stacked cards", grid: "Uniform columns", split: "Pinned visual beside scroll", island: "Floating cards over canvas", keep: "Command does not ask for a layout change" } },
    voice: { type: "choice", instructions: "Which type personality does `command` ask for?", criteria: { serif: "Elegant, editorial", sans: "Modern, neutral", grotesque: "Heavy, loud", keep: "No type request" } },
    scale: { type: "score", instructions: "How large should headings become according to `command`?", criteria: ["restrained", "balanced", "massive display"] },
    tone: { type: "choice", instructions: "Which surface tone does `command` ask for?", criteria: { canvas: "Light", surface: "Tinted", ink: "Dark", accent: "Vivid brand colour", keep: "No colour request" } },
    border: { type: "score", instructions: "How pronounced should border highlights be in `command`?", criteria: ["none", "hairline", "luminous glow"] },
    glass: { type: "score", instructions: "How much frosted backdrop blur does `command` imply?", criteria: ["none", "subtle", "deep"] },
    radius: { type: "score", instructions: "How rounded should corners be according to `command`?", criteria: ["sharp", "modern", "pill"] },
    shadow: { type: "score", instructions: "How much elevation shadow does `command` imply?", criteria: ["flat", "crisp", "deep floating"] },
    motion: { type: "choice", instructions: "Which motion profile does `command` imply?", criteria: { snappy: "Fast, playful", gentle: "Smooth", cinematic: "Slow, luxurious", none: "Static or not mentioned" } },
    badge: { type: "noul", instructions: "Does `command` ask for sale or category badges on cards?" },
    quickadd: { type: "noul", instructions: "Does `command` ask for 1-tap quick add on cards?" },
    ratings: { type: "noul", instructions: "Does `command` ask for star ratings on cards?" },
    zoom: { type: "noul", instructions: "Does `command` ask for image zoom on hover?" },
  },
});
// Code applies only properties whose answer is not `keep` and whose confidence passes §7.9.
// Surgical isolation: prices, stock, navigation and bindings are never touched.
```

### Comparison: Redesigning Everything via Jev vs. LLM Code Generation

| Metric | Raw LLM Code Rewrite | Complete Jev Dimension Engine |
| :--- | :--- | :--- |
| **Aesthetic Quality** | Hit or miss; unpredictable CSS | **Guaranteed craftsmanship from tested components** |
| **Broken Layout Risk** | High (div mismatch, missing tags) | **0% (validated AST mutations)** |
| **Turnaround Time** | 4,000ms – 8,000ms | **<70ms round-trip** |
| **Cost per Redesign** | ₹10.00 – ₹25.00 | **₹0.10** |
| **Reversibility** | Hard to diff / undo | **Instant 1-tap Undo (immutable rev N+1)** |
| **Commerce Safety** | May drop live pricing or cart bindings | **100% isolated: DB bindings and prices untouched** |

---

## 11. Safety & Guardrails

| Guardrail Rule | Implementation Strategy |
| :--- | :--- |
| **Low Confidence** | Per-question thresholds (§7.9); fall back to category default floor |
| **Hallucinated Claims** | Claims registry: every claim needs a supporting merchant fact (§7.5) |
| **Translation Drift** | `meaning` Noul gate; numbers, prices, units formatted by code |
| **Score Out of Bounds** | Normalize by `levels − 1`, clamp to safe CSS/token boundaries |
| **Copy Injection** | Populate typed slots only; never inject raw unescaped HTML |
| **Variant Whitelist** | Jev criteria map strictly to registered component keys |
| **WCAG Contrast Floor** | Every colour pair ≥ 4.5:1; failure steps to the companion shade automatically |
| **Mobile Floor** | Body ≥ 16px, touch targets ≥ 44px, readable on low-end Android |
| **Draft vs Live** | Edits go to draft (rev N+1); Publish freezes and flips atomically |
| **Undo Everything** | Immutable revisions; Undo restores any earlier state |
| **Jev Outage** | Serve last-known-good release; queue background retry; deterministic floor builds new stores |
| **Money Isolation** | Prices, stock, tax, orders only change through registered commerce Actions |
| **Approval Fatigue** | Max 3 proposal cards per day; Guardian fixes silently when risk is zero |

---

## 12. Agentic Channels (Discovery Without Effort)

| Channel | What the Channel agent publishes | Source of truth |
| :--- | :--- | :--- |
| **Google Search** | Clean URLs, sitemap, `Product` structured data, TA + EN `hreflang` | Catalog bindings |
| **WhatsApp** | Share cards, catalog sync, order link, status text | Catalog + offers |
| **Shopping Feeds** | Product feed (title, price, stock, image) | Catalog |
| **AI Shoppers** | `llms.txt` + machine-readable product endpoint | Catalog + policies |
| **Social** | Auto-generated image + caption proposal | Approved products |

Merchant effect: one toggle at onboarding ("List my products everywhere"), then nothing.

---

## 13. Cost Economics (Max Average · 1 USD = ₹100)

| Event | Jev System One | LLM Copy | Worker & Edge | Total Cost (INR) | Credits |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Complete Store Creation** | 1 batched call | 1 full draft call (TA + EN) | Deterministic compile | **`₹0.40`–`₹0.70`** | 4–7 cr |
| **New Product (photo → page)** | 1 batched call + claims/meaning | short copy TA + EN | Deterministic patch | **`₹0.25`–`₹0.40`** | 2.5–4 cr |
| **Director Edit (Jev lane)** | 1 batched call | *(none)* | Deterministic patch | **`₹0.10`** | 1 cr |
| **Festival Proposal** | 1 batched call | 1 short banner copy | Deterministic patch | **`₹0.20`** | 2 cr |
| **Daily Merchandising** | 1 batched call | *(none)* | Deterministic patch | **`₹0.10`** | 1 cr |
| **Inbound Message** | 1 batched call | 1 reply draft (only if `other`) | — | **`₹0.10`–`₹0.25`** | 1–2.5 cr |
| **Public Page Visit** | — | — | Edge Cache | **`₹0.00`** | 0 cr |

| Store Profile | Monthly Activity | Estimated Monthly AI Cost |
| :--- | :--- | :--- |
| **Starter shop** | 20 new products, 30 daily merchandising runs, 3 festivals, 10 edits | **≈ ₹12–₹18** |
| **Busy shop** | 60 new products, daily runs, 100 messages, 30 edits | **≈ ₹45–₹70** |

> Estimates built from the existing rate basis (Jev ≈ ₹0.10 per batch; LLM copy ≈ ₹0.30 per full draft). **Measure real token budgets and latency** before pricing plans. Zero visit cost holds at any traffic.
>
> **Comparison:** raw LLM full-site generation costs ≈ ₹25.00 per generation with hallucination risk; Jev + LLM-slot copy is **~35–60× cheaper** and deterministic.

---

## 14. Jev Readiness Checklist (What to Prepare)

| # | Prepare | Why |
| :-: | :--- | :--- |
| **1** | **Question bank** in one file per agent (Genesis, Intake, Claims, Parity, Merchandising, Director, Concierge, Shield) | Single place for instructions and criteria; versioned |
| **2** | **Structured `state`** (named JSON fields, never one long string) | Docs: questions reference backticked paths like `` `business.brief` `` |
| **3** | **Contrastive criteria objects** (`what`, `not_for`, `examples`) for easily confused options | Reduces ambiguity between similar variants and intents |
| **4** | **Concrete Score levels** that stand alone | Scores are only as good as their level descriptions |
| **5** | **Tamil / Tanglish test set** (≥ 50 cases per question group, incl. voice transcripts) | Verify Jev quality in Tamil; if weak, translate to English first (LLM) then judge |
| **6** | **Threshold calibration** (plot confidence vs. accuracy per question) | §7.9 numbers are starting points, not truth |
| **7** | **Fallback floors** per category | Zero-AI path must still pass every audit |
| **8** | **Budget meter** (requests, tokens, latency per store, per month) | Prove ₹ cost before launch pricing |
| **9** | **Server-side key only** | Jev API key never ships to the browser |
| **10** | **Question coverage rule** | Choice must include `keep` / `none` / `new` when "nothing fits" is possible; Jev cannot pick omitted values |

---

## 15. Build Roadmap (v1 Launch)

| Step | Component | Scope / Effort |
| :---: | :--- | :--- |
| **1** | Component Library (30–100 sections and variants, Tamil-ready fonts) | 4–8 weeks *(moat)* |
| **2** | Page templates (§5) + deterministic category floors | 1–2 weeks |
| **3** | Jev Question Bank + AST Mapper + Confidence Policy (§7) | 1–2 weeks |
| **4** | Writer + Translator pipeline with Claims and Parity guards | 1 week |
| **5** | Approval Inbox + Merchant app + Publish / Undo | 1–2 weeks |
| **6** | Product Intake (photo → page) + Merchandiser autopilot | 1 week |
| **7** | Marketer (festival calendar) + Channel agent (§12) | 1 week |
| **8** | Director (3-lane router + 8-dimension engine) | 1 week |
| **9** | Concierge + Order Shield | 1 week |
| **10** | Commerce Core integration (Cart, Checkout, UPI / COD, Orders) | Ongoing *(Core Foundation)* |
| **11** | Tamil / Tanglish evaluation and threshold calibration | Continuous before launch |

---

## 16. Platform Comparison Matrix

| Dimension | Shopify | Raw LLM Generation | This Architecture (Jev + Agents) |
| :--- | :---: | :---: | :---: |
| **Merchant Effort** | ⚠️ Pick theme, edit sections, install apps | ⚠️ Prompt and fix repeatedly | ✅ **Photo, confirm, ship** |
| **Developer Needed** | ⚠️ Often (theme / apps / SEO) | ❌ Frequently | ✅ **Never** |
| **Structure Quality** | ✅ Reliable | ⚠️ Variable | ✅ **Deterministic & Reliable** |
| **Copy Quality** | Merchant writes | ✅ Rich but risky | ✅ **Rich, verified against facts** |
| **Tamil + English** | ⚠️ Plugins / manual | ⚠️ Inconsistent | ✅ **Built-in, meaning-checked** |
| **Maintenance** | Manual | None (breaks) | ✅ **Autopilot + Guardian** |
| **Festivals / Offers** | Manual | Not modelled | ✅ **Marketer proposes ahead** |
| **India Fit (UPI / COD / WhatsApp)** | ⚠️ Apps required | ❌ | ✅ **Core journeys** |
| **Generation Cost** | — | ❌ High | ✅ **Lowest** |
| **Output Safety** | ✅ Safe | ❌ Unpredictable | ✅ **Strict Whitelist + Claims guard** |
| **Design Uniqueness** | ❌ Low / Generic | ✅ High | ✅ **Medium – High** |
| **Commerce Infra** | ✅ Built-in | ❌ Build from scratch | 🔨 Built with Core Code |
| **Vendor Dependency** | None | Low | ⚠️ *Jev API Dependency (deterministic floor mitigates)* |

---

> **Summary:** The merchant adds a photo, confirms an order, ships a parcel. Agents decide with Jev, write with LLM slots, verify every claim, assemble from tested components, and the edge serves it free forever — Shopify-grade commerce, zero developer, built for Tamil Nadu first.
