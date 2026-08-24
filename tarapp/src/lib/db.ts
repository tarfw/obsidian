import { Database, getDbPath } from "@tursodatabase/sync-react-native";
import { SCHEMA_STATEMENTS } from "./schema";
import { getCurrentUser } from "./auth";
import { getSyncCredential } from "./tar";

const dbConnections: Record<string, Database> = {};
export let cachedSelfId: string | null = null;
let syncReadyResolve: (() => void) | null = null;
export const syncReady = new Promise<void>(r => { syncReadyResolve = r; });

const PARTIAL_SYNC_QUERY = [
  "SELECT id FROM matter WHERE type IN ('product', 'stock')",
  "SELECT id FROM motion WHERE type IN ('sale', 'payment', 'adjust', 'restock')",
  "SELECT source AS id FROM graph",
].join(" UNION ALL ");

export async function getSelfId(): Promise<string> {
  if (cachedSelfId) return cachedSelfId;
  const t0 = Date.now();
  try {
    console.log(`[DB] ${Date.now() - t0}ms — getSelfId: getCurrentUser START`);
    const user = await getCurrentUser();
    console.log(`[DB] ${Date.now() - t0}ms — getSelfId: getCurrentUser done, user: ${user ? user.id : 'null'}`);
    if (user && user.id) {
      cachedSelfId = user.id;
      return user.id;
    }
  } catch (e) {
    console.warn(`[DB] ${Date.now() - t0}ms — getSelfId failed:`, e);
  }
  cachedSelfId = "guest";
  console.log(`[DB] ${Date.now() - t0}ms — getSelfId: fallback to guest`);
  return "guest";
}

type DbListener = (db: Database) => void;
const dbListeners: DbListener[] = [];

export function subscribeDb(listener: DbListener): () => void {
  dbListeners.push(listener);
  return () => {
    const idx = dbListeners.indexOf(listener);
    if (idx !== -1) dbListeners.splice(idx, 1);
  };
}

function notifyDbChange(db: Database) {
  for (const listener of dbListeners) {
    try {
      listener(db);
    } catch (_) {}
  }
}

function createLocalDbConnection(key: string, dbName: string): Database {
  if (!dbConnections[key]) {
    const db = new Database({ path: getDbPath(dbName) });
    dbConnections[key] = db;
    notifyDbChange(db);
  }
  return dbConnections[key];
}

function createSyncDbConnection(key: string, dbName: string, url: string, authToken: string): Database {
  if (dbConnections[key]) {
    if (dbConnections[key].isSync) {
      return dbConnections[key];
    }
    // Close existing local-only connection to allow sync connection to bind to the same database file
    try {
      dbConnections[key].close();
    } catch (_) {}
  }
  const db = new Database({
    path: getDbPath(dbName),
    url,
    authToken,
    partialSyncExperimental: {
      bootstrapStrategy: { kind: 'query', query: PARTIAL_SYNC_QUERY },
      segmentSize: 131072,
      prefetch: true,
    },
  });
  dbConnections[key] = db;
  notifyDbChange(db);
  startPeriodicSync();
  return db;
}

let syncIntervalTimer: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

export function startPeriodicSync(intervalMs: number = 30000): void {
  if (syncIntervalTimer) return;
  syncIntervalTimer = setInterval(() => {
    syncAllActiveDbs().catch(() => {});
  }, intervalMs);
}

export async function syncAllActiveDbs(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const syncConns = Object.values(dbConnections).filter((db) => db && db.isSync);
    for (const db of syncConns) {
      try {
        await db.pull().catch(() => {});
      } catch (e) {
        console.warn('[DB] sync error on active connection:', e);
      }
    }
  } finally {
    isSyncing = false;
  }
}

export function getLocalPrivateDb(userId: string): Database {
  return createLocalDbConnection(userId, `${userId}.db`);
}

