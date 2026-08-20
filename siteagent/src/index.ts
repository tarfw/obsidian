/**
 * index.ts
 * Cloudflare Worker entrypoint delegating to Hono app.
 */

import { app } from './app';

export default {
  fetch: app.fetch
};
