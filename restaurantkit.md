# TAR Restaurant Workspace Kit

**Canonical product and implementation specification**

## Abstract

The Restaurant Workspace Kit is an installable starting point for dine-in,
takeaway and delivery restaurants. It creates ordinary TAR Data definitions,
Bots, Workflows, ordered Steps, access rules, Work Cards, Inbox rules and
registered views. It is not a separate runtime or vertical application.

After installation, the Workspace owns editable, versioned definitions. The
Gateway remains the only authority that can commit official Data, payments,
inventory changes, approvals or external-system effects.

```text
Restaurant Kit
  -> owner answers setup questions
  -> TAR inspects existing Workspace Data
  -> compatible definitions are reused
  -> proposed Data, Bots, Workflows and access are reviewed
  -> Gateway installs approved definitions
  -> workers receive role-filtered Work, Inbox and Data
```

This specification follows `tar-harness.md`. In particular:

1. Bots own Workflows and Workflows contain ordered Steps.
2. A Step may combine actions, an optional Card and bounded AI help.
3. AI may propose but cannot commit an official change.
4. Work Cards are role-filtered projections or Workflow launchers, not records.
5. Inbox connects an assigned person to a waiting Workflow.
6. All financial and inventory effects are deterministic and idempotent.

### How to read this document

The document is intentionally complete, but it can be read in layers:

```text
Want the product picture?       Read sections 2, 3 and 7
Want to see the actual UI?      Read sections 6, 7, 8 and 9
Want the Data model?            Read sections 4, 5 and 6
Want the automation design?     Read sections 9, 10 and 12
Want to implement the kit?      Read sections 11 through 17
```

The ASCII screens are examples of what a worker sees. The tables beneath them
are the exact behavioral rules. Both describe the same system.

## 1. Kit identity

```text
id: restaurant
name: Restaurant
version: 1
category: food
source: tar.workspace-kit
```

An installed definition retains provenance without depending on the kit at
runtime:

```text
source_kit: restaurant
source_kit_version: 1
source_key: restaurant.data.orders
```

Stable source keys allow TAR to compare a Workspace with a later kit version
and offer a reviewable upgrade. An upgrade never silently overwrites local
customizations.

## 2. Installation questions

TAR asks only questions that materially change the generated Workspace:

| Question | Options | Effect |
| :--- | :--- | :--- |
| Service modes | Dine-in, takeaway, delivery | Installs relevant Workflow branches. |
| Tables | Enabled or disabled | Installs Tables Data and table service Steps. |
| Reservations | Enabled or disabled | Installs Bookings Data and Reservation Workflow. |
| Payment timing | Before preparation, after service, either | Controls payment entry conditions. |
| Payment methods | Cash, card, UPI, other registered methods | Configures the payment selection Card. |
| Inventory depth | Menu availability only, finished goods, ingredients and recipes | Controls stock Data and deduction rules. |
| Kitchen handling | One queue or preparation stations | Configures ticket assignment. |
| Discounts | Roles and maximum percentages | Creates deterministic approval thresholds. |
| Refunds and voids | Roles and thresholds | Creates approval rules. |
| Customer details | Disabled, optional, required for delivery | Controls customer Steps and access. |
| Team | Solo or team | Creates role assignments and Inbox routing. |
| Currency and tax | Workspace defaults plus applicable tax classes | Configures deterministic pricing functions. |

The installation review is presented in normal language:

```text
My Restaurant

Data
  Menu Items, Categories, Orders, Tables, Customers,
  Inventory Items, Stock Movements, Payments and Shifts

Bots
  POS, Order Service, Kitchen, Inventory, Customer and Management

Service
  Dine-in and takeaway

Approvals
  Manager approval above 10% discount
  Manager approval for prepared-item voids and refunds above INR 500

[Create Workspace Kit]  [Change something]  [More options]
```

## 3. Installed Workspace model

```text
My Restaurant
|-- Work
|   |-- active Workflow runs
|   |-- role-filtered priority Cards
|   |-- Action Cards
|   `-- deterministic Report Cards
|-- Inbox
|   `-- assigned input, confirmation and approval work
|-- Data
|   |-- Menu Items
|   |-- Categories
|   |-- Orders
|   |-- Tables
|   |-- Customers
|   |-- Inventory Items
|   |-- Stock Movements
|   |-- Payments
|   `-- Shifts
`-- Build                         owner/admin only
    |-- Bots
    |-- Data definitions
    |-- Workflows
    `-- Access
