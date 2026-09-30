# Space Surface Architecture — Now & Tools

This document captures the design direction, user-friendly improvements, and zero-complexity multi-workspace architecture for both the **Now** feed and the **Tools** screen.

---

## Part 1: Now Screen — Productive, Simple & Focused Work Surface

### 1. Direct 1-Tap Quick Action (Fastest Completion Flow)
* **Tap Circle (`○`)**: Instantly marks the item complete with subtle haptic feedback and a smooth dismiss animation.
* **Tap Card Body**: Opens full ticket / POS / Flow Book details.

```text
┌─────────────────────────────────────────────────────────────┐
│ ○  Talk to work                                             │
│    Personal · 03:28 AM                                      │
├─────────────────────────────────────────────────────────────┤
│ ○  Prepare table 4 soup                            [ NEXT ] │
│    Northstar · Chef · 11:30 AM                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Urgency Grouping ("Up Next" vs. "Later Today")
Group items into 2 or 3 intuitive urgency sections based on due times and priority:
* **UP NEXT**: Tasks due within 1–2 hours or marked with `feed.next`.
* **LATER TODAY**: Tasks due later in the shift or evening.
* **WAITING**: Items waiting on other team members, customer payment, or kitchen prep.

```text
UP NEXT
───────────────────────────────────────────────────────────────
○  Prepare table 4 soup                               [ NEXT ]
   Northstar · Chef · Due in 15m

LATER TODAY
───────────────────────────────────────────────────────────────
○  Stock check salmon
   Northstar · Chef · 02:00 PM

○  Pay electric bill
   Personal · 06:00 PM
