import { describe, it, expect, beforeEach } from 'vitest';
import { TarRouter, createDefaultToolRegistry } from '../src/modules/router.ts';
import { createDatabaseClient, initializeSchema } from '../src/data/turso.ts';
import { WorkspaceRepository } from '../src/data/repositories/workspace.ts';
import { MemberRepository } from '../src/data/repositories/member.ts';
import { ApprovalRepository } from '../src/data/repositories/approval.ts';
import type { AuthContext } from '../src/domain/types.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('Tier 1 Tar Router Module & End-to-End Vertical Slice', () => {
  let client: ReturnType<typeof createDatabaseClient>;
  let router: TarRouter;

  const ownerAuth: AuthContext = {
    userId: 'u_owner',
    workspaceId: 'ws_tar_test',
    email: 'owner@example.com',
    role: 'owner',
    status: 'active',
    audience: 'owner',
  };

  const memberAuth: AuthContext = {
    userId: 'u_member',
    workspaceId: 'ws_tar_test',
    email: 'member@example.com',
    role: 'member',
    status: 'active',
    audience: 'member',
  };

  beforeEach(async () => {
    client = createDatabaseClient({ TURSO_DATABASE_URL: 'file::memory:' });
    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../src/data/schema.sql'), 'utf-8');
    await initializeSchema(client, schemaSql);

    const wsRepo = new WorkspaceRepository(client);
    await wsRepo.create({
      id: 'ws_tar_test',
      name: 'Tar Workspace',
      slug: 'tar_ws',
      currency: 'USD',
      settings: {},
    });

    const memberRepo = new MemberRepository(client);
    await memberRepo.create({
      id: 'm_owner',
      workspaceId: 'ws_tar_test',
      userId: 'u_owner',
      email: 'owner@example.com',
      role: 'owner',
      status: 'active',
    });
    await memberRepo.create({
      id: 'm_member',
      workspaceId: 'ws_tar_test',
      userId: 'u_member',
      email: 'member@example.com',
      role: 'member',
      status: 'active',
    });

    router = new TarRouter(createDefaultToolRegistry());
  });

  it('routes read intent to metrics.get tool', async () => {
    const res = await router.handleRequest(
      {
        requestId: 'req_1',
        scope: 'workspace',
        intent: 'show workspace pulse and metrics',
      },
      memberAuth,
      client
    );

    expect(res.routedTool).toBe('metrics.get');
    expect(res.result.status).toBe('executed');
    expect(res.result.data).toBeDefined();
  });

  it('executes reversible write directly for members (task.create)', async () => {
    const res = await router.handleRequest(
      {
        requestId: 'req_2',
        scope: 'workspace',
        intent: 'create a task',
        parameters: {
          toolName: 'task.create',
          toolInput: {
            id: 'task_alpha',
            title: 'Order new coffee filters',
            priority: 'medium',
          },
        },
      },
      memberAuth,
      client
    );

    expect(res.result.status).toBe('executed');
    expect((res.result.data as any)?.title).toBe('Order new coffee filters');
  });

  it('intercepts consequential action from member and stages for approval', async () => {
    const res = await router.handleRequest(
      {
        requestId: 'req_3',
        scope: 'workspace',
        intent: 'archive task',
        parameters: {
          toolName: 'task.archive',
          toolInput: { id: 'task_alpha' },
        },
      },
      memberAuth,
      client
    );

    expect(res.result.status).toBe('staged_for_approval');
    expect(res.result.approvalId).toBeDefined();
    expect(res.cardPreview?.type).toBe('action-confirm');

    // Verify approval record exists in Turso
    const approvalRepo = new ApprovalRepository(client);
    const pending = await approvalRepo.listPending('ws_tar_test');
    expect(pending.length).toBe(1);
    expect(pending[0].actionType).toBe('task.archive');
  });
});
