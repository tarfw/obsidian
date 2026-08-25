-- TARAI Database Schema (Turso / LibSQL - matter.md §5)
-- Canonical truth for matter, motion, graph, request, routine, job, approval, outbox

CREATE TABLE IF NOT EXISTS matter (
  id TEXT PRIMARY KEY,
  type INTEGER NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  state INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_matter_type_state ON matter(type, state) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_matter_updated ON matter(updated DESC);

CREATE TABLE IF NOT EXISTS motion (
  id TEXT PRIMARY KEY,
  type INTEGER NOT NULL,
  actor TEXT NOT NULL,
  ref TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  idem TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  created INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_motion_ref ON motion(ref, created DESC);
CREATE INDEX IF NOT EXISTS idx_motion_type ON motion(type, created DESC);
CREATE INDEX IF NOT EXISTS idx_motion_created ON motion(created DESC);

CREATE TABLE IF NOT EXISTS graph (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  kind INTEGER NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  deleted_at INTEGER,
  UNIQUE(source, target, kind)
);

CREATE INDEX IF NOT EXISTS idx_graph_source ON graph(source, kind) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_graph_target ON graph(target, kind) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS request (
  idem TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 1,
  response TEXT,
  created INTEGER NOT NULL,
  completed INTEGER
);

CREATE TABLE IF NOT EXISTS routine (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cron TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  state INTEGER NOT NULL DEFAULT 1,
  payload TEXT NOT NULL DEFAULT '{}',
  lease_token TEXT,
  leased_at INTEGER,
  next_run INTEGER NOT NULL,
  last_run INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_routine_next_run ON routine(next_run) WHERE state = 1 AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS job (
  id TEXT PRIMARY KEY,
  routine_id TEXT REFERENCES routine(id),
  state INTEGER NOT NULL DEFAULT 1,
  status INTEGER NOT NULL DEFAULT 1,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt INTEGER NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  result TEXT,
  lease_token TEXT,
  leased_at INTEGER,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_job_status ON job(status, next_attempt) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS approval (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  required_role TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  payload_hash TEXT NOT NULL,
  policy_version TEXT NOT NULL DEFAULT '1.0',
  status INTEGER NOT NULL DEFAULT 1,
  expires INTEGER NOT NULL,
  decided_by TEXT,
  decision_reason TEXT,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_approval_status ON approval(status, expires) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  currency TEXT DEFAULT 'USD',
  settings TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY,
  kind INTEGER NOT NULL,
  ref TEXT,
  destination TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  idem TEXT NOT NULL UNIQUE,
  status INTEGER NOT NULL DEFAULT 1,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt INTEGER NOT NULL,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox(status, next_attempt) WHERE deleted_at IS NULL;




