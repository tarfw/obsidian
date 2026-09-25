# Site — Typed Business Publishing

## Contract

Site turns verified workspace facts into a fast multi-page public presence. The
stored source is a typed JSON definition. Generated code is never the source of
truth.

```text
workspace facts + design tokens + instruction
                    |
              typed site draft
                    |
          validate every page/card/action
                    |
            deterministic compiler
                    |
      immutable R2 candidate + manifest
                    |
          atomic publish pointer / rollback
```

| Goal | Rule |
| --- | --- |
| Complete | home, catalog, about and contact pages by default |
| Safe | no invented price, address, review, stock or policy |
| Fast | static HTML/CSS at the edge; live data only where declared |
| Cheap | one draft judgment can shape many deterministic pages |
| Editable | agents and people produce validated patch operations |
| Durable | every release is immutable, hashed and reversible |
| Extensible | new cards, bindings and journeys are versioned contracts |

## Site and artifact

| Site | Artifact |
| --- | --- |
| public multi-page surface | durable output or interactive object |
| routes, navigation, SEO and conversion journeys | document, report, guide, invoice or tracker |
| reads workspace facts through bindings | stores its own versioned content/reference |
| compiled and published as one release | may be opened inside Space or shared separately |

A site may link to an artifact. An artifact may appear as a Site card. Their
lifecycle and audience remain separate.

## Definition

```text
site
├── schema / locale / timezone / currency
├── design tokens
├── policy
├── pages[]
│   ├── path / title / metadata
│   └── cards[]
│       ├── kind / version / props
│       ├── bindings[]
│       └── actions[]
├── journeys[]
└── releases[] / currentRelease
```

Internal ids and fields use one lowercase semantic word. External provider names
remain behind adapters.

## Card catalog

| Card | Use |
| --- | --- |
| `navigation` | brand and page links |
| `hero` | primary promise and calls to action |
| `content` | factual narrative |
| `collection` | catalog or grouped records |
| `features` | verified capabilities |
| `proof` | real testimonials or evidence only |
| `faq` | factual questions and answers |
| `hours` | workspace supplied schedule |
| `contact` | workspace supplied contact channels |
| `form` | policy gated journey input |
| `cta` | route to a declared journey |
| `footer` | business identity and policy links |

Unknown kinds, duplicate ids, invalid paths, excessive cards and undeclared
actions fail validation.

## Default pages

| Route | Cards | Data behavior |
| --- | --- | --- |
| `/` | navigation, hero, features, proof, CTA, footer | factual brief; empty proof stays empty |
| `/catalog` | navigation, collection, FAQ, footer | `catalog.public` binding |
| `/about` | navigation, content, proof, footer | uses supplied workspace description |
| `/contact` | navigation, hours, contact, form, footer | optional facts stay empty; form follows policy |

The default is domain neutral. Restaurant, supermarket, taxi, consulting and
any other business specialize it with data and card patches rather than separate
generators.

## Bindings

| Field | Meaning |
| --- | --- |
| `slot` | card property receiving data |
| `query` | registered read model, for example `catalog.public` |
| `version` | binding contract version |
| `access` | public or authenticated |
| `freshness` | cache duration |
| `empty` | valid no-data result |

The compiler resolves active catalog variants and current prices. It does not
copy editable stock or price truth into the Site definition. Missing optional
facts render an empty state instead of fabricated content.

## Journeys and commerce

```text
visitor intent -> declared journey -> policy -> abuse/auth check
              -> Action Gateway -> commerce record -> role Inboxes
```

| Journey | Gateway target | Default |
| --- | --- | --- |
| enquiry | registered record/contact Action | disabled until public policy is configured |
| order | `order.create` or domain order Action | disabled until identity, pricing and abuse controls are configured |
| payment | provider adapter then `payment.record` | disabled until provider verification is configured |
| booking | domain Action / Flow Book | disabled until availability rules exist |

Static publishing is fully useful without public mutation. A workspace enables
each transactional journey only after its policy and adapter exist. A generated
page cannot turn the policy on by itself.

## Generation

| Layer | Responsibility |
| --- | --- |
| Code | facts, schema, validation, bindings, compile, CSP/security, release |
| Jev | choose theme, page emphasis, card family or patch intent |
| cheap LLM | draft short copy from supplied facts into a strict schema |
| agent | coordinate research or edits through registered tools |
| person | approve identity, policy, claims and publish |

One generation request creates a valid typed draft. Updates are small operations
such as `set`, `insert`, `remove`, `move`, `theme` and `policy`, all checked
against `baseVersion`. Concurrent stale edits fail.

## Release

```text
Draft v4
  -> compile /index.html, /catalog/index.html, /about/index.html,
             /contact/index.html, /style.css
  -> hash every file + whole manifest
  -> write workspaces/{workspace}/sites/{site}/releases/{release}/...
  -> compare site version
  -> atomically set currentRelease
```

Candidate files written before a conflict are unreachable. Publishing changes
the pointer only after all files exist. Rollback selects an existing immutable
manifest; it does not rebuild an old version.

The Worker serves `GET /v1/sites/:slug/*`, maps nested routes to their release
file, preserves content types and rewrites root links only for the Worker preview
prefix. Custom-domain routing can serve the same root-relative artifacts.

## Storage

| Data | Store |
| --- | --- |
| draft definition, policy and release manifests | workspace Turso record |
| immutable HTML/CSS release files | `SITE_RELEASES` R2 bucket |
| catalog facts and prices | commerce records in Turso |
| product media and long content | `PRODUCT_CONTENT` R2 bucket |
| design tokens | typed Site definition |

## App experience

```text
Site Studio
  1. describe business/change
  2. create or regenerate typed draft
  3. inspect every page and card
  4. publish
  5. open live URL
  6. refresh bindings or roll back when needed
```

The app displays the whole page structure, not only the first page. Publish is a
separate Action from generation.

## Implemented acceptance

- Four page domain neutral draft with all typed card families.
- Strict schema validation and optimistic updates.
- Every page compiles deterministically.
- Immutable R2 release manifest, publish and rollback.
- Live catalog refresh from variants and prices with POS fallback.
- Nested public routing, correct content types and security headers.
- No hardcoded demo business, fake testimonial, address, price or schedule.

See [space.md](space.md), [commerce.md](commerce.md) and [tarv12.md](tarv12.md).
