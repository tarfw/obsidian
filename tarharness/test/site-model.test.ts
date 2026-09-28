import { createClient } from '@libsql/client';
import { Effect } from 'effect';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WORKSPACE_SCHEMA } from '../src/db/schema.ts';
import { executeGateway } from '../src/gateway/actions.ts';
import type { AccessContext } from '../src/types.ts';
import { DEFAULT_DESIGN } from '../src/site/design.ts';
import type { SiteDocument } from '../src/site/document.ts';

const clients: ReturnType<typeof createClient>[] = [];
afterEach(() => {
  while (clients.length) clients.pop()?.close();
  vi.unstubAllGlobals();
});

function fakeBucket(): R2Bucket & { objects: Map<string, string | Uint8Array> } {
  const objects = new Map<string, string | Uint8Array>();
  return {
    objects,
    put: async (key: string, value: string | Uint8Array) => { objects.set(key, value); return {} as R2Object; },
    get: async (key: string) => {
      const value = objects.get(key);
      if (value === undefined) return null;
      return {
        text: async () => typeof value === 'string' ? value : new TextDecoder().decode(value),
        arrayBuffer: async () => typeof value === 'string' ? new TextEncoder().encode(value).buffer : value.buffer,
        size: typeof value === 'string' ? value.length : value.byteLength,
      } as unknown as R2ObjectBody;
    },
    delete: async (key: string) => { objects.delete(key); },
  } as unknown as R2Bucket & { objects: Map<string, string | Uint8Array> };
}

async function createTestWorkspace() {
  const client = createClient({ url: 'file::memory:' });
  clients.push(client);
  for (const statement of WORKSPACE_SCHEMA) await client.execute(statement);
  const at = Date.now();
  await client.execute({ sql: "INSERT INTO records(id,type,title,state,data,owner,version,created,updated) VALUES('capability','capability','Capabilities','active',?, 'owner_1',1,?,?)",
    args: [JSON.stringify({ site: true, pos: false, commerce: false }), at, at] });
  return client;
}

const ownerAccess: AccessContext = {
  identity: { id: 'owner_1', email: 'owner@slicehouse.in', name: 'Muthu' },
  workspace: { id: 'ws_slice_house_0001', name: 'Slice House', slug: 'slice-house', mode: 'work', databaseName: 'slice', databaseHost: 'slice', state: 'active' },
  member: { workspaceId: 'ws_slice_house_0001', userId: 'owner_1', role: 'owner', state: 'active' },
};

const PLAN = {
  direction: 'editorial white canvas with one decisive accent',
  pages: [{
    id: 'home', path: '/', title: 'Slice House', description: 'Wood fired pizza in Chennai',
    sections: [
      { id: 'navigation', purpose: 'chrome', layout: 'flow', summary: 'brand and menu link' },
      { id: 'hero', purpose: 'introduction', layout: 'stack', summary: 'headline and short description' },
      { id: 'footer', purpose: 'chrome', layout: 'flow', summary: 'footer' },
    ],
  }],
  claims: [{ text: 'Wood fired every day since 2019', evidence: 'The workspace description mentions wood fired pizza.' }],
};

function composedDocument(): Record<string, unknown> {
  return {
    schema: '2.0.0',
    revision: 1,
    brief: { goal: 'sell pizza', audience: 'local diners', tone: 'warm' },
    locale: 'en', timezone: 'Asia/Kolkata', currency: 'INR',
    design: DEFAULT_DESIGN,
    assets: [], components: [],
    pages: [{
      id: 'home', path: '/', title: 'Slice House', meta: { description: 'Wood fired pizza in Chennai' },
      sections: [
        { id: 'navigation', purpose: 'chrome', layout: { kind: 'flow' }, nodes: [{ id: 'nav', kind: 'navigation', props: { brand: 'Slice House', links: [{ label: 'Menu', href: '/' }] } }] },
        {
          id: 'hero', purpose: 'introduction', layout: { kind: 'stack' },
          nodes: [
            { id: 'hero-title', kind: 'heading', props: { text: 'Wood fired pizza in Chennai', level: 1 } },
            { id: 'hero-text', kind: 'text', props: { text: 'Small batch dough, fired to order.' } },
            { id: 'hero-actions', kind: 'flex', props: {}, children: [{ id: 'hero-cta', kind: 'button', props: { label: 'See the menu', href: '/' } }] },
          ],
        },
        { id: 'footer', purpose: 'chrome', layout: { kind: 'flow' }, nodes: [{ id: 'foot', kind: 'footer', props: { brand: 'Slice House', links: [] } }] },
      ],
    }],
    journeys: [], redirects: [], locks: [], policy: { allowedCurrencies: ['INR'] },
  };
}

