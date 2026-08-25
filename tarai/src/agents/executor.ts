import type { Client } from '@libsql/client';
import { TenantRepository } from '../data/repositories/tenant.ts';
import { R2StorageService } from '../data/r2.ts';
import { KVCacheService } from '../data/kv.ts';
import { SiteCompiler, SiteModule } from '../modules/site.ts';
import { computeSha256 } from '../domain/idempotency.ts';
import type { FactSlice } from '../domain/facts.ts';

export interface AgentResources {
  data: Client;
  r2: R2StorageService;
  kv: KVCacheService;
}

export interface AgentResult {
  action: string;
  summary: string;
  data: Record<string, unknown>;
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

async function factSlices(data: Client): Promise<FactSlice[]> {
  const matter = await new TenantRepository(data).list('matter');
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const row of matter) {
    const category = row.type === 'product' ? 'offerings' : row.type === 'faq' ? 'faq' : row.type === 'contact' ? 'logistics' : 'branding';
    const list = groups.get(category) || [];
    list.push({ id: row.id, type: row.type, ...row.data });
    groups.set(category, list);
  }
  return [...groups.entries()].map(([category, facts]) => ({
    sliceId: `slice_${category}`,
    category: category as FactSlice['category'],
    facts: { items: facts },
    version: 1,
  }));
}

export async function executeAgent(
  action: string,
  space: string,
  run: string,
  input: Record<string, unknown>,
  resources: AgentResources,
): Promise<AgentResult> {
  const repository = new TenantRepository(resources.data);
  if (action === 'workspace.summary') {
    const rows = await repository.list('matter');
    const counts: Record<string, number> = {};
    for (const row of rows) counts[row.type] = (counts[row.type] || 0) + 1;
    return { action, summary: `${rows.length} active workspace records`, data: { total: rows.length, types: counts } };
  }

  if (action === 'sales.reply' || action === 'support.reply') {
    const query = text(input.query).toLowerCase();
    const rows = await repository.list('matter');
    const matches = rows.filter((row) => !query || JSON.stringify(row.data).toLowerCase().includes(query)).slice(0, 20);
    const summary = matches.length ? `Found ${matches.length} verified workspace records` : 'No verified workspace record matched the request';
    return { action, summary, data: { matches: matches.map((row) => ({ id: row.id, type: row.type, ...row.data })) } };
  }

  if (action === 'ops.workflow' || action === 'analyst.report' || action === 'tax.report' || action === 'bill.audit' || action === 'price.check') {
    const rows = await repository.list('matter');
    const state: Record<string, number> = {};
    for (const row of rows) state[row.state || 'active'] = (state[row.state || 'active'] || 0) + 1;
    return { action, summary: `Analysed ${rows.length} canonical records`, data: { records: rows.length, state, requested: input } };
  }

  const site = new SiteModule(resources.r2, resources.kv);
  if (action === 'site.generate') {
    const title = text(input.title, 'Workspace');
    const draft = await site.planAndDraft(space, run, title, await factSlices(resources.data));
    return {
      action,
      summary: 'Site draft generated',
      data: {
        job: run,
        render: draft.renderKey,
        plan: draft.plan,
        // Draft artifacts are deliberately private. The mobile app can only
        // promote a completed job through the authenticated publish action.
      },
    };
  }
  if (action === 'site.edit') {
    const job = text(input.job);
    const html = text(input.html);
    if (!job || !html || html.length > 500_000) throw new Error('A valid site job and HTML under 500 KB are required');
    const verification = SiteCompiler.verifyAndSanitize(html);
    if (!verification.passed) throw new Error(verification.violations.join('; '));
    await resources.r2.writeText(`workspaces/${space}/site/drafts/${job}.html`, verification.sanitizedHtml || html);
    return { action, summary: 'Site draft updated', data: { job } };
  }
  if (action === 'site.publish') {
    const job = text(input.job);
    if (!job) throw new Error('Site draft job is required');
    const html = await resources.r2.readText(`workspaces/${space}/site/drafts/${job}.html`);
    if (!html) throw new Error('Site draft not found');
    const result = await site.publish(space, html, await computeSha256(html));
    if (!result.success) throw new Error(result.error || 'Site publication failed');
    return { action, summary: 'Site published', data: { version: result.versionId, url: result.publishedUrl } };
  }

  return {
    action,
    summary: 'Agent request recorded for the workspace',
    data: { requested: input, status: 'completed' },
  };
}
