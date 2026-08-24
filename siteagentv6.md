# Siteagent v6.1 — Final Architecture

**Design.md full utilization + OKF grounding.** Webflow/Framer-grade sites from any business description · ~$0.008/site · 30–60s · standalone Cloudflare Worker, no framework.

## 0. Design.md → complete extraction table (all 20 sections consumed)

| # | Section | Consumer | How used |
|---|---|---|---|
| 1 | Header / Theme / Mood | Tokens, Synth | theme attr on `<body>`; creative direction in synth prompt |
| 2 | Tokens — Colors | Tokens | Verbatim `:root` roles; role-matched aliases; lint palette |
| 3 | Typography / Families | Tokens, Assembler | Font stacks with verified Google substitutes; `font-feature-settings` |
| 4 | Type Scale | Tokens, Vocabulary | All `--text/leading/tracking-*` tokens; LLM told to use them |
| 5 | Spacing base + density | Tokens, Synth | `--spacing-unit`; density-aware section padding defaults |
| 6 | Spacing Scale | Tokens | Full `--spacing-*` set; only declared tokens allowed |
| 7 | Border Radius | Tokens, Vocabulary | `--radius-{button,card,image,input,tag}` aliases |
| 8 | Layout metrics | Tokens, Assembler | `--layout-max-width`, `--section-gap`, `--card-padding`, `--element-gap` |
| 9 | Components | Vocabulary | Compiled `.c-*` classes; LLM uses them, never reinvents |
| 10 | Do's and Don'ts | Constraints, Verify | Typed flags (`no_shadows`, `no_gradients`…) enforced in lint |
| 11 | Surfaces | Tokens, Synth | `--surface-L0…LN`; section background rhythm |
| 12 | Elevation | Constraints, Synth | flat vs shadow vs border strategy → synth + lint |
| 13 | Imagery | Vocabulary, Synth, Assembler | Aspect ratios, `--radius-image`, overlay rules, placeholder style |
| 14 | Layout | Synth, Assembler | Grid guide; shell nav style; section rhythm |
| 15 | Agent Prompt Guide | Synth | Verbatim "component examples" block — highest signal |
| 16 | Typography Philosophy | Synth, Copy | Design intent; copy tone matches type character |
| 17 | Color Philosophy | Synth, Copy | Chromatic strategy |
| 18 | Similar Brands | Synth | "This site should feel like: [brands]" |
| 19 | Quick Start `:root` | Assembler | Used AS-IS — no re-parsing |
| 20 | Tailwind `@theme` | Studio export | Stored, unused by worker (pure CSS) |

## 1. Core principle

```
LLM = designer              vocabulary = component library
LLM decides layouts         vocabulary enforces consistency
Content written once        components compiled once      sections unique
design.md is authoritative  — every section consumed
OKF is the source of truth  — real content, never hallucinated
```

Shell (header/footer/JS) = deterministic, universal tokens only · Sections = LLM HTML/CSS on compiled vocabulary + all 20 layers · Components = from Components+Radius+Elevation+Imagery · Constraints = compiled from Do's/Don'ts, enforced in lint, never left to LLM memory · Content = grounded in OKF workspace data when scope given.

## 2. OKF — shared knowledge layer

Owned by **taragent**. Siteagent reads + proposes diffs — **never writes**. taragent performs every write (wiki bootstrap, learned FAQs, approved corrections).

```
 Genie/taragent ── writes/reads ──►  OKF   S3 workspaces/{scope}/  +  Turso (matter = live items,
 Siteagent ────── reads/diffs ────►        index · log · business/profile · wiki/* ·    prices, stock, customers;
 Future agents ── read only ──────►        site/design.md · site/brand.md             motion = orders, sales, metrics)
```

```
workspaces/<scope>/
├── index.md  log.md            # map · dated history (every diff appends, revertable)
├── wiki/  brand.md  offerings.md  logistics.md  proof.md  team.md  faqs/*.md  policies/*.md
└── site/  design.md  brand.md   # workspace mini design system (fallback) + brand voice
```

