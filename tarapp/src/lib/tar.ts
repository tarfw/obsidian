/** Secure TarApp gateway for the Tarai Worker. */
import { getValidIdToken } from './auth';

const TARAI_URL = process.env.EXPO_PUBLIC_TARAI_URL || 'https://tarai.tar-54d.workers.dev';

// Retained for existing screens. Tarai derives identity from the verified token.
export function setUserId(_id: string) {}
export function setUserEmail(_email: string) {}

async function headers(scope?: string, json = false): Promise<Record<string, string>> {
  const idToken = await getValidIdToken();
  if (!idToken) throw new Error('Your Google sign-in has expired. Please sign in again.');
  const result: Record<string, string> = { Authorization: `Bearer ${idToken}` };
  if (json) result['Content-Type'] = 'application/json';
  if (scope && scope !== 'p') result['X-Workspace-Slug'] = scope.replace(/^w:/, '');
  return result;
}

async function request<T>(path: string, options: { method?: 'GET' | 'POST'; body?: Record<string, unknown>; scope?: string } = {}): Promise<T> {
  const requestHeaders = await headers(options.scope, Boolean(options.body));
  if (options.method === 'POST') {
    requestHeaders['Idempotency-Key'] = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  const res = await fetch(`${TARAI_URL}${path}`, {
    method: options.method || 'GET',
    headers: requestHeaders,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${path} failed: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export function getSyncCredential(scope: string): Promise<{ url: string; token: string; expires: number }> {
  return request(scope === 'p' ? '/api/sync/personal' : '/api/sync/workspace', { scope });
}

function entityOperation(name: string, input: Record<string, any>): Promise<any> {
  return request<any>(`/api/entities/${name}`, { method: 'POST', body: input, scope: input.scope });
}

export const tar = {
  chat: (_sessionId: string, message: string, scope?: string): Promise<any> => request<any>('/api/intent', { method: 'POST', scope, body: { intent: message, scope: 'workspace' } }),
  aiTasks: (_scope: string) => Promise.resolve([]),
  executeAITask: (action: string, params: Record<string, any>, scope: string) => request('/api/intent', { method: 'POST', scope, body: { intent: action, parameters: params, scope: 'workspace' } }),
  tool: entityOperation,
  workflow: (name: string, input: Record<string, any>) => request(`/api/tools/${name}`, { method: 'POST', scope: input.scope, body: input }),
  search: (query: string) => Promise.resolve({ results: [], query }),
  listTeams: () => Promise.resolve([]),
  createWorkspace: (data: { name: string; subdomain: string; description?: string; message?: string; modules?: string[]; type?: string }) => request('/api/workspaces', { method: 'POST', body: data }),
  listWorkspaces: (_email?: string) => request<{ workspaces: any[] }>('/api/workspaces'),
  toolsExecute: (action: string, params: Record<string, any>, scope: string) => request('/api/intent', { method: 'POST', scope, body: { intent: action, parameters: params, scope: 'workspace' } }),
  writeEvent: (scope: string, type: string, data: Record<string, any>) => entityOperation('create', { table: 'motion', type, data, scope }),
  getInbox: (scope: string) => entityOperation('read', { table: 'inbox', scope }),
  markTaskDone: (taskId: string, scope: string) => entityOperation('update', { table: 'inbox', id: taskId, patch: { status: 'done' }, scope }),
  timeline: (_opts?: { limit?: number; since?: string }) => Promise.resolve([]),
  // Arbitrary client SQL was removed. Screens now use the scoped entity API.
  db: { query: async (_sql: string, _args: any[] = [], _scope?: string): Promise<any[]> => [] },
  okf: {
    read: async (_scope: string, _path: string): Promise<any> => null,
    readIndex: async (_scope: string): Promise<any> => null,
    upload: async (_scope: string, _path: string, _content: string) => { throw new Error('Knowledge-file editing is not enabled in this Tarai release.'); },
    edit: async (_scope: string, _path: string, _content: string) => { throw new Error('Knowledge-file editing is not enabled in this Tarai release.'); },
  },
  team: { getRoster: async (_scope: string) => ({ members: [] }), sync: async (_scope: string, _members: any) => ({ success: false }) },
  canvas: { add: async (_scope: string, _block: any) => ({ success: false }), remove: async (_scope: string, _module: string) => ({ success: false }) },
  ai: {
    transcribe: async (_audioBase64: string, _mimeType = 'audio/m4a') => ({ text: '' }),
    planCanvas: async (_prompt: string, _workspaceName?: string, _vertical?: string, _scope?: string) => ({ success: false, chips: [], blocks: [], canvasMarkdown: '' }),
  },
};

export const taraiUrl = TARAI_URL;
