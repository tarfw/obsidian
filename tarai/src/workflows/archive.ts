import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { ControlRepository } from '../control/control.ts';
import { archiveTenant, restoreTenant } from '../data/archive.ts';
import { createDatabaseClientForHost } from '../data/turso.ts';
import { deleteDatabase, provisionDatabase, type TursoPlatformEnv } from '../data/platform.ts';
import { R2StorageService, type R2BucketBinding } from '../data/r2.ts';

export interface ArchiveParams { space: string }
export interface RestoreParams { space: string }

interface ArchiveEnv extends TursoPlatformEnv {
  CONTROL: D1Database;
  TURSO_AUTH_TOKEN?: string;
  OKF_STORAGE?: R2BucketBinding;
}

export class ArchiveWorkflow extends WorkflowEntrypoint<ArchiveEnv, ArchiveParams> {
  async run(event: Readonly<WorkflowEvent<ArchiveParams>>, step: WorkflowStep) {
    const control = new ControlRepository(this.env.CONTROL);
    const route = await step.do('resolve archive route', async () => {
      const space = await control.getSpace(event.payload.space);
      if (!space?.db || !space.host || space.state !== 'archived') throw new Error('Workspace is not ready for archival');
      return space;
    });
    await step.do('archive workspace', { retries: { limit: 5, delay: '10 seconds', backoff: 'exponential' } }, async () => {
      if (!this.env.TURSO_AUTH_TOKEN || !this.env.OKF_STORAGE) throw new Error('Archive storage is not configured');
      const client = createDatabaseClientForHost(route.host!, this.env.TURSO_AUTH_TOKEN);
      try {
        return await archiveTenant(client, new R2StorageService(this.env.OKF_STORAGE), {
          space: route.id,
          db: route.db!,
          schema: route.schema,
        });
      } finally {
        client.close();
      }
    });
    await step.do('delete warm database', () => deleteDatabase(this.env, route.db!));
    await step.do('mark workspace cold', () => control.markCold(route.id));
    return { space: route.id, state: 'cold' };
  }
}

export class RestoreWorkflow extends WorkflowEntrypoint<ArchiveEnv, RestoreParams> {
  async run(event: Readonly<WorkflowEvent<RestoreParams>>, step: WorkflowStep) {
    const control = new ControlRepository(this.env.CONTROL);
    try {
      const space = await step.do('resolve restore route', async () => {
        const value = await control.getSpace(event.payload.space);
        if (!value?.db || value.state !== 'restoring') throw new Error('Workspace is not ready for restore');
        return value;
      });
      const route = await step.do('provision restored database', { retries: { limit: 5, delay: '10 seconds', backoff: 'exponential' } }, () =>
        provisionDatabase(this.env, { kind: 'space', id: space.id, name: space.db!, region: space.region }),
      );
      await step.do('restore workspace data', { retries: { limit: 5, delay: '10 seconds', backoff: 'exponential' } }, async () => {
        if (!this.env.TURSO_AUTH_TOKEN || !this.env.OKF_STORAGE) throw new Error('Restore storage is not configured');
        const client = createDatabaseClientForHost(route.host, this.env.TURSO_AUTH_TOKEN);
        try {
          return await restoreTenant(client, new R2StorageService(this.env.OKF_STORAGE), space.id);
        } finally {
          client.close();
        }
      });
      await step.do('activate restored workspace', () => control.activateSpace(space.id, route));
      return { space: space.id, state: 'active' };
    } catch (error) {
      await step.do('rollback failed restore', () => control.failRestore(event.payload.space, 'restore_failed'));
      throw error;
    }
  }
}
