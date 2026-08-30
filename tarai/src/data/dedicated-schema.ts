/**
 * Canonical Tenant Database Schemas (matter.md §5)
 * Turso / LibSQL Database Definitions
 */

export const BASE_TENANT_SCHEMA = `
CREATE TABLE IF NOT EXISTS matter (
  id          TEXT PRIMARY KEY,
  type        INTEGER NOT NULL,
  data        TEXT NOT NULL CHECK (json_valid(data)),
  state       INTEGER NOT NULL DEFAULT 1,
  version     INTEGER NOT NULL DEFAULT 1,
  created     INTEGER NOT NULL,
  updated     INTEGER NOT NULL,
  deleted_at  INTEGER
);

CREATE TABLE IF NOT EXISTS motion (
  id           TEXT PRIMARY KEY,
  type         INTEGER NOT NULL,
  actor        TEXT NOT NULL,
  ref          TEXT,
  data         TEXT NOT NULL CHECK (json_valid(data)),
  idem         TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  created      INTEGER NOT NULL,
  deleted_at   INTEGER
);

CREATE TABLE IF NOT EXISTS graph (
  id          TEXT PRIMARY KEY,
  source      TEXT NOT NULL,
  target      TEXT NOT NULL,
  kind        INTEGER NOT NULL,
  data        TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data)),
  version     INTEGER NOT NULL DEFAULT 1,
  created     INTEGER NOT NULL,
  updated     INTEGER NOT NULL,
  deleted_at  INTEGER
);

CREATE INDEX IF NOT EXISTS idx_matter_live
  ON matter(type, state, updated DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_motion_type
  ON motion(type, created DESC, id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_motion_ref
  ON motion(ref, created DESC, id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_graph_source
  ON graph(source, kind) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_graph_target
  ON graph(target, kind) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS unq_graph_live_edge
  ON graph(source, target, kind) WHERE deleted_at IS NULL;
`;

/** TAR Harness canonical workspace tables. These are additive so an existing
 * workspace can move to the Harness without losing legacy records. */
export const HARNESS_WORKSPACE_SCHEMA = `
CREATE TABLE IF NOT EXISTS defs (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('data','bot')),
  name TEXT NOT NULL, body TEXT NOT NULL CHECK(json_valid(body)),
  version INTEGER NOT NULL DEFAULT 1, state TEXT NOT NULL DEFAULT 'active',
  created INTEGER NOT NULL, updated INTEGER NOT NULL, deleted_at INTEGER
);
CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)), status TEXT NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 1, created_by TEXT NOT NULL,
  created INTEGER NOT NULL, updated INTEGER NOT NULL, deleted_at INTEGER
);
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY, source TEXT NOT NULL, target TEXT NOT NULL, kind TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(data)), version INTEGER NOT NULL DEFAULT 1,
  created INTEGER NOT NULL, updated INTEGER NOT NULL, deleted_at INTEGER
);
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY, bot_id TEXT NOT NULL, workflow_id TEXT NOT NULL, step_id TEXT NOT NULL,
  record_id TEXT, state TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(data)),
  version INTEGER NOT NULL DEFAULT 1, actor TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS access (
  id TEXT PRIMARY KEY, subject TEXT NOT NULL, subject_kind TEXT NOT NULL,
  role TEXT NOT NULL, scope TEXT NOT NULL DEFAULT 'all', data TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(data)),
  created INTEGER NOT NULL, updated INTEGER NOT NULL, UNIQUE(subject, subject_kind, role)
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, ref TEXT,
  data TEXT NOT NULL CHECK(json_valid(data)), idem TEXT NOT NULL UNIQUE, created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_harness_defs_kind ON defs(kind, state, updated DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_harness_records_type ON records(type, status, updated DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_harness_runs_actor ON runs(actor, state, updated DESC);
CREATE INDEX IF NOT EXISTS idx_harness_events_ref ON events(ref, created DESC);
`;

