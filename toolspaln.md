## 1. Workspace definition and tool group selection by Jev

| Step | Definition |
| --- | --- |
| Brief | Describe the work, people and duties freely. One workspace may combine several capabilities. |
| Registry | All 68 currently registered Actions are grouped below; launcher metadata comes from [Tools](tarharness/src/registry/tools.ts), operations from [Actions](tarharness/src/registry/catalog.ts), [POS](tarharness/src/pos/catalog.ts) and [Commerce](tarharness/src/commerce/catalog.ts). |
| Jev Choice | Code supplies eligible groups and descriptions. Batch one Choice per optional group: `include / skip / unsure`; several groups may fit. |
| Save | Owner reviews; code validates dependencies and saves enabled capabilities with available default role bundles. Members receive grants in step 2. |
| Status | Target setup flow; table reflects current Actions. New domains need registered implementations. Manual selection works without Jev. |
| Product | [Space](space.md) owns context; [Inbox](inbox.md) owns Now; [Commerce](commerce.md) owns business truth; [AI Sites](aisites.md) owns site editing and publication. |

| Tool / work group | Registered Actions |
| --- | --- |
| Records | `record.create`, `record.update` |
| People and relationships | `contact.create`, `organization.create`, `relationship.create`, `relationship.end`, `consent.record` |
| Tasks | `task.create`, `task.complete` |
| Routines | `routine.save`, `routine.remove` |
| Flow Books | `flow.start`, `flow.publish`, `flow.advance`, `flow.suggest` |
| Capability setup | `capability.save` |
| Web search | `web.search` |
| POS launcher/setup | `pos.open`, `pos.setup` |
| POS catalog/stock | `pos.product.save`, `pos.product.content.save`, `pos.product.draft`, `pos.stock.adjust` |
| POS customers | `pos.customer.save` |
| POS orders/kitchen | `pos.order.save`, `pos.order.item.update`, `pos.order.cancel`, `pos.order.accept`, `pos.order.reject`, `pos.order.handoff` |
| POS sales/returns | `pos.checkout`, `pos.refund` |
| POS register | `pos.register.open`, `pos.register.count`, `pos.register.close` |
| Delivery | `pos.order.reach`, `pos.order.collect`, `pos.order.deliver` |
| Customer receipt/rating | `pos.order.receive`, `pos.order.rate` |
| Commerce catalog/stock | `catalog.item.save`, `catalog.variant.save`, `price.set`, `stock.adjust` |
| Purchasing | `purchase.create`, `purchase.receive` |
| Commerce orders | `order.create`, `order.fulfill`, `order.cancel` |
| Billing | `invoice.issue`, `payment.record`, `refund.record` |
| Site authoring | `site.generate`, `site.update`, `site.edit`, `site.ask`, `site.undo`, `site.design.import` |
| Site assets | `site.asset.upload`, `site.asset.generate`, `site.assets` |
| Site releases | `site.releases`, `site.checks`, `site.compile`, `site.publish`, `site.rollback`, `site.refresh`, `site.unpublish` |

```text
Workspace brief + registry descriptions
                 |
       Jev Choices: include / skip / unsure
                 |
          owner reviews -> saves
                 |
   enabled capabilities + default role bundles
```

## 2. Add members and define roles with Jev

| Step | Definition |
| --- | --- |
| Add | Owner invites a person as a member and describes their duties. `contact.create` stores a business contact; it does not add a member. |
| Authority | Code excludes team/admin operations from ordinary member candidates. Becoming an admin is an explicit authorized membership change; Jev never infers it from job duties. |
| Candidates | Code supplies delegable registered Actions from enabled capabilities. The registry defines required dependencies and default data access. |
| Jev Choice | Match duties to an available role bundle + `none`; `none` allows an owner-defined role. Explicit restrictions match predefined policy options. |
| Jev Noul | For a custom role or proposed changes, ask per eligible Action whether the duties require it. Several Actions can be proposed together. |
| Data access | Current workspace is implicit. Selected Actions supply necessary read/write fields and default record scope; no routine field picker. Interpret stated restrictions and clarify ambiguity. |
| Review | Owner sees a short role/permission summary; details expand on demand. Ask about unclear or unsupported duties; role names never grant access. |
| Save | Code validates and audits the role definition and member assignment. Grants are workspace-scoped data; owner/admin authority remains explicit. |
| Reuse | Other members can receive the same saved role without rerunning Jev; multiple roles combine grants with their scope conditions. |

```text
Owner: "Ravi can cashier and manage products"
  Choice -> cashier bundle; Noul -> pos.product.save
  Code   -> inherited data access; Ravi remains a member
  Owner saves -> explicit member grants
                             |
     enabled capabilities + saved grants + interfaces
                             |
                shared source access policy
                  /                     \
            allowed Tools          Inbox -> Now
                  \                     /
                   tap -> source recheck
```

| Shared rule | Result |
| --- | --- |
| Access | Every read/commit checks membership, capability, grants, scope, state and access windows. Unknown roles deny; revocation blocks the next source use. |
| Projection | Code derives Tools without AI or a second permission list. Now retains work across authorized workspaces; Space changes focus, not authority. |
| AI | Choice selects one option with confidence; Noul returns yes-probability. Batch independent questions; dependent choices need updated state. Evaluate thresholds; manual setup survives AI failure. |
| Freshness | Cache by identity/access, source and registry versions, context/request and question/model version. Refresh relevant changes; cached results never authorize source use. |
| Core | Reuse Records, registered Actions, idempotency/audit, Commerce and existing Flows. Step approvals and site publication remain source rules. |
| Meaning | Approving a refund and issuing it need distinct registered Actions when they are separate business steps. Missing operations ask for clarification; no substitute execution. |
| Build | Implement shared grants and both setup steps; migrate delegable business Actions from fixed owner/admin checks while preserving existing access. New behavior needs registered code. |
| Naming | New internal identifiers use one lowercase semantic word; preserve existing interfaces and external spellings. |
| Jev docs | [Choice](https://docs.typesafe.ai/primitives/choice), [Noul](https://docs.typesafe.ai/primitives/noul), [Confidence](https://docs.typesafe.ai/confidence), [Batching](https://docs.typesafe.ai/patterns/fan-out). |
