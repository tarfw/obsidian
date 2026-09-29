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
    expect(cards.map((card) => card.kind)).toEqual(['data', 'data', 'action', 'action', 'action', 'flow']);
    expect(cards[0]).toMatchObject({ value: 12 });
  });

  it('renders POS from domain records without a Bot or Kit installation', () => {
    const cards = buildWorkspaceCanvas([
      { id: 'book.followup', kind: 'flow', name: 'Follow up', state: 'published', data: { source: 'book' } },
    ], { records: 10, openTasks: 0, pos: { sales: 12345, orders: 2, lowStock: 1, currency: 'INR', businessDate: '2026-09-07' } }, 'member');
    expect(cards.slice(0, 3).map((card) => card.title)).toEqual(['Sales today', 'Orders today', 'Low stock']);
    expect(cards.find((card) => card.kind === 'action' && card.actionId === 'pos.open')).toMatchObject({ title: 'Open POS', initialInput: { section: 'sell' } });
    expect(cards.at(-1)).toMatchObject({ kind: 'flow', flowId: 'book.followup' });
  });

  it('includes all 34 pending action IDs from workspace.md specification', () => {
    const expectedActions = [
      'purchase.pay',
      'expense.record', 'expense.reverse',
      'bank.import', 'bank.reconcile',
      'period.close', 'period.reopen',
      'stock.transfer',
      'batch.save', 'batch.dispose',
      'recipe.save', 'production.start', 'production.complete',
      'booking.create', 'booking.cancel', 'time.record',
      'trip.start', 'trip.complete', 'fare.set',
      'shift.assign', 'attendance.record', 'payroll.run', 'payroll.pay',
      'supplier.qualify', 'quote.request', 'quote.record',
      'purchase.submit', 'purchase.approve', 'purchase.reject',
      'warehouse.pick', 'warehouse.pack',
      'shipment.dispatch', 'shipment.track', 'shipment.deliver',
      'purchase.return', 'quality.inspect', 'quality.release',
      'forecast.generate', 'replenishment.plan',
    ];

    const actionIds = new Set(actionCatalog.map((a) => a.id));
    for (const expected of expectedActions) {
      expect(actionIds.has(expected), `Missing registered action: ${expected}`).toBe(true);
    }
  });

  it('strictly follows single-word lowercase format for all newly added action fields and outputs', () => {
    const singleWord = /^[a-z]+$/;
    const newActions = actionCatalog.filter((action) =>
      [
        'purchase.pay', 'expense.record', 'expense.reverse', 'bank.import', 'bank.reconcile',
        'period.close', 'period.reopen', 'stock.transfer', 'batch.save', 'batch.dispose',
        'recipe.save', 'production.start', 'production.complete', 'booking.create',
        'booking.cancel', 'time.record', 'trip.start', 'trip.complete', 'fare.set',
        'shift.assign', 'attendance.record', 'payroll.run', 'payroll.pay', 'supplier.qualify',
        'quote.request', 'quote.record', 'purchase.submit', 'purchase.approve',
        'purchase.reject', 'warehouse.pick', 'warehouse.pack', 'shipment.dispatch',
        'shipment.track', 'shipment.deliver', 'purchase.return', 'quality.inspect',
        'quality.release', 'forecast.generate', 'replenishment.plan',
      ].includes(action.id),
    );

    expect(newActions.length).toBeGreaterThanOrEqual(34);
    for (const action of newActions) {
      for (const field of action.fields) {
        expect(singleWord.test(field.key), `Field key "${field.key}" in action "${action.id}" must be single-word lowercase`).toBe(true);
      }
      for (const out of action.output) {
        expect(singleWord.test(out), `Output key "${out}" in action "${action.id}" must be single-word lowercase`).toBe(true);
      }
    }
  });
});
