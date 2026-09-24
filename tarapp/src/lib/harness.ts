import { getValidIdToken, invalidateGoogleToken } from './auth';
import type { ReleaseManifest, SiteDefinition, SitePatchOperation } from './site-schema';

export const HARNESS_URL = (process.env.EXPO_PUBLIC_TARHARNESS_URL || 'https://tarharness.tar-54d.workers.dev').replace(/\/$/, '');

export type HarnessRole = 'owner' | 'admin' | 'member' | 'guest';
export type WorkRole = 'general' | 'cook' | 'cashier';
export type ChatProvider = 'slack' | 'discord' | 'google-chat';
export interface HarnessMember { id: string; email: string; name: string | null; role: HarnessRole; workRole: WorkRole; state: 'active' | 'pending' | 'revoked'; }
export interface InboxPermissions { prepare: boolean; collect: boolean; completeTask: boolean; openOrder: boolean; }
export interface TeamChatState {
  commands: { id: string; state: string; result: string | null; createdAt: number }[];
  connection: { provider: ChatProvider; name: string; joinUrl: string } | null;
  identity: { provider: ChatProvider; name: string } | null;
  providers: { id: ChatProvider; name: string; configured: boolean; installUrl: string }[];
  canManage: boolean; role: HarnessRole; workRole: WorkRole;
  requests: { id: string; provider: ChatProvider; purpose: 'destination' | 'identity'; expiresAt: number; candidate: { userName: string; userId: string; channelName: string; channelId: string } | null }[];
}
export interface HarnessWorkspace { id: string; name: string; slug: string; scope: string; role: HarnessRole; mode: 'personal' | 'work'; state: 'provisioning' | 'active' | 'error' | 'archived'; }
export interface HarnessRecord { id: string; type: string; title: string; state: string; data: Record<string, unknown>; owner: string | null; assignee: string | null; version: number; createdAt: number; updatedAt: number; }
export interface HarnessFlowBook { id: string; name: string; version: number; data: Record<string, unknown>; }
export interface HarnessFlowStep { id: string; action: string; occurrence: number; state: string; input: Record<string, unknown>; output: Record<string, unknown> | null; version: number; created: number; updated: number; }
export interface HarnessFlowRun { id: string; flowId: string; name?: string; flowVersion: number; state: string; actionId: string | null; recordId: string | null; step?: number; version: number; updatedAt: number; context?: Record<string, unknown>; steps?: HarnessFlowStep[]; }
export interface Link { id: string; role: string; since: number | null; until: number | null; other: { id: string; type: string; name: string }; }
export interface Consent { id: string; contact: string; channel: string; purpose: string; state: 'granted' | 'revoked'; source: string; actor: string; created: number; }
export type HarnessFieldKind = 'text' | 'email' | 'number' | 'textarea' | 'record' | 'action-list';
export interface HarnessActionField { key: string; label: string; kind: HarnessFieldKind; required?: boolean; hidden?: boolean; defaultValue?: string; recordType?: string; }
export interface HarnessAction { id: string; version: number; title: string; description: string; type: 'app' | 'agent' | 'human'; interfaceKey: string; fields: HarnessActionField[]; output: string[]; roles: HarnessRole[]; effects: string[]; }
export interface HarnessInterfaceContract { key: string; version: number; title: string; presentation: 'sheet' | 'screen' | 'flow'; submitLabel: string; }
export type HarnessCanvasCard =
  | { id: string; kind: 'data'; title: string; display: 'value' | 'report' | 'chart'; value: number | string; caption?: string }
  | { id: string; kind: 'action'; title: string; description: string; actionId: string; initialInput?: Record<string, unknown> }
  | { id: string; kind: 'flow'; title: string; description: string; flowId: string; actionId?: string; initialInput?: Record<string, unknown> };
