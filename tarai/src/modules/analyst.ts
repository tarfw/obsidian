/**
 * Tier 2: Analyst Module
 * Identity: job_id + scope
 * Mission: Deterministic metrics reporting, anomaly detection, and operational performance summaries.
 */
import type { Client } from '@libsql/client';
import { MetricsRepository, type WorkspaceMetrics } from '../data/repositories/metrics.ts';

export interface AnalystReport {
  timestamp: string;
  metrics: WorkspaceMetrics;
  anomalies: string[];
  recommendations: string[];
}

export class AnalystModule {
  constructor(private client: Client) {}

  async generateReport(workspaceId: string): Promise<AnalystReport> {
    const metricsRepo = new MetricsRepository(this.client);
    const metrics = await metricsRepo.getWorkspaceMetrics(workspaceId);

    const anomalies: string[] = [];
    const recommendations: string[] = [];

    if (metrics.lowStockItemsCount > 0) {
      anomalies.push(`${metrics.lowStockItemsCount} items are at or below safety stock threshold`);
      recommendations.push('Review inventory list and create purchase orders for low stock items');
    }

    if (metrics.pendingApprovalsCount > 3) {
      anomalies.push(`${metrics.pendingApprovalsCount} pending approvals awaiting decision`);
      recommendations.push('Prompt workspace owner or admin to review pending approval inbox');
    }

    if (metrics.openTasksCount > 20) {
      anomalies.push(`High backlog: ${metrics.openTasksCount} open tasks in workspace`);
      recommendations.push('Consider reallocating tasks among active team members');
    }

    if (anomalies.length === 0) {
      recommendations.push('Workspace running with optimal velocity and nominal stock levels');
    }

    return {
      timestamp: new Date().toISOString(),
      metrics,
      anomalies,
      recommendations,
    };
  }
}
