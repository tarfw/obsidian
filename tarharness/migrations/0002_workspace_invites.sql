CREATE TABLE IF NOT EXISTS workspace_invites (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'member', 'guest')),
  invited_by TEXT NOT NULL REFERENCES users(id),
  state TEXT NOT NULL CHECK(state IN ('pending', 'accepted', 'revoked')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(workspace_id, email)
);

CREATE INDEX IF NOT EXISTS workspace_invites_by_email ON workspace_invites(email, state);
