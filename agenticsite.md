# Autonomous "Site" Agent

| Property | Value |
| :--- | :--- |
| **Goal** | Zero-touch, edge-served storefront for any workspace ([workspace.md](file:///c:/tarfwk/tar/workspace.md)). |
| **Principle** | Agent runs ~95%. Merchant does 3 jobs: 📷 Photo · ✅ Confirm · 📦 Ship. |
| **Steering** | 1-tap **Design System**: shows Jev's autonomous pick with flat list of 3 curated Refero `design.md` systems. Zero Brand clutter. |
| **Triage** | Personal **Now** feed ([inbox.md](file:///c:/tarfwk/tar/inbox.md)); row tap opens detail. |
| **Storefront** | Opens in the native browser. `tarapp` embeds no web engine ([merchants.md](file:///c:/tarfwk/tar/merchants.md)). |
| **Serving** | Pre-rendered static HTML on the Edge. No AI on visits. |

---

## 1. Model

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ METHOD 2: REFERO DESIGN SYSTEMS + 8 ENGINE PRIMITIVES                                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Store Style (design.md) ──────> CSS Variable Tokens ──────────────┐                    │
│                                                                   ▼                    │
│ Catalog Facts + Trade ──> [Jev: Autonomous Design & Copy Selector] ─> [8 Engine       │
│                                                                         Primitives] ──>│
│                                                                                        ▼
│                                                                                 Static Mobile
│                                                                                 Storefront (<150KB)
└────────────────────────────────────────────────────────────────────────────────────────┘
```

$$\text{Facts (records)} + \text{Trade} \xrightarrow{\text{Jev Autonomous Selector}} \text{Selected } \texttt{design.md} \xrightarrow{\text{8 Primitives (CSS Tokens)}} \text{Static Page}$$

| Layer | Owner | Holds |
| :--- | :--- | :--- |
| **Facts** | Records (code) | Products, prices, stock, contact, proofs, media assets. Models never touch money. |
| **Store Style** | Curated `design.md` catalog | Complete design systems from [styles.refero.design](https://styles.refero.design/). Provides 100% of CSS tokens (colors, font pairings, radii, spacing). Zero AI hallucination. |
| **Blueprint** | Jev Autonomous | Jev auto-selects from the 3 Refero `design.md` systems based on merchant trade/catalog. Merchant can 1-tap override anytime. |
| **Page** | Code (8 Primitives) | Injects `design.md` CSS variables into pre-compiled semantic HTML templates. Static, responsive, zero ad-hoc CSS synthesis. |

---

## 2. Lifecycle

| Step | Surface | What happens |
| :--- | :--- | :--- |
| **1. Add workspace** | `workspace.add` | Name, photos, catalog. Jev auto-selects a fitting default `design.md` based on trade. About 30 seconds. |
| **2. Auto-publish** | Gateway | Publish gate passes, store goes live immediately on edge. |
| **3. Daily triage** | `space.now` | Orders and 1-tap proposals. Tap a row to see details. |
| **4. Steer & Tweak** | `site` tool | **DESIGN card**: shows active Refero system (`design.md`). Tap opens the flat list of the 3 Refero design systems to override. 1-tap "Publish". |

**Publish gate (code):** a contact method plus at least one product or service. Otherwise a "coming soon + WhatsApp" page is shown.

---

## 3. App Screens

```text
NOW SCREEN (`space.now`)                SITE SCREEN (`site`)
┌──────────────────────────────────────┐┌──────────────────────────────────────┐
│ NOW                    Find > Tools >││ ‹ Murugan stores     [↗]     Publish │
│ Murugan Silks / Owner / Salem        ││   tar-sites.tar-54d.workers.dev/...  │
│--------------------------------------│├──────────────────────────────────────┤
│ [A] Confirm Order #18        DUE 15m>││ DESIGN                               │
│     Salem · COD ₹2,400 · 2 sarees    ││ ┌──────────────────────────────────┐ │
│ [A] Ship Order #17           DUE 2h >││ │ ●●●● arte*                       │ │
│     Chennai · Courier pickup         ││ │ Wheat cream & harvest copper     │ │
│ [?] Deepavali 10% Offer     PROPOSAL>││ │ Best for: Heritage craft, organic│ │
│     Activate festive kit banner      ││ └──────────────────────────────────┘ │
│ Ask TAR...                          >││ SECTIONS                             │
└──────────────────────────────────────┘│ ≡ Header Navigation                  │
                                        │ ✨ Hero Section (75vh)                │
                                        │ 📢 Announcement Banner            +  │
                                        │ ⊞ Product Catalog (Clean)            │
                                        │ ▭ Store Footer                       │
                                        │                                      │
                                        │       Reset Storefront to Default    │
                                        └──────────────────────────────────────┘
```

```text
DESIGN SYSTEMS MODAL (Opened on "DESIGN" card tap)
┌──────────────────────────────────────┐
│ ‹ Back     Design Systems       Done │
│ styles.refero.design tokens          │
├──────────────────────────────────────┤
│ 💡 Jev autonomously selects the best │
│ system from facts. Tap to override:  │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Mollie                           │ │
│ │ [●][●][●][●]                  ( )│ │
│ │ Paper, oat, espresso & copper    │ │
│ │ Best for: Fine silk, luxury goods│ │
│ │ Typography: Inter · Plex Mono    │ │
│ ├──────────────────────────────────┤ │
│ │ arte*                            │ │
│ │ [●][●][●][●]                 (✓) │ │
│ │ Wheat cream, copper & citron beam│ │
│ │ Best for: Heritage craft, bakery │ │
│ │ Typography: Parafina · Poppins   │ │
│ ├──────────────────────────────────┤ │
│ │ Magic Spoon                      │ │
│ │ [●][●][●][●]                  ( )│ │
│ │ Electric grape, concord & lilac  │ │
│ │ Best for: Confectionery & youth  │ │
│ │ Typography: Heavy Poppins 700    │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

---

## 4. Refero `design.md` Token Architecture

Instead of prompting an AI to synthesize disconnected CSS attributes, styles are defined as **complete, designer-grade markdown systems** sourced from [Refero Design](https://styles.refero.design/).

### Supported Style Reference Presets (`designmds/`)

| Style Name | Archetype / Source | Best For | Core Tokens (`design.md`) |
| :--- | :--- | :--- | :--- |
| **Dark Luxury / Ledger** | [DESIGN1.md](file:///c:/tarfwk/tar/designmds/DESIGN1.md) (Mollie) | Fine silk, jewelry, watches, luxury goods | Paper `#ffffff`, Ink `#000000`, Oat Surface `#f7f4f1`, Ledger Brown `#3b281d`, Copper Link `#e07122`. Typography: Inter Variable display + IBM Plex Mono uppercase labels. |
| **Vibrant Pop / Pastel** | [DESIGN2.md](file:///c:/tarfwk/tar/designmds/DESIGN2.md) (Magic Spoon) | Confectionery, snacks, youth apparel, beverages | Electric Grape gradient, Deep Concord `#3f0791`, Lilac Aisle `#dad9ff`, Marshmallow cards. Typography: Heavy Poppins 700 with chunky pill buttons. |
| **Harvest Editorial** | [DESIGN3.md](file:///c:/tarfwk/tar/designmds/DESIGN3.md) (arte*) | Heritage craft, organic farm, bakeries, cafes | Wheat Cream `#e5dccd`, Harvest Copper `#ab5700`, Citron Beam `#e8e359`, Morning Glory `#7997ff`. Typography: Parafina rounded display + Poppins body. |

### Deterministic Token Mapping into 8 Engine Primitives

All 8 Primitives consume the standardized CSS variables emitted by the active `design.md`:

```css
:root {
  /* Colors from design.md */
  --site-bg:          var(--color-paper);
  --site-text:        var(--color-ink);
  --site-surface:     var(--color-oat-surface);
  --site-accent:      var(--color-copper-link);
  --site-dark-panel:  var(--color-espresso-panel);

  /* Typography from design.md */
  --site-font-display: var(--font-display);
  --site-font-body:    var(--font-body);
  --site-font-mono:    var(--font-mono);

  /* Geometry & Shapes from design.md */
  --site-radius-card: var(--radius-card, 16px);
  --site-radius-pill: var(--radius-pill, 999px);
  --site-density:     var(--spacing-base, 4px);
}
```

**Zero CSS Drift Guarantee:** No LLM ever produces CSS strings, color codes, or spacing values. The primitives are rigid, tested CSS grid/flex components rendered statically.

---

## 5. What Jev Decides vs Code & Design Systems

Because styling is 100% locked inside `design.md`, Jev is only used where semantic understanding is required:

| Decision | Decided By | Mechanism |
| :--- | :--- | :--- |
| **Colors, typography, radii, spacing** | **Selected `design.md`** | Direct CSS variable injection (Deterministic). |
| **Default Style recommendation on onboarding** | **Jev** | Choice question matching catalog/trade to the best `design.md` preset. |
| **Hero layout option & section order** | **Merchant or Jev** | 1-tap selection on the Sections list in app, or auto-selected by Jev if untouched. |
| **Spotlight / Festival Banner activation** | **Jev** | `Noul` evaluation on upcoming holidays (e.g. Deepavali in 14 days) + catalog facts. |
| **Hero headline & microcopy** | **Jev** | Fast LLM slot fill aligning Brand preferences (*"Pure Silk & Handloom"*) with facts. |
| **Claim verification** | **Jev** | `Noul` checks copy claims against facts (e.g., "Silk Mark certified" dropped if no proof). |

### Jev Selection Payload (Streamlined)

```json
// Request
{
  "state": {
    "trade": "Handloom & Apparel",
    "brand": ["Pure Silk & Handloom", "Festive Collection direct from Salem"],
    "facts": { "items": 28, "proofs": ["handloom mark"], "season": "Deepavali in 14 days" },
    "activeStyle": "dark-luxury"
  },
  "questions": {
    "kind":        { "type": "choice", "instructions": "What does this business mainly do?", "criteria": { "goods": "Physical goods", "food": "Prepared food", "services": "Services", "wholesale": "Bulk trade" } },
    "heroPattern": { "type": "choice", "instructions": "Which hero layout best fits catalog facts?", "criteria": { "split": "Split 50/50", "spotlight": "Product Spotlight", "editorial": "Editorial Type", "fullbleed": "Fullbleed Photo", "minimal": "Minimal Clean" } },
    "spotlight":   { "type": "noul",   "instructions": "Do brand bullets or season call for a festival banner now?" },
    "trust":       { "type": "noul",   "instructions": "Is the listed proof verified to show trust badges?" },
    "heroHeadline":{ "type": "string", "instructions": "Draft 1 punchy hero headline matching brand bullets." },
    "brandStory":  { "type": "string", "instructions": "Draft 1 concise heritage or owner story paragraph matching facts." }
  }
}
```

---

## 6. Autonomy Matrix

| Level | Examples | Route |
| :--- | :--- | :--- |
| **[AUTO]** | Token compilation from `design.md`, image compression, alt text, SEO sitemap, policies from facts, track page, WhatsApp share card, sold-out hiding. | Silent. |
| **[CONFIRM]** | Seasonal banner activation, new headline copy, low-stock alerts. | 1-tap card in Now feed. |
| **[MERCHANT ONLY]** | Prices, refunds, cancellations, deleting items. | Owner taps. Models never touch money. |

---

## 7. Code-Owned Floors (Jev never touches)

| Area | Rule |
| :--- | :--- |
| Money | Minor integer units. Price changes are strictly merchant-owned. |
| Styling & CSS | Defined exclusively by curated `design.md` token files and pre-compiled CSS. Zero runtime CSS generation. |
| Trust & Guarantees | Certificates and badges render only from validated proof records. |
| Page Budget | Under 150 KB total, WebP/AVIF compression, zero heavy JS frameworks on edge storefront. |
| Responsive Layout | Zero horizontal scroll across all device viewports. |

---

## 8. Cost & Performance

- **Storefront Visits:** ₹0 (Served from static Edge CDN).
- **Design Switching:** ₹0 (Instant client-side CSS token swap, zero LLM calls).
- **Onboarding / Brand Update:** ~₹0.10 per Jev copy run (cached unless Brand bullets or facts change).
- **Monthly Overhead:** ₹5–15 for an active merchant updating catalogs.
