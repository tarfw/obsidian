# TAR Tech Stack — Final

**Target:** native app · millions of users · day-1 offline · ₹100 cost / ₹500 price per user/mo · India + SEA.
**Rate:** ₹95 = $1 (2026 range ₹89.9–96.9). Recheck before invoicing.

============================================================
## 0. UNIT ECONOMICS — ₹100 COST · ₹500 PRICE
============================================================

```
Cost per user     <= ₹100 / month    (₹1.05 ≈ $1 — the ceiling is global)
Price (India)     =  ₹500 / user / month
Margin floor      >= ₹400 / user     (80%)
Unit              one user — personal workspace free, work workspaces draw the same envelope
```

Every layer in this document must fit inside that ₹100. If it does not, it does not ship.

**₹500 = 1,000 credits · 1 credit = ₹0.10**

```
₹500 / month  ->  1,000 credits @ ₹0.10
at-cost of 1,000 credits = ₹100          the grant IS the envelope
1 credit = ₹0.10 ≈ $0.00105
```

**Per-user cost envelope — standard user**

Profile: 1 work workspace · 1,500 LLM calls (50/day) · 30 sandbox jobs · 1 browser job ·
offline-first reads · deltas only · no blobs in DB · measured at 1M users.

| Layer | ₹/user/mo | Basis |
|---|---|---|
| LLM — 1,500 calls, routed mix | 39.27 | OpenRouter; ₹57.86 on DeepInfra |
| Heavy compute — 30 jobs, 80/20 box + Containers | 0.95 | §11 variant C |
| Turso — 1,500 writes, 30K reads, 5 MB store, 5 MB sync | 0.67 | §5 |
| browser-use — 1 job, direct proxy | 0.07 | §7 |
| Workers + R2 | 0.01 | §4, §10 |
| EAS Build (amortized) | 0.02 | ₹18,905 ÷ 1M |
| **Variable total** | **40.99** | **59.58 on DeepInfra** |
| **Ceiling** | **100.00** | |
| **Headroom** | **59.01 (59%)** | 40.42 (40%) on DeepInfra |

Envelope allocation: **LLM ~96% · heavy compute ~2.3% · Turso ~1.6% · everything else ~0.2%.**
Cost scales 1:1 with users and the ceiling is flat, so headroom does not grow with scale.

**What ₹100 buys** — after ₹1.72 of non-LLM, the LLM budget is ₹98.28/user/mo.

| Profile | ₹/call (OpenRouter) | Calls/mo | Calls/day |
|---|---|---|---|
| Chat / classify (Gemma-4, 300/150) | 0.0020 | 49,140 | 1,638 |
| DeepSeek classify (2K/300) | 0.0141 | 6,970 | 232 |
| **Mixed 80/18/2 — the standard profile** | **0.0262** | **3,754** | **125** |
| DeepSeek extract (8K/1K) | 0.0532 | 1,847 | 62 |
| DeepSeek summarize (50K/2K) | 0.2679 | 367 | 12 |

```
The standard profile (50 calls/day, mixed) costs ₹39.27 — 39% of the envelope, ~2.5x headroom.
An extract-only user caps at 62 calls/day, so the 1,000-credit cap is REQUIRED, not optional.
```

**Price and margin**

| Market | Price ₹/mo | Cost ₹/mo | Margin ₹ | Margin % |
|---|---|---|---|---|
| **India** | **500** | 40.99 | **459.01** | **91.8%** |
| SEA-A — Vietnam, Philippines, Indonesia, Cambodia, Laos, Myanmar | 400 | 40.99 | 359.01 | 89.8% |
| SEA-B — Thailand, Malaysia | 550 | 40.99 | 509.01 | 92.5% |
| SEA-C — Singapore, Brunei (group H1, §17) | 1,805 | 40.99 | 1,764.01 | 97.7% |
| **Envelope worst case** | 500 | 100.00 | **400.00** | **80.0%** |

Two numbers matter: the **₹400 / 80% floor** is the rule; **₹459 / 91.8%** is what the stack
actually returns. Price is localized in SEA; the ₹100 cost ceiling is not.

============================================================
## 1. THE STACK
============================================================

| Layer | Choice | ₹/user/mo |
|---|---|---|
| **Native app** | Expo (React Native) + EAS Build — no OTA | 0.02 |
| **Offline** | Turso Sync + embedded replicas (SQLite on device) | — |
| **API** | Cloudflare Workers — one Worker is the API | 0.01 |
| **Database** | Turso — one database per workspace | 0.67 |
| **LLM** | **Routed mix** — Gemma-4 · DeepSeek-OCR 2 · DeepSeek V4 Flash | 39.27 |
| **Browser** | browser-use — $0.02/browser-hour + traffic | 0.07 |
| **Heavy compute** | Cloudflare Containers (interactive) + box (batch) | 0.95 |
| **Blobs** | Cloudflare R2 — $0.015/GB-mo, free egress | — |
| **Cost** | **fits ₹100 envelope** | **40.99** |
| **Price** | **₹500/user/mo** | **margin ₹459.01 (91.8%)** |

