import { createClient } from '@libsql/client';
import { describe, expect, it } from 'vitest';
import { buildRecordProfile } from '../src/genui/record-profile.ts';
import { HarnessRepository, ensureHarnessSchema } from '../src/harness/repository.ts';

describe('shared record profile', () => {
  it('uses canonical records and linked immutable events without seeding UI content', async () => {
    const client = createClient({ url: 'file::memory:' });
    await ensureHarnessSchema(client);
    const repo = new HarnessRepository(client);
    const primary = await repo.createRecord({ id: 'record_primary', type: 'contacts', title: 'Primary contact', data: { organization: 'Organization', insight: 'Attention required' }, actor: 'user_1' });
    const related = await repo.createRecord({ id: 'record_related', type: 'orders', title: 'Related record', data: {}, actor: 'user_1' });
    await repo.event({ actor: 'user_1', action: 'workflow.step.completed', ref: primary.id, data: { summary: 'A workflow step completed', channel: 'message' }, relatedRecordIds: [related.id], idem: 'event_primary' });
    const events = await repo.listRecordEvents(related.id);
    const screen = buildRecordProfile(primary, events, [{ id: 'run_sales', botId: 'bot_sales', workflowId: 'sales', stepId: 'proposal', title: 'Sales', step: 'Send proposal', updatedAt: Date.now() }]);

    expect(events).toHaveLength(1);
    expect(screen.design.component).toBe('record-profile');
    expect(screen.identity.subtitle).toBe('Organization');
    expect(screen.activity.heading).toBe('Recent interactions');
    expect(screen.activity.events[0]?.summary).toBe('A workflow step completed');
    expect(screen.workflows[0]?.step).toBe('Send proposal');
    await client.close();
  });

  it('does not duplicate an event relationship when an idempotent command is replayed', async () => {
    const client = createClient({ url: 'file::memory:' });
    await ensureHarnessSchema(client);
    const repo = new HarnessRepository(client);
    const primary = await repo.createRecord({ id: 'record_one', type: 'contacts', title: 'One', data: {}, actor: 'user_1' });
    const related = await repo.createRecord({ id: 'record_two', type: 'contacts', title: 'Two', data: {}, actor: 'user_1' });
    const input = { actor: 'user_1', action: 'record.updated', ref: primary.id, relatedRecordIds: [related.id], idem: 'idempotent_event' };
    await repo.event(input);
    await repo.event(input);
    const count = await client.execute({ sql: "SELECT COUNT(*) AS count FROM links WHERE source IN (SELECT id FROM events WHERE idem = ?) AND target = ? AND kind = 'event_record'", args: ['idempotent_event', related.id] });

    expect(Number(count.rows[0]?.[0])).toBe(1);
    await client.close();
  });

  it('keeps an empty activity timeline empty instead of returning sample entries', async () => {
    const client = createClient({ url: 'file::memory:' });
    await ensureHarnessSchema(client);
    const repo = new HarnessRepository(client);
    const record = await repo.createRecord({ type: 'custom_data', title: 'A record', data: {}, actor: 'user_1' });
    const screen = buildRecordProfile(record, await repo.listRecordEvents(record.id));

    expect(screen.activity.empty).toBe(true);
    expect(screen.activity.events).toEqual([]);
    await client.close();
  });
});
