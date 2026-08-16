-- ============================================================================
-- Tar Architecture — Clean Minimal D1 Routing Tables (plan6.md)
-- Database: tar
-- ============================================================================

-- 1. USERS: Personal Turso Database Registry
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  turso_db_name TEXT NOT NULL,
  turso_url TEXT NOT NULL,
  turso_auth_token TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. WORKSPACES: Workspace Registry & Turso Credentials
CREATE TABLE IF NOT EXISTS workspaces (
  subdomain TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  name TEXT,
  user_id TEXT,
  type TEXT,
  turso_url TEXT,
  turso_auth_token TEXT,
  vertical TEXT,
  custom_domain TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspaces_scope ON workspaces(scope);
CREATE INDEX IF NOT EXISTS idx_workspaces_user ON workspaces(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_custom_domain ON workspaces(custom_domain);

-- 3. CHANNELS: Channel Gateway Group Mapping (Telegram/Discord/Slack)
CREATE TABLE IF NOT EXISTS channels (
  chat_id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  name TEXT,
  platform TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_channels_scope ON channels(scope);
CREATE INDEX IF NOT EXISTS idx_channels_platform ON channels(platform);
