/** Typed, authenticated TarApp gateway for the Tarai Worker. */
import { getValidIdToken } from './auth';

const TARAI_URL = (process.env.EXPO_PUBLIC_TARAI_URL || 'https://tarai.tar-54d.workers.dev').replace(/\/$/, '');

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  scope: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  state: 'provisioning' | 'active' | 'grace' | 'readonly' | 'archived' | 'cold' | 'restoring' | 'error';
}

export interface WorkspaceOnboardingOption {
  id: string;
  label: string;
  icon: string;
}

export interface WorkspaceCategory extends WorkspaceOnboardingOption {
  keywords: string[];
  suggestedName: string;
  activities: string[];
  priorities: string[];
  actions: string[];
}

export interface WorkspaceBlueprintCatalog {
  version: number;
  categories: WorkspaceCategory[];
  activities: WorkspaceOnboardingOption[];
  priorities: WorkspaceOnboardingOption[];
  actions: Array<WorkspaceOnboardingOption & { target?: string }>;
}

export interface WorkspaceOnboardingInput {
  category: string;
  activities: string[];
  priorities: string[];
  actions: string[];
  audience: 'solo' | 'team';
  note?: string;
}

export interface CreditWallet { id: string; user: string; balance: number; }
export interface CreditPack { id: string; credits: number; price: number; currency: string; }
export interface AgentRate { id: string; name: string; action: string; credits: number; version: number; }
export interface CreditLedgerEntry { id: string; amount: number; kind: string; ref?: string; meta?: string; created: number; }
export interface PaymentOrder { payment: { id: string; amount: number; currency: string; credits: number; state: string }; checkoutUrl: string; }
export interface AgentRunResult {
  run: { id: string; state: string };
  result: { action?: string; summary?: string; data?: Record<string, unknown> } | null;
}

export class TaraiRequestError extends Error {
  constructor(public readonly status: number, message: string, public readonly path: string) {
    super(message);
    this.name = 'TaraiRequestError';
  }
}

export function setUserId(_id: string) {}
export function setUserEmail(_email: string) {}

