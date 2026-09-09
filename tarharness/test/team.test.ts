import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { createClient } from '@libsql/client';
import { Effect } from 'effect';
import { ControlStore } from '../src/db/control.ts';
import { inviteMember, updateMember } from '../src/team.ts';
import { beginLink, proveLink, confirmLink, resolveSender, disconnect } from '../src/channels/store.ts';
import { canExecute, canReadRecord, kitchenOrder } from '../src/access.ts';
import { joinUrl, verifyEvent, type ChannelEvent } from '../src/channels/providers.ts';
import type { AccessContext } from '../src/types.ts';
import { enqueueCommand, processCommand } from '../src/channels/jobs.ts';
import { WORKSPACE_SCHEMA } from '../src/db/schema.ts';

let runtime: Miniflare;
let db: D1Database;
const owner: AccessContext = {
  identity: { id: 'owner', email: 'owner@example.com', name: 'Owner' },
  workspace: { id: 'ws', name: 'Restaurant', slug: 'restaurant', mode: 'work', state: 'active', databaseHost: 'db', databaseName: 'db' },
  member: { workspaceId: 'ws', userId: 'owner', role: 'owner', state: 'active', workRole: 'general' },
};
const cook: AccessContext = { ...owner, identity: { id: 'cook', email: 'cook@example.com', name: 'Cook' }, member: { workspaceId: 'ws', userId: 'cook', role: 'member', state: 'active', workRole: 'cook' } };
const event: ChannelEvent = { provider: 'slack', tenantId: 'T1', channelId: 'C1', channelName: 'kitchen', userId: 'U1', userName: 'owner-chat', text: '', eventId: 'event1' };
beforeAll(async () => {
  runtime = new Miniflare(convertV4MiniflareOptions({ name: 'team-test', modules: true, script: 'export default { fetch() { return new Response("ok"); } }', d1Databases: ['CONTROL'], compatibilityDate: '2026-09-05' }));
  db = await runtime.getD1Database('CONTROL');
  for (const file of ['0001_control.sql','0002_workspace_invites.sql','0003_team_chat.sql']) {
    const sql = readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8');
    for (const statement of sql.split(';').filter((item) => item.trim())) await db.prepare(statement).run();
  }
}, 30_000);
afterAll(async () => { await runtime?.dispose(); });
beforeEach(async () => {
  for (const table of ['channel_commands','control_events','channel_link_requests','channel_identities','team_channels','workspace_invites','members','workspaces','users']) await db.prepare(`DELETE FROM ${table}`).run();
  for (const identity of [owner.identity, cook.identity]) await db.prepare('INSERT INTO users(id,email,name,created_at,updated_at) VALUES(?,?,?,0,0)').bind(identity.id, identity.email, identity.name).run();
  await db.prepare("INSERT INTO workspaces(id,owner_id,name,slug,mode,database_name,database_host,state,created_at,updated_at) VALUES('ws','owner','Restaurant','restaurant','work','db','db','active',0,0)").run();
  for (const member of [owner.member, cook.member]) await db.prepare("INSERT INTO members(workspace_id,user_id,role,work_role,state,created_at,updated_at) VALUES('ws',?,?,?,'active',0,0)").bind(member.userId, member.role, member.workRole!).run();
});
async function connect() {
  const link = await beginLink(db, owner, 'slack', 'destination');
  await proveLink(db, event, link.command.split(' ').at(-1)!);
  await confirmLink(db, owner, link.id, 'https://join.slack.com/test');
}

