import { createClient } from '@libsql/client';
import { Effect } from 'effect';
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WORKSPACE_SCHEMA } from '../src/db/schema.ts';
import { executeGateway } from '../src/gateway/actions.ts';
import type { AccessContext } from '../src/types.ts';

const clients: ReturnType<typeof createClient>[] = [];
afterEach(() => clients.splice(0).forEach((client) => client.close()));

const ownerAccess: AccessContext = {
  identity: { id: 'owner_user', email: 'owner@example.com', name: 'Owner' },
  workspace: { id: 'ws1', name: 'Commerce Hub', slug: 'commerce-hub', mode: 'work', databaseName: 'commerce_db', databaseHost: 'db', state: 'active' },
  member: { workspaceId: 'ws1', userId: 'owner_user', role: 'owner', state: 'active', workRole: 'general' },
};

const adminAccess: AccessContext = {
  identity: { id: 'admin_user', email: 'admin@example.com', name: 'Admin' },
  workspace: { id: 'ws1', name: 'Commerce Hub', slug: 'commerce-hub', mode: 'work', databaseName: 'commerce_db', databaseHost: 'db', state: 'active' },
  member: { workspaceId: 'ws1', userId: 'admin_user', role: 'admin', state: 'active', workRole: 'general' },
};

const driverAccess: AccessContext = {
  identity: { id: 'driver_user', email: 'driver@example.com', name: 'Driver' },
  workspace: { id: 'ws1', name: 'Commerce Hub', slug: 'commerce-hub', mode: 'work', databaseName: 'commerce_db', databaseHost: 'db', state: 'active' },
  member: { workspaceId: 'ws1', userId: 'driver_user', role: 'member', workRole: 'driver', state: 'active' },
};

const warehouseAccess: AccessContext = {
  identity: { id: 'wh_user', email: 'warehouse@example.com', name: 'Warehouse Staff' },
  workspace: { id: 'ws1', name: 'Commerce Hub', slug: 'commerce-hub', mode: 'work', databaseName: 'commerce_db', databaseHost: 'db', state: 'active' },
  member: { workspaceId: 'ws1', userId: 'wh_user', role: 'member', workRole: 'warehouse', state: 'active' },
};

const memberAccess: AccessContext = {
  identity: { id: 'member_user', email: 'member@example.com', name: 'Member' },
  workspace: { id: 'ws1', name: 'Commerce Hub', slug: 'commerce-hub', mode: 'work', databaseName: 'commerce_db', databaseHost: 'db', state: 'active' },
  member: { workspaceId: 'ws1', userId: 'member_user', role: 'member', workRole: 'general', state: 'active' },
};

async function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'tar-domain-actions-test-'));
  const client = createClient({ url: pathToFileURL(join(directory, 'workspace.db')).href });
  clients.push(client);
  for (const sql of WORKSPACE_SCHEMA) await client.execute(sql);

  const run = (actionId: string, input: Record<string, unknown>, ctx: AccessContext = ownerAccess, key = crypto.randomUUID()) =>
    Effect.runPromise(executeGateway(client, ctx, { actionId, input, idempotencyKey: key }));

  await run('capability.save', { module: 'commerce', enabled: true, baseVersion: 0 });
  const supplierOrg = (await run('organization.create', { name: 'Acme Supply Co' })).record as { id: string };
  const rawItem = (await run('catalog.item.save', { name: 'Coffee Beans', sku: 'COFFEE-RAW', unit: 'kg' })).item as { id: string };
  const rawVariant = (await run('catalog.variant.save', { item: rawItem.id, name: 'Arabica Green 1kg', sku: 'ARABICA-1KG' })).variant as { id: string };
  const roastedItem = (await run('catalog.item.save', { name: 'Roasted Coffee', sku: 'COFFEE-ROAST', unit: 'kg' })).item as { id: string };
  const roastedVariant = (await run('catalog.variant.save', { item: roastedItem.id, name: 'Espresso Roast 1kg', sku: 'ESPRESSO-1KG' })).variant as { id: string };

  await run('stock.adjust', { variant: rawVariant.id, quantity: 100, reason: 'Initial green beans' });
  await run('price.set', { variant: roastedVariant.id, amount: 1500, currency: 'INR' });

  return { client, run, supplierOrg, rawItem, rawVariant, roastedItem, roastedVariant };
}

