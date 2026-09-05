# TAR Harness

Production Worker for TAR's Records, Actions and Flows model. Effect v4 runs the typed Action Gateway; Cloudflare supplies HTTP, D1 control data, Queues and scheduled recovery; Turso stores one operational database per workspace.

## What is implemented

- Google OIDC verification and workspace membership checks.
- D1 control plane for users, workspaces and members.
- Turso workspace provisioning and the Records / Links / Definitions / Runs / Events / Outbox schema.
- Mandatory Gateway execution for `record.create`, `record.update`, `task.create`, `task.complete` and `flow.start`.
- Scoped idempotency with input fingerprints and immutable Action audit events.
- Native TAR App client and workspace UI for Records and Inbox Tasks.

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
