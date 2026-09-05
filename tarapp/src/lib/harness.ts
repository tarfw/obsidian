import { getValidIdToken } from './auth';

const HARNESS_URL = (process.env.EXPO_PUBLIC_TARHARNESS_URL || 'https://tarharness.tar-54d.workers.dev').replace(/\/$/, '');

export type HarnessRole = 'owner' | 'admin' | 'member' | 'guest';
export interface HarnessWorkspace { id: string; name: string; slug: string; scope: string; role: HarnessRole; mode: 'personal' | 'work'; state: 'provisioning' | 'active' | 'error' | 'archived'; }
export interface HarnessRecord { id: string; type: string; title: string; state: string; data: Record<string, unknown>; owner: string | null; assignee: string | null; version: number; createdAt: number; updatedAt: number; }
export interface HarnessAction { id: string; title: string; type: 'app' | 'agent' | 'human'; effects: string[]; }

export class HarnessRequestError extends Error { constructor(readonly status: number, message: string) { super(message); } }
function operationKey(prefix: string) { return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`; }

async function request<T>(path: string, options: { method?: 'GET' | 'POST' | 'PUT'; body?: Record<string, unknown>; key?: string } = {}): Promise<T> {
  const token = await getValidIdToken();
  if (!token) throw new HarnessRequestError(401, 'Your Google sign-in has expired. Please sign in again.');
  const response = await fetch(`${HARNESS_URL}${path}`, { method: options.method || 'GET', headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.method === 'POST' || options.method === 'PUT' ? { 'Idempotency-Key': options.key || operationKey('tarapp') } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new HarnessRequestError(response.status, typeof payload.error === 'string' ? payload.error : 'Harness request failed.');
  return payload as T;
}

const workspacePath = (slug: string, suffix: string) => `/v1/workspaces/${encodeURIComponent(slug)}/${suffix}`;
export const harness = {
  health: () => request<{ ok: boolean }>('/health'),
  actions: () => request<{ actions: HarnessAction[] }>('/v1/actions'),
  listWorkspaces: () => request<{ workspaces: HarnessWorkspace[] }>('/v1/workspaces'),
  createWorkspace: (name: string, slug: string) => request<{ workspace: HarnessWorkspace }>('/v1/workspaces', { method: 'POST', body: { name, slug }, key: operationKey(`workspace:${slug}`) }),
  inviteMember: (slug: string, email: string, role: Exclude<HarnessRole, 'owner'> = 'member') => request<{ invitation: { email: string; role: Exclude<HarnessRole, 'owner'>; state: 'pending' } }>(workspacePath(slug, 'members'), { method: 'POST', body: { email, role }, key: operationKey(`invite:${slug}:${email}`) }),
  records: (slug: string, type?: string) => request<{ records: HarnessRecord[] }>(`${workspacePath(slug, 'records')}${type ? `?type=${encodeURIComponent(type)}` : ''}`),
  inbox: (slug: string) => request<{ tasks: HarnessRecord[] }>(workspacePath(slug, 'inbox')),
  createRecord: (slug: string, input: { type: string; title: string; data?: Record<string, unknown> }) => request<{ record: HarnessRecord }>(workspacePath(slug, 'actions/record.create'), { method: 'POST', body: input, key: operationKey('record.create') }),
  createTask: (slug: string, title: string) => request<{ record: HarnessRecord }>(workspacePath(slug, 'actions/task.create'), { method: 'POST', body: { title }, key: operationKey('task.create') }),
  completeTask: (slug: string, taskId: string) => request<{ taskId: string; state: 'completed' }>(workspacePath(slug, 'actions/task.complete'), { method: 'POST', body: { taskId }, key: operationKey(`task.complete:${taskId}`) }),
};
