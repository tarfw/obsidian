# Tools Concept Screens & Data Architecture

> **Design Principle:** Zero-complexity mobile interfaces designed for the working class and small merchants of Tamil Nadu & India. Every tool is an uncluttered, single-job screen operated by touch, barcode, or voice. All business facts write directly to canonical typed records in Turso with zero brittle JSON plumbing.

---

## 1. Data Architecture: The Shared Context

Tools never pipe messy API payloads directly to each other. Every tool is a focused projection over canonical records stored in the workspace database.

```text
 ┌────────────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
 │ USER ACTION            │ ────► │ TURSO DATABASE         │ ────► │ REAL-TIME SYNC         │
 │ (1-Tap / Barcode Scan /│       │ Canonical `records`    │       │ (Inbox "Now" Card,     │
 │  Voice / Cash Drawer)  │       │ (item, order, invoice, │       │  WhatsApp Customer PDF,│
 │                        │       │  payment, cash, stock) │       │  Telegram Team Alert)  │
 └────────────────────────┘       └────────────────────────┘       └────────────────────────┘
```

| Store | Purpose | Table / Storage |
| :--- | :--- | :--- |
| **Business Facts** | Items, stock, prices, invoices, cash, contacts | Turso `records` (`type` selects contract) |
| **Team & Auth** | Roles, briefs, tool access | Turso `records` (`type="party"`) |
| **Flow Processes** | Active checklist runs and step state | Turso `runs`, `steps`, `events` |
| **AI Judgments** | Cached Jev choices, nouls, scores | Turso `assessments` |
| **Media & PDF** | Photos, generated bills, printable labels | Cloudflare R2 (`records` holds hash/key) |

---

## 2. The 18 Tool Concept Screens & Data Flows

```
 1. pos        5. order      9. purchase    13. flow       17. whatsapp
 2. register   6. invoice   10. members     14. site       18. telegram
 3. item       7. payment   11. contact     15. inbox
 4. inventory  8. expense   12. human       16. chat
```

* **Shop Brand:** **Aambal Neyvagam** (ஆம்பல் நெய்வகம் — Handloom & Apparel Atelier)
* **Live Storefront:** `aambal.tar.site`
* **Team Members (100% Pure Tamil Women Names):**
  * **Kayalvizhi** (கயல்விழி) — Shop Owner & Lead
  * **Kanimozhi** (கனிமொழி) — Counter Cashier
  * **Senthamizh** (செந்தமிழ்) — Retail Customer
  * **Thamizhchelvi** (தமிழ்ச்செல்வி) — Wholesale Buyer
  * **Poonguzhali** (பூங்குழலி) — Weaving Cooperative Manager
  * **Ilavenil** (இளவேனில்) — Packing & Dispatch
  * **Mathivathani** (மதிவதனி) — Inventory & Audit
  * **Yazhini** (யாழினி) — Online Customer

---

### 1. `pos` · Point of Sale

Ultra-fast counter checkout with instant barcode scan, tap-to-add items, single-tap UPI QR display, and automated WhatsApp receipting.

```text
+--------------------------------------------------+
| AAMBAL NEYVAGAM · Kadanai               [Shift #14]|
+--------------------------------------------------+
| [ SCAN BARCODE / TAP PRODUCT SEARCH            ] |
|--------------------------------------------------|
| CART (2 items)                                   |
|  1x Semparuthi Pattu Selai (Sivappu)      ₹4,500 |
|  1x Ponizhai Karai Paruthi Veshti           ₹850 |
|--------------------------------------------------|
| TOTAL DUE: ₹5,350                                |
|                                                  |
| PAYMENT METHOD                                   |
|  [*] UPI QR        [ ] CASH        [ ] CARD      |
|                                                  |
| Customer WhatsApp (Optional):                    |
| [ 98401 23456  (Senthamizh)                    ] |
|--------------------------------------------------|
| [ Clear Cart ]          [ Complete Sale · ₹5,350 ]|
+--------------------------------------------------+
```

* **Touch / Sensor Inputs:** Barcode camera scan, item tap, customer phone number, payment mode chip (`UPI`, `Cash`, `Card`), single tap on `Complete Sale`.
* **Storage (`records` in Turso):**
  * `type="order"`: `{lines: [...], totals: 535000, channel: "pos", status: "completed"}`
  * `type="invoice"`: `{lines: [...], amount: 535000, status: "paid"}`
  * `type="payment"`: `{method: "upi", amount: 535000, reference: "UPI-429188"}`
  * Decrements `type="stock"` on-hand balance for sold SKUs.
* **Downstream Sync:**
  * Triggers `whatsapp` tool $\rightarrow$ dispatches digital PDF bill to Senthamizh's phone (+91 98401 23456).
  * Automatically increments counter cash / UPI ledger in active `register` shift.

---

### 2. `register` · Cash Drawer & Shift

Count physical cash at shift end, log drawer drops, and balance daily cash with zero arithmetic errors.

```text
+--------------------------------------------------+
| Cash Drawer · Kanimozhi (Shift #14)       [Close]|
+--------------------------------------------------+
| SHIFT SUMMARY                                    |
|  Opening Float:                          ₹2,000  |
|  Cash Sales Logged:                     ₹12,200  |
|  Cash Expenses Paid Out:                  ₹500   |
|--------------------------------------------------|
| EXPECTED IN DRAWER:                     ₹13,700  |
|                                                  |
| PHYSICAL CASH COUNT (Tap quantity)               |
|  ₹500 x [ 25 ] = ₹12,500                         |
|  ₹200 x [  5 ] =  ₹1,000                         |
|  ₹100 x [  2 ] =    ₹200                         |
|  Total Counted:                         ₹13,700  |
|  Variance:                                   ₹0  |
|--------------------------------------------------|
| [ Cash In / Out ]             [ Close Shift & Lock ]|
+--------------------------------------------------+
```

