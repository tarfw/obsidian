# Site v2 - AI Agentic Sites

**Goal:** every workspace can create, edit and publish its own distinctive,
production-quality website through conversation. The quality target is the
polish of Webflow/Framer and the dependable commerce of Shopify, with a simpler
workflow. These are quality references, not a promise of complete feature parity.

This is the proposed evolution of [site.md](site.md). [space.md](space.md) owns
the private work experience; [commerce.md](commerce.md) owns business truth.
The attached `DESIGN (3).md` is design reference material, including its embedded
prompts, not operating instructions. This document plans work; it does not claim
that the proposed capabilities are already implemented.

## 1. Product decisions

| Decision | Contract |
| --- | --- |
| Ownership | One site per workspace initially, created on demand; unique site identity remains independent of its address |
| Public address | Initially publish at `https://tar-sites.<account>.workers.dev/<slug>/` without a purchased domain; configured platform subdomains and customer domains can be added later |
| Custom domain | Connect verified customer domains later; choose one primary address |
| Main editing unit | **Section**: a meaningful region of a page; a card is only a visual treatment |
| Design freedom | Flexible composition from typed elements, layouts and reusable components; section purpose does not fix its appearance |
| Source of truth | One versioned, typed site document; generated HTML/CSS are release outputs |
| AI responsibilities | LLM creates; vision LLM inspects renders; Jev makes narrow judgments; code validates and executes |
| Publication | Generation saves a draft. An authorized Publish action promotes the exact reviewed candidate |
| Simplicity | One editor, one document model, one compiler, one shared serving system |

```text
Workspace facts + user brief + design reference + approved assets
                              |
                         Site agent
                              |
                    Typed, editable draft
                              |
                 Compile -> render -> check
                              |
                     Reviewed candidate
                              |
                           Publish
                              |
             workspace.platform.domain / customer.domain
```

"Agentic" means the agent can plan, compose, inspect and make bounded repairs
through registered tools. It does not mean an AI call on every visitor request
or autonomous changes to prices, policies and the live site.

## 2. A small, expressive vocabulary

| Term | Meaning | Example |
| --- | --- | --- |
| Design | The site's visual language and composition rules | editorial, warm, spacious |
| Token | A named design value | `color.accent`, `type.body`, `space.section` |
| Node | A typed semantic element with layout and style | heading, image, grid, link |
| Component | A reusable node composition with slots and variants | navigation, product tile, footer |
| Section | An editable page region containing nodes/components | introduction, story, collection |
| Page | A route, metadata and ordered sections | home, services, product detail |
| Binding | A declared connection to permitted workspace data | public products into a collection |
| Journey | A visitor interaction backed by registered Actions | enquiry, order, booking |
| Release | Immutable files and manifest built from a frozen revision | the version visitors see |

Do not add a second overlapping concept called "blocks". Simple users work with
pages and sections; detailed controls expose components and elements as needed.

```text
site
 +-- schema / version / locale / timezone / currency
 +-- brief / design / assets / components / policy
 +-- pages[]
 |    +-- id / path / title / metadata
 |    +-- sections[]
 |         +-- id / purpose / layout / nodes[] / bindings[] / actions[]
 +-- journeys[] / redirects[]
 +-- live -> immutable release (read from publication authority)

node = id + kind + props + style + children + optional component reference
```

New internal fields and identifiers use one lowercase semantic word; structure
supplies qualification. Existing interfaces such as `baseVersion` and
`currentRelease` remain supported through adapters until a deliberate migration.
The sketch is a target model, not an instruction to rename current interfaces.

## 3. Turn design.md into a real design system

Each site's **design.md** is the readable import/export view of `site.design`.
The attachment demonstrates the format; it is not a universal Figma theme.
Store the original reference and its hash for provenance. Parse it into a
proposed typed design, resolve conflicts, then save the chosen design revision.
Editing or reimporting Markdown produces a diff against that revision; Markdown
and JSON never become two independently editable sources of truth.

