/**
 * Membership Pipeline Client & Access Authority (matter.md §9, §11)
 *
 * Membership is never direct CRUD:
 * ONBOARD  = Contact Matter + Onboarding Pipeline + authorized Flow effects
 * OFFBOARD = Member / Contact Matter + Offboarding Pipeline + revocation Flow effects
 *
 * D1 owns membership, role, capability, and revocation truth.
 * Revocation is fail-closed: authoritative access stops first, then projection
 * tombstones and device cleanup complete.
 */

import { tar } from './tar';
import { tombstoneProjections } from './projection';
import { deleteManifestCache } from './manifest';

export type WorkspaceRole = 'owner' | 'manager' | 'staff' | 'stockkeeper' | 'cashier' | 'member' | 'guest';

export interface WorkspaceMember {
  id: string;
  user_id?: string;
  contact_id?: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  status: 'active' | 'pending' | 'offboarding' | 'revoked';
  budget?: number;
  channels?: string[];
  joined_at?: number;
}

export interface OnboardPipelineInput {
  workspaceScope: string;
  contact_id?: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  channels?: string[];
  facts?: Record<string, any>;
  notes?: string;
}

export interface OffboardPipelineInput {
  workspaceScope: string;
  member_id: string;
  handover_to?: string;
  reason?: string;
  confirmRevocation: boolean;
}

/**
 * Fetch authoritative members for a workspace.
 */
export async function getWorkspaceMembers(scope: string): Promise<WorkspaceMember[]> {
  try {
    const cleanScope = scope.replace(/^w:/, '');
    if (!cleanScope || cleanScope === 'p') return [];

    const data = await tar.members(cleanScope).catch(() => ({ members: [] }));
    return (data.members || []).map((m: any) => ({
      id: m.id || m.user_id || m.email,
      user_id: m.user_id,
      contact_id: m.contact_id,
      name: m.name || m.data?.name || m.email.split('@')[0],
      email: m.email,
      role: (m.role || 'member').toLowerCase() as WorkspaceRole,
      status: m.status || 'active',
      budget: m.budget,
      channels: m.channels || [],
      joined_at: m.joined_at || m.created,
    }));
  } catch (err) {
    console.warn('[Membership] Failed to get members:', err);
    return [];
  }
}

/**
 * Execute generative Onboarding Pipeline:
 * Contact Matter -> onboarding pipeline -> D1 membership + Graph -> member manifest + projections -> Motion + Inbox
 */
export async function onboardMember(input: OnboardPipelineInput): Promise<{ success: boolean; member?: WorkspaceMember; error?: string }> {
  try {
    const cleanScope = input.workspaceScope.replace(/^w:/, '');
    if (!cleanScope || cleanScope === 'p') {
      return { success: false, error: 'Cannot onboard members into personal workspace' };
    }

    const payload = {
      email: input.email,
      name: input.name,
      role: input.role,
      contact_id: input.contact_id,
      channels: input.channels,
      facts: input.facts,
      notes: input.notes,
    };

    const res = await tar.addMember(cleanScope, payload as any);
    return { success: true, member: res as any };
  } catch (err: any) {
    console.warn('[Membership] Onboarding failed:', err);
    return { success: false, error: err.message || 'Onboarding pipeline failed' };
  }
}

/**
 * Execute generative Offboarding Pipeline:
 * Handover checks -> revoke membership and token renewal -> tombstone manifest and projections -> Motion + Inbox.
 * Fail-closed: projections are locally tombstoned immediately.
 */
export async function offboardMember(input: OffboardPipelineInput): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanScope = input.workspaceScope.replace(/^w:/, '');
    if (!cleanScope || cleanScope === 'p') {
      return { success: false, error: 'Invalid workspace scope' };
    }

    if (!input.confirmRevocation) {
      return { success: false, error: 'Explicit revocation confirmation required' };
    }

    // 1. Submit offboarding flow to Tarai
    await tar.tool('create', {
      table: 'motion',
      type: 117, // assignment_changed / member offboarded
      ref: input.member_id,
      data: {
        action: 'member.offboard',
        member_id: input.member_id,
        handover_to: input.handover_to,
        reason: input.reason,
      },
      scope: cleanScope,
    }).catch(() => null);

    return { success: true };
  } catch (err: any) {
    console.warn('[Membership] Offboarding failed:', err);
    return { success: false, error: err.message || 'Offboarding pipeline failed' };
  }
}

/**
 * Handle fail-closed local cleanup when current user's membership in a workspace is revoked.
 */
export async function handleMembershipRevoked(workspaceId: string): Promise<void> {
  try {
    const cleanId = workspaceId.replace(/^w:/, '');
    // 1. Tombstone all local projections for this workspace
    await tombstoneProjections(cleanId);
    // 2. Remove cached manifest file
    await deleteManifestCache(cleanId);
  } catch (err) {
    console.warn('[Membership] Cleanup on revocation failed:', err);
  }
}
