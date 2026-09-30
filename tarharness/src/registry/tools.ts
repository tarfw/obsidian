import type { Client } from '@libsql/client/web';
import { canExecute, managesMembers } from '../access.ts';
import { commerceActionIds } from '../commerce/catalog.ts';
import type { AccessContext } from '../types.ts';
import { findAction, interfaceCatalog } from './catalog.ts';

export type Module = 'commerce' | 'site' | 'pos';
export type CapabilityState = { enabled: Record<Module, boolean>; version: number };

type ToolDefinition = {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'work' | 'create' | 'manage' | 'explore';
  module: Module | 'core';
  kind: 'action' | 'flows' | 'site';
  action: string;
  grant?: string;
  input?: Record<string, unknown>;
  personal?: boolean;
};

const catalog: readonly ToolDefinition[] = [
  // 1. Sell & POS
  { id: 'pos', title: 'Point of sale', description: 'Quick counter sale & payment', icon: 'storefront-outline', category: 'work', module: 'commerce', kind: 'action', action: 'pos.open', input: { section: 'sell' } },

  // 2. Catalog & Inventory
  { id: 'item', title: 'Add catalog item', description: 'Create a sellable item', icon: 'pricetag-outline', category: 'create', module: 'commerce', kind: 'action', action: 'catalog.item.save' },
  { id: 'inventory', title: 'Adjust stock', description: 'Post a counted correction', icon: 'layers-outline', category: 'manage', module: 'commerce', kind: 'action', action: 'stock.adjust' },
  { id: 'transfer', title: 'Transfer stock', description: 'Move inventory between locations', icon: 'swap-horizontal-outline', category: 'manage', module: 'commerce', kind: 'action', action: 'stock.transfer' },

  // 3. Orders & Invoicing
  { id: 'order', title: 'Create order', description: 'Price and reserve items', icon: 'cart-outline', category: 'create', module: 'commerce', kind: 'action', action: 'order.create' },
  { id: 'invoice', title: 'Issue invoice', description: 'Bill a customer or order', icon: 'document-outline', category: 'create', module: 'commerce', kind: 'action', action: 'invoice.issue' },

  // 4. Money & Purchasing
  { id: 'payment', title: 'Record payment', description: 'Post money received', icon: 'card-outline', category: 'work', module: 'commerce', kind: 'action', action: 'payment.record' },
  { id: 'refund', title: 'Record refund', description: 'Reverse a paid balance', icon: 'return-down-back-outline', category: 'work', module: 'commerce', kind: 'action', action: 'refund.record' },
  { id: 'expense', title: 'Record expense', description: 'Record business expenditure', icon: 'wallet-outline', category: 'work', module: 'commerce', kind: 'action', action: 'expense.record' },
  { id: 'purchase', title: 'Create purchase order', description: 'Order from a supplier', icon: 'bag-add-outline', category: 'create', module: 'commerce', kind: 'action', action: 'purchase.create' },
  { id: 'quote', title: 'Request quote', description: 'Request quote from supplier', icon: 'chatbubbles-outline', category: 'create', module: 'commerce', kind: 'action', action: 'quote.request' },

  // Core & Site
  { id: 'task', title: 'Create task', description: 'Assign a concrete step', icon: 'checkbox-outline', category: 'create', module: 'core', kind: 'action', action: 'task.create' },
  { id: 'person', title: 'Add person', description: 'Save contact details', icon: 'person-add-outline', category: 'create', module: 'core', kind: 'action', action: 'contact.create' },
  { id: 'organization', title: 'Add organization', description: 'Save a business or team', icon: 'business-outline', category: 'create', module: 'core', kind: 'action', action: 'organization.create' },
  { id: 'record', title: 'Create record', description: 'Add workspace information', icon: 'document-text-outline', category: 'create', module: 'core', kind: 'action', action: 'record.create' },
  { id: 'routine', title: 'Add routine', description: 'Choose when a workspace becomes active', icon: 'time-outline', category: 'create', module: 'core', kind: 'action', action: 'routine.save', personal: true },
  { id: 'flows', title: 'Flow Books', description: 'Start or continue a process', icon: 'git-branch-outline', category: 'work', module: 'core', kind: 'flows', action: 'flow.start' },
  { id: 'flow', title: 'Create Flow Book', description: 'Build a repeatable process', icon: 'add-circle-outline', category: 'create', module: 'core', kind: 'action', action: 'flow.publish' },
  { id: 'site', title: 'Site Studio', description: 'Edit and publish your site', icon: 'globe-outline', category: 'manage', module: 'site', kind: 'site', action: 'site.generate' },
  { id: 'search', title: 'Search the web', description: 'Find current public sources', icon: 'search-outline', category: 'explore', module: 'core', kind: 'action', action: 'web.search', personal: true },
];

