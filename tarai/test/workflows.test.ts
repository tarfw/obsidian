import { describe, it, expect, beforeEach } from 'vitest';
import { SitePublishWorkflow } from '../src/workflows/site-publish.ts';
import { RoutineWorkflow } from '../src/workflows/routine.ts';
import { ApprovalExecutionWorkflow } from '../src/workflows/approval-execution.ts';
import { createDatabaseClient, initializeSchema } from '../src/data/turso.ts';
import { WorkspaceRepository } from '../src/data/repositories/workspace.ts';
import { RoutineRepository } from '../src/data/repositories/routine.ts';
import { ApprovalRepository } from '../src/data/repositories/approval.ts';
import { MatterRepository } from '../src/data/repositories/matter.ts';
import type { AuthContext } from '../src/domain/types.ts';
import type { WorkflowStep } from 'cloudflare:workers';
import fs from 'node:fs';
import path from 'node:path';

describe('Cloudflare Workflows Multi-Step Execution', () => {
  let client: ReturnType<typeof createDatabaseClient>;
  const localStep = { do: async (_name: string, callback: () => Promise<unknown>) => callback() } as unknown as WorkflowStep;

  const ownerAuth: AuthContext = {
    userId: 'u_owner',
    workspaceId: 'ws_workflow',
    email: 'owner@example.com',
    role: 'owner',
    status: 'active',
    audience: 'owner',
  };

  beforeEach(async () => {
    client = createDatabaseClient({ TURSO_DATABASE_URL: 'file::memory:' });
    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../src/data/schema.sql'), 'utf-8');
    await initializeSchema(client, schemaSql);

    const wsRepo = new WorkspaceRepository(client);
    await wsRepo.create({
      id: 'ws_workflow',
      name: 'Workflow Workspace',
      slug: 'wf_ws',
      currency: 'USD',
      settings: {},
    });
  });

  it('executes SitePublishWorkflow with verification and KV cache promotion', async () => {
    const wf = new SitePublishWorkflow(undefined, {});
    const result = await wf.run(
      {
        payload: {
          workspaceId: 'ws_workflow',
          jobId: 'job_site_1',
          siteTitle: 'Acme Cafe',
          slices: [
            {
              sliceId: 'slice_offerings',
              category: 'offerings',
              facts: { coffee: '$3.50', tea: '$2.50' },
              version: 1,
            },
          ],
        },
      },
      localStep
    );

    expect(result.success).toBe(true);
    expect(result.versionId).toBeDefined();
    expect(result.publishedUrl).toBe('/sites/ws_workflow');
  });

  it('executes RoutineWorkflow, claims lease, runs check, and reschedules next run', async () => {
    const routineRepo = new RoutineRepository(client);
    const past = new Date(Date.now() - 1000).toISOString();

    await routineRepo.create({
      id: 'rt_wf_test',
      workspaceId: 'ws_workflow',
      name: 'Test Chore',
      scheduleCron: '*/5 * * * *',
      nextRunAt: past,
      config: {},
    });

    const wf = new RoutineWorkflow(undefined, {}, client);
    const res = await wf.run(
      {
        payload: {
          routineId: 'rt_wf_test',
          workspaceId: 'ws_workflow',
          workerId: 'worker_node_1',
        },
      },
      localStep
    );

    expect(res.status).toBe('completed');
    expect(res.nextRun).toBeDefined();
  });

  it('executes ApprovalExecutionWorkflow for approved actions', async () => {
    const matterRepo = new MatterRepository(client);
    await matterRepo.create('ws_workflow', 'task_target', 'task', {
      title: 'Target Task',
      status: 'todo',
      priority: 'medium',
    });

    const approvalRepo = new ApprovalRepository(client);
    await approvalRepo.create({
      id: 'appr_exec_1',
      workspaceId: 'ws_workflow',
      actorId: 'u_member',
      requiredRole: 'admin',
      actionType: 'task.archive',
      payloadHash: 'hash_123',
      payload: { id: 'task_target' },
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      idempotencyKey: 'idemp_appr_exec_1',
    });

    // Owner approves the request
    await approvalRepo.decide('ws_workflow', 'appr_exec_1', 'approved', 'u_owner');

    // Run approval execution workflow
    const wf = new ApprovalExecutionWorkflow(undefined, {}, client);
    const res = await wf.run(
      {
        payload: {
          approvalId: 'appr_exec_1',
          workspaceId: 'ws_workflow',
          executorAuth: ownerAuth,
        },
      },
      localStep
    );

    expect(res.status).toBe('executed');
    expect((res.toolResult.data as any)?.archived).toBe(true);

    // Verify status is now 'executed'
    const updatedApproval = await approvalRepo.findById('ws_workflow', 'appr_exec_1');
    expect(updatedApproval?.status).toBe('executed');
  });
});
