/**
 * Tier 2: Sales Module
 * Identity: request_id + customer_id + scope
 * Mission: Factual catalogue, FAQ, quotes, and issue intake.
 * Rule: Truth before prose. Unknown facts must be marked as unknown; never invent prices or products.
 */
import type { Client } from '@libsql/client';
import { MatterRepository } from '../data/repositories/matter.ts';
import type { ProductMatter } from '../domain/types.ts';

export interface SalesQueryRequest {
  requestId: string;
  customerId: string;
  query: string;
}

export interface SalesQueryResponse {
  requestId: string;
  answer: string;
  matchedProducts: ProductMatter[];
  sourceCitations: string[];
}

export class SalesModule {
  constructor(private client: Client) {}

  async handleQuery(workspaceId: string, req: SalesQueryRequest): Promise<SalesQueryResponse> {
    const repo = new MatterRepository(this.client);
    const products = await repo.listByType(workspaceId, 'product');
    const queryLower = req.query.toLowerCase();
    const stopWords = new Set(['do', 'you', 'have', 'the', 'a', 'an', 'is', 'are', 'we', 'i', 'for', 'in', 'on', 'at', 'to', 'of']);
    const queryTokens = queryLower
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !stopWords.has(t));

    // Match products based strictly on canonical data
    const matched = products
      .filter((p) => {
        const d = p.data;
        if (d.status !== 'active') return false;

        const nameLower = d.name.toLowerCase();
        const descLower = d.description.toLowerCase();
        const skuLower = d.sku.toLowerCase();

        // Exact substring match
        if (nameLower.includes(queryLower) || descLower.includes(queryLower) || skuLower.includes(queryLower)) {
          return true;
        }

        // Token match (e.g. "coffee" in "COFFEE-01" or description)
        if (queryTokens.length > 0) {
          return queryTokens.some(
            (token) => nameLower.includes(token) || descLower.includes(token) || skuLower.includes(token)
          );
        }

        return false;
      })
      .map((p) => p.data);

    if (matched.length === 0) {
      return {
        requestId: req.requestId,
        answer: `I could not find any products matching "${req.query}" in our verified catalogue.`,
        matchedProducts: [],
        sourceCitations: ['matter.product (no matches)'],
      };
    }

    const summaries = matched.map((p) => {
      const priceFormatted = (p.priceCents / 100).toFixed(2);
      const stockStatus = p.stockLevel > 0 ? `${p.stockLevel} in stock` : 'Out of stock';
      return `• ${p.name} (SKU: ${p.sku}) — $${priceFormatted} ${p.currency} [${stockStatus}]: ${p.description}`;
    });

    return {
      requestId: req.requestId,
      answer: `Here are the matching items from our verified catalogue:\n\n${summaries.join('\n')}`,
      matchedProducts: matched,
      sourceCitations: matched.map((p) => `matter.product#${p.sku}`),
    };
  }
}
