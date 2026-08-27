import { Database, getDbPath } from "@tursodatabase/sync-react-native";
import { SCHEMA_STATEMENTS } from "./schema";
import { getCurrentUser } from "./auth";
import { tar } from "./tar";

const dbConnections: Record<string, Database> = {};
const syncEndpoints: Record<string, { url: string | null }> = {};
export let cachedSelfId: string | null = null;
let activeSyncPullPromise: Promise<void> | null = null;

export async function getSelfId(): Promise<string> {
  if (cachedSelfId) return cachedSelfId;
  const t0 = Date.now();
  try {
    const user = await getCurrentUser();
    if (user && user.id) {
      cachedSelfId = user.id;
      return user.id;
    }
  } catch (e) {
    console.warn(`[DB] getSelfId failed:`, e);
  }
  cachedSelfId = "guest";
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

/** Local-only mutable state: drafts, preferences, and metadata. */
export function getDeviceDb(userId = cachedSelfId || 'guest'): Database {
  return createLocalDbConnection(`device:${userId}`, `${userId}_device.db`);
}

export function getGlobalDb(): Database {
  return createLocalDbConnection("global", "global.db");
}

export function getUserDb(): Database {
  const userId = cachedSelfId || "guest";
  if (dbConnections[userId]) {
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
 * Initialize schema and run migrations for local SQLite database.
 */
export async function ensureDbSchema(db: Database, label: string): Promise<void> {
  await db.connect();
  await migrateLegacyTables(db);
  if ((db as any).isSync) return;
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
    throw new Error('Workspace mutations must pass through the authoritative Tarai gateway.');
  }
  if (prefix === 'o' && scope) {
    throw new Error('Order mutations must pass through the authoritative Tarai gateway.');
  }
  return getLocalPrivateDb(selfId);
}

export async function getPreparedDbForScope(scope: string | null): Promise<Database> {
  const db = routeDbForEntity('matter', scope);
  await ensureDbSchema(db, scope || 'p');
  return db;
}

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

async function migrateLegacyTables(db: Database) {
  try {
    await db.exec(`DROP TABLE IF EXISTS form`);
    await db.exec(`DROP TABLE IF EXISTS tasks`);
    await db.exec(`DROP TABLE IF EXISTS memory`);
  } catch (_) {}
}

async function refreshSyncEndpoint(userId: string): Promise<boolean> {
  try {
    const syncInfo = await tar.getSyncBootstrap();
    if (!syncInfo?.url) return false;
    syncEndpoints[userId] = { url: syncInfo.url };
    return true;
  } catch {
    return false;
  }
}

/** Pull the current user's Personal Sync DB into its local-first SQLite file. */
export async function syncPull(): Promise<void> {
  if (activeSyncPullPromise) return activeSyncPullPromise;

  activeSyncPullPromise = (async () => {
    try {
      const userId = cachedSelfId;
      if (userId) await refreshSyncEndpoint(userId);
      const db = getUserDb();
      if (!(db as any).isSync) return;
      await db.pull();
    } catch (err) {
      console.warn('[Sync] Pull failed:', err);
    } finally {
      activeSyncPullPromise = null;
    }
  })();

  return activeSyncPullPromise;
}

/**
 * Compatibility hook for optimistic UI helpers. Personal Sync is read-only for
 * workspace projections, so authoritative writes continue through Tarai.
 */
export function scheduleSyncPush(): void {}

export async function switchUser(userId: string): Promise<Database> {
  console.log(`[DB] switchUser: session for user = ${userId}`);
  cachedSelfId = userId;

  let db: Database;
  try {
    syncEndpoints[userId] = { url: null };
    await refreshSyncEndpoint(userId);
    db = new Database({
      path: getDbPath(`${userId}_sync.db`),
      // Returning null keeps an existing local database available offline.
      url: () => syncEndpoints[userId]?.url ?? null,
      // The native SDK invokes this provider per sync request, so the client
      // does not persist a long-lived database credential.
      authToken: async () => {
        const syncInfo = await tar.getSyncBootstrap();
        if (!syncInfo?.token) throw new Error('Personal Sync token unavailable');
        syncEndpoints[userId] = { url: syncInfo.url };
        return syncInfo.token;
      },
    });
    (db as any).isSync = true;
    dbConnections[userId] = db;
    notifyDbChange(db);
  } catch {
    db = getLocalPrivateDb(userId);
  }

  try {
    await db.connect();
    await migrateLegacyTables(db);
    if (!(db as any).isSync) {
      for (const sql of SCHEMA_STATEMENTS) {
        try { await db.exec(sql); } catch (_) {}
      }
    }
    // Refresh the selected local operational projections.
    syncPull().catch(() => {});
  } catch (e) {
    console.error(`[DB] switchUser DB init failed:`, e);
    throw e;
  }

  return db;
}

export async function closeConnection(key: string): Promise<void> {
  if (dbConnections[key]) {
    try {
      dbConnections[key].close();
      delete dbConnections[key];
      delete syncEndpoints[key];
      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (e) {
      console.warn(`[DB] failed to close connection for key: ${key}`, e);
    }
  }
}

export async function logoutAndWipeDb(): Promise<void> {
  const currentKey = cachedSelfId || 'guest';
  await closeConnection(currentKey);
  await closeConnection(`device:${currentKey}`);
  cachedSelfId = null;
}

export async function initDb() {
  const userId = await getSelfId();
  if (userId === "guest") return;
  await switchUser(userId);
}
