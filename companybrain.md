# Company Brain Manual

> Condensed from Slite's *The Ontology of the Company Brain* ebook (slite.com/ebooks/company-brain) + its public research base (slite.com/learn/company-brain, slite.com/learn/company-brain-survey-findings).

---

## 1. What It Is

| | |
|---|---|
| Definition | A **persistent context layer** — gathers knowledge from wherever a company creates it; makes it usable by **people and AI agents** |
| Category age | < 6 months old (as of ebook) |
| It is NOT | enterprise search · a chatbot bolted onto a wiki |
| Real job | Capture the **"why"** behind decisions, not just fetch documents |
| Related concept | Context engineering = assembling that context for a model |

**Why now:** People work around missing context (ask the person next to you). **Agents can't** — they only know what you hand them and forget between sessions. Context sprawl went from *nuisance → dependency*.

**Problems it solves:** info scatters · institutional memory walks out with people · docs go stale unnoticed.

**Build prerequisites (when it qualifies as a Company Brain):** context must be shared, permissioned, maintained, and trusted by other people or Agents.

---

## 2. Origins Timeline

| When | Who/What | Point |
|---|---|---|
| Pre-2020s | Second brain — **Tiago Forte** | Personal capture; "see your own mind from the outside" |
| Late 2010s | **Enterprise search** | Made scattered info findable; never maintained an actionable model |
| Dec 22, 2025 | **Foundation Capital** (its partners) — "Context Graphs: AI's trillion-dollar opportunity" | Systems hold one piece of a project each; none capture *why* decisions happened (the watercooler/Slack context AI can't fetch) |
| April 2026 | **Andrej Karpathy** — LLM wiki | Persistent layer between raw sources & retrieval; model continuously synthesizes interlinked pages; works at any scale |
| Then | **Garry Tan** — GBrain (open-source) | Feeds his own agents (meetings, emails); ingests/consolidates continuously; later extended to company use |
| Summer 2026 | **YC RFS** — Tom Blomfield, "Company Brain" | "Garry's G-Brain, but for every business in the world"; declared it a **new category** needing dedicated effort |

**4 threads converged:** personal memory (ambition) + enterprise knowledge (scale/problems) + decision context (what's worth storing) + **agents (the consumer)** → must be machine-readable and current, not merely searchable.

---

## 3. Personal vs Company Brain

| Dimension | Personal brain | Company Brain |
|---|---|---|
| Owned by | One person | Team/company |
| Contains | Notes, reading, ideas, emails | Docs, conversations, meetings, projects, customer data, tools |
| Helps with | Recall, synthesis, self-understanding | Shared work, onboarding, decisions, automation |
| Who decides truth | You | Multiple owners & sources |
| Who accesses | Usually only you | Employees & Agents (different permissions) |
| Maintains it | Your habits | Company rules, owners, automated systems |
| When wrong | Bad answer for you | Can break an entire workflow |
| Matters most | Personal usefulness | Accuracy, access, governance, trust |

**Rule:** mistake only inconveniences you → personal. Context must be shared/permissioned/maintained/trusted → Company Brain.

---

## 4. Which One to Choose

| Scenario | Choice |
|---|---|
| Memory is yours | Personal tool (Supermemory, GBrain) |
| Small, close-knit team, someone technical | Open source (≈10-person startup; breaks down when customer data / access levels enter — OSS **transfers** security+maintenance work to you) |
| Different access levels · disagreeing sources · sensitive data · agents that can take actions · must stay current without a founder | Managed brain (e.g. Slite / Slite Agent) |

Start from: **where the context needs to travel.**

---

## 5. Survey Data (149 teams, July 2026; interviews with 10–12 builders)

**Respondents (AI-forward):** 49% tech/SaaS · 69% use Claude Code/Codex-level tooling · 43% at 50+ person companies.

**Adoption:** aware **70%** (¼ learned it on tech Twitter) · works **19.6%** (ceiling) · want one **41%** · tried & gave up **24%** · not allowed **15%**.

**Adoption fears:** Accuracy **77%** > Privacy **59%** > Cost **58%** > Maintenance **57%** (privacy flat across company sizes).

**Trust signals for docs:** named human owner **78%** · live source-of-truth link **63%** · recency **56%** · never fully trust **18%**.

**Where knowledge lives (86% have a KB anyway):** Slack/Teams **56%** · shared drives **65%** · email chains **22%** · chat leakage ~50–65% at every size; bigger companies *stack* systems, don't consolidate.

---

## 6. Key Findings

1. **Awareness ≠ adoption** — 70% vs <20% working; treat 19.6% as an ambitious ceiling.
2. **DIY brains die of maintenance** — 55% abandoned; failure *rises* with AI fluency (**71%** for advanced-agent teams vs **15%** basic users) because ambitious builds hold more context; cost is unquantified ("no idea").
3. **50+ people flips the problem** — below 50: keeping docs alive (**42%**), ~⅓ DIY dies. Above 50: undocumented **tribal knowledge** #1 (**42%** vs 21%), restricted from building 5x more (**29%** vs 6%). Small teams break on maintenance; large teams break on compliance/procurement. A brain = most complete, portable copy of the company ever assembled → **context sovereignty**.
4. **Trust is human, not AI** — when faking docs costs nothing, people want a verified human owner.
5. **Capture must move into work** — nobody documents chat retroactively; brains must tap messages where they happen (ebook ch. 7: *Capture at the place of work*).

---

## 7. Action Guide

| Team | Enemy | Fix |
|---|---|---|
| < 50 people | Upkeep | Don't build a hand-fed brain |
| > 50 people | Undocumented tribal knowledge + approval chain | Sell context sovereignty to security review |

**Universal design requirement:** answers need a **human-verifiable trail** ("Verified by" — the one signal 78% trust).

**Closing:** awareness 70%, adoption <20%, gap closing from both ends — tools automating upkeep + teams learning "a brain nobody feeds starves on schedule."

---

## 8. FAQ

| Q | A |
|---|---|
| What is a company brain? | Everything a company knows (docs, heads, tools) → answers/context for people & agents |
| How many have one? | 19.6% work · 41% want · 24% tried & quit · 15% restricted (July 2026, 149 teams) |
| Why do DIY builds fail? | Maintenance — 55% quit; burden scales with context held |
| Biggest concern? | Accuracy 77% (privacy 59%, cost 58%, maintenance 57%) |
| What builds trust? | Named human owner 78% · live source of truth 63% · recency 56% · 18% never trust docs |

---

## 9. Source Page Facts (Slite ebook landing)

- Ebook: **Company Brain 101 — "The Ontology of the Company Brain"** · cover image CDN · 6 languages (EN/FR/ES/DE/NL/JA) · meta: "How leading teams turn scattered knowledge into a company brain."
- Chapters: ① What is it & what should it do? ② Four technical components of every Company Brain ③ Build or buy? (it depends) ④ What every builder agrees on — and none can answer.
- **Gated** behind form: first name, last name, work email, company website, privacy consent, updates opt-in → "Get access."
- Ratings: 4.7/5 G2 · 4.7/5 Capterra · 4.9/5 ProductHunt · "The self-maintaining knowledge base."

---

## 10. Sources

- Ebook (gated, full chapters incl. four technical components, build-vs-buy detail, interviews): slite.com/ebooks/company-brain — access via the lead form or Slite demo.
- Guide: slite.com/learn/company-brain
- Survey findings: slite.com/learn/company-brain-survey-findings
