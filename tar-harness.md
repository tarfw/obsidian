# TAR Harness

**Three concepts. One execution path.**

[Action catalog](actionsreg.md) | [Implementation reference](tar-harness-implementation.md) | [Examples](tarharnessexamples.md)

This file owns the architecture; linked references hold capability and engineering details.

## Workspace

~~~text
Google sign-in -> Personal workspace -> Records + Inbox
                         +-> Work workspace -> members + shared work
~~~

- Sign-in creates one Personal workspace once and reuses it on every device.
- Work workspaces are created only when shared work needs them; invitations activate when that Google email signs in.
- D1 stores Google identity, membership and routing. Each workspace has one isolated Turso database.

## 1. Records — information

| Record | Purpose |
|---|---|
| Contact / Organisation | People, organisations and their relationships. |
| Task | Human work; Subtasks are checklist items. |
| Interaction | A call, message, email, meeting or note. |
| Document | File metadata and a stored-file reference. |
| Business Record | Products, orders, bookings, inventory, money, projects or cases, enabled as needed. |

- Start with Contacts, Organisations, Tasks, Documents and Interactions.
- Links connect Records; shared forms and views display them.
- Membership and policy grant access. Contact roles describe relationships only.

## 2. Actions — work

**Every executable capability is a registered Action. No separate Step model.**

| Type | Performs work through |
|---|---|
| App | Deterministic code or an approved integration. |
| Agent | Bounded reasoning and allowed choices. |
| Human | A Task waiting for an authorised response. |

Record edits, communication, files, approvals, schedules, research, business operations and administration all use Actions. Categories belong in the catalog, not separate engines.

### Mandatory execution

~~~text
Action [Gateway checks -> execute -> validate result -> commit] -> saved result
~~~

**Gateway is built into execution. It is mandatory, cannot be skipped and is never a builder-added Flow step.**

| Guarantee | Rule |
|---|---|
| Authority | Validate access, inputs, outputs, Record versions and required approvals. |
| Direct use | Actions work outside Flows with the same checks; reads need no business mutation. |
| Durable change | Save workspace changes, progress, audit and delivery intent atomically. |
| Duplicate safety | Repeated accepted requests return the saved result without another effect or charge. |
| External effects | Deliver committed intent through Outbox; wait for confirmed success before dependent work. |
| Uncertainty | Reconcile an unclear delivery result or request review before retrying. |
| Agent limits | Allowed data/Actions and time/cost budgets; no direct commit authority. |

### Supporting parts

| Part | Place in the architecture |
|---|---|
| Channels / connectors | Adapters behind Actions and incoming triggers. |
| Models / MCP / skills / sandboxes / subagents | Approved Action implementations. |
| Inbox / Queue | Views of assigned / unassigned open Tasks. |
| Forms / screens | Fixed Action inputs and Record views. |
| Outbox / queues / databases | Internal delivery, recovery and storage infrastructure. |

## 3. Flows — process

~~~text
Verified trigger -> Run -> Action -> saved result -> next Action -> outcome
~~~

| Part | Rule |
|---|---|
| Definition | Versioned trigger + ordered Actions + explicit outcome routes. |
| Run | Saved execution progress; pins Flow and Action versions. |
| Sequence | Linear by default; branch only when needed. |
| Human wait | One Task per waiting Human Action; accepted completion resumes its Run once. |
| Other waits | Save the expected event or due time and a deadline/reminder policy. |
| Recovery | Resume durable progress; bounded safe retries end in visible work or failure. |
| Schedule | Each recurring occurrence starts a distinct, deduplicated Run. |
| Cancellation | Stop new work; compensate committed effects separately when needed. |
| Bot | Named Flow bindings and guidance. |
| Kit | Versioned Record types, views, Action dependencies, templates and policy. |

### Creation

~~~text
Describe -> reuse Records/Actions -> draft Flow -> preview -> approve -> publish
~~~

- Preview outcomes, access, approvals and cost.
- Validate versions, bindings, routes, permissions and fallbacks before publication.
- Review and register new executable implementations before use.
- Apply published changes to new Runs; explicitly migrate active Runs.
- Kit installation requires owner review; upgrades show a diff and preserve local customisation.

### Everyday use

~~~text
Work  = Records + Inbox
Build = Flows + Actions + settings
~~~

Show the next action, owner, status and relevant due date. Keep technical traces in Run details.

**Reuse first. Add only what the work needs.**
