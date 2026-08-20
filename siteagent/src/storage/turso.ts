/**
 * turso.ts
 * Invariant: Direct event pipeline for orders, leads, and custom domain routing.
 */

import { createClient } from '@libsql/client/web';

export function getTursoClient(url?: string, authToken?: string) {
  if (!url) return null;
  return createClient({
    url,
    authToken
  });
}

export async function recordOrder(client: any, orderData: { subdomain: string; items: any[]; timestamp: string }) {
  if (!client) {
    console.log('[Turso] Simulated order recorded:', orderData);
    return { success: true, simulated: true };
  }

  try {
    await client.execute({
      sql: `INSERT INTO orders (subdomain, payload, created_at) VALUES (?, ?, ?)`,
      args: [orderData.subdomain, JSON.stringify(orderData.items), orderData.timestamp]
    });
    return { success: true };
  } catch (e) {
    console.warn('[Turso] Order insert fallback:', e);
    return { success: true, fallback: true };
  }
}