| Design area | Capture |
| --- | --- |
| Direction | audience, purpose, voice, density, distinctive composition idea |
| Foundations | semantic colors, typography, spacing, shape, surfaces, elevation |
| Layout | widths, grid/flex rules, alignment, overlap, responsive behavior |
| Components | anatomy, slots, variants, hover/focus/disabled/error states |
| Imagery | subject, crop, aspect ratio, focal point, asset source and rights |
| Motion | trigger, duration, easing and reduced-motion fallback |
| Guidance | examples, preferences, explicit exceptions and locked choices |

For the attached reference, useful starting values include white canvas, black
text, `#4d49fc` accent, light display type, 4px spacing increments and generous
section spacing. These apply only when that direction is selected. A restaurant,
portfolio or industrial supplier can choose a completely different language.

| Reference issue | Import resolution |
| --- | --- |
| Tags use both 8px and 50px radius | Record the conflict; choose named variants or one consistent default |
| Buttons use both 50px and 9999px | Normalize the intended pill behavior |
| A "three-tier" radius description lists four values | Normalize to four semantic roles |
| 16px minimum conflicts with a 14px creator label | Set an explicit readable type policy and exceptions |
| Figma fonts, logo and example designs | Use workspace assets or suitable licensed substitutes; do not copy brand identity |

User decisions govern aesthetic preferences; accessibility and security checks
remain enforced. Imported text cannot grant permissions, enable journeys, run
scripts or instruct the agent to publish. Missing design input produces a
coherent editable design from the brief, with assumptions shown.

## 4. Design freedom without a code generator per site

| Capability | Representation |
| --- | --- |
| Layout | flow, flex, grid, stack, bounded overlap, alignment, width and aspect ratio |
| Content | headings, rich text, images, video, icons, lists, links and buttons |
| Responsive design | fluid values plus explicit small/medium/large overrides; intrinsic wrapping between them |
| Visual styling | tokens plus validated local overrides, backgrounds, borders, gradients and masks |
| Reuse | shared components with slots; instance overrides and impact preview for shared edits |
| Content pages | typed collections and one detail-page template per collection; pagination and empty states |
| Interactions | registered menu, tabs, accordion, gallery, search, form and commerce components |
| Motion | declarative transitions/reveals with a small tested runtime and reduced-motion behavior |

The LLM can create a new composition, not merely choose a preset hero. It can
save successful compositions as reusable components. Templates are optional
starting points. Unknown behavior requires a tested renderer extension; arbitrary
JavaScript, package installation and generated backend code are outside this
model. Advanced 3D, unrestricted plugins and application building are later
extensions, not hidden promises of the first release.

The compiler owns semantic HTML, escaped content, validated CSS properties/values,
safe URL protocols, security headers and the interaction runtime. It validates
component references, cycles, depth and size limits. Isolated editor preview and
production use the same compiler.

## 5. User experience

```text
Workspace / Site                  Draft saved       Preview   Publish
+------------------+--------------------------------+--------------+
| Pages            |                                | Selected     |
|   Home           |         Real page preview      | section      |
|   Services       |                                |              |
|   Contact        |   Select, edit, move, replace   | Content      |
|                  |                                | Layout       |
| Design / Assets  |   Phone / Tablet / Desktop      | Style        |
+------------------+--------------------------------+--------------+
| Ask: "Make this warmer, keep the logo and simplify the first page" |
+------------------------------------------------------------------+
```

On small screens these controls become drawers. Show the workspace identity,
draft/live state, autosave status and undo at all times.

| Step | User experience |
| --- | --- |
| Start | Describe the goal; optionally supply design.md, references and assets. Reuse only selected public workspace facts |
| Generate | Choose one strong direction by default; show pages, assumptions and missing essentials; alternatives are available on request |
| Refine | Select a section and ask for a change, or directly edit text, images, spacing and order; generate illustrative assets when useful, never fake product evidence |
| Review | Open every route at real device sizes; see unresolved issues and a change summary |
| Publish | Confirm the candidate and address; receive a working HTTPS URL and release history |
| Maintain | Edit a new draft, refresh approved data, connect a domain or restore a release |

