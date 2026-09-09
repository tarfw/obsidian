import { badRequest, conflict, forbidden, notFound } from '../errors.ts';
import { managesMembers } from '../access.ts';
import { audit } from '../team.ts';
import type { AccessContext, Identity } from '../types.ts';
import { joinUrl, type ChannelEvent, type Provider } from './providers.ts';

export async function digest(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), (n) => n.toString(16).padStart(2, '0')).join('');
}
export async function channelState(db: D1Database, ctx: AccessContext) {
  const [connection, identity, requests, commands] = await Promise.all([
    db.prepare('SELECT provider,channel_name AS name,join_url AS joinUrl FROM team_channels WHERE workspace_id=?').bind(ctx.workspace.id).first(),
    db.prepare('SELECT provider,external_name AS name FROM channel_identities WHERE workspace_id=? AND user_id=?').bind(ctx.workspace.id, ctx.identity.id).first(),
    db.prepare('SELECT id,provider,purpose,candidate,expires_at AS expiresAt FROM channel_link_requests WHERE workspace_id=? AND user_id=? AND expires_at>? ORDER BY expires_at DESC').bind(ctx.workspace.id, ctx.identity.id, Date.now()).all<{id: string; provider: Provider; purpose: string; candidate: string | null; expiresAt: number}>(),
    db.prepare('SELECT id,state,result,created_at AS createdAt FROM channel_commands WHERE workspace_id=? AND user_id=? ORDER BY created_at DESC LIMIT 10').bind(ctx.workspace.id, ctx.identity.id).all(),
  ]);
  return { connection, identity, commands: commands.results, requests: requests.results.map((item) => ({ ...item, candidate: item.candidate ? JSON.parse(item.candidate) as ChannelEvent : null })) };
}

export async function beginLink(db: D1Database, ctx: AccessContext, provider: Provider, purpose: string) {
  if (purpose !== 'destination' && purpose !== 'identity') throw badRequest('Invalid link purpose.');
  if (purpose === 'destination' && (!managesMembers(ctx.member) || ctx.workspace.mode !== 'work')) throw forbidden();
  const connection = await db.prepare('SELECT provider FROM team_channels WHERE workspace_id=?').bind(ctx.workspace.id).first<{provider: string}>();
  if (purpose === 'destination' && connection) throw conflict('Disconnect the current team channel before replacing it.');
  if (purpose === 'identity' && connection?.provider !== provider) throw badRequest('Connect the team channel first.');
  const token = crypto.randomUUID().replaceAll('-', ''); const id = crypto.randomUUID(); const expiresAt = Date.now() + 10 * 60_000;
  await db.batch([
    db.prepare('DELETE FROM channel_link_requests WHERE workspace_id=? AND user_id=? AND purpose=?').bind(ctx.workspace.id, ctx.identity.id, purpose),
    db.prepare('INSERT INTO channel_link_requests(id,token_hash,workspace_id,user_id,provider,purpose,expires_at) VALUES(?,?,?,?,?,?,?)').bind(id, await digest(token), ctx.workspace.id, ctx.identity.id, provider, purpose, expiresAt),
  ]);
  return { id, command: `${provider === 'google-chat' ? '' : '/tar '}link ${token}`, expiresAt };
}

export async function proveLink(db: D1Database, event: ChannelEvent, token: string) {
  const request = await db.prepare(`SELECT r.* FROM channel_link_requests r JOIN members m ON m.workspace_id=r.workspace_id AND m.user_id=r.user_id
    WHERE r.token_hash=? AND r.provider=? AND r.expires_at>? AND r.candidate IS NULL AND m.state='active'`).bind(await digest(token), event.provider, Date.now()).first<{id: string; purpose: string; workspace_id: string}>();
  if (!request) throw badRequest('Link request expired or already used. Start again in TAR.');
  if (request.purpose === 'identity') {
    const connection = await db.prepare('SELECT workspace_id FROM team_channels WHERE workspace_id=? AND provider=? AND tenant_id=? AND channel_id=?')
      .bind(request.workspace_id, event.provider, event.tenantId, event.channelId).first();
    if (!connection) throw forbidden();
  }
  const candidate = { provider: event.provider, tenantId: event.tenantId, channelId: event.channelId, channelName: event.channelName, userId: event.userId, userName: event.userName };
  const result = await db.prepare('UPDATE channel_link_requests SET candidate=? WHERE id=? AND candidate IS NULL AND expires_at>?').bind(JSON.stringify(candidate), request.id, Date.now()).run();
  if (!result.meta.changes) throw conflict('Link request already used.');
  return 'Return to TAR, review the account and channel, and confirm the link.';
}

