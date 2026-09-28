# Site v2 implementation plan

`sitev2.md` is the product contract. This file records implementation and release
gates. A checked item means code exists and its local acceptance checks pass; it
does not imply a live deployment has been verified.

## Foundation

- [ ] Replace fixed v1 cards and themes with a versioned v2 document of pages,
  sections, typed nodes, reusable components, design tokens, assets, bindings,
  journeys and redirects.
- [ ] Parse and export `design.md` as a view of the typed design; retain the
  original reference, hash, conflict decisions and revision history.
- [ ] Migrate v1 definitions through a versioned adapter while retaining the v1
  compiler for immutable old releases. Do not delete old release objects.
- [ ] Validate all node kinds, CSS properties and values, URLs, component
  references, cycles, depth, size, accessibility essentials and asset rights.

## Creation and editing

- [ ] Compose a complete v2 draft from a brief and approved workspace facts with
  a capable LLM. Keep factual commerce data and permissions in code.
- [ ] Use Jev only for bounded semantic choices, ranking or evidence checks;
  keep exact values and policy decisions deterministic.
- [ ] Build durable, budgeted generation and repair jobs with checkpoints,
  cancellation and stale-revision protection.
- [ ] Provide page and section selection, scoped edits, ordering, locks, undo,
  assets, responsive preview and release history in one editor.
- [ ] Render and inspect every route at mobile, tablet and desktop widths;
  resolve blocking compiler, browser and accessibility failures before publish.

## Publication and hosting

- [x] Persist immutable candidate files, source snapshots and manifests in R2.
- [x] Require a candidate ID, hash and unchanged draft revision to publish.
- [x] Use CONTROL D1 as the live serving gate for the shared Sites Worker;
  publish activates CONTROL before updating the workspace projection.
- [x] Serve expiring, scoped candidate previews with `no-store` and `noindex`.
- [x] Refresh from the published source snapshot, not newer draft edits.
- [x] Block public serving on unpublish and retain release history for rollback.
- [x] Compile canonical metadata, sitemap and robots with the candidate.
- [x] Freeze and check the expected CONTROL epoch before candidate activation.
- [x] Require an explicit catalog record allowlist; select current prices by
  channel and date, and reject rollback when approved public facts changed.
- [x] Remove the legacy public Turso fallback; old API URLs redirect only through
  active CONTROL authority.
- [x] Support a shared `workers.dev/<workspace>/` publication address without a
  purchased domain; retain hostname routing for a later custom domain.
- [x] Deploy the Sites Worker and CONTROL migration; verify live HTTPS, the shared
  robots policy and an unknown-workspace 404.
- [ ] Deploy the publishing API/editor integration and verify two independently
  published workspace sites over HTTPS on the real Workers.dev host.
- [ ] Migrate retained v1 live pointers into CONTROL and verify old public URLs.
- [ ] Add reconciliation for interrupted CONTROL/R2/Turso projections and
  garbage collection for abandoned candidates and unreferenced assets.
- [ ] Prove rollback and host changes against current visibility and canonical
  URL rules; exercise conflict and outage recovery in deployed infrastructure.

## Domains, content and transactions

- [ ] Verify customer-domain ownership, provider hostname and certificate
  activation, DNS target and safe removal before serving a custom host.
- [ ] Add public collection/detail templates and approved field allowlists with
  freshness, pagination, empty and error behavior.
- [ ] Connect enabled enquiry, order, booking and payment journeys to registered
  Gateway Actions with abuse controls, identity, idempotency and current policy.
- [ ] Verify payment webhooks and the shared commerce lifecycle end to end.

## Release gates

- [ ] Full harness, app and Sites Worker suites pass on a clean checkout.
- [ ] Resolve or formally assess the app dependency audit findings, including
  the Expo Router decoding advisory; do not force an unsupported Expo downgrade.
- [ ] Cross-workspace access, stale edits, interrupted builds, refresh isolation,
  rollback, domain takeover, missing data and narrow screens pass representative
  tests and browser checks.
- [ ] Production bindings, migrations, DNS, TLS, quotas, monitoring, backup and
  rollback procedures are configured and exercised.
- [ ] An operator has reviewed factual content and the exact candidate before
  the first public publish.
