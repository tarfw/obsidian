import { getValidIdToken, invalidateGoogleToken } from './auth';

const HARNESS_URL = (process.env.EXPO_PUBLIC_TARHARNESS_URL || 'https://tarharness.tar-54d.workers.dev').replace(/\/$/, '');

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
export type HarnessFieldKind = 'text' | 'email' | 'number' | 'textarea' | 'record' | 'action-list';
export interface HarnessActionField { key: string; label: string; kind: HarnessFieldKind; required?: boolean; hidden?: boolean; defaultValue?: string; recordType?: string; }
export interface HarnessAction { id: string; version: number; title: string; description: string; type: 'app' | 'agent' | 'human'; interfaceKey: string; fields: HarnessActionField[]; output: string[]; roles: HarnessRole[]; effects: string[]; }
export interface HarnessInterfaceContract { key: string; version: number; title: string; presentation: 'sheet' | 'screen' | 'flow'; submitLabel: string; }
export type HarnessCanvasCard =
  | { id: string; kind: 'data'; title: string; display: 'value' | 'report' | 'chart'; value: number | string; caption?: string }
  | { id: string; kind: 'action'; title: string; description: string; actionId: string; initialInput?: Record<string, unknown> }
  | { id: string; kind: 'flow'; title: string; description: string; flowId: string; actionId?: string; initialInput?: Record<string, unknown> };
export interface HarnessBotFlow { id: string; title: string; description: string; records: string[]; actions: { id: string }[]; template: boolean; installed: boolean; }
export interface HarnessDirectoryBot { id: string; title: string; description: string; category: string; guidance: string; flows: HarnessBotFlow[]; installed: boolean; }

export class HarnessRequestError extends Error { constructor(readonly status: number, message: string) { super(message); } }
export function createOperationKey(prefix: string) { return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`; }

async function request<T>(path: string, options: { method?: 'GET' | 'POST' | 'PUT'; body?: Record<string, unknown>; key?: string } = {}): Promise<T> {
  const token = await getValidIdToken();
  if (!token) throw new HarnessRequestError(401, 'Your Google sign-in has expired. Please sign in again.');
  const response = await fetch(`${HARNESS_URL}${path}`, { method: options.method || 'GET', headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.method === 'POST' || options.method === 'PUT' ? { 'Idempotency-Key': options.key || createOperationKey('tarapp') } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    if (response.status === 401) await invalidateGoogleToken();
    throw new HarnessRequestError(response.status, typeof payload.error === 'string' ? payload.error : 'Harness request failed.');
  }
  return payload as T;
}

async function workspaceRegistry(slug: string) {
  try {
    return await request<{ actions: HarnessAction[]; interfaces: HarnessInterfaceContract[] }>(workspacePath(slug, 'actions'));
  } catch (cause) {
    // Keep the app usable while an older harness deployment is being upgraded.
    if (cause instanceof HarnessRequestError && cause.status === 404) {
      return request<{ actions: HarnessAction[]; interfaces: HarnessInterfaceContract[] }>('/v1/actions');
    }
    throw cause;
  }
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
  directory: (slug: string) => request<{ bots: HarnessDirectoryBot[] }>(workspacePath(slug, 'directory')),
  installDirectoryBot: (slug: string, itemId: string, flowIds: string[], operationKey: string) => request<{ itemId: string; flowIds: string[]; installed: true }>(workspacePath(slug, 'actions/directory.install'), { method: 'POST', body: { itemId, flowIds }, key: operationKey }),
  removeDirectoryBot: (slug: string, itemId: string, operationKey: string) => request<{ itemId: string; installed: false }>(workspacePath(slug, 'actions/directory.remove'), { method: 'POST', body: { itemId }, key: operationKey }),
  records: (slug: string, type?: string) => request<{ records: HarnessRecord[] }>(`${workspacePath(slug, 'records')}${type ? `?type=${encodeURIComponent(type)}` : ''}`),
  inbox: (slug: string) => request<{ tasks: HarnessRecord[]; orders: HarnessRecord[]; permissions: InboxPermissions }>(workspacePath(slug, 'inbox')),
  executeAction: <T extends Record<string, unknown> = Record<string, unknown>>(slug: string, actionId: string, input: Record<string, unknown>, operationKey: string) => request<T>(workspacePath(slug, `actions/${encodeURIComponent(actionId)}`), { method: 'POST', body: input, key: operationKey }),
  createRecord: (slug: string, input: { type: string; title: string; data?: Record<string, unknown> }) => request<{ record: HarnessRecord }>(workspacePath(slug, 'actions/record.create'), { method: 'POST', body: input, key: createOperationKey('record.create') }),
  createTask: (slug: string, title: string) => request<{ record: HarnessRecord }>(workspacePath(slug, 'actions/task.create'), { method: 'POST', body: { title }, key: createOperationKey('task.create') }),
  completeTask: (slug: string, taskId: string) => request<{ taskId: string; state: 'completed' }>(workspacePath(slug, 'actions/task.complete'), { method: 'POST', body: { taskId }, key: createOperationKey(`task.complete:${taskId}`) }),
};
