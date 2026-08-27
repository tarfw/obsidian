/**
 * Member Workspace Manifest (matter.md §9, §10)
 *
 * Resolves and caches role-filtered workspace derivatives:
 * profiles/{user_id}/workspaces/index.md
 * profiles/{user_id}/workspaces/{workspace_id}.md
 *
 * Instant render = local workspace index + cached resolved manifest + local Personal DB projections.
 */

import * as SecureStore from 'expo-secure-store';
import { getSelfId } from './db';
import { tar } from './tar';
import type { CanvasBlock, CanvasAction, CanvasChip } from './canvas';

export interface MemberWorkspaceManifest {
  workspace_id: string;
  name: string;
  subdomain: string;
  is_owner: boolean;
  role: string;
  membership_version: number;
  canvas_version: number;
  registry_version: number;
  manifest_version: string;
  blocks: CanvasBlock[];
  chips: CanvasChip[];
  actions: CanvasAction[];
  cached_at: number;
}

export interface WorkspaceIndexEntry {
  workspace_id: string;
  name: string;
  subdomain: string;
  role: string;
  is_owner: boolean;
  state: string;
}

const MANIFEST_CACHE_PREFIX = 'ws_manifest_';

/**
 * Gets cached member workspace manifest for instant 0ms render.
 */
export async function getCachedManifest(workspaceId: string): Promise<MemberWorkspaceManifest | null> {
  try {
    const cleanId = workspaceId.replace(/^w:/, '');
    const json = await SecureStore.getItemAsync(`${MANIFEST_CACHE_PREFIX}${cleanId}`).catch(() => null);
    if (!json) return null;
    return JSON.parse(json) as MemberWorkspaceManifest;
  } catch (err) {
    console.warn('[Manifest] Cache read error:', err);
    return null;
  }
}

/**
 * Stores resolved member workspace manifest into local cache.
 */
export async function cacheManifest(manifest: MemberWorkspaceManifest): Promise<void> {
  try {
    const cleanId = manifest.workspace_id.replace(/^w:/, '');
    await SecureStore.setItemAsync(
      `${MANIFEST_CACHE_PREFIX}${cleanId}`,
      JSON.stringify(manifest)
    ).catch(() => null);
  } catch (err) {
    console.warn('[Manifest] Cache write error:', err);
  }
}

/**
 * Deletes cached manifest (e.g. on revocation or logout).
 */
export async function deleteManifestCache(workspaceId: string): Promise<void> {
  try {
    const cleanId = workspaceId.replace(/^w:/, '');
    await SecureStore.deleteItemAsync(`${MANIFEST_CACHE_PREFIX}${cleanId}`).catch(() => null);
  } catch (err) {
    console.warn('[Manifest] Cache delete error:', err);
  }
}

/**
 * Loads member workspace manifest from OKF or derives it from canvas.md.
 */
export async function fetchMemberManifest(
  workspaceScope: string,
  userRole: string = 'owner'
): Promise<MemberWorkspaceManifest | null> {
  const cleanScope = workspaceScope.replace(/^w:/, '');
  if (!cleanScope || cleanScope === 'p') return null;

  try {
    const userId = await getSelfId();
    // 1. Try reading generated profile manifest: profiles/{user_id}/workspaces/{workspace_id}.md
    const profilePath = `profiles/${userId}/workspaces/${cleanScope}.md`;
    const profileRes = await tar.okf.read(cleanScope, profilePath).catch(() => null);

    if (profileRes?.content) {
      const parsed = parseManifestMarkdown(profileRes.content, cleanScope);
      if (parsed) {
        await cacheManifest(parsed);
        return parsed;
      }
    }

    return null;
  } catch (err) {
    console.warn('[Manifest] Fetch error:', err);
    return null;
  }
}

function parseManifestMarkdown(content: string, workspaceId: string): MemberWorkspaceManifest | null {
  try {
    const parts = content.split('---');
    if (parts.length < 3) return null;
    const yamlText = parts[1];
    
    // Very simple extraction
    const lines = yamlText.split('\n');
    let name = workspaceId;
    let role = 'member';
    let isOwner = false;
    let canvasVersion = 1;
    let membershipVersion = 1;
    let registryVersion = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('name:')) name = trimmed.replace('name:', '').trim().replace(/^['"]|['"]$/g, '');
      if (trimmed.startsWith('role:')) role = trimmed.replace('role:', '').trim().replace(/^['"]|['"]$/g, '');
      if (trimmed.startsWith('is_owner:')) isOwner = trimmed.replace('is_owner:', '').trim() === 'true';
      if (trimmed.startsWith('canvas_version:')) canvasVersion = parseInt(trimmed.replace('canvas_version:', '').trim()) || 1;
      if (trimmed.startsWith('membership_version:')) membershipVersion = parseInt(trimmed.replace('membership_version:', '').trim()) || 1;
    }

    return {
      workspace_id: workspaceId,
      name,
      subdomain: workspaceId,
      is_owner: isOwner,
      role,
      membership_version: membershipVersion,
      canvas_version: canvasVersion,
      registry_version: registryVersion,
      manifest_version: `${membershipVersion}.${canvasVersion}.${registryVersion}`,
      blocks: [],
      chips: [],
      actions: [],
      cached_at: Date.now(),
    };
  } catch {
    return null;
  }
}
