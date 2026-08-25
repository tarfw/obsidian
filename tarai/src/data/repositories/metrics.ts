/**
 * Metrics Repository - Deterministic Application Code Metrics (matter.md §5)
 * Rule: Truth before prose. Metrics are calculated by application code, never by the model.
 */
import type { Client } from '@libsql/client';
import { executeQuery } from '../turso.ts';
import { toMatterTypeCode } from '../../domain/types.ts';

export interface WorkspaceMetrics {
  totalRevenueCents: number;
  totalOrders: number;
  lowStockItemsCount: number;
  openTasksCount: number;
  pendingApprovalsCount: number;
}

export class MetricsRepository {
  constructor(private client: Client) {}

  async getWorkspaceMetrics(workspaceId: string): Promise<WorkspaceMetrics> {
    const invoiceTypeCode = toMatterTypeCode('invoice');
    const invoices = await executeQuery<{ data: string }>(
      this.client,
      `SELECT data FROM matter WHERE type = ? AND deleted_at IS NULL`,
      [invoiceTypeCode]
    );

    let totalRevenueCents = 0;
    let totalOrders = 0;

    for (const row of invoices) {
      try {
        const inv = JSON.parse(row.data);
        if (inv.status === 'paid' || inv.status === 'issued') {
          totalRevenueCents += inv.totalCents || 0;
          totalOrders += 1;
        }
      } catch {}
    }

    const productTypeCode = toMatterTypeCode('product');
    const products = await executeQuery<{ data: string }>(
      this.client,
      `SELECT data FROM matter WHERE type = ? AND deleted_at IS NULL`,
      [productTypeCode]
    );

    let lowStockItemsCount = 0;
    for (const row of products) {
      try {
        const prod = JSON.parse(row.data);
        if (prod.stockLevel <= prod.lowStockThreshold) {
          lowStockItemsCount += 1;
        }
      } catch {}
    }

    const taskTypeCode = toMatterTypeCode('task');
    const tasks = await executeQuery<{ data: string }>(
      this.client,
      `SELECT data FROM matter WHERE type = ? AND deleted_at IS NULL`,
      [taskTypeCode]
    );

    let openTasksCount = 0;
    for (const row of tasks) {
      try {
        const t = JSON.parse(row.data);
        if (t.status === 'todo' || t.status === 'in_progress') {
          openTasksCount += 1;
        }
      } catch {}
    }

    const approvals = await executeQuery<{ id: string }>(
      this.client,
      `SELECT id FROM approval WHERE status = 1 AND deleted_at IS NULL`
    );

    return {
      totalRevenueCents,
      totalOrders,
      lowStockItemsCount,
      openTasksCount,
      pendingApprovalsCount: approvals.length,
    };
  }
}