* **Touch / Sensor Inputs:** Denomination count stepper (`[ 25 ]`, `[ 5 ]`, `[ 2 ]`), optional payout reason, tap `Close Shift & Lock`.
* **Storage (`records` in Turso):**
  * `type="shift"`: `{actor: "Kanimozhi", float: 200000, expected: 1370000, actual: 1370000, variance: 0, status: "closed"}`
  * Appends balanced double-entry `type="posting"`.
* **Downstream Sync:**
  * If variance $> 0$, automatically surfaces high-priority alert in Kayalvizhi's (Owner) `inbox`.
  * Sends evening closing summary directly to team `telegram` channel (₹0.00 cost).

---

### 3. `item` · Catalog Item

```text
+--------------------------------------------------+
| Add Product · Aambal Neyvagam            [Cancel]|
+--------------------------------------------------+
| +---------------+                                |
| |  [+ PHOTO]    |  pattu_semparuthi_01.jpg        |
| |               |  1200 x 1200 (Square 1:1)       |
| |  (Auto-Crop)  |  Uploaded to Cloudflare R2      |
| +---------------+                                |
|                                                  |
| Product: [ Semparuthi Pattu Selai              ] |
| Category: [ Kaithari Pattu Selaigal          v ] |
| Price: [ ₹8,200 ]          MRP: [ ₹9,500       ] |
| Initial Stock: [ 12 ]      Tax: [ GST 5%       ] |
|                                                  |
| VARIANTS (1-Tap Detected via JEV):               |
|  [✓] 4-Muzham (₹4,500)   [✓] 8-Muzham (₹8,200)   |
|--------------------------------------------------|
| [ Save Draft ]                  [ Save & Publish ]|
+--------------------------------------------------+
```

| Fact / Asset | Engine | Storage Target / Key | Downstream Destination |
| :--- | :--- | :--- | :--- |
| **Photo Binary** | Cloudflare R2 | `artifacts/products/{hash}.webp` | Edge CDN, Storefront gallery |
| **Product Record** | Turso Database | `type="item"` (`name`, `category`, `specs`) | `pos` search, `site` catalog |
| **Variant Records** | Turso Database | `type="variant"` (`sku`, `barcode`, `option`) | `pos` barcode scanner, stock ledger |
| **Price & Stock** | Turso Database | `type="price"`, `type="stock"` (`onhand`) | Counter checkout, inventory audit |
| **Published PDP** | Cloudflare R2 | `sites/aambal/products/{slug}/index.html` | $0/visitor public edge storefront |

| Catalog Step | JEV (System One: ~100ms) | LLM (Text Generation) | Code (Deterministic) |
| :--- | :--- | :--- | :--- |
| **Category & Dimension** | `choice`: Detects category & variant dimension | None | Binds to system schema |
| **Variant Generation** | `choice`: Identifies options from voice/text | None | Computes Cartesian rows, auto-generates barcodes |
| **Pricing, GST & Stock** | None | 0% *(Never touches numbers)* | Exact math: ₹ in paise, 5% GST, stock count |
| **Long Descriptions & SEO** | `score`: Validates vocabulary & tone | Drafts 5 bullets & 100-word story | Compiles Schema.org JSON-LD to R2 |
| **Publishing to Edge** | None | None | Compiles static HTML PDP $\rightarrow$ R2 |

| # | Dimension Key | Category | Supported Trades | Examples |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **`size`** | Physical Space | Apparel, Footwear, Linens | `S / M / L`, `38 / 40`, `Shoe 8 / 9`, `King` |
| **2** | **`length`** | Physical Dimension | Handlooms, Hardware, Cables | `4-Muzham`, `8-Muzham`, `6.2m`, `10m roll` |
| **3** | **`weight`** | Mass / Volume | Groceries, Sweets, Gold, Meat | `250g`, `500g`, `1kg`, `25kg bag`, `1 Pavan` |
| **4** | **`volume`** | Liquid Capacity | Oils, Beverages, Paints, Ghee | `100ml`, `500ml`, `1L`, `5L Can` |
| **5** | **`color`** | Sensory Quality | Textiles, Paints, Decor, Crafts | `Sivappu (Red)`, `Neelam (Blue)`, `Temple Border` |
| **6** | **`flavour`** | Sensory Quality | Bakeries, Ice Creams, Agarbatti | `Chocolate / Vanilla`, `Sandalwood scent` |
| **7** | **`material`** | Material Grade | Jewellery, Furniture, Textiles | `Pure Silk vs Art Silk`, `Silver 92.5`, `Teak` |
| **8** | **`portion`** | Food & Canteen | Restaurants, Mess, Biryani | `Quarter`, `Half`, `Full`, `Single cup`, `Flask` |
| **9** | **`prep`** | Custom / Recipe | Home Food, Kitchens, Tailoring | `Eggless`, `No Sugar`, `With Lining (+₹150)` |
| **10** | **`time`** | Duration / Service | Rentals, Gyms, Services, Classes | `1 Hour`, `1 Day rental`, `1 Month plan` |
| **11** | **`tier`** | Turnaround / Level | Tailors, Repairs, Salons | `Standard (3 days) vs Express (1 day)`, `VIP` |
| **12** | **`pack`** | Trade Packaging | FMCG, Kirana, Wholesale | `Single (1x)`, `Pack of 6`, `Box of 50` |

