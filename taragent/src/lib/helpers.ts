/**
 * Helper database operations for the agents and tools.
 * Aligned with dbrules.md schema.
 */

import { dbGet, dbAll, dbRun, envContext } from './db';
import {
  toMatterTypeCode,
  toMotionTypeCode,
  toInboxTypeCode,
  toGraphRelCode,
} from './types-config';

// ============================================================
// ULID Generator (Crockford's Base32)
// ============================================================
const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ENCODING_LEN = 32;

function encodeTime(now: number, len: number): string {
  let str = "";
  for (let i = len - 1; i >= 0; i--) {
    const mod = now % ENCODING_LEN;
    str = ENCODING.charAt(mod) + str;
    now = Math.floor(now / ENCODING_LEN);
  }
  return str;
}

function encodeRandom(len: number): string {
  let str = "";
  for (let i = 0; i < len; i++) {
    const rand = Math.floor(Math.random() * ENCODING_LEN);
    str += ENCODING.charAt(rand);
  }
  return str;
}

export function generateUlid(now: number = Date.now()): string {
  return encodeTime(now, 10) + encodeRandom(16);
}

export function generateEntityId(type: string | number): string {
  const typeStr = typeof type === 'number' ? `type${type}` : type;
  const prefixMap: Record<string, string> = {
    product: 'prd', order: 'ord', booking: 'bkg', customer: 'cus',
    staff: 'stf', invoice: 'inv', expense: 'exp', deal: 'dea',
    contract: 'ctr', asset: 'ast', ticket: 'tkt', project: 'prj',
    payslip: 'pay', purchase: 'pur', workorder: 'woe', shipment: 'shp',
    listing: 'lst', setting: 'set', motion: 'mot', inbox: 'ibx'
  };
  const prefix = prefixMap[typeStr] || typeStr.slice(0, 3).toLowerCase();
  return `${prefix}${generateUlid()}`;
}

function parseJson(v: any): any {
  if (!v) return {};
  try { return JSON.parse(String(v)); } catch { return {}; }
}

const RICH_FIELD_KEYS = new Set([
  'description', 'images', 'variants', 'notes', 'address', 'form_answers',
  'attachments', 'line_items', 'history', 'preferences', 'terms', 'bank_details',
  'activity_notes', 'contacts', 'intake_form', 'tags', 'seo'
]);