```

Optional definitions are installed only when enabled:

- Bookings for reservations.
- Suppliers and Purchase Orders for purchasing.
- Deliveries for first-party delivery operations.
- Recipes when ingredient-level inventory is enabled.

## 4. Roles and access defaults

The standard kit roles are Owner, Manager, Cashier, Server, Kitchen and
Inventory. TAR platform roles continue to set the maximum permission; these
functional assignments narrow the permitted Data, records and Steps.

| Capability | Owner | Manager | Cashier | Server | Kitchen | Inventory |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| View all orders | Yes | Yes | Yes | Assigned | Kitchen fields | No |
| Create an order | Yes | Yes | Yes | Yes | No | No |
| Change an open order | Yes | Yes | Yes | Assigned | No | No |
| Change menu prices | Yes | If granted | No | No | No | No |
| Change availability | Yes | Yes | View | View | Request | View |
| Take payment | Yes | Yes | Yes | If granted | No | No |
| Issue refund | Yes | By policy | Request | Request | No | No |
| Update preparation state | Yes | Yes | View | Limited | Yes | No |
| Receive or count stock | Yes | Yes | No | No | No | Yes |
| Adjust stock | Yes | By policy | No | No | Request waste | By policy |
| View financial reports | Yes | Yes | Shift only | No | No | Cost-limited |
| Manage definitions and access | Yes | If admin | No | No | No | No |

Default Data scope:

```text
Owner       all
Manager     all operational Data; financial fields by policy
Cashier     orders, payments, permitted customers and own shifts
Server      assigned tables, assigned orders and necessary customers
Kitchen     active ticket projection and menu availability only
Inventory   inventory, movements, recipes and permitted suppliers
```

Sensitive customer notes, payment-provider details and cost/margin fields are
separate restricted fields or views. Offline access is explicit. Payment
credentials, full provider payloads and unrestricted customer exports are never
projected to a Personal DB.

## 5. Data definitions

All entries below are typed records in the Workspace DB. Relationships use
`links`. Large descriptions, preparation guides and files use OKF/R2 references.

### 5.1 Categories

Purpose: organize the menu without embedding presentation structure in every
screen.

| Field | Type | Rules |
| :--- | :--- | :--- |
| `name` | text | Required, unique among active categories. |
| `description` | text | Optional. |
| `sort_order` | integer | Deterministic display order. |
| `available_from` | time | Optional service window. |
| `available_until` | time | Optional service window. |
| `status` | enum | `active`, `inactive`, `archived`. |

### 5.2 Menu Items

| Field | Type | Rules |
| :--- | :--- | :--- |
| `name` | text | Required. |
| `code` | text | Optional unique SKU or short code. |
| `category_id` | relationship | Links to Category. |
| `description` | text/OKF | Optional long description. |
| `price_minor` | integer | Required; currency minor units. |
| `currency` | currency code | Defaults to Workspace currency. |
| `tax_class` | enum/reference | Must use a registered tax rule. |
| `station` | enum/reference | Optional kitchen station. |
| `modifier_groups` | structured data | Validated choices and price effects. |
| `recipe_id` | relationship | Optional Recipe link. |
| `available` | boolean | Operational availability. |
| `image_ref` | R2 reference | Optional. |
| `status` | enum | `draft`, `active`, `inactive`, `archived`. |

Changing a menu price never changes historical order totals. Orders retain an
immutable item, price, tax and discount snapshot.

### 5.3 Tables

| Field | Type | Rules |
| :--- | :--- | :--- |
| `name` | text | Required; for example `Table 7`. |
| `area` | text/reference | Optional floor or section. |
| `capacity` | integer | Positive integer. |
| `state` | enum | `available`, `occupied`, `bill_requested`, `cleaning`, `inactive`. |
| `current_order_id` | relationship | At most one open primary order. |
| `assigned_member_id` | member reference | Optional server assignment. |

Valid normal transition:

```text
available -> occupied -> bill_requested -> cleaning -> available
```

Exceptional transitions require a registered management action and an audit
event.

### 5.4 Customers

| Field | Type | Rules |
| :--- | :--- | :--- |
| `name` | text | Required when a customer record is created. |
| `phone` | phone | Optional except when delivery policy requires it. |
| `email` | email | Optional. |
| `addresses` | structured data | Restricted; required address fields for delivery. |
| `preferences` | tags/text | Optional. |
| `allergy_notes` | restricted text | Visible only to permitted service/kitchen roles. |
| `loyalty_id` | text | Optional unique identifier. |
| `loyalty_balance` | integer | Updated only by registered functions. |
| `visit_count` | integer | Deterministic projection. |
| `total_spend_minor` | integer | Deterministic projection. |
| `last_order_at` | datetime | Deterministic projection. |
| `status` | enum | `active`, `blocked`, `archived`. |

### 5.5 Orders

| Field | Type | Rules |
| :--- | :--- | :--- |
| `number` | text/integer | Workspace-unique human number. |
| `service_type` | enum | `dine_in`, `takeaway`, `delivery`. |
| `customer_id` | relationship | Optional except when policy requires it. |
| `table_id` | relationship | Required for dine-in when Tables are enabled. |
| `items` | structured snapshot | Menu item, modifiers, quantity, price and tax snapshot. |
| `subtotal_minor` | integer | Deterministically calculated. |
| `discount_minor` | integer | Deterministically calculated and policy checked. |
| `tax_minor` | integer | Deterministically calculated. |
| `service_charge_minor` | integer | Deterministically calculated. |
| `delivery_charge_minor` | integer | Deterministically calculated. |
| `total_minor` | integer | Deterministically calculated. |
| `paid_minor` | integer | Derived from confirmed Payments. |
| `balance_minor` | integer | Derived; cannot be freely edited. |
| `order_state` | enum | See state machine below. |
| `kitchen_state` | enum | See state machine below. |
| `payment_state` | enum | `unpaid`, `partial`, `paid`, `refund_pending`, `refunded`. |
| `assigned_member_id` | member reference | Server or cashier responsible. |
| `notes` | text | Validated and length limited. |
| `opened_at` | datetime | Set by Gateway. |
| `completed_at` | datetime | Set by Gateway. |

Order state:

```text
draft -> confirmed -> in_service -> bill_requested -> completed
   |          |             |
   `----------+-------------+-> cancellation_requested -> cancelled
```

Kitchen state:

```text
not_sent -> queued -> accepted -> preparing -> ready -> served
                              `-> delayed
```

Cancellation, void and removal rules depend on payment and preparation state.
They are never implemented as unrestricted CRUD edits.

### 5.6 Inventory Items

| Field | Type | Rules |
| :--- | :--- | :--- |
| `name` | text | Required. |
| `code` | text | Optional unique code. |
| `unit` | enum | Registered unit such as `kg`, `litre`, `piece`. |
| `on_hand` | decimal | Derived from accepted movements. |
| `reserved` | decimal | Derived when reservation is enabled. |
| `minimum` | decimal | Non-negative reorder threshold. |
| `critical` | decimal | Non-negative critical threshold. |
| `unit_cost_minor` | integer | Restricted by role. |
| `supplier_id` | relationship | Optional. |
| `storage_location` | text/reference | Optional. |
| `available` | boolean | Derived or manager-controlled by policy. |
| `status` | enum | `active`, `inactive`, `archived`. |

`on_hand` is never overwritten by a normal Edit form. Receiving, consumption,
waste, transfer, count and adjustment create Stock Movement records through the
Gateway.

### 5.7 Stock Movements

| Field | Type | Rules |
| :--- | :--- | :--- |
| `inventory_item_id` | relationship | Required. |
| `kind` | enum | `receive`, `consume`, `waste`, `adjust`, `transfer`, `count`. |
| `quantity` | decimal | Signed or directionally validated. |
| `unit` | enum | Must be convertible to the inventory unit. |
| `reason` | enum/text | Required for waste and adjustments. |
| `order_id` | relationship | Optional source Order. |
| `shift_id` | relationship | Optional source Shift. |
| `actor_id` | member reference | Set by Gateway. |
| `approval_id` | relationship | Required when policy demands approval. |
| `created_at` | datetime | Immutable. |

Accepted movements are immutable. Corrections use compensating movements.

### 5.8 Payments

| Field | Type | Rules |
| :--- | :--- | :--- |
| `order_id` | relationship | Required. |
| `kind` | enum | `payment`, `refund`, `reversal`. |
| `amount_minor` | integer | Positive amount; direction comes from kind. |
| `currency` | currency code | Must match permitted order currency. |
| `method` | enum | Registered payment method. |
| `provider_reference` | restricted text | Unique when supplied. |
| `state` | enum | `created`, `pending`, `confirmed`, `failed`, `reversed`. |
| `parent_payment_id` | relationship | Required for refund/reversal. |
| `collected_by` | member reference | Set by Gateway. |
| `confirmed_at` | datetime | Set after deterministic verification. |

Confirmed Payments are immutable. A correction uses a refund or reversal
Workflow. Provider secrets and full sensitive provider responses are not Data
fields.

### 5.9 Shifts

| Field | Type | Rules |
| :--- | :--- | :--- |
| `member_id` | member reference | Required. |
| `terminal` | text/reference | Optional POS station. |
| `opened_at` | datetime | Set by Gateway. |
| `opening_cash_minor` | integer | Entered and confirmed at open. |
| `expected_cash_minor` | integer | Deterministic. |
| `closing_cash_minor` | integer | Entered at close. |
| `variance_minor` | integer | Deterministic. |
| `state` | enum | `open`, `closing`, `closed`, `review_required`. |

## 6. Data CRUD experience

### 6.1 Data home

```text
Data

