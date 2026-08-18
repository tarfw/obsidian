# Tar Revenue & Pricing Architecture: `revenue.md`

> **Document Status:** Finalized Business Model & Unit Economics  
> **Target Audience:** Working class, solo entrepreneurs, small & mid businesses, shopkeepers, shift workers, and local enterprises.  
> **Core Principle:** 100% Free Core, Ultra-Affordable Add-Ons, Zero Fluff, >90% Net Profit Margins.

---

## 1. Infrastructure Cost Stack (Our Actual Costs)

Our modern serverless edge architecture ensures near-zero marginal cost per user.

| Infrastructure Layer | Provider | Unit Pricing / Real Rate | Cost per Active Business / Month |
| :--- | :--- | :--- | :--- |
| **LLM Inference** | **DeepSeek-V4-Flash** (`DeepSeek-V4-Flash-0731`) | • Input: **$0.08 / 1M tokens** (~₹6.70 / 1M)<br>• Cached Input: **$0.016 / 1M tokens** (~₹1.35 / 1M)<br>• Output: **$0.18 / 1M tokens** (~₹15.00 / 1M) | **~₹10.00 / mo** (Assuming ~1,500 AI turns / mo) |
| **Edge Compute & Storefront** | **Cloudflare Workers + KV + R2** | • Workers: $0.30 / 1M requests (100k/day free)<br>• KV: $0.50 / 1M reads (100k/day free)<br>• R2: Free egress, $0.015 / GB storage | **~₹5.00 / mo** (Sub-2ms edge rendering across 300+ cities) |
| **Edge Database & Sync** | **Turso (SQLite per Workspace)** | • Free tier: 500 DBs, 9GB storage<br>• Scaled: ~$0.05 / active DB / mo | **~₹5.00 / mo** (1–5 DBs per user) |
| **Future Object Storage** | **Railway S3** (Post-funding migration) | • Standard S3 compatible storage | **~₹3.00 / mo** |
| **Total Real Cost per Active Paying Business** | — | — | **~₹20.00 to ₹23.00 / month** |

---

## 2. Product Tiers & Pricing Plans