export function getUserSyncDb(userId: string, url: string, authToken: string): Database {
  return createSyncDbConnection(userId, `${userId}.db`, url, authToken);
}

export function getGlobalDb(): Database {
  return createLocalDbConnection("global", "global.db");
}

export function getUserDb(): Database {
  const userId = cachedSelfId || "guest";
  // Return sync DB if available, otherwise local
  if (dbConnections[userId]?.isSync) {
    return dbConnections[userId];
  }
  return getLocalPrivateDb(userId);
}

export const getDbClient = getUserDb;

export function scopePrefix(scope: string | null): 'p' | 'w' | 'o' | 'g' {
  if (!scope || scope === 'p' || scope.startsWith('p:')) return 'p';
  if (scope === 'w' || scope.startsWith('w:')) return 'w';
  if (scope === 'o' || scope.startsWith('o:')) return 'o';
  return 'g';
}

function extractScopeId(scope: string): string {
  return scope.includes(':') ? scope.split(':').slice(1).join(':') : scope;
}

export function getWorkspaceDb(workspaceId: string): Database {
  const id = extractScopeId(workspaceId);
  return createLocalDbConnection(id, `${id}.db`);
}

export function getOrderDb(orderId: string): Database {
  const id = extractScopeId(orderId);
  return createLocalDbConnection(id, `${id}.db`);
}

/**
 * Initialize schema and run migrations for any database connection.
 */
export async function ensureDbSchema(db: Database, label: string): Promise<void> {
  await db.connect();
  await migrateMemoryTable(db, label);
  for (const sql of SCHEMA_STATEMENTS) {
    try { await db.exec(sql); } catch (_) {}
  }
}

export function routeDbForEntity(_type: string | null, scope: string | null): Database {
  const selfId = cachedSelfId || "guest";
  const prefix = scopePrefix(scope);

  if (prefix === 'p') {
    return getLocalPrivateDb(selfId);
  }

  if (prefix === 'g') {
    return getGlobalDb();
  }

  if (prefix === 'w' && scope) {
    const subdomain = scope.replace('w:', '');
    if (dbConnections[subdomain]) {
      return dbConnections[subdomain];
    }
    return getWorkspaceDb(subdomain);
  }

  if (prefix === 'o' && scope) {
    const subdomain = scope.replace('o:', '').split('_')[0];
    if (dbConnections[subdomain]) {
      return dbConnections[subdomain];
    }
    return getWorkspaceDb(subdomain);
  }

  return getLocalPrivateDb(selfId);
}

/**
 * Return a database for a scope, ensuring it is connected and has the schema.
 */
export async function getPreparedDbForScope(scope: string | null): Promise<Database> {
  const db = routeDbForEntity('form', scope);
  const label = scope || 'p';
  await ensureDbSchema(db, label);
  return db;
}

/**
 * Run a sequence of database operations inside a single SQLite transaction.
 * Automatically COMMIT on success, ROLLBACK on failure.
 */
export async function withTransaction<T>(db: Database, fn: () => Promise<T>): Promise<T> {
  await db.exec('BEGIN');
  try {
    const result = await fn();
    await db.exec('COMMIT');
    return result;
  } catch (e) {
    await db.exec('ROLLBACK').catch(() => {});
    throw e;
  }
}

/**
 * Handles database schema migrations for tables whose layout has changed
 * in the final unified system architecture (memory, graph, and deletion of action).
 */
async function migrateMemoryTable(db: Database, label: string) {
  try {
    // Drop old tables to ensure a clean slate aligned with dbrules.md
    await db.exec(`DROP TABLE IF EXISTS form`);
    await db.exec(`DROP TABLE IF EXISTS tasks`);
    await db.exec(`DROP TABLE IF EXISTS memory`);
  } catch (_) {}
}