[Menu Items]  [Orders]       [Tables]    [Customers]
[Inventory]   [Payments]     [Shifts]    [Stock Movements]
```

Every permitted Data screen supports:

- Browse, search, sort and registered filters.
- Add when the role and Data definition permit it.
- Open a record detail page.
- Edit ordinary permitted fields with optimistic version checks.
- View relationships, Workflow activity and audit history.
- Show offline availability and Pending sync state.
- Archive through an overflow menu with confirmation.

Hard deletion is not exposed in normal UI. Financial records, accepted stock
movements and audit events cannot be edited or archived as an ordinary CRUD
operation.

### 6.2 Menu Items list

```text
Menu Items                                      [+ Add menu item]

Search menu...       Category: All       Status: Active

Name                 Category        Price        Availability
Masala Dosa          Breakfast       INR 120      Available
Paneer Tikka         Starters        INR 260      Available
Mango Shake          Drinks          INR 150      Unavailable
```

Record actions:

```text
[Edit]  [Change availability]  [Duplicate]
More: Archive
```

### 6.3 Orders list and detail

```text
Orders

Search order...   Service: All   Status: Open   Date: Today

#1051   Table 7      Preparing          INR 760    8 min
#1050   Takeaway     Ready              INR 420   14 min
#1049   Delivery     Awaiting payment   INR 890   17 min
```

```text
Order #1051                                      Preparing

Table 7 · Server: Anand · Opened 7:42 PM

2 x Masala Dosa                              INR 240
1 x Paneer Tikka                             INR 260
2 x Lime Soda                                INR 160

Subtotal                                     INR 660
Tax                                          INR 100
Total                                        INR 760
Paid                                           INR 0
Balance                                      INR 760

Timeline
7:42 PM  Order opened
7:44 PM  Submitted to kitchen
7:45 PM  Accepted by Main Kitchen

[Add items]  [Request bill]  [Report issue]
```

Buttons launch permitted Workflows. They do not bypass state transitions by
directly modifying the record.

### 6.4 Inventory list and detail

```text
Inventory                                      [Receive stock]

Search item...          State: Low

Item                 On hand       Minimum       Unit       State
Tomatoes             4.2           10            kg         Critical
Coffee beans         8             12            kg         Low
Rice                 42            20            kg         Healthy
```

Inventory detail shows current quantity, reservations, thresholds, supplier,
storage location, recipe usage and recent movements. Quantity changes are
Workflow actions: Receive stock, Record waste, Adjust stock or Count stock.

### 6.5 Tables list

Tables may use a floor-style view and an accessible list view:

```text
Table 1   Available       4 seats
Table 2   Occupied        Order #1047
Table 3   Bill requested  Order #1044
Table 4   Cleaning        Assigned to Mira
```

### 6.6 Customers, Payments and Shifts

Customers use a searchable contact list with restricted details. Payments use
an immutable transaction list with order, method, state and refund
relationships. Shifts show open/close state, deterministic totals and variance;
cashiers see their own Shifts while managers see permitted station summaries.

### 6.7 Add, view and edit record screens

The same predictable layout is used across Data types. Fields that must change
through a Workflow are displayed as read-only values with an appropriate Action
Card instead of an unrestricted input.

#### Add Menu Item

```text
+------------------------------------------------------------------------------+
| ADD MENU ITEM                                                     [Close]    |
+------------------------------------------------------------------------------+
| Name *                 [______________________________________________]       |
| Code                   [________________]                                     |
| Category *             [Breakfast                                      v]    |
| Description            [______________________________________________]       |
|                        [______________________________________________]       |
| Price *                [120_________]  Currency [INR v]                      |
| Tax class *            [Prepared food                                 v]    |
| Preparation station    [Hot kitchen                                  v]    |
| Available              [x] Yes                                              |
| Image                  [Choose file]                                         |
+------------------------------------------------------------------------------+
| [Cancel]                                              [Create menu item]      |
+------------------------------------------------------------------------------+
```

#### Menu Item detail

```text
+------------------------------------------------------------------------------+
| MASALA DOSA                                      Active - Available          |
| Breakfast                                              [Edit] [Actions v]    |
+------------------------------------------------------------------------------+
| Price                  INR 120                                             |
| Tax class              Prepared food                                       |
| Station                Hot kitchen                                         |
| Recipe                 Dosa standard                         [Open recipe]   |
| Last changed           Today, 10:24 AM by Meera                            |
+------------------------------------------------------------------------------+
| RELATED DATA                                                                 |
| Orders today           46                                                    |
| Revenue today          INR 5,520                                             |
| Recipe availability    All ingredients available                            |
+------------------------------------------------------------------------------+
| ACTIVITY                                                                     |
| 10:24 AM  Availability changed to Available                                  |
| Yesterday Price changed from INR 110 to INR 120                              |
+------------------------------------------------------------------------------+
```

#### Edit Menu Item

```text
+------------------------------------------------------------------------------+
| EDIT MENU ITEM - MASALA DOSA                                      [Close]    |
+------------------------------------------------------------------------------+
| Name *                 [Masala Dosa_________________________________]         |
| Category *             [Breakfast                                      v]    |
| Price *                [120_________]  Currency [INR v]                      |
| Tax class *            [Prepared food                                 v]    |
| Preparation station    [Hot kitchen                                  v]    |
|                                                                              |
| Availability is changed through: [Change availability]                       |
+------------------------------------------------------------------------------+
| More: [Archive menu item]                                                     |
| [Cancel]                                                     [Save changes]  |
+------------------------------------------------------------------------------+
```

Saving includes the record base version. A stale update is rejected and the
current record is shown before the person tries again.

#### Inventory detail with controlled actions

```text
+------------------------------------------------------------------------------+
| TOMATOES                                                     Critical        |
| Main Kitchen Store                                            [Actions v]    |
+------------------------------------------------------------------------------+
| On hand               4.2 kg          Read-only official balance            |
| Minimum               10 kg                                                   |
| Critical              5 kg                                                    |
| Unit cost             INR 42/kg       Restricted by role                     |
| Preferred supplier    Fresh Foods Ltd.                                        |
+------------------------------------------------------------------------------+
| STOCK ACTIONS                                                                  |
| [Receive stock] [Record waste] [Count stock] [Request adjustment]             |
+------------------------------------------------------------------------------+
| RECENT MOVEMENTS                                                               |
| Today 5:10 PM    Consume       -1.8 kg      Order production                  |
| Today 9:20 AM    Receive       +8.0 kg      Delivery GRN-208                  |
+------------------------------------------------------------------------------+
```

#### Archive confirmation

```text
+----------------------------------------------+
| ARCHIVE MENU ITEM?                          !|
|                                              |
| Masala Dosa will no longer appear in new     |
| orders. Historical orders will not change.   |
|                                              |
| [Cancel]                    [Archive item]    |
+----------------------------------------------+
```

## 7. Workspace Work

Workspace Work is computed from authorized Bot definitions, Workflow runs and
Data. It is not manually assembled per employee and requires no Work table.

Ordering is deterministic:

```text
urgent waiting work
  -> due work
  -> active runs
  -> permitted Action Cards
  -> Report Cards and approved Data views
