# Space — Adaptive Work Surface

## Contract

Space answers one question: **what should this person see and do now?** It is a
server-built projection of authorized work. It is not a folder, dashboard or
profession template.

| Rule | Result |
| --- | --- |
| Universal | Any workspace, role, country or domain can supply records, Actions and Flow Books |
| Automatic when clear | One matching routine selects its workspace and role |
| Ask when uncertain | Equal priority overlaps produce a small context choice |
| Manual hold | A chosen workspace stays active for 15 minutes to 7 days |
| Safe | Context changes presentation, never authority |
| Sparse | Show urgent signals, next Actions and active flows; details open on demand |

```text
time + timezone + routines + manual hold + authorized workspaces
                              |
                    deterministic resolver
                              |
                 one context or a short question
                              |
            workspace facts -> role projection -> Space
```

## Screen

```text
┌──────────────────────────────────────┐
│ Kitchen shift                       │
│ Northstar · Chef · Owner: Restaurant│ [Schedule] [Auto]
├──────────────────────────────────────┤
│ AT A GLANCE                         │
│  7 orders     2 waiting     1 alert │
├──────────────────────────────────────┤
│ DO                                   │
│  Prepare next order                 ›│
│  Record stock                       ›│
├──────────────────────────────────────┤
│ FLOW BOOKS                           │
│  Closing kitchen · step 3 of 6      ›│
└──────────────────────────────────────┘
   Space              Inbox              Ask
```

The header always says **workspace · role · owner**, so a person knows whose
system they are acting in. `Schedule` writes a routine to Personal. `Auto`
releases a manual hold.

## A day in Space

This is sample data explaining the model. Production stores user-created
routines; it does not ship these times, jobs, cards or businesses.

| Time | Context | Workspace / role / owner | Likely projection |
| --- | --- | --- | --- |
| 05:00 | Morning | **Personal**<br>Role: Individual<br>Owner: User | morning tasks, notes, exercise artifact |
| 09:00 | Kitchen | **Northstar Restaurant**<br>Role: Chef<br>Owner: Restaurant operator | assigned items, kitchen queue, prep flow |
| 12:00 | Counter | **Northstar Restaurant**<br>Role: Cashier<br>Owner: Restaurant operator | POS, payments, sales signals |
| 15:00 | Delivery | **My Delivery Work**<br>Role: Courier<br>Owner: User | reach, collect and deliver Actions |
| 18:00 | Taxi | **My Taxi Work**<br>Role: Driver<br>Owner: User | trip requests, route, settlement tasks |
| 20:00 | Sales | **Employer Sales Team**<br>Role: Sales employee<br>Owner: Employer | leads, follow-ups and approvals |
| 22:00 | Shop | **My Sandwich Shop**<br>Role: Owner / seller<br>Owner: User | orders, stock, cash and closing Flow Book |

## Context records

Routines are ordinary Personal workspace records with `type=routine`.

| Field | Meaning |
| --- | --- |
| `workspace` | authorized workspace id or slug |
| `label` | human context name |
| `role` | role shown for this routine |
| `start`, `end` | local `HH:MM`; overnight ranges are supported |
| `days` | weekday numbers `0..6` |
| `priority` | tie breaker `0..100` |

`routine.save` validates and writes this record only in Personal. Unknown
workspaces never activate because resolution intersects routines with current
membership.

## Selection

```text
valid manual hold? ─yes─> held workspace
       │ no
requested override? ─yes─> selected workspace
       │ no
active routines? ─one best─> automatic switch
       │
       ├─ equal best ─> ask user
       │
       └─ none ─> Personal (or first authorized workspace)
```

Priority decides first. Equal priority remains ambiguous. Jev can later rank
soft evidence such as wording or activity, but a low confidence answer must
remain a suggestion; time rules and membership stay deterministic.

## Inbox

Inbox contains **personal human actions**, not every record and not a mirror of
Space.

```text
Personal ─┐
Kitchen ──┼─ authorize -> project actionable items -> deduplicate -> sort
Delivery ─┤                                      |
Sales ────┘                         Mine / Available / Waiting
```

| Group | Contents |
| --- | --- |
| Mine | assigned tasks and role-owned operational work |
| Available | unassigned work the member may claim or perform |
| Waiting | blocked, pending or approval-dependent work |

Inbox stays cross-workspace. Filtering changes the list, never the active Space.
Opening or completing an item calls its source workspace Gateway without
switching context.

### One restaurant order

```text
customer places order
       |
       +-> owner Inbox: accept / reject
       +-> kitchen Inbox: prepare assigned lines by station
       +-> courier Inbox: reach / collect / deliver
       +-> customer Inbox: pay / receive / rate
```

The same parent record creates role-specific projections. A kitchen member sees
preparation details, a courier sees handoff details, and a customer sees their
own decisions. Payment or private business data is not copied into projections
that cannot read it.

## Space, Site and Artifact

| Object | Audience | Lifetime | Example |
| --- | --- | --- | --- |
| Space | one signed-in person | changes with context | cashier work surface |
| Site | public visitors | versioned published release | shop catalog and contact pages |
| Artifact | authorized people or a share | durable result | invoice, report, checklist, guide |

Sites are assembled public surfaces. Artifacts are outputs. A Space card can
open either, but neither replaces operational records.

## Jev use and cost control

| Use Jev for | Keep in code |
| --- | --- |
| rank likely context when signals conflict | membership and permission |
| rank the next registered Action in Ask TAR | time windows and manual holds |
| classify a new item for an Inbox projection | money, stock and state transition |

Monthly Jev cost is `judgments × current provider price`. Cache identical stable
judgments, batch only independent choices, and skip Jev whenever a deterministic
rule is sufficient. No background call is required for the normal routine path.

## API and acceptance

| API | Output |
| --- | --- |
| `GET /v1/space?zone=&at=&scope=` | context, decision, alternatives and typed sections |
| `PUT /v1/context` | hold or automatic mode |
| `GET /v1/inbox` | sources, Mine, Available, Waiting and partial flag |

Space is correct when it can model the sample day entirely as data, changes
automatically only on a clear result, labels workspace/role/owner, never expands
access, and lets Inbox act across workspaces without changing Space.

See [commerce.md](commerce.md), [site.md](site.md) and [tarv12.md](tarv12.md).
