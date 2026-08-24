/**
 * Cloudflare R2 / OKF Markdown & Artifact Storage Adapter
 */

export interface R2BucketBinding {
  get(key: string): Promise<{ text(): Promise<string>; arrayBuffer(): Promise<ArrayBuffer> } | null>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { customMetadata?: Record<string, string> }): Promise<unknown>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string }): Promise<{ objects: Array<{ key: string; size: number; uploaded: Date }> }>;
}

export class R2StorageService {
  constructor(private bucket?: R2BucketBinding) {}

  // In-memory fallback for local testing when R2 binding is not available
  private memoryStore = new Map<string, string>();

  async readText(key: string): Promise<string | null> {
    if (this.bucket) {
      const obj = await this.bucket.get(key);
      if (!obj) return null;
      return obj.text();
    }
    return this.memoryStore.get(key) || null;
  }

  async writeText(key: string, content: string, metadata?: Record<string, string>): Promise<void> {
    if (this.bucket) {
      await this.bucket.put(key, content, { customMetadata: metadata });
    } else {
      this.memoryStore.set(key, content);
    }
  }

  async delete(key: string): Promise<void> {
    if (this.bucket) {
      await this.bucket.delete(key);
    } else {
      this.memoryStore.delete(key);
    }
  }
}
