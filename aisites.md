# AI Sites

Create, edit and publish responsive sites through Tar chat.
Target plan; the complete live editor is still being built.
[Space](space.md) owns private work; [Commerce](commerce.md) owns business truth.

## 1. End-to-end architecture

```text
Tar: brief / selected page or section / prompt
                       |
tarharness: current document + design-system capabilities
                       |
        Code exact edits / Jev decisions / LLM creation
                       |
          ONE typed edit -> validate -> save + history
                       |
          ONE renderer -> private draft preview + Undo
                       |
          freeze -> compile/check -> review -> Publish
                       |
          immutable R2 release + CONTROL live pointer
                       |
          Sites Worker -> public pages
                       |
          visitor Action -> Gateway -> Commerce / Inboxes
```

One controller, design system and rendering path for prompts and taps.
Reuse the harness, Jev/Workers AI adapters and jobs; call only required models.
Code owns authority and execution. Page visits use no AI.

| Project area | Site work |
| --- | --- |
| `sites/core/` (planned) | Design system, document, edit registry, validator, renderer |
| `sites/src/` | Public Worker: verified serving and visitor Action forwarding |
| `sites/test/` | Engine and delivery checks |
| `sites/wrangler.jsonc` | Worker configuration |
| `tarharness/src/site/` | Facts/assets, AI, saves, private preview, publication |
| `tarharness/src/gateway/` | Authorized Actions and commerce rules |
| `tarapp/src/components/site.tsx` | Selection, chat, assets, preview, undo, Publish |
| `tarapp/src/lib/harness.ts` | Authenticated API client |

```text
Turso       drafts / history / jobs / commerce
CONTROL D1  unique slug / verified host / access epoch / live pointer
R2          approved assets / immutable releases / retained sources

NOW:        https://tar-sites.tar-54d.workers.dev/<workspace>/
EXAMPLE:    https://tar-sites.tar-54d.workers.dev/studio/
NEXT WEEK:  verified domain -> same Worker -> same site
```

One site per workspace; one Worker serves all. Reserve stable unique workspace
slugs, handle collisions/reserved names, and preserve them on display-name edits.
Keep `workers_dev` enabled and `SITE_WORKER_ORIGIN` configured; routes/assets/SEO
respect the workspace prefix. Domain purchase does not block launch.

## 2. Design system + one document

```text
DESIGN SYSTEM
tokens + composable elements/components + responsive defaults
                       |
SITE DOCUMENT
design / assets / components / locks / policy / revision
 +-- pages: routes / metadata
      +-- sections
           +-- text / images / buttons / forms
           +-- nested grids / rows / stacks
           +-- styles / mobile overrides / data / Actions
```

Shared tokens/components give consistent defaults; local overrides allow varied
designs. The registry defines insert/remove/move/group/resize/style/mobile edits
and their valid values. Jev chooses operations; code assembles the structure.
Combine them to create layouts without a template for each appearance.

The document stores the chosen design; HTML/CSS are generated output.
The registry serves tap controls, Jev and validation. LLMs compose its elements;
new behavior needs a tested renderer extension. Use single-word lowercase internal
names; preserve existing API names.

## 3. Editing and design.md

```text
Code  exact supplied text/colors/sizes/assets; validate and execute
Jev   interpret supported structural, style and mobile changes
LLM   create original copy, design or unfamiliar compositions

selected scope + prompt + current state + allowed capabilities
  -> required interpretation -> ONE edit -> preview + save + Undo

element prompt -> element        section prompt -> section
page prompt    -> selected page  explicit site-wide -> shared design
```

Preserve content, identities, locks and explicit mobile rules; otherwise use
responsive defaults. Show shared-edit impact. Apply clear edits with Undo;
ask once for unclear targets. Jev gets relevant state and keep/none options.
Batch independent questions; dependent decisions need updated state.
Code copies exact values; Jev selects options rather than generating content.

