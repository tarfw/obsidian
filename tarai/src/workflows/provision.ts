import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { ControlRepository } from '../control/control.ts';
import { provisionDatabase, type TursoPlatformEnv } from '../data/platform.ts';

export interface ProvisionParams {
  kind: 'user' | 'space';
  id: string;
  name: string;
  region: string;
}

interface ProvisionEnv extends TursoPlatformEnv {
  CONTROL: D1Database;
}

export class ProvisionWorkflow extends WorkflowEntrypoint<ProvisionEnv, ProvisionParams> {
  async run(event: Readonly<WorkflowEvent<ProvisionParams>>, step: WorkflowStep) {
    const input = event.payload;
    let route: { db: string; host: string; schema: number };
    try {
      route = await step.do('provision database', { retries: { limit: 5, delay: '10 seconds', backoff: 'exponential' } }, () =>
        provisionDatabase(this.env, input),
      );
    } catch (error) {
      const control = new ControlRepository(this.env.CONTROL);
      if (input.kind === 'space') await step.do('refund workspace', () => control.failSpace(input.id, 'provisioning_failed'));
      else await step.do('mark user error', () => control.failUser(input.id));
      throw error;
    }
    await step.do('activate route', async () => {
      const control = new ControlRepository(this.env.CONTROL);
      if (input.kind === 'user') await control.activateUser(input.id, route);
      else await control.activateSpace(input.id, route);
    });
    return route;
  }
}
