# TAR Agentic Sites — Design

> A Site Bot turns a business into a live site: a DESIGN.md contract, a reviewed component catalog, and a declarative spec that compiles to a fast static base with agentic live regions.

Read with [tarv4.md](tarv4.md) (core architecture) and [techstack.md](techstack.md) (cost envelope). This is the target design; it replaces all earlier site plans. Every "site" capability below is a normal TAR Record/Action/Flow inside the Site Bot — no second engine, no separate database, no visual builder.

============================================================
# PART A — THE DECISION
============================================================

## 1. WHY SITE BOT, NOT SITE AGENT

TAR v4 defines exactly two relevant primitives: a **Bot is a package** (records + Actions + Flows + Space cards + Inbox work + roles) and an **agent is a Harness step mode** (`code | model | agent | human`).

| Question | Answer |
|---|---|
| What does a business install? | A **Site Bot** |
| What does the agentic work? | The **Harness** running model/agent steps |
| What is "agentic" about the result? | The harness mode, and the published site's agent-readable/operable surfaces |

A standalone "Site Agent" would be a continuously running process, which breaks design rule 5 (*Bots are packages, not processes*). So:

~~~text
Site Bot      = the installable capability (builder + operator)
Harness steps = how the site is generated, edited and adapted
Agentic site  = the published artifact (live regions + agent surfaces)
~~~

Framer and Webflow market their helpers as "Agents", but architecturally they are catalog-constrained generators inside the platform — exactly a Bot package plus harness steps. A Site Bot builds an agentic site.

## 2. TWO INDEPENDENT AXES

Site output is decided by two orthogonal choices. Keeping them separate removes most confusion.

~~~text
TRANSPORT (where the UI appears)        GENERATION (what the model emits)
  AG-UI      own app and web              Static       select a prebuilt component
  MCP-Apps   other hosts (ChatGPT, ...)   Declarative  compose a spec from the catalog   <- default
                                          Open-ended   raw HTML, sandboxed, escape hatch
~~~

There is no "AG-UI vs MCP-Apps" choice: the same Site Spec can reach both. There is no single generation style: the spectrum is per-component, not per-site.

| Layer | Transport | Generation |
|---|---|---|
| Published base | none (compiled) | Static — components baked to HTML/CSS |
| Live region | AG-UI (own), MCP-Apps (hosts) | Declarative — A2UI from the catalog |
| One-off subview | inside a declarative surface | Open-ended — sandboxed `GeneratedView` |

**Why declarative is the default.** It keeps the design system, the security model and the token cost. The model chooses layout; the catalog guarantees style. Open-ended output (5–10× tokens, no design tokens, run-to-run variance) is confined to a single sandboxed subtree.

**Token cost is a first-class constraint** (see [techstack.md](techstack.md)). We compile the base once and stream only live regions, so declarative verbosity never sits on the per-visitor path.

## 3. THE DESIGN.md CONTRACT

Every site owns one **DESIGN.md** in the open Google Labs format: YAML frontmatter holds normative design tokens; the markdown body gives rationale and rules. Humans and agents read the same file.

~~~text
DESIGN.md
  ---
  version, name, description
  colors / typography / rounded / spacing / components    (tokens, {path.to.token} refs)
  ---
  Overview · Colors · Typography · Layout · Elevation · Shapes · Components · Do's and Don'ts
~~~

| Rule | Detail |
|---|---|
| One source | DESIGN.md is the site's only design authority; prose explains, tokens decide |
| Rendered | tokens compile to CSS variables, a Tailwind v4 `@theme`, and A2UI catalog constraints |
| Stored | a TAR Record, mirrored as an OKF file at `workspaces/{scope}/site/design.md` |
| Versioned | a release pins the design revision; rolling back presentation never rolls back business facts |
| Seeded | `site.init` drafts DESIGN.md from brand inputs and design references |
| Editable | design changes are validated ops, not freeform rewrites; contrast and token rules are checked |

The existing `designmds/*.md` references are near-DESIGN.md already and seed a site's first draft.

## 4. THE COMPONENT CATALOG

The catalog is the quality engine. It is what makes output look designed instead of generated.

~~~yaml
component:
  name: hero
  category: Hero
  props:     [eyebrow, headline, body, media, align, tone]
  variants:  [split, centered, media-led, compact]
  slots:     [eyebrow, headline, body, media, actions]
  tokens:    headline -> {typography.display}, surface -> {colors.neutral}
  responsive: {mobile: stack, desktop: 2col}
  a11y:      {headingLevel: 1, contrast: AA, focusOrder: [cta]}
  actions:   [cta -> registered Action or Flow]
~~~

| Rule | Detail |
|---|---|
| Typed | every prop has a type, default and token binding |
| Token-only | values reference design tokens; literals fail validation |
| Variants + slots | the model selects a variant and fills slots — it does not invent layout |
| Two tiers | reviewed **core catalog** + **site components** added by a reviewed pack |
| No inline code | components bind to registered queries/Actions/Flows, never arbitrary SQL or JS |
| Escape hatch | `generated-view` is the only component that carries sandboxed HTML, and may be omitted |