const modules = [
  { id: 'commerce', title: 'Commerce', description: 'Sales, POS, catalog, inventory, register, invoices and payments' },
  { id: 'site', title: 'Site Studio', description: 'Public pages and publishing' },
] as const;

export async function readCapabilities(client: Client): Promise<CapabilityState> {
  const [saved, existing] = await Promise.all([
    client.execute("SELECT data,version FROM records WHERE id='capability' AND type='capability' AND archived IS NULL LIMIT 1"),
    client.execute("SELECT type FROM records WHERE type IN ('pos.settings','pos.register','pos.order','pos.product','site','item','variant','price','stock','purchase','order','invoice','payment','refund','expense','statement','reconciliation','period','transfer','batch','recipe','production','booking','time','trip','fare','shift','attendance','payroll','supplier','quote','pick','pack','shipment','return','inspection','quality','forecast','plan') AND archived IS NULL GROUP BY type"),
  ]);
  const found = new Set(existing.rows.map((row) => String(row.type)));
  const inferredCommerce = found.has('pos.settings') || found.has('pos.register') || found.has('pos.order') || found.has('pos.product') || [...found].some((type) => !['site'].includes(type));
  const inferred = { commerce: inferredCommerce, pos: inferredCommerce, site: found.has('site') };
  const row = saved.rows[0];
  if (!row) return { enabled: inferred, version: 0 };
  const data = JSON.parse(String(row.data)) as Record<string, unknown>;
  const commerceEnabled = typeof data.commerce === 'boolean' ? data.commerce : (typeof data.pos === 'boolean' ? data.pos : inferred.commerce);
  return { enabled: {
    commerce: commerceEnabled,
    pos: commerceEnabled,
    site: typeof data.site === 'boolean' ? data.site : inferred.site,
  }, version: Number(row.version) };
}

export async function readWorkspaceTools(client: Client, access: AccessContext, providers: { search: boolean }) {
  const state = await readCapabilities(client);
  const tools = catalog.filter((tool) => {
    const action = findAction(tool.action);
    return (tool.module === 'core' || state.enabled[tool.module])
      && (!tool.personal || access.workspace.mode === 'personal')
      && (tool.action !== 'web.search' || providers.search)
      && canExecute(access.member, tool.action)
      && (!tool.grant || canExecute(access.member, tool.grant))
      && Boolean(action)
      && interfaceCatalog.some((item) => item.key === action?.interfaceKey)
      && (tool.kind !== 'action' || !action?.fields.some((field) => field.required && field.hidden && !['flowId', 'actions'].includes(field.key)));
  });
  return {
    tools: tools.map(({ id, title, description, icon, category, module, kind, action, input }) => ({ id, title, description, icon, category, module, kind, action, input: input || {} })),
    modules: modules.map((module) => ({ ...module, enabled: state.enabled[module.id] })),
    version: state.version,
    canManage: managesMembers(access.member),
    role: access.member.role === 'member' ? access.member.workRole || 'member' : access.member.role,
  };
}

export function isModule(value: unknown): value is Module {
  return value === 'pos' || value === 'commerce' || value === 'site';
}

export function moduleForAction(actionId: string): Module | null {
  if (actionId.startsWith('pos.')) return 'commerce';
  if (commerceActionIds.has(actionId)) return 'commerce';
  if (actionId.startsWith('site.')) return 'site';
  return null;
}