```
Expo ──local──> SQLite (device) ──sync──> Turso (per workspace)
  │                                            │
  └──> Worker (API + Gateway) ─────────────────┘
             ├──> Routed LLM mix      (Gemma-4 · OCR · V4 Flash)
             ├──> browser-use         (web tasks)
             ├──> Containers | box    (heavy jobs)
             └──> R2                  (files)
```

============================================================
## 2. FIVE RULES THAT DECIDE THE BILL
============================================================

```
1. Envelope first.   Every layer fits ₹100/user/mo. If it does not, it does not ship.
2. Reads are local.  Cloud is never in the read path.
3. Blobs never sync. Store the R2 key, not the file.
4. Sync deltas only. Never whole databases.
5. Route by task.    Cheap model first; escalate only when reasoning is needed.
```

============================================================
## 3. APP + OFFLINE
============================================================

```
Device SQLite = read truth.   Local writes at file speed.   push()/pull() on reconnect.
```

| Offline (works with no network) | Online-only |
|---|---|
| order taking, kitchen tickets | payment confirmation, refunds |
| notes, tasks, drafts, all reads | stock movements, approvals, access |

| Rule | Reason |
|---|---|
| Deltas, never whole DBs | sync bytes are the #1 recurring cost |
| Personal-workspace data stays device-local | most users then cost ~0 sync |
| `version` column resolves conflicts | already in tarv3 |
| Expo + EAS Build; skip EAS Update | OTA bills per MAU; not needed here |

EAS Production: **$199/mo** (₹18,905) for build concurrency.

============================================================
## 4. API
============================================================

| Feature | Value |
|---|---|
| Base | $5/mo (Workers Paid) |
| Requests | 10M included, then $0.30/M |
| CPU | 30M ms included, then $0.02/M ms |
| Egress | free |

Offline-first keeps traffic low: the app calls the Worker only to sync and to commit writes.

============================================================
## 5. DATABASE — TURSO
============================================================

| Plan | DBs | Storage | Reads/mo | Writes/mo | Syncs | Price |
|---|---|---|---|---|---|---|
| Free | 100 | 5 GB | 500M | 10M | 3 GB | $0 |
| **Developer** | unlimited | 9 GB | 2.5B | 25M | 10 GB | **$4.99** |
| Scaler | unlimited | 24 GB | 100B | 100M | 24 GB | $24.92 |
| Pro | unlimited | 50 GB | 250B | 250M | 100 GB | $416.58 |

Overage: storage $0.75/GB · reads $1/B · writes $1/M · **syncs $0.35/GB**

One database per workspace. Idle databases cost storage only. No per-database fee.

**Turso cost per user — standard work user**

Usage model: 1 work workspace · offline-first, so **device reads are free** (embedded replica) and
only sync pulls plus server-side reads bill · **no blobs ever enter the DB** (§10) · runs and
events archived after 90 days.

| Usage line | Per user/mo | Rate | $/user/mo | ₹/user/mo |
|---|---|---|---|---|
| Writes — Gateway commits | 1,500 rows | $1.00 / M rows | 0.001500 | 0.1425 |
| Reads — cloud only | 30,000 rows | $1.00 / B rows | 0.000030 | 0.0029 |
| Storage — one workspace DB | 5 MB | $0.75 / GB | 0.003750 | 0.3563 |
| Sync — delta transfer, both ways | 5 MB | $0.35 / GB | 0.001750 | 0.1663 |
| Plan share — unlimited DBs | — | $416.58 ÷ 1M | 0.000417 | 0.0396 |
| **Gross per user** | | | **0.007447** | **₹0.7074** |

Reads are almost free: even 30,000 cloud reads/mo is ₹0.003. **Storage is the Turso bill** —
5 MB per workspace is ~50% of the line, and it is the only line that grows if you skip archiving.

**At 1M users — billed, after plan allowances**

| Line | Usage at 1M | Included (Pro) | Overage | Billed $/mo | ₹/mo |
|---|---|---|---|---|---|
| Plan — unlimited DBs | 1M DBs | — | — | 416.58 | ₹39,575 |
| Writes | 1.5 B rows | 250 M | 1.25 B | 1,250.00 | ₹1,18,750 |
| Reads | 30 B rows | 250 B | 0 | 0.00 | ₹0 |
| Storage | 5 TB | 50 GB | 4,950 GB | 3,712.50 | ₹3,52,688 |
| Sync | 5 TB | 100 GB | 4,900 GB | 1,715.00 | ₹1,62,925 |
| **Total** | | | | **7,094.08** | **₹6,73,938** |

