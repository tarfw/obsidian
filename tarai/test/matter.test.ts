import { describe, it, expect, beforeEach } from 'vitest';
import { createDatabaseClient, initializeSchema } from '../src/data/turso.ts';
import { MatterRepository } from '../src/data/repositories/matter.ts';
import { MetricsRepository } from '../src/data/repositories/metrics.ts';
import { MotionRepository } from '../src/data/repositories/motion.ts';
import { WorkspaceRepository } from '../src/data/repositories/workspace.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('Matter Entities, Append-Only Motion, and Deterministic Metrics', () => {
  let client: ReturnType<typeof createDatabaseClient>;
  let matterRepo: MatterRepository;
  let metricsRepo: MetricsRepository;
  let motionRepo: MotionRepository;

  beforeEach(async () => {
    client = createDatabaseClient({ TURSO_DATABASE_URL: 'file::memory:' });
    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../src/data/schema.sql'), 'utf-8');
    await initializeSchema(client, schemaSql);

    const wsRepo = new WorkspaceRepository(client);
    await wsRepo.create({
      id: 'ws_test',
      name: 'Test Workspace',
      slug: 'test',
      currency: 'USD',
      settings: {},
    });

    matterRepo = new MatterRepository(client);
    metricsRepo = new MetricsRepository(client);
    motionRepo = new MotionRepository(client);
  });

  it('creates and retrieves strongly-typed discriminated matter', async () => {
    // 1. Create Product
    const prod = await matterRepo.create('ws_test', 'prod_1', 'product', {
      sku: 'SKU-001',
      name: 'Coffee Beans',
      description: 'Roasted dark beans',
      priceCents: 1500,
      currency: 'USD',
      stockLevel: 4,
      lowStockThreshold: 10,
      status: 'active',
    });

    expect(prod.data.sku).toBe('SKU-001');
    expect(prod.version).toBe(1);

    // 2. Create Task
    const task = await matterRepo.create('ws_test', 'task_1', 'task', {
      title: 'Restock coffee beans',
      status: 'todo',
      priority: 'high',
    });

    expect(task.data.title).toBe('Restock coffee beans');

    // 3. Create Invoice
    await matterRepo.create('ws_test', 'inv_1', 'invoice', {
      customerId: 'cust_100',
      items: [{ description: 'Coffee bag', amountCents: 1500, quantity: 2 }],
      totalCents: 3000,
      status: 'paid',
    });

    // 4. Validate deterministic metric calculations in code
    const metrics = await metricsRepo.getWorkspaceMetrics('ws_test');
    expect(metrics.totalRevenueCents).toBe(3000);
    expect(metrics.totalOrders).toBe(1);
    expect(metrics.lowStockItemsCount).toBe(1); // 4 <= 10
    expect(metrics.openTasksCount).toBe(1);
  });

  it('rejects invalid matter data schema deterministically', async () => {
    await expect(
      matterRepo.create('ws_test', 'prod_invalid', 'product', {
        sku: '',
        name: 'Invalid',
        description: 'Test',
        priceCents: -100, // Invalid negative price
        currency: 'USD',
        stockLevel: 5,
        lowStockThreshold: 2,
        status: 'active',
      } as any)
    ).rejects.toThrow();
  });

  it('records append-only motion audit events', async () => {
    await motionRepo.record(
      'ws_test',
      'mot_1',
      'inventory.adjusted',
      'user_123',
      { oldStock: 10, newStock: 4 },
      'prod_1'
    );

    const logs = await motionRepo.listByWorkspace('ws_test');
    expect(logs.length).toBe(1);
    expect(logs[0].eventType).toBe('inventory.adjusted');
    expect(logs[0].actorId).toBe('user_123');
    expect(logs[0].matterId).toBe('prod_1');
  });
});
