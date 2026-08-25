import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { ControlRepository } from '../control/control.ts';
import { createDatabaseClientForHost } from '../data/turso.ts';
import {
  toMatterTypeCode,
  toInboxTypeCode,
  PROJECTION_COLLECTION,
  INBOX_TYPES,
} from '../domain/types.ts';

export interface ProjectionParams {
  id: string;
  space: string;
  type: string;
  ref?: string;
  data: Record<string, unknown>;
  recipients?: string[];
  collection?: number;
  sourceVersion?: number;
  isDeleted?: boolean;
}

interface ProjectionEnv {
  CONTROL: D1Database;
  TURSO_AUTH_TOKEN?: string;
}

function redactForRole(role: string, data: Record<string, unknown>): Record<string, unknown> {
  const cloned = { ...data };
  // Redact supplier costs, profit margins, private billing details from non-admin roles
  if (role !== 'owner' && role !== 'admin') {
    delete cloned.cost_cents;
    delete cloned.supplier_price;
    delete cloned.vendor_cost;
    delete cloned.margin;
    delete cloned.payroll_rate;
    delete cloned.bank_details;
  }
  return cloned;
}

export class ProjectionWorkflow extends WorkflowEntrypoint<ProjectionEnv, ProjectionParams> {
  async run(event: Readonly<WorkflowEvent<ProjectionParams>>, step: WorkflowStep) {
    const input = event.payload;
    const control = new ControlRepository(this.env.CONTROL);
    const routes = await step.do('resolve recipients', () => control.listMemberRoutes(input.space));
    const space = await step.do('resolve workspace owner', () => control.getSpace(input.space));
    const requestedRecipients = input.recipients?.filter(Boolean) || [];
    // Fail closed: a new record is not broadcast to a whole workspace. Until
    // a module has resolved an explicit assignee/responsibility policy, only
    // the workspace owner receives its minimal projection.
    const recipients = requestedRecipients.length > 0
      ? new Set(requestedRecipients)
      : new Set(space?.owner ? [space.owner] : []);
    const eligible = routes.filter((route) =>
      route.host && route.state === 'active' && route.role !== 'guest' && recipients.has(route.user),
    );

    const now = Date.now();
    const typeCode = toMatterTypeCode(input.type);
    const sourceVersion = input.sourceVersion || 1;
    const collection = input.collection || PROJECTION_COLLECTION.matter;

    for (const route of eligible) {
      await step.do(`project ${route.user}`, { retries: { limit: 5, delay: '5 seconds', backoff: 'exponential' } }, async () => {
        if (!route.host || !this.env.TURSO_AUTH_TOKEN) throw new Error('Personal database route is unavailable');
        const client = createDatabaseClientForHost(route.host, this.env.TURSO_AUTH_TOKEN);
        try {
          const redacted = redactForRole(route.role, input.data);
          const projId = `prj_${input.space}_${input.id}`;

          if (input.isDeleted) {
            // Tombstone projection
            await client.execute({
              sql: `UPDATE projection SET deleted_at = ?, updated = ? WHERE workspace_id = ? AND source_id = ?`,
              args: [now, now, input.space, input.id],
            });
            await client.execute({
              sql: `UPDATE inbox SET deleted_at = ?, updated = ? WHERE workspace_id = ? AND ref = ?`,
              args: [now, now, input.space, input.id],
            });
          } else {
            // 1. Upsert into projection table
            await client.execute({
              sql: `INSERT INTO projection (id, workspace_id, collection, source_id, type, data, source_version, expires, updated)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(workspace_id, collection, source_id)
                    DO UPDATE SET data = ?, type = ?, source_version = ?, updated = ?, deleted_at = NULL
                    WHERE source_version <= ?`,
              args: [
                projId,
                input.space,
                collection,
                input.id,
                typeCode,
                JSON.stringify(redacted),
                sourceVersion,
                null,
                now,
                JSON.stringify(redacted),
                typeCode,
                sourceVersion,
                now,
                sourceVersion,
              ],
            });

            // 2. If this is an actionable event (task, approval, alert, order), upsert inbox
            const isActionable = input.type.includes('task') || input.type.includes('approval') || input.type.includes('alert') || input.type.includes('order');
            if (isActionable) {
              const inboxType = input.type.includes('approval')
                ? INBOX_TYPES.approval
                : input.type.includes('alert')
                ? INBOX_TYPES.alert
                : INBOX_TYPES.task;

              const title = String(input.data.title || input.data.name || `${input.type} in ${input.space}`);
              const inboxId = `ibx_${input.space}_${input.id}`;

              await client.execute({
                sql: `INSERT INTO inbox (id, user_id, workspace_id, type, title, ref, priority, status, data, version, created, updated)
                      VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, 1, ?, ?)
                      ON CONFLICT(id) DO UPDATE SET data = ?, updated = ?, status = 1, deleted_at = NULL`,
                args: [
                  inboxId,
                  route.user,
                  input.space,
                  inboxType,
                  title,
                  input.ref || input.id,
                  JSON.stringify(redacted),
                  now,
                  now,
                  JSON.stringify(redacted),
                  now,
                ],
              });
            }
          }
        } finally {
          client.close();
        }
      });
    }
    return { projected: eligible.length };
  }
}
