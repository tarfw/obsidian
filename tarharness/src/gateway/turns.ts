import type { Client } from '@libsql/client/web';
import { conflict } from '../errors.ts';
import type { EventInput } from './commit.ts';

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export type TurnClaim = { readonly lease: string; readonly result: null } | { readonly lease: null; readonly result: Record<string, unknown> };

export async function claimTurn(client: Client, key: string, hash: string): Promise<TurnClaim> {
  const now = Date.now();
  const lease = crypto.randomUUID();
  const inserted = await client.execute({
    sql: "INSERT OR IGNORE INTO turns(id,hash,state,owner,result,created,updated) VALUES(?,?,'processing',?,NULL,?,?)",
    args: [key, hash, lease, now, now],
  });
  if (inserted.rowsAffected === 1) return { lease, result: null };

  for (let attempt = 0; attempt < 55; attempt++) {
    const result = await client.execute({ sql: 'SELECT hash,state,result,updated FROM turns WHERE id=?', args: [key] });
    const row = result.rows[0];
    if (!row) throw conflict('This operation changed while it was being processed. Retry it.');
    if (String(row.hash) !== hash) throw conflict('This idempotency key was already used with different input.');
    if (row.state === 'completed') return { lease: null, result: JSON.parse(String(row.result)) as Record<string, unknown> };
    if (row.state === 'failed' || Number(row.updated) < Date.now() - 30_000) {
      const claimed = await client.execute({
        sql: "UPDATE turns SET state='processing',owner=?,result=NULL,updated=? WHERE id=? AND hash=? AND state=? AND updated=?",
        args: [lease, Date.now(), key, hash, row.state, row.updated],
      });
      if (claimed.rowsAffected === 1) return { lease, result: null };
    }
    await wait(200);
  }
  throw conflict('This operation is still processing. Retry with the same key.');
}

export async function completeTurn(client: Client, input: EventInput, lease: string): Promise<void> {
  const now = Date.now();
  const updated = await client.batch([
    {
      sql: "UPDATE turns SET state='completed',result=?,updated=? WHERE id=? AND hash=? AND owner=? AND state='processing'",
      args: [JSON.stringify(input.result), now, input.key, input.hash, lease],
    },
    {
      sql: `INSERT INTO events (id,kind,run_id,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at)
        SELECT ?, 'action', ?, ?, ?, 'accepted', ?, ?, ?, ?, ?, ? WHERE changes()=1`,
      args: [`evt_${crypto.randomUUID()}`, input.runId ?? null, input.recordId ?? null, input.action, input.actor, input.hash, input.key, JSON.stringify({ result: input.result }), now, now],
    },
  ], 'write');
  if (updated[0]?.rowsAffected !== 1 || updated[1]?.rowsAffected !== 1) throw conflict('This operation was claimed by another request.');
}

export async function failTurn(client: Client, key: string, hash: string, lease: string): Promise<void> {
  await client.execute({ sql: "UPDATE turns SET state='failed',updated=? WHERE id=? AND hash=? AND owner=? AND state='processing'", args: [Date.now(), key, hash, lease] });
}
