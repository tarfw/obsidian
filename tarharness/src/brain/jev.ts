import { unavailable } from '../errors.ts';
import { askSystemOne, choiceOf, type SystemOneFailure } from './systemone.ts';
import { findAction, type ActionDefinition } from '../registry/catalog.ts';

const choices = [
  'record.create', 'contact.create', 'organization.create', 'task.create', 'routine.save',
  'catalog.item.save', 'catalog.variant.save', 'price.set', 'stock.adjust',
  'purchase.create', 'order.create', 'invoice.issue', 'payment.record', 'refund.record',
  'pos.open', 'flow.publish', 'site.generate', 'web.search',
] as const;

function failureMessage(failure: SystemOneFailure): string {
  switch (failure.kind) {
    case 'busy': return 'Jev is temporarily busy. Try again shortly.';
    case 'rejected': return 'Jev rejected the suggestion request. Check the server configuration.';
    case 'invalid': return 'Jev returned an invalid response.';
    case 'unconfigured': return 'Jev suggestions are not configured.';
    default: return 'Jev could not be reached. Try again shortly.';
  }
}

export async function suggest(apiKey: string | undefined, request: string) {
  if (!apiKey) throw unavailable('Jev suggestions are not configured.');
  const prompt = request.trim().slice(0, 2000);
  if (!prompt) throw unavailable('Describe the outcome before requesting a suggestion.');
  const actions = choices.map((id) => findAction(id)).filter((action): action is ActionDefinition => Boolean(action));
  const criteria = Object.fromEntries(actions.map((action) => [action.id, `${action.title}: ${action.description}`]));
  criteria.none = 'No available Action is a clear first step for this request.';
  const outcome = await askSystemOne(apiKey, {
    timeout: 10_000,
    state: { request: prompt, actions: actions.map((action) => ({ id: action.id, title: action.title, description: action.description })) },
    questions: {
      action: {
        type: 'choice',
        instructions: 'Which single registered Action is the best first step for the user’s stated process? Choose none when the request does not clearly map to an available Action. Do not infer that the Action should be run or published.',
        criteria,
      },
    },
  });
  if (!outcome.ok) throw unavailable(failureMessage(outcome.failure), outcome.failure.cause);
  const answer = choiceOf(outcome.value.answers.action);
  const choice = answer.choice && answer.choice !== 'none' && actions.some((action) => action.id === answer.choice) ? answer.choice : null;
  return {
    action: choice,
    title: choice ? actions.find((action) => action.id === choice)?.title || choice : null,
    confidence: answer.confidence,
    probabilities: Object.fromEntries(Object.entries(answer.probabilities).filter(([key]) => key === 'none' || actions.some((action) => action.id === key))),
    model: outcome.value.model,
    review: true,
  };
}
