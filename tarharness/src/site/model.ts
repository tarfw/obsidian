/**
 * Workers AI composition for the site agent.
 *
 * The model proposes a typed plan and draft; code validates every value, keeps
 * prices, policy and permissions out of model reach, and repairs at most once.
 * A fabricated claim is caught by evidence checks and can block publication.
 */

import { unavailable } from '../errors.ts';
import { DEFAULT_DESIGN, type Design } from './design.ts';
import { DOCUMENT_VERSION, type Journey, type SiteDocument } from './document.ts';
import type { ClaimCheck } from './inspect.ts';
import { validateDocument } from './validate.ts';

export const SITE_MODEL_FALLBACKS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-8b-instruct-fast',
] as const;

export interface ModelUsage {
  calls: number;
  prompt: number;
  output: number;
  ms: number;
}

export interface ModelBudget {
  readonly calls: number;
  readonly output: number;
  readonly ms: number;
}

export const DEFAULT_BUDGET: ModelBudget = { calls: 6, output: 12_000, ms: 120_000 };

export class BudgetExceeded extends Error {
  constructor(readonly reason: string) { super(reason); }
}

export interface PlannedSection {
  id: string;
  purpose: string;
  layout: 'flow' | 'flex' | 'grid' | 'stack';
  summary: string;
}

export interface PlannedPage {
  id: string;
  path: string;
  title: string;
  description: string;
  sections: PlannedSection[];
}

export interface SitePlan {
  direction: string;
  pages: PlannedPage[];
  claims: { text: string; evidence: string }[];
}

const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

function text(value: unknown, max = 400): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function slug(value: string, fallback: string): string {
  const clean = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return /^[a-z][a-z0-9-]*$/.test(clean) ? clean : fallback;
}

export const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_DEFAULT_MODEL = 'qwen/qwen3.8-27b';