```typescript
const result = await client.systemOne({
  state: { trade: workspace.trade, product: title, input: rawText },
  questions: {
    dimension: {
      type: "choice",
      instructions: "Which of the 12 universal variant dimensions does `input` specify for `product`?",
      criteria: {
        size: "Clothing, shoe size, or dimensions",
        length: "Traditional textile length (Muzham) or wire",
        weight: "Mass or grocery weight (grams, kg)",
        volume: "Liquid volume (ml, L)",
        color: "Color, shade, or pattern",
        flavour: "Food flavor or aroma",
        material: "Metal, fabric, or wood grade",
        portion: "Meal serving (Half, Full, Cup)",
        prep: "Dietary or tailoring option (Eggless, Lining)",
        time: "Rental or service duration",
        tier: "Speed or service level (Express 1-day)",
        pack: "Pack count or wholesale bundle",
        none: "Single fixed item with no options",
      },
    },
  },
});
```

```text
[ Merchant Voice / Text ] ──► [ JEV: System One (~100ms) ] ──► [ Deterministic Code (0% AI) ]
"Red & Blue, S & M"             Matches: [color, size]           • Computes: 2 x 2 = 4 variants
                                                                 • Binds: Base price ₹8,200
                                                                 • Generates: Barcodes 890...01-04
                                                                 • Writes: Turso `records`
```

---

### 4. `inventory` · Stock & Transfers

Perform quick audits, record damaged items, or transfer rolls and garments between godown and counter.

```text
+--------------------------------------------------+
| Stock Adjustment                          [History]|
+--------------------------------------------------+
| Product: Semparuthi Pattu Selai (Thirumana Adai) |
| Location: Main Shop Counter                      |
|                                                  |
| CURRENT RECORD:  12 pieces                       |
| COUNTED ACTUAL: [ 10 ] pieces                    |
| DIFFERENCE:      -2 pieces (Deficit)             |
|                                                  |
| REASON FOR ADJUSTMENT:                           |
|  ( ) Damaged / Display soil                      |
|  ( ) Transferred to Godown                       |
|  (*) Stock count audit correction                |
|                                                  |
| Note: [ Sent 2 pieces to dry cleaning          ] |
|--------------------------------------------------|
| [ Cancel ]                         [ Confirm Post ]|
+--------------------------------------------------+
```

* **Touch / Sensor Inputs:** Barcode scan / product select, counted actual quantity, radio button for reason, tap `Confirm Post`.
* **Storage (`records` in Turso):**
  * `type="stock"`: Updates `{onhand: 10, reserved: 0}`
  * Appends audit record `type="audit"`: `{item, delta: -2, reason: "audit", actor: "Mathivathani"}`
* **Downstream Sync:**
  * When stock drops below minimum threshold ($\le 2$), flags **Low Stock** order recommendation in `inbox`.
  * If stock reaches 0, auto-badges item as "Sold Out" on `aambal.tar.site`.

---

### 5. `order` · Customer Orders

Manage online WhatsApp orders, local pickups, and out-of-town parcel fulfillment in one place.

```text
+--------------------------------------------------+
| Order #1042 · WhatsApp Order            [Actions]|
+--------------------------------------------------+
| Customer: Senthamizh (+91 94441 55667)           |
| Delivery to: 14 Mada Veedhi, Mylapore, Chennai   |
|                                                  |
| ORDER ITEMS                                      |
|  2x Mayilkazhuthu Pattu Selai            ₹9,000  |
|  Delivery Fee (Anjalakam Virivu)           ₹150  |
|--------------------------------------------------|
| Total: ₹9,150                   Status: Confirmed|
| Payment: UPI Paid (Verified)                     |
|                                                  |
| PROGRESS                                         |
|  [✓] Accepted   [●] Packing   [ ] Dispatched     |
|--------------------------------------------------|
| [ Print Packing Slip ]       [ Mark Packed & Ship ]|
+--------------------------------------------------+
```

* **Touch / Sensor Inputs:** Tap order card, view items, print packing slip, tap `Mark Packed & Ship`.
* **Storage (`records` in Turso):**
  * `type="order"`: `{customer: id, lines: [...], totals: 915000, state: "packed", tracking: "TN88219"}`
  * Moves units in `type="stock"` from `onhand` to `reserved` upon placement, and decrements upon dispatch.
* **Downstream Sync:**
  * Updates packing queue in Ilavenil's (Dispatch) `inbox`.
  * Automatically fires `whatsapp` tool $\rightarrow$ dispatches tracking link to Senthamizh.

---

### 6. `invoice` · Billing & GST

Issue commercial tax invoices, wholesale bills, and B2B vouchers compliant with Indian GST rules.

```text
+--------------------------------------------------+
| Invoice #INV-2026-089                     [Print]|
+--------------------------------------------------+
| Billed to: Marutham Neyvagam                     |
| Buyer Contact: Thamizhchelvi                     |
| GSTIN: 33AAAAA0000A1Z5                           |
| Date: 05/10/2026                 Due: Immediate  |
|--------------------------------------------------|
| #  Item Description        Qty   Rate     Amount |
| 1  Kaithari Pattu Nool (m)  40   ₹300    ₹12,000 |
| 2  Ponizhai Karai (Roll)     5   ₹600     ₹3,000 |
|--------------------------------------------------|
| Subtotal:                                ₹15,000 |
| CGST (2.5%) + SGST (2.5%):                  ₹750 |
| GRAND TOTAL:                             ₹15,750 |
|--------------------------------------------------|
| [ Send PDF via WhatsApp ]        [ Record Payment ]|
+--------------------------------------------------+
```

