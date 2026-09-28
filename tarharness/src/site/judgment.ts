/**
 * Bounded Jev judgments for the site workflow.
 *
 * Each judgment answers one narrow question over state code has already
 * prepared. Code owns the values, thresholds, permissions and commits; a
 * judgment can only choose, rank or flag. Aesthetics may proceed on low
 * confidence; evidence failures fail safe and block publication.
 */

import { askSystemOne, choiceOf, noulOf, scoreOf, JEV_MODEL, type SystemOneQuestion } from '../brain/systemone.ts';
import { THEME_NAMES, type ThemeName } from './schema.ts';

/** Named thresholds, evaluated on our briefs, languages and failure costs. */
export const JUDGMENT = {
  targetConfidence: 0.5,
  optionConfidence: 0.55,
  assetMinimum: 1.4,
  assetLead: 0.3,
  assetConfidence: 0.6,
  claimConfidence: 0.6,
  issueProbability: 0.7,
  timeout: 8_000,
} as const;

export interface JudgmentCache {
  control?: D1Database;
  workspace?: string;
  version?: string;
  ttl?: number;
}

async function digest(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Reuse a stable judgment: same workspace, model, question version and state.
 * Cached answers never expire permissions; they only avoid repeated inference.
 */
async function answers(
  apiKey: string | undefined,
  cache: JudgmentCache,
  scope: string,
  state: Record<string, unknown>,
  questions: Record<string, SystemOneQuestion>,
  timeout = JUDGMENT.timeout,
): Promise<Record<string, Record<string, unknown>> | null> {
  if (!apiKey) return null;
  const version = cache.version || '1';
  const id = cache.control && cache.workspace ? await digest(`${JEV_MODEL}:${scope}:${version}:${JSON.stringify(state)}`) : '';
  if (id && cache.control) {
    const row = await cache.control.prepare('SELECT data FROM judgments WHERE id=? AND expires>?').bind(id, Date.now()).first<{ data: string }>();
    if (row) {
      try { return JSON.parse(String(row.data)) as Record<string, Record<string, unknown>>; } catch { /* A damaged cache entry is ignored. */ }
    }
  }
  const outcome = await askSystemOne(apiKey, { state, questions, timeout });
  if (!outcome.ok) return null;
  if (id && cache.control && cache.workspace) {
    const at = Date.now();
    await cache.control.prepare('INSERT INTO judgments(id,workspace,scope,version,model,data,expires,created) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,expires=excluded.expires')
      .bind(id, cache.workspace, scope, version, outcome.value.model, JSON.stringify(outcome.value.answers), at + (cache.ttl ?? 7 * 86_400_000), at)
      .run().catch(() => undefined);
  }
  return outcome.value.answers;
}

/** Aesthetic advice only. Site facts, policy, and publishing remain deterministic. */
export async function chooseSiteTheme(apiKey: string | undefined, title: string, instruction: string): Promise<ThemeName | null> {
  if (!apiKey || !instruction) return null;
  const outcome = await askSystemOne(apiKey, {
    state: { title, instruction },
    timeout: 5_000,
    questions: {
      theme: {
        type: 'choice',
        instructions: 'Which visual theme best fits the supplied business description? Choose from the provided themes only. This choice does not assert any business fact.',
        criteria: {
          'editorial-chalk': 'Warm editorial visual identity for descriptive storytelling.',
          'streetwear-dark': 'Bold, high-contrast visual identity for expressive brands.',
          'minimal-clean': 'Neutral, restrained visual identity for a broad range of businesses.',
        },
      },
    },
  });
  if (!outcome.ok) return null;
  const answer = choiceOf(outcome.value.answers.theme);
  return typeof answer.choice === 'string' && THEME_NAMES.includes(answer.choice as ThemeName) ? answer.choice as ThemeName : null;
}

export interface TargetJudgment {
  target: string | null;
  confidence: number | null;
}

/** Resolve "change this" among known sections. Exact matches never reach Jev. */
export async function chooseTarget(
  apiKey: string | undefined,
  cache: JudgmentCache,
  input: { command: string; targets: readonly { id: string; label: string; purpose?: string }[] },
): Promise<TargetJudgment> {
  if (!input.targets.length) return { target: null, confidence: null };
  const criteria = Object.fromEntries(input.targets.map((entry) => [entry.id, `${entry.label}${entry.purpose ? ` (${entry.purpose})` : ''}`]));
  criteria.none = 'No supplied section matches the request.';
  const state = {
    command: input.command,
    targets: input.targets.map((entry) => ({ id: entry.id, label: entry.label, purpose: entry.purpose || '' })),
  };
  const result = await answers(apiKey, cache, 'site.target', state, {
    target: {
      type: 'choice',
      instructions: 'Which supplied section does the request most likely target? Choose exactly one supplied id, or none when no section fits. Do not invent ids. This choice selects an edit target only.',
      criteria,
    },
  });
  const answer = choiceOf(result?.target);
  const target = answer.choice && input.targets.some((entry) => entry.id === answer.choice) ? answer.choice : null;
  if (!target || (answer.confidence !== null && answer.confidence < JUDGMENT.targetConfidence)) return { target: null, confidence: answer.confidence };
  return { target, confidence: answer.confidence };
}

/**
 * Choose values for editable properties when the request is ambiguous.
 * `keep` preserves an existing value; `none` clears it.
 */
export async function chooseValues(
  apiKey: string | undefined,
  cache: JudgmentCache,
  input: { command: string; target: string; options: Record<string, readonly string[]> },
): Promise<Record<string, string>> {
  const properties = Object.entries(input.options).filter(([, values]) => values.length > 0);
  if (!properties.length) return {};
  const questions = Object.fromEntries(properties.map(([property, values]) => [`p:${property}`, {
    type: 'choice' as const,
    instructions: `For the requested change, which value should property "${property}" take? Choose one supplied value, keep to leave it unchanged, or none to clear it. Choose keep when the request does not clearly ask to change this property.`,
    criteria: Object.fromEntries([...values.map((value) => [value, `Set ${property} to ${value}.`]), ['keep', 'Leave the current value unchanged.'], ['none', 'Clear the value.']]),
  }]));
  const result = await answers(apiKey, cache, 'site.options', { command: input.command, target: input.target, options: input.options }, questions);
  const chosen: Record<string, string> = {};
  for (const [property, values] of properties) {
    const answer = choiceOf(result?.[`p:${property}`]);
    if (!answer.choice || answer.choice === 'keep') continue;
    if (answer.choice !== 'none' && !values.includes(answer.choice)) continue;
    if (answer.confidence !== null && answer.confidence < JUDGMENT.optionConfidence) continue;
    chosen[property] = answer.choice;
  }
  return chosen;
}

/** Rank supplied assets by brief relevance using comparable per-item Scores. */
export async function rankAssets(
  apiKey: string | undefined,
  cache: JudgmentCache,
  input: { brief: string; assets: readonly { id: string; description: string }[] },
): Promise<string[]> {
  const candidates = input.assets.slice(0, 8);
  if (candidates.length < 2) return candidates.map((entry) => entry.id);
  const questions = Object.fromEntries(candidates.map((entry, index) => [`a${index}`, {
    type: 'score' as const,
    instructions: `How well does asset \`assets[${index}]\` fit the site brief? Judge subject and mood only; ignore availability and rights, which code already checked.`,
    criteria: ['Unrelated subject or mood', 'Plausible but generic choice', 'Clearly the intended subject and mood'],
  }]));
  const result = await answers(apiKey, cache, 'site.assets', { brief: input.brief, assets: candidates.map((entry) => entry.description) }, questions);
  if (!result) return [];
  const scored = candidates.map((entry, index) => ({ id: entry.id, ...scoreOf(result[`a${index}`]) }))
    .filter((entry) => entry.score !== null && entry.confidence !== null && (entry.confidence as number) >= JUDGMENT.assetConfidence)
    .sort((left, right) => (right.score as number) - (left.score as number));
  if (scored.length !== candidates.length) return [];
  const best = scored[0];
  if ((best.score as number) < JUDGMENT.assetMinimum) return [];
  if (scored.length > 1 && (best.score as number) - (scored[1].score as number) < JUDGMENT.assetLead) return [];
  return scored.map((entry) => entry.id);
}

export type ClaimVerdict = 'supported' | 'contradicted' | 'unsupported';

/** Check one prose claim against supplied evidence. Unresolved claims block publish. */
export async function checkClaim(
  apiKey: string | undefined,
  cache: JudgmentCache,
  input: { claim: string; evidence: readonly string[] },
): Promise<{ verdict: ClaimVerdict; confidence: number | null }> {
  if (!input.evidence.length) return { verdict: 'unsupported', confidence: null };
  const result = await answers(apiKey, cache, 'site.claims', { claim: input.claim, evidence: input.evidence.slice(0, 8) }, {
    verdict: {
      type: 'choice',
      instructions: 'Does the supplied evidence support the claim? Choose supported only when the evidence states it, contradicted when the evidence denies it, otherwise unsupported. Judge only the supplied evidence.',
      criteria: {
        supported: 'The evidence states this claim.',
        contradicted: 'The evidence denies this claim.',
        unsupported: 'The evidence neither states nor denies this claim.',
      },
    },
  });
  const answer = choiceOf(result?.verdict);
  const verdict = answer.choice === 'supported' || answer.choice === 'contradicted' || answer.choice === 'unsupported' ? answer.choice : 'unsupported';
  if (verdict !== 'unsupported' && answer.confidence !== null && answer.confidence < JUDGMENT.claimConfidence) return { verdict: 'unsupported', confidence: answer.confidence };
  return { verdict, confidence: answer.confidence };
}

/** Probability that one semantic issue applies to the supplied subject. */
export async function detectIssue(
  apiKey: string | undefined,
  cache: JudgmentCache,
  input: { subject: string; issue: string },
): Promise<number | null> {
  const result = await answers(apiKey, cache, 'site.issue', input, {
    present: {
      type: 'noul',
      instructions: `${input.issue} Answer yes when it holds for the supplied subject, no when it does not.`,
    },
  });
  return noulOf(result?.present).probability;
}
