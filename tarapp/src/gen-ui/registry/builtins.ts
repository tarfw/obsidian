/**
 * Pure Native Component Catalog Builtins for GenUI (genui.md).
 * Registers all 8 native crash-proof components and standard aliases.
 */

import { registerComponent } from './ComponentRegistry';

// Core 8 GenUI Components
import TaskInbox from './sections/TaskInbox';
import MetricCard from './sections/MetricCard';
import QuickPos from './sections/QuickPos';
import StockSheet from './sections/StockSheet';
import PipelineCard from './sections/PipelineCard';
import ContactCard from './sections/ContactCard';
import ActionConfirm from './sections/ActionConfirm';
import DataTable from './sections/DataTable';

// ── 1. Main Screen Components ──────────────────────────────────────────

// Task Inbox (Action Inbox urgent approvals)
registerComponent('task-inbox', {
  component: TaskInbox,
  label: 'Action Inbox',
  icon: 'mail-unread-outline',
  description: 'Shows urgent tasks and approvals requiring immediate action',
});

// Stat Counter / Metric Card (Signature Mint-Cyan Metric Card)
registerComponent('stat-counter', {
  component: MetricCard,
  label: 'Stat Counter',
  icon: 'trending-up-outline',
  description: "Shows key daily numbers (Today's Sales, Daily Steps, Gig Earnings)",
});

registerComponent('metric-card', {
  component: MetricCard,
  label: 'Metric Card',
  icon: 'trending-up-outline',
  description: 'Displays a single stat or metric with smooth wave line graph',
});

// Quick POS (Table floor grid & quick billing)
registerComponent('quick-pos', {
  component: QuickPos,
  label: 'Quick POS',
  icon: 'receipt-outline',
  description: 'Fast 1-tap table billing and checkout register',
});

registerComponent('pos-sale', {
  component: QuickPos,
  label: 'POS Register',
  icon: 'card-outline',
  description: 'Point of sale billing register',
});

// ── 2. Ephemeral Slide-Up Card Components (Deep Tools) ──────────────────

// Stock Sheet (Rapid stock adjustments with steppers)
registerComponent('stock-sheet', {
  component: StockSheet,
  label: 'Stock Sheet',
  icon: 'cube-outline',
  description: 'Rapid item stock counter with [-] and [+] steppers',
});

// Pipeline Card (Deal progression & stage advancement)
registerComponent('pipeline-card', {
  component: PipelineCard,
  label: 'Pipeline Card',
  icon: 'git-network-outline',
  description: 'Customer deal stages with 1-tap stage advancement',
});

// Contact Card (1-tap Call and WhatsApp dispatch)
registerComponent('contact-card', {
  component: ContactCard,
  label: 'Contact Card',
  icon: 'person-outline',
  description: 'Customer or supplier details with 1-tap Call and WhatsApp buttons',
});

// Action Confirm (Safety review & 1-tap confirmation)
registerComponent('action-confirm', {
  component: ActionConfirm,
  label: 'Action Confirm',
  icon: 'shield-checkmark-outline',
  description: 'Review and 1-tap confirmation card for orders, deliveries, and bookings',
});

// Data Grid / Data Table (Universal parametric table)
registerComponent('data-grid', {
  component: DataTable,
  label: 'Data Grid',
  icon: 'grid-outline',
  description: 'Dynamic native table or card list adaptable to any database entity',
});

registerComponent('data-table', {
  component: DataTable,
  label: 'Data Table',
  icon: 'list-outline',
  description: 'Lists records in a scrollable parametric table',
});

// ── 3. Backwards-Compatible Aliases ───────────────────────────────────

registerComponent('catalog-grid', {
  component: DataTable,
  label: 'Product Catalog',
  icon: 'grid-outline',
  description: 'Grid of product or item cards',
});

registerComponent('booking-grid', {
  component: DataTable,
  label: 'Booking Slots',
  icon: 'calendar-outline',
  description: 'Appointment time slot picker',
});

registerComponent('timeline-feed', {
  component: TaskInbox,
  label: 'Activity Feed',
  icon: 'time-outline',
  description: 'Chronological activity feed',
});

registerComponent('cash_sales_counter', {
  component: MetricCard,
  label: "Today's Sales",
  icon: 'trending-up-outline',
  description: "Today's cash and digital sales counter",
});

registerComponent('gig_earnings_counter', {
  component: MetricCard,
  label: 'Gig Earnings',
  icon: 'trending-up-outline',
  description: 'Earnings counter for delivery shift',
});

registerComponent('health_step_counter', {
  component: MetricCard,
  label: 'Step Counter',
  icon: 'walk-outline',
  description: 'Daily morning step counter',
});

registerComponent('daily_budget_card', {
  component: MetricCard,
  label: 'Daily Budget',
  icon: 'wallet-outline',
  description: 'Daily budget snapshot',
});

registerComponent('table_grid_pos', {
  component: QuickPos,
  label: 'Table Floor POS',
  icon: 'receipt-outline',
  description: 'Floor plan table billing grid',
});

registerComponent('live_orders_feed', {
  component: TaskInbox,
  label: 'Live Orders Feed',
  icon: 'mail-unread-outline',
  description: 'Live orders and urgent approvals feed',
});

registerComponent('active_trip_map', {
  component: ActionConfirm,
  label: 'Active Trip',
  icon: 'navigate-outline',
  description: 'Active delivery route and trip tracker',
});
