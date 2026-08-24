/**
 * POS (Point of Sale) Tools
 */
import * as v from 'valibot';
import type { ToolDefinition } from './registry.ts';
import { MatterRepository } from '../data/repositories/matter.ts';
import type { InvoiceMatter } from '../domain/types.ts';

export const PosSessionTool: ToolDefinition<{ customerId?: string }, { sessionId: string; activeCart: unknown[] }> = {
  name: 'pos.session',
  description: 'Retrieve or initialize a POS checkout session',
  riskClass: 'read',
  validateInput(input: unknown) {
    return v.parse(v.object({ customerId: v.optional(v.string()) }), input || {});
  },
  async run({ input }) {
    return {
      sessionId: `pos_${Date.now()}`,
      activeCart: [],
    };
  },
};

export const PosCheckoutTool: ToolDefinition<
  {
    customerId: string;
    items: Array<{ description: string; amountCents: number; quantity: number }>;
  },
  InvoiceMatter
> = {
  name: 'pos.checkout',
  description: 'Create and issue a completed POS order invoice',
  riskClass: 'consequential',
  validateInput(input: unknown) {
    return v.parse(
      v.object({
        customerId: v.pipe(v.string(), v.minLength(1)),
        items: v.pipe(
          v.array(
            v.object({
              description: v.string(),
              amountCents: v.pipe(v.number(), v.minValue(0)),
              quantity: v.pipe(v.number(), v.minValue(1)),
            })
          ),
          v.minLength(1)
        ),
      }),
      input
    );
  },
  async run({ input, client, workspaceId }) {
    const repo = new MatterRepository(client);
    const totalCents = input.items.reduce((sum, item) => sum + item.amountCents * item.quantity, 0);

    const invoiceId = `inv_${Date.now()}`;
    const invoiceData: InvoiceMatter = {
      customerId: input.customerId,
      items: input.items,
      totalCents,
      status: 'paid',
    };

    const created = await repo.create(workspaceId, invoiceId, 'invoice', invoiceData);
    return created.data;
  },
};
