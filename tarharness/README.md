# TAR Harness

Production Worker for TAR's Records, Actions and Flows model. Effect v4 runs the typed Action Gateway; Cloudflare supplies HTTP, D1 control data, Queues and scheduled recovery; Turso stores one operational database per workspace.

## What is implemented

- Google OIDC verification and workspace membership checks.
- D1 control plane for users, workspaces and members.
- Turso workspace provisioning and the Records / Links / Definitions / Runs / Events / Outbox schema.
- Mandatory Gateway execution for `record.create`, `record.update`, `task.create`, `task.complete` and `flow.start`.
- Scoped idempotency with input fingerprints and immutable Action audit events.
- Authoritative Action and interface-contract registries exposed by `GET /v1/actions`.
- Business-defined workspace canvases exposed by `GET /v1/workspaces/:slug/canvas`.
- Native TAR App registry that maps interface keys to reusable form, confirmation and Flow screens.

## Business canvas definition

A published `kit` definition may contain `data.canvas.cards`. Cards contain no execution logic; they bind to registered data, Actions or published Flows:

```json
{
  "canvas": {
    "cards": [
      { "id": "open-work", "kind": "data", "title": "Open work", "metric": "tasks.open" },
      { "id": "new-customer", "kind": "action", "title": "Add customer", "actionId": "record.create" },
      { "id": "onboarding", "kind": "flow", "title": "Customer onboarding", "flowId": "customer-onboarding" }
    ]
  }
}
```

Supported foundation metrics are `records.count` and `tasks.open`. Without a published Kit, TAR supplies a minimal canvas with both values, Create record, Create task and every published Flow.

## Bot Directory

`GET /v1/workspaces/:slug/directory` returns ready Bots, their template Flows, and installation state. Owners and admins choose the Flows they need and add the Bot through the registered `directory.install` Action. Installation publishes the Bot definition, selected versioned Flow definitions, and a small Kit containing their canvas cards.

Custom Flows belong to an installed Bot and use the registered `flow.publish` Action. TAR App's Flow Builder orders existing registered Actions and publishes the Flow plus its canvas card through the same Gateway and idempotency checks. Removing a Bot archives its definitions while preserving Records, Runs, and audit history.

## Production setup

1. Create the D1 database and queue:

   ```sh
   npx wrangler d1 create tarharness-control
   npx wrangler queues create tarharness-outbox
   ```

2. Put the returned D1 ID in `wrangler.jsonc`, set `OIDC_AUDIENCE` and `TURSO_ORG`, then regenerate types:

   ```sh
   npx wrangler types
   ```

3. Add the Turso platform token without committing it:

   ```sh
   npx wrangler secret put TURSO_PLATFORM_TOKEN
   ```

4. Apply the control migration, validate and deploy:

   ```sh
   npx wrangler d1 migrations apply tarharness-control --remote
   npm run verify
   npx wrangler deploy
   ```

5. Set `EXPO_PUBLIC_TARHARNESS_URL` in TAR App to the deployed Worker URL, then rebuild the app.

`tarai` is intentionally not part of this service. Do not copy its credentials or deployment configuration into this project.
