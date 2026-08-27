/**
 * Authoritative Workspace Canvas System (matter.md §9, §10)
 *
 * Workspace Canvas = Selector + Blocks + Action Chips + Action Search
 * Block            = Card(1..3 registered components + typed data views)
 * Visible UI       = Canvas rules AND membership capabilities AND data policy
 * Rendered Canvas  = canvas.md + member manifest + local projections + registry
 * Action           = typed request -> Tarai authorize -> transact -> Motion
 *
 * V1 limits:
 * - 1 canvas per workspace
 * - Primary blocks visible <= 3 above the fold, <= 6 total
 * - Components per block = 1..3
 * - Pinned action chips <= 3
 * - Canvas payload <= 64 KiB
 */

export interface CanvasComponentDef {
  type: string;
  data_view?: string;
  props?: Record<string, any>;
}

export interface CanvasBlock {
  id: string;
  title?: string;
  roles?: string[];
  components: CanvasComponentDef[];
}

export interface CanvasAction {
  id: string;
  label: string;
  roles?: string[];
  screen: string; // Registered ephemeral screen name (e.g. stock-adjust, pos-sale, contact-add, deal-pipeline)
  searchable?: boolean;
  icon?: string;
  params?: Array<{ name: string; type: string; required?: boolean; default?: any }>;
}

export interface CanvasChip {
  action: string;
  label?: string;
  roles?: string[];
  icon?: string;
}

export interface CanvasDocument {
  schema: number;
  version: number;
  min_app_version?: string;
  workspace_id?: string;
  title?: string;
  blocks: CanvasBlock[];
  actions: CanvasAction[];
  chips: CanvasChip[];
}

const MAX_PRIMARY_BLOCKS = 3;
const MAX_TOTAL_BLOCKS = 6;
const MAX_COMPONENTS_PER_BLOCK = 3;
const MAX_PINNED_CHIPS = 3;
const MAX_CANVAS_BYTES = 64 * 1024;

/**
 * Standard default Canvas for new workspaces / fallback when canvas.md is not yet drafted.
 */
export function getDefaultCanvasDoc(workspaceId: string = 'ws_default'): CanvasDocument {
  return {
    schema: 1,
    version: 1,
    min_app_version: '1.0.0',
    workspace_id: workspaceId,
    title: 'Workspace Operations',
    blocks: [
      {
        id: 'daily-operations',
        title: 'Daily Operations',
        roles: ['owner', 'manager', 'admin'],
        components: [
          { type: 'metric-card', data_view: 'sales.today', props: { title: "Today's Revenue", unit: 'Live' } },
          { type: 'task-inbox', data_view: 'tasks.assigned', props: { title: 'Action Inbox' } },
        ],
      },
      {
        id: 'inventory-stock',
        title: 'Stock & Floor',
        roles: ['owner', 'manager', 'stockkeeper', 'staff', 'admin'],
        components: [
          { type: 'stock-sheet', data_view: 'inventory.low', props: { title: 'Low Stock Alerts' } },
        ],
      },
      {
        id: 'sales-pos',
        title: 'POS Floor',
        roles: ['owner', 'manager', 'cashier', 'staff', 'admin'],
        components: [
          { type: 'quick-pos', data_view: 'pos.catalog', props: { title: 'Quick Register' } },
        ],
      },
    ],
    actions: [
      {
        id: 'sale.create',
        label: 'New Sale / Billing',
        roles: ['owner', 'manager', 'cashier', 'staff', 'admin'],
        screen: 'pos-sale',
        searchable: true,
        icon: 'receipt-outline',
      },
      {
        id: 'inventory.adjust',
        label: 'Adjust Stock',
        roles: ['owner', 'manager', 'stockkeeper', 'admin'],
        screen: 'stock-adjust',
        searchable: true,
        icon: 'cube-outline',
      },
      {
        id: 'contact.create',
        label: 'Add Contact',
        roles: ['owner', 'manager', 'staff', 'admin', 'member'],
        screen: 'contact-add',
        searchable: true,
        icon: 'person-add-outline',
      },
      {
        id: 'deal.create',
        label: 'Start Pipeline Deal',
        roles: ['owner', 'manager', 'admin'],
        screen: 'deal-pipeline',
        searchable: true,
        icon: 'git-network-outline',
      },
      {
        id: 'task.create',
        label: 'Assign Task / Signal',
        roles: ['owner', 'manager', 'admin', 'staff', 'member'],
        screen: 'task-create',
        searchable: true,
        icon: 'checkbox-outline',
      },
    ],
    chips: [
      { action: 'sale.create', label: 'New Sale', roles: ['owner', 'manager', 'cashier', 'staff', 'admin'] },
      { action: 'inventory.adjust', label: 'Adjust Stock', roles: ['owner', 'manager', 'stockkeeper', 'admin'] },
      { action: 'contact.create', label: 'Add Contact', roles: ['owner', 'manager', 'staff', 'admin', 'member'] },
    ],
  };
}

