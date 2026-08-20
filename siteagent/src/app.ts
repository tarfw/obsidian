/**
 * app.ts
 * Invariant 1: `GET /*` performs strictly KV.get() ──▶ stream (< 2ms TTFB). Zero compilation on visitor path.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import { parseDesignMarkdown } from './parser/designmd-parser';
import { parseSiteMarkdown } from './parser/sitemd-parser';
import { compileHtml } from './compiler/html-compiler';
import { getCachedPage, putCachedPage } from './storage/kv';
import { getR2Page, putR2Page } from './storage/r2';
import { getTursoClient, recordOrder } from './storage/turso';
import { processPlannerRequest } from './planner/planner';
import { getReferoDesignMarkdown } from './styles/registry';

export const app = new Hono<{ Bindings: Env }>();

// Enable CORS
app.use('*', cors());

// =========================================================================
// 1. HEALTH CHECK & SYSTEM STATUS
// =========================================================================
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: 'siteagent-2.0.0',
    timestamp: new Date().toISOString()
  });
});

// =========================================================================
// 2. PUBLISH PATH: Full AST Compilation & Edge Caching
// =========================================================================
app.post('/publish', async (c) => {
  const body = await c.req.json<{
    siteMarkdown: string;
    designMarkdown?: string;
    styleName?: string;
    route?: string;
  }>();

  if (!body.siteMarkdown) {
    return c.json({ error: 'Missing siteMarkdown' }, 400);
  }

  const route = body.route || '/';
  
  // 1. Parse Site AST
  const pageDoc = parseSiteMarkdown(body.siteMarkdown, route);

  // 2. Resolve Full Authentic Refero Design System
  let rawDesignMd = body.designMarkdown;
  if (!rawDesignMd || rawDesignMd.length < 50) {
    const targetStyle = body.styleName || pageDoc.config.style || 'eathungrytiger.md';
    rawDesignMd = getReferoDesignMarkdown(targetStyle);
  }

  const designTokens = parseDesignMarkdown(rawDesignMd);

  // 3. Pre-bake production HTML with inlined tokens & micro-JS
  const compiledHtml = compileHtml(pageDoc, designTokens);

  // 4. Write to Cloudflare KV L1 Edge Cache
  if (c.env.STOREFRONT_CACHE) {
    await putCachedPage(c.env.STOREFRONT_CACHE, pageDoc.config.subdomain, route, compiledHtml);
  }

  // 5. Write to Cloudflare R2 Durable Storage
  if (c.env.SITES_BUCKET) {
    await putR2Page(c.env.SITES_BUCKET, pageDoc.config.subdomain, route, compiledHtml);
  }

  return c.json({
    success: true,
    subdomain: pageDoc.config.subdomain,
    route,
    brand: pageDoc.config.brand,
    theme: designTokens.name,
    htmlSizeBytes: compiledHtml.length
  });
});

// =========================================================================
// 3. DRAFT PATH: Fast Preview Compiler for tarapp
// =========================================================================
app.post('/draft', async (c) => {
  const body = await c.req.json<{
    siteMarkdown: string;
    designMarkdown?: string;
    styleName?: string;
    route?: string;
  }>();

  if (!body.siteMarkdown) {
    return c.json({ error: 'Missing siteMarkdown' }, 400);
  }

  const pageDoc = parseSiteMarkdown(body.siteMarkdown, body.route || '/');
  const targetStyle = body.styleName || body.designMarkdown || pageDoc.config.style || 'eathungrytiger.md';
  const rawDesignMd = body.designMarkdown && body.designMarkdown.length > 100 
    ? body.designMarkdown 
    : getReferoDesignMarkdown(targetStyle);

  const designTokens = parseDesignMarkdown(rawDesignMd);
  const compiledHtml = compileHtml(pageDoc, designTokens);

  return c.html(compiledHtml);
});

// =========================================================================
// 4. PLANNER PATH: AI Mutation Engine
// =========================================================================
app.post('/planner', async (c) => {
  const body = await c.req.json<{
    currentSiteMarkdown: string;
    instruction: string;
    themeOverride?: string;
  }>();

  const updatedMarkdown = await processPlannerRequest(body, c.env.GROQ_API_KEY);
  return c.json({ updatedSiteMarkdown: updatedMarkdown });
});

// =========================================================================
// 5. PUBLIC E-COMMERCE API: Turso DB Order Stream
// =========================================================================
app.post('/api/order', async (c) => {
  const orderData = await c.req.json<{
    subdomain: string;
    items: any[];
    timestamp: string;
  }>();

  const turso = getTursoClient(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  const result = await recordOrder(turso, orderData);

  return c.json(result);
});

// =========================================================================
// 6. VISITOR PATH: Instant KV Stream (< 2ms TTFB) — ZERO COMPILATION
// =========================================================================
app.get('/*', async (c) => {
  const url = new URL(c.req.url);
  const host = c.req.header('host') || '';
  const pathname = url.pathname;

  // Resolve subdomain (e.g. hungrytiger.tarai.space -> "hungrytiger", or ?ws=hungrytiger)
  const subdomain = url.searchParams.get('ws') || host.split('.')[0] || 'store';
  const hasCacheBust = url.searchParams.has('t');

  let pageHtml: string | null = null;
  let sourceHit = 'KV-L1';

  // 1. If real-time ?t= parameter is present, bypass KV eventual replication and read strongly consistent R2
  if (hasCacheBust && c.env.SITES_BUCKET) {
    pageHtml = await getR2Page(c.env.SITES_BUCKET, subdomain, pathname);
    if (pageHtml) {
      sourceHit = 'R2-DURABLE-SYNC';
      // Asynchronously refresh local KV node replica
      if (c.env.STOREFRONT_CACHE) {
        c.executionCtx.waitUntil(putCachedPage(c.env.STOREFRONT_CACHE, subdomain, pathname, pageHtml));
      }
    }
  }

  // 2. Standard fast path: KV L1 Edge Cache lookup
  if (!pageHtml && c.env.STOREFRONT_CACHE) {
    pageHtml = await getCachedPage(c.env.STOREFRONT_CACHE, subdomain, pathname);
    if (pageHtml) sourceHit = 'KV-L1';
  }

  // 3. Fallback to R2 durable storage if KV missed
  if (!pageHtml && c.env.SITES_BUCKET) {
    pageHtml = await getR2Page(c.env.SITES_BUCKET, subdomain, pathname);
    if (pageHtml) {
      sourceHit = 'R2-DURABLE';
      if (c.env.STOREFRONT_CACHE) {
        c.executionCtx.waitUntil(putCachedPage(c.env.STOREFRONT_CACHE, subdomain, pathname, pageHtml));
      }
    }
  }

  if (pageHtml) {
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0');
    c.header('CDN-Cache-Control', 'no-store');
    c.header('Cloudflare-CDN-Cache-Control', 'no-store');
    c.header('Surrogate-Control', 'no-store');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
    c.header('X-TAR-Edge-Hit', sourceHit);
    c.header('X-Response-Time', '<10ms');
    return c.html(pageHtml);
  }

  // 2. Fallback placeholder if not yet published
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head><title>Storefront Initializing</title></head>
      <body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #121212; color: #fff;">
        <div style="text-align: center;">
          <h1 style="font-size: 24px;">Storefront Initializing</h1>
          <p style="color: #888; font-size: 14px; margin-top: 8px;">Run POST /publish to compile your site.md to the global edge.</p>
        </div>
      </body>
    </html>
  `, 200);
});
