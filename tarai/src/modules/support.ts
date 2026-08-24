/**
 * Tier 2: Support Module
 * Identity: request_id + customer_id + scope
 * Mission: Factual FAQ, order status lookup, and ticket creation.
 */
import type { Client } from '@libsql/client';
import { MatterRepository } from '../data/repositories/matter.ts';
import type { InvoiceMatter } from '../domain/types.ts';

export interface SupportQueryRequest {
  requestId: string;
  customerId: string;
  query: string;
  action?: 'check_order' | 'create_ticket' | 'faq';
  orderId?: string;
  ticketDetails?: {
    title: string;
    description: string;
  };
}

export interface SupportQueryResponse {
  requestId: string;
  answer: string;
  orderDetails?: InvoiceMatter;
  createdTicketId?: string;
  sourceCitations: string[];
}

export class SupportModule {
  constructor(private client: Client) {}

  async handleQuery(workspaceId: string, req: SupportQueryRequest): Promise<SupportQueryResponse> {
    const repo = new MatterRepository(this.client);

    // 1. Order status lookup
    if (req.action === 'check_order' && req.orderId) {
      const invoice = await repo.findById<InvoiceMatter['status'] extends string ? 'invoice' : never>(
        workspaceId,
        req.orderId
      );

      if (!invoice) {
        return {
          requestId: req.requestId,
          answer: `No order found with ID "${req.orderId}".`,
          sourceCitations: ['matter.invoice (not found)'],
        };
      }

      const inv = invoice.data as InvoiceMatter;
      return {
        requestId: req.requestId,
        answer: `Order ${req.orderId} is currently "${inv.status}". Total: $${(inv.totalCents / 100).toFixed(2)}.`,
        orderDetails: inv,
        sourceCitations: [`matter.invoice#${req.orderId}`],
      };
    }

    // 2. Ticket creation
    if (req.action === 'create_ticket' && req.ticketDetails) {
      const ticketId = `task_support_${Date.now()}`;
      await repo.create(workspaceId, ticketId, 'task', {
        title: `[Customer Support] ${req.ticketDetails.title}`,
        description: `Customer ID: ${req.customerId}\n\n${req.ticketDetails.description}`,
        status: 'todo',
        priority: 'high',
      });

      return {
        requestId: req.requestId,
        answer: `Support ticket #${ticketId} has been created for customer ${req.customerId}. Our team will follow up shortly.`,
        createdTicketId: ticketId,
        sourceCitations: [`matter.task#${ticketId}`],
      };
    }

    // 3. Default FAQ fallback
    return {
      requestId: req.requestId,
      answer: 'Our customer support team is available during standard business hours. You can ask for order status or open a support ticket.',
      sourceCitations: ['okf.wiki/support_faq.md'],
    };
  }
}
