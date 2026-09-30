import { createClient } from '@libsql/client';
import { Effect } from 'effect';
import { afterEach, describe, expect, it } from 'vitest';
import { WORKSPACE_SCHEMA } from '../src/db/schema.ts';
import { executeGateway } from '../src/gateway/actions.ts';
import { readWorkspaceTools } from '../src/registry/tools.ts';
import type { AccessContext } from '../src/types.ts';

const clients: ReturnType<typeof createClient>[] = [];
afterEach(() => { while (clients.length) clients.pop()?.close(); });
async function workspace() {
  const client = createClient({ url: 'file::memory:' }); clients.push(client);
  for (const statement of WORKSPACE_SCHEMA) await client.execute(statement);
  return client;
}
const owner: AccessContext = {
  identity: { id: 'owner', email: 'owner@example.com', name: 'Owner' },
  workspace: { id: 'personal', name: 'Personal', slug: 'personal', mode: 'personal', databaseName: 'personal', databaseHost: 'test', state: 'active' },
  member: { workspaceId: 'personal', userId: 'owner', role: 'owner', state: 'active' },
};

describe('workspace Tools eligibility', () => {
  it('keeps POS and commerce out of Personal until a capability is enabled', async () => {
    const client = await workspace();
    const initial = await readWorkspaceTools(client, owner, { search: false });
    expect(initial.tools.map((tool) => tool.id)).toContain('task');
    expect(initial.tools.map((tool) => tool.id)).toContain('flows');
    expect(initial.tools.map((tool) => tool.id)).not.toContain('pos');
    expect(initial.tools.map((tool) => tool.id)).not.toContain('site');
    expect(initial.tools.map((tool) => tool.id)).not.toContain('search');

    await Effect.runPromise(executeGateway(client, owner, { actionId: 'capability.save', idempotencyKey: 'enable-pos', input: { module: 'pos', enabled: true, baseVersion: 0 } }));
    const enabled = await readWorkspaceTools(client, owner, { search: false });
    expect(enabled.tools.map((tool) => tool.id)).toContain('pos');
    expect(enabled.version).toBe(1);

    await Effect.runPromise(executeGateway(client, owner, { actionId: 'capability.save', idempotencyKey: 'disable-pos', input: { module: 'pos', enabled: false, baseVersion: 1 } }));
    expect((await readWorkspaceTools(client, owner, { search: false })).tools.map((tool) => tool.id)).not.toContain('pos');
  });

  it('requires management access and the current version to change capabilities', async () => {
    const client = await workspace();
    const member: AccessContext = { ...owner, member: { ...owner.member, role: 'member', workRole: 'cashier', roles: ['cashier'] } };
    await expect(Effect.runPromise(executeGateway(client, member, { actionId: 'capability.save', idempotencyKey: 'member-save', input: { module: 'pos', enabled: true, baseVersion: 0 } }))).rejects.toThrow();
    await Effect.runPromise(executeGateway(client, owner, { actionId: 'capability.save', idempotencyKey: 'owner-save', input: { module: 'pos', enabled: true, baseVersion: 0 } }));
    await expect(Effect.runPromise(executeGateway(client, owner, { actionId: 'capability.save', idempotencyKey: 'stale-save', input: { module: 'site', enabled: true, baseVersion: 0 } }))).rejects.toThrow('Tools changed');
    const cashier = await readWorkspaceTools(client, member, { search: true });
    expect(cashier.tools.map((tool) => tool.id)).toContain('pos');
    expect(cashier.tools.map((tool) => tool.id)).not.toContain('stock');
    expect(cashier.tools.map((tool) => tool.id)).not.toContain('site');
    expect(cashier.canManage).toBe(false);
  });
});
