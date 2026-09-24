const COMMERCE_INDEXES = [
  "CREATE INDEX IF NOT EXISTS pos_payment_day ON records(json_extract(data,'$.businessDate')) WHERE type='pos.payment'",
  "CREATE INDEX IF NOT EXISTS pos_order_day ON records(json_extract(data,'$.businessDate')) WHERE type='pos.order'",
  "CREATE INDEX IF NOT EXISTS pos_payment_register ON records(json_extract(data,'$.registerId')) WHERE type='pos.payment'",
  "CREATE INDEX IF NOT EXISTS pos_customer_orders ON records(json_extract(data,'$.customerId')) WHERE type='pos.order'",
  "CREATE UNIQUE INDEX IF NOT EXISTS pos_unique_reference ON records(json_extract(data,'$.reference')) WHERE type='pos.payment' AND json_extract(data,'$.reference') IS NOT NULL",
  "CREATE UNIQUE INDEX IF NOT EXISTS pos_unique_barcode ON records(json_extract(data,'$.barcode')) WHERE type='pos.product' AND json_extract(data,'$.barcode')!='' AND archived IS NULL",
  "CREATE UNIQUE INDEX IF NOT EXISTS pos_unique_sku ON records(json_extract(data,'$.sku')) WHERE type='pos.product' AND json_extract(data,'$.sku')!='' AND archived IS NULL",
  "CREATE UNIQUE INDEX IF NOT EXISTS pos_one_open_register ON records(type) WHERE type='pos.register' AND state='open'",
  "CREATE UNIQUE INDEX IF NOT EXISTS pos_unique_draft_key ON records(owner,json_extract(data,'$.draftKey')) WHERE type='pos.order' AND json_extract(data,'$.draftKey') IS NOT NULL",
];

export const WORKSPACE_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS definitions (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('flow', 'record_type')),
    name TEXT NOT NULL, version INTEGER NOT NULL, state TEXT NOT NULL,
    data TEXT NOT NULL CHECK(json_valid(data)), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS editions (
    id TEXT PRIMARY KEY, definition TEXT NOT NULL, version INTEGER NOT NULL,
    name TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)), created INTEGER NOT NULL,
    UNIQUE(definition, version)
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
  `CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY, source TEXT NOT NULL, target TEXT NOT NULL, role TEXT NOT NULL,
    since INTEGER, until INTEGER, data TEXT NOT NULL CHECK(json_valid(data)),
    actor TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL,
    FOREIGN KEY(source) REFERENCES records(id), FOREIGN KEY(target) REFERENCES records(id)
  )`,
  `CREATE TABLE IF NOT EXISTS turns (
    id TEXT PRIMARY KEY, hash TEXT NOT NULL, state TEXT NOT NULL, owner TEXT NOT NULL,
    result TEXT CHECK(result IS NULL OR json_valid(result)),
    created INTEGER NOT NULL, updated INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS steps (
    id TEXT PRIMARY KEY, run TEXT NOT NULL REFERENCES runs(id),
    action TEXT NOT NULL, occurrence INTEGER NOT NULL,
    state TEXT NOT NULL CHECK(state IN ('accepted','waiting','blocked','failed')),
    input TEXT NOT NULL CHECK(json_valid(input)),
    output TEXT CHECK(output IS NULL OR json_valid(output)),
    version INTEGER NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL,
    UNIQUE(run, occurrence)
  )`,
  `CREATE TABLE IF NOT EXISTS consents (
    id TEXT PRIMARY KEY, contact TEXT NOT NULL, channel TEXT NOT NULL,
    purpose TEXT NOT NULL, state TEXT NOT NULL, source TEXT NOT NULL,
    actor TEXT NOT NULL, created INTEGER NOT NULL,
    FOREIGN KEY(contact) REFERENCES records(id)
  )`,
  'CREATE INDEX IF NOT EXISTS source ON links(source, until)',
  'CREATE INDEX IF NOT EXISTS target ON links(target, until)',
  'CREATE UNIQUE INDEX IF NOT EXISTS active ON links(source, target, role) WHERE until IS NULL',
  'CREATE INDEX IF NOT EXISTS records_by_type ON records(type, state, updated DESC) WHERE archived IS NULL',
  'CREATE INDEX IF NOT EXISTS contacts ON records(type, title COLLATE NOCASE, id) WHERE archived IS NULL',
  'CREATE INDEX IF NOT EXISTS consent ON consents(contact, created DESC)',
  'CREATE INDEX IF NOT EXISTS tasks_by_assignee ON records(assignee, state, updated DESC) WHERE type = \'task\' AND archived IS NULL',
  'CREATE INDEX IF NOT EXISTS events_by_run ON events(run_id, created_at DESC)',
  ...COMMERCE_INDEXES,
];

