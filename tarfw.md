# TAR — Final Concept

The whole system in one line:

```text
Field* → Action → { Tool.launch | Flow.step } → Run → Event
           (atom)    (launch it)     (order it)     (instance it)
```

## Primitive

```text
Tool  T := ( In → Out, E, R, ρ )
```

| Symbol | Name | Meaning | Example |
| --- | --- | --- | --- |
| `In` | Input | typed fields it accepts | `variant, quantity, reason` |
| `Out` | Output | typed keys it returns | `stock, movement` |
| `E` | Effects | what it may change (write-set) | `stock_commit`, `ledger_post` |
| `R` | Roles | who may run it | `owner, admin` |
| `ρ` | Reach | risk class | `none / data / customer / money` |

Read as: *takes `In`, gives `Out`, changes only `E`, only for `R`, at risk `ρ`.*

- `In → Out` is the mapping. `E, R, ρ` are its guards.
- `ρ` says how dangerous the effect is, independent of who runs it. Roles say *who may*; reach says *what's at stake*.

## Everything is a Tool

| Concept | Plain meaning | Formula |
| --- | --- | --- |
| Tool | one job | `T` |
| Step | a tool placed in a list | `T @ position i` |
| Flow | several tools in order | `Tₙ ∘ … ∘ T₁` |
| Run | the flow actually run | `F(x)` |
| Tile | the button that opens a tool | `entry(T)` |
| Effect | what the tool may change | `E(T)` |

Kinds:

```text
Tool.kind = Atomic | Compound | Channel | Human | Site
Atomic   – one job
Compound – a flow (tools chained)   ← a flow is just a bigger tool
Channel  – sends a message
Human    – a person does it
Site     – the public shop
```

Two lists, merged only at the surface:

```text
Atomic tools   → canonicalTools     (18 tiles: pos, item, order, ...)
Compound tools → definitions kind='flow'   (each workspace's flows)
Canvas         = atomic tool cards  +  flow cards
```

The tile named **Checklist** (`flow`) is the door to the compound list.

## Composition algebra

```text
∘ : Tool × Tool → Tool
(T₂ ∘ T₁)(x) = T₂(T₁(x))
ε(x) = x                     identity (no-op)

Step  sᵢ := Tᵢ ↾ i
Flow  F  := [Step]                  1 ≤ |Step| ≤ 20
Step  s  := ( action: Action.id ∈ bookActions, auto?, input? )
Run   R  := Flow @ occurrence       occurrence = idempotency key
```

## Laws

```text
A1  contract before run        every Tool declares T.K first
A2  authorization             exec(T) ⟺ role(actor) ∈ R ∧ effects granted
A3  idempotency               T(k,x)∘T(k,x) = T(k,x)
A4  effect-bound              commit writes exactly E(T), nothing else
A5  risk-gate                 ρ ∈ {money, customer} ⟹ confirm(owner)
A6  per-step atomic           each Step commits alone; a flow ≠ one transaction
A7  allowlisted composition   F.steps ⊆ bookActions (8 ids)
A8  deterministic selection   select() = filter(...), never a choice
```

## Model = oracle, outside the algebra

```text
judge : In → Score        not a Tool; not in the In→Out path
F = Tₙ ∘ … ∘ T₁            the model may order/rank, never invoke
```

AI agents vs TAR tools:

| Axis | AI agent tool | TAR tool |
| --- | --- | --- |
| Nature | function the model can call | UI launcher tile |
| Who calls it | model, at runtime | code → launches one Action |
| Definition | name + loose JSON schema | `{id, kind, reach, module, launch}` |
| I/O | free-form → free-form | none itself; the Action holds it |
| Selection | LLM router | deterministic filter |
| Grant | none | per-member access / `canExecute` |
| Safety | none | `reach`: money/customer ⇒ confirm |

Core difference: agent = *model decides, tools execute*. TAR = *code decides, model only judges*.

## Tardigrade comparison

Tardigrade: TS framework for durable agents on an immutable event log (Effect TS) — `Actor` · `Log` (event log = source of truth) · `Atoms` (durable = reduce events→state) · `Runtime` (executes proposed actions, appends, loops till turn done) · `infer`/`codeMode`/`compact`.

| Axis | Tardigrade | TAR |
| --- | --- | --- |
| Goal | general durable agents | business operations |
| Root primitive | **Event log** (state = fold over log) | **Record/Action** (records = truth) |
| Event log role | source of truth | audit trail only |
| Model role | core (`infer` drives the loop) | judge-only oracle |
| Tools | functions the **model calls** | **tiles** that launch an Action |
| Composition | runtime loop until turn done | `Flow` = explicit ordered steps |
| Determinism | model-driven | code commits; money/stock never by model |
| Durability | replay the log | idempotency key + version checks |
| Authority | permission events in log | roles + `canExecute`/`canRunFlowStep` |
| Observability | log = trace | `events` audit + checks |
| Hosting | portable / self-host | Cloudflare-native |

Shared: Effect TS · append-only events · deterministic commits · resumable execution · Cloudflare-capable.

Core difference: Tardigrade = *log is truth, model drives, state is derived*. TAR = *records are truth, code drives, model only judges*.

## Example: POS + Inbox = Flow

A Flow chains **Actions**, not Tools. POS and Inbox are tools (launchers); only their step-eligible Actions may be chained.

Flow Book `book.closing` ("Closing the shop"):

| Step | Step name | Tool | Action id | Type | Input | Output | Effects | Actor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Count the cash | POS (Cash drawer) | `pos.register.count` | app | `counted` | `register` | register_count | member |
| 2 | Send closing report | Inbox / Telegram | `task.create` | human | `title`, `assigneeId` | `record` | record_create, inbox | member |
| 3 | Close the register | POS (Cash drawer) | `pos.register.close` | app | — | `result` | register_close | member |

Which tool actions are step-eligible (`bookActions`):

| Tool | Primary action | Step-eligible instead |
| --- | --- | --- |
| POS | `pos.open` | `pos.register.count`, `pos.register.close` |
| Inbox | `task.complete` | `task.create` |
| human / telegram | `task.create` | `task.create` |
| members / contacts | `contact.create` | `contact.create` |
| site | `site.generate` | `site.generate` |
| web | — | `web.search` |
| records | `record.create` | `record.create` |
| — (no tile) | — | `organization.create` |

`organization.create` is step-eligible but has no tool tile — the clincher that composition is at the Action layer.

Extra rules:
- `auto` steps: only `unattendedActions` (`record.create`, `contact.create`, `organization.create`, `task.create`) may run itself; the rest need a human tap.
- Each step commits with key `flow:${runId}:${index}` — the flow is three commits, not one transaction.

## The one sentence

```text
Everything is a Tool; a Flow is a Tool of Tools; a Run is a Tool in action;
the log is the trace; the model only reorders — code commits.
```
