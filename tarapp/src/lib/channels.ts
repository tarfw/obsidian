/**
 * Channels & Member Onboarding API (plan6.md Flow 2 & Flow 3)
 */

import { UserProfile } from './auth';

const TAR_URL = process.env.EXPO_PUBLIC_TARFLUE_URL || 'https://taragent.tar-54d.workers.dev';

export interface PairingCodeResponse {
  code: string;
  subdomain: string;
  scope: string;
  expiresInSeconds: number;
  expiresAt: number;
}

export interface ConnectedChannel {
  chat_id: string;
  scope: string;
  name?: string;
  platform: string;
  created_at: string;
}

export interface ClaimMemberResponse {
  success: boolean;
  workspace: {
    subdomain: string;
    scope: string;
    role: string;
    handle: string;
  };
}

/**
 * Generate a 10-minute 6-character pairing code for connecting a chat group.
 */
export async function generatePairingCode(
  subdomain: string,
  userId?: string
): Promise<PairingCodeResponse> {
  const res = await fetch(`${TAR_URL}/channels/pair/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId || 'guest',
    },
    body: JSON.stringify({ subdomain }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate pairing code');
  }

  return res.json();
}

/**
 * List all connected chat channels for a workspace.
 */
export async function getConnectedChannels(
  subdomain: string
): Promise<ConnectedChannel[]> {
  try {
    const res = await fetch(`${TAR_URL}/channels/list?subdomain=${encodeURIComponent(subdomain)}`);
    if (!res.ok) return [];
    const data = await res.json() as { channels?: ConnectedChannel[] };
    return data.channels || [];
  } catch (err) {
    console.warn('[channels] Failed to fetch connected channels:', err);
    return [];
  }
}

/**
 * Disconnect a chat group from a workspace.
 */
export async function disconnectChannel(chatId: string): Promise<boolean> {
  try {
    const res = await fetch(`${TAR_URL}/channels/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[channels] Failed to disconnect channel:', err);
    return false;
  }
}

/**
 * Claim staff role using 4-digit code and bind Google Account (Flow 3).
 */
export async function claimMemberInvite(
  code: string,
  user: UserProfile
): Promise<ClaimMemberResponse> {
  const res = await fetch(`${TAR_URL}/members/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user.id,
      'X-User-Email': user.email,
    },
    body: JSON.stringify({
      code: code.trim(),
      email: user.email,
      name: user.name || user.email.split('@')[0],
      userId: user.id,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to claim role. Code may be invalid or expired.');
  }

  return res.json();
}
