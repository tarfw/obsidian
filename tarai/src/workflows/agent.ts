import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { ControlRepository } from '../control/control.ts';
import { createDatabaseClientForHost } from '../data/turso.ts';
import { executeAgent, type AgentResult } from '../agents/executor.ts';
import { TenantRepository } from '../data/repositories/tenant.ts';
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
  GROQ_API_KEY?: string;
  USAGE?: AnalyticsEngineDataset;
  PROJECTION_WORKFLOW?: Workflow<ProjectionParams>;
}

export class AgentWorkflow extends WorkflowEntrypoint<AgentEnv, AgentParams> {
  async run(event: Readonly<WorkflowEvent<AgentParams>>, step: WorkflowStep) {
    const input = event.payload;
    const started = Date.now();
    const control = new ControlRepository(this.env.CONTROL);
    const log = (stage: string, detail: Record<string, unknown> = {}) => {
      console.log(JSON.stringify({
        service: 'tarai',
        workflow: 'agent',
        stage,
        run: input.run,
        action: input.action,
        space: input.space,
        elapsed_ms: Date.now() - started,
        ...detail,
      }));
    };
    log('workflow.started');
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
      log('workspace.resolved', { workspace_id: route.id });
      await step.do('start run', () => control.startRun(input.run));
      log('run.started');
      // Capture the secret in this Workflow version. This makes a deployment
      // after a secret rotation create a Workflow bundle with the new binding.
      const groqApiKey = this.env.GROQ_API_KEY;
      log('agent.execute.started', { provider: input.action === 'agent.reply' || input.action === 'bot.builder' ? 'groq' : 'app' });
      const result = JSON.parse(await step.do('execute agent', { retries: { limit: 3, delay: '5 seconds', backoff: 'exponential' } }, async () => {
        if (!this.env.TURSO_AUTH_TOKEN) throw new Error('Turso database token is unavailable');
        const data = createDatabaseClientForHost(route.host!, this.env.TURSO_AUTH_TOKEN);
        try {
          return JSON.stringify(await executeAgent(input.action, input.space, input.run, input.input, {
            data,
            r2: new R2StorageService(this.env.OKF_STORAGE),
            kv: new KVCacheService(this.env.TARAI_KV),
            groqApiKey,
          }));
        } finally {
          data.close();
        }
      })) as AgentResult;
      log('agent.execute.completed', { reply_characters: result.summary.length });
      await step.do('record result', async () => {
        if (!this.env.TURSO_AUTH_TOKEN) throw new Error('Turso database token is unavailable');
        const data = createDatabaseClientForHost(route.host!, this.env.TURSO_AUTH_TOKEN);
        try {
          await new TenantRepository(data).appendMotion({
            id: `mot_${input.run}`,
            type: `agent.${input.action}`,
            actor: input.user,
            ref: input.run,
            data: { action: result.action, summary: result.summary, result: result.data },
            idem: `agent-result:${input.run}`,
          });
          await new R2StorageService(this.env.OKF_STORAGE).writeText(
            `workspaces/${input.space}/runs/${input.run}.json`,
            JSON.stringify({ ...input, result, started, ended: Date.now() }),
          );
        } finally {
          data.close();
        }
      });
      log('result.recorded');
      await step.do('settle run', () => control.finishRun(input.run, {}));
      log('run.settled');
      if (this.env.PROJECTION_WORKFLOW && !input.space.startsWith('personal:')) {
        await step.do('project result', async () => {
          await this.env.PROJECTION_WORKFLOW!.create({
            id: `projection-${input.run}`,
            params: { id: input.run, space: input.space, type: `agent.${input.action}`, ref: input.run, data: { action: result.action, summary: result.summary, result: result.data } },
          });
          return { enqueued: true };
        });
        log('projection.enqueued');
      }
      await step.do('record success telemetry', async () => {
        this.env.USAGE?.writeDataPoint({ blobs: [input.action, input.space, 'done'], doubles: [Date.now() - started, 1], indexes: [input.run] });
        return true;
      });
      log('workflow.completed');
      return result;
    } catch (error) {
      log('workflow.failed', { error: error instanceof Error ? error.message : String(error) });
      await step.do('refund run', () => control.refundRun(input.run, 'agent_failed'));
      await step.do('record failure telemetry', async () => {
        this.env.USAGE?.writeDataPoint({ blobs: [input.action, input.space, 'failed'], doubles: [Date.now() - started, 1], indexes: [input.run] });
        return true;
      });
      throw error;
    }
  }
}
