/**
 * Scoped site editing.
 *
 * `site.ask` resolves an instruction into a small, reviewable patch: exact names
 * and values resolve in code, Jev only interprets ambiguity, and nothing is
 * applied until `site.edit` commits the reviewed operations. Undo writes a new
 * revision rather than rewriting history.
 */

import type { Client } from '@libsql/client/web';
import { badRequest, conflict, notFound, unavailable } from '../errors.ts';
import type { AccessContext } from '../types.ts';
import { eventStatement } from '../gateway/commit.ts';
import {
  ALIGN_VALUES, ASPECT_VALUES, BORDER_VALUES, MASK_VALUES, PAD_VALUES, SHADOW_VALUES, SIZE_VALUES, WIDTH_VALUES,
  type Node, type Section, type SiteDocument, type Style,
} from './document.ts';
import { COLOR_KEYS, exportDesign, parseDesign } from './design.ts';
import { applyPatch, diffSummary, type DiffEntry, type PatchOperation } from './patch.ts';
import { chooseLayout, chooseTarget, chooseTone, chooseValues, type JudgmentCache } from './judgment.ts';
import { readDocument } from './adapt.ts';
import { validateDocument } from './validate.ts';
import { getSiteRecord } from './store.ts';
import { compileDocument } from './compile.ts';

const now = () => Date.now();
const text = (value: unknown, max = 400): string => typeof value === 'string' ? value.trim().slice(0, max) : '';
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

