# Site: the public projection of a workspace

> Tell TAR about the business, choose a direction, preview, and publish.

| Item | Meaning |
|---|---|
| Status | Discussion proposal |
| Goal | Generate complete, fast, live commerce sites without a codebase per business |
| Related concept | [space.md](space.md): internal adaptive work; Site: public customer experience |
| Architecture source | [tarv12.md](tarv12.md) remains the sole consolidated target |

## 1. The whole idea

~~~text
                       WORKSPACE
 products / services / prices / stock / locations
 orders / delivery / payments / books / policies
                           |
                           v
                  SITE COMPILER
                           |
          +----------------+----------------+
          |                |                |
      Site plan        DESIGN.md         Content
    pages/sections     visual rules     copy/assets
          |                |                |
          +----------------+----------------+
                           |
                           v
                 VALIDATED SITE SPEC
                           |
                           v
                 UNIVERSAL RENDERER
                           |
                  static pages + live
                   commerce sections
                           |
                           v
                     EDGE / CDN
~~~

Each business gets a versioned specification and release. TAR maintains one
renderer, component catalog, validation pipeline, and commerce integration.

### Four small definitions

| Term | Meaning |
|---|---|
| Site | Public customer projection of a workspace |
| Spec | Pages, sections, content, sources, actions, and theme references |
| Release | Immutable published structure, content, design, and assets |
| Runtime | Shared renderer that combines the release with live permitted data |

## 2. The zero-complexity user journey

~~~text
1. Describe the business and desired result
                     |
                     v
2. Choose one of three visual directions
                     |
                     v
3. Review the complete working preview
                     |
                     v
4. Publish
~~~

TAR reads existing workspace facts. The user does not re-enter products,
services, locations, hours, delivery methods, policies, or contact details.

## 3. Complete page planning

Code first detects exact workspace capabilities. JEV chooses among eligible
page and section candidates. Irrelevant pages are omitted.

| Workspace capability | Pages included |
|---|---|
| Every business | Home, About, Contact, FAQ, Policies |
| Products | Shop, Category, Product, Search |
| Restaurant | Menu, Item, Cart, Checkout, Order tracking |
| Services | Services, Service detail, Booking |
| B2B sales | Catalog, Quote request, Customer account |
| Locations | Locations, Location detail, hours and directions |
| Delivery | Delivery area, tracking, proof and support |
| Accounts | Sign in, account, orders and addresses |
| Campaigns | Reusable landing page |
| Content | Articles and article detail |
| Support | Help, returns, contact and ticket status |

### Section catalog

| Content | Commerce |
|---|---|
| Hero | Product grid |
| Benefits | Product or service detail |
| Story | Menu |
| Gallery | Availability |
| Testimonials | Cart and checkout |
| FAQ | Booking |
| Comparison | Quote request |
| Locations | Order tracker |
| Contact | Customer account |
| Articles | Receipt and support |

Every component has typed inputs, responsive behavior, accessibility rules,
loading and error states, and allowed Gateway actions.

## 4. The site specification

~~~text
site
  theme
  domain
  locale
  navigation
  pages
  features
  release

page
  path
  purpose
  title
  sections
  seo

section
  type
  variant
  source
  action
  content
~~~

Example:

~~~text
page: /menu
purpose: order food

sections
  heading
    content: Today's menu

  products
    source: available restaurant items

  cart
    action: order.create
~~~

The agent selects registered sections and actions. It does not generate a new
checkout, permission system, database, or order engine.

## 5. DESIGN.md owns visual language

~~~text
Business capability -> what the site does
Site spec           -> what appears where
DESIGN.md           -> how it looks and feels
Commerce Core       -> authoritative behavior
~~~

DESIGN.md defines:

- Brand character and audience.
- Colors and hierarchy.
- Typography.
- Spacing and layout.
- Shapes and elevation.
- Component appearance.
- Motion and design restrictions.

TAR validates and pins the format version, then compiles its tokens for the
runtime. The official format is still alpha, so a release stores the compiled
tokens as well as the source document.

[Official DESIGN.md specification](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md)

DESIGN.md never defines price, tax, access, checkout, stock, or accounting.

## 6. Code, JEV, and agents

~~~text
workspace facts
      |
      v
code discovers exact capabilities
      |
      v
Noul understands request and brand language
      |
      v
Choice selects eligible pages, sections and variants
      |
      v
Score ranks useful content and products
      |
      v
cheap LLM drafts copy, metadata, alt text and translations
      |
      v
code validates and compiles the release
~~~

| Work | Owner |
|---|---|
| Products, services, locations and capabilities | Code |
| Understand “warm family bakery” | JEV Noul |
| Select restaurant, retail, service or B2B plan | JEV Choice |
| Rank homepage sections and featured records | JEV Score |
| Copy, metadata, alt text and translation | Cheap LLM |
| Unusual campaign concept or difficult migration | Strong agent |
| Links, schema, access, SEO and accessibility checks | Code |
| Responsive screenshot comparison | Browser plus vision |

Normal generation uses one planning turn, one batched JEV assessment, and one
batched content pass. Reopening or browsing a published site uses zero AI calls.

## 7. Commerce is live, shared truth

~~~text
customer action
      |
      v
ACTION GATEWAY
      |
      v
COMMERCE CORE
      |
      +--> order / booking / quote
      +--> payment
      +--> stock movement
      +--> Flow Book
      +--> Inbox actions
      +--> receipt and customer update
~~~

| Site function | TAR source |
|---|---|
| Product, service and price | Commerce Core |
| Availability | Inventory |
| Cart and order | Orders |
| Checkout | Payment action |
| Booking | Service records and availability |
| Delivery status | Delivery records and Flow Book |
| Invoice and receipt | Books and artifacts |
| Customer account | Contacts and authenticated identity |
| Staff work | Inbox |
| Customer question | Scoped customer chat |

