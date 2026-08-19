# Tar Revenue & Pricing Architecture: `revenue.md`

> **Document Status:** Finalized Business Model & Autonomous Agent Economy  
> **Core Principle:** 100% Free Core, Exactly 0% Markup on Pass-Through Utilities (WhatsApp, OCR, Cloud Sandboxes), ₹499/Mo High-Margin SaaS Subscription (>80% Net Margin).  
> **Target Audience:** Working class, solo entrepreneurs, shopkeepers, clinics, restaurants, salons, and local enterprises.

---

## 1. The 4 Autonomous Agents & Unit Economics

Tar powers business operations through 4 dedicated autonomous agents. Operational compute and third-party APIs are passed to users at **0% profit margin (pure wholesale at-cost)**.

| Agent | Core Function | Underlying Engine / Stack | Real Wholesale Cost | Price Charged to User (0% Margin) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Sales Agent** | 24/7 Web storefront & WhatsApp AI closer | DeepSeek-V4-Flash + Meta WhatsApp API | ~₹0.12 / message | **₹0.12 / msg** *(500 bundled in ₹499/mo)* |
| **2. Marketing & Lead Search Agent** | Lead extraction, supplier finder & re-engagement | DeepSeek-V4-Flash + Search Scrapers | ~$0.04 / batch | **₹5.00 / batch** *(10–20 verified leads)* |
| **3. OCR Agent** | Paper invoice & receipt stock auto-intake | DeepSeek-OCR 2 ($0.03 / 1M tokens) | ~₹0.0042 / scan (0.42p) | **₹0.005 / scan (0.5p)** *(₹5 for 1,000 scans)* |
| **4. Computer Sandbox Agent** | Cloud VM executor for agentic workflows | [ASCII Box](https://box.ascii.dev) (4 vCPU / 8GB / 70GB) | $0.036 / hr (~₹3.04/hr) | **₹3.50 / hour** *(~10x less than market)* |

---

### 1.1. Sales Agent (Storefront & WhatsApp 24/7 AI)
Automates lead capture, customer FAQs, stock availability, and checkout across Web and WhatsApp.

* **Underlying Engine:** DeepSeek-V4-Flash + Meta Cloud WhatsApp API + Cloudflare Edge Workers.
* **Wholesale Cost:** Meta API (`₹0.115`) + AI inference (`₹0.005`) = **~₹0.12 / message**.
* **Price Charged to User:** **₹0.12 / message** (500 chats bundled free in ₹499/mo Tier 2).

#### The 3 WhatsApp Interaction Modes
| Mode | Mechanism | Actor | Cost / Transaction | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **1. Click-to-WhatsApp** | Web cart generates pre-filled `wa.me/` order text. | 👤 Human Owner | **₹0.00 (100% Free)** | Tier 1 Free Core & budget shops |
| **2. 24/7 Autonomous Bot** | AI answers FAQs, checks inventory, and books slots. | 🤖 Tar AI Sales Agent | **500 bundled/mo**, then ₹0.12/msg | 24/7 automated storefronts |
| **3. Hybrid (Click + AI)** | Web cart opens WhatsApp; AI instantly confirms order & total. | 🤖 AI + 👤 Human Co-Pilot | **1–2 msgs / order** (~₹0.24) | High-conversion retail & food |

---

### 1.2. Marketing & Lead Search Agent (Lead Hunter & Outreach)
Autonomously discovers verified B2B leads, uncovers regional wholesale suppliers, and executes personalized re-engagement campaigns.

* **Underlying Engine:** Search APIs + DeepSeek-V4-Flash reasoning + Headless browser crawler.
* **Wholesale Cost:** ~$0.04 per search & scrape batch.
* **Price Charged to User:** **₹5.00 / batch** (10–20 verified leads) or **₹3.00 / automated campaign task**.
* **Core Agent Capabilities:**
  * **Autonomous Lead Search:** Crawls local directories, Google Maps, and B2B platforms (e.g. IndiaMART, JustDial) for targeted customer leads.
  * **Contact & GSTIN Enrichment:** Extracts verified phone numbers, emails, addresses, and tax identifiers into your CRM.
  * **Wholesale Supplier Discovery:** Finds lowest-cost regional suppliers for inventory restocking.
  * **Lapsed Customer Retention:** Scans POS order history and drafts customized WhatsApp offers for inactive clients.
  * **Local SEO Sync:** Automatically publishes product catalogs to Google Business Profile and local listings.

---

### 1.3. OCR Agent (Tar Intake Agent & Document Vision)
Extracts paper GST invoices, vendor receipts, and handwritten delivery notes directly into live inventory and expense ledgers.

* **Underlying Engine:** DeepSeek-OCR 2 / PaddleOCR-VL ($0.03 / 1M tokens) + Cloudflare R2.
* **Wholesale Cost:** **~₹0.0042 / scan (0.42 Paise)**.
* **Price Charged to User:** **₹0.005 / scan (0.5 Paise)** → **₹5.00 for 1,000 Invoices** (0% Margin).

#### Real-World GST Invoice Benchmark (1,619 Tokens Total)
* **Image Input (1,126 tokens):** `0.28 Paise` (~$0.0000338)
* **JSON Output (493 tokens):** `0.13 Paise` (~$0.0000148)
* **Edge Storage & DB Insert:** `0.01 Paise`
* **Total Cost per Scan:** **~0.42 Paise (₹0.0042)**

| Consumption Level | Wholesale Raw Cost | User Top-Up Price | User Capacity |
| :--- | :--- | :--- | :--- |
| **100 Scans** | ₹0.42 | ₹0.50 | 100 Supplier Bills |
| **500 Scans** | ₹2.10 | Bundled in Tier 2 (₹499/mo) | Full monthly retail restocking |
| **1,000 Scans** | ₹4.21 | ₹5.00 (Wallet Top-Up) | 1,000 Invoices / Receipts |

---

### 1.4. Computer Sandbox Agent (Cloud VM Agentic Execution)
Provides isolated, high-performance cloud environments for browser automation, web research, complex data parsing, code execution, and autonomous desktop workflows.

* **Underlying Engine:** [ASCII Box](https://box.ascii.dev) Cloud VMs tailored for agentic work.
* **Hardware Specs:** **4 vCPU + 8 GB RAM + 70 GB NVMe SSD**.
* **Wholesale Rate:** **$0.036 / hour (~₹3.04 / hour)** — **~10x less expensive** than conventional sandbox providers (E2B, Modal, Daytona).
* **Price Charged to User:** **₹3.50 / hour** (or ₹0.06 / min pay-as-you-go, 0% platform markup).

| Sandbox Environment | Specs (vCPU / RAM / Disk) | Hourly Rate | Market Relative Cost |
| :--- | :--- | :--- | :--- |
| **ASCII Box (`box.ascii.dev`)** | **4 vCPU + 8 GB RAM + 70 GB NVMe** | **$0.036 / hr (~₹3.04/hr)** | **1x Baseline (~10x Less Expensive)** |
| Traditional Sandbox Providers | 4 vCPU + 8 GB RAM + 50 GB Disk | $0.35 – $0.50 / hr | 10x More Expensive |

#### Agentic Workloads Enabled by ASCII Box Sandbox (Architecture-Specific Matrix)
Because ASCII Box provides full Linux VMs (**4 vCPU + 8 GB RAM + 70 GB NVMe**) at just **$0.036/hr (~₹3.04/hr)**, Tar can launch isolated on-demand agentic sandboxes for heavy, long-running, or browser-based tasks without bloating local devices or hitting edge runtime limits.

| Architectural Domain             | Specific Agentic Workload                 | What the Sandbox Executes Inside VM                                                                                             | Typical Runtime     | Cost per Run (@ $0.036/hr) |
| :------------------------------- | :---------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ | :------------------ | :------------------------- |
| **B2B Lead & Supplier Hunter**   | **Directory & Maps Lead Scraper**         | Headless Playwright crawls IndiaMART, JustDial, TradeIndia & Maps; extracts verified contacts & GSTINs.                         | 2–3 mins            | **~₹0.15**                 |
| **B2B Lead & Supplier Hunter**   | **Wholesale Price Negotiator**            | Multi-step agent crawls regional distributors, compares wholesale rate sheets, and maps margins into SQLite.                    | 3–5 mins            | **~₹0.25**                 |
| **B2B Lead & Supplier Hunter**   | **Local B2B Buyer Matchmaker**            | Scrapes procurement tenders and local merchant directories to match high-volume bulk buyers for store inventory.                | 2–3 mins            | **~₹0.15**                 |
| **B2B Lead & Supplier Hunter**   | **Influencer & Creator Scout**            | Crawls Instagram Reels & YouTube Shorts for local food/lifestyle creators in the merchant's city pin code.                      | 2 mins              | **~₹0.10**                 |
| **Market & Competitor Intel**    | **Hyperlocal Price Monitor**              | Scheduled crawler tracks real-time pricing across Blinkit, Instamart, Zepto, Amazon & local rivals for matching SKUs.           | 1–2 mins            | **~₹0.10**                 |
| **Market & Competitor Intel**    | **Review & Reputation Monitor**           | Scrapes reviews from Google Maps, Zomato & Swiggy; analyzes sentiment and queues reply drafts in Tar Inbox.                     | 1 min               | **~₹0.05**                 |
| **Market & Competitor Intel**    | **Competitor Promotion Tracker**          | Monitors competitor storefronts and social ad libraries to detect active discounts, flash sales, and combo deals.               | 1–2 mins            | **~₹0.10**                 |
| **Market & Competitor Intel**    | **Event & Festival Surge Forecaster**     | Scrapes regional calendars, local events, and weather forecasts to predict upcoming footfall and sales demand.                  | 1 min               | **~₹0.05**                 |
| **Operations & Compliance**      | **GST Portal & E-Way Bill Agent**         | Automates login, form submission, payload validation, and PDF e-way bill / e-invoice generation on govt portals.                | 1–2 mins            | **~₹0.10**                 |
| **Operations & Compliance**      | **Bank & PDF Ledger Reconciliation**      | Runs Python (`pdfplumber`/`pandas`) to parse bank PDFs & settlement slips, auto-matching rows with SQLite ledgers.              | 30–60 secs          | **~₹0.04**                 |
| **Operations & Compliance**      | **Vendor Bill Margin Auditor**            | Compares scanned supplier invoices against historical agreed purchase orders, flagging discrepancies and price hikes.           | <30 secs            | **~₹0.02**                 |
| **Operations & Compliance**      | **TDS & Quarterly Tax Estimator**         | Runs tax estimation models over SQLite `matter` records to project advance tax liabilities and input tax credit (ITC).          | <20 secs            | **~₹0.01**                 |
| **Catalog & Media Generation**   | **Product Image AI Clean & Upscale**      | Runs headless `rembg`/`sharp` to strip dirty backgrounds, standardize lighting, and format WebP assets for edge CDN.            | 1–2 mins (10 items) | **~₹0.10**                 |
| **Catalog & Media Generation**   | **Social Post & Promo Flyer Generator**   | Compiles localized marketing banners & WhatsApp promo cards using automated Node canvas / Playwright rendering.                 | 1 min               | **~₹0.05**                 |
| **Catalog & Media Generation**   | **Multilingual Catalog Translator**       | Translates product titles, descriptions, and allergen/spec tags into 10+ Indian regional languages.                             | <30 secs            | **~₹0.02**                 |
| **Catalog & Media Generation**   | **Seasonal Theme & Banner Styler**        | Dynamically generates festive storefront banners and OpenGraph meta cards for Diwali, Eid, Christmas, or Holi.                  | 1 min               | **~₹0.05**                 |
| **Catalog & Media Generation**   | **Barcode & HSN Regulatory Mapper**       | Queries GS1 India and GSTN registry to resolve unmapped SKUs, standardizing HSN/SAC codes and tax slabs.                        | <30 secs            | **~₹0.02**                 |
| **WhatsApp CRM & Retention**     | **Lapsed Customer Retention Agent**       | Identifies inactive customer cohorts in SQLite and drafts tailored WhatsApp win-back discounts.                                 | <30 secs            | **~₹0.02**                 |
| **WhatsApp CRM & Retention**     | **Abandoned Cart Recovery Agent**         | Detects dropped storefront checkouts and queues personalized WhatsApp reminders with quick-checkout links.                      | <20 secs            | **~₹0.01**                 |
| **WhatsApp CRM & Retention**     | **Customer Udhar / Credit Reminder**      | Calculates ledger payment aging and drafts courteous WhatsApp payment nudges with embedded UPI QR codes.                        | <20 secs            | **~₹0.01**                 |
| **WhatsApp CRM & Retention**     | **Voice Note Order Transcriber**          | Transcribes multilingual WhatsApp voice messages (Whisper) and auto-parses line items directly into POS checkout.               | 10–20 secs          | **~₹0.01**                 |
| **WhatsApp CRM & Retention**     | **Meta WhatsApp Catalog Sync**            | Converts POS inventory updates into Meta WhatsApp Business Catalog API format for in-chat native shopping.                      | <30 secs            | **~₹0.02**                 |
| **Predictive Analytics & POS**   | **Demand Forecasting & Deadstock Agent**  | Runs statistical models (ARIMA / Prophet / `pandas`) over POS history to recommend restock quantities and markdown targets.     | <30 secs            | **~₹0.02**                 |
| **Predictive Analytics & POS**   | **Dynamic Profit & Discount Simulator**   | Simulates custom combo pricing and bundle discounts against wholesale purchase costs stored in local SQLite.                    | <20 secs            | **~₹0.01**                 |
| **Predictive Analytics & POS**   | **Staff Shift & Commission Calculator**   | Computes staff shifts, POS sales commissions, and overtime payouts from shift logs into payroll summaries.                      | <20 secs            | **~₹0.01**                 |
| **Predictive Analytics & POS**   | **FMCG Expiry & Shelf-Life Watchdog**     | Computes batch turnover velocity, flagging expiring FMCG/pharmaceutical stock for automated clearance discounts.                | <20 secs            | **~₹0.01**                 |
| **Logistics & Order Routing**    | **Courier & Shipping Rate Optimizer**     | Queries Shiprocket, Delhivery, and Porter APIs in real time to assign the lowest-cost shipping partner per order.               | <15 secs            | **~₹0.01**                 |
| **Logistics & Order Routing**    | **Dropship & Vendor Order Dispatcher**    | Forwards orders to external dropship suppliers, scraping tracking numbers and updating storefront delivery status.              | 1–2 mins            | **~₹0.10**                 |
| **Logistics & Order Routing**    | **Digital Warranty & AMC Scheduler**      | Auto-registers post-sale warranties and schedules annual maintenance service reminder alerts in customer CRM.                   | <20 secs            | **~₹0.01**                 |
| **Deep Research & Multi-Agent**  | **10x Multi-Agent Research Swarm**        | Spawns 10 parallel subagents concurrently inside the VM to research regional suppliers, verify licenses, and synthesize briefs. | 5–10 mins           | **~₹0.50**                 |
| **Deep Research & Multi-Agent**  | **Storefront SEO & Google Merchant Feed** | Generates XML sitemaps, OpenGraph tags, and Google Shopping RSS feeds, deploying updates to Cloudflare edge KV.                 | 1 min               | **~₹0.05**                 |
| **Developer & Workflow Sandbox** | **Ad-Hoc Python / Shell Scripting**       | Safe isolated environment for executing custom user workflows, webhook transformers, and custom DB migration scripts.           | Pay-per-second      | **₹0.06 / minute**         |

---

## 2. Product Tiers & Pricing Structure

| Tier       | Plan Name                         | Price                                         | Features & Quota Included                                                                                                                                                                                                                                         |
| :--------- | :-------------------------------- | :-------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tier 1** | **Free Core Workspaces**          | **₹0 / Free Forever**                         | • Up to 5 Workspaces (Personal + Business + Team)<br>• GenUI POS, stock tracker, CRM & task feed<br>• Unlimited on-device Barcode / SKU scanning (₹0)<br>• Method 1: Click-to-WhatsApp P2P ordering (₹0)<br>• Pay-as-you-go OCR & Sandbox at pure cost            |
| **Tier 2** | **Site Agent & Digital Employee** | **₹499 / month**<br>*(₹3,999/yr + Free .com)* | • Instant Edge Storefront (`business.tarai.space`)<br>• 24/7 Web AI Salesperson (Unlimited free chats)<br>• **500 WhatsApp AI Messages BUNDLED** (at-cost)<br>• **500 Tar Intake OCR Scans BUNDLED** (at-cost)<br>• Real-time stock sync + Tar Inbox task routing |
| **Tier 3** | **Zero-Profit Top-Up Wallet**     | **Pure At-Cost (0% Markup)**                  | • **WhatsApp AI Replies:** ₹0.12 / message<br>• **Tar Intake OCR:** ₹5.00 / 1,000 scans (0.5 Paise/scan)<br>• **Cloud Sandbox (ASCII Box):** ₹3.50 / hour ($0.036/hr)<br>• No expiry, refundable balance                                                          |
| **Tier 4** | **Specialized Micro-Agents**      | **Pay-Per-Task**                              | • **Supplier & Lead Hunter:** ₹5.00 / batch (10–20 leads)<br>• **Market Research Sandbox:** ₹3.00 / task run                                                                                                                                                      |

---

## 3. Vertical-Specific Agent Matrix

How the 4 agents collaborate across industry verticals:

| Vertical | 1. Sales Agent (Storefront/WhatsApp) | 2. Marketing Agent (Outreach/SEO) | 3. OCR Agent (Tar Intake) | 4. Computer Sandbox Agent |
| :--- | :--- | :--- | :--- | :--- |
| **Retail & Grocery** | Catalog grid, SKU search, WhatsApp cart & checkout | Wholesale supplier price comparison | Auto-restocks inventory from paper supplier bills | Scrapes local competitor prices & market trends |
| **Restaurant & Cafe** | QR menu, table ordering & takeaway FAQ bot | Re-engages diners with weekend promos | Scans raw ingredient & vendor supply receipts | Crawls delivery platform rankings & reviews |
| **Salon & Spa** | 24/7 Stylist appointment booking & slots | Lapsed client retention messages via WhatsApp | Logs product & cosmetic inventory bills | Researches trending styles & regional pricing |
| **Clinic & Health** | Patient triage, doctor timings & booking bot | Health camp & preventive checkup notices | Digitizes lab bills & vendor receipts into history | Scrapes drug catalog & generic medicine alternatives |
| **Logistics & Fleet** | Shipping quote calculator & live tracking bot | B2B shipper outreach & lead generation | Scans signed paper proof-of-delivery (POD) notes | Automates route tracking & dispatch calculations |
| **Services & Freelance**| Portfolio showcase & lead qualification bot | Outreach to high-intent local project leads | Auto-logs expense receipts for tax filing | Executes web research & benchmark reports |

---

## 4. Real Unit Economics & SaaS Profitability

By keeping edge and operational compute serverless and lean, Tar maintains **>80% net profit margins** on the ₹499/mo tier.

### Monthly Unit Economics per Paying Subscriber (Tier 2)

| Component                             | Provider / Engine            | Real Wholesale Cost   | Revenue Impact                  |
| :------------------------------------ | :--------------------------- | :-------------------- | :------------------------------ |
| **Monthly Gross Subscription**        | Tar SaaS Tier 2              | —                     | **+₹499.00**                    |
| **500 Bundled WhatsApp Chats**        | Meta API + DeepSeek-V4-Flash | ₹0.12 / msg           | -₹60.00                         |
| **500 Bundled Intake Scans**          | DeepSeek-OCR 2               | ₹0.005 / scan         | -₹2.50                          |
| **Cloudflare Edge + KV + R2**         | Cloudflare Workers & R2      | Global edge routing   | -₹5.00                          |
| **Database Sync**                     | Turso (SQLite per Workspace) | Scaled multitenant DB | -₹5.00                          |
| **Web LLM Storefront Chats**          | DeepSeek-V4-Flash            | $0.08 / 1M input      | -₹5.00                          |
| **Payment Gateway (Razorpay/Stripe)** | 2% processing fee            | 2% of ₹499            | -₹9.98                          |
| **TOTAL OPERATIONAL EXPENSE**         | —                            | —                     | **-₹87.48**                     |
| **NET MONTHLY PROFIT PER USER**       | —                            | —                     | **+₹411.52 (82.5% Net Margin)** |

---

## 5. Just-In-Time (JIT) Principle & Global Scalability

### Zero-Draft JIT Lifecycle
1. **Workspace Creation:** Creates local SQLite tables (`matter`, `graph`, `inbox`). **Cost: ₹0 / <50ms**. Zero idle cloud compute.
2. **On-Demand Preview:** Compiles storefront **only** when requested using live catalog data. **Cost: ₹0 / <200ms**.
3. **1-Tap Go-Live:** Activates edge deployment and WhatsApp connector for **₹499/mo**.

### Global Revenue Projections

| Active Businesses | Paying Subscribers (30%) | Monthly Gross | Monthly Infra Cost | Net Monthly Profit | Net Annual Profit |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1,000** | 300 @ ₹499/mo | **₹1,49,700** | ~₹26,250 | **₹1,23,450** | **₹14.81 Lakhs** |
| **10,000** | 3,000 @ ₹499/mo | **₹14,97,000** | ~₹2,62,500 | **₹12,34,500** | **₹1.48 Crores** |
| **50,000** | 15,000 @ ₹499/mo | **₹74,85,000** | ~₹13,12,500 | **₹61,72,500** | **₹7.41 Crores** |
| **100,000** | 30,000 @ ₹499/mo | **₹1.50 Crores** | ~₹26,25,000 | **₹1.23 Crores** | **₹14.81 Crores** |

---

## 6. Strategic Competitive Moat

1. **Zero-Profit Operational Utilities:** Passing WhatsApp (₹0.12/msg), OCR (₹0.005/scan), and Cloud Sandboxes ($0.036/hr) at pure wholesale cost eliminates friction and builds total trust.
2. **10x Cheaper Agentic Sandbox:** Leveraging [ASCII Box](https://box.ascii.dev) allows Tar to run 10x more parallel agent workloads compared to legacy competitors.
3. **High-Value ₹499 Bundle:** For ~₹16.50/day (cost of one cup of tea), local merchants get an autonomous web & WhatsApp sales machine.
4. **Sustained 82.5% Margins:** Serverless edge architecture secures **₹411 net profit per subscriber every month**.

