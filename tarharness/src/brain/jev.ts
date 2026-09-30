import { unavailable } from '../errors.ts';
import { askSystemOne, choiceOf, type SystemOneFailure } from './systemone.ts';
import { findAction, type ActionDefinition } from '../registry/catalog.ts';

const choices = [
  'record.create', 'contact.create', 'organization.create', 'task.create', 'routine.save',
  'catalog.item.save', 'catalog.variant.save', 'price.set', 'stock.adjust',
  'purchase.create', 'order.create', 'invoice.issue', 'payment.record', 'refund.record',
  'pos.open', 'flow.publish', 'site.generate', 'web.search',
] as const;

const actionCriteriaDescriptions: Record<string, string> = {
  'routine.save': 'Schedule when a workspace, shift, or role becomes active automatically (e.g., routines, work hours, shifts, recurring schedules, morning/evening shifts, auto workspace switching).',
  'task.create': 'Create a personal or team to-do task, reminder, action item, or follow-up item.',
  'contact.create': 'Add a person, customer, contact, or individual with email and phone details.',
  'organization.create': 'Add a company, partner, business, supplier organization, or corporate entity.',
  'record.create': 'Create a generic workspace record, memo, document, or unstructured entry.',
  'catalog.item.save': 'Add or update a product item, merchandise, food menu item, or sellable goods.',
  'catalog.variant.save': 'Add or update a product variant, SKU, size, color, or item option.',
  'price.set': 'Set or update selling prices, retail price, cost, or pricing rules for products.',
  'stock.adjust': 'Adjust inventory quantities, count on-hand stock, record waste, or restock items.',
  'purchase.create': 'Create a purchase order to buy stock/supplies from a vendor or supplier.',
  'order.create': 'Create a customer sales order, takeout order, or commercial order.',
  'invoice.issue': 'Issue and send an invoice or bill to a customer for payment.',
  'payment.record': 'Record an incoming customer payment, settlement, or received money.',
  'refund.record': 'Record a customer refund, return payment, or credit reimbursement.',
  'pos.open': 'Open the Point of Sale (POS) register, cashier terminal, or counter checkout.',
  'flow.publish': 'Publish a new multi-step automated Flow Book or standard operating procedure.',
  'site.generate': 'Generate, design, or create a public website, landing page, or online storefront.',
  'web.search': 'Perform a live web search on the internet for external facts or information.',
};

export function fallbackAction(request: string): string | null {
  const text = request.toLowerCase().trim();
  if (!text) return null;

  // Space & Routine scheduling
  if (/\b(routine|routines|schedule|schedules|scheduling|shift|shifts|work hours|working hours|switch workspace|auto switch|morning shift|evening shift|night shift|weekdays|weekends|daily schedule|calendar routine|space routine|auto schedule|set hours)\b/i.test(text)) {
    return 'routine.save';
  }

  // Payments & Refunds
  if (/\b(payment|payments|record payment|received money|pay invoice|cash received|customer payment|collect payment|pay bill)\b/i.test(text)) {
    return 'payment.record';
  }
  if (/\b(refund|refunds|return money|credit customer|reimbursement|issue refund)\b/i.test(text)) {
    return 'refund.record';
  }

  // Invoices, Purchases, Orders
  if (/\b(invoice|invoices|bill client|send invoice|issue bill|create invoice|billing)\b/i.test(text)) {
    return 'invoice.issue';
  }
  if (/\b(purchase order|buy inventory|supplier order|buy supplies|procurement)\b/i.test(text)) {
    return 'purchase.create';
  }
  if (/\b(sales order|customer order|create order|new order|place order)\b/i.test(text)) {
    return 'order.create';
  }

  // Stock, Pricing, Catalog
  if (/\b(stock|stocks|inventory|adjust quantity|restock|count stock|stock adjustment|waste count)\b/i.test(text)) {
    return 'stock.adjust';
  }
  if (/\b(price|pricing|set rate|change cost|set price|discount price|product price)\b/i.test(text)) {
    return 'price.set';
  }
  if (/\b(variant|sku|size variation|color option|product option)\b/i.test(text)) {
    return 'catalog.variant.save';
  }
  if (/\b(product|menu item|merchandise|sellable)\b/i.test(text)) {
    return 'catalog.item.save';
  }

  // POS
  if (/\b(pos|cashier|register|point of sale|counter checkout)\b/i.test(text)) {
    return 'pos.open';
  }

  // Flow Books & Sites
  if (/\b(flow book|workflow|playbook|publish flow|automation sequence)\b/i.test(text)) {
    return 'flow.publish';
  }
  if (/\b(website|landing page|storefront|build site|generate site|web page|online store)\b/i.test(text)) {
    return 'site.generate';
  }

  // Web search
  if (/\b(web search|search internet|look up online|google search|find online|search web|search online)\b/i.test(text)) {
    return 'web.search';
  }

  // Tasks & To-dos
  if (/\b(task|todo|to-do|remind|reminder|follow up|action item|chore|checklist)\b/i.test(text)) {
    return 'task.create';
  }

  // Contacts & People
  if (/\b(contact|person|customer|client|lead|colleague)\b/i.test(text)) {
    return 'contact.create';
  }

  // Organizations & Companies
  if (/\b(organization|org|company|supplier|vendor|partner|business|corporate)\b/i.test(text)) {
    return 'organization.create';
  }

  // Generic Records / Notes
  if (/\b(record|note|memo|entry|document|log)\b/i.test(text)) {
    return 'record.create';
  }

  return null;
}