* **Touch / Sensor Inputs:** Party selection, line item picker, GST rate toggle (5% / 12%), tap `Send PDF via WhatsApp`.
* **Storage (`records` in Turso):**
  * `type="invoice"`: `{party: id, lines: [...], totals: 1575000, tax: 75000, status: "issued"}`
  * Appends balanced double-entry `type="posting"` (Receivable debit, Revenue/Tax credit).
  * Generates PDF artifact saved to Cloudflare R2 $\rightarrow$ pointer saved as `type="artifact"`.
* **Downstream Sync:**
  * Sits ready in `payment` tool for immediate settlement.
  * Dispatches printable PDF bill to Thamizhchelvi via `whatsapp`.

---

### 7. `payment` · Payments & Settlements

Record payments received against open customer invoices or settle customer returns cleanly.

```text
+--------------------------------------------------+
| Record Payment for Invoice #INV-089       [Cancel]|
+--------------------------------------------------+
| Balance Due: ₹15,750                             |
|                                                  |
| AMOUNT RECEIVED:                                 |
| [ ₹15,750                                      ] |
|                                                  |
| PAYMENT METHOD:                                  |
|  (*) UPI (PhonePe / GPay)                        |
|  ( ) Cash Drawer                                 |
|  ( ) Bank Transfer (NEFT/IMPS)                   |
|                                                  |
| UPI Transaction ID / Ref:                        |
| [ 429188239011                                 ] |
|--------------------------------------------------|
| [ Partial Payment ]           [ Save & Settle Bill ]|
+--------------------------------------------------+
```

* **Touch / Sensor Inputs:** Amount box (auto-filled with full balance), payment method chip, UPI transaction reference, tap `Save & Settle Bill`.
* **Storage (`records` in Turso):**
  * `type="payment"`: `{invoice: id, amount: 1575000, method: "upi", reference: "429188239011"}`
  * Updates `type="invoice"` status $\rightarrow$ `paid`.
  * Appends double-entry `type="posting"` (Bank debit, Accounts Receivable credit).
* **Downstream Sync:**
  * Closes outstanding invoice alert from Kayalvizhi's (Owner) `inbox`.
  * Logs transaction to active daily shift in `register`.

---

### 8. `expense` · Daily Expenses

Log shop expenses (refreshments, packaging tape, local transport) in under 5 seconds.

```text
+--------------------------------------------------+
| Quick Shop Expense                        [Cancel]|
+--------------------------------------------------+
| AMOUNT SPENT:                                    |
| [ ₹240                                         ] |
|                                                  |
| QUICK CATEGORY (1-Tap):                          |
|  [*] Kaapi & Tea          [ ] Packing Boxes/Tape |
|  [ ] Anjalakam Courier    [ ] Shop Upkeep        |
|                                                  |
| PAID FROM:                                       |
|  (*) Cash Drawer (Counter)                       |
|  ( ) Owner UPI                                   |
|                                                  |
| Note: [ Afternoon kaapi & vadai for weavers    ] |
|--------------------------------------------------|
|                                     [ Save Expense ]|
+--------------------------------------------------+
```

* **Touch / Sensor Inputs:** Amount keypad, single tap on category chip, source toggle, optional voice note, tap `Save Expense`.
* **Storage (`records` in Turso):**
  * `type="expense"`: `{amount: 24000, category: "refreshment", source: "drawer", note: "kaapi", actor: "Kanimozhi"}`
  * Automatically reduces cash balance in active `register` shift record.
  * Appends expense row in `type="posting"`.
* **Downstream Sync:**
  * Reflected instantly in evening cash reconciliation count.
  * Factored into monthly profit-and-loss summary report.

---

### 9. `purchase` · Supplier Purchases

Create supply orders, record raw materials received from weaver cooperatives, and manage credit.

```text
+--------------------------------------------------+
| Purchase Order #PO-402                    [Cancel]|
+--------------------------------------------------+
| Supplier: Erode Kaithari Neyvor Kooturavu        |
| Cooperative Rep: Poonguzhali                     |
| Expected Delivery: 10/10/2026                    |
|                                                  |
| ITEMS TO ORDER                                   |
|  1. Paruthi Veshtigal (8-Muzham)  20 pcs @ ₹400  |
|  2. Pattu Thugilgal               10 pcs @ ₹950  |
|--------------------------------------------------|
| Total Estimated: ₹17,500                         |
| Payment Terms: 30 Days Credit                    |
|                                                  |
| SHIPMENT ARRIVAL:                                |
|  [✓ Receive 20 Veshtigal ] [✓ Receive 10 Thugil ]|
|--------------------------------------------------|
| [ Share PO to Supplier ]        [ Receive All & Add Stock ]|
+--------------------------------------------------+
```

* **Touch / Sensor Inputs:** Supplier picker, line item quantity, agreed wholesale rate, tap `Receive All & Add Stock`.
* **Storage (`records` in Turso):**
  * `type="purchase"`: `{supplier: id, lines: [...], totals: 1750000, status: "received"}`
  * Increments `onhand` balance in `type="stock"` for each received item variant.
  * Appends double-entry liability posting in `type="posting"`.
