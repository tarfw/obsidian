/**
 * Channels & Member Onboarding API (plan6.md Flow 2 & Flow 3)
 */

import { UserProfile } from './auth';

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
  void subdomain;
  void userId;
  throw new Error('Channel pairing is not enabled in this Tarai release.');
}

/**
 * List all connected chat channels for a workspace.
 */
export async function getConnectedChannels(
  subdomain: string
): Promise<ConnectedChannel[]> {
  void subdomain;
  return [];
}

/**
 * Disconnect a chat group from a workspace.
 */
export async function disconnectChannel(chatId: string): Promise<boolean> {
  void chatId;
  return false;
}

/**
 * Claim staff role using 4-digit code and bind Google Account (Flow 3).
 */
export async function claimMemberInvite(
  code: string,
  user: UserProfile
): Promise<ClaimMemberResponse> {
  void code;
  void user;
  throw new Error('Member invites are not enabled in this Tarai release.');
}