export class HarnessRequestError extends Error { constructor(readonly status: number, message: string) { super(message); } }
export function createOperationKey(prefix: string) { return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`; }

async function request<T>(path: string, options: { method?: 'GET' | 'POST' | 'PUT'; body?: Record<string, unknown>; key?: string } = {}): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new HarnessRequestError(408, 'TAR did not respond in time. Check your connection and retry.'));
    }, 20_000);
  });
  const operation = (async () => {
    const token = await getValidIdToken();
    if (!token) throw new HarnessRequestError(401, 'Your Google sign-in has expired. Please sign in again.');
    let response: Response;
    try {
      response = await fetch(`${HARNESS_URL}${path}`, { method: options.method || 'GET', headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.method === 'POST' || options.method === 'PUT' ? { 'Idempotency-Key': options.key || createOperationKey('tarapp') } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined, signal: controller.signal });
    } catch (cause) {
      if (controller.signal.aborted) throw new HarnessRequestError(408, 'TAR did not respond in time. Check your connection and retry.');
      throw cause;
    }
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      if (response.status === 401) await invalidateGoogleToken();
      throw new HarnessRequestError(response.status, typeof payload.error === 'string' ? payload.error : 'Harness request failed.');
    }
    return payload as T;
  })();
  try { return await Promise.race([operation, deadline]); }
  finally { if (timeout) clearTimeout(timeout); }
}

async function workspaceRegistry(slug: string) {
  return request<{ actions: HarnessAction[]; interfaces: HarnessInterfaceContract[] }>(workspacePath(slug, 'actions'));
}

const workspacePath = (slug: string, suffix: string) => `/v1/workspaces/${encodeURIComponent(slug)}/${suffix}`;
export const harness = {
  pos: <T>(slug: string, section: string, search = '', offset = 0) => request<T>(workspacePath(slug, 'pos/' + section) + '?q=' + encodeURIComponent(search) + '&offset=' + offset),
  posProductContent: (slug: string, productId: string) => request<{ content: Record<string, unknown> }>(workspacePath(slug, `pos/products/${encodeURIComponent(productId)}/content`)),
  health: () => request<{ ok: boolean }>('/health'),
  registry: () => request<{ actions: HarnessAction[]; interfaces: HarnessInterfaceContract[] }>('/v1/actions'),
  workspaceRegistry,
  members: (slug: string) => request<{ members: HarnessMember[]; currentUserId: string }>(workspacePath(slug, 'members')),
  updateMember: (slug: string, id: string, input: { role?: HarnessRole; workRole?: WorkRole; state?: 'revoked' }) => request(workspacePath(slug, `members/${encodeURIComponent(id)}`), { method: 'PUT', body: input }),
  teamChat: (slug: string) => request<TeamChatState>(workspacePath(slug, 'team-chat')),
  beginChatLink: (slug: string, provider: ChatProvider, purpose: 'destination' | 'identity') => request<{ id: string; command: string; expiresAt: number }>(workspacePath(slug, 'team-chat/link'), { method: 'POST', body: { provider, purpose } }),
  confirmChatLink: (slug: string, id: string, joinUrl: string) => request(workspacePath(slug, 'team-chat/confirm'), { method: 'POST', body: { id, joinUrl } }),
  disconnectChat: (slug: string, destination: boolean) => request(workspacePath(slug, 'team-chat/disconnect'), { method: 'POST', body: { destination } }),
  actions: () => request<{ actions: HarnessAction[]; interfaces: HarnessInterfaceContract[] }>('/v1/actions'),
  listWorkspaces: () => request<{ workspaces: HarnessWorkspace[] }>('/v1/workspaces'),
  createWorkspace: (name: string, slug: string) => request<{ workspace: HarnessWorkspace }>('/v1/workspaces', { method: 'POST', body: { name, slug }, key: createOperationKey(`workspace:${slug}`) }),
  inviteMember: (slug: string, email: string, role: Exclude<HarnessRole, 'owner'> = 'member', workRole: WorkRole = 'general') => request<{ invitation: { email: string; role: Exclude<HarnessRole, 'owner'>; state: 'pending' } }>(workspacePath(slug, 'members'), { method: 'POST', body: { email, role, workRole }, key: createOperationKey(`invite:${slug}:${email}`) }),
  canvas: (slug: string) => request<{ cards: HarnessCanvasCard[] }>(workspacePath(slug, 'canvas')),
  records: (slug: string, type?: string, offset = 0, search = '') => request<{ records: HarnessRecord[]; next: number | null }>(`${workspacePath(slug, 'records')}?${type ? `type=${encodeURIComponent(type)}&` : ''}q=${encodeURIComponent(search)}&offset=${offset}`),
  contacts: (slug: string, search = '', offset = 0) => request<{ contacts: HarnessRecord[]; next: number | null }>(`${workspacePath(slug, 'contacts')}?q=${encodeURIComponent(search)}&offset=${offset}`),
  links: (slug: string, id: string) => request<{ links: Link[] }>(workspacePath(slug, `records/${encodeURIComponent(id)}/links`)),
  consents: (slug: string, id: string) => request<{ consents: Consent[] }>(workspacePath(slug, `records/${encodeURIComponent(id)}/consents`)),
  flows: (slug: string) => request<{ books: HarnessFlowBook[]; runs: HarnessFlowRun[] }>(workspacePath(slug, 'flows')),
  flowRun: (slug: string, id: string) => request<{ run: HarnessFlowRun }>(workspacePath(slug, `runs/${encodeURIComponent(id)}`)),
  inbox: (slug: string) => request<{ tasks: HarnessRecord[]; orders: HarnessRecord[]; permissions: InboxPermissions }>(workspacePath(slug, 'inbox')),
  executeAction: <T extends Record<string, unknown> = Record<string, unknown>>(slug: string, actionId: string, input: Record<string, unknown>, operationKey: string) => request<T>(workspacePath(slug, `actions/${encodeURIComponent(actionId)}`), { method: 'POST', body: input, key: operationKey }),
  createRecord: (slug: string, input: { type: string; title: string; data?: Record<string, unknown> }) => request<{ record: HarnessRecord }>(workspacePath(slug, 'actions/record.create'), { method: 'POST', body: input, key: createOperationKey('record.create') }),
  createTask: (slug: string, title: string) => request<{ record: HarnessRecord }>(workspacePath(slug, 'actions/task.create'), { method: 'POST', body: { title }, key: createOperationKey('task.create') }),
  completeTask: (slug: string, taskId: string) => request<{ taskId: string; state: 'completed' }>(workspacePath(slug, 'actions/task.complete'), { method: 'POST', body: { taskId }, key: createOperationKey(`task.complete:${taskId}`) }),
  site: {
    get: (slug: string) => request<{ site: { id: string; version: number; state: string; data: SiteDefinition } | null }>(workspacePath(slug, 'site')),
    generate: (slug: string, input: { title?: string; prompt?: string; theme?: string }, operationKey?: string) =>
      request<{ siteId: string; version: number; state: string; site: SiteDefinition; preview: { html: string; css: string; hash: string } }>(
        workspacePath(slug, 'actions/site.generate'),
        { method: 'POST', body: input, key: operationKey || createOperationKey('site.generate') }
      ),
    update: (slug: string, siteId: string, baseVersion: number, operations: SitePatchOperation[], operationKey?: string) =>
      request<{ siteId: string; version: number; site: SiteDefinition }>(
        workspacePath(slug, 'actions/site.update'),
        { method: 'POST', body: { siteId, baseVersion, operations }, key: operationKey || createOperationKey('site.update') }
      ),
    publish: (slug: string, siteId: string, subdomain?: string, operationKey?: string) =>
      request<{ siteId: string; releaseId: string; liveUrl: string; generation: number; state: string }>(
        workspacePath(slug, 'actions/site.publish'),
        { method: 'POST', body: { siteId, subdomain }, key: operationKey || createOperationKey('site.publish') }
      ),
    rollback: (slug: string, siteId: string, releaseId: string, operationKey?: string) =>
      request<{ siteId: string; releaseId: string; rolledBack: boolean }>(
        workspacePath(slug, 'actions/site.rollback'),
        { method: 'POST', body: { siteId, releaseId }, key: operationKey || createOperationKey('site.rollback') }
      ),
    refresh: (slug: string, siteId: string, operationKey?: string) =>
      request<{ refreshed: boolean; itemCount: number }>(
        workspacePath(slug, 'actions/site.refresh'),
        { method: 'POST', body: { siteId }, key: operationKey || createOperationKey('site.refresh') }
      ),
  },
};
