# TAR Site AI — Master Architecture & Contract

## Contract

Site AI provides a self-maintaining storefront built and operated autonomously by
an AI agent from business facts. Human intervention is strictly an optional
director layer (via speech or text fragments). Public visits execute zero AI calls.

| Invariant | Rule |
| --- | --- |
| Autonomous baseline | Business facts alone yield a 100% complete, publish-ready store in <120ms |
| Autopilot sync | DB catalog changes, price updates and stockouts sync to the live store automatically |
| No design questions | Agent determines theme, layout, and styling; asking questions is a failure mode |
| Director correction | Chat is a correction & business director layer, never a manual page builder |
| Zero visit cost | Public visits execute zero model calls ($0/visit); edge serves compiled assets |
| Bounded AI | At most one batched call per engine per signal; never chain or re-ask |
| Source of truth | Turso owns business facts and prices; Gateway owns orders and mutations |
| Deterministic floor | Category default theme provides a valid, contrast-audited site without AI |
| Language | LLM drafts prose in brief locale (EN+TA); structure, tokens and prices stay neutral |

```text
business facts -> agent builds & syncs on autopilot -> publish-ready store (<120ms) -> [optional director commands] -> live ($0/visit)
```

## 1. Interaction Model: Autonomous Autopilot & Director Layer

The agent does all the visual assembly, responsive styling, and ongoing synchronization.
The owner acts as a store director, intervening only when they want to issue a business or visual command.

```text
1. AUTOPILOT ZERO-TOUCH BUILD (Day 0)
   Business facts in DB / brief ──> 1 batched Jev fan-out ──> 100% Publish-Ready Store (<120ms)

2. AUTOPILOT SYNCHRONIZATION (Day 1..365)
   POS product edits / price shifts / stockouts ──> Live storefront updates automatically

3. STORE DIRECTOR LAYER (Optional, anytime)
   Owner speaks/types fragment ──> 3-lane router ──> Surgical AST patch (<70ms) + [Undo]

4. 1-CLICK ATOMIC PUBLISH
   Owner taps Publish ──> Code audits & freezes ──> Cloudflare R2/D1 flip (<1ms edge, $0 AI)
```

| Signal | Input | Engine / Path | Output | Budget |
| --- | --- | --- | --- | --- |
| **Autonomous Build** | DB facts or brief | Code + 1 batched Jev fan-out | Category, theme, layout, bound DB facts | 1 Jev batch (<120ms) |
| **Director Correction** | Speech (ASR) or text fragment | 3-lane router (Code / Jev / LLM) | Single AST node patch -> rev N+1 | <= 1 model call (<70ms) |
| **Publish** | 1-tap Publish command | Pure code compiler + R2 upload | Live site release on Cloudflare Edge | Code, $0 (<1ms) |

### 3-Lane Correction Router

When an owner directs a change, the system isolates the update surgically:

```text
director fragment (e.g., "make the collection darker with 3 columns")
   |-- exact literal / token ---------> pure code patch    0ms    $0
   |-- ambiguous target / style ------> 1 batched Jev ask  <70ms  $0.001
   `-- creative prose rewrite --------> 1 batched LLM      ~1.2s  $0.015
   v
