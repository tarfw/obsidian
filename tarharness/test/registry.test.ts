import { describe, expect, it } from 'vitest';
import { actionCatalog, interfaceCatalog } from '../src/registry/catalog.ts';
import { buildWorkspaceCanvas } from '../src/registry/canvas.ts';

describe('registry contracts', () => {
  it('maps every Action to a registered interface', () => {
    const keys = new Set<string>(interfaceCatalog.map((item) => item.key));
    expect(actionCatalog.every((action) => keys.has(action.interfaceKey))).toBe(true);
    expect(actionCatalog.every((action) => action.version > 0 && action.output.length > 0)).toBe(true);
    expect(new Set(actionCatalog.map((action) => action.id)).size).toBe(actionCatalog.length);
  });

  it('builds the minimal default canvas and published Flow cards', () => {
    const cards = buildWorkspaceCanvas([
      { id: 'customer-onboarding', kind: 'flow', name: 'Customer onboarding', state: 'published', data: {} },
    ], { records: 12, openTasks: 3 }, 'member');
    expect(cards.map((card) => card.kind)).toEqual(['data', 'data', 'action', 'action', 'flow']);
    expect(cards[0]).toMatchObject({ value: 12 });
  });

  it('uses valid cards from a published business Kit', () => {
    const cards = buildWorkspaceCanvas([
      { id: 'shop', kind: 'kit', name: 'Shop', state: 'published', data: { canvas: { cards: [
        { id: 'work', kind: 'data', title: 'Waiting', metric: 'tasks.open' },
        { id: 'new-task', kind: 'action', title: 'Assign work', actionId: 'task.create' },
      ] } } },
    ], { records: 5, openTasks: 2 }, 'owner');
    expect(cards).toHaveLength(4);
    expect(cards).toContainEqual({ id: 'work', kind: 'data', title: 'Waiting', display: 'value', value: 2, caption: undefined });
    expect(cards).toContainEqual(expect.objectContaining({ id: 'new-task', actionId: 'task.create' }));
  });
  it('renders compact POS metrics and opens the registered retail interface', () => {
    const cards = buildWorkspaceCanvas([
      { id: 'directory.pos.bot', kind: 'bot', name: 'POS', state: 'published', data: {} },
      { id: 'directory.pos.sell.flow', kind: 'flow', name: 'Sell', state: 'published', data: { botId: 'pos', templateId: 'sell' } },
      { id: 'directory.pos.kit', kind: 'kit', name: 'POS', state: 'published', data: { canvas: { cards: [
        { id: 'pos-sell', kind: 'flow', title: 'Sell', flowId: 'directory.pos.sell.flow' },
      ] } } },
    ], { records: 10, openTasks: 0, pos: { sales: 12345, orders: 2, lowStock: 1, currency: 'INR', businessDate: '2026-09-07' } }, 'member');
    expect(cards).toHaveLength(4);
    expect(cards.map((card) => card.title)).toEqual(['Sales today', 'Orders today', 'Low stock', 'Sell']);
    expect(cards[3]).toMatchObject({ actionId: 'pos.open', initialInput: { section: 'sell' } });
  });
});
