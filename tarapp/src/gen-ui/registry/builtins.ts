/**
 * Native Component Catalog Builtins for GenUI (matter.md §9).
 * Registers the 8 native crash-proof components and standard aliases.
 */

import { registerComponent } from './ComponentRegistry';

// Core 8 GenUI Primitives (matter.md §9)
import TaskInbox from './sections/TaskInbox';
import MetricCard from './sections/MetricCard';
import QuickPos from './sections/QuickPos';
import StockSheet from './sections/StockSheet';
import PipelineCard from './sections/PipelineCard';
import ContactCard from './sections/ContactCard';
import ActionConfirm from './sections/ActionConfirm';
import DataTable from './sections/DataTable';

// ── 1. The 8 Native Primitives ──────────────────────────────────────

// 1. Task Inbox (Assigned tasks, approvals, and signals)
registerComponent('task-inbox', {
  component: TaskInbox,
  label: 'Task Inbox',
  icon: 'mail-unread-outline',
  description: 'Assigned tasks, approvals, and urgent signals from Personal DB',
});

// 2. Metric Card (Bounded metric and comparison)
registerComponent('metric-card', {
  component: MetricCard,
  label: 'Metric Card',
  icon: 'trending-up-outline',
  description: 'Bounded metric, revenue count, and live pulse sparklines',
});

// 3. Quick POS (Catalog, cart, and checkout entry)
registerComponent('quick-pos', {
  component: QuickPos,
  label: 'Quick POS',
  icon: 'receipt-outline',
  description: 'Point of sale, floor tables, and fast checkout register',
});

// 4. Stock Sheet (Count, receive, transfer, and correct stock)
registerComponent('stock-sheet', {
  component: StockSheet,
  label: 'Stock Sheet',
  icon: 'cube-outline',
  description: 'Live item count with steppers and purchase order reorders',
});

// 5. Pipeline Card (Stage work and allowed transitions)
registerComponent('pipeline-card', {
  component: PipelineCard,
  label: 'Pipeline Card',
  icon: 'git-network-outline',
  description: 'Deal and client flow progression with 1-tap stage advancement',
});

// 6. Contact Card (Authorized contact actions)
registerComponent('contact-card', {
  component: ContactCard,
  label: 'Contact Card',
  icon: 'person-outline',
  description: 'Customer or supplier details with 1-tap Call and WhatsApp dispatch',
});

// 7. Action Confirm (Review and confirm a typed action)
registerComponent('action-confirm', {
  component: ActionConfirm,
  label: 'Action Confirm',
  icon: 'shield-checkmark-outline',
  description: 'Safeguard review and 1-tap confirmation card for high-impact actions',
});

// 8. Data Grid / Data Table (Bounded typed rows and columns)
registerComponent('data-grid', {
  component: DataTable,
  label: 'Data Grid',
  icon: 'grid-outline',
  description: 'Bounded typed rows and columns for entity records and catalogs',
});

// ── 2. Standard Aliases ──────────────────────────────────────────────
registerComponent('data-table', {
  component: DataTable,
  label: 'Data Table',
  icon: 'list-outline',
  description: 'Lists records in a scrollable parametric table',
});

registerComponent('stat-counter', {
  component: MetricCard,
  label: 'Stat Counter',
  icon: 'trending-up-outline',
  description: 'Shows key metrics counter',
});

registerComponent('pos-sale', {
  component: QuickPos,
  label: 'POS Register',
  icon: 'card-outline',
  description: 'Point of sale register',
});
