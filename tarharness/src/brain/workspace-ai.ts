import { askSystemOne, choiceOf, noulOf, type SystemOneQuestion } from './systemone.ts';
import { canonicalTools, type ToolDefinition } from '../registry/tools.ts';

export interface WorkspaceCapabilitiesResult {
  readonly capabilities: {
    readonly pos: boolean;
    readonly commerce: boolean;
    readonly site: boolean;
  };
  readonly confidence: Record<string, number>;
  readonly model?: string;
  readonly review: true;
}

export interface MemberSuggestionResult {
  readonly role: 'member' | 'admin';
  readonly workRole: string;
  readonly roles: string[];
  readonly suggestedActions: string[];
  readonly permissions: string[];
  readonly confidence: number | null;
  readonly model?: string;
  readonly review: true;
}

function fallbackCapabilities(brief: string): { pos: boolean; commerce: boolean; site: boolean } {
  const text = brief.toLowerCase();
  const posKeywords = /\b(pos|point of sale|cashier|counter|register|restaurant|cafe|bar|kitchen|dining|food|table|takeout|retail|checkout|shop|store)\b/i;
  const commerceKeywords = /\b(commerce|catalog|item|items|variant|variants|product|products|inventory|stock|supplier|suppliers|purchase|purchases|order|orders|invoice|invoices|billing|payment|payments|refund|refunds|quote|quotes|warehouse|shipment|shipments|sales)\b/i;
  const siteKeywords = /\b(site|sites|website|websites|web|storefront|landing|page|pages|online|portal|publish|brand)\b/i;

  const pos = posKeywords.test(text);
  const commerce = commerceKeywords.test(text);
  const site = siteKeywords.test(text);

  // Default fallback if none matched: enable core capabilities based on brief presence
  return {
    pos: pos || text.includes('food') || text.includes('sale'),
    commerce: commerce || (!pos && !site),
    site: site || text.includes('site'),
  };
}

export async function suggestCapabilities(apiKey: string | undefined, brief: string): Promise<WorkspaceCapabilitiesResult> {
  const text = brief.trim().slice(0, 2000);
  if (!apiKey || !text) {
    const inferred = fallbackCapabilities(text || 'General business');
    return {
      capabilities: inferred,
      confidence: { pos: 0.85, commerce: 0.85, site: 0.85 },
      review: true,
    };
  }

  const outcome = await askSystemOne(apiKey, {
    timeout: 8_000,
    state: { brief: text },
    questions: {
      pos: {
        type: 'choice',
        instructions: 'Does this business need a Point of Sale (POS) tool for retail/counter sales, restaurant food/kitchen orders, or cash register checkout?',
        criteria: {
          include: 'Enable Point of Sale tools',
          skip: 'Do not enable Point of Sale tools',
          unsure: 'Unsure',
        },
      },
      commerce: {
        type: 'choice',
        instructions: 'Does this business need Commerce tools for product catalog, stock/inventory, purchasing from suppliers, invoices, or customer orders?',
        criteria: {
          include: 'Enable Commerce tools',
          skip: 'Do not enable Commerce tools',
          unsure: 'Unsure',
        },
      },
      site: {
        type: 'choice',
        instructions: 'Does this business need a public website or storefront generated and published online?',
        criteria: {
          include: 'Enable Site Studio for public website',
          skip: 'Do not enable website tools',
          unsure: 'Unsure',
        },
      },
    },
  });

  if (!outcome.ok) {
    const inferred = fallbackCapabilities(text);
    return {
      capabilities: inferred,
      confidence: { pos: 0.7, commerce: 0.7, site: 0.7 },
      review: true,
    };
  }

  const posAnswer = choiceOf(outcome.value.answers.pos);
  const commerceAnswer = choiceOf(outcome.value.answers.commerce);
  const siteAnswer = choiceOf(outcome.value.answers.site);

  const fallback = fallbackCapabilities(text);

  const pos = posAnswer.choice === 'include' ? true : posAnswer.choice === 'skip' ? false : fallback.pos;
  const commerce = commerceAnswer.choice === 'include' ? true : commerceAnswer.choice === 'skip' ? false : fallback.commerce;
  const site = siteAnswer.choice === 'include' ? true : siteAnswer.choice === 'skip' ? false : fallback.site;

  return {
    capabilities: { pos, commerce, site },
    confidence: {
      pos: posAnswer.confidence ?? 0.8,
      commerce: commerceAnswer.confidence ?? 0.8,
      site: siteAnswer.confidence ?? 0.8,
    },
    model: outcome.value.model,
    review: true,
  };
}

