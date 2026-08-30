import type { Client } from '@libsql/client';
import { HARNESS_WORKSPACE_SCHEMA } from '../data/dedicated-schema.ts';
import { initializeSchema } from '../data/turso.ts';

export type HarnessRole = 'owner' | 'admin' | 'member' | 'guest';
export type DefKind = 'data' | 'bot';
export type StepMode = 'deterministic' | 'agentic';
export type CardKind = 'inbox' | 'action' | 'data' | 'report';

export interface HarnessDef { id: string; kind: DefKind; name: string; body: Record<string, unknown>; version: number; state: string; created: number; updated: number; }
export interface HarnessRecord { id: string; type: string; title: string; data: Record<string, unknown>; status: string; version: number; createdBy: string; created: number; updated: number; }
export interface HarnessRun { id: string; botId: string; workflowId: string; stepId: string; recordId: string | null; state: string; data: Record<string, unknown>; version: number; actor: string; created: number; updated: number; }

function json(value: unknown): Record<string, unknown> { try { return typeof value === 'string' ? JSON.parse(value) : (value as Record<string, unknown>) || {}; } catch { return {}; } }
function now() { return Date.now(); }
function rowDef(row: Record<string, unknown>): HarnessDef { return { id: String(row.id), kind: row.kind as DefKind, name: String(row.name), body: json(row.body), version: Number(row.version), state: String(row.state), created: Number(row.created), updated: Number(row.updated) }; }
function rowRecord(row: Record<string, unknown>): HarnessRecord { return { id: String(row.id), type: String(row.type), title: String(row.title), data: json(row.data), status: String(row.status), version: Number(row.version), createdBy: String(row.created_by), created: Number(row.created), updated: Number(row.updated) }; }
function rowRun(row: Record<string, unknown>): HarnessRun { return { id: String(row.id), botId: String(row.bot_id), workflowId: String(row.workflow_id), stepId: String(row.step_id), recordId: row.record_id ? String(row.record_id) : null, state: String(row.state), data: json(row.data), version: Number(row.version), actor: String(row.actor), created: Number(row.created), updated: Number(row.updated) }; }

export async function ensureHarnessSchema(client: Client): Promise<void> { await initializeSchema(client, HARNESS_WORKSPACE_SCHEMA); }