export async function confirmLink(db: D1Database, ctx: AccessContext, id: string, invitation: unknown) {
  const request = await db.prepare('SELECT * FROM channel_link_requests WHERE id=? AND workspace_id=? AND user_id=? AND expires_at>?')
    .bind(id, ctx.workspace.id, ctx.identity.id, Date.now()).first<{purpose: string; candidate: string | null; provider: Provider}>();
  if (!request?.candidate) throw badRequest('Send the link command in your team channel first.');
  const event = JSON.parse(request.candidate) as ChannelEvent;
  const at = Date.now();
  const statements: D1PreparedStatement[] = [];
  if (request.purpose === 'destination') {
    if (!managesMembers(ctx.member)) throw forbidden();
    if (await db.prepare('SELECT workspace_id FROM team_channels WHERE workspace_id=? OR (provider=? AND tenant_id=? AND channel_id=?)').bind(ctx.workspace.id, event.provider, event.tenantId, event.channelId).first()) throw conflict('This workspace or channel is already linked.');
    statements.push(db.prepare(`INSERT INTO team_channels(workspace_id,provider,tenant_id,channel_id,channel_name,join_url,linked_by,updated_at)
      SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM channel_link_requests WHERE id=? AND expires_at>?)`)
      .bind(ctx.workspace.id, event.provider, event.tenantId, event.channelId, event.channelName || event.channelId, joinUrl(event.provider, invitation), ctx.identity.id, at, id, at));
  } else {
    if (!await db.prepare('SELECT workspace_id FROM team_channels WHERE workspace_id=? AND provider=? AND tenant_id=? AND channel_id=?').bind(ctx.workspace.id, event.provider, event.tenantId, event.channelId).first()) throw conflict('The team channel changed. Start again.');
  }
  const occupied = await db.prepare('SELECT user_id FROM channel_identities WHERE workspace_id=? AND provider=? AND tenant_id=? AND external_user_id=? AND user_id!=?')
    .bind(ctx.workspace.id, event.provider, event.tenantId, event.userId, ctx.identity.id).first();
  if (occupied) throw conflict('This chat account is already linked to another member.');
  statements.push(
    db.prepare(`INSERT INTO channel_identities(workspace_id,user_id,provider,tenant_id,external_user_id,external_name,updated_at)
      SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM channel_link_requests WHERE id=? AND expires_at>?)
      ON CONFLICT(workspace_id,user_id) DO UPDATE SET provider=excluded.provider,tenant_id=excluded.tenant_id,external_user_id=excluded.external_user_id,external_name=excluded.external_name,updated_at=excluded.updated_at`)
      .bind(ctx.workspace.id, ctx.identity.id, event.provider, event.tenantId, event.userId, event.userName || event.userId, at, id, at),
    db.prepare('DELETE FROM channel_link_requests WHERE id=?').bind(id), audit(db, ctx, 'channel.link.' + request.purpose, event.channelId),
  );
  await db.batch(statements);
  return { linked: true };
}

export async function disconnect(db: D1Database, ctx: AccessContext, destination: boolean) {
  if (destination && !managesMembers(ctx.member)) throw forbidden();
  const statements = destination ? [
    db.prepare('DELETE FROM team_channels WHERE workspace_id=?').bind(ctx.workspace.id),
    db.prepare('DELETE FROM channel_identities WHERE workspace_id=?').bind(ctx.workspace.id),
    db.prepare('DELETE FROM channel_link_requests WHERE workspace_id=?').bind(ctx.workspace.id),
  ] : [
    db.prepare('DELETE FROM channel_identities WHERE workspace_id=? AND user_id=?').bind(ctx.workspace.id, ctx.identity.id),
    db.prepare('DELETE FROM channel_link_requests WHERE workspace_id=? AND user_id=?').bind(ctx.workspace.id, ctx.identity.id),
  ];
  await db.batch([...statements, audit(db, ctx, destination ? 'channel.disconnect' : 'channel.identity.unlink', ctx.identity.id)]);
  return { disconnected: true };
}

export async function resolveSender(db: D1Database, event: ChannelEvent): Promise<{ identity: Identity; slug: string }> {
  const found = await db.prepare(`SELECT u.id,u.email,u.name,w.slug FROM team_channels c
    JOIN channel_identities i ON i.workspace_id=c.workspace_id AND i.provider=c.provider AND i.tenant_id=c.tenant_id
    JOIN members m ON m.workspace_id=i.workspace_id AND m.user_id=i.user_id
    JOIN users u ON u.id=m.user_id JOIN workspaces w ON w.id=c.workspace_id
    WHERE c.provider=? AND c.tenant_id=? AND c.channel_id=? AND i.external_user_id=? AND m.state='active' AND w.state='active'`)
    .bind(event.provider, event.tenantId, event.channelId, event.userId).first<Identity & {slug: string}>();
  if (!found) throw notFound('Link your account in TAR → Members & chat before using this channel.');
  return { identity: { id: found.id, email: found.email, name: found.name }, slug: found.slug };
}
