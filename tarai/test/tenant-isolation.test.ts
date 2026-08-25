import { beforeEach, describe, expect, it } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { WORKSPACE_SCHEMA } from '../src/data/dedicated-schema.ts';
import { initializeSchema } from '../src/data/turso.ts';
import { TenantRepository } from '../src/data/repositories/tenant.ts';

describe('one dedicated database per workspace', () => {
  let alpha: Client;
  let beta: Client;

  beforeEach(async () => {
    alpha = createClient({ url: 'file::memory:' });
    beta = createClient({ url: 'file::memory:' });
    await Promise.all([
      initializeSchema(alpha, WORKSPACE_SCHEMA),
      initializeSchema(beta, WORKSPACE_SCHEMA),
    ]);
  });

  it('keeps identical record ids isolated in separate workspace databases', async () => {
    const alphaRepo = new TenantRepository(alpha);
    const betaRepo = new TenantRepository(beta);
    await alphaRepo.createMatter({ id: 'shared-id', type: 'product', data: { title: 'Alpha coffee' } });
    await betaRepo.createMatter({ id: 'shared-id', type: 'product', data: { title: 'Beta tea' } });

    expect((await alphaRepo.list('matter', { id: 'shared-id' }))[0].data.title).toBe('Alpha coffee');
    expect((await betaRepo.list('matter', { id: 'shared-id' }))[0].data.title).toBe('Beta tea');
  });

  it('does not put the personal inbox table in workspace databases', async () => {
    await expect(alpha.execute('SELECT * FROM inbox')).rejects.toThrow(/no such table/i);
  });

  it('merges nested app patches without creating a second data envelope', async () => {
    const repo = new TenantRepository(alpha);
    await repo.createMatter({ id: 'stock', type: 'product', data: { title: 'Coffee', value: 2, unit: 'bag' } });
    const updated = await repo.updateMatter('stock', { data: { value: 5, unit: 'box' } });
    expect(updated?.data).toEqual({ title: 'Coffee', value: 5, unit: 'box' });
  });
});

