# TAR Agentic System — Plan v1

**Flue harness · one worker · zero Durable Objects · KV + Turso + cron durability**

## 1. Architecture

```
             ┌──────────────── taragent (one CF Worker) ────────────────┐
 tarapp ───► │  Tar (workspace) ─dispatch─► Site Sales Marketing       │
 channels ─► │  Tar (personal)              Support Ops Finance        │
 site ─────► │                               Team Analyst Sandbox      │
             │  Flue: agent fns · tools · skills · channels · sandbox  │
             ├─────────────────────────────────────────────────────────┤
             │ S3=OKF(how) · Turso=matter/motion(what) · KV=cache · D1 │
             └───────────────┬─────────────────────────────────────────┘
                             │ every minute
                      cron scanner ─► due routines · chores · job resume
```

**Doctrine:** LLM=brain · tools=hands · OKF=memory · Turso=truth. Agents hold no creds; all writes via taragent.

## 2. Decisions

| Decision | Choice | Why |
|---|---|---|
| Framework | Flue (`@flue/runtime`, already a dep) — harness only | Native tool-calling, skills, channels, sandbox |
| Durability | No DOs — KV checkpoints + Turso logs + minute cron | Workers bill CPU only; DOs bill wall-clock, 30s min/wake |
| Topology | One worker; agents are modules | One deploy, one auth boundary, shared OKF/Turso |
| Cleanup | Retire `siteagent` worker + unused `agents` dep | Pipeline lives in `src/site/`; Agents SDK needs DOs |

`wrangler.jsonc` gains no new bindings. P0 spike: stateless Flue loop on Workers (fallback: our loop + Flue tools/channels). Main model: `groq/qwen3.6-27b`.

## 3. Naming

| Thing | Name |
|---|---|
| Platform / worker | TAR / `taragent` (keep) |
| Main agent | **Tar** — "Talk to Tar" (alt: Munim) |
| Subagents | Job titles: Sales Agent, Site Agent… |
| Micro-agents | Chores |

## 4. Agents

**Tier 1 — main (only agents humans address)**

| Agent | Scope | Via | Owns | Phase |
|---|---|---|---|---|
| Tar workspace | `w:` | chat/voice/channels/`@tar` | Delegation · briefing · canvas · approvals | P0 (from "master") |
| Tar personal | `u:` | DM on paired channel | Agenda · their inbox · tasks | P1 (routing exists) |

**Tier 2 — subagents (dispatched by Tar)**

| Agent | Faces | Trigger | Owns | Phase |
|---|---|---|---|---|
| Site | Owner | dispatch / Studio | siteagent v6.1 pipeline | P2 (exists) |
| Sales | Customers | storefront · WhatsApp · cron | Facts-only answers · quotes · deals · cart recovery | P2 |
| Marketing | Owner | crons / dispatch | Leads · re-engagement · listings · SEO | P2 |
| Support | Customers | site contact / channels | FAQ answers · learn → propose `wiki/faqs/*` | P3 |
| Ops | Staff | stock/booking events | Reorders · booking conflicts · delivery | P3 |
| Analyst | Owner | crons + user routines | Reports · anomalies · forecasts | P3 |
| Sandbox | Agents | dispatch | Code + browser execution (§6) | P3 |
| Finance | Owner | expense events | Invoices · payment reminders · GST | P4 |
| Intake | Staff | doc upload | OCR (Sandbox) → matter/motion | P4 |
| Team | Owner | roster / shift cron | Roster · shifts · clock-in digests | P4 |

**Tier 3 — Chores (cron → approval inbox)**

| Chore | Trigger | Approval |
|---|---|---|
| Cart recovery · review request | event | first N → auto |
| Win-back · low-stock reorder | cron | always |
| Forecast · price-watch · compliance | cron | none (advisory) |

Approvals bump `action_memory.usageCount` → safe chores graduate to auto.

## 5. Channels

| Channel | Who → Reaches |
|---|---|
| Tg / Slack / Discord / GChat DM | member → personal Tar (pairing exists) |
| Shared workspace channel | anyone → subagent via `@tar sales …` |
| WhatsApp (new, Flue) | customer → Sales/Support · owner → Tar |
| Storefront widget (new) | customer → Sales/Support |
| tarapp | owner → workspace Tar (GenUI canvas) |
| Email (new, Resend) | outbound only, approval-gated |

