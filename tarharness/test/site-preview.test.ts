import { describe, expect, it } from 'vitest';
import { serveSitePreview } from '../src/site/preview.ts';

const token = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const prefix = 'workspaces/ws/sites/site/releases/rel';
const html = '<!DOCTYPE html><html><head></head><body><a href="/catalog">Catalog</a></body></html>';
const file = { path: '/index.html', mime: 'text/html; charset=utf-8', bytes: new TextEncoder().encode(html).byteLength, key: `${prefix}/index.html` };

function fixture(active = true) {
  const reads: string[] = [];
  const env = {
    CONTROL: {
      withSession(mode: string) {
        expect(mode).toBe('first-primary');
        return { prepare: () => ({ bind: () => ({ first: async () => active ? { workspace: 'ws', site: 'site', release: 'rel' } : null }) }) };
      },
    },
    SITE_RELEASES: {
      async get(key: string) {
        reads.push(key);
        if (key === `${prefix}/manifest.json`) return { size: 200, json: async () => ({ id: 'rel', siteId: 'site', files: [file] }) };
        if (key === file.key) return { size: file.bytes, text: async () => html };
        return null;
      },
    },
  };
  return { env, reads };
}

const headers = async () => ({ 'Content-Security-Policy': "default-src 'none'" });

describe('scoped site candidate previews', () => {
  it('serves only a manifest file with private preview headers', async () => {
    const { env, reads } = fixture();
    const result = await serveSitePreview(token, '/', env.CONTROL as unknown as D1Database, env.SITE_RELEASES as unknown as R2Bucket, headers);
    expect(result.status).toBe(200);
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(result.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(await result.text()).toContain(`href="/v1/site-previews/${token}/catalog"`);
    expect(reads).toEqual([`${prefix}/manifest.json`, file.key]);
  });

  it('does not read R2 for expired tokens', async () => {
    const { env, reads } = fixture(false);
    await expect(serveSitePreview(token, '/', env.CONTROL as unknown as D1Database, env.SITE_RELEASES as unknown as R2Bucket, headers)).rejects.toThrow('expired or was not found');
    expect(reads).toEqual([]);
  });

  it('rejects unlisted and encoded paths', async () => {
    const { env, reads } = fixture();
    await expect(serveSitePreview(token, '/secret', env.CONTROL as unknown as D1Database, env.SITE_RELEASES as unknown as R2Bucket, headers)).rejects.toThrow('not found');
    await expect(serveSitePreview(token, '/%2fsecret', env.CONTROL as unknown as D1Database, env.SITE_RELEASES as unknown as R2Bucket, headers)).rejects.toThrow('Invalid preview path');
    expect(reads).toEqual([`${prefix}/manifest.json`]);
  });
});
