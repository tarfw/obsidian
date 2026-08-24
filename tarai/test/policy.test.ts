import { describe, it, expect } from 'vitest';
import { evaluateToolPolicy, canApproveRequest, hasRoleLevel } from '../src/domain/policy.ts';
import type { AuthContext } from '../src/domain/types.ts';

describe('Policy Gate & RBAC Enforcement', () => {
  const ownerAuth: AuthContext = {
    userId: 'u_owner',
    workspaceId: 'ws_alpha',
    email: 'owner@example.com',
    role: 'owner',
    status: 'active',
    audience: 'owner',
  };

  const memberAuth: AuthContext = {
    userId: 'u_member',
    workspaceId: 'ws_alpha',
    email: 'member@example.com',
    role: 'member',
    status: 'active',
    audience: 'member',
  };

  const customerAuth: AuthContext = {
    userId: 'u_customer',
    workspaceId: 'ws_alpha',
    email: 'customer@example.com',
    role: 'guest',
    status: 'active',
    audience: 'customer',
  };

  it('enforces role hierarchy', () => {
    expect(hasRoleLevel('owner', 'admin')).toBe(true);
    expect(hasRoleLevel('admin', 'member')).toBe(true);
    expect(hasRoleLevel('member', 'admin')).toBe(false);
    expect(hasRoleLevel('guest', 'member')).toBe(false);
  });

  it('allows read and draft actions for active members', () => {
    const res = evaluateToolPolicy('tasks.list', 'read', memberAuth, 'ws_alpha');
    expect(res.allowed).toBe(true);
    expect(res.requiresApproval).toBe(false);
  });

  it('allows reversible writes for members', () => {
    const res = evaluateToolPolicy('task.create', 'reversible_write', memberAuth, 'ws_alpha');
    expect(res.allowed).toBe(true);
    expect(res.requiresApproval).toBe(false);
  });

  it('requires approval for consequential actions when called by regular members', () => {
    const res = evaluateToolPolicy('task.archive', 'consequential', memberAuth, 'ws_alpha');
    expect(res.allowed).toBe(true);
    expect(res.requiresApproval).toBe(true);
    expect(res.requiredRole).toBe('admin');
  });

  it('allows owner to execute consequential actions directly', () => {
    const res = evaluateToolPolicy('task.archive', 'consequential', ownerAuth, 'ws_alpha');
    expect(res.allowed).toBe(true);
    expect(res.requiresApproval).toBe(false);
  });

  it('blocks customer audience from write and consequential actions', () => {
    const res = evaluateToolPolicy('task.create', 'reversible_write', customerAuth, 'ws_alpha');
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('Customers are not authorized');
  });

  it('strictly blocks cross-tenant access', () => {
    const res = evaluateToolPolicy('tasks.list', 'read', memberAuth, 'ws_beta');
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('Tenant isolation violation');
  });

  it('evaluates approval authority correctly (Owner or Authorized Role)', () => {
    expect(canApproveRequest('owner', 'ws_alpha', 'ws_alpha', 'admin')).toBe(true);
    expect(canApproveRequest('admin', 'ws_alpha', 'ws_alpha', 'admin')).toBe(true);
    expect(canApproveRequest('member', 'ws_alpha', 'ws_alpha', 'admin')).toBe(false);
    // Cross tenant approval is denied even for owners
    expect(canApproveRequest('owner', 'ws_alpha', 'ws_beta', 'admin')).toBe(false);
  });
});
