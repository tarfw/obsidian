import { posActions } from '../pos/catalog.ts';
export type ActionType = 'app' | 'agent' | 'human';
export type InterfacePresentation = 'sheet' | 'screen' | 'flow';
export type FieldKind = 'text' | 'email' | 'number' | 'textarea' | 'record' | 'action-list';

export interface ActionField {
  readonly key: string;
  readonly label: string;
  readonly kind: FieldKind;
  readonly required?: boolean;
  readonly hidden?: boolean;
  readonly defaultValue?: string;
  readonly recordType?: string;
}

export interface ActionDefinition {
  readonly id: string;
  readonly version: number;
  readonly type: ActionType;
  readonly title: string;
  readonly description: string;
  readonly interfaceKey: string;
  readonly fields: readonly ActionField[];
  readonly output: readonly string[];
  readonly roles: readonly ('owner' | 'admin' | 'member' | 'guest')[];
  readonly effects: readonly string[];
}

export interface InterfaceContract {
  readonly key: string;
  readonly version: number;
  readonly title: string;
  readonly presentation: InterfacePresentation;
  readonly submitLabel: string;
}

export const interfaceCatalog = [
  { key: 'pos', version: 1, title: 'Point of sale', presentation: 'flow', submitLabel: 'Pay' },
  { key: 'form', version: 1, title: 'Form', presentation: 'screen', submitLabel: 'Save' },
  { key: 'confirmation', version: 1, title: 'Confirmation', presentation: 'sheet', submitLabel: 'Confirm' },
  { key: 'flow', version: 1, title: 'Flow', presentation: 'flow', submitLabel: 'Start' },
  { key: 'flow-builder', version: 1, title: 'Flow builder', presentation: 'screen', submitLabel: 'Create Flow' },
] as const satisfies readonly InterfaceContract[];

