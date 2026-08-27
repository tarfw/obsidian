import type { Role } from '../domain/types.ts';
import type { TenantRepository } from '../data/repositories/tenant.ts';

export const REGISTERED_DATA_VIEWS = [
  'tasks.list', 'tasks.urgent', 'metrics.get', 'sales.today', 'inventory.list', 'inventory.low',
  'contacts.get', 'contacts.recent', 'pipeline.list', 'pipeline.active', 'orders.upcoming',
  'bookings.upcoming', 'pos.session', 'approval.preview',
] as const;

export type RegisteredDataView = (typeof REGISTERED_DATA_VIEWS)[number];

export interface DataViewDefinition {
  id: RegisteredDataView;
  roles: Role[];
  maximumRows: number;
  offlineProjection: boolean;
}

const ALL_MEMBERS: Role[] = ['owner', 'admin', 'member'];
const MANAGERS: Role[] = ['owner', 'admin'];

export const DATA_VIEW_REGISTRY: Record<RegisteredDataView, DataViewDefinition> = Object.fromEntries(
  REGISTERED_DATA_VIEWS.map((id) => [id, {
    id,
    roles: id === 'sales.today' || id === 'metrics.get' || id === 'approval.preview' ? MANAGERS : ALL_MEMBERS,
    maximumRows: id.endsWith('.today') || id === 'metrics.get' ? 1 : 20,
    offlineProjection: !['metrics.get', 'sales.today', 'approval.preview'].includes(id),
  }]),
) as Record<RegisteredDataView, DataViewDefinition>;

export function isRegisteredDataView(viewName: string): viewName is RegisteredDataView {
  return (REGISTERED_DATA_VIEWS as readonly string[]).includes(viewName);
}

function publicRow(row: any) {
  return {
    id: row.id,
    type: row.typeName || row.type,
    title: row.title || row.data?.title || row.data?.name || 'Untitled',
    status: row.status || row.data?.status || row.state,
    value: row.value ?? row.data?.value,
    due: row.due ?? row.data?.due ?? row.data?.due_date,
    version: row.version,
    updated: row.updated,
  };
}

function isOpen(row: any): boolean {
  const status = String(row.status || row.data?.status || row.state || '').toLowerCase();
  return !['done', 'completed', 'cancelled', 'archived', 'deleted', '3', '4'].includes(status);
}

export async function runDataView(repository: TenantRepository, view: RegisteredDataView, requestedLimit = 20): Promise<{ rows: Record<string, unknown>[]; generatedAt: number }> {
  const definition = DATA_VIEW_REGISTRY[view];
  const limit = Math.min(Math.max(Math.trunc(requestedLimit) || 20, 1), definition.maximumRows);
  let rows: any[] = [];
  if (view.startsWith('tasks.')) rows = await repository.list('matter', { type: 'task', limit: Math.max(limit, 50) });
  else if (view.startsWith('inventory.') || view === 'pos.session') rows = await repository.list('matter', { type: 'product', limit: Math.max(limit, 50) });
  else if (view.startsWith('contacts.')) rows = await repository.list('matter', { type: 'customer', limit });
  else if (view.startsWith('orders.') || view === 'sales.today') rows = await repository.list('matter', { type: 'order', limit: Math.max(limit, 100) });
  else if (view.startsWith('bookings.')) rows = await repository.list('matter', { type: 'booking', limit });
  else if (view.startsWith('pipeline.')) rows = await repository.list('matter', { type: 'flow', limit });
  else if (view === 'approval.preview') rows = await repository.list('approval', { status: 1, limit });
  else if (view === 'metrics.get') {
    const [tasks, products, orders] = await Promise.all([
      repository.list('matter', { type: 'task', limit: 200 }),
      repository.list('matter', { type: 'product', limit: 200 }),
      repository.list('matter', { type: 'order', limit: 200 }),
    ]);
    return { rows: [{ openTasks: tasks.filter(isOpen).length, lowStock: products.filter((row: any) => Number(row.data?.stockLevel ?? row.value ?? 0) <= Number(row.data?.lowStockThreshold ?? row.data?.min ?? 0)).length, orders: orders.length }], generatedAt: Date.now() };
  }

  if (view === 'tasks.urgent') rows = rows.filter(isOpen);
  if (view === 'inventory.low') rows = rows.filter((row: any) => Number(row.data?.stockLevel ?? row.value ?? 0) <= Number(row.data?.lowStockThreshold ?? row.data?.min ?? 0));
  if (view === 'sales.today') {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const today = rows.filter((row: any) => Number(row.created || row.created_at || 0) >= start.getTime());
    const total = today.reduce((sum: number, row: any) => sum + Number(row.value ?? row.data?.total ?? row.data?.amount ?? 0), 0);
    return { rows: [{ total, count: today.length, currency: today[0]?.data?.currency || 'INR' }], generatedAt: Date.now() };
  }
  return { rows: rows.slice(0, limit).map(publicRow), generatedAt: Date.now() };
}