Default pages follow the purpose and available content. A portfolio needs work
and contact; a shop needs collection/detail pages; a service business may need
services and enquiry. Preserve the current four-page generator as a fallback,
not as a mandatory structure for every site. Omit unsupported proof sections.

Edits target stable ids and a base revision. Locking a logo, section or token
protects it from unrelated regeneration. Shared changes show affected pages.
Stale patches conflict instead of overwriting newer work; undo creates a new
revision. Resolving an ambiguous target may require one short question.

## 6. LLM + Jev + code

| Work | Owner | Output |
| --- | --- | --- |
| Interpret brief/reference and devise composition | capable LLM | typed design and page plan |
| Compose sections, grounded copy and targeted edits | LLM | proposed typed draft or patch |
| Inspect screenshots, hierarchy and responsive appearance | vision LLM + browser checks | localized defects and proposed repairs |
| Resolve "change this" among known sections | Jev Choice, only when ambiguous | target or no-match |
| Rank supplied layouts/assets by brief relevance | Jev Score per candidate | reusable preference scores |
| Check one prose claim against supplied evidence | Jev Choice | supported, contradicted or unsupported |
| Detect one semantic issue, such as omitted requested content | Jev Noul | probability of that issue |
| Permissions, exact facts, schemas, prices, domains, publication | code | deterministic decisions and commits |

### How Jev changes the site JSON

The video shows a user progressively changing a product hero with prompts such
as "split panel, black bg, lime accent" while the builder retains other choices.
Apply that same interaction to any page or section. Jev does **not** write an
entire site JSON object: it returns typed judgments from which code builds a
small, reviewable JSON patch.

| Step | Owner | Result |
| --- | --- | --- |
| Load | Code reads the selected section, design tokens, approved assets, locks and current revision; Jev selects the target first if it is ambiguous | Only valid, unlocked targets and options are offered |
| Understand | Exact named options resolve in code; Jev interprets ambiguous intent and selects from available options | Choice per editable property, including `keep` or `none`; several changes can be chosen in one request |
| Create | LLM writes new copy or composition only when the request needs it | Proposed text or new typed nodes, grounded in approved facts |
| Apply | Code maps the answers to a patch, checks locks, schema, contrast, asset rights and revision | Updated draft JSON; unaffected fields stay unchanged |
| Show | Compiler renders that draft and the UI shows its diff/preview | No publish until the user approves a candidate |

For example, the current `hero` may use a red background and `spotlight`
layout. The video-like request can become this patch after allowed values are
selected; `photo` is preserved because the request did not change it:

```json
{
  "base": 12,
  "target": "hero",
  "set": {
    "layout": "split",
    "background": "black",
    "accent": "lime"
  }
}
```

Jev can choose `split` from available layouts or rank suitable product photos
using their text descriptions. It cannot invent the text of a new headline such
as "The Holiday Edit Has Arrived"; the LLM writes that when requested, and code
adds it to the same patch. If the user locks `layout`, code excludes it before asking Jev
and rejects any patch that tries to change it. Explicit words such as "black bg"
need no Jev call when they map unambiguously to an allowed token. A request like
"make it feel more energetic" benefits from Jev choosing among the site's
existing directions, while a genuinely new composition goes to the LLM.

Initial generation follows the same split: an LLM proposes the full typed draft;
Jev can select or rank candidate directions, layouts and assets, and check
whether generated claims match supplied facts. Code alone accepts valid JSON and
commits the draft. For live editing like the video, debounce after a typing pause
or submit, discard responses for stale revisions, and cache unchanged decisions.

