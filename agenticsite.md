# Autonomous "Site" Agent

| Property | Value | Architectural Contract |
| :--- | :--- | :--- |
| **Goal** | `Autonomous "Site" Agent` | Zero-touch build, edge-served storefront ([workspace.md](file:///c:/tarfwk/tar/workspace.md)). |
| **Principle** | `Autonomous-First, Review-and-Confirm` | AI runs 95%; merchant confirms orders and high-value offers; manual edits optional. |
| **Merchant Job**| `📷 Photo · ✅ Confirm · 📦 Ship` | 3 physical jobs only; zero coding, zero design, zero SEO setup. |
| **Agent Job** | `Design · Content · SEO · Feeds · Fixes` | Background agents autonomously operate 95% of store on Jev ([SKILL.md](file:///c:/tarfwk/tar/.agents/skills/typesafe-ai/SKILL.md)). |
| **Triage** | `Personal Inbox (Now Feed)` | Action items arrive in **Now**; row tap opens details to confirm ([inbox.md](file:///c:/tarfwk/tar/inbox.md)). |
| **Storefront** | `Web Launch in Browser` | No in-app browser engine in `tarapp`; opens native browser ([merchants.md](file:///c:/tarfwk/tar/merchants.md)). |
| **Serving** | `Cloudflare Edge (R2 + D1)` | Pre-rendered static HTML; zero AI calls on visits; **₹0 / visit**. |

---

## 1. Inbox & Workspace Flow: Zero-Review Auto-Launch

As established in [`merchants.md`](file:///c:/tarfwk/tar/merchants.md), small merchants do not have time or design skill to "review" website layouts. Day 0 store creation is **100% autonomous and publishes live immediately**.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ WORKSPACE LIFECYCLE                                                                    │
├──────────────────────────────┬──────────────────────────────┬──────────────────────────┤
│ 1. ADD WORKSPACE (Day 0)     │ 2. IMMEDIATE AUTO-PUBLISH    │ 3. DAILY TRIAGE IN NOW   │
│ Name + Brief + Photos        │ Jev builds & deploys to Edge │ Orders & smart questions │
│ 30 seconds setup             │ Store is Live instantly      │ 30-second tap to confirm │
└──────────────────────────────┴──────────────────────────────┴──────────────────────────┘
```

### The Now Screen & Detail Flow (Refined from `inbox.md`)

```text
NOW SCREEN (`space.now` Daily Surface)  DETAIL SCREEN (Opened on Row Tap)
┌──────────────────────────────────────┐┌──────────────────────────────────────┐
│ NOW                    Find > Tools >││ ‹ Back to Now           Order Review │
│ Murugan Silks / Owner / Salem        ││                                      │
│--------------------------------------││ Order #18 · COD ₹2,400               │
│ [A] Confirm Order #18        DUE 15m>││ • Customer: Anitha (Salem)           │
│     Salem · COD ₹2,400 · 2 sarees    ││ • Items: 2x Kanchi Cotton Sarees     │
│ [A] Ship Order #17           DUE 2h >││ • Address: Door 4, Gandhi Rd (Valid) │
│     Chennai · Courier pickup         ││ • COD Risk: Low                      │
│ [?] Deepavali 10% Offer     PROPOSAL>││                                      │
│     Activate festive kit banner      ││ [ ✅ Confirm Order ]  [ Print Slip ] │
│ Ask TAR...                          >││                                      │
└──────────────────────────────────────┘└──────────────────────────────────────┘
```

```text
SITE TOOL IN WORKSPACE (Device Surface)   DETACHED TASTE DRAWER (>70% Overlay)
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
│ ACTIVE SECTIONS        (Jev Decided) ││                                      │
│ 1. Header    • Photo & shop intro    ││                                      │
│ 2. Spotlight • Deepavali banner      ││                                      │
│ 3. Catalog   • 28 silk sarees        ││                                      │
│ 4. Trust     • Handloom mark & COD   ││                                      │
│ 5. Contact   • WhatsApp order button ││ [ Speak style bullet with mic...  ]  │
└──────────────────────────────────────┘└──────────────────────────────────────┘
```

| Lifecycle Step | Surface | Interaction | Background Action (95% Autonomous) |
| :--- | :--- | :--- | :--- |
| **1. Setup** | `workspace.add` | Name, brief, photo upload | Jev fan-out resolves taste; builds AST in <120ms. |
| **2. Auto-Publish**| Gateway | Immediate edge freeze | Deploys static HTML to Cloudflare Edge in <5ms. |
| **3. Triage** | `space.now` | Tap row opens Detail Screen | Fetches verified order lines, risk hints, or proposals. |
| **4. Direct** | `site.tool` | Tap `[ Open Browser ↗ ]` or Taste | Native browser launch; edit Taste bullets in drawer to steer store. |

---

## 2. Taste & Lead Intent: Natural Section Stack (Genesis)

```text
STOREFRONT WEB ANATOMY (Public Web Page Rendered in Browser)
┌────────────────────────────────────────────────────────────────────────┐
│ 1. HEADER          Shop Name, Tagline & High-Res Brand Photo           │
├────────────────────────────────────────────────────────────────────────┤
│ 2. LEAD / SPOTLIGHT Jev resolves what leads the customer experience:   │
│   • products   ──► Direct product grid (default for retail goods)      │
│   • spotlight  ──► Seasonal festival banner / deal (peak buying rush)  │
│   • categories ──► Multi-department cards (e.g. Sarees vs Dhotis)      │
│   • craft      ──► Artisan story & weaving heritage (bespoke luxury)   │
├────────────────────────────────────────────────────────────────────────┤
│ 3. CATALOG         Flat Grid (≤15 items) · Filter Pills (16–60 items)  │
├────────────────────────────────────────────────────────────────────────┤
│ 4. TRUST           UPI/COD Badges & Customer Reviews (Only if real)    │
├────────────────────────────────────────────────────────────────────────┤
│ 5. CONTACT         Physical Address, Shop Hours & 1-Tap WhatsApp Button│
└────────────────────────────────────────────────────────────────────────┘
```

| # | Genesis Decision | Primitive | Allowed Scope | Fallback Floor |
| :-: | :--- | :---: | :--- | :--- |
| **1** | **Pages: Goods** | `Noul` | $p > 0.65 \implies$ `/shop`, `/cart`, `/product/[id]` | `true` if products exist |
| | **Pages: Services** | `Noul` | $p > 0.65 \implies$ `/services`, `/book` | `false` |
| **2** | **Lead Intent** | `Choice` | `products` (buy), `spotlight` (festival), `categories`, `craft` | `products` |
| **3** | **Product Layout** | Code Rule | $\le 15$ items $\implies$ **Flat grid** · $16–60$ items $\implies$ **Filter pills** | Derived by item count |
| **4** | **Typography** | `Choice` | `serif` (classic display), `sans` (clean), `grotesk` (bold) | `sans` |
| | **Tone** | `Choice` | `canvas` (light), `surface` (tinted), `ink` (dark) | `canvas` |
| | **Density** | `Score` | `[1: Compact, 2: Balanced, 3: Airy]` | `2` (Balanced) |
| | **Radius** | `Choice` | `sharp` (0px), `soft` (6px), `round` (16px) | `soft` |
| **5** | **Content Slots** | LLM + `Noul` | Slots: Title (12w), Description (60w). Claims verified vs facts. | Facts only; drop unbacked |

---

## 3. The 3 Merchant Jobs vs. Agent Automation

| Merchant Job | Human Effort (30 sec) | Autonomous Agent Work (95%) |
| :--- | :--- | :--- |
| **📷 1. Add Product** | Snap photo + speak price (*"₹1400"*) | Image crop, WebP compression, alt tag, copy slots, catalog sync. |
| **✅ 2. Confirm Order** | Tap row ➔ review details ➔ Confirm | Address validation, COD risk check, stock reservation, WhatsApp update. |
| **📦 3. Ship Parcel** | Tap `[ Print Slip ]` + hand to courier | Generates printable label, updates carrier tracking, notifies buyer. |

---

## 4. Autonomy Ladder & Intelligent Inbox Questions

The autonomy levels define risk boundaries:
* `[AUTO]`: Zero commercial risk; executes silently without disturbing the merchant.
* `[CONFIRM]`: Requires merchant confirmation via a 1-tap question card in the Now feed.
* `[MERCHANT ONLY]`: Sensitive financial or destructive actions; triggered exclusively by the owner.

| Level | Scope / Actions | Route | Execution Flow |
| :--- | :--- | :--- | :--- |
| **[AUTO]** | Stockouts, WebP, contrast audit, SEO sitemap. | Background Agent | Executes silently; zero taps needed. |
| **[CONFIRM]** | Festival banners, copy updates, catalog re-orders. | Personal Now feed | Intelligent 1-tap question card in Now. |
| **[MERCHANT ONLY]** | Price edits, refunds, cancellations, delete items. | Owner initiated | Models never touch money; code enforces tap. |

### Intelligent Inbox Questions (No Syntax, Zero Over-Engineering)

Instead of expecting the merchant to type syntax or commands, Jev proactively surfaces **bounded 1-tap questions** in `space.now`:

```text
SMART QUESTION 1: MISSING CONTACT INFO
┌────────────────────────────────────────────────────────┐
│ [?] Add shop phone number for customer WhatsApp orders?│
│     [ + Add 9876543210 ]            [ Skip for Now ]   │
└────────────────────────────────────────────────────────┘

SMART QUESTION 2: UPCOMING FESTIVAL SPIKE
┌────────────────────────────────────────────────────────┐
│ [?] Deepavali is in 14 days. Activate 10% banner kit?  │
│     [ Activate Banner ]             [ Skip ]           │
└────────────────────────────────────────────────────────┘

SMART QUESTION 3: LOW STOCK PROTECTION
┌────────────────────────────────────────────────────────┐
│ [?] Crimson Saree has 1 left. Auto-hide when sold out? │
│     [ Auto-Hide at 0 ]              [ Keep Showing ]   │
└────────────────────────────────────────────────────────┘
```

---

## 5. Taste-Driven Styling & Reversible Tweaks (Rare / Optional Layer)

Style changes are **100% managed through Taste bullets alone**. There is no separate ephemeral chat bar. When an owner speaks or adds a style bullet in the Taste drawer (e.g. *"Dark luxury tone with gold festive accent"*), Jev evaluates the active bullets in **<70ms for ₹0.10** and code flips design tokens on Edge.

To undo or change style (e.g. when festival season ends), the merchant simply taps **`[x]`** to delete that bullet in the drawer. The store deterministically reverts back in <5ms with zero residual prompt drift.

```text
TASTE BULLET ADDED/REMOVED ──► JEV EVALUATION (<70ms) ──► TOKEN/BLUEPRINT UPDATE ──► ATOMIC EDGE FLIP
• "Lead with Deepavali bridal sarees spotlight"  ➔ flips lead intent to `spotlight`
• Tap [x] to remove bullet                       ➔ deterministically reverts back to `products`
```

### Clean Taste-to-Token Schema (Input & Output)

```json
// Jev Request (Input Payload from Active Taste Bullets)
{
  "state": {
    "trade": "Handloom & Apparel Atelier",
    "taste": [
      "Pure silk sarees direct from Salem weavers",
      "Dark luxury tone with gold festive accent",
      "Lead with Deepavali bridal sarees spotlight"
    ]
  },
  "questions": {
    "lead": {
      "type": "choice",
      "instructions": "Which lead intent does taste request?",
      "criteria": { "spotlight": "Festival deal banner", "products": "Direct product grid", "categories": "Department cards", "craft": "Artisan heritage story" }
    },
    "tone": {
      "type": "choice",
      "instructions": "What surface tone is requested?",
      "criteria": { "ink": "Dark charcoal background", "canvas": "Light background", "surface": "Warm cream" }
    },
    "typography": {
      "type": "choice",
      "instructions": "Heading typography style?",
      "criteria": { "serif": "Classic display serif", "sans": "Clean modern sans", "grotesk": "Bold geometric" }
    },
    "density": {
      "type": "score",
      "instructions": "Spacing density?",
      "criteria": ["1: Compact", "2: Balanced", "3: Airy"]
    }
  }
}
```

```json
// Jev Response (Output Payload)
{
  "answers": {
    "lead":       { "choice": "spotlight", "confidence": 0.98 },
    "tone":       { "choice": "ink",       "confidence": 0.99 },
    "typography": { "choice": "serif",     "confidence": 0.96 },
    "density":    { "score": 2,            "confidence": 0.94 }
  }
}
```

```text
CODE APPLICATION (<5ms):
lead === "spotlight" ➔ inserts Deepavali banner above catalog
tone === "ink"       ➔ flips background to dark charcoal with gold accents
```

---

## 6. Verified Token Economics & Monthly Cost Ledger

Calculated on actual token consumption (Jev System One: ~500 input tokens $\approx$ $0.001 USD = **₹0.10 INR**; LLM slot drafter: ~200 tokens $\approx$ $0.0004 USD = **₹0.04 INR**):

| Lifecycle Event | Inference Operations | Latency | Unit Cost | Active Monthly Total (30 Products) |
| :--- | :--- | :--- | :--- | :--- |
| **Store Genesis (Day 0)** | 1 Jev fan-out (₹0.10) + 1 copy draft (₹0.04) | <120ms | ₹0.14 | **₹0.14** (one-time setup) |
| **Product Intake** | 1 Jev intake (₹0.10) + 1 copy slot (₹0.04) + 1 claims check (₹0.10) | <100ms | ₹0.24 / item | **₹7.20** (30 new items/mo) |
| **Daily Merchandising** | 1 Jev scoring batch (cached if state unchanged) | <70ms | ₹0.10 / run | **₹3.00** / month |
| **Smart Inbox Questions**| 2–4 proactive festival/stock checks | <70ms | ₹0.10 / check| **₹0.40** / month |
| **Taste Tweaks (Rare)**| ~5 optional voice/text Taste bullet edits | <70ms | ₹0.10 / edit | **₹0.50** / month |
| **Customer Visits & Orders**| Cloudflare Edge Cache + Turso DB checkout | ~5ms | **₹0.00** | **₹0.00 forever** (Zero AI on visits) |
| **Total Monthly Store AI** | Strictly bounded inference ledger | — | — | **₹11.24 / month** (≈ ₹10 – ₹15 / mo) |
