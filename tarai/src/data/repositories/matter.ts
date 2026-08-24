/**
 * Matter Repository - Strongly-Typed Canonical Business Entities
 */
import type { Client } from '@libsql/client';
import * as v from 'valibot';
import { executeQuery } from '../turso.ts';
import type {
  BookingMatter,
  CustomerMatter,
  InvoiceMatter,
  Matter,
  MatterPayloadMap,
  MatterType,
  ProductMatter,
  TaskMatter,
} from '../../domain/types.ts';

// Valibot Schemas for deterministic entity validation
export const TaskMatterSchema = v.object({
  title: v.pipe(v.string(), v.minLength(1)),
  description: v.optional(v.string()),
  status: v.picklist(['todo', 'in_progress', 'done', 'archived']),
  assigneeId: v.optional(v.string()),
  dueDate: v.optional(v.string()),
  priority: v.picklist(['low', 'medium', 'high']),
});

export const ProductMatterSchema = v.object({
  sku: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.string(),
  priceCents: v.pipe(v.number(), v.minValue(0)),
  currency: v.string(),
  stockLevel: v.pipe(v.number(), v.minValue(0)),
  lowStockThreshold: v.pipe(v.number(), v.minValue(0)),
  status: v.picklist(['active', 'draft', 'archived']),
});

export const BookingMatterSchema = v.object({
  customerId: v.string(),
  resourceId: v.string(),
  startTime: v.string(),
  endTime: v.string(),
  status: v.picklist(['confirmed', 'cancelled', 'pending_payment']),
});

export const CustomerMatterSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
  email: v.optional(v.pipe(v.string(), v.email())),
  phone: v.optional(v.string()),
  tags: v.array(v.string()),
  totalSpendCents: v.pipe(v.number(), v.minValue(0)),
});

export const InvoiceMatterSchema = v.object({
  customerId: v.string(),
  items: v.array(
    v.object({
      description: v.string(),
      amountCents: v.pipe(v.number(), v.minValue(0)),
      quantity: v.pipe(v.number(), v.minValue(1)),
    })
  ),
  totalCents: v.pipe(v.number(), v.minValue(0)),
  status: v.picklist(['draft', 'issued', 'paid', 'void']),
});

export class MatterRepository {
  constructor(private client: Client) {}

  validatePayload<T extends MatterType>(type: T, data: unknown): MatterPayloadMap[T] {
    switch (type) {
      case 'task':
        return v.parse(TaskMatterSchema, data) as MatterPayloadMap[T];
      case 'product':
        return v.parse(ProductMatterSchema, data) as MatterPayloadMap[T];
      case 'booking':
        return v.parse(BookingMatterSchema, data) as MatterPayloadMap[T];
      case 'customer':
        return v.parse(CustomerMatterSchema, data) as MatterPayloadMap[T];
      case 'invoice':
        return v.parse(InvoiceMatterSchema, data) as MatterPayloadMap[T];
      default:
        throw new Error(`Unsupported matter type: ${type}`);
    }
  }

  async create<T extends MatterType>(
    workspaceId: string,
    id: string,
    type: T,
    data: MatterPayloadMap[T]
  ): Promise<Matter<T>> {
    const validated = this.validatePayload(type, data);
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `INSERT INTO matter (id, workspace_id, type, data, version, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, workspaceId, type, JSON.stringify(validated), 1, now, now],
    });

    return {
      id,
      workspaceId,
      type,
      data: validated,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findById<T extends MatterType>(workspaceId: string, id: string): Promise<Matter<T> | null> {
    const rows = await executeQuery<{
      id: string;
      workspace_id: string;
      type: T;
      data: string;
      version: number;
      created_at: string;
      updated_at: string;
    }>(this.client, `SELECT * FROM matter WHERE workspace_id = ? AND id = ?`, [workspaceId, id]);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      type: r.type,
      data: JSON.parse(r.data),
      version: r.version,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async listByType<T extends MatterType>(workspaceId: string, type: T): Promise<Matter<T>[]> {
    const rows = await executeQuery<{
      id: string;
      workspace_id: string;
      type: T;
      data: string;
      version: number;
      created_at: string;
      updated_at: string;
    }>(
      this.client,
      `SELECT * FROM matter WHERE workspace_id = ? AND type = ? ORDER BY created_at DESC`,
      [workspaceId, type]
    );

    return rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      type: r.type,
      data: JSON.parse(r.data),
      version: r.version,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async update<T extends MatterType>(
    workspaceId: string,
    id: string,
    type: T,
    data: Partial<MatterPayloadMap[T]>
  ): Promise<Matter<T> | null> {
    const existing = await this.findById<T>(workspaceId, id);
    if (!existing) return null;

    const merged = { ...existing.data, ...data };
    const validated = this.validatePayload(type, merged);
    const nextVersion = existing.version + 1;
    const now = new Date().toISOString();

    const result = await this.client.execute({
      sql: `UPDATE matter SET data = ?, version = ?, updated_at = ? WHERE workspace_id = ? AND id = ?`,
      args: [JSON.stringify(validated), nextVersion, now, workspaceId, id],
    });

    if (result.rowsAffected === 0) return null;

    return {
      id,
      workspaceId,
      type,
      data: validated,
      version: nextVersion,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
  }
}
