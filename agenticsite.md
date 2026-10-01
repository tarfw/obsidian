# TAR Agentic Site — Master Architecture & Contract

| Purpose | Contract |
| --- | --- |
| Goal | A self-maintaining commerce storefront: created from one brief, edited by chat, adapted per visitor at $0/visit, audited on schedule |
| Cognitive Boundary | Deterministic Code ($0\text{ms}$, $\$0$) + Jev System One ($<80\text{ms}$, $\$0.001$) + Batched LLM System Two ($\sim 1.2\text{s}$, $\$0.015$) |
| Invariant | Public visits run zero AI calls; all AI happens at design time or on background schedule |
| Base Starter Design | Adanola Editorial Lookbook (`commerce1.md`) |
| Ownership | [space.md](space.md) work surfaces · [commerce.md](commerce.md) business truth |

---

## 1. One Living Loop for Everything

```text
signal ──► route ──► decide ──► patch ──► check ──► save rev
```

| Signal | Loop Run | Trigger |
| --- | --- | --- |
| **Brief** | Create the document | Owner, once |
| **Command** | Edit the document | Owner, anytime |
| **Schedule** | Audit and draft a fix | Scout, background cron |

Every run follows the exact same path: route the signal, decide with the cheapest sufficient engine, produce one validated patch, and save a new revision. Publish is a separate explicit gate (§7).

---

## 2. Three Engines, Strict Boundaries

| Engine | Owns | Hard Invariant |
| --- | --- | --- |
| **Deterministic Code ($0\text{ms}$, $\$0$)** | Facts, prices, stock, permissions, patches, validation, compile, publish, edge variant resolution | **Never guesses meaning** |
| **Jev System One ($<80\text{ms}$, $\$0.001$)** | Choose, rank, or flag options code supplied via **`Choice`**, **`Noul`**, and **`Score`** | **Never invents facts, IDs, or code** |
| **LLM System Two ($\sim 1.2\text{s}$, $\$0.015$)** | Original brand narrative & copy (batched on creation or explicit copy rewrite) | **Never touches layout, tokens, or prices** |

### Jev Primitives Matrix

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. CHOICE   │ Picks 1 option from discrete set. (Archetype, Container, Tone, CTA Style) │
├─────────────┼──────────────────────────────────────────────────────────────────────────┤
│ 2. NOUL     │ Probability of "Yes" 0.0..1.0. (Page presence, Swatches, Quick-Add, Gates)│
├─────────────┼──────────────────────────────────────────────────────────────────────────┤
│ 3. SCORE    │ Position on ordered levels 1..N. (Spacing density, Visual rhythm, Urgency)│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

* **Cost & Speed Rule**: Monthly cost is `judgments × provider price`. Batch independent questions into 1 parallel request, cache stable judgments, and skip models whenever code suffices. Exact edits (literal text, numbers, colors, assets named by user) run in pure code for **$0 AI cost**.

---

## 3. Vocabulary and Document Catalog

The site is one JSON document (`SiteDocument` in `tarharness/src/site/document.ts`):

```text
design + pages + journeys + personas + policy + claims
sections carry nodes, facts (Turso DB bindings), and actions (Gateway targets)
```

| Term | Definition & Role |
| --- | --- |
| `design` | Shared design tokens: colors (ink, canvas, surface), fonts, radii (0..32px), spacing (4..64px) |
| `frame` | Global shell: announcement bar, top navigation, and footer |
| `page` | Route path, metadata, and ordered list of sections (`/`, `/shop`, `/lookbook`) |
| `section` | Stable editable region with container layout and slotted blocks |
| `layout` | Container geometry: `flow`, `flex` (row/column), `grid` (1..6 cols), `stack` (layered overlay) |
| `tone` | Section color variant: `canvas` (light), `surface` (neutral), `ink` (dark), `accent` |
| `block` | Slotted primitives: `heading`, `text`, `image`, `video`, `icon`, `button`, `list`, `cards`, `tabs`, `form` |
| `slot` | Named position within layout container (`hero`, `media`, `caption`, `grid`) |
| `style` | Appearance tokens, fluid spacing (`clamp()`), and responsive alignments |
| `fact` | Approved database binding pointer (e.g. `facts:products.public`); Turso DB owns truth |
| `action` | Registered Gateway mutation target (e.g. `cart.add`, `order.create`, `checkout`) |
| `asset` | Approved stored image/video in R2; never unverified generated URLs |
| `rev` | Saved, immutable, indexed document revision |