This is how Framer/Webflow agents "extend the existing design system instead of generating isolated sections". The catalog is the design system made executable.

## 5. THE SITE SPEC

The canonical model the harness reads and writes. JSON Schemas live in `sites/spec/`.

~~~text
site    = { design, pages[], journeys[], variants[], surfaces[], policy }
page    = { id, path, title, meta, sections[] }
section = { id, component, variant, props, bindings[], actions[], slots }
binding = { slot, query, params, access, freshness, empty }
journey = { id, target, input, outcome }
variant = { when, priority, patch }
surface = { catalog, scope, budget, fallback }
~~~

| Rule | Detail |
|---|---|
| Bindings are typed refs | a slot binds to a registered query; access and freshness are declared |
| Journeys are outcomes | enquiry captured, order accepted, booking confirmed or Inbox handoff — not "done" |
| Variants are deterministic | intent/locale/time select a variant without a model call |
| Surfaces are bounded | a live surface limits catalog, facts, Actions and budget available to generation |
| Policy is explicit | publish authority, approval, allowed claims, retention |

## 6. BUILD PIPELINE — PROMPT, GENERATE, VALIDATE, REPAIR

~~~text
brief + brand
  -> site.init      DESIGN.md draft -> review
  -> facts          permitted Records + OKF
  -> compose        model writes Site Spec from the catalog (prompt-first)
  -> validate       schema · token-only · a11y · contrast · links · assets · responsive
  -> repair         bounded self-correction loop (A2UI-style)
  -> compile        frozen input -> static HTML/CSS + islands
  -> preview        authenticated, no-store, noindex
  -> publish        immutable release -> R2, conditional D1 route swap
  -> refresh        facts recomputed with no model call
~~~

| Stage | Rule |
|---|---|
| Deterministic compile | identical frozen input + tooling produce identical bytes |
| Prompt-first | catalog + DESIGN.md + rules live in the system prompt; the model generates freely, validators catch errors, it self-corrects |
| Bounded repair | a small, fixed number of repair attempts; unresolvable issues block release and surface as Inbox work |
| One inference | `site.edit` interprets a prompt; `site.update` applies saved ops at no second AI charge |
| Fact freshness | published copy frozen; refreshable public facts allowed by TTL; transactional facts read live and revalidate on commit |

## 7. DELIVERY TIERS

| Tier | What | Cost profile |
|---|---|---|
| Static base | compiled HTML/CSS + minimal JS; zero model calls per render | CDN-only |
| Live region | A2UI streamed over AG-UI/MCP, catalog-constrained | bounded, cached |
| Escape hatch | sandboxed `GeneratedView` iframe for one-off output | rare, per-use |

~~~text
published cards -> static render -> HTML + CSS
live surface    -> lazy Svelte/A2UI  -> streamed region
one-off         -> GeneratedView     -> sandboxed iframe
~~~

Live caching key: `{ release, intent, locale, canonical input, catalog revision, model/instruction revision }`. The base page stays useful through model, stream or budget failure.

## 8. AGENTIC SURFACES

The published site is both readable and operable by agents.

| Surface | Purpose |
|---|---|
| `llms.txt` / `llms-full.txt` | agent-facing map of approved public content |
| OKF bundle | structured, progressive-disclosure knowledge (see `docs/okf.md`) |
| JSON-LD + semantic HTML | discovery and rich results; no special AI file required |
| sitemap + robots + Content Signals | crawler and AI-use policy |
| **MCP server** | public queries and allowlisted Actions for host agents |
| **A2A agent card** | declares the site's public capabilities to other agents |
| **WebMCP** | in-browser tools via `navigator.modelContext` (progressive) |

Rules: discovery never authorizes execution; public Actions compose installed components and expose approved fields only; every effect still goes through the Gateway; actionable controls never fire on render.

## 9. THE SITE BOT PACKAGE

| Part | Content |
|---|---|
| **Records** | `site` (draft root), `release` (immutable); reuse `asset`, `conversation`, `task` |
| **Actions** | `site.init`, `site.generate`, `site.edit`, `site.update`, `site.compile`, `site.preview`, `site.publish`, `site.rollback`, `site.refresh`, `site.ask` |
| **Flows** | `site.build`, `site.publish`, `site.refresh`, `site.ask` |
| **Space cards** | Site (open), Pages, Preview/Publish status, Agent-readiness, Analytics |
| **Inbox** | approve publish, review generated claims, fix broken asset or missing fact, respond to enquiry handoff |
| **Roles** | owner/admin (edit, publish), member (draft), customer (journeys only) |

The site never introduces a second business database: forms, chat and agent tools call the same Records, Actions, Flows, Gateway and Inbox as the rest of TAR. Removing the Bot disables its routing and triggers while preserving accepted work and history.

