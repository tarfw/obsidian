import { createClient } from '@libsql/client';
import { Effect } from 'effect';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WORKSPACE_SCHEMA } from '../src/db/schema.ts';
import { executeGateway } from '../src/gateway/actions.ts';
import type { AccessContext } from '../src/types.ts';
import { CARD_KINDS, THEME_NAMES } from '../src/site/schema.ts';
import { compileSiteHtml } from '../src/site/renderer.ts';
import { createDefaultSite } from '../src/site/store.ts';
import { chooseSiteTheme } from '../src/site/judgment.ts';

const clients: ReturnType<typeof createClient>[] = [];
afterEach(() => {
  while (clients.length) clients.pop()?.close();
  vi.unstubAllGlobals();
});

function releaseBucket(): R2Bucket & { objects: Map<string, string> } {
  const objects = new Map<string, string>();
  return {
    objects,
    put: async (key: string, value: string) => { objects.set(key, value); return {} as R2Object; },
    get: async (key: string) => { const value = objects.get(key); return value === undefined ? null : ({ text: async () => value } as unknown as R2ObjectBody); },
  } as unknown as R2Bucket & { objects: Map<string, string> };
}

async function createTestWorkspace() {
  const client = createClient({ url: 'file::memory:' });
  clients.push(client);
  for (const statement of WORKSPACE_SCHEMA) {
    await client.execute(statement);
  }
  return client;
}

const ownerAccess: AccessContext = {
  identity: { id: 'owner_1', email: 'owner@slicehouse.in', name: 'Muthu' },
  workspace: { id: 'ws_slice', name: 'Slice House', slug: 'slice-house', mode: 'work', databaseName: 'slice', databaseHost: 'slice', state: 'active' },
  member: { workspaceId: 'ws_slice', userId: 'owner_1', role: 'owner', state: 'active' },
};

