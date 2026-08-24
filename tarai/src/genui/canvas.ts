/**
 * GenUI Canvas Parser & Validator
 * Rule: TarApp shows at most three timely cards; deeper work opens a temporary sheet. No SQL or generated HTML/JS.
 */
import * as v from 'valibot';
import type { CanvasAST, NativeBlockConfig } from '../domain/types.ts';
import { NativeBlockSchema, VALID_BLOCK_TYPES } from './blocks.ts';
import { isRegisteredDataView } from './views.ts';

export const CanvasSchema = v.object({
  version: v.string(),
  glanceBar: v.object({
    mode: v.string(),
    notice: v.string(),
  }),
  liveActionStream: v.pipe(
    v.array(NativeBlockSchema),
    v.maxLength(3, 'Live action stream must contain at most 3 cards')
  ),
  actionDock: v.object({
    chips: v.array(v.string()),
    intentEnabled: v.boolean(),
  }),
});

export function validateCanvas(raw: unknown): { valid: boolean; ast?: CanvasAST; error?: string } {
  // Check for arbitrary SQL or script injection attempts
  const rawString = JSON.stringify(raw);
  const sqlInjectionPattern = /(SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+.+\s+SET|DELETE\s+FROM|<script|<\/script>)/i;
  if (sqlInjectionPattern.test(rawString)) {
    return {
      valid: false,
      error: 'Security rejection: Canvas declaration cannot contain SQL statements or script tags',
    };
  }

  try {
    const ast = v.parse(CanvasSchema, raw) as CanvasAST;

    // Verify all dataSources are registered
    for (const card of ast.liveActionStream) {
      if (!isRegisteredDataView(card.dataSource)) {
        return {
          valid: false,
          error: `Invalid data source '${card.dataSource}' in block '${card.title}'. Must be a registered data view.`,
        };
      }
    }

    return { valid: true, ast };
  } catch (err: unknown) {
    return {
      valid: false,
      error: (err as Error).message || 'Invalid canvas schema',
    };
  }
}

/**
 * Creates default initial canvas for a workspace role
 */
export function createDefaultCanvas(role: string): CanvasAST {
  const cards: NativeBlockConfig[] = [
    {
      id: 'block-task-inbox',
      type: 'task-inbox',
      title: 'Action Inbox',
      dataSource: 'tasks.list',
      filters: { status: 'todo' },
      roleVisibility: ['owner', 'admin', 'member'],
    },
    {
      id: 'block-metric-overview',
      type: 'metric-card',
      title: 'Workspace Pulse',
      dataSource: 'metrics.get',
      roleVisibility: ['owner', 'admin'],
    },
    {
      id: 'block-stock-alerts',
      type: 'stock-sheet',
      title: 'Inventory Alerts',
      dataSource: 'inventory.list',
      filters: { threshold: 'low' },
      roleVisibility: ['owner', 'admin', 'member'],
    },
  ];

  return {
    version: '1.0.0',
    glanceBar: {
      mode: role === 'owner' ? 'Owner Overview' : 'Workspace Station',
      notice: 'All operations running nominally',
    },
    liveActionStream: cards.slice(0, 3), // Strictly capped at 3
    actionDock: {
      chips: ['New Task', 'Check Stock', 'View Metrics'],
      intentEnabled: true,
    },
  };
}