```

The initial TARAI Canvas may display at most three primary live blocks. The
three blocks are chosen by role and state; further views remain available from
their destination screens.

### 7.1 Owner and manager Work

Primary cards:

1. Today's Sales Report Card.
2. Open and Delayed Orders Report Card.
3. Low Stock Report/Data Card.

Action launchers:

```text
[New order] [Receive stock] [Close shift] [Issue refund]
```

Active work examples:

- Refund approval for Order #1048.
- Closing Cashier Shift #23.
- Stock count for Main Kitchen.

```text
+------------------------------------------------------------------------------+
| MY RESTAURANT                                      WORK     31 AUG, 7:50 PM  |
| Owner overview                                      Open now                 |
+------------------------------------------------------------------------------+
| TODAY'S SALES          | OPEN ORDERS             | LOW STOCK                 |
| INR 84,250             | 12 open                 | 8 items                   |
| 126 orders             | 4 delayed               | 3 critical                |
| Net: INR 80,900        | [View orders]            | [Review stock]            |
+------------------------------------------------------------------------------+
| ACTIONS                                                                      |
| [New order]  [Receive stock]  [Close shift]  [Issue refund]                 |
+------------------------------------------------------------------------------+
| ACTIVE WORK                                                                  |
| ! Refund approval          Order #1048       Priya requested       [Review]  |
|   Closing shift            Counter 1         Due now                [Open]    |
|   Main Kitchen count       18 of 34 items    In progress            [Open]    |
+------------------------------------------------------------------------------+
| View: [Today] [Orders] [Sales] [Inventory] [Team]                            |
+------------------------------------------------------------------------------+
```

### 7.2 Cashier Work

Primary cards:

1. Quick POS Action Card.
2. Awaiting Payment Data Card.
3. Current Shift Report Card.

Action launchers:

```text
[New order] [Find order] [Record payment] [Request refund]
```

```text
+------------------------------------------------------------------------------+
| CASHIER STATION                                      Shift open: 4h 12m      |
+------------------------------------------------------------------------------+
| QUICK POS                                                                    |
| Service:  [Dine-in]  [Takeaway]  [Delivery]                                 |
| Search menu or scan code: [_______________________________]                  |
|                                                                              |
| Popular: [Masala Dosa] [Coffee] [Meals] [Cold Drinks]                       |
|                                                        [Start new order]     |
+------------------------------------------------------------------------------+
| AWAITING PAYMENT                         | CURRENT SHIFT                     |
| 5 orders                                 | Collected: INR 32,400             |
| Oldest: #1049 - 17 min                   | Cash: INR 11,200                  |
| [Open payment list]                      | [View shift]                      |
+------------------------------------------------------------------------------+
| ACTIVE WORK                                                                  |
| #1054 Takeaway     Selecting items       INR 0                    [Continue] |
| #1049 Delivery     Payment required      INR 890                     [Pay]   |
+------------------------------------------------------------------------------+
| [New order] [Find order] [Record payment] [Request refund]                  |
+------------------------------------------------------------------------------+
```

### 7.3 Server Work

Primary cards:

1. My Tables Data Card.
2. Ready to Serve Data Card.
3. My Active Orders Data Card.

Action launchers:

```text
[Open table] [Add items] [Request bill] [Mark served]
```

```text
+------------------------------------------------------------------------------+
| FLOOR SERVICE                                           Server: Anand        |
+------------------------------------------------------------------------------+
| MY TABLES                 | READY TO SERVE          | ACTIVE ORDERS           |
| 6 occupied               | 4 ready                 | 9 assigned              |
| 2 need attention         | Oldest ready: 3 min     | 1 bill requested        |
| [Open floor]             | [Open queue]            | [View my orders]        |
+------------------------------------------------------------------------------+
| READY NOW                                                                    |
| Table 7   Order #1051   5 items   Main Kitchen                  [Mark served] |
| Table 3   Order #1046   2 items   Drinks                        [Mark served] |
+------------------------------------------------------------------------------+
| [Open table]  [Add items]  [Request bill]  [Mark served]                    |
+------------------------------------------------------------------------------+
```

### 7.4 Kitchen Work

Primary cards:

1. New Kitchen Tickets Data Card.
2. Preparing Orders Data Card.
3. Delayed Orders Data Card.

Action launchers:

```text
[Accept next] [Mark ready] [Report delay] [Report unavailable item]
```

Kitchen projections contain only information required to prepare and route the
order. They do not expose customer contact, payment or margin information.

```text
+------------------------------------------------------------------------------+
| MAIN KITCHEN                                      Target ready time: 15 min  |
+------------------------------------------------------------------------------+
| NEW TICKETS               | PREPARING               | DELAYED                  |
| 5 waiting                 | 8 orders                | 2 orders                 |
| Oldest: 4 min             | Avg age: 7 min          | Oldest: 23 min           |
| [Accept next]             | [Open board]            | [Resolve delay]          |
+------------------------------------------------------------------------------+
| #1051  TABLE 7                                      OPEN 2 MIN               |
| 2 x Masala Dosa          No onion                                             |
| 1 x Paneer Tikka         Medium spice                                         |
| 2 x Lime Soda                                                                  |
| Station: Hot kitchen                                  [Accept ticket]          |
+------------------------------------------------------------------------------+
| #1052  TAKEAWAY                                     PREPARING 8 MIN           |
| 1 x Veg Meal   1 x Coffee                           [Mark ready] [Report delay]|
+------------------------------------------------------------------------------+
| [Accept next] [Mark ready] [Unavailable item] [Record waste]                |
+------------------------------------------------------------------------------+
```

### 7.5 Inventory Work

Primary cards:

1. Critical Stock Data Card.
2. Deliveries Expected Data Card when purchasing is installed.
3. Open Stock Counts Data Card.

Action launchers:

```text
[Receive stock] [Adjust stock] [Start stock count] [Record waste]
```

```text
+------------------------------------------------------------------------------+
| INVENTORY WORK                                         Main Kitchen Store     |
+------------------------------------------------------------------------------+
| CRITICAL STOCK            | EXPECTED TODAY          | STOCK COUNTS            |
| 3 items                   | 2 deliveries            | 1 open                  |
| Tomatoes, coffee, paneer  | Next: 10:30 AM          | 18 of 34 counted        |
| [Review]                  | [View deliveries]       | [Continue count]        |
+------------------------------------------------------------------------------+
| NEEDS ATTENTION                                                              |
| Tomatoes       4.2 kg on hand       Minimum 10 kg              [Receive]     |
| Coffee beans   8 kg on hand         Minimum 12 kg              [Receive]     |
| Paneer         Variance +3.4 kg     Approval required          [Review]      |
+------------------------------------------------------------------------------+
| [Receive stock] [Adjust stock] [Start stock count] [Record waste]           |
+------------------------------------------------------------------------------+
```

## 8. Card catalogue

### 8.1 Report Cards

Report Cards are deterministic, read-only summaries.

| Report | Values | Default roles |
| :--- | :--- | :--- |
| Today's Sales | Gross, discounts, tax, refunds, net and order count | Owner, manager |
| Order Status | New, accepted, preparing, ready and delayed | Owner, manager, kitchen |
| Payment Summary | Cash, card, UPI, unpaid and failed | Owner, manager, cashier scope |
| Low Stock | Low, critical and unavailable items | Owner, manager, inventory |
| Service Time | Accepted-to-ready and ready-to-served durations | Owner, manager |
| Top Menu Items | Quantity and revenue | Owner, manager |
| Waste | Quantity, reason and permitted value | Owner, manager, inventory |
| Shift Summary | Opening, collections, refunds, expected close and variance | Owner, manager, assigned cashier |

An AI skill may explain a deterministic report or draft observations. It cannot
calculate or overwrite the official report values.

### 8.2 Action Cards

| Card | Workflow | Roles |
| :--- | :--- | :--- |
| New Order | POS Bot / Checkout | Cashier, server, manager |
| Open Table | Order Service Bot / Dine-in Service | Server, cashier |
| Add Items | POS Bot / Modify Order | Assigned server, cashier |
| Take Payment | POS Bot / Take Payment | Cashier, permitted manager/server |
| Request Refund | Management Bot / Refund | Cashier, server, manager |
| Receive Stock | Inventory Bot / Receive Stock | Inventory, manager |
| Record Waste | Inventory Bot / Record Waste | Kitchen, inventory |
| Close Shift | Management Bot / Close Shift | Assigned cashier, manager |
| Add Customer | Customer Bot / Add Customer | Cashier, manager |

### 8.3 Active Work Cards

An Active Work Card is a projection of one current Workflow run:

```text
Order #1051 · Table 7
Preparing · Started 8 minutes ago