function fallbackMember(duties: string): { role: 'member' | 'admin'; workRole: string; roles: string[]; suggestedActions: string[]; permissions: string[] } {
  const text = duties.toLowerCase().trim();
  const isAdmin = /\b(admin|owner|full access|all access|manager of everything)\b/.test(text);

  const roles: string[] = [];
  const suggestedActions: string[] = [];
  const permissions: string[] = [];

  if (/\b(cashier|checkout|register|counter|sell|selling|sale|sales)\b/i.test(text)) {
    roles.push('cashier');
    permissions.push('Record sales & checkout');
    permissions.push('Open & count register');
    suggestedActions.push('pos.open', 'pos.checkout', 'pos.register.open', 'pos.register.count');
  }

  if (/\b(chef|cook|kitchen|food|prep|cooking)\b/i.test(text)) {
    roles.push('chef');
    permissions.push('Kitchen order preparation');
    permissions.push('Order handoff & status');
    suggestedActions.push('pos.open', 'pos.order.accept', 'pos.order.handoff');
  }

  if (/\b(product|products|stock|inventory|catalog|item|items|variant|variants|price|prices)\b/i.test(text)) {
    roles.push('manager');
    permissions.push('Manage catalog & variants');
    permissions.push('Adjust stock & pricing');
    suggestedActions.push('catalog.item.save', 'catalog.variant.save', 'price.set', 'stock.adjust');
  }

  if (/\b(delivery|driver|courier|dispatch|pickup|dropoff|dropoffs)\b/i.test(text)) {
    roles.push('courier');
    permissions.push('Deliver orders');
    permissions.push('Track shipments');
    suggestedActions.push('pos.order.reach', 'pos.order.collect', 'pos.order.deliver', 'shipment.track');
  }

  if (/\b(server|waiter|waitress|waitstaff|service|tables|table)\b/i.test(text)) {
    roles.push('server');
    permissions.push('Service orders & customers');
    suggestedActions.push('pos.order.save', 'pos.customer.save');
  }

  if (/\b(accountant|finance|invoice|invoices|payment|payments|expense|expenses|billing|tax|taxes|bank)\b/i.test(text)) {
    roles.push('accountant');
    permissions.push('Issue invoices & record payments');
    permissions.push('Record expenses & bank reconciliation');
    suggestedActions.push('invoice.issue', 'payment.record', 'expense.record', 'bank.reconcile');
  }

  if (/\b(warehouse|pick|packing|packer|picker|freight|transfer|transfers)\b/i.test(text)) {
    roles.push('warehouse');
    permissions.push('Warehouse picking & packing');
    permissions.push('Stock transfers');
    suggestedActions.push('warehouse.pick', 'warehouse.pack', 'stock.transfer');
  }

  if (/\b(buyer|procurement|purchase|purchases|purchasing|sourcing|quote|quotes|supplier|suppliers)\b/i.test(text)) {
    roles.push('buyer');
    permissions.push('Supplier quotes & purchasing');
    suggestedActions.push('quote.request', 'quote.record', 'purchase.create', 'purchase.submit');
  }

  if (!roles.length) {
    roles.push('general');
    permissions.push('Create tasks & view workspace records');
    suggestedActions.push('task.create', 'record.create');
  }

  const primaryRole = roles[0];
  return {
    role: 'member',
    workRole: primaryRole,
    roles,
    suggestedActions: [...new Set(suggestedActions)],
    permissions: [...new Set(permissions)],
  };
}

export async function suggestMember(
  apiKey: string | undefined,
  duties: string,
  _enabledCapabilities?: { pos?: boolean; commerce?: boolean; site?: boolean },
): Promise<MemberSuggestionResult> {
  const text = duties.trim().slice(0, 2000);
  if (!apiKey || !text) {
    const fallback = fallbackMember(text || 'General member');
    return {
      ...fallback,
      confidence: 0.85,
      review: true,
    };
  }

  const outcome = await askSystemOne(apiKey, {
    timeout: 8_000,
    state: { duties: text },
    questions: {
      role: {
        type: 'choice',
        instructions: 'Which primary role bundle best matches the duties described for this workspace member?',
        criteria: {
          cashier: 'Cashier (counter sales, checkout, cash drawer)',
          chef: 'Kitchen (cook/chef preparing food and kitchen orders)',
          manager: 'Manager (manage products, stock, prices and catalog)',
          server: 'Service (waitstaff, hospitality and table service)',
          courier: 'Courier (delivery driver, pickup and customer dropoff)',
          accountant: 'Accounting (invoices, payments, expenses, billing)',
          warehouse: 'Warehouse (picking, packing, inventory transfers)',
          buyer: 'Purchasing (supplier quotes, purchase orders, sourcing)',
          general: 'General team member (tasks, records, collaboration)',
        },
      },
    },
  });

  const fallback = fallbackMember(text);
  if (!outcome.ok) {
    return {
      ...fallback,
      confidence: 0.7,
      review: true,
    };
  }

  const answer = choiceOf(outcome.value.answers.role);
  const matchedRole = answer.choice && answer.choice !== 'none' ? answer.choice : fallback.workRole;
  const mergedRoles = [matchedRole, ...fallback.roles.filter((r) => r !== matchedRole)];

  return {
    role: fallback.role,
    workRole: matchedRole,
    roles: mergedRoles,
    suggestedActions: fallback.suggestedActions,
    permissions: fallback.permissions,
    confidence: answer.confidence ?? 0.85,
    model: outcome.value.model,
    review: true,
  };
}

export interface ToolAccessEvaluation {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly kind: 'tool' | 'human' | 'channel' | 'flow' | 'site';
  readonly reach: 'none' | 'customer' | 'money' | 'data';
  readonly probability: number;
  readonly on: boolean;
  readonly ask: boolean;
}

