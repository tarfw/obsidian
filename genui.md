# TAR Generative UI (GenUI) Architecture Specification

> **Document Status:** Complete Architecture & Implementation Blueprint  
> **Core Principle:** Radical Simplicity for Ordinary Non-Technical Users. Zero menus, zero layout configuration, zero learning curve.

---

## 1. The Core Philosophy: "Speak, Tap, Done"

For everyday people—small shop owners, delivery drivers, cafe staff, and families—software complexity is a failure. The interface follows three non-negotiable rules:

1. **Maximum 3 Items on Screen:** The main screen never shows a long wall of widgets. It shows only what matters right now (top 2 tasks + 1 primary tool).
2. **Three-Tap Maximum:** Any action in the entire app must be completed in 3 taps or less (Tap Suggestion -> Review Slide-Up Card -> Tap Confirm).
3. **Zero Configuration:** No widget arranging, no pinning, no dashboard settings. The app adapts automatically based on time, location, and daily habits.

---

## 2. The 3-Zone Screen Architecture

The entire app is a single, clean vertical screen divided into three distinct visual zones:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ZONE 1: TOP GLANCE BAR                                                     │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ Info Bar: Partner discount or critical notice                          │ │
│ ├────────────────────────────────────────────────────────────────────────┤ │
│ │ Life Modes: [ Personal (Active) ] [ My Shop ] [ Delivery Gig ]         │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ZONE 2: LIVE ACTION STREAM (Max 3 Cards Visible)                           │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ Task to Do: Customer Refund ($45) ---------- [ Approve ] [ Reject ]    │ │
│ ├────────────────────────────────────────────────────────────────────────┤ │
│ │ Today's Cash Total: $1,420 (+12% vs yesterday)                         │ │
│ ├────────────────────────────────────────────────────────────────────────┤ │
│ │ Quick Billing / POS Terminal (5 Free Tables | Tap to Bill)             │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ZONE 3: BOTTOM ACTION DOCK                                                 │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ Quick Chips: [ Bill Table 4 ]   [ Milk Stock ]   [ Call Supplier ]     │ │
│ ├────────────────────────────────────────────────────────────────────────┤ │
│ │ [ Search or speak... ]                                        [ Mic ]  │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The Slide-Up Card (For Everything Else)

Deep tools (contacts, deal pipelines, inventory stock, detailed reports) **never stay on the main screen**. When the user taps a suggestion chip or speaks, a temporary **Slide-Up Card** appears, lets them finish the task in seconds, and disappears with one downward swipe.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ MAIN SCREEN (Stays Clean)          │ SLIDE-UP CARD (Appears on Demand)     │
│                                    │                                       │
│ • Info Bar (Top Banner)            │ ┌───────────────────────────────────┐ │
│ • Life Mode Tabs (Context Switch)  │ │ [== Swipe Down to Close ==]       │ │
│ • Action Inbox (Urgent Tasks)      │ │                                   │ │
│ • Contextual Live Blocks:          │ │ Milk & Dairy Stock                │ │
│   - Today's Sales: $1,420          │ │ • Whole Milk: 4 units left        │ │
│   - Table Grid POS / Shift Tools   │ │   [ - ] 4 [ + ]                   │ │
│ • Bottom Action Dock               │ │ • Butter: 12 packs                │ │
│                                    │ │   [ - ] 12 [ + ]                  │ │
│ (Never shifts, jumps, or clutters) │ │                                   │ │
│                                    │ │ [ Order from Supplier ($32) ]     │ │
│                                    │ └───────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Life Modes (Automatic Routine Adaptation)

The app automatically switches the active tab based on the user's daily routine:

```
06:00 - 08:00   Personal Mode
                Shows: Morning walk steps, personal to-do list, daily budget snapshot.

08:00 - 17:00   My Shop Mode
                Shows: Quick billing, live orders, today's sales counter, stock warnings.

17:00 - 22:00   Delivery Gig Mode
                Shows: Active trip map, tonight's earnings counter, 1-tap call customer.

22:00 - 00:00   Night Wind-Down Mode
                Shows: Total daily earnings recap, tomorrow's plan, personal checklist.
```