2 x Masala Dosa
1 x Filter Coffee
1 x Lime Soda

Assigned: Main Kitchen
[Mark ready] [Report delay] [View order]
```

Available buttons are derived from the current Step, role, assignment, record
version and allowed transitions.

### 8.4 Visual Card library

These examples show the intended minimum content and interaction hierarchy.

#### Today's Sales Report Card

```text
+--------------------------------------+
| TODAY'S SALES             Updated now|
|                                      |
| INR 84,250                           |
| 126 completed orders                 |
|                                      |
| Gross                 INR 84,250      |
| Discounts             -INR  1,600    |
| Refunds               -INR  1,750    |
| Net                    INR 80,900     |
|                                      |
| [Open sales report]                  |
+--------------------------------------+
```

#### Order Status Report Card

```text
+--------------------------------------+
| ORDER STATUS                         |
|                                      |
| New             5                    |
| Preparing       8                    |
| Ready           4                    |
| Delayed         2  !                 |
| Awaiting bill   3                    |
|                                      |
| [View all open orders]               |
+--------------------------------------+
```

#### Low Stock Data Card

```text
+--------------------------------------+
| LOW STOCK                         8  |
|                                      |
| Tomatoes       4.2 / 10 kg     !     |
| Coffee beans   8 / 12 kg       !     |
| Rice           18 / 20 kg            |
|                                      |
| [Review all]       [Receive stock]    |
+--------------------------------------+
```

#### New Order Action Card

```text
+--------------------------------------+
| NEW ORDER                            |
|                                      |
| How will this order be served?       |
|                                      |
| [Dine-in]                            |
| [Takeaway]                           |
| [Delivery]                           |
|                                      |
|                  [Cancel]            |
+--------------------------------------+
```

#### Quick POS Step Card

```text
+------------------------------------------------------------------------------+
| NEW TAKEAWAY ORDER                                              Step 2 of 4  |
+------------------------------------------------------------------------------+
| Search menu: [_________________________________]  Category: [All v]          |
|                                                                              |
| Masala Dosa          INR 120       [-]  2  [+]                              |
| Paneer Tikka         INR 260       [-]  1  [+]                              |
| Lime Soda            INR  80       [-]  2  [+]                              |
|                                                                              |
| Notes: [No onion______________________________________________]               |
+------------------------------------------------------------------------------+
| 5 items       Subtotal INR 660       Estimated total INR 760                 |
| [Save draft]                                      [Review order ->]          |
+------------------------------------------------------------------------------+
```

#### Payment Step Card

```text
+----------------------------------------------+
| TAKE PAYMENT                     Order #1051 |
|                                              |
| Total                         INR 760         |
| Already paid                    INR 0         |
| Balance                       INR 760         |
|                                              |
| Method: [Cash] [Card] [UPI]                  |
| Amount: [760________________]                 |
|                                              |
| [Cancel]                    [Continue ->]     |
+----------------------------------------------+
```

#### Ready to Serve Inbox/Work Card

```text
+----------------------------------------------+
| READY TO SERVE                         NEW ! |
|                                              |
| Order #1051 - Table 7                       |
| 5 items - Main Kitchen                      |
| Ready for 2 minutes                         |
|                                              |
| [View ticket]             [Mark served]      |
+----------------------------------------------+
```

#### Error and corrective state

```text
+----------------------------------------------+
| ORDER CHANGED                               !|
|                                              |
| Another person updated Order #1051.          |
| Your changes were not applied.               |
|                                              |
| [Review current order]        [Discard draft]|
+----------------------------------------------+
```

## 9. Inbox plan

Inbox contains work waiting for a particular person. Routine notifications and
every active order do not automatically become Inbox items.

| Inbox item | Trigger | Assignment |
| :--- | :--- | :--- |
| Approve refund | Amount or condition exceeds requester authority | Manager/owner |
| Approve discount | Discount exceeds configured limit | Manager/owner |
| Approve void | Prepared item or paid order is being voided | Manager/owner |
| Resolve payment failure | Provider result is failed or uncertain | Cashier/manager |
| Review stock adjustment | Adjustment exceeds threshold | Manager |
| Confirm count variance | Count variance exceeds policy | Inventory manager |
| Handle delayed order | Preparation exceeds service target | Kitchen lead |
| Confirm unavailable item | Kitchen reports unavailable item | Manager/cashier |
| Complete closing count | Shift reaches closing Step | Assigned cashier |
| Enter missing customer detail | Delivery order lacks required information | Cashier/server |
| Serve ready order | Kitchen marks an assigned order ready | Assigned server |

Lifecycle:

```text
Workflow reaches a human Step
  -> Gateway creates an assigned Personal Inbox item
  -> person starts it
  -> item appears as active Work in the same Workspace
  -> person enters, confirms or approves a response
  -> response becomes an idempotent command
  -> Gateway checks authority, schema, run state and record version
  -> Workflow continues or returns a corrective rejection
  -> Inbox item completes