function scriptedAi(responses: unknown[]): Ai {
  let index = 0;
  return {
    run: async () => {
      const answer = responses[Math.min(index, responses.length - 1)];
      index += 1;
      if (answer instanceof Error) throw answer;
      return { response: JSON.stringify(answer) };
    },
  } as unknown as Ai;
}

async function generate(client: Awaited<ReturnType<typeof createTestWorkspace>>, services: Record<string, unknown>, key: string) {
  return Effect.runPromise(executeGateway(client, ownerAccess, {
    actionId: 'site.generate', idempotencyKey: key, input: { title: 'Slice House', prompt: 'A wood fired pizza shop' },
  }, services));
}

describe('site composition', () => {
  it('composes a typed draft from a plan and records claim verdicts', async () => {
    const client = await createTestWorkspace();
    const ai = scriptedAi([PLAN, composedDocument()]);
    const result = await generate(client, { ai, siteModel: 'test-model' }, 'compose-1');
    const site = result.site as SiteDocument;
    expect(site.schema).toBe('2.0.0');
    expect(site.pages.map((page) => page.path)).toEqual(['/']);
    expect(site.pages[0].sections.map((section) => section.id)).toEqual(['navigation', 'hero', 'footer']);
    expect(site.claims?.[0].text).toContain('Wood fired every day');
    // Without a judgment key the claim stays unresolved rather than trusted.
    expect(site.claims?.[0].verdict).toBe('unsupported');
  });

  it('repairs once, then falls back to the retained template when the budget is spent', async () => {
    const client = await createTestWorkspace();
    const broken = { pages: [] };
    const ai = scriptedAi([broken, PLAN, composedDocument()]);
    const repaired = await generate(client, { ai }, 'compose-repair');
    expect((repaired.site as SiteDocument).schema).toBe('2.0.0');

    const failing = { run: async () => { throw new Error('model unavailable'); } } as unknown as Ai;
    const fallback = await generate(client, { ai: failing }, 'compose-fallback');
    const site = fallback.site as SiteDocument;
    expect(site.schema).toBe('2.0.0');
    // The retained generator keeps the product usable when the model is out.
    expect(site.pages.length).toBeGreaterThan(1);
  });

  it('blocks publication when a claim contradicts its evidence', async () => {
    const client = await createTestWorkspace();
    const releases = fakeBucket();
    const ai = scriptedAi([PLAN, composedDocument()]);
    const judgement = vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      model: 'jev-latest',
      answers: { verdict: { type: 'choice', choice: 'contradicted', confidence: 0.94 } },
    }), { status: 200 }));
    vi.stubGlobal('fetch', judgement);
    const generated = await generate(client, { ai, typesafe: 'test-key' }, 'compose-claim');
    const siteId = String(generated.siteId);
    const stored = await client.execute({ sql: 'SELECT data FROM records WHERE id=?', args: [siteId] });
    expect((JSON.parse(String(stored.rows[0].data)) as SiteDocument).claims?.[0].verdict).toBe('contradicted');
    const compiled = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.compile', idempotencyKey: 'claim-compile', input: { siteId },
    }, { siteReleases: releases }));
    const checks = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.checks', idempotencyKey: 'claim-checks', input: { siteId, releaseId: compiled.releaseId },
    }, { siteReleases: releases }));
    expect((checks.checks as { blocking: { area: string }[] }).blocking.some((issue) => issue.area === 'claim')).toBe(true);
    await expect(Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.publish', idempotencyKey: 'claim-publish',
      input: { siteId, releaseId: compiled.releaseId, hash: compiled.hash },
    }, { siteReleases: releases }))).rejects.toThrow('blocking check');
  });
});
