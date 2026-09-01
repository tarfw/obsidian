import type { HarnessEvent, HarnessRecord } from '../harness/repository.ts';

/**
 * The shared record surface for every Workspace Data type. Clients use these
 * tokens and regions to render the same calm, timeline-first layout for a
 * Contact, Order, Ticket, Product, or any custom record.
 *
 * This file deliberately contains no fixture content. Every string returned by
 * buildRecordProfile comes from an official record, event, or definition.
 */
export const RECORD_PROFILE_DESIGN = {
  version: 1,
  component: 'record-profile',
  layout: 'identity-header-insight-activity-fields',
  tokens: {
    page: '#ffffff',
    surface: '#ffffff',
    border: 'transparent',
    text: '#111111',
    muted: '#727272',
    divider: '#dedede',
    insight: '#dceffc',
    insightText: '#17364a',
    panelMaxWidth: 640,
    panelPadding: 0,
    avatarSize: 96,
    borderRadius: 0,
    rowMinHeight: 72,
  },
  regions: ['identity', 'insight', 'activity', 'fields', 'relationships'] as const,
  eventChannels: ['message', 'email', 'phone', 'calendar', 'note', 'system'] as const,
} as const;

export type RecordEventChannel = (typeof RECORD_PROFILE_DESIGN.eventChannels)[number];

export interface RecordProfileEvent {
  id: string;
  action: string;
  summary: string;
  channel: RecordEventChannel;
  occurredAt: number;
  actorId: string;
  workflow?: { botId?: string; workflowId?: string; runId?: string; stepId?: string };
}

export interface RecordProfileWorkflow {
  id: string;
  botId: string;
  workflowId: string;
  stepId: string;
  title: string;
  step: string;
  updatedAt: number;
}

export interface RecordProfileScreen {
  design: typeof RECORD_PROFILE_DESIGN;
  record: {
    id: string;
    type: string;
    title: string;
    status: string;
    version: number;
    createdAt: number;
    updatedAt: number;
  };
  identity: {
    title: string;
    subtitle?: string;
    avatarRef?: string;
    email?: string;
    phone?: string;
    initials: string;
  };
  insight?: string;
  activity: {
    heading: string;
    events: RecordProfileEvent[];
    empty: boolean;
  };
  workflows: RecordProfileWorkflow[];
  fields: Array<{ key: string; value: string | number | boolean | null }>;
}

function stringValue(value: unknown, max = 240): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : undefined;
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || '').join('') || '?';
}

function humanize(value: string): string {
  return value
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function eventChannel(value: unknown): RecordEventChannel {
  return value === 'message' || value === 'email' || value === 'phone' || value === 'calendar' || value === 'note'
    ? value
    : 'system';
}

function visibleFields(data: Record<string, unknown>): Array<{ key: string; value: string | number | boolean | null }> {
  const reserved = new Set([
    'name',
    'title',
    'full_name',
    'fullname',
    'first_name',
    'last_name',
    'fn',
    'ln',
    'email',
    'email_address',
    'emailaddress',
    'em',
    'phone',
    'phone_number',
    'phonenumber',
    'mobile',
    'ph',
    'subtitle',
    'organization',
    'company',
    'avatar_ref',
    'avatarref',
    'insight',
    'timeline_heading',
    'timelineheading',
  ]);
  return Object.entries(data)
    .filter(([key, value]) => !reserved.has(key.toLowerCase()) && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null))
    .map(([key, value]) => ({ key, value: value as string | number | boolean | null }));
}

function profileEvent(event: HarnessEvent): RecordProfileEvent {
  const eventData = event.data;
  const workflow = eventData.workflow && typeof eventData.workflow === 'object' && !Array.isArray(eventData.workflow)
    ? eventData.workflow as Record<string, unknown>
    : undefined;
  return {
    id: event.id,
    action: event.action,
    summary: stringValue(eventData.summary, 360) || humanize(event.action),
    channel: eventChannel(eventData.channel),
    occurredAt: event.created,
    actorId: event.actor,
    ...(workflow ? {
      workflow: {
        botId: stringValue(workflow.botId, 128),
        workflowId: stringValue(workflow.workflowId, 128),
        runId: stringValue(workflow.runId, 128),
        stepId: stringValue(workflow.stepId, 128),
      },
    } : {}),
  };
}

export function buildRecordProfile(record: HarnessRecord, events: HarnessEvent[], workflows: RecordProfileWorkflow[] = []): RecordProfileScreen {
  const data = record.data;
  const subtitle = stringValue(data.subtitle) || stringValue(data.organization) || stringValue(data.company);
  const avatarRef = stringValue(data.avatar_ref, 1_000) || stringValue(data.avatarRef, 1_000);
  const email = stringValue(data.email) || stringValue(data.email_address) || stringValue(data.em);
  const phone = stringValue(data.phone) || stringValue(data.phone_number) || stringValue(data.mobile) || stringValue(data.ph);
  const isContact = record.type === 'contact' || record.type === 'contacts';
  const timelineHeading = stringValue(data.timeline_heading, 64) || stringValue(data.timelineHeading, 64)
    || (isContact ? 'Recent interactions' : 'Recent activity');
  const insight = stringValue(data.insight, 500);

  return {
    design: RECORD_PROFILE_DESIGN,
    record: {
      id: record.id,
      type: record.type,
      title: record.title,
      status: record.status,
      version: record.version,
      createdAt: record.created,
      updatedAt: record.updated,
    },
    identity: {
      title: record.title,
      ...(subtitle ? { subtitle } : {}),
      ...(avatarRef ? { avatarRef } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      initials: initials(record.title),
    },
    ...(insight ? { insight } : {}),
    activity: { heading: timelineHeading, events: events.filter((event) => eventChannel(event.data.channel) !== 'system').slice(0, 5).map(profileEvent), empty: !events.some((event) => eventChannel(event.data.channel) !== 'system') },
    workflows,
    fields: visibleFields(data),
  };
}
