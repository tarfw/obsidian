/**
 * Workspace Repository
 */
import type { Client } from '@libsql/client';
import { executeQuery } from '../turso.ts';
import type { Workspace } from '../../domain/types.ts';

export class WorkspaceRepository {
  constructor(private client: Client) {}

  async create(workspace: Omit<Workspace, 'createdAt' | 'updatedAt'>): Promise<Workspace> {
    const now = new Date().toISOString();
    await this.client.execute({
      sql: `INSERT INTO workspaces (id, name, slug, currency, settings, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        workspace.id,
        workspace.name,
        workspace.slug,
        workspace.currency,
        JSON.stringify(workspace.settings || {}),
        now,
        now,
      ],
    });

    return {
      ...workspace,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findById(id: string): Promise<Workspace | null> {
    const rows = await executeQuery<{
      id: string;
      name: string;
      slug: string;
      currency: string;
      settings: string;
      created_at: string;
      updated_at: string;
    }>(this.client, `SELECT * FROM workspaces WHERE id = ?`, [id]);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      currency: r.currency,
      settings: JSON.parse(r.settings || '{}'),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    const rows = await executeQuery<{
      id: string;
      name: string;
      slug: string;
      currency: string;
      settings: string;
      created_at: string;
      updated_at: string;
    }>(this.client, `SELECT * FROM workspaces WHERE slug = ?`, [slug]);

    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      currency: row.currency,
      settings: JSON.parse(row.settings || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listForUser(userId: string): Promise<Workspace[]> {
    const rows = await executeQuery<{
      id: string;
      name: string;
      slug: string;
      currency: string;
      settings: string;
      created_at: string;
      updated_at: string;
    }>(
      this.client,
      `SELECT w.* FROM workspaces w
       INNER JOIN members m ON m.workspace_id = w.id
       WHERE m.user_id = ? AND m.status = 'active'
       ORDER BY w.created_at ASC`,
      [userId],
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      currency: row.currency,
      settings: JSON.parse(row.settings || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}
