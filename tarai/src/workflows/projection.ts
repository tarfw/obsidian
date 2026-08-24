import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { ControlRepository } from '../control/control.ts';
import { createDatabaseClientForHost } from '../data/turso.ts';

export interface ProjectionParams {
  id: string;
  space: string;
  type: string;
  ref?: string;
  data: Record<string, unknown>;
  recipients?: string[];
}

interface ProjectionEnv {
  CONTROL: D1Database;
  TURSO_AUTH_TOKEN?: string;
}

export class ProjectionWorkflow extends WorkflowEntrypoint<ProjectionEnv, ProjectionParams> {
  async run(event: Readonly<WorkflowEvent<ProjectionParams>>, step: WorkflowStep) {
    const input = event.payload;
    const routes = await step.do('resolve recipients', () => new ControlRepository(this.env.CONTROL).listMemberRoutes(input.space));
    const eligible = routes.filter((route) =>
      route.host && route.state === 'active' && route.role !== 'guest' && (!input.recipients || input.recipients.includes(route.user)),
    );
    for (const route of eligible) {
      await step.do(`project ${route.user}`, { retries: { limit: 5, delay: '5 seconds', backoff: 'exponential' } }, async () => {
        if (!route.host || !this.env.TURSO_AUTH_TOKEN) throw new Error('Personal database route is unavailable');
        const client = createDatabaseClientForHost(route.host, this.env.TURSO_AUTH_TOKEN);
        try {
          const now = Math.floor(Date.now() / 1000);
          await client.execute({
            sql: `INSERT INTO inbox (id,space,type,ref,data,state,created,updated)
                  VALUES (?,?,?,?,?,'unread',?,?) ON CONFLICT(id) DO NOTHING`,
            args: [`${input.id}:${route.user}`, input.space, input.type, input.ref || null, JSON.stringify(input.data), now, now],
          });
        } finally {
          client.close();
        }
      });
    }
    return { projected: eligible.length };
  }
}
