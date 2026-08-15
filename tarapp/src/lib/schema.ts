/**
 * Workspace and Personal DB Schemas (plan6.md architecture).
 *
 * Workspace DB:
 *   matter   — current state (stock, orders, staff, customers, locations) with integer type/status
 *   motion   — immutable event log with integer type, idempotency key (idem), and soft delete
 *   graph    — structural relationships with integer rel type
 *
 * Personal DB:
 *   matter   — personal items (type=13 expense, 1 contact, 12 goal, 11 note, 7 asset)
 *   motion   — personal events (type=201 expense_log, 202 reminder, etc.)
 *   graph    — personal relations (src=user rel=12 member_of tgt=workspace)
 *   inbox    — unified actionable tasks & notifications across all workspaces
 */

export const WORKSPACE_SCHEMA_STATEMENTS = [
  // matter: current state — what EXISTS right now (with live price and stock)
  `CREATE TABLE IF NOT EXISTS matter (
    id         TEXT PRIMARY KEY,
    type       INTEGER NOT NULL,
    title      TEXT NOT NULL,
    ref        TEXT,
    price      REAL,
    qty        REAL,
    min_qty    REAL,
    status     INTEGER DEFAULT 1,
    data       TEXT,
    role       TEXT,
    scope      TEXT NOT NULL,
    at         INTEGER DEFAULT (unixepoch()),
    updated    INTEGER DEFAULT (unixepoch()),
    deleted_at INTEGER DEFAULT NULL
  )`,

  // motion: immutable user-visible event log with idempotency constraint
  `CREATE TABLE IF NOT EXISTS motion (
    id         TEXT PRIMARY KEY,
    type       INTEGER NOT NULL,
    ref        TEXT,
    data       TEXT,
    by         TEXT,
    at         INTEGER DEFAULT (unixepoch()),
    scope      TEXT NOT NULL,
    idem       TEXT UNIQUE,
    deleted_at INTEGER DEFAULT NULL
  )`,

  // graph: structural relationships (transactional links live in motion data JSON)
  `CREATE TABLE IF NOT EXISTS graph (
    src        TEXT NOT NULL,
    rel        INTEGER NOT NULL,
    tgt        TEXT NOT NULL,
    scope      TEXT NOT NULL,
    time       INTEGER DEFAULT (unixepoch()),
    deleted_at INTEGER DEFAULT NULL,
    PRIMARY KEY (src, rel, tgt)
  )`,

  // Composite and Partial Indexes (Rule 3 & 4)
  `CREATE INDEX IF NOT EXISTS idx_matter ON matter (type, status) WHERE deleted_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_matter_ref ON matter (ref) WHERE deleted_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_motion ON motion (type, at DESC) WHERE deleted_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_graph_src ON graph (src, rel) WHERE deleted_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_graph_tgt ON graph (tgt, rel) WHERE deleted_at IS NULL`,
];

export const PERSONAL_SCHEMA_STATEMENTS = [
  ...WORKSPACE_SCHEMA_STATEMENTS,

  // inbox: ALL tasks and notifications unified across personal and all joined workspaces
  `CREATE TABLE IF NOT EXISTS inbox (
    id             TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL,
    workspace_id   TEXT,
    workspace_name TEXT,
    type           INTEGER NOT NULL,
    title          TEXT NOT NULL,
    ref            TEXT,
    priority       INTEGER DEFAULT 1,
    due            INTEGER,
    status         INTEGER DEFAULT 1,
    data           TEXT,
    created_at     INTEGER DEFAULT (unixepoch()),
    deleted_at     INTEGER DEFAULT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_inbox ON inbox (user_id, status, created_at DESC) WHERE deleted_at IS NULL`,
];

// Personal DB is standard local DB replica on device
export const SCHEMA_STATEMENTS = PERSONAL_SCHEMA_STATEMENTS;
