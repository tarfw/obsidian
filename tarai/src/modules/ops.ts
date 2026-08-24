/**
 * Tier 2: Operations Module
 * Identity: job_id + scope
 * Mission: Stock monitoring, booking alarms, and chore execution.
 */
import type { Client } from '@libsql/client';
import { MatterRepository } from '../data/repositories/matter.ts';
import type { ProductMatter } from '../domain/types.ts';

export interface OpsReport {
  timestamp: string;
  lowStockAlerts: Array<{ sku: string; name: string; currentStock: number; threshold: number }>;
  pendingBookingsCount: number;
  status: 'healthy' | 'action_required';
}

export class OpsModule {
  constructor(private client: Client) {}

  async runHealthCheck(workspaceId: string): Promise<OpsReport> {
    const repo = new MatterRepository(this.client);

    // 1. Stock check
    const products = await repo.listByType(workspaceId, 'product');
    const lowStockAlerts: OpsReport['lowStockAlerts'] = [];

    for (const p of products) {
      const prod = p.data as ProductMatter;
      if (prod.stockLevel <= prod.lowStockThreshold) {
        lowStockAlerts.push({
          sku: prod.sku,
          name: prod.name,
          currentStock: prod.stockLevel,
          threshold: prod.lowStockThreshold,
        });
      }
    }

    // 2. Pending bookings check
    const bookings = await repo.listByType(workspaceId, 'booking');
    const pendingBookingsCount = bookings.filter((b) => b.data.status === 'pending_payment').length;

    const status: OpsReport['status'] = lowStockAlerts.length > 0 ? 'action_required' : 'healthy';

    return {
      timestamp: new Date().toISOString(),
      lowStockAlerts,
      pendingBookingsCount,
      status,
    };
  }
}
