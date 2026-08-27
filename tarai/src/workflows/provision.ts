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
  profileMarkdown?: string;
  indexMarkdown?: string;
  canvasMarkdown?: string;
  canvasJson?: string;
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
    if (input.kind === 'space') {
      await step.do('seed workspace knowledge', async () => {
        const storage = new R2StorageService(this.env.OKF_STORAGE);
        const title = (input.displayName || 'Workspace').replace(/[\r\n#*"]/g, ' ').trim() || 'Workspace';
        const prefix = `workspaces/${input.id}`;
        const fallbackIndex = `# ${title}\n\n**Type:** general\n\n**Modules:** tasks\n`;
        const fallbackCanvas = `---\nschema: 1\nversion: 1\ntype: Canvas\ntitle: "${title}"\nchips:\n  - label: "Create task"\n    action: task.create\nblocks:\n  - id: urgent-work\n    type: task-inbox\n    title: "Work needing attention"\n    roles: [owner, admin, member]\n    props: {"data_view":"tasks.urgent"}\n---\n`;
        await Promise.all([
          storage.writeText(`${prefix}/index.md`, input.indexMarkdown || fallbackIndex),
          storage.writeText(`${prefix}/business/profile.md`, input.profileMarkdown || `# ${title}\n`),
          storage.writeText(`${prefix}/DESIGN.md`, `---\nname: ${title}\nmode: system\n---\n\n# Workspace Design\n`),
          storage.writeText(`${prefix}/team/canvas.md`, input.canvasMarkdown || fallbackCanvas),
          storage.writeText(`${prefix}/team/canvas.json`, input.canvasJson || JSON.stringify({ title, chips: [{ label: 'Create task', action: 'task.create' }], actions: [{ label: 'Create task', action: 'task.create' }], blocks: [{ id: 'urgent-work', type: 'task-inbox', title: 'Work needing attention', dataView: 'tasks.urgent', props: { data_view: 'tasks.urgent' } }] })),
        ]);
      });
    }
    await step.do('activate route', async () => {
      const control = new ControlRepository(this.env.CONTROL);
      if (input.kind === 'user') await control.activateUser(input.id, route);
      else await control.activateSpace(input.id, route);
    });
    return route;
  }
}
