import { Database, getDbPath } from "@tursodatabase/sync-react-native";
import { SCHEMA_STATEMENTS } from "./schema";
import { getCurrentUser } from "./auth";

const dbConnections: Record<string, Database> = {};
export let cachedSelfId: string | null = null;

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

export function getLocalPrivateDb(userId: string): Database {
  return createLocalDbConnection(userId, `${userId}.db`);
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
    throw new Error('Workspace data is available only through the scoped Tarai API.');
  }

  if (prefix === 'o' && scope) {
    throw new Error('Order data is available only through the scoped Tarai API.');
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
