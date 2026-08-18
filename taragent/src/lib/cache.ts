/**
 * 3-Tier Edge Cache & Pre-LLM Guardrail Layer (genuiteam.md §6).
 *
 * Tier 1: Worker RAM (LRU Cache — Top 5,000 Active Members, 0.01ms)
 * Tier 2: Cloudflare Workers KV / Edge Cache API (1 - 2ms)
 * Tier 3: Backend Persistent SQLite (D1 / Turso) & OKF (5 - 10ms)
 */

export interface MemberRecord {
  userId?: string;
  name?: string;
  email?: string;
  handle?: string;
  role: string;
  status: 'active' | 'former' | 'pending';
  permissions: string[];
  scope: string;
  timestamp: number;
}

// ── TIER 1: In-Memory LRU RAM Cache (Worker Isolate) ───────────────────
const MAX_TIER1_ENTRIES = 5000;
const TIER1_RAM_CACHE = new Map<string, { record: MemberRecord; expiresAt: number }>();

function buildCacheKey(scope: string, identifier: string): string {
  return `member:${scope.toLowerCase()}:${identifier.toLowerCase().trim()}`;
}

export function getTier1Member(scope: string, identifier: string): MemberRecord | null {
  const key = buildCacheKey(scope, identifier);
  const entry = TIER1_RAM_CACHE.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    TIER1_RAM_CACHE.delete(key);
    return null;
  }

  // LRU bump: delete and re-insert to keep hot entries at the end
  TIER1_RAM_CACHE.delete(key);
  TIER1_RAM_CACHE.set(key, entry);
  return entry.record;
}

export function setTier1Member(scope: string, identifier: string, record: MemberRecord, ttlSeconds = 600): void {
  const key = buildCacheKey(scope, identifier);

  // Evict oldest if capacity reached
  if (TIER1_RAM_CACHE.size >= MAX_TIER1_ENTRIES) {
    const oldestKey = TIER1_RAM_CACHE.keys().next().value;
    if (oldestKey) {
      TIER1_RAM_CACHE.delete(oldestKey);
    }
  }

  TIER1_RAM_CACHE.set(key, {
    record,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function invalidateTier1Member(scope: string, identifier: string): void {
  const key = buildCacheKey(scope, identifier);
  TIER1_RAM_CACHE.delete(key);
}

// ── TIER 2 & TIER 3: Unified Member Resolver ───────────────────────────

/**
 * Resolves a member across Tier 1 RAM -> Tier 2 KV -> Tier 3 D1 / OKF in < 2ms.
 */
export async function getCachedMember(
  env: any,
  scope: string,
  handleOrEmailOrId: string
): Promise<MemberRecord | null> {
  const cleanId = (handleOrEmailOrId || '').toLowerCase().trim();
  if (!cleanId) return null;

  // 1. Check Tier 1 Worker RAM LRU (0.01ms)
  const tier1 = getTier1Member(scope, cleanId);
  if (tier1) {
    return tier1;
  }

  // 2. Check Tier 2 Cloudflare Workers KV (1 - 2ms)
  const kvKey = buildCacheKey(scope, cleanId);
  if (env?.STOREFRONT_CACHE) {
    try {
      const kvVal = await env.STOREFRONT_CACHE.get(kvKey);
      if (kvVal) {
        const parsed = JSON.parse(kvVal) as MemberRecord;
        // Warm Tier 1 RAM
        setTier1Member(scope, cleanId, parsed, 300);
        return parsed;
      }
    } catch (e) {
      console.warn('[cache] KV read warning:', e);
    }
  }

  // 3. Fallback to Tier 3: D1 SQLite Database (5 - 10ms)
  if (env?.DB) {
    try {
      const row = (await env.DB.prepare(`
        SELECT user_id, email, handle, role, status, permissions, scope
        FROM members
        WHERE (scope = ? OR scope = 'w:' || ?)
          AND (
            LOWER(handle) = ?
            OR LOWER(handle) = '@' || ?
            OR LOWER(email) = ?
            OR user_id = ?
          )
        LIMIT 1
      `).bind(
        scope,
        scope.replace(/^w:/, ''),
        cleanId.replace(/^@/, ''),
        cleanId.replace(/^@/, ''),
        cleanId,
        cleanId
      ).first()) as any;

      if (row) {
        let perms: string[] = [];
        if (row.permissions) {
          try { perms = JSON.parse(row.permissions); } catch {}
        }
        const record: MemberRecord = {
          userId: row.user_id,
          email: row.email,
          handle: row.handle,
          role: row.role || 'staff',
          status: (row.status as any) || 'active',
          permissions: perms,
          scope: row.scope || scope,
          timestamp: Date.now(),
        };

        // Cache in Tier 1 and Tier 2
        setTier1Member(scope, cleanId, record, 600);
        if (env?.STOREFRONT_CACHE) {
          env.STOREFRONT_CACHE.put(kvKey, JSON.stringify(record), { expirationTtl: 600 }).catch(() => {});
        }
        return record;
      }
    } catch (err) {
      console.warn('[cache] D1 member query error:', err);
    }
  }

  return null;
}

/**
 * Sets a member into Tier 1 and Tier 2 cache.
 */
export function setCachedMember(
  env: any,
  scope: string,
  identifier: string,
  record: MemberRecord,
  ttlSeconds = 600
): void {
  const cleanId = identifier.toLowerCase().trim();
  if (!cleanId) return;

  setTier1Member(scope, cleanId, record, ttlSeconds);

  if (env?.STOREFRONT_CACHE) {
    const kvKey = buildCacheKey(scope, cleanId);
    env.STOREFRONT_CACHE.put(kvKey, JSON.stringify(record), { expirationTtl: ttlSeconds }).catch(() => {});
  }
}

/**
 * Invalidates member record across Tier 1 and Tier 2 cache.
 */
export function invalidateMemberCache(
  env: any,
  scope: string,
  identifier: string
): void {
  const cleanId = identifier.toLowerCase().trim();
  if (!cleanId) return;

  invalidateTier1Member(scope, cleanId);

  if (env?.STOREFRONT_CACHE) {
    const kvKey = buildCacheKey(scope, cleanId);
    env.STOREFRONT_CACHE.delete(kvKey).catch(() => {});
  }
}

// ── Legacy KV Helper ──────────────────────────────────────────────────

export async function cachedRead<T>(
  env: { STOREFRONT_CACHE: KVNamespace },
  key: string,
  fetcher: () => Promise<T>,
  ttl = 300
): Promise<T> {
  const cached = await env.STOREFRONT_CACHE.get(key);
  if (cached) {
    try { return JSON.parse(cached); } catch { return cached as unknown as T; }
  }
  const fresh = await fetcher();
  await env.STOREFRONT_CACHE.put(key, JSON.stringify(fresh), { expirationTtl: ttl });
  return fresh;
}

export async function cacheInvalidate(
  env: { STOREFRONT_CACHE: KVNamespace },
  key: string
): Promise<void> {
  await env.STOREFRONT_CACHE.delete(key);
}