The site has no separate commerce database. Every mutation goes through the
same Gateway used by the app, agents, and Flow Books.

## 8. Release structure and live data

~~~text
IMMUTABLE RELEASE              LIVE COMMERCE
pages                          prices
sections                       stock
DESIGN.md version              availability
copy                           order state
assets                         business hours
SEO                            delivery status
~~~

Price, stock, hours, and order status update without rebuilding the site.
Layout, copy, theme, navigation, and structural changes create a new release.

~~~text
draft -> preview -> validate -> publish
                                  |
                                  v
                           immutable release
                                  |
                                  v
                      instant rollback by version
~~~

## 9. Agentic editing

~~~text
"Make the home page shorter."
"Promote lunch until 3 PM."
"Add a catering page."
"Use a quieter visual direction."
                     |
                     v
identify affected pages and sections
                     |
                     v
create spec + content + design diff
                     |
                     v
preview -> validate -> publish
~~~

The agent patches the specification. It does not rewrite the site.

Analytics may produce improvement proposals. Publishing remains a Gateway
action governed by workspace policy.

## 10. A public Space without per-view AI

~~~text
visitor intent
     |
     +--> browse products
     +--> order food
     +--> book a service
     +--> request a quote
     +--> track an order
     +--> ask a question
~~~

JEV designs and evaluates customer segments during creation. Runtime code
selects the appropriate navigation, content, and action from known signals.
JEV runs during a visit only for ambiguous natural-language search or chat.

Context changes relevance. It never expands customer access or business rules.

## 11. Sandbox and browser boundary

Normal site generation uses the component catalog and requires no sandbox.
OpenAI Agents API may run without an environment when function or MCP tools are
enough.

[OpenAI Agents API architecture](https://developers.openai.com/api/docs/guides/agents-api/architecture)

| Need | Executor |
|---|---|
| Create or edit ordinary pages | Site compiler |
| Inspect a reference website | Browser |
| Import an existing CMS without API | Browser |
| Responsive and journey verification | Browser |
| Process many images or files | Sandbox |
| Migrate a large existing site | Agent plus sandbox |
| Build a truly new component | Isolated sandbox |

### Custom extension gate

~~~text
agent creates extension in sandbox
              |
              v
lint + test + access + accessibility + security
              |
              v
human review
              |
              v
versioned component catalog
~~~

Generated code is never injected directly into a live site.

## 12. Cost and speed

| Decision | Result |
|---|---|
| One multi-tenant renderer | No codebase or deployment per business |
| Static page shell at CDN | Fast first load |
| Live commerce sections | Current prices, stock and state |
| Catalog selection | Fewer tokens and invalid layouts |
| Batched JEV | Low judgment cost |
| Cheap LLM for content | Controlled generation cost |
| Strong agent only for exceptions | Controlled reasoning cost |
| Zero AI on ordinary views | Predictable operating cost |
| Immutable releases | Instant cache and rollback |
| Shared responsive components | One tested implementation |

## 13. What TAR ships

~~~text
1 universal renderer
1 page and section schema
1 commerce component catalog
1 DESIGN.md compiler
1 preview and validation pipeline
1 release system
1 Gateway integration
~~~

| Package | Adds |
|---|---|
| Shared | Home, identity, contact, policies, search and account |
| Restaurant | Menu, ordering, preparation, delivery and tracking |
| Retail | Catalog, product, cart, checkout and returns |
| Services | Service pages, availability, booking and completion |
| B2B | Catalog, quote, approval, account and invoice |
| Hospitality | Property, room, availability, booking and guest support |
| Events | Event, ticket, registration, schedule and attendance |
| Marketplace | Seller, listing, discovery, order and dispute |

Domain packages contribute records, actions, page candidates, sections, and
starter content. They do not create another renderer or Gateway.

## 14. One product model

~~~text
SPACE      adaptive internal workspace
INBOX      personal human actions
ASK TAR    request, discuss and edit
FLOW BOOKS durable business coordination
SITE       public customer projection
~~~

## 15. First proof

Build one restaurant workspace:

~~~text
workspace menu + hours + delivery settings
                    |
                    v
generate Home / Menu / Item / Cart / Checkout / Track
                    |
                    v
choose DESIGN.md direction
                    |
                    v
preview mobile + desktop
                    |
                    v
publish
                    |
                    v
place order -> kitchen -> courier -> customer receipt
~~~

### Proof checks

| Check | Success |
|---|---|
| Completeness | Required pages and commerce journey exist |
| Truth | Prices, stock and status read canonical records |
| Safety | Every mutation uses the Gateway |
| Design | Every page follows the pinned visual language |
| Speed | Static shell is edge cached; live data is bounded |
| Cost | Ordinary visits and record changes use zero AI |
| Editing | A conversation produces a reviewable spec diff |
| Recovery | Previous release restores immediately |

## 16. Decisions captured

| Topic | Decision |
|---|---|
| Generation | Compile a validated site spec; do not generate a codebase |
| Runtime | One universal renderer for every workspace |
| Commerce | Shared Commerce Core and Action Gateway |
| Design | Versioned DESIGN.md source plus compiled tokens |
| AI | JEV selects; cheap LLM writes; strong agent handles exceptions |
| Publishing | Immutable releases with live commerce bindings |
| Personalization | Runtime rules first; JEV for ambiguous language |
| Sandbox | Exceptional files, migration, or reviewed extension work |
| Browser | Reference inspection, import, and visual verification |
| Extension | Tested and reviewed before entering the catalog |
| Cost | Zero AI on ordinary browsing and business data changes |