---

## 4. Create: 1-Shot Speculative Fan-Out (<80ms)

```text
User Brief: "Minimalist luxury activewear store like Adanola with live prices"
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   1 PARALLEL JEV HTTP REQUEST (api.typesafe.ai/v1/systemone)            │
│ State: { brief: "...", catalog: { total: 12, has_colors: true }, profile: doc.profile } │
│                                                                                        │
│ 1. archetype        ──► Choice: 'lookbook' (Adanola Editorial Lookbook)                │
│ 2. pages.shop       ──► Noul:   0.98  (Include /shop)                                  │
│ 3. pages.lookbook   ──► Noul:   0.92  (Include /lookbook)                              │
│ 4. section_flow     ──► Choice: 'classic_lookbook' [announcement, nav, hero, grid, split]│
│ 5. spacing_density  ──► Score:  2.85  (Maps to Airy 64px section gap)                  │
│ 6. color_tone       ──► Choice: 'canvas' (Pure Paper White #ffffff + Carbon Ink #000)  │
│ 7. hero_style       ──► Choice: 'fullbleed_16_6' (16:6 aspect ratio, ghost CTA)        │
│ 8. button_shape     ──► Choice: 'micro_4px' (4px crisp radius)                         │
│ 9. quick_add_flag   ──► Noul:   0.94  (Enable fast quick-add buttons)                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DETERMINISTIC BUILDER (<2ms, $0.00):                                                    │
│ • Maps typed answers directly to Adanola AST nodes without LLM hallucination           │
│ • Binds live Turso DB catalog prices (€55–€95) and stock quantities                    │
│ • Passes AST through Jev Critic (<40ms) ──► Saves rev 1 ──► Studio ready in <120ms total│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Edit: 3-Lane Router

```text
command + document + catalog
  ├── Exact value / tokens ──► Pure Code Patch  (0ms, $0 AI)
  ├── Ambiguous target/tone ──► 1 Batched Jev Ask (<70ms, $0.001)
  └── Creative Prose Rewrite ─► Batched LLM      (~1.2s, $0.015)
  ▼
One validated patch ──► Save Rev N+1 ──► Redraw Preview ──► [↩ Undo]
```

* **Undo Rule**: Undo creates a new revision restoring earlier state; history is append-only and never rewritten.
* **Exact Values**: Code copies literal text, numbers, colors, and selected asset IDs directly.

---

## 6. Real-Time Visitor Persona Variants ($0 / Visit)

Jev pre-compiles persona branches at design time (`VariantDefinition` patches: tone, visibility, section order). Cloudflare Workers at the Edge match incoming request headers/cookies in **$<1\text{ms}$ for $\$0.00$ AI cost**.

```text
Visitor Lands (UTM channel, order cookie, device) ──► Cloudflare Worker (<1ms, $0)
  ├── Persona 1 (TikTok Ad): Full-bleed motion hero, 4-col fast grid, black [Quick Add]
  ├── Persona 2 (Vogue/PR): High whitespace Lookbook, whisper-thin Ghost CTA, soft mist
  └── Persona 3 (VIP Return): "Welcome back", 1-tap reorder drawer, matching upsells
```

---

## 7. Publish Gate and Public Serving

```text
freeze JSON/facts/assets/address/epoch/renderer versions
  ├── Compile & check every route (HTML, CSS, assets)
  ├── Exact candidate review & owner approval
  └── Atomic commit: write immutable R2 files ──► atomic CONTROL activation
```

| Publish & Serving Rule | Contract |
| --- | --- |
| **Public Data** | Approved snapshots only; no direct private workspace DB reads by public visitors. |
| **Atomic CONTROL** | Generation/epoch comparison switches the live site instantly without partial rendering. |
| **Address & Routing** | Served via Cloudflare Worker (`https://tar-sites.tar-54d.workers.dev/<workspace>/` or custom domain). |
| **Private Preview** | Scoped expiring tokens, `no-store`/`noindex` headers. |
| **Commerce Gate** | Visitor orders pass through Gateway (`order.create`); checkout re-verifies live price & stock. |
| **Route Checks** | Layout stability, touch targets $\ge 44\text{px}$, WCAG contrast $\ge 4.5:1$, clean 404s, sitemap/robots. |