**Rule:** person → role-scoped personal Tar (`people/roles.md`); customer → facts-only Sales/Support. Only the owner reaches the full workspace Tar.

## 6. Sandbox

| Backend | For |
|---|---|
| Flue Sandbox API | Code: report scripts · CSV/PDF · OCR · data imports |
| ASCII Box ($20/mo ≈ 555 VM-h, Chrome+Docker) | Browser: GBP · listing sync · price-watch · E2E of own storefronts |

Payload in → artifacts out (R2) · zero platform creds · taragent writes all DB · per-run budget · egress allowlist · outbound → approval gate.

## 7. Example — "sales + stock report every morning"

```
ask  ─► Tar: intent = daily · 2 reports
      ─► one memory row  stream='routine'  meta={reports, 09:00+tz, channel, next_run_at: 9:00+jitter}
cron ─► scan next_run_at<=now LIMIT batch   (1 indexed read/tick; jitter+fan-out absorb 9:00 herd)
run  ─► SQL: motion sales · matter low-stock ─► LLM narrates, never computes
send ─► requesting channel · report_sent→motion (idem) · next_run_at += 1d
edit ─► "also refunds" / "stop" patches the row · corrections train memory
miss ─► overdue row caught next tick ("as of"); zero sales → honest empty report
```

## 8. Cost

**8.1 Scheduling: cron vs DO** (1M ws × 1 routine/day = 30M runs/mo)

| | Cron + scanner | DO alarms |
|---|---|---|
| Scheduler | $0.01 + $2 CPU flat | $4.50 requests |
| Execution | $9 + $450–2.2k (CPU-only, I/O free) | ≥$1,440 floor (30s wall min/wake; LLM wait billed) |
| Storage | — (Turso already paid) | + SQLite storage & $1/M rows (Jan 2026) |
| **Total** | **≈ $0.5–2.2k** | **≥ $1.45k, worse in practice** |

**8.2 Units**

| Action | Est. cost |
|---|---|
| Report / chat turn (qwen3.6-27b) | ~$0.0002–0.0005 |
| Site gen → edit (render-cache hit) | ~$0.008 → ~$0.001 |
| Browser job, 10 min (ASCII Box) | ~$0.006 |
| Cron scanner | $2/mo flat, any scale |

**8.3 Scale (monthly; per ws: 30 reports + 20 chats)**

| Workspaces | 1k | 10k | 100k | 1M |
|---|---|---|---|---|
| Infra (Workers+KV+cron) | <$5 | ~$20 | ~$200 | ~$1–3k |
| Turso | ~$0 | ~$25 | ~$250 | ~$2.5k |
| LLM (dominant) | ~$25 | ~$250 | ~$2.5k | ~$15–25k |
| **Per workspace** | $0.03 | $0.03 | $0.03 | $0.02–0.03 |

vs ₹499/mo (~$6) → **~99% unit margin**. LLM is the cost driver — never scheduling.

## 9. Phases

| P | Work | Days |
|---|---|---|
| 0 | Flue foundation: main agent fn · transcripts→Turso · `/agents/tar/:id` alias · OKF skills as Flue skills · stateless spike · drop `agents` dep · rebrand | 2 |
| 1 | Channel mesh: personal Tar per member · `@tar` dispatch · agenda cron | 3 |
| 2 | Revenue: Sales (storefront + WhatsApp closer + cart chore) · Marketing | 4–5 |
| 3 | Support FAQ loop · Sandbox (Flue + ASCII Box) · routines + jittered scanner · Analyst · Ops | 4 |
| 4 | Back office: Finance · Intake OCR · Team · chore/approval harness · retire `siteagent` worker | 3 |

First value: P2 (~1.5 wk). Total ~2.5–3 wk.

## 10. Acceptance

- [ ] Zero DO/Queue bindings; routines/jobs survive restarts via KV/Turso + cron
- [ ] §7 works live: subscribe → daily delivery → NL edit → stop
- [ ] 10k seeded routines on schedule (jitter + fan-out, no hour-lag)
- [ ] Owner one door · members personal Tar · customers facts-only Sales/Support
- [ ] 4 networks on Flue adapters + WhatsApp/email; no JSON-parse chat path
- [ ] OKF writes = proposed diffs · sandbox zero creds · one `wrangler deploy` · tarapp = `TAR_URL` only
