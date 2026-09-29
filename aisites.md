# TAR Sites

| Purpose | Contract |
| --- | --- |
| System | One JSON document; Tar chat edits it, renderer previews it, compiler publishes it |
| Status | Target plan; full live editor pending |
| Ownership | [Space](space.md): private work; [Commerce](commerce.md): business truth |

## 1. Architecture

```text
1 USER      brief / prompt / uploads
2 ROUTER    Builder handles exact edits; Picker/Writer when needed
3 CATALOG   design system + allowed operations/values
4 DOCUMENT  site.json: brand + frame + pages + facts
5 DATA      approved DB facts + stored assets
6 BUILD     validate -> save -> render private preview
7 HISTORY   retained revisions; Undo creates a NEW revision

Edit    -> JSON patch -> validate/save -> preview + Undo
Publish -> freeze/check/review -> HTML/CSS/registered JS/assets -> public site
```

| Role / rule | Work |
| --- | --- |
| Builder: code | Route, copy exact values, bind data/actions, validate, save, render, publish |
| Picker: Jev | Prompt + current state -> supported layout/style/mobile choices |
| Writer: LLM | Original copy/brand; compose catalog blocks when needed |
| Shared engine | One catalog, validator, renderer and edit path for prompts/taps |
| Model boundary | Decisions/content; no invented business facts, authority or executable site code |
| Public visits | No AI calls |