export const WORKSPACE_SCHEMA = `
${BASE_TENANT_SCHEMA}
${HARNESS_WORKSPACE_SCHEMA}

CREATE TABLE IF NOT EXISTS request (
  idem          TEXT PRIMARY KEY,
  actor         TEXT NOT NULL,
  action        TEXT NOT NULL,
  payload_hash  TEXT NOT NULL,
  status        INTEGER NOT NULL,
  response      TEXT,
  created       INTEGER NOT NULL,
  completed     INTEGER,
  expires       INTEGER
);

CREATE TABLE IF NOT EXISTS routine (
  id            TEXT PRIMARY KEY,
  action        TEXT NOT NULL,
  schedule      TEXT NOT NULL,
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  config        TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(config)),
  policy_version TEXT NOT NULL,
  state         INTEGER NOT NULL DEFAULT 1,
  next_run      INTEGER NOT NULL,
  last_run      INTEGER,
  version       INTEGER NOT NULL DEFAULT 1,
  created       INTEGER NOT NULL,
  updated       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS job (
  id            TEXT PRIMARY KEY,
  routine_id    TEXT REFERENCES routine(id),
  action        TEXT NOT NULL,
  idem          TEXT NOT NULL UNIQUE,
  input         TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(input)),
  result        TEXT CHECK (result IS NULL OR json_valid(result)),
  status        INTEGER NOT NULL DEFAULT 1,
  attempts      INTEGER NOT NULL DEFAULT 0,
  run_after     INTEGER NOT NULL,
  lease_owner   TEXT,
  lease_until   INTEGER,
  last_error    TEXT,
  created       INTEGER NOT NULL,
  updated       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS approval (
  id            TEXT PRIMARY KEY,
  action        TEXT NOT NULL,
  actor         TEXT NOT NULL,
  required_role TEXT NOT NULL,
  payload       TEXT NOT NULL CHECK (json_valid(payload)),
  payload_hash  TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  status        INTEGER NOT NULL DEFAULT 1,
  expires       INTEGER NOT NULL,
  decided_by    TEXT,
  reason        TEXT,
  created       INTEGER NOT NULL,
  updated       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox (
  id            TEXT PRIMARY KEY,
  kind          INTEGER NOT NULL,
  ref           TEXT,
  destination   TEXT NOT NULL,
  payload       TEXT NOT NULL CHECK (json_valid(payload)),
  idem          TEXT NOT NULL UNIQUE,
  status        INTEGER NOT NULL DEFAULT 1,
  attempts      INTEGER NOT NULL DEFAULT 0,
  next_attempt  INTEGER NOT NULL,
  lease_owner   TEXT,
  lease_until   INTEGER,
  provider_ref  TEXT,
  last_error    TEXT,
  created       INTEGER NOT NULL,
  updated       INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_due
  ON outbox(status, next_attempt) WHERE status IN (1, 4);
CREATE INDEX IF NOT EXISTS idx_routine_due
  ON routine(state, next_run) WHERE state = 1;
CREATE INDEX IF NOT EXISTS idx_job_due
  ON job(status, run_after) WHERE status IN (1, 4);
`;

export const PERSONAL_SCHEMA = `
${BASE_TENANT_SCHEMA}
${HARNESS_WORKSPACE_SCHEMA}

CREATE TABLE IF NOT EXISTS inbox (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  workspace_id  TEXT,
  type          INTEGER NOT NULL,
  title         TEXT NOT NULL,
  ref           TEXT,
  priority      INTEGER NOT NULL DEFAULT 1,
  status        INTEGER NOT NULL DEFAULT 1,
  data          TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data)),
  version       INTEGER NOT NULL DEFAULT 1,
  created       INTEGER NOT NULL,
  updated       INTEGER NOT NULL,
  deleted_at    INTEGER
);

CREATE TABLE IF NOT EXISTS projection (
  id             TEXT PRIMARY KEY,
  workspace_id   TEXT NOT NULL,
  collection     INTEGER NOT NULL,
  source_id      TEXT NOT NULL,
  type           INTEGER NOT NULL,
  data           TEXT NOT NULL CHECK (json_valid(data)),
  source_version INTEGER NOT NULL,
  expires        INTEGER,
  updated        INTEGER NOT NULL,
  deleted_at     INTEGER,
  UNIQUE (workspace_id, collection, source_id)
);

CREATE TABLE IF NOT EXISTS commands (
  id TEXT PRIMARY KEY, space TEXT NOT NULL, action TEXT NOT NULL, target TEXT,
  data TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(data)), base_version INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', result TEXT CHECK(result IS NULL OR json_valid(result)),
  created INTEGER NOT NULL, updated INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sync (
  key TEXT PRIMARY KEY, value TEXT NOT NULL, updated INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inbox_pending
  ON inbox(user_id, status, priority DESC, created DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projection_workspace
  ON projection(workspace_id, collection, type, updated DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_commands_pending ON commands(status, created);
`;