* **Downstream Sync:**
  * Increases stock quantities available on `pos` counter and `aambal.tar.site`.
  * Adds supplier payment due date into Kayalvizhi's `inbox`.

---

### 10. `members` · Team & Access

Manage shop team members, define plain-language job briefs, and inspect Jev-evaluated tool permissions.

```text
+--------------------------------------------------+
| Member: Kanimozhi                         [Remove]|
+--------------------------------------------------+
| Phone: +91 98402 33445        Role: Member       |
| Position: Counter Cashier                        |
|                                                  |
| JOB BRIEF:                                       |
| "Kanimozhi handles counter sales, scans items,   |
|  takes payments, and closes the cash drawer."    |
|                                                  |
| TOOL ACCESS (Suggested by Jev from brief)        |
|  [✓] Point of sale (`pos`)             0.97  on  |
|  [✓] Cash drawer & shift (`register`)  0.93  on  |
|  [✓] Store Closing (`flow`)            0.91  on  |
|  [ ] Supplier purchases (`purchase`)   0.12  off |
|--------------------------------------------------|
| [ Discard ]                         [ Save Access ]|
+--------------------------------------------------+
```

* **Touch / Sensor Inputs:** Mobile number (for passwordless OTP login), staff title, plain-language job brief, toggle checkboxes, tap `Save Access`.
* **Storage (`records` in Turso):**
  * `type="party"`: `{phone: "+919840233445", role: "member", workrole: "cashier", brief: "...", access: ["pos", "register", "closing"]}`
  * Saves Jev evaluation scores in `assessments` table for audit trail.
* **Downstream Sync:**
  * When Kanimozhi logs into `tarapp` on her phone, only authorized tools appear on her screen.

---

### 11. `contact` · Contacts Directory

Store customers, weavers, suppliers, and couriers with instant 1-tap call and WhatsApp buttons.

```text
+--------------------------------------------------+
| Contact Details                           [Edit] |
+--------------------------------------------------+
| Name: Senthamizh                                 |
| Type: [ Customer                               ] |
| Mobile: +91 94441 55667 (WhatsApp Active)        |
| Area: Mylapore, Chennai (Pincode: 600004)        |
|                                                  |
| COMMERCIAL HISTORY                               |
|  Total Orders: 6               Total Spend: ₹28k |
|  Last Visit: Yesterday         Status: Regular   |
|  Favorite: Semparuthi Kaithari Pattu Selaigal    |
|--------------------------------------------------|
| [ Call Phone ]               [ Open WhatsApp Chat ]|
+--------------------------------------------------+
```

* **Touch / Sensor Inputs:** Name, phone number, delivery address, pincode, category tag, tap `Call Phone` or `Open WhatsApp Chat`.
* **Storage (`records` in Turso):**
  * `type="contact"`: `{name: "Senthamizh", phone: "+919444155667", type: "customer", address: "14 Mada Veedhi", pincode: "600004"}`
* **Downstream Sync:**
  * Auto-completes customer address and phone in `pos` and `order`.
  * Enables 1-tap WhatsApp chat initiation directly from the app.

---

### 12. `human` · Manual "You Do" Step

Uncluttered physical task checklist screens for tasks performed by hand in the real world.

```text
+--------------------------------------------------+
| Task #42 · You Do                        [Defer] |
+--------------------------------------------------+
| INSTRUCTION                                      |
| "Check and lock the front shutter and deposit    |
|  the counter key in the safety locker."          |
|                                                  |
| Assigned to: Kanimozhi (Cashier)                 |
| Time: 21:45 (Evening Closing)                    |
|                                                  |
| CHECKLIST:                                       |
|  [✓] Shutter locked with center lock             |
|  [✓] Key kept in owner desk locker               |
|                                                  |
| Photo Proof (Optional): [ Camera: Shutter.jpg ]  |
|--------------------------------------------------|
|                                     [ Tap Done ] |
+--------------------------------------------------+
```

* **Touch / Sensor Inputs:** Checkbox ticks, optional phone camera photo verification, tap `Tap Done`.
* **Storage (`runs` & `steps` in Turso):**
  * `steps`: `{actor: "Kanimozhi", completed_at: timestamp, proof_photo: key, status: "completed"}`
  * Advances active flow in `runs` table to step $N+1$.
* **Downstream Sync:**
  * Removes task card from Kanimozhi's `inbox`.
  * If this was the final step of Closing, notifies Kayalvizhi (Owner) via `telegram`.

---

### 13. `flow` · Checklists & Routines

Track multi-step shop procedures without paper checklists or verbal confusion.

```text
+--------------------------------------------------+
| Store Closing Routine · Step 2 of 4      [Pause] |
+--------------------------------------------------+
| Active Run: #RUN-142      Actor: Kanimozhi       |
| Started: 21:30            Shift: Evening Close   |
|--------------------------------------------------|
| [✓] 1. POS sales snapshot      (App: pos)        |
|                                                  |
| [●] 2. Count physical cash     (You do)          |
|     Drawer expected: ₹13,700                     |
|     Actual counted: [ ₹13,700      ]             |
|     [ Submit Cash Count ]                        |
|                                                  |
| [ ] 3. Lock shop & keys        (You do)          |
| [ ] 4. Send closing report     (App: Telegram)   |
+--------------------------------------------------+
```

* **Touch / Sensor Inputs:** Step-by-step progress, numeric count inputs, action taps.
* **Storage (`runs` & `definitions` in Turso):**
  * `definitions`: `{kind: "flow", id: "close", steps: [...]}`
  * `runs`: `{flow_id: "close", current_step: 2, state: "running"}`
