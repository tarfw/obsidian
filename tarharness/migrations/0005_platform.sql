-- Platform tables shared by Site v2: judgment cache, quotas, visitor counters,
-- custom domains and platform slug reservations.

CREATE TABLE IF NOT EXISTS judgments (
  id TEXT PRIMARY KEY,
  workspace TEXT NOT NULL REFERENCES workspaces(id),
  scope TEXT NOT NULL,
  version TEXT NOT NULL,
  model TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)),
  expires INTEGER NOT NULL,
  created INTEGER NOT NULL
);
CREATE INDEX judgmentexpiry ON judgments(expires);

CREATE TABLE IF NOT EXISTS limits (
  workspace TEXT PRIMARY KEY REFERENCES workspaces(id),
  pages INTEGER NOT NULL DEFAULT 50,
  nodes INTEGER NOT NULL DEFAULT 1000,
  media INTEGER NOT NULL DEFAULT 104857600,
  builds INTEGER NOT NULL DEFAULT 200,
  budget INTEGER NOT NULL DEFAULT 200000,
  updated INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window INTEGER NOT NULL
);
CREATE INDEX counterwindow ON counters(window);

CREATE TABLE IF NOT EXISTS domains (
  name TEXT PRIMARY KEY,
  workspace TEXT NOT NULL REFERENCES workspaces(id),
  site TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('requested','challenge','verifying','active','failed','removed')),
  token TEXT NOT NULL,
  provider TEXT,
  cert TEXT,
  target TEXT,
  note TEXT,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
CREATE INDEX domainworkspace ON domains(workspace,state);

CREATE TABLE IF NOT EXISTS slugs (
  name TEXT PRIMARY KEY,
  workspace TEXT REFERENCES workspaces(id),
  site TEXT,
  state TEXT NOT NULL CHECK(state IN ('reserved','active','released')),
  released INTEGER,
  updated INTEGER NOT NULL
);