| OKF file | FactSheet field | Site sections |
|---|---|---|
| wiki/brand.md | identity, audience, voice, usps | hero, story, about |
| wiki/offerings.md | offerings (exact names, prices) | products, menu, pricing, services |
| wiki/logistics.md | logistics | contact, map, booking, footer |
| wiki/proof.md | proof | testimonials, stats bar, press |
| wiki/team.md | team (names, roles, bios) | team section |
| wiki/faqs/*.md | — | faq only |
| wiki/policies/*.md | — | footer links only |
| `motion` sales aggregate | proof.stats | stat bar ("1,247 orders served") |

**Fact slices** — each section kind gets only its facts. Rule: *phrase creatively; never invent or contradict; names, prices, hours, contact exact.*

| Kind | Slice |
|---|---|
| hero · story · about | identity + usps + voice |
| products · menu · pricing | offerings (exact names, prices, currency) |
| contact · map · booking | logistics |
| testimonials · reviews | proof.testimonials — verbatim |
| stats · social-proof | proof.stats — exact numbers, never rounded |
| press · logos | proof.press |
| team | wiki/team.md (or matter staff) |
| faq | faqs/* verbatim Q&A |
| footer | logistics + policies |

**FactSheet** `{schema:1, facts_version, identity{name,tagline,category,founded}, audience, voice{tone,do,dont}, offerings[{id,name,price,currency,desc,highlight}], usps[], proof[{kind,testimonial|stat|press,text,source}], team[{name,role,bio,avatar}], logistics{hours,address,phone,email,socials,booking_url}}`
· updates = structured diffs (`add offering`, `change price`), never prose — facts can't compound or contradict · `PUT /site/facts` bumps `facts_version` → selective re-render: only sections whose slice touched the changed field get new render keys, rest reload from cache instantly · deterministic regex fallback (prices/phones/emails/offerings) when OKF unavailable.

**GROUND** = parallel targeted reads (brand · offerings · logistics · proof · team · faqs list) via AGENT binding → `composeFactSheet(dna, files)`; real data overrides DNA; missing files → DNA fields. No wiki → GROUND bootstraps initial wiki files from the description; later runs read them.

**PLAN coverage:** offerings>0→products/menu · testimonials>0→testimonials · press>0→press · faqs exist→faq · team>0→team (wiki/team.md or matter) · empty coverage→omit or "add later".

**WRITE injection:** fact slices go in verbatim — testimonials never rephrased; offerings used exactly (`[{name:"Filter Coffee",price:"₹60"}]`).

**Gate 10-Facts:** menu/pricing/contact copy must match FactSheet exactly — wrong price/hours/phone = blocking violation.

**Bindings:** `AGENT` service binding → taragent `/okf/read?scope&file` (OKF creds stay in taragent, never in siteagent) · no Turso binding (reads proxied) · no scope → GROUND skipped → pipeline identical to standalone.

**Feedback loop:** visitor asks unknown → draft `wiki/faqs/<slug>.md` · booking form corrects hours → diff to logistics.md · chat learns offering → diff to offerings.md · owner approves → `facts_version++` → only dependent sections re-render.

**Quality:** verbatim real testimonials · exact names/prices/currency · real FAQs · exact hours · real numbers ("1,247 orders this month", not "500,000 customers") · chat ↔ site can't contradict — same wiki source.

## 3. Pipeline

```
description + scope? + {style_hint?, wait_for_plan?}
   │
   UNDERSTAND → GROUND → STYLE → COMPILE → PLAN ──(pause if wait_for_plan)──► WRITE → SYNTH → VERIFY → ASSEMBLE → PUBLISH
```

| Stage | Does | LLM calls |
|---|---|---|
| UNDERSTAND | business DNA | 1 cheap |
| GROUND | wiki → FactSheet (skipped without scope) | 0 |
| STYLE | design.md match (short-circuit on style_hint) | 1 embed + 1 cheap rerank |
| COMPILE | design.md → all compiled outputs | 0 — deterministic |
| PLAN | architecture + content map (user reviews here) | 1 |
| WRITE | all copy, one pass | 1 |
| SYNTH | section HTML/CSS, batched 3–4/call | 2–4 |
| VERIFY | 12 lint gates + repair loop | 0 (+repair calls) |
| ASSEMBLE · PUBLISH | pages, CSS layers, icons, SEO → KV | 0 |

5–7 calls typical, 10 max with repairs · ~$0.008/site · 30–60s.

## 4. Stage detail

### 4.1 UNDERSTAND — Business DNA
One cheap call → `{brand, tagline, mission, voice, industry, currency, value_props[4–6 distinct], proof_points[2–4], offerings[{name,price,desc}], audiences[], cta_primary, cta_secondary, location, social_proof}`. Raw description never enters another prompt after this stage. Fallback: regex brand + first sentence + full text as one value_prop.

### 4.2 STYLE — two-stage retrieval (shipped v3.1, keep)
```
corpus: 25 curated seeds (embedded) + 2000+ refero (R2 + Turso — never in bundle)
1) embed desc → bge-small-en-v1.5 (384d) → Turso cosine → top-25 (skips compile_status='fail')
   keyword fallback if Turso/embeddings down
2) LLM rerank over top-25 vibe summaries → {primary, fallback}
style_hint → skip both → load design.md direct from R2 → miss → embedded 25-seed fallback
```
Turso `tar-styles`: `id · name · embedding F32(384) · theme · mood · brands · compile_status(pass|warn|fail)` — warn = compiled with safe fallbacks (usable); fail = invalid vocabulary CSS, excluded from search.
Ingest `scripts/ingest-refero.mjs`: normalize → compile → validate → embed → R2 → Turso upsert → report. Targets: ≥90% pass, ≤5% fail.

### 4.3 COMPILE — DesignSystem (deterministic, no LLM, once per job)

```
compileDesignSystem(designMd) → {
  rootCss (verbatim Quick Start :root) · aliasCss · tokenNames Set (lint)
  vocabulary (.c-* CSS + metadata) · constraints (typed flags)
  surfaces[] + rhythm · imagery rules · layoutGuide
  agentGuide (verbatim) · typographyPhil · colorPhil · similarBrands[]
  theme (light|dark|mixed) · moodLine }
```

**Aliases** (extraction source → example values):

| Token | design.md source | Adanola | Seed |
|---|---|---|---|
| --color-canvas | "page canvas" role | paper-white | snow-white |
| --color-ink | "primary text" role | carbon-ink | forest-depths |
| --color-accent | saturation-ranked non-neutral | carbon-ink | lime-pulse |
| --color-accent-ink | contrast-picked vs accent | paper-white | forest-depths |
| --color-muted | "secondary text/caption" | smoke-charcoal | pewter |
| --color-border | "divider/hairline" | soft-mist | ash |
| --color-surface | Surfaces L1 | warm-fog | warm-stone |
| --color-footer-bg / -ink | footer bg + inverse | carbon-ink / paper-white | forest-depths / snow-white |
| --font-body / --heading | primary + display family + substitute | 'Favorit','Inter' | 'Seed Sans','Inter' |
| --font-mono | mono family + substitute | system-mono | 'Seed Sans Mono','JetBrains Mono' |
| --radius-shell / -button | buttons row | 4px | 1000px |
| --radius-card / -image / -input / -tag | radius table rows | 0 / 0 / 4 / 0 | 16 / 0 / 8 / 1000 |
| --weight-display / -heading / -body / -btn | typography + component spec | 400/500/400/500 | 300/350/400/400 |
| --tracking-display / -heading / -body | type scale letter-spacing | .75/.5/.35px | −.72/−.48/−.18px |
| --leading-display / -heading / -body | type scale line-height | 1.2/1.2/1.33 | 1.1/1.0/1.3 |
| --text-display / -heading / -body / -caption | type scale sizes | 30/20/14/12px | 48/36/18/14px |
| --layout-max-width / --section-gap / --card-padding / --element-gap | layout metrics | 1440/64/16/8px | 1200/64/16/8px |
| --spacing-unit | spacing base unit | 4px | 8px |

Plus OpenType → `body{font-feature-settings:"ss01" on,…}` from Typography, and `--font-weight-{light,regular,medium,bold}`.

**Vocabulary** — `.c-*` compiled from `## Components`:

| Class | From | Compiles |
|---|---|---|
| .c-btn-primary / -secondary | CTA buttons | bg, color, border, radius, padding, font-size, weight, shadow, transition |
| .c-btn-text | text/arrow link | color, pseudo arrow |
| .c-card / .c-card__image | product/feature card | radius, padding, bg, shadow, border; image radius + object-fit |
| .c-input | search/form input | border, radius, bg, placeholder opacity |
| .c-badge | sale badge/tag | bg, color, radius, padding, font |
| .c-tab | category tabs | active/inactive states, radius, padding |
| .c-swatch · .c-announce · .c-pagination · .c-overlay · .c-divider | swatches / announce bar / pager / overlay / hairline | sizes, states, colors per spec |

Parse per field: heading `### name` · role line · bg: `transparent` / `[Name] fill` / hex→token · text: `[Name] text` · border: `none` / `Npx solid [Name]` · radius: `pill|1000px`→alias, `Npx`, `0` · padding `Npx × Npx` · shadow `none` · font `Npx` / `weight Nnn`. Color names + hex literals resolve via the color table (nearest by luminance if no exact match). Any failed parse → universal alias fallback (e.g. button bg → `var(--color-accent)`).

**Imagery rules:** `heroAspect (16:6|16:9|4:3|1:1) · imageRadius · imageMasking · overlayAllowed · overlayGradient · style (lifestyle|studio|product|editorial) · subjectFocus`.
**Surfaces:** `[{level,name,token,purpose}]` + rhythm `"alternate"` (L0 ↔ L1/L2).
**Elevation:** `flat-hairline | shadow-based | color-contrast`.
**LayoutGuide:** `maxWidth · heroTreatment · productGrid · editorialLayout · sectionRhythm · navStyle · hasAnnouncement · sectionGap`.

**Constraints** (clause-negation aware — ignore "do not/don't/never/avoid" when matching positives):
`no_shadows · no_gradients · no_decorative_borders · max/min_font_weight · forbidden_radius{min,max} · allowed_radius[] · action_palette(monochrome|accent|any) · image_radius · no_pill_shapes · no_icon_containers · surface_alternation[] · forbidden_properties[]`. Missing section → all false (permissive beats wrong).

### 4.4 PLAN — site architecture (1 call)
In: DNA + style vibe (mood line) + similar brands + layout guide + surface rhythm + okf_coverage. Per section:
`id` (kebab, page-path-prefixed) · `kind` (open vocabulary — LLM invents what fits) · `surface` (L0…N from rhythm) · `content_map` (which DNA unit) · `images[{role,aspect,alt_hint}]` · `icons[]` · `layout_hint` (full-bleed / split / grid-N / centered).
Fallback: deterministic 3-section plan — hero L0, story L1, contact L0.

### 4.5 WRITE — all copy, one pass (1 call)
content_map = structural dedup · all sections visible at once = cross-section awareness, no repetition · Typography + Color Philosophy tune copy tone · fallback = DNA fields direct (brand→headline, value_prop→lead).

### 4.6 SYNTH — section HTML/CSS
Parallel pools of 3. **Anchor** (first) section gets the full verbatim design.md; the rest get the ~3–4KB **Design Digest** (aliases + `.c-*` signatures + Do's/Don'ts + layout constants + their fact slice). System prompt = stable prefix across calls in a job (provider prompt caching).

Prompt layers: 1 ROLE ("Webflow/Framer-grade designer building a [moodLine] site") → 2 HARD RULES (token-only colors/fonts, vocabulary classes, responsive, no placeholders, images as `data-slot`, no script) → 3 VOCABULARY CSS ("use THESE classes, do not reinvent") → 4 TOKEN GUIDE (aliases + resolved values) → 5 LAYOUT → 6 IMAGERY → 7 SURFACE GUIDE (valid section bgs + rhythm) → 8 ELEVATION → 9 AGENT GUIDE verbatim → 10 TYPE PHIL → 11 SIMILAR BRANDS → 12 DO'S/DON'TS verbatim → 13 DESIGN.MD / Digest.

User prompt per batch: `id · kind · surface · layout hint · image slots · icons · fact slice · copy · previous-section summary` → output ```html + ```css per section labeled by id.
Repair: ≤4 retries, RECOVERY MODE from attempt 3, deterministic fallback = vocabulary classes + universal tokens only.

### 4.7 VERIFY — 12 gates (deterministic, $0, no browser)

| Gate | Checks | Blocks |
|---|---|---|
| 1 Parse | HTML tag, CSS brace/string balance | Y |
| 2 Token lint | every color in `var()`, vars ∈ tokenNames | Y |
| 3 Vocabulary | buttons `.c-btn-*`, inputs `.c-input`, cards `.c-card` | Y |
| 4 Constraints | shadows/gradients/radius per flags | Y |
| 5 Image rules | img radius per `--radius-image`, overlay permission | Y |
| 6 Surface | section bg ∈ allowed surface tokens | Y |
| 7 Structural | img alt, input names, no fixed width >720px | Y |
| 8 Responsive | `@media` or clamp/auto-fill/auto-fit | Y |
| 9 Plan dedupe | same kind + near-identical copy | Y exact / Warn near |
| 10 Facts | copy matches FactSheet (names, prices, hours) | Y |
| 11 Continuity | nav/CTA links ⊆ page paths, `#anchor` targets exist | Y |
| 12 Shell lint | shell CSS passes token lint (soak-time, never runtime) | Y |

Violations feed repair with exact gate + line number.

### 4.8 ASSEMBLE
**Asset ladder (zero CLS):** uploaded asset (`sites/<site>/assets/<slot>`) → on-brand SVG fallback (palette bands, style geometry, grain, exact aspect) — never external URLs at render time. Every slot gets explicit `width/height/aspect-ratio`.

**CSS layer order:** 1 `:root` design verbatim · 2 aliases `:root` · 3 `font-feature-settings` · 4 reset · 5 vocabulary `.c-*` · 6 header · 7 footer · 8+ scoped `.s-*` section CSS.

| Feature | How |
|---|---|
| Icons | ~50 Lucide inlined, `currentColor`; unknown name → generic circle, never 404 |
| Placeholders | palette SVG (surface bg + border stroke) + CSS `aspect-ratio` |
| Loading | hero `eager`, rest `lazy`, all `decoding="async"` |
| Announcement | `.c-announce` bar above header when `hasAnnouncement` |
| Section bg | inline `background:var(--color-surfaceN)` from plan surface field |
| SEO | title, meta description, og:title, og:description, twitter:card |
| JSON-LD | Organization / LocalBusiness by DNA.industry |
| Favicon | SVG: accent circle + brand first letter |
| Fonts | preconnect fonts.googleapis + Google css2 per-family weights (not shared) |

Shell adapted by `navStyle`: `top-bar` sticky · `top-bar-no-sticky` (Adanola) · `center-wordmark`. Vanilla JS <2KB: nav drawer, form submit, scroll-reveal, announce close.

### 4.9 PUBLISH

| KV key | Content | TTL |
|---|---|---|
| `draft:<site>:<path>` / `live:<site>:<path>` | preview / published HTML | 7d / ∞ |
| `job:<site>` | state + stage checkpoints | 24h |
| `section:<site>:<id>` | section HTML+CSS | 7d |
| `render:<sha256>` | `{html, css, violations, used_fallback}` | 30d |
| `facts:<site>` | FactSheet + facts_version | ∞ |

`render_key = sha256(style_id + facts_version + JSON(section_brief) + PROMPT_VERSION)`
→ edit 1 section = 1 new key, rest cached (~$0.001, seconds) · restyle = all keys change, facts + plan untouched · `PROMPT_VERSION` bump on prompt changes = automatic invalidation on deploy · job death mid-synthesis loses nothing — completed sections persist independently.
Visitor GET = single KV read, zero compute.

## 5. CSS output stack (emitted page CSS)

```css
/* 1 — design verbatim */      :root { --color-…, --font-…, --text/leading/tracking-…, --spacing-…, --radius-…, --page-max-width… }
/* 2 — aliases (bridges) */    :root { --color-canvas: var(--color-paper-white,#fff); … --radius-button: var(--radius-buttons,4px);
                                  --weight/tracking/leading/text-*, --layout-max-width, --element-gap }
/* 3 — OpenType */             body { font-feature-settings:"ss01" on,"cv11" on; }
/* 4 — reset */                *,*::before,*::after{box-sizing:border-box}  body{margin:0;font-family:var(--font-body);
                                color:var(--color-ink);background:var(--color-canvas)}
                                img{max-width:100%;height:auto;display:block;border-radius:var(--radius-image)}
/* 5 — vocabulary */           .c-btn-primary{…} .c-card{…} .c-input{…} .c-badge{…} .c-announce{…}
/* 6/7 — shell */              .site-header{…}  .site-footer{…}
/* 8+ — sections (LLM, scoped) */ .s-home-hero{…}  .s-home-products{…}
```

## 6. Constraint enforcement — two places

**A. lint** (verify.ts scans every section CSS after synth) · **B. vocabulary itself** (compiled `.c-*` guaranteed clean).

| Constraint | Lint catches | Vocabulary guarantees |
|---|---|---|
| no_shadows | any box-shadow ≠ none | `.c-card{box-shadow:none}` |
| no_gradients | linear/radial-gradient | none in any `.c-*` |
| forbidden_radius max 4 | border-radius > 4px | card 0px, btn 4px |
| image_radius 0 | img border-radius | `img{border-radius:0}` in base |
| action_palette monochrome | saturated button bg | btn bg = ink token |
| no_pill_shapes | radius ≥ 999px | vocabulary never emits 1000px |

## 7. Imagery & assets

Slot: `{"role":"hero-editorial","aspect":"16:6","alt_hint":"…"}` → assembler fills with palette-matched SVG (surface bg + border stroke, CSS `aspect-ratio`, radius per `--radius-image` — 0 Adanola, 16 Seed), `data-slot` attr for studio replacement. Icons: ~50 Lucide embedded in `icons.ts` (~15KB gzip), injected inline with `currentColor`.

## 8. LLM — INFERX · Qwen3-Coder-Next-FP8 (OpenAI-compatible)

| Stage | Temp | Max tokens |
|---|---|---|
| DNA / rerank | 0.3 / 0.2 | 2000 / 500 |
| Plan / Write | 0.5 / 0.7 | 4000 / 8000 |
| Synth | 0.3–0.7 (low = product/data, high = story/hero) | 12000 |
| Repair | 0.3 | 6000 |

Retry: one retry on 429/5xx **and** on network throw.

## 9. Job runner

KV-checkpointed · 5-min staleness margin · cron resumes every minute.
`understanding → styling → compiling → planning → [pause if wait_for_plan] → writing → synthesizing → assembling → done`
Each section saved individually; resume reloads completed sections from KV, never re-synths. Any stage error → `failed` in KV with stage + message.

## 10. File structure

```
siteagent/
├── wrangler.jsonc            # SITE_CACHE KV · BUCKET R2 · AI · cron * * * * *
├── src/
│   ├── index.ts  router.ts  types.ts  seed-designs.ts(25)  store.ts  icons.ts(~50 Lucide)
│   └── pipeline/
│       ├── llm.ts            # INFERX + network-retry fix
│       ├── styles.ts         # vector search + rerank
│       ├── dna.ts  ground.ts # DNA · OKF wiki (brand/offerings/logistics/proof/team/faqs) → FactSheet
│       ├── tokens.ts         # EXTENDED: all aliases + OpenType + weights
│       ├── vocabulary.ts  constraints.ts  imagery.ts  design.ts
│       ├── plan.ts  copy.ts  synth.ts  verify.ts  assemble.ts  job.ts
└── scripts/  test-tokens.mjs  gen-seeds.mjs
```

## 11. API

| Route | Method | Body / Query | Behavior |
|---|---|---|---|
| /site/generate | POST | description, scope?, style_hint?, wait_for_plan? | start job; scope → GROUND runs |
| /site/status | GET | site | stage, per-section states, okf_coverage, preview URL |
| /site/plan | GET/PUT | site [+plan] | review / submit edited plan → resume at WRITE |
| /site/facts | GET/PUT | site [+facts] | read / correct → facts_version++, stales affected renders |
| /site/edit | POST | site, section_id, instruction | regen one section via render cache → republish |
| /site/restyle | POST | site, style_hint | re-render all; facts + plan untouched |
| /site/assets | POST | site, slot, file | upload to `sites/<site>/assets/<slot>` → republish |
| /site/style/custom | POST | colors?, fonts?, logo?, vibe?, reference_url? | synthesize + validate custom design.md → style id |
| /site/publish · /site/unpublish | POST | site | promote / pull live |
| /site/styles | GET | — | catalog listing |
| /site/preview/:site/* · /site/page/:site/* | GET | — | draft / live HTML |

## 12. Soak tests — tiered for 2000+ corpus

**Tier 1 — CI gate (every deploy, ~30s)** `test-tokens.mjs --tier=1` — all 25 curated designs, 100% green to deploy:
`:root` extracted · aliases resolve · extended aliases parse · OpenType emitted · vocabulary compiles + known tokens only · constraints accurate · shell lints clean · strict lint catches bad + passes good CSS · constraint lint flags violations · imagery rules extract · fixture pages render (Seed + Adanola).

**Tier 2 — ingest gate (new designs, ~5min)** `ingest-refero.mjs --validate-only --sample=50`:
pass ≥90% · warn ≤8% · fail ≤2% (flagged in Turso, excluded from search) · aliases resolve 100% · worker bundle unchanged.

**Tier 3 — weekly spot-check (cron, ~10min)** `test-tokens.mjs --tier=3 --sample=100` — random corpus sample, format-drift report for parser improvement.

## 13. Compiler robustness contract

Heading match ladder: exact → case-insensitive → partial/prefix ("Component Library" → "Components") → null → **safe defaults — never throw, never invalid CSS**.

| Compiler | Safe default |
|---|---|
| Tokens | Quick Start `:root`; else 6-token universal set |
| Vocabulary | `c-btn-primary` accent bg · `c-card` radius-shell no shadow · `c-input` 1px border |
| Constraints | all flags false (permissive beats wrong) |
| Imagery | hero 16:9 · product 4:3 · card 1:1 · radius 0 · no overlay |
| Surfaces | L0 = canvas · L1 = 5% darker canvas |

Any design.md, any format → valid output. Worker never crashes on an unknown design.

## 14. Acceptance criteria

**Compile** — 25 seeds 100% pass (T1) · refero batch ≥90% pass / ≤2% fail (T2) · safe defaults everywhere · `compile_status` accurate + fail excluded from vector search.
**Content** — no headline in 2+ sections · single-pass distinct copy · OKF products/testimonials/team/FAQs verbatim when scoped · zero "Lorem/TBD/Example".
**CSS** — `.c-*` known tokens only · vocabulary lint passes · consistent buttons/cards/inputs/badges · zero literal hex/rgb/hsl/named colors · OpenType where specified · surface tokens only · constraints never violated in published sections.
**Layout/assets** — every section responsive (`@media` or fluid) · hero aspect per imagery rules · img radius per `--radius-image` · icons inline `currentColor` · announce bar when flagged.
**SEO/infra** — title/description/og/JSON-LD every page · visitor GET = 1 KV read, zero compute · generate ≤60s, edit ≤10s · deploys independently (`cd siteagent && wrangler deploy`) · retrieval can't 404 (R2 → seeds, two-tier) · bundle never grows with library · tarapp wired (§16).

## 15. Migration — shipped worker → v6.1

| # | Work | Days |
|---|---|---|
| 1 | P0 bugs: Helvetica Neue, hex nibble, compound color skip, multi-family weights | 0.5 |
| 2 | Extended token compiler (weight/radius/tracking/leading/layout/OpenType) | 1 |
| 3 | Vocabulary compiler | 2 |
| 4 | Constraint compiler | 0.5 |
| 5 | Imagery + Surface compilers | 0.5 |
| 6 | design.ts orchestrator | 0.5 |
| 7 | DNA + Plan stages (replace brief.ts) | 1 |
| 8 | OKF GROUND stage (brand, offerings, logistics, proof, team, faqs → FactSheet) | 1 |
| 9 | Single-pass copy + OKF injection | 0.5 |
| 10 | Synth: full design context, batching, copy injection | 1 |
| 11 | Verify: all new gates | 1 |
| 12 | Assemble: vocabulary layer, OpenType, announce, surfaces, icons, SEO | 1 |
| 13 | Job runner: new stages, plan-pause, GROUND | 0.5 |
| 14 | Soak test v6.1 (25 designs + mock OKF) | 0.5 |

**Total ~11 days.** First usable output (no OKF) at step 10 (~7.5d); OKF grounding testable independently from step 8.

## 16. Platform rules

```
OWNS OKF     taragent — every write (bootstrap, learned FAQs, approved diffs; index/log/wiki/matter)
READS OKF    siteagent + future agents — read + propose diffs, never write directly
DESIGN.MDS   siteagent reads from designmds/ on R2/S3 — not from OKF
KV           siteagent writes site HTML, job state, render cache, facts
TURSO        never bound in siteagent — proxied via taragent AGENT binding
Any new agent that needs business context → reads OKF. Never asks the LLM to invent it.
```

## 17. Tarapp — the mobile surface

tarapp (Expo, expo-router) ships Site Studio (`src/components/site.tsx` → `SITE_API` / `EXPO_PUBLIC_SITEAGENT_URL`) + taragent via `lib/tar.ts` (`TAR_URL`). v6.1 makes it the full control surface:

```
Workspaces tab
 └─► Site Studio ── describe + pick style ──► POST /site/generate (scope = workspace)
        │        poll /site/status (2s) · pause at plan gate (wait_for_plan=true)
        ├─► Plan Review ── reorder/add/delete kinds, inline copy ──► PUT /site/plan  (also post-synth editor: cache serves unchanged sections)
        ├─► Style on-ramp ── brand kit / reference URL ──► POST /site/style/custom
        ├─► Restyle ── new style, same facts+plan ──► POST /site/restyle
        ├─► Assets ── per-slot upload + aspect guides ──► POST /site/assets
        └─► Facts ── FactSheet editor, shows affected sections ──► PUT /site/facts
 └─► Business Brain ── wiki browser + FAQ/diff approvals + log.md history (taragent, TAR_URL)
        approval → facts_version bump → affected sections re-render
```

| Screen | Status | Calls |
|---|---|---|
| Site Studio | exists → extended | styles · generate · status · publish/unpublish |
| Plan Review | new | GET/PUT /site/plan |
| Facts | new | GET/PUT /site/facts |
| Assets | new | POST /site/assets |
| Style on-ramp | new | style/custom · restyle |
| Business Brain | new | taragent OKF routes via `lib/tar.ts` |

Stage tracker ↔ `/site/status`: `understanding` "Reading your business…" · `styling/compiling` "Matching design…" · plan pause → **Review plan** deep-link · `writing` "Writing copy…" · `synthesizing` per-section chips (pending · synth · verifying · repairing · done · failed · **cached**) · `assembling→done` "Finishing… → Open draft".

Rules: two clients only (`SITE_API`, `TAR_URL`) — no third service, no server creds in app · draft/live open in external browser, no in-app webview · workspace-generated sites always send scope (real data only, never hallucinated) · post-publish actions show cache-hit ("instant") vs fresh-render states.
