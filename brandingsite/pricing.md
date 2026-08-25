Tar Pricing
Simple credit pricing
Base activation is ₹500 (includes ₹100 pre-loaded usage credits). Top up anytime on demand at 100% direct at-cost pass-through.

1. Workspaces and Credits
Monthly workspace credits are reserved first. AI automation inside a workspace uses its owner's wallet.

Workspace usage	Credits
Personal workspace
Local on-device SQLite & .md folder
0
Each active owned workspace
Reserved first from wallet on the 1st (₹10.00 / mo)
100 / month
Joined workspace
Invited members use owner's wallet
0 for the member
Public browsing, ordering, or booking
Zero charge for your end customers
0
Archived workspace
Preserved historical workspaces at rest
0
2. Agents and Credits
Local on-device queries use 0 credits. Cloud DB syncs, agent actions, and research swarms are charged at exact pass-through cost.

Agent action / Operation	Credit Cost	At-Cost INR
Workspace & Core (CRUD, Sync & Memory)
Local on-device CRUD (cached SQLite reads & views)	0	₹0.00
Cloud DB write, sync & search (Turso writes + bandwidth)	1 cr / 600 ops	~₹0.016 / 100 ops
Workspace answer or summary (Gemma-4)	0.02 cr	~₹0.002
OCR document scan (DeepSeek-OCR 2 @ $0.03 / 1M)	0.05 cr / page	~₹0.0052 / page
Bill audit (OCR scan + ledger check)	0.1 cr / bill	~₹0.01 / bill
Analyst or tax report (DeepSeek-V4)	1 cr / report	~₹0.10 / report
Messaging & CRM
Sales or support reply (Gemma-4 @ $0.02 in / $0.10 out)	0.02 cr	~₹0.002 / reply
Voice note to order (Whisper Groq @ $0.04/hr + Gemma)	0.3 cr	~₹0.03 / order
Quote or proposal (DeepSeek-V4 @ $0.08 in / $0.18 out)	0.25 cr	~₹0.025 / doc
Customer retention campaign (DeepSeek-V4)	0.5 cr	~₹0.05 / batch
Sites & Publishing
Publish or update a site	0.5 cr / run	~₹0.05 / run
Edit a site section	0.25 cr / run	~₹0.025 / run
Keep a public site active	50 cr / month	₹5.00 / month
Generate a site draft (Multi-turn DeepSeek-V4)	3 cr / draft	~₹0.30 / draft
Intelligence & Swarms
Competitor price check (Gemma-4)	0.02 cr / product	~₹0.002 / check
Operations workflow (DeepSeek-V4)	0.5 cr / pipeline	~₹0.05 / run
Product photo cleanup (Vision model)	1 cr / image	~₹0.10 / image
Verified lead batch (DeepSeek-V4)	2 cr / batch	~₹0.20 / batch
Deep research swarm (Autonomous multi-agent loop)	12 cr / dossier	~₹1.20 / task
3. Credits and Cost
Initial activation costs ₹500 (includes ₹100 direct credit wallet value). All top-ups pass through 100% at-cost credit value without expiration.

Pack	Price	Credits Included	Structure	Best for
Base Credit Pack	₹500	1,000 credits (₹100 wallet value)	₹400 platform fee + ₹100 usage credits	Initial account activation — pre-loaded with ₹100 credit wallet
Top-Up: Starter	₹100	1,000 credits (100% wallet value)	Pure at-cost usage top-up	Flexible on-demand top-up whenever balance runs low
Top-Up: Growth	₹500	5,000 credits (100% wallet value)	Pure at-cost usage top-up	Active businesses running daily CRM, OCR & proposals
Top-Up: Scale	₹1,000	10,000 credits (100% wallet value)	Pure at-cost usage top-up	High-volume stores, large lead batches & research swarms
4. Model and Credits Calculation
Zero-profit, zero-loss pass-through calculation: real AI provider API rates, per-task token volumes, and edge database costs map directly to credits with 100% transparency.

Tier / Capability	Model & API Rate	Tokens per Task (In / Out)	Credit Cost (Unit)	At-Cost INR (Unit)	Scope / Tasks
Fast Chat & Routing	Gemma-4-E4B-it
$0.02 in / $0.10 out / 1M
300 in / 150 out	0.02 cr / reply	~₹0.002 / reply	WhatsApp/Telegram replies, workspace summaries (1 cr = 50 replies)
Document OCR	DeepSeek-OCR 2
$0.03 in / $0.03 out / 1M
1.4k vision in / 600 text out	0.05 cr / page	~₹0.0052 / page	Invoice & receipt parsing, multi-layout OCR (1 cr = 20 pages)
Voice-to-Order	Whisper-v3 + Gemma-4
$0.04/hr + $0.02/$0.10
30s audio + 250 in / 100 out	0.3 cr / order	~₹0.03 / order	Audio voice note transcription to structured order
Commercial Quotes	DeepSeek-V4-Flash
$0.08 in / $0.18 out / 1M
1.5k in / 800 out	0.25 cr / doc	~₹0.025 / doc	Itemized commercial quotes & proposals (1 cr = 4 quotes)
Analyst & Tax Reports	DeepSeek-V4-Flash
$0.08 in / $0.18 out / 1M
6.0k in / 3.0k out	1.0 cr / report	~₹0.10 / report	Financial ledger audits, multi-month tax reports
Site Draft Engine	DeepSeek-V4 Multi-Turn
$0.08 in / $0.18 out / 1M
20k in / 8.0k out	3.0 cr / draft	~₹0.30 / draft	Full website component drafting, section edits (0.25 cr)
Autonomous Swarms	DeepSeek-V4 Swarm
Multi-agent loop at raw API cost
80k in / 30k out	12 cr / dossier	~₹1.20 / task	Comprehensive multi-source market research dossiers
Edge Database & Sync	Turso SQLite + Bandwidth
$1.00 / 1M writes · $0.09 / GB
100 row writes + 1 MB sync	1 cr / 600 ops	~₹0.016 / 100 ops	Cloud CRUD mutations, vector search & edge sync
How ₹100 = 1,000 Credits is Calculated (Zero Profit Margin)
1 Credit = ₹0.10 (10 Paise = ~$0.001156 USD). Here is what ₹100 (1,000 Credits) buys at exact pass-through provider cost:

