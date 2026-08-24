# tarai

Tarai is the authenticated control and execution service for TarApp. D1 owns
access and credits; each person and workspace receives a dedicated Turso DB.

## Setup

```sh
npm install
```

Then configure the OIDC, Turso, Razorpay, WhatsApp, R2, and KV values described in
`.env.example` and `wrangler.jsonc`.

Razorpay is ready but intentionally disabled until its three secrets are added.
Configure `payment.captured` to POST to
`https://tarai.tar-54d.workers.dev/webhooks/razorpay`; settlement and the wallet
credit occur atomically and duplicate webhooks are harmless.

## API

```text
GET  /api/ping
GET  /api/workspaces
POST /api/workspaces
GET  /api/agents
POST /api/agents/:action/run
POST /api/payments/order
POST /api/entities/:operation
```

## Develop

```sh
npm run dev
```

The Worker API is served locally at `http://localhost:5173`; see `src/app.ts`
for the route map.

## Deploy

```sh
npm run deploy
```

## Checks

```sh
npm run check:types
npm test
npm run build
```
