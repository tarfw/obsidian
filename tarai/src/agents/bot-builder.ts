const MODEL = 'qwen/qwen3.8-27b';

export type BuilderHandler = 'app' | 'agent';
export type BuilderCardType = 'input' | 'selection' | 'payment' | 'report' | 'list';

export interface BotBuilderArtifact {
  id: string;
  name: string;
  fields: string[];
  initialStatus: string;
}

export interface BotBuilderStep {
  id: string;
  title: string;
  handler: BuilderHandler;
  card?: { type: BuilderCardType; fields: string[] };
  instruction?: string;
}

export interface BotBuilderWorkflow {
  id: string;
  title: string;
  artifactId: string;
  steps: BotBuilderStep[];
}

export interface BotBuilderDraft {
  name: string;
  purpose: string;
  artifacts: BotBuilderArtifact[];
  workflows: BotBuilderWorkflow[];
}

export interface BotBuilderInput {
  prompt: string;
  answers?: Record<string, string>;
  existingArtifacts?: Array<{ id: string; name: string; fields: string[] }>;
}

function cleanText(value: unknown, fallback: string, max = 120): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, max) || fallback;
}

function identifier(value: unknown, fallback: string): string {
  const id = cleanText(value, fallback, 64).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return id || fallback;
}

function unique(values: string[], max: number): string[] {
  return [...new Set(values)].slice(0, max);
}

function cardType(value: unknown): BuilderCardType | undefined {
  return value === 'input' || value === 'selection' || value === 'payment' || value === 'report' || value === 'list' ? value : undefined;
}

