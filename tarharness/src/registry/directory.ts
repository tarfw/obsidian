export interface BotFlowTemplate {
  id: string;
  title: string;
  description: string;
  records: string[];
  actions: ReadonlyArray<{ id: string }>;
}

export interface BotDirectoryItem {
  id: string;
  title: string;
  description: string;
  category: string;
  guidance: string;
  flows: readonly BotFlowTemplate[];
}

export const botDirectory: readonly BotDirectoryItem[] = [
  {
    id: 'pos', title: 'POS Bot', category: 'Retail', description: 'Sell, take payments and keep stock in sync.',
    guidance: 'Set up your store, add products and open the register.',
    flows: [
      { id: 'sell', title: 'New sale', description: 'Start an order; continue it from Inbox', records: ['Order', 'Payment'], actions: [{ id: 'pos.order.save' }, { id: 'pos.checkout' }] },
      { id: 'orders', title: 'Orders & returns', description: 'Receipts and returns', records: ['Order'], actions: [{ id: 'pos.refund' }] },
      { id: 'stock', title: 'Stock', description: 'Products and inventory', records: ['Product'], actions: [{ id: 'pos.product.save' }, { id: 'pos.product.content.save' }, { id: 'pos.product.draft' }, { id: 'pos.stock.adjust' }] },
      { id: 'customers', title: 'Customers', description: 'Customer details and history', records: ['Customer'], actions: [{ id: 'pos.customer.save' }] },
      { id: 'register', title: 'Register', description: 'Open and close the day', records: ['Register'], actions: [{ id: 'pos.register.open' }, { id: 'pos.register.close' }] },
    ],
  },
  {
    id: 'sales',
    title: 'Sales Bot',
    description: 'Capture customers, follow up and keep deals moving.',
    category: 'Customers',
    guidance: 'Start with customer follow-up. Add review when the team needs a hand-off.',
    flows: [
      { id: 'customer-follow-up', title: 'Customer follow-up', description: 'Save a customer and create the next follow-up task.', records: ['Contact', 'Task'], actions: [{ id: 'record.create' }, { id: 'task.create' }] },
      { id: 'sales-review', title: 'Sales review', description: 'Assign a sales review and close it when the decision is made.', records: ['Task'], actions: [{ id: 'task.create' }, { id: 'task.complete' }] },
    ],
  },
  {
    id: 'team',
    title: 'Team Bot',
    description: 'Onboard people and keep assigned work clear.',
    category: 'Team',
    guidance: 'Choose onboarding for every new teammate. Add work review for recurring accountability.',
    flows: [
      { id: 'member-onboarding', title: 'Member onboarding', description: 'Save a team member and assign their first task.', records: ['Contact', 'Task'], actions: [{ id: 'record.create' }, { id: 'task.create' }] },
      { id: 'work-review', title: 'Work review', description: 'Assign work and record its completion.', records: ['Task'], actions: [{ id: 'task.create' }, { id: 'task.complete' }] },
    ],
  },
  {
    id: 'operations',
    title: 'Operations Bot',
    description: 'Handle requests and routine operational work.',
    category: 'Operations',
    guidance: 'Install the request Flow first, then add a custom Flow for your recurring process.',
    flows: [
      { id: 'operational-request', title: 'Operational request', description: 'Capture a request and assign the work.', records: ['Request', 'Task'], actions: [{ id: 'record.create' }, { id: 'task.create' }] },
      { id: 'request-review', title: 'Request and review', description: 'Assign a request, then close it after review.', records: ['Task'], actions: [{ id: 'task.create' }, { id: 'task.complete' }] },
    ],
  },
];

export function findDirectoryBot(botId: string) {
  return botDirectory.find((bot) => bot.id === botId);
}

export function directoryDefinitionIds(botId: string, flowId?: string) {
  return {
    bot: `directory.${botId}.bot`,
    kit: `directory.${botId}.kit`,
    flow: flowId ? `directory.${botId}.${flowId}.flow` : undefined,
  };
}