export class HarnessRepository {
  constructor(private readonly client: Client) {}
  async listDefs(kind?: DefKind): Promise<HarnessDef[]> {
    const result = await this.client.execute({ sql: `SELECT * FROM defs WHERE deleted_at IS NULL${kind ? ' AND kind = ?' : ''} ORDER BY updated DESC`, args: kind ? [kind] : [] });
    return result.rows.map((row) => rowDef(Object.fromEntries(result.columns.map((column, i) => [column, row[i]]))));
  }
  async getDef(id: string): Promise<HarnessDef | null> {
    const result = await this.client.execute({ sql: 'SELECT * FROM defs WHERE id = ? AND deleted_at IS NULL', args: [id] });
    if (!result.rows[0]) return null;
    return rowDef(Object.fromEntries(result.columns.map((column, i) => [column, result.rows[0][i]])));
  }
  async putDef(input: { id?: string; kind: DefKind; name: string; body: Record<string, unknown> }): Promise<HarnessDef> {
    const id = input.id || `def_${crypto.randomUUID()}`; const stamp = now();
    await this.client.execute({ sql: `INSERT INTO defs (id,kind,name,body,version,state,created,updated) VALUES (?,?,?,?,1,'active',?,?) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,name=excluded.name,body=excluded.body,version=defs.version+1,updated=excluded.updated,deleted_at=NULL`, args: [id, input.kind, input.name, JSON.stringify(input.body), stamp, stamp] });
    return (await this.getDef(id))!;
  }
  async listRecords(type?: string, limit = 100): Promise<HarnessRecord[]> {
    const result = await this.client.execute({ sql: `SELECT * FROM records WHERE deleted_at IS NULL${type ? ' AND type = ?' : ''} ORDER BY updated DESC LIMIT ?`, args: type ? [type, limit] : [limit] });
    return result.rows.map((row) => rowRecord(Object.fromEntries(result.columns.map((column, i) => [column, row[i]]))));
  }
  async getRecord(id: string): Promise<HarnessRecord | null> {
    const result = await this.client.execute({ sql: 'SELECT * FROM records WHERE id = ? AND deleted_at IS NULL', args: [id] });
    return result.rows[0] ? rowRecord(Object.fromEntries(result.columns.map((column, i) => [column, result.rows[0][i]]))) : null;
  }
  async createRecord(input: { id?: string; type: string; title: string; data: Record<string, unknown>; actor: string; status?: string }): Promise<HarnessRecord> {
    const id = input.id || `rec_${crypto.randomUUID()}`; const stamp = now();
    await this.client.execute({ sql: 'INSERT INTO records (id,type,title,data,status,version,created_by,created,updated) VALUES (?,?,?,?,?,1,?,?,?)', args: [id,input.type,input.title,JSON.stringify(input.data),input.status || 'active',input.actor,stamp,stamp] });
    return (await this.getRecord(id))!;
  }
  async updateRecord(id: string, patch: { title?: string; data?: Record<string, unknown>; status?: string; baseVersion?: number }): Promise<HarnessRecord> {
    const current = await this.getRecord(id); if (!current) throw new Error('Record not found');
    if (patch.baseVersion !== undefined && patch.baseVersion !== current.version) throw new Error('Record changed. Refresh and try again.');
    const stamp = now(); const result = await this.client.execute({ sql: 'UPDATE records SET title=?,data=?,status=?,version=version+1,updated=? WHERE id=? AND version=? AND deleted_at IS NULL', args: [patch.title || current.title, JSON.stringify({ ...current.data, ...(patch.data || {}) }), patch.status || current.status, stamp,id,current.version] });
    if (!result.rowsAffected) throw new Error('Record changed. Refresh and try again.'); return (await this.getRecord(id))!;
  }
  async createRun(input: { botId: string; workflowId: string; stepId: string; recordId?: string; actor: string; data?: Record<string, unknown> }): Promise<HarnessRun> {
    const id = `run_${crypto.randomUUID()}`, stamp = now();
    await this.client.execute({ sql: 'INSERT INTO runs (id,bot_id,workflow_id,step_id,record_id,state,data,version,actor,created,updated) VALUES (?,?,?,?,?,\'open\',?,1,?,?,?)', args: [id,input.botId,input.workflowId,input.stepId,input.recordId || null,JSON.stringify(input.data || {}),input.actor,stamp,stamp] });
    return (await this.getRun(id))!;
  }
  async listRuns(actor: string, state = 'open'): Promise<HarnessRun[]> {
    const result = await this.client.execute({ sql: 'SELECT * FROM runs WHERE actor = ? AND state = ? ORDER BY updated DESC LIMIT 20', args: [actor, state] });
    return result.rows.map((row) => rowRun(Object.fromEntries(result.columns.map((column, index) => [column, row[index]]))));
  }
  async getRun(id: string): Promise<HarnessRun | null> { const result = await this.client.execute({ sql: 'SELECT * FROM runs WHERE id=?', args: [id] }); return result.rows[0] ? rowRun(Object.fromEntries(result.columns.map((column, i) => [column, result.rows[0][i]]))) : null; }
  async updateRun(id: string, input: { stepId: string; state?: string; data?: Record<string, unknown> }): Promise<HarnessRun> { const current = await this.getRun(id); if (!current) throw new Error('Run not found'); const stamp=now(); await this.client.execute({ sql:'UPDATE runs SET step_id=?,state=?,data=?,version=version+1,updated=? WHERE id=?', args:[input.stepId,input.state || current.state,JSON.stringify({ ...current.data, ...(input.data || {}) }),stamp,id] }); return (await this.getRun(id))!; }
  async event(input: { actor: string; action: string; ref?: string; data?: Record<string, unknown>; idem: string }): Promise<void> { await this.client.execute({ sql:'INSERT INTO events (id,actor,action,ref,data,idem,created) VALUES (?,?,?,?,?,?,?) ON CONFLICT(idem) DO NOTHING', args:[`evt_${crypto.randomUUID()}`,input.actor,input.action,input.ref || null,JSON.stringify(input.data || {}),input.idem,now()] }); }
}

export function botWorkflow(def: HarnessDef, workflowId: string) {
  const workflows = Array.isArray(def.body.workflows) ? def.body.workflows as Record<string, unknown>[] : [];
  const workflow = workflows.find((item) => item.id === workflowId);
  if (!workflow) throw new Error('Workflow not found');
  const steps = Array.isArray(workflow.steps) ? workflow.steps as Record<string, unknown>[] : [];
  if (!steps.length) throw new Error('Workflow has no Steps');
  return { workflow, steps };
}
export function allowedForRole(def: HarnessDef, role: HarnessRole): boolean { const roles = Array.isArray(def.body.roles) ? def.body.roles : []; return roles.length === 0 || roles.includes(role) || role === 'owner'; }
export function stepMode(step: Record<string, unknown>): StepMode { return step.mode === 'agentic' ? 'agentic' : 'deterministic'; }
export function stepCard(step: Record<string, unknown>): CardKind | null { const card = step.card as Record<string, unknown> | undefined; return card && ['inbox','action','data','report'].includes(String(card.kind)) ? card.kind as CardKind : null; }