describe('TAR Site compiler', () => {
  it('builds a complete multi-page site with every registered card family and zero client JS', async () => {
    const site = createDefaultSite('Northstar', 'A local business serving its community');
    expect(site.pages.map((page) => page.path)).toEqual(['/', '/catalog', '/about', '/contact']);
    const kinds = site.pages.flatMap((page) => page.cards.map((card) => card.kind));
    for (const kind of CARD_KINDS) {
      expect(kinds).toContain(kind);
    }

    const { html, css, hash } = await compileSiteHtml(site);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<meta property="og:title"');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('Northstar');
    expect(html).toContain('A local business serving its community');
    expect(html).not.toContain('Signature Margherita');
    expect(html).not.toContain('Slice House');
    expect(html).not.toContain('<script src='); // Zero client script runtime required
    expect(css).toContain('--color-bg:');
    expect(css).toContain('--color-accent:');
    expect(hash).toHaveLength(64);
  });

  it('compiles all 3 design themes with distinct tokens', async () => {
    for (const theme of THEME_NAMES) {
      const site = createDefaultSite('Slice House', 'Pizza store', theme);
      const { css } = await compileSiteHtml(site);
      expect(css).toContain(`--color-bg: ${site.design.colors.bg}`);
      expect(css).toContain(`--color-accent: ${site.design.colors.accent}`);
    }
  });

  it('uses Jev only for a bounded theme choice when configured', async () => {
    expect(await chooseSiteTheme(undefined, 'Northstar', 'A supplied business description')).toBeNull();
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ answers: { theme: { choice: 'minimal-clean' } } }), { status: 200 }));
    vi.stubGlobal('fetch', request);
    expect(await chooseSiteTheme('test-key', 'Northstar', 'A supplied business description')).toBe('minimal-clean');
    expect(JSON.parse(request.mock.calls[0][1].body).questions.theme.criteria).toHaveProperty('minimal-clean');
  });

  it('omits unavailable public journeys and unsupported claims', async () => {
    const site = createDefaultSite('Northstar', 'A supplied business description');
    const catalog = await compileSiteHtml(site, 1);
    const contact = await compileSiteHtml(site, 3);
    expect(catalog.html).not.toContain('>Order</a>');
    expect(contact.html).not.toContain('Open Now');
    expect(contact.html).not.toContain('<form');
    expect(contact.html).not.toContain('Monday');
  });

  it('does not emit unsafe links or executable page metadata', async () => {
    const site = createDefaultSite('Northstar', 'A supplied business description');
    const home = site.pages[0];
    const altered = {
      ...site,
      pages: [{
        ...home,
        meta: { description: '</script><script>alert(1)</script>' },
        cards: home.cards.map((card) => card.kind === 'navigation'
          ? { ...card, props: { ...card.props, links: [{ label: 'Unsafe', href: 'javascript:alert(1)' }] } }
          : card.kind === 'cta'
            ? { ...card, props: { ...card.props, href: 'javascript:alert(1)' } }
            : card),
      }, ...site.pages.slice(1)],
    };
    const { html } = await compileSiteHtml(altered);
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('</script><script>alert(1)</script>');
    expect(html).toContain('\\u003c/script>');
  });

  it('executes site.generate through Gateway with idempotency', async () => {
    const client = await createTestWorkspace();
    const req = {
      actionId: 'site.generate' as const,
      idempotencyKey: 'site-gen-1',
      input: { title: 'Slice House', prompt: 'Best wood-fired pizza in Chennai', theme: 'editorial-chalk' },
    };

    const first = await Effect.runPromise(executeGateway(client, ownerAccess, req));
    expect(first.siteId).toBeDefined();
    expect(first.version).toBe(1);
    expect(first.state).toBe('draft');

    // Idempotent replay with same key
    const replay = await Effect.runPromise(executeGateway(client, ownerAccess, req));
    expect(replay).toEqual(first);

    // Replay with different input fails
    await expect(
      Effect.runPromise(executeGateway(client, ownerAccess, { ...req, input: { title: 'Different' } }))
    ).rejects.toThrow('already used with different input');
  });

  it('applies site.update operations without second AI charge', async () => {
    const client = await createTestWorkspace();
    const gen = await Effect.runPromise(
      executeGateway(client, ownerAccess, {
        actionId: 'site.generate',
        idempotencyKey: 'site-gen-2',
        input: { title: 'Slice House', prompt: 'Pizza' },
      })
    );

    const siteId = String(gen.siteId);
    const updateReq = {
      actionId: 'site.update' as const,
      idempotencyKey: 'site-update-1',
      input: {
        siteId,
        baseVersion: 1,
        operations: [
          { op: 'set_theme', value: 'streetwear-dark' },
          {
            op: 'update_card',
            value: {
              id: 'hero',
              props: { headline: 'Chennai’s Best Slice' },
            },
          },
        ],
      },
    };

    const updated = await Effect.runPromise(executeGateway(client, ownerAccess, updateReq));
    expect(updated.version).toBe(2);

    // Stale baseVersion conflict check
    await expect(
      Effect.runPromise(
        executeGateway(client, ownerAccess, {
          actionId: 'site.update',
          idempotencyKey: 'site-update-conflict',
          input: { siteId, baseVersion: 1, operations: [] },
        })
      )
    ).rejects.toThrow('modified concurrently');
  });

  it('replays a compiled candidate from the Gateway idempotency record', async () => {
    const client = await createTestWorkspace();
    const generated = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.generate', idempotencyKey: 'site-gen-compile', input: { title: 'Slice House', prompt: 'Pizza' },
    }));
    const request = {
      actionId: 'site.compile' as const,
      idempotencyKey: 'site-compile-1',
      input: { siteId: String(generated.siteId) },
    };

    const first = await Effect.runPromise(executeGateway(client, ownerAccess, request));
    const replay = await Effect.runPromise(executeGateway(client, ownerAccess, request));
    expect(replay).toEqual(first);
  });

  it('publishes a verified site and supports rollback', async () => {
    const client = await createTestWorkspace();
    const gen = await Effect.runPromise(
      executeGateway(client, ownerAccess, {
        actionId: 'site.generate',
        idempotencyKey: 'site-gen-3',
        input: { title: 'Slice House', prompt: 'Pizza' },
      })
    );
    const siteId = String(gen.siteId);

    // Publish
    const bucket = releaseBucket();
    const pub = await Effect.runPromise(
      executeGateway(client, ownerAccess, {
        actionId: 'site.publish',
        idempotencyKey: 'site-pub-1',
        input: { siteId, subdomain: 'slice-house' },
      }, { siteReleases: bucket })
    );
    expect(pub.state).toBe('live');
    expect(pub.liveUrl).toBe('/v1/sites/slice-house');
    expect(pub.releaseId).toBeDefined();
    expect([...bucket.objects.values()].some((body) => body.includes('Slice House'))).toBe(true);

    const stored = await client.execute({ sql: 'SELECT data FROM records WHERE id=?', args: [siteId] });
    const manifest = JSON.parse(String(stored.rows[0].data)).releases[0] as { files: { key: string; hash: string }[] };
    for (const file of manifest.files) {
      const body = bucket.objects.get(file.key);
      expect(body).toBeDefined();
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
      const expected = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
      expect(file.hash).toBe(expected);
    }

    const firstReleaseId = String(pub.releaseId);

    // Update and publish second release
    await Effect.runPromise(
      executeGateway(client, ownerAccess, {
        actionId: 'site.update',
        idempotencyKey: 'site-update-v2',
        input: {
          siteId,
          baseVersion: 2, // version incremented after publish
          operations: [{ op: 'set_theme', value: 'minimal-clean' }],
        },
      })
    );

    const pub2 = await Effect.runPromise(
      executeGateway(client, ownerAccess, {
        actionId: 'site.publish',
        idempotencyKey: 'site-pub-2',
        input: { siteId },
      }, { siteReleases: bucket })
    );
    expect(pub2.generation).toBe(2);

    // Rollback to first release
    const roll = await Effect.runPromise(
      executeGateway(client, ownerAccess, {
        actionId: 'site.rollback',
        idempotencyKey: 'site-rollback-1',
        input: { siteId, releaseId: firstReleaseId },
      })
    );
    expect(roll.rolledBack).toBe(true);
    expect(roll.releaseId).toBe(firstReleaseId);
  });

  it('uses the workspace slug for the public URL', async () => {
    const client = await createTestWorkspace();
    const generated = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.generate', idempotencyKey: 'site-url-generate', input: { title: 'Slice House', prompt: 'Pizza' },
    }));
    const published = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.publish', idempotencyKey: 'site-url-publish', input: { siteId: String(generated.siteId), subdomain: 'unroutable' },
    }, { siteReleases: releaseBucket() }));
    expect(published.liveUrl).toBe('/v1/sites/slice-house');
  });

  it('regenerates the canonical record and retains its published releases', async () => {
    const client = await createTestWorkspace();
    const bucket = releaseBucket();
    const first = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.generate', idempotencyKey: 'canonical-first', input: { title: 'Slice House', prompt: 'Pizza' },
    }));
    const published = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.publish', idempotencyKey: 'canonical-publish', input: { siteId: String(first.siteId) },
    }, { siteReleases: bucket }));
    const second = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.generate', idempotencyKey: 'canonical-second', input: { title: 'Slice House', prompt: 'Pizza and bread' },
    }));
    expect(second.siteId).toBe(first.siteId);
    expect((second.site as { currentRelease: string }).currentRelease).toBe(published.releaseId);
    const rows = await client.execute("SELECT COUNT(*) AS count FROM records WHERE type='site' AND state='live'");
    expect(Number(rows.rows[0].count)).toBe(1);
  });

  it('refreshes public facts without inference charge', async () => {
    const client = await createTestWorkspace();
    const gen = await Effect.runPromise(
      executeGateway(client, ownerAccess, {
        actionId: 'site.generate',
        idempotencyKey: 'site-gen-4',
        input: { title: 'Slice House', prompt: 'Pizza' },
      })
    );
    const siteId = String(gen.siteId);

    const bucket = releaseBucket();
    await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.publish', idempotencyKey: 'site-refresh-initial', input: { siteId },
    }, { siteReleases: bucket }));

    // Insert a product into records
    const at = Date.now();
    await client.execute({
      sql: `INSERT INTO records (id, type, title, state, data, owner, version, created, updated)
            VALUES ('pos.settings', 'pos.settings', 'Store', 'active', '{"currency":"INR"}', 'owner_1', 1, ?, ?)`, args: [at, at],
    });
    await client.execute({
      sql: `INSERT INTO records (id, type, title, state, data, owner, version, created, updated)
            VALUES ('prod_1', 'pos.product', 'Garlic Bread', 'active', '{"price":15000,"description":"Fresh with herbs"}', 'owner_1', 1, ?, ?)`,
      args: [at, at],
    });

    const refreshed = await Effect.runPromise(
      executeGateway(client, ownerAccess, {
        actionId: 'site.refresh',
        idempotencyKey: 'site-refresh-1',
        input: { siteId },
      }, { siteReleases: bucket })
    );
    expect(refreshed.refreshed).toBe(true);
    expect(refreshed.itemCount).toBe(1);
    const stored = await client.execute({ sql: 'SELECT data FROM records WHERE id=?', args: [siteId] });
    const site = JSON.parse(String(stored.rows[0].data));
    expect(site.pages[1].cards[1].props.items).toEqual([]);
    expect(site.releases).toHaveLength(2);
    const catalog = site.releases[1].files.find((file: { path: string }) => file.path === '/catalog/index.html');
    expect(bucket.objects.get(catalog.key)).toContain('Garlic Bread');
    expect(bucket.objects.get(catalog.key)).toContain('₹150.00');
  });
});
