# Shared Sites Worker

The site contract is the [Agentic Site](../agenticsite.md) document. The initial public address is
`https://tar-sites.tar-54d.workers.dev/<workspace>/`, using the workspace's unique
reserved slug. No purchased domain, wildcard
DNS or customer certificate is needed. The account subdomain comes from the
existing app configuration; verify it in the deployment output.

`tarharness/wrangler.jsonc` sets `SITE_WORKER_ORIGIN`. The Sites Worker has
`workers_dev` enabled. Both Workers must bind the same CONTROL D1 database and
SITE_RELEASES R2 bucket. Do not deploy with a placeholder origin.

The serving Worker and `0004_sites.sql` migration were deployed on 2026-09-28.
Worker version: `1715d72f-bdab-4d30-8f8b-d949df6d35a2`. Live HTTPS checks verified
the shared robots response (200) and an unknown workspace (404). The publishing
API/editor changes have not been deployed; the complete release gate is still
open. A serving Worker deployment alone does not publish any workspace site.

## Release

Run these from `tarharness` with an authenticated Cloudflare account:

```powershell
npm test
npm run check
npx wrangler d1 migrations apply CONTROL --remote
npx wrangler deploy --config ../sites/wrangler.jsonc
npm run deploy
```

Review migration effects and test results before running the remote migration or
deploying. The standalone Sites Worker can be deployed independently after its
serving and D1/R2 integration tests pass; the main harness deployment requires
the full release gates. Deployment does not complete the planned editor; delivery
and acceptance are tracked in section 11 of the [Agentic Site contract](../agenticsite.md).

Generate a draft, compile it, review every candidate page, then confirm Publish.
Verify the returned HTTPS URL, navigation, catalog, canonical metadata and
sitemap. Repeat with a second workspace. Unpublish the first and confirm it
returns 404 while the second remains available. Republish and test rollback.

## Serving and recovery

CONTROL is checked on the primary before every public object read, including
HEAD requests. A missing, inactive or mismatched workspace/release returns 404
or 503 with `no-store`; no workspace database or legacy rendering fallback is
used by this Worker. The shared root `/robots.txt` allows crawling. Each site has
its own scoped sitemap, which can be submitted separately to a search engine.

Publish stores the immutable candidate in R2, activates CONTROL, then updates
the workspace projection. If the last step fails, CONTROL may already serve the
reviewed candidate. Check the live pointer before retrying; do not delete release
objects or reset CONTROL from stale workspace data. Unpublish clears serving
authority first. Retain referenced manifests, files and source snapshots for
rollback. Monitor `sites.serve.error`, 503 responses and publication failures.

## Adding a domain later

The domain is expected next week. Keep the Worker address until the verified
domain works over HTTPS. Hostname routing remains available, but moving to it
requires reviewed candidates with the new canonical URL and tested redirects
from workspace-prefixed links to equivalent page routes. Switch origin
configuration only with that transition ready. Customer domains still require
ownership and certificate verification before activation; the retained hostname
route is not a complete custom-domain onboarding system.

Cloudflare [recommends routes or custom domains](https://developers.cloudflare.com/workers/configuration/routing/)
for business-critical production traffic rather than Workers.dev. Treat this address as the user's chosen initial
hosting option, and plan a verified custom-domain rollout before that threshold.
