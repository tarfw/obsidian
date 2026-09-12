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
    id: 'record.update', version: 1, type: 'app', title: 'Update record',
    description: 'Change an existing record using its current version.', interfaceKey: 'form',
    fields: [
      { key: 'recordId', label: 'Record', kind: 'record', required: true },
      { key: 'baseVersion', label: 'Version', kind: 'number', required: true, hidden: true },
      { key: 'title', label: 'Title', kind: 'text' },
      { key: 'state', label: 'Status', kind: 'text' },
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
    id: 'directory.install', version: 2, type: 'app', title: 'Add Bot',
    description: 'Install a Bot and its selected template Flows.', interfaceKey: 'confirmation',
    fields: [
      { key: 'itemId', label: 'Bot', kind: 'text', required: true, hidden: true },
      { key: 'flowIds', label: 'Template Flows', kind: 'action-list', required: true, hidden: true },
    ],
    output: ['itemId', 'flowIds', 'installed'], roles: ['owner', 'admin'], effects: ['definition_publish', 'canvas_update'],
  },
  {
    id: 'directory.remove', version: 2, type: 'app', title: 'Remove Bot',
    description: 'Remove a Bot while preserving its Records, Runs and audit history.', interfaceKey: 'confirmation',
    fields: [{ key: 'itemId', label: 'Bot', kind: 'text', required: true, hidden: true }],
    output: ['itemId', 'installed'], roles: ['owner', 'admin'], effects: ['definition_archive', 'canvas_update'],
  },
  {
    id: 'flow.publish', version: 2, type: 'app', title: 'Create custom Flow',
    description: 'Publish an ordered Flow inside an installed Bot.', interfaceKey: 'flow-builder',
    fields: [
      { key: 'botId', label: 'Bot', kind: 'text', required: true, hidden: true },
      { key: 'flowId', label: 'Flow ID', kind: 'text', required: true, hidden: true },
      { key: 'name', label: 'Flow name', kind: 'text', required: true },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'actions', label: 'Actions', kind: 'action-list', required: true, hidden: true },
    ],
    output: ['flowId', 'published'], roles: ['owner', 'admin'], effects: ['definition_publish', 'canvas_update'],
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
] as const satisfies readonly ActionDefinition[];

export type ActionId = typeof actionCatalog[number]['id'];

export function findAction(actionId: string): ActionDefinition | undefined {
  return actionCatalog.find((action) => action.id === actionId);
}
