```text
====================================================================================================
                   ZERO-CONFLICT CROSS-WORKSPACE MEMBER PORTABILITY
====================================================================================================

                                    ONE CANONICAL USER IDENTITY
                                  ┌─────────────────────────────┐
                                  │ users.id = "usr_kanimozhi_101"   │
                                  │ Name: "Kanimozhi" (D1 Auth)│
                                  └──────────────┬──────────────┘
                                                 │
            ┌────────────────────────────────────┼────────────────────────────────────┐
            │ (09:00 - 14:00)                    │ (15:00 - 18:00)                    │ (19:00 - 23:00)
            ▼                                    ▼                                    ▼
 ┌──────────────────────┐             ┌──────────────────────┐             ┌──────────────────────┐
 │ NORTHSTAR RESTAURANT │             │ FLASH COURIER CO     │             │ MY TACO TRUCK        │
 │ - Role: Cashier      │             │ - Role: Courier      │             │ - Role: Owner        │
 │ - Turso DB: ws_rest  │             │ - Turso DB: ws_flash │             │ - Turso DB: ws_tacos │
 │ - Context: Counter   │             │ - Context: Delivery  │             │ - Context: Full Shop │
 └──────────┬───────────┘             └──────────┬───────────┘             └──────────┬───────────┘
            │                                    │                                    │
            └────────────────────────────────────┼────────────────────────────────────┘
                                                 │
                                                 ▼
                             UNIFIED CROSS-WORKSPACE INBOX (Now Screen)
                     ┌────────────────────────────────────────────────────────┐
                     │ [Northstar · Cashier]   Verify cash register close   › │
                     │ [Flash · Courier]       Pickup order #402 from kitchen›│
                     │ [My Taco Truck · Owner] Review today's $1,250 sales  › │
                     │                                                        │
                     │ (All actionable in 1 place · Zero DB merge conflict)   │
                     └────────────────────────────────────────────────────────┘
```

| Layer | Behavior When Moving Between Workspaces | Conflict Risk | Why Zero Complexity? |
| :--- | :--- | :---: | :--- |
| **1. Identity** | Unchanged single user session (Google / D1) | **0%** | Same auth token validates across all workspaces. |
| **2. Role & Access** | Dynamically swaps based on workspace `members` record | **0%** | Server checks `(user_id, workspace_id)` on every RPC. |
| **3. Database Boundary** | Gateway routes query to distinct Turso database | **0%** | Isolated databases; no data mixing or collision. |
| **4. Contact Directory**| Shows only the active workspace's contacts | **0%** | Restaurant cannot see Courier company client list. |
| **5. Personal Contacts**| Stays private in member's Personal workspace | **0%** | Personal data is never queried by business workspaces. |
| **6. Cross-Work Inbox** | Shows assigned tasks from all workspaces simultaneously | **0%** | Micro-projections tagged with `workspace_id`. |

---

```text
====================================================================================================
                                WHY THERE ARE ZERO CONFLICTS
====================================================================================================
```

| Potential Conflict Scenario | Traditional App Failure | TAR Resolution (Zero Conflict) |
| :--- | :--- | :--- |
| **Same Customer in 2 Workspaces** | Overwrites or merges customer notes | Stored as 2 separate records in 2 isolated Turso DBs; zero collision. |
| **Simultaneous Roles** | User confused by mixed permissions | Screen header clearly displays `Workspace · Role · Owner`. |
| **Fired from 1 Workspace** | May lose access to all work or keep data | Only that 1 workspace is revoked; other workspaces remain active. |
| **Acting on Task from Another Org**| Forces full app logout / workspace reload | Inbox allows completing task directly via Gateway RPC without switching Space. |
| **Offline Work across Jobs** | Local database sync collisions | Only personal **Inbox** is local-first; business state commits cleanly to Cloudflare Edge. |

---

```text
====================================================================================================
                               SPACE CONTEXT SWITCHING LIFECYCLE
====================================================================================================
```

| Trigger | From Context | To Context | State Change in App | What Stays Fixed |
| :--- | :--- | :--- | :--- | :--- |
| **Morning Routine (09:00)** | Personal Space | Northstar (Cashier) | Screen switches to POS tools & counter alerts | User Auth & Inbox items |
| **Shift End (14:00)** | Northstar (Cashier) | Flash (Courier) | Screen switches to Route map & pickup tickets | User Auth & Inbox items |
| **Manual Override (Tap)** | Flash (Courier) | My Taco Truck (Owner)| Screen switches to Sales KPIs & inventory tools| User Auth & Inbox items |
| **Complete Action** | Any Space | Any Workspace Task | Completes specific task via source Gateway RPC | Active Space unchanged |