export const WORKSPACE_PATCHES = [
  { id: 'consents', statements: [
    WORKSPACE_SCHEMA.find((statement) => statement.includes('CREATE TABLE IF NOT EXISTS consents'))!,
    'CREATE INDEX IF NOT EXISTS consent ON consents(contact, created DESC)',
  ] },
  { id: 'editions', statements: [
    WORKSPACE_SCHEMA.find((statement) => statement.includes('CREATE TABLE IF NOT EXISTS editions'))!,
    "INSERT OR IGNORE INTO editions(id,definition,version,name,data,created) SELECT id||':'||version,id,version,name,data,updated_at FROM definitions WHERE kind='flow'",
  ] },
  { id: 'recipes', statements: [
    `UPDATE definitions
      SET data=json_set(json_remove(json_set(data,'$.source','book'),'$.botId','$.templateId'),'$.actions',(
        SELECT json_group_array(json_object('id',json_extract(step.value,'$.id'),'version',1,'auto',0,'input',json('{}')))
        FROM json_each(definitions.data,'$.actions') AS step
      )), version=version+1, updated_at=CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)
      WHERE kind='flow' AND state='published' AND json_valid(data)
        AND (json_extract(data,'$.botId') IS NOT NULL OR json_extract(data,'$.source') IN ('directory','custom'))
        AND json_type(data,'$.actions')='array'
        AND json_array_length(data,'$.actions') BETWEEN 1 AND 20
        AND NOT EXISTS (
          SELECT 1 FROM json_each(definitions.data,'$.actions') AS step
          WHERE json_extract(step.value,'$.id') NOT IN ('record.create','contact.create','organization.create','task.create')
            OR COALESCE(json_extract(step.value,'$.auto'),0)<>0
        )`,
    `INSERT OR IGNORE INTO editions(id,definition,version,name,data,created)
      SELECT id||':'||version,id,version,name,data,updated_at FROM definitions
      WHERE kind='flow' AND json_extract(data,'$.source')='book' AND version>1`,
    `UPDATE definitions SET state='archived',updated_at=CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)
      WHERE kind='flow' AND state='published' AND json_valid(data)
        AND (json_extract(data,'$.botId') IS NOT NULL OR json_extract(data,'$.source') IN ('directory','custom'))`,
    `UPDATE definitions SET state='archived',updated_at=CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)
      WHERE kind IN ('bot','kit') AND state<>'archived'`,
  ] },
  { id: 'commerce', statements: COMMERCE_INDEXES },
  { id: 'turns', statements: [WORKSPACE_SCHEMA.find((statement) => statement.includes('CREATE TABLE IF NOT EXISTS turns'))!] },
  { id: 'steps', statements: [WORKSPACE_SCHEMA.find((statement) => statement.includes('CREATE TABLE IF NOT EXISTS steps'))!] },
  { id: 'contacts', statements: ['CREATE INDEX IF NOT EXISTS contacts ON records(type, title COLLATE NOCASE, id) WHERE archived IS NULL'] },
  { id: 'links', statements: [
    WORKSPACE_SCHEMA.find((statement) => statement.includes('CREATE TABLE IF NOT EXISTS links'))!,
    'CREATE INDEX IF NOT EXISTS source ON links(source, until)',
    'CREATE INDEX IF NOT EXISTS target ON links(target, until)',
    'CREATE UNIQUE INDEX IF NOT EXISTS active ON links(source, target, role) WHERE until IS NULL',
  ] },
];
