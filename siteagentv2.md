# siteagent v2 — The Style Compiler
**End-to-End Architecture & Execution Plan for a Webflow/Framer-Grade Site Generation Worker**

---

## 0. Why v2

v1 (`siteagent.md`) proved the core bet: **pre-bake a site to static HTML/CSS in KV and serve it in <2ms with zero compute on the visitor path.** That part is correct and stays.

v1's ceiling is also clear:

| v1 limitation | v2 answer |
|---|---|
| 14 fixed archetypes + a "custom slot" escape hatch | **6 composable primitives** that generate infinite layouts |
| Parses markdown tables + CSS blocks + YAML (3 fragile layers) | **Compile design.md once → a `.style` package**, never parse markdown at runtime |
| LLM is a "planner" doing regex HTML mutation | **LLM is the architect** (layout AST) + **deterministic renderer** (HTML/CSS) |
| No brand-fidelity guarantee | **Rule checker + fidelity scorer** that grades output against the design.md |
| No motion, no micro-interactions | **Motion system** (scroll, reveal, hover) — the thing that makes Framer feel like Framer |
| Publish-once, no editing loop | **Conversational editing via JSON Patch** + live draft preview |

The goal of v2: given any `designmds/*.md` and a merchant's `site.md`, produce a site that is **indistinguishable from a hand-built Webflow/Framer project** — precise typography, deliberate spacing, motion, and brand fidelity — while still shipping as a static, instant, edge-served artifact.

---

## 1. Core Architectural Invariants

| # | Invariant | Rule | Payoff |
|---|---|---|---|
| 1 | **Zero compute on GET** | `GET /*` = single `KV.get()` → stream. No parsing, no AST, no LLM, no JS framework on the read path. | <2ms TTFB worldwide |
| 2 | **Design.md compiles once, not per-publish** | `design.md → .style package` (CSS + tokens + rules + fewshots). The generator never touches markdown. | Deterministic tokens, no parsing fragility |
| 3 | **LLM outputs JSON AST, never HTML/CSS** | The LLM is an *architect* producing a validated `LayoutAST`. A pure-function renderer turns AST → HTML/CSS. | LLM can be creative; renderer guarantees correctness |
| 4 | **Brand fidelity is enforced, not hoped for** | A rule checker + fidelity scorer reject output that violates the design.md's do's/don'ts. | Output actually looks like the brand |
| 5 | **Motion is a first-class token, not an afterthought** | Every design.md gets a `motion` profile (easing, duration, stagger, scroll behavior). | The Framer "feel" |
| 6 | **Surgical edits, never regeneration** | Edits are JSON Patch (RFC 6902) applied to the AST, then re-rendered. | Fast, auditable, no drift |

---

