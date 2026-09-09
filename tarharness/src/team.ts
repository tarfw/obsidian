import { badRequest, forbidden, notFound } from './errors.ts';
import { managesMembers, type WorkRole } from './access.ts';
import type { AccessContext, Role } from './types.ts';

export function memberRole(input: Record<string, unknown>): { role: Exclude<Role, 'owner'>; workRole: WorkRole } {
  if (!['admin','member','guest'].includes(String(input.role))) throw badRequest('Choose a valid member role.');
  const workRole = input.workRole ?? 'general';
  if (!['general','cook','cashier'].includes(String(workRole)) || (input.role !== 'member' && workRole !== 'general')) throw badRequest('Choose a valid work role.');
  return { role: input.role as Exclude<Role, 'owner'>, workRole: workRole as WorkRole };
}

export const audit = (db: D1Database, ctx: AccessContext, action: string, target: string) => db.prepare(
  'INSERT INTO control_events(id,workspace_id,actor_id,action,target,created_at) VALUES(?,?,?,?,?,?)'
).bind(crypto.randomUUID(), ctx.workspace.id, ctx.identity.id, action, target, Date.now());

export async function listMembers(db: D1Database, ctx: AccessContext) {
  if (!managesMembers(ctx.member)) throw forbidden();
  return (await db.prepare(`SELECT m.user_id AS id,u.email,u.name,m.role,m.work_role AS workRole,m.state
    FROM members m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=?
    UNION ALL SELECT i.id,i.email,NULL,i.role,i.work_role,'pending' FROM workspace_invites i
    WHERE i.workspace_id=? AND i.state='pending'
    ORDER BY email`).bind(ctx.workspace.id, ctx.workspace.id).all()).results;
}

export async function inviteMember(db: D1Database, ctx: AccessContext, input: Record<string, unknown>) {
  if (!managesMembers(ctx.member) || ctx.workspace.mode !== 'work') throw forbidden();
  const { role, workRole } = memberRole(input);
  if (role === 'admin' && ctx.member.role !== 'owner') throw forbidden();
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) throw badRequest('A valid email is required.');
  const existing = await db.prepare(`SELECT m.state,m.role FROM members m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=? AND lower(u.email)=?`).bind(ctx.workspace.id, email).first<{state: string; role: Role}>();
  if (existing?.role === 'owner' || (existing?.role === 'admin' && ctx.member.role !== 'owner')) throw forbidden();
  if (existing?.state === 'active') throw badRequest('This member already belongs to the workspace. Edit their role instead.');
  const stamp = Date.now();
  await db.batch([
    db.prepare(`INSERT INTO workspace_invites(id,workspace_id,email,role,work_role,invited_by,state,created_at,updated_at)
      VALUES(?,?,?,?,?,?,'pending',?,?) ON CONFLICT(workspace_id,email) DO UPDATE SET role=excluded.role,work_role=excluded.work_role,invited_by=excluded.invited_by,state='pending',updated_at=excluded.updated_at`)
      .bind('inv_' + crypto.randomUUID(), ctx.workspace.id, email, role, workRole, ctx.identity.id, stamp, stamp),
    audit(db, ctx, 'member.invite', email),
  ]);
  return { email, role, workRole, state: 'pending' };
}

export async function updateMember(db: D1Database, ctx: AccessContext, id: string, input: Record<string, unknown>) {
  if (!managesMembers(ctx.member) || ctx.workspace.mode !== 'work') throw forbidden();
  if (id === ctx.identity.id) throw badRequest('Ask another owner to change your access.');
  const target = await db.prepare(`SELECT user_id AS id,role FROM members WHERE workspace_id=? AND user_id=?`).bind(ctx.workspace.id, id).first<{id: string; role: Role}>();
  const invitation = target ? null : await db.prepare(`SELECT id,role FROM workspace_invites WHERE workspace_id=? AND id=? AND state='pending'`).bind(ctx.workspace.id, id).first<{id: string; role: Role}>();
  if (!target && !invitation) throw notFound('Member not found.');
  if ((target || invitation)?.role === 'owner' || ((target || invitation)?.role === 'admin' && ctx.member.role !== 'owner')) throw forbidden();
  const revoke = input.state === 'revoked';
  const next = revoke ? { role: 'member' as const, workRole: 'general' as const } : memberRole(input);
  if (next.role === 'admin' && ctx.member.role !== 'owner') throw forbidden();
  const table = target ? 'members' : 'workspace_invites';
  const key = target ? 'user_id' : 'id';
  const statements = [revoke
    ? db.prepare(`UPDATE ${table} SET state='revoked',updated_at=? WHERE workspace_id=? AND ${key}=?`).bind(Date.now(), ctx.workspace.id, id)
    : db.prepare(`UPDATE ${table} SET role=?,work_role=?,updated_at=? WHERE workspace_id=? AND ${key}=?`).bind(next.role, next.workRole, Date.now(), ctx.workspace.id, id),
    audit(db, ctx, revoke ? 'member.revoke' : 'member.role', id),
  ];
  if (revoke && target) statements.push(
    db.prepare('DELETE FROM channel_identities WHERE workspace_id=? AND user_id=?').bind(ctx.workspace.id, id),
    db.prepare('DELETE FROM channel_link_requests WHERE workspace_id=? AND user_id=?').bind(ctx.workspace.id, id),
    db.prepare(`UPDATE workspace_invites SET state='revoked',updated_at=? WHERE workspace_id=? AND email IN (SELECT lower(email) FROM users WHERE id=?)`).bind(Date.now(), ctx.workspace.id, id),
  );
  await db.batch(statements);
  return { updated: true };
}
