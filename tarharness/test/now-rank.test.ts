import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextInTie } from '../src/inbox/rank.ts';

const row = (id: string, due: number | null) => ({ id, source: 'work', target: id, kind: 'action' as const,
  role: 'chef', lane: 'mine' as const, title: id, parent: null, quantity: null, state: 'open', due,
  ordinal: 0, version: 1, action: 'task.complete', input: {}, updated: 0, workspace: { name: 'Kitchen' } });
const context = { label: 'Kitchen shift', role: 'Chef' };

afterEach(() => vi.restoreAllMocks());

describe('bounded Next judgment', () => {
  it('does not ask Jev to override different deadlines', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    expect(await nextInTie([row('first', 1000), row('later', 2000)], context, 'key')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('marks only an existing row in a safe tie and keeps all rows', async () => {
    const rows = [row('one', null), row('two', null)];
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ answers: {
      r0: { type: 'score', score: 0.5, confidence: 0.9 },
      r1: { type: 'score', score: 1.8, confidence: 0.9 },
    } }), { status: 200 }));
    expect(await nextInTie(rows, context, 'key')).toBe('two');
    expect(rows.map((item) => item.id)).toEqual(['one', 'two']);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