If the user wants to check something early, they simply tap the mode tab once with their thumb.

---

## 5. The Role of `canvas.md` (The Declarative Blueprint)

`canvas.md` is the **single source of truth** stored in the user's OKF vault (`personal/canvas.md` and `team/canvas.md`). It quietly manages what appears on the Main Screen behind the scenes.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ OKF VAULT: team/canvas.md                                                   │
│                                                                             │
│ ---                                                                         │
│ type: CanvasLayout                                                          │
│ life_modes:                                                                 │
│   personal:                                                                 │
│     blocks: [ health_step_counter, daily_budget_card ]                      │
│   my_shop:                                                                  │
│     blocks: [ cash_sales_counter, table_grid_pos, live_orders_feed ]        │
│   delivery_gig:                                                             │
│     blocks: [ gig_earnings_counter, active_trip_map ]                       │
│ ---                                                                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Read by tarapp layout engine)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ MAIN SCREEN (ZONE 2)                                                        │
│ Instantly renders the matching Contextual Live Blocks from Native Registry  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Principles of `canvas.md`:
1. **Zero Manual YAML Editing:** Non-technical users never see or write YAML. 
2. **Autonomous AI Management:** The AI worker reads and updates `canvas.md` when shift routines adapt or when the owner creates new tools via voice/text.
3. **Obsidian Compatibility:** Power users can view, backup, and edit their entire workspace UI layout in plain Markdown inside Obsidian.

---

## 6. The Bottom Action Dock (Zero Typing by Default)

The bottom bar is designed for fast, one-handed mobile use with 3 effortless states:

### 1. Idle (Zero Typing)
Before touching the keyboard, 3 relevant action chips float above the bar based on the current hour and habits:
- At 08:30 in Shop Mode: `[ Open Register ]` `[ Check Milk Stock ]` `[ Call Ramesh ]`
- At 18:00 in Gig Mode: `[ Start Shift ]` `[ View Active Trip ]` `[ SOS Support ]`

### 2. Live Match (While Typing)
Typing just 2 or 3 letters instantly shows 1-tap action buttons:
- Typing "mil" -> `[ +5 Milk Units Now ]` or `[ View Milk Stock ]` or `[ Call Dairy Supplier ]`

### 3. Voice or Sentence Intent
Speaking into the mic (e.g. "Order 20kg rice from supplier" or "Book delivery bike for order 1042") brings up a clean confirmation card with price and details. Tapping `[ Confirm ]` completes the order immediately.

---

## 7. Info Bar (Top Multi-Utility Banner)

Located at the very top of the screen in a compact 44px height:
- **Free Tier Support:** High-quality sponsor offers (POS hardware, cloud credits, fintech terminal discounts) that keep the core software 100% free for users.
- **Context Perks:** Wholesale ingredient deals in Shop mode, fuel discounts in Gig mode, health rewards in Personal mode.
- **System Notices:** Offline mode status and important announcements.

---

## 8. Component Catalog (100% Pure Native & Crash-Proof)

To guarantee **zero mobile crashes, instant 60fps performance, and 100% offline capability**, TAR uses a **Pure Native Component Catalog**. We do not use WebViews or arbitrary HTML execution.

Every component is managed through a typed Native Registry (`ComponentRegistry.ts`) and conforms to a uniform contract (`SectionProps`):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ COMPONENT REGISTRY CONTRACT (SectionProps)                                  │
│ {                                                                           │
│   type: string,                 // Registered component ID                  │
│   props: Record<string, any>,   // Custom parameters, queries, and filters  │
│   designTokens: DesignTokens,   // Theme colors, typography, border radius  │
│   data: any[],                  // Live records from Turso matter/motion    │
│   onExecuteAction: Function     // Safe intent dispatcher to backend/DB     │
│ }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### How Generative Customization Works (Parametric Schema)

