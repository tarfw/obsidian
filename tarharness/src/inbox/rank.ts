import type { NowEntry } from './now.ts';

type Row = NowEntry & { workspace: { name: string } };
const cache = new Map<string, string | null>();
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Jev only marks one existing action in the earliest deterministic priority tie. */
export async function nextInTie(rows: readonly Row[], context: { label: string; role: string } | null, apiKey?: string): Promise<string | null> {
  if (!apiKey || !context) return null;
  const actionable = rows.filter((row) => (row.kind === 'action' || row.kind === 'flow') && row.lane !== 'waiting');
  if (actionable.length < 2) return null;
  const first = actionable[0];
  const priority = (row: Row) => `${row.due ?? 'later'}:${row.lane}`;
  const tie = actionable.filter((row) => priority(row) === priority(first)).slice(0, 8);
  if (tie.length < 2) return null;
  const key = JSON.stringify({ context, rows: tie.map((row) => [row.id, row.version, row.state]) });
  if (cache.has(key)) return cache.get(key) ?? null;
  const questions = Object.fromEntries(tie.map((row, index) => [`r${index}`, {
    type: 'score',
    instructions: `How well does \`rows[${index}]\` fit \`context\`? Ignore urgency, deadlines, permission and completion; code already fixed those. Rate only contextual fit.`,
    criteria: ['Unrelated to the current role and routine', 'Possibly useful in the current role and routine', 'Clearly the next fitting step in the current role and routine'],
  }]));
  let selected: string | null = null;
  let answered = false;
  try {
    const response = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'jev-latest', state: { context, rows: tie.map((row) => ({ id: row.id, title: row.title,
        role: row.role, workspace: row.workspace.name, state: row.state })) }, questions }),
      signal: AbortSignal.timeout(2_500),
    });
    if (response.ok) {
      answered = true;
      const payload = object(await response.json());
      const answers = object(payload.answers);
      const scores = tie.map((row, index) => ({ row, answer: object(answers[`r${index}`]) }))
        .filter((item) => item.answer.type === 'score' && typeof item.answer.score === 'number'
          && Number.isFinite(item.answer.score) && typeof item.answer.confidence === 'number'
          && item.answer.confidence >= 0.6)
        .sort((left, right) => Number(right.answer.score) - Number(left.answer.score));
      if (scores.length === tie.length && Number(scores[0].answer.score) >= 1.4
        && (scores.length === 1 || Number(scores[0].answer.score) - Number(scores[1].answer.score) >= 0.3)) selected = scores[0].row.id;
    }
  } catch { /* Stable code order is the intended fallback. */ }
  if (answered) {
    cache.set(key, selected);
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
  }
  return selected;
}
