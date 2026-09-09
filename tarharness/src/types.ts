export type Role = 'owner' | 'admin' | 'member' | 'guest';
export type WorkspaceState = 'provisioning' | 'active' | 'error' | 'archived';

export interface Identity { readonly id: string; readonly email: string; readonly name: string | null; }
export interface Workspace { readonly id: string; readonly name: string; readonly slug: string; readonly mode: 'personal' | 'work'; readonly databaseName: string; readonly databaseHost: string | null; readonly state: WorkspaceState; }
export interface Member { readonly workspaceId: string; readonly userId: string; readonly role: Role; readonly workRole?: import('./access.ts').WorkRole; readonly state: 'active' | 'invited' | 'revoked'; }
export interface AccessContext { readonly identity: Identity; readonly workspace: Workspace; readonly member: Member; }

export interface RecordItem { readonly id: string; readonly type: string; readonly title: string; readonly state: string; readonly data: Record<string, unknown>; readonly owner: string | null; readonly assignee: string | null; readonly version: number; readonly createdAt: number; readonly updatedAt: number; }
export interface FlowDefinition { readonly id: string; readonly name: string; readonly version: number; readonly state: string; readonly data: Record<string, unknown>; }
export interface FlowRun { readonly id: string; readonly flowId: string; readonly flowVersion: number; readonly occurrence: string; readonly recordId: string | null; readonly state: string; readonly actionId: string | null; readonly context: Record<string, unknown>; readonly version: number; readonly dueAt: number | null; }
