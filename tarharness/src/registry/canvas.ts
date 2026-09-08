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

const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, max = 160): string => typeof value === 'string' ? value.trim().slice(0, max) : '';

function configuredCards(definitions: readonly StoredDefinition[], metrics: CanvasMetrics, role: Role): CanvasCard[] {
  const cards = definitions.filter((item) => item.kind === 'kit' && item.state === 'published').flatMap((kit) => {
    const canvas = object(kit.data.canvas);
    return Array.isArray(canvas.cards) ? canvas.cards.map(object) : [];
  });
  return cards.flatMap((card, index): CanvasCard[] => {
    const id = text(card.id) || `card-${index + 1}`;
    const title = text(card.title);
    if (!title) return [];
    if (card.kind === 'data') {
      const metric = text(card.metric);
      if (metric !== 'records.count' && metric !== 'tasks.open') return [];
      return [{ id, kind: 'data', title, display: card.display === 'chart' || card.display === 'report' ? card.display : 'value', value: metric === 'tasks.open' ? metrics.openTasks : metrics.records, caption: text(card.caption) || undefined }];
    }
    if (card.kind === 'action') {
      const actionId = text(card.actionId); const action = findAction(actionId);
      if (!action || !action.roles.includes(role)) return [];
      return [{ id, kind: 'action', title, description: text(card.description) || action.description, actionId, initialInput: object(card.initialInput) }];
    }
    if (card.kind === 'flow') {
      const flowId = text(card.flowId);
      const flow = definitions.find((item) => item.id === flowId && item.kind === 'flow' && item.state === 'published');
      if (!flow) return [];
      if (flow.data.botId === 'pos') {
        if (role === 'guest') return [];
        const section = String(flow.data.templateId);
        return [{ id, kind: 'flow', title: section === 'sell' ? 'New sale' : title, description: text(card.description), flowId, actionId: 'pos.open', initialInput: { section } }];
      }
      return [{ id, kind: 'flow', title, description: text(card.description) || 'Start or continue this process.', flowId }];
    }
    return [];
  });
}

export function buildWorkspaceCanvas(definitions: readonly StoredDefinition[], metrics: CanvasMetrics, role: Role): CanvasCard[] {
  const configured = configuredCards(definitions, metrics, role);
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
  if (configured.length) { cards.push(...configured); return cards; }
  cards.push(...allowed.filter((action) => action.id === 'record.create' || action.id === 'task.create').map((action): CanvasCard => ({ id: `action-${action.id}`, kind: 'action', title: action.title, description: action.description, actionId: action.id })));
  const flows = definitions.filter((item) => item.kind === 'flow' && item.state === 'published');
  cards.push(...flows.map((flow): CanvasCard => ({ id: `flow-${flow.id}`, kind: 'flow', title: flow.name, description: text(flow.data.description) || 'Start or continue this process.', flowId: flow.id })));
  return cards;
}
