import { Effect } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureNowDatabase, mintNowSyncToken, openWorkspaceDatabase } from '../src/db/turso.ts';
import { INBOX_SCHEMA } from '../src/db/schema.ts';

const client = vi.hoisted(() => ({ execute: vi.fn(), close: vi.fn() }));
vi.mock('@libsql/client/web', () => ({ createClient: vi.fn(() => client) }));

const env = { TURSO_ORG: 'test', TURSO_PLATFORM_TOKEN: 'platform', TURSO_GROUP: 'default' };

describe('opening workspace databases', () => {
  beforeEach(() => {
    client.execute.mockClear();
    client.close.mockClear();
    vi.unstubAllGlobals();
  });

  it('shares a short-lived token and never runs schema writes during reads', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ jwt: 'database-token' }));
    vi.stubGlobal('fetch', fetch);
    const [first, second] = await Promise.all([
      Effect.runPromise(openWorkspaceDatabase(env, 'personal', 'db.example.com')),
      Effect.runPromise(openWorkspaceDatabase(env, 'personal', 'db.example.com')),
    ]);
    const third = await Effect.runPromise(openWorkspaceDatabase(env, 'personal', 'db.example.com'));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(client.execute).not.toHaveBeenCalled();
    first.close(); second.close(); third.close();
  });

  it('does not keep a failed token request in cache', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(Response.json({ jwt: 'database-token' }));
    vi.stubGlobal('fetch', fetch);
    await expect(Effect.runPromise(openWorkspaceDatabase(env, 'retry', 'db.example.com'))).rejects.toThrow();
    await Effect.runPromise(openWorkspaceDatabase(env, 'retry', 'db.example.com'));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('mints a short-lived read-only token for Now sync', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ jwt: 'sync-token' }));
    vi.stubGlobal('fetch', fetch);
    expect(await mintNowSyncToken(env, 'personal')).toBe('sync-token');
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/databases/personal/auth/tokens?expiration=10m&authorization=read-only');
    expect(init.method).toBe('POST');
  });

  it('provisions a dedicated Now database with only Inbox tables', async () => {
    const fetch = vi.fn(async (input: string, init?: RequestInit) => {
      if (input.endsWith('/databases/now-syncuser')) return new Response('', { status: 404 });
      if (input.endsWith('/groups')) return Response.json({ groups: [{ name: 'default' }] });
      if (input.endsWith('/databases') && init?.method === 'POST') {
        return Response.json({ database: { Name: 'now-syncuser', Hostname: 'now.example.com' } });
      }
      if (input.includes('/auth/tokens?')) return Response.json({ jwt: 'full-token' });
      throw new Error(`Unexpected Platform API call: ${input}`);
    });
    vi.stubGlobal('fetch', fetch);
    expect(await ensureNowDatabase(env, 'syncuser')).toEqual({ Name: 'now-syncuser', Hostname: 'now.example.com' });
    expect(client.execute).toHaveBeenCalledTimes(INBOX_SCHEMA.length);
    expect(client.execute.mock.calls.map(([sql]) => sql)).toEqual([...INBOX_SCHEMA]);
  });
});