/**
 * Parses canvas.md declarative workspace markdown definition.
 */
export function parseCanvasMarkdown(content: string, workspaceId: string = 'ws_default'): CanvasDocument {
  if (!content || typeof content !== 'string') {
    return getDefaultCanvasDoc(workspaceId);
  }

  // Reject oversized payloads (V1 limit <= 64 KiB)
  if (content.length > MAX_CANVAS_BYTES) {
    console.warn('[Canvas] Payload exceeds 64 KiB limit. Truncating.');
    content = content.slice(0, MAX_CANVAS_BYTES);
  }

  const parts = content.split('---');
  const yamlText = parts.length >= 3 ? parts[1] : (parts.length === 2 ? parts[1] : parts[0]);

  try {
    const lines = yamlText.split('\n');
    let schema = 1;
    let version = 1;
    let title = 'Workspace Canvas';

    const blocks: CanvasBlock[] = [];
    const actions: CanvasAction[] = [];
    const chips: CanvasChip[] = [];

    let currentSection: 'blocks' | 'actions' | 'chips' | null = null;
    let currentBlock: CanvasBlock | null = null;
    let currentComponent: CanvasComponentDef | null = null;
    let currentAction: CanvasAction | null = null;
    let currentChip: CanvasChip | null = null;

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = rawLine.search(/\S/);

      if (indent === 0) {
        if (trimmed.startsWith('schema:')) schema = parseInt(trimmed.replace('schema:', '').trim()) || 1;
        else if (trimmed.startsWith('version:')) version = parseInt(trimmed.replace('version:', '').trim()) || 1;
        else if (trimmed.startsWith('title:')) title = trimmed.replace('title:', '').trim().replace(/^['"]|['"]$/g, '');
        else if (trimmed.startsWith('blocks:')) {
          currentSection = 'blocks';
          continue;
        } else if (trimmed.startsWith('actions:')) {
          currentSection = 'actions';
          continue;
        } else if (trimmed.startsWith('chips:')) {
          currentSection = 'chips';
          continue;
        }
      }

      if (currentSection === 'blocks') {
        if (trimmed.startsWith('- id:')) {
          if (currentBlock) blocks.push(currentBlock);
          const blockId = trimmed.replace('- id:', '').trim().replace(/^['"]|['"]$/g, '');
          currentBlock = { id: blockId, title: blockId, roles: [], components: [] };
          currentComponent = null;
        } else if (currentBlock) {
          if (trimmed.startsWith('title:')) {
            currentBlock.title = trimmed.replace('title:', '').trim().replace(/^['"]|['"]$/g, '');
          } else if (trimmed.startsWith('roles:')) {
            const m = trimmed.match(/roles\s*:\s*\[(.*)\]/);
            if (m) currentBlock.roles = m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
          } else if (trimmed.startsWith('- type:') || trimmed.startsWith('components:')) {
            if (trimmed.startsWith('- type:')) {
              const compType = trimmed.replace('- type:', '').trim().replace(/^['"]|['"]$/g, '');
              currentComponent = { type: compType, props: {} };
              if (currentBlock.components.length < MAX_COMPONENTS_PER_BLOCK) {
                currentBlock.components.push(currentComponent);
              }
            }
          } else if (currentComponent && trimmed.startsWith('data_view:')) {
            currentComponent.data_view = trimmed.replace('data_view:', '').trim().replace(/^['"]|['"]$/g, '');
          } else if (currentComponent && trimmed.startsWith('type:')) {
            currentComponent.type = trimmed.replace('type:', '').trim().replace(/^['"]|['"]$/g, '');
          }
        }
      } else if (currentSection === 'actions') {
        if (trimmed.startsWith('- id:')) {
          if (currentAction) actions.push(currentAction);
          const actId = trimmed.replace('- id:', '').trim().replace(/^['"]|['"]$/g, '');
          currentAction = { id: actId, label: actId, screen: 'stock-adjust', roles: [], searchable: true };
        } else if (currentAction) {
          if (trimmed.startsWith('label:')) {
            currentAction.label = trimmed.replace('label:', '').trim().replace(/^['"]|['"]$/g, '');
          } else if (trimmed.startsWith('screen:')) {
            currentAction.screen = trimmed.replace('screen:', '').trim().replace(/^['"]|['"]$/g, '');
          } else if (trimmed.startsWith('icon:')) {
            currentAction.icon = trimmed.replace('icon:', '').trim().replace(/^['"]|['"]$/g, '');
          } else if (trimmed.startsWith('searchable:')) {
            currentAction.searchable = trimmed.replace('searchable:', '').trim() !== 'false';
          } else if (trimmed.startsWith('roles:')) {
            const m = trimmed.match(/roles\s*:\s*\[(.*)\]/);
            if (m) currentAction.roles = m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
          }
        }
      } else if (currentSection === 'chips') {
        if (trimmed.startsWith('- action:')) {
          if (currentChip && chips.length < MAX_PINNED_CHIPS) chips.push(currentChip);
          const act = trimmed.replace('- action:', '').trim().replace(/^['"]|['"]$/g, '');
          currentChip = { action: act, label: act, roles: [] };
        } else if (currentChip) {
          if (trimmed.startsWith('label:')) {
            currentChip.label = trimmed.replace('label:', '').trim().replace(/^['"]|['"]$/g, '');
          } else if (trimmed.startsWith('roles:')) {
            const m = trimmed.match(/roles\s*:\s*\[(.*)\]/);
            if (m) currentChip.roles = m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
          }
        }
      }
    }

    if (currentBlock) blocks.push(currentBlock);
    if (currentAction) actions.push(currentAction);
    if (currentChip && chips.length < MAX_PINNED_CHIPS) chips.push(currentChip);

    const defaultDoc = getDefaultCanvasDoc(workspaceId);
    return {
      schema,
      version,
      workspace_id: workspaceId,
      title: title || defaultDoc.title,
      blocks: blocks.length > 0 ? blocks.slice(0, MAX_TOTAL_BLOCKS) : defaultDoc.blocks,
      actions: actions.length > 0 ? actions : defaultDoc.actions,
      chips: chips.length > 0 ? chips.slice(0, MAX_PINNED_CHIPS) : defaultDoc.chips,
    };
  } catch (err) {
    console.warn('[Canvas] Parse failed:', err);
    return getDefaultCanvasDoc(workspaceId);
  }
}

/**
 * Filter canvas blocks and actions for a member's role (matter.md §9: Role-based filtering).
 */
export function resolveRoleCanvas(
  doc: CanvasDocument,
  userRole: string = 'owner'
): {
  visibleBlocks: CanvasBlock[];
  visibleChips: CanvasChip[];
  searchableActions: CanvasAction[];
} {
  const role = userRole.toLowerCase();
  const isOwnerOrAdmin = role === 'owner' || role === 'admin';

  // 1. Filter blocks by role
  const visibleBlocks = doc.blocks.filter((b) => {
    if (isOwnerOrAdmin) return true;
    if (!b.roles || b.roles.length === 0) return true;
    return b.roles.map((r) => r.toLowerCase()).includes(role);
  });

  // 2. Filter actions by role
  const searchableActions = doc.actions.filter((a) => {
    if (isOwnerOrAdmin) return true;
    if (!a.roles || a.roles.length === 0) return true;
    return a.roles.map((r) => r.toLowerCase()).includes(role);
  });

  // 3. Filter chips by role
  const visibleChips = doc.chips.filter((c) => {
    if (isOwnerOrAdmin) return true;
    if (!c.roles || c.roles.length === 0) return true;
    return c.roles.map((r) => r.toLowerCase()).includes(role);
  }).slice(0, MAX_PINNED_CHIPS);

  return {
    visibleBlocks: visibleBlocks.slice(0, MAX_TOTAL_BLOCKS),
    visibleChips,
    searchableActions,
  };
}