```
┌───────────────────────────────────────────────────────────────────────────┐
│ TIER 1: FREE CORE WORKSPACES (100% Free Forever)                          │
│ • Max 5 Workspaces (1 Personal + Created + Joined/Collab)                 │
│ • Full GenUI Live Engine (POS billing, stock counter, contacts, tasks)    │
│ • Unified Personal Inbox (all tasks across all workspaces in 1 feed)     │
│ • Local Offline-First Engine + Turso Cloud Sync                           │
│ • 50 Free AI Chat / Command turns per month                               │
├───────────────────────────────────────────────────────────────────────────┤
│ TIER 2: SITE AGENT SUBSCRIPTION (`tarsite`)                               │
│ • ₹499 / month (or ₹3,999 / year)                                         │
│ • Live Public Storefront & Booking Site (`shop.tarai.space` / custom domain)│
│ • 24/7 AI Customer Helpdesk Agent BUNDLED IN (Web, WhatsApp & Telegram)   │
│ • Live Catalog, Stock, and Pricing Auto-Sync                              │
│ • Customer orders and inquiries route straight to Tar Inbox               │
├───────────────────────────────────────────────────────────────────────────┤
│ TIER 3: ON-DEMAND AGENTS & MICRO-PACKS                                    │
│ • Standalone Unlimited Helpdesk Pass: ₹49 / month                         │
│ • Helpdesk Chat Micro-Pack: ₹29 for 1,000 chats                           │
│ • Lead Search Agent: ₹5 / search batch (10-20 verified leads)             │
│ • Invoice / Receipt Scanner Agent: ₹2 / paper bill scan                   │
│ • Computer Sandbox / Research Agent: ₹3 / heavy background task           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Breakdown of Plans

### 3.1. Tier 1: Free Core (Max 5 Workspaces)
- **Target:** Anyone downloading Tar (personal budgeting, shop staff, gig workers, small vendors).
- **Price:** **₹0 / FREE Forever**.
- **Features:**
  - Up to 5 active workspaces (e.g. *1 Personal + 1 Main Shop + 1 Delivery Job + 1 Family Farm*).
  - GenUI Live Action Stream (Dynamic POS terminal, inventory stepper, contact directory, deal pipeline).
  - Voice and text intent resolution dock.
  - Multi-channel team chat commands (`@taragent` in Telegram, Discord, Slack, GChat).
  - Complete offline functionality with automatic cloud sync.

---

### 3.2. Tier 2: Site Agent (`tarsite`) Subscription
- **Target:** Any shop, boutique, clinic, restaurant, salon, or freelancer needing an online presence and automated order taking.
- **Price:**
  - **Monthly:** **₹499 / month** (~$5.99 / mo)
  - **Annual:** **₹3,999 / year** (~₹333 / mo — Includes custom `.com` domain mapping)
- **What's Included:**
  1. **Instant Edge Website**: Ultra-fast live storefront (`yourname.tarai.space`) compiled in seconds.
  2. **Bundled 24/7 AI Helpdesk**: Autonomous customer service agent responding on Web, WhatsApp, and Telegram.
  3. **1-Tap WhatsApp & Online Ordering**: Direct checkout with zero commission fees.
  4. **Real-time Autonomous Sync**: Any product, price, or stock change in the Tar app updates the live website instantly.
  5. **Direct Inbox Routing**: Inbound leads, orders, and appointment bookings land directly in the owner's Tar Inbox.

---

### 3.3. Tier 3: Standalone Helpdesk Agent Options
For businesses that do not need a full website but want automated WhatsApp/Telegram customer service:

| Option | Price to User | Volume / Quota | Real AI Cost (DeepSeek Flash) | Net Margin |
| :--- | :--- | :--- | :--- | :--- |
| **Unlimited Helpdesk Pass** | **₹49 / month** | Unlimited customer chats on WhatsApp, Telegram & Web | ~₹10.00 / mo | **79.5% (₹39 profit)** |
| **Chat Micro-Pack (Starter)** | **₹29 (One-time)** | 1,000 customer conversations | ~₹7.00 | **75.8% (₹22 profit)** |
| **Chat Micro-Pack (Growth)** | **₹99 (One-time)** | 5,000 customer conversations | ~₹35.00 | **64.6% (₹64 profit)** |

---

### 3.4. Tier 4: On-Demand Pay-Per-Use Specialized Agents
Users top up a lightweight wallet (e.g. ₹49, ₹99, ₹249) and spend micro-credits only when using heavy specialized agents:

| Agent | Purpose & Capability | Price per Use | Real Cost | Net Margin |
| :--- | :--- | :--- | :--- | :--- |
| **Lead Search Agent** | Scrapes and finds verified local wholesale suppliers, distributors, or target clients by city/category | **₹5.00 / search** (10–20 verified leads) | ~₹0.25 | **95.0%** |
| **Invoice / Receipt Scanner** | Extracts line items, supplier details, and prices from photos/PDFs of paper bills and auto-updates stock/expenses | **₹2.00 / scan** | ~₹0.15 | **92.5%** |
| **Computer Sandbox Agent** | Executes automated web research, bulk price comparisons, market analysis, or heavy data exports | **₹3.00 / task run** | ~₹0.30 | **90.0%** |

---

## 4. Unit Economics & Profitability per Paying User

### Unit Economics for 1 Site Agent Subscriber (₹499/mo):

$$\text{Gross Revenue: } \mathbf{₹499.00}$$
$$\text{DeepSeek-V4-Flash LLM Cost: } -₹10.00$$
$$\text{Cloudflare Workers + R2 + KV: } -₹5.00$$
$$\text{Turso Edge Database: } -₹5.00$$
$$\text{Payment Gateway Fee (2%): } -₹9.98$$
$$\mathbf{\text{Net Monthly Profit per User: } ₹469.02\text{ / month } (\approx ₹5,628\text{ / year})}$$

---

## 5. Revenue Projections

| Active Businesses | Site Subscribers (30% conv.) | Pay-Per-Use Agents (40% conv.) | Monthly Gross Revenue | Total Monthly Infra Cost | Net Monthly Profit | Net Annual Profit |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **100** | 30 @ ₹499/mo | 40 @ ₹100/mo | **₹18,970** | ~₹1,200 | **₹17,770** | **₹2.13 Lakhs** |
| **1,000** | 300 @ ₹499/mo | 400 @ ₹100/mo | **₹1,89,700** | ~₹11,000 | **₹1,78,700** | **₹21.44 Lakhs** |
| **10,000** | 3,000 @ ₹499/mo | 4,000 @ ₹100/mo | **₹18,97,000** | ~₹1,05,000 | **₹17,92,000** | **₹2.15 Crores** |
| **100,000** | 30,000 @ ₹499/mo | 40,000 @ ₹100/mo | **₹1.89 Crores** | ~₹10.2 Lakhs | **₹1.79 Crores** | **₹21.5 Crores** |

---

## 6. Why This Plan Wins in Emerging & Global Markets

1. **Zero Risk for Common Users**: Anyone can download the app and run their shop, POS billing, and team for ₹0.
2. **Massive Perceived Value**: At ₹499/mo (less than ₹17/day), a business gets a full website, 24/7 AI staff, online ordering, and real-time inventory management that previously cost ₹15,000+ upfront.
3. **Frictionless Micro-Credits**: Pay-per-use rates (₹2 to scan an invoice, ₹29 for 1,000 chats) ensure small vendors never feel locked into predatory corporate subscriptions.
4. **Extreme Capital Efficiency**: Low inference costs (DeepSeek Flash) + serverless edge hosting (Cloudflare + Turso) guarantee 90%+ profit margins at every tier.
