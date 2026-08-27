import * as v from 'valibot';
import { isRegisteredDataView } from './views.ts';
import { VALID_BLOCK_TYPES } from './blocks.ts';

export interface OnboardingOption {
  id: string;
  label: string;
  icon: string;
}

export interface WorkspaceCategory extends OnboardingOption {
  keywords: string[];
  suggestedName: string;
  activities: string[];
  priorities: string[];
  actions: string[];
}

export const ACTIVITIES: OnboardingOption[] = [
  { id: 'sales', label: 'Sell products or services', icon: 'receipt-outline' },
  { id: 'orders', label: 'Take customer orders', icon: 'bag-handle-outline' },
  { id: 'inventory', label: 'Track stock or supplies', icon: 'cube-outline' },
  { id: 'tasks', label: 'Manage tasks', icon: 'checkmark-circle-outline' },
  { id: 'customers', label: 'Keep customer details', icon: 'people-outline' },
  { id: 'bookings', label: 'Accept bookings', icon: 'calendar-outline' },
  { id: 'projects', label: 'Run projects', icon: 'git-network-outline' },
  { id: 'deliveries', label: 'Manage deliveries', icon: 'navigate-outline' },
  { id: 'team', label: 'Work with a team', icon: 'people-circle-outline' },
  { id: 'notes', label: 'Organize notes and documents', icon: 'document-text-outline' },
];

export const PRIORITIES: OnboardingOption[] = [
  { id: 'tasks.urgent', label: 'Work needing attention', icon: 'checkbox-outline' },
  { id: 'sales.today', label: "Today's sales", icon: 'trending-up-outline' },
  { id: 'inventory.low', label: 'Low stock', icon: 'alert-circle-outline' },
  { id: 'orders.upcoming', label: 'Upcoming orders', icon: 'time-outline' },
  { id: 'pipeline.active', label: 'Active work', icon: 'git-network-outline' },
  { id: 'contacts.recent', label: 'Recent contacts', icon: 'people-outline' },
  { id: 'bookings.upcoming', label: 'Upcoming bookings', icon: 'calendar-outline' },
];

export const ACTIONS: Array<OnboardingOption & { target?: string }> = [
  { id: 'sale.create', label: 'Record sale', icon: 'receipt-outline', target: 'quick-pos' },
  { id: 'product.create', label: 'Add product', icon: 'cube-outline' },
  { id: 'order.create', label: 'Add order', icon: 'bag-add-outline' },
  { id: 'inventory.view_low', label: 'Check stock', icon: 'cube-outline', target: 'stock-sheet' },
  { id: 'task.create', label: 'Create task', icon: 'checkbox-outline' },
  { id: 'contact.create', label: 'Add contact', icon: 'person-add-outline' },
  { id: 'pipeline.create', label: 'Start a pipeline', icon: 'git-network-outline' },
  { id: 'booking.create', label: 'Add booking', icon: 'calendar-outline' },
  { id: 'site.open', label: 'Create website', icon: 'globe-outline' },
];

export const WORKSPACE_CATEGORIES: WorkspaceCategory[] = [
  { id: 'bakery', label: 'Bakery or cake shop', icon: 'cafe-outline', keywords: ['bakery', 'baker', 'cake', 'bread'], suggestedName: 'My Bakery', activities: ['sales', 'orders', 'inventory', 'tasks', 'customers'], priorities: ['orders.upcoming', 'inventory.low', 'tasks.urgent'], actions: ['sale.create', 'order.create', 'inventory.view_low'] },
  { id: 'retail', label: 'Shop or retail store', icon: 'storefront-outline', keywords: ['shop', 'store', 'retail', 'seller'], suggestedName: 'My Store', activities: ['sales', 'orders', 'inventory', 'customers'], priorities: ['sales.today', 'inventory.low', 'orders.upcoming'], actions: ['sale.create', 'product.create', 'inventory.view_low'] },
  { id: 'food', label: 'Restaurant or cafe', icon: 'restaurant-outline', keywords: ['restaurant', 'cafe', 'food', 'kitchen'], suggestedName: 'My Restaurant', activities: ['sales', 'orders', 'inventory', 'tasks'], priorities: ['orders.upcoming', 'sales.today', 'inventory.low'], actions: ['sale.create', 'order.create', 'inventory.view_low'] },
  { id: 'services', label: 'Service business', icon: 'briefcase-outline', keywords: ['service', 'agency', 'consultant', 'freelance', 'salon'], suggestedName: 'My Business', activities: ['customers', 'bookings', 'tasks', 'projects'], priorities: ['tasks.urgent', 'bookings.upcoming', 'pipeline.active'], actions: ['task.create', 'contact.create', 'booking.create'] },
  { id: 'project', label: 'Project or team', icon: 'git-network-outline', keywords: ['project', 'team', 'startup', 'work'], suggestedName: 'My Project', activities: ['tasks', 'projects', 'team', 'notes'], priorities: ['tasks.urgent', 'pipeline.active', 'contacts.recent'], actions: ['task.create', 'pipeline.create', 'contact.create'] },
  { id: 'personal', label: 'Personal organization', icon: 'person-outline', keywords: ['personal', 'home', 'life', 'myself'], suggestedName: 'My Space', activities: ['tasks', 'notes'], priorities: ['tasks.urgent'], actions: ['task.create', 'contact.create'] },
  { id: 'general', label: 'Something else', icon: 'grid-outline', keywords: [], suggestedName: 'My Workspace', activities: ['tasks', 'customers', 'notes'], priorities: ['tasks.urgent', 'contacts.recent'], actions: ['task.create', 'contact.create', 'pipeline.create'] },
];

