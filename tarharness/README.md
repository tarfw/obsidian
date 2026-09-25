# TAR Harness

Cloudflare Worker for TAR’s identity, workspace isolation, Action Gateway,
commerce kernel, adaptive Space, unified Inbox, durable Flow Books, sites and
channel ingress. The canonical architecture is [tarv12.md](../tarv12.md).

## Local checks

```sh
npm install
npm run check
npm test
npx wrangler deploy --dry-run
```

## Production resources

| Binding | Resource |
| --- | --- |
| `CONTROL` | D1 control database; apply `migrations/0001_control.sql` to a clean database |
| `OUTBOX` | queue for verified channel work |
| `FLOWS` | durable Flow Book workflow |
| `PRODUCT_CONTENT` | private catalog content bucket |
| `SITE_RELEASES` | immutable site release bucket |
| `AI` | optional Cloudflare Workers AI binding |

Required Worker secrets include Turso provisioning credentials. Jev, search and
chat provider secrets are optional; their related Actions are unavailable until
configured. Never put server secrets in Expo variables.

The complete workspace schema is applied when a database is provisioned.
Ordinary Space and Inbox reads only open the database and query it. Turso
database tokens are reused briefly per warm Worker instance; a failed token
request is retried on the next request. Workspace failures are logged with
`workspace.open.failed` or `workspace.query.failed` and a safe diagnostic code
is returned to the app.

```sh
npm run deploy
```

The Worker exposes health at `/health`, authenticated product APIs under `/v1`,
and published sites under `/v1/sites/:slug/*`.