Jev: [typed decisions](https://docs.typesafe.ai/concepts/system-one) ->
[code dispatch](https://docs.typesafe.ai/cookbooks/function_calling).

## 2. Vocabulary and catalog

| Term | Meaning |
| --- | --- |
| `brand` | Shared color, type, spacing and shape tokens |
| `frame` | Optional topbar + nav + footer |
| `page` | Route, metadata and ordered sections |
| `section` | Stable editable region with layout and blocks |
| `layout` | Containers, columns, ratio, alignment and height |
| `tone` | Color variant: light, dark, accent |
| `block` | Content, interaction or nested container |
| `slot` | Named position within its parent layout |
| `style` | Appearance and mobile overrides |
| `fact` | Approved DB/source binding; DB owns business truth |
| `action` | Registered order/book/contact/local behavior |
| `recipe` | Editable reusable block composition |
| `asset` | Approved stored image/video/illustration |
| `catalog` | Capabilities, valid values, defaults and rendering rules |
| `rev` | Saved document revision |

```text
brand + frame + pages + facts
                 |
              sections
                 +-- Layout: nested grids / rows / stacks
                 +-- Blocks: text / images / buttons / forms...
                 +-- Slots: background / left / center / right / bottom...
                 +-- Styles + mobile rules
```

| Capability | Choices / rule |
| --- | --- |
| Blocks | Heading, text, buttons, image, video, cards, quote, logos, stat, tabs, input, list, form, registered widget |
| Styles | Color, type, size, spacing, crop, highlight, motion |
| Edits | Insert, remove, move, group, resize, restyle, mobile |
| Composition | Recipes are starting points; nested blocks + local token overrides |
| Document | Picks + literal values/content + references; versions, stable IDs, locks, policy, revisions |
| Validation | Check combinations, permissions, facts and limits |
| Extensions | New behavior needs a tested catalog/renderer extension |
| Naming | Single-word lowercase internal names; preserve APIs with versioned adapters |

## 3. Live editing

```text
scope + prompt + current JSON + authorized catalog/data
  -> Builder / Picker / Writer as needed
  -> ONE validated edit -> save revision -> redraw affected preview
```

**Jev example: selected Hero section**

```text
Before: image above text; tight spacing

You: "Image left, text right, more breathing room.
      Keep the heading unchanged."

Jev choices:
  layout -> two columns
  image  -> left
  text   -> right
  space  -> airy

Builder -> patch Hero JSON -> preserve heading/locks -> validate/save
Renderer -> update private draft:

Desktop                         Mobile default
+-----------+----------------+  +----------------+
|           | SAME HEADING   |  | IMAGE          |
| IMAGE     | Text           |  | SAME HEADING   |
|           | [Button]       |  | Text [Button]  |
+-----------+----------------+  +----------------+

Undo -> new revision restoring previous design
Publish -> reviewed design becomes public
```

| Editing rule | Behavior |
| --- | --- |
| Jev input | Text/JSON state and described options/assets; no image inspection |
| Calls | Only needed models; batch independent choices; dependent choices use updated state |
| Uncertainty | Include keep/none; ask once for unclear targets |
| Exact values | Code copies literal text, numbers, colors and selected assets |
| Scope | Element/section/page; explicit site-wide edits show brand/frame impact |
| Preserve | Content, IDs, locks, mobile overrides; responsive defaults otherwise |
| Writer | Original copy/new composition uses the same scoped edit path |
| Saves | Base revision + request identity; discard stale results |
| Failure | Show pending/saved; preserve last accepted state |
| Efficiency | Workspace/state/model/catalog caches; bounded generation/repair, quotas, progress, cancel/resume |
| Speed | Redraw accepted edits; measure input-to-preview latency, no instant guarantee |
| `design.md` | Optional parse/cache -> Jev/user selects -> typed brand; Writer converts free-form references; retain source/hash, export from JSON |

## 4. Editor and hosting

```text
+--------------------------------+
| Studio / Site   Draft: Saved   |
| [Open live ->]        [Publish]|
| [Home v] [Hero v]              |
| You: Image left, text right    |
| Tar: Updated. [Undo]           |
| [Preview] [Assets]             |
| [ Describe change ... ][Send]  |
+--------------------------------+

phone chat -> accepted revision -> paired private browser preview
same phone -> Preview sheet -> return to preserved chat
Open live  -> external published site
```

| Area | Setup |
| --- | --- |
| Controls | Taps select pages/sections/assets, Undo and Publish; details on demand |
| Desktop pairing | Authenticated expiring QR access; preserve route/scroll; start with revision checks |
| Authority | Preview selection changes context only; permissions checked separately |
| Address now | `https://tar-sites.tar-54d.workers.dev/<workspace>/` |
| Routing | One Worker; stable unique slugs, collisions/reserved names checked; prefix routes/assets/SEO |
| Configuration | Keep `workers_dev` and `SITE_WORKER_ORIGIN` |
| Domain next week | Verify domain, review canonical candidate; retain Worker until ready, redirect equivalent routes, protect retired addresses |

## 5. End-to-end example

```text
Brief: "Playful coffee site; cream/orange, huge 'WAKE UP DIFFERENT',
        products with prices/availability, order button, quote, big footer."

Approved: NORI brand, catalog products, beans.webp; ordering configured.
No quote/offer supplied -> omit and request evidence.

Builder -> exact headline
Picker  -> design/compositions
Writer  -> optional "Find your morning favorite."
Builder -> approved products/order bindings -> JSON
```

Concept JSON; Builder adds versions, field allowlists and policy:

```json
{
  "rev": 1,
  "brand": { "palette": "cream", "type": "bold", "space": "airy" },
  "frame": {
    "nav": { "recipe": "spread", "links": "pages" },
    "footer": { "recipe": "columns", "columns": 3, "links": "pages" }
  },
  "assets": { "beans": "approved:beans.webp" },
  "facts": { "products": { "query": "catalog.public" } },
  "actions": { "order": { "target": "order.create", "enabled": true } },
  "pages": [{
    "id": "home", "route": "/", "title": "NORI",
    "sections": [{
      "id": "hero", "layout": { "columns": 1, "align": "center" },
      "tone": "light", "blocks": [
        { "id": "title", "kind": "heading", "text": "WAKE UP DIFFERENT",
          "style": { "size": "display", "color": "accent" } },
        { "id": "intro", "kind": "text", "text": "Find your morning favorite." },
        { "id": "shop", "kind": "buttons", "text": "Shop beans", "action": "order" },
        { "id": "image", "kind": "image", "slot": "bottom", "asset": "beans" }
      ]
    }, {
      "id": "roasts", "layout": { "columns": 1 }, "blocks": [
        { "id": "products", "kind": "cards", "source": "products",
          "recipe": "product", "action": "order" }
      ]
    }]
  }]
}
```

```text
validate -> save rev1 -> private preview -> candidate review -> Publish

+--------------------------------------+
| NORI                            HOME |
|          WAKE UP DIFFERENT            |
|       Find your morning favorite.    |
|            [SHOP BEANS]              |
|          beans illustration          |
+--------------------------------------+
| product cards: images/titles/prices  |
| availability + registered buttons    |
+--------------------------------------+
| NORI                            HOME |
+--------------------------------------+
```

| Edit | Path and result |
| --- | --- |
| "Button says 'Grab a bag'" | Builder copies text -> rev2 |
| "Make hero darker" | Picker tone/style -> rev3 |
| "Two columns, image left" | Picker layout/slots + mobile defaults -> rev4 |
| "Image in background" | Picker placement/crop -> rev5 |
| "Undo last two" | Restore rev3 content into rev6; retain history |
| "Write new subtext" | Writer -> same edit path -> rev7 |
| DB price/stock change | Approved public refresh; no AI or draft design changes |
| Accepted design edit | Redraw draft; explicit Publish updates public design |
| Quotes/offers/legal/claims | Require approved evidence |

## 6. Publish and public data

```text
freeze JSON/facts/assets/address/epoch/renderer versions
  -> compile/check every route -> exact candidate review -> Publish
  -> immutable R2 files -> atomic CONTROL activation

approved DB change -> authorized refresh of PUBLISHED source -> new snapshot
visitor order -> Gateway -> current price/stock/policy -> Commerce / Inboxes
```

| Rule | Contract |
| --- | --- |
| Public data | Approved snapshots; no direct private workspace DB reads |
| Refresh | Planned queued/coalesced updates, declared freshness, retries, scheduled fallback; retain manual refresh; preserve draft |
| Publish | Exact checked candidate + unchanged reviewed draft; atomic CONTROL comparison of live generation/host/epoch |
| Consistency | Audit, idempotency, cross-store reconciliation |
| Serving | CONTROL primary gate before cached files; verified routes, real 404s, private-data isolation |
| Private preview | Scoped expiring access; no-store/noindex |
| Actions | Registered/configured; validate input; server derives workspace/site; identity/policy, abuse checks, idempotency |
| Payment | Verified webhooks establish payment; checkout rechecks current price/stock/policy |
| Recovery | Undo draft; rollback compatible public output, never commerce state; unpublish/revocation blocks serving first |
| Route checks | Phone/tablet/desktop: layout, safe media/content, keyboard/contrast, links/forms, evidence/rights, canonical/sitemap/robots |
| Publish gate | Blocking defects stop Publish |
| Operations | Full Commerce cycle; backups, protected live/rollback retention, quotas, usage/failure/latency monitoring; recheck restored access |

## 7. Delivery and acceptance

| Project area | Responsibility |
| --- | --- |
| `sites/core/` (planned) | Catalog/design system, document, edits, validator, renderer |
| `sites/src/`, `sites/wrangler.jsonc` | Public Worker and CONTROL/R2 configuration |
| `sites/test/` | Engine/serving checks |
| `tarharness/src/site/` | Builder, Picker/Writer adapters, data/assets, saves/jobs, preview/publish |
| `tarharness/src/gateway/` | Actions and commerce enforcement |
| `tarapp/src/components/site.tsx`, `tarapp/src/lib/harness.ts` | Chat/tap editor and API |

```text
Same repository: Sites engine + Harness backend + Tar app

Deliver:
catalog/editor -> grounded creation -> Workers.dev -> domains/refresh/journeys
```

| Acceptance | Check |
| --- | --- |
| Design | Varied nested page/section edits; frame/styles/mobile; locks and Undo |
| Reliability | Stale/failed saves; two isolated sites; valid routes/assets/SEO |
| Publishing | Adapters, refresh excluding drafts, rollback/unpublish, domain transitions |
| Commerce | Action retries/races; current business truth |
| Verification | Harness/app/Worker checks |
