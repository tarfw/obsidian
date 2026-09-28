import type { HarnessAction, HarnessInterfaceContract, HarnessTool, HarnessTools, HarnessWorkspace } from './harness';

type Definition = HarnessTool & { grant?: string; personal?: boolean };

// Compatibility for servers that predate the workspace /tools endpoint.
// The server's action registry still decides role access. Domain tools also
// require an existing source record, so Personal never inherits an empty POS.
const definitions: readonly Definition[] = [
  { id: 'pos', title: 'Point of sale', description: 'Sell and take payment', icon: 'storefront-outline', category: 'work', module: 'pos', kind: 'action', action: 'pos.open', input: { section: 'sell' } },
  { id: 'orders', title: 'Orders and returns', description: 'Review sales and returns', icon: 'receipt-outline', category: 'work', module: 'pos', kind: 'action', action: 'pos.open', grant: 'pos.order.save', input: { section: 'orders' } },
  { id: 'stock', title: 'Stock and catalog', description: 'Products and availability', icon: 'cube-outline', category: 'manage', module: 'pos', kind: 'action', action: 'pos.open', grant: 'pos.product.save', input: { section: 'stock' } },
  { id: 'register', title: 'Register and sales', description: 'Cash drawer and daily totals', icon: 'calculator-outline', category: 'manage', module: 'pos', kind: 'action', action: 'pos.open', grant: 'pos.register.open', input: { section: 'register' } },
  { id: 'customers', title: 'Customers', description: 'People and purchase history', icon: 'people-outline', category: 'manage', module: 'pos', kind: 'action', action: 'pos.open', grant: 'pos.customer.save', input: { section: 'customers' } },
  { id: 'flows', title: 'Flow Books', description: 'Start or continue a process', icon: 'git-branch-outline', category: 'work', module: 'core', kind: 'flows', action: 'flow.start', input: {} },
  { id: 'task', title: 'Create task', description: 'Assign a concrete step', icon: 'checkbox-outline', category: 'create', module: 'core', kind: 'action', action: 'task.create', input: {} },
  { id: 'person', title: 'Add person', description: 'Save contact details', icon: 'person-add-outline', category: 'create', module: 'core', kind: 'action', action: 'contact.create', input: {} },
  { id: 'organization', title: 'Add organization', description: 'Save a business or team', icon: 'business-outline', category: 'create', module: 'core', kind: 'action', action: 'organization.create', input: {} },
  { id: 'record', title: 'Create record', description: 'Add workspace information', icon: 'document-text-outline', category: 'create', module: 'core', kind: 'action', action: 'record.create', input: {} },
  { id: 'routine', title: 'Add routine', description: 'Choose when a workspace becomes active', icon: 'time-outline', category: 'create', module: 'core', kind: 'action', action: 'routine.save', input: {}, personal: true },
  { id: 'flow', title: 'Create Flow Book', description: 'Build a repeatable process', icon: 'add-circle-outline', category: 'create', module: 'core', kind: 'action', action: 'flow.publish', input: {} },
  { id: 'site', title: 'Site Studio', description: 'Edit and publish your site', icon: 'globe-outline', category: 'manage', module: 'site', kind: 'site', action: 'site.generate', input: {} },
  { id: 'search', title: 'Search the web', description: 'Find current public sources', icon: 'search-outline', category: 'explore', module: 'core', kind: 'action', action: 'web.search', input: {}, personal: true },
];

export function legacyWorkspaceTools(workspace: HarnessWorkspace, actions: HarnessAction[], interfaces: HarnessInterfaceContract[], enabled: { pos: boolean; site: boolean }): HarnessTools {
  const available = new Set(actions.filter((action) => interfaces.some((item) => item.key === action.interfaceKey)).map((action) => action.id));
  const tools = definitions.filter((tool) => available.has(tool.action)
    && (!tool.grant || available.has(tool.grant))
    && (!tool.personal || workspace.mode === 'personal')
    && (tool.module !== 'pos' || enabled.pos)
    && (tool.module !== 'site' || enabled.site))
    .map(({ grant: _grant, personal: _personal, ...tool }) => tool);
  return { tools, modules: [], version: 0, canManage: false,
    role: workspace.role === 'member' ? workspace.workRole || 'member' : workspace.role, legacy: true };
}
