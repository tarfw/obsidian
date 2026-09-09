import { Effect } from 'effect';
import type { Client } from '@libsql/client/web';
import { ControlStore } from '../db/control.ts';
import { HarnessError, forbidden } from '../errors.ts';
import { executeGateway, type GatewayServices } from '../gateway/actions.ts';
import type { AccessContext } from '../types.ts';
import { canExecute } from '../access.ts';
import type { ChannelEvent } from './providers.ts';
import { digest, resolveSender } from './store.ts';
import { commandRequest } from './commands.ts';

export async function enqueueCommand(db: D1Database, ctx: AccessContext, event: ChannelEvent) {
  const id = await digest(`${event.provider}:${event.tenantId}:${event.eventId}`);
  const at = Date.now();
  await db.prepare(`INSERT INTO channel_commands(id,workspace_id,user_id,event,state,due_at,created_at,updated_at)
    VALUES(?,?,?,?,'pending',?,?,?) ON CONFLICT(id) DO NOTHING`).bind(id, ctx.workspace.id, ctx.identity.id, JSON.stringify(event), at, at, at).run();
  return id;
}

export async function processCommand(db: D1Database, id: string, withDatabase: <T>(context: AccessContext, work: (client: Client) => Promise<T>) => Promise<T>, services: GatewayServices = {}) {
  const at = Date.now();
  const job = await db.prepare(`UPDATE channel_commands SET state='processing',attempts=attempts+1,due_at=?,updated_at=?
    WHERE id=? AND state IN ('pending','processing') AND due_at<=? AND attempts<5 RETURNING *`)
    .bind(at + 60_000, at, id, at).first<{ workspace_id: string; user_id: string; event: string; attempts: number }>();
  if (!job) return;
  try {
    const event = JSON.parse(job.event) as ChannelEvent;
    const sender = await resolveSender(db, event);
    const current = await Effect.runPromise(new ControlStore(db).access(sender.identity, sender.slug));
    if (current.workspace.id !== job.workspace_id || current.identity.id !== job.user_id) throw forbidden();
    await withDatabase(current, async (client) => {
      const actionId = /^done\s/i.test(event.text.trim()) ? 'task.complete' : 'pos.order.item.update';
      if (!canExecute(current.member, actionId)) throw forbidden();
      const key = `chat:${id}`;
      const saved = await client.execute({ sql: 'SELECT actor_id FROM events WHERE idempotency_key=?', args: [key] });
      if (saved.rows.length) {
        if (String(saved.rows[0].actor_id) !== current.identity.id) throw forbidden();
        return;
      }
      const action = await commandRequest(client, event.text, key);
      await Effect.runPromise(executeGateway(client, current, action, services));
    });
    await db.prepare("UPDATE channel_commands SET state='completed',result='Done. Your workspace is updated.',updated_at=? WHERE id=? AND attempts=?").bind(Date.now(), id, job.attempts).run();
  } catch (error) {
    const retry = (!(error instanceof HarnessError) || error.status >= 500) && job.attempts < 5;
    await db.prepare('UPDATE channel_commands SET state=?,result=?,due_at=?,updated_at=? WHERE id=? AND attempts=?')
      .bind(retry ? 'pending' : 'failed', error instanceof HarnessError && error.status < 500 ? error.message : 'Could not finish. Check your TAR Inbox before trying again.', Date.now() + 30_000 * job.attempts, Date.now(), id, job.attempts).run();
  }
}
