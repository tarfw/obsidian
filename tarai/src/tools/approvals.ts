/**
 * Approval Tools
 */
import * as v from 'valibot';
import type { ToolDefinition } from './registry.ts';
import { ApprovalRepository } from '../data/repositories/approval.ts';
import { canApproveRequest } from '../domain/policy.ts';
import type { ApprovalRecord } from '../domain/types.ts';

export const ApprovalPreviewTool: ToolDefinition<{ approvalId: string }, ApprovalRecord | null> = {
  name: 'approval.preview',
  description: 'Preview details of a pending high-risk approval request',
  riskClass: 'read',
  validateInput(input: unknown) {
    return v.parse(
      v.object({
        approvalId: v.pipe(v.string(), v.minLength(1)),
      }),
      input
    );
  },
  async run({ input, client, workspaceId }) {
    const repo = new ApprovalRepository(client);
    return repo.findById(workspaceId, input.approvalId);
  },
};

export const ApprovalDecideTool: ToolDefinition<
  { approvalId: string; decision: 'approved' | 'rejected'; reason?: string },
  { decided: boolean; status: string }
> = {
  name: 'approval.decide',
  description: 'Approve or reject a pending approval request (Owner or Authorized Role)',
  riskClass: 'reversible_write',
  validateInput(input: unknown) {
    return v.parse(
      v.object({
        approvalId: v.pipe(v.string(), v.minLength(1)),
        decision: v.picklist(['approved', 'rejected']),
        reason: v.optional(v.string()),
      }),
      input
    );
  },
  async run({ input, client, workspaceId, auth }) {
    const repo = new ApprovalRepository(client);
    const existing = await repo.findById(workspaceId, input.approvalId);
    if (!existing) {
      throw new Error(`Approval request '${input.approvalId}' not found`);
    }

    if (existing.status !== 'pending') {
      throw new Error(`Approval request is already in status '${existing.status}'`);
    }

    // Check authorization: caller must have required role level
    const authorized = canApproveRequest(auth.role, auth.workspaceId, workspaceId, existing.requiredRole);
    if (!authorized) {
      throw new Error(`Insufficient role: Actor role '${auth.role}' cannot decide an approval requiring '${existing.requiredRole}'`);
    }

    const success = await repo.decide(
      workspaceId,
      input.approvalId,
      input.decision,
      auth.userId,
      input.reason
    );

    return { decided: success, status: input.decision };
  },
};
