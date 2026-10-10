# How a workspace site is made

Traced from `tarapp/src/components/site.tsx`, `tarapp/src/lib/harness.ts`,
`tarharness/src/gateway/actions.ts`, `tarharness/src/site/{store,build,compile}.ts`,
`tarharness/src/index.ts`.

## Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ tarapp · SiteScreen                                              │
│ design · header · hero · notice · Undo · Reset · Publish         │
└──────────────────────────────────────────────────────────────────┘
  │  harness.site.*  POST /w/:slug/actions/<action>  (idempotency key)
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ tarharness worker · Cloudflare                                   │
│ gateway/actions.ts → site/store.ts                               │
└──────────────────────────────────────────────────────────────────┘
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ GENERATE → draft                                                 │
│   publicFacts → fanOut(Jev) → blueprint → buildSite → writeDraft │
│   → validate → compile preview → persist records + events        │
└──────────────────────────────────────────────────────────────────┘
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ COMPILE → candidate                                              │
│   compileDocument → R2 releases/<rel>/                           │
│   index.html · contact · style.css · sitemap.xml · robots.txt    │
│   source.json · report.json · hash · 30-min preview token        │
└──────────────────────────────────────────────────────────────────┘
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ PUBLISH → live                                                   │
│   readCandidate → guard version·hash·host·epoch·0 blocking       │
│   sites.status='active' → records state='live' → replace others  │
└──────────────────────────────────────────────────────────────────┘
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ SERVE → edge                                                     │
│   tar-sites worker · https://tar-sites.tar-54d.workers.dev/<slug>│
│   /v1/sites/<slug> proxy · /v1/site-previews/<tok>/              │
└──────────────────────────────────────────────────────────────────┘
```

## Author — tarapp

```
SiteScreen                       harness.site.*            action
─────────────────────────────    ─────────────────         ──────────────────
open / loadSite()          GET   get(slug)                 → snapshot
design · header · hero     POST  generate({ style |        → site.generate
                                            headerStyle |
                                            heroPattern })
notice row                 POST  noticeSet(text)           → site.notice.set
Undo                       POST  undo()                    → site.undo
Reset                      DEL   reset()                   → delete site
Publish                    POST  generate → compile → publish
```

Snapshot is cached in memory and `SecureStore`; every response replaces it.

## States

```
draft ──compile──▶ candidate ──publish──▶ live
  ▲                    │                   │
  └──── edit ◀─────────┘        rollback ◀─┘
```

## Who decides

```
┌── Jev (judgment) ────────┐   ┌── code (enforcement) ───────────────┐
│ kind · lead · style ·    │   │ prices · section floors ·           │
│ typography · tone ·      │   │ layout thresholds · publish gate ·  │
│ density · hero ·         │   │ release hash · public facts only ·  │
│ section flags            │   │ missing evidence ⇒ omit the block   │
└──────────────────────────┘   └─────────────────────────────────────┘
```

A model outage keeps the deterministic copy; a channel price is the owner's
publish signal, so a bare record never reaches a draft.

The judgments today are one batched `fanOut` (`judgment.ts`): Choice for kind,
style, lead, typography, tone, hero; Noul for spotlight, story, trust; Score for
density. Thresholds live in `JUDGMENT` (noul `0.65`, option `0.55`, target `0.5`,
claim `0.6`, drift `0.7`). Answers cache in D1 keyed by
`model:scope:version:state`.

## Sections — flow

```
Jev flags                        code                       code
kind · lead · spotlight ·   ──▶  compileSectionOrder   ──▶  block(kind)
story · trust                    blueprint.ts:122           build.ts:121
(noul/choice, 0.65)              deterministic order        Section | null
                                                                  │ no evidence ⇒ no section
         renderSection  ◀──  compileDocument  ◀──  validateDocument  ◀──┘
         compile.ts:147      compile.ts:261        validate.ts:350