```

Example approval Card:

```text
Refund approval

Order: #1048
Requested amount: INR 1,250
Reason: Duplicate payment
Requested by: Priya · Cashier
Original payment: UPI · Confirmed

[Approve refund] [Reject] [Ask for information]
```

Approval permits the next deterministic Step; it does not itself call the
payment provider.

### 9.1 Inbox list screen

```text
+------------------------------------------------------------------------------+
| INBOX                                                  4 waiting             |
+------------------------------------------------------------------------------+
| [All] [Approvals 2] [Tasks 2]                 Sort: [Priority v]             |
+------------------------------------------------------------------------------+
| HIGH  Refund approval - Order #1048       Requested 6 min ago       [Review] |
| HIGH  Delayed order - Order #1042         Waiting 23 min            [Open]   |
| MED   Closing count - Counter 1            Due now                   [Start]  |
| LOW   Confirm unavailable item             Kitchen request           [Open]   |
+------------------------------------------------------------------------------+
| Completed items are available from History.                                 |
+------------------------------------------------------------------------------+
```

### 9.2 Refund approval screen

```text
+------------------------------------------------------------------------------+
| REFUND APPROVAL                                             Order #1048      |
+------------------------------------------------------------------------------+
| Requested amount     INR 1,250                                             |
| Refundable balance   INR 1,250                                             |
| Reason               Duplicate payment                                    |
| Requested by         Priya - Cashier                                       |
| Original payment     UPI - Confirmed - Provider ref ...82K                 |
| Requested            6 minutes ago                                         |
+------------------------------------------------------------------------------+
| Order total          INR 1,250                                             |
| Prior refunds          INR 0                                               |
| After approval         INR 0 balance                                       |
+------------------------------------------------------------------------------+
| Decision note: [__________________________________________________________] |
|                                                                              |
| [Ask for information] [Reject]                         [Approve refund]      |
+------------------------------------------------------------------------------+
```

After `Approve refund`, the screen shows `Approved - refund processing`. It
shows `Refund confirmed` only after the deterministic provider Step succeeds.

### 9.3 Inbox-to-Work state change

```text
INBOX: Refund approval
          |
          | user selects Review
          v
WORK: Active approval run
          |
          | approve, reject or request information
          v
GATEWAY VALIDATION
          |
          +---- rejected command ----> WORK: corrective error
          |
          `---- accepted command ----> next Workflow Step -> Inbox completed
```

## 10. Bots

Owners and permitted admins manage Bots from Build. Workers never need to
understand the builder structure to complete their work.

### 10.0 Build and Bot screens

#### Bot list

```text
+------------------------------------------------------------------------------+
| BUILD / BOTS                                                   [+ New Bot]   |
+------------------------------------------------------------------------------+
| POS BOT                 3 Workflows    Active      Orders, Payments  [Open]  |
| ORDER SERVICE BOT       3 Workflows    Active      Orders, Tables    [Open]  |
| KITCHEN BOT             1 Workflow     Active      Orders            [Open]  |
| INVENTORY BOT           4 Workflows    Active      Inventory         [Open]  |
| CUSTOMER BOT            5 Workflows    Active      Customers         [Open]  |
| MANAGEMENT BOT          6 Workflows    Active      Approvals         [Open]  |
+------------------------------------------------------------------------------+
| Installed by Restaurant Kit v1. Local changes are versioned.                 |
+------------------------------------------------------------------------------+
```

#### POS Bot detail

```text
+------------------------------------------------------------------------------+
| BUILD / BOTS / POS BOT                                      Active           |
| Safely create orders, calculate totals and take payment.    [Bot settings]   |
+------------------------------------------------------------------------------+
| DATA                                                                         |
| Menu Items   Orders   Tables   Customers   Payments                          |
+------------------------------------------------------------------------------+
| WORKFLOWS                                                     [+ Workflow]   |
|                                                                              |
| Checkout                                                                     |
|  1 Choose service type       deterministic   Action Card                     |
|  2 Select table/customer     deterministic   Input Card                      |
|  3 Select menu items         deterministic   Quick POS Card                  |
|  4 Validate availability     deterministic   No Card                         |
|  5 Recommend add-on          agentic         Optional Action Card            |
|  6 Calculate totals          deterministic   No Card                         |
|  7 Review order              deterministic   Action Card                     |
|  8 Create order              deterministic   Gateway action                  |
|  9 Send kitchen ticket       deterministic   Channel/Inbox action            |
| 10 Take payment              deterministic   Payment Card                    |
| 11 Finish                    deterministic   Report Card                     |
|                                                       [Edit Workflow]        |
|                                                                              |
| Modify Order                 7 Steps                         [Open]           |
| Take Payment                 8 Steps                         [Open]           |
+------------------------------------------------------------------------------+
```

#### Step detail