export const actionCatalog = [
  ...posActions,
  {
    id: 'record.create', version: 1, type: 'app', title: 'Create record',
    description: 'Add information to this workspace.', interfaceKey: 'form',
    fields: [
      { key: 'type', label: 'Record type', kind: 'text', required: true, defaultValue: 'contact' },
      { key: 'title', label: 'Name or title', kind: 'text', required: true },
    ],
    output: ['record'], roles: ['owner', 'admin', 'member'], effects: ['record_create'],
  },
  {
    id: 'contact.create', version: 1, type: 'app', title: 'Add person',
    description: 'Create a person record that stays separate from their work history.', interfaceKey: 'form',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true },
      { key: 'email', label: 'Email', kind: 'email' },
      { key: 'phone', label: 'Phone', kind: 'text' },
    ],
    output: ['record'], roles: ['owner', 'admin', 'member'], effects: ['record_create'],
  },
  {
    id: 'organization.create', version: 1, type: 'app', title: 'Add organization',
    description: 'Create an organization record for customers, suppliers or partners.', interfaceKey: 'form',
    fields: [
      { key: 'name', label: 'Organization name', kind: 'text', required: true },
      { key: 'email', label: 'Email', kind: 'email' },
      { key: 'phone', label: 'Phone', kind: 'text' },
      { key: 'website', label: 'Website', kind: 'text' },
    ],
    output: ['record'], roles: ['owner', 'admin', 'member'], effects: ['record_create'],
  },
  {
    id: 'relationship.create', version: 1, type: 'app', title: 'Link person to organization',
    description: 'Record a person’s role at an organization with its own time range.', interfaceKey: 'form',
    fields: [
      { key: 'source', label: 'Person record ID', kind: 'text', required: true },
      { key: 'target', label: 'Organization record ID', kind: 'text', required: true },
      { key: 'role', label: 'Role', kind: 'text', required: true },
      { key: 'since', label: 'Start date (timestamp)', kind: 'number' },
      { key: 'until', label: 'End date (timestamp)', kind: 'number' },
    ],
    output: ['link'], roles: ['owner', 'admin', 'member'], effects: ['relationship_create'],
  },
  {
    id: 'relationship.end', version: 1, type: 'app', title: 'End relationship',
    description: 'Close a person’s current role while keeping its history.', interfaceKey: 'form',
    fields: [
      { key: 'id', label: 'Relationship', kind: 'text', required: true, hidden: true },
      { key: 'until', label: 'End date (timestamp)', kind: 'number', required: true },
    ],
    output: ['id', 'until'], roles: ['owner', 'admin', 'member'], effects: ['relationship_update'],
  },
  {
    id: 'consent.record', version: 1, type: 'app', title: 'Record contact consent',
    description: 'Record an explicit channel and purpose decision with its evidence. An address or relationship is never consent.', interfaceKey: 'form',
    fields: [
      { key: 'contactId', label: 'Contact', kind: 'record', required: true, hidden: true },
      { key: 'channel', label: 'Channel (email, sms, phone, whatsapp)', kind: 'text', required: true },
      { key: 'purpose', label: 'Purpose (marketing, transactional, support)', kind: 'text', required: true },
      { key: 'state', label: 'Decision (granted or revoked)', kind: 'text', required: true },
      { key: 'source', label: 'Evidence or source', kind: 'textarea', required: true },
    ],
    output: ['consent'], roles: ['owner', 'admin', 'member'], effects: ['consent_record'],
  },
  {
    id: 'record.update', version: 2, type: 'app', title: 'Update record',
    description: 'Change an existing record using its current version.', interfaceKey: 'form',
    fields: [
      { key: 'recordId', label: 'Record', kind: 'record', required: true },
      { key: 'baseVersion', label: 'Version', kind: 'number', required: true, hidden: true },
      { key: 'title', label: 'Title', kind: 'text' },
      { key: 'state', label: 'Status', kind: 'text', hidden: true },
    ],
    output: ['recordId', 'version'], roles: ['owner', 'admin', 'member'], effects: ['record_update'],
  },
  {
    id: 'task.create', version: 1, type: 'human', title: 'Create task',
    description: 'Assign work that appears in the Inbox.', interfaceKey: 'form',
    fields: [
      { key: 'title', label: 'What needs doing?', kind: 'text', required: true },
      { key: 'assigneeId', label: 'Assignee', kind: 'text' },
    ],
    output: ['record'], roles: ['owner', 'admin', 'member'], effects: ['record_create', 'inbox'],
  },
  {
    id: 'task.complete', version: 1, type: 'human', title: 'Complete task',
    description: 'Complete assigned work and resume its Flow when applicable.', interfaceKey: 'confirmation',
    fields: [{ key: 'taskId', label: 'Task', kind: 'record', required: true, recordType: 'task' }],
    output: ['taskId', 'state'], roles: ['owner', 'admin', 'member'], effects: ['record_update', 'run_resume'],
  },
  {
    id: 'flow.start', version: 1, type: 'app', title: 'Start flow',
    description: 'Start a published process and save its progress.', interfaceKey: 'flow',
    fields: [
      { key: 'flowId', label: 'Flow', kind: 'text', required: true, hidden: true },
      { key: 'recordId', label: 'Related record', kind: 'record' },
    ],
    output: ['run'], roles: ['owner', 'admin', 'member'], effects: ['run_create'],
  },
  {
    id: 'flow.publish', version: 3, type: 'app', title: 'Create Flow Book',
    description: 'Publish a reusable ordered process for this workspace.', interfaceKey: 'flow-builder',
    fields: [
      { key: 'flowId', label: 'Flow ID', kind: 'text', required: true, hidden: true },
      { key: 'name', label: 'Flow name', kind: 'text', required: true },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'actions', label: 'Actions', kind: 'action-list', required: true, hidden: true },
    ],
    output: ['flowId', 'published'], roles: ['owner', 'admin'], effects: ['definition_publish', 'canvas_update'],
  },
  {
    id: 'flow.advance', version: 1, type: 'app', title: 'Continue Flow Book',
    description: 'Complete the current registered step and save Flow Book progress.', interfaceKey: 'confirmation',
    fields: [
      { key: 'runId', label: 'Run', kind: 'text', required: true, hidden: true },
      { key: 'actionId', label: 'Action', kind: 'text', required: true, hidden: true },
    ],
    output: ['run', 'result'], roles: ['owner', 'admin', 'member'], effects: ['run_advance'],
  },
  {
    id: 'flow.suggest', version: 1, type: 'agent', title: 'Suggest a Flow Book step',
    description: 'Suggest one first step from registered Actions for a user-reviewed Flow Book.', interfaceKey: 'form',
    fields: [{ key: 'prompt', label: 'What outcome should this Flow Book produce?', kind: 'textarea', required: true }],
    output: ['action', 'confidence', 'probabilities', 'review'], roles: ['owner', 'admin'], effects: ['model_inference'],
  },
  {
    id: 'site.generate', version: 1, type: 'agent', title: 'Generate site draft',
    description: 'Create a website draft from business facts and prompt.', interfaceKey: 'form',
    fields: [
      { key: 'prompt', label: 'Prompt or description', kind: 'textarea' },
      { key: 'title', label: 'Site title', kind: 'text' },
      { key: 'theme', label: 'Theme direction', kind: 'text' },
    ],
    output: ['siteId', 'version', 'site', 'preview'], roles: ['owner', 'admin'], effects: ['record_create'],
  },
  {
    id: 'site.update', version: 1, type: 'app', title: 'Update site',
    description: 'Apply validated operations to site draft without second AI charge.', interfaceKey: 'form',
    fields: [
      { key: 'siteId', label: 'Site', kind: 'record', required: true },
      { key: 'baseVersion', label: 'Version', kind: 'number', required: true },
    ],
    output: ['siteId', 'version'], roles: ['owner', 'admin'], effects: ['record_update'],
  },
  {
    id: 'site.compile', version: 1, type: 'app', title: 'Compile site candidate',
    description: 'Compile frozen site definition into release candidate manifest.', interfaceKey: 'confirmation',
    fields: [
      { key: 'siteId', label: 'Site', kind: 'record', required: true },
    ],
    output: ['releaseId', 'manifest', 'hash'], roles: ['owner', 'admin'], effects: ['record_update'],
  },
  {
    id: 'site.publish', version: 1, type: 'app', title: 'Publish site',
    description: 'Promote release candidate to live website routing.', interfaceKey: 'confirmation',
    fields: [
      { key: 'siteId', label: 'Site', kind: 'record', required: true },
      { key: 'subdomain', label: 'Subdomain', kind: 'text' },
    ],
    output: ['siteId', 'releaseId', 'liveUrl', 'generation'], roles: ['owner', 'admin'], effects: ['record_update'],
  },
  {
    id: 'site.rollback', version: 1, type: 'app', title: 'Rollback site release',
    description: 'Revert live website to a previous release manifest.', interfaceKey: 'confirmation',
    fields: [
      { key: 'siteId', label: 'Site', kind: 'record', required: true },
      { key: 'releaseId', label: 'Release ID', kind: 'text', required: true },
    ],
    output: ['siteId', 'releaseId', 'rolledBack'], roles: ['owner', 'admin'], effects: ['record_update'],
  },
  {
    id: 'site.refresh', version: 1, type: 'app', title: 'Refresh public facts',
    description: 'Recompute live catalog and hours into site without AI re-inference.', interfaceKey: 'confirmation',
    fields: [
      { key: 'siteId', label: 'Site', kind: 'record', required: true },
    ],
    output: ['refreshed', 'itemCount'], roles: ['owner', 'admin'], effects: ['record_update'],
  },
  {
    id: 'web.search', version: 1, type: 'app', title: 'Search the web',
    description: 'Find current public sources for a focused research question.', interfaceKey: 'form',
    fields: [
      { key: 'query', label: 'Search query', kind: 'text', required: true },
      { key: 'location', label: 'Country code', kind: 'text' },
      { key: 'language', label: 'Language code', kind: 'text' },
    ],
    output: ['query', 'sources'], roles: ['owner', 'admin', 'member'], effects: ['web_search'],
  },
] as const satisfies readonly ActionDefinition[];

export type ActionId = typeof actionCatalog[number]['id'];

export function findAction(actionId: string): ActionDefinition | undefined {
  return actionCatalog.find((action) => action.id === actionId);
}
