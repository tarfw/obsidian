import type { AccessContext } from '../types.ts';

export interface Routine {
  readonly id: string;
  readonly workspace: string;
  readonly label: string;
  readonly role?: string;
  readonly start: string;
  readonly end: string;
  readonly days?: readonly number[];
  readonly priority?: number;
}

export interface SpaceContext {
  readonly id: string;
  readonly label: string;
  readonly workspace: { readonly id: string; readonly slug: string; readonly name: string; readonly mode: 'personal' | 'work' };
  readonly role: string;
  readonly owner: string;
  readonly confidence: number;
  readonly source: 'default' | 'routine' | 'override';
  readonly held: boolean;
}

export interface ContextDecision {
  readonly context: SpaceContext;
  readonly decision: 'automatic' | 'confirm';
  readonly alternatives: readonly SpaceContext[];
}

const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function localClock(at: number, zone: string): { day: number; minute: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(at));
  } catch {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(at));
  }
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { day: weekdays[value.weekday] ?? 0, minute: Number(value.hour || 0) * 60 + Number(value.minute || 0) };
}

function minute(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const result = Number(match[1]) * 60 + Number(match[2]);
  return Number(match[1]) < 24 && Number(match[2]) < 60 ? result : null;
}

function active(routine: Routine, day: number, current: number): boolean {
  if (routine.days?.length && !routine.days.includes(day)) return false;
  const start = minute(routine.start); const end = minute(routine.end);
  if (start === null || end === null || start === end) return false;
  return start < end ? current >= start && current < end : current >= start || current < end;
}

function title(value: string): string {
  return value.replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function view(access: AccessContext, label: string, source: SpaceContext['source'], confidence: number, held: boolean, id?: string, role?: string): SpaceContext {
  const memberRole = access.member.workRole && access.member.workRole !== 'general' ? access.member.workRole : access.member.role;
  return {
    id: id || `${access.workspace.slug}:default`, label,
    workspace: { id: access.workspace.id, slug: access.workspace.slug, name: access.workspace.mode === 'personal' ? 'Personal' : access.workspace.name, mode: access.workspace.mode },
    role: role?.trim() || (access.workspace.mode === 'personal' ? 'Individual' : title(memberRole)),
    owner: access.workspace.mode === 'personal' ? 'You' : access.workspace.ownerName || 'Workspace owner',
    confidence, source, held,
  };
}

export function resolveContext(
  accesses: readonly AccessContext[],
  routines: readonly Routine[],
  options: { readonly at: number; readonly zone: string; readonly override?: string; readonly held?: boolean },
): ContextDecision {
  if (!accesses.length) throw new Error('No active workspace is available.');
  const explicit = options.override ? accesses.find((item) => item.workspace.slug === options.override || item.workspace.id === options.override) : undefined;
  if (explicit) return { context: view(explicit, explicit.workspace.mode === 'personal' ? 'Personal' : explicit.workspace.name, 'override', 1, Boolean(options.held)), decision: 'automatic', alternatives: [] };

  const clock = localClock(options.at, options.zone);
  const matches = routines
    .filter((routine) => active(routine, clock.day, clock.minute))
    .map((routine) => ({ routine, access: accesses.find((item) => item.workspace.slug === routine.workspace || item.workspace.id === routine.workspace) }))
    .filter((item): item is { routine: Routine; access: AccessContext } => Boolean(item.access))
    .sort((left, right) => (right.routine.priority || 0) - (left.routine.priority || 0) || left.routine.id.localeCompare(right.routine.id));
  if (matches.length) {
    const best = matches[0];
    const tied = matches.filter((item) => (item.routine.priority || 0) === (best.routine.priority || 0));
    const candidates = tied.map((item) => view(item.access, item.routine.label, 'routine', tied.length === 1 ? 0.98 : 0.55, false, item.routine.id, item.routine.role));
    return { context: candidates[0], decision: tied.length === 1 ? 'automatic' : 'confirm', alternatives: candidates.slice(1) };
  }

  const personal = accesses.find((item) => item.workspace.mode === 'personal') || accesses[0];
  const label = personal.workspace.mode === 'personal' && clock.minute < 12 * 60 ? 'Morning' : personal.workspace.mode === 'personal' ? 'Personal' : personal.workspace.name;
  return { context: view(personal, label, 'default', 1, false), decision: 'automatic', alternatives: [] };
}

export function routineFromRecord(value: { readonly id: string; readonly data: Record<string, unknown> }): Routine | null {
  const data = value.data;
  if (typeof data.workspace !== 'string' || typeof data.label !== 'string' || typeof data.start !== 'string' || typeof data.end !== 'string') return null;
  const days = Array.isArray(data.days) ? data.days.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6) : undefined;
  return {
    id: value.id, workspace: data.workspace, label: data.label.trim().slice(0, 80),
    role: typeof data.role === 'string' ? data.role.trim().slice(0, 80) : undefined,
    start: data.start, end: data.end, days,
    priority: typeof data.priority === 'number' && Number.isFinite(data.priority) ? data.priority : 0,
  };
}
