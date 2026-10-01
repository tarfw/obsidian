## 1. Workspace definition and tool group selection by Jev

| Step        | Input                                              | Jev / AI                                           | Code / result                                                     |
| ----------- | -------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| 1. Describe | Workspace name, work and optional site brief       | No call for exact values                           | Create empty Records + owner membership                           |
| 2. Select   | Registered tool/capability groups                  | Choice per optional group: include / skip / unsure | Propose groups, including Site; resolve dependencies              |
| 3. Save     | Owner reviews selection                            | Unclear fit asks; manual selection works           | Save enabled capabilities + default role bundles                  |
| 4. Site     | Site selected; reuse brief + approved facts/assets | Jev Picker for design; Writer only as needed       | Builder validates/saves private preview; ask only missing details |
| 5. Publish  | Owner reviews checked Site candidate               | No AI needed for an exact Publish command          | Explicit Publish in the same setup journey                        |
| Status      | Target setup flow                                  | Options come from the registry                     | Workspace/member setup continues while Site is pending            |

| No. | Tool / work group        | Registered Actions                                                                                                         |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Records                  | `record.create`, `record.update`                                                                                           |
| 2   | People and relationships | `contact.create`, `organization.create`, `relationship.create`, `relationship.end`, `consent.record`                       |
| 3   | Tasks                    | `task.create`, `task.complete`                                                                                             |
| 4   | Routines                 | `routine.save`, `routine.remove`                                                                                           |
| 5   | Flow Books               | `flow.start`, `flow.publish`, `flow.advance`, `flow.suggest`                                                               |
| 6   | Capability setup         | `capability.save`                                                                                                          |
| 7   | Web search               | `web.search`                                                                                                               |
| 8   | POS launcher/setup       | `pos.open`, `pos.setup`                                                                                                    |
| 9   | POS catalog/stock        | `pos.product.save`, `pos.product.content.save`, `pos.product.draft`, `pos.stock.adjust`                                    |
| 10  | POS customers            | `pos.customer.save`                                                                                                        |
| 11  | POS orders/kitchen       | `pos.order.save`, `pos.order.item.update`, `pos.order.cancel`, `pos.order.accept`, `pos.order.reject`, `pos.order.handoff` |
| 12  | POS sales/returns        | `pos.checkout`, `pos.refund`                                                                                               |
| 13  | POS register             | `pos.register.open`, `pos.register.count`, `pos.register.close`                                                            |
| 14  | Delivery                 | `pos.order.reach`, `pos.order.collect`, `pos.order.deliver`                                                                |
| 15  | Customer receipt/rating  | `pos.order.receive`, `pos.order.rate`                                                                                      |
| 16  | Commerce catalog/stock   | `catalog.item.save`, `catalog.variant.save`, `price.set`, `stock.adjust`                                                   |
| 17  | Purchasing               | `purchase.create`, `purchase.receive`                                                                                      |
| 18  | Commerce orders          | `order.create`, `order.fulfill`, `order.cancel`                                                                            |
| 19  | Billing                  | `invoice.issue`, `payment.record`, `refund.record`                                                                         |
| 20  | Site authoring           | `site.generate`, `site.scout`, `site.edit`, `site.ask`, `site.undo`, `site.design.import`                                  |
| 21  | Site assets              | `site.asset.upload`, `site.asset.generate`, `site.assets`                                                                  |
| 22  | Site releases            | `site.releases`, `site.checks`, `site.compile`, `site.publish`, `site.rollback`, `site.refresh`, `site.unpublish`          |

### Pending registered Actions to be added

| No. | Tool / work group           | Proposed Action IDs                                               |
| --- | --------------------------- | ----------------------------------------------------------------- |
| 1   | Supplier payments           | `purchase.pay`                                                    |
| 2   | Expenses                    | `expense.record`, `expense.reverse`                               |
| 3   | Bank reconciliation         | `bank.import`, `bank.reconcile`                                   |
| 4   | Period closing              | `period.close`, `period.reopen`                                   |
| 5   | Stock transfers             | `stock.transfer`                                                  |
| 6   | Batches / expiry            | `batch.save`, `batch.dispose`                                     |
| 7   | Recipes / production        | `recipe.save`, `production.start`, `production.complete`          |
| 8   | Bookings / time             | `booking.create`, `booking.cancel`, `time.record`                 |
| 9   | Taxi trips / fares          | `trip.start`, `trip.complete`, `fare.set`                         |
| 10  | Workforce / payroll         | `shift.assign`, `attendance.record`, `payroll.run`, `payroll.pay` |
| 11  | Supplier sourcing / quotes  | `supplier.qualify`, `quote.request`, `quote.record`               |
| 12  | Purchase approvals          | `purchase.submit`, `purchase.approve`, `purchase.reject`          |
| 13  | Warehouse picking / packing | `warehouse.pick`, `warehouse.pack`                                |
| 14  | Shipping / tracking         | `shipment.dispatch`, `shipment.track`, `shipment.deliver`         |
| 15  | Supplier returns / quality  | `purchase.return`, `quality.inspect`, `quality.release`           |
| 16  | Demand / replenishment      | `forecast.generate`, `replenishment.plan`                         |