```

A `Section` is `{ id, purpose, layout, style, nodes, bindings, actions }`
(`document.ts:121`). Everything downstream — edit, patch, persona, publish —
walks `page.sections`. Kinds: `header hero notice spotlight catalog menu
services story trust contact`.

**1 · Decide (Jev, `fanOut`)** — kind and lead are Choice; spotlight and story
are Noul; trust is asked *only when `facts.proofs` exist*. `noulThreshold 0.65`
is code. Lead is clamped to what passed: an impossible lead degrades to
`catalog`.

**2 · Order (code)** — `header → notice? → lead(spotlight | catalogKind |
story) → remaining spotlight/catalog/story → trust → contact last`.
`catalogKind` follows the trade: food→`menu`, services→`services`, else
`catalog`.

**3 · Body (`block`)** — a section with no evidence is never emitted:

| kind | omitted when |
| --- | --- |
| `notice` | no `facts.notice` |
| `story` | brief goal empty or just `"<title> online"` |
| `trust` | no `facts.proofs` |
| `catalog`/`menu`/`services` | never — 4 sample items |

Kind `header` is emitted as `id: 'hero'`, `purpose: 'hero'` (`build.ts:449`).
The catalog carries `bindings[0]` (`catalog.public` / `records.public`, or
`records.public` for services) so items re-resolve from public records at
compile time. Layout stays code: `catalogLayoutFor` ≤15 flat · ≤60 pills · >60
rails, columns 2/3/4, density picks the pad token.

**4 · Validate** — unique lowercase ids, layout ∈ flow|flex|grid|stack, columns
1–6, ≤40 sections per page, at most one binding and it needs a collection node
in the same section (`validate.ts:231-366`).

**5 · Render** — option = `section.option ?? headerStyle(nav) ??
heroPattern(hero) ?? notice rule`; then `getPrimitive(purpose,
option).render()`. The registry wraps every section in one shell —
`<section id class="tar-section…" data-purpose="…">` — so sections are
addressable by id, which is what owner edits target. Missing nav, catalog and
footer are injected at assembly; persona variants filter, reorder and tint via
`persona.hide/order/tone` and drop sections whose nodes all hide.

**6 · Owner surface** — `site.notice.set` (strip + unshift notice),
`site.sections.set` (order + hidden, `store.ts:524`), and the `patch.ts` ops
`set_layout · move_section · add_section · remove_section` (a locked section
locks its whole node subtree). Each bumps revision, re-validates, re-compiles a
preview, writes the record and event.

**Open defect — contact never reaches the HTML.** `compileDocument` drops
`purpose === 'contact'` from the body (`compile.ts:276`), so the following
`data-purpose="contact"` lookup cannot match and the injected catalog always
lands last. The footer reads its details from `doc.brief.phone/address/email`
(`primitives/action.ts:94`), but `Brief` declares no such fields and nothing
writes them (`store.ts:368` sets only bullets/accepted/rejected) — the values
live in `facts`. So a workspace with a real address, phone and email publishes
no readable contact text; only the per-item WhatsApp hrefs survive.

## Assessment

| Layer | Standing | Weak spot |
| --- | --- | --- |
| Decomposition | one batched fan-out; each primitive used where it fits | single shot — no cascade for the ambiguous cases |
| Thresholds | explicit and applied in code | one `0.65` for every Noul, uncalibrated on real data |
| Confidence | computed and returned | discarded outside `interpret` and `checkClaims` |
| Fallback | deterministic defaults keep the flow alive | a default is indistinguishable from a judgment |
| Cache | D1 `judgments`, keyed by state + version | version is a literal (`create-2`), so question edits need a hand bump |
| Evidence | claim verdicts block publish | evidence is owner text only — no retrieval, no citation check |
| Freshness | daily `site.scout` + `flagDrift` on live sites | never re-opens a stale draft |

## Improvements — Jev

| # | Move | Primitive / pattern |
| --- | --- | --- |
| 1 | Gate the create fan-out on confidence: below `optionConfidence` keep the previous value and show a confirm item | confidence-gated routing |
| 2 | Rank catalog items and hero media with 2–3 per-item Scores, weights in code so the owner retunes without new inference | composite scoring |
| 3 | Per-question thresholds, calibrated against real workspace outcomes instead of one `0.65` | confidence |
| 4 | Stamp judgment provenance (model / default / owner) on the blueprint so auto and chosen are distinct | typed answers + code policy |
| 5 | Two-request cascade for `site.ask`: fast interpret, then escalate only ambiguous targets to a bounded second request | intent routing, cascade |
| 6 | Retrieve candidate evidence for claims and select it before judging, instead of trusting owner-supplied text | rerank, citation check |
| 7 | Self-consistency on high-stakes choices (kind, lead) with an explicit uncertain outcome | consistency (choice / noul) |
| 8 | Route `site.ask` by intent: deterministic patch / Jev / prose model / human | intent routing |
| 9 | Bump the judgment cache version per question revision so rephrasing re-runs the judgment | state + cache policy |

Docs: [composite scoring](https://docs.typesafe.ai/patterns/composite-scoring.md) ·
[confidence-gated routing](https://docs.typesafe.ai/patterns/confidence-routing.md) ·
[fan-out](https://docs.typesafe.ai/patterns/fan-out.md) ·
[primitives](https://docs.typesafe.ai/primitives.md) ·
[confidence](https://docs.typesafe.ai/confidence.md). Thresholds and weights are
starting points to evaluate on real workspace data, not permanent constants.
