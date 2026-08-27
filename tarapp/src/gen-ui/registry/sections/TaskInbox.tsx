import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SectionProps } from '../ComponentRegistry';

export interface TaskItem {
  id: string;
  title: string;
  subtitle?: string;
  contract?: 'digest' | 'approval' | 'signal';
  amount?: string | number;
  urgency?: 'high' | 'medium' | 'low';
  category?: string;
  type?: string;
  actions?: Array<{ id: string; label: string; variant?: 'primary' | 'secondary' | 'danger' }>;
}

export default function TaskInbox({ props, designTokens, data = [], onExecuteAction, onOpenScreen }: SectionProps) {
  const title = props?.title || 'Action Inbox';
  const rounded = designTokens?.rounded || {};

  const tasksProp = props?.tasks;
  const taskList = useMemo<TaskItem[]>(() => {
    const raw = (Array.isArray(data) && data.length > 0) ? data : (Array.isArray(tasksProp) ? tasksProp : []);
    return raw.map((item: any) => {
      const isApproval = item.contract === 'approval' || item.type === 3 || item.typeName === 'approval';
      const actions = isApproval
        ? [
            { id: 'reject', label: 'Reject', variant: 'secondary' as const },
            { id: 'approve', label: 'Approve', variant: 'primary' as const },
          ]
        : [
            { id: 'done', label: 'Done', variant: 'primary' as const },
          ];

      return {
        id: item.id || `task_${Math.random()}`,
        title: item.title || item.name || 'Task item',
        subtitle: item.subtitle || (item.data?.summary || item.data?.description || item.typeName || ''),
        contract: item.contract || (isApproval ? 'approval' : 'signal'),
        amount: item.amount || item.data?.amount,
        urgency: item.priority >= 2 ? 'high' : 'medium',
        type: item.typeName || 'task',
        actions: item.actions || actions,
      };
    });
  }, [data, tasksProp]);

  const [actingId, setActingId] = useState<string | null>(null);

  const handleAction = async (task: TaskItem, actionId: string) => {
    setActingId(`${task.id}-${actionId}`);
    try {
      if (onExecuteAction) {
        await onExecuteAction(actionId === 'done' ? 'inbox.done' : `approval.${actionId}`, {
          taskId: task.id,
          task,
          decision: actionId === 'approve' ? 'approved' : actionId === 'reject' ? 'rejected' : undefined,
        });
      }
    } catch (e) {
      console.warn('[TaskInbox] Action error:', e);
    } finally {
      setActingId(null);
    }
  };

  if (taskList.length === 0) {
    return (
      <View style={[styles.cardContainer, { borderRadius: rounded.lg || 16 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>0 pending</Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done-circle-outline" size={24} color="#10b981" />
          <Text style={styles.emptyStateText}>All tasks completed · Action queue clear</Text>
        </View>
      </View>
    );
  }

  const visibleTasks = taskList.slice(0, props?.maxVisible || 3);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{taskList.length} pending</Text>
        </View>
      </View>

      {visibleTasks.map((task, index) => {
        const isApproval = task.contract === 'approval';
        const isUrgent = task.urgency === 'high';

        return (
          <View
            key={task.id || index}
            style={[
              styles.taskCard,
              { borderRadius: rounded.lg || 16 },
              isApproval && styles.approvalBorder,
            ]}
          >
            <View style={styles.taskHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  {isApproval ? (
                    <View style={styles.approvalBadge}>
                      <Text style={styles.approvalBadgeText}>Approval</Text>
                    </View>
                  ) : isUrgent ? (
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentBadgeText}>Signal</Text>
                    </View>
                  ) : null}
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
              {(task.actions || []).map((action) => {
                const isPrimary = action.variant === 'primary' || action.id === 'approve' || action.id === 'done';
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
  cardContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 0.2,
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
    color: '#64748b',
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 8,
  },
  approvalBorder: {
    borderColor: '#bfdbfe',
    backgroundColor: '#f8faff',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  approvalBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  approvalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
    textTransform: 'uppercase',
  },
  urgentBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  urgentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#dc2626',
    textTransform: 'uppercase',
  },
  taskTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  taskAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  taskSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: '#0f172a',
  },
  actionBtnSecondary: {
    backgroundColor: '#f1f5f9',
  },
  actionBtnBusy: {
    opacity: 0.6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnTextPrimary: {
    color: '#ffffff',
  },
  actionBtnTextSecondary: {
    color: '#334155',
  },
});
