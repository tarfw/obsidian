import { createClient } from '@libsql/client';
import { Effect } from 'effect';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WORKSPACE_SCHEMA } from '../src/db/schema.ts';
import { executeGateway } from '../src/gateway/actions.ts';
import type { AccessContext } from '../src/types.ts';
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

async function generated(client: Awaited<ReturnType<typeof createTestWorkspace>>) {
  const result = await Effect.runPromise(executeGateway(client, ownerAccess, {
    actionId: 'site.generate', idempotencyKey: `gen-${Math.random()}`, input: { title: 'Slice House', prompt: 'Pizza' },
  }));
  return { siteId: String(result.siteId), revision: Number((result.site as SiteDocument).revision) };
}

describe('site assets', () => {
  it('stores provenance, bars unreleased media and copies approved bytes into a release', async () => {
    const client = await createTestWorkspace();
    const releases = fakeBucket();
    const content = fakeBucket();
    const { siteId } = await generated(client);
    const bytes = new TextEncoder().encode('fake-png-bytes');
    const upload = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.asset.upload', idempotencyKey: 'asset-upload',
      input: {
        siteId, mime: 'image/png', kind: 'image', data: btoa(String.fromCharCode(...bytes)),
        alt: 'Shop front', rights: { source: 'workspace upload', license: 'owned' },
      },
    }, { siteReleases: releases, productContent: content }));
    const assets = upload.assets as { id: string; hash: string; rights: { approved: boolean }; bytes: number }[];
    expect(assets).toHaveLength(1);
    expect(assets[0].rights.approved).toBe(false);
    expect(assets[0].hash).toHaveLength(64);
    expect(assets[0].bytes).toBe(bytes.byteLength);
    const assetId = assets[0].id;
    expect([...content.objects.keys()].some((key) => key.endsWith(`${assetId}.png`))).toBe(true);

    // Use it on the home hero, then compile while rights are unapproved.
    const document = await currentDocument(client, siteId);
    document.pages[0].sections.find((section) => section.id === 'hero')!.nodes.push({ id: 'hero-logo', kind: 'image', props: { asset: assetId } });
    await saveDocument(client, siteId, document);
    const first = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.compile', idempotencyKey: 'asset-compile-1', input: { siteId },
    }, { siteReleases: releases, productContent: content }));
    const firstPrefix = `workspaces/${ownerAccess.workspace.id}/sites/${siteId}/releases/${first.releaseId}`;
    expect(releases.objects.has(`${firstPrefix}/media/${assetId}.png`)).toBe(false);
    const checks = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.checks', idempotencyKey: 'asset-checks', input: { siteId, releaseId: first.releaseId },
    }, { siteReleases: releases }));
    expect((checks.checks as { blocking: { message: string }[] }).blocking.some((issue) => issue.message.includes('approved rights'))).toBe(true);

    // Approve the rights, then the bytes are pinned into the next release.
    const revision = currentRevision(document);
    await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.edit', idempotencyKey: 'asset-approve',
      input: { siteId, base: revision, operations: [{ op: 'set_asset_rights', target: assetId, value: { approved: true, alt: 'Shop front' } }] },
    }, { siteReleases: releases, productContent: content }));
    const second = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.compile', idempotencyKey: 'asset-compile-2', input: { siteId },
    }, { siteReleases: releases, productContent: content }));
    const secondPrefix = `workspaces/${ownerAccess.workspace.id}/sites/${siteId}/releases/${second.releaseId}`;
    const stored = releases.objects.get(`${secondPrefix}/media/${assetId}.png`);
    expect(stored).toBeDefined();
    expect((stored as Uint8Array).byteLength).toBe(bytes.byteLength);
    const html = String(releases.objects.get(`${secondPrefix}/index.html`));
    expect(html).toContain(`/media/${assetId}.png`);
    expect(html).toContain('alt="Shop front"');
  });

  it('never lets generated media stand in for product evidence', async () => {
    const client = await createTestWorkspace();
    const releases = fakeBucket();
    const content = fakeBucket();
    const { siteId } = await generated(client);
    const ai = { run: async () => new TextEncoder().encode('generated-bytes') } as unknown as Ai;
    const result = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.asset.generate', idempotencyKey: 'asset-generate', input: { siteId, prompt: 'Warm illustration of a pizza counter' },
    }, { siteReleases: releases, productContent: content, ai }));
    const assets = result.assets as { generated?: boolean; rights: { approved: boolean; source: string }; prompt?: string }[];
    expect(assets[0].generated).toBe(true);
    expect(assets[0].rights.approved).toBe(false);
    expect(assets[0].rights.source).toContain('generated');
    expect(assets[0].prompt).toContain('pizza counter');
  });
});

describe('design import', () => {
  it('applies a typed design, records conflicts and exports the readable view', async () => {
    const client = await createTestWorkspace();
    const releases = fakeBucket();
    const { siteId } = await generated(client);
    const markdown = `# Design
## Direction
- audience: local families
- density: airy
## Foundations
- canvas: #ffffff
- ink: #101012
- accent: #4d49fc
- accentink: #ffffff
## Shape
- radius: 4px, 12px, 24px, 9999px
## Motion
- duration: 180ms
- easing: easeout
- reduce: true
`;
    const imported = await Effect.runPromise(executeGateway(client, ownerAccess, {
      actionId: 'site.design.import', idempotencyKey: 'design-import', input: { siteId, markdown },
    }, { siteReleases: releases }));
    const design = imported.design as { color: { accent: string }; shape: { pill: number }; direction: { density: string }; source: { hash: string; reference: string } };
    expect(design.color.accent).toBe('#4d49fc');
    expect(design.shape.pill).toBe(9999);
    expect(design.direction.density).toBe('airy');
    expect(design.source.hash).toHaveLength(64);
    expect(design.source.reference).toContain('/design/1.md');
    expect((imported.decisions as unknown[]).length).toBeGreaterThan(0);
    expect(String(imported.designMarkdown)).toContain('accent: #4d49fc');
    expect([...releases.objects.keys()].some((key) => key.endsWith('/design/1.md'))).toBe(true);
  });
});

async function currentDocument(client: Awaited<ReturnType<typeof createTestWorkspace>>, siteId: string): Promise<SiteDocument> {
  const row = await client.execute({ sql: 'SELECT data FROM records WHERE id=?', args: [siteId] });
  return JSON.parse(String(row.rows[0].data)) as SiteDocument;
}

function currentRevision(doc: SiteDocument): number {
  return doc.revision;
}

async function saveDocument(client: Awaited<ReturnType<typeof createTestWorkspace>>, siteId: string, doc: SiteDocument): Promise<void> {
  await client.execute({ sql: 'UPDATE records SET data=? WHERE id=?', args: [JSON.stringify(doc), siteId] });
}
