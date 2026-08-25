/**
 * WhatsApp Cloud API Channel Adapter
 * Rule: Fast ack, verified webhook signature, idempotent deduplication by message ID.
 */
import type { Client } from '@libsql/client';
import { verifyHmacSha256 } from './signature.ts';
import { SalesModule } from '../modules/sales.ts';
import { SupportModule } from '../modules/support.ts';

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        messages?: Array<{
          id: string;
          from: string;
          timestamp: string;
          text?: { body: string };
          type: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export interface WebhookProcessingResult {
  status: 'acknowledged' | 'duplicate_ignored' | 'rejected' | 'processed';
  replies: string[];
  error?: string;
}

export class WhatsAppChannelAdapter {
  constructor(
    private client: Client,
    private webhookSecret: string
  ) {}

  async handleWebhook(
    rawBody: string,
    signatureHeader: string | undefined,
    workspaceId: string,
    configuredPhoneNumberId?: string
  ): Promise<WebhookProcessingResult> {
    // 1. Verify signature
    if (this.webhookSecret) {
      const isValid = await verifyHmacSha256(rawBody, this.webhookSecret, signatureHeader);
      if (!isValid) {
        return { status: 'rejected', replies: [], error: 'Invalid HMAC signature' };
      }
    }

    let payload: WhatsAppWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return { status: 'rejected', replies: [], error: 'Malformed JSON payload' };
    }

    if (payload.object !== 'whatsapp_business_account') {
      return { status: 'rejected', replies: [], error: 'Unexpected WhatsApp webhook object' };
    }

    const phoneNumberId = payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    if (configuredPhoneNumberId && phoneNumberId !== configuredPhoneNumberId) {
      return { status: 'rejected', replies: [], error: 'Webhook phone number is not registered' };
    }

    const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages || messages.length === 0) {
      return { status: 'acknowledged', replies: [] };
    }

    const replies: string[] = [];
    const sales = new SalesModule(this.client);
    const support = new SupportModule(this.client);

    for (const msg of messages) {
      const msgId = msg.id;
      const text = msg.text?.body || '';
      const from = msg.from;

      // 2. Check deduplication key in request table
      const idempKey = `wa_msg_${msgId}`;
      const existing = await this.client.execute({
        sql: `SELECT * FROM request WHERE idem = ?`,
        args: [idempKey],
      });

      if (existing.rows.length > 0) {
        // Duplicate delivery! Return acknowledged without repeating effect
        return { status: 'duplicate_ignored', replies: [] };
      }

      // Record message as processed in request table
      const now = Date.now();
      await this.client.execute({
        sql: `INSERT INTO request (idem, actor, action, payload_hash, status, response, created, completed)
              VALUES (?, ?, 'whatsapp.inbound', ?, 2, ?, ?, ?)
              ON CONFLICT(idem) DO NOTHING`,
        args: [idempKey, from, msgId, JSON.stringify({ from, text }), now, now],
      });

      // 3. Dispatch based on message content
      if (text.toLowerCase().includes('order') || text.toLowerCase().includes('help') || text.toLowerCase().includes('support')) {
        const supRes = await support.handleQuery(workspaceId, {
          requestId: `req_${Date.now()}`,
          customerId: from,
          query: text,
        });
        replies.push(supRes.answer);
      } else {
        const salesRes = await sales.handleQuery(workspaceId, {
          requestId: `req_${Date.now()}`,
          customerId: from,
          query: text,
        });
        replies.push(salesRes.answer);
      }
    }

    return {
      status: 'processed',
      replies,
    };
  }
}