validated AST patch -> rev N+1 -> instant preview -> [ Undo ]
```

- **Surgical Isolation**: Jev alters only requested properties (e.g. `tone = ink`, `columns = 3`) and returns `keep` (`null`) for everything else. Prices, inventory, and navigation are never touched.
- **Append-Only History**: Every correction produces an immutable revision; 1-tap Undo instantly restores earlier state.

## 2. Engines & Judgment Inventory

| Engine | Owns | Never |
| --- | --- | --- |
| Code | Facts, prices, stock, permissions, AST patches, validation, compile, edge routing | Guesses meaning |
| Jev System One | Autonomous bounded decisions over code-supplied menus (Choice, Noul, Score) | Invents facts, IDs or tokens |
| LLM System Two | Brand narrative, prose copy drafting within slot character limits | Writes directly to document |
| Voice (ASR) | Code-mixed speech transcription into fragment text | Interprets or routes |

### Jev Judgment Catalog

All judgments are batched into a single request per signal:

| Judgment | Primitive | Options / Scope | Runs at |
| --- | --- | --- | --- |
| `category` | Choice | Catalog archetypes | create |
| `product` | Noul | Goods presence -> `/shop`, cart, checkout | create |
| `service` | Noul | Bookable services -> `records.public`, booking | create |
| `purposes` | Noul x N | Section presence per registered purpose | create |
| `theme` | Choice | Registered themes (`THEME_IDS`) | create |
| `flow` | Choice | Section sequence (`SECTION_FLOWS`) | create |
| `density` | Score | 1..3 -> compact, balanced, airy | create |
| `tone` | Choice | Section tone: canvas, surface, ink, accent | create |
| `columns` | Choice | 2, 3, 4 columns | create |
| `hero` | Choice | fullbleed_16_6, split_16_9, none | create |
| `quickadd` | Noul | Quick-add buttons on product cards | create |
| `assets` | Score x N | Rank approved media against brief | create |
| `target` | Choice | Edit target node / section ID | edit |
| `property` | Choice | Property value for ambiguous edit | edit |
| `claims` | Choice | Verdict: supported, contradicted, unsupported | publish / check |

## 3. Document Model & Palette

`SiteDocument` (`tarharness/src/site/document.ts`) is the typed source of truth:

```text
SiteDocument = design + pages + journeys + policy + taste + claims + releases
  pages      -> sections -> nodes (AST) + bindings (Turso) + actions (Gateway)
