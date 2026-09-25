import { unavailable } from '../errors.ts';
import { findAction, type ActionDefinition } from '../registry/catalog.ts';

const choices = [
  'record.create', 'contact.create', 'organization.create', 'task.create', 'routine.save',
  'catalog.item.save', 'catalog.variant.save', 'price.set', 'stock.adjust',
  'purchase.create', 'order.create', 'invoice.issue', 'payment.record', 'refund.record',
  'pos.open', 'flow.publish', 'site.generate', 'web.search',
] as const;
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export async function suggest(apiKey: string | undefined, request: string) {
  if (!apiKey) throw unavailable('Jev suggestions are not configured.');
  const prompt = request.trim().slice(0, 2000);
  if (!prompt) throw unavailable('Describe the outcome before requesting a suggestion.');
  const actions = choices.map((id) => findAction(id)).filter((action): action is ActionDefinition => Boolean(action));
  const criteria = Object.fromEntries(actions.map((action) => [action.id, `${action.title}: ${action.description}`]));
  criteria.none = 'No available Action is a clear first step for this request.';
  let response: Response;
  try {
    response = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: { request: prompt, actions: actions.map((action) => ({ id: action.id, title: action.title, description: action.description })) },
        model: 'jev-latest',
        questions: {
          action: {
            type: 'choice',
            instructions: 'Which single registered Action is the best first step for the user’s stated process? Choose none when the request does not clearly map to an available Action. Do not infer that the Action should be run or published.',
            criteria,
          },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (cause) {
    throw unavailable('Jev could not be reached. Try again shortly.', cause);
  }
  if (!response.ok) {
    if (response.status === 429 || response.status === 529 || response.status >= 500) throw unavailable('Jev is temporarily busy. Try again shortly.');
    throw unavailable('Jev rejected the suggestion request. Check the server configuration.');
  }
  let payload: Record<string, unknown>;
  try { payload = object(await response.json()); }
  catch (cause) { throw unavailable('Jev returned an invalid response.', cause); }
  const answer = object(object(payload.answers).action);
  const choice = typeof answer.choice === 'string' && answer.choice !== 'none' && actions.some((action) => action.id === answer.choice) ? answer.choice : null;
  const probabilities = object(answer.probabilities);
  return {
    action: choice,
    title: choice ? actions.find((action) => action.id === choice)?.title || choice : null,
    confidence: typeof answer.confidence === 'number' && Number.isFinite(answer.confidence) ? answer.confidence : null,
    probabilities: Object.fromEntries(Object.entries(probabilities).filter(([key, value]) => (key === 'none' || actions.some((action) => action.id === key)) && typeof value === 'number' && Number.isFinite(value))),
    model: typeof payload.model === 'string' ? payload.model : 'jev-latest',
    review: true,
  };
}