```
₹6,73,938 / 1M users = ₹0.67/user/mo — the Turso line used in §0 and §11.
Split: storage 52% · sync 24% · writes 18% · plan 6% · reads 0%.
Writes are flat per user (1,500 = 50/day) but storage compounds — archive is a cost control.
Free personal users cost ~₹0: their data is device-local SQLite and never enters a cloud DB.
The blended average across all users is therefore BELOW ₹0.67 — a margin cushion, not a cost.
```

============================================================
## 6. LLM — ROUTED MODEL MIX
============================================================

Route by task. The cheap model takes the volume; DeepSeek V4 Flash takes only the reasoning.

| Job | Model | Rate / M | Credits |
|---|---|---|---|
| Chat, classify, route (300/150) | Gemma-4-E4B-it | $0.02 in / $0.10 out | 0.02 cr |
| OCR, invoice scan (1.4K vision / 600) | DeepSeek-OCR 2 | $0.03 in / $0.03 out | 0.05 cr/page |
| Voice note (30 s audio + 250/100) | Whisper-v3 + Gemma-4 | $0.04/hr + $0.02/$0.10 | 0.3 cr |
| Quote, proposal (1.5K/800) | DeepSeek V4 Flash | $0.08 in / $0.18 out | 0.25 cr |
| Analyst, tax report (6K/3K) | DeepSeek V4 Flash | $0.08 in / $0.18 out | 1.0 cr |
| Deep research swarm (80K/30K) | DeepSeek V4 swarm | multi-agent loop | 12 cr |

DeepSeek V4 Flash on OpenRouter is **$0.05 / $0.16** — ~32% cheaper than DeepInfra for the
same call. Use it for anything that escalates past the cheap path.

**What ₹100 buys** — the LLM budget is **₹98.28/user/mo** after ₹1.72 of other layers (§0).

| Profile | ₹/call (OpenRouter) | Calls/mo | Calls/day | Of envelope |
|---|---|---|---|---|
| Chat / classify (Gemma-4) | 0.0020 | 49,140 | 1,638 | 2% |
| **Mixed 80/18/2 — standard profile** | **0.0262** | **3,754** | **125** | **39%** |
| DeepSeek extract (8K/1K) | 0.0532 | 1,847 | 62 | 100% |
| DeepSeek summarize (50K/2K) | 0.2679 | 367 | 12 | 100% |

```
50 calls/user/day, mixed, = ₹39.27/user/mo -> 39% of the envelope, ~2.5x headroom.
An extract-only user caps at 62 calls/day. That is why the 1,000-credit cap is enforced.
Context is the bill: 10x context = 10x cost at the same call count. Never use the 1M window
in the interactive path — reserve it for rare batch work.
```

At 1M users the standard profile is **1.5B calls/mo = ₹3.93 Cr/mo**, inside the ceiling.
At 10M users it is **15B calls/mo = ₹39.3 Cr/mo**; ₹/user/mo is unchanged, so it still holds.

============================================================
## 7. BROWSER AUTOMATION — BROWSER-USE
============================================================

```
Browsers       $0.02 / hour        (billed per whole minute, 1-min minimum)
Agents         model cost + 20%    (agent runs the task for you)
Custom model   BU 2.0 $0.60 in / $3.50 out per M
Proxies        residential $5 / GB   (ON BY DEFAULT)
               direct / your own $0.20 / GB
Concurrency    $0 lifetime = 10 sessions      (ONE-TIME purchase, not monthly)
               $200 = 50 · $1,000 = 250 · $5,000 = 500 · $25,000 = 1,000
               >1,000 sessions = Enterprise only (no self-serve tier)
```

**Cost per 1-minute job (~2 MB page)**

| | Browser time | Traffic | **Per job** |
|---|---|---|---|
| Direct / own proxy | $0.000333 | $0.00040 | **$0.00073** |
| Residential proxy | $0.000333 | $0.01000 | **$0.01030** |

**At 1M users**

| Jobs/mo | Direct | ₹/mo | ₹/user/mo | Residential | ₹/mo | ₹/user/mo |
|---|---|---|---|---|---|---|
| 1M (1/user) | $733 | ₹69,635 | ₹0.07 | $10,333 | ₹9.82 L | ₹0.98 |
| 5M (5/user) | $3,667 | ₹3.48 L | ₹0.35 | $51,667 | ₹49.08 L | ₹4.91 |
| 10M (10/user) | $7,333 | ₹6.97 L | ₹0.70 | $103,333 | ₹98.17 L | ₹9.82 |

