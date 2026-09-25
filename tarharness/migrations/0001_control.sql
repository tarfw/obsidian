CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL CHECK(mode IN ('personal','work')),
  database_name TEXT NOT NULL UNIQUE,
  database_host TEXT,
  state TEXT NOT NULL CHECK(state IN ('provisioning','active','error','archived')),
  error_message TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK(role IN ('owner','admin','member','guest')),
  work_role TEXT NOT NULL DEFAULT 'general',
  state TEXT NOT NULL CHECK(state IN ('active','invited','revoked')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(workspace_id,user_id)
);
CREATE INDEX memberuser ON members(user_id,state);

CREATE TABLE workspace_invites (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','member','guest')),
  work_role TEXT NOT NULL DEFAULT 'general',
  invited_by TEXT NOT NULL REFERENCES users(id),
  state TEXT NOT NULL CHECK(state IN ('pending','accepted','revoked')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(workspace_id,email)
);
CREATE INDEX inviteemail ON workspace_invites(email,state);

CREATE TABLE contexts (
  user TEXT PRIMARY KEY REFERENCES users(id),
  workspace TEXT NOT NULL REFERENCES workspaces(id),
  mode TEXT NOT NULL CHECK(mode IN ('auto','hold')),
  expires INTEGER,
  updated INTEGER NOT NULL
);

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
CREATE INDEX linkexpiry ON channel_link_requests(expires_at);

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
CREATE INDEX commanddue ON channel_commands(state,due_at);

CREATE TABLE dispatches (
  id TEXT PRIMARY KEY,
  workspace TEXT NOT NULL REFERENCES workspaces(id),
  actor TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK(action IN ('flow.start','flow.advance')),
  token TEXT NOT NULL,
  hash TEXT NOT NULL,
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  run TEXT,
  instance TEXT,
  state TEXT NOT NULL CHECK(state IN ('accepted','processing','running','done','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  due INTEGER NOT NULL,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  UNIQUE(workspace,token)
);
CREATE INDEX dispatchdue ON dispatches(state,due);
