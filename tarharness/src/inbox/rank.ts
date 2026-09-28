import type { NowEntry } from './now.ts';
import { askSystemOne, scoreOf } from '../brain/systemone.ts';

type Row = NowEntry & { workspace: { name: string } };
const cache = new Map<string, string | null>();

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
    type: 'score' as const,
    instructions: `How well does \`rows[${index}]\` fit \`context\`? Ignore urgency, deadlines, permission and completion; code already fixed those. Rate only contextual fit.`,
    criteria: ['Unrelated to the current role and routine', 'Possibly useful in the current role and routine', 'Clearly the next fitting step in the current role and routine'],
  }]));
  const outcome = await askSystemOne(apiKey, {
    timeout: 2_500,
    state: {
      context,
      rows: tie.map((row) => ({ id: row.id, title: row.title, role: row.role, workspace: row.workspace.name, state: row.state })),
    },
    questions,
  });
  let selected: string | null = null;
  if (outcome.ok) {
    const scores = tie.map((row, index) => ({ row, ...scoreOf(outcome.value.answers[`r${index}`]) }))
      .filter((item) => item.score !== null && item.confidence !== null && item.confidence >= 0.6)
      .sort((left, right) => (right.score as number) - (left.score as number));
    if (scores.length === tie.length && (scores[0].score as number) >= 1.4
      && (scores.length === 1 || (scores[0].score as number) - (scores[1].score as number) >= 0.3)) selected = scores[0].row.id;
    cache.set(key, selected);
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
  }
  return selected;
}
