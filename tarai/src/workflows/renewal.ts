import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { ControlRepository } from '../control/control.ts';

export interface RenewalParams {
  service: string;
  period: number;
}

interface RenewalEnv {
  CONTROL: D1Database;
}

export class RenewalWorkflow extends WorkflowEntrypoint<RenewalEnv, RenewalParams> {
  async run(event: Readonly<WorkflowEvent<RenewalParams>>, step: WorkflowStep) {
    return step.do('renew service', { retries: { limit: 5, delay: '10 seconds', backoff: 'exponential' } }, () =>
      new ControlRepository(this.env.CONTROL).renewService(event.payload.service, event.payload.period),
    );
  }
}
