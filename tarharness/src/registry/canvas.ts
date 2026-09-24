import { actionCatalog, findAction } from './catalog.ts';
import type { Role } from '../types.ts';

export type CanvasCard =
  | { readonly id: string; readonly kind: 'data'; readonly title: string; readonly display: 'value' | 'report' | 'chart'; readonly value: number | string; readonly caption?: string }
  | { readonly id: string; readonly kind: 'action'; readonly title: string; readonly description: string; readonly actionId: string; readonly initialInput?: Record<string, unknown> }
  | { readonly id: string; readonly kind: 'flow'; readonly title: string; readonly description: string; readonly flowId: string; readonly actionId?: string; readonly initialInput?: Record<string, unknown> };

interface CanvasMetrics {
  records: number;
  openTasks: number;
  pos?: { sales: number; orders: number; lowStock: number; currency: string; businessDate: string };
}

interface StoredDefinition {
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly state: string;
  readonly data: Record<string, unknown>;
}

const text = (value: unknown, max = 160): string => typeof value === 'string' ? value.trim().slice(0, max) : '';

export function buildWorkspaceCanvas(definitions: readonly StoredDefinition[], metrics: CanvasMetrics, role: Role): CanvasCard[] {
  const allowed = actionCatalog.filter((action) => (action.roles as readonly Role[]).includes(role));
  const cards: CanvasCard[] = [
    { id: 'records-total', kind: 'data', title: 'Records', display: 'value', value: metrics.records, caption: 'Information in this workspace' },
    { id: 'tasks-open', kind: 'data', title: 'Open work', display: 'value', value: metrics.openTasks, caption: 'Needs attention' },
  ];
  if (metrics.pos && role !== 'guest') {
    cards.splice(0, 2,
      { id: 'pos-sales', kind: 'data', title: 'Sales today', display: 'value', value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: metrics.pos.currency }).format(metrics.pos.sales / 100), caption: 'Net of returns' },
      { id: 'pos-orders', kind: 'data', title: 'Orders today', display: 'value', value: metrics.pos.orders },
      { id: 'pos-low-stock', kind: 'data', title: 'Low stock', display: 'value', value: metrics.pos.lowStock },
    );
  }
  cards.push(...allowed.filter((action) => action.id === 'record.create' || action.id === 'task.create' || action.id === 'pos.open').map((action): CanvasCard => ({
    id: `action-${action.id}`, kind: 'action', title: action.title, description: action.description, actionId: action.id,
    ...(action.id === 'pos.open' ? { initialInput: { section: 'sell' } } : {}),
  })));
  const flows = definitions.filter((item) => item.kind === 'flow' && item.state === 'published');
  cards.push(...flows.map((flow): CanvasCard => ({ id: `flow-${flow.id}`, kind: 'flow', title: flow.name, description: text(flow.data.description) || 'Start or continue this process.', flowId: flow.id })));
  return cards;
}
