import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { ControlRepository } from '../control/control.ts';
import { provisionDatabase, type TursoPlatformEnv } from '../data/platform.ts';
import { R2StorageService, type R2BucketBinding } from '../data/r2.ts';

export interface ProvisionParams {
  kind: 'user' | 'space';
  id: string;
  name: string;
  region: string;
  displayName?: string;
}

interface ProvisionEnv extends TursoPlatformEnv {
  CONTROL: D1Database;
  OKF_STORAGE?: R2BucketBinding;
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
    if (input.kind === 'space') {
      await step.do('seed workspace knowledge', async () => {
        const storage = new R2StorageService(this.env.OKF_STORAGE);
        const title = (input.displayName || 'Workspace').replace(/[\r\n#*"]/g, ' ').trim() || 'Workspace';
        const prefix = `workspaces/${input.id}`;
        await Promise.all([
          storage.writeText(`${prefix}/knowledge/index.md`, `# ${title}\n\n**Type:** business\n\n**Modules:** tasks, inventory\n`),
          storage.writeText(`${prefix}/knowledge/DESIGN.md`, `---\nname: ${title}\nmode: system\n---\n\n# Workspace Design\n`),
          storage.writeText(`${prefix}/knowledge/team/canvas.md`, `---\ntype: Canvas\ntitle: "${title}"\nchips:\n  - label: Add task\n    target: task.create\n  - label: Check stock\n    target: inventory.list\nblocks:\n  - id: tasks\n    type: task-inbox\n    title: Tasks\n    roles: [owner, admin, member]\n  - id: inventory\n    type: stock-sheet\n    title: Inventory\n    roles: [owner, admin, member]\n---\n`),
          storage.writeText(`${prefix}/canvas.json`, JSON.stringify({
            title,
            blocks: [
              { id: 'tasks', type: 'task-inbox', title: 'Tasks', dataView: 'tasks.list' },
              { id: 'inventory', type: 'stock-sheet', title: 'Inventory', dataView: 'inventory.list' },
            ],
          })),
        ]);
      });
    }
    return route;
  }
}
