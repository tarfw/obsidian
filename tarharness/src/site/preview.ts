import { badRequest, notFound, unavailable } from '../errors.ts';

const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const FRAME_WIDTHS: Record<string, number> = { phone: 360, tablet: 768, desktop: 1440 };

export interface PreviewOptions {
  frame?: string | null;
  embed?: boolean;
}

/**
 * Serve an expiring, scoped candidate preview.
 *
 * `frame` returns a width-forced wrapper (phone/tablet/desktop) so a route can be
 * reviewed at real device widths in an ordinary browser; `embed` relaxes framing
 * to same-origin for exactly that wrapper and never for public releases.
 */
export async function serveSitePreview(
  token: string,
  raw: string,
  control: D1Database,
  bucket: R2Bucket,
  securityHeaders: (html: string, mime: string) => Promise<Record<string, string>>,
  options: PreviewOptions = {},
): Promise<Response> {
  const row = await control.withSession('first-primary').prepare('SELECT workspace,site,release FROM previews WHERE token=? AND expires>?')
    .bind(token, Date.now()).first<{ workspace: string; site: string; release: string }>();
  if (!row) throw notFound('Site preview expired or was not found.');
  if (/%(?:2f|5c|00|25)/i.test(raw) || /[\\\u0000-\u001f]/.test(raw) || raw.split('/').some((part) => part === '.' || part === '..')) throw badRequest('Invalid preview path.');
  const route = raw === '/' ? '/index.html' : raw.endsWith('/') ? `${raw}index.html` : /\.[a-z0-9]+$/i.test(raw) ? raw : `${raw}/index.html`;
  const prefix = `workspaces/${row.workspace}/sites/${row.site}/releases/${row.release}`;
  const stored = await bucket.get(`${prefix}/manifest.json`);
  if (!stored || stored.size > 1_000_000) throw unavailable('Preview release is unavailable.');
  const manifest = object(await stored.json());
  const file = Array.isArray(manifest.files) ? manifest.files.map(object).find((item) => item.path === route) : undefined;
  const allowed = ['text/html; charset=utf-8', 'text/css; charset=utf-8', 'application/xml; charset=utf-8', 'text/plain; charset=utf-8', 'image/png', 'image/jpeg', 'image/webp', 'image/avif', 'font/woff2'];
  if (manifest.id !== row.release || manifest.siteId !== row.site || !file || file.key !== `${prefix}${route}` || !allowed.includes(String(file.mime))) throw notFound('Preview page was not found.');
  const artifact = await bucket.get(String(file.key));
  if (!artifact || artifact.size !== file.bytes || artifact.size > 5_000_000) throw unavailable('Preview file is unavailable.');
  const html = String(file.mime).startsWith('text/html');
  if (html && options.frame && FRAME_WIDTHS[options.frame]) {
    const width = FRAME_WIDTHS[options.frame];
    const inner = `/v1/site-previews/${token}${route === '/index.html' ? '/' : `/${route.replace(/\/index\.html$/, '/')}`}?frame=${width}&embed=1`;
    const wrapper = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Preview ${width}px</title>
  <style>
    body { margin: 0; background: #111318; color: #e6e8ee; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    header { display: flex; justify-content: space-between; padding: 10px 16px; font-size: 13px; }
    .stage { display: flex; justify-content: center; padding: 0 12px 24px; }
    iframe { width: ${width}px; max-width: 100%; height: 78vh; border: 1px solid #33363f; border-radius: 10px; background: #fff; }
  </style>
</head>
<body>
  <header><span>Device preview - ${width}px wide</span><span>Draft candidate, not published</span></header>
  <div class="stage"><iframe src="${inner}" title="Site preview at ${width} pixels"></iframe></div>
</body>
</html>`;
    return new Response(wrapper, { headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow',
      ...await securityHeaders(wrapper, 'text/html; charset=utf-8'),
    } });
  }
  const base = `/v1/site-previews/${token}`;
  const body = html ? (await artifact.text()).replaceAll('href="/', `href="${base}/`).replaceAll('src="/', `src="${base}/`) : artifact.body;
  const headers = await securityHeaders(html ? String(body) : '', String(file.mime));
  if (html && options.embed) {
    headers['Content-Security-Policy'] = String(headers['Content-Security-Policy']).replace("frame-ancestors 'none'", "frame-ancestors 'self'");
    headers['X-Frame-Options'] = 'SAMEORIGIN';
  }
  return new Response(body, { headers: {
    'Content-Type': String(file.mime), 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow',
    ...headers,
  } });
}
