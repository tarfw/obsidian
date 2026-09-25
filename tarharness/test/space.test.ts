import { describe, expect, it } from 'vitest';
import { resolveContext, routineFromRecord } from '../src/space/context.ts';
import type { AccessContext } from '../src/types.ts';

const access = (slug: string, mode: 'personal' | 'work', workRole: AccessContext['member']['workRole'] = 'general'): AccessContext => ({
  identity: { id: 'user', email: 'u@example.com', name: 'User' },
  workspace: { id: `ws-${slug}`, slug, name: slug === 'northstar' ? 'Northstar Restaurant' : 'Personal', mode, databaseName: slug, databaseHost: 'db', state: 'active', ownerName: mode === 'work' ? 'Restaurant operator' : 'User' },
  member: { workspaceId: `ws-${slug}`, userId: 'user', role: mode === 'personal' ? 'owner' : 'member', workRole, state: 'active' },
});

describe('Space context', () => {
  it('automatically selects one clear routine without changing authority', () => {
    const result = resolveContext([access('personal', 'personal'), access('northstar', 'work', 'cook')], [
      { id: 'kitchen', workspace: 'northstar', label: 'Kitchen', role: 'Chef', start: '09:00', end: '12:00', days: [5] },
    ], { at: Date.parse('2026-09-25T04:00:00Z'), zone: 'Asia/Kolkata' });
    expect(result.decision).toBe('automatic');
    expect(result.context).toMatchObject({ label: 'Kitchen', role: 'Chef', owner: 'Restaurant operator', confidence: 0.98 });
  });

  it('asks when equally strong routines overlap and honors an explicit hold', () => {
    const accesses = [access('personal', 'personal'), access('northstar', 'work')];
    const routines = [
      { id: 'a', workspace: 'northstar', label: 'Kitchen', start: '09:00', end: '12:00' },
      { id: 'b', workspace: 'personal', label: 'Appointment', start: '09:00', end: '10:00' },
    ];
    expect(resolveContext(accesses, routines, { at: Date.parse('2026-09-25T04:00:00Z'), zone: 'Asia/Kolkata' }).decision).toBe('confirm');
    expect(resolveContext(accesses, routines, { at: 0, zone: 'UTC', override: 'northstar', held: true }).context.held).toBe(true);
  });

  it('accepts only complete routine records', () => {
    expect(routineFromRecord({ id: 'r', data: { workspace: 'northstar', label: 'Kitchen', start: '09:00', end: '12:00', days: [1, 8] } })?.days).toEqual([1]);
    expect(routineFromRecord({ id: 'r', data: { label: 'Broken' } })).toBeNull();
  });
});