* **Downstream Sync:**
  * App steps automatically launch target tools (e.g. `register`).
  * Human physical steps push actionable prompt cards to `inbox`.

---

### 14. `site` · Site Studio

Autopilot AI storefront manager with live preview, zero-coding styling, and 1-tap live publish.

```text
+--------------------------------------------------+
| Site Studio · Aambal Neyvagam           [Publish]|
+--------------------------------------------------+
| LIVE: aambal.tar.site       (Visits: ₹0 model)   |
| Active Theme: Lookbook (Clean Tamil Typography)  |
| Products bound from DB: 24 items                 |
|                                                  |
| AGENT AUTOPILOT STATUS                           |
|  ● Mobile Speed & Contrast: Passing (100)        |
|  ● WhatsApp orders: Connected (+91 98401...)     |
|  ● Tamil + English translations: Synced          |
|                                                  |
| QUICK STYLING ACTIONS (1-Tap):                   |
|  [ Darker Theme ]   [ Bigger Photos ]   [ Bento ]|
|--------------------------------------------------|
| 🎤 "Tell your agent what to change on the site"  |
+--------------------------------------------------+
```

* **Touch / Sensor Inputs:** Voice fragment, quick action chips, 1-tap `Publish` button.
* **Storage (`records` in Turso & Cloudflare R2):**
  * AST document saved in `records`: `{type: "site", theme: "lookbook", revision: 12}`
  * On Publish: Pure code compiler compiles static HTML to Cloudflare R2.
  * Live epoch updated in D1 CONTROL ($0 per customer visit).
* **Downstream Sync:**
  * Instant worldwide CDN propagation.
  * Public visitors browse compiled static assets with zero AI runtime costs.

---

### 15. `inbox` · Team Feed & Now

Role-projected unified work surface. Cashiers, packers, and owners see only what requires their immediate action.

```text
+--------------------------------------------------+
| Now · Aambal Neyvagam                            |
| Role: Cashier · Kanimozhi                        |
+--------------------------------------------------+
| DO NOW (2 items)                                 |
|  ● Store Closing routine · Step 2 of 4         › |
|  ● Confirm WhatsApp Order #1043 (Senthamizh)   › |
|                                                  |
| WAITING (1 item)                                 |
|  ○ Anjalakam Courier arrival for Order #1041     |
|                                                  |
| COMPLETED TODAY                                  |
|  ✓ Morning float opened (₹2,000)                 |
|  ✓ 18 counter sales recorded                     |
|--------------------------------------------------|
| [ Tools ]                                        |
+--------------------------------------------------+
```

* **Touch / Sensor Inputs:** Tap on task card, swipe to dismiss, pull-to-refresh.
* **Storage (`records` in Turso):**
  * Read projection dynamically derived from authorized `records`, `runs`, and `steps`.
  * Completing an item dispatches source Gateway action without leaving the screen.
* **Downstream Sync:**
  * Real-time clearance of completed tasks across all phones in the shop.

---

### 16. `chat` · Manual WhatsApp Chat (Free · ₹0.00)

Direct 1-tap WhatsApp deep-link (`wa.me`) that opens the merchant's local WhatsApp / WhatsApp Business app with pre-filled message text. Zero API cost, zero setup required.

```text
+--------------------------------------------------+
| WhatsApp Chat (Manual · ₹0.00)           [Cancel]|
+--------------------------------------------------+
| Recipient: Senthamizh (+91 94441 55667)          |
| Source: POS Counter Sale #1042                   |
| Cost: ₹0.00 (Opens on your phone)                |
|                                                  |
| PRE-FILLED MESSAGE PREVIEW:                      |
| ┌──────────────────────────────────────────────┐ │
| │ Vanakkam Senthamizh! 🙏                      │ │
| │ Here is your bill from Aambal Neyvagam:      │ │
| │ https://aambal.tar.site/order/1042           │ │
| └──────────────────────────────────────────────┘ │
|--------------------------------------------------|
|                                [ Open WhatsApp ] |
+--------------------------------------------------+
```

* **Touch / Sensor Inputs:** 1-tap `[ Open WhatsApp ]` button launches device `wa.me/919444155667?text=...`.
* **Cost:** **₹0.00**. No Meta API credentials, no template reviews, zero risk of surprise bills.
* **Storage / Sync:** Pure local action; optionally logs contact communication in `records`.

---

### 17. `whatsapp` · Official Customer WhatsApp API (Cloud WABA)

Dispatches automated receipts, order status updates, and tracking links to customer WhatsApp numbers via Meta Cloud API.

```text
+--------------------------------------------------+
| Official WhatsApp Gateway (Meta API)     [Log]   |
+--------------------------------------------------+
| Target: Senthamizh (+91 94441 55667)             |
| Type: Utility Template (Pre-Approved)            |
| Cost: ₹0.115 + GST (Service: 1k free/mo)         |
|                                                  |
| OUTGOING TEMPLATE PREVIEW:                       |
| ┌──────────────────────────────────────────────┐ │
| │ Vanakkam Senthamizh! 🙏                      │ │
| │ Your Aambal Neyvagam Order #1042 has shipped.│ │
| │ Tracking: Anjalakam Virivu #TN88219          │ │
| │ Bill: aambal.tar.site/order/1042             │ │
| └──────────────────────────────────────────────┘ │
|--------------------------------------------------|
| [ Cancel ]                          [ Send Now ] |
+--------------------------------------------------+
```

