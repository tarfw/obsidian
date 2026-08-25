/**
 * Matter Repository - Strongly-Typed Canonical Business Entities (matter.md §5)
 */
import type { Client } from '@libsql/client';
import * as v from 'valibot';
import { executeQuery } from '../turso.ts';
import {
  toMatterTypeCode,
  MATTER_STATE,
  type BookingMatter,
  type CustomerMatter,
  type InvoiceMatter,
  type Matter,
  type MatterPayloadMap,
  type MatterType,
  type ProductMatter,
  type TaskMatter,
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
    const typeCode = toMatterTypeCode(type);
    const now = Date.now();

    await this.client.execute({
      sql: `INSERT INTO matter (id, type, data, state, version, created, updated)
            VALUES (?, ?, ?, ?, 1, ?, ?)`,
      args: [id, typeCode, JSON.stringify(validated), MATTER_STATE.active, now, now],
    });

    return {
      id,
      workspaceId,
      type,
      data: validated,
      version: 1,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    };
  }

  async findById<T extends MatterType>(workspaceId: string, id: string): Promise<Matter<T> | null> {
    const rows = await executeQuery<{
      id: string;
      type: number;
      data: string;
      state: number;
      version: number;
      created: number;
      updated: number;
    }>(this.client, `SELECT * FROM matter WHERE id = ? AND deleted_at IS NULL`, [id]);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      workspaceId,
      type: (typeof r.type === 'number' ? r.type : 1) as unknown as T,
      data: JSON.parse(r.data),
      version: r.version,
      createdAt: new Date(r.created).toISOString(),
      updatedAt: new Date(r.updated).toISOString(),
    };
  }

  async listByType<T extends MatterType>(workspaceId: string, type: T): Promise<Matter<T>[]> {
    const typeCode = toMatterTypeCode(type);
    const rows = await executeQuery<{
      id: string;
      type: number;
      data: string;
      state: number;
      version: number;
      created: number;
      updated: number;
    }>(
      this.client,
      `SELECT * FROM matter WHERE type = ? AND deleted_at IS NULL ORDER BY updated DESC`,
      [typeCode]
    );

    return rows.map((r) => ({
      id: r.id,
      workspaceId,
      type,
      data: JSON.parse(r.data),
      version: r.version,
      createdAt: new Date(r.created).toISOString(),
      updatedAt: new Date(r.updated).toISOString(),
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
    const now = Date.now();

    const result = await this.client.execute({
      sql: `UPDATE matter SET data = ?, version = ?, updated = ? WHERE id = ? AND deleted_at IS NULL`,
      args: [JSON.stringify(validated), nextVersion, now, id],
    });

    if (result.rowsAffected === 0) return null;

    return {
      id,
      workspaceId,
      type,
      data: validated,
      version: nextVersion,
      createdAt: existing.createdAt,
      updatedAt: new Date(now).toISOString(),
    };
  }
}

