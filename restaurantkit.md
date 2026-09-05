# TAR Restaurant Kit

**An installable Workspace Kit for dine-in, takeaway and delivery**

## 1. Purpose

The Restaurant Kit installs ordinary TAR Records, Bots, Workflows, Actions, policies and views. It is not a separate app or runtime.

~~~text
Restaurant Kit
  → owner answers setup questions
  → TAR reuses compatible existing Records
  → owner reviews the proposed setup
  → Gateway publishes approved definitions
  → workers use Work, Inbox and Records
~~~

~~~yaml
id: restaurant
version: 2
installs:
  records: [Products, Contacts, Orders, Tasks, Documents, Interactions]
  bots: [Order Service, Kitchen, Inventory, Management, Guest Communication]
  optional_records: [Bookings, Inventory Items, Locations, Payments, Expenses]
~~~

This Kit follows tar-harness.md and actionsreg.md:

~~~text
Records hold truth.
Workflows organise work.
Steps use registered Actions.
Gateway authorises every official effect.
~~~

## 2. Setup

TAR asks only what changes the installed system.

| Question | Choices | Effect |
|---|---|---|
| Service modes | Dine-in, takeaway, delivery | Installs relevant Order branches. |
| Tables | Yes / no | Adds table Locations and table-service steps. |
| Reservations | Yes / no | Adds Bookings and reservation workflows. |
| Payment timing | Before, after, either | Sets payment entry rules. |
| Payment methods | Cash, card, UPI, other | Enables approved payment Actions. |
| Inventory | None, menu availability, ingredients | Adds Inventory Records and controls. |
| Kitchen | One queue, stations | Adds kitchen assignment rules. |
| Customer details | None, optional, delivery required | Sets Contact fields and visibility. |
| Discounts/refunds | Roles and thresholds | Sets approval policy. |
| Team roles | People and responsibilities | Creates Workspace membership assignments. |
| Currency/tax | Workspace values | Configures deterministic calculation. |

~~~text
My Restaurant

Records: Products, Contacts, Orders, Tasks, Documents, Interactions
Optional: Tables, Bookings, Inventory, Payments, Shifts

Bots: Order Service, Kitchen, Inventory, Management, Guest Communication

Approvals:
  Discount above 10%
  Void prepared item
  Refund above configured amount

[Install]  [Change setup]  [More options]
~~~

## 3. Restaurant Records

### Default Records

| TAR Record | Restaurant use |
|---|---|
| Contacts | Guests, team members, vendors, suppliers and delivery partners. |
| Organisations | Suppliers, delivery partners and corporate customers. |
| Products / Services | Menu items, modifiers, packages and service charges. |
| Orders | Dine-in, takeaway and delivery orders. |
| Tasks | Kitchen tickets, cleaning, service and manager work. |
| Documents | Menus, invoices, supplier documents and food-safety files. |
| Interactions | Calls, messages, feedback, complaints and guest requests. |

### Optional Records

| Record | Add when needed |
|---|---|
| Locations | Tables, seating areas, kitchen stations and stores. |
| Bookings | Reservations and appointments. |
| Inventory Items | Ingredients, finished goods and consumables. |
| Payments | Confirmed payments, refunds and reversals. |
| Expenses | Supplier costs and operating expenses. |
| Assets | Kitchen equipment and maintenance history. |

### Essential restaurant fields

~~~yaml
Product:
  name: required
  price_minor: required
  tax_class: required
  availability: active | unavailable
  preparation_station: optional
  modifiers: optional

Order:
  number: gateway_generated
  service_type: dine_in | takeaway | delivery
  contact: optional_or_required_by_policy
  location: required_for_dine_in
  items: immutable_price_tax_snapshot
  totals: gateway_calculated
  order_state: draft | confirmed | in_service | completed | cancelled
  kitchen_state: not_sent | queued | accepted | preparing | ready | served
  payment_state: unpaid | partial | paid | refund_pending | refunded

Inventory Item:
  unit: required
  on_hand: derived_from_movements
  minimum: optional
  unit_cost_minor: restricted

Payment:
  order: required
  kind: payment | refund | reversal
  amount_minor: required
  method: registered
  state: created | pending | confirmed | failed | reversed
~~~

Record Links express relationships:

~~~text
Order ─placed by→ Contact
Order ─served at→ Location/Table
Order ─contains→ Product
Kitchen Task ─for→ Order
Payment ─for→ Order
Inventory Movement ─for→ Inventory Item
Document ─from→ Organisation/Supplier
~~~

### Non-negotiable data rules

~~~text
Historical order prices never change after a menu update.
Confirmed payments are corrected by refund/reversal, never edited.
Inventory quantity is derived from accepted movements, never freely overwritten.
Corrections create compensating Records or Actions.
Money uses integer minor units; Gateway creates server timestamps and IDs.
~~~