```
Turn the residential proxy OFF. It costs 25x the browser time and 14x the whole job.
Direct / own proxy turns $103,333 into $7,333 at 10M jobs.
```

**Concurrency — the hard wall (one-time, not monthly)**

Each session runs one job at a time, and one session = 43,200 browser-minutes/mo. That makes
concurrency, not browser time, the binding constraint. The $0 tier's 10 sessions cap the
platform at ~432k jobs/mo packed no matter how much you spend on hours. Size for peak, not
average — real traffic peaks ~2.5x (§9 convention).

| Tier | Sessions | Packed ceiling* | Usable jobs/mo** | Users @1 job/mo |
|---|---|---|---|---|
| $0 | 10 | 432K | ~173K | ~173K |
| $200 | 50 | 2.16M | ~864K | ~864K |
| $1,000 | 250 | 10.8M | ~4.32M | ~4.32M |
| $5,000 | 500 | 21.6M | ~8.64M | ~8.64M |
| $25,000 | 1,000 | 43.2M | ~17.3M | ~17.3M |
| Enterprise | >1,000 | negotiated | — | — |

```
*  packed ceiling = sessions x 43,200 min/mo (every session 100% busy).
** usable = packed / 2.5 peak factor.
```

**What concurrency costs by load**

| Users @1 job/mo | Peak sessions | Tier needed | One-time | ₹/user/mo (36 mo) |
|---|---|---|---|---|
| 250K | 15 | 50 · $200 | $200 | ₹0.002 |
| 1M | 58 | 250 · $1,000 | $1,000 | ₹0.003 |
| 5M | 289 | 500 · $5,000 | $5,000 | ₹0.003 |
| **10M** | **579** | **1,000 · $25,000** | **$25,000** | **₹0.007** |
| 50M | 2,894 | Enterprise | negotiate | — |
| 100M | 5,787 | Enterprise | negotiate | — |

```
It is one-time capex, not a monthly cost, but it is a PREREQUISITE: the $0 tier's 10 sessions
cap the platform at ~173K usable users, so nothing beyond that can be served at any usage price.
Amortized over 36 months it is ₹0.002-0.007/user/mo — inside the ₹100 envelope's rounding.
1M users x 1 job/mo  = 1M jobs  -> $1,000 tier.
10M users x 1 job/mo = 10M jobs -> $25,000 tier.
10M users x 5-10 jobs/mo = 50-100M jobs -> Enterprise contract, before any usage bill.
```

**Use for:** reading sites that have no API · price and competitor checks · form fills ·
screenshots · public data extraction · login-gated flows with stored credentials.

============================================================
## 8. HEAVY COMPUTE — CLOUDFLARE CONTAINERS
============================================================

Workers Paid required. Billed per **10 ms awake**. Memory/disk bill on *provisioned* size;
CPU on *active* use only.

```
CPU $0.000020/vCPU-s · Memory $0.0000025/GiB-s · Disk $0.00000007/GB-s
Egress $0.04/GB (India) · Included: 375 vCPU-min · 25 GiB-hr · 200 GB-hr
```

| Type | vCPU | Memory | Disk | Job (30 s) |
|---|---|---|---|---|
| lite | 1/16 | 256 MiB | 2 GB | $0.00008 |
| basic | 1/4 | 1 GiB | 4 GB | $0.00022 |
| standard-1 | 1/2 | 4 GiB | 8 GB | $0.00062 |
| standard-2 | 1 | 6 GiB | 12 GB | $0.00108 |
| standard-3 | 2 | 8 GiB | 16 GB | $0.00183 |
| **blended 70/25/5** | | | | **$0.00079** |

### Table A — Containers at 1 million users

| Jobs/user/mo | Jobs/mo | Compute | $/user/mo | ₹/user/mo | ₹/user/yr |
|---|---|---|---|---|---|
| 1 | 1M | $792 | $0.0008 | ₹0.08 | ₹0.90 |
| 5 | 5M | $3,961 | $0.0040 | ₹0.38 | ₹4.51 |
| 10 | 10M | $7,922 | $0.0079 | ₹0.75 | ₹9.03 |
| **30 (heavy)** | **30M** | **$23,767** | **$0.0238** | **₹2.26** | **₹27.10** |
| 60 (stress) | 60M | $47,534 | $0.0475 | ₹4.51 | ₹54.20 |

**Envelope:** 30 jobs/user/mo = ₹2.26 all-in on Containers; 60 jobs = ₹4.51. Both fit ₹100
easily — compute is ~2% of the envelope. The constraint here is latency/region, never cost.