* **Touch / Sensor Inputs:** Automated event trigger from `pos` or `order`, tap `Send Now`.
* **Cost Structure:**
  * **Utility API:** ₹0.115 + GST per message (Business initiates invoice/shipping template).
  * **Service API:** First 1,000 conversations free per month (Customer initiates contact).
* **Storage (`records` in Turso):**
  * `type="notification"`: `{channel: "whatsapp", recipient: "+919444155667", cost: 0.115, status: "sent"}`
* **Downstream Sync:**
  * Meta Cloud API delivers WhatsApp message directly to Senthamizh's phone from verified business handle.

---

### 18. `telegram` · Team Telegram Channel

Zero-cost push alerts and closing shift summaries delivered to internal shop staff and owners.

```text
+--------------------------------------------------+
| Team Telegram Bot (Zero Cost)           [Config] |
+--------------------------------------------------+
| Bot: @AambalNeyvagamBot                          |
| Group: Aambal Neyvagam Kuzhu (3 members)         |
|                                                  |
| RECENT DISPATCHES:                               |
|  • 21:42 - Shift #14 Closed by Kanimozhi         |
|    Total Sales: ₹12,200 | Cash Variance: ₹0      |
|                                                  |
|  • 18:30 - Low Stock Alert: Mayilkazhuthu (1 left)
|                                                  |
|  • 14:15 - Petty Cash: ₹240 (Kaapi & Vadai)      |
|--------------------------------------------------|
| [ Test Notification ]            [ Bot Settings ]|
+--------------------------------------------------+
```

* **Touch / Sensor Inputs:** Automated event trigger on shift close, expense log, or low stock alert.
* **Storage (`records` in Turso):**
  * `type="notification"`: `{channel: "telegram", group: "AambalKuzhu", cost: 0.00, status: "sent"}`
* **Downstream Sync:**
  * Instant push notification to Kayalvizhi's Telegram mobile app at ₹0.00 per message.

---

## 3. Inbox Utilization: The Actionable "Now" Cockpit

In TAR, `inbox` is not an email client. It is the real-time operational cockpit where business events from all tools surface as 1-tap actionable cards.

### 3.1 Role-Projected Feed (Who Sees What)

| Role | Pure Tamil Name | Surfaced Cards | Primary Action |
| :--- | :--- | :--- | :--- |
| **Owner** | Kayalvizhi | Cash variance alerts, low stock proposals, high expense approvals, overdue B2B bills | 1-Tap approve / re-order |
| **Cashier** | Kanimozhi | Active shift, evening closing checklist, unverified manual payments | 1-Tap count cash / complete step |
| **Packer** | Ilavenil | Paid WhatsApp/web orders, courier arrivals, dispatch slips | 1-Tap print slip / mark packed |
| **Stock** | Mathivathani | Incoming supplier PO deliveries, stock discrepancy audits | 1-Tap verify delivery / post count |
| **Customer** | Senthamizh / Yazhini | *(External WhatsApp bills, delivery tracking links)* | 1-Tap view bill / track package |

### 3.2 18-Tool Inbox Event & Action Matrix

| Source Tool | Trigger Event | Assigned Recipient | Card Action (1-Tap) | Resulting Record Change in Turso |
| :--- | :--- | :--- | :--- | :--- |
| **`pos`** | High-value refund or cash drawer limit exceeded | Kayalvizhi (Owner) | `[ Approve Refund ]` | Updates `invoice.status="refunded"` |
| **`register`** | Cash discrepancy at shift close (Variance $\ne$ ₹0) | Kayalvizhi (Owner) | `[ Audit Shift ]` | Sets `shift.audit="flagged"` |
| **`item`** | New catalog item drafted with camera | Kayalvizhi (Owner) | `[ Publish to Site ]` | Sets `item.status="active"` |
| **`inventory`** | Stock drops below threshold ($\le 2$ pieces) | Kayalvizhi (Owner) | `[ Create PO ]` | Creates `type="purchase"` row |
| **`order`** | New paid WhatsApp / web order placed | Ilavenil (Packer) | `[ Mark Packed ]` | Updates `order.state="packed"` |
| **`invoice`** | B2B invoice past due date | Kayalvizhi (Owner) | `[ Send Reminder ]` | Triggers `type="notification"` |
| **`payment`** | Unverified bank transfer / UPI reference | Kanimozhi (Cashier) | `[ Verify Reference ]` | Sets `payment.status="cleared"` |
| **`expense`** | Petty cash payout $> ₹500$ entered | Kayalvizhi (Owner) | `[ Approve Payout ]` | Updates `expense.status="approved"` |
| **`purchase`** | Shipment delivered by weaving cooperative | Mathivathani (Stock) | `[ Receive Stock ]` | Increments `stock.onhand` |
| **`members`** | Staff invited / brief access review | Kayalvizhi (Owner) | `[ Save Access ]` | Updates `party.access` |
| **`contact`** | High-value customer inactive $> 60$ days | Kayalvizhi (Owner) | `[ Send Greeting ]` | Triggers `type="notification"` |
| **`human`** | Physical chore due (e.g. shutter lock) | Kanimozhi (Cashier) | `[ Tap Done ]` | Creates `type="step"` completion |
| **`flow`** | Next routine step ready to execute | Assigned Member | `[ Open Step ]` | Advances `runs.current_step` |
| **`site`** | AI storefront theme or SEO update ready | Kayalvizhi (Owner) | `[ Publish Live ]` | Deploys static HTML to R2 |
| **`inbox`** | Universal self-clearing work queue hub | All Members | `[ 1-Tap Action ]` | Card vanishes across devices |
| **`chat`** | Inbound customer message needing human reply | Kayalvizhi / Staff | `[ Open Chat ]` | Opens 1-on-1 chat in WhatsApp (₹0) |
| **`whatsapp`** | Automated receipt / order tracking dispatch | Kayalvizhi (Owner) | `[ Send API Bill ]` | Meta Cloud API dispatch (₹0.115) |
| **`telegram`** | External mirror of critical inbox cards | Kayalvizhi (Owner) | `[ View in App ]` | Deep links into `tarapp` |

