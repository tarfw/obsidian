/**
 * TARAI Cloudflare Worker Exports
 * Exports Cloudflare Workflows and non-HTTP cron scheduled handlers.
 */
import { ProvisionWorkflow } from './workflows/provision.ts';
import { RenewalWorkflow } from './workflows/renewal.ts';
import { AgentWorkflow } from './workflows/agent.ts';
import { ProjectionWorkflow } from './workflows/projection.ts';
import { ArchiveWorkflow, RestoreWorkflow } from './workflows/archive.ts';
import { ControlRepository } from './control/control.ts';
import { R2StorageService, type R2BucketBinding } from './data/r2.ts';

export { ProvisionWorkflow, RenewalWorkflow, AgentWorkflow, ProjectionWorkflow, ArchiveWorkflow, RestoreWorkflow };

export interface ScheduledController {
  scheduledTime: number;
  cron: string;
}

export interface CloudflareEnv {
  CONTROL: D1Database;
  OKF_STORAGE?: R2BucketBinding;
  USAGE?: AnalyticsEngineDataset;
  RENEWAL_WORKFLOW?: {
    createBatch(options: Array<{ id: string; params: { service: string; period: number } }>): Promise<unknown[]>;
  };
  ARCHIVE_WORKFLOW?: {
    createBatch(options: Array<{ id: string; params: { space: string } }>): Promise<unknown[]>;
  };
}

export default {
  /**
   * Cron scheduled handler (runs e.g. every 5 minutes)
   * Renews paid resources, advances grace/cold states, and exports old run summaries.
   */
  async scheduled(controller: ScheduledController, env: CloudflareEnv) {
    const now = Math.floor((controller.scheduledTime || Date.now()) / 1000);
    const control = new ControlRepository(env.CONTROL);
    const due = await control.listDueServices(now);
    if (env.RENEWAL_WORKFLOW && due.length) {
      await env.RENEWAL_WORKFLOW.createBatch(due.map((service) => ({
          id: `renew-${service.id}-${service.renewal}`,
          params: { service: service.id, period: service.renewal },
      })));
    }
    await control.advanceLifecycle(now);
    const candidates = await control.listArchiveCandidates(now);
    if (env.ARCHIVE_WORKFLOW && candidates.length) {
      const claimed = [];
      for (const space of candidates) {
        if (await control.markArchiving(space.id)) claimed.push(space);
      }
      if (claimed.length) {
        try {
          await env.ARCHIVE_WORKFLOW.createBatch(claimed.map((space) => ({
            id: `archive-${space.id}-${space.updated}`,
            params: { space: space.id },
          })));
        } catch (error) {
          await Promise.all(claimed.map((space) => control.releaseArchive(space.id)));
          throw error;
        }
      }
    }

    const expired = await control.takeExpiredRuns(now - 90 * 86400);
    if (expired.length && env.OKF_STORAGE) {
      const key = `control/runs/${new Date(now * 1000).toISOString().slice(0, 10)}/${crypto.randomUUID()}.jsonl`;
      await new R2StorageService(env.OKF_STORAGE).writeText(key, expired.map((run) => JSON.stringify(run)).join('\n'));
      await control.deleteRuns(expired.map((run) => String(run.id)));
    }

    const bytes = await control.sizeBytes();
    env.USAGE?.writeDataPoint({ blobs: ['d1.capacity'], doubles: [bytes] });
    if (bytes >= 8_000_000_000) console.error('D1 control database must be moved to regional shards', { bytes });
    else if (bytes >= 5_000_000_000) console.warn('D1 control database reached the regional sharding threshold', { bytes });
  },
};
