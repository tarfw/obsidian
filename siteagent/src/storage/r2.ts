/**
 * r2.ts
 * Invariant: Durable, strongly-consistent object storage for instant global read-after-write.
 */

export async function putR2Page(r2: R2Bucket, subdomain: string, route: string, html: string): Promise<void> {
  const normalizedRoute = route === '/' ? 'index.html' : `${route.replace(/^\//, '')}/index.html`;
  const key = `sites/${subdomain}/${normalizedRoute}`;
  await r2.put(key, html, {
    httpMetadata: {
      contentType: 'text/html; charset=utf-8'
    },
    customMetadata: {
      publishedAt: Date.now().toString()
    }
  });
}

export async function getR2Page(r2: R2Bucket, subdomain: string, route = '/'): Promise<string | null> {
  const normalizedRoute = route === '/' ? 'index.html' : `${route.replace(/^\//, '')}/index.html`;
  const key = `sites/${subdomain}/${normalizedRoute}`;
  const obj = await r2.get(key);
  if (!obj) return null;
  return await obj.text();
}
