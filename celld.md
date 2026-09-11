# celld vs Turso — Cost Comparison

## What is celld?

Self-hosted, distributed **Durable Objects** by Deno Land.

- `celld = V8 + S3 + SQLite + LTX + Tokio`
- Each object is a **cell**: a named server with its own SQLite database
- Long-term state stored in your own S3-compatible bucket (AWS S3, GCS, Azure Blob, Railway Buckets)
- No membership protocol, no failure detector, no consensus service
- Ownership claimed via atomic bucket write (compare-and-swap lease)
- Deploy from existing `wrangler.json` configs
- GitHub: github.com/denoland/celld (4.5k stars)
- Site: celld.dev
- License: Apache-2.0

---

## Turso Pricing (2026)

| Plan | Monthly | Storage | Row Reads | Row Writes | Active DBs |
|---|---|---|---|---|---|
| **Free** | $0 | 5 GB | 500M | 10M | 100 |
| **Developer** | $4.99 | 9 GB (+$0.75/GB) | 2.5B (+$1/B) | 25M (+$1/M) | 500 (+$0.20/ea) |
| **Scaler** | $24.92 | 24 GB (+$0.50/GB) | 100B (+$0.80/B) | 100M (+$0.80/M) | 2,500 (+$0.05/ea) |
| **Pro** | $416.58 | 50 GB (+$0.45/GB) | 250B (+$0.75/B) | 250M (+$0.75/M) | 10,000 (+$0.025/ea) |
| **Enterprise** | Custom | Custom | Custom | Custom | Unlimited |

**Cost drivers:** row reads, row writes, storage, active databases. Idle DBs cost only storage.

---

## celld Cost Model (Railway Buckets + VPS)

Railway Buckets pricing:
- Storage: $0.015/GB/mo
- S3 API operations: **FREE (unlimited)**
- Egress: **FREE (unlimited)**

Compute: VPS or any Linux host running the `celld` daemon.

---

## Side-by-Side: Small to Mid Workloads

| Scenario | Turso | celld |
|---|---|---|
| **Hobby (5GB, 100M reads/mo)** | Free | ~$1/mo (S3 only, no VM) |
| **Small app (20GB, 5B reads, 50M writes)** | ~$30/mo (Scaler) | ~$5–15/mo (S3 + cheap VPS) |
| **Medium (100GB, 50B reads, 200M writes)** | ~$100–200/mo | ~$25–50/mo (S3 + 2-node fleet) |
| **Large (500GB, 200B reads, 1B writes)** | ~$500+/mo (Pro) | ~$100–200/mo (S3 + multi-node) |
| **Multi-tenant (10k idle DBs, 5GB each)** | 50GB storage only ~$25/mo | 50GB S3 = ~$1.15/mo |

---

## Shopify-Scale Cost Comparison (Complete Platform)

### Real Shopify Scale Numbers (BFCM 2025)

| Metric | Value |
|---|---|
| Live stores | 3,000,000 |
| Database queries (BFCM) | 14.8 trillion |
| Database writes (BFCM) | 1.75 trillion |
| Peak QPS | 20 million |
| Data processed | 90 petabytes |
| Storage | 1.4 petabytes |

### Modeling Assumptions

Per-tenant (store) SQLite database:

| Per-Store Data | Size |
|---|---|
| Store config / metadata | 5 MB |
| Products (100 avg) | 10 MB |
| Orders (1,000/mo avg) | 20 MB |
| Sessions / cart | 5 MB |
| **Total per store** | **~40 MB** |

Aggregate monthly usage:

| Stores | Storage | Row Reads | Row Writes | Active DBs |
|---|---|---|---|---|
| 100K | 4 TB | 15T | 175B | 60K |
| 1M | 40 TB | 50T | 580B | 600K |
| 3M | 120 TB | 150T | 1.75T | 1.8M |

---

### TURSO COST (Full Shopify Scale)

#### 100K Stores

| Component | Calculation | Cost |
|---|---|---|
| Base (Pro plan) | | $416.58 |
| Row reads (15T) | (15T - 250B) x $0.75/B | $11,062 |
| Row writes (175B) | (175B - 250M) x $0.75/M | $131,006 |
| Storage (4 TB) | (4TB - 50GB) x $0.45/GB | $1,777 |
| Active DBs (60K) | (60K - 10K) x $0.025 | $1,250 |
| **Total** | | **~$145,511/mo** |

#### 1M Stores

| Component | Calculation | Cost |
|---|---|---|
| Base (Enterprise) | Custom | ~$2,000 |
| Row reads (50T) | 50T x $0.75/B | $37,500 |
| Row writes (580B) | 580B x $0.75/M | $435,000 |
| Storage (40 TB) | 40TB x $0.45/GB | $18,432 |
| Active DBs (600K) | Custom | ~$15,000 |
| **Total** | | **~$507,932/mo** |