## 2. The Pipeline (End-to-End)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            COMPILE PATH (write, async)                        │
│                                                                              │
│  designmds/cos.md                    workspaces/<brand>/site.md               │
│       │                                      │                               │
│       ▼                                      ▼                               │
│  ┌────────────────────┐            ┌──────────────────────┐                  │
│  │ DESIGN COMPILER    │            │ CONTENT PARSER        │                  │
│  │ md → .style pkg    │            │ yaml → ContentAST     │                  │
│  └─────────┬──────────┘            └──────────┬───────────┘                  │
│            │                                   │                              │
│            │   .style package                  │  ContentAST                  │
│            │   (tokens, rules,                 │  (sections, copy, media)     │
│            │    components, fewshots)          │                              │
│            └───────────────┬───────────────────┘                              │
│                            ▼                                                  │
│                 ┌──────────────────────┐                                      │
│                 │  ARCHITECT (LLM)     │  ← ONE structured call              │
│                 │  ContentAST + style  │    system prompt = tokens + rules    │
│                 │  → LayoutAST (JSON)  │    + fewshots + component lib        │
│                 └──────────┬───────────┘                                      │
│                            ▼                                                  │
│                 ┌──────────────────────┐                                      │
│                 │  RULE CHECKER        │  ← deterministic, Zod-validated      │
│                 │  + FIDELITY SCORER   │    rejects token/rule violations     │
│                 └──────────┬───────────┘                                      │
│                            │ pass (or retry ≤2)                               │
│                            ▼                                                  │
│                 ┌──────────────────────┐                                      │
│                 │  RENDERER            │  ← pure functions, zero LLM          │
│                 │  AST → HTML + CSS    │    scoped CSS from tokens only       │
│                 │  + motion + <4KB JS  │                                      │
│                 └──────────┬───────────┘                                      │
│                            ▼                                                  │
│                 ┌──────────────────────┐                                      │
│                 │  PUBLISH             │  KV: site:<sub>:<path>               │
│                 │  + R2 assets         │  R2: /assets/* (images, fonts)      │
│                 └──────────────────────┘                                      │
└──────────────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            VISITOR PATH (read, sync)                         │
│  GET https://brand.tarai.space/* → KV.get() → stream HTML (<2ms)             │
│  CSS is inlined/cached; fonts self-hosted .woff2 with font-display:swap      │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Layout (v2 worker)

```
siteagentv2/
├── package.json
├── tsconfig.json
├── wrangler.jsonc
├── src/
│   ├── index.ts                    # Worker fetch entrypoint (KV stream on GET)
│   ├── app.ts                      # Hono router (/publish /draft /edit /api/*)
│   ├── types.ts                    # Zod schemas: StylePackage, ContentAST, LayoutAST
│   │
│   ├── design-compiler/            # design.md → .style package (runs once per design)
│   │   ├── token-extractor.ts      # :root {} + @theme {} → DesignTokens
│   │   ├── component-extractor.ts  # "## Components" → ComponentSpec[]
│   │   ├── rules-extractor.ts      # "Do's and Don'ts" → Rule[]
│   │   ├── fewshot-extractor.ts    # "Agent Prompt Guide" → FewShot[]
│   │   ├── motion-extractor.ts     # motion hints → MotionProfile
│   │   └── compile.ts              # orchestrates → writes .style package
│   │
│   ├── content-parser/             # site.md → ContentAST
│   │   ├── sitemd-parser.ts        # strict YAML frontmatter + section blocks
│   │   └── media-resolver.ts       # image paths → R2 asset keys
│   │
│   ├── architect/                  # LLM: ContentAST + style → LayoutAST
│   │   ├── prompt-builder.ts       # system prompt from .style package
│   │   ├── llm-client.ts           # Groq/OpenAI structured-output call
│   │   └── layout-schema.ts        # Zod schema the LLM must satisfy
│   │
│   ├── guardrails/                 # brand fidelity enforcement
│   │   ├── rule-checker.ts         # AST → pass/fail + violations
│   │   ├── fidelity-scorer.ts      # 0..1 grade vs design.md intent
│   │   └── retry-loop.ts           # feed violations back to LLM (≤2 retries)
│   │
│   ├── primitives/                 # 6 composable layout primitives (pure fns)
│   │   ├── stack.ts                # vertical rhythm container
│   │   ├── split.ts                # N-column (50/50, 60/40, 33/66…)
│   │   ├── grid.ts                 # N-col grid w/ gap + responsive
│   │   ├── bleed.ts                # full-viewport section
│   │   ├── carousel.ts             # horizontal scroll / marquee
│   │   └── overlay.ts              # text/media layering
│   │
│   ├── renderer/                   # AST → HTML/CSS (deterministic)
│   │   ├── html-renderer.ts        # walk LayoutAST → semantic HTML
│   │   ├── css-generator.ts        # scoped CSS from tokens only
│   │   ├── motion-generator.ts     # scroll/reveal/hover from MotionProfile
│   │   ├── typography.ts           # fluid clamp() scale + optical sizing
│   │   └── client-scripts.ts       # <4KB vanilla JS (drawer, cart, accordion)
│   │
│   ├── editor/                     # conversational editing
│   │   ├── patch-generator.ts      # edit instruction → JSON Patch (RFC 6902)
│   │   └── ast-patcher.ts          # apply patch to LayoutAST
│   │
│   ├── storage/
│   │   ├── kv.ts                   # STOREFRONT_CACHE manager
│   │   ├── r2.ts                   # SITES_BUCKET / THEMES_BUCKET
│   │   └── turso.ts                # orders, messages, bookings
│   │
│   └── test-render.ts              # local validation harness
```

---

## 4. The `.style` Package (compiled from design.md)

The design compiler turns a markdown file into a typed, machine-checkable package. This is the single most important change from v1.

```ts
interface StylePackage {
  id: string;                    // 'cos'
  name: string;                  // 'COS — Style Reference'
  theme: 'light' | 'dark' | 'mixed';

  tokens: DesignTokens;          // colors, fonts, typeScale, spacing, radii
  motion: MotionProfile;         // easing, durations, stagger, scroll
  components: ComponentSpec[];   // named specs: hero, nav, productCard, footer…
  rules: Rule[];                 // hard constraints from Do's and Don'ts
  fewshots: FewShot[];           // example component prompts (verbatim)
  promptGuide: string;           // full "Agent Prompt Guide" text
  imagery: ImageryDirective;     // bleed, crop, overlay, treatment rules
  layout: LayoutDirective;       // page model, section rhythm, density
}

interface MotionProfile {
  easing: string;                // 'cubic-bezier(0.22,1,0.36,1)' etc.
  duration: number;              // base ms
  stagger: number;               // ms between siblings
  reveal: 'fade' | 'slide-up' | 'clip' | 'none';
  scroll: 'parallax' | 'sticky' | 'none';
  hover: 'lift' | 'scale' | 'underline' | 'none';
}
```

**Why this matters:** every downstream stage (architect, guardrails, renderer) consumes the *package*, never the markdown. A design.md edit recompiles the package once; all sites using that style pick up the change deterministically.

---

## 5. Content AST (from site.md)

Strict YAML, unchanged in spirit from v1 but with a cleaner section model:

```yaml
---
brand: "Hungry Tiger"
tagline: "Fire-Roasted Condiments & Spices"
style: "eathungrytiger.md"
subdomain: "hungrytiger"
currency: "USD"
cart_mode: "drawer"
nav: [...]
header_cta: {...}
---

# 1. Hero
kind: "hero"
headline: "TURMERIC FIRE & CHARRED CLOVE"
lead: "..."
cta_primary: {...}
image: "/assets/bottles-hero.png"

# 2. Products
kind: "products"
items: [...]
```

The `kind` field is a *hint*, not a hard archetype. The architect may choose a different primitive composition if it better fits the design — but `kind` anchors intent.

---

## 6. The Architect (LLM) — how the AI actually generates

This is the heart of v2. One structured call produces the whole layout.

### 6.1 System prompt construction

```
SYSTEM
You are a senior Webflow/Framer designer compiling a site from a design system.

DESIGN SYSTEM (authoritative — never deviate):
  Tokens:      [DesignTokens from .style package]
  Motion:      [MotionProfile]
  Rules:       [Rule[] — hard constraints]
  Components:  [ComponentSpec[] — the only building blocks]
  Imagery:     [ImageryDirective]
  Layout:      [LayoutDirective]

COMPONENT LIBRARY (compose from these primitives):
  [stack, split, grid, bleed, carousel, overlay — with props]

FEW-SHOT EXAMPLES (from the design.md's Agent Prompt Guide):
  [FewShot[] verbatim]

OUTPUT
Return a LayoutAST as JSON matching the provided schema.
Every color/font/spacing value MUST be a token reference, not a literal.
```

### 6.2 Layout AST (what the LLM returns)

```json
{
  "page": "/",
  "theme": "dark",
  "sections": [
    {
      "id": "hero",
      "primitive": "split",
      "props": { "ratio": "50/50", "height": "100vh", "gap": "var(--spacing-135)" },
      "children": [
        {
          "primitive": "bleed",
          "props": { "media": "/assets/bottles-hero.png", "fit": "cover" },
          "children": [
            { "primitive": "overlay",
              "props": { "position": "bottom-left" },
              "content": {
                "type": "text",
                "value": "TURMERIC FIRE",
                "token": "var(--text-heading)",
                "weight": "var(--font-weight-bold)"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "products",
      "primitive": "grid",
      "props": { "columns": 3, "gap": "var(--spacing-24)", "responsive": [2, 1] },
      "children": [ ]
    }
  ]
}
```

Key property: **every visual value is a token reference** (`var(--...)`), never a hardcoded hex or px. This is what makes the output *look like the brand* — the renderer resolves tokens, the LLM only composes.

### 6.3 Why AST + deterministic renderer beats "LLM writes HTML"

| LLM writes HTML/CSS | AST + renderer |
|---|---|
| Hallucinates colors/fonts | Values are token refs, validated by Zod |
| Inconsistent markup | Renderer emits semantic, consistent HTML |
| Breaks on long pages | AST is a tree; renderer is O(n) |
| Hard to edit | JSON Patch is trivial and auditable |
| Can't enforce rules | Rule checker runs on the AST before render |

---

## 7. Guardrails — brand fidelity, enforced

### 7.1 Rule checker (deterministic, post-LLM)

Rules are compiled from the design.md's "Do's and Don'ts" into checkable predicates:

```ts
type Rule =
  | { type: 'radius-equals'; value: '0px' }            // COS: 0px everywhere
  | { type: 'single-font-family' }                     // COS: SuisseIntl only
  | { type: 'accent-max-coverage'; pct: 2 }             // COS: red < 2% of pixels
  | { type: 'no-shadow' }                               // COS: flat by design
  | { type: 'spacing-section'; value: '135px' }         // COS: 135px section padding
  | { type: 'forbidden-color-role'; color: '--color-signal-red'; role: 'primary-cta' };
```

The checker walks the LayoutAST and reports violations with exact paths. On violation, the `retry-loop` feeds the violation list back to the LLM (≤2 retries) with the specific offending node.

### 7.2 Fidelity scorer (0..1)

A post-render grade measuring how well the output matches the design.md's *intent* (not just its rules):

- **Token compliance** — % of rendered values that are token refs (target 100%)
- **Rule compliance** — % of rules passed (target 100%)
- **Component fidelity** — does the hero match the design.md's hero spec (structure, type scale, spacing)?
- **Imagery treatment** — bleed/crop/overlay matches `ImageryDirective`
- **Motion profile** — easing/duration/stagger match `MotionProfile`

A score < 0.9 blocks publish and surfaces the gap in the dashboard.

---

## 8. The Renderer — deterministic, Webflow-grade

Pure functions, no LLM, no runtime framework.

### 8.1 Scoped CSS from tokens only

The renderer never invents a value. It resolves `var(--...)` refs from the `.style` package's `:root {}` block and emits a single minified stylesheet. No Tailwind runtime, no CSS-in-JS, no hydration.

### 8.2 Typography (the Framer differentiator)

- **Fluid `clamp()` scales** — headings scale smoothly across viewports instead of jumping at breakpoints.
- **Optical sizing** — larger sizes get tighter tracking, per the design.md's tracking ladder (e.g. COS: 0.01em @ 12px → 0.04em @ 35px).
- **Self-hosted fonts** — `.woff2` subsets with `font-display: swap`, zero render-blocking third-party hops.

### 8.3 Motion system

Generated from `MotionProfile`:
- **Scroll reveal** — sections fade/slide/clip in with the design's easing + stagger.
- **Parallax / sticky** — hero media and editorial bands.
- **Hover states** — lift/scale/underline per the design (or `none` for flat systems like COS).
- **Micro-interactions** — cart drawer, accordion height, smooth scroll.

All motion is CSS-first (transforms + opacity, GPU-accelerated) with a `<4KB` vanilla JS IntersectionObserver driver. No animation library.

### 8.4 Responsive

Primitives carry `responsive` breakpoints (columns, ratios, gaps). The renderer emits a mobile-first grid with 2–3 breakpoints derived from the design's density and layout directives.

---

## 9. The Editor — conversational, surgical

Replaces v1's regex "planner".

```
User: "Make the hero full-bleed and add a secondary CTA"
        │
        ▼
patch-generator (LLM, small call):
  input  = current LayoutAST + edit instruction + style package
  output = JSON Patch (RFC 6902)
        │
        ▼
[
  { "op": "replace", "path": "/sections/0/props/height", "value": "100vh" },
  { "op": "add", "path": "/sections/0/children/0/overlay/cta_secondary",
    "value": { "label": "Explore", "link": "#story", "token": "var(--color-ink-black)" } }
]
        │
        ▼
ast-patcher → apply → rule-checker → re-render → publish to KV draft key
        │
        ▼
dashboard iframe refreshes in ~2s
```

Benefits: deterministic, auditable, reversible (store patch history for undo), and the rule checker runs on every edit so a merchant can never break the brand.

---

## 10. Storage, Caching & API (v2 worker)

```
┌────────────────────────────────────────────────────────────────┐
│                        siteagentv2 API                         │
├────────┬───────────────────┬───────────────────────────────────┤
│ Method │ Route             │ Description                       │
├────────┼───────────────────┼───────────────────────────────────┤
│ GET    │ /*                │ KV read → <2ms HTML stream        │
│ POST   │ /compile-design   │ design.md → .style package         │
│ POST   │ /publish          │ site.md + style → LayoutAST → KV  │
│ POST   │ /draft            │ fast draft (KV draft key)         │
│ POST   │ /edit             │ JSON Patch edit → re-render draft │
│ POST   │ /score            │ fidelity score for current draft  │
│ GET    │ /styles           │ JSON catalog of compiled styles   │
│ POST   │ /api/order        │ checkout → Turso                  │
│ POST   │ /api/contact      │ lead form → Turso inbox           │
│ POST   │ /api/booking      │ reservation → calendar            │
│ GET    │ /health           │ bindings inspection               │
└────────┴───────────────────┴───────────────────────────────────┘
```

KV keys: `site:<subdomain>:<path>` for live, `draft:<subdomain>:<path>` for preview.
R2: `assets/<subdomain>/...` for images, `themes/<style-id>/...` for compiled `.style` packages + fonts.

---

## 11. Execution Roadmap

1. **Scaffold `siteagentv2/`** — `package.json` (hono, zod, yaml, @libsql/client), `tsconfig.json`, `wrangler.jsonc` (KV + R2 + Turso + Groq bindings).
2. **Types & schemas** — `types.ts`: `StylePackage`, `ContentAST`, `LayoutAST`, `MotionProfile`, `Rule`, `FewShot` (all Zod).
3. **Design compiler** — `design-compiler/*`: extract tokens, components, rules, fewshots, motion → write `.style` package. Verify against all 25 `designmds/*.md`.
4. **Primitives** — `primitives/*`: stack, split, grid, bleed, carousel, overlay (pure functions, token-driven props).
5. **Renderer** — `renderer/*`: AST → semantic HTML + scoped CSS + motion + `<4KB` JS. Typography with fluid `clamp()`.
6. **Architect** — `architect/*`: prompt builder + structured LLM call → LayoutAST.
7. **Guardrails** — `guardrails/*`: rule checker + fidelity scorer + retry loop.
8. **Editor** — `editor/*`: JSON Patch generator + AST patcher + draft publish.
9. **Worker & storage** — `app.ts` + `index.ts` + KV/R2/Turso bindings.
10. **Test suite** — `test-render.ts`: compile all 25 styles, generate a reference site per style, assert fidelity ≥ 0.9.

---

## 12. Acceptance Criteria (definition of done)

- [ ] Any of the 25 `designmds/*.md` compiles to a `.style` package with zero manual fixes.
- [ ] A `site.md` + style package generates a full multi-page site in one LLM call.
- [ ] Fidelity score ≥ 0.9 for a reference site per style.
- [ ] Every rendered color/font/spacing is a token reference (0 hardcoded values).
- [ ] `GET /*` serves in <2ms with zero compute (pure KV stream).
- [ ] A conversational edit ("make the hero bigger") applies in <3s with rule-checking.
- [ ] Motion (reveal, hover, parallax) matches each design's profile.
- [ ] Output is responsive (mobile-first) with fluid typography.
- [ ] Client JS payload <4KB; no runtime framework or animation library.

---

## 13. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| LLM produces invalid AST | Zod schema validation + ≤2 retry loop with specific violations |
| LLM ignores brand rules | Rule checker is deterministic and blocks publish below threshold |
| Motion hurts performance | CSS-only transforms/opacity, IntersectionObserver, no library |
| Design.md files are inconsistent | Compiler normalizes + falls back to sensible token defaults |
| Token drift across styles | `.style` package is the single compiled source; markdown is never read at runtime |

---

## 14. Security note (carry over from v1)

`siteagent/wrangler.jsonc` currently contains a plaintext `GROQ_API_KEY`. v2 must **never** commit secrets to `wrangler.jsonc` — use `wrangler secret put GROQ_API_KEY` (or Cloudflare Secrets) and reference it via `env.GROQ_API_KEY`. Rotate the exposed key immediately.
