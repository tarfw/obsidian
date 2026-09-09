import { createRemoteJWKSet, jwtVerify } from 'jose';
import { badRequest, unauthorized, unavailable } from '../errors.ts';

export const providers = ['slack', 'discord', 'google-chat'] as const;
export type Provider = typeof providers[number];
export interface ChannelEnv {
  SLACK_SIGNING_SECRET?: string;
  DISCORD_PUBLIC_KEY?: string;
  GOOGLE_CHAT_AUDIENCE?: string;
  SLACK_INSTALL_URL?: string;
  DISCORD_INSTALL_URL?: string;
  GOOGLE_CHAT_INSTALL_URL?: string;
}
export interface ChannelEvent {
  provider: Provider; tenantId: string; channelId: string; channelName: string;
  userId: string; userName: string; text: string; eventId: string;
}
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const string = (value: unknown) => typeof value === 'string' ? value : '';
const bytes = (hex: string) => Uint8Array.from(hex.match(/.{2}/g) || [], (part) => parseInt(part, 16));
const encoder = new TextEncoder();
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export function providerStatus(env: ChannelEnv) {
  return providers.map((id) => ({ id, name: id === 'google-chat' ? 'Google Chat' : id === 'slack' ? 'Slack' : 'Discord',
    configured: Boolean(id === 'slack' ? env.SLACK_SIGNING_SECRET : id === 'discord' ? env.DISCORD_PUBLIC_KEY : env.GOOGLE_CHAT_AUDIENCE),
    installUrl: id === 'slack' ? env.SLACK_INSTALL_URL || '' : id === 'discord' ? env.DISCORD_INSTALL_URL || '' : env.GOOGLE_CHAT_INSTALL_URL || '',
  }));
}

export function joinUrl(provider: Provider, value: unknown): string {
  if (!value) return '';
  if (typeof value !== 'string' || value.length > 2000) throw badRequest('Invalid invitation link.');
  let url: URL;
  try { url = new URL(value); } catch { throw badRequest('Use the provider invitation link.'); }
  const host = url.hostname;
  const allowed = provider === 'slack' ? host === 'slack.com' || host.endsWith('.slack.com')
    : provider === 'discord' ? host === 'discord.gg' || host === 'discord.com'
    : host === 'chat.google.com';
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed) throw badRequest('Use an HTTPS invitation link from the selected provider.');
  return url.href;
}

export async function readBody(request: Request): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) throw badRequest('Request body is required.');
  const decoder = new TextDecoder(); let result = ''; let size = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 100_000) { await reader.cancel(); throw badRequest('Request is too large.'); }
      result += decoder.decode(chunk.value, { stream: true });
    }
    return result + decoder.decode();
  } finally { reader.releaseLock(); }
}

export async function verifyEvent(request: Request, provider: Provider, env: ChannelEnv): Promise<{ event?: ChannelEvent; ping?: boolean }> {
  if (!providerStatus(env).find((item) => item.id === provider)?.configured) throw unavailable('This chat provider is not configured.');
  const raw = await readBody(request);
  if (provider === 'slack' || provider === 'discord') {
    const timestamp = request.headers.get(provider === 'slack' ? 'X-Slack-Request-Timestamp' : 'X-Signature-Timestamp') || '';
    if (!/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw unauthorized();
    if (provider === 'slack') {
      const signature = request.headers.get('X-Slack-Signature') || '';
      if (!/^v0=[0-9a-f]{64}$/.test(signature)) throw unauthorized();
      const key = await crypto.subtle.importKey('raw', encoder.encode(env.SLACK_SIGNING_SECRET!), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
      if (!await crypto.subtle.verify('HMAC', key, bytes(signature.slice(3)), encoder.encode(`v0:${timestamp}:${raw}`))) throw unauthorized();
      const form = new URLSearchParams(raw);
      if (form.get('command') !== '/tar') throw badRequest('Use the /tar command.');
      return { event: { provider, tenantId: form.get('team_id') || '', channelId: form.get('channel_id') || '', channelName: form.get('channel_name') || '',
        userId: form.get('user_id') || '', userName: form.get('user_name') || '', text: form.get('text') || '', eventId: form.get('trigger_id') || signature.slice(3) } };
    }
    const signature = request.headers.get('X-Signature-Ed25519') || '';
    if (!/^[0-9a-f]{128}$/i.test(signature) || !/^[0-9a-f]{64}$/i.test(env.DISCORD_PUBLIC_KEY!)) throw unauthorized();
    const key = await crypto.subtle.importKey('raw', bytes(env.DISCORD_PUBLIC_KEY!), 'Ed25519', false, ['verify']);
    if (!await crypto.subtle.verify('Ed25519', key, bytes(signature), encoder.encode(timestamp + raw))) throw unauthorized();
  } else {
    const token = request.headers.get('Authorization');
    if (!token?.startsWith('Bearer ')) throw unauthorized();
    try {
      const { payload } = await jwtVerify(token.slice(7), googleKeys, { audience: env.GOOGLE_CHAT_AUDIENCE, issuer: ['https://accounts.google.com', 'accounts.google.com'], algorithms: ['RS256'] });
      if (payload.email !== 'chat@system.gserviceaccount.com' || payload.email_verified !== true) throw unauthorized();
    } catch { throw unauthorized(); }
  }
  let data: Record<string, unknown>;
  try { data = object(JSON.parse(raw)); } catch { throw badRequest('Invalid chat event.'); }
  if (provider === 'discord') {
    if (data.type === 1) return { ping: true };
    const command = object(data.data); const user = object(object(data.member).user);
    if (data.type !== 2 || command.name !== 'tar') throw badRequest('Use the /tar command.');
    const options = Array.isArray(command.options) ? command.options.map(object) : [];
    return { event: { provider, tenantId: string(data.guild_id), channelId: string(data.channel_id), channelName: string(data.channel_id),
      userId: string(user.id), userName: string(user.global_name) || string(user.username), text: string(options.find((item) => item.name === 'request')?.value), eventId: string(data.id) } };
  }
  const space = object(data.space); const message = object(data.message); const user = object(data.user);
  if (data.type !== 'MESSAGE') throw badRequest('Send a message to TAR.');
  const content = string(message.argumentText) || string(message.text);
  return { event: { provider, tenantId: string(space.name), channelId: string(space.name), channelName: string(space.displayName),
    userId: string(user.name), userName: string(user.displayName), text: content.replace(/^\/tar\s+/i, '').trim(), eventId: string(message.name) } };
}

export function chatResponse(provider: Provider, text: string, userId?: string) {
  return Response.json(provider === 'slack' ? { response_type: 'ephemeral', text }
    : provider === 'discord' ? { type: 4, data: { content: text.slice(0, 1900), flags: 64, allowed_mentions: { parse: [] } } }
    : { text, ...(userId ? { privateMessageViewer: { name: userId } } : {}) });
}
