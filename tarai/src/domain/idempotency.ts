/**
 * TARAI Idempotency & Payload Hashing Engine
 */

export async function computeSha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Normalizes an arbitrary JSON object with sorted keys recursively
 * to guarantee identical SHA-256 hash regardless of key insertion order.
 */
export function normalizePayload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    return 'null';
  }
  if (typeof payload !== 'object') {
    return JSON.stringify(payload);
  }
  if (Array.isArray(payload)) {
    return `[${payload.map((item) => normalizePayload(item)).join(',')}]`;
  }
  const keys = Object.keys(payload as Record<string, unknown>).sort();
  const pairs = keys.map((key) => {
    const val = (payload as Record<string, unknown>)[key];
    return `${JSON.stringify(key)}:${normalizePayload(val)}`;
  });
  return `{${pairs.join(',')}}`;
}

export async function hashPayload(payload: unknown): Promise<string> {
  const normalized = normalizePayload(payload);
  return computeSha256(normalized);
}

export function generateIdempotencyKey(
  workspaceId: string,
  actionType: string,
  payloadHash: string
): string {
  return `idemp_${workspaceId.slice(0, 8)}_${actionType}_${payloadHash.slice(0, 16)}`;
}