function newIdempotencyKey(prefix = 'app'): string {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

async function request<T>(path: string, options: {
  method?: 'GET' | 'POST' | 'PUT';
  body?: Record<string, unknown>;
  scope?: string;
  idempotencyKey?: string;
} = {}): Promise<T> {
  const idToken = await getValidIdToken();
  if (!idToken) throw new TaraiRequestError(401, 'Your Google sign-in has expired. Please sign in again.', path);
  const headers: Record<string, string> = { Authorization: `Bearer ${idToken}` };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (options.scope && options.scope !== 'p' && options.scope !== 'personal') {
    headers['X-Workspace-Slug'] = options.scope.replace(/^w:/, '');
  }
  if (options.method === 'POST' || options.method === 'PUT') {
    headers['Idempotency-Key'] = options.idempotencyKey || newIdempotencyKey();
  }
  const response = await fetch(`${TARAI_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const raw = await response.text();
  let payload: any = {};
  if (raw) {
    try { payload = JSON.parse(raw); } catch { payload = { error: raw }; }
  }
  if (!response.ok) throw new TaraiRequestError(response.status, payload.error || `${response.status} ${response.statusText}`, path);
  return payload as T;
}

function entityOperation(name: string, input: Record<string, any>): Promise<any> {
  const body = { ...input };
  if (body.table === 'graph') {
    body.source = body.source ?? body.src;
    body.target = body.target ?? body.tgt;
    body.kind = String(body.kind ?? body.rel ?? 'related_to');
    delete body.src;
    delete body.tgt;
    delete body.rel;
  }
  return request<any>(`/api/entities/${name}`, { method: 'POST', body, scope: input.scope, idempotencyKey: input.idem });
}

function knowledgePath(path: string): string {
  return path.split('/').filter(Boolean).map(encodeURIComponent).join('/');
}

async function createWorkspace(data: { name: string; subdomain: string; onboarding?: WorkspaceOnboardingInput; description?: string; message?: string; modules?: string[]; type?: string }) {
  const created = await request<{ workspace: WorkspaceSummary }>('/api/workspaces', {
    method: 'POST',
    body: data,
    idempotencyKey: newIdempotencyKey(`workspace:${data.subdomain}`),
  });
  return created.workspace;
}

async function chat(message: string, scope?: string): Promise<any> {
  const started = await request<{ run: any }>('/api/intent', {
    method: 'POST',
    scope,
    body: { intent: message, action: 'workspace.summary', scope: 'workspace' },
  });
  if (!started.run?.id) return started;
  for (let attempt = 0; attempt < 12; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 500));
    const status = await request<{ run: any; result: any }>(`/api/runs/${encodeURIComponent(started.run.id)}`, { scope });
    if (status.run?.state === 'done') {
      return {
        run: status.run,
        data: status.result?.data || status.result,
        reply: status.result?.summary || 'Tar completed the workspace request.',
        executorResult: { success: true },
      };
    }
    if (status.run?.state === 'failed' || status.run?.state === 'refunded') {
      throw new TaraiRequestError(500, 'Tar could not complete this request. Reserved credits were refunded.', `/api/runs/${started.run.id}`);
    }
  }
  return { run: started.run, reply: 'Tar is still working. The result will appear in your inbox.', executorResult: { success: false } };
}

export const tar = {
  chat: (_sessionId: string, message: string, scope?: string) => chat(message, scope),
  aiTasks: (_scope: string) => Promise.resolve([]),
  executeAITask: (action: string, params: Record<string, any>, scope: string) => request('/api/intent', { method: 'POST', scope, body: { intent: action, action, parameters: params, scope: 'workspace' } }),
  tool: entityOperation,
  workflow: (name: string, input: Record<string, any>) => request(`/api/tools/${encodeURIComponent(name)}`, { method: 'POST', scope: input.scope, body: input }),
  search: (query: string, scope = 'p') => entityOperation('search', { table: 'matter', query, scope }),
  listTeams: () => Promise.resolve([]),
  createWorkspace,
  workspaceBlueprints: () => request<WorkspaceBlueprintCatalog>('/api/workspace-blueprints'),
  suggestWorkspace: (query: string) => request<{ category: string; activities: string[]; source: 'catalog' | 'ai' | 'fallback' }>('/api/workspace-blueprints/suggest', { method: 'POST', body: { query } }),
  listWorkspaces: (_email?: string) => request<{ workspaces: WorkspaceSummary[] }>('/api/workspaces'),
  wallet: () => request<{ wallet: CreditWallet | null }>('/api/wallet'),
  ledger: () => request<{ ledger: CreditLedgerEntry[] }>('/api/ledger'),
  agents: () => request<{ agents: AgentRate[] }>('/api/agents'),
  packs: () => request<{ packs: CreditPack[] }>('/api/packs'),
  runAgent: (action: string, input: Record<string, unknown>, scope: string) => request<{ run?: any; service?: any }>(`/api/agents/${encodeURIComponent(action)}/run`, { method: 'POST', scope, body: input }),
  site: {
    generate: (scope: string, input: { title: string; description?: string; style?: string }) =>
      request<{ run: { id: string; state: string } }>(`/api/agents/site.generate/run`, { method: 'POST', scope, body: input }),
    publish: (scope: string, job: string) =>
      request<{ run: { id: string; state: string } }>(`/api/agents/site.publish/run`, { method: 'POST', scope, body: { job } }),
    getRun: (scope: string, id: string) =>
      request<AgentRunResult>(`/api/runs/${encodeURIComponent(id)}`, { scope }),
  },
  createPaymentOrder: (pack: string) => request<PaymentOrder>('/api/payments/order', { method: 'POST', body: { pack } }),
  grantDevelopmentCredits: (credits: number) => request<{ wallet: CreditWallet }>('/api/dev/credits', { method: 'POST', body: { credits } }),
  approvals: (scope: string) => request<any[]>('/api/approvals', { scope }),
  decideApproval: (id: string, decision: 'approved' | 'rejected', scope: string, reason = '') => request(`/api/approvals/${encodeURIComponent(id)}/decide`, { method: 'POST', scope, body: { decision, reason } }),
  members: (scope: string) => request<{ members: any[] }>('/api/members', { scope }),
  addMember: (scope: string, member: { email: string; role: 'admin' | 'member' | 'guest'; budget?: number }) => request('/api/members', { method: 'POST', scope, body: member }),
  setMemberBudget: (scope: string, id: string, budget: number) => request(`/api/members/${encodeURIComponent(id)}/budget`, { method: 'POST', scope, body: { budget } }),
  toolsExecute: (action: string, params: Record<string, any>, scope: string) => request('/api/intent', { method: 'POST', scope, body: { intent: action, action, parameters: params, scope: 'workspace' } }),
  writeEvent: (scope: string, type: string, data: Record<string, any>, idem?: string) => entityOperation('create', { table: 'motion', type, data, scope, idem }),
  getInbox: (scope: string) => entityOperation('read', { table: 'inbox', scope }),
  markTaskDone: (taskId: string, scope: string) => entityOperation('update', { table: 'inbox', id: taskId, patch: { status: 2 }, scope }),
  getSyncBootstrap: () => request<{ url: string; token: string; host: string; db: string; expiresAt: number }>('/api/sync/bootstrap'),
  metrics: (scope: string) => request<{ view: string; rows: Array<{ value: number; count: number }> }>(`/api/data-views/metrics.get`, { scope }),
  timeline: (_opts?: { limit?: number; since?: string }) => Promise.resolve([]),
  okf: {
    read: (scope: string, path: string) => request<{ path: string; content: string }>(`/api/knowledge/${knowledgePath(path)}`, { scope }),
    readIndex: (scope: string) => request<{ path: string; content: string }>('/api/knowledge/index.md', { scope }),
    upload: (scope: string, path: string, content: string) => request(`/api/knowledge/${knowledgePath(path)}`, { method: 'PUT', scope, body: { content } }),
    edit: (scope: string, path: string, content: string) => request(`/api/knowledge/${knowledgePath(path)}`, { method: 'PUT', scope, body: { content } }),
  },
  team: {
    getRoster: (scope: string) => request<{ members: any[] }>('/api/members', { scope }),
    sync: async (_scope: string, _members: any) => ({ success: false, reason: 'Membership changes require the typed member API.' }),
  },
  canvas: {
    get: (scope: string) => request<any>('/api/canvas', { scope }),
    save: (scope: string, canvas: any) => request('/api/canvas', { method: 'POST', scope, body: canvas }),
    add: async (scope: string, block: any) => {
      const canvas = await request<any>('/api/canvas', { scope });
      const next = { ...canvas, blocks: [...(canvas.blocks || []), typeof block === 'string' ? { id: block, type: block } : block].slice(0, 3) };
      return request('/api/canvas', { method: 'POST', scope, body: next });
    },
    remove: async (scope: string, module: string) => {
      const canvas = await request<any>('/api/canvas', { scope });
      const next = { ...canvas, blocks: (canvas.blocks || []).filter((block: any) => block.id !== module && block.type !== module) };
      return request('/api/canvas', { method: 'POST', scope, body: next });
    },
  },
  dataView: (scope: string, view: string, params: { limit?: number } = {}) => {
    const query = params.limit ? `?limit=${encodeURIComponent(String(params.limit))}` : '';
    return request<{ view: string; version: number; rows: Record<string, unknown>[]; generatedAt: number }>(`/api/data-views/${encodeURIComponent(view)}${query}`, { scope });
  },
  ai: {
    transcribe: async (_audioBase64: string, _mimeType = 'audio/m4a') => ({ text: '' }),
    planCanvas: async (_prompt: string, _workspaceName?: string, _vertical?: string, _scope?: string) => ({ success: false, chips: [], blocks: [], canvasMarkdown: '' }),
  },
};

export const taraiUrl = TARAI_URL;
