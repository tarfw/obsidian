/**
 * kv.ts
 * Invariant: High-speed L1 edge cache for < 2ms TTFB delivery.
 */

export async function getCachedPage(kv: KVNamespace, subdomain: string, route = '/'): Promise<string | null> {
  const normalizedRoute = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '_');
  const key = `site:${subdomain}:${normalizedRoute}`;
  return await kv.get(key);
}

export async function putCachedPage(kv: KVNamespace, subdomain: string, route: string, html: string): Promise<void> {
  const normalizedRoute = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '_');
  const key = `site:${subdomain}:${normalizedRoute}`;
  await kv.put(key, html);
}
