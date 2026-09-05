import { createClient } from '@libsql/client';
import { Effect } from 'effect';
import { afterEach, describe, expect, it } from 'vitest';
import { WORKSPACE_SCHEMA } from '../src/db/schema.ts';
import { executeGateway } from '../src/gateway/actions.ts';
import type { AccessContext } from '../src/types.ts';

const clients: ReturnType<typeof createClient>[] = [];
afterEach(() => { while (clients.length) clients.pop()?.close(); });

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
});
