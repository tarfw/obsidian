/**
 * Inventory Tools
 */
import * as v from 'valibot';
import type { ToolDefinition } from './registry.ts';
import { MatterRepository } from '../data/repositories/matter.ts';
import type { ProductMatter } from '../domain/types.ts';

export const InventoryListTool: ToolDefinition<{ lowStockOnly?: boolean }, ProductMatter[]> = {
  name: 'inventory.list',
  description: 'List products and current stock levels',
  riskClass: 'read',
  validateInput(input: unknown) {
    return v.parse(v.object({ lowStockOnly: v.optional(v.boolean()) }), input || {});
  },
  async run({ input, client, workspaceId }) {
    const repo = new MatterRepository(client);
    const products = await repo.listByType(workspaceId, 'product');
    if (input.lowStockOnly) {
      return products
        .filter((p) => p.data.stockLevel <= p.data.lowStockThreshold)
        .map((p) => p.data);
    }
    return products.map((p) => p.data);
  },
};

export const InventoryCorrectTool: ToolDefinition<
  { productId: string; newStockLevel: number; reason?: string },
  ProductMatter | null
> = {
  name: 'inventory.correct',
  description: 'Reversible correction to a product stock level',
  riskClass: 'reversible_write',
  validateInput(input: unknown) {
    return v.parse(
      v.object({
        productId: v.pipe(v.string(), v.minLength(1)),
        newStockLevel: v.pipe(v.number(), v.minValue(0)),
        reason: v.optional(v.string()),
      }),
      input
    );
  },
  async run({ input, client, workspaceId }) {
    const repo = new MatterRepository(client);
    const updated = await repo.update(workspaceId, input.productId, 'product', {
      stockLevel: input.newStockLevel,
    });
    return updated ? updated.data : null;
  },
};
