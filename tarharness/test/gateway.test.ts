import { createClient } from '@libsql/client';
import { Effect } from 'effect';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WORKSPACE_SCHEMA } from '../src/db/schema.ts';
import { executeGateway } from '../src/gateway/actions.ts';
import type { AccessContext } from '../src/types.ts';

const clients: ReturnType<typeof createClient>[] = [];
afterEach(() => { while (clients.length) clients.pop()?.close(); vi.unstubAllGlobals(); });

async function workspace() {
  const client = createClient({ url: 'file::memory:' }); clients.push(client);
  for (const statement of WORKSPACE_SCHEMA) await client.execute(statement);
  return client;
}

const access: AccessContext = {
  identity: { id: 'user_1', email: 'owner@example.com', name: 'Owner' },
  workspace: { id: 'ws_1', name: 'Test', slug: 'test', mode: 'work', databaseName: 'test', databaseHost: 'test', state: 'active' },
  member: { workspaceId: 'ws_1', userId: 'user_1', role: 'owner', state: 'active' },
};

describe('mandatory Gateway execution', () => {
  it('commits one Record and returns it for an idempotent replay', async () => {
    const client = await workspace();
    const request = { actionId: 'record.create' as const, idempotencyKey: 'create-contact-1', input: { type: 'contact', title: 'Ada Lovelace', data: { email: 'ada@example.com' } } };
    const first = await Effect.runPromise(executeGateway(client, access, request));
    const replay = await Effect.runPromise(executeGateway(client, access, request));
    expect(first).toEqual(replay);
    const records = await client.execute('SELECT id,title FROM records');
    const events = await client.execute('SELECT id FROM events');
    expect(records.rows).toHaveLength(1);
    expect(events.rows).toHaveLength(1);
  });

  it('rejects reuse of an operation key with different input', async () => {
    const client = await workspace();
    await Effect.runPromise(executeGateway(client, access, { actionId: 'task.create', idempotencyKey: 'task-1', input: { title: 'Review order' } }));
    await expect(Effect.runPromise(executeGateway(client, access, { actionId: 'task.create', idempotencyKey: 'task-1', input: { title: 'Different task' } }))).rejects.toThrow('different input');
  });

  it('installs selected Bot Flows and their canvas cards idempotently', async () => {
    const client = await workspace();
    const request = { actionId: 'directory.install' as const, idempotencyKey: 'install-sales-1', input: { itemId: 'sales', flowIds: ['customer-follow-up'] } };
    const first = await Effect.runPromise(executeGateway(client, access, request));
    const replay = await Effect.runPromise(executeGateway(client, access, request));
    expect(first).toEqual(replay);
    const definitions = await client.execute("SELECT kind,state FROM definitions WHERE id LIKE 'directory.sales.%'");
    expect(definitions.rows).toHaveLength(3);
    expect(definitions.rows.every((item) => item.state === 'published')).toBe(true);
    await Effect.runPromise(executeGateway(client, access, { actionId: 'directory.remove', idempotencyKey: 'remove-sales-1', input: { itemId: 'sales' } }));
    const removed = await client.execute("SELECT state FROM definitions WHERE id LIKE 'directory.sales.%'");
    expect(removed.rows.every((item) => item.state === 'archived')).toBe(true);
  });

  it('publishes a custom Flow through the Gateway', async () => {
    const client = await workspace();
    await Effect.runPromise(executeGateway(client, access, { actionId: 'directory.install', idempotencyKey: 'install-sales-custom-1', input: { itemId: 'sales', flowIds: ['customer-follow-up'] } }));
    const result = await Effect.runPromise(executeGateway(client, access, { actionId: 'flow.publish', idempotencyKey: 'publish-flow-1', input: { botId: 'sales', flowId: 'custom.sales.new-customer', name: 'New customer', actions: [{ id: 'record.create' }, { id: 'task.create' }] } }));
    expect(result).toEqual({ flowId: 'custom.sales.new-customer', published: true });
    const definitions = await client.execute("SELECT kind FROM definitions WHERE id LIKE 'custom.sales.new-customer%'");
    expect(definitions.rows).toHaveLength(2);
  });

  it('searches TinyFish through the Gateway and replays the saved sources', async () => {
    const client = await workspace();
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [
      { title: 'TAR docs', url: 'https://example.com/tar', snippet: 'Current TAR documentation.', date: '2026-09-22' },
    ] })));
    vi.stubGlobal('fetch', fetch);
    const request = { actionId: 'web.search' as const, idempotencyKey: 'search-tar-1', input: { query: 'TAR documentation', location: 'IN', language: 'en' } };
    const first = await Effect.runPromise(executeGateway(client, access, request, { tinyfish: 'test-key' }));
    const replay = await Effect.runPromise(executeGateway(client, access, request, { tinyfish: 'test-key' }));
    expect(first).toEqual({ query: 'TAR documentation', sources: [{ title: 'TAR docs', url: 'https://example.com/tar', snippet: 'Current TAR documentation.', date: '2026-09-22' }] });
    expect(replay).toEqual(first);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
