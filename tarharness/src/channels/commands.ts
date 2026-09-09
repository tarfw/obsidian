import type { Client } from '@libsql/client/web';
import { badRequest, notFound } from '../errors.ts';
import type { GatewayRequest } from '../gateway/actions.ts';

export async function commandRequest(client: Pick<Client, 'execute'>, text: string, idempotencyKey: string): Promise<GatewayRequest> {
  const parts = text.trim().split(/\s+/);
  if (parts.length === 2 && parts[0].toLowerCase() === 'done') return { actionId: 'task.complete', input: { taskId: parts[1] }, idempotencyKey };
  if (parts.length === 3 && ['start','ready'].includes(parts[0].toLowerCase())) {
    const found = await client.execute({ sql: "SELECT version FROM records WHERE id=? AND type='pos.order' AND state='open' AND archived_at IS NULL", args: [parts[1]] });
    if (!found.rows[0]) throw notFound('Open order not found. Use its full TAR ID.');
    return { actionId: 'pos.order.item.update', input: { orderId: parts[1], productId: parts[2], version: Number(found.rows[0].version), status: parts[0].toLowerCase() === 'start' ? 'preparing' : 'ready' }, idempotencyKey };
  }
  throw badRequest('Use: done <task-id>, start <order-id> <product-id>, or ready <order-id> <product-id>. Use TAR for payments, approvals and other work.');
}
