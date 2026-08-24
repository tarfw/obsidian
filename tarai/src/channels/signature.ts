/**
 * Channel Webhook Signature Verification
 */

export async function verifyHmacSha256(
  payload: string,
  secret: string,
  signatureHeader: string | undefined
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify', 'sign']
    );

    // Signature header format might be `sha256=<hex>` or raw hex
    const hexSig = signatureHeader.startsWith('sha256=')
      ? signatureHeader.slice(7)
      : signatureHeader;

    // Convert hex signature to Uint8Array
    const match = hexSig.match(/.{1,2}/g);
    if (!match) return false;
    const sigBytes = new Uint8Array(match.map((byte) => parseInt(byte, 16)));

    const payloadData = encoder.encode(payload);
    return await crypto.subtle.verify('HMAC', cryptoKey, sigBytes, payloadData);
  } catch {
    return false;
  }
}