export const WorkspaceOnboardingSchema = v.object({
  category: v.pipe(v.string(), v.maxLength(64)),
  activities: v.pipe(v.array(v.string()), v.maxLength(10)),
  priorities: v.pipe(v.array(v.string()), v.maxLength(3)),
  actions: v.pipe(v.array(v.string()), v.maxLength(3)),
  audience: v.picklist(['solo', 'team']),
  note: v.optional(v.pipe(v.string(), v.maxLength(1000))),
});

export type WorkspaceOnboarding = v.InferOutput<typeof WorkspaceOnboardingSchema>;

interface CanvasBlockDefinition {
  id: string;
  type: (typeof VALID_BLOCK_TYPES)[number];
  title: string;
  dataView: string;
  props?: Record<string, unknown>;
}

const BLOCKS: Record<string, CanvasBlockDefinition> = {
  'tasks.urgent': { id: 'urgent-work', type: 'task-inbox', title: 'Work needing attention', dataView: 'tasks.urgent' },
  'sales.today': { id: 'today-sales', type: 'metric-card', title: "Today's sales", dataView: 'sales.today' },
  'inventory.low': { id: 'low-stock', type: 'stock-sheet', title: 'Low stock', dataView: 'inventory.low' },
  'orders.upcoming': { id: 'upcoming-orders', type: 'data-grid', title: 'Upcoming orders', dataView: 'orders.upcoming', props: { type: 'order' } },
  'pipeline.active': { id: 'active-work', type: 'pipeline-card', title: 'Active work', dataView: 'pipeline.active' },
  'contacts.recent': { id: 'recent-contacts', type: 'contact-card', title: 'Recent contacts', dataView: 'contacts.recent' },
  'bookings.upcoming': { id: 'upcoming-bookings', type: 'data-grid', title: 'Upcoming bookings', dataView: 'bookings.upcoming', props: { type: 'booking' } },
};

function uniqueRegistered(values: string[], allowed: ReadonlySet<string>, fallback: string[]): string[] {
  const selected = [...new Set(values)].filter((value) => allowed.has(value)).slice(0, 3);
  return selected.length ? selected : fallback;
}

export interface CompiledWorkspaceSetup {
  onboarding: WorkspaceOnboarding;
  modules: string[];
  profileMarkdown: string;
  indexMarkdown: string;
  canvasMarkdown: string;
  canvas: Record<string, unknown>;
}

function yamlString(value: string): string {
  return JSON.stringify(value.replace(/[\r\n]+/g, ' ').trim());
}