describe('one member authority', () => {
  it('invites with a work role and activates through verified Google identity', async () => {
    await inviteMember(db, owner, { email: 'new@example.com', role: 'member', workRole: 'cashier' });
    const store = new ControlStore(db);
    const identity = { id: 'new', email: 'new@example.com', name: 'New' };
    await Effect.runPromise(store.upsertUser(identity));
    expect((await Effect.runPromise(store.access(identity, 'restaurant'))).member.workRole).toBe('cashier');
  });
  it('protects the owner and rejects member self-promotion', async () => {
    await expect(updateMember(db, cook, 'cook', { role: 'admin' })).rejects.toThrow();
    await expect(updateMember(db, owner, 'owner', { state: 'revoked' })).rejects.toThrow();
    await expect(inviteMember(db, owner, { email: owner.identity.email, role: 'member' })).rejects.toThrow();
  });
  it('requires provider proof and TAR confirmation before linking', async () => {
    const link = await beginLink(db, owner, 'slack', 'destination');
    await expect(confirmLink(db, owner, link.id, '')).rejects.toThrow();
    await proveLink(db, event, link.command.split(' ').at(-1)!);
    await expect(resolveSender(db, event)).rejects.toThrow();
    await confirmLink(db, owner, link.id, '');
    expect((await resolveSender(db, event)).identity.id).toBe('owner');
    await expect(proveLink(db, event, link.command.split(' ').at(-1)!)).rejects.toThrow();
  });
  it('rejects wrong-provider and wrong-destination identity linking', async () => {
    await connect(); const link = await beginLink(db, cook, 'slack', 'identity'); const token = link.command.split(' ').at(-1)!;
    await expect(proveLink(db, { ...event, provider: 'discord' }, token)).rejects.toThrow();
    await expect(proveLink(db, { ...event, channelId: 'OTHER' }, token)).rejects.toThrow();
    await proveLink(db, { ...event, userId: 'COOK' }, token); await confirmLink(db, cook, link.id, '');
    expect((await resolveSender(db, { ...event, userId: 'COOK' })).identity.id).toBe('cook');
    await updateMember(db, owner, 'cook', { state: 'revoked' });
    await expect(resolveSender(db, { ...event, userId: 'COOK' })).rejects.toThrow();
  });
  it('rejects expired proofs and disconnect removes all identity links', async () => {
    const link = await beginLink(db, owner, 'slack', 'destination');
    await db.prepare('UPDATE channel_link_requests SET expires_at=0 WHERE id=?').bind(link.id).run();
    await expect(proveLink(db, event, link.command.split(' ').at(-1)!)).rejects.toThrow();
    await connect(); await disconnect(db, owner, true);
    await expect(resolveSender(db, event)).rejects.toThrow();
  });
  it('keeps kitchen permissions and data separate from payments', () => {
    expect(canExecute(cook.member, 'pos.order.item.update')).toBe(true);
    expect(canExecute(cook.member, 'pos.checkout')).toBe(false);
    expect(canExecute(cook.member, 'record.update')).toBe(false);
    expect(canExecute({ ...cook.member, state: 'revoked' }, 'pos.order.item.update')).toBe(false);
    expect(canReadRecord(cook.member, { type: 'task', assignee: 'other', data: {} })).toBe(false);
    expect(canReadRecord(cook.member, { type: 'task', assignee: null, data: { workRole: 'cashier' } })).toBe(false);
    const projected = kitchenOrder({ data: { total: 100, customerId: 'private', lines: [{ productId: 'burger', quantity: 2, title: 'Burger', price: 50 }] } });
    expect(JSON.stringify(projected)).not.toMatch(/total|customerId|price/);
  });
  it('rejects off-provider invite URLs', () => {
    expect(() => joinUrl('slack', 'https://slack.com.evil.test/join')).toThrow();
    expect(() => joinUrl('discord', 'javascript:alert(1)')).toThrow();
    expect(joinUrl('discord', 'https://discord.gg/example')).toBe('https://discord.gg/example');
  });
  it('accepts signed Slack commands and rejects modified or stale requests', async () => {
    const raw = 'command=%2Ftar&team_id=T1&channel_id=C1&user_id=U1&text=help&trigger_id=1';
    const stamp = String(Math.floor(Date.now() / 1000)); const secret = 'test-signing-secret';
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`v0:${stamp}:${raw}`))), (n) => n.toString(16).padStart(2, '0')).join('');
    const request = (body: string, timestamp = stamp) => new Request('https://tar.test/events', { method: 'POST', body, headers: { 'X-Slack-Signature': 'v0=' + signature, 'X-Slack-Request-Timestamp': timestamp } });
    expect((await verifyEvent(request(raw), 'slack', { SLACK_SIGNING_SECRET: secret })).event?.userId).toBe('U1');
    await expect(verifyEvent(request(raw + 'x'), 'slack', { SLACK_SIGNING_SECRET: secret })).rejects.toThrow();
    await expect(verifyEvent(request(raw, '1'), 'slack', { SLACK_SIGNING_SECRET: secret })).rejects.toThrow();
  });
  it('verifies Discord signatures without importing Discord roles', async () => {
    const pair = await crypto.subtle.generateKey('Ed25519', true, ['sign','verify']) as CryptoKeyPair;
    const hex = (value: ArrayBuffer) => Array.from(new Uint8Array(value), (n) => n.toString(16).padStart(2, '0')).join('');
    const publicKey = hex(await crypto.subtle.exportKey('raw', pair.publicKey));
    const raw = JSON.stringify({ type: 2, id: '123', guild_id: 'guild', channel_id: 'channel', member: { roles: ['administrator'], user: { id: 'cook-chat', username: 'Cook' } }, data: { name: 'tar', options: [{ name: 'request', value: 'help' }] } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = hex(await crypto.subtle.sign('Ed25519', pair.privateKey, new TextEncoder().encode(timestamp + raw)));
    const request = (body: string) => new Request('https://tar.test/discord', { method: 'POST', body, headers: { 'X-Signature-Ed25519': signature, 'X-Signature-Timestamp': timestamp } });
    const parsed = await verifyEvent(request(raw), 'discord', { DISCORD_PUBLIC_KEY: publicKey });
    expect(parsed.event?.userId).toBe('cook-chat'); expect(parsed.event).not.toHaveProperty('roles');
    await expect(verifyEvent(request(raw + ' '), 'discord', { DISCORD_PUBLIC_KEY: publicKey })).rejects.toThrow();
  });
  it('verifies Google Chat issuer, service identity and audience', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ keys: [{ ...jwk, kid: 'chat-test', alg: 'RS256', use: 'sig' }] })));
    const token = (email: string, audience: string) => new SignJWT({ email, email_verified: true }).setProtectedHeader({ alg: 'RS256', kid: 'chat-test' }).setIssuer('https://accounts.google.com').setAudience(audience).setIssuedAt().setExpirationTime('5m').sign(privateKey);
    const body = JSON.stringify({ type: 'MESSAGE', space: { name: 'spaces/one' }, user: { name: 'users/cook' }, message: { name: 'spaces/one/messages/1', argumentText: 'help' } });
    const request = (bearer: string) => new Request('https://tar.test/google-chat', { method: 'POST', body, headers: { Authorization: 'Bearer ' + bearer } });
    try {
      const parsed = await verifyEvent(request(await token('chat@system.gserviceaccount.com', 'https://tar.test/google-chat')), 'google-chat', { GOOGLE_CHAT_AUDIENCE: 'https://tar.test/google-chat' });
      expect(parsed.event?.userId).toBe('users/cook');
      await expect(verifyEvent(request(await token('other@example.com', 'https://tar.test/google-chat')), 'google-chat', { GOOGLE_CHAT_AUDIENCE: 'https://tar.test/google-chat' })).rejects.toThrow();
      await expect(verifyEvent(request(await token('chat@system.gserviceaccount.com', 'wrong')), 'google-chat', { GOOGLE_CHAT_AUDIENCE: 'https://tar.test/google-chat' })).rejects.toThrow();
    } finally { vi.unstubAllGlobals(); }
  });
  it('recovers a committed chat Action without repeating its effect', async () => {
    await connect();
    const directory = mkdtempSync(join(tmpdir(), 'tar-chat-test-'));
    const client = createClient({ url: pathToFileURL(join(directory, 'workspace.db')).href });
    try {
      for (const statement of WORKSPACE_SCHEMA) await client.execute(statement);
      await client.execute("INSERT INTO records(id,type,title,state,data,version,created_at,updated_at) VALUES('task1','task','Prepare','open','{}',1,0,0)");
      const message = { ...event, text: 'done task1' };
      const id = await enqueueCommand(db, owner, message);
      expect(await enqueueCommand(db, owner, message)).toBe(id);
      await processCommand(db, id, async (_context, work) => work(client));
      expect((await db.prepare('SELECT state FROM channel_commands WHERE id=?').bind(id).first<{state: string}>())?.state).toBe('completed');
      await db.prepare("UPDATE channel_commands SET state='processing',due_at=0 WHERE id=?").bind(id).run();
      await processCommand(db, id, async (_context, work) => work(client));
      expect((await client.execute('SELECT id FROM events')).rows).toHaveLength(1);
    } finally { client.close(); }
  });
});
