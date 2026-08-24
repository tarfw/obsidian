import { describe, it, expect, beforeEach } from 'vitest';
import { createDatabaseClient, initializeSchema } from '../src/data/turso.ts';
import { RoutineRepository } from '../src/data/repositories/routine.ts';
import { WorkspaceRepository } from '../src/data/repositories/workspace.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('Atomic Routine Leasing & Scheduling', () => {
  let client: ReturnType<typeof createDatabaseClient>;
  let routineRepo: RoutineRepository;

  beforeEach(async () => {
    client = createDatabaseClient({ TURSO_DATABASE_URL: 'file::memory:' });
    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../src/data/schema.sql'), 'utf-8');
    await initializeSchema(client, schemaSql);

    const wsRepo = new WorkspaceRepository(client);
    await wsRepo.create({
      id: 'ws_routines',
      name: 'Routines Workspace',
      slug: 'routines',
      currency: 'USD',
      settings: {},
    });

    routineRepo = new RoutineRepository(client);
  });

  it('claims due routines atomically and prevents double leasing', async () => {
    const pastTime = new Date(Date.now() - 60 * 1000).toISOString();
    const now = new Date().toISOString();

    await routineRepo.create({
      id: 'rt_stock_scan',
      workspaceId: 'ws_routines',
      name: 'Stock Scan Chore',
      scheduleCron: '*/5 * * * *',
      nextRunAt: pastTime,
      config: {},
    });

    // Worker 1 claims routine
    const claim1 = await routineRepo.claimRoutine('rt_stock_scan', 'worker_1', 300, now);
    expect(claim1).toBe(true);

    // Worker 2 attempts concurrent claim
    const claim2 = await routineRepo.claimRoutine('rt_stock_scan', 'worker_2', 300, now);
    expect(claim2).toBe(false); // Refused because active lease exists
  });

  it('allows claiming after lease expiration', async () => {
    const expiredTime = new Date(Date.now() - 3600 * 1000).toISOString();
    const now = new Date().toISOString();

    await routineRepo.create({
      id: 'rt_expired',
      workspaceId: 'ws_routines',
      name: 'Expired Lease Chore',
      scheduleCron: '*/5 * * * *',
      nextRunAt: expiredTime,
      config: {},
    });

    // First claim with past expiration
    await routineRepo.claimRoutine('rt_expired', 'worker_old', -60, now);

    // New worker should successfully recover expired lease
    const recovered = await routineRepo.claimRoutine('rt_expired', 'worker_new', 300, now);
    expect(recovered).toBe(true);
  });
});