```text
+------------------------------------------------------------------------------+
| STEP 8 - CREATE ORDER                                      deterministic     |
+------------------------------------------------------------------------------+
| Entry          Reviewed draft; current menu and tax versions verified        |
| Access         Cashier, Server, Manager within permitted Order scope          |
| Card           None                                                           |
| Actions        database.order_create                                          |
| Validation     schema, role, state, base version, idempotency                  |
| Success        Send kitchen ticket                                            |
| Error          Show corrective error and return to Review order               |
| Approval       None unless an exceptional policy condition is present         |
| Audit          order.created                                                   |
+------------------------------------------------------------------------------+
| [Back]                                                     [Edit Step]        |
+------------------------------------------------------------------------------+
```

### 10.1 POS Bot

Purpose: safely create and modify orders, calculate totals, take payments and
produce receipts.

#### Checkout Workflow

| Step | Mode | Card | Actions and result |
| :--- | :--- | :--- | :--- |
| Choose service type | deterministic | Action/selection | Select an installed service branch. |
| Select table or customer | deterministic | Action/input | Validate table/customer requirements. |
| Select menu items | deterministic | Action (`quick-pos`) | Build a draft selection from available items. |
| Validate availability | deterministic | None | Read menu and inventory availability. |
| Recommend add-on | agentic, optional | Action | Read permitted menu context and propose or skip. |
| Calculate totals | deterministic | None | Run registered pricing and tax functions. |
| Review order | deterministic | Action | Confirm or return to selection. |
| Create order | deterministic | None | Gateway validates and commits Order. |
| Send kitchen ticket | deterministic | None | Create/route the kitchen work item. |
| Take payment | deterministic | Payment | Run now or later according to policy. |
| Finish | deterministic | Report | Generate receipt and update projections. |

The optional add-on Step declares a bounded objective, permitted menu context,
read-only actions, `show_recommendation | skip` transitions, output schema,
budget, timeout and deterministic fallback. It cannot add an item by itself.

#### Modify Order Workflow

```text
Load open order
  -> check role, assignment and order state
  -> select additions or requested removals
  -> check kitchen and payment state
  -> request approval when policy requires it
  -> recalculate totals deterministically
  -> Gateway commits a new Order version
  -> route a kitchen change ticket
```

#### Take Payment Workflow

```text
Confirm current balance
  -> choose registered payment method
  -> create idempotent payment attempt
  -> call registered provider or cash function
  -> verify result
  -> record confirmed Payment
  -> derive Order payment state
  -> generate receipt
```

An uncertain provider response never becomes a confirmed payment. The Workflow
enters a reconciliation or human-resolution Step.

### 10.2 Order Service Bot

Purpose: coordinate table, takeaway and delivery service.

#### Dine-in Service Workflow

```text
Open table
  -> create/open Order
  -> add and submit items
  -> wait for kitchen preparation
  -> create Ready to Serve Inbox item
  -> mark served
  -> request bill
  -> take/verify payment
  -> complete Order
  -> mark table cleaning
  -> mark table available
```

#### Takeaway Workflow

```text
Create Order
  -> capture required customer identifier
  -> take payment according to policy
  -> prepare
  -> mark ready
  -> notify through an approved channel when configured
  -> confirm handover
  -> complete Order
```

#### Delivery Workflow

Delivery adds deterministic address validation, delivery fee calculation,
provider/driver assignment, dispatch and delivery confirmation. Consequential
external calls use registered Gateway-controlled integrations.

### 10.3 Kitchen Bot

Purpose: route kitchen tickets and control preparation state.

#### Prepare Order Workflow

```text
Receive ticket
  -> assign station
  -> accept ticket
  -> start preparation
  -> handle delay or unavailable item when necessary
  -> mark item/order ready
  -> notify assigned service person
```

Kitchen actions cannot modify prices, collect payment, expose unnecessary
customer information or issue refunds.

### 10.4 Inventory Bot

Purpose: maintain official stock through traceable movements.

#### Receive Stock Workflow

```text
Select supplier/source
  -> select inventory items
  -> enter quantity, unit, batch and cost
  -> validate unit conversion
  -> attach permitted invoice/file
  -> request approval for exceptional cost or quantity
  -> create accepted Stock Movements
  -> derive Inventory balances
  -> append audit events
```

#### Low Stock Workflow

```text
Scheduled deterministic check
  -> query items below thresholds
  -> update Low Stock report projection
  -> create assigned Inbox work for critical items
  -> manager chooses reorder, acknowledge or change threshold
```

#### Stock Count Workflow

```text
Start count from a versioned snapshot
  -> assign counters
  -> enter counted quantities
  -> calculate variance
  -> request approval above threshold
  -> create compensating Stock Movements
  -> produce variance report
```

#### Record Waste Workflow

```text
Select item and quantity
  -> choose reason and optional Order
  -> validate available quantity
  -> request approval above threshold
  -> create waste Stock Movement
  -> update availability when threshold is crossed
```

### 10.5 Customer Bot

Purpose: manage permitted customer details and bounded communication.

Workflows:

- Add or update customer.
- Find customer.
- Record preference or allergy note with correct access.
- Apply loyalty credit through a deterministic function.
- Draft a follow-up message with bounded AI help.
- Send a reviewed message through an approved channel.
- Capture and classify feedback.

AI may draft or summarize. Sending, loyalty changes and official customer edits
remain deterministic Gateway actions.

### 10.6 Management Bot

Purpose: handle high-authority operational decisions and closing work.

Workflows:

- Approve discount.
- Void an item or Order.
- Issue refund.
- Close shift.
- Produce daily close report.
- Change operational availability.
- Review stock variance.

#### Refund Workflow

```text
Find original Order and confirmed Payment
  -> enter amount and reason
  -> validate refundable balance and time window
  -> evaluate approval policy
  -> request approval when required
  -> create idempotent refund attempt
  -> call registered refund integration
  -> verify provider result
  -> create Refund Payment record
  -> derive Order balance/state
  -> append audit event
  -> notify requester
```

#### Close Shift Workflow

```text
Select open Shift
  -> calculate deterministic expected totals
  -> cashier enters closing cash
  -> calculate variance
  -> request manager review above threshold
  -> close Shift
  -> generate immutable shift summary
```

## 11. Registered views and actions

The initial implementation should register these views rather than accepting
arbitrary queries from a generated Canvas:

| View ID | Purpose | Maximum result |
| :--- | :--- | :---: |
| `restaurant.sales.today` | Official daily sales summary | 1 |
| `restaurant.orders.open` | Open role-permitted Orders | 20 |
| `restaurant.orders.delayed` | Orders beyond service target | 20 |
| `restaurant.orders.awaiting_payment` | Orders with balance due | 20 |
| `restaurant.tables.mine` | Assigned Tables | 20 |
| `restaurant.kitchen.new` | Queued kitchen tickets | 20 |
| `restaurant.kitchen.preparing` | Accepted/preparing tickets | 20 |
| `restaurant.kitchen.ready` | Ready tickets | 20 |
| `restaurant.inventory.low` | Low and critical inventory | 20 |
| `restaurant.shifts.current` | Current actor Shift summary | 1 |
| `restaurant.approvals.pending` | Permitted pending approvals | 20 |

