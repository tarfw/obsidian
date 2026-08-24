/**
 * Metrics Tools
 */
import * as v from 'valibot';
import type { ToolDefinition } from './registry.ts';
import { MetricsRepository, type WorkspaceMetrics } from '../data/repositories/metrics.ts';

export const MetricsGetTool: ToolDefinition<Record<string, never>, WorkspaceMetrics> = {
  name: 'metrics.get',
  description: 'Retrieve deterministic workspace operational and financial metrics',
  riskClass: 'read',
  validateInput(input: unknown) {
    return v.parse(v.object({}), input || {});
  },
  async run({ client, workspaceId }) {
    const repo = new MetricsRepository(client);
    return repo.getWorkspaceMetrics(workspaceId);
  },
};
