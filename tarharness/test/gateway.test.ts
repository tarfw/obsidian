import { createClient } from '@libsql/client';
import { Effect } from 'effect';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WORKSPACE_SCHEMA } from '../src/db/schema.ts';
import { executeAutomaticFlowStep, executeGateway } from '../src/gateway/actions.ts';
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

  it('stores validated Space routines only in Personal', async () => {
    const client = await workspace();
    const personal: AccessContext = { ...access, workspace: { ...access.workspace, mode: 'personal' } };
    const request = { actionId: 'routine.save' as const, idempotencyKey: 'routine-1', input: { label: 'Kitchen shift', workspace: 'northstar', role: 'Chef', start: '09:00', end: '15:00', days: '1,2,3,4,5', priority: 10 } };
    const result = await Effect.runPromise(executeGateway(client, personal, request));
    expect(result.record).toMatchObject({ type: 'routine', title: 'Kitchen shift', data: { workspace: 'northstar', role: 'Chef', days: [1, 2, 3, 4, 5] } });
    expect(await Effect.runPromise(executeGateway(client, personal, request))).toEqual(result);
    await expect(Effect.runPromise(executeGateway(client, access, { ...request, idempotencyKey: 'routine-work' }))).rejects.toThrow('saved in Personal');
  });

  it('edits a routine with its version and owner through the routine action', async () => {
    const client = await workspace();
    const personal: AccessContext = { ...access, workspace: { ...access.workspace, mode: 'personal' } };
    const created = await Effect.runPromise(executeGateway(client, personal, {
      actionId: 'routine.save', idempotencyKey: 'routine-create',
      input: { label: 'Morning', workspace: 'test', start: '08:00', end: '11:00' },
    }));
    const routine = created.record as { id: string; version: number };
    const updated = await Effect.runPromise(executeGateway(client, personal, {
      actionId: 'routine.save', idempotencyKey: 'routine-edit',
      input: { id: routine.id, baseVersion: routine.version, label: 'Service', workspace: 'test', start: '11:00', end: '16:00' },
    }));
    expect(updated.record).toMatchObject({ id: routine.id, version: 2, title: 'Service', data: { start: '11:00' } });
    expect((await client.execute("SELECT id FROM records WHERE type='routine'")).rows).toHaveLength(1);
    expect((await client.execute("SELECT id FROM events WHERE action_id='routine.save'")).rows).toHaveLength(2);
    await expect(Effect.runPromise(executeGateway(client, personal, {
      actionId: 'routine.save', idempotencyKey: 'routine-stale',
      input: { id: routine.id, baseVersion: 1, label: 'Old', workspace: 'test', start: '08:00', end: '10:00' },
    }))).rejects.toThrow('Routine changed');
    await expect(Effect.runPromise(executeGateway(client, { ...personal, identity: { ...personal.identity, id: 'other' } }, {
      actionId: 'routine.save', idempotencyKey: 'routine-other',
      input: { id: routine.id, baseVersion: 2, label: 'Other', workspace: 'test', start: '08:00', end: '10:00' },
    }))).rejects.toThrow('Space routine not found');
    await expect(Effect.runPromise(executeGateway(client, personal, {
      actionId: 'record.update', idempotencyKey: 'routine-bypass',
      input: { recordId: routine.id, baseVersion: 2, title: 'Bypass' },
    }))).rejects.toThrow('registered domain action');
    await expect(Effect.runPromise(executeGateway(client, { ...personal, identity: { ...personal.identity, id: 'other' } }, {
      actionId: 'routine.remove', idempotencyKey: 'routine-remove-other', input: { id: routine.id, baseVersion: 2 },
    }))).rejects.toThrow('Space routine not found');
    const removed = await Effect.runPromise(executeGateway(client, personal, {
      actionId: 'routine.remove', idempotencyKey: 'routine-remove', input: { id: routine.id, baseVersion: 2 },
    }));
    expect(removed).toEqual({ id: routine.id });
    expect((await client.execute('SELECT state,archived FROM records WHERE id=?', [routine.id])).rows[0]).toMatchObject({ state: 'archived', archived: expect.any(Number) });
    expect((await client.execute("SELECT id FROM events WHERE action_id='routine.remove'")).rows).toHaveLength(1);
  });

  it('rejects reuse of an operation key with different input', async () => {
    const client = await workspace();
    await Effect.runPromise(executeGateway(client, access, { actionId: 'task.create', idempotencyKey: 'task-1', input: { title: 'Review order' } }));
    await expect(Effect.runPromise(executeGateway(client, access, { actionId: 'task.create', idempotencyKey: 'task-1', input: { title: 'Different task' } }))).rejects.toThrow('different input');
  });

  it('requires domain actions for protected record creation and state changes', async () => {
    const client = await workspace();
    await expect(Effect.runPromise(executeGateway(client, access, { actionId: 'record.create', idempotencyKey: 'fake-site', input: { type: 'site', title: 'Unreviewed site' } }))).rejects.toThrow('registered domain action');
    const created = await Effect.runPromise(executeGateway(client, access, { actionId: 'task.create', idempotencyKey: 'safe-task', input: { title: 'Review quote' } }));
    const task = created.record as { id: string; version: number };
    await expect(Effect.runPromise(executeGateway(client, access, { actionId: 'record.update', idempotencyKey: 'fake-complete', input: { recordId: task.id, baseVersion: task.version, state: 'completed' } }))).rejects.toThrow('registered action');
    expect((await client.execute('SELECT state FROM records WHERE id=?', [task.id])).rows[0].state).toBe('open');
  });

  it('publishes and resumes a standalone Flow Book with replay-safe steps', async () => {
    const client = await workspace();
    await Effect.runPromise(executeGateway(client, access, { actionId: 'flow.publish', idempotencyKey: 'publish-book-1', input: { flowId: 'book.newmember', name: 'Onboard member', actions: [{ id: 'contact.create' }, { id: 'task.create' }] } }));
    const started = await Effect.runPromise(executeGateway(client, access, { actionId: 'flow.start', idempotencyKey: 'start-book-1', input: { flowId: 'book.newmember' } }));
    const runId = (started.run as { id: string }).id;
    const firstRequest = { actionId: 'flow.advance' as const, idempotencyKey: 'advance-book-1', input: { runId, actionId: 'contact.create', data: { name: 'Ada Lovelace', email: 'ada@example.com' } } };
    const first = await Effect.runPromise(executeGateway(client, access, firstRequest));
    const replay = await Effect.runPromise(executeGateway(client, access, firstRequest));
    expect(replay).toEqual(first);
    expect(first.run).toMatchObject({ state: 'ready', step: 1, actionId: 'task.create' });
    const second = await Effect.runPromise(executeGateway(client, access, { actionId: 'flow.advance', idempotencyKey: 'advance-book-2', input: { runId, actionId: 'task.create', data: { title: 'Prepare welcome pack' } } }));
    expect(second.run).toMatchObject({ state: 'completed', step: 2, actionId: null });
    expect((await client.execute('SELECT id FROM records')).rows).toHaveLength(2);
    expect((await client.execute('SELECT id FROM events WHERE action_id=\'contact.create\'')).rows).toHaveLength(1);
    expect((await client.execute('SELECT action,occurrence,state FROM steps WHERE run=? ORDER BY occurrence', [runId])).rows)
      .toMatchObject([{ action: 'contact.create', occurrence: 0, state: 'accepted' }, { action: 'task.create', occurrence: 1, state: 'accepted' }]);
  });

  it('keeps a published edition and a running snapshot when a book changes', async () => {
    const client = await workspace();
    const flowId = 'book.editions';
    await Effect.runPromise(executeGateway(client, access, { actionId: 'flow.publish', idempotencyKey: 'edition-1', input: { flowId, name: 'First', actions: [{ id: 'task.create' }] } }));
    const started = await Effect.runPromise(executeGateway(client, access, { actionId: 'flow.start', idempotencyKey: 'edition-run', input: { flowId } }));
    await Effect.runPromise(executeGateway(client, access, { actionId: 'flow.publish', idempotencyKey: 'edition-2', input: { flowId, name: 'Second', actions: [{ id: 'contact.create' }] } }));
    const editions = await client.execute('SELECT version,name FROM editions WHERE definition=? ORDER BY version', [flowId]);
    expect(editions.rows.map((row) => [row.version, row.name])).toEqual([[1, 'First'], [2, 'Second']]);
    const runId = (started.run as { id: string }).id;
    const result = await Effect.runPromise(executeGateway(client, access, { actionId: 'flow.advance', idempotencyKey: 'edition-advance', input: { runId, actionId: 'task.create', data: { title: 'Original step' } } }));
    expect(result.run).toMatchObject({ state: 'completed', flowVersion: 1 });
  });

  it('runs a reviewed internal step once and leaves external effects for manual review', async () => {
    const client = await workspace();
    await expect(Effect.runPromise(executeGateway(client, access, { actionId: 'flow.publish', idempotencyKey: 'unsafe-auto', input: { flowId: 'book.unsafe', name: 'Unsafe', actions: [{ id: 'web.search', auto: true, input: { query: 'Example' } }] } }))).rejects.toThrow('Automatic steps');
    await expect(Effect.runPromise(executeGateway(client, access, { actionId: 'flow.publish', idempotencyKey: 'missing-auto-input', input: { flowId: 'book.missing', name: 'Missing', actions: [{ id: 'task.create', auto: true }] } }))).rejects.toThrow('complete reviewed input');
    await Effect.runPromise(executeGateway(client, access, { actionId: 'flow.publish', idempotencyKey: 'publish-auto', input: { flowId: 'book.automatic', name: 'Prepare', actions: [{ id: 'task.create', auto: true, input: { title: 'Prepare welcome pack' } }] } }));
    const started = await Effect.runPromise(executeGateway(client, access, { actionId: 'flow.start', idempotencyKey: 'start-auto', input: { flowId: 'book.automatic' } }));
    const runId = (started.run as { id: string }).id;
    await expect(Effect.runPromise(executeGateway(client, access, { actionId: 'flow.advance', idempotencyKey: 'manual-auto', input: { runId, actionId: 'task.create', data: { title: 'Different task' } } }))).rejects.toThrow('dispatched');
    expect(await executeAutomaticFlowStep(client, access, runId, 0)).toEqual({ state: 'completed', step: 1, advanced: true });
    expect((await executeAutomaticFlowStep(client, access, runId, 0)).advanced).toBe(false);
    expect((await client.execute("SELECT title FROM records WHERE type='task'")).rows.map((item) => item.title)).toEqual(['Prepare welcome pack']);
    expect((await client.execute("SELECT id FROM events WHERE action_id='task.create'")).rows).toHaveLength(1);
    expect((await client.execute('SELECT occurrence,action,state FROM steps WHERE run=?', [runId])).rows)
      .toMatchObject([{ occurrence: 0, action: 'task.create', state: 'accepted' }]);
  });

  it('does not shift a replayed Workflow checkpoint onto the next step', async () => {
    const client = await workspace();
    await Effect.runPromise(executeGateway(client, access, { actionId: 'flow.publish', idempotencyKey: 'publish-replay', input: { flowId: 'book.replay', name: 'Replay', actions: [
      { id: 'task.create', auto: true, input: { title: 'First task' } },
      { id: 'task.create', auto: true, input: { title: 'Second task' } },
    ] } }));
    const started = await Effect.runPromise(executeGateway(client, access, { actionId: 'flow.start', idempotencyKey: 'start-replay', input: { flowId: 'book.replay' } }));
    const runId = (started.run as { id: string }).id;
    expect(await executeAutomaticFlowStep(client, access, runId, 0)).toMatchObject({ step: 1, advanced: true });
    expect(await executeAutomaticFlowStep(client, access, runId, 0)).toMatchObject({ step: 1, advanced: true });
    expect((await client.execute("SELECT title FROM records WHERE type='task'")).rows.map((item) => item.title)).toEqual(['First task']);
    expect(await executeAutomaticFlowStep(client, access, runId, 1)).toMatchObject({ state: 'completed', step: 2, advanced: true });
    expect((await client.execute("SELECT title FROM records WHERE type='task' ORDER BY created,id")).rows.map((item) => item.title).sort()).toEqual(['First task', 'Second task']);
    expect((await client.execute('SELECT occurrence FROM steps WHERE run=? ORDER BY occurrence', [runId])).rows.map((row) => row.occurrence)).toEqual([0, 1]);
  });

  it('keeps contact identity separate from dated organization experience', async () => {
    const client = await workspace();
    const person = await Effect.runPromise(executeGateway(client, access, { actionId: 'contact.create', idempotencyKey: 'person-1', input: { name: 'Ada Lovelace' } }));
    const organization = await Effect.runPromise(executeGateway(client, access, { actionId: 'organization.create', idempotencyKey: 'organization-1', input: { name: 'Analytical Engines', website: 'https://example.com' } }));
    const personId = (person.record as { id: string }).id;
    const organizationId = (organization.record as { id: string }).id;
    const created = await Effect.runPromise(executeGateway(client, access, { actionId: 'relationship.create', idempotencyKey: 'link-1', input: { source: personId, target: organizationId, role: 'Engineer', since: 100 } }));
    const linkId = (created.link as { id: string }).id;
    await Effect.runPromise(executeGateway(client, access, { actionId: 'relationship.end', idempotencyKey: 'unlink-1', input: { id: linkId, until: 200 } }));
    const history = await client.execute('SELECT source,target,role,since,until FROM links WHERE id=?', [linkId]);
    expect(history.rows[0]).toMatchObject({ source: personId, target: organizationId, role: 'Engineer', since: 100, until: 200 });
  });

  it('records explicit, sourced consent without inferring it from an email address', async () => {
    const client = await workspace();
    const person = await Effect.runPromise(executeGateway(client, access, { actionId: 'contact.create', idempotencyKey: 'consent-person', input: { name: 'Ada', email: 'ada@example.com' } }));
    const contactId = (person.record as { id: string }).id;
    expect((await client.execute('SELECT id FROM consents')).rows).toHaveLength(0);
    await expect(Effect.runPromise(executeGateway(client, access, { actionId: 'consent.record', idempotencyKey: 'consent-no-evidence', input: { contactId, channel: 'email', purpose: 'marketing', state: 'granted', source: 'yes' } }))).rejects.toThrow('evidence');
    const request = { actionId: 'consent.record' as const, idempotencyKey: 'consent-granted', input: { contactId, channel: 'email', purpose: 'marketing', state: 'granted', source: 'Signed paper form on 2026-09-24' } };
    const granted = await Effect.runPromise(executeGateway(client, access, request));
    expect(await Effect.runPromise(executeGateway(client, access, request))).toEqual(granted);
    await Effect.runPromise(executeGateway(client, access, { actionId: 'consent.record', idempotencyKey: 'consent-revoked', input: { contactId, channel: 'email', purpose: 'marketing', state: 'revoked', source: 'Customer requested no further email' } }));
    expect((await client.execute('SELECT state FROM consents WHERE contact=? ORDER BY created,id', [contactId])).rows).toHaveLength(2);
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

  it('claims a paid search before concurrent duplicate requests', async () => {
    const client = await workspace();
    const fetch = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return new Response(JSON.stringify({ results: [{ title: 'Source', url: 'https://example.com', snippet: 'Evidence' }] }));
    });
    vi.stubGlobal('fetch', fetch);
    const request = { actionId: 'web.search' as const, idempotencyKey: 'search-concurrent', input: { query: 'evidence' } };
    const [first, second] = await Promise.all([
      Effect.runPromise(executeGateway(client, access, request, { tinyfish: 'test-key' })),
      Effect.runPromise(executeGateway(client, access, request, { tinyfish: 'test-key' })),
    ]);
    expect(second).toEqual(first);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((await client.execute("SELECT id FROM events WHERE action_id='web.search'")).rows).toHaveLength(1);
  });
});
