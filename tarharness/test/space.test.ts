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

  it('uses the previous weekday after midnight for an overnight routine', () => {
    const result = resolveContext([access('personal', 'personal'), access('northstar', 'work')], [
      { id: 'night', workspace: 'northstar', label: 'Night shift', start: '22:00', end: '02:00', days: [5] },
    ], { at: Date.parse('2026-09-25T20:00:00Z'), zone: 'Asia/Kolkata' });
    expect(result.context.label).toBe('Night shift');
    expect(resolveContext([access('personal', 'personal')], [], { at: Date.parse('2026-09-25T04:00:00Z'), zone: 'Asia/Kolkata' }).context.label).toBe('Personal');
  });

  it('models the example day entirely from routine records', () => {
    const contexts = [
      ['personal', 'Morning', '05:00', '09:00'],
      ['northstar', 'Kitchen', '09:00', '12:00'],
      ['northstar', 'Counter', '12:00', '15:00'],
      ['delivery', 'Delivery', '15:00', '18:00'],
      ['taxi', 'Taxi', '18:00', '20:00'],
      ['sales', 'Sales', '20:00', '22:00'],
      ['shop', 'Shop', '22:00', '23:59'],
    ] as const;
    const accesses = [access('personal', 'personal'), ...['northstar', 'delivery', 'taxi', 'sales', 'shop'].map((slug) => access(slug, 'work'))];
    const routines = contexts.map(([workspace, label, start, end], index) => ({ id: `routine-${index}`, workspace, label, start, end, days: [5] }));
    for (const [workspace, label, start] of contexts) {
      const local = Date.parse(`2026-09-25T${start}:00Z`);
      const result = resolveContext(accesses, routines, { at: local - 5.5 * 60 * 60 * 1000, zone: 'Asia/Kolkata' });
      expect(result).toMatchObject({ decision: 'automatic', context: { label, workspace: { slug: workspace } } });
    }
  });
});
