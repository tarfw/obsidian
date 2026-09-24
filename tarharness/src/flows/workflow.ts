import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { Effect } from 'effect';
import { ControlStore } from '../db/control.ts';
import { executeAutomaticFlowStep } from '../gateway/actions.ts';
import { HarnessError } from '../errors.ts';
import { blockFlowRun, openFlowDatabase, type FlowEnv } from './dispatch.ts';

type Params = { workspace: string; actor: string; run: string; step: number };

export class FlowWorkflow extends WorkflowEntrypoint<FlowEnv, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep): Promise<void> {
    const params = event.payload;
    if (!params || typeof params.workspace !== 'string' || typeof params.actor !== 'string' || typeof params.run !== 'string' || !Number.isSafeInteger(params.step) || params.step < 0) throw new Error('Invalid Flow Book dispatch.');
    for (let index = params.step; index < 20; index++) {
      const progress = await step.do(`flow-action-${index}`, async () => {
        try {
          const current = await Effect.runPromise(new ControlStore(this.env.CONTROL).accessFor(params.workspace, params.actor));
          const client = await openFlowDatabase(this.env, current);
          try {
            return await executeAutomaticFlowStep(client, current, params.run, index, { productContent: this.env.PRODUCT_CONTENT, siteReleases: this.env.SITE_RELEASES, ai: this.env.AI, tinyfish: this.env.TINYFISH_API_KEY, typesafe: this.env.TYPESAFE_API_KEY });
          } finally { client.close(); }
        } catch (cause) {
          if (!(cause instanceof HarnessError) || cause.status >= 500) throw cause;
          await blockFlowRun(this.env, params.workspace, params.run, 'authority or action review required');
          return { state: 'blocked', step: index, advanced: false };
        }
      });
      if (!progress.advanced) return;
    }
  }
}
