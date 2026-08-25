/**
 * Canonical Tenant Database Schemas (matter.md §5).
 *
 * All records use integer type codes, integer timestamps (Unix ms UTC),
 * and validated JSON payloads.
 */

export const BASE_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS matter (
    id          TEXT PRIMARY KEY,
    type        INTEGER NOT NULL,
    data        TEXT NOT NULL CHECK (json_valid(data)),
    state       INTEGER NOT NULL DEFAULT 1,
    version     INTEGER NOT NULL DEFAULT 1,
    created     INTEGER NOT NULL,
    updated     INTEGER NOT NULL,
    deleted_at  INTEGER
  )`,

  `CREATE TABLE IF NOT EXISTS motion (
    id           TEXT PRIMARY KEY,
    type         INTEGER NOT NULL,
    actor        TEXT NOT NULL,
    ref          TEXT,
    data         TEXT NOT NULL CHECK (json_valid(data)),
    idem         TEXT NOT NULL UNIQUE,
    payload_hash TEXT NOT NULL,
    created      INTEGER NOT NULL,
    deleted_at   INTEGER
  )`,

  `CREATE TABLE IF NOT EXISTS graph (
    id          TEXT PRIMARY KEY,
    source      TEXT NOT NULL,
    target      TEXT NOT NULL,
    kind        INTEGER NOT NULL,
    data        TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data)),
    version     INTEGER NOT NULL DEFAULT 1,
    created     INTEGER NOT NULL,
    updated     INTEGER NOT NULL,
    deleted_at  INTEGER
  )`,

  `CREATE INDEX IF NOT EXISTS idx_matter_live
    ON matter(type, state, updated DESC) WHERE deleted_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_motion_type
    ON motion(type, created DESC, id) WHERE deleted_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_motion_ref
    ON motion(ref, created DESC, id) WHERE deleted_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_graph_source
    ON graph(source, kind) WHERE deleted_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_graph_target
    ON graph(target, kind) WHERE deleted_at IS NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS unq_graph_live_edge
    ON graph(source, target, kind) WHERE deleted_at IS NULL`,
];

export const PERSONAL_SCHEMA_STATEMENTS = [
  ...BASE_SCHEMA_STATEMENTS,

  `CREATE TABLE IF NOT EXISTS inbox (
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
  )`,

  `CREATE TABLE IF NOT EXISTS projection (
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
  )`,

  `CREATE INDEX IF NOT EXISTS idx_inbox_pending
    ON inbox(user_id, status, priority DESC, created DESC)
    WHERE deleted_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_projection_workspace
    ON projection(workspace_id, collection, type, updated DESC)
    WHERE deleted_at IS NULL`,
];

export const SCHEMA_STATEMENTS = PERSONAL_SCHEMA_STATEMENTS;

