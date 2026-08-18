import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SectionProps } from '../ComponentRegistry';

export interface TaskItem {
  id: string;
  title: string;
  subtitle?: string;
  amount?: string | number;
  urgency?: 'high' | 'medium' | 'low';
  category?: string;
  type?: string;
  actions?: Array<{ id: string; label: string; variant?: 'primary' | 'secondary' | 'danger' }>;
}

export default function TaskInbox({ props, designTokens, data = [], onExecuteAction }: SectionProps) {
  const title = props?.title || 'Action Inbox';
  const colors = designTokens?.colors || {};
  const rounded = designTokens?.rounded || {};

  // Sample tasks if none provided in data/props
  const defaultTasks: TaskItem[] = [
    {
      id: 'task-1',
      title: 'Customer Refund',
      subtitle: 'Order #4102 — Returned unopened item',
      amount: '$45.00',
      urgency: 'high',
      category: 'Refund',
      actions: [
        { id: 'reject', label: 'Reject', variant: 'secondary' },
        { id: 'approve', label: 'Approve', variant: 'primary' },
      ],
    },
    {
      id: 'task-2',
      title: 'Supplier Invoice Approval',
      subtitle: 'Dairy Fresh Supplies — Due in 2 days',
      amount: '$180.00',
      urgency: 'medium',
      category: 'Invoice',
      actions: [
        { id: 'review', label: 'Review', variant: 'secondary' },
        { id: 'pay', label: 'Pay Now', variant: 'primary' },
      ],
    },
  ];

  const rawTasks = data.length > 0 ? data : (props?.tasks || defaultTasks);
  const [tasks, setTasks] = useState<TaskItem[]>(rawTasks);
  const [actingId, setActingId] = useState<string | null>(null);

  const handleAction = async (task: TaskItem, actionId: string) => {
    setActingId(`${task.id}-${actionId}`);
    try {
      if (onExecuteAction) {
        await onExecuteAction(actionId, { taskId: task.id, task });
      }
    } catch (e) {
      console.warn('[TaskInbox] Action error:', e);
    } finally {
      // Optimistically remove completed/rejected task
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setActingId(null);
    }
  };

  if (tasks.length === 0) {
    return null;
  }

  // Display top tasks (max 2 visible in Zone 2 live action stream)
  const visibleTasks = tasks.slice(0, props?.maxVisible || 2);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{tasks.length} pending</Text>
        </View>
      </View>

      {visibleTasks.map((task, index) => {
        const isUrgent = task.urgency === 'high';
        return (
          <View
            key={task.id || index}
            style={[
              styles.taskCard,
              {
                borderRadius: rounded.lg || 16,
              },
            ]}
          >
            <View style={styles.taskHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {task.title}
                  </Text>
                  {task.amount ? (
                    <Text style={styles.taskAmount}>{String(task.amount)}</Text>
                  ) : null}
                </View>
                {task.subtitle ? (
                  <Text style={styles.taskSubtitle} numberOfLines={2}>
                    {task.subtitle}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.actionsRow}>
              {(task.actions || [
                { id: 'reject', label: 'Reject', variant: 'secondary' },
                { id: 'approve', label: 'Approve', variant: 'primary' },
              ]).map((action) => {
                const isPrimary = action.variant === 'primary' || action.id === 'approve' || action.id === 'pay';
                const isBusy = actingId === `${task.id}-${action.id}`;

                return (
                  <TouchableOpacity
                    key={action.id}
                    activeOpacity={0.75}
                    disabled={isBusy}
                    onPress={() => handleAction(task, action.id)}
                    style={[
                      styles.actionBtn,
                      isPrimary ? styles.actionBtnPrimary : styles.actionBtnSecondary,
                      isBusy && styles.actionBtnBusy,
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionBtnText,
                        isPrimary ? styles.actionBtnTextPrimary : styles.actionBtnTextSecondary,
                      ]}
                    >
                      {isBusy ? '...' : action.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  countBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  taskCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  taskAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  taskSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 76,
  },
  actionBtnPrimary: {
    backgroundColor: '#0f172a',
  },
  actionBtnSecondary: {
    backgroundColor: '#f1f5f9',
  },
  actionBtnBusy: {
    opacity: 0.5,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtnTextPrimary: {
    color: '#ffffff',
  },
  actionBtnTextSecondary: {
    color: '#475569',
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emptyTextCol: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
});
