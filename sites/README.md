# TAR Sites — scaffold

The pieces behind [design.md](../design.md): a **Site Bot** that generates Framer/Webflow-quality sites from a **DESIGN.md** contract, a reviewed component catalog, and a declarative **Site Spec** that compiles to a static base with agentic live regions.

## Files

| File | What it is |
|---|---|
| [`../design.md`](../design.md) | The architecture/spec (read this first) |
| [`spec/site-spec.schema.json`](spec/site-spec.schema.json) | JSON Schema for the Site Spec the Harness reads and writes |
| [`spec/catalog.schema.json`](spec/catalog.schema.json) | JSON Schema for a component catalog |
| [`spec/DESIGN.template.md`](spec/DESIGN.template.md) | Starter DESIGN.md (Google Labs format) |
| [`catalog/components.json`](catalog/components.json) | The core catalog (19 reviewed components) |
| [`seeds/sweetgreen.DESIGN.md`](seeds/sweetgreen.DESIGN.md) | A seeded DESIGN.md built from `designmds/sweetgreen.md` |

## How the pieces fit

~~~text
DESIGN.md  (tokens + rules)  ─┐
catalog    (components)      ─┼─▶  Site Spec  ─▶ validate ─▶ compile ─▶ release
facts      (Records + OKF)   ─┘        │
                                       └─▶ live surfaces (A2UI) ─▶ Gateway ─▶ Inbox
~~~

- **DESIGN.md** is the site's only design authority. Tokens are normative; prose is guidance. It renders to CSS variables, a Tailwind v4 theme and the A2UI catalog constraints.
- **The catalog** is the quality engine: the model selects a component and a variant and fills slots — it never invents layout or literal values.
- **The Site Spec** is the one model the Harness reads and writes. Bindings, journeys and actions resolve to registered queries, Actions or Flows.
- **Compile** freezes design + spec + facts + assets into an immutable release; **publish** swaps a D1 route pointer.

## Add a component

1. Add an entry to `catalog/components.json`.
2. Give it typed `props`, at least one `variant`, `slots`, and `tokens` that reference DESIGN.md tokens (never literals).
3. Declare `responsive`, `a11y`, and any `actions` bound to registered IDs.
4. Validate against `spec/catalog.schema.json`.
5. Ship it as a reviewed pack version; the catalog revision is part of the release and the live cache key.

## Seed a DESIGN.md

- Start from `spec/DESIGN.template.md`, or
- Have `site.init` draft one from brand inputs and `designmds/*` references, then review it.
- Every token must be either a literal design value or a `{path.to.token}` reference, per the DESIGN.md spec.

## Validate

- `spec/*.schema.json` are JSON Schema Draft 2020-12.
- `catalog/components.json` validates against `spec/catalog.schema.json`.
- `spec/DESIGN.template.md` and `seeds/*.DESIGN.md` parse as YAML frontmatter plus the documented section order.

## Notes

- A Site Bot is a package, not a running agent; the Harness performs the generation. See [design.md](../design.md) §1.
- The published base is static (Astro + Svelte islands). Only live regions stream A2UI, so declarative verbosity stays off the per-visitor path.
- `generated-view` is the single sandboxed escape hatch; omit it from a catalog to disable open-ended generation entirely.