export function compileWorkspaceSetup(name: string, raw: unknown, actor: string, now = Math.floor(Date.now() / 1000)): CompiledWorkspaceSetup {
  const parsed = v.safeParse(WorkspaceOnboardingSchema, raw);
  const requested = parsed.success ? parsed.output : { category: 'general', activities: ['tasks'], priorities: ['tasks.urgent'], actions: ['task.create'], audience: 'solo' as const, note: '' };
  const category = WORKSPACE_CATEGORIES.find((item) => item.id === requested.category) || WORKSPACE_CATEGORIES.at(-1)!;
  const activityIds = new Set(ACTIVITIES.map((item) => item.id));
  const priorityIds = new Set(PRIORITIES.map((item) => item.id));
  const actionIds = new Set(ACTIONS.map((item) => item.id));
  const activities = [...new Set(requested.activities)].filter((id) => activityIds.has(id)).slice(0, 10);
  const priorities = uniqueRegistered(requested.priorities, priorityIds, category.priorities.slice(0, 3));
  const actions = uniqueRegistered(requested.actions, actionIds, category.actions.slice(0, 3));
  const onboarding: WorkspaceOnboarding = { ...requested, category: category.id, activities: activities.length ? activities : category.activities, priorities, actions };
  const activityLabels = onboarding.activities.map((id) => ACTIVITIES.find((item) => item.id === id)?.label).filter(Boolean) as string[];
  const priorityLabels = priorities.map((id) => PRIORITIES.find((item) => item.id === id)?.label).filter(Boolean) as string[];
  const actionLabels = actions.map((id) => ACTIONS.find((item) => item.id === id)?.label).filter(Boolean) as string[];
  const blocks = priorities.map((id) => BLOCKS[id]).filter((block): block is CanvasBlockDefinition => Boolean(block && isRegisteredDataView(block.dataView))).slice(0, 3);
  const allActions = ACTIONS.filter((action) => action.id === 'site.open' || onboarding.activities.some((activity) => {
    const map: Record<string, string[]> = { sales: ['sale.create'], orders: ['order.create'], inventory: ['product.create', 'inventory.view_low'], tasks: ['task.create'], customers: ['contact.create'], bookings: ['booking.create'], projects: ['pipeline.create'] };
    return (map[activity] || []).includes(action.id);
  }));

  const profileMarkdown = `---\nschema: 1\nversion: 1\ncategory: ${category.id}\nmodules: [${onboarding.activities.join(', ')}]\naudience: ${onboarding.audience}\nupdated_by: ${yamlString(actor)}\nupdated_at: ${now}\n---\n\n# ${name}\n\n## Workspace purpose\n\n${name} is used to ${activityLabels.map((label) => label.toLowerCase()).join(', ')}.\n\n## Priorities\n\n${priorityLabels.map((label) => `- ${label}`).join('\n')}\n\n## Frequent activities\n\n${actionLabels.map((label) => `- ${label}`).join('\n')}${onboarding.note ? `\n\n## Owner notes\n\n${onboarding.note.trim()}` : ''}\n`;
  const indexMarkdown = `# ${name}\n\n**Type:** ${category.id}\n\n**Modules:** ${onboarding.activities.join(', ')}\n\n- [Business profile](business/profile.md)\n- [Team canvas](team/canvas.md)\n`;
  const chips = actions.map((id) => ACTIONS.find((item) => item.id === id)!).filter(Boolean);
  const canvasMarkdown = `---\nschema: 1\nversion: 1\ntype: Canvas\ntitle: ${yamlString(name)}\nmode: ${category.id}\nchips:\n${chips.map((chip) => `  - label: ${yamlString(chip.label)}\n    action: ${chip.id}${chip.target ? `\n    target: ${chip.target}` : ''}`).join('\n')}\nactions:\n${allActions.map((action) => `  - label: ${yamlString(action.label)}\n    action: ${action.id}${action.target ? `\n    target: ${action.target}` : ''}`).join('\n')}\nblocks:\n${blocks.map((block) => `  - id: ${block.id}\n    type: ${block.type}\n    title: ${yamlString(block.title)}\n    roles: [owner, admin, member]\n    props: ${JSON.stringify({ ...block.props, data_view: block.dataView })}`).join('\n')}\n---\n`;
  const canvas = {
    schema: 1,
    version: 1,
    title: name,
    mode: category.id,
    chips: chips.map(({ id, label, target }) => ({ action: id, label, target })),
    actions: allActions.map(({ id, label, target }) => ({ action: id, label, target })),
    blocks: blocks.map((block) => ({ id: block.id, type: block.type, title: block.title, dataView: block.dataView, props: { ...block.props, data_view: block.dataView }, roles: ['owner', 'admin', 'member'] })),
  };
  return { onboarding, modules: onboarding.activities, profileMarkdown, indexMarkdown, canvasMarkdown, canvas };
}

export function onboardingCatalog() {
  return { version: 1, categories: WORKSPACE_CATEGORIES, activities: ACTIVITIES, priorities: PRIORITIES, actions: ACTIONS };
}

export function validateCanvasDocument(raw: unknown): { valid: boolean; canvas?: Record<string, unknown>; error?: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { valid: false, error: 'Canvas must be an object' };
  const canvas = raw as Record<string, unknown>;
  const serialized = JSON.stringify(canvas);
  if (serialized.length > 64_000 || /(SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+.+\s+SET|DELETE\s+FROM|<script|<\/script>)/i.test(serialized)) {
    return { valid: false, error: 'Canvas contains unsupported executable content' };
  }
  const blocks = Array.isArray(canvas.blocks) ? canvas.blocks : [];
  const chips = Array.isArray(canvas.chips) ? canvas.chips : [];
  const actions = Array.isArray(canvas.actions) ? canvas.actions : chips;
  if (blocks.length > 3 || chips.length > 3 || actions.length > 20) return { valid: false, error: 'Canvas exceeds the supported limits' };
  const actionIds = new Set(ACTIONS.map((action) => action.id));
  for (const block of blocks) {
    if (!block || typeof block !== 'object') return { valid: false, error: 'Canvas block is invalid' };
    const item = block as Record<string, unknown>;
    const dataView = String(item.dataView || (item.props as Record<string, unknown> | undefined)?.data_view || '');
    if (!VALID_BLOCK_TYPES.includes(item.type as (typeof VALID_BLOCK_TYPES)[number]) || !isRegisteredDataView(dataView)) {
      return { valid: false, error: 'Canvas references an unregistered block or data view' };
    }
  }
  for (const action of [...chips, ...actions]) {
    if (!action || typeof action !== 'object' || !actionIds.has(String((action as Record<string, unknown>).action || ''))) {
      return { valid: false, error: 'Canvas references an unregistered action' };
    }
  }
  return { valid: true, canvas };
}
