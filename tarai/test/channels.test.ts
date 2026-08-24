import { describe, it, expect, beforeEach } from 'vitest';
import { verifyHmacSha256 } from '../src/channels/signature.ts';
import { WhatsAppChannelAdapter } from '../src/channels/whatsapp.ts';
import { createDatabaseClient, initializeSchema } from '../src/data/turso.ts';
import { WorkspaceRepository } from '../src/data/repositories/workspace.ts';
import { MatterRepository } from '../src/data/repositories/matter.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('Channel Adapters & Webhook Security', () => {
  let client: ReturnType<typeof createDatabaseClient>;

  beforeEach(async () => {
    client = createDatabaseClient({ TURSO_DATABASE_URL: 'file::memory:' });
    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../src/data/schema.sql'), 'utf-8');
    await initializeSchema(client, schemaSql);

    const wsRepo = new WorkspaceRepository(client);
    await wsRepo.create({
      id: 'ws_channel',
      name: 'Channel Workspace',
      slug: 'channel',
      currency: 'USD',
      settings: {},
    });

    const matterRepo = new MatterRepository(client);
    await matterRepo.create('ws_channel', 'prod_coffee', 'product', {
      sku: 'COFFEE-01',
      name: 'Organic Espresso',
      description: 'Rich dark espresso roast',
      priceCents: 1200,
      currency: 'USD',
      stockLevel: 25,
      lowStockThreshold: 5,
      status: 'active',
    });
  });

  it('verifies HMAC-SHA256 signatures correctly', async () => {
    const payload = '{"message":"test"}';
    const secret = 'supersecret';

    // Compute expected HMAC
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(payload));
    const sigHex = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const valid = await verifyHmacSha256(payload, secret, `sha256=${sigHex}`);
    expect(valid).toBe(true);

    const invalid = await verifyHmacSha256(payload, secret, 'sha256=badsignature');
    expect(invalid).toBe(false);
  });

  it('deduplicates repeat delivery of WhatsApp webhook messages', async () => {
    const adapter = new WhatsAppChannelAdapter(client, '');

    const webhookPayload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry_1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '123456789', phone_number_id: 'pn_1' },
                messages: [
                  {
                    id: 'wamid_12345',
                    from: '19876543210',
                    timestamp: '1690000000',
                    type: 'text',
                    text: { body: 'Do you have coffee?' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    // First delivery -> processed
    const res1 = await adapter.handleWebhook(webhookPayload, undefined, 'ws_channel');
    expect(res1.status).toBe('processed');
    expect(res1.replies.length).toBe(1);
    expect(res1.replies[0]).toContain('Organic Espresso');

    // Second delivery of same message ID -> duplicate ignored
    const res2 = await adapter.handleWebhook(webhookPayload, undefined, 'ws_channel');
    expect(res2.status).toBe('duplicate_ignored');
    expect(res2.replies.length).toBe(0);
  });

  it('rejects a webhook from an unregistered phone number', async () => {
    const adapter = new WhatsAppChannelAdapter(client, '');
    const result = await adapter.handleWebhook(JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{ changes: [{ value: { metadata: { phone_number_id: 'wrong' } } }] }],
    }), undefined, 'ws_channel', 'registered');
    expect(result.status).toBe('rejected');
  });
});