### 3.3 The 3-Step Card Lifecycle

| Stage | Action Trigger | System Execution |
| :--- | :--- | :--- |
| **1. Born** | Any tool event occurs | Event appended to Turso `records` or `runs` |
| **2. Shown** | Member opens `tarapp` | Filtered projection renders interactive card in `inbox` |
| **3. Solved** | Member taps 1-tap button | Turso record updates; card auto-clears across all shop devices |

---

## 4. Data Flow Map: Where Every Business Fact Goes

| Tool | Primary Turso Table | Record `type` | Key Canonical Stored Fields | Downstream Destination |
| :--- | :--- | :--- | :--- | :--- |
| **`pos`** | `records` | `order`, `invoice`, `payment` | `lines`, `totals`, `method`, `reference` | `stock` decrement, `whatsapp`/`chat` bill, `register` shift |
| **`register`** | `records` | `shift`, `posting` | `float`, `expected`, `actual`, `variance` | `telegram` closing report, Kayalvizhi's `inbox` |
| **`item`** | `records` | `item`, `variant`, `price`, `stock` | `name`, `sku`, `amount`, `mrp`, `onhand` | Public `aambal.tar.site` catalog, `pos` search |
| **`inventory`** | `records` | `stock`, `audit` | `onhand`, `location`, `reason`, `actor` | `site` sold-out badge, `inbox` low-stock recommendation |
| **`order`** | `records` | `order`, `stock` | `customer`, `lines`, `totals`, `state` | Ilavenil's packing queue, `whatsapp` customer tracking |
| **`invoice`** | `records` | `invoice`, `posting` | `party`, `order`, `lines`, `totals`, `tax` | Cloudflare R2 PDF link, `payment` settlement queue |
| **`payment`** | `records` | `payment`, `posting` | `invoice`, `amount`, `method`, `reference` | `register` cash balance, invoice clearance |
| **`expense`** | `records` | `expense`, `posting` | `amount`, `category`, `source`, `note` | `register` cash deduction, monthly P&L reporting |
| **`purchase`** | `records` | `purchase`, `posting` | `supplier`, `lines`, `totals`, `status` | `stock` increment on receipt, payables schedule |
| **`members`** | `records` | `party` | `phone`, `role`, `workrole`, `access` | Kanimozhi's phone home screen launcher permissions |
| **`contact`** | `records` | `contact` | `name`, `phone`, `type`, `address`, `pincode` | Checkout autofill, 1-tap WhatsApp chat |
| **`human`** | `steps` | `step` | `actor`, `completed_at`, `proof_photo` | Advances `runs` to step $N+1$, clears task card in `inbox` |
| **`flow`** | `runs`, `definitions` | `flow`, `run` | `steps`, `current_step`, `run_state` | Triggers target tools, advances shop routine |
| **`site`** | `records` | `site` | `theme`, `pages`, `tokens`, `revision` | Cloudflare R2 pre-rendered HTML, D1 CONTROL |
| **`inbox`** | `records` | *(Live projection)* | Cross-workspace actionable work items | Renders "Now" work list for each staff role |
| **`chat`** | `records` | `contact` | `recipient`, `phone`, `cost: 0.00` | Merchant's WhatsApp mobile app (Local) |
| **`whatsapp`** | `records` | `notification` | `recipient`, `template`, `cost: 0.115` | Customer WhatsApp app (Meta Cloud API) |
| **`telegram`** | `records` | `notification` | `bot_id`, `chat_id`, `message`, `cost: 0.00` | Team Telegram group (Internal) |

---

## 5. End-to-End Walkthrough: One Counter Sale

```text
 1. Senthamizh buys Semparuthi Pattu Selai in shop
      │
      ▼
 2. Kanimozhi scans barcode in `pos`
      │
      ├─► Turso `records`: writes `order`, `invoice`, `payment`
      ├─► Turso `records`: decrements `stock` from 12 to 11
      ├─► Cloudflare R2: stores pre-compiled PDF invoice artifact
      │
      ▼
 3. Gateway triggers `whatsapp` channel
      │
      └─► Senthamizh receives digital bill on WhatsApp (+91 94441 55667)
      │
      ▼
 4. Evening store closing routine runs (`flow` tool)
      │
      ├─► Step 1 (pos): sales snapshot reads cash total (₹12,200)
      ├─► Step 2 (human): Kanimozhi counts cash drawer (₹13,700)
      ├─► Step 3 (register): shift closed with ₹0 variance
      ├─► Step 4 (human): Kanimozhi locks front shutter and keys
      │
      ▼
 5. Gateway triggers `telegram` channel (Zero Cost)
      │
      └─► Kayalvizhi (Owner) receives shift close report on Telegram
```

> **Invariant:** No developer needed, zero plugins, zero fragile permission matrices. Deterministic Turso canonical records power all 17 tools seamlessly.