Instead of generating risky, fragile HTML or JavaScript code, the Generative AI configures universal native components by passing structured properties:
- **For Pharmacy:** Configures `<data-grid>` with props `{ type: "medicine", filter: "expiry < 30d", columns: ["name", "expiry", "batch"] }`
- **For Gym:** Configures `<data-grid>` with props `{ type: "member", filter: "status='active'", columns: ["name", "plan", "phone"] }`
- **For Retail:** Configures `<stock-sheet>` with props `{ type: "grocery", threshold: 5 }`

This provides **infinite customization for any business vertical** while keeping the app 100% native, reliable, and crash-proof.

### Folder & File Organization

All components are isolated `.tsx` files located in a dedicated folder:

```
tarapp/src/gen-ui/
├── registry/
│   ├── ComponentRegistry.ts     <-- Registry engine & SectionProps contract
│   ├── builtins.ts              <-- Registers all native components
│   └── sections/                <-- Isolated Component .TSX Files
│       ├── MetricCard.tsx       <-- Signature mint-cyan metric card
│       ├── TaskInbox.tsx        <-- Action Inbox task feed
│       ├── QuickPos.tsx         <-- Table floor grid & POS register
│       ├── StockSheet.tsx       <-- Quick stock counter with [-] [+] steppers
│       ├── PipelineCard.tsx     <-- Deal stages & lead progression card
│       ├── ContactCard.tsx      <-- Customer / Supplier phone & WhatsApp card
│       ├── ActionConfirm.tsx    <-- Order / Delivery confirmation sheet
│       └── DataTable.tsx        <-- Universal parametric entity table
```

### Custom Figma Design Pipeline

Every component in the catalog can be custom-designed in Figma and translated directly into a native `.tsx` file (just like the custom mint-cyan `MetricCard.tsx`):
1. **Design in Figma:** Create the visual layout, typography, colors, padding, and corner radius.
2. **Direct TSX Mapping:** Translate Figma styles into a clean, dedicated React Native `.tsx` file under `sections/`.
3. **Register in Builtins:** Wire the component into `builtins.ts` so it renders across the Main Canvas and Ephemeral Slide-Up Cards.

### The Complete Native Component Catalog:

| Component Name | File Path | Where It Appears | Purpose |
|---|---|---|---|
| `task-inbox` | `sections/TaskInbox.tsx` | Main Screen (Top) | Shows urgent tasks and approvals requiring immediate action. |
| `stat-counter` | `sections/MetricCard.tsx` | Main Screen | Shows key daily numbers (Today's Sales, Daily Steps, Gig Earnings). |
| `quick-pos` | `sections/QuickPos.tsx` | Main Screen | Fast 1-tap table billing and checkout register. |
| `stock-sheet` | `sections/StockSheet.tsx` | Slide-Up Card | Rapid item stock counter with `[ - ]` and `[ + ]` steppers. |
| `pipeline-card`| `sections/PipelineCard.tsx` | Slide-Up Card | Simple customer deal stages with 1-tap stage advance. |
| `contact-card` | `sections/ContactCard.tsx` | Slide-Up Card | Customer or supplier details with 1-tap Call and WhatsApp buttons. |
| `action-confirm`| `sections/ActionConfirm.tsx`| Slide-Up Card | Review and 1-tap confirmation card for orders, deliveries, and bookings. |
| `data-grid` | `sections/DataTable.tsx` | Slide-Up Card | Dynamic native table or card list adaptable to any custom database entity. |

---

## 9. Built-in Safeguards & Offline First

1. **100% Offline Capability:** The app functions completely without internet connection using embedded Turso SQLite. When connectivity resumes, data syncs automatically in the background.
2. **Zero Financial Accidents:** Agents never execute payments or bookings in the background without the user tapping an explicit `[ Confirm ]` button on the Slide-Up Card.
3. **Data Privacy Isolation:** Personal life data and business workspace data are strictly separated at the database level.
