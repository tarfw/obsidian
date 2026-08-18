# CLAUDE.md

Guidance for Claude Code / coding agents working in this workspace.

## What this repo is

**TAR** ("tarfw") — a platform for building AI-powered business workspaces and
edge-served storefronts. It is **not a single app**: the root holds several
independent, separately-installed projects plus supporting assets. There is no
root `package.json`; each subproject manages its own dependencies.

Real product flow (context for the pieces):
1. **tarapp** (Expo mobile app) — user creates a workspace ("one-message creation"
   via AI business extraction) and drives an AI site/storefront builder.
2. **taragent** (Cloudflare Worker API) — backend: workspaces, channels (Telegram,
   Discord, Slack, Google Chat), S3 storage, OKF (the site-format system), Turso/D1
   data, cron jobs.
3. **tarsite** (Cloudflare Worker) — the **UIPlan runtime engine**: compiles
   `design.md` → UIPlan AST → HTML, served at `*.tarai.space`. This is the live
   storefront server.
4. **brandingsite** (Astro) — the marketing/branding landing page website for TAR app.

Supporting dirs: `docs/` (architecture & design specs, see below), `config/` (workspace
type→module presets), `scripts/` (Windows cleanup/util scripts, unrelated to the
build).

## Directory map

| Path | What | Stack |
|---|---|---|
| `tarapp/` | Mobile app | Expo SDK 56, RN 0.85, expo-router, React 19, TypeScript |
| `taragent/` | Backend API worker | Hono + Cloudflare Workers, D1, R2/S3, Turso (libsql) |
| `tarsite/` | Edge storefront runtime | Hono worker, Zod, design.md→HTML compiler |
| `brandingsite/` | Marketing/branding landing page | Astro 6 |
| `config/presets.yaml` | business-type → module presets | YAML |
| `docs/` | architecture & design specs | Markdown |
| `scripts/` | Windows cleanup/util PowerShell/bat | — |

## The tarsite design.md → HTML pipeline (core concept)

Most work happens here. Key files in `tarsite/src/`:

- `types.ts` — **versioned Zod contracts**: `UIPlan`, `UIRoute`, `UINode` (recursive
  layout AST), `Binding`, `DesignTokens`. Separation of layout / data bindings /
  visual tokens is an absolute rule (see file header). No code-string execution.
- `designmd-parser.ts` — `parseDesignMd(md, workspaceId)` → `UIPlan`.
- `planner.ts` — `compileUIPlan(...)` compiles plan (may hit AI).
- `validator.ts` — `validateUIPlanGate(...)` gates plan correctness.
- `router.ts` / `resolver.ts` — route matching and data binding resolution.
- `html-builder.ts` / `layout-blocks.ts` / `tokens.ts` / `style-engine.ts` — render
  UINode AST + DesignTokens → HTML/CSS.
- `app.ts` — Hono routes: `/publish`, `/draft`, `/planner`, form submissions.
- `designs/*.md` — design specs (milo, kith, empire, eql, joandso, planhat).

Example design.md: `tarsite/test-design.ts` and `tarsite/test-render.ts` embed sample
`design.md` and exercise `parseDesignMd` → `compileRouteToHtml`.

## Build / test / run commands

Each project is independent — `cd` into it first.

### tarapp (Expo mobile)
```bash
cd tarapp
npm install
npm start            # expo start
npm run android      # expo start --android
npm run ios          # expo start --ios
npm run lint         # expo lint
```
Typecheck via `npx tsc --noEmit`. File-based routing under `src/app/` (expo-router).

### taragent (Cloudflare Worker API)
```bash
cd taragent
npm install
npx wrangler dev     # local dev (uses wrangler.jsonc bindings)
npx wrangler deploy  # deploy to Cloudflare
```
No test suite configured (`npm test` is a stub). D1 migrations live in
`taragent/migrations/*.sql`. Set secrets before use — see `docs/setup.md`.
Entry: `src/index.ts` (fetch + scheduled cron handlers) → `src/app.ts` (Hono routes).

### tarsite (Edge storefront runtime)
```bash
cd tarsite
npm install
npm run build        # tsc --noEmit (typecheck; the real check)
npx wrangler dev src/app.ts
npx wrangler deploy src/app.ts
```
Manual test harnesses (no runner declared; run with `npx tsx`):
```bash
cd tarsite
npx tsx test-design.ts
npx tsx test-render.ts
npx tsx test-okf.ts
```
`tsx` is not a declared dependency — install ad-hoc (`npx tsx`) or run via `node --loader`.

### site (Astro marketing site)
```bash
cd site
npm install
npm run dev          # astro dev
npm run build        # astro build (outputs to dist/)
npm run preview      # astro preview
```
Source in `src/pages` (`index.astro`, `dashboard.astro`, `plan.astro`),
`src/components`, `src/layouts/Layout.astro`, `src/styles/global.css`.

## Conventions

- **TypeScript everywhere** with strict Zod schema validation for contracts.
  `tarsite/src/types.ts` is the canonical source of the UIPlan contract.
- **Expo SDK is version-pinned.** `tarapp/CLAUDE.md` → `AGENTS.md` explicitly says:
  read the versioned docs at `https://docs.expo.dev/versions/v56.0.0/` before writing
  code — Expo APIs changed; do not assume older signatures.
- **Absolute rule (tarsite):** separation of layout structures, data bindings, and
  visual tokens. Zero code-string execution in the renderer.
- **Workspace scoping:** workspaces use `w:<subdomain>` scopes (`scope` = `w:...`).
  User is identified via `X-User-Id` header in the agent API (defaults to `guest`).
- **Storage split:**
  - `taragent`: D1 `DB`, R2 `BUCKET` (tar-storage), KV `STOREFRONT_CACHE`, Turso (libsql) via `TURSO_*` vars.
  - `tarsite`: D1 `DB`, R2 `THEMES_BUCKET` (tar-themes) & `SITES_BUCKET` (tar-sites), KV `STOREFRONT_CACHE`.
  - Both use Turso (`libsql://global-tarapp.aws-eu-west-1.turso.io`) as primary SQL.
- **AI usage:** LLM via `GROQ_API_KEY` (and Anthropic per docs). AI-generated layouts
  are validated against Zod schemas before use (`validateUIPlanGate`).
- **Cron (taragent):** every-minute stock expiry scan; 6 AM expiry alerts; 3 AM
  maintenance prune — defined in `src/index.ts` `scheduled` handler.

## Documentation

- `docs/METHOD_B_ARCHITECTURE.md` — end-to-end design.md→HTML deploy architecture and
  known failure modes (fallback render loops, property-name aliasing).
- `docs/setup.md` — required secrets & local dev.
- `docs/okf.md`, `docs/turso.md`, `docs/turso`-related, `docs/*.md` — feature specs.
- `taragent/src/modules/dbrules.md` — DB rules; `taragent/src/lib/okf.ts` — OKF system.
- `docs/DESIGN-*.md`, `tarsite/designs/*.md` — design specs.

## Security note

`taragent/wrangler.jsonc` and `tarsite/wrangler.jsonc` contain **live secrets
committed in-repo** (Turso auth/group tokens, Railway S3 access/secret keys,
GROQ API key). These should be rotated and moved to `wrangler secret` / env vars.
Do not echo or log them.
