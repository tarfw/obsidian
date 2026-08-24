export const WORKSPACE_SCHEMA = `
CREATE TABLE IF NOT EXISTS matter (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data)),
  state TEXT NOT NULL DEFAULT 'active',
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS motion (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  actor TEXT NOT NULL,
  ref TEXT,
  data TEXT NOT NULL CHECK (json_valid(data)),
  created INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS graph (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  kind TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data)),
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS matter_type ON matter(type, state, updated DESC);
CREATE INDEX IF NOT EXISTS motion_ref ON motion(ref, created DESC);
CREATE INDEX IF NOT EXISTS motion_type ON motion(type, created DESC);
CREATE INDEX IF NOT EXISTS graph_source ON graph(source, kind);
CREATE INDEX IF NOT EXISTS graph_target ON graph(target, kind);
`;

export const PERSONAL_SCHEMA = `
${WORKSPACE_SCHEMA}

CREATE TABLE IF NOT EXISTS inbox (
  id TEXT PRIMARY KEY,
  space TEXT NOT NULL,
  type TEXT NOT NULL,
  ref TEXT,
  data TEXT NOT NULL CHECK (json_valid(data)),
  state TEXT NOT NULL DEFAULT 'unread',
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS inbox_state ON inbox(state, created DESC);
CREATE INDEX IF NOT EXISTS inbox_space ON inbox(space, created DESC);
`;
