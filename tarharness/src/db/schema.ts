export const WORKSPACE_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS definitions (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('flow', 'record_type', 'bot', 'kit')),
    name TEXT NOT NULL, version INTEGER NOT NULL, state TEXT NOT NULL,
    data TEXT NOT NULL CHECK(json_valid(data)), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, state TEXT NOT NULL,
    data TEXT NOT NULL CHECK(json_valid(data)), source TEXT, external_ref TEXT,
    owner_id TEXT, assignee_id TEXT, version INTEGER NOT NULL,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, archived_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY, source_id TEXT NOT NULL, target_id TEXT NOT NULL, relation TEXT NOT NULL,
    data TEXT NOT NULL CHECK(json_valid(data)), created_at INTEGER NOT NULL, archived_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY, flow_id TEXT NOT NULL, flow_version INTEGER NOT NULL, occurrence TEXT NOT NULL,
    record_id TEXT, state TEXT NOT NULL, action_id TEXT, context TEXT NOT NULL CHECK(json_valid(context)),
    retry_count INTEGER NOT NULL DEFAULT 0, due_at INTEGER, version INTEGER NOT NULL,
    lease_owner TEXT, lease_until INTEGER, started_at INTEGER, finished_at INTEGER,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
    UNIQUE(flow_id, occurrence)
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL, run_id TEXT, record_id TEXT, action_id TEXT,
    state TEXT NOT NULL, actor_id TEXT, target TEXT, input_hash TEXT NOT NULL,
    idempotency_key TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)),
    due_at INTEGER, attempts INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
    UNIQUE(idempotency_key)
  )`,
  `CREATE TABLE IF NOT EXISTS outbox (
    event_id TEXT PRIMARY KEY REFERENCES events(id), destination TEXT NOT NULL,
    payload TEXT NOT NULL CHECK(json_valid(payload)), state TEXT NOT NULL, provider_ref TEXT,
    attempts INTEGER NOT NULL DEFAULT 0, due_at INTEGER NOT NULL, lease_owner TEXT, lease_until INTEGER,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS records_by_type ON records(type, state, updated_at DESC) WHERE archived_at IS NULL',
  'CREATE INDEX IF NOT EXISTS tasks_by_assignee ON records(assignee_id, state, updated_at DESC) WHERE type = \'task\' AND archived_at IS NULL',
  'CREATE INDEX IF NOT EXISTS runs_due ON runs(state, due_at) WHERE state IN (\'ready\', \'waiting\')',
  'CREATE INDEX IF NOT EXISTS events_by_run ON events(run_id, created_at DESC)',
  'CREATE INDEX IF NOT EXISTS outbox_due ON outbox(state, due_at) WHERE state IN (\'pending\', \'retry\')',
];
