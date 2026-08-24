# Tar Data Architecture

## Authority

| Store | Authoritative data |
|---|---|
| D1 `CONTROL` (`control`) | Identity, workspace routes, membership, wallets, ledger, payments, service renewals, agent prices and run settlement |
| Personal Turso | Personal matter, motion, graph and inbox projections |
| Workspace Turso | Workspace matter, motion and graph |
| R2 | OKF, site artifacts, cold archives and exported run summaries |
| Analytics Engine | Usage, latency, model cost and D1 capacity telemetry after account activation |

TarApp never receives a write credential. Tarai verifies identity and membership in D1, resolves the Turso host, and performs writes. The Turso Platform token and database token are Worker secrets.

## Operations

1. Configure the secrets listed in `.env.example` with `wrangler secret put`.
2. Apply each versioned file in `d1/migrations` locally with `wrangler d1 execute control --local --file FILE`.
3. Apply the same files remotely with `wrangler d1 execute control --remote --file FILE`.
4. Deploy only after `npm test`, `npm run check:types`, `npm run build`, and `npx wrangler deploy --dry-run` pass.

Analytics calls are optional in code. Enable Analytics Engine for the Cloudflare
account, then restore the `USAGE` dataset binding; Cloudflare currently rejects
that binding until the account feature is activated.

The scheduled handler starts idempotent renewal workflows, applies the 7-day grace and 30-day cold lifecycle, exports run summaries older than 90 days to `control/runs/` in R2, and reports D1 size. Plan a regional control shard at 5 GB and complete it before 8 GB.

## Recovery

D1 Time Travel is automatic. Before a risky migration, record a bookmark:

```sh
npx wrangler d1 time-travel info control
```

To identify a recovery bookmark without changing data:

```sh
npx wrangler d1 time-travel info control --timestamp="2026-08-24T12:00:00Z"
```

Restoration overwrites the live database and must be run manually after approval:

```sh
npx wrangler d1 time-travel restore control --bookmark=BOOKMARK
```

Retain the `previous_bookmark` returned by restore so the operation can be undone.