**Use for:** PDF/receipt/report generation · OCR · image and video processing · CSV/Excel ·
GST and sales reports · untrusted agent code · screening · bulk embedding · legacy binaries ·
anything a user waits on. India region available, no fleet cap.

============================================================
## 9. HEAVY COMPUTE — BOX
============================================================

Full Ubuntu VMs · Docker · SSH · snapshot + fork · **EU only** (DE, FI, FR) · cap 1,500 boxes.

```
$20/mo = 2,000,000 VM-seconds = 555 hours of 4 vCPU / 8 GB
small 0.5x $0.000005/s · default 1x $0.00001/s · large 2x $0.00002/s
Stopped boxes are snapshotted and cost nothing.
```

### Table B — box at 1 million users

| Jobs/user/mo | Jobs/mo | VM-seconds | Compute | $/user/mo | ₹/user/mo | ₹/user/yr |
|---|---|---|---|---|---|---|
| 1 | 1M | 30M | $240 | $0.00024 | ₹0.02 | ₹0.27 |
| 5 | 5M | 150M | $1,200 | $0.0012 | ₹0.11 | ₹1.37 |
| 10 | 10M | 300M | $2,400 | $0.0024 | ₹0.23 | ₹2.74 |
| **30 (heavy)** | **30M** | **900M** | **$7,200** | **$0.0072** | **₹0.68** | **₹8.21** |
| 60 (stress) | 60M | 1.8B | $14,400 | $0.0144 | ₹1.37 | ₹16.40 |

**box is 3.3× cheaper than Containers** for the same 30 s job.

**Fleet ceiling at heavy scale**

```
30M jobs x 30 s = 900M VM-seconds = 347 boxes running continuously
peak 2.5x = ~870 boxes  ·  box self-serve cap = 1,500  ·  headroom is thin
```

**Envelope:** 30 jobs = ₹0.68/user/mo on box (₹1.37 at 60) — the cheapest way to absorb volume.
The 80/20 box + Containers split costs **₹0.95/user/mo**, about 1% of the ₹100 envelope.

**Use for:** overnight batch · GST/reconciliation · bulk OCR backfill · agent factories ·
media re-encode · long ETL · load tests · anything internal.
**Never for:** user-facing work (120–150 ms to India) or DPDP-covered personal data.

============================================================
## 10. BLOBS — R2 vs RAILWAY
============================================================

| | Cloudflare R2 | Railway Object Storage |
|---|---|---|
| Storage | **$0.015/GB-mo** | **$0.015/GB-mo** |
| Egress | **free** | **free** |
| Class A ops | $4.50/M | **free** |
| Class B ops | $0.36/M | **free** |
| Free tier | 10 GB · 1M A · 10M B | 10 GB (Hobby 1 TB) |
| Native Worker binding | **yes** | no (HTTP hop) |
| Platforms to run | 1 | 2 |

At 1M users, ~20M reads + 2M writes ≈ **$3.6 + $4.5 = $8/mo on R2**, ~$0 on Railway.
Both are rounding errors. **Choose R2** — same price, free egress, one platform, no auth hop
from the Worker. Railway only wins if you already deploy services there.

**Envelope:** ₹0.001/user/mo — the smallest line in the ₹100 budget. Workers adds ~₹0.006
(200M requests + CPU), so Workers + R2 together round to **₹0.01/user/mo**.

```
Hard rule: no blob ever enters the synced database.
A 2 MB photo x 1M devices = ~2 TB of sync = ~$700/mo. The same photo in R2 = ~$0.03/mo.
```

============================================================
## 11. FULL STACK — PER USER, INSIDE ₹100
============================================================

Profile (standard user): 1 work workspace · 1,500 LLM calls (50/day, routed mix) · 30 sandbox
jobs · 1 browser job · offline-first reads · deltas only · no blobs in DB. Measured at 1M users.

| Layer | Usage | ₹/user/mo |
|---|---|---|
| Routed LLM mix | 1,500 calls, OpenRouter | 39.27 |
| Heavy compute | 30 jobs, 80/20 box + Containers | 0.95 |
| Turso | 1,500 writes, 30K reads, 5 MB store, 5 MB sync | 0.67 |
| browser-use | 1 job, direct proxy | 0.07 |
| Workers + R2 | 200M requests, files | 0.01 |
| Expo EAS Build | Production, amortized | 0.02 |
| **Variable total** | | **40.99** |
| **Ceiling** | | **100.00** |
| **Margin at ₹500** | | **₹459.01 (91.8%)** |

DeepInfra instead of OpenRouter raises the LLM line to ₹57.86, so the total becomes ₹59.58 and
margin ₹440.42 (88.1%). Both sit inside the ceiling — routing matters more than the provider.