Jev accepts text/JSON state, not screenshots; it does not generate layout or
copy. Give it asset descriptions or measured render observations when useful,
and send actual images to a vision model. [TypeSafe state documentation](https://docs.typesafe.ai/concepts/state)

Ask independent narrow questions together. Only make a dependent call after its
required state exists. Choice/Score confidence describes distribution
concentration; Noul is the probability of yes and has no separate confidence.
Evaluate thresholds on our briefs, languages and failure costs. Include no-match
where appropriate; a low-confidence harmless style preference need not block a
draft. [Primitives](https://docs.typesafe.ai/primitives), [confidence](https://docs.typesafe.ai/confidence)

Exact amounts, addresses and quotations are copied/validated from sources in
code. Semantic claims use evidence checks; one serious unsupported claim cannot
be averaged away by good design scores. Review or remove unresolved claims.
Model judgments never authorize publication or commerce.
[Citation verification pattern](https://docs.typesafe.ai/cookbooks/citation_check)

## 7. One bounded agent workflow

```text
brief -> facts/assets -> LLM plan + Jev selections -> typed draft
                                                  |
                    +-> compile -> render -> checks
                    |                          |
                    +--- bounded repair <------+ fail
                                               |
                                              pass
                                               |
                   candidate -> human preview -> publish
```

| Control | Rule |
| --- | --- |
| Tools | Existing authorized reads/Actions plus typed design, edit, compile and inspect operations |
| Facts | Carry record/version/evidence references; keep private workspace data outside public drafts and model context |
| Checkpoints | Persist phase, input revision, outputs and usage; cancel and resume without repeating committed effects |
| Concurrency | Commit patches with revision checks; stale jobs cannot publish over newer work |
| Budget | Start with one direction and at most two repair passes; configurable token, image, time and money limits |
| Repair | Fix the failing section; regenerate a whole site only for an explicit redesign |
| Failure | Keep the last valid draft/live release; show the precise unresolved issue and a retry/manual path |
| Outage | Editing and serving remain usable without AI; failed AI review is recorded as incomplete |

Use a capable model for the first design and difficult repairs; a smaller model
may handle bounded copy edits after evaluation. Do not make the cheapest model
the quality ceiling. Cache by workspace, evidence revision, model and question
version. Reuse stable judgment scores and compile only affected dependencies.
Use durable jobs for long work, reusing the harness before adding infrastructure.

## 8. Publishing and hosting

Deploy one shared **Sites Worker** for all public sites, separate from
`tarharness`. `tarharness` keeps the editor APIs, AI jobs, compiler, Gateway and
publish Actions. The Sites Worker handles only verified public hosts, published
files and declared visitor routes. Do not create a Worker, repository or hosting
project for each workspace. Cloudflare can route customer hostnames to this
shared Worker. [Worker origin documentation](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/worker-as-origin/)

The initial deployment uses the shared Workers.dev host with a workspace path.
CONTROL resolves that exact host plus workspace slug before reading a release.
Do not try to create wildcard workspace subdomains beneath Workers.dev. Keep
the same publication gates when a configured primary domain replaces this
initial address, and compile a new candidate for its changed canonical URL.

| Worker | Responsibility | Bindings |
| --- | --- | --- |
| `tarharness` | Private drafts, generation, preview, compile, publish and commerce authority | Workspace Turso, AI, CONTROL D1, R2, Gateway |
| Sites Worker | Public hostname lookup, serving gate, release files, redirects and visitor entry points | CONTROL D1, `SITE_RELEASES` R2, narrow service binding for public Actions |

Keep private workspace storage and AI credentials out of the Sites Worker. Put
approved public media behind its release manifest. A visitor Action goes through
a narrow internal service binding to the existing Gateway, which checks current
policy and commerce state. Cloudflare service bindings support Worker-to-Worker
calls without a public URL. [Service binding documentation](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)

```text
tarharness: draft -> compile -> R2 candidate -> D1 activation
                                           |
DNS + TLS -> Sites Worker -> CONTROL D1 -> release files in R2
                  |
                  +-> visitor Action -> tarharness Gateway
```

| Publication stage | Required behavior |
| --- | --- |
| Freeze | Capture source revision, design, public data snapshots, assets, compiler/runtime versions, primary host and visibility epoch |
| Build | Write HTML/CSS, required interaction code, sitemap, robots, metadata and hashed assets under an immutable release key |
| Verify | Validate all routes and files; store manifest, checks and candidate hash; preview this exact candidate |
| Promote | Gateway verifies publish permission; one CONTROL D1 transaction checks membership, candidate identity/epoch, host readiness and expected live generation, then activates with audit/idempotency |
| Roll back | Select a retained valid release compatible with the current primary host and public-data permissions |
| Unpublish | Clear live authority; service-controlled requests/caches stop serving it; already downloaded content cannot be recalled |

**CONTROL D1 is the sole publication authority:** host ownership, serving state,
primary address and live release. Turso owns drafts and business facts. Publishing
identifies the reviewed candidate revision, not whichever draft happens to be
latest; newer edits remain a draft and the UI makes that distinction visible.
Compare the expected live generation to prevent competing publishes overwriting
one another. Workspace publication history is a retryable projection, never a
second live pointer. No transaction spans D1, Turso and R2.

Read host + serving state + live pointer together from the D1 primary before
serving cached files; static requests need no workspace database connection.
Use primary reads, not unconstrained replicas, for this authority check.
This costs a metadata round trip; measure it before introducing any bounded
staleness scheme. [D1 consistency documentation](https://developers.cloudflare.com/d1/best-practices/read-replication/)

Pin asset/runtime URLs to the release so a page already loaded cannot mix files
from different versions. Cache immutable bytes by workspace/site/release/path;
revalidate public HTML and never cache preview or private responses. Unknown
hosts and paths return real errors, not another workspace or the home page.
Public routing serves only manifest-approved public files, never source snapshots,
job logs or the draft document stored alongside release data.
Preview is authenticated or uses expiring scoped access, with `noindex` and
`no-store`; obscurity and `noindex` alone do not protect it.

**Refresh must rebuild from the published source revision.** It must not promote
unpublished draft edits. Automatic refresh may update only explicitly approved
data bindings; new narrative/design still needs normal review. Rollback restores
appearance and content snapshots, never old stock, prices or payment state.
After a primary-domain change, restoring older content with incompatible canonical
URLs requires a new candidate under the current host; preserve the old release.

## 9. Addresses and custom domains

| Stage | Behavior |
| --- | --- |
| Platform subdomain | Reserve a unique normalized slug, protect system names, route the site wildcard to the Sites Worker and provide valid TLS coverage |
| Domain requested | Check publish permission, reserve the exact hostname globally and issue a workspace-bound ownership challenge |
| Verifying | Show exact DNS instructions; verify ownership, provider hostname activation, certificate activation and DNS target |
| Active | Serve the same site; aliases redirect to its chosen primary host with paths and permitted query parameters preserved |
| Primary changes | Build canonical URLs/sitemap for the new host, then promote primary + release together in CONTROL D1 |
| Failed/removed | Preserve the last usable address; disable mapping before cleanup; require fresh verification for reassignment |

Cloudflare hostname status and certificate status must both be active, with DNS
pointing to the SaaS target. A successful TLS handshake alone is insufficient.
[Onboarding checks](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/getting-started/)

Support `www.customer.com` via CNAME first. Apex domains need compatible DNS
flattening or separately provisioned apex proxying; show the supported path,
never invent a universal A record. Configure provider entitlements and costs
before exposing the option. [Apex support](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/apex-proxying/)

DNS provisioning and publication span external systems: use idempotent
pending/active/removed steps with reconciliation. Periodically check domain and
certificate failures. Reserve removed platform slugs against immediate takeover.
Route customer hosts to the Sites Worker while keeping app/API hostnames on
their existing routes. Isolate app cookies to the app host and public sites
from privileged app routes.

## 10. Data, content and commerce

| Data class | Site behavior |
| --- | --- |
| Authored copy and media | Versioned release content, with provenance and approved public visibility |
| Collections | Shared workspace records for products, services, articles or projects; public projections and reusable detail templates |
| Price and availability | Declared fresh binding; displayed snapshots are informational; server revalidates on every transaction |
| Enquiry | Validated public form -> registered Action -> workspace record -> authorized Inbox |
| Order | Existing order Actions resolve price/tax/stock and reserve atomically; retry key prevents duplicate effects |
| Payment | Verified payment adapter/webhooks; no payment success based on browser redirects or AI output |
| Booking | Domain availability rules and conflict checks, then the shared order/payment lifecycle where applicable |
| Account/status | Authenticated visitor reads only their authorized records; never embedded into static releases |

Public bindings allowlist both records and fields; publishing a workspace site
does not expose workspace membership or private records. Every binding defines
freshness, pagination, loading, empty and error behavior. A failed stock/booking
check cannot silently become availability. Resolve effective prices through the
commerce kernel, including date and channel; schema support for freshness alone
does not implement live data.

For public-access revocation, first block the affected site and increment its
`epoch` in CONTROL D1, then update source permissions and rebuild. Reactivate only
a verified candidate with the current epoch. Old candidates/releases cannot
bypass this through rollback; failures stay blocked and retryable. This coarse
withdrawal is simpler than per-route revocation. Managed media and HTML use private
R2 through the same serving gate. Ordinary price edits use the freshness contract.
Public Actions derive workspace/site from verified host context, never visitor ids.
Site withdrawal does not stop verified payment webhooks or workspace fulfilment.

Sites feed the whole commerce cycle: enquiry/order -> fulfilment -> invoice ->
payment -> refund/status. Purchasing, receiving, stock and accounting remain in
the shared kernel; domain additions supply restaurant, taxi, service or other
rules. The site never maintains a second inventory or ledger. Journeys stay
disabled until identity, abuse controls, policy and adapters are configured.
The Gateway rechecks current policy even for an old release or open browser tab.

## 11. Quality that can be checked

| Area | Release check |
| --- | --- |
| Distinctiveness | A clear direction, considered type, relevant imagery and varied page rhythm; no automatic hero/three-cards/testimonials sequence |
| Visual finish | Browser renders at 360, 768 and 1440px plus intermediate-width checks; inspect overflow, clipping, hierarchy and long content |
| Accessibility | Semantic structure, readable contrast, keyboard/focus behavior, form labels/errors, alt text and reduced motion; manual checks supplement automation |
| Content | No fabricated reviews, credentials, addresses, prices or claims; missing assets have intentional states |
| Functionality | Every route, navigation link, declared interaction and enabled journey works; failures are understandable |
| SEO | Titles/descriptions, canonical host, sitemap, robots, social image, real 404s, redirects and factual structured data |
| Performance | Responsive images, explicit dimensions, selective font loading, minimal JS and lazy loading below the fold |
| Isolation | No private data in files/source maps; no cross-workspace asset, host, binding or action access |

Measure real-user p75 targets of LCP <= 2.5s, INP <= 200ms and CLS <= 0.1,
separately for mobile and desktop. Use lab budgets before launch and field
monitoring after traffic exists; lab checks cannot guarantee field results.
[Core Web Vitals](https://web.dev/articles/vitals)

Browser/compiler/security failures block publish. Subjective aesthetic feedback
is a visible recommendation, not an unexplained score veto. Compare representative
sites with human-reviewed examples across commerce, services, editorial and
portfolio use cases. Record recurring defects and user correction rates. No
schema or model can guarantee "100% perfect" design; these checks define done.

## 12. Storage, operations and cost

| Store | Contents |
| --- | --- |
| Workspace `records` | Site draft, revision history, release metadata, permissions and job references; reuse existing records infrastructure |
| CONTROL D1 `hosts` / `sites` | Unique hostname ownership and canonical workspace/site association; serving state, primary host, epoch, live release and activation audit |
| `SITE_RELEASES` R2 | Immutable release files, manifests and retained source snapshots |
| Existing content R2 | Approved media, source references and long content; object hash, size, type and provenance |
| Existing commerce records | Canonical catalog, prices, stock, orders, invoices, payments and postings |

Keep nodes, components and sections inside the document; do not create tables
for every visual element or industry. Persist revision history without an
unbounded release array inside one frequently updated record. Large snapshots
can live in R2 with record references. Retention protects live/rollback releases;
garbage collection removes abandoned candidates and unreferenced assets after a
grace period. Backup and restoration must cover records and referenced objects.

| Operational need | Minimum control |
| --- | --- |
| Imported content | Size/type limits, safe media handling, URL fetch restrictions and inert reference text |
| Visitor writes | Rate limits, input validation, origin/auth checks, spam protection and idempotency |
| AI spend | Per-job budget and usage ledger; provider/model versions; no ordinary visitor AI calls |
| Publishing recovery | Audited candidate/promote events; retry without duplicate publication; reconcile orphaned files |
| Health | Build failures, host/TLS state, broken routes, journey errors and performance metrics |
| Privacy | Minimal analytics, redacted logs, explicit tracker settings and retention for enquiry data |
| Limits | Configured page/node/media/build quotas, visible before expensive work begins |

Cost per site = generation/edit usage + compile/render work + stored bytes +
delivery/metadata reads + enabled domain services. Measure actual latency and
cost before setting plans; do not promise fixed generation time or free scale.

## 13. Delivery order and acceptance

The current foundation is useful but much narrower than this target:

| Current implementation | Change required |
| --- | --- |
| [Schema](tarharness/src/site/schema.ts) and [renderer](tarharness/src/site/renderer.ts): fixed card families/themes | Expressive nodes, richer design tokens and reusable compositions |
| [Generation and release store](tarharness/src/site/store.ts): fixed draft, publish rebuilds, refresh uses draft | LLM composition, exact candidate promotion and refresh from the published revision |
| [Site UI](tarapp/src/components/site.tsx): basic description updates | Real page preview, selection, scoped edits, assets and history |
| [Harness configuration](tarharness/wrangler.jsonc): CONTROL D1, queues, workflows and R2 already exist | Reuse it for site jobs and publishing; deploy one public Sites Worker for hostname routing and release serving |

| Stage | Deliver | Done when |
| --- | --- | --- |
| 1. Foundation | v2 document, design import/export, expressive nodes, shared compiler, explicit v1 adapters | Existing sites still serve; the reference becomes editable typed design; different compositions require no new generator |
| 2. Creation | bounded LLM/Jev workflow, scoped JSON patches, browser/vision checks, page/section editing, assets, history and locks | A brief produces a complete responsive draft; focused edits preserve unaffected work; failed jobs recover |
| 3. Launch | Shared Sites Worker, CONTROL publication authority, exact candidates, safe refresh, private previews, subdomains, rollback, unpublish and SEO | Two workspaces publish independent HTTPS sites; a conflict/outage leaves the previous release intact |
| 4. Domains and content | verified custom domains, primary redirects, collection/detail pages and updates | Domain activation/removal/reassignment is safe; catalog refresh cannot publish draft edits |
| 5. Transactions | enable tested enquiry/order/payment/booking journeys where adapters exist | Retry, payment verification, permissions, stock/availability races and Inbox routing pass end to end |

Stages 1-3 are the first usable release, with the quality checks above included.
Stages 4-5 complete domain and commerce capabilities without changing the core
model. A static site remains useful while transactional capabilities are being
enabled. Locale/direction-ready fields belong in v2; translation workflows,
advanced animation, experiments and third-party component marketplaces follow
actual demand, rather than complicating the first editor.

Migration preserves old releases and public URLs. Convert v1 `cards` into v2
sections through a versioned adapter; keep old schema/compiler support for
retained revisions. Migrate `currentRelease` once to CONTROL authority; the legacy
field becomes a compatibility projection. Enforce one site per workspace through
unique allocation, including concurrent creation. Do not mass-regenerate published
sites. Preserve the existing `/v1/sites/:slug/*` links through a compatibility
route while published URLs move to the Sites Worker. Before launch, test
cross-workspace access, stale edits, interrupted builds,
refresh isolation,
rollback with release-pinned assets, domain takeover, missing data and narrow
screens using representative fixtures and browser checks.
