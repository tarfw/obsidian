import { describe, expect, it } from 'vitest';
import { evaluateMemberAccess, suggestCapabilities, suggestMember } from '../src/brain/workspace-ai.ts';
import { matchFlowSteps, suggest, fallbackAction } from '../src/brain/jev.ts';

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

  it('evaluates member brief with Noul and enforces sensitive money tool safety in code', async () => {
    const cashierResult = await evaluateMemberAccess(undefined, 'Handles counter sales and cash drawer');
    expect(cashierResult.review).toBe(true);
    expect(cashierResult.evaluations.length).toBe(18);

    const posEval = cashierResult.evaluations.find((e) => e.id === 'pos')!;
    const registerEval = cashierResult.evaluations.find((e) => e.id === 'register')!;
    const purchaseEval = cashierResult.evaluations.find((e) => e.id === 'purchase')!;
    const siteEval = cashierResult.evaluations.find((e) => e.id === 'site')!;

    // High scores for pos and register
    expect(posEval.probability).toBeGreaterThanOrEqual(0.80);
    expect(registerEval.probability).toBeGreaterThanOrEqual(0.80);

    // Low scores for purchase and site
    expect(purchaseEval.probability).toBeLessThanOrEqual(0.20);
    expect(siteEval.probability).toBeLessThanOrEqual(0.20);

    // CRITICAL: Sensitive tools (reach: 'money') are NEVER auto pre-ticked
    expect(posEval.reach).toBe('money');
    expect(posEval.on).toBe(false);
    expect(posEval.ask).toBe(true);

    expect(registerEval.reach).toBe('money');
    expect(registerEval.on).toBe(false);
    expect(registerEval.ask).toBe(true);

    // Non-sensitive data tools with high score ARE pre-ticked
    const inventoryResult = await evaluateMemberAccess(undefined, 'Checks inventory stock counts and runs daily closing flow checklist');
    const inventoryEval = inventoryResult.evaluations.find((e) => e.id === 'inventory')!;
    const flowEval = inventoryResult.evaluations.find((e) => e.id === 'flow')!;

    expect(inventoryEval.probability).toBeGreaterThanOrEqual(0.80);
    expect(inventoryEval.reach).toBe('data');
    expect(inventoryEval.on).toBe(true);
    expect(inventoryEval.ask).toBe(false);

    expect(flowEval.probability).toBeGreaterThanOrEqual(0.80);
    expect(flowEval.reach).toBe('none');
    expect(flowEval.on).toBe(true);
    expect(flowEval.ask).toBe(false);

    expect(inventoryResult.suggestedAccess).toContain('inventory');
    expect(inventoryResult.suggestedAccess).toContain('flow');
  });

  it('matches multi-line flow steps via Choice and applies safety flags for money and customer reach', async () => {
    const lines = [
      'Count the cash',
      'Check the stock',
      'Send the day report to owner',
      'Issue invoice to customer',
    ];
    const matchResult = await matchFlowSteps(undefined, lines);
    expect(matchResult.review).toBe(true);
    expect(matchResult.steps.length).toBe(4);

    // 1. "Count the cash" -> human ("You do")
    expect(matchResult.steps[0].kind).toBe('human');
    expect(matchResult.steps[0].toolId).toBe(null);
    expect(matchResult.steps[0].asksFirst).toBe(false);

    // 2. "Check the stock" -> tool (inventory)
    expect(matchResult.steps[1].kind).toBe('tool');
    expect(matchResult.steps[1].toolId).toBe('inventory');
    expect(matchResult.steps[1].asksFirst).toBe(false);

    // 3. "Send the day report to owner" -> tool (telegram)
    expect(matchResult.steps[2].kind).toBe('tool');
    expect(matchResult.steps[2].toolId).toBe('telegram');
    expect(matchResult.steps[2].asksFirst).toBe(false);

    // 4. "Issue invoice to customer" -> tool (invoice, reach: 'money') -> asksFirst: true
    expect(matchResult.steps[3].kind).toBe('tool');
    expect(matchResult.steps[3].toolId).toBe('invoice');
    expect(matchResult.steps[3].asksFirst).toBe(true);
  });

  it('correctly classifies Kitchen / Cook and denies POS when duties include "No access to sale"', async () => {
    const kitchenPrompt = 'Prepares food orders and tracks kitchen ingredients. Marks kitchen order handoff. No access to sale';
    const memberRes = await suggestMember(undefined, kitchenPrompt);
    expect(memberRes.workRole).toBe('chef');
    expect(memberRes.roles).toContain('chef');
    expect(memberRes.roles).not.toContain('cashier');

    const accessRes = await evaluateMemberAccess(undefined, kitchenPrompt);
    const posEval = accessRes.evaluations.find((e) => e.id === 'pos')!;
    expect(posEval.probability).toBeLessThanOrEqual(0.10);
    expect(posEval.on).toBe(false);
    expect(posEval.ask).toBe(false);
    expect(accessRes.suggestedAccess).not.toContain('pos');
    expect(memberRes.tools).toContain('order');
    expect(memberRes.tools).toContain('inventory');
    expect(memberRes.tools).not.toContain('pos');
  });

  it('correctly classifies Delivery and assigns Orders for delivery brief blocks', async () => {
    const deliveryPrompt = 'Claims customer orders and packs delivery parcels. Updates delivery status and customer dropoff';
    const memberRes = await suggestMember(undefined, deliveryPrompt);
    expect(memberRes.workRole).toBe('courier');
    expect(memberRes.roles).toContain('courier');
    expect(memberRes.tools).toContain('order');
    expect(memberRes.tools).not.toContain('pos');
    expect(memberRes.tools).not.toContain('register');
    expect(memberRes.tools).not.toContain('flow');
    expect(memberRes.tools).not.toContain('inbox');
  });

  it('correctly classifies apparel/textile tailor/weaver into operations and assigns order and inventory', async () => {
    const atelierPrompt = 'Weaves silk sarees on handloom and tracks yarn raw material stock. Hands over finished sarees for packing';
    const memberRes = await suggestMember(undefined, atelierPrompt);
    expect(memberRes.workRole).toBe('chef');
    expect(memberRes.tools).toContain('order');
    expect(memberRes.tools).toContain('inventory');
    expect(memberRes.tools).not.toContain('pos');
  });

  it('correctly classifies retail boutique sales into cashier and assigns pos, register and payment', async () => {
    const salesPrompt = 'Sells sarees at counter, accepts cash and UPI payments, reconciles drawer at night';
    const memberRes = await suggestMember(undefined, salesPrompt);
    expect(memberRes.workRole).toBe('cashier');
    expect(memberRes.tools).toContain('pos');
    expect(memberRes.tools).toContain('register');
    expect(memberRes.tools).toContain('payment');
  });
});
