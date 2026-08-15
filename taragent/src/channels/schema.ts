/**
 * D1 schema for channel routing, secure pairing codes, and member invites.
 */

export const CHANNEL_SCHEMA = `
CREATE TABLE IF NOT EXISTS channels (
  chat_id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  name TEXT,
  platform TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_channel_scope ON channels(scope);
CREATE INDEX IF NOT EXISTS idx_channel_platform ON channels(platform);

CREATE TABLE IF NOT EXISTS workspaces (
  subdomain TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  name TEXT,
  user_id TEXT,
  type TEXT,
  created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_workspace_scope ON workspaces(scope);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  user_id TEXT,
  email TEXT,
  handle TEXT NOT NULL,
  role TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_members_scope ON members(scope);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);

CREATE TABLE IF NOT EXISTS pairing_codes (
  code TEXT PRIMARY KEY,
  subdomain TEXT NOT NULL,
  scope TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pairing_codes_subdomain ON pairing_codes(subdomain);

CREATE TABLE IF NOT EXISTS member_invites (
  code TEXT PRIMARY KEY,
  subdomain TEXT NOT NULL,
  scope TEXT NOT NULL,
  handle TEXT NOT NULL,
  role TEXT NOT NULL,
  section TEXT,
  tables TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_member_invites_code ON member_invites(code);
CREATE INDEX IF NOT EXISTS idx_member_invites_handle ON member_invites(handle);
`;
