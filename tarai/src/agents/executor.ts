import type { Client } from '@libsql/client';
import { TenantRepository } from '../data/repositories/tenant.ts';
import { R2StorageService } from '../data/r2.ts';
import { KVCacheService } from '../data/kv.ts';
import { SiteCompiler, SiteModule } from '../modules/site.ts';
import { computeSha256 } from '../domain/idempotency.ts';
import type { FactSlice } from '../domain/facts.ts';
import { generateBotBuilderDraft } from './bot-builder.ts';

export interface AgentResources {
  data: Client;
  r2: R2StorageService;
  kv: KVCacheService;
  groqApiKey?: string;
}

export interface AgentResult {
  action: string;
  summary: string;
  data: Record<string, unknown>;
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

async function generateAgentReply(intent: string, apiKey: string): Promise<string> {
  console.log(JSON.stringify({ service: 'tarai', provider: 'groq', stage: 'request.started', model: 'qwen/qwen3.8-27b', input_characters: intent.length }));
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: 'You are a TAR Harness Agent Step. Give clear, concise help using the supplied Artifact data. You may explain, summarize, draft, recommend, or identify a suitable next step. Never claim you changed records, sent messages, processed payments, or executed actions. The App and Gateway control all changes.' },
        { role: 'user', content: intent.slice(0, 12000) },
      ],
      temperature: 0.6,
      max_completion_tokens: 2048,
      top_p: 0.95,
      stream: false,
      reasoning_effort: 'default',
    }),
  });
  if (!response.ok) {
    console.error(JSON.stringify({ service: 'tarai', provider: 'groq', stage: 'request.failed', status: response.status }));
    throw new Error('The language assistant is temporarily unavailable. Please try again.');
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
  const reply = text(payload.choices?.[0]?.message?.content);
  if (!reply) throw new Error('The language assistant returned no reply. Please try again.');
  console.log(JSON.stringify({ service: 'tarai', provider: 'groq', stage: 'request.completed', output_characters: reply.length }));
  return reply;
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
  if (action === 'agent.reply') {
    if (!resources.groqApiKey) throw new Error('The language assistant is not configured. Add GROQ_API_KEY to the server secrets.');
    const intent = text(input.intent);
    if (!intent) throw new Error('An Agent Step needs an instruction.');
    const summary = await generateAgentReply(intent, resources.groqApiKey);
    return { action, summary, data: { reply: summary } };
  }
  if (action === 'bot.builder') {
    if (!resources.groqApiKey) throw new Error('The Bot Builder is not configured. Add GROQ_API_KEY to the server secrets.');
    const prompt = text(input.prompt);
    const answers = input.answers && typeof input.answers === 'object' && !Array.isArray(input.answers) ? input.answers as Record<string, string> : undefined;
    const existingArtifacts = Array.isArray(input.existingArtifacts) ? input.existingArtifacts as Array<{ id: string; name: string; fields: string[] }> : undefined;
    const draft = await generateBotBuilderDraft({ prompt, answers, existingArtifacts }, resources.groqApiKey);
    return { action, summary: `Created a draft for ${draft.name}`, data: { draft } };
  }
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
