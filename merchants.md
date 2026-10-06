# Merchant Reality & Operating Context (Tamil Nadu & India SMB)

> Master reference for autonomous store agents. Establishes the operational, cultural, technical, and commercial reality of micro, small, and medium merchants.
> Paired architecture contract: [agenticsite.md](file:///c:/tarfwk/tar/agenticsite.md).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               OPERATING ENVIRONMENT AT A GLANCE                        │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ PERSONA                  │ HARDWARE & NETWORK          │ COMMERCE HABITS               │
│ • Solo / family-operated │ • Phone is only computer    │ • UPI QR + COD dominate       │
│ • Local offline goodwill │ • 2–4 GB Android, patchy 4G │ • WhatsApp is primary channel │
│ • Tamil / Tanglish voice │ • Offline-tolerant queues   │ • No IT / developer budget    │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

## 1. Merchant Identity & Demographics

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BLOCK: OPERATOR REALITY & PERSONA MATRIX                                               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

| Trait | Operational Reality | Agent Design Constraint |
| :--- | :--- | :--- |
| **Solo Operator** | Owner runs shop alone (sarees, bakery, jewellery, electronics, grocery, hardware, crafts). | **Zero admin panels**: only 1-tap cards and instant previews. |
| **Family Helpers** | Spouse, siblings, or children help during peak hours using personal phones. | **Role cards** (owner, cashier, packer) via mobile OTP. No passwords. |
| **Local Goodwill** | Decades of offline reputation; known by face and family name in town. | Store reflects **real shop identity** (street, photo, owner story), not generic SaaS. |
| **Direct Contact** | Customers expect to call or message the shop owner directly. | Owner name, photo, phone, and WhatsApp prominent on Home, PDP, Contact. |
| **Trade Breadth** | Textiles, jewellery, groceries, sweets, mobiles, stationery, handloom, plants. | Category floors support all archetypes without asking "choose a template". |
| **Language & Jargon** | Tamil / Tanglish primary; English secondary; no tech education. | **Zero jargon**: "Add product", "Confirm order", "Ship" (never SKU, variant, webhook). |
| **Risk Aversion** | Anxious about breaking the website or publishing wrong prices. | Every action reversible via **1-tap Undo**; destructive actions require confirmation. |
| **Scale Range** | From home sellers (zero front) to multi-counter shops with 2–20 staff. | Same kernel scales from home baker to 10 branches without rebuild. |
| **Home / Micro** | Women-run micro-businesses, self-help groups, home kitchens, tailors. | Voice-first onboarding, WhatsApp-first checkout, no upfront GST requirement. |
| **Dual Trade** | Same shop handles single retail pieces and bulk wholesale inquiries. | Retail price displayed; "Bulk inquiry" WhatsApp action for wholesale volume. |

---

## 2. Hardware, Connectivity & Language

```
┌─────────────────────────────────────┐   ┌─────────────────────────────────────┐
│ COLUMN A: DEVICE & NETWORK          │   │ COLUMN B: LINGUISTIC CONTEXT        │
├─────────────────────────────────────┤   ├─────────────────────────────────────┤
│ • Hardware: 2–4 GB RAM Android      │   │ • Primary: Tamil + Tanglish voice   │
│ • Display: Cracked / low brightness │   │ • Code-mixed: Tamil in Latin script │
│ • Network: 4G dropouts, prepaid cap │   │ • Input: 🎤 Mic first, typing last  │
│ • Rule: Assets < 150 KB, aggressive │   │ • Fonts: Unicode Tamil stack tested │
│   edge caching, zero runtime JS bloat│   │ • Rule: Layout independent of script│
└─────────────────────────────────────┘   └─────────────────────────────────────┘
```

| Dimension | Reality | Agent Design Invariant |
| :--- | :--- | :--- |
| **Primary Device** | Smartphone is the only computer; laptops are absent. | Merchant management is 100% mobile web / PWA. |
| **Device Specs** | Budget Android (Redmi, Realme, Samsung M-series), 2–4 GB RAM. | Storefront motion floor: disable heavy CSS animations and canvas effects. |
| **Connectivity** | Fluctuating 4G inside dense markets; prepaid daily data limits. | Lazy-loaded media, compressed WebP/AVIF, offline-tolerant draft queue. |
| **Speech Input** | Speaks Tamil or Tanglish (*"konjam periya font", "sema saree"*). | Code-mixed ASR pipeline; transcripts preserved verbatim for semantic parsing. |
| **Keyboards** | Tamil keyboards are slow; autocorrect mangles local terminology. | Voice-first input; heard text rendered on review card for 1-tap correction. |
| **Typography** | Broken font glyphs degrade readability of Tamil scripts. | Bundled Tamil Unicode font stack; fallback rendering verified Day 0. |
| **Number Format** | Indian numbering notation standard (₹ 1,25,000; DD/MM/YYYY). | Code formats currency and dates deterministically; models never format numbers. |
| **Authentication** | Shared family phones, lack of active personal email addresses. | Mobile OTP authentication only; no passwords or mandatory email fields. |

---

## 3. Customer Behaviors & Expectations

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BLOCK: CUSTOMER JOURNEY & CHANNEL REALITY                                              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

| Customer Habit | Operational Driver | Storefront Implementation |
| :--- | :--- | :--- |
| **WhatsApp-First** | Customers live inside WhatsApp for discovery, queries, and chat. | Floating WhatsApp button, WhatsApp 1-tap order, native product share cards. |
| **Pre-Purchase Qs** | Immediate asks: *"Price enna?"*, *"Stock irukka?"*, *"Real photo send pannunga"*. | Catalog concierge handles stock/price instantly; merchant handles genuine exceptions. |
| **Call Verification** | Buyers call the shop before transferring funds to ensure legitimacy. | Prominent tap-to-call button; checkout flow never blocks an inquiry path. |
| **Visual Validation** | Buyers demand multiple real photos and unboxing videos before paying. | Multi-angle gallery with zoom; owner can upload photo batches in one action. |
| **Bargaining Expectation**| Customers ask for "best price" or festival discounts. | Margin-bounded offer proposals; agent proposes, merchant taps to activate. |
| **Community Circles** | Sales driven by temple circles, apartment groups, and family networks. | 1-tap WhatsApp group share cards with pre-filled preview and product link. |
| **Gifting Journeys** | Customers order gifts delivered directly to relatives in other towns. | Distinct delivery address entry; optional gift message slot at checkout. |
| **First-Time Buyers** | Elderly and rural buyers unfamiliar with complex e-commerce carts. | Large tap targets (≥ 44px), clear Tamil labels, single-screen minimal checkout. |
| **Trust Skepticism** | Hesitation to enter credit/debit card numbers on unfamiliar sites. | UPI QR/intent and COD as default methods; cards only via verified gateway. |

---

## 4. Money, Payments & Accounting

```
┌─────────────────────────────────────┐   ┌─────────────────────────────────────┐
│ COLUMN A: PAYMENT REALITIES         │   │ COLUMN B: FINANCIAL GUARDRAILS      │
├─────────────────────────────────────┤   ├─────────────────────────────────────┤
│ • UPI deep-link & counter QR        │   │ • Integer minor units in database   │
│ • COD is 50–70% of total volume     │   │ • Models NEVER touch or edit money  │
│ • Partial advances for bridal/custom│   │ • GST calculated only when enabled  │
│ • Evening cash & UPI reconciliation │   │ • RTO risk hints before dispatch   │
└─────────────────────────────────────┘   └─────────────────────────────────────┘
```

| Factor | Merchant Ground Truth | Agent & Code Rule |
| :--- | :--- | :--- |
| **Payment Habits** | UPI (PhonePe, GPay, Paytm) and COD account for >95% of orders. | Direct UPI intent link + counter QR upload; zero mandatory gateway fees. |
| **COD Friction** | Return-to-Origin (RTO) on bogus COD orders costs real shipping money. | Order Shield flags incomplete addresses; suggests advance token via WhatsApp. |
| **Advance Tokens** | Custom tailoring, sarees, and bridal orders require 20–50% advance. | Order records support partial settlement against invoices (commerce kernel). |
| **Daily Tally** | Physical cash in till reconciled against bank credits every evening. | Daily summary card: Cash, UPI, COD, order totals, and unsettled balances. |
| **Tax Status** | Mix of unregistered composition dealers and GST-registered merchants. | Tax calculation governed by merchant facts; invoices show GST only if toggled. |
| **Price Notation** | Round integer pricing inclusive of tax (*"₹500 flat"*). | Price records store inclusive/exclusive flag; minor units in database. |
| **Margin Safety** | Thin margins; cannot afford accidental deep discounts. | System-enforced margin floor; discounts selected only from code-bounded menu. |

---

## 5. Fulfilment, Delivery & Logistics

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BLOCK: LOGISTICS WORKFLOW & DISPATCH                                                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

| Aspect | Operational Reality | Storefront & Backend Mechanism |
| :--- | :--- | :--- |
| **Carriers** | India Post, local courier franchises (ST, Professional), local runners. | Fulfilment methods: `pickup`, `local`, `courier`, `post`; merchant toggles active. |
| **Dispatch Mode** | Merchant packs goods on counter and drops at local courier office. | One "Ship" card per order with tracking number input; generates printable label. |
| **Service Radius** | Couriers only deliver reliably to specific serviceable pincodes. | Pincode checker on PDP; unserviceable pins route to WhatsApp inquiry. |
| **Local Speed** | Town orders delivered same day via auto or shop assistant. | "Local Same-Day" delivery badge appears only when merchant sets local pin list. |
| **Shipping Fees** | Courier costs scale by weight slab and destination zone. | Code-owned shipping fee matrix; models never calculate or promise shipping cost. |
| **Tracking Anxiety**| Buyers flood merchant WhatsApp asking *"Parcel dispatch aaiducha?"*. | Dedicated `/track` lookup page and automated WhatsApp status messages. |
| **Perishables** | Fresh sweets, savouries, cakes, flowers spoil within 24–48 hours. | Product trait `perishable` enforces same-day / pickup only; disables post. |
| **Returns** | Size exchanges common in clothing; returns rare in food/jewellery. | Return window defined as merchant fact; return policy auto-generated from it. |

---

## 6. Compliance, Trust & Legalities

```
┌─────────────────────────────────────┐   ┌─────────────────────────────────────┐
│ COLUMN A: TRUST VULNERABILITIES     │   │ COLUMN B: COMPLIANCE SAFEGUARDS     │
├─────────────────────────────────────┤   ├─────────────────────────────────────┤
│ • Fear of government tax notices    │   │ • Policies generated Day 0 from facts│
│ • Fraudulent product claims liability│   │ • Claims registry blocks AI spin   │
│ • Counterfeit brand name exposure   │   │ • Authentic proof badges only      │
│ • Customer data privacy leaks       │   │ • Customer data isolated in tenant  │
└─────────────────────────────────────┘   └─────────────────────────────────────┘
```

| Risk Area | Ground Reality | Defensive Architecture |
| :--- | :--- | :--- |
| **Legal Paperwork** | Merchants avoid complex contracts and legal terms. | Plain-language policies (Shipping, Returns, Privacy, Terms) generated from facts. |
| **Product Claims** | Claims like *"Pure Silk"*, *"Handloom"*, *"Organic"* invite legal scrutiny. | **Claims Registry**: every adjective must link to registered merchant fact. |
| **Social Proof** | Fabricated testimonials destroy local trust. | Proof sections render **only verified customer quotes** approved by merchant. |
| **Certifications** | Silk Mark, Handloom Mark, FSSAI licenses are vital trust drivers. | Displayed only when merchant uploads certificate ID/image; never inferred. |
| **Brand Names** | Unauthorized brand logos lead to trademark infringements. | Storefront never generates third-party brand logos without explicit facts. |
| **Data Isolation** | Customer phone numbers and addresses are sensitive business assets. | Stored in isolated workspace database; never exposed in public bundles. |
| **Price Caps** | Packaged foods, cosmetics, medicines bound by Maximum Retail Price (MRP). | Catalog records MRP; offers can never price items above registered MRP. |

---

## 7. Seasonality & Local Retail Calendar

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BLOCK: TAMIL NADU & REGIONAL RETAIL CALENDAR                                           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

```
JAN              APR              JUL/AUG          OCT/NOV          DEC
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ PONGAL       │ │ TAMIL NEW YR │ │ AADI PERUKKU │ │ DEEPAVALI    │ │ MARGHAZHI /  │
│ Harvest sale │ │ Family gifts │ │ Discount rush│ │ Peak textile │ │ CHRISTMAS    │
│ Sweets, pattu│ │ Home decor   │ │ Clearance 50%│ │ & jewellery  │ │ Wedding peak │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

| Event | Retail Behavior | Autonomous Agent Action |
| :--- | :--- | :--- |
| **Pongal (Jan)** | Sugarcane, clay pots, traditional sarees, dhoti, festive grocery. | Festival Kit proposed 14 days prior; traditional themes & banner copy. |
| **Tamil New Year (Apr)**| New clothes, gold jewellery, kitchenware, auspicious gifts. | Proposes curated gift collections; WhatsApp status share templates. |
| **Aadi Month (Jul–Aug)**| Massive discount month across Tamil Nadu; clearance sales. | Suggests clearance rails and percentage discounts; auto-expires. |
| **Deepavali (Oct–Nov)** | Biggest retail spike of the year; up to 40% of annual turnover. | Proposes full festival takeover 21 days ahead; monitors stock health daily. |
| **Muhurtham Seasons** | Auspicious wedding dates throughout Thai, Chithirai, Vaikasi, Avani. | Activates bridal and bulk inquiry sections 30 days prior. |
| **Flash Disruptions** | Monsoon waterlogging, local strikes, unexpected temple closures. | 1-tap "Shop Closed Today" or "Delivery Delayed" top announcement banner. |

---

## 8. Financial Economics & Margin Scarcity

```
┌─────────────────────────────────────┐   ┌─────────────────────────────────────┐
│ COLUMN A: FINANCIAL PROFILE         │   │ COLUMN B: BILLING PRINCIPLES        │
├─────────────────────────────────────┤   ├─────────────────────────────────────┤
│ • Net margin: 8% – 18% typical      │   │ • Transparent pricing in INR (₹)   │
│ • Extreme sensitivity to SaaS fees  │   │ • Usage meter visible on main screen│
│ • No credit card for recurring SaaS │   │ • Credits model for quiet months   │
│ • Time budget: 30 seconds per task  │   │ • ₹0 visit cost on Cloudflare Edge  │
└─────────────────────────────────────┘   └─────────────────────────────────────┘
```

| Pressure | Merchant Perspective | System Solution |
| :--- | :--- | :--- |
| **Margin Tightness** | High fees kill adoption; ₹5,000/mo platforms are rejected. | AI runs bounded; store operation costs ₹12–₹70/mo in inference. |
| **Subscription Fear** | Distrust of auto-debit credit cards with surprise surcharges. | Prepaid rupee credits via UPI; balance visible at all times. |
| **Downtime Paranoia** | System crashes during Deepavali eve destroy the business. | Static edge builds on Cloudflare R2; ₹0/visit; 100% uptime independent of AI. |
| **Time Scarcity** | Working 12 hours behind the counter; cannot attend webinars. | Interventions designed for **30-second gaps**: 1 card, 1 tap, done. |

---

## 9. Merchant Jobs to Be Done (JTBD)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BLOCK: CORE JOBS & DESIRED OUTCOMES                                                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

| Desired Job | Current Manual Pain | Autonomous Agent Delivery |
| :--- | :--- | :--- |
| **Get Found Online** | Cannot afford digital marketing agency or understand SEO. | Autonomous SEO: sitemap, structured data, local keywords, OpenGraph. |
| **Broadcast New Stock**| Sends individual WhatsApp photos to 50 customers manually. | Photo intake -> 1-tap approve -> WhatsApp catalog sync & share link. |
| **Stop Repetitive Chats**| Types *"₹1200 with shipping"* fifty times a day on WhatsApp. | Storefront PDP handles pricing, specs, and stock self-service. |
| **Capture Clean Orders**| Orders scattered across WhatsApp chats and paper notebooks. | Structured Order Inbox: items, address, payment method, contact info. |
| **Daily Visibility** | Mental math at night to figure out profit and inventory. | Evening Summary Card: orders, revenue, cash vs UPI vs COD, stock alerts. |
| **Festival Preparedness**| Scrambles at the last minute to produce promotional banners. | Marketer agent prepares banners and promotions 14 days in advance. |

---

## 10. Fear Map & Architectural Guarantees

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BLOCK: FEAR MATRIX & MITIGATION INVARIANTS                                             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

| Specific Fear | Merchant Quote | Architectural Guarantee |
| :--- | :--- | :--- |
| **Breaking the Store** | *"Edhavadhu thappa amukitta website poirumo?"* | Immutable revision history. Every change has a **1-tap Undo**. |
| **AI Hallucinations** | *"En product pathi thappa edhavadhu eludhiduma?"* | Claims Registry firewall: AI can only use registered merchant facts. |
| **Price Tampering** | *"Vilai adhuva maari poidumo?"* | Models never touch money. Price changes are strictly **🔴 Merchant-only**. |
| **Customer Fraud** | *"COD parcel anupitu customer vaangala-na?"* | Order Shield flags risky addresses; suggests advance verification. |
| **English Insecurity** | *"Enakku computer / English theriyadhu."* | Tamil-first, voice-first, zero technical jargon. |
| **Vendor Lock-in** | *"Naan developer illama maatipen-a?"* | Zero maintenance burden; automated Guardian runs health audits nightly. |
| **Data Exploitation** | *"En customer details velila therinjiruma?"* | Private workspace tenant isolation; zero public data leaks. |

---

## 11. Growth Stages (Zero-Rebuild Progression)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BLOCK: GROWTH STAGES ACROSS UNIFIED COMMERCE CORE                                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

```
SEED (1 person)         STEADY (1-2 helpers)    GROWING (2-5 staff)     MULTI-BRANCH (2-10)
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ 5–20 products       │ │ 20–200 products     │ │ 200–1,000 products  │ │ Shared catalog      │
│ WhatsApp orders     │ │ Stock sync, Shield  │ │ Staff roles, courier│ │ Location inventory  │
│ Counter UPI / COD   │ │ Daily summaries     │ │ Bulk WhatsApp flow  │ │ Branch workspaces   │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

| Stage | Profile | Active Agent Capabilities |
| :--- | :--- | :--- |
| **1. Seed** | Home seller, 5–20 products, WhatsApp checkout. | Builder, Writer, Translator, WhatsApp order links, counter UPI QR. |
| **2. Steady** | Retail shop, 20–200 products, 5–15 orders/day. | Merchandiser autopilot, stock sync, Order Shield, evening summary. |
| **3. Growing** | 200–1,000 items, courier dispatches, 2–3 helpers. | Automated collections, pincode routing, staff role cards, label prints. |
| **4. Multi-Counter**| Single shop with POS counter, stockroom, online. | Shared stock record; POS and web draw from identical inventory. |
| **5. Multi-Branch** | 2–10 physical branches across districts. | Multi-tenant workspace; branch-specific inventory availability. |
| **6. Multi-Domain** | Saree shop expands into jewellery or grocery. | Multi-category support on single shared commerce kernel. |

---

## 12. Merchant Control Surface & Hidden Machinery

```
┌─────────────────────────────────────┐   ┌─────────────────────────────────────┐
│ COLUMN A: WHAT THE MERCHANT SEES    │   │ COLUMN B: WHAT IS FOREVER HIDDEN    │
├─────────────────────────────────────┤   ├─────────────────────────────────────┤
│ • DO NOW (Orders to confirm & ship) │   │ • Themes, templates, CSS, Tailwind  │
│ • 1-Tap Proposals (Banners, text)   │   │ • SEO meta tags, sitemaps, JSON-LD  │
│ • 📷 Add Product (Camera / photo)   │   │ • Alt tags, image compression, WebP │
│ • 🎤 Tell Your Agent (Voice mic)    │   │ • DNS, edge cache, R2 deployments  │
│ • Daily Sales Summary Card          │   │ • Database migrations, API routes   │
└─────────────────────────────────────┘   └─────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────────┐
│ APPROVAL INBOX (THE ONLY OPERATING SCREEN)             │
├────────────────────────────────────────────────────────┤
│ SRI MURUGAN SILKS · Salem                              │
│ 🟢 Store Live · 42 Products · Tamil + English          │
├────────────────────────────────────────────────────────┤
│ DO NOW                                                 │
│  ● Confirm 2 new COD orders                          › │
│  ● Ship 3 packed courier orders                      › │
├────────────────────────────────────────────────────────┤
│ AGENT PROPOSALS (1 tap)                                │
│  🪔 Deepavali 10% Off Banner                           │
│     [ Approve ]  [ Edit ]  [ Skip ]                    │
│  📝 Tamil description for "Silk Dhoti Set"             │
│     [ Approve ]  [ Skip ]                              │
│  📦 Low Stock Alert: Red Pattu Saree (1 left)          │
│     [ Auto-hide at 0 ]  [ Ignore ]                     │
├────────────────────────────────────────────────────────┤
│ 📷 Add Product              🎤 Tell your agent...      │
└────────────────────────────────────────────────────────┘
```
