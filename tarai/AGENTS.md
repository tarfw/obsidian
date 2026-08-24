# AGENTS.md

This is the v1 Tarai Worker. It is request/response and intentionally has no
application Durable Objects. Flue remains an optional future conversation layer.

## Layout

- `src/modules/` — deterministic Tarai modules and bounded model integration.
- `src/app.ts` — the route map; every route is mounted here explicitly.
- `src/cloudflare.ts` — Worker-level exports and non-HTTP handlers.
- `wrangler.jsonc` — Worker config and bindings. Add Flue migrations only when the
  optional persistent conversation feature is explicitly enabled.

## Commands

- `npm run dev` — start the dev server.
- `npm run deploy` — build and deploy the Worker.
- `npm run check:types` — typecheck.