## 4. People, roles and access

Contacts remain one Record type. A person can be both a team member and supplier contact; active roles and Workflow membership describe the relationship.

| Functional role | Normal scope |
|---|---|
| Owner | All Records, definitions, access and financial controls. |
| Manager | Operational Records and approvals permitted by policy. |
| Cashier | Orders, payments, permitted Contacts and own shifts. |
| Server | Assigned tables, Orders and necessary guest details. |
| Kitchen | Active kitchen tasks, product availability and restricted order context. |
| Inventory | Inventory, movements, suppliers and permitted costs. |

Kitchen staff cannot change prices, issue refunds or view unnecessary contact data. Access comes from Workspace membership and Gateway policy, not a Contact role.

## 5. Installed Bots and Workflows

### 5.1 Order Service Bot

**Purpose:** create and manage guest Orders safely.

#### Checkout

~~~text
Choose service type
  → identify Contact / table when needed
  → add Products and modifiers
  → check availability
  → calculate totals
  → human review
  → create and confirm Order
  → create Kitchen Task
  → take payment when policy requires
  → send receipt / confirmation
~~~

| Step | Mode | Human interface | Allowed Actions |
|---|---|---|---|
| Choose service | Deterministic | Selection card | order.create |
| Identify guest/table | Deterministic | Input/search card | contact.search, contact.create, location.search, link.create |
| Add items | Deterministic | Order card | order.add_item, order.remove_item |
| Check availability | Deterministic | None | offering.search, inventory.check |
| Recommend add-on | Agentic, optional | Recommendation card | agent.recommend |
| Calculate | Deterministic | None | order.calculate_total, money.calculate_tax |
| Review | Deterministic | Confirmation card | inbox.request_input |
| Confirm Order | Deterministic | None | order.confirm, task.create |
| Take payment | Deterministic | Payment card | payment.create, payment.authorize, payment.capture, payment.verify |
| Send receipt | Deterministic | None | document.generate, channel.message.send |

The recommendation Action may propose; it cannot add an item or discount by itself.

#### Modify an Order

~~~text
Load open Order
  → validate state, role and version
  → add/remove items or record a guest request
  → require approval where preparation/payment policy requires it
  → calculate revised totals
  → Gateway commits the new Order version
  → create a Kitchen Task delta
~~~

#### Complete service

~~~text
Request bill → verify payment → confirm handover/service → complete Order
~~~

### 5.2 Kitchen Bot

**Purpose:** turn confirmed Orders into clear preparation work.

~~~text
Receive Kitchen Task
  → assign station
  → accept
  → start preparation
  → report delay or unavailable item
  → mark ready
  → notify server/cashier
~~~

~~~yaml
allowed_actions:
  - task.assign
  - task.update
  - task.complete
  - offering.set_availability
  - inbox.create
  - channel.message.send
~~~

An unavailable product pauses the affected Order Workflow and creates a human choice: replace, remove or escalate. Kitchen staff do not modify pricing or payments.

### 5.3 Inventory Bot

**Purpose:** maintain traceable stock and availability.

~~~text
Receive stock
  → select supplier and items
  → enter quantity, unit, batch and cost
  → attach document when supplied
  → request approval for policy exceptions
  → record accepted inventory movement
  → derive availability and low-stock work

Count stock
  → start snapshot
  → collect counts
  → calculate variance
  → request approval above threshold
  → create compensating adjustment movement

Record waste
  → select item, quantity and reason
  → validate availability
  → request approval when required
  → record movement
~~~

~~~text
inventory.check / receive / reserve / release / adjust / transfer / reorder
document.create / file.attach
approval.request / approve / reject
task.create / assign
~~~

### 5.4 Management Bot

**Purpose:** handle consequential operational decisions.

~~~text
Discount request
  → validate allowed amount and role
  → request approval when threshold requires it
  → money.apply_discount
  → update Order through Gateway

Refund
  → find confirmed Payment
  → validate refundable balance and policy
  → request approval
  → create idempotent provider request
  → verify provider result
  → create confirmed refund Payment
  → update derived Order balance

Close shift
  → calculate expected cash deterministically
  → collect closing cash through human input
  → calculate variance
  → request manager review above threshold
  → close shift and create report
~~~

~~~text
money.apply_discount
payment.refund / payment.verify
approval.request / approve / reject
expense.create / submit / approve
document.generate
~~~

### 5.5 Guest Communication Bot

**Purpose:** handle guest messages, feedback and follow-up.

~~~text
Inbound message/review
  → save Interaction
  → resolve Contact and related Order
  → classify intent
  → answer with approved information or create Support Task
  → require approval before consequential promises, refunds or external messages when policy requires it
