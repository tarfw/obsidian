/**
 * Cloudflare Workflow: Site Publish Workflow
 * Steps: Validate Plan -> Extract Slices -> Synthesize -> Verify (Security/Sanitizer/CSP) -> Save R2 Version -> Promote to KV Cache
 */
import { SiteCompiler, SiteModule } from '../modules/site.ts';
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { R2StorageService, type R2BucketBinding } from '../data/r2.ts';
import { KVCacheService, type KVNamespaceBinding } from '../data/kv.ts';
import type { FactSlice } from '../domain/facts.ts';

type ExecutionContext = globalThis.ExecutionContext;

export interface SitePublishWorkflowParams {
  workspaceId: string;
  jobId: string;
  siteTitle: string;
  slices: FactSlice[];
}

interface SitePublishWorkflowEnv {
  OKF_STORAGE?: R2BucketBinding;
  TARAI_KV?: KVNamespaceBinding;
}

export class SitePublishWorkflow extends WorkflowEntrypoint<SitePublishWorkflowEnv, SitePublishWorkflowParams> {
  constructor(ctx?: ExecutionContext, env?: SitePublishWorkflowEnv) {
    super((ctx || {}) as ExecutionContext, env || {});
  }

  async run(event: Readonly<WorkflowEvent<SitePublishWorkflowParams>>, step: WorkflowStep) {
    const { workspaceId, jobId, siteTitle, slices } = event.payload;

    const r2 = new R2StorageService(this.env.OKF_STORAGE);
    const kv = new KVCacheService(this.env.TARAI_KV);
    const siteModule = new SiteModule(r2, kv);

    // Step 1: Plan & Draft
    const { draftHtml, renderKey } = JSON.parse(await step.do('draft site', async () => JSON.stringify(
      await siteModule.planAndDraft(workspaceId, jobId, siteTitle, slices)
    ))) as Awaited<ReturnType<SiteModule['planAndDraft']>>;

    // Step 2: Verification
    const verification = JSON.parse(await step.do('verify site', async () =>
      JSON.stringify(SiteCompiler.verifyAndSanitize(draftHtml))
    )) as ReturnType<typeof SiteCompiler.verifyAndSanitize>;
    if (!verification.passed) {
      throw new Error(`Workflow security check failed: ${verification.violations.join('; ')}`);
    }

    // Step 3: Publish & Promote to KV
    const publishResult = await step.do('publish site', () => siteModule.publish(workspaceId, draftHtml, renderKey));
    if (!publishResult.success) {
      throw new Error(`Workflow publish failed: ${publishResult.error}`);
    }

    return publishResult;
  }
}