**Fixed floor** — EAS ₹18,905 + Workers $5 + box $20 min ≈ **₹21,280/mo**, independent of users.
It dominates at small scale and rounds away at large scale:

| Users | Revenue ₹/mo (@₹500) | Cost ₹/mo | ₹/user | Margin ₹/mo | Margin % |
|---|---|---|---|---|---|
| 1,000 | ₹5.00 L | ₹62,270 | ₹62.27 | ₹4.38 L | 87.5% |
| 10,000 | ₹50.0 L | ₹4,31,180 | ₹43.12 | ₹45.69 L | 91.4% |
| 1,00,000 | ₹5.00 Cr | ₹41,20,280 | ₹41.20 | ₹4.59 Cr | 91.8% |
| **10,00,000** | **₹50.0 Cr** | **₹4,10,11,280** | **₹41.01** | **₹45.90 Cr** | **91.8%** |
| **1,00,00,000** | **₹500 Cr** | **₹40,99,21,280** | **₹40.99** | **₹459.01 Cr** | **91.8%** |

```
Cost per user is FLAT (₹40.99 variable) because it scales 1:1 with users, while the price and
the ₹100 ceiling are also flat. Margin therefore stays 87.5% at 1K users and 91.8% at 1M+.
There is no scale at which the envelope breaks — only usage profiles that break it (§6).
```

**Variant check** — what the A/B/C compute choice does to the envelope:

| Variant | Heavy compute | Full stack ₹/user/mo | Margin ₹/user | Margin % |
|---|---|---|---|---|
| A — all Containers | 2.26 | 42.30 | 457.70 | 91.5% |
| B — all box | 0.68 | 40.72 | 459.28 | 91.9% |
| **C — split (recommended)** | **0.95** | **40.99** | **459.01** | **91.8%** |

The A/B/C choice moves the envelope by ~₹1.58/user — invisible against ₹100. Keep the split for
in-region latency and to stay under the box fleet ceiling, not for the money.

============================================================
## 12. COST DRIVERS
============================================================

At the standard user (₹40.99 variable):

```
1  Routed LLM mix      ~96%    -> route by task; OpenRouter; cap at 1,000 credits
2  Heavy compute       ~2.3%   -> route batch to box
3  Turso               ~1.6%   -> archive at 90 days; deltas only; personal data local
4  browser-use         ~0.2%   -> direct proxy, never residential
5  EAS + Workers + R2  ~0.1%   -> already minimal
```

Only the LLM line can break the envelope. Everything else is ~₹1.72/user and is not worth
optimizing until the LLM is saturated. Inside the Turso line, storage is what compounds.

| Lever | From | To | Saves ₹/user/mo |
|---|---|---|---|
| Escape an extract-only profile | 79.80 | 39.27 | 40.53 |
| Route chat/classify to Gemma-4 | 39.27 | 3.00 | 36.27 |
| Shrink context 10× | 39.27 | 3.93 | 35.34 |
| OpenRouter instead of DeepInfra | 57.86 | 39.27 | 18.59 |
| Batch jobs to box (variant A → C) | 2.26 | 0.95 | 1.31 |
| Archive Turso storage at 90 days | 0.67 | ~0.40 | ~0.27 |
| Direct proxy instead of residential | 0.98 | 0.07 | 0.91 |
| Personal workspace stays device-local | 0.67 | ~0.00 | ~0.67 |

These are **not additive** — they overlap. The first four all attack the same ₹39.27, and the
last two are two different ways of removing the same Turso line.

============================================================
## 13. SCALING RULES
============================================================

```
1   Cost per user <= ₹100/mo. Price ₹500. Margin >= 80%. A layer outside the envelope does not ship.
2   Reads are local. Cloud is never in the read path.
3   Blobs never sync. Store the R2 key only.
4   Sync deltas, never databases.
5   Route by task. Cheap model first; escalate only when reasoning is genuinely needed.
6   Cap LLM use at 1,000 credits/user/mo. Context AND call volume are the bill.
7   Deterministic first; agents only for reasoning.
8   Batch is cheap, interactive is expensive. Route accordingly.
9   Residential proxies cost 25x browser time. Turn them off.
10  Buy browser-use concurrency before scale, never after.
11  Archive runs and events after 90 days.
12  One database per workspace; no cross-workspace queries.
13  Payments, stock and approvals are online-only.
14  Money and counts are integers, always.
```

============================================================
## 14. OPEN RISKS
============================================================

