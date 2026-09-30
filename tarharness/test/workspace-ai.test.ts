import { describe, expect, it } from 'vitest';
import { suggestCapabilities, suggestMember } from '../src/brain/workspace-ai.ts';
import { suggest, fallbackAction } from '../src/brain/jev.ts';

describe('Jev workspace & member AI suggestions', () => {
  it('suggests POS, Commerce, and Site for a restaurant brief', async () => {
    const result = await suggestCapabilities(undefined, 'Restaurant: sales, products and a site');
    expect(result.review).toBe(true);
    expect(result.capabilities.pos).toBe(true);
    expect(result.capabilities.commerce).toBe(true);
    expect(result.capabilities.site).toBe(true);
  });

  it('suggests Commerce and Site for an online store brief', async () => {
    const result = await suggestCapabilities(undefined, 'Online apparel store with catalog and international orders');
    expect(result.capabilities.commerce).toBe(true);
    expect(result.capabilities.site).toBe(true);
  });

  it('suggests POS for a retail cafe counter', async () => {
    const result = await suggestCapabilities(undefined, 'Coffee shop with cashier counter and kitchen orders');
    expect(result.capabilities.pos).toBe(true);
  });

  it('suggests cashier duties and grants for cashier role', async () => {
    const result = await suggestMember(undefined, 'Cashier and manage products');
    expect(result.review).toBe(true);
    expect(result.role).toBe('member');
    expect(result.roles).toContain('cashier');
    expect(result.roles).toContain('manager');
    expect(result.permissions.some((p) => p.toLowerCase().includes('sales'))).toBe(true);
  });

  it('suggests kitchen prep permissions for a chef', async () => {
    const result = await suggestMember(undefined, 'Kitchen cook preparing food orders');
    expect(result.role).toBe('member');
    expect(result.roles).toContain('chef');
    expect(result.permissions.some((p) => p.toLowerCase().includes('kitchen'))).toBe(true);
  });

  it('suggests delivery permissions for a courier', async () => {
    const result = await suggestMember(undefined, 'Delivery driver for food dropoffs');
    expect(result.roles).toContain('courier');
  });

  it('suggests accounting permissions for finance member', async () => {
    const result = await suggestMember(undefined, 'Accountant handling invoices, payments and expenses');
    expect(result.roles).toContain('accountant');
  });

  it('suggests warehouse picking and packing for warehouse member', async () => {
    const result = await suggestMember(undefined, 'Warehouse worker: pick items and pack shipments');
    expect(result.roles).toContain('warehouse');
    expect(result.suggestedActions).toContain('warehouse.pick');
    expect(result.suggestedActions).toContain('warehouse.pack');
  });

  it('suggests purchasing and quotes for buyer member', async () => {
    const result = await suggestMember(undefined, 'Purchasing agent handling supplier quotes and purchase orders');
    expect(result.roles).toContain('buyer');
    expect(result.suggestedActions).toContain('quote.request');
    expect(result.suggestedActions).toContain('purchase.create');
  });

  it('rejects admin inference and defaults to member even if admin requested in duties', async () => {
    const result = await suggestMember(undefined, 'Admin with full access to everything');
    expect(result.role).toBe('member');
    expect(result.review).toBe(true);
  });

  it('handles empty or blank prompt gracefully with defaults', async () => {
    const wsResult = await suggestCapabilities(undefined, '');
    expect(wsResult.capabilities.commerce).toBe(true);
    expect(wsResult.review).toBe(true);

    const memberResult = await suggestMember(undefined, '   ');
    expect(memberResult.role).toBe('member');
    expect(memberResult.workRole).toBe('general');
  });

  it('suggests routine.save for natural language routine and schedule prompts', async () => {
    const shiftRes = await suggest(undefined, 'Schedule weekdays 9 to 5');
    expect(shiftRes.action).toBe('routine.save');
    expect(shiftRes.title).toBe('Add Space routine');
    expect(shiftRes.review).toBe(true);

    const morningRes = await suggest(undefined, 'Set up morning shift routine from 9am to 1pm');
    expect(morningRes.action).toBe('routine.save');

    const switchRes = await suggest(undefined, 'Switch workspace automatically every evening at 17:00');
    expect(switchRes.action).toBe('routine.save');

    const hoursRes = await suggest(undefined, 'Set working hours for my shop');
    expect(hoursRes.action).toBe('routine.save');

    const weekendRes = await suggest(undefined, 'Add weekend shift 10:00-18:00');
    expect(weekendRes.action).toBe('routine.save');

    const eveningRes = await suggest(undefined, 'Evening shift schedule 17:00-22:00');
    expect(eveningRes.action).toBe('routine.save');
  });

  it('suggests appropriate domain actions for task, contact, pos, and site prompts', async () => {
    const taskRes = await suggest(undefined, 'Remind me to call supplier tomorrow');
    expect(taskRes.action).toBe('task.create');

    const contactRes = await suggest(undefined, 'Add new customer Jane Doe with email and phone');
    expect(contactRes.action).toBe('contact.create');

    const posRes = await suggest(undefined, 'Open POS cashier counter');
    expect(posRes.action).toBe('pos.open');

    const siteRes = await suggest(undefined, 'Build a website for my clothing shop');
    expect(siteRes.action).toBe('site.generate');

    const invoiceRes = await suggest(undefined, 'Issue invoice to client for catering service');
    expect(invoiceRes.action).toBe('invoice.issue');

    const paymentRes = await suggest(undefined, 'Record payment received for invoice');
    expect(paymentRes.action).toBe('payment.record');

    const refundRes = await suggest(undefined, 'Issue refund for returned merchandise');
    expect(refundRes.action).toBe('refund.record');

    const stockRes = await suggest(undefined, 'Adjust stock inventory count');
    expect(stockRes.action).toBe('stock.adjust');

    const priceRes = await suggest(undefined, 'Set price for new menu item');
    expect(priceRes.action).toBe('price.set');

    const searchRes = await suggest(undefined, 'Search online for coffee bean supplier');
    expect(searchRes.action).toBe('web.search');
  });
});