export interface MemberAccessResult {
  readonly brief: string;
  readonly evaluations: ToolAccessEvaluation[];
  readonly suggestedAccess: string[];
  readonly model?: string;
  readonly review: true;
}

const toolKeywords: Record<string, RegExp> = {
  pos: /\b(pos|point of sale|counter sales?|counter|cashier|checkout|barcode|receipt|kadanai|sell|selling)\b/i,
  register: /\b(register|cash drawer|drawer|cash in|cash out|count (physical )?cash|float|shift|closing drawer)\b/i,
  item: /\b(products?|catalog|items?|variants?|prices?|photos?|units?|mrp)\b/i,
  inventory: /\b(inventory|stock|count stock|damage|wastage|transfers?|godown|warehouse|audit)\b/i,
  order: /\b(orders?|take orders?|reserve stock|shipping|courier|delivery|pack(ing)?|parcel)\b/i,
  invoice: /\b(billing|bills?|invoice|invoices|gst|tax invoice)\b/i,
  payment: /\b(payments?|upi|cash received|card|refunds?|settle|settlement)\b/i,
  expense: /\b(expenses?|daily expenses?|petty cash|tea|kaapi|packaging|fuel|expenditure)\b/i,
  purchase: /\b(purchases?|purchase orders?|po|suppliers?|vendors?|quotes?|buy supplies|procurement)\b/i,
  members: /\b(members?|team|staff|roles?|briefs?|permissions?|invite|cashier and packer)\b/i,
  contact: /\b(contacts?|customers?|phone numbers?|directory|suppliers? phone)\b/i,
  human: /\b(you do|manual|physical|pack box|lock shop|lock shutter|call|chore|hand)\b/i,
  flow: /\b(flow|flows?|routines?|checklist|closing( the shop)?|opening( the shop)?|handover)\b/i,
  site: /\b(site|sites?|online store|storefront|website|landing|theme|catalog sync)\b/i,
  inbox: /\b(inbox|team feed|task feed|now|work queue)\b/i,
  chat: /\b(chat|whatsapp chat|wa\.me|message customer|manual chat)\b/i,
  whatsapp: /\b(whatsapp api|cloud waba|official whatsapp|automated bills|pdf bill|meta api)\b/i,
  telegram: /\b(telegram|telegram bot|team alerts|closing report|channel)\b/i,
};

function fallbackToolProbability(toolId: string, brief: string): number {
  const matcher = toolKeywords[toolId];
  if (matcher && matcher.test(brief)) {
    if (toolId === 'pos') return 0.95;
    if (toolId === 'register') return 0.93;
    if (toolId === 'flow') return 0.91;
    return 0.88;
  }
  return 0.10;
}

export async function evaluateMemberAccess(
  apiKey: string | undefined,
  brief: string,
  activeTools?: readonly ToolDefinition[],
): Promise<MemberAccessResult> {
  const text = brief.trim().slice(0, 2000);
  const tools = activeTools || canonicalTools;

  let rawProbabilities: Record<string, number> = {};
  let model: string | undefined;

  if (apiKey && text) {
    const questions: Record<string, SystemOneQuestion> = {};
    for (const tool of tools) {
      questions[tool.id] = {
        type: 'noul',
        instructions: `Does \`brief\` say this person needs ${tool.description}?`,
      };
    }
    const outcome = await askSystemOne(apiKey, {
      timeout: 8_000,
      state: { brief: text },
      questions,
    });
    if (outcome.ok) {
      model = outcome.value.model;
      for (const tool of tools) {
        const answer = noulOf(outcome.value.answers[tool.id]);
        rawProbabilities[tool.id] = answer.probability !== null ? answer.probability : fallbackToolProbability(tool.id, text);
      }
    } else {
      for (const tool of tools) {
        rawProbabilities[tool.id] = fallbackToolProbability(tool.id, text);
      }
    }
  } else {
    for (const tool of tools) {
      rawProbabilities[tool.id] = fallbackToolProbability(tool.id, text);
    }
  }

  const evaluations: ToolAccessEvaluation[] = tools.map((tool) => {
    const prob = rawProbabilities[tool.id] ?? 0.10;
    const isMoney = tool.reach === 'money';
    // Rules kept in code:
    // >= 0.80: Pre-ticked (on: true), UNLESS sensitive (reach: money) which is NEVER pre-ticked
    // 0.20 - 0.80: Unticked ask me (ask: true)
    // <= 0.20: Hidden under More (on: false, ask: false)
    const on = !isMoney && prob >= 0.80;
    const ask = isMoney ? prob >= 0.20 : (prob >= 0.20 && prob < 0.80);

    return {
      id: tool.id,
      title: tool.title,
      description: tool.description,
      kind: tool.kind,
      reach: tool.reach,
      probability: Number(prob.toFixed(2)),
      on,
      ask,
    };
  });

  const suggestedAccess = evaluations.filter((item) => item.on).map((item) => item.id);

  return {
    brief: text,
    evaluations,
    suggestedAccess,
    model,
    review: true,
  };
}
