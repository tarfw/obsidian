/**
 * Legacy declarative roster parser; D1 remains access authority (matter.md §11).
 */

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
 * Parses team/team.md YAML frontmatter on React Native.
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
 * Serializes TeamRoster to Markdown with YAML frontmatter.
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