| Risk | Impact |
|---|---|
| Extract / doc-heavy usage profile | 62 calls/day breaks ₹100 — the 1,000-credit cap is load-bearing |
| Agent context creep | 10× context = 10× the LLM bill at the same call count |
| Residential proxies left on | 14× the browser bill (§7) |
| ₹500 affordability in India | ₹6,000/yr ≈ 2.2% of per-capita income — the free personal tier carries this |
| Never load-tested at 10M | the cost model is linear; verify Turso sync and the box fleet first |
| box is small, EU-only, no SLA | fine for batch; do not depend on it for users |
| DPDP residency expectations | keep personal data on Cloudflare India |
| browser-use concurrency wall | $0 = 10 sessions ≈ 173K usable users; budget $1,000–25,000 before scale |
| Turso storage growth | 5 MB/workspace is 52% of the Turso line; archive at 90 days or it compounds |

**Note:** D1 + Workers would be ~40% cheaper than Turso — but Turso is only ₹0.67/user/mo, so
the saving is ~₹0.27/user. Offline is now a **capability** decision, not a cost one. Confirm
offline is needed for **writes**, not just reads. Separately, `pricingplan.md` and
`brandingsite/pricing.md` still describe ₹500 as a **one-time** activation fee with at-cost
top-ups; this document assumes ₹500 is **recurring**. Reconcile before publishing a price.

============================================================
## 15. SCALE SUMMARY
============================================================

```
Fixed floor        ~₹21,280/mo     (EAS ₹18,905 + Workers $5 + box $20 min)
1,000 users        ₹62,270/mo      ₹62.27/user     margin 87.5%
10,000 users       ₹4.31 L/mo      ₹43.12/user     margin 91.4%
1,00,000 users     ₹41.20 L/mo     ₹41.20/user     margin 91.8%
10,00,000 users    ₹4.10 Cr/mo     ₹41.01/user     margin 91.8%
1,00,00,000 users  ₹40.99 Cr/mo    ₹40.99/user     margin 91.8%
```

Per-user cost is **flat, not falling** — it scales 1:1 with users, and so does the price. The
₹100 ceiling is never breached: the standard user costs ₹40.99, leaving ₹59.01 of headroom
against a heavier mix. Margin floors at 87.5% (1K users, fixed-cost dominated) and settles at
91.8%. At a ₹500 price that clears the ₹400 / 80% rule at every size.

============================================================
## 16. MARKET — INDIA + SOUTH EAST ASIA
============================================================

The unit is one user: a person runs their personal workspace and their work inside TAR. Sizing
starts from the Indian Union population, then SEA. All figures est.

**Funnel**

| Stage | India | SEA |
|---|---|---|
| Population | 1.45 B | 700 M |
| Internet users | 900 M | 460 M |
| Work-capable adults | 550 M | 300 M |
| MSME + solopreneur workforce | 120 M (63 M MSMEs) | 150 M |
| **Digitally reachable, pay-capable (SAM)** | **40 M** | **30 M** |

Combined SAM ≈ **70 M users**.

**Affordability check (India)** — ₹500/mo = ₹6,000/yr ≈ **2.2% of per-capita income**. Affordable
for a business owner, tight for a general consumer. That is what the free personal workspace is
for: it costs ~₹0 (device-local SQLite, no sync) and it is the top of the funnel, not a loss.

**Revenue and margin — combined, blended ARPU ₹450**

| Users | % of SAM | Revenue ₹/mo | Cost ₹/mo | Margin ₹/mo | Margin % |
|---|---|---|---|---|---|
| 1,00,000 | 0.14% | ₹4.50 Cr | ₹41.20 L | ₹4.09 Cr | 90.8% |
| **10,00,000** | **1.4%** | **₹45.0 Cr** | **₹4.10 Cr** | **₹40.90 Cr** | **90.9%** |
| 25,00,000 | 3.6% | ₹112.5 Cr | ₹10.25 Cr | ₹102.25 Cr | 90.9% |
| **1,00,00,000** | **14%** | **₹450 Cr** | **₹40.99 Cr** | **₹409.01 Cr** | **90.9%** |
| 7,00,00,000 | 100% | ₹3,150 Cr | ₹286.93 Cr | ₹2,863.07 Cr | 90.9% |

```
Blended ARPU ₹450 with cost ₹40.99/user -> margin ₹409.01/user (90.9%).
India-only at ₹500: 1M users -> ₹50 Cr/mo revenue, ₹4.10 Cr cost, ₹45.90 Cr margin (91.8%).
The bottom row is the full combined SAM — an upper bound, not a forecast.
```

**Why SEA is the main target and India is the size test:** SEA has a younger, more mobile-first
SMB base and less entrenched software, so the same ₹100 stack sells from ₹400 in SEA-A to
₹1,805 in Singapore. India is where the population math must close — 40M pay-capable users at
₹500 is a ₹2,000 Cr/mo ceiling.

