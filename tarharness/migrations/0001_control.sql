CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL CHECK(mode IN ('personal', 'work')),
  database_name TEXT NOT NULL UNIQUE,
  database_host TEXT,
  state TEXT NOT NULL CHECK(state IN ('provisioning', 'active', 'error', 'archived')),
  error_message TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'member', 'guest')),
  state TEXT NOT NULL CHECK(state IN ('active', 'invited', 'revoked')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS members_by_user ON members(user_id, state);
