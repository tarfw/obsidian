import { createClient } from '@libsql/client';
import { describe, expect, it } from 'vitest';
import { HarnessRepository, ensureHarnessSchema } from '../src/harness/repository.ts';

describe('Harness workspace repository', () => {
  it('keeps definitions, records, runs, and audit events in canonical tables', async () => {
    const client = createClient({ url: 'file::memory:' });
    await ensureHarnessSchema(client);
    const repo = new HarnessRepository(client);
    const bot = await repo.putDef({ id: 'bot_orders', kind: 'bot', name: 'Orders', body: { workflows: [] } });
    const record = await repo.createRecord({ type: 'orders', title: 'Order #42', data: { total: 2400 }, actor: 'user_1' });
    const updated = await repo.updateRecord(record.id, { status: 'paid', baseVersion: 1 });
    const run = await repo.createRun({ botId: bot.id, workflowId: 'checkout', stepId: 'collect', actor: 'user_1', recordId: record.id });
    await repo.event({ actor: 'user_1', action: 'run.start', ref: run.id, idem: 'command_1' });
    expect((await repo.listDefs('bot'))[0].name).toBe('Orders');
    expect(updated.status).toBe('paid');
    expect(run.recordId).toBe(record.id);
    await client.close();
  });
});