function handler(value: unknown): BuilderHandler {
  return value === 'agent' ? 'agent' : 'app';
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Validates model output before it can become a client-visible Bot draft. */
export function validateBotBuilderDraft(value: unknown): BotBuilderDraft {
  const source = object(value);
  const artifacts = unique(array(source.artifacts).map((item, index) => {
    const candidate = object(item);
    const name = cleanText(candidate.name, `Data ${index + 1}`);
    return {
      id: identifier(candidate.id ?? name, `data_${index + 1}`),
      name,
      fields: unique(array(candidate.fields).map((field, fieldIndex) => identifier(field, `field_${fieldIndex + 1}`)).filter(Boolean), 20),
      initialStatus: identifier(candidate.initialStatus, 'active'),
    };
  }).filter((item) => item.fields.length > 0).map((item) => item.id), 6).map((id) => {
    const candidate = array(source.artifacts).map(object).find((item, index) => identifier(item.id ?? item.name, `data_${index + 1}`) === id) || {};
    const name = cleanText(candidate.name, id);
    return {
      id,
      name,
      fields: unique(array(candidate.fields).map((field, index) => identifier(field, `field_${index + 1}`)).filter(Boolean), 20),
      initialStatus: identifier(candidate.initialStatus, 'active'),
    };
  });

  if (!artifacts.length) throw new Error('The Bot Builder did not identify any usable Data. Please try again.');
  const artifactIds = new Set(artifacts.map((item) => item.id));
  const workflows = unique(array(source.workflows).map((item, index) => {
    const candidate = object(item);
    return identifier(candidate.id ?? candidate.title, `workflow_${index + 1}`);
  }), 6).map((id, workflowIndex) => {
    const candidate = array(source.workflows).map(object).find((item, index) => identifier(item.id ?? item.title, `workflow_${index + 1}`) === id) || {};
    const requestedArtifact = identifier(candidate.artifactId, artifacts[0].id);
    const steps = unique(array(candidate.steps).map((item, index) => {
      const step = object(item);
      return identifier(step.id ?? step.title, `step_${index + 1}`);
    }), 12).map((stepId, stepIndex) => {
      const step = array(candidate.steps).map(object).find((item, index) => identifier(item.id ?? item.title, `step_${index + 1}`) === stepId) || {};
      const card = object(step.card);
      const type = cardType(card.type);
      const fields = unique(array(card.fields).map((field, index) => identifier(field, `field_${index + 1}`)).filter(Boolean), 12);
      return {
        id: stepId,
        title: cleanText(step.title, `Step ${stepIndex + 1}`),
        handler: handler(step.handler),
        ...(type && fields.length ? { card: { type, fields } } : {}),
        ...(handler(step.handler) === 'agent' ? { instruction: cleanText(step.instruction, `Help with ${cleanText(step.title, 'this step')}`, 400) } : {}),
      };
    });
    if (!steps.length) throw new Error(`Workflow ${workflowIndex + 1} has no usable Steps.`);
    return {
      id,
      title: cleanText(candidate.title, `Workflow ${workflowIndex + 1}`),
      artifactId: artifactIds.has(requestedArtifact) ? requestedArtifact : artifacts[0].id,
      steps,
    };
  });

  if (!workflows.length) throw new Error('The Bot Builder did not identify a usable Workflow. Please try again.');
  return {
    name: cleanText(source.name, 'New Bot', 60),
    purpose: cleanText(source.purpose, 'Help with this work.', 240),
    artifacts,
    workflows,
  };
}

function builderPrompt(input: BotBuilderInput): string {
  const existing = (input.existingArtifacts || []).slice(0, 20).map((artifact) => ({
    id: identifier(artifact.id, 'data'), name: cleanText(artifact.name, 'Data'), fields: unique((artifact.fields || []).map((field) => identifier(field, 'field')), 20),
  }));
  return JSON.stringify({
    task: input.prompt.slice(0, 4000),
    answers: input.answers || {},
    existingArtifacts: existing,
  });
}

export async function generateBotBuilderDraft(input: BotBuilderInput, apiKey: string): Promise<BotBuilderDraft> {
  const prompt = cleanText(input.prompt, '', 4000);
  if (!prompt) throw new Error('Tell TAR what you want the Bot to help with.');
  console.log(JSON.stringify({ service: 'tarai', feature: 'bot_builder', provider: 'groq', model: MODEL, stage: 'request.started' }));
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: 'none',
      reasoning_format: 'hidden',
      temperature: 0.3,
      top_p: 0.8,
      max_completion_tokens: 4000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You design safe TAR Harness Bot drafts for general users. Return JSON only with this shape: {"name":string,"purpose":string,"artifacts":[{"id":string,"name":string,"fields":string[],"initialStatus":string}],"workflows":[{"id":string,"title":string,"artifactId":string,"steps":[{"id":string,"title":string,"handler":"app"|"agent","card":{"type":"input"|"selection"|"payment"|"report"|"list","fields":string[]},"instruction":string}]}]}. Create 1-3 useful workflows and 2-8 clear Steps each. Prefer app Steps for deterministic work such as calculation, validation, inventory and payments. Use agent Steps only for language understanding, drafting or recommendations. Cards are optional; use them only when a person must choose, enter or see something. Reuse existingArtifacts where they fit. Never propose access control, payments, external calls, or data writes as model-controlled operations. Use simple, everyday titles.`,
        },
        { role: 'user', content: builderPrompt(input) },
      ],
    }),
  });
  if (!response.ok) {
    console.error(JSON.stringify({ service: 'tarai', feature: 'bot_builder', provider: 'groq', model: MODEL, stage: 'request.failed', status: response.status }));
    throw new Error('The Bot Builder is temporarily unavailable. Please try again.');
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('The Bot Builder returned no draft. Please try again.');
  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch { throw new Error('The Bot Builder returned an invalid draft. Please try again.'); }
  const draft = validateBotBuilderDraft(parsed);
  console.log(JSON.stringify({ service: 'tarai', feature: 'bot_builder', provider: 'groq', model: MODEL, stage: 'request.completed', artifacts: draft.artifacts.length, workflows: draft.workflows.length }));
  return draft;
}
