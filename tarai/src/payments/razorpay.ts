export interface RazorpayEnv {
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  RAZORPAY_WEBHOOK_SECRET?: string;
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function createRazorpayOrder(
  env: RazorpayEnv,
  input: { amount: number; currency: string; receipt: string },
): Promise<{ id: string; amount: number; currency: string }> {
  const key = required(env.RAZORPAY_KEY_ID, 'RAZORPAY_KEY_ID');
  const secret = required(env.RAZORPAY_KEY_SECRET, 'RAZORPAY_KEY_SECRET');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${key}:${secret}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...input, partial_payment: false }),
  });
  if (!response.ok) throw new Error(`Razorpay order creation failed (${response.status})`);
  return response.json<{ id: string; amount: number; currency: string }>();
}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export async function verifyRazorpayWebhook(env: RazorpayEnv, body: string, signature: string | undefined): Promise<boolean> {
  if (!signature) return false;
  const secret = required(env.RAZORPAY_WEBHOOK_SECRET, 'RAZORPAY_WEBHOOK_SECRET');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  if (expected.length !== signature.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return difference === 0;
}