Registered launch actions:

```text
restaurant.order.create
restaurant.order.modify
restaurant.table.open
restaurant.order.mark_served
restaurant.payment.take
restaurant.refund.request
restaurant.stock.receive
restaurant.stock.adjust
restaurant.stock.count
restaurant.stock.waste
restaurant.shift.open
restaurant.shift.close
restaurant.customer.create
```

Each action resolves to a Bot, Workflow and permitted entry Step. It does not
encode an unrestricted database mutation.

## 12. End-to-end scenarios

### 12.1 Normal takeaway order

```text
Cashier selects New Order
  -> POS Bot starts Checkout
  -> cashier selects Takeaway
  -> cashier adds Menu Items
  -> availability is checked
  -> price and tax are calculated deterministically
  -> cashier confirms
  -> Gateway creates Order #1052
  -> Kitchen Bot receives a ticket
  -> kitchen accepts and starts preparation
  -> payment is processed and verified
  -> kitchen marks the Order ready
  -> cashier receives Ready for Handover Inbox work
  -> cashier confirms handover
  -> Gateway completes the Order
  -> sales, inventory and shift projections update
```

### 12.2 Dine-in order with additional items

```text
Server opens Table 7
  -> Order Service Bot creates an open dine-in Order
  -> server adds and submits the first items
  -> kitchen prepares and serves them
  -> server launches Add Items on the same Order
  -> POS Bot validates state and creates a new Order version
  -> kitchen receives only the new ticket delta
  -> customer requests bill
  -> cashier verifies payment
  -> Order completes and Table enters cleaning
```

### 12.3 Unavailable item

```text
Kitchen reports a Menu Item unavailable
  -> Inventory/Menu availability is validated
  -> affected Order Workflow pauses
  -> cashier/server receives Replace or Remove Inbox work
  -> person records the customer's choice
  -> totals are recalculated
  -> refund/approval runs if necessary
  -> Gateway commits the authorized Order version
  -> kitchen receives an updated ticket
```

### 12.4 Offline order capture

When explicitly enabled for the role and Data type:

```text
Cashier creates a local draft command
  -> UI shows Pending sync
  -> no online payment is represented as confirmed offline
  -> Personal DB queues the idempotent command
  -> Gateway validates membership, definition, prices and base versions on reconnect
  -> accepted Order and events return to the Personal DB
```

Inventory deduction, approvals and provider payments never use automatic
last-write-wins. A conflict pauses for deterministic resolution or review.

## 13. Gateway and audit requirements

For every official effect, the Gateway verifies:

1. Workspace membership and current role/access version.
2. Bot, Workflow and current Step authority.
3. Record scope and assignment.
4. Data schema and allowed state transition.
5. Base record and run versions.
6. Idempotency key and duplicate protection.
7. Approval requirements.
8. Registered integration and input validation.

Required event examples:

```text
order.created
order.items_changed
order.state_changed
kitchen.ticket_accepted
kitchen.order_ready
payment.attempted
payment.confirmed
refund.requested
refund.approved
refund.confirmed
inventory.received
inventory.consumed
inventory.waste_recorded
inventory.adjusted
shift.opened
shift.closed
```

Events carry actor, reference, validated data, idempotency key and timestamp.
Payment and inventory changes must be reconstructable from official records and
events.

## 14. Reporting rules

- Sales reports include confirmed sales according to a declared business-day
  boundary and exclude failed/pending payments.
- Refunds appear separately and contribute deterministically to net sales.
- Order counts state whether cancelled Orders are included.
- Service-time metrics use recorded state-transition timestamps.
- Inventory valuation uses a declared registered method; AI never invents it.
- Reports show generation time, currency and active filters.
- A report may link to its underlying permitted records.
- Role filtering applies before aggregation where necessary to avoid leakage.

## 15. Failure and recovery behavior

| Failure | Required behavior |
| :--- | :--- |
| Menu item becomes unavailable | Prevent confirmation or pause for replacement. |
| Order version changed | Reject stale command and show current Order. |
| Duplicate submission | Return the prior idempotent result. |
| Payment provider timeout | Keep Payment pending/unknown and reconcile; do not retry blindly. |
| Kitchen send failure | Retain Order, expose retry state and do not duplicate ticket. |
| Approval expires | Follow declared fallback; never execute the consequential action. |
| Stock would become invalid | Reject or enter approved exception path. |
| Member access revoked | Reject new commands and remove synced projections on reconnection. |

## 16. Implementation order

1. Define and validate the canonical Restaurant Kit document format.
2. Align Bot Builder output with Harness `data | bot` definitions, Step modes,
   actions, transitions, access and fallbacks.
3. Implement kit preview, compatibility matching and approved installation.
4. Register restaurant views and Workflow launcher actions.
5. Implement Menu Items, Orders, Tables and Inventory CRUD/detail screens.
6. Implement POS, Kitchen and Order Service Bots.
7. Implement Payment, Refund, Inventory and Shift functions with idempotency.
8. Implement Inbox assignment, approval and resume behavior.
9. Add role-specific Work composition and Report Cards.
10. Add offline projections only after access, conflict and expiry tests pass.
11. Add optional Customer, Reservation, Supplier and Delivery extensions.

## 17. Acceptance criteria

The Restaurant Workspace Kit is complete when:

- Installation produces only ordinary versioned Data and Bot definitions.
- An owner can review every created definition and access rule before commit.
- Cashier, server, kitchen, inventory and manager roles receive different Work
  without manually maintained dashboards.
- A permitted user can complete dine-in and takeaway Orders end to end.
- Kitchen work is routed and resumed through deterministic Workflow state.
- Payments, refunds and stock changes are idempotent and auditable.
- Approval Inbox items pause and correctly resume their originating runs.
- CRUD screens enforce schema, field access, record scope and version checks.
- Historical Order prices and confirmed financial records cannot be rewritten by
  later menu edits.
- Report values reconcile with official Orders, Payments, Stock Movements and
  Shifts.
- Offline commands show Pending sync and never falsely confirm consequential
  effects.
- AI is bounded to declared assistance or allowlisted agentic decisions and
  cannot commit official changes.
- All rejection paths provide a corrective, user-readable message.

> **The Restaurant Kit supplies a ready operating model. Bots provide the
> capability, Workflows organize the Steps, Workspace Data holds the truth,
> Inbox connects people to waiting work, and the Gateway protects every official
> change.**
