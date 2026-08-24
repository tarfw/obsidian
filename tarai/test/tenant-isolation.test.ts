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
    await alphaRepo.create('matter', { id: 'shared-id', type: 'product', data: { title: 'Alpha coffee' }, actor: 'alpha-owner' });
    await betaRepo.create('matter', { id: 'shared-id', type: 'product', data: { title: 'Beta tea' }, actor: 'beta-owner' });

    expect((await alphaRepo.list('matter', { id: 'shared-id' }))[0].data.title).toBe('Alpha coffee');
    expect((await betaRepo.list('matter', { id: 'shared-id' }))[0].data.title).toBe('Beta tea');
  });

  it('does not put the personal inbox table in workspace databases', async () => {
    await expect(alpha.execute('SELECT * FROM inbox')).rejects.toThrow(/no such table/i);
  });

  it('merges nested app patches without creating a second data envelope', async () => {
    const repo = new TenantRepository(alpha);
    await repo.create('matter', { id: 'stock', type: 'product', data: { title: 'Coffee', value: 2, unit: 'bag' }, actor: 'owner' });
    const updated = await repo.update('matter', 'stock', { value: 5, data: { unit: 'box' } });
    expect(updated?.data).toEqual({ title: 'Coffee', value: 5, unit: 'box' });
  });
});
