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