## 10. QUALITY GATES — NO SLOP

| Gate | Requirement |
|---|---|
| Design | DESIGN.md constraints satisfied; token-only values; one accent, consistent shapes |
| Composition | catalog-only; correct variants; real hierarchy, rhythm and density |
| Content | sourced or owner-confirmed; awards, guarantees and testimonials need provenance |
| Access | WCAG AA contrast; keyboard/focus; reduced motion; zoom |
| Responsive | mobile hierarchy and primary journey; reserved image dimensions |
| Global | Tamil, RTL and long-translation review |
| Visual | browser review per component/style pair |
| Approval | human approval before publish; preview has no live effect |
| Release | immutable, atomic; complete old or complete new live |

============================================================
# PART B — INTEGRATION + ECONOMICS
============================================================

## 11. TAR INTEGRATION

~~~text
prompt -> site.edit -> typed ops -> site.update -> Site Spec (Record)
        -> site.compile -> release candidate -> preview
        -> site.publish -> immutable R2 artifacts + D1 route
visitor -> static base -> live region (A2UI) -> Gateway Action/Flow -> Inbox
~~~

- **Gateway** commits every release, route swap and accepted journey outcome.
- **Harness** runs build/edit/publish with bounds and checkpoints; publishes through the same Gateway policy as any Action.
- **R2** stores immutable releases and assets; **D1** maps host/subdomain → release generation; **Turso** holds `site` and `release` Records.
- Revocation, retries and provider uncertainty follow the Gateway and Delivery rules in [tarv4.md](tarv4.md) §4.

## 12. COST + PERFORMANCE

- Build once, serve static: model calls happen at build/edit, never per visitor.
- Live generation is bounded per surface and cached by the key in §7; budget exhaustion leaves the base page working.
- `site.refresh` and `site.update` apply saved work with **no second inference**.
- Targets: LCP ≤ 2.5s / INP ≤ 200ms / CLS ≤ 0.1 (p75); basic page ≲ 100 KB compressed excluding media/fonts; base rendering makes zero model calls.

## 13. PHASES + ACCEPTANCE

| Phase | Deliver | Exit gate |
|---|---|---|
| 1 Static | Site Bot, DESIGN.md, catalog, Site Spec, Astro compile, publish, agent-readable files | owner publishes a site by prompt; enquiry reaches Inbox; failure preserves the live site |
| 2 Live | A2UI regions, variants, `GeneratedView` | novel UI stays valid; interruption and access tests pass |
| 3 Operate | MCP/A2A/WebMCP, conversational commerce, `site.ask` | an external agent completes the same journey with no extra authority |
| 4 Expand | locales, experiments, portals | measured global quality, value and cost |

| Acceptance | Must hold |
|---|---|
| Identical compile | identical manifest and bytes |
| Malformed or off-catalog spec | bounded repair; invalid UI never activates |
| Tamil / RTL / mobile / keyboard | accessible primary journey |
| Product change or withdrawal | display invalidates; transaction reads current truth |
| Last stock or slot | at most allowed capacity accepted |
| Duplicate or retry | one business effect and saved result |
| Concurrent or failed publish | complete old or new; old retry cannot overwrite new |
| Anonymous / A-B / logout | no private data or cache crosses identity |

============================================================
# DESIGN REFERENCES
============================================================

| Topic | Sources |
|---|---|
| Design contract | [DESIGN.md spec](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md), [designmd.app](https://designmd.app/) |
| Generative UI | [State of Generative UI 2026](https://www.openui.com/blog/state-of-generative-ui-report), [Generative UI research](https://generativeui.github.io/) |
| Declarative format | [A2UI v0.9](https://a2ui.org/specification/v0.9-a2ui/), [catalogs](https://a2ui.org/concepts/catalogs/), [A2UI v0.9 announcement](https://developers.googleblog.com/en/a2ui-v0-9-generative-ui/) |
| Transport | [A2UI + MCP Apps](https://developers.googleblog.com/en/a2ui-and-mcp-apps/), [AG-UI](https://docs.ag-ui.com/) |
| Agent-readable | [llms.txt + MCP](https://luismori.dev/article/agent-ready-website-infrastructure-llms-txt-mcp/), [agent-ready architecture](https://www.openhermit.com/blog/agent-ready-website-architecture-2026) |
| Platform precedent | [Framer Agents](https://www.framer.com/blog/framer-3/), [Webflow MCP vs Framer Agents](https://www.stefanodesigner.com/en/post/framer-3-0-agents-vs-webflow) |
| In-repo | [tarv4.md](tarv4.md), [techstack.md](techstack.md), [docs/okf.md](docs/okf.md), `designmds/` |

> **A Site Bot is a package. The Harness is the intelligence. DESIGN.md is the taste. The catalog is the quality. The Gateway commits.**