#### 3M Stores

| Component | Calculation | Cost |
|---|---|---|
| Base (Enterprise) | Custom | ~$5,000 |
| Row reads (150T) | 150T x $0.75/B | $112,500 |
| Row writes (1.75T) | 1.75T x $0.75/M | $1,312,500 |
| Storage (120 TB) | 120TB x $0.45/GB | $55,296 |
| Active DBs (1.8M) | Custom | ~$45,000 |
| **Total** | | **~$1,530,296/mo** |

---

### CELLD COST (Railway Buckets + VPS Fleet)

#### Compute (VPS nodes running celld)

| Fleet Size | Spec | Cost/Node | Total |
|---|---|---|---|
| 100K stores | 10 nodes x 2 vCPU / 4GB | $20/mo | $200 |
| 1M stores | 50 nodes x 4 vCPU / 8GB | $60/mo | $3,000 |
| 3M stores | 150 nodes x 4 vCPU / 8GB | $60/mo | $9,000 |

#### Storage (Railway Buckets)

| Stores | Storage | Cost |
|---|---|---|
| 100K | 4 TB | $60/mo |
| 1M | 40 TB | $600/mo |
| 3M | 120 TB | $1,800/mo |

#### LTX WAL Replication Traffic

| Stores | Write Volume | Egress |
|---|---|---|
| 100K | ~500 GB/mo | $0 (free) |
| 1M | ~5 TB/mo | $0 (free) |
| 3M | ~15 TB/mo | $0 (free) |

#### celld Total

| Stores | Compute | Storage | Total |
|---|---|---|---|
| **100K** | $200 | $60 | **$260/mo** |
| **1M** | $3,000 | $600 | **$3,600/mo** |
| **3M** | $9,000 | $1,800 | **$10,800/mo** |

---

## HEAD-TO-HEAD COMPARISON

| Stores | Turso | celld | Savings | Ratio |
|---|---|---|---|---|
| **100K** | $145,511 | $260 | $145,251 | **559x cheaper** |
| **1M** | $507,932 | $3,600 | $504,332 | **141x cheaper** |
| **3M** | $1,530,296 | $10,800 | $1,519,496 | **142x cheaper** |

---

## WHY THE GAP IS SO MASSIVE

**Turso's fatal flaw at scale: per-row billing**

```
1.75 trillion writes x $0.75/million = $1,312,500/month
       |
   This one line costs more than entire celld infrastructure
```

**celld's advantage: flat-rate storage + free operations**

```
120 TB x $0.015/GB = $1,800/month
Operations: $0
Egress: $0
```

---

## BREAK-EVEN POINT

| Factor | Turso wins when... | celld wins when... |
|---|---|---|
| Stores | < 100 | > 100 |
| Row reads | < 500B/mo | > 500B/mo |
| Row writes | < 50M/mo | > 50M/mo |
| Idle databases | < 1,000 | > 1,000 |

**For a Shopify-scale system: celld is 100-550x cheaper.**

---

## TRADE-OFFS

| Factor | Turso | celld |
|---|---|---|
| **Zero-ops** | Yes | No — you manage VMs, S3, fleet |
| **Scaling** | Automatic | Manual (add nodes) |
| **Edge replication** | Built-in | DIY (bucket-based) |
| **Durable Objects** | No | Yes (core feature) |
| **KV, Queues, D1, R2, Workflows** | No (DB only) | Yes (Workers platform) |
| **Cost at scale** | Expensive (per-row billing) | Cheap (S3 is flat-rate) |
| **Vendor lock-in** | Moderate (libSQL) | Low (S3-compatible, open-source) |

---

## RECOMMENDED MIGRATION PATH

| Stage | Platform | Cost | Notes |
|---|---|---|---|
| MVP (100 stores) | Turso Free | $0 | Speed to market |
| Launch (1K stores) | Turso Developer | $5-50 | Easy setup |
| Growth (10K stores) | Turso Scaler | $25-200 | Still manageable |
| Scale (100K stores) | celld | $260 | Migrate SQLite files to S3 |
| Enterprise (1M+) | celld fleet | $3,600+ | 100x+ cheaper than Turso |

**Migration trigger:** When writes exceed ~100M/month or stores exceed ~50K, migrate to celld. The path is SQLite file → S3 bucket, which is straightforward.

---

## INSTALL CELLD

```bash
curl -fsSL https://celld.dev/install.sh | sh
```

**Docker:**
```bash
docker run --rm ghcr.io/denoland/celld --version
```

**Local dev:**
```bash
celld dev
```

**Deploy:**
```bash
celld deploy . --bucket s3://my-cells-bucket
```

---

## LINKS

- GitHub: github.com/denoland/celld
- Site: celld.dev
- Railway Buckets: docs.railway.com/storage-buckets
- Turso Pricing: turso.tech/pricing
