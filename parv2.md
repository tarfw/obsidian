# TAR — Site Bot and Agentic Sites

Canonical site-generation plan, researched 2026-09-11. This supersedes earlier site plans and requires no earlier site document. Read with `tarv3.md` (core architecture) and `pricingplan.md` (current prices). Proposed capabilities are not claims of implementation.

> Add Site Bot, describe the outcome, review the preview, publish. TAR builds a high-quality site from approved business facts, adapts it to visitor intent, and completes work through existing Actions and Flows.

## 1. Product decision

Site Bot is a marketplace capability package. The existing TAR assistant creates and changes sites from prompts. It returns a preview, change summary, missing facts, cost and publication status in the conversation.

There is no page-builder canvas, component inspector or visual editor. Preview, Stop, Publish and Undo may be small controls, but they call the same Actions as prompts.

```text
owner prompt + approved Records + design system
        |
        v
assistant -> typed site changes -> validate -> preview -> publish
                                                    |
visitor -> static page + live regions -> Gateway -> existing business work
external AI ---------------------------> adapters ---^
```

| Principle | Rule |
|---|---|
| Simple owner experience | Prompt -> preview -> refine -> publish |
| One business system | Forms, chat and agent tools call existing TAR Actions/Flows |
| Safe generation | AI composes reviewed components; it does not execute arbitrary site code |
| Fast base | Pages render without a model call or mandatory app runtime |
| Current truth | Published copy, refreshable facts and transactions use distinct freshness rules |
| Recoverable publishing | A request resolves a complete old or complete new release |
| Future compatibility | Protocols and UI libraries are adapters around TAR contracts |

## 2. Finalized framework stack

Use **Svelte + json-render for public generated interfaces, TypeScript + Effect for server execution, and the existing Cloudflare Worker, Turso, D1 and R2 platform**. Keep the owner experience in the existing Expo/React Native assistant.

| Layer | Choice | Purpose |
|---|---|---|
| Owner interface | Existing Expo/React Native TAR assistant | Prompts, attachments, preview, progress, publish, undo |
| Published site | Reviewed Svelte Cards -> HTML/CSS | Fast crawlable pages; no component runtime by default |
| Live generated UI | `@json-render/core` + `@json-render/svelte` | Stream constrained specs into enabled regions |
| Styling | Plain CSS + semantic token variables | Small output, themes, responsive/RTL support |
| Platform build | Vite for browser assets; Wrangler for Worker | Build platform once, not a project per customer |
| Backend | Existing `tarharness` with Effect | Failures, services, concurrency, validation, streams |
| HTTP | Worker Fetch handlers + Web Streams | Reuse existing routing and streaming |
| Durable work | Existing TAR Run/delivery runner | Checkpoints, retries, waits, reconciliation |
| Data | Turso + D1 + R2 | Facts + identity/routing + immutable files |

This plan uses one public-site renderer and the existing backend. No additional page framework, DOM library, API router, agent runtime, per-site repository or per-customer build service is part of the stack.

### Why Svelte + json-render

`json-render` lets AI choose components, hierarchy, bindings and actions from a declared catalog and stream JSON Patch updates. TAR still owns facts, permissions, validation and business completion. Keep it behind an adapter so TAR's schema survives library changes. [Introduction](https://json-render.dev/docs), [streaming](https://json-render.dev/docs/streaming), [renderers](https://github.com/vercel-labs/json-render)

