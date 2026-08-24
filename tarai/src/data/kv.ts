/**
 * Cloudflare KV Read Cache Adapter
 * Rule: KV is read cache only (rendered pages, public facts snapshot). Never for canonical facts, job state, locks, or approvals.
 */

export interface KVNamespaceBinding {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export class KVCacheService {
  constructor(private kv?: KVNamespaceBinding) {}

  // In-memory fallback for local testing
  private memoryStore = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    if (this.kv) {
      return this.kv.get(key);
    }
    const item = this.memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.kv) {
      await this.kv.put(key, value, ttlSeconds ? { expirationTtl: ttlSeconds } : undefined);
    } else {
      this.memoryStore.set(key, {
        value,
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
      });
    }
  }

  async delete(key: string): Promise<void> {
    if (this.kv) {
      await this.kv.delete(key);
    } else {
      this.memoryStore.delete(key);
    }
  }
}