describe('Domain Actions & Lifecycle', { timeout: 60000 }, () => {
  describe('Finance & Banking', () => {
    it('records and reverses an expense with balanced double-entry ledger postings', async () => {
      const { client, run } = await fixture();
      const expenseRes = await run('expense.record', {
        payee: 'Office Landlord',
        category: 'rent',
        amount: 50000,
        currency: 'INR',
        note: 'September office rent',
      });
      const expense = expenseRes.expense as { id: string; state: string };
      expect(expense.state).toBe('recorded');

      const postings = await client.execute({ sql: "SELECT data FROM records WHERE type='posting' AND json_extract(data,'$.reference')=?", args: [expense.id] });
      expect(postings.rows).toHaveLength(1);
      const postData = JSON.parse(String(postings.rows[0].data));
      expect(postData.debit).toBe(50000);
      expect(postData.credit).toBe(50000);

      const reverseRes = await run('expense.reverse', { expense: expense.id, reason: 'Duplicate entry' }, adminAccess);
      expect((reverseRes.expense as { state: string }).state).toBe('reversed');

      const revPostings = await client.execute({ sql: "SELECT data FROM records WHERE type='posting' AND json_extract(data,'$.reference')=?", args: [`rev_${expense.id}`] });
      expect(revPostings.rows).toHaveLength(1);
      const revData = JSON.parse(String(revPostings.rows[0].data));
      expect(revData.debit).toBe(50000);
      expect(revData.credit).toBe(50000);

      await expect(run('expense.reverse', { expense: expense.id, reason: 'Again' })).rejects.toThrow('Only recorded expenses');
    });

    it('records partial supplier purchase payments and closes/reopens accounting periods', async () => {
      const { run, supplierOrg, rawVariant } = await fixture();
      const purchase = (await run('purchase.create', {
        supplier: supplierOrg.id,
        currency: 'INR',
        lines: JSON.stringify([{ variant: rawVariant.id, quantity: 10, cost: 500 }]),
      })).purchase as { id: string; version: number };

      const payRes = await run('purchase.pay', {
        purchase: purchase.id,
        amount: 3000,
        method: 'bank',
        reference: 'TXN-BANK-001',
      }, adminAccess);
      expect(payRes.purchase).toMatchObject({ id: purchase.id, paid: 3000 });

      await expect(run('purchase.pay', { purchase: purchase.id, amount: 3000, method: 'bank' })).rejects.toThrow('exceeds');

      const closeRes = await run('period.close', { period: '2026-09', note: 'September close' }, adminAccess);
      expect(closeRes.closed).toBe(true);

      await expect(run('period.close', { period: '2026-09' }, adminAccess)).rejects.toThrow('already closed');

      await expect(run('period.reopen', { period: '2026-09', reason: 'Late adjustment' }, adminAccess)).rejects.toThrow();

      const reopenRes = await run('period.reopen', { period: '2026-09', reason: 'Owner authorized late adjustment' }, ownerAccess);
      expect(reopenRes.reopened).toBe(true);
    });

    it('imports bank statements and records account reconciliation', async () => {
      const { run } = await fixture();
      const statementRes = await run('bank.import', {
        account: 'HDFC-001234',
        statement: JSON.stringify([
          { date: '2026-09-01', description: 'Vendor payment', amount: -3000 },
          { date: '2026-09-02', description: 'Customer deposit', amount: 15000 },
        ]),
        format: 'json',
      }, adminAccess);
      expect(statementRes.count).toBe(2);

      const recRes = await run('bank.reconcile', {
        account: 'HDFC-001234',
        period: '2026-09',
        balance: 12000,
      }, adminAccess);
      expect(recRes.difference).toBe(0);
    });
  });

  describe('Stock, Batches & Production', () => {
    it('transfers stock between locations and enforces sufficiency', async () => {
      const { client, run, rawVariant } = await fixture();
      const transferRes = await run('stock.transfer', {
        variant: rawVariant.id,
        quantity: 30,
        source: 'main',
        target: 'roastery',
        reason: 'Move to roastery workshop',
      });
      expect(transferRes.transfer).toMatchObject({ data: { variant: rawVariant.id, quantity: 30, source: 'main', target: 'roastery' } });

      const stockMain = await client.execute({ sql: "SELECT data FROM records WHERE type='stock' AND json_extract(data,'$.variant')=? AND json_extract(data,'$.location')=?", args: [rawVariant.id, 'main'] });
      expect(JSON.parse(String(stockMain.rows[0].data)).onhand).toBe(70);

      const stockRoastery = await client.execute({ sql: "SELECT data FROM records WHERE type='stock' AND json_extract(data,'$.variant')=? AND json_extract(data,'$.location')=?", args: [rawVariant.id, 'roastery'] });
      expect(JSON.parse(String(stockRoastery.rows[0].data)).onhand).toBe(30);

      await expect(run('stock.transfer', { variant: rawVariant.id, quantity: 80, source: 'main', target: 'roastery' })).rejects.toThrow('Insufficient stock');
    });

    it('saves and disposes expiring batches', async () => {
      const { client, run, rawVariant } = await fixture();
      const batchRes = await run('batch.save', {
        variant: rawVariant.id,
        batch: 'LOT-2026-001',
        quantity: 20,
        expiry: Date.now() + 30 * 86400000,
      }, adminAccess);
      const batch = batchRes.batch as { id: string };

      const disposeRes = await run('batch.dispose', {
        batch: batch.id,
        quantity: 5,
        reason: 'Water damage during storage',
      }, adminAccess);
      expect(disposeRes.batch).toMatchObject({ id: batch.id, state: 'active' });

      const stockRows = await client.execute({ sql: "SELECT data FROM records WHERE type='stock' AND json_extract(data,'$.variant')=? AND json_extract(data,'$.location')=?", args: [rawVariant.id, 'main'] });
      expect(JSON.parse(String(stockRows.rows[0].data)).onhand).toBe(95);

      await expect(run('batch.dispose', { batch: batch.id, quantity: 20, reason: 'Overdispose' }, adminAccess)).rejects.toThrow('exceeds batch availability');
    });

    it('saves a recipe, starts production consuming ingredients, and completes yield', async () => {
      const { client, run, rawVariant, roastedVariant } = await fixture();
      const recipeRes = await run('recipe.save', {
        name: 'Dark Espresso Roast',
        variant: roastedVariant.id,
        yield: 8,
        ingredients: JSON.stringify([{ variant: rawVariant.id, quantity: 10 }]),
      }, adminAccess);
      const recipe = recipeRes.recipe as { id: string };

      const prodRes = await run('production.start', {
        recipe: recipe.id,
        quantity: 16,
        location: 'main',
      });
      const production = prodRes.production as { id: string; state: string };
      expect(production.state).toBe('started');

      const greenStock = await client.execute({ sql: "SELECT data FROM records WHERE type='stock' AND json_extract(data,'$.variant')=? AND json_extract(data,'$.location')=?", args: [rawVariant.id, 'main'] });
      expect(JSON.parse(String(greenStock.rows[0].data)).onhand).toBe(80);

      const completeRes = await run('production.complete', {
        production: production.id,
        yield: 15,
        waste: 1,
      });
      expect(completeRes.production).toMatchObject({ id: production.id, state: 'completed' });

      const roastStock = await client.execute({ sql: "SELECT data FROM records WHERE type='stock' AND json_extract(data,'$.variant')=? AND json_extract(data,'$.location')=?", args: [roastedVariant.id, 'main'] });
      expect(JSON.parse(String(roastStock.rows[0].data)).onhand).toBe(15);
    });
  });

  describe('Workforce, Time & Logistics', () => {
    it('manages service bookings and cancellations', async () => {
      const { run } = await fixture();
      const start = Date.now() + 3600000;
      const end = start + 7200000;
      const bookingRes = await run('booking.create', {
        service: 'Barista Masterclass',
        start,
        end,
        resource: 'Training Bar',
      });
      const booking = bookingRes.booking as { id: string; state: string };
      expect(booking.state).toBe('confirmed');

      const cancelRes = await run('booking.cancel', { booking: booking.id, reason: 'Customer reschedule' });
      expect(cancelRes.booking).toMatchObject({ id: booking.id, state: 'cancelled' });

      await expect(run('booking.cancel', { booking: booking.id })).rejects.toThrow('already cancelled');
    });

    it('records worker time logs and member attendance', async () => {
      const { run } = await fixture();
      const timeRes = await run('time.record', {
        member: 'barista_alex',
        hours: 8,
        task: 'Roasting shift',
        note: 'Completed 3 batches',
      });
      expect((timeRes.time as { state: string }).state).toBe('recorded');

      const attRes = await run('attendance.record', {
        member: 'barista_alex',
        status: 'present',
        timestamp: Date.now(),
        note: 'On time',
      });
      expect((attRes.attendance as { state: string }).state).toBe('recorded');
    });

    it('executes rideshare trips with automated ledger receivables and fare configuration', async () => {
      const { client, run } = await fixture();
      await run('fare.set', { base: 5000, rate: 1500, currency: 'INR', tier: 'premium' }, adminAccess);

      const tripRes = await run('trip.start', {
        passenger: 'Corporate Guest',
        pickup: 'Airport T3',
        destination: 'Downtown HQ',
        driver: 'driver_user',
      }, driverAccess);
      const trip = tripRes.trip as { id: string; state: string };
      expect(trip.state).toBe('started');

      const completeRes = await run('trip.complete', {
        trip: trip.id,
        fare: 35000,
        distance: 20,
        duration: 45,
      }, driverAccess);
      expect(completeRes.trip).toMatchObject({ id: trip.id, state: 'completed' });

      const postingRows = await client.execute({ sql: "SELECT data FROM records WHERE type='posting' AND json_extract(data,'$.reference')=?", args: [trip.id] });
      expect(postingRows.rows).toHaveLength(1);
      const postData = JSON.parse(String(postingRows.rows[0].data));
      expect(postData.debit).toBe(35000);
      expect(postData.credit).toBe(35000);
    });

    it('schedules shifts, runs payroll and disburses wages under owner authorization', async () => {
      const { client, run } = await fixture();
      const now = Date.now();
      const shiftRes = await run('shift.assign', {
        member: 'barista_alex',
        role: 'barista',
        start: now + 3600000,
        end: now + 28800000,
        location: 'cafe_main',
      }, adminAccess);
      expect((shiftRes.shift as { state: string }).state).toBe('scheduled');

      const payrollRes = await run('payroll.run', {
        period: '2026-09',
        currency: 'INR',
        note: 'September payroll calculation',
      }, adminAccess);
      const payroll = payrollRes.payroll as { id: string; state: string };
      expect(payroll.state).toBe('calculated');

      await expect(run('payroll.pay', { payroll: payroll.id, method: 'bank' }, adminAccess)).rejects.toThrow();

      const payRes = await run('payroll.pay', { payroll: payroll.id, method: 'bank' }, ownerAccess);
      expect(payRes.payroll).toMatchObject({ id: payroll.id, state: 'paid' });

      const postingRows = await client.execute({ sql: "SELECT data FROM records WHERE type='posting' AND json_extract(data,'$.reference')=?", args: [payroll.id] });
      expect(postingRows.rows).toHaveLength(1);
    });
  });

  describe('Sourcing, Quality & Fulfillment Lifecycle', () => {
    it('qualifies suppliers, requests and records quotes', async () => {
      const { run, supplierOrg, rawVariant } = await fixture();
      const qualifyRes = await run('supplier.qualify', {
        supplier: supplierOrg.id,
        tier: 'preferred',
        terms: 'net45',
        note: 'Passed food safety audit',
      }, adminAccess);
      expect((qualifyRes.supplier as { state: string }).state).toBe('qualified');

      const quoteReq = await run('quote.request', {
        supplier: supplierOrg.id,
        lines: JSON.stringify([{ variant: rawVariant.id, quantity: 500 }]),
        deadline: Date.now() + 7 * 86400000,
      });
      expect((quoteReq.quote as { state: string }).state).toBe('requested');

      const quoteRec = await run('quote.record', {
        supplier: supplierOrg.id,
        lines: JSON.stringify([{ variant: rawVariant.id, quantity: 500, cost: 420 }]),
        currency: 'INR',
        validity: Date.now() + 30 * 86400000,
      });
      expect((quoteRec.quote as { state: string }).state).toBe('received');
    });

    it('submits purchase order for approval, approves or rejects', async () => {
      const { run, supplierOrg, rawVariant } = await fixture();
      const purchase = (await run('purchase.create', {
        supplier: supplierOrg.id,
        currency: 'INR',
        lines: JSON.stringify([{ variant: rawVariant.id, quantity: 20, cost: 450 }]),
      })).purchase as { id: string };

      const submitRes = await run('purchase.submit', { purchase: purchase.id, note: 'Quarterly restock' });
      expect((submitRes.purchase as { state: string }).state).toBe('submitted');

      const approveRes = await run('purchase.approve', { purchase: purchase.id, comment: 'Budget verified' }, adminAccess);
      expect((approveRes.purchase as { state: string }).state).toBe('ordered');

      const rejectPurchase = (await run('purchase.create', {
        supplier: supplierOrg.id,
        currency: 'INR',
        lines: JSON.stringify([{ variant: rawVariant.id, quantity: 100, cost: 450 }]),
      })).purchase as { id: string };
      await run('purchase.submit', { purchase: rejectPurchase.id });
      const rejectRes = await run('purchase.reject', { purchase: rejectPurchase.id, reason: 'Over budget limits' }, adminAccess);
      expect((rejectRes.purchase as { state: string }).state).toBe('rejected');
    });

    it('executes warehouse pick, pack, dispatch, track and delivery cycle', async () => {
      const { run, roastedVariant } = await fixture();
      await run('stock.adjust', { variant: roastedVariant.id, quantity: 50, reason: 'Roasted stock for fulfillment' });

      const order = (await run('order.create', {
        lines: [{ variant: roastedVariant.id, quantity: 4 }],
      })).order as { id: string };

      const pickRes = await run('warehouse.pick', {
        order: order.id,
        lines: JSON.stringify([{ variant: roastedVariant.id, quantity: 4 }]),
        warehouse: 'central_hub',
      }, warehouseAccess);
      expect((pickRes.pick as { state: string }).state).toBe('picked');

      const packRes = await run('warehouse.pack', {
        order: order.id,
        packages: JSON.stringify([{ box: 'Small Box', items: 4 }]),
        weight: 4200,
      }, warehouseAccess);
      expect((packRes.pack as { state: string }).state).toBe('packed');

      const dispatchRes = await run('shipment.dispatch', {
        order: order.id,
        carrier: 'BlueDart Express',
        tracking: 'BD-88990011',
      }, warehouseAccess);
      expect(dispatchRes.shipment).toMatchObject({ state: 'dispatched' });
      expect(dispatchRes.order).toMatchObject({ id: order.id, state: 'dispatched' });

      const trackRes = await run('shipment.track', {
        shipment: (dispatchRes.shipment as { id: string }).id,
        status: 'in_transit',
        location: 'Mumbai Hub',
        note: 'Arrived at sorting facility',
      }, warehouseAccess);
      expect((trackRes.shipment as { state: string }).state).toBe('dispatched');

      const deliverRes = await run('shipment.deliver', {
        shipment: (dispatchRes.shipment as { id: string }).id,
        signature: 'R. Sharma',
      }, warehouseAccess);
      expect((deliverRes.shipment as { state: string }).state).toBe('delivered');
      expect(deliverRes.order).toMatchObject({ id: order.id, state: 'delivered' });
    });

    it('returns supplier goods with inventory deduction', async () => {
      const { client, run, supplierOrg, rawVariant } = await fixture();
      const purchase = (await run('purchase.create', {
        supplier: supplierOrg.id,
        currency: 'INR',
        lines: JSON.stringify([{ variant: rawVariant.id, quantity: 10, cost: 500 }]),
      })).purchase as { id: string; version: number };
      await run('purchase.receive', { purchase: purchase.id, version: purchase.version });

      const returnRes = await run('purchase.return', {
        purchase: purchase.id,
        lines: JSON.stringify([{ variant: rawVariant.id, quantity: 5 }]),
        reason: 'Substandard moisture content',
      }, adminAccess);
      expect((returnRes.return as { state: string }).state).toBe('returned');

      const stockRows = await client.execute({ sql: "SELECT data FROM records WHERE type='stock' AND json_extract(data,'$.variant')=? AND json_extract(data,'$.location')=?", args: [rawVariant.id, 'main'] });
      expect(JSON.parse(String(stockRows.rows[0].data)).onhand).toBe(105);
    });

    it('inspects quality, releases batch, generates forecasts and replenishment plans', async () => {
      const { run, rawVariant } = await fixture();
      const batch = (await run('batch.save', {
        variant: rawVariant.id,
        batch: 'QA-LOT-99',
        quantity: 50,
        expiry: Date.now() + 60 * 86400000,
      }, adminAccess)).batch as { id: string };

      const inspectRes = await run('quality.inspect', {
        target: batch.id,
        result: 'passed',
        metrics: JSON.stringify({ moisture: 11.2, defects: 0 }),
        notes: 'Premium Grade A beans',
      }, warehouseAccess);
      expect((inspectRes.inspection as { state: string }).state).toBe('inspected');

      const releaseRes = await run('quality.release', {
        batch: batch.id,
        disposition: 'released_for_production',
      }, adminAccess);
      expect((releaseRes.quality as { state: string }).state).toBe('released');

      const forecastRes = await run('forecast.generate', {
        horizon: 60,
        channel: 'retail',
        notes: 'Holiday season surge projection',
      }, adminAccess);
      expect((forecastRes.forecast as { state: string }).state).toBe('generated');

      const planRes = await run('replenishment.plan', {
        location: 'main',
        horizon: 21,
      }, adminAccess);
      expect((planRes.plan as { state: string }).state).toBe('active');
    });
  });

  describe('Role-Based Work Permissions & Access Control', () => {
    it('enforces driver work role boundaries', async () => {
      const { run, roastedVariant } = await fixture();
      await expect(run('order.create', { lines: [{ variant: roastedVariant.id, quantity: 1 }] }, driverAccess)).rejects.toThrow();
      await expect(run('quality.release', { batch: 'batch1' }, driverAccess)).rejects.toThrow();
      await expect(run('period.close', { period: '2026-09' }, driverAccess)).rejects.toThrow();

      const trip = await run('trip.start', {
        passenger: 'Jane Doe',
        pickup: 'Point A',
        destination: 'Point B',
      }, driverAccess);
      expect(trip.trip).toBeDefined();
    });

    it('enforces warehouse work role boundaries', async () => {
      const { run } = await fixture();
      await expect(run('fare.set', { base: 100, rate: 10 }, warehouseAccess)).rejects.toThrow();
      await expect(run('payroll.run', { period: '2026-09' }, warehouseAccess)).rejects.toThrow();
      await expect(run('period.close', { period: '2026-09' }, warehouseAccess)).rejects.toThrow();
    });

    it('rejects manager-level actions when attempted by standard member', async () => {
      const { run, supplierOrg, rawVariant } = await fixture();
      await expect(run('supplier.qualify', { supplier: supplierOrg.id, tier: 'approved' }, memberAccess)).rejects.toThrow();
      await expect(run('batch.save', { variant: rawVariant.id, batch: 'B1', quantity: 10, expiry: Date.now() }, memberAccess)).rejects.toThrow();
      await expect(run('fare.set', { base: 1000, rate: 100 }, memberAccess)).rejects.toThrow();
      await expect(run('shift.assign', { member: 'm1', role: 'cook', start: 100, end: 200 }, memberAccess)).rejects.toThrow();
      await expect(run('payroll.run', { period: '2026-09' }, memberAccess)).rejects.toThrow();
    });

    it('maintains strict single-word lowercase keys for all domain record payloads in database', async () => {
      const { client, run, supplierOrg, rawVariant } = await fixture();
      await run('expense.record', { payee: 'Stationery Corp', category: 'supplies', amount: 1200, currency: 'INR' });
      await run('shift.assign', { member: 'barista_alex', role: 'cook', start: Date.now() + 1000, end: Date.now() + 5000 }, adminAccess);
      await run('supplier.qualify', { supplier: supplierOrg.id, tier: 'gold' }, adminAccess);
      await run('batch.save', { variant: rawVariant.id, batch: 'B99', quantity: 10, expiry: Date.now() + 100000 }, adminAccess);

      const allRecords = await client.execute("SELECT type, data FROM records WHERE archived IS NULL");
      const singleWordPattern = /^[a-z]+$/;
      for (const row of allRecords.rows) {
        const data = JSON.parse(String(row.data)) as Record<string, unknown>;
        for (const key of Object.keys(data)) {
          expect(key, `Record of type '${String(row.type)}' has non-single-word key '${key}'`).toMatch(singleWordPattern);
        }
      }
    });
  });
});