New compositions go directly to the LLM for scoped edits through the same
capabilities. Preserve existing content; show progress for slow generation.
Bound the work and evaluate uncertainty on real editing requests.
[Building guide](https://docs.typesafe.ai/concepts/how-to-build-with-system-one),
[function calling](https://docs.typesafe.ai/cookbooks/function_calling).

`design.md` is optional guidance. Jev selects from descriptions/tokens/layouts;
images need text descriptions.

```text
Example catalog: calm.md / bold.md / editorial.md / none
"Quiet photography portfolio"
  -> Jev selects calm -> load cached validated design -> site.design
  -> LLM composes pages -> draft preview

site.design -> export current design.md
```

Parse/cache references by hash; use an LLM for free-form conversion. Retain the
source; `site.design` stays authoritative. Manual selection bypasses Jev; none
allows new LLM design. Ongoing edits use the full loop.

## 4. Simple editor

```text
MOBILE TAR                     DESKTOP DRAFT VIEW
+---------------------------+  +------------------------------+
| Studio / Site   Saved r12 |  | Home / Hero   Draft r12       |
| [Open live ->] [Publish]  |  | Click a section to select it |
| [Home v] [Hero v]         |  |                              |
| You: Image left...        |  |      live draft preview      |
| Tar: Updated. [Undo]      |  +------------------------------+
| [Preview] [Assets]        |
| [ Describe change ][Send] |
+---------------------------+

phone chat -> saved revision -> paired private browser preview
same phone -> Preview sheet -> return to preserved chat
Open live  -> external published site
```

Start with a brief and approved facts/assets. Selection/assets/undo/Publish are
taps; details open on demand. Pair desktop via an authenticated expiring QR session.
Preview follows saved revisions and preserves route/scroll; selection grants no
permission. Start with revision checks.

## 5. Fast changes: end to end

```text
Selected: Home / Hero r12; approved studio image
"Two columns, image left, text right. Write 'Welcome to our studio'.
 Blue background #123456, white text, more breathing room."

1. Code copies the exact values and selected asset.
2. One Jev call: layout=split, image=left, spacing=airy.
   Options come from the registry; each includes keep/none.
3. Code builds one edit; default mobile order is image then text.
4. Validate scope/locks/r12 -> save r13 -> redraw affected preview.

DESKTOP                             PHONE
+--------------------------------+  +----------------------+
| BLUE BACKGROUND                |  | IMAGE                |
| +----------+-----------------+ |  +----------------------+
| | IMAGE    | Welcome to      | |  | Welcome to our studio|
| |          | our studio      | |  +----------------------+
| +----------+-----------------+ |
+--------------------------------+

"Swap sides"                   -> Jev + code -> same loop
"Three service columns"         -> Jev + code -> grid + mobile rules
"Move FAQ above Contact"        -> Jev + code -> page section order
"Create an original story page" -> LLM + code -> same document/renderer
Publish -> checked candidate -> public Worker URL
```

Known edits need no deployment or full-site rebuild. Redraw affected sections
and shared dependencies; "instant" means fast visible feedback, measured from
input to preview. New copy/images take longer.

Serialize saves with request identity/base revision; discard stale responses.
Show pending versus saved; failed saves retain the last accepted state.
Undo creates a revision. Cache by workspace/state; AI failure preserves draft/live.

## 6. Publish, data and commerce

```text
freeze revision + facts + assets + address + epoch + renderer
  -> compile/check all routes -> exact candidate preview -> Publish
  -> immutable R2 files -> atomic CONTROL activation
```

| Rule | Contract |
| --- | --- |
| Publish | Exact checked candidate and unchanged reviewed draft; CONTROL atomically compares live generation/host/epoch. Audit, deduplicate and reconcile cross-store projections |
| Serve | Check CONTROL primary authority before cached files; verified routes/release files only, with real 404s |
| Preview | Private scoped access; isolated renderer, no-store/noindex; same rendering as live |
| Public data | Approved facts/fields/assets only; never invent prices, proof or availability. Refresh published source while preserving draft edits |
| Commerce | Registered Gateway Actions with identity/policy, abuse checks and idempotency. Recheck price/stock/availability; verified webhooks establish payment |
| Recovery | Rollback preserves current access/business truth; unpublish/revocation blocks serving first. Retain live/rollback assets |
| Domain later | Verify ownership/DNS/TLS and review the new canonical candidate before switching. Keep Worker address until ready; redirect equivalent routes and protect retired addresses |

Reuse the full [Commerce](commerce.md) cycle; configure journeys before enabling.
Publish checks all routes at phone/tablet/desktop widths: safe content, responsive
layout, keyboard/contrast, links/forms, factual evidence, asset rights and
canonical/sitemap/robots metadata. Blocking defects stop publication.
Keep quotas, bounded repair, cancellation/resume, backups and failure/latency monitoring.

## 7. Delivery and acceptance

| Order | Deliver | Done when |
| --- | --- | --- |
| 1. Editor | Extract `sites/core/`; design system + Jev edits, selection, chat, private preview | Nested layouts, page order, styles/mobile rules, locks, stale/failed saves and undo work |
| 2. Creation | Design references and grounded LLM composition | Varied briefs create responsive editable pages; jobs cancel/resume |
| 3. Launch now | Checked candidates on unique Workers.dev paths | Two isolated sites; routes/assets/SEO, collisions, refresh/rollback/unpublish pass |
| 4. Expansion | Verified domains, richer data and configured journeys | Domain transitions and commerce retries/races pass end to end |

Current Ask mainly proposes style edits with Apply; the broad live loop is pending.
Preserve existing sites/releases during extraction; run harness/app/Worker checks.
