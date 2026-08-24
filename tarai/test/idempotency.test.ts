import { describe, it, expect } from 'vitest';
import { normalizePayload, hashPayload, generateIdempotencyKey } from '../src/domain/idempotency.ts';

describe('Idempotency & Deterministic Hashing', () => {
  it('normalizes payloads regardless of key ordering', async () => {
    const objA = { z: 1, a: 2, m: { nestedB: 'hello', nestedA: 10 } };
    const objB = { a: 2, m: { nestedA: 10, nestedB: 'hello' }, z: 1 };

    const normA = normalizePayload(objA);
    const normB = normalizePayload(objB);

    expect(normA).toEqual(normB);

    const hashA = await hashPayload(objA);
    const hashB = await hashPayload(objB);

    expect(hashA).toEqual(hashB);
  });

  it('generates consistent idempotency keys', async () => {
    const payload = { customerId: 'cust_1', totalCents: 5000 };
    const hash = await hashPayload(payload);
    const key1 = generateIdempotencyKey('ws_alpha_123', 'pos.checkout', hash);
    const key2 = generateIdempotencyKey('ws_alpha_123', 'pos.checkout', hash);

    expect(key1).toBe(key2);
    expect(key1).toContain('idemp_ws_alpha_pos.checkout_');
  });
});
