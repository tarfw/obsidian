/**
 * GenUI Registered Data Views
 * Maps declarative block data sources to typed query runners.
 */

export const REGISTERED_DATA_VIEWS = [
  'tasks.list',
  'metrics.get',
  'inventory.list',
  'contacts.get',
  'pipeline.list',
  'pos.session',
  'approval.preview',
] as const;

export type RegisteredDataView = (typeof REGISTERED_DATA_VIEWS)[number];

export function isRegisteredDataView(viewName: string): viewName is RegisteredDataView {
  return (REGISTERED_DATA_VIEWS as readonly string[]).includes(viewName);
}
