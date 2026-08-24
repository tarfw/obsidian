/**
 * Tier 1: Tar Router Module
 * Identity: request_id + user_id + scope
 * Mission: Intent resolution, routing, approvals, owner help, safe reads, drafts, and internal summaries.
 */
import type { Client } from '@libsql/client';
import type { AuthContext } from '../domain/types.ts';
import { ToolRegistry, type ToolExecutionResult } from '../tools/registry.ts';
import { TasksListTool, TaskCreateTool, TaskUpdateTool, TaskArchiveTool } from '../tools/tasks.ts';
import { MetricsGetTool } from '../tools/metrics.ts';
import { InventoryListTool, InventoryCorrectTool } from '../tools/inventory.ts';
import { ApprovalPreviewTool, ApprovalDecideTool } from '../tools/approvals.ts';
import { PosSessionTool, PosCheckoutTool } from '../tools/pos.ts';

export interface RouterRequest {
  requestId: string;
  scope: 'workspace' | 'personal' | 'customer';
  intent: string;
  parameters?: Record<string, unknown>;
}

export interface RouterResponse {
  requestId: string;
  intent: string;
  routedTool?: string;
  result: ToolExecutionResult;
  cardPreview?: {
    type: string;
    title: string;
    summary: string;
  };
}

export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(TasksListTool);
  registry.register(TaskCreateTool);
  registry.register(TaskUpdateTool);
  registry.register(TaskArchiveTool);
  registry.register(MetricsGetTool);
  registry.register(InventoryListTool);
  registry.register(InventoryCorrectTool);
  registry.register(ApprovalPreviewTool);
  registry.register(ApprovalDecideTool);
  registry.register(PosSessionTool);
  registry.register(PosCheckoutTool);
  return registry;
}

export class TarRouter {
  private registry: ToolRegistry;

  constructor(registry?: ToolRegistry) {
    this.registry = registry || createDefaultToolRegistry();
  }

  /**
   * Deterministic intent resolution mapping user intent string to typed tool
   */
  resolveIntentToTool(intent: string): { toolName: string; defaultParams: Record<string, unknown> } | null {
    const normalized = intent.toLowerCase().trim();

    if (normalized.includes('metric') || normalized.includes('pulse') || normalized.includes('revenue') || normalized.includes('overview')) {
      return { toolName: 'metrics.get', defaultParams: {} };
    }
    if (normalized.includes('list task') || normalized.includes('show task') || normalized.includes('open task') || normalized === 'tasks') {
      return { toolName: 'tasks.list', defaultParams: {} };
    }
    if (normalized.includes('stock') || normalized.includes('inventory') || normalized.includes('product')) {
      return { toolName: 'inventory.list', defaultParams: { lowStockOnly: normalized.includes('low') } };
    }
    if (normalized.includes('approval') || normalized.includes('pending')) {
      return { toolName: 'approval.preview', defaultParams: {} };
    }

    return null;
  }

  async handleRequest(
    req: RouterRequest,
    auth: AuthContext,
    client: Client
  ): Promise<RouterResponse> {
    let toolName = (req.parameters?.toolName as string) || '';
    let toolInput = (req.parameters?.toolInput as Record<string, unknown>) || {};

    if (!toolName) {
      const resolved = this.resolveIntentToTool(req.intent);
      if (resolved) {
        toolName = resolved.toolName;
        toolInput = { ...resolved.defaultParams, ...toolInput };
      }
    }

    if (!toolName) {
      return {
        requestId: req.requestId,
        intent: req.intent,
        result: {
          success: false,
          status: 'rejected',
          error: `Could not resolve intent '${req.intent}' to a registered tool`,
        },
      };
    }

    const executionResult = await this.registry.execute(
      toolName,
      toolInput,
      auth,
      auth.workspaceId,
      client
    );

    let cardPreview: RouterResponse['cardPreview'];
    if (executionResult.status === 'staged_for_approval') {
      cardPreview = {
        type: 'action-confirm',
        title: 'Action Requires Approval',
        summary: `Action '${toolName}' staged under approval ID ${executionResult.approvalId}`,
      };
    } else if (executionResult.status === 'executed' || executionResult.status === 'replayed_from_cache') {
      cardPreview = {
        type: 'metric-card',
        title: `Result: ${toolName}`,
        summary: 'Action completed safely and audited in motion ledger',
      };
    }

    return {
      requestId: req.requestId,
      intent: req.intent,
      routedTool: toolName,
      result: executionResult,
      cardPreview,
    };
  }
}
