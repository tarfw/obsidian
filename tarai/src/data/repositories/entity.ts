/**
 * Entity repository for the TarApp workspace surface.
 *
 * This is deliberately separate from canonical Matter: Matter remains the
 * strongly typed domain model used by business tools, while entities preserve
 * user-created workspace records without exposing SQL to a mobile client.
 */
import type { Client } from '@libsql/client';
import { executeQuery } from '../turso.ts';

export interface EntityRecord {
  id: string;
  workspaceId: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export class EntityRepository {
  constructor(private client: Client) {}

  async create(workspaceId: string, id: string, type: string, data: Record<string, unknown>): Promise<EntityRecord> {
    const now = new Date().toISOString();
    await this.client.execute({
      sql: 'INSERT INTO entities (id, workspace_id, type, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, workspaceId, type, JSON.stringify(data), now, now],
    });
    return { id, workspaceId, type, data, createdAt: now, updatedAt: now };
  }

  async findById(workspaceId: string, id: string): Promise<EntityRecord | null> {
    const records = await this.list(workspaceId, { id, limit: 1 });
    return records[0] || null;
  }

  async list(workspaceId: string, options: { id?: string; type?: string; limit?: number } = {}): Promise<EntityRecord[]> {
    const conditions = ['workspace_id = ?'];
    const args: Array<string | number> = [workspaceId];
    if (options.id) { conditions.push('id = ?'); args.push(options.id); }
    if (options.type) { conditions.push('type = ?'); args.push(options.type); }
    args.push(Math.min(Math.max(options.limit || 250, 1), 500));
    const rows = await executeQuery<{ id: string; workspace_id: string; type: string; data: string; created_at: string; updated_at: string }>(
      this.client,
      `SELECT * FROM entities WHERE ${conditions.join(' AND ')} ORDER BY updated_at DESC LIMIT ?`,
      args,
    );
    return rows.map((row) => ({ id: row.id, workspaceId: row.workspace_id, type: row.type, data: JSON.parse(row.data), createdAt: row.created_at, updatedAt: row.updated_at }));
  }

  async update(workspaceId: string, id: string, patch: Record<string, unknown>): Promise<EntityRecord | null> {
    const existing = await this.findById(workspaceId, id);
    if (!existing) return null;
    const data = { ...existing.data, ...patch };
    const updatedAt = new Date().toISOString();
    await this.client.execute({
      sql: 'UPDATE entities SET data = ?, updated_at = ? WHERE workspace_id = ? AND id = ?',
      args: [JSON.stringify(data), updatedAt, workspaceId, id],
    });
    return { ...existing, data, updatedAt };
  }
}
