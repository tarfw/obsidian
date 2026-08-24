/**
 * TARAI Code Policy Gate & RBAC Enforcement
 */
import type { AuthContext, RiskClass, Role } from './types.ts';

export interface PolicyCheckResult {
  allowed: boolean;
  requiresApproval: boolean;
  requiredRole?: Role;
  riskClass: RiskClass;
  reason?: string;
}

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  guest: 1,
};

export function hasRoleLevel(actorRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[actorRole] >= ROLE_HIERARCHY[requiredRole];
}

export function evaluateToolPolicy(
  toolName: string,
  riskClass: RiskClass,
  auth: AuthContext,
  targetWorkspaceId: string
): PolicyCheckResult {
  // Strict tenant boundary: actor workspace must match target workspace
  if (auth.workspaceId !== targetWorkspaceId) {
    return {
      allowed: false,
      requiresApproval: false,
      riskClass,
      reason: `Tenant isolation violation: Actor workspace ${auth.workspaceId} does not match target ${targetWorkspaceId}`,
    };
  }

  // Active status check
  if (auth.status !== 'active') {
    return {
      allowed: false,
      requiresApproval: false,
      riskClass,
      reason: `Inactive member policy rejection: Actor status is ${auth.status}`,
    };
  }

  // Audience boundary
  if (auth.audience === 'customer') {
    // Customers can only access safe Read or Draft interactions for public catalogue / FAQ / quote intake
    if (riskClass === 'consequential' || riskClass === 'restricted' || riskClass === 'reversible_write') {
      return {
        allowed: false,
        requiresApproval: false,
        riskClass,
        reason: 'Customers are not authorized to perform write or consequential actions',
      };
    }
  }

  switch (riskClass) {
    case 'read':
    case 'draft':
      return { allowed: true, requiresApproval: false, riskClass };

    case 'reversible_write':
      // Members, Admins, Owners can perform reversible writes
      if (hasRoleLevel(auth.role, 'member')) {
        return { allowed: true, requiresApproval: false, riskClass };
      }
      return {
        allowed: false,
        requiresApproval: false,
        riskClass,
        reason: 'Insufficient role for reversible write',
      };

    case 'consequential':
      // Consequential actions (e.g. sending external emails, publishing site, issuing refunds)
      // If actor is owner, they can trigger it directly or stage it; if member, requires approval from Owner or Admin
      if (auth.role === 'owner') {
        return { allowed: true, requiresApproval: false, riskClass };
      }
      return {
        allowed: true,
        requiresApproval: true,
        requiredRole: 'admin',
        riskClass,
        reason: 'Consequential action requires approval from Owner or Admin',
      };

    case 'restricted':
      // Restricted actions (e.g. payment capture, credential change, member removal)
      // Exclusively executable by Owner or explicit Owner-approved workflow
      if (auth.role === 'owner') {
        return { allowed: true, requiresApproval: false, riskClass };
      }
      return {
        allowed: true,
        requiresApproval: true,
        requiredRole: 'owner',
        riskClass,
        reason: 'Restricted action requires explicit Owner approval',
      };

    default:
      return {
        allowed: false,
        requiresApproval: false,
        riskClass,
        reason: 'Unknown risk class',
      };
  }
}

/**
 * Checks whether an actor can approve a pending approval record
 */
export function canApproveRequest(
  actorRole: Role,
  actorWorkspaceId: string,
  approvalWorkspaceId: string,
  requiredRole: Role
): boolean {
  if (actorWorkspaceId !== approvalWorkspaceId) return false;
  return hasRoleLevel(actorRole, requiredRole);
}
