/**
 * TARAI Tool Registry & Governance Engine
 * Rule: AI proposes; code authorizes. Every tool enforces workspace, role, schema, budget, idempotency, and approval policy.
 */
import type { Client } from '@libsql/client';
import type { AuthContext, RiskClass, Role } from '../domain/types.ts';
import { evaluateToolPolicy } from '../domain/policy.ts';
import { generateIdempotencyKey, hashPayload } from '../domain/idempotency.ts';
import { MotionRepository } from '../data/repositories/motion.ts';
import { ApprovalRepository } from '../data/repositories/approval.ts';

export interface ToolDefinition<TInput = Record<string, unknown>, TOutput = unknown> {
  name: string;
  description: string;
  riskClass: RiskClass;
  validateInput(input: unknown): TInput;
  run(ctx: ToolExecutionContext<TInput>): Promise<TOutput>;
}

export interface ToolExecutionContext<TInput> {
  input: TInput;
  auth: AuthContext;
  client: Client;
  workspaceId: string;
}

export interface ToolExecutionResult<TOutput = unknown> {
  success: boolean;
  status: 'executed' | 'staged_for_approval' | 'replayed_from_cache' | 'rejected';
  data?: TOutput;
  approvalId?: string;
  idempotencyKey?: string;
  error?: string;
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register<TInput, TOutput>(tool: ToolDefinition<TInput, TOutput>): void {
    this.tools.set(tool.name, tool as unknown as ToolDefinition);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  async execute(
    toolName: string,
    rawInput: unknown,
    auth: AuthContext,
    targetWorkspaceId: string,
    client: Client
  ): Promise<ToolExecutionResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        success: false,
        status: 'rejected',
        error: `Tool '${toolName}' is not registered`,
      };
    }

    // 1. Policy check
    const policy = evaluateToolPolicy(toolName, tool.riskClass, auth, targetWorkspaceId);
    if (!policy.allowed && !policy.requiresApproval) {
      return {
        success: false,
        status: 'rejected',
        error: policy.reason || 'Policy authorization failed',
      };
    }

    // 2. Validate input schema
    let validatedInput: Record<string, unknown>;
    try {
      validatedInput = tool.validateInput(rawInput) as Record<string, unknown>;
    } catch (err: unknown) {
      return {
        success: false,
        status: 'rejected',
        error: `Schema validation error: ${(err as Error).message}`,
      };
    }

    // 3. Compute payload hash and idempotency key
    const payloadHash = await hashPayload(validatedInput);
    const idempotencyKey = generateIdempotencyKey(targetWorkspaceId, toolName, payloadHash);

    // Check existing idempotency record
    const existingRows = await client.execute({
      sql: `SELECT * FROM request WHERE idem = ?`,
      args: [idempotencyKey],
    });

    if (existingRows.rows.length > 0) {
      const record = existingRows.rows[0] as any;
      if (record.status === 2 && record.response) {
        return {
          success: true,
          status: 'replayed_from_cache',
          data: JSON.parse(String(record.response)),
          idempotencyKey,
        };
      }
    }

    const motionRepo = new MotionRepository(client);
    const approvalRepo = new ApprovalRepository(client);

    // 4. Intercept consequential or restricted actions for approval if required
    if (policy.requiresApproval) {
      const approvalId = `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await approvalRepo.create({
        id: approvalId,
        workspaceId: targetWorkspaceId,
        actorId: auth.userId,
        requiredRole: policy.requiredRole || 'admin',
        actionType: toolName,
        payloadHash,
        payload: validatedInput,
        expiresAt,
        idempotencyKey,
      });

      // Record motion event for approval creation
      await motionRepo.record(
        targetWorkspaceId,
        `motion_${Date.now()}`,
        'approval.created',
        auth.userId,
        { toolName, approvalId, requiredRole: policy.requiredRole }
      );

      return {
        success: true,
        status: 'staged_for_approval',
        approvalId,
        idempotencyKey,
      };
    }

    // 5. Execute tool action
    try {
      const output = await tool.run({
        input: validatedInput,
        auth,
        client,
        workspaceId: targetWorkspaceId,
      });

      // Save completed request record
      const now = Date.now();
      await client.execute({
        sql: `INSERT INTO request (idem, actor, action, payload_hash, status, response, created, completed)
              VALUES (?, ?, ?, ?, 2, ?, ?, ?)
              ON CONFLICT(idem) DO UPDATE SET status = 2, response = ?, completed = ?`,
        args: [
          idempotencyKey,
          auth.userId,
          toolName,
          payloadHash,
          JSON.stringify(output),
          now,
          now,
          JSON.stringify(output),
          now,
        ],
      });

      // Record audit motion event
      await motionRepo.record(
        targetWorkspaceId,
        `motion_${Date.now()}`,
        `tool.${toolName}`,
        auth.userId,
        { input: validatedInput, result: output }
      );

      return {
        success: true,
        status: 'executed',
        data: output,
        idempotencyKey,
      };
    } catch (err: unknown) {
      return {
        success: false,
        status: 'rejected',
        error: `Tool execution failed: ${(err as Error).message}`,
      };
    }
  }
}