```

| Term | Role |
| --- | --- |
| `category` | Site archetype; sets default flow, theme, and gate priors |
| `design` | Typed tokens: 9 semantic colors, typography, space, shape, elevation, layout, motion |
| `page` | Route path, metadata, and ordered sections (`/`, `/shop`, `/product/[slug]`, `/service/[slug]`) |
| `section` | Editable region: purpose, layout spec, tone style, AST nodes, bindings, actions |
| `layout` | Container geometry: `flow`, `flex`, `grid` (1..6 cols), `stack` (overlay heroes) |
| `tone` | Section color pair: `canvas`, `surface`, `ink`, `accent` |
| `node` | AST primitives: heading, text, image, video, button, list, card, collection, tabs, form |
| `fact` | Approved database binding (`catalog.public`, `records.public`) |
| `claims` | Approved fact registry; prose lane asserts only registered claims |
| `journey` | Visitor flow: `order`, `booking`, `enquiry`, `payment` (WhatsApp/UPI/COD ride payment) |
| `action` | Registered Gateway target (`cart.add`, `order.create`, `record.create`) |
| `asset` | Approved R2 media with validated rights and alt text |
| `taste` | Document root: accepted/rejected looks and tokens |
| `rev` | Saved immutable revision |

### Registered Section Palette

Section purposes (`PURPOSE_IDEAS` in `tarharness/src/site/design.ts`) are the universal building blocks combined by the agent to construct any category:

| Purpose | Architectural Role | Typical AST Layout & Data Binding |
| --- | --- | --- |
| `introduction` | Hero opening banner with core offer | `stack` (fullbleed) or `flex` (split 16:9), headline, CTA |
| `collection` | Live product / service catalog | `grid` (2..4 cols), bound to `catalog.public` / `records.public` |
| `recommendations` | Cross-sell / related product rail | `grid` or carousel, bound to sibling category heuristics |
| `split` | Editorial 2-up photography showcase | `grid` (2-col) with 2 approved R2 media assets |
| `categories` | Category tab filter | `tabs` or pill links mapped to route filters |
| `promo` | Full-width promotional banner | `stack` with accent tone and high-contrast action button |
| `features` | Value propositions / capabilities | `grid` (3-col) with icon, title, description cards |
| `proof` | Evidence, reviews, testimonials | `grid` or list with quote facts, author, rating stars |
| `story` | Brand narrative and founder background | `flex` editorial card with story prose and media |
| `questions` | FAQ accordion for trust & details | `accordion` with question-and-answer blocks |
| `hours` | Opening hours & operational schedule | `flow` structured schedule table from business facts |
| `contact` | Communication channels & location | `flex` WhatsApp deep link, tel, email, address |
| `action` | Final call-to-action ribbon | `stack` banner with primary Gateway interaction target |

## 4. Categories & Commerce Gates

Category is resolved once at creation from workspace data and brief:

| Sector | ID | Jev Criteria | Flow Template | Theme Default | Gates |
| --- | --- | --- | --- | --- | --- |
| Goods | `retail` | Physical goods, catalog, shipping | `classic_lookbook` | minimal-clean / lookbook | P |
| Goods | `estate` | Property listings, viewings | `editorial_first` | editorial-light | P+S |
| Hospitality | `food` | Food and drink, menu, hours | `commerce_first` | editorial-chalk | P+S |
| Hospitality | `stay` | Room bookings, availability | `editorial_first` | editorial-light | P+S |
| Hospitality | `event` | Gatherings, tickets, schedule | `commerce_first` | streetwear-dark | P |
| Service | `care` | Personal/wellness appointments | `classic_lookbook` | minimal-clean | S |
| Service | `health` | Medical care, appointments, trust | `classic_lookbook` | minimal-clean | S |
| Service | `trade` | Field work, quotes, jobs | `editorial_first` | minimal-clean | S |
| Professional | `firm` | Scoped professional engagements | `editorial_first` | editorial-light | S |
| Professional | `company` | Business presence without direct sale | `editorial_first` | editorial-light | - |
| Professional | `software` | Software apps, features, demo | `commerce_first` | minimal-clean | P+S |
| Knowledge | `expert` | Talks, reports, advisory | `editorial_first` | editorial-light | P+S |
| Knowledge | `learning` | Courses, curriculum, coaching | `commerce_first` | minimal-clean | P+S |
| Knowledge | `studio` | Creative portfolio, visual work | `editorial_first` | streetwear-dark | - |
| Content | `media` | Articles, episodes, newsletter | `editorial_first` | editorial-light | - |
| Content | `personal` | Individual resume, creator identity | `editorial_first` | minimal-clean | - |
| Mission | `cause` | Non-profit, donations, volunteers | `editorial_first` | editorial-chalk | - |
| Public | `civic` | Official public body, notices | `classic_lookbook` | minimal-clean | S |
| Public | `club` | Member activities, joining | `classic_lookbook` | minimal-clean | S |
| Fallback | `none` | Default blueprint | `commerce_first` | minimal-clean | Gates |

### Commerce Gates Mapping

| Gate Result | Rail on Home | DB Binding | Journey Target | Primary CTA |
| --- | --- | --- | --- | --- |
| `product` | Products rail + `/shop` | `catalog.public` | `order` (`cart.add`, `order.create`) | Shop / Quick Add |
| `service` | Bookable services rail | `records.public` (type: service) | `booking` (`record.create`) | Book Now |
| `Both` | Products rail first, services second | Both bindings | Both (`order` primary) | Shop + Book |
| `Neither` | Enquiry block | - | `enquiry` (`record.create`) | Enquire / Contact |

## 5. Standardized Theme Palettes & Validation

The agent autonomously selects the optimal theme from the registered catalog (`THEMES` in `design.ts`):

| Theme ID | Standard Name | Mood & Personality | Core Palette (`canvas` / `ink` / `accent`) | Typography & Layout | Best-Fit Categories |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`editorial-lookbook`** | **Lookbook** | Ultra-clean, monochrome fashion magazine | `#ffffff` white<br>`#000000` pitch ink<br>`#000000` black accent | Sharp modern sans, `0.025em` tracking, **4-column grid** | Fashion, apparel, sarees, jewelry, luxury boutique |
| **`editorial-light`** | **Editorial** | Warm literary elegance, classic serif | `#ffffff` canvas<br>`#0b0b0c` off-black<br>`#4d49fc` royal iris | Classic serif display, `1.6` line height, **3-column grid** | Law, real estate, advisory, bookshops, consulting |
| **`editorial-chalk`** | **Chalk** | Artisanal warm paper with cobalt pop | `#edebe4` warm paper<br>`#01273e` deep slate<br>`#000bfa` cobalt blue | Warm serif display, tinted surface cards, **3-column grid** | Cafes, bakeries, craft food, restaurants, causes |
| **`streetwear-dark`** | **Bold Dark** | High-energy, high-contrast dark mode | `#111111` dark canvas<br>`#f8fafc` crisp white<br>`#5e6ad2` electric violet | Bold heavy grotesque sans, `1.33` scale, **3-column grid** | Events, music, nightlife, creative studios, streetwear |
| **`minimal-clean`** | **Minimal** | Modern neutral balanced canvas | `#ffffff` canvas<br>`#18181b` charcoal ink<br>`#2563eb` modern blue | Neutral system sans, `6px/10px` pill radii, **3-column grid** | Clinics, wellness, software apps, trade services |

