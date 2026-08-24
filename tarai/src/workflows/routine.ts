/**
 * Cloudflare Workflow: Routine Execution Workflow
 * Steps: Claim Lease -> Execute Chore -> Record Motion Event -> Reschedule Next Run
 */
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import type { Client } from '@libsql/client';
import { createDatabaseClient } from '../data/turso.ts';
import { RoutineRepository } from '../data/repositories/routine.ts';
import { MotionRepository } from '../data/repositories/motion.ts';
import { OpsModule } from '../modules/ops.ts';

type ExecutionContext = globalThis.ExecutionContext;

export interface RoutineWorkflowParams {
  routineId: string;
  workspaceId: string;
  workerId: string;
}

interface RoutineWorkflowEnv {
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
}

export class RoutineWorkflow extends WorkflowEntrypoint<RoutineWorkflowEnv, RoutineWorkflowParams> {
  constructor(ctx?: ExecutionContext, env?: RoutineWorkflowEnv, testClient?: Client) {
    super((ctx || {}) as ExecutionContext, env || {});
    this.testClient = testClient;
  }

  private readonly testClient?: Client;

  async run(event: Readonly<WorkflowEvent<RoutineWorkflowParams>>, step: WorkflowStep) {
    const { routineId, workspaceId, workerId } = event.payload;
    const client = this.testClient || createDatabaseClient(this.env);
    const routineRepo = new RoutineRepository(client);
    const motionRepo = new MotionRepository(client);
    const opsModule = new OpsModule(client);

    // Step 1: Claim Routine Lease
    const now = new Date().toISOString();
    const claimed = await step.do('claim routine lease', () => routineRepo.claimRoutine(routineId, workerId, 300, now));
    if (!claimed) {
      return { status: 'skipped', reason: 'Routine already leased or not due' };
    }

    // Step 2: Execute Chore (e.g. Health & Stock Check)
    const report = JSON.parse(await step.do('run routine check', async () =>
      JSON.stringify(await opsModule.runHealthCheck(workspaceId))
    )) as Awaited<ReturnType<OpsModule['runHealthCheck']>>;

    // Step 3: Record Motion Event
    await step.do('record routine result', async () => {
      await motionRepo.record(workspaceId, `motion_chore_${Date.now()}`, 'routine.executed', workerId, { routineId, report });
      return true;
    });

    // Step 4: Reschedule next run (e.g. +5 minutes)
    const nextRun = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await step.do('reschedule routine', () => routineRepo.completeRoutine(
      routineId, workerId, nextRun, new Date().toISOString()
    ));

    return { status: 'completed', report, nextRun };
  }
}