// ============================================================
// executeCreate — Insert into any table (plan6.md integer types & soft deletes)
// ============================================================
export async function executeCreate(input: {
  table: string;
  scope?: string;
  type?: string | number;
  title?: string;
  value?: number;
  price?: number;
  qty?: number;
  min_qty?: number;
  status?: string | number;
  data?: Record<string, any>;
  file?: string;
  ref?: string;
  by?: string;
  src?: string;
  rel?: string | number;
  tgt?: string;
  due?: number;
  at?: number;
  idem?: string;
  [key: string]: any;
}) {
  const scope = input.scope || 'ws:global';
  const nowUnix = Math.floor(Date.now() / 1000);

  if (input.table === 'matter') {
    const typeCode = toMatterTypeCode(input.type || 'product');
    const id = input.id || generateEntityId(input.type || 'product');
    const statusCode = input.status === 0 || input.status === '0' || input.status === 'inactive' || input.status === 'archived' ? 0 : 1;
    let finalData = input.data || {};
    let finalFile = input.file || null;

    if (input.data) {
      const essentials: Record<string, any> = {};
      const rich: Record<string, any> = {};
      let hasRichData = false;

      for (const [k, v] of Object.entries(input.data)) {
        const isNested = typeof v === 'object' && v !== null;
        const isRichKey = RICH_FIELD_KEYS.has(k.toLowerCase());

        if (isNested || isRichKey) {
          rich[k] = v;
          hasRichData = true;
        } else {
          essentials[k] = v;
        }
      }

      if (hasRichData) {
        try {
          const env = envContext.getStore();
          if (env) {
            const { s3Put } = await import('./s3-client');
            const storageKey = `${scope}/${id}/full.json`;
            await s3Put(env, storageKey, JSON.stringify(rich), 'application/json');
            finalFile = storageKey;
            finalData = essentials;
          }
        } catch (s3Err) {
          console.warn('[helpers] S3 split upload failed during create:', s3Err);
        }
      }
    }

    await dbRun(
      `INSERT INTO matter (id, type, title, ref, price, qty, min_qty, status, data, role, scope, at, updated, deleted_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        id,
        typeCode,
        input.title || 'Untitled',
        input.ref || null,
        input.price ?? input.value ?? null,
        input.qty ?? null,
        input.min_qty ?? null,
        statusCode,
        JSON.stringify(finalData),
        input.role || null,
        scope,
        input.at || nowUnix,
        nowUnix
      ]
    );
    return { id, at: input.at || nowUnix, status: 'created', file: finalFile };
  }

  if (input.table === 'motion') {
    const typeCode = toMotionTypeCode(input.type || 'activity');
    const id = input.id || generateEntityId('motion');
    const idemKey = input.idem || `${scope}:${input.by || 'sys'}:${Date.now()}:${typeCode}:${Math.random().toString(36).substring(2, 6)}`;
    await dbRun(
      `INSERT OR IGNORE INTO motion (id, type, ref, data, by, at, scope, idem, deleted_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        id,
        typeCode,
        input.ref || null,
        JSON.stringify(input.data || {}),
        input.by || 'system',
        input.at || nowUnix,
        scope,
        idemKey
      ]
    );
    return { id, at: input.at || nowUnix, status: 'created' };
  }

  if (input.table === 'graph') {
    if (!input.src || input.rel === undefined || !input.tgt) {
      throw new Error('src, rel, tgt required for graph');
    }
    const relCode = toGraphRelCode(input.rel);
    await dbRun(
      `INSERT OR REPLACE INTO graph (src, rel, tgt, scope, time, deleted_at) 
       VALUES (?, ?, ?, ?, ?, NULL)`,
      [input.src, relCode, input.tgt, scope, input.at || nowUnix]
    );
    return { src: input.src, rel: relCode, tgt: input.tgt, status: 'linked' };
  }

  if (input.table === 'inbox') {
    const typeCode = toInboxTypeCode(input.type || 'task');
    const id = input.id || generateEntityId('inbox');
    const userId = input.user_id || input.userId || 'guest';
    const statusCode = input.status === 2 || input.status === 'done' ? 2 : 1;
    await dbRun(
      `INSERT INTO inbox (id, user_id, workspace_id, workspace_name, type, title, ref, priority, due, status, data, created_at, deleted_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        id,
        userId,
        input.workspace_id || scope.replace('w:', ''),
        input.workspace_name || null,
        typeCode,
        input.title || 'Notification',
        input.ref || null,
        input.priority ?? 1,
        input.due || null,
        statusCode,
        JSON.stringify(input.data || {}),
        input.at || nowUnix
      ]
    );
    return { id, status: 'created' };
  }

  throw new Error(`Unknown or deprecated table for creation: ${input.table}`);
}

// ============================================================
// executeRead — Select from any table
// ============================================================
export async function executeRead(input: {
  table: string;
  id?: string;
  scope?: string;
  type?: string | number;
  ref?: string;
  src?: string;
  rel?: string | number;
  tgt?: string;
  status?: string | number;
  limit?: number;
  offset?: number;
  filters?: Array<{ key: string; val: any }>;
  [key: string]: any;
}) {
  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;

  if (input.table === 'graph') {
    let sql = 'SELECT src, rel, tgt, scope, time FROM graph WHERE deleted_at IS NULL';
    const args: any[] = [];
    if (input.src) { sql += ' AND src = ?'; args.push(input.src); }
    if (input.rel !== undefined) { sql += ' AND rel = ?'; args.push(toGraphRelCode(input.rel)); }
    if (input.tgt) { sql += ' AND tgt = ?'; args.push(input.tgt); }
    if (input.scope) { sql += ' AND scope = ?'; args.push(input.scope); }
    sql += ' ORDER BY time DESC LIMIT ? OFFSET ?';
    args.push(limit, offset);
    const rows = await dbAll(sql, args);
    return { rows, count: rows.length };
  }

  if (input.table === 'motion') {
    let sql = 'SELECT id, type, ref, data, by, at, scope, idem FROM motion WHERE deleted_at IS NULL';
    const args: any[] = [];
    if (input.id) { sql += ' AND id = ?'; args.push(input.id); }
    if (input.type !== undefined) { sql += ' AND type = ?'; args.push(toMotionTypeCode(input.type)); }
    if (input.ref) { sql += ' AND ref = ?'; args.push(input.ref); }
    if (input.scope) { sql += ' AND scope = ?'; args.push(input.scope); }
    sql += ' ORDER BY at DESC LIMIT ? OFFSET ?';
    args.push(limit, offset);
    const rows = await dbAll(sql, args);
    return { rows: rows.map(r => ({ ...r, data: parseJson(r.data) })), count: rows.length };
  }

  if (input.table === 'inbox') {
    let sql = 'SELECT id, user_id, workspace_id, workspace_name, type, title, ref, priority, due, status, data, created_at FROM inbox WHERE deleted_at IS NULL';
    const args: any[] = [];
    if (input.id) { sql += ' AND id = ?'; args.push(input.id); }
    if (input.type !== undefined) { sql += ' AND type = ?'; args.push(toInboxTypeCode(input.type)); }
    if (input.ref) { sql += ' AND ref = ?'; args.push(input.ref); }
    if (input.status !== undefined) {
      const statusCode = input.status === 'done' ? 2 : input.status === 'open' ? 1 : Number(input.status);
      sql += ' AND status = ?';
      args.push(statusCode);
    }
    if (input.user_id || input.userId) { sql += ' AND user_id = ?'; args.push(input.user_id || input.userId); }
    sql += ' ORDER BY priority DESC, created_at DESC LIMIT ? OFFSET ?';
    args.push(limit, offset);
    const rows = await dbAll(sql, args);
    return { rows: rows.map(r => ({ ...r, data: parseJson(r.data) })), count: rows.length };
  }

  // Fallback to matter
  const actualTable = input.table === 'form' ? 'matter' : input.table;
  let sql = `SELECT id, type, title, ref, price, qty, min_qty, status, data, role, scope, at, updated FROM ${actualTable} WHERE deleted_at IS NULL`;
  const args: any[] = [];

  if (input.table === 'form') {
    sql += " AND role = 'setting'";
  }

  if (input.id) { sql += ' AND id = ?'; args.push(input.id); }
  if (input.scope) { sql += ' AND scope = ?'; args.push(input.scope); }
  if (input.type !== undefined && input.table !== 'form') {
    sql += ' AND type = ?';
    args.push(toMatterTypeCode(input.type));
  }
  if (input.status !== undefined) {
    const statusCode = input.status === 'active' ? 1 : input.status === 'inactive' ? 0 : Number(input.status);
    sql += ' AND status = ?';
    args.push(statusCode);
  }

  if (input.filters) {
    for (const f of input.filters) {
      sql += ` AND json_extract(data, ?) = ?`;
      args.push(`$.${f.key}`, f.val);
    }
  }

  sql += ' ORDER BY updated DESC LIMIT ? OFFSET ?';
  args.push(limit, offset);

  const rows = await dbAll(sql, args);
  return { rows: rows.map(r => ({ ...r, data: parseJson(r.data) })), count: rows.length };
}

// ============================================================
// executeUpdate — Update any table
// ============================================================
export async function executeUpdate(input: {
  table: string;
  id?: string;
  scope?: string;
  type?: string | number;
  patch: Record<string, any>;
  [key: string]: any;
}) {
  const nowUnix = Math.floor(Date.now() / 1000);
  const actualTable = input.table === 'form' ? 'matter' : input.table;
  const scope = input.scope || 'ws:global';

  let patch = { ...input.patch };
  let finalFile: string | null = null;

  if (actualTable === 'matter' && input.id) {
    const existing = await dbGet(
      `SELECT type, data, file FROM matter WHERE id = ? AND deleted_at IS NULL`,
      [input.id]
    ).catch(() => null);

    if (existing) {
      const existingData = parseJson(existing.data);
      const existingFileKey = existing.file || `${scope}/${input.id}/full.json`;

      let updatedData = { ...existingData };
      let richPatch: Record<string, any> = {};
      let hasRichPatch = false;

      if (patch.data) {
        for (const [k, v] of Object.entries(patch.data)) {
          const isNested = typeof v === 'object' && v !== null;
          const isRichKey = RICH_FIELD_KEYS.has(k.toLowerCase());

          if (isNested || isRichKey) {
            richPatch[k] = v;
            hasRichPatch = true;
          } else {
            updatedData[k] = v;
          }
        }
        delete patch.data;
      }

      for (const [k, v] of Object.entries(patch)) {
        if (k !== 'id' && k !== 'scope' && k !== 'type' && k !== 'table' && k !== 'file' && k !== 'status' && k !== 'title' && k !== 'value' && k !== 'price' && k !== 'qty') {
          const isNested = typeof v === 'object' && v !== null;
          const isRichKey = RICH_FIELD_KEYS.has(k.toLowerCase());

          if (isNested || isRichKey) {
            richPatch[k] = v;
            hasRichPatch = true;
          } else {
            updatedData[k] = v;
          }
          delete patch[k];
        }
      }

      if (hasRichPatch) {
        try {
          const env = envContext.getStore();
          if (env) {
            const { s3Put } = await import('./s3-client');
            await s3Put(env, existingFileKey, JSON.stringify(richPatch), 'application/json');
            finalFile = existingFileKey;
          }
        } catch (s3Err) {
          console.warn('[helpers] S3 split upload failed during update:', s3Err);
        }
      }

      patch.data = JSON.stringify(updatedData);
      if (finalFile) patch.file = finalFile;
    }
  }

  const sets: string[] = ['updated = ?'];
  const args: any[] = [nowUnix];

  for (const [k, v] of Object.entries(patch)) {
    if (k !== 'id' && k !== 'table' && k !== 'scope') {
      const val = typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
      sets.push(`${k} = ?`);
      args.push(val);
    }
  }

  let whereClause = 'WHERE deleted_at IS NULL';
  if (input.id) { whereClause += ' AND id = ?'; args.push(input.id); }
  if (input.scope) { whereClause += ' AND scope = ?'; args.push(input.scope); }

  await dbRun(`UPDATE ${actualTable} SET ${sets.join(', ')} ${whereClause}`, args);

  // For matter updates, log a motion change event
  if (actualTable === 'matter' && input.id) {
    await executeCreate({
      table: 'motion',
      type: 123, // status_change
      ref: input.id,
      scope,
      data: { changed: Object.keys(input.patch) },
      by: 'system'
    });
  }

  return { success: true, updated: nowUnix };
}

// ============================================================
// executeDelete — Soft delete (deleted_at = unixepoch())
// ============================================================
export async function executeDelete(input: {
  table: string;
  id?: string;
  scope?: string;
  src?: string;
  rel?: string | number;
  tgt?: string;
  [key: string]: any;
}) {
  const scope = input.scope || 'ws:global';

  if (input.table === 'graph') {
    if (input.src && input.tgt) {
      let sql = 'UPDATE graph SET deleted_at = unixepoch() WHERE src = ? AND tgt = ? AND scope = ?';
      const args: any[] = [input.src, input.tgt, scope];
      if (input.rel !== undefined) {
        sql += ' AND rel = ?';
        args.push(toGraphRelCode(input.rel));
      }
      await dbRun(sql, args);
      return { success: true, status: 'soft_deleted' };
    }
    throw new Error('src, tgt required for graph delete');
  }

  const actualTable = input.table === 'form' ? 'matter' : input.table;
  if (input.id) {
    await dbRun(
      `UPDATE ${actualTable} SET status = 0, deleted_at = unixepoch() WHERE id = ?`,
      [input.id]
    );
    return { success: true, status: 'soft_deleted' };
  }

  throw new Error(`id required for deletion in ${actualTable}`);
}

// ============================================================
// executeLink — Toggle graph edge
// ============================================================
export async function executeLink(input: {
  src: string;
  rel: string;
  tgt: string;
  scope?: string;
  active?: boolean;
}) {
  const scope = input.scope || 'ws:global';
  const active = input.active !== undefined ? input.active : true;

  if (!active) {
    return executeDelete({
      table: 'graph',
      src: input.src,
      rel: input.rel,
      tgt: input.tgt,
      scope
    });
  }

  return executeCreate({
    table: 'graph',
    src: input.src,
    rel: input.rel,
    tgt: input.tgt,
    scope
  });
}

// ============================================================
// executeSearch — Query memory (Mocked/S3 listing now since memory table is removed)
// ============================================================
export async function executeSearch(input: {
  query: string;
  scope?: string;
  limit?: number;
}) {
  // SQLite-based search on memory table is deprecated as memory moves to S3.
  // Return empty list to prevent runtime failure of legacy search wrappers.
  return { rows: [], count: 0 };
}

// ============================================================
// Legacy compatibility wrappers (kept for backward compatibility)
// ============================================================
export async function createMatter(input: any) {
  return executeCreate({ ...input, table: 'matter' });
}

export async function getMatter(input: any) {
  return executeRead({ ...input, table: 'matter' });
}

export async function listMatters(input: any) {
  return executeRead({ ...input, table: 'matter' });
}

export async function updateMatter(input: any) {
  return executeUpdate({ ...input, table: 'matter', patch: input.patch || {} });
}

export async function appendMotion(input: any) {
  return executeCreate({ ...input, table: 'motion' });
}

export async function readMotions(input: any) {
  return executeRead({ ...input, table: 'motion' });
}

export async function linkGraph(input: any) {
  return executeLink(input);
}

export async function traverseGraph(input: any) {
  return executeRead({ ...input, table: 'graph' });
}

export async function setAttr(input: any) {
  const matter = await dbGet('SELECT data FROM matter WHERE id = ?', [input.matterId]);
  const data = parseJson(matter?.data);
  data[input.key] = input.val ?? input.num ?? null;
  await executeUpdate({
    table: 'matter',
    id: input.matterId,
    patch: { data }
  });
  return { matter: input.matterId, key: input.key, status: 'set' };
}

export async function readForm(input: any) {
  return executeRead({ ...input, table: 'form' });
}

export async function searchMemory(input: any) {
  return executeSearch(input);
}

export async function storeMemory(input: any) {
  // S3 memory storage must be done via direct S3 API integration.
  // This legacy SQLite-based memory function returns success mock.
  return { id: `mem_${generateUlid()}`, status: 'skipped_sqlite' };
}
