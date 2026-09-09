ALTER TABLE members ADD COLUMN work_role TEXT NOT NULL DEFAULT 'general' CHECK(work_role IN ('general','cook','cashier'));
ALTER TABLE workspace_invites ADD COLUMN work_role TEXT NOT NULL DEFAULT 'general' CHECK(work_role IN ('general','cook','cashier'));

CREATE TABLE team_channels (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id),
  provider TEXT NOT NULL CHECK(provider IN ('slack','discord','google-chat')),
  tenant_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  join_url TEXT NOT NULL DEFAULT '',
  linked_by TEXT NOT NULL REFERENCES users(id),
  updated_at INTEGER NOT NULL,
  UNIQUE(provider,tenant_id,channel_id)
);
CREATE TABLE channel_identities (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  external_user_id TEXT NOT NULL,
  external_name TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(workspace_id,user_id),
  UNIQUE(workspace_id,provider,tenant_id,external_user_id)
);
CREATE TABLE channel_link_requests (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK(purpose IN ('destination','identity')),
  candidate TEXT,
  expires_at INTEGER NOT NULL
);
CREATE INDEX channel_link_expiry ON channel_link_requests(expires_at);
CREATE TABLE control_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE channel_commands (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  event TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','processing','completed','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  due_at INTEGER NOT NULL,
  result TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX channel_commands_due ON channel_commands(state,due_at);