~~~

~~~text
Customer channels: TAR Web Channel + Zernio
Team channels:     TAR Web Channel + optional Chat SDK
~~~

Zernio may provide social publishing, DMs, comments and reviews. Chat SDK is optional for Slack, Teams and Discord team bots. Never connect the same provider account through both.

### 5.6 Optional Reservations Bot

~~~text
Check availability
  → create Booking
  → send confirmation
  → remind guest
  → check in
  → create dine-in Order or mark no-show
~~~

~~~text
booking.check_availability / create / reschedule / confirm / check_in / cancel
calendar.check_availability / create_event
schedule.once / delay
~~~

## 6. Human interface and agentic work

~~~text
Step mode: deterministic | agentic
Optional participants: app Action + agent Action + human Action / Card
~~~

| Use case | Correct pattern |
|---|---|
| Select table or products | Deterministic Step + human selection card. |
| Take payment | Deterministic Step + payment card + Gateway Action. |
| Manager approval | Deterministic policy + approval.request + Inbox card. |
| Suggest replacement or add-on | Agentic Step + recommendation card; person confirms. |
| Resolve a vague complaint | Agentic Step may classify and request missing detail; Gateway controls consequential action. |

Human input never bypasses validation. Agentic work never bypasses required approvals.

## 7. Views and Worker experience

~~~text
Work
  urgent Orders / assigned kitchen tasks / low stock / current shift
Inbox
  approvals / missing input / assigned follow-up
Records
  Products / Contacts / Orders / Inventory / Bookings / Documents
Build
  Kit settings / Bots / Workflows / Actions / access       owner-admin only
~~~

Required operational views:

~~~text
restaurant.orders.open
restaurant.orders.awaiting_payment
restaurant.kitchen.queue
restaurant.kitchen.preparing
restaurant.kitchen.ready
restaurant.inventory.low
restaurant.approvals.pending
restaurant.sales.today
restaurant.shifts.current
~~~

Views are role-filtered Record projections. Buttons launch allowed Workflows; they never become unrestricted Record-edit operations.

## 8. Safety, audit and recovery

~~~text
Gateway transaction
  → validate Action and Record state
  → write Record / Link / Workflow Run
  → append audit event
  → enqueue Outbox Event
  → commit
  → deliver asynchronously with lease and retry
~~~

Required audit events:

~~~text
order.created              order.items_changed       order.confirmed
kitchen.task.created       kitchen.task.accepted     kitchen.order_ready
payment.attempted          payment.confirmed         refund.confirmed
inventory.received         inventory.adjusted        inventory.waste_recorded
approval.requested         approval.decided          shift.closed
~~~

| Failure | Required behaviour |
|---|---|
| Stale Order edit | Reject with current Record version. |
| Duplicate request | Return prior idempotent result. |
| Payment timeout | Keep state pending/unknown and reconcile; never blindly retry. |
| Kitchen delivery failure | Retain Task and Outbox Event; retry without duplicate ticket. |
| Approval expiry | Follow declared fallback; never execute consequential Action. |
| Unavailable item | Pause and request replacement/removal choice. |
| Access revoked | Reject new Actions and remove permitted offline projections. |

## 9. Install, upgrades and customization

~~~text
Kit installation creates normal, versioned Workspace definitions.
Workspace changes remain local and are never overwritten silently.
Kit upgrade shows a diff and requires owner approval.
~~~

~~~yaml
source_kit:
  id: restaurant
  version: 2
  source_key: restaurant.workflow.checkout
~~~

Owners may rename Records, edit Workflows, replace an Action binding or add local policies. Gateway validates every resulting definition before publication.

## 10. Acceptance criteria

The Restaurant Kit is complete when:

- Installation creates only ordinary TAR Records, Bots, Workflows, Action bindings and policies.
- All team, guest, supplier and vendor people use Contacts and links rather than separate person tables.
- A permitted worker can complete takeaway and dine-in Orders end to end.
- Kitchen work is created from confirmed Orders and exposes only necessary information.
- Payments, refunds and inventory movements are deterministic, idempotent and auditable.
- Human approvals pause and resume their originating Workflow Runs.
- Agentic Steps are bounded to allowlisted Actions and cannot commit consequential effects.
- Customer social messages use Zernio through the TAR channel adapter; team chat uses Chat SDK only when installed.
- Historical prices, confirmed Payments and accepted inventory movements are preserved.
- Offline commands clearly show pending confirmation and never falsely confirm payments, approvals or stock changes.
- Kit upgrades are reviewable and never overwrite Workspace customization.

> **The Restaurant Kit supplies a ready operating model. Records hold restaurant truth, Workflows organise service, Actions perform bounded work, and Gateway protects every official effect.**
