# POS Bot

The directory installs one POS Bot with selectable Sell, Orders & returns, Stock, Customers and Register launch cards. The workspace shows live net sales today, today's order count and low-stock count. These are derived from retail records in the existing workspace database.

## Available

- Phone product grid with cart screen; tablet products beside cart.
- Store name, location, currency, timezone and receipt footer.
- Progressive product entry: name, price, opening stock and image first; SKU, barcode, category, brand, variant, unit, cost, tax, supplier and stock threshold on demand.
- Compact searchable product fields stay in Turso. Long descriptions, specifications and authorized source-page notes are stored as private, workspace-scoped R2 objects; Turso keeps only their object key, byte count and short summary.
- Optional AI drafting suggests catalog wording and classification from facts entered by the user. It never sets price, tax, barcode, SKU or stock, and every suggestion remains editable before save.
- Stock receiving and adjustments with reasons and a movement ledger.
- Customer details, assignment to a sale and purchase history.
- Cash with change calculation; UPI recorded after the cashier confirms receipt and supplies a unique transaction reference.
- Server-priced checkout with percentage discounts and tax calculated in integer minor units.
- Shareable receipts; full and partial returns with optional restocking and cumulative rounding.
- One active register per workspace, cash opening/counting and reconciliation. UPI is excluded from drawer cash.
- Version checks, transactional stock/payment/order writes, idempotent operations, completed Flow runs and audit events.
- Device-local pending-operation recovery scoped to the signed-in user and workspace. A pending operation must be resolved before another mutation.
- Owner/admin control of store settings, products, stock and refunds; members can sell, manage customers and operate the register.

## Boundaries

This is the single-store release. No hardware integrations are included. UPI verification is manual; TAR does not initiate or verify bank transfers. Sales require a connection. Pending-operation recovery handles interrupted requests, not offline sales settlement.

The UI follows the reference's retail layout, with TAR branding. Exact pixel matching to every Shopify screen has not been verified.

Multi-location transfers, online fulfilment, automatic loyalty/store credit, integrated UPI verification and offline checkout remain separate extensions. Exchanges currently use a return followed by a new sale. There is no claim of Shopify feature parity.

## Data and cost

Existing records store pos.settings, pos.product, pos.customer, pos.order, pos.payment, pos.movement and pos.register. Historical orders snapshot prices, tax, currency and receipt details. Reports use payments and orders; no duplicated report records or AI calls are needed for checkout. Product/customer/order lists are searched and paginated in batches of 100.

Product content objects use `workspaces/{workspaceId}/products/{productId}/content-v{version}.json`. A source URL and a normalized, authorized snapshot can be retained for provenance; TAR does not automatically copy an entire marketplace page. Replaced content objects are deleted after the new product version commits.

## Validation

Run npm run verify in tarharness and npm run release:check in tarapp. POS tests cover totals/rounding, retries, stock validation, UPI references, partial returns, permissions, cash reconciliation and Flow audit records.