Infrastructure / Agent Capability	Underlying Model & Rate	At-Cost Unit Rate	Capacity for ₹100 (1,000 cr)	Total Tokens / Data for ₹100
Customer WhatsApp / Chat Replies	Gemma-4-E4B-it ($0.02 in / $0.10 out)	0.02 cr (~₹0.002 / reply)	50,000 chat replies	22.5M tokens (15M in / 7.5M out)
Document & Invoice OCR Scans	DeepSeek-OCR 2 ($0.03 in / $0.03 out)	0.05 cr (~₹0.0052 / page)	20,000 scanned pages	40.0M tokens (28M vision in / 12M text out)
Voice Note to Structured Orders	Whisper-v3 ($0.04/hr) + Gemma-4	0.30 cr (~₹0.03 / order)	3,333 audio orders	~28 hours of continuous audio processing
Commercial Quotes & Proposals	DeepSeek-V4-Flash ($0.08 in / $0.18 out)	0.25 cr (~₹0.025 / quote)	4,000 custom quotes	9.2M tokens (6.0M in / 3.2M out)
In-Depth Tax & Analyst Reports	DeepSeek-V4-Flash ($0.08 in / $0.18 out)	1.00 cr (~₹0.10 / report)	1,000 comprehensive reports	9.0M tokens (6.0M in / 3.0M out)
Full Website Component Drafts	DeepSeek-V4 Multi-Turn Swarm	3.00 cr (~₹0.30 / draft)	333 full site drafts	9.3M tokens (6.6M in / 2.7M out)
Deep Market Research Dossiers	DeepSeek-V4 Autonomous Swarm	12.00 cr (~₹1.20 / task)	83 research dossiers	9.1M multi-agent loop tokens
Cloud Database CRUD & Edge Sync	Turso SQLite + Transfer Bandwidth	1 cr / 600 ops (~₹0.016 / 100 ops)	625,000 database ops	625k row writes + 6.25 GB sync transfer
Active Owned Workspace Hosting	Edge SQLite DB & Folder Storage	100 cr / month (₹10.00 / mo)	10 months active workspace	Full dedicated SQLite cloud edge node
Example Monthly Business Consumption
How an active business consumes tokens & credits at direct provider cost:

Activity	Underlying Model	Monthly Volume	Total Tokens Consumed	Credits	At-Cost INR
Owned Workspace	Edge storage & SQLite sync reservation	1 workspace / mo	—	100 cr	₹10.00
Cloud DB CRUD & Sync	Turso SQLite + Transfer Bandwidth	1,000 operations	1,000 row writes + 10 MB sync	1.6 cr	₹0.16
WhatsApp Customer Replies	Gemma-4-E4B-it ($0.02 in / $0.10 out)	500 replies	150k in / 75k out	10 cr	₹1.00
Invoice / Receipt OCR Scans	DeepSeek-OCR 2 ($0.03 in/out / 1M)	100 pages	140k vision in / 60k text out	5 cr	₹0.52
Quotes & Commercial Proposals	DeepSeek-V4-Flash-0731	20 quotes	30k in / 16k out	5 cr	₹0.50
Total Monthly Need	~121.6 cr	~₹12.18 / mo
The pre-loaded ₹100 wallet credits (1,000 cr) from the Base Pack covers 8+ months of active operations
Subsequent top-ups (₹100 = 1,000 cr) refill 100% of payment directly into your credit wallet with 0% token profit markup.
* Prices are localized worldwide using purchasing power, taxes, and store costs. Purchased credits do not expire while the account is active. Third-party charges such as WhatsApp, SMS, domains, and payment processing are separate. The ₹500 base pack includes ₹400 platform onboarding fee and ₹100 pre-loaded credit balance (1,000 credits @ ₹0.10/credit). Subsequent top-ups are credited 100% directly to the wallet at zero token profit margin.


Business Type,Primary AI Task,Est. Users/Mo,Est. Msgs/Mo,Est. Total Cost (Incl. 18% GST)
Solopreneur / Consultant,Lead qualification & call booking,10 – 25,100 – 250,₹13.57 – ₹33.93
Local Service / Clinic,Appointment scheduling & FAQs,30 – 50,300 – 600,₹40.71 – ₹81.42
Real Estate / Agency,Requirement gathering & brochure delivery,20 – 30,500 – 800,₹67.85 – ₹108.56
D2C / E-Commerce,Order tracking & basic return handling,100 – 200,"1,000 – 2,500",₹135.70 – ₹339.25
Tech / Level-1 Support,Troubleshooting & ticket status,50 – 100,"2,000 – 5,000",₹271.40 – ₹678.50