============================================================
## 17. GLOBAL PRICE GROUPS — ALL COUNTRIES
============================================================

Cost is global and flat: **₹40.99 / $0.4315 per user**, wherever the user is. Margin is purely a
function of the local price. Every country maps to one of five groups.

Price is set so a year of TAR costs **0.5–2.2% of per-capita income** — the same affordability
anchor as India (§16). No group is priced beyond what its general population can pay.

| Group | Countries | Representative markets | Price $/mo | Price ₹/mo | Cost ₹ | Margin ₹ | Margin % |
|---|---|---|---|---|---|---|---|
| **H1** Mature high income | ~45 | US, UK, DE, FR, IT, ES, JP, KR, SG, AU, CA, NL, Gulf, IL, NZ | 19 | 1,805 | 40.99 | 1,764.01 | 97.7% |
| **H2** Emerging high income | ~38 | PL, CZ, RO, BG, HR, HU, CL, UY, PA, RU, MU | 12 | 1,140 | 40.99 | 1,099.01 | 96.4% |
| **UM** Upper-middle income | ~54 | CN, BR, MX, AR, CO, PE, ZA, ID, TH, MY, TR, RS, KZ | 7 | 665 | 40.99 | 624.01 | 93.8% |
| **LM** Lower-middle income | ~54 | **IN**, PH, VN, EG, MA, NG, PK, BD, KE, LK, GH, NP, KH | 4 | 380 | 40.99 | 339.01 | 89.2% |
| **LI** Low income | ~26 | ET, UG, CD, MZ, AF, YE, SS, ML, RW, MW, NE, SO | 1.5 | 142.50 | 40.99 | 101.51 | 71.2% |
| **Total** | **~217** | | | | | | |

**Affordability** — annual price as a share of per-capita income:

| Group | GNI pc (est.) | Price ₹/yr | Share of income |
|---|---|---|---|
| H1 | ~$50,000 | ₹21,660 | 0.46% |
| H2 | ~$18,000 | ₹13,680 | 0.80% |
| UM | ~$6,500 | ₹7,980 | 1.29% |
| LM | ~$2,300 | ₹4,560 | 2.09% |
| LI | ~$900 | ₹1,710 | 2.00% |

**Envelope stress test** — the ₹100 worst case, not the ₹40.99 actual:

| Group | Price $/mo | Margin $ @₹40.99 cost | Margin $ @₹100 cost | Margin % @₹100 |
|---|---|---|---|---|
| H1 | 19 | 18.57 | 17.95 | 94.5% |
| H2 | 12 | 11.57 | 10.95 | 91.2% |
| UM | 7 | 6.57 | 5.95 | 85.0% |
| LM | 4 | 3.57 | 2.95 | 73.7% |
| LI | 1.5 | 1.07 | 0.45 | 29.8% |

Even if every user consumed the full ₹100, only **LI falls below the 80% floor**. LI is priced
as a loss-leader — it is 3% of SAM and India/SEA carry the margin.

**Revenue and margin at full SAM, by group**

| Group | SAM | Revenue ₹/mo | Cost ₹/mo | Margin ₹/mo | Margin % |
|---|---|---|---|---|---|
| H1 | 110 M | ₹19,855 Cr | ₹451 Cr | ₹19,404 Cr | 97.7% |
| H2 | 65 M | ₹7,410 Cr | ₹266 Cr | ₹7,144 Cr | 96.4% |
| UM | 95 M | ₹6,318 Cr | ₹389 Cr | ₹5,928 Cr | 93.8% |
| LM | 85 M | ₹3,230 Cr | ₹348 Cr | ₹2,882 Cr | 89.2% |
| LI | 12 M | ₹171 Cr | ₹49 Cr | ₹122 Cr | 71.3% |
| **Total** | **367 M** | **₹36,984 Cr/mo** | **₹1,504 Cr/mo** | **₹35,479 Cr/mo** | **95.9%** |

```
Blended global ARPU $10.61 (₹1,008) against a flat $0.4315 cost -> 95.9% margin at full SAM.
Revenue is bottom-heavy: H1+H2 are 48% of SAM but 74% of revenue.
The cost line is ₹1,504 Cr/mo — 4% of revenue. Price localization IS the margin strategy.
```

```
Rule: one stack, one cost, five prices. Never discount below the group price — route the user
to the free personal workspace instead. India ₹500 and SEA-A ₹400 are the floor of the ladder.
```

> **Local SQLite for reads. Turso for truth. Workers for the Gateway. Routed LLM for reasoning.
> browser-use for the web. Containers for what users wait on. box for what runs overnight.
> R2 for anything big. ₹100 cost, ₹500 price, ₹400 margin — at any scale.**
