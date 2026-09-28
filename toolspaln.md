# Tools plan — from workspace to each member

Target concept. The screens illustrate the intended behavior; they do not claim every role and Flow Book control is implemented today.

## 1. Owner creates a workspace

```text
┌──────────────────────────────────────────┐
│ Create workspace                         │
│ Name  [ Northstar Kitchen             ]  │
│                         [ Create ]       │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│ Northstar Kitchen · Owner: You           │
│ Records (0)                   [+ Record] │
│ Title        Type      State     Assigned│
│ ─────────────────────────────────────────│
│             Empty workspace              │
│                                          │
│ Setup: People · Modules · Flow Books     │
└──────────────────────────────────────────┘
```

| Comes with every workspace | Meaning |
| --- | --- |
| **Records** | One empty, user-facing table over the shared `records` store. It holds facts, not permissions. |
| **Owner membership** | The creator can manage the workspace and invite people. |
| **Core Actions** | Basic records, tasks, people, and Flow Book creation. |
| **Built-in commerce kernel** | TAR already ships the shared item, order, stock, price, payment, and refund logic. The owner enables the relevant business capability when needed. |

Commerce is built into TAR; enabling it does not install another system or create separate tables for each category. A new workspace has no sample orders or pre-enabled POS launcher. Restaurant roles and dining tables are added when needed. `Orders` and `Menu` can later be filtered views of Records.

## 2. Owner enables work and invites people

```text
NORTHSTAR / SET UP
  Capabilities   [✓] Commerce / POS   [✓] Kitchen   [ ] Site
  People         Maya  → Chef
                 Ravi  → Cashier
                 Ali   → Manager

  Access         Chef     → read kitchen lines, prepare food
                 Cashier  → take payment, use POS, start close
                 Manager  → review close, reports
                         [ Save ]
```

Each enabled capability supplies **record types + registered Actions + a few entry screens**. It may suggest editable roles; the owner chooses who gets them. After the owner adds items and prices, opens a register, and receives an order, the same table contains:

```text
NORTHSTAR / RECORDS
  Title             Type          State       Assigned
  Chicken tikka     item          active      —
  Order #41         order         accepted    —
  Register #7       pos.register  open        —
```

Both rows live in the same workspace Records store. Opening a row shows its type-specific fields and permitted Actions. The member's role controls which rows, fields, and Actions they may see or use.

## 3. Owner publishes a Flow Book

A **Flow Book** is a reusable, versioned recipe of registered Actions. It stores the steps and responsible roles; a **run** is one execution of that recipe against a record such as Register #7. The recipe is separate from the Records table; its steps read or change records through Actions.

```text
NORTHSTAR / FLOW BOOK
  Name       [ Close register             ]
  Start      Cashier, manually

  1  Count drawer       → Cashier  → record the count
  2  Review and close   → Manager  → approve and close

  [ Save draft ]                         [ Publish ]
```

Publishing makes **Start Close register** available in Tools to permitted cashiers. Starting it creates a run: Ravi receives step 1 in Now; after he completes it, Ali receives step 2. A book started by a record event would create the run directly and need no Tools entry. Each step uses its registered Action and checks access when opened and completed.

## 4. What each role sees

```text
┌──────────────────────────────────────────┐
│ MAYA · CHEF / NOW · 09:10                │
│ Prepare 2 × Chicken tikka · Order #41  › │
│ TOOLS / Northstar                        │
│ Kitchen display                        › │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ RAVI · CASHIER / NOW · 18:00             │
│ Take payment · Order #41               › │
│ Count drawer · Close register, step 1  › │
│ TOOLS / Northstar                        │
│ Point of sale                          › │
│ Start Close register                   › │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ALI · MANAGER / NOW · 18:05              │
│ Review close · Register #7             › │
│ TOOLS / Northstar                        │
│ Reports                                › │
└──────────────────────────────────────────┘
```

| View | Rule |
| --- | --- |
| **Tools** | A small set of launch screens and manually started Flow Books allowed by the active role. Individual operations stay inside their screen. |
| **Inbox → Now** | Concrete assigned steps from records or Flow Book runs, including work from other authorized workspaces. |
| **Space** | Picks the current workspace and duty focus; it does not change access or hide other Now work. |

## The complete method

```text
Workspace source
  Records + registered Actions + published Flow Books
  Members + role assignments (optional access dates/hours)
                         │
             one source access rule
               /                  \
    permitted launchers       assigned steps
       → cached Tools          → Inbox → Now
               \                  /
                tap → source checks again
```

| Decision | Simple rule |
| --- | --- |
| Access | Check membership, active role assignment, enabled Action, record scope/state, and source time on reads and execution. An assignment to work cannot grant permission. |
| Time | Roles normally stay stable. Duty schedules assign work and order Tools. Set access hours in the workspace time zone only when authority itself must expire. |
| Two roles | Combine the currently active Actions; Space highlights the current duty without removing other granted access. |
| Revoke | The source denies the next read or Action immediately; sync removes obsolete Tools and Now entries. |
| Flow handoff | The starter needs permission to start; each later actor needs permission for their own step. If nobody qualifies, the run waits for reassignment. |
| Fast Tools | Show saved launcher names/icons immediately, hide known expiries, and refresh changed workspaces independently through existing sync. First use still needs a fetch. The source always rechecks access. |
| Jev | Optionally match an owner's wording to registered Actions while drafting a book, or match a person's request to already allowed Tools. The owner reviews and publishes; code decides access and commits. |

**Minimum to build:** the existing Records store and Action registry, owner-controlled role assignments, Flow Book definitions/runs, derived Tools, assigned Inbox work, and one source check at use. No separate Tools permission list is needed.