### Deterministic Code Validation
- **WCAG Contrast**: All color pairs strictly audited $\ge 4.5:1$; failure steps companion shade automatically.
- **Font Availability**: Verified against Google/system list; glyph missing falls back to script-capable fonts.
- **Limits**: Body type $\ge 16\text{px}$, spacing unit $1..32\text{px}$, touch targets $\ge 44\text{px}$.
- **Fallback**: If Jev confidence is low or API key is absent, code automatically falls back to the category default floor.

## 6. Publish Gate & Public Serving

```text
freeze document -> run validation checks -> owner 1-click approval -> atomic R2 write -> CONTROL epoch flip
```

| Area | Invariant |
| --- | --- |
| Data privacy | Public snapshots only; visitors never query private workspace DB |
| Atomic release | Epoch/generation comparison in D1 CONTROL flips the live site instantly |
| Edge serving | Cloudflare Worker serves static HTML/assets ($0 AI) |
| Commerce verification | Checkout re-checks live price and inventory at Gateway before committing |
| Quality audit | Touch targets $\ge 44\text{px}$, WCAG contrast $\ge 4.5:1$, clean 404s, sitemap/robots, policy pages |

## 7. Concept Screen: The Autonomous Store Director

```text
┌──────────────────────────────────────────┐
│ KANCHI SILKS · Store Manager             │
│ [ Live: kanchi-silks.tar.site ] [Publish]│
├──────────────────────────────────────────┤
│ 🤖 AGENT AUTOPILOT                       │
│  ● 18 products synced from Turso DB      │
│  ● WhatsApp orders active (+91 987...)   │
│  ● Contrast & mobile audits passing (100)│
├──────────────────────────────────────────┤
│                                          │
│       [ LIVE INTERACTIVE PREVIEW ]       │
│                                          │
│   "Traditional Kanchipuram Silks..."     │
│   [ Saree 1 ₹4,500 ] [ Saree 2 ₹8,200 ]  │
│                                          │
├──────────────────────────────────────────┤
│ QUICK ACTIONS                            │
│  [ Run Festive Sale ] [ Photo Bigger ] › │
│  [ Darker Theme ]     [ Add Location ] › │
├──────────────────────────────────────────┤
│ 🎤 "Tell your agent what to change..."   │
└──────────────────────────────────────────┘
```

- **Autopilot Telemetry**: Highlights active product sync from Turso DB, WhatsApp order channel status, and 100% passing contrast audits.
- **Interactive Preview**: Live, responsive storefront draft.
- **Quick Action Chips**: Common 1-tap business and styling triggers.
- **Director Mic**: Bottom-anchored voice and text input for natural language directions.

## 8. Implementation & Acceptance

| Area | Primary Source Files |
| --- | --- |
| Document & validation | `tarharness/src/site/document.ts`, `validate.ts`, `patch.ts` |
| Judgments & builder | `tarharness/src/site/judgment.ts`, `build.ts` |
| Design & themes | `tarharness/src/site/design.ts` |
| Router & store | `tarharness/src/site/edit.ts`, `store.ts`, `inspect.ts` |
| Render & compile | `tarharness/src/site/html.ts`, `compile.ts`, `preview.ts` |
| UI components | `tarapp/src/components/site.tsx` |

### Acceptance Criteria

- **Zero questions**: Business facts alone generate a complete, valid storefront in <120ms without human design intervention.
- **Zero visit cost**: Public browsing executes 0 AI calls.
- **Safe fallback**: Complete functionality operates deterministically when no AI key is configured.
- **Audited copy**: Prose asserts only registered claims; prices and facts are never hallucinated.
- **Instant undo**: Every edit fragment creates an atomic revision with 1-tap rollback.