async function digest(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Values offered for one style property; anything outside this list is rejected. */
export const PROPERTY_OPTIONS: Record<string, readonly string[]> = {
  background: [...COLOR_KEYS.map((key) => `token:color.${key}`), 'transparent'],
  color: COLOR_KEYS.map((key) => `token:color.${key}`),
  pad: PAD_VALUES,
  gap: PAD_VALUES,
  radius: ['token:shape.sm', 'token:shape.md', 'token:shape.lg', 'token:shape.pill'],
  border: BORDER_VALUES,
  shadow: SHADOW_VALUES,
  align: ALIGN_VALUES,
  width: WIDTH_VALUES,
  aspect: ASPECT_VALUES,
  mask: MASK_VALUES,
  size: SIZE_VALUES,
};

/** Words that map directly to an allowed value, so no judgment call is needed. */
export const SYNONYMS: Record<string, string> = {
  black: 'token:color.ink', dark: 'token:color.ink', ink: 'token:color.ink', charcoal: 'token:color.ink',
  white: 'token:color.canvas', light: 'token:color.canvas', plain: 'token:color.canvas',
  accent: 'token:color.accent', brand: 'token:color.accent',
  surface: 'token:color.surface', raised: 'token:color.surface', panel: 'token:color.surface',
  muted: 'token:color.muted', subtle: 'token:color.muted',
  hairline: 'hairline', none: 'none',
  pill: 'token:shape.pill', rounded: 'token:shape.lg', sharp: 'token:shape.sm', square: 'token:shape.sm',
  spacious: 'token:space.section', tight: 'token:space.unit',
  soft: 'soft', flat: 'none',
  centered: 'center', centre: 'center', left: 'start', right: 'end',
  full: 'full', wide: 'wide', content: 'content',
  large: 'lg', small: 'sm', medium: 'md',
};

const PROPERTY_WORDS: Record<string, string[]> = {
  background: ['background', 'bg', 'backdrop'],
  color: ['colour', 'color', 'text colour', 'ink'],
  pad: ['padding', 'pad', 'spacing'],
  gap: ['gap', 'spacing between'],
  radius: ['radius', 'corner', 'corners', 'rounded'],
  border: ['border', 'outline'],
  shadow: ['shadow', 'elevation', 'depth'],
  align: ['align', 'alignment', 'centre', 'center'],
  width: ['width', 'full width', 'wide'],
  aspect: ['aspect', 'ratio', 'shape'],
  size: ['type size', 'text size', 'font size', 'size'],
  mask: ['mask', 'fade'],
};

export interface AskResult {
  siteId: string;
  base: number;
  target: string | null;
  targetKind: 'section' | 'node' | null;
  operations: PatchOperation[];
  summary: string;
  questions: string[];
}

function styleTarget(doc: SiteDocument, target: string): 'section' | 'node' | null {
  if (doc.pages.some((page) => page.sections.some((section) => section.id === target || section.purpose.toLowerCase() === target.toLowerCase()))) return 'section';
  const walk = (nodes: Node[]): boolean => nodes.some((node) => node.id === target || walk(node.children || []));
  if (doc.pages.some((page) => page.sections.some((section) => walk(section.nodes)))) return 'node';
  return null;
}

function sectionFor(doc: SiteDocument, target: string): Section | null {
  for (const page of doc.pages) {
    const section = page.sections.find((entry) => entry.id === target);
    if (section) return section;
    const walk = (nodes: Node[]): Node | undefined => {
      for (const node of nodes) {
        if (node.id === target) return node;
        const nested = node.children ? walk(node.children) : undefined;
        if (nested) return nested;
      }
      return undefined;
    };
    if (page.sections.some((section2) => walk(section2.nodes))) {
      const found = page.sections.find((section2) => walk(section2.nodes));
      if (found) return found;
    }
  }
  return null;
}

function explicitStyle(doc: SiteDocument, command: string, target: string): { ops: PatchOperation[]; unresolved: Record<string, readonly string[]> } {
  const lower = command.toLowerCase();
  const ops: PatchOperation[] = [];
  const unresolved: Record<string, readonly string[]> = {};
  const node = (() => {
    const walk = (nodes: Node[]): Node | null => {
      for (const entry of nodes) {
        if (entry.id === target) return entry;
        const nested = entry.children ? walk(entry.children) : null;
        if (nested) return nested;
      }
      return null;
    };
    for (const page of doc.pages) for (const entry of page.sections) {
      const found = walk(entry.nodes);
      if (found) return found;
    }
    return null;
  })();
  const section = node ? null : doc.pages.flatMap((page) => page.sections).find((entry) => entry.id === target) || null;
  const existing = node?.style || section?.style;
  const current = { ...(existing?.base || {}) } as Style;
  let changed = false;
  for (const [property, words] of Object.entries(PROPERTY_WORDS)) {
    if (!words.some((word) => lower.includes(word))) continue;
    const allowed = PROPERTY_OPTIONS[property];
    if (!allowed) continue;
    const match = allowed.find((value) => lower.includes(value.replace('token:', '').split('.').pop() || value));
    const synonym = Object.entries(SYNONYMS).find(([word]) => lower.includes(word) && allowed.includes(SYNONYMS[word]));
    const chosen = match || (synonym ? SYNONYMS[synonym[0]] : undefined);
    if (chosen && allowed.includes(chosen)) {
      (current as Record<string, unknown>)[property] = chosen;
      changed = true;
    } else {
      unresolved[property] = allowed;
    }
  }
  if (changed) ops.push({ op: 'set_style', target, value: { ...(existing || {}), base: current } });
  return { ops, unresolved };
}

export async function executeSiteAsk(
  client: Client,
  context: AccessContext,
  input: Record<string, unknown>,
  typesafe?: string,
  control?: D1Database,
): Promise<Record<string, unknown>> {
  const siteId = text(input.siteId, 160);
  const current = await getSiteRecord(client, siteId);
  if (!current) throw notFound('Site was not found.');
  const { doc } = readDocument(current.data);
  const command = text(input.command, 600);
  if (!command) throw badRequest('Describe the change you want.');

  const requested = text(input.target, 120);
  let target: string | null = null;
  let targetKind: 'section' | 'node' | null = null;
  if (requested) {
    targetKind = styleTarget(doc, requested);
    if (!targetKind) throw notFound('The selected section was not found.');
    target = requested;
  } else {
    // Exact id or heading text matches resolve without inference.
    const lower = command.toLowerCase();
    outer: for (const page of doc.pages) {
      for (const section of page.sections) {
        if (lower.includes(section.id.toLowerCase()) || lower.includes(section.purpose.toLowerCase())) { target = section.id; targetKind = 'section'; break outer; }
        const heading = section.nodes.find((node) => node.kind === 'heading' && typeof node.props.text === 'string' && lower.includes(String(node.props.text).toLowerCase().slice(0, 24)));
        if (heading) { target = section.id; targetKind = 'section'; break outer; }
      }
    }
  }
  const cache: JudgmentCache = { control, workspace: context.workspace.id, version: 'ask-1' };
  const questions: string[] = [];
  if (!target) {
    const candidates = doc.pages.flatMap((page) => page.sections.map((section) => ({
      id: section.id,
      label: `${page.title}: ${String(section.nodes.find((node) => node.kind === 'heading')?.props.text || section.purpose)}`,
      purpose: section.purpose,
    })));
    if (typesafe) {
      const judged = await chooseTarget(typesafe, cache, { command, targets: candidates });
      if (judged.target) { target = judged.target; targetKind = 'section'; }
      else questions.push('Which section should this change?');
    } else {
      questions.push('Which section should this change?');
    }
  }

  const operations: PatchOperation[] = [];
  let summary = '';
  if (target && targetKind) {
    const wanted = target;
    const targetSection = doc.pages.flatMap((page) => page.sections).find((s) => s.id === wanted || s.purpose.toLowerCase() === wanted.toLowerCase());
    if (targetSection) {
      target = targetSection.id;
      const lower = command.toLowerCase();
      // Layout Decision (columns, alignment, density)
      let cols: number | null = null;
      if (lower.includes('2 col') || lower.includes('two col') || lower.includes('side by side') || lower.includes('split')) cols = 2;
      else if (lower.includes('3 col') || lower.includes('three col')) cols = 3;
      else if (lower.includes('4 col') || lower.includes('four col')) cols = 4;
      else if (lower.includes('1 col') || lower.includes('one col') || lower.includes('single col') || lower.includes('stack')) cols = 1;

      let align: 'start' | 'center' | 'end' | null = null;
      if (lower.includes('align center') || lower.includes('center align') || lower.includes('centered') || lower.includes('centre')) align = 'center';
      else if (lower.includes('align left') || lower.includes('left align')) align = 'start';
      else if (lower.includes('align right') || lower.includes('right align')) align = 'end';

      let density: 'airy' | 'compact' | null = null;
      if (lower.includes('airy') || lower.includes('breathing room') || lower.includes('spacious') || lower.includes('more room')) density = 'airy';
      else if (lower.includes('compact') || lower.includes('tight') || lower.includes('dense')) density = 'compact';

      if (typesafe && (lower.includes('layout') || lower.includes('align') || lower.includes('columns') || lower.includes('spacing'))) {
        const layoutChoice = await chooseLayout(typesafe, cache, { command, target, currentColumns: targetSection.layout.columns, currentAlign: targetSection.layout.align });
        if (layoutChoice.columns) cols = layoutChoice.columns;
        if (layoutChoice.align) align = layoutChoice.align;
        if (layoutChoice.density && layoutChoice.density !== 'balanced') density = layoutChoice.density;
      }

      if (cols !== null || align !== null) {
        const nextLayout = {
          ...targetSection.layout,
          ...(cols !== null ? { columns: cols, kind: (cols > 1 ? 'grid' : 'stack') as import('./document.ts').SectionLayout } : {}),
          ...(align !== null ? { align } : {}),
        };
        operations.push({ op: 'set_layout', target, value: nextLayout });
        summary = summary ? `${summary}, updated layout` : `Updated ${target} layout`;
      }

      if (density !== null) {
        const padVal = density === 'airy' ? 'token:space.section' : 'token:space.unit';
        const existingStyle = targetSection.style || {};
        const nextBase = { ...(existingStyle.base || {}), pad: padVal };
        operations.push({ op: 'set_style', target, value: { ...existingStyle, base: nextBase } });
        summary = summary ? `${summary}, set spacing to ${density}` : `Set ${target} spacing to ${density}`;
      }

      // Tone Decision (canvas, surface, ink, accent)
      let toneChoice: 'canvas' | 'surface' | 'ink' | 'accent' | null = null;
      if (lower.includes('dark') || lower.includes('ink') || lower.includes('black')) toneChoice = 'ink';
      else if (lower.includes('light') || lower.includes('canvas') || lower.includes('white')) toneChoice = 'canvas';
      else if (lower.includes('surface') || lower.includes('raised') || lower.includes('card')) toneChoice = 'surface';
      else if (lower.includes('accent') || lower.includes('royal blue') || lower.includes('blue') || lower.includes('brand')) toneChoice = 'accent';

      if (typesafe && (lower.includes('tone') || lower.includes('color') || lower.includes('theme') || lower.includes('look'))) {
        const judgedTone = await chooseTone(typesafe, cache, { command, target });
        if (judgedTone) toneChoice = judgedTone;
      }

      if (toneChoice) {
        const toneMap: Record<string, { bg: string; color: string }> = {
          canvas: { bg: 'token:color.canvas', color: 'token:color.ink' },
          surface: { bg: 'token:color.surface', color: 'token:color.ink' },
          ink: { bg: 'token:color.ink', color: 'token:color.canvas' },
          accent: { bg: 'token:color.accent', color: 'token:color.accentink' },
        };
        const existingStyle = targetSection.style || {};
        const nextBase = { ...(existingStyle.base || {}), background: toneMap[toneChoice].bg, color: toneMap[toneChoice].color };
        operations.push({ op: 'set_style', target, value: { ...existingStyle, base: nextBase } });
        summary = summary ? `${summary}, set tone to ${toneChoice}` : `Set ${target} tone to ${toneChoice}`;
      }

      // Borders and Elevation
      if (lower.includes('soft border') || lower.includes('soft borders') || lower.includes('rounded')) {
        const existingStyle = targetSection.style || {};
        const nextBase = { ...(existingStyle.base || {}), border: 'hairline', radius: 'token:shape.md' };
        operations.push({ op: 'set_style', target, value: { ...existingStyle, base: nextBase } });
        summary = summary ? `${summary}, soft borders` : `Added soft borders to ${target}`;
      }
      if (lower.includes('raised') || lower.includes('shadow') || lower.includes('elevation')) {
        const existingStyle = targetSection.style || {};
        const nextBase = { ...(existingStyle.base || {}), shadow: 'soft' };
        operations.push({ op: 'set_style', target, value: { ...existingStyle, base: nextBase } });
        summary = summary ? `${summary}, raised cards` : `Added raised elevation to ${target}`;
      }

      // Exact text rewrite if quoted
      const quoteMatch = command.match(/["']([^"']+)["']/);
      if (quoteMatch) {
        const textTarget = targetSection.nodes.find((n) => n.kind === 'heading' || n.kind === 'text' || n.kind === 'button');
        if (textTarget) {
          if (textTarget.kind === 'button') {
            operations.push({ op: 'set_props', target: textTarget.id, value: { label: quoteMatch[1] } });
          } else {
            operations.push({ op: 'set_text', target: textTarget.id, value: quoteMatch[1] });
          }
          summary = summary ? `${summary}, updated text` : `Updated text in ${target}`;
        }
      }
    }

    const { ops, unresolved } = explicitStyle(doc, command, target);
    for (const op of ops) {
      const opTarget = 'target' in op ? (op as { target: string }).target : undefined;
      const exists = operations.some((existing) => {
        if (existing.op !== op.op) return false;
        const existingTarget = 'target' in existing ? (existing as { target: string }).target : undefined;
        return existingTarget === opTarget;
      });
      if (!exists) {
        operations.push(op);
      }
    }
    if (ops.length && !summary) summary = `Update the selected ${targetKind}: ${ops.length} style change${ops.length === 1 ? '' : 's'}.`;
    const missing = Object.keys(unresolved);
    if (missing.length && typesafe) {
      const chosen = await chooseValues(typesafe, cache, { command, target, options: Object.fromEntries(missing.map((property) => [property, unresolved[property]])) });
      const resolved = Object.entries(chosen).filter(([property, value]) => property in PROPERTY_OPTIONS && PROPERTY_OPTIONS[property].includes(value));
      if (resolved.length) {
        const node = (() => {
          const walk = (nodes: Node[]): Node | null => {
            for (const entry of nodes) {
              if (entry.id === target) return entry;
              const nested = entry.children ? walk(entry.children) : null;
              if (nested) return nested;
            }
            return null;
          };
          for (const page of doc.pages) for (const section of page.sections) {
            const found = walk(section.nodes);
            if (found) return found;
          }
          return null;
        })();
        const section = node ? null : doc.pages.flatMap((page) => page.sections).find((entry) => entry.id === target) || null;
        const existing = node?.style || section?.style;
        const base = { ...(existing?.base || {}) } as Record<string, unknown>;
        for (const [property, value] of resolved) base[property] = value;
        operations.push({ op: 'set_style', target, value: { ...existing, base } });
        summary = summary || `Update the selected ${targetKind}.`;
      }
      const stillMissing = missing.filter((property) => !(property in chosen));
      for (const property of stillMissing) questions.push(`Which ${property} should it use?`);
    } else {
      for (const property of missing) questions.push(`Which ${property} should it use?`);
    }
  }

  if (!operations.length && !questions.length) questions.push('Describe the change with a section and a value, for example "make the hero background ink".');
  return { siteId: current.id, base: doc.revision, target, targetKind, operations, summary, questions };
}

export interface EditResult {
  siteId: string;
  version: number;
  revision: number;
  site: SiteDocument;
  diff: DiffEntry[];
}

export async function executeSiteEdit(
  client: Client,
  context: AccessContext,
  input: Record<string, unknown>,
  key: string,
  inputHash: string,
  bucket?: R2Bucket,
): Promise<Record<string, unknown>> {
  const siteId = text(input.siteId, 160);
  const base = Number(input.base);
  const current = await getSiteRecord(client, siteId);
  if (!siteId || !current) throw notFound('Site was not found.');
  if (!Number.isSafeInteger(base)) throw badRequest('Base revision is required.');
  const { doc } = readDocument(current.data);
  if (doc.revision !== base) throw conflict('Site changed since this patch was prepared. Refresh and try again.');
  const operations = Array.isArray(input.operations) ? input.operations as PatchOperation[] : [];
  const next = applyPatch(doc, { base, operations, respectLocks: input.respectLocks !== false });
  validateDocument(next);
  const diff = diffSummary(doc, next);
  const version = current.version + 1;
  const at = now();
  const summary = text(input.summary, 200) || diff.slice(0, 3).map((entry) => `${entry.target} ${entry.kind}`).join(', ');
  const result: Record<string, unknown> = { siteId, version, revision: next.revision, site: next, diff };
  const stored = await recordHistory(bucket, context, siteId, next, doc, summary);
  const saved = await client.batch([
    { sql: 'UPDATE records SET data=?,version=?,updated=? WHERE id=? AND version=?', args: [JSON.stringify(stored), version, at, siteId, current.version] },
    { sql: `INSERT INTO events(id,kind,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at)
      SELECT ?, 'action', ?, 'site.edit', 'accepted', ?, ?, ?, ?, ?, ? WHERE changes()=1`, args: [`evt_${crypto.randomUUID()}`, siteId, context.identity.id, inputHash, key, JSON.stringify({ result }), at, at] },
  ], 'write');
  if (saved[0].rowsAffected !== 1 || saved[1].rowsAffected !== 1) throw conflict('Site changed while saving. Refresh and try again.');
  let previewHtml = '';
  try {
    const compiled = await compileDocument(next);
    const html = String(compiled.files.find((f) => f.path === '/index.html')?.body || '');
    const css = String(compiled.files.find((f) => f.path === '/style.css')?.body || '');
    previewHtml = html.replace('</head>', `<style>${css}</style></head>`);
  } catch { /* ignore */ }
  return { siteId, version, revision: next.revision, site: next, diff, html: previewHtml };
}

/**
 * Snapshot the previous revision in R2 and keep a bounded index in the record.
 * Revision history never grows the frequently updated record without a limit.
 */
async function recordHistory(
  bucket: R2Bucket | undefined,
  context: AccessContext,
  siteId: string,
  next: SiteDocument,
  previous: SiteDocument,
  summary: string,
): Promise<SiteDocument & { history?: unknown[] }> {
  type Entry = { revision: number; at: number; summary: string; key?: string };
  const carried = ((next as unknown as { history?: Entry[] }).history || []).slice(-19);
  const history = [...carried];
  if (bucket) {
    const key = `workspaces/${context.workspace.id}/sites/${siteId}/revisions/${previous.revision}.json`;
    await bucket.put(key, JSON.stringify(previous), { httpMetadata: { contentType: 'application/json; charset=utf-8' } });
    history.push({ revision: previous.revision, at: now(), summary: summary.slice(0, 200), key });
    const dropped = carried.length > 19 ? carried[0] : undefined;
    if (dropped?.key) await bucket.delete(dropped.key).catch(() => undefined);
  }
  return { ...next, history } as SiteDocument & { history?: unknown[] };
}

/** Undo restores an earlier revision by writing a new revision. */
export async function executeSiteUndo(
  client: Client,
  context: AccessContext,
  input: Record<string, unknown>,
  key: string,
  inputHash: string,
  bucket?: R2Bucket,
): Promise<Record<string, unknown>> {
  if (!bucket) throw unavailable('Site revision storage is not configured.');
  const siteId = text(input.siteId, 160);
  const current = await getSiteRecord(client, siteId);
  if (!siteId || !current) throw notFound('Site was not found.');
  const { doc } = readDocument(current.data);
  const history = ((doc as unknown as { history?: { revision: number; at: number; summary: string; version: number; key?: string }[] }).history) || [];
  const targetRevision = input.revision === undefined ? undefined : Number(input.revision);
  const entry = targetRevision === undefined ? history[history.length - 1] : history.find((item) => item.revision === targetRevision);
  if (!entry?.key) throw notFound('An earlier revision to restore was not found.');
  const stored = await bucket.get(entry.key);
  if (!stored) throw notFound('The stored revision is unavailable.');
  const restored = JSON.parse(await stored.text()) as SiteDocument;
  const merged: SiteDocument = {
    ...restored,
    revision: doc.revision + 1,
    currentRelease: doc.currentRelease ?? null,
    releases: doc.releases || [],
  };
  validateDocument(merged);
  const diff = diffSummary(doc, merged);
  const version = current.version + 1;
  const at = now();
  const result: Record<string, unknown> = { siteId, version, revision: merged.revision, site: merged, diff, undone: entry.revision };
  const persisted = await recordHistory(bucket, context, siteId, merged, doc, `Restored revision ${entry.revision}`);
  const saved = await client.batch([
    { sql: 'UPDATE records SET data=?,version=?,updated=? WHERE id=? AND version=?', args: [JSON.stringify(persisted), version, at, siteId, current.version] },
    { sql: `INSERT INTO events(id,kind,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at)
      SELECT ?, 'action', ?, 'site.undo', 'accepted', ?, ?, ?, ?, ?, ? WHERE changes()=1`, args: [`evt_${crypto.randomUUID()}`, siteId, context.identity.id, inputHash, key, JSON.stringify({ result }), at, at] },
  ], 'write');
  if (saved[0].rowsAffected !== 1 || saved[1].rowsAffected !== 1) throw conflict('Site changed while undoing. Refresh and try again.');
  let previewHtml = '';
  try {
    const compiled = await compileDocument(merged);
    const html = String(compiled.files.find((f) => f.path === '/index.html')?.body || '');
    const css = String(compiled.files.find((f) => f.path === '/style.css')?.body || '');
    previewHtml = html.replace('</head>', `<style>${css}</style></head>`);
  } catch { /* ignore */ }
  return { ...result, html: previewHtml };
}

/**
 * Import the readable design.md view.
 *
 * The original reference and its hash are retained; conflicts become recorded
 * decisions. Markdown is a view of the typed design, never a second source of
 * truth, and imported text cannot grant permission or change policy.
 */
export async function executeSiteDesignImport(
  client: Client,
  context: AccessContext,
  input: Record<string, unknown>,
  key: string,
  inputHash: string,
  bucket?: R2Bucket,
): Promise<Record<string, unknown>> {
  const siteId = text(input.siteId, 160);
  const current = await getSiteRecord(client, siteId);
  if (!siteId || !current) throw notFound('Site was not found.');
  const { doc } = readDocument(current.data);
  const markdown = text(input.markdown, 60_000);
  if (!markdown) throw badRequest('Paste the design reference to import.');
  const parsed = parseDesign(markdown, doc.design);
  const revision = (doc.design.source?.revision || 0) + 1;
  const reference = `workspaces/${context.workspace.id}/sites/${siteId}/design/${revision}.md`;
  const hash = await digest(markdown);
  if (bucket) await bucket.put(reference, markdown, { httpMetadata: { contentType: 'text/markdown; charset=utf-8' } });
  const decisions = [...(doc.design.source?.decisions || []), ...parsed.decisions].slice(-50);
  const next: SiteDocument = {
    ...doc,
    revision: doc.revision + 1,
    design: { ...parsed.design, source: { reference, hash, revision, decisions } },
  };
  validateDocument(next);
  const version = current.version + 1;
  const at = now();
  const result: Record<string, unknown> = {
    siteId, version, revision: next.revision, design: next.design,
    decisions: parsed.decisions, notes: parsed.notes, designMarkdown: exportDesign(next.design),
  };
  const stored = await recordHistory(bucket, context, siteId, next, doc, 'Imported design.md');
  const saved = await client.batch([
    { sql: 'UPDATE records SET data=?,version=?,updated=? WHERE id=? AND version=?', args: [JSON.stringify(stored), version, at, siteId, current.version] },
    { sql: `INSERT INTO events(id,kind,record_id,action_id,state,actor_id,input_hash,idempotency_key,data,created_at,updated_at)
      SELECT ?, 'action', ?, 'site.design.import', 'accepted', ?, ?, ?, ?, ?, ? WHERE changes()=1`, args: [`evt_${crypto.randomUUID()}`, siteId, context.identity.id, inputHash, key, JSON.stringify({ result }), at, at] },
  ], 'write');
  if (saved[0].rowsAffected !== 1 || saved[1].rowsAffected !== 1) throw conflict('Site changed while importing the design. Refresh and try again.');
  return result;
}

/** Impact preview for a shared component change. */
export function componentImpact(doc: SiteDocument, componentId: string): { pages: string[]; sections: string[] } {
  const pages = new Set<string>();
  const sections = new Set<string>();
  const walk = (nodes: Node[], page: string, section: string) => nodes.forEach((node) => {
    if (node.component === componentId) { pages.add(page); sections.add(section); }
    walk(node.children || [], page, section);
  });
  doc.pages.forEach((page) => page.sections.forEach((section) => walk(section.nodes, page.path, section.id)));
  return { pages: [...pages], sections: [...sections] };
}
