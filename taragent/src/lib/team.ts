/**
 * Declarative team.md parser, serializer, and lifecycle synchronizer (genuiteam.md §1, §3, §6).
 * Single source of truth for workspace staff roster, permissions, and connected channel handles.
 */

import { readWorkspaceFile, uploadWorkspaceFile } from './okf';
import { setCachedMember, invalidateMemberCache, MemberRecord } from './cache';

export interface TeamMember {
  user_id?: string;
  name?: string;
  email?: string;
  handle?: string;
  role: string;
  section?: string;
  tables?: string;
  status: 'active' | 'former' | 'pending';
  permissions?: string[];
}

export interface TeamRoster {
  type: string;
  title: string;
  timestamp: string;
  roles?: Record<string, string[]>;
  members: TeamMember[];
}

/**
 * Super lightweight YAML frontmatter parser for team.md
 */
export function parseTeamMarkdown(content: string): TeamRoster {
  const parts = content.split('---');
  if (parts.length < 3) {
    return {
      type: 'TeamRoster',
      title: 'Workspace Team Roster',
      timestamp: new Date().toISOString(),
      roles: {
        owner: ['*'],
        manager: ['pos', 'inventory', 'crm', 'view_reports', 'manage_team', 'customize_canvas'],
        staff: ['pos', 'inventory', 'task_inbox'],
      },
      members: [],
    };
  }

  const yamlText = parts[1];
  const lines = yamlText.split('\n');
  
  let type = 'TeamRoster';
  let title = 'Workspace Team Roster';
  let timestamp = new Date().toISOString();
  const roles: Record<string, string[]> = {};
  const members: TeamMember[] = [];

  let inMembers = false;
  let inRoles = false;
  let currentRoleKey = '';
  let currentMember: any = null;
  let inMemberPermissions = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (rawLine.search(/\S/) === 0) {
      if (trimmed.startsWith('type:')) {
        type = trimmed.replace('type:', '').trim().replace(/^['"]|['"]$/g, '');
        inMembers = false;
        inRoles = false;
        continue;
      }
      if (trimmed.startsWith('title:')) {
        title = trimmed.replace('title:', '').trim().replace(/^['"]|['"]$/g, '');
        inMembers = false;
        inRoles = false;
        continue;
      }
      if (trimmed.startsWith('timestamp:')) {
        timestamp = trimmed.replace('timestamp:', '').trim().replace(/^['"]|['"]$/g, '');
        inMembers = false;
        inRoles = false;
        continue;
      }
      if (trimmed.startsWith('roles:')) {
        inRoles = true;
        inMembers = false;
        continue;
      }
      if (trimmed.startsWith('members:')) {
        inMembers = true;
        inRoles = false;
        continue;
      }
    }

    // Parse Roles block
    if (inRoles) {
      const roleMatch = rawLine.match(/^\s{2,4}([a-zA-Z0-9_-]+)\s*:\s*\[(.*)\]/);
      if (roleMatch) {
        const roleName = roleMatch[1].trim();
        const perms = roleMatch[2].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
        roles[roleName] = perms;
        continue;
      }
      const roleHeaderMatch = rawLine.match(/^\s{2,4}([a-zA-Z0-9_-]+)\s*:\s*$/);
      if (roleHeaderMatch) {
        currentRoleKey = roleHeaderMatch[1].trim();
        roles[currentRoleKey] = [];
        continue;
      }
      if (currentRoleKey && trimmed.startsWith('-')) {
        const perm = trimmed.replace(/^-\s*/, '').trim().replace(/^['"]|['"]$/g, '');
        if (perm) roles[currentRoleKey].push(perm);
        continue;
      }
    }

    // Parse Members block
    if (inMembers) {
      if (trimmed.startsWith('-')) {
        if (currentMember && currentMember.role) {
          members.push(currentMember);
        }
        currentMember = {
          status: 'active',
          permissions: [],
        };
        inMemberPermissions = false;

        const cleanTrimmed = trimmed.replace(/^-\s*/, '');
        if (cleanTrimmed.startsWith('user_id:')) {
          currentMember.user_id = cleanTrimmed.replace('user_id:', '').trim().replace(/^['"]|['"]$/g, '');
        } else if (cleanTrimmed.startsWith('name:')) {
          currentMember.name = cleanTrimmed.replace('name:', '').trim().replace(/^['"]|['"]$/g, '');
        } else if (cleanTrimmed.startsWith('email:')) {
          currentMember.email = cleanTrimmed.replace('email:', '').trim().replace(/^['"]|['"]$/g, '').toLowerCase();
        } else if (cleanTrimmed.startsWith('handle:')) {
          currentMember.handle = cleanTrimmed.replace('handle:', '').trim().replace(/^['"]|['"]$/g, '');
        } else if (cleanTrimmed.startsWith('role:')) {
          currentMember.role = cleanTrimmed.replace('role:', '').trim().replace(/^['"]|['"]$/g, '').toLowerCase();
        } else if (cleanTrimmed.startsWith('status:')) {
          currentMember.status = cleanTrimmed.replace('status:', '').trim().replace(/^['"]|['"]$/g, '') as any;
        }
        continue;
      }

      if (currentMember) {
        if (trimmed.startsWith('user_id:')) {
          currentMember.user_id = trimmed.replace('user_id:', '').trim().replace(/^['"]|['"]$/g, '');
          inMemberPermissions = false;
        } else if (trimmed.startsWith('name:')) {
          currentMember.name = trimmed.replace('name:', '').trim().replace(/^['"]|['"]$/g, '');
          inMemberPermissions = false;
        } else if (trimmed.startsWith('email:')) {
          currentMember.email = trimmed.replace('email:', '').trim().replace(/^['"]|['"]$/g, '').toLowerCase();
          inMemberPermissions = false;
        } else if (trimmed.startsWith('handle:')) {
          currentMember.handle = trimmed.replace('handle:', '').trim().replace(/^['"]|['"]$/g, '');
          inMemberPermissions = false;
        } else if (trimmed.startsWith('role:')) {
          currentMember.role = trimmed.replace('role:', '').trim().replace(/^['"]|['"]$/g, '').toLowerCase();
          inMemberPermissions = false;
        } else if (trimmed.startsWith('section:')) {
          currentMember.section = trimmed.replace('section:', '').trim().replace(/^['"]|['"]$/g, '');
          inMemberPermissions = false;
        } else if (trimmed.startsWith('tables:')) {
          currentMember.tables = trimmed.replace('tables:', '').trim().replace(/^['"]|['"]$/g, '');
          inMemberPermissions = false;
        } else if (trimmed.startsWith('status:')) {
          currentMember.status = trimmed.replace('status:', '').trim().replace(/^['"]|['"]$/g, '') as any;
          inMemberPermissions = false;
        } else if (trimmed.startsWith('permissions:')) {
          inMemberPermissions = true;
          const inlinePermsMatch = trimmed.match(/permissions\s*:\s*\[(.*)\]/);
          if (inlinePermsMatch) {
            currentMember.permissions = inlinePermsMatch[1]
              .split(',')
              .map(p => p.trim().replace(/^['"]|['"]$/g, ''))
              .filter(Boolean);
            inMemberPermissions = false;
          }
        } else if (inMemberPermissions && trimmed.startsWith('-')) {
          const perm = trimmed.replace(/^-\s*/, '').trim().replace(/^['"]|['"]$/g, '');
          if (perm) {
            if (!currentMember.permissions) currentMember.permissions = [];
            currentMember.permissions.push(perm);
          }
        }
      }
    }
  }

  if (currentMember && currentMember.role) {
    members.push(currentMember);
  }

  return {
    type,
    title,
    timestamp,
    roles: Object.keys(roles).length > 0 ? roles : {
      owner: ['*'],
      manager: ['pos', 'inventory', 'crm', 'view_reports', 'manage_team', 'customize_canvas'],
      staff: ['pos', 'inventory', 'task_inbox'],
    },
    members,
  };
}

/**
 * Serializes a TeamRoster back to declarative Markdown with YAML frontmatter.
 */
export function serializeTeamMarkdown(roster: TeamRoster): string {
  const rolesYaml = Object.entries(roster.roles || {})
    .map(([roleName, perms]) => `  ${roleName}: [${perms.map(p => `"${p}"`).join(', ')}]`)
    .join('\n');

  const membersYaml = (roster.members || []).map(m => {
    let lines = `  - user_id: "${m.user_id || ''}"\n    name: "${m.name || ''}"\n    email: "${m.email || ''}"\n    handle: "${m.handle || ''}"\n    role: "${m.role || 'staff'}"\n    status: "${m.status || 'active'}"`;
    if (m.section) lines += `\n    section: "${m.section}"`;
    if (m.tables) lines += `\n    tables: "${m.tables}"`;
    if (m.permissions && m.permissions.length > 0) {
      lines += `\n    permissions: [${m.permissions.map(p => `"${p}"`).join(', ')}]`;
    }
    return lines;
  }).join('\n');

  return `---
type: ${roster.type || 'TeamRoster'}
title: "${roster.title || 'Workspace Team Roster'}"
timestamp: "${new Date().toISOString()}"
roles:
${rolesYaml}
members:
${membersYaml}
---

# Team Directory & Access Control
Single source of truth for workspace staff roster, permissions, and connected channel handles.
`;
}

/**
 * Loads team.md from OKF (with fallback to members.md), parses it, and syncs to D1 + Tier 1/2 Cache.
 */
export async function getAndSyncTeamRoster(env: any, scope: string): Promise<TeamRoster> {
  let content = await readWorkspaceFile(env, scope, 'team/team.md');
  if (!content) {
    // Fallback to legacy members.md if team.md does not yet exist
    content = await readWorkspaceFile(env, scope, 'team/members.md');
  }

  const roster = content ? parseTeamMarkdown(content) : {
    type: 'TeamRoster',
    title: 'Workspace Team Roster',
    timestamp: new Date().toISOString(),
    roles: {
      owner: ['*'],
      manager: ['pos', 'inventory', 'crm', 'view_reports', 'manage_team', 'customize_canvas'],
      staff: ['pos', 'inventory', 'task_inbox'],
    },
    members: [],
  };

  // Sync to D1 & Cache
  await syncTeamRosterToD1AndCache(env, scope, roster);
  return roster;
}

/**
 * Synchronizes declarative TeamRoster to D1 members table and updates 3-Tier Edge Cache.
 */
export async function syncTeamRosterToD1AndCache(
  env: any,
  scope: string,
  roster: TeamRoster
): Promise<void> {
  if (!env.DB) return;

  // Ensure members table has required columns
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      user_id TEXT,
      email TEXT,
      handle TEXT,
      role TEXT NOT NULL DEFAULT 'staff',
      status TEXT NOT NULL DEFAULT 'active',
      permissions TEXT,
      updated_at TEXT
    )
  `).run().catch(() => {});

  for (const col of ['email', 'handle', 'status', 'permissions', 'updated_at']) {
    try { await env.DB.prepare(`ALTER TABLE members ADD COLUMN ${col} TEXT`).run(); } catch {}
  }

  const nowIso = new Date().toISOString();

  for (const m of roster.members) {
    const cleanHandle = (m.handle || '').toLowerCase().trim();
    const cleanEmail = (m.email || '').toLowerCase().trim();
    const memberId = `${scope}:${cleanHandle || cleanEmail || m.user_id || 'unnamed'}`;

    // 1. Sync to D1
    await env.DB.prepare(`
      INSERT INTO members (id, scope, user_id, email, handle, role, status, permissions, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id,
        email = excluded.email,
        handle = excluded.handle,
        role = excluded.role,
        status = excluded.status,
        permissions = excluded.permissions,
        updated_at = excluded.updated_at
    `).bind(
      memberId,
      scope,
      m.user_id || '',
      cleanEmail || '',
      cleanHandle || '',
      m.role || 'staff',
      m.status || 'active',
      JSON.stringify(m.permissions || roster.roles?.[m.role] || []),
      nowIso
    ).run().catch((e: any) => console.warn('[team] D1 sync warning for member:', memberId, e));

    // 2. Sync to 3-Tier Edge Cache
    const record: MemberRecord = {
      userId: m.user_id,
      name: m.name,
      email: cleanEmail,
      handle: cleanHandle,
      role: m.role || 'staff',
      status: m.status || 'active',
      permissions: m.permissions || roster.roles?.[m.role] || [],
      scope,
      timestamp: Date.now(),
    };

    if (cleanHandle) {
      setCachedMember(env, scope, cleanHandle, record);
    }
    if (cleanEmail) {
      setCachedMember(env, scope, cleanEmail, record);
    }
  }
}

/**
 * Upserts a member into team/team.md, D1, and cache.
 */
export async function updateOrAddTeamMember(
  env: any,
  scope: string,
  member: TeamMember
): Promise<TeamRoster> {
  const roster = await getAndSyncTeamRoster(env, scope);
  const cleanEmail = (member.email || '').toLowerCase().trim();
  const cleanHandle = (member.handle || '').toLowerCase().trim();

  const existingIdx = roster.members.findIndex(m => {
    if (cleanEmail && m.email && m.email.toLowerCase() === cleanEmail) return true;
    if (cleanHandle && m.handle && m.handle.toLowerCase() === cleanHandle) return true;
    if (member.user_id && m.user_id && m.user_id === member.user_id) return true;
    return false;
  });

  if (existingIdx !== -1) {
    roster.members[existingIdx] = {
      ...roster.members[existingIdx],
      ...member,
      status: member.status || roster.members[existingIdx].status || 'active',
    };
  } else {
    roster.members.push({
      ...member,
      status: member.status || 'active',
    });
  }

  const updatedMd = serializeTeamMarkdown(roster);
  await uploadWorkspaceFile(env, scope, 'team/team.md', updatedMd);
  await syncTeamRosterToD1AndCache(env, scope, roster);
  return roster;
}

/**
 * Offboards a member (sets status to 'former' and invalidates cache).
 */
export async function offboardTeamMember(
  env: any,
  scope: string,
  identifier: string // email or handle or user_id
): Promise<TeamRoster> {
  const clean = identifier.toLowerCase().trim();
  const roster = await getAndSyncTeamRoster(env, scope);

  const idx = roster.members.findIndex(m =>
    (m.email && m.email.toLowerCase() === clean) ||
    (m.handle && m.handle.toLowerCase() === clean) ||
    (m.user_id && m.user_id === identifier)
  );

  if (idx !== -1) {
    roster.members[idx].status = 'former';
    const updatedMd = serializeTeamMarkdown(roster);
    await uploadWorkspaceFile(env, scope, 'team/team.md', updatedMd);
    await syncTeamRosterToD1AndCache(env, scope, roster);
    invalidateMemberCache(env, scope, clean);
  }

  return roster;
}