Svelte compiles declarative components into optimized JavaScript, and json-render provides a Svelte adapter. Public sites use Svelte; the existing owner app keeps React Native. Stage 0 verifies integration, streaming, state preservation and actual payload before production. [Svelte](https://svelte.dev/docs/svelte/overview), [json-render adapters](https://github.com/vercel-labs/json-render)

Hybrid delivery = static HTML/CSS for the base + lazy Svelte for interactive regions + Effect/Workers for authorized execution. TAR's existing publisher owns releases/routing; a shared surface loader owns browser mounting. This is one delivery design, not a mix of competing frontend frameworks.

```text
published Cards -> static render -> HTML + CSS
live surface     -> lazy Svelte/json-render -> streamed interactive region
```

Mount live surfaces into dedicated roots, or hydrate only regions produced by compatible Svelte SSR with matching initial data. Do not hydrate the whole page by default. Build reviewed components once; visitor prompts produce data/specs, not executable Svelte source or per-visitor compilation.

Agentic readiness = versioned catalogs + validated patches + authorized Actions + isolated context + static fallback. These contracts support live content, section/layout and approved design-token changes independently of the chosen renderer.

Use TAR's small Card registry. Do not ship a complete sample kit or another state framework. Load the live runtime and needed component chunks only when generation is enabled.

### How Effect fits

Effect is the backend programming layer, not the visual framework. Use it for typed failures/services, bounded concurrency, cancellation, timeouts, retry policies, provider calls, validation and observability. Keep pure rendering and formatting as ordinary TypeScript.

Effect fibers do not persist through Worker restarts; long work checkpoints through TAR's durable runner. Coordinate provider, Effect and runner retries so counts do not multiply.

The repository pins `effect@4.0.0-rc.112`; installed AI exports are under `effect/unstable/ai`. Pin and test exact versions because Effect 4 is currently a release candidate. Hide unstable APIs behind one provider adapter. [Effect](https://effect.website/), [Schema](https://effect.website/docs/schema/introduction/), [AI](https://effect.website/docs/ai/introduction/)

| Boundary | Validator |
|---|---|
| TAR request, authority, versions, business input | Effect Schema / Gateway |
| Generated components and props | json-render catalog (currently Zod-based) |
| Renderer action -> business Action | Registered ID -> Gateway canonical validation |

Do not assume Effect and Zod schemas are interchangeable. Test conversions. Use one AI orchestration path, not parallel Effect and AI-SDK agent loops.

## 3. Prompt-only owner experience

1. Add Site Bot directly or through a business template.
2. Describe the outcome: enquiries, orders, bookings, information or support.
3. TAR reuses approved details, products/services, media, capabilities and brand material.
4. The assistant asks only for missing facts needed for correctness.
5. TAR returns one recommended preview and a short readiness report.
6. The owner requests changes in normal language and publishes.

Examples:

- “Create a Tamil and English site for my restaurant.”
- “Make the menu easy to scan and highlight catering.”
- “Use these brand files and keep the design calm.”
- “Preview as a first-time customer on a slow phone.”
- “Publish this draft.” / “Undo the last change.”

An explicit “Publish this draft” authorizes that scoped operation, subject to role, version, policy and budget. Ambiguous work stays a draft. Preview never publishes. Domain ownership uses TAR settings only when verification is required.

| Status | Meaning |
|---|---|
| Draft | Saved proposed definition |
| Building | Generation/assets/checks running |
| Ready | Preview passes required gates |
| Publishing | Durable activation in progress |
| Live | Serving pointer confirms release |
| Needs attention | Actionable failure; previous live release remains |

Customer forms remain ordinary accessible forms. Visitors need no prompting knowledge.

## 4. Agentic-site model

| Capability | Example | Mechanism |
|---|---|---|
| AI creation/editing | “Add a catering page” | Typed draft operations |
| Immediate adaptation | Visitor chooses Catering/Tamil | Deterministic context rule |
| Live composition | “Compare options for 30 under ₹10,000” | Stream checked session UI |
| Business completion | Submit quote/order/booking | Existing Gateway Action/Flow |
| Agent interoperability | External assistant searches/books | Versioned adapter |

An answer saying “done” is not completion. Journeys define observable outcomes: enquiry captured, order accepted, booking confirmed or human handoff created.

```text
Visitor
  +-> published HTML
  +-> intent/locale variant
  +-> current public facts
  +-> live generated surface (optional)
  +-> private view (authenticated)
  +-> Action/Flow -> confirmed result or Inbox handoff
```

The base page remains useful during model, stream or budget failure.

## 5. Minimal data contract

Use existing Records and adapters. Add one `site` type; do not add a CMS or storage engine.

| Item | Storage |
|---|---|
| Editable root | `site` Record: draft/settings/release refs; checked `version` |
| Immutable release | `site` Record with `data.parent`; frozen inputs/manifest |
| Publication | Existing `operation` and `delivery` records |
| Routing | D1: host, workspace, site, release, generation, state |
| Assets | R2 reference `{ object, hash, bytes, mime }` |
| Context | Existing conversation/Run/customer records with finite scope |
| Usage | Bounded aggregates; material audit stays in TAR events |

```text
site    = { schema, design, locale, timezone, currency,
            pages[], journeys[], variants[], surfaces[], policy }
page    = { id, path, title, meta, cards[] }
card    = { id, kind, version, variant, props, bindings[], actions[] }
binding = { slot, query, version, params, access, freshness, empty }
journey = { id, title, target, version, input, outcome }
variant = { id, when, priority, patch }
surface = { id, catalog, scope, design, budget, fallback }
```

Targets resolve to registered queries, Actions or Flows. Bindings are typed references, never arbitrary SQL/JavaScript. A surface limits Cards, facts, Actions and design choices available to live generation.

Session UI is temporary. Persist only for requested resumption with finite retention. It does not create a release or persona database.

Every release pins schema, Card library, compiler, normalized design, model/instructions where used, fact snapshot and media hashes. Presentation rollback does not roll back current stock, price or permissions.

## 6. Design and Cards

Use **Card** internally and **Section** in owner-facing language. Share schemas/tokens across platforms; Svelte web and React Native keep separate views.

| Family | Scope |
|---|---|
| Navigation | Header, links, accessible mobile menu |
| Hero | Split, centered, image-led, compact |
| Content | Story, prose, editorial sections |
| Collection | Products, services, approved people, lists/grids |
| Features | Benefits and steps |
| Proof | Sourced reviews, quotes, metrics, logos |
| FAQ | Accessible questions/answers |
| Hours | Hours and bound current status |
| Contact | Approved public location/contact data |
| Form | Enquiry and installed customer journeys |
| CTA | Primary/closing action |
| Footer | Navigation, contact, policies |

Add product detail, comparison/pricing, booking, gallery and private account Cards when their complete journeys exist.

Start with three original design directions and reviewed compositions. A composition includes hierarchy, rhythm, density, imagery and CTA placement. Semantic tokens cover text, surfaces, actions, borders, focus and states. Heuristics may suggest token roles for review; they cannot silently set brand meaning.

Normalize `DESIGN.md` into typed design data. Optionally import DTCG tokens. [DTCG](https://www.designtokens.org/tr/2025.10/format/)

Quality gates:

- source-backed claims and real copy;
- mobile hierarchy and primary journey;
- responsive images and reserved dimensions;
- contrast, keyboard, screen reader, zoom and reduced motion;
- Tamil, RTL and long translations;
- empty/large collections and broken assets;
- browser visual review per supported Card/style pair.

Unknown Cards, invalid primary bindings and inaccessible primary forms block release. Optional gaps may warn and use an approved fallback.

## 7. Generation pipeline

```text
goal/capabilities -> bounded facts/design -> structured draft
 -> validate schema/facts/actions/design -> one bounded repair
 -> assets -> compile/browser checks -> preview + gaps + readiness
```

Use the cheapest evaluated model that passes fixtures. Pin model/instructions. Bound pages, tokens, attempts, duration, media and spend. Rebuild only changed Cards and dependents.

Bound critical facts. Material generated claims—awards, guarantees, testimonials—need an approved source or owner confirmation with provenance.

Owner prompts produce typed operations; `site.update` applies valid operations with a checked base. Repeat, undo and publish can reuse saved operations without another interpretation call.

```text
prepare = authorized reads + media/font processing
compile = frozen definition + design + facts + assets -> bytes
store   = upload immutable objects -> verify -> commit references
```

Only compile is pure. Identical frozen input/tooling must produce identical bytes. Emit semantic HTML, CSS, needed scripts, canonical links, sitemap, robots controls, valid structured data, social previews, 404 and redirects.

## 8. Fact freshness

| Mode | Examples | Rule |
|---|---|---|
| Published | Story/campaign copy | Frozen until publication |
| Refreshable public | Catalog/public people/hours | Allowlisted projection + TTL/invalidation |
| Transactional/private | Quote/stock/capacity/orders | Current authorized read + commit revalidation |

Public projections expose approved fields only. Booking availability cannot reveal reservations. A team Card cannot query private contacts.

```text
record/query change -> affected page/dataset/answer -> coalesced refresh
scheduled reconcile --------------------------------^ catches missed signals
```

Include collection dependencies so new products invalidate catalogs. Begin with coarse per-site data generation; refine only if rebuild volume demands it. Fact refresh needs no model or redesign.

Use static shells with small live regions. Cached facts expose age when material. Checkout obtains a current quote; expired availability is not confirmed. Proposed objectives: display price changes within 60 seconds and noncritical public copy within five minutes. Transactions always check canonical state.

## 9. Context and personalization

A persona is temporary useful context, not guessed identity.

| Signal | Use |
|---|---|
| Explicit intent/language | Strong immediate selection |
| Navigation/search | Bounded session intent |
| Local time | Hours/default with correction |
| Authenticated account | Authorized preferences/orders only |
| Prior behavior | Optional short-lived suggestion with reset/delete |

Do not infer sensitive traits or identity from dwell, IP or writing style. Explicit choices win. Presentation context never grants access, discounts or permissions.

Known signals use deterministic rules. Start with a base, up to six reusable variants and one experiment. Live session generation is separately bounded; do not prebuild every persona/locale/device combination.

Preserve focus, input and cart state. Preview simulates intent/language, stale data, no consent, test customer, slow device and agent client without live effects. Aggregate routine analytics; batch learning may propose variants but cannot silently publish.

## 10. Real-time content, sections and design

| Level | Changes | Persistence |
|---|---|---|
| Immediate | Language, filter, known variant, current data | Session; usually no model |
| Live composition | Copy, Cards, layout, comparison/form, approved appearance | Temporary session result |
| Persistent redesign | Pages, navigation, composition, design, journeys | Owner draft -> release |

“Plan vegetarian catering for 30 under ₹10,000” may generate a comparison, controls, sourced estimate and form. The exact layout need not exist. Prices and capacity still come from current queries.

AI may select allowed tokens, layouts, responsive rules and motion for an enabled surface. Styles stay scoped. It cannot alter global navigation, permissions or business rules in a visitor session.

```text
prompt/trigger -> authorize surface + sources + budget
 -> ordered patches -> decode in staging
 -> validate subtree/bindings/actions/design
 -> stream valid UI -> final validation + optional bounded save
```

Use streamed HTTP; WebSockets are unnecessary for normal generation. [Workers streams](https://developers.cloudflare.com/workers/runtime-apis/streams/)

Stream rules:

- bind request, base, catalog version and sequence;
- correctly decode split UTF-8 and incomplete patches;
- bound depth, nodes, patches, bytes, rate and duration;
- reject unsafe URLs, props, paths and stale updates;
- expose only validated renderable subtrees;
- keep form/cart state separate using stable IDs;
- rendering a Button never executes its Action;
- a new prompt supersedes old generation; ignore late output;
- Stop cancels where possible; accepted effects reconcile separately;
- failure preserves the last valid UI and ordinary fallback.

New executable components use: isolated generation -> test/review -> versioned trusted pack -> deploy. Live visitors only receive compositions of installed Cards.

```text
public cache = workspace + site + release + data generation
             + locale + variant + canonical input
             + surface/catalog + model/instruction + expiry
private view = authenticated request; never shared cache
```

Revalidate transactions even when UI is cached. KV may cache public output but is not a lock, counter or replay ledger because it is eventually consistent. [KV](https://developers.cloudflare.com/kv/concepts/how-kv-works/)

Bound anonymous prompt size, rate, concurrency, allowance, output and retention. Budget exhaustion leaves published pages and deterministic journeys usable.

## 11. Access, publishing and recovery

Public handlers use narrow grants and enforce schema, size, allowlists, rate limits and session/origin checks. Never embed service credentials. Imported pages and prompts are untrusted data.

Customer authentication is not TAR membership. Private reads require verified ownership, avoid shared caches and use identity-scoped browser storage.

```text
1 compile frozen input
2 upload/verify immutable R2 artifacts
3 workspace transaction: release + operation + delivery intent
4 delivery rechecks authority/host; conditionally swaps D1 generation
5 reconcile observed release/receipt
6 invalidate caches; report status
```

Turso, D1 and R2 share no transaction. Revision-qualified assets and one resolved release per request ensure complete old/new output. Cached/in-flight requests may see old output for a bounded period. [R2](https://developers.cloudflare.com/r2/reference/consistency/)

| Failure | Result |
|---|---|
| Upload succeeds, DB commit fails | Old site live; reconcile before cleanup |
| Intent commits, D1 fails | Retry; old pointer remains |
| D1 succeeds, receipt lost | Read generation and reconcile |
| Old publish retries | Generation check rejects it |
| Draft changes during build | Frozen build identified; new draft retained |
| DNS/TLS pending | Platform preview works; delivery pending |
| Action retires | Content remains; interaction disables/migrates |
| Model/build fails | Preserve live release, draft, progress |

Rollback uses the same protocol. Current facts/permissions remain current. Preview uses authenticated or short-lived access with `no-store`/`noindex`; preview effects simulate by default. Retention/garbage collection uses grace periods and reference checks.

## 12. Agent protocols

TAR contracts remain canonical; protocols are adapters.

| Protocol | TAR use |
|---|---|
| Semantic HTML/data | Main discovery; Google requires no special AI file. [Google](https://developers.google.com/search/docs/appearance/ai-features) |
| WebMCP | Progressive browser tools after adoption/testing; forms remain. [WebMCP](https://developer.chrome.com/docs/ai/webmcp) |
| MCP | Remote public/authenticated query and Action adapter |
| MCP Apps | Optional interactive catalog/booking/quote in capable hosts. [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview) |
| A2UI | Optional supported-subset mapping to Cards. [A2UI](https://a2ui.org/) |
| A2A | External agent delegation mapped to Runs. [A2A](https://a2a-protocol.org/latest/) |
| NLWeb | Conversational structured-data reference; no server initially. [NLWeb](https://github.com/microsoft/NLWeb) |
| UCP | Commerce adapter when a real channel needs it. [UCP](https://ucp.dev/) |

Expose only installed public capabilities. Discovery never authorizes execution. Do not claim universal agent compatibility. Keep transient generated pages unindexed unless an owner promotes sourced content.

## 13. Actions

| Action | Role |
|---|---|
| `site.generate` | Create bounded draft from prompt |
| `site.edit` | Interpret prompt into typed operations |
| `site.update` | Apply validated operations; no second inference charge |
| `site.compile` | Frozen input -> verified release candidate |
| `site.preview`, `site.get` | Authorized preview/history |
| `site.publish`, `site.rollback` | Durable route change with expected generation |
| `site.refresh` | Refresh approved public facts without inference |
| `site.ask` | Answer or compose permitted live surface |

Business journeys call installed Actions such as target `order.place`, lead capture, booking or support. Preserve current POS IDs through adapters. A public control cannot invoke privileged legacy checkout directly.

Site Bot reuses conversation, Run and task records. Handoff creates the existing task. Removing the Bot disables its routing/triggers while retaining accepted work/history.

## 14. Cost, performance and global access

`pricingplan.md` currently defines site credit prices. Prompt interpretation is AI execution; applying valid operations is not a second AI call. This plan recommends including bounded factual refresh in hosting and defining an owner-funded allowance for public live generation; it does not change prices.

```text
cost = inference + repair + build/media
     + storage/operations + Worker CPU/requests
     + DB work + refresh + analytics + providers
```

R2 has free egress but charges storage/operations. [R2 pricing](https://developers.cloudflare.com/r2/pricing/)

| Measure | Initial target/rule |
|---|---|
| Web Vitals | Field p75: LCP <=2.5s, INP <=200ms, CLS <=0.1. [Web Vitals](https://web.dev/articles/vitals) |
| Basic page | Proposed <=100 KB compressed HTML/CSS/JS excluding media/fonts; core JS <=20 KB |
| Live UI | Proposed extra <=150 KB compressed; measure Svelte + renderer + Cards; no assumed size advantage without testing |
| Base rendering | Zero model calls |
| Reliability | No partial release or duplicate accepted order in tests |
| Value | Completion, abandonment, corrections, satisfaction, cost/completion |

| Global need | Rule |
|---|---|
| Slow/low-memory device | HTML first; deferred runtime; persistent lightweight mode |
| Language/literacy | Plain prompts, examples, optional voice + text fallback |
| International content | Unicode, script fonts, RTL, native-script search, reviewed claims |
| Locale | Language, location, timezone and currency stay separate |
| Accessibility | Stable focus, restrained announcements, reduced motion |
| Uneven AI quality | Evaluate language/task; deterministic fallback where insufficient |
| Multi-tenancy | One platform; no repo/build server/agent per site |
| Spend isolation | Durable workspace admission/budget, not isolate-local counter |
| Data latency | Cache public projections; current private work hits authority |

Do not call a model for every visitor/page. Edge deployment alone does not guarantee residency or global write locality.

## 15. Build and proof

| Stage | Deliver | Exit gate |
|---|---|---|
| 0 Prototype | Schema/adapters/projection/release; Effect + Svelte + json-render spike; shared surface loader | Same Cards static/live; SSR/mount or hydration, Worker stream, cancellation, UTF-8, schemas, state preservation and actual bundle pass |
| 1 Working site | Site Bot, 12 Cards, 3 designs, prompt edit, preview/publish/rollback, enquiry | Owner publishes by prompt; enquiry reaches Inbox; failure preserves live site |
| 2 Business | Complete order/booking, fact refresh, custom domain | Correct state under concurrency/retries/provider uncertainty |
| 3 Adaptive/live | Intent/language, variants, live sections/design, Ask, handoff, light mode | Novel UI valid; interruption/failure/access tests pass |
| 4 Distribution | One demanded protocol adapter | External client completes same journey without extra authority |
| 5 Expansion | Locales/designs, portals, experiments, proven capabilities | Measured global quality, value and cost |

If json-render fails Stage 0, keep TAR's schema/static path and replace only that adapter.

Acceptance:

| Test | Required result |
|---|---|
| Empty facts / unsupported claim | Useful draft; no invention; request source/confirmation |
| Malformed AI/Card | Bounded repair; invalid UI/release never activates |
| Prompt edit/publish/undo | Correct site/base and truthful outcome; no editor |
| Identical compile | Identical manifest/bytes |
| Tamil/RTL/mobile/keyboard/zoom | Accessible primary journey |
| Split UTF-8/incomplete patch | Correct decode; last valid UI retained |
| Stop/new prompt/late stream | Obsolete updates ignored; effects reconciled |
| Layout changes during form/cart | Input, state and focus preserved |
| Generated action control | Rendering has no effect; Gateway required |
| Slow network/runtime failure | HTML and server forms work |
| Product change/withdrawal | Invalidates display; transaction uses current truth |
| Last stock/slot concurrency | At most allowed capacity accepted |
| Duplicate/retry | One business effect and saved result |
| Provider + Effect + runner failure | One coordinated bounded retry policy |
| Anonymous/A/B/logout | No private data/cache crosses identity |
| Concurrent/failed publication | Complete old/new; old retry cannot overwrite new |
| Domain reassignment/restore | Correct ownership and coherent recovery |

Use automated schema/contract/transaction tests plus browser visual/accessibility review. Measure completed outcomes and corrections, not only valid JSON.

## 16. Current migration

| Area | Problem | Migration |
|---|---|---|
| `site-schema.ts` | Broad `any`/casts | Strict versioned schema + translator |
| `use-site.ts` reads | Cross-workspace fallback | Remove; explicit empty state |
| `use-site.ts` publish | Local success before remote confirmation | Durable pending/confirmed state |
| `use-site.ts` draft/errors | Direct endpoint; errors swallowed | Gateway operation with stable key/result |
| `design-parser.ts` | Partial regex parsing | Validated design package |
| Harness schema | Legacy naming/checks | Versioned migrations/adapters |
| Gateway | No site handlers | Shared Action/delivery path |
| POS IDs | Differ from target examples | Preserve clients; safe adapters |

The client references `tarai.space`, but its server source was not found here; server behavior remains unverified.

```text
inventory -> translate with provenance -> compare previews
 -> test cutover -> verify delivery/data/access
 -> migrate with rollback -> retire legacy writes after coverage
```

## 17. TAR v3 insertion

Add after marketplace/access:

> **Site Bot.** A workspace installs Site Bot to create and operate a public site through the TAR assistant. Owners describe changes by prompt, receive previews and publish through existing Actions. AI proposes typed compositions over reviewed Cards. Effect structures backend execution; Svelte server rendering produces HTML, while a replaceable json-render/Svelte adapter streams enabled live interfaces. Hybrid delivery keeps the base static and loads interactive regions only as needed. Scoped projections and checked Actions keep facts current. Publication uses immutable R2 artifacts, a durable intent and conditional D1 routing. Forms, conversations, external-agent adapters and handoffs reuse TAR Records, Flows, Gateway and Inbox. No visual builder, second business database or second Run scheduler is introduced.

Also add `site` to §2.1 system types and add publication interruption, public-data freshness, streamed-UI safety and customer-cache isolation to §9 checks.

First proof: an owner creates, changes and publishes a restaurant site by prompt; a visitor changes language/intent, requests a generated catering comparison, and completes an enquiry/order in the existing workflow. It also works in lightweight mode and survives interrupted generation.