Proposed IDs only; build and register before Jev can select them. Financial/tax reports use projections or Artifacts over business records.

## 2. Add members and define roles with Jev

| Step        | Owner input                                  | Jev                                           | Code / result                                              |
| ----------- | -------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| 1. Add      | Invite person; default membership = member   | No admin inference                            | Activate membership after invitation acceptance            |
| 2. Define   | Cashier and manage products                  | Choice matches an existing role bundle + none | Reuse bundle or draft a custom role                        |
| 3. Actions  | Custom duties / changes                      | Noul per eligible registered Action           | Propose explicit member grants                             |
| 4. Restrict | Optional: descriptions only, no prices       | Choice matches supported restrictions         | Default Action data access otherwise; no field picker      |
| 5. Save     | Short permission summary; details on demand  | Ask for unclear or unsupported duties         | Owner confirms; validate and audit saved grants            |
| 6. Reuse    | Assign the same saved role to another person | No repeated inference                         | Reuse grants; combine multiple roles with their conditions |

| Rule       | Default / contract                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Authority  | Member candidates exclude team/admin operations. Admin promotion is an explicit authorized change.                                         |
| Registry   | Actions declare delegation, required reads/writes, record scope and launcher dependencies.                                                 |
| Access     | Source checks membership, capabilities, grants, scope and state on reads/commits. Unknown roles deny.                                      |
| Projection | Code derives Tools without AI. Now includes authorized work across workspaces; Space changes focus only.                                   |
| Site       | One setup brief; optional Site uses approved public facts/assets. Private preview + explicit Publish follow agenticsite.md; visits need no AI. |
| AI         | Choice has confidence; Noul has yes-probability. Batch independent judgments; clarify uncertainty.                                         |
| Freshness  | Cache by identity/access, source/registry versions, context/request, question/model and relevant time. Source remains authoritative.       |
| Business   | Reuse Commerce, Flows, idempotency and audit. Distinct approval/execution steps need distinct registered Actions.                          |
| Build      | Implement shared grants; migrate delegable business Actions from fixed owner/admin checks. Preserve existing access.                       |
| Naming     | New internal identifiers use one lowercase word. Preserve existing interfaces and external spellings.                                      |

