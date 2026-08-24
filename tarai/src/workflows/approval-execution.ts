/**
 * Cloudflare Workflow: Approval Execution Workflow
 * Steps: Verify Approved Status -> Execute Consequential Tool -> Mark Executed -> Record Motion Event
 */
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import type { Client } from '@libsql/client';
import { createDatabaseClient } from '../data/turso.ts';
import { ApprovalRepository } from '../data/repositories/approval.ts';
import { MotionRepository } from '../data/repositories/motion.ts';
import { createDefaultToolRegistry } from '../modules/router.ts';
import type { AuthContext } from '../domain/types.ts';

type ExecutionContext = globalThis.ExecutionContext;

export interface ApprovalExecutionParams {
  approvalId: string;
  workspaceId: string;
  executorAuth: AuthContext;
}

interface ApprovalWorkflowEnv {
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
}

export class ApprovalExecutionWorkflow extends WorkflowEntrypoint<ApprovalWorkflowEnv, ApprovalExecutionParams> {
  constructor(ctx?: ExecutionContext, env?: ApprovalWorkflowEnv, testClient?: Client) {
    super((ctx || {}) as ExecutionContext, env || {});
    this.testClient = testClient;
  }

  private readonly testClient?: Client;

  async run(event: Readonly<WorkflowEvent<ApprovalExecutionParams>>, step: WorkflowStep) {
    const { approvalId, workspaceId, executorAuth } = event.payload;
    const client = this.testClient || createDatabaseClient(this.env);
    const approvalRepo = new ApprovalRepository(client);
    const motionRepo = new MotionRepository(client);
    const toolRegistry = createDefaultToolRegistry();

    // Step 1: Verify Approved Status
    const approval = JSON.parse(await step.do('verify approval', async () =>
      JSON.stringify(await approvalRepo.findById(workspaceId, approvalId))
    )) as Awaited<ReturnType<ApprovalRepository['findById']>>;
    if (!approval) {
      throw new Error(`Approval ${approvalId} not found`);
    }

    if (approval.status !== 'approved' || approval.expiresAt <= new Date().toISOString()) {
      throw new Error(`Approval ${approvalId} is not approved (current status: ${approval.status})`);
    }

    // Step 2: Execute Consequential Action
    const toolResult = JSON.parse(await step.do('execute approved action', async () => JSON.stringify(
      await toolRegistry.execute(approval.actionType, approval.payload, executorAuth, workspaceId, client)
    )));

    // Step 3: Mark Approval as Executed
    await step.do('mark approval executed', async () => {
      await approvalRepo.markExecuted(workspaceId, approvalId);
      return true;
    });

    // Step 4: Record Motion Event
    await step.do('record approval execution', async () => {
      await motionRepo.record(workspaceId, `motion_exec_${Date.now()}`, 'approval.executed', executorAuth.userId,
        { approvalId, actionType: approval.actionType, result: toolResult });
      return true;
    });

    return {
      status: 'executed',
      approvalId,
      toolResult,
    };
  }
}
