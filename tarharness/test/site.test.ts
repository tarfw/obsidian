import { createClient } from '@libsql/client';
import { Effect } from 'effect';
import { afterEach, describe, expect, it } from 'vitest';
import { WORKSPACE_SCHEMA } from '../src/db/schema.ts';
import { executeGateway } from '../src/gateway/actions.ts';
import type { AccessContext } from '../src/types.ts';
import { CARD_KINDS, THEME_NAMES } from '../src/site/schema.ts';
import { compileSiteHtml } from '../src/site/renderer.ts';
import { createDefaultSite } from '../src/site/store.ts';

const clients: ReturnType<typeof createClient>[] = [];
afterEach(() => {
  while (clients.length) clients.pop()?.close();
});

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

describe('TAR Site Bot & Pure HTML/CSS Static Compiler (PAR v2)', () => {
  it('renders all 12 Card families cleanly into semantic accessible HTML with zero client JS', async () => {
    const site = createDefaultSite('Slice House', 'Authentic wood-fired sourdough pizza in Anna Nagar');
    expect(site.pages[0].cards.length).toBe(12);

    // Verify all 12 card kinds are represented
    const kinds = site.pages[0].cards.map((c) => c.kind);
    for (const kind of CARD_KINDS) {
      expect(kinds).toContain(kind);
    }

    const { html, css, hash } = await compileSiteHtml(site);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<meta property="og:title"');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('Slice House');
    expect(html).toContain('Signature Margherita');
    expect(html).toContain('Stoneground Flour');
    expect(html).toContain('Operating Hours');
    expect(html).toContain('Book a Table or Request Catering');
    expect(html).toContain('Open Now');
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
    const pub = await Effect.runPromise(
      executeGateway(client, ownerAccess, {
        actionId: 'site.publish',
        idempotencyKey: 'site-pub-1',
        input: { siteId, subdomain: 'slice-house' },
      })
    );
    expect(pub.state).toBe('live');
    expect(pub.liveUrl).toBe('/v1/sites/slice-house');
    expect(pub.releaseId).toBeDefined();

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
      })
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

    // Insert a product into records
    const at = Date.now();
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
      })
    );
    expect(refreshed.refreshed).toBe(true);
    expect(refreshed.itemCount).toBeGreaterThan(0);
  });
});
