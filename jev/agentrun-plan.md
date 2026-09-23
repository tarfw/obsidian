# AgentRun lessons for TAR

**Status:** historical proposal, 2026-09-22. This adds a workflow promotion method to [the TAR Jev study](tarjevplan.md); [tarv12.md](../tarv12.md) is the consolidated target. No Jev integration or TAR benchmark is claimed here.

## What the posts show

[AJ Asver's post](https://x.com/_aj/status/2102061534956662818) reports that AgentRun reduced the model cost of 100,000 compliance alerts from more than $290,000 with a frontier agent to less than $26,000. [Miguel Ríos Berríos's article](https://x.com/MiguelriosEN/status/2101029313906987422) gives the mechanism: start with an agent solving the full job, inspect traces and short reusable notes, compile frequent decisions into typed Jev questions and deterministic code, and escalate the unusual cases. The article reports $2.89 to $0.25 per alert on a 100-alert comparison, with about $0.003 of Jev calls per alert. These are author-reported figures for an AML workload, not TAR forecasts. Much of the saving came from *skipping research that could not change the result*, rather than Jev's unit price alone.

The article's separation maps cleanly to TAR: retrieval obtains evidence; Jev selects or judges supplied evidence; code applies policy; a model drafts text when needed; the gateway commits authorized effects. The workflow, SOP, question, model, and evidence versions must be recorded so a decision can be reconstructed and policy changes can be replayed.

## TAR adaptation

Use **offline workflow promotion**, not a production agent that rewrites its own live process. A capable agent may analyze representative completed cases and propose a recipe, questions, and code changes. Those proposals enter ordinary review, tests, held-out evaluation, and versioned rollout. A business event runs only a published version. Tenant-specific corrections never silently change another tenant's policy.

Start with **inbound enquiry triage and draft preparation** across Sites, channels, Inbox, CRM, and Sales. It is frequent, language-heavy, and can produce a reviewable draft before any external effect. The current channel command parser only recognizes fixed `done`, `start`, and `ready` commands; the action catalog and gateway offer the intended integration points. The existing `tarjevplan.md` already proposes support and Inbox routing. This pilot makes that proposal measurable end to end.

```text
incoming message
  -> scope and consent checks; exact IDs, aliases and text retrieval
  -> candidate contact, offering, owner, action and source spans
  -> Jev bundle: route, offering, existing-order relation, urgency, missing details
  -> code: validate candidates, policy, amounts, dates, versions and access
  -> Inbox item plus linked draft, or clarification/review
  -> gateway for any accepted write or send
```

An example: “Can you cater for 40 next Friday? We need vegetarian options.” Jev can select `sales` and the supplied catering offering, and choose which text span expresses headcount. Code parses the count, resolves the date against locale and current time, checks catalog and capacity, computes prices, and creates a draft task. A person reviews the quote and its source links before sending. Neither a high Jev probability nor a fluent draft establishes availability, consent, price, or permission.

## Build sequence

| Stage | Deliverable | Exit gate |
|---|---|---|
| 1. Observe | Capture a bounded set of real or consented historical enquiries, exact source snapshots, existing human decisions, time, correction, and cost. Record failed retrieval and missing data as first-class outcomes. | Repeated patterns and a deterministic baseline are visible; private content is access scoped. |
| 2. Specify | Write one reviewed SOP and a small question bundle. Derive admissible actions from the existing catalog. Implement candidate generation and source-span copying. | Correct candidate is present at a measured rate; no hidden or inaccessible option reaches Jev. |
| 3. Evaluate | Compare deterministic baseline, current generative approach if any, and Jev plus code on development and untouched held-out sets. Include mixed Indian languages, transliteration, noisy text, date ambiguity, no-match, near duplicates and adversarial instructions. | Predeclared route accuracy, accepted-case error, review burden, latency and full workflow cost improve over baseline. |
| 4. Shadow | Run the published question and policy version beside human triage. Store evidence, candidate IDs, question version, resolved model, distribution, outcome and reviewer correction. No automatic send or irreversible action. | Disagreement review identifies causes; thresholds are fitted per route and consequence. |
| 5. Assist | Show suggested owner, offering, missing facts and evidence-linked draft in Inbox. Human acceptance uses the existing gateway. | Less handling time and correction without extra missed enquiries or unauthorized effects. |
| 6. Automate narrow routes | Auto-create low-risk internal tasks only for evaluated, complete cases. Keep messages, merges, bookings, payments, refunds and publication behind their normal authority and approval. | Accepted-case error stays within the chosen limit across language and tenant slices; rollback and manual fallback work. |

## What to record and replay

For each assessment retain permitted source IDs and versions, candidate list, question and criteria version, resolved model, raw answer and distribution, policy version, selected route, later human correction, and actual token/cost/latency usage. Keep business history separate from private model traces and apply retention rules. New internal names should be one lowercase semantic word, for example `assessment.source`, `assessment.model`, `question.version`, and `trace.cost`; do not rename existing interfaces without migration.

Replay **code-only policy changes** over saved Jev answers when the evidence and question meaning are identical. A changed question, candidate list, source record, access scope, or model requires fresh inference. Count the cost of that re-inference. Compare whole completed cases after a node change, not only the changed question. Keep a held-out set that workflow authors do not tune against.

Prioritize **early stops and lazy evidence** only when code can prove that skipped evidence cannot change the business outcome. For example, an exact existing order ID can bypass broad order search; a clearly missing required date can route to clarification before catalog research. A probabilistic low relevance score alone must not discard a possible high-impact complaint. Record why each source was skipped.

## Architecture boundary

- Put the TypeSafe HTTP adapter, question compiler, validator, budget check, and trace hook in the existing server path. Keep credentials server-side.
- Use the existing action catalog for allowed actions and the gateway for effects. Jev selects from supplied candidates; it never obtains authority.
- Version recipes as code assets first. The current definition schema does not have an arbitrary question kind; add stored editable definitions only with an explicit schema migration and review model.
- Use a reasoning agent for research gaps, difficult evidence conflicts, and offline recipe authoring. Use a report generator only for prose based on a settled record. An operator may execute only through registered tools and gateway policy.
- Preserve unknown external outcomes for reconciliation before retrying. Jev evaluation may repeat after a crash; business effects must remain idempotent.

## Decision to make after the pilot

Expand this pattern to support, catalog matching, quote drafts, document extraction, and site submissions only if the first pilot improves **correct completed work per rupee and per minute**. Track candidate recall, accepted-case error, escalation rate, reviewer time, p50/p95 latency, and total cost including research, generation, retries, and human review. The 90% claim is a reason to test the method, not a target or budget assumption for TAR.

## Sources and limits

- [AJ Asver post](https://x.com/_aj/status/2102061534956662818) and [AgentRun article](https://x.com/MiguelriosEN/status/2101029313906987422), read 2026-09-22.
- TypeSafe provider contracts and guidance are listed in [sources.md](sources.md) and [jev.md](jev.md), checked 2026-09-21. The live documentation endpoint was unavailable during this review; recheck the API, model, price, and confidence pages before implementation.
- [TAR v12](../tarv12.md) defines the intended architecture and rollout; the [TAR Jev study](tarjevplan.md) records earlier research. Current integration points were checked in `tarharness/src/channels/commands.ts`, `tarharness/src/registry/catalog.ts`, and `tarharness/src/gateway/actions.ts`.
