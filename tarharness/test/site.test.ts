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
  const at = Date.now();
  await client.execute({ sql: "INSERT INTO records(id,type,title,state,data,owner,version,created,updated) VALUES('capability','capability','Capabilities','active',?, 'owner_1',1,?,?)",
    args: [JSON.stringify({ site: true, pos: false, commerce: false }), at, at] });
  return client;
}

const ownerAccess: AccessContext = {
  identity: { id: 'owner_1', email: 'owner@slicehouse.in', name: 'Muthu' },
  workspace: { id: 'ws_slice', name: 'Slice House', slug: 'slice-house', mode: 'work', databaseName: 'slice', databaseHost: 'slice', state: 'active' },
  member: { workspaceId: 'ws_slice', userId: 'owner_1', role: 'owner', state: 'active' },
};

async function candidate(client: Awaited<ReturnType<typeof createTestWorkspace>>, bucket: R2Bucket, siteId: string, key: string, domain?: string) {
  const compiled = await Effect.runPromise(executeGateway(client, ownerAccess, {
    actionId: 'site.compile', idempotencyKey: key, input: { siteId },
  }, { siteReleases: bucket, siteDomain: domain }));
  return { siteId, releaseId: String(compiled.releaseId), hash: String(compiled.hash) };
}

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

    const bucket = releaseBucket();
    const first = await Effect.runPromise(executeGateway(client, ownerAccess, request, { siteReleases: bucket }));
    const replay = await Effect.runPromise(executeGateway(client, ownerAccess, request, { siteReleases: bucket }));
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
        input: await candidate(client, bucket, siteId, 'site-candidate-1'),
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
        input: await candidate(client, bucket, siteId, 'site-candidate-2'),
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
    const bucket = releaseBucket();
    const siteId = String(generated.siteId);
    const published = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.publish', idempotencyKey: 'site-url-publish', input: await candidate(client, bucket, siteId, 'site-url-candidate'),
    }, { siteReleases: bucket }));
    expect(published.liveUrl).toBe('/v1/sites/slice-house');
  });

  it('regenerates the canonical record and retains its published releases', async () => {
    const client = await createTestWorkspace();
    const bucket = releaseBucket();
    const first = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.generate', idempotencyKey: 'canonical-first', input: { title: 'Slice House', prompt: 'Pizza' },
    }));
    const published = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.publish', idempotencyKey: 'canonical-publish', input: await candidate(client, bucket, String(first.siteId), 'canonical-candidate'),
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
      actionId: 'site.update', idempotencyKey: 'site-refresh-approve', input: { siteId, baseVersion: 1, operations: [{
        op: 'update_card', path: 'catalog', value: { id: 'catalog', bindings: [{ slot: 'items', query: 'catalog.public', version: 1, access: 'public', freshness: 300, params: { records: ['prod_1'] } }] },
      }] },
    }));
    await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.publish', idempotencyKey: 'site-refresh-initial', input: await candidate(client, bucket, siteId, 'site-refresh-candidate'),
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
    const catalogCollection = site.pages[1].sections
      .flatMap((section: { nodes: { kind: string; props: Record<string, unknown> }[] }) => section.nodes)
      .find((node: { kind: string }) => node.kind === 'collection');
    expect(catalogCollection.props.items).toEqual([]);
    expect(site.releases).toHaveLength(2);
    const catalog = site.releases[1].files.find((file: { path: string }) => file.path === '/catalog/index.html');
    expect(bucket.objects.get(catalog.key)).toContain('Garlic Bread');
    expect(bucket.objects.get(catalog.key)).toContain('₹150.00');
  });

  it('refreshes the published source without releasing unpublished edits', async () => {
    const client = await createTestWorkspace();
    const bucket = releaseBucket();
    const generated = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.generate', idempotencyKey: 'refresh-draft-generate', input: { title: 'Slice House', prompt: 'Pizza' },
    }));
    const siteId = String(generated.siteId);
    await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.publish', idempotencyKey: 'refresh-draft-publish', input: await candidate(client, bucket, siteId, 'refresh-draft-candidate'),
    }, { siteReleases: bucket }));

    const firstRow = await client.execute({ sql: 'SELECT data FROM records WHERE id=?', args: [siteId] });
    const firstSite = JSON.parse(String(firstRow.rows[0].data));
    const firstHome = firstSite.releases[0].files.find((file: { path: string }) => file.path === '/index.html');
    const publishedHtml = bucket.objects.get(firstHome.key);
    expect(publishedHtml).toBeDefined();

    await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.update', idempotencyKey: 'refresh-draft-edit', input: {
        siteId, baseVersion: 2,
        operations: [{ op: 'update_card', path: firstSite.pages[0].id, value: { id: 'hero', props: { headline: 'Unpublished hero headline' } } }],
      },
    }));

    const refreshed = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.refresh', idempotencyKey: 'refresh-draft-refresh', input: { siteId },
    }, { siteReleases: bucket }));
    const finalRow = await client.execute({ sql: 'SELECT data FROM records WHERE id=?', args: [siteId] });
    const finalSite = JSON.parse(String(finalRow.rows[0].data));
    const finalHome = finalSite.releases[1].files.find((file: { path: string }) => file.path === '/index.html');

    expect(refreshed.refreshed).toBe(true);
    const hero = finalSite.pages[0].sections.find((section: { id: string }) => section.id === 'hero');
    const heroHeading = hero.nodes.find((node: { kind: string }) => node.kind === 'heading');
    expect(heroHeading.props.text).toBe('Unpublished hero headline');
    expect(bucket.objects.get(finalHome.key)).toBe(publishedHtml);
    expect(bucket.objects.get(finalHome.key)).not.toContain('Unpublished hero headline');
  });

  it('rejects a stale or mismatched compiled candidate', async () => {
    const client = await createTestWorkspace();
    const bucket = releaseBucket();
    const generated = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.generate', idempotencyKey: 'stale-generate', input: { title: 'Slice House', prompt: 'Pizza' },
    }));
    const siteId = String(generated.siteId);
    const reviewed = await candidate(client, bucket, siteId, 'stale-compile');
    await expect(Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.publish', idempotencyKey: 'wrong-hash', input: { ...reviewed, hash: 'wrong' },
    }, { siteReleases: bucket }))).rejects.toThrow('stale or does not match');
    await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.update', idempotencyKey: 'stale-edit', input: {
        siteId, baseVersion: 1, operations: [{ op: 'update_card', path: 'home', value: { id: 'hero', props: { headline: 'New draft' } } }],
      },
    }));
    await expect(Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.publish', idempotencyKey: 'stale-publish', input: reviewed,
    }, { siteReleases: bucket }))).rejects.toThrow('stale or does not match');
    const row = await client.execute({ sql: 'SELECT state,data FROM records WHERE id=?', args: [siteId] });
    expect(row.rows[0].state).toBe('draft');
    expect(JSON.parse(String(row.rows[0].data)).releases).toEqual([]);
  });

  it('blocks refresh after unpublishing while preserving release history', async () => {
    const client = await createTestWorkspace();
    const bucket = releaseBucket();
    const generated = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.generate', idempotencyKey: 'withdraw-generate', input: { title: 'Slice House', prompt: 'Pizza' },
    }));
    const siteId = String(generated.siteId);
    await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.publish', idempotencyKey: 'withdraw-publish', input: await candidate(client, bucket, siteId, 'withdraw-compile'),
    }, { siteReleases: bucket }));
    let status = 'active';
    const control = {
      withSession: () => ({ prepare: () => ({ bind: () => ({ first: async () => ({ site: siteId, epoch: 1, status }) }) }) }),
      prepare: () => ({ bind: () => ({ run: async () => { status = 'paused'; return { meta: { changes: 1 } }; } }) }),
    } as unknown as D1Database;
    const withdrawn = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.unpublish', idempotencyKey: 'withdraw-action', input: { siteId },
    }, { publication: control }));
    expect(withdrawn.unpublished).toBe(true);
    expect(status).toBe('paused');
    const row = await client.execute({ sql: 'SELECT state,data FROM records WHERE id=?', args: [siteId] });
    expect(row.rows[0].state).toBe('draft');
    expect(JSON.parse(String(row.rows[0].data)).releases).toHaveLength(1);
    await expect(Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.refresh', idempotencyKey: 'withdraw-refresh', input: { siteId },
    }, { siteReleases: bucket }))).rejects.toThrow('Publish the site before refreshing');
  });

  it('keeps the draft unpublished when CONTROL activation fails', async () => {
    const client = await createTestWorkspace();
    const bucket = releaseBucket();
    const generated = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.generate', idempotencyKey: 'control-generate', input: { title: 'Slice House', prompt: 'Pizza' },
    }));
    const siteId = String(generated.siteId);
    const reviewed = await candidate(client, bucket, siteId, 'control-compile', 'sites.example.test');
    const control = {
      withSession: () => ({ prepare: () => ({ bind: () => ({ first: async () => null }) }) }),
      batch: async () => { throw new Error('CONTROL unavailable'); },
    } as unknown as D1Database;
    await expect(Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.publish', idempotencyKey: 'control-publish', input: reviewed,
    }, { siteReleases: bucket, publication: control, siteDomain: 'sites.example.test' }))).rejects.toThrow('Action execution failed.');
    const row = await client.execute({ sql: 'SELECT state,data FROM records WHERE id=?', args: [siteId] });
    expect(row.rows[0].state).toBe('draft');
    expect(JSON.parse(String(row.rows[0].data)).currentRelease).toBeNull();
  });

  it('pins canonical metadata, sitemap and robots to the compiled candidate', async () => {
    const client = await createTestWorkspace();
    const bucket = releaseBucket();
    const generated = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.generate', idempotencyKey: 'seo-generate', input: { title: 'Slice House', prompt: 'Pizza' },
    }));
    const siteId = String(generated.siteId);
    const compiled = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.compile', idempotencyKey: 'seo-compile', input: { siteId },
    }, { siteReleases: bucket, siteDomain: 'sites.example.test' }));
    const prefix = `workspaces/${ownerAccess.workspace.id}/sites/${siteId}/releases/${compiled.releaseId}`;
    expect(bucket.objects.get(`${prefix}/index.html`)).toContain('href="https://slice-house.sites.example.test/"');
    expect(bucket.objects.get(`${prefix}/sitemap.xml`)).toContain('<loc>https://slice-house.sites.example.test/catalog</loc>');
    expect(bucket.objects.get(`${prefix}/robots.txt`)).toContain('Sitemap: https://slice-house.sites.example.test/sitemap.xml');
  });

  it('publishes a reviewed candidate on a shared Workers.dev path', async () => {
    const client = await createTestWorkspace();
    const bucket = releaseBucket();
    const generated = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.generate', idempotencyKey: 'worker-generate', input: { title: 'Slice House', prompt: 'Pizza' },
    }));
    const siteId = String(generated.siteId);
    const origin = 'https://tar-sites.tar-54d.workers.dev';
    const reviewed = await candidate(client, bucket, siteId, 'worker-compile', origin);
    const prefix = `workspaces/${ownerAccess.workspace.id}/sites/${siteId}/releases/${reviewed.releaseId}`;
    expect(bucket.objects.get(`${prefix}/index.html`)).toContain('href="https://tar-sites.tar-54d.workers.dev/slice-house/"');
    expect(bucket.objects.get(`${prefix}/sitemap.xml`)).toContain('<loc>https://tar-sites.tar-54d.workers.dev/slice-house/catalog</loc>');
    const moved = {
      withSession: () => ({ prepare: () => ({ bind: () => ({ first: async () => ({ site: siteId, epoch: 1, release: 'another', hash: 'another', domain: 'tar-sites.tar-54d.workers.dev', mode: 'path', status: 'active' }) }) }) }),
    } as unknown as D1Database;
    await expect(Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.publish', idempotencyKey: 'worker-competing-publish', input: reviewed,
    }, { siteReleases: bucket, publication: moved, siteDomain: origin }))).rejects.toThrow('Live publication changed since');
    const statements: string[] = [];
    const control = {
      withSession: () => ({ prepare: (sql: string) => ({ bind: () => ({ first: async () => { statements.push(sql); return null; } }) }) }),
      prepare: (sql: string) => ({ bind: () => { statements.push(sql); return {}; } }),
      batch: async (batch: unknown[]) => {
        expect(batch).toHaveLength(1);
        return [{ meta: { changes: 1 } }];
      },
    } as unknown as D1Database;
    const published = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.publish', idempotencyKey: 'worker-publish', input: reviewed,
    }, { siteReleases: bucket, publication: control, siteDomain: origin }));
    expect(published.publicUrl).toBe(`${origin}/slice-house`);
    expect(statements.some((sql) => sql.includes('INSERT INTO sites('))).toBe(true);
    expect(statements.some((sql) => sql.includes('INSERT INTO hosts('))).toBe(false);
  });

  it('excludes active workspace records unless explicitly approved for the public binding', async () => {
    const client = await createTestWorkspace();
    await client.execute("INSERT INTO records(id,type,title,state,data,owner,version,created,updated) VALUES('private','pos.product','Private inventory','active','{\"price\":100}','owner_1',1,1,1)");
    const generated = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.generate', idempotencyKey: 'private-generate', input: { title: 'Shop', prompt: 'A supplied description' },
    }));
    const bucket = releaseBucket();
    await candidate(client, bucket, String(generated.siteId), 'private-compile');
    expect([...bucket.objects.values()].join('\n')).not.toContain('Private inventory');
  });

  it('uses only an approved variant and its current price in the selected channel', async () => {
    const client = await createTestWorkspace();
    const at = Date.now();
    const records = [
      { id: 'visible', type: 'variant', title: 'Approved variant', data: {} },
      { id: 'hidden', type: 'variant', title: 'Private variant', data: {} },
      { id: 'web', type: 'price', title: 'Web price', data: { variant: 'visible', amount: 10000, currency: 'USD', channel: 'web', starts: 1 } },
      { id: 'internal', type: 'price', title: 'Internal price', data: { variant: 'visible', amount: 90000, currency: 'USD', channel: 'wholesale', starts: 1 } },
      { id: 'expired', type: 'price', title: 'Expired price', data: { variant: 'visible', amount: 80000, currency: 'USD', channel: 'web', starts: 1, ends: at - 1000 } },
      { id: 'future', type: 'price', title: 'Future price', data: { variant: 'visible', amount: 70000, currency: 'USD', channel: 'web', starts: at + 60_000 } },
      { id: 'private', type: 'price', title: 'Private price', data: { variant: 'hidden', amount: 60000, currency: 'USD', channel: 'web', starts: 1 } },
    ];
    await client.batch(records.map((record) => ({ sql: "INSERT INTO records(id,type,title,state,data,owner,version,created,updated) VALUES(?,?,?,'active',?,'owner_1',1,?,?)",
      args: [record.id, record.type, record.title, JSON.stringify(record.data), at, at] })), 'write');
    const generated = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.generate', idempotencyKey: 'prices-generate', input: { title: 'Shop', prompt: 'A supplied description' },
    }));
    const siteId = String(generated.siteId);
    await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.update', idempotencyKey: 'prices-approve', input: { siteId, baseVersion: 1, operations: [{
        op: 'update_card', path: 'catalog', value: { id: 'catalog', bindings: [{ slot: 'items', query: 'catalog.public', version: 1, access: 'public', freshness: 300, params: { records: ['visible'], channel: 'web' } }] },
      }] },
    }));
    const bucket = releaseBucket();
    const reviewed = await candidate(client, bucket, siteId, 'prices-compile');
    const page = bucket.objects.get(`workspaces/${ownerAccess.workspace.id}/sites/${siteId}/releases/${reviewed.releaseId}/catalog/index.html`);
    expect(page).toContain('Approved variant');
    expect(page).toContain('$100.00');
    expect(page).not.toContain('Private variant');
    for (const price of ['$900.00', '$800.00', '$700.00', '$600.00']) expect(page).not.toContain(price);
  });
});
