import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { ControlRepository } from '../control/control.ts';
import { createDatabaseClientForHost } from '../data/turso.ts';
import { executeAgent, type AgentResult } from '../agents/executor.ts';
import { R2StorageService, type R2BucketBinding } from '../data/r2.ts';
import { KVCacheService, type KVNamespaceBinding } from '../data/kv.ts';
import type { ProjectionParams } from './projection.ts';

export interface AgentParams {
  run: string;
  user: string;
  space: string;
  action: string;
  input: Record<string, unknown>;
}

interface AgentEnv {
  CONTROL: D1Database;
  TURSO_AUTH_TOKEN?: string;
  OKF_STORAGE?: R2BucketBinding;
  TARAI_KV?: KVNamespaceBinding;
  USAGE?: AnalyticsEngineDataset;
  PROJECTION_WORKFLOW?: Workflow<ProjectionParams>;
}

export class AgentWorkflow extends WorkflowEntrypoint<AgentEnv, AgentParams> {
  async run(event: Readonly<WorkflowEvent<AgentParams>>, step: WorkflowStep) {
    const input = event.payload;
    const started = Date.now();
    const control = new ControlRepository(this.env.CONTROL);
    try {
      const route = await step.do('resolve workspace', async () => {
        if (input.space.startsWith('personal:')) {
          const user = await control.getUser(input.user);
          if (!user?.host || user.state !== 'active') throw new Error('Personal workspace is unavailable');
          return { id: input.space, host: user.host };
        }
        const space = await control.getSpace(input.space);
        if (!space?.host || !['active', 'grace'].includes(space.state)) throw new Error('Workspace is unavailable');
        return space;
      });
      await step.do('start run', () => control.startRun(input.run));
      const result = JSON.parse(await step.do('execute agent', { retries: { limit: 3, delay: '5 seconds', backoff: 'exponential' } }, async () => {
        if (!this.env.TURSO_AUTH_TOKEN) throw new Error('Turso database token is unavailable');
        const data = createDatabaseClientForHost(route.host!, this.env.TURSO_AUTH_TOKEN);
        try {
          return JSON.stringify(await executeAgent(input.action, input.space, input.run, input.input, {
            data,
            r2: new R2StorageService(this.env.OKF_STORAGE),
            kv: new KVCacheService(this.env.TARAI_KV),
          }));
        } finally {
          data.close();
        }
      })) as AgentResult;
      await step.do('record result', async () => {
        if (!this.env.TURSO_AUTH_TOKEN) throw new Error('Turso database token is unavailable');
        const data = createDatabaseClientForHost(route.host!, this.env.TURSO_AUTH_TOKEN);
        try {
          const now = Math.floor(Date.now() / 1000);
          await data.execute({
            sql: `INSERT INTO motion (id,type,actor,ref,data,created) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`,
            args: [`mot_${input.run}`, `agent.${input.action}`, input.user, input.run, JSON.stringify(result), now],
          });
          await new R2StorageService(this.env.OKF_STORAGE).writeText(
            `workspaces/${input.space}/runs/${input.run}.json`,
            JSON.stringify({ ...input, result, started, ended: Date.now() }),
          );
        } finally {
          data.close();
        }
      });
      await step.do('settle run', () => control.finishRun(input.run, {}));
      if (this.env.PROJECTION_WORKFLOW && !input.space.startsWith('personal:')) {
        await step.do('project result', () => this.env.PROJECTION_WORKFLOW!.create({
          id: `projection-${input.run}`,
          params: { id: input.run, space: input.space, type: `agent.${input.action}`, ref: input.run, data: { action: result.action, summary: result.summary, result: result.data } },
        }));
      }
      await step.do('record success telemetry', async () => {
        this.env.USAGE?.writeDataPoint({ blobs: [input.action, input.space, 'done'], doubles: [Date.now() - started, 1], indexes: [input.run] });
        return true;
      });
      return result;
    } catch (error) {
      await step.do('refund run', () => control.refundRun(input.run, 'agent_failed'));
      await step.do('record failure telemetry', async () => {
        this.env.USAGE?.writeDataPoint({ blobs: [input.action, input.space, 'failed'], doubles: [Date.now() - started, 1], indexes: [input.run] });
        return true;
      });
      throw error;
    }
  }
}