export async function switchUser(userId: string): Promise<Database> {
  const t0 = Date.now();
  console.log(`[DB] switchUser START: switching session to user = ${userId}`);
  cachedSelfId = userId;

  // Personal drafts remain device-local; the app never receives database credentials.
  const db = getLocalPrivateDb(userId);
  try {
    await db.connect();
    await migrateMemoryTable(db, userId);
    for (const sql of SCHEMA_STATEMENTS) {
      try { await db.exec(sql); } catch (_) {}
    }
  } catch (e) {
    console.error(`[DB] switchUser DB init FAILED:`, e);
    throw e;
  }

  syncReadyResolve?.();
  console.log(`[DB] switchUser DONE: local switched in ${Date.now() - t0}ms`);
  return db;
}

export async function closeConnection(key: string): Promise<void> {
  if (dbConnections[key]) {
    try {
      console.log(`[DB] closing connection for key: ${key}`);
      dbConnections[key].close();
      delete dbConnections[key];
      // Wait 150ms for SQLite native layer to fully release the file lock
      await new Promise(resolve => setTimeout(resolve, 150));
      console.log(`[DB] connection closed and released for key: ${key}`);
    } catch (e) {
      console.warn(`[DB] failed to close connection for key: ${key}`, e);
    }
  }
}

export function getWorkspaceSyncDb(subdomain: string, url: string, authToken: string): Database {
  // Keep the canonical read replica separate from pre-cutover local workspace files.
  return createSyncDbConnection(subdomain, `${subdomain}.tenant-v1.db`, url, authToken);
}

export async function initWorkspaceSync(subdomain: string): Promise<void> {
  const t0 = Date.now();
  if (dbConnections[subdomain] && dbConnections[subdomain].isSync) {
    console.log(`[DB] initWorkspaceSync: connection already exists and is sync-enabled for ${subdomain}, reuse it`);
    syncReadyResolve?.();
    return;
  }
  console.log(`[DB] initWorkspaceSync START for subdomain = ${subdomain}`);

  try {
    const credential = await getSyncCredential(`w:${subdomain}`);
    const db = getWorkspaceSyncDb(subdomain, credential.url, credential.token);
    console.log(`[DB] initWorkspaceSync: connecting read replica...`);
    await db.connect();
    await db.pull();
    console.log(`[DB] initWorkspaceSync: DONE in ${Date.now() - t0}ms`);
    syncReadyResolve?.();
  } catch (e) {
    console.warn(`[DB] initWorkspaceSync FAILED:`, e);
  }
}

export async function pullSync(userId: string): Promise<void> {
  const t0 = Date.now();
  console.log(`[DB] pullSync START for user = ${userId}`);
  try {
    // Wait for sync DB to be ready (with timeout)
    await Promise.race([syncReady, new Promise(r => setTimeout(r, 10000))]);

    const db = getUserDb();
    if (!db.isSync) {
      console.log(`[DB] pullSync: SKIP — sync DB not ready`);
      return;
    }
    console.log(`[DB] pullSync: db type = sync`);

    console.log(`[DB] pullSync: calling db.pull()...`);
    const changed = await db.pull();
    console.log(`[DB] pullSync: db.pull() success, changed = ${changed}`);
    console.log(`[DB] pullSync: DONE in ${Date.now() - t0}ms`);
  } catch (e) {
    console.warn(`[DB] pullSync FAILED in ${Date.now() - t0}ms:`, e);
  }
}

export async function initDb() {
  const t0 = Date.now();
  console.log(`[DB] ${Date.now() - t0}ms — initDb START`);

  const userId = await getSelfId();
  console.log(`[DB] ${Date.now() - t0}ms — initDb userId = ${userId}, cachedSelfId = ${cachedSelfId}`);

  if (userId === "guest") {
    console.log(`[DB] ${Date.now() - t0}ms — initDb SKIP (no profile)`);
    return;
  }

  await switchUser(userId);
  console.log(`[DB] ${Date.now() - t0}ms — initDb DONE, cachedSelfId = ${cachedSelfId}`);
}