```

---

### 3. Visual Workspace Color Accents (Instant Context)
Use a subtle, clean color accent (dot, pill, or left border stroke) per workspace:
* 🟠 **Amber / Orange**: Restaurant / Kitchen / Store operations.
* 🔵 **Blue**: Personal tasks & private notes.
* 🟢 **Green**: Deliveries, rides, & logistics.
* 🟣 **Purple**: Employer sales / Team tasks.

The human brain processes color in ~50ms before reading text, allowing immediate context switching.

---

### 4. Human-First Natural Due Times
* `Due in 15m` *(amber highlight when urgent)*
* `11:30 AM`
* `Today` / `Tomorrow`
* `Overdue by 20m` *(subtle red badge)*

---

### Baseline UI Simplifications Completed
* [x] Removed redundant `📌 Pinned` and `[Resume Schedule]` banners.
* [x] Removed header search icon (search belongs in Tools/Records; natural language commands live in Ask TAR).
* [x] Removed cryptic developer brackets (`[A]`, `[F]`, `[#]`, `[S]`).
* [x] Removed trailing chevron `›` and capitalized status labels (`OPEN ›`).
* [x] Unified cross-workspace feed by default.

---

## Part 2: Tools & Multi-Workspace Architecture ("A Day in Space")

### The Scenario: One Person, Multiple Workspaces

From `space.md`, a single user might participate in multiple workspaces throughout their day:
1. 👤 **Personal** (Morning notes & chores)
2. 🍽️ **Northstar Restaurant** (Chef & Cashier shifts)
3. 📦 **My Delivery Work** (Courier)
4. 🚕 **My Taxi Work** (Driver)
5. 💼 **Employer Sales Team** (Employee)
6. 🥪 **My Sandwich Shop** (Owner & Operator)

---

### The Solution: 1-Tap Context-Aware Tools Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. TIME & ROUTINE ENGINE (Deterministic Resolver)                      │
│    • At 09:30 AM, app knows you're at Northstar Restaurant.            │
│    • At 10:00 PM, app knows you're at My Sandwich Shop.                │
├────────────────────────────────────────────────────────────────────────┤
│ 2. JEV SYSTEM ONE (Semantic Search & Intent Routing)                   │
│    • You type: "Count register" ➔ Jev routes to [Sandwich Shop / POS]. │
│    • You type: "Log passenger fare" ➔ Jev routes to [Taxi Work].       │
├────────────────────────────────────────────────────────────────────────┤
│ 3. TOOLS SURFACE (1-Tap Workspace Chips — No Page Jumping)             │
│    • Horizontally scrollable chips: [Active] [Shop] [Taxi] [All]       │
│    • Tap any chip ➔ Instant in-place tools switch. 0 page transitions. │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Screen Flow & Layouts

#### View A: Default Focused View (During Active Shift)
When you open Tools at 10:00 AM, Space auto-selects **Northstar Restaurant**:

```text
┌─────────────────────────────────────────────────────────────┐
│ ← Tools                                               🔍  ⋯ │
│                                                             │
│   [ ⚡ Northstar ]  [ Sandwich Shop ]  [ Taxi ]  [ All ]    │
│   (Chef / Cashier)                                          │
├─────────────────────────────────────────────────────────────┤
│ 🏪 Point of sale                                          › │
│    5 actions · Cashier register, counter checkout           │
│                                                             │
│ 🍳 Kitchen Queue                                          › │
│    3 actions · Prep tickets, dish status, station handoff   │
│                                                             │
│ 📦 Inventory & Stock                                      › │
│    6 actions · Counts, supplier quotes, waste logs          │
│                                                             │
│ 🌿 Flow Books                                             › │
│    Opening shift flow (step 2 of 5)                         │
└─────────────────────────────────────────────────────────────┘
```

---

#### View B: 1-Tap Switch to "All Workspaces" (Unified Catalog)
If you want to see everything you own and operate in one place, tap **[ All ]**:

```text
┌─────────────────────────────────────────────────────────────┐
│ ← Tools                                               🔍  ⋯ │
│                                                             │
│   [ Northstar ]  [ Sandwich Shop ]  [ Taxi ]  [ All (6) ✓ ] │
├─────────────────────────────────────────────────────────────┤
│ 🍽️ NORTHSTAR RESTAURANT (Chef / Cashier)                   │
│ • Point of sale (5 actions)                               › │
│ • Kitchen Queue (3 actions)                               › │
│                                                             │
│ 🥪 MY SANDWICH SHOP (Owner)                                 │
│ • Point of sale & Sales (5 actions)                       › │
│ • Commerce & Catalog (13 actions)                         › │
│ • Site Studio (Storefront)                                › │
│                                                             │
│ 🚕 MY TAXI WORK (Driver)                                    │
│ • Trip Requests & Route (4 actions)                       › │
│ • Settlement & Fuel Log (2 actions)                       › │
│                                                             │
│ 👤 PERSONAL (Individual)                                    │
│ • Create Personal Records & Notes (5 actions)             › │
│ • Space Routines & Shifts                                 › │
└─────────────────────────────────────────────────────────────┘
```

---

#### View C: How Jev Helps in Search / Command
When you have multiple workspaces, browsing through dozens of tools manually takes time. **Jev AI eliminates navigation altogether**:

```text
┌─────────────────────────────────────────────────────────────┐
│ Search / Ask TAR: "Reconcile register cash"                 │
├─────────────────────────────────────────────────────────────┤
│ ⚡ JEV RESOLUTION (Confidence: 96%)                          │
│                                                             │
│ → [pos.register.close] in My Sandwich Shop                › │
│   "Reconcile and close drawer cash for closing shift"       │
│                                                             │
│ Other matching tools:                                       │
│ • POS Register Count ➔ [Northstar Restaurant]             › │
│ • End of Shift Cash Settlement ➔ [My Taxi Work]           › │
└─────────────────────────────────────────────────────────────┘
```

---

### Comparison: Old vs. 1-Tap Architecture

| Problem | Old Design | New 1-Tap Solution |
|---|---|---|
| **Multi-workspace switching** | Tap dropdown $\rightarrow$ navigate to blank full page $\rightarrow$ tap workspace $\rightarrow$ navigate back. | **1 Tap on a top chip**: Instant in-place filtering. 0 screen transitions. |
| **Active context awareness** | Always defaulted to whatever was stored statically. | **Smart default**: Highlights the current shift/active workspace based on time & routine. |
| **Seeing all capabilities** | Hidden behind single-workspace silos. | **[All Workspaces] tab**: Gives a clean grouped view of all businesses in 1 scroll. |
| **Finding a tool across multiple workspaces** | Manual hunting through menus. | **Jev AI routing**: Type what you want in plain English; Jev opens the right tool in the right workspace. |
