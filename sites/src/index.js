const MAX_MANIFEST = 1024 * 1024;
const MAX_HTML = 2 * 1024 * 1024;

function filePath(pathname) {
  if (/%(?:2f|5c|00|25)/i.test(pathname)) return null;
  let path;
  try { path = decodeURIComponent(pathname); } catch { return null; }
  if (!path.startsWith('/') || /[\\\u0000-\u001f]/.test(path) || path.split('/').some((part) => part === '.' || part === '..')) return null;
  if (path === '/') return '/index.html';
  if (path.endsWith('/')) return `${path}index.html`;
  return /\.[^/]+$/.test(path) ? path : `${path}/index.html`;
}

function mime(path) {
  if (path.endsWith('.html')) return 'text/html; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.avif')) return 'image/avif';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.woff2')) return 'font/woff2';
  if (path.endsWith('.woff')) return 'font/woff';
  if (path.endsWith('.xml')) return 'application/xml; charset=utf-8';
  if (path.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return null;
}

function response(status, body) {
  return new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}

async function securityHeaders(contentType, html) {
  const hashes = [];
  if (html) {
    for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(match[1])));
      hashes.push(`'sha256-${btoa(String.fromCharCode(...digest))}'`);
    }
  }
  return {
    'content-security-policy': [
      "default-src 'none'", "base-uri 'none'", "object-src 'none'", "form-action 'self'", "frame-ancestors 'none'",
      `script-src 'self'${hashes.length ? ` ${hashes.join(' ')}` : ''}`,
      "style-src 'self' 'unsafe-inline'", "img-src 'self' https: data:", "font-src 'self' data:", "connect-src 'none'",
    ].join('; '),
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  };
}

export default {
  async fetch(request, env) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return response(405, 'Method not allowed');
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const shared = /^tar-sites\.[a-z0-9-]+\.workers\.dev$/.test(host);
    if (shared && url.pathname === '/robots.txt') return new Response(request.method === 'HEAD' ? null : 'User-agent: *\nAllow: /\n', {
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
    });
    const match = shared ? /^\/([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?=\/|$)/.exec(url.pathname) : null;
    if (shared && !match) return response(404, 'Site not found');
    const slug = match?.[1];
    const path = filePath(shared ? (url.pathname.slice(match[0].length) || '/') : url.pathname);
    if (!path) return response(400, 'Invalid path');
    try {
      // D1 is consulted before any object or cache lookup, including on HEAD.
      const query = shared
        ? "SELECT s.workspace,s.site,s.release,s.hash,s.epoch,s.domain FROM workspaces w JOIN sites s ON s.workspace=w.id WHERE w.slug=? AND w.state='active' AND s.domain=? AND s.mode='path' AND s.status='active' AND s.release<>'' LIMIT 1"
        : "SELECT s.workspace,s.site,s.release,s.hash,s.epoch,s.domain FROM hosts h JOIN sites s ON s.workspace=h.workspace AND s.site=h.site JOIN workspaces w ON w.id=s.workspace WHERE h.name=? AND h.status='active' AND w.state='active' AND s.mode='host' AND s.status='active' AND s.release<>'' LIMIT 1";
      const site = await env.CONTROL.withSession('first-primary').prepare(query).bind(...(shared ? [slug, host] : [host])).first();
      if (!site) return response(404, 'Site not found');
      if (shared && url.pathname === `/${slug}`) {
        url.pathname += '/';
        return new Response(null, { status: 308, headers: { location: url.toString(), 'cache-control': 'no-store' } });
      }
      if (!shared && host !== site.domain) {
        const target = new URL(request.url);
        target.hostname = site.domain;
        return new Response(null, { status: 308, headers: { location: target.toString(), 'cache-control': 'no-store' } });
      }
      const prefix = `workspaces/${site.workspace}/sites/${site.site}/releases/${site.release}`;
      const object = await env.SITE_RELEASES.get(`${prefix}/manifest.json`);
      if (!object || !object.body || object.size > MAX_MANIFEST) return response(503, 'Release unavailable');
      const manifest = await object.json();
      if (manifest.id !== site.release || manifest.siteId !== site.site || manifest.hash !== site.hash
        || (manifest.host && manifest.host !== site.domain) || !Array.isArray(manifest.files)) return response(503, 'Release unavailable');
      const file = manifest.files.find((entry) => entry.path === path);
      if (!file) return response(404, 'Page not found');
      const contentType = mime(path);
      if (!contentType || file.key !== `${prefix}${path}` || file.mime !== contentType || !Number.isSafeInteger(file.bytes) || file.bytes < 0) return response(503, 'Release unavailable');
      const isHtml = contentType.startsWith('text/html');
      const asset = request.method === 'HEAD' && !isHtml ? await env.SITE_RELEASES.head(file.key) : await env.SITE_RELEASES.get(file.key);
      if (!asset || asset.size !== file.bytes) return response(503, 'Release unavailable');
      if (isHtml && (asset.size > MAX_HTML || !asset.body)) return response(503, 'Release unavailable');
      let html = isHtml ? await asset.text() : null;
      if (html && shared) html = html.replaceAll('href="/', `href="/${slug}/`).replaceAll('src="/', `src="/${slug}/`);
      const headers = new Headers({
        'content-type': contentType,
        'content-length': String(isHtml ? new TextEncoder().encode(html).byteLength : asset.size),
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'x-frame-options': 'DENY',
        ...await securityHeaders(contentType, html),
      });
      return new Response(request.method === 'HEAD' ? null : isHtml ? html : asset.body, { status: 200, headers });
    } catch (error) {
      console.error(JSON.stringify({ event: 'sites.serve.error', message: String(error) }));
      return response(503, 'Site unavailable');
    }
  },
};
