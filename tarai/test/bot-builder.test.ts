import { describe, expect, it } from 'vitest';
import { validateBotBuilderDraft } from '../src/agents/bot-builder.ts';

describe('Bot Builder draft validation', () => {
  it('normalizes a safe, usable Bot draft', () => {
    const draft = validateBotBuilderDraft({
      name: 'Corner shop POS',
      purpose: 'Sell products at a counter.',
      artifacts: [{ id: 'sales', name: 'Sales', fields: ['customer', 'items', 'total', 'status'], initialStatus: 'draft' }],
      workflows: [{
        id: 'checkout', title: 'Checkout', artifactId: 'sales', steps: [
          { id: 'select_products', title: 'Select products', handler: 'app', card: { type: 'selection', fields: ['items'] } },
          { id: 'calculate_total', title: 'Calculate total', handler: 'app' },
          { id: 'product_advice', title: 'Recommend products', handler: 'agent', instruction: 'Recommend suitable products.' },
        ],
      }],
    });

    expect(draft.name).toBe('Corner shop POS');
    expect(draft.artifacts[0].fields).toEqual(['customer', 'items', 'total', 'status']);
    expect(draft.workflows[0].steps).toHaveLength(3);
    expect(draft.workflows[0].steps[2].handler).toBe('agent');
  });

  it('rejects an empty model draft', () => {
    expect(() => validateBotBuilderDraft({ name: 'Empty Bot' })).toThrow('Data');
  });
});