| Reference         | Source                                                                                                                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry snapshot | 68 Actions; [Tools](tarharness/src/registry/tools.ts), [Actions](tarharness/src/registry/catalog.ts), [POS](tarharness/src/pos/catalog.ts), [Commerce](tarharness/src/commerce/catalog.ts)                       |
| Product contracts | [Space](space.md), [Inbox](inbox.md), [Commerce](commerce.md), [Agentic Site](agenticsite.md)                                                                                                                            |
| Jev guidance      | [Choice](https://docs.typesafe.ai/primitives/choice), [Noul](https://docs.typesafe.ai/primitives/noul), [Confidence](https://docs.typesafe.ai/confidence), [Batching](https://docs.typesafe.ai/patterns/fan-out) |

## 3. End-to-end flow

```text
             +--------------------------------------------------------+
             | OWNER BRIEF                                            |
             | "Restaurant: sales, products and a site"               |
             +--------------------------------------------------------+
                                          |
                                          v
             +--------------------------------------------------------+
             | REGISTRY -> JEV GROUP CHOICES                          |
             | Propose matching tool/capability groups                |
             | Unclear -> ask; manual selection available             |
             +--------------------------------------------------------+
                                          |
                                          v
             +--------------------------------------------------------+
             | OWNER REVIEWS; CODE VALIDATES + SAVES                  |
             | Enabled capabilities + default role bundles            |
             | Workspace ready; Site does not block members           |
             +--------------------------------------------------------+
                                          |
                    +---------------------+---------------------+
                    |                                           |
                    v                                           v
+--------------------------------------+    +--------------------------------------+
| MEMBER SETUP                         |    | SITE (IF SELECTED)                   |
| Invite Ravi as member                |    | Reuse brief + approved public facts  |
| "Cashier + manage products"          |    | Reuse assets; ask missing details    |
+--------------------------------------+    +--------------------------------------+
                    |                                           |
                    v                                           v
+--------------------------------------+    +--------------------------------------+
| JEV ROLE / ACTION PROPOSAL           |    | BUILD SITE                           |
| Choice: role bundle + none           |    | Builder + Jev Picker for design      |
| Noul: eligible registered Actions    |    | Writer only when needed              |
+--------------------------------------+    +--------------------------------------+
                    |                                           |
                    v                                           v
+--------------------------------------+    +--------------------------------------+
| OWNER CONFIRMS; CODE SAVES GRANTS    |    | PRIVATE PREVIEW                      |
| Validate + audit permissions         |    | Builder validates + saves            |
| Acceptance activates membership      |    | Edit / Undo until ready              |
+--------------------------------------+    +--------------------------------------+
                    |                                           |
                    v                                           v
+--------------------------------------+    +--------------------------------------+
| CODE PROJECTS AUTHORIZED WORK        |    | REVIEW CHECKED CANDIDATE             |
| Capabilities + grants + interfaces   |    | Freeze + check; owner Publish        |
| Tools launchers / Inbox -> Now       |    | Public site; visits need no AI       |
+--------------------------------------+    +--------------------------------------+
                    |                                           |
                    v                                           v
+--------------------------------------+    +--------------------------------------+
| MEMBER USES TOOL / NOW               |    | VISITOR USES PUBLIC SITE             |
| Open -> source read check            |    | Choose configured registered Action  |
| Submit registered Action             |    | Current identity + request context   |
+--------------------------------------+    +--------------------------------------+
                    |                                           |
                    +---------------------+---------------------+
                                          |
                                          v
             +--------------------------------------------------------+
             | GATEWAY RECHECKS CURRENT SOURCE STATE                  |
             | Identity + access + business state + idempotency       |
             +--------------------------------------------------------+
                                          |
                    +---------------------+---------------------+
                    |                                           |
                    v                                           v
+--------------------------------------+    +--------------------------------------+
| DENY                                 |    | COMMIT + AUDIT                       |
| Rejected request; no commit          |    | Refresh affected Tools / Now         |
+--------------------------------------+    +--------------------------------------+

             +--------------------------------------------------------+
             | ACCESS CHANGES / ROLE REUSE                            |
             | Revoked -> next source use denied; sync retracts       |
             | Reuse saved role -> no new Jev call                    |
             +--------------------------------------------------------+
```

## 4. Tarapp concept screens

| Screen            | Entry / result                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| 1 -> 2. Workspace | Jev selects matching registered groups; owner reviews/adjusts; Save enables the workspace.                 |
| After Save        | Show Add member, Open Site (if selected), and Continue to Tools; Site can wait.                            |
| 3 -> 4. Member    | Describe duties or reuse a saved role; review Actions on demand; access starts after acceptance.           |
| 5. Site           | Reuse approved public facts/assets; preview/edit; freeze/check/review -> explicit Publish.                 |
| 6. Tools          | Same renderer for every workspace; show launchers allowed by saved grants and capabilities.                |
| States            | Unclear -> one focused question/manual choice; pending/error -> retain inputs + retry; revoked -> refresh. |
| Status            | Target concepts; restaurant labels are examples. Owner controls require current authority.                 |

```text
+------------------------------------------+    +------------------------------------------+
| 1. CREATE WORKSPACE                      |    | 2. REVIEW WORKSPACE                      |
|                                          |    |                                          |
| Name: Northstar                          |    | Selected by Jev; review:                 |
| Describe your work:                      |    | [x] POS   [x] Commerce   [x] Site        |
| Restaurant: sales, products and a site   |    | [Change selection]                       |
|                                          |    |                                          |
| Use the same brief for your Site.        |    | You can change these later.              |
|                                          |    |                                          |
| [Next]                         [Cancel]  |    | [Save workspace]                [Back]   |
+------------------------------------------+    +------------------------------------------+

+------------------------------------------+    +------------------------------------------+
| 3. ADD MEMBER                            |    | 4. REVIEW MEMBER PERMISSIONS             |
| Northstar                                |    | Northstar / Ravi / Member                |
|                                          |    |                                          |
| Person: ravi@example.com                 |    | Suggested permissions:                   |
| Membership: Member                       |    | [x] Record sales                         |
| What can Ravi do?                        |    | [x] Manage products                      |
| Cashier and manage products              |    | [View Actions] [Change duties]           |
|                                          |    |                                          |
| [Use saved role]                         |    | [Save as reusable role]                  |
| [Review permissions]           [Back]    |    | [Save and invite]              [Back]    |
+------------------------------------------+    +------------------------------------------+

+------------------------------------------+    +------------------------------------------+
| 5. SITE - PRIVATE DRAFT                  |    | 6. TOOLS - RAVI                          |
| Northstar / Owner: Mira                  |    | Northstar / Cashier + products           |
|                                          |    | Owner: Mira                              |
| Draft: Saved                             |    |                                          |
| [Preview] [Assets] [Undo]                |    | [T] POS                              >   |
|                                          |    | [T] Products                         >   |
| Describe a change:                       |    |                                          |
| Make the menu easier to browse           |    | Open a tool to do the work.              |
| [Send]                                   |    |                                          |
|                                          |    | [Now]                       [Ask TAR]    |
| [Review publish]          [Do later]     |    |                                          |
+------------------------------------------+    +------------------------------------------+
```
