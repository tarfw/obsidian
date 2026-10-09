# Autonomous "Site" Agent

| Property | Value |
| :--- | :--- |
| **Goal** | Zero-touch, edge-served storefront for any workspace ([workspace.md](file:///c:/tarfwk/tar/workspace.md)). |
| **Principle** | Agent runs ~95%. Merchant does 3 jobs: 📷 Photo · ✅ Confirm · 📦 Ship. |
| **Steering** | Taste bullets only. Add one to steer, delete it to undo. |
| **Triage** | Personal **Now** feed ([inbox.md](file:///c:/tarfwk/tar/inbox.md)); row tap opens detail. |
| **Storefront** | Opens in the native browser. `tarapp` embeds no web engine ([merchants.md](file:///c:/tarfwk/tar/merchants.md)). |
| **Serving** | Pre-rendered static HTML on the Edge. No AI on visits. |

---

## 1. Model

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ METHOD 2: PRE-DESIGNED PATTERN CATALOG (70 PATTERNS + JEV SELECTOR + 8 PRIMITIVES)     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Merchant Taste ──> [JEV: Match Pattern IDs 1..70] ──> [8 Engine Primitives] ──> Mobile│
│                                                       (nav, hero, banner,      Responsive
│                                                        collection, cards,      <150 KB 
│                                                        accordion, media,       Page Floor
│                                                        action)                 Zero Drift
└────────────────────────────────────────────────────────────────────────────────────────┘
```

$$\text{Facts (records)} + \text{Taste (bullets)} \xrightarrow{\text{1 Jev fan-out}} \text{Blueprint (70 Patterns + Tokens)} \xrightarrow{\text{8 Engine Primitives}} \text{static page on Edge}$$

| Layer | Owner | Holds |
| :--- | :--- | :--- |
| **Facts** | Records (code) | Products, prices, stock, contact, proofs, media assets. Models never touch money. |
| **Taste** | Merchant (voice or text) | Plain bullets about style, focus and vibe. |
| **Blueprint** | Jev (typed judgments) | `kind` · `heroPattern` (from 80-pattern catalog) · section order · 3 design tokens. |
| **Page** | Code | Maps Blueprint patterns to pre-compiled responsive CSS + Facts into HTML. LLM fills copy slots only. Zero ad-hoc CSS. |

Jev re-runs only when the hash of (Taste + Facts) changes. Otherwise nothing runs.

---

## 2. Lifecycle

| Step | Surface | What happens |
| :--- | :--- | :--- |
| **1. Add workspace** | `workspace.add` | Name, Taste, photos. About 30 seconds. |
| **2. Auto-publish** | Gateway | Publish gate passes, then the store goes live with no review. |
| **3. Daily triage** | `space.now` | Orders and 1-tap questions. Tap a row to see details. |
| **4. Steer (rare)** | `site` tool | Edit Taste bullets. Jev updates the Blueprint. Undo available. |

**Publish gate (code):** a contact method plus at least one product or service. Otherwise a "coming soon + WhatsApp" page is shown.

---

## 3. App Screens

```text
NOW SCREEN (`space.now`)                DETAIL (opened on row tap)
┌──────────────────────────────────────┐┌──────────────────────────────────────┐
│ NOW                    Find > Tools >││ ‹ Back to Now           Order Review │
│ Murugan Silks / Owner / Salem        ││                                      │
│--------------------------------------││ Order #18 · COD ₹2,400               │
│ [A] Confirm Order #18        DUE 15m>││ • Customer: Anitha (Salem)           │
│     Salem · COD ₹2,400 · 2 sarees    ││ • Items: 2x Kanchi Cotton Sarees     │
│ [A] Ship Order #17           DUE 2h >││ • Address: Door 4, Gandhi Rd (Valid) │
│     Chennai · Courier pickup         ││ • COD Risk: Low                      │
│ [?] Deepavali 10% Offer     PROPOSAL>││                                      │
│     Activate festive kit banner      ││ [ Confirm Order ]    [ Print Slip ]  │
│ Ask TAR...                          >││                                      │
└──────────────────────────────────────┘└──────────────────────────────────────┘
```

```text
SITE TOOL (workspace)                     TASTE DRAWER (>70% overlay)
┌──────────────────────────────────────┐┌──────────────────────────────────────┐
│ ‹ Tools      Online Store     [Live] ││ Taste                         [Done] │
├──────────────────────────────────────┤├──────────────────────────────────────┤
│ STORE LINK                           ││ [ Describe style or vibe... ]  [ + ] │
│ tamilnadu.shop/murugan-silks         │├──────────────────────────────────────┤
│ [ Open in Browser ↗ ]                ││ • Pure silk sarees from Salem    [x] │
├──────────────────────────────────────┤│ • Dark luxury tone with gold     [x] │
│ TASTE                (Tap to edit ›) ││ • Lead with Deepavali collection [x] │
│ • Pure silk sarees direct from Salem ││ • WhatsApp order on all cards    [x] │
│ • Dark luxury tone with gold accent  ││                                      │
│ • Lead with Deepavali bridal sarees  ││                                      │
│ • WhatsApp quick order on all cards  ││                                      │
├──────────────────────────────────────┤│                                      │
│ SECTIONS               (Jev Decided) ││                                      │
│ 1. Header Navigation                 ││                                      │
│ 2. Hero Section (75vh Split)         ││                                      │
│ 3. Announcement Banner               ││                                      │
│ 4. Product Catalog (28 silk sarees)  ││                                      │
│ 5. Store Footer (Shopify-Style)      ││ [ Speak style bullet with mic...  ]  │
└──────────────────────────────────────┘└──────────────────────────────────────┘
```

The app list and the web page show the same sections in the same order.

---

## 4. Blueprint (what Jev decides)

### Business kind (one Choice)

| `kind` | Examples | Sets |
| :--- | :--- | :--- |
| `goods` | Sarees, jewellery, grocery, hardware | Catalog, cart, product pages |
| `food` | Home kitchen, bakery, sweets | Menu with portions, same-day or pickup only |
| `services` | Tailor, salon, clinic, rental | Services list, enquiry or booking CTA |
| `wholesale` | Bulk trade | Retail price plus "Bulk enquiry" WhatsApp action |

### Section kinds (70 Pre-designed patterns mapped to 8 Primitives)

| Primitive | What It Renders | Which Patterns It Compiles |
| :--- | :--- | :--- |
| **`nav`** | Sticky topbar, header, mega menu, and Shopify-style footer | `#1` Announcement Bar, `#2` Header / Brand Nav, `#3` Mega Menu, `#68` Store Footer, `#69` Sticky Cart Bar |
| **`hero`** | High-impact 75vh focal showcases | `#4` Split 50/50, `#16` Commerce Hero, `#17` Seasonal Hero, `#24` Typography Hero, `#26` Minimal Hero |
| **`banner`** | Horizontal highlight strips & urgent ribbons | `#5` Promotional Banner, `#12` Offers, `#13` Flash Sale, `#41` Countdown, `#45` Delivery Banner, `#46` Trust Badges |
| **`collection`** | Product & category grids with live prices & 1-tap checkout | `#6` Featured Products, `#7` Product Catalog, `#8` Categories, `#9` Showcase, `#10` Best Sellers, `#11` New Arrivals |
| **`cards`** | Structured item grids (icon + title + description) | `#20` Value Props, `#23` Brand Story, `#28` Reviews, `#29` Testimonials, `#31` Press, `#40` Features Grid |
| **`accordion`** | Expandable disclosure rows for dense information | `#37` FAQ, `#58` Shipping Policy, `#61` Return Policy, `#62` Size Guide, `#63` Fabric Care Guide |
| **`media`** | Image galleries, lookbooks, and feeds | `#30` Instagram Grid, `#32` UGC Gallery, `#34` Lookbook, `#35` Before / After, `#50` Behind the Scenes |
| **`action`** | Single focused conversion actions & floats | `#14` Product Finder, `#15` Search Bar, `#38` VIP Newsletter, `#65` WhatsApp Float Button |

### Design tokens & Pattern Engine

| Token | Primitive | Values | Default |
| :--- | :---: | :--- | :--- |
| `heroPattern` | Choice | Curated 70-pattern catalog (`split`, `commerce`, `typography`, `bg_image`, `minimal`) | `split` |
| `typography` | Choice | `serif` · `sans` · `grotesk` | `sans` |
| `tone` | Choice | `canvas` · `surface` · `ink` | `canvas` |
| `density` | Score | `1 compact` · `2 balanced` · `3 airy` | `2` |

**Method 2 Guarantee:** Zero ad-hoc CSS synthesis. Jev selects proven section patterns; code pairs them with battle-tested, pre-compiled responsive CSS via 8 Engine Primitives. Contact details (phone, email, WhatsApp, address) live directly in the Shopify-style footer and floating pill. Models never generate layout code.

### 70-Pattern Catalog Taxonomy (Core Families)

| Pattern Family | Key Pattern IDs | Best Matched Trade & Taste | Typical Structure |
| :--- | :--- | :--- | :--- |
| **Commerce & Retail** | `#4 Split 50/50`, `#7 Catalog`, `#10 Best Sellers`, `#16 Commerce Hero` | Sarees, jewelry, apparel, retail goods | Split text left + product right + WhatsApp CTA |
| **Minimal & Luxury** | `#23 Brand Story`, `#24 Typography`, `#26 Minimal Hero` | Luxury atelier, watches, bespoke tailoring | Editorial serif headline, pure ink canvas, zero bloat |
| **Atmospheric & Media**| `#17 Seasonal Hero`, `#30 Instagram Grid`, `#34 Lookbook` | Boutiques, heritage looms, cafes, bakeries | Large photo + auto-scrim overlay + centered headline |
| **Promotion & Festival**| `#5 Promo Banner`, `#12 Offers`, `#13 Flash Sale`, `#41 Countdown` | Deepavali/Pongal sales, festive kits | Offer headline + discount pill + instant WhatsApp order |
| **Trust & Guarantees** | `#20 Value Props`, `#37 FAQ`, `#46 Trust Badges`, `#68 Footer` | Master weavers, certified gold, COD stores | Hallmark pills (Silk Mark), expandable FAQs, rich footer |

---

## 5. Taste → Blueprint (one call)

Every question runs in parallel over the same state. Code applies the answers.

```json
// Request
{
  "state": {
    "trade": "Handloom & Apparel",
    "taste": ["Pure silk sarees direct from Salem", "Dark luxury tone with gold accent", "Lead with Deepavali bridal sarees"],
    "facts": { "items": 28, "proofs": ["handloom mark"], "hasHeroMedia": true, "season": "Deepavali in 14 days" }
  },
  "questions": {
    "kind":        { "type": "choice", "instructions": "What does this business mainly do?", "criteria": { "goods": "Sells physical goods", "food": "Sells prepared food", "services": "Sells time or skill", "wholesale": "Sells in bulk" } },
    "heroPattern": { "type": "choice", "instructions": "Which hero section pattern fits taste, trade and media?", "criteria": { "split": "Split Hero 50/50 (#4)", "commerce": "Commerce Hero with CTA (#16)", "typography": "Typography Hero (#24)", "bg_image": "Background Image Hero (#7)", "minimal": "Minimal Hero (#23)" } },
    "spotlight":   { "type": "noul",   "instructions": "Do taste or season call for a festival or offer section now?" },
    "story":       { "type": "noul",   "instructions": "Do taste or facts call for a craft or owner story?" },
    "trust":       { "type": "noul",   "instructions": "Is the listed proof strong enough to show a trust section?" },
    "lead":        { "type": "choice", "instructions": "What should lead the page after the header?", "criteria": { "spotlight": "Festival or offer", "catalog": "Products first", "story": "Craft story" } },
    "typography":  { "type": "choice", "instructions": "Which heading style fits the taste?", "criteria": { "serif": "Classic display", "sans": "Clean modern", "grotesk": "Bold geometric" } },
    "tone":        { "type": "choice", "instructions": "Which surface tone fits the taste?", "criteria": { "ink": "Dark", "canvas": "Light", "surface": "Warm tinted" } },
    "density":     { "type": "score",  "instructions": "How airy should spacing be?", "criteria": ["1: Compact", "2: Balanced", "3: Airy"] }
  }
}
```

```json
// Response
{
  "answers": {
    "kind":        { "choice": "goods",     "confidence": 0.99 },
    "heroPattern": { "choice": "split",     "confidence": 0.97 },
    "spotlight":   { "probability": 0.93 },
    "story":       { "probability": 0.31 },
    "trust":       { "probability": 0.88 },
    "lead":        { "choice": "spotlight", "confidence": 0.97 },
    "typography":  { "choice": "serif",     "confidence": 0.96 },
    "tone":        { "choice": "ink",       "confidence": 0.99 },
    "density":     { "score": 2,            "confidence": 0.94 }
  }
}
```

| Rule | Behaviour |
| :--- | :--- |
| Thresholds | A `Noul` above 0.65 includes the section. Tune on real data. |
| Low confidence | Keep the previous value or the default. Never ask the merchant. |
| Conflicting bullets | The latest bullet wins, applied by code. |
| Undo | Every Blueprint change is a revision. Deleting a bullet reverts it. A 1-tap Undo is also available. |
| Verification | A `Noul` checks each copy claim against Facts. Unbacked claims are dropped. |

---

## 6. Autonomy

| Level | Examples | Route |
| :--- | :--- | :--- |
| **[AUTO]** | Image compression, alt text, SEO and sitemap, policies from facts, track page, WhatsApp share card, sold-out hiding. | Silent. |
| **[CONFIRM]** | Festival banner, new copy, low-stock rule, missing phone. | 1-tap card in Now. |
| **[MERCHANT ONLY]** | Prices, refunds, cancellations, deleting items. | Owner taps. Models never touch money. |

| Smart question (Now) | Buttons |
| :--- | :--- |
| Add shop phone for WhatsApp orders? | `Add 98xxxxxx` · `Skip` |
| Deepavali in 14 days. Activate 10% banner kit? | `Activate` · `Skip` |
| Crimson Saree has 1 left. Auto-hide at 0? | `Auto-hide` · `Keep` |

---

## 7. Code-Owned Floors (Jev never decides)

| Area | Rule |
| :--- | :--- |
| Money | Integer minor units. Price changes are merchant-only. Offers stay under MRP and above the margin floor. |
| Delivery | Perishables are same-day or pickup only. Pincode checker. Fee matrix. |
| Trust | Certificates, quotes and badges render only from uploaded proof. |
| CSS & Layout | Zero ad-hoc CSS synthesis. Every section renders via a pre-compiled, tested stylesheet. Zero horizontal scroll. |
| Media & Scrim | Camera snaps auto-cropped to responsive ratios; auto-contrast scrim guarantees text legibility over any photo. |
| Page Budget | Under 150 KB total, lazy WebP/AVIF, zero heavy animation, bundled Tamil font. |
| Language | Written in English. Translation is a separate downstream LLM step. |

---

## 8. Cost (estimates, measure before committing)

- Jev fan-out: about ₹0.10 per run, on Day 0 and on each Taste or Fact change (cached otherwise).
- Copy drafts: about ₹0.04 each. Claim checks: about ₹0.10 each.
- A 30-product month: about ₹10–15 in total. Visits cost ₹0.
