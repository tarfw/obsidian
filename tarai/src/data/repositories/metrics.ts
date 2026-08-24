/**
 * Metrics Repository - Deterministic Application Code Metrics
 * Rule: Truth before prose. Metrics are calculated by application code, never by the model.
 */
import type { Client } from '@libsql/client';
import { executeQuery } from '../turso.ts';

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
    // 1. Calculate revenue and order counts from invoice matter
    const invoices = await executeQuery<{ data: string }>(
      this.client,
      `SELECT data FROM matter WHERE workspace_id = ? AND type = 'invoice'`,
      [workspaceId]
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
      } catch {
        // Ignore unparseable
      }
    }

    // 2. Count low stock products
    const products = await executeQuery<{ data: string }>(
      this.client,
      `SELECT data FROM matter WHERE workspace_id = ? AND type = 'product'`,
      [workspaceId]
    );

    let lowStockItemsCount = 0;
    for (const row of products) {
      try {
        const prod = JSON.parse(row.data);
        if (prod.stockLevel <= prod.lowStockThreshold) {
          lowStockItemsCount += 1;
        }
      } catch {
        // Ignore unparseable
      }
    }

    // 3. Count open tasks
    const taskRows = await executeQuery<{ count: number }>(
      this.client,
      `SELECT COUNT(*) as count FROM matter
       WHERE workspace_id = ? AND type = 'task'
         AND json_extract(data, '$.status') IN ('todo', 'in_progress')`,
      [workspaceId]
    );
    const openTasksCount = taskRows[0]?.count || 0;

    // 4. Count pending approvals
    const approvalRows = await executeQuery<{ count: number }>(
      this.client,
      `SELECT COUNT(*) as count FROM approvals WHERE workspace_id = ? AND status = 'pending'`,
      [workspaceId]
    );
    const pendingApprovalsCount = approvalRows[0]?.count || 0;

    return {
      totalRevenueCents,
      totalOrders,
      lowStockItemsCount,
      openTasksCount,
      pendingApprovalsCount,
    };
  }
}