---

## 8. Memory Tiers & Taste Profile

| Tier | Store | Effect |
| --- | --- | --- |
| **Revisions** | Turso records + R2 snapshot | Instant 1-tap Undo/Redo; complete audit trail. |
| **Taste Profile (`doc.profile`)** | Document AST root | Continuous reinforcement: accepted/rejected tokens bias future Jev defaults. |
| **Outcomes** | Workspace analytics store | Conversion metrics feed Scout to promote winning layout variants. |

* An explicit merchant command always overrides learned taste defaults.

---

## 9. Autonomous Scout Sentinel (Proactive Store Care)

```text
Daily Cron ──► Declared Checks ──► Draft Revision Candidate ──► Space Inbox Item
                                                                 ├── [Accept] ──► Normal edit path
                                                                 └── [Ignore] ──► Draft expires
```

| Check | Condition | Proposal Draft |
| --- | --- | --- |
| **Stockout** | Featured item has 0 stock in Turso DB | Swap slot with high-stock sibling variant. |
| **Season Drift** | Visible text references past date/season | Generate updated seasonal headline via Writer. |
| **Integrity** | Route or asset broken in compiled release | Restore valid ghost CTA or active asset. |

* **Invariant**: Scout **never auto-publishes**. It generates a draft revision and posts an action card to the Space Inbox.

---

## 10. Mobile Studio Remote (`tarapp`)

Radically clean directing interface in `tarapp`:

```text
┌──────────────────────────────────────────────────────────────────┐
│ NORI · Draft (rev 2)               [ 👁️ Live ↗ ]   [ ☁️ Publish ] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  👤 YOU                                                          │
│  "Build me an activewear store for NORI. Minimalist lookbook     │
│   style like Adanola with live prices from my catalog."          │
│                                                                  │
│  🤖 JEV (rev 1 · 80ms)                                           │
│  Created NORI Lookbook: 4-column product grid with live catalog  │
│  prices (€55–€95), full-bleed hero, and split lifestyle section. │
│                                                                  │
│  👤 YOU                                                          │
│  "Make the hero darker and give sections more breathing room"    │
│                                                                  │
│  🤖 JEV (rev 2 · 45ms)                                           │
│  Set hero background to Carbon Ink (#000000) and expanded        │
│  section spacing to 64px. Noted: you prefer dark & airy. [↩ Undo]│
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────┐ ┌────────────┐ │
│ │ 🎙️ / 💬 Tell Jev what to change...            │ │     ↑      │ │
│ └───────────────────────────────────────────────┘ └────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

* **Header `[ 👁️ Live ↗ ]` & `[ ☁️ Publish ]`**: Persistent top right. Never repeated in chat.
* **Chat Stream**: Pure creative director conversation with execution timestamps and inline `[ ↩ Undo ]`.
* **Input Bar**: Bottom anchor voice/text bar.

---

## 11. Delivery & Acceptance

| Area | Primary Files |
| --- | --- |
| **Document, Patch, Validate** | `tarharness/src/site/document.ts`, `patch.ts`, `validate.ts` |
| **Judgments & Composer** | `build.ts` (deterministic builder), `judgment.ts`, `model.ts` (batched prose) |
| **Router, Scout, Inspect** | `edit.ts` (3-lane router), `store.ts` (store/publish/scout), `inspect.ts` (release checks) |
| **Render & Compile** | `html.ts`, `compile.ts`, `preview.ts` |
| **Mobile Editor Remote** | `tarapp/src/components/site.tsx` |

| Acceptance Area | Verification Rule |
| --- | --- |
| **Create** | One brief produces a valid site with live DB facts and zero hallucinated content in $<100\text{ms}$. |
| **Edit** | Exact, ambiguous, and prose edits each land as a single revision with 1-tap Undo. |
| **Variants** | Persona resolution adds 0 AI calls and $<1\text{ms}$ latency at visit time. |
| **Scout** | Declared check produces a draft revision and Space Inbox card, never an auto-publish. |
| **Cost** | Public visits perform 0 model calls; entire active store AI budget remains $\sim \$0.25–\$0.35/\text{mo}$. |
| **Fallback** | With no model key configured, create and edit still work deterministically. |
