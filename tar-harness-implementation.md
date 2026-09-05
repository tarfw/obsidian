# TAR Harness Implementation

Engineering reference for [TAR Harness](tar-harness.md). The architecture document owns the three-concept model; this file owns execution mechanics, storage, interfaces, billing and build structure.

## 1. Action runtime

### Types and contract

| Type | Control |
|---|---|
| App | Deterministic code or approved connector. |
| Agent | Validated output or allowlisted choices within a budget. |
| Human | Create/reuse Task; wait for an authorised response. |

~~~text
Contract   = ID/version + type + input/output schemas + reads/effects
           + roles/approval + idempotency + timeout/retry + cost/audit
Occurrence = ID + Action/version + input bindings + outcome routes
Run states = ready | running | waiting | completed | failed | cancelled
~~~

### Mandatory execution

**Gateway is the mandatory internal validation stage of every Action, committing official changes when needed. TAR enforces it inside the application; builders cannot add, remove or skip it.**

~~~text
Trigger -> Run -> Action [Gateway checks -> execute -> validate result -> commit]
                     -> saved result -> next Action

External effect: committed Outbox intent -> worker/provider -> saved delivery result
~~~

| Boundary | Rule |
|---|---|
| Checks | Identity, membership, scope, input/output schemas, Record versions and required approval. |
| Reads and direct edits | Same checks outside Flows; reads need no business mutation, Run or Outbox. |
| Commit | Workspace changes + Run progress + audit + Outbox intent: one transaction. |
| Approval | Bind Action, inputs, target and Record versions; reapprove changed inputs when required. |
| Idempotency | Scoped workspace/operation key + input fingerprint; reject mismatches. Replay saved results without effects or charges. |
| Delivery | Recheck authority/approval before sending; save confirmed success before dependent Actions. |
| Pending | Outbox acceptance is not delivery; reconcile external and D1 effects outside the workspace transaction. |
| Uncertain delivery | Use provider idempotency where available; reconcile or request review before resending. No exactly-once promise. |

### Recovery

| Situation | Required behaviour |
|---|---|
| Normal work | Linear sequence; branch only when needed. Reuse Actions. |
| Waiting | Save resume condition + deadline/reminder policy. |
| Failure | Bounded safe retries with backoff; then visible Human work or failure. |
| Concurrent workers | Lease + version check; advance each occurrence once. |
| Human response | Save decision + complete Task + resume Run atomically; reject stale duplicates. |
| Definition edit | Pin Run versions; new publications affect new Runs. Explicit migration for active Runs. |
| Schedule | One Run and stable deduplication key per occurrence. |
| Cancellation | Stop new work; compensate committed effects separately when needed. |

### Agent Action rules

| Agent rule | Contract |
|---|---|
| Context | Goal + permitted data + allowed Actions + time/cost limits. |
| Access | Check before context assembly and every Record/file/Channel read. |
| Authority | No direct commits, unrestricted SQL, credentials or arbitrary recipients. |
| Trace | Choices, result references, time, cost, errors; no private model reasoning. |
| Memory | Records + Interactions + Runs + audit Events. |
| Implementation | Models, MCP, skills, sandboxes, subagents; no extra builder layers. |

### Adapters

| Part | Rule |
|---|---|
| Channel / connector | Adapter behind Actions and incoming triggers; install as needed. |
| Incoming event | Verify, persist and deduplicate before acknowledgement; resolve identity, then start/resume Run. Retry processing safely. |
| Identity | Authorised sender/recipient only; unknown identities create triage work. Duplicate receipts reuse the Interaction. |
| Outgoing result | Update the related Interaction after delivery. |
| Providers | TAR chat: Worker API. Social: Zernio. Email/SMS/calendar/voice: approved adapters. |

### Interfaces

~~~text
Interface  = approved key + schema + fixed component
Submission = Action/occurrence + inputs + base versions + operation key
           + Run ID when applicable
~~~

- TarApp/Web render the fixed components.
- Temporary UI state stays local; sensitive/external submissions require confirmation per policy.

### Cost

~~~text
Monthly = 100 credits per active owned work workspace
Usage   = chargeable registered Action executions
Total   = monthly + usage
~~~

- Declare costs and retry charging before publication; preview consequential costs and enforce budgets.
- Actual repeated attempts follow declared charging rules.

## 2. Storage

| Store | Contents |
|---|---|
| D1 | Users, workspaces, membership, Google identity and routing. |
| Turso | One database per workspace: definitions, records, links, runs, events. |
| R2 | Files, media, exports, large payloads and archives. |
| Secrets Store | Secret values; databases keep references. |
| Queue + due-work scan | Work-ID wakeups; scan missed wakeups and expired leases. Database owns durable work. |
| OKF | Optional long knowledge/specifications. |

**Logical fields; migrations must add constraints, indexes, stable IDs and timestamps.**

~~~text
users       = identity + profile + state
workspaces  = owner + mode + database + sequence + state + settings
members     = user/invite + workspace + role + lifecycle

definitions = kind + code + version + state + JSON
records     = type + title + state + data + source/external + owner/assignee
            + version + archived
links       = source + target + relation + data + archived
runs        = pinned definition/version + record + state + occurrence
            + context + due + retry + version + lease
events      = kind + run/occurrence/record + actor/target + key/fingerprint
            + result/payload reference + state + due + attempts + lease
~~~

| Storage rule | Requirement |
|---|---|
| Record kinds | Approvals, channel identities and Document metadata. |
| Routing | Personal/work modes; stable identity-based names: googleuser, googleuser-w1, etc. |
| Indexes | Work: state/due. Tasks: assignee/state. Events: Run/time. |
| Uniqueness | Scoped operation keys and provider receipt keys. |
| Events | Audit immutable; pending work mutable; finished entries immutable. |
| Outbox | Pending delivery Events; transitions append audit entries. |
| Archives | Routine payloads: 90 days. Preserve required audit and deduplication retention. |

### Offline and membership

- **Online first.** Later: encrypted cache + pending commands.
- **Offline edits:** drafts until Gateway acceptance; base-version conflicts require resolution.
- **Online-only:** payments, inventory, approvals, access, lifecycle changes.
- **Cloud-only:** audit, Outbox, secrets.
- **Membership:** invite -> accept -> approve -> provision.
- **Offboarding:** revoke server access now; clear local data when reachable; retain audit.

## 3. Build order

1. **Foundation:** Records + access + Gateway + idempotency + audit.
2. **Complete Flow:** request -> Record -> Inbox Task -> approved reply -> completion.
3. **Recovery:** duplicates, crashes, timeouts, revocation, missed wakeups, uncertain delivery.
4. **AI:** one bounded Agent Action + Human fallback.
5. **Expand:** domains, Channels, Kits, offline and advanced capabilities as needed.

~~~text
tar-harness/
|-- migrations/
|-- src/
|   |-- index.ts       # HTTP, queue, scheduled entry points
|   |-- gateway/
|   |-- actions/       # registry, implementations, interface contracts
|   |-- flows/
|   |-- channels/      # adapters for triggers and communication Actions
|   |-- jobs/          # Outbox, retry, recovery
|   |-- agents/
|   `-- db/
`-- test/
~~~

**Release gate:** verify the mandatory execution and recovery rules before expanding.