function failureMessage(failure: SystemOneFailure): string {
  switch (failure.kind) {
    case 'busy': return 'Jev is temporarily busy. Try again shortly.';
    case 'rejected': return 'Jev rejected the suggestion request. Check the server configuration.';
    case 'invalid': return 'Jev returned an invalid response.';
    case 'unconfigured': return 'Jev suggestions are not configured.';
    default: return 'Jev could not be reached. Try again shortly.';
  }
}

export interface SuggestResult {
  readonly action: string | null;
  readonly title: string | null;
  readonly confidence: number | null;
  readonly probabilities: Record<string, number>;
  readonly model?: string;
  readonly review: true;
}

export async function suggest(apiKey: string | undefined, request: string): Promise<SuggestResult> {
  const prompt = request.trim().slice(0, 2000);
  if (!prompt) throw unavailable('Describe the outcome before requesting a suggestion.');
  const actions = choices.map((id) => findAction(id)).filter((action): action is ActionDefinition => Boolean(action));
  const fallback = fallbackAction(prompt);

  if (!apiKey) {
    const choice = fallback && actions.some((action) => action.id === fallback) ? fallback : null;
    return {
      action: choice,
      title: choice ? actions.find((action) => action.id === choice)?.title || choice : null,
      confidence: choice ? 0.88 : 0.2,
      probabilities: choice ? { [choice]: 0.88, none: 0.12 } : { none: 0.8 },
      review: true,
    };
  }

  const criteria: Record<string, string> = {};
  for (const action of actions) {
    criteria[action.id] = actionCriteriaDescriptions[action.id] || `${action.title}: ${action.description}`;
  }
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

  if (!outcome.ok) {
    const choice = fallback && actions.some((action) => action.id === fallback) ? fallback : null;
    return {
      action: choice,
      title: choice ? actions.find((action) => action.id === choice)?.title || choice : null,
      confidence: choice ? 0.75 : 0.2,
      probabilities: choice ? { [choice]: 0.75, none: 0.25 } : { none: 0.8 },
      review: true,
    };
  }

  const answer = choiceOf(outcome.value.answers.action);
  let choice = answer.choice && answer.choice !== 'none' && actions.some((action) => action.id === answer.choice) ? answer.choice : null;
  if (!choice && fallback && (answer.confidence ?? 0) < 0.6) {
    choice = actions.some((action) => action.id === fallback) ? fallback : null;
  }

  return {
    action: choice,
    title: choice ? actions.find((action) => action.id === choice)?.title || choice : null,
    confidence: answer.confidence ?? (choice ? 0.8 : 0.2),
    probabilities: Object.fromEntries(Object.entries(answer.probabilities).filter(([key]) => key === 'none' || actions.some((action) => action.id === key))),
    model: outcome.value.model,
    review: true,
  };
}
