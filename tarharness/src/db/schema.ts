export const WORKSPACE_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS definitions (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('flow', 'record_type', 'bot', 'kit')),
    name TEXT NOT NULL, version INTEGER NOT NULL, state TEXT NOT NULL,
    data TEXT NOT NULL CHECK(json_valid(data)), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, state TEXT NOT NULL,
    data TEXT NOT NULL CHECK(json_valid(data)),
    owner TEXT, assignee TEXT, due INTEGER, version INTEGER NOT NULL,
    created INTEGER NOT NULL, updated INTEGER NOT NULL, archived INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY, flow_id TEXT NOT NULL, flow_version INTEGER NOT NULL, occurrence TEXT NOT NULL,
    record_id TEXT, state TEXT NOT NULL, action_id TEXT, context TEXT NOT NULL CHECK(json_valid(context)),
    version INTEGER NOT NULL, started_at INTEGER, finished_at INTEGER,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
    UNIQUE(flow_id, occurrence)
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL, run_id TEXT, record_id TEXT, action_id TEXT,
    state TEXT NOT NULL, actor_id TEXT, input_hash TEXT NOT NULL,
    idempotency_key TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)),
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
    UNIQUE(idempotency_key)
  )`,
  'CREATE INDEX IF NOT EXISTS records_by_type ON records(type, state, updated DESC) WHERE archived IS NULL',
  'CREATE INDEX IF NOT EXISTS tasks_by_assignee ON records(assignee, state, updated DESC) WHERE type = \'task\' AND archived IS NULL',
  'CREATE INDEX IF NOT EXISTS events_by_run ON events(run_id, created_at DESC)',
];
