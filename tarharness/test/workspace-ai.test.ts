import { describe, expect, it } from 'vitest';
import { suggestCapabilities, suggestMember } from '../src/brain/workspace-ai.ts';

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
});