async function callGroq(apiKey: string, model: string, messages: { role: string; content: string }[], maxTokens: number, temperature: number, timeoutMs = 15_000): Promise<{ content: string; promptTokens: number; outputTokens: number }> {
  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages,
      model,
      temperature,
      max_completion_tokens: maxTokens,
      top_p: 0.95,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Groq API error (${response.status}): ${errorText.slice(0, 300)}`);
  }
  const payload = object(await response.json());
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const firstChoice = object(choices[0]);
  const message = object(firstChoice.message);
  const content = typeof message.content === 'string' ? message.content : '';
  const usage = object(payload.usage);
  return {
    content,
    promptTokens: typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : 0,
    outputTokens: typeof usage.completion_tokens === 'number' ? usage.completion_tokens : 0,
  };
}

/** Run one JSON-mode completion with an optional single repair pass. */
export class ModelRunner {
  constructor(
    private readonly ai?: Ai,
    readonly model: string = SITE_MODEL_FALLBACKS[0],
    private readonly budget: ModelBudget = DEFAULT_BUDGET,
    private readonly groqApiKey?: string,
  ) {}

  private readonly usage: ModelUsage = { calls: 0, prompt: 0, output: 0, ms: 0 };

  spent(): ModelUsage {
    return { ...this.usage };
  }

  async json<T>(input: { system: string; prompt: string; read: (value: Record<string, unknown>) => T | null; maxTokens?: number; temperature?: number }): Promise<T> {
    const models = [this.model, ...SITE_MODEL_FALLBACKS.filter((entry) => entry !== this.model)];
    let lastError = '';
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (this.usage.calls >= this.budget.calls) throw new BudgetExceeded('This run used its model call budget.');
      if (this.usage.ms > this.budget.ms) throw new BudgetExceeded('This run used its time budget.');
      const started = Date.now();
      let rawContent = '';
      try {
        if (this.groqApiKey) {
          const result = await callGroq(
            this.groqApiKey,
            this.model || GROQ_DEFAULT_MODEL,
            [
              { role: 'system', content: input.system },
              { role: 'user', content: attempt === 0 ? input.prompt : `${input.prompt}\n\nYour previous answer was rejected: ${lastError}\nReturn corrected JSON only.` },
            ],
            Math.min(input.maxTokens || 2_048, Math.max(256, this.budget.output - this.usage.output)),
            input.temperature ?? 0.6,
          );
          rawContent = result.content;
          this.usage.prompt += result.promptTokens;
          this.usage.output += result.outputTokens;
        } else if (this.ai) {
          const runPromise = this.ai.run(models[Math.min(attempt, models.length - 1)], {
            messages: [
              { role: 'system', content: input.system },
              { role: 'user', content: attempt === 0 ? input.prompt : `${input.prompt}\n\nYour previous answer was rejected: ${lastError}\nReturn corrected JSON only.` },
            ],
            response_format: { type: 'json_object' },
            max_tokens: Math.min(input.maxTokens || 2_400, Math.max(256, this.budget.output - this.usage.output)),
            temperature: input.temperature ?? 0.4,
          });
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Model call timed out')), 15_000));
          const answer = await Promise.race([runPromise, timeoutPromise]);
          const raw = (answer as { response?: unknown })?.response ?? answer;
          rawContent = typeof raw === 'string' ? raw : JSON.stringify(raw);
        } else {
          throw new Error('No AI provider or Groq API key configured.');
        }
      } catch (cause) {
        lastError = cause instanceof Error ? cause.message : 'the model call failed';
        if (attempt === 1) throw unavailable('Site composition could not reach the model. Try again shortly.', cause);
        continue;
      }
      this.usage.calls += 1;
      this.usage.ms += Date.now() - started;
      const payload = safeJson(rawContent);
      try {
        const parsed = input.read(payload);
        if (parsed) return parsed;
        lastError = 'the JSON did not match the required shape';
      } catch (cause) {
        lastError = cause instanceof Error ? cause.message.slice(0, 300) : 'the JSON failed validation';
      }
    }
    throw unavailable('Site composition returned an unusable answer.');
  }
}

function safeJson(value: string): Record<string, unknown> {
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  if (start < 0 || end <= start) return {};
  try { return object(JSON.parse(value.slice(start, end + 1))); } catch { return {}; }
}

const SYSTEM = `You compose a marketing website draft as strict JSON. Rules:
- Use only facts supplied in the prompt. Never invent prices, stock, reviews, credentials, addresses, awards or customer names.
- Write plain, concrete copy; no lorem ipsum; no placeholder brackets.
- Ids are single lowercase words or kebab-case, starting with a letter, at most 40 characters, unique.
- Allowed node kinds: heading, text, image, list, link, button, divider, spacer, flex, grid, stack, card, collection, navigation, footer, menu, tabs, accordion, gallery, search, form.
- Exactly one heading with level 1 per page.
- Layout kinds for sections: flow, flex, grid, stack.
- Return JSON only.`;

export interface ComposeInput {
  brief: { goal: string; audience: string; tone: string };
  facts: Record<string, unknown>;
  design?: Design;
  origin?: string;
}

/** Plan pages and sections from the brief and approved facts. */
export async function planSite(runner: ModelRunner, input: ComposeInput): Promise<SitePlan> {
  return runner.json<SitePlan>({
    system: SYSTEM,
    prompt: `Plan a distinctive site. Brief: ${JSON.stringify(input.brief)}. Approved facts: ${JSON.stringify(input.facts)}.
Return JSON: { "direction": string, "pages": [ { "id": string, "path": string, "title": string, "description": string, "sections": [ { "id": string, "purpose": string, "layout": "flow|flex|grid|stack", "summary": string } ] } ], "claims": [ { "text": string, "evidence": string } ] }.
Rules: 2 to 5 pages; the home path is "/"; other paths are lowercase like "/menu" or "/about"; 3 to 6 sections per page; vary section purposes so the page is not a formula; every claim must quote supplied evidence.`,
    read: (value) => {
      const pages = Array.isArray(value.pages) ? value.pages : [];
      if (!pages.length) return null;
      const planned: PlannedPage[] = [];
      for (const [index, entry] of pages.entries()) {
        const page = object(entry);
        const title = text(page.title, 120);
        if (!title) return null;
        const rawPath = text(page.path, 80) || '/';
        const path = rawPath === '/' ? '/' : `/${slug(rawPath, slug(title, `page-${index + 1}`))}`;
        const sections = (Array.isArray(page.sections) ? page.sections : []).slice(0, 6).map((raw, sectionIndex) => {
          const section = object(raw);
          const layout = ['flow', 'flex', 'grid', 'stack'].includes(String(section.layout)) ? String(section.layout) as PlannedSection['layout'] : 'stack';
          return {
            id: slug(text(section.id, 40), `${slug(title, 'section')}-${sectionIndex + 1}`),
            purpose: slug(text(section.purpose, 40), 'content'),
            layout,
            summary: text(section.summary, 240),
          };
        });
        if (!sections.length) return null;
        planned.push({
          id: slug(text(page.id, 40), slug(title, `page-${index + 1}`)),
          path, title, description: text(page.description, 240), sections,
        });
      }
      if (!planned.some((page) => page.path === '/')) planned[0].path = '/';
      const claims = (Array.isArray(value.claims) ? value.claims : []).slice(0, 12).map((raw) => {
        const claim = object(raw);
        return { text: text(claim.text, 300), evidence: text(claim.evidence, 400) };
      }).filter((claim) => claim.text);
      return { direction: text(value.direction, 200) || input.design?.direction.idea || DEFAULT_DESIGN.direction.idea, pages: planned, claims };
    },
  });
}

export interface ComposeResult {
  document: SiteDocument;
  claims: ClaimCheck[];
  usage: ModelUsage;
}

/** Compose the full typed draft, repairing once against validation errors. */
export async function composeSite(runner: ModelRunner, plan: SitePlan, input: ComposeInput): Promise<ComposeResult> {
  const design = input.design || DEFAULT_DESIGN;
  const document = await runner.json<SiteDocument>({
    system: SYSTEM,
    prompt: `Write the typed site draft as JSON. Plan: ${JSON.stringify(plan)}. Brief: ${JSON.stringify(input.brief)}. Approved facts: ${JSON.stringify(input.facts)}. Design tokens: ${JSON.stringify({ color: design.color, space: design.space, shape: design.shape, layout: design.layout, type: design.type, motion: design.motion })}.
Return JSON with this shape:
{ "schema": "${DOCUMENT_VERSION}", "revision": 1, "brief": { "goal": string, "audience": string, "tone": string },
  "locale": "en", "timezone": string, "currency": string,
  "design": <the supplied design tokens verbatim in their typed shape>,
  "assets": [], "components": [],
  "pages": [ { "id": string, "path": string, "title": string, "meta": { "description": string }, "sections": [ { "id": string, "purpose": string, "layout": { "kind": "flow|flex|grid|stack" }, "nodes": [ ... ] } ] } ],
  "journeys": [], "redirects": [], "locks": [], "policy": { "allowedCurrencies": [currency] } }
Nodes: { "id": string, "kind": string, "props": object, "style": { "base": { "background": "token:color.surface", "pad": "md", "size": "heading" }, "small": {...} } }.
Node props by kind: heading {text, level}, text {text}, list {items: string[]}, link {label, href}, button {label, href}, divider {}, spacer {}, image {asset}, collection {title, items: []}, navigation {brand, links: [{label, href}]}, footer {brand, links: []}, card/flex/grid/stack {children: [nodes]}, accordion {children: [{props: {label}, children: [nodes]}]}, tabs {children as accordion}, form {journey}.
Every page starts with a navigation section and ends with a footer section. Use only "/" internal hrefs that match planned page paths.`,
    maxTokens: 6_000,
    temperature: 0.5,
    read: (value) => {
      const candidate = { ...value, schema: DOCUMENT_VERSION, claims: [] } as unknown as SiteDocument;
      validateDocument(candidate);
      return candidate;
    },
  });
  const claims: ClaimCheck[] = plan.claims.map((claim) => ({ text: claim.text, verdict: 'unsupported', evidence: [claim.evidence] }));
  return { document, claims, usage: runner.spent() };
}

/** Write replacement copy for one node; never states facts that were not supplied. */
export async function draftCopy(runner: ModelRunner, input: { instruction: string; current: string; facts: Record<string, unknown>; limit?: number }): Promise<string> {
  return runner.json<string>({
    system: SYSTEM,
    prompt: `Rewrite the copy for one site element. Instruction: ${input.instruction}. Current text: ${JSON.stringify(input.current)}. Approved facts: ${JSON.stringify(input.facts)}.
Return JSON: { "text": string } within ${input.limit || 300} characters.`,
    maxTokens: 400,
    temperature: 0.6,
    read: (value) => {
      const next = text(value.text, input.limit || 300);
      return next ? next : null;
    },
  });
}

/** Journeys are declared by code, never invented by the model. */
export function defaultJourney(kind: Journey['kind'] = 'enquiry'): Journey {
  return {
    id: 'enquiry', title: 'Enquiry', target: 'record.create', version: 1,
    input: { type: 'enquiry' }, outcome: 'Appears in Now', enabled: false, kind,
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true, max: 120 },
      { key: 'email', label: 'Email', kind: 'email', required: true, max: 200 },
      { key: 'message', label: 'Message', kind: 'textarea', required: true, max: 1000 },
    ],
  };
}
