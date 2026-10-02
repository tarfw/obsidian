/**
 * Bounded Jev judgments for the site workflow.
 *
 * Each function is one batched call over state code has already prepared. Code
 * owns the values, thresholds, permissions and commits; a judgment can only
 * choose, rank or flag among options it is given. Every question carries a
 * `keep`/`none` escape, and a low-confidence answer falls back to the
 * deterministic default instead of a guess. Independent questions are always
 * batched: creation is one call, an ambiguous edit is one call.
 */

import { askSystemOne, choiceOf, noulOf, scoreOf, JEV_MODEL, type SystemOneQuestion } from '../brain/systemone.ts';
import { CATEGORIES, CATEGORY_IDS, PURPOSE_IDEAS, THEME_IDS, type Flow } from './design.ts';
import type { Density, Tone } from './build.ts';

/** Named thresholds, evaluated on our briefs, languages and failure costs. */
export const JUDGMENT = {
  targetConfidence: 0.5,
  optionConfidence: 0.55,
  assetMinimum: 1.4,
  assetLead: 0.3,
  assetConfidence: 0.6,
  claimConfidence: 0.6,
  issueProbability: 0.7,
  purposeProbability: 0.55,
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

const DENSITY_LEVELS: readonly string[] = ['Compact and dense', 'Balanced spacing', 'Airy with generous breathing room'];
const COLUMN_CHOICES: Record<string, string> = { '2': 'Two items beside each other.', '3': 'Three items across.', '4': 'Four items across.', none: 'Let the builder default decide.' };

export interface CreateJudgment {
  /** Chosen catalog archetype, or null when the brief fits none above confidence. */
  category: string | null;
  /** Whether the brief carries physical goods (drives `/shop`, cart, order). */
  product: boolean | null;
  /** Whether the brief carries bookable services (drives `records.public`, booking). */
  service: boolean | null;
  theme: string | null;
  density: Density | null;
  tone: Tone | null;
  columns: number | null;
  heroStyle: 'fullbleed_16_6' | 'split_16_9' | null;
  flow: Flow | null;
  quickAdd: boolean | null;
  /** Purposes whose evidence exists and whose noul cleared the threshold. */
  purposes: string[];
  /** Approved asset ids, best match first. */
  assets: string[];
  enquiry: boolean | null;
}

const HERO_STYLE_GUIDE: Record<string, string> = {
  fullbleed_16_6: 'One wide full-bleed image or band with a centered headline and ghost button.',
  split_16_9: 'Headline beside imagery in a split editorial arrangement.',
  none: 'No supplied style fits.',
};

const FLOW_GUIDE: Record<string, string> = {
  classic_lookbook: 'Products lead after the hero, with an editorial break between grids.',
  commerce_first: 'Every product surface leads; editorial content follows.',
  editorial_first: 'Imagery and story lead; the product grid comes later.',
};

/** Plain-word criteria for each registered archetype, plus the `none` escape. */
const CATEGORY_GUIDE: Record<string, string> = Object.fromEntries([
  ...CATEGORY_IDS.map((id) => [id, `${CATEGORIES[id].sector}: ${CATEGORIES[id].criteria}.`]),
  ['none', 'No supplied archetype clearly fits; gates come from the supplied facts.'],
]);

/**
 * One creation fan-out: every independent question about a brief in a single
 * batched call. Dependent questions (what a chosen block should say) never
 * appear here; they belong to the prose pass.
 */
export async function fanOut(
  apiKey: string | undefined,
  cache: JudgmentCache,
  input: {
    brief: { goal: string; audience: string; tone: string };
    facts: Record<string, unknown>;
    purposes: readonly string[];
    assets: readonly { id: string; description: string }[];
    avoid?: readonly string[];
  },
): Promise<CreateJudgment> {
  const purposes = input.purposes.filter((purpose) => Object.hasOwn(PURPOSE_IDEAS, purpose));
  const assets = input.assets.slice(0, 8);
  const themes = THEME_IDS.filter((id) => !input.avoid?.includes(id));
  const questions: Record<string, SystemOneQuestion> = {
    category: {
      type: 'choice',
      instructions: 'Which registered catalog archetype best fits the brief and facts? Choose exactly one supplied id, or none when no archetype clearly fits. This sets the default flow, theme floor and commerce gates; it asserts no business fact.',
      criteria: CATEGORY_GUIDE,
    },
    product: {
      type: 'noul',
      instructions: 'Does this business sell physical goods or catalog products a visitor would buy online? Answer yes only when the brief or facts show goods with prices. This drives the shop, cart and order journey.',
    },
    service: {
      type: 'noul',
      instructions: 'Does this business offer bookable services a visitor would schedule or request? Answer yes only when the brief or facts show services with availability. This drives the services rail and booking journey.',
    },
    theme: {
      type: 'choice',
      instructions: 'Which registered theme best fits the brief? Choose one supplied id, or none when no theme fits. This choice sets appearance only and asserts no business fact.',
      criteria: Object.fromEntries([...themes.map((id) => [id, THEME_GUIDE[id] || id]), ['none', 'No supplied theme fits.']]),
    },
    density: {
      type: 'score',
      instructions: 'How much breathing room does this brief ask for? Level 1 is compact, level 2 balanced, level 3 airy.',
      criteria: DENSITY_LEVELS,
    },
    tone: {
      type: 'choice',
      instructions: 'Which opening section tone suits the brief? Choose canvas, surface, ink or accent, or none. This sets colour only.',
      criteria: {
        canvas: 'Light canvas background.', surface: 'Tinted panel background.', ink: 'Dark background.', accent: 'Brand accent background.',
        none: 'No clear preference.',
      },
    },
    columns: {
      type: 'choice',
      instructions: 'How many columns should a catalogue grid use on a wide screen? Choose 2, 3 or 4, or none.',
      criteria: COLUMN_CHOICES,
    },
    heroStyle: {
      type: 'choice',
      instructions: 'Which hero arrangement suits the brief? Choose one supplied style, or none. This sets layout only and asserts no fact.',
      criteria: HERO_STYLE_GUIDE,
    },
    flow: {
      type: 'choice',
      instructions: 'Which home-page section order suits the brief? Choose one supplied flow, or none. This sets order only.',
      criteria: FLOW_GUIDE,
    },
    quickAdd: {
      type: 'noul',
      instructions: 'Should product cards carry a quick-add action in this storefront? Answer yes only when the brief asks for a fast shopping experience.',
    },
    ...Object.fromEntries(purposes.map((purpose) => [`p:${purpose}`, {
      type: 'noul' as const,
      instructions: `Should the site include a ${purpose} block? ${PURPOSE_IDEAS[purpose]} Answer yes only when the supplied facts or brief support it.`,
    }])),
    ...Object.fromEntries(assets.map((asset, index) => [`a${index}`, {
      type: 'score' as const,
      instructions: `How well does asset \`assets[${index}]\` fit the brief? Judge subject and mood only; availability and rights are already checked by code.`,
      criteria: ['Unrelated subject or mood', 'Plausible but generic choice', 'Clearly the intended subject and mood'],
    }])),
    enquiry: {
      type: 'noul',
      instructions: 'Does the brief indicate the owner wants to collect enquiries from the public site? Answer from the brief only.',
    },
  };
  const result = await answers(apiKey, cache, 'site.create', {
    brief: input.brief, facts: input.facts, purposes,
    assets: assets.map((asset) => asset.description),
    categories: CATEGORY_IDS,
    themes,
  }, questions);
  if (!result) return { category: null, product: null, service: null, theme: null, density: null, tone: null, columns: null, heroStyle: null, flow: null, quickAdd: null, purposes: [], assets: [], enquiry: null };

  const category = choiceOf(result.category);
  const product = noulOf(result.product).probability;
  const service = noulOf(result.service).probability;
  const theme = choiceOf(result.theme);
  const densityLevel = scoreOf(result.density);
  const tone = choiceOf(result.tone);
  const columns = choiceOf(result.columns);
  const heroStyle = choiceOf(result.heroStyle);
  const flow = choiceOf(result.flow);
  const quickAdd = noulOf(result.quickAdd).probability;
  const purposesChosen = purposes.filter((purpose) => {
    const probability = noulOf(result[`p:${purpose}`]).probability;
    return probability !== null && probability >= JUDGMENT.purposeProbability;
  });
  const scored = assets.map((asset, index) => ({ id: asset.id, ...scoreOf(result[`a${index}`]) }))
    .filter((entry) => entry.score !== null && (entry.confidence ?? 0) >= JUDGMENT.assetConfidence)
    .sort((left, right) => (right.score as number) - (left.score as number));
  const best = scored[0];
  const ranked = scored.length === assets.length && best && (best.score as number) >= JUDGMENT.assetMinimum
    && (scored.length < 2 || (best.score as number) - (scored[1].score as number) >= JUDGMENT.assetLead)
    ? scored.map((entry) => entry.id) : assets.map((asset) => asset.id);
  const enquiry = noulOf(result.enquiry).probability;
  const numeric = columns.choice === '2' || columns.choice === '3' || columns.choice === '4' ? Number(columns.choice) : null;
  return {
    category: category.choice && CATEGORY_IDS.includes(category.choice) && (category.confidence ?? 0) >= JUDGMENT.optionConfidence ? category.choice : null,
    product: product === null ? null : product >= JUDGMENT.purposeProbability,
    service: service === null ? null : service >= JUDGMENT.purposeProbability,
    theme: theme.choice && themes.includes(theme.choice) && (theme.confidence ?? 0) >= JUDGMENT.optionConfidence ? theme.choice : null,
    density: densityLevel.score === 1 ? 'compact' : densityLevel.score === 3 ? 'airy' : densityLevel.score === 2 ? 'balanced' : null,
    tone: tone.choice === 'canvas' || tone.choice === 'surface' || tone.choice === 'ink' || tone.choice === 'accent' ? tone.choice : null,
    columns: numeric,
    heroStyle: heroStyle.choice === 'fullbleed_16_6' || heroStyle.choice === 'split_16_9' ? heroStyle.choice : null,
    flow: flow.choice === 'classic_lookbook' || flow.choice === 'commerce_first' || flow.choice === 'editorial_first' ? flow.choice : null,
    quickAdd: quickAdd === null ? null : quickAdd >= JUDGMENT.purposeProbability,
    purposes: purposesChosen,
    assets: ranked,
    enquiry: enquiry === null ? null : enquiry >= JUDGMENT.purposeProbability,
  };
}

const THEME_GUIDE: Record<string, string> = {
  'editorial-light': 'Editorial white canvas, serif display.',
  'editorial-lookbook': 'High-fashion lookbook: tight tracking, four-column grids, restrained neutral canvas.',
  'editorial-chalk': 'Warm paper canvas, single blue accent.',
  'streetwear-dark': 'High-contrast dark canvas for expressive brands.',
  'minimal-clean': 'Neutral restrained canvas for any business.',
};

export interface EditJudgment {
  target: string | null;
  /** One value per ambiguous question: `keep` and `none` are filtered out. */
  values: Record<string, string>;
  /** Questions Jev could not resolve, so the caller can ask the owner. */
  open: string[];
}

export interface EditQuestion {
  key: string;
  label: string;
  values: readonly string[];
  instructions?: string;
}

/**
 * One ambiguous edit: target plus every ambiguous property in a single batched
 * call. Exact values the owner typed never reach here.
 */
export async function interpret(
  apiKey: string | undefined,
  cache: JudgmentCache,
  input: { command: string; targets: readonly { id: string; label: string; purpose?: string }[]; questions: readonly EditQuestion[] },
): Promise<EditJudgment> {
  const questions: Record<string, SystemOneQuestion> = {};
  if (input.targets.length) {
    questions.target = {
      type: 'choice',
      instructions: 'Which supplied section does the request most likely target? Choose exactly one supplied id, or none when no section fits. Do not invent ids.',
      criteria: { ...Object.fromEntries(input.targets.map((entry) => [entry.id, `${entry.label}${entry.purpose ? ` (${entry.purpose})` : ''}`])), none: 'No supplied section matches.' },
    };
  }
  for (const question of input.questions) {
    if (!question.values.length) continue;
    questions[`q:${question.key}`] = {
      type: 'choice',
      instructions: `${question.instructions || `For "${question.label}", which value does the request ask for?`} Choose one supplied value, keep when the request does not clearly ask to change this, or none.`,
      criteria: Object.fromEntries([...question.values.map((value) => [value, `${question.label}: ${value}.`]), ['keep', 'Leave it unchanged.'], ['none', 'No supplied value fits.']]),
    };
  }
  const result = await answers(apiKey, cache, 'site.edit', { command: input.command, targets: input.targets.map((entry) => ({ id: entry.id, label: entry.label })), questions: input.questions.map((entry) => ({ key: entry.key, values: entry.values })) }, questions);
  if (!result) return { target: null, values: {}, open: input.questions.map((entry) => entry.key) };
  const target = choiceOf(result.target);
  const values: Record<string, string> = {};
  const open: string[] = [];
  for (const question of input.questions) {
    const answer = choiceOf(result[`q:${question.key}`]);
    const choice = answer.choice;
    if (choice === 'keep') continue;
    if (!choice || choice === 'none' || !question.values.includes(choice) || (answer.confidence ?? 0) < JUDGMENT.optionConfidence) {
      open.push(question.key);
      continue;
    }
    values[question.key] = choice;
  }
  const chosenTarget = target.choice && input.targets.some((entry) => entry.id === target.choice) ? target.choice : null;
  return {
    target: chosenTarget && (target.confidence ?? 0) >= JUDGMENT.targetConfidence ? chosenTarget : null,
    values,
    open,
  };
}

export type ClaimVerdict = 'supported' | 'contradicted' | 'unsupported';

/** Batched evidence check: every prose claim in one call. Unresolved claims block publish. */
export async function checkClaims(
  apiKey: string | undefined,
  cache: JudgmentCache,
  claims: readonly { text: string; evidence: readonly string[] }[],
): Promise<{ text: string; verdict: ClaimVerdict; confidence: number | null }[]> {
  const entries = claims.slice(0, 12);
  if (!entries.length) return [];
  const questions = Object.fromEntries(entries.map((claim, index) => [`c${index}`, {
    type: 'choice' as const,
    instructions: `Does the evidence supplied for claim ${index} state it (supported), deny it (contradicted), or neither (unsupported)? Judge only the supplied evidence.`,
    criteria: {
      supported: 'The evidence states this claim.',
      contradicted: 'The evidence denies this claim.',
      unsupported: 'The evidence neither states nor denies this claim.',
    },
  }]));
  const result = await answers(apiKey, cache, 'site.claims', { claims: entries.map((claim) => ({ text: claim.text, evidence: claim.evidence.slice(0, 8) })) }, questions);
  return entries.map((claim, index) => {
    const answer = choiceOf(result?.[`c${index}`]);
    const verdict = answer.choice === 'supported' || answer.choice === 'contradicted' || answer.choice === 'unsupported' ? answer.choice : 'unsupported';
    if (verdict !== 'unsupported' && (answer.confidence ?? 0) < JUDGMENT.claimConfidence) return { text: claim.text, verdict: 'unsupported' as const, confidence: answer.confidence };
    if (!claim.evidence.length) return { text: claim.text, verdict: 'unsupported' as const, confidence: null };
    return { text: claim.text, verdict, confidence: answer.confidence };
  });
}

/**
 * One batched drift check for the scout: does this copy still hold today?
 * Code supplies the date and the exact strings; Jev only flags, never edits.
 */
export async function flagDrift(
  apiKey: string | undefined,
  cache: JudgmentCache,
  input: { today: string; subjects: readonly { id: string; text: string }[] },
): Promise<string[]> {
  const subjects = input.subjects.slice(0, 8);
  if (!subjects.length) return [];
  const questions = Object.fromEntries(subjects.map((subject, index) => [`d${index}`, {
    type: 'noul' as const,
    instructions: `State says today is ${input.today}. Does this site copy read as stale or expired on that date - a past season, a finished event, a date or offer already gone? Answer yes only when an owner would want to change it.`,
  }]));
  const result = await answers(apiKey, cache, 'site.drift', { today: input.today, subjects: subjects.map((subject) => subject.text) }, questions);
  if (!result) return [];
  return subjects.filter((subject, index) => {
    const probability = noulOf(result[`d${index}`]).probability;
    return probability !== null && probability >= JUDGMENT.issueProbability;
  }).map((subject) => subject.id);
}
