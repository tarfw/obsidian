# TAR Harness

Worker under development for TAR's Records, Actions and Flows model. Effect v4 runs the typed Action Gateway; Cloudflare supplies HTTP, D1 control data, Queues and scheduled recovery; Turso stores one operational database per workspace. A passing build or dry run does not certify the full [target architecture](../tarv12.md).

## Members and team chat

TAR manages members once. Space is the main workspace view; Inbox shows eligible work. Slack, Discord and Google Chat use verified identity links and the same TAR permissions. See [setup, supported commands and deployment requirements](docs/team-chat.md). Apply D1 migration `0003_team_chat.sql` before deploying this version.

## What is implemented

- Google OIDC verification and workspace membership checks.
- D1 control plane for users, workspaces and members.
- Turso workspace provisioning and Records, Links, Definitions, Editions, Runs, Events, Turns and Consents storage.
- Gateway execution for registered record, contact, relationship, consent, task, POS, site and Flow actions. The legacy direct definition write route has been removed.
- Scoped idempotency with input fingerprints and Action audit events. Jev and web-search requests claim a turn before paid work so concurrent same-key requests reuse one result.
- Server-side contact search and pagination, explicit consent history, published Flow Book editions and manually advanced runs. A Workflow runner and D1 dispatch intent execute reviewed internal steps; crash and live device gates remain to be proven.
- Authoritative Action and interface-contract registries exposed by `GET /v1/actions`.
- Workspace Space data exposed by the compatibility endpoint `GET /v1/workspaces/:slug/canvas`.
- Native TAR App registry that maps interface keys to reusable form, confirmation and Flow screens.

## Space and Flow Books

`GET /v1/workspaces/:slug/canvas` builds the Space from current domain data, eligible registered actions, and published Flow Books. It does not load executable UI or definitions from old `kit` records. `GET /v1/workspaces/:slug/flows` exposes versioned books and their runs.

New workspace schemas accept only `flow` and `record_type` definitions. When an existing workspace opens, the `recipes` patch converts safe published directory recipes into manual Flow Books with every step requiring a human action. It archives unsafe legacy recipes and old `bot`/`kit` definitions while retaining their rows, editions, runs, records and events for audit. Bot installation and the directory endpoints are retired.

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

3. Stage provider secrets without committing their values or changing production traffic:

   ```sh
   npx wrangler versions secret put TURSO_PLATFORM_TOKEN
   npx wrangler versions secret put TINYFISH_API_KEY
   npx wrangler versions secret put TYPESAFE_API_KEY
   ```

   `wrangler secret put` deploys immediately; use the versioned command until the release gates below pass. Inspect the final staged version with `wrangler versions view <version>` to confirm all required secret names are present. Secret values are never committed or displayed in the app.

   `web.search` is unavailable until `TINYFISH_API_KEY` is configured. It calls TinyFish
   Search from the Worker and returns a bounded list of public sources; the client never
   receives the provider key.

   The Flow Book builder shows Jev's first-step suggestion only when `TYPESAFE_API_KEY`
   is configured. Jev can choose from the registered, supported actions; an owner or
   admin must review and add the suggestion before publication.

4. Apply the control migrations, including `0004_dispatches.sql`, and validate:

   ```sh
   npx wrangler d1 migrations apply tarharness-control --remote
   npm run verify
   ```

5. Treat the current `tarharness.tar-54d.workers.dev` deployment as a development check. For a production release, complete the gates in `tarv12.md`: durable Workflow execution and recovery, complete Flow Book authoring, required domain journeys, provider secrets and receipts, access and consent enforcement, and live app checks.

## Check on a device

TAR App's development build loads JavaScript from Metro. From `tarapp`, run `npx expo start --dev-client --lan`, then open the development build on a phone on the same Wi-Fi network and scan the QR code or enter the server URL. The app's `EXPO_PUBLIC_TARHARNESS_URL` must point to the deployed Worker. Native code changes require a new development build; JavaScript changes do not.

`tarai` is intentionally not part of this service. Do not copy its credentials or deployment configuration into this project.
