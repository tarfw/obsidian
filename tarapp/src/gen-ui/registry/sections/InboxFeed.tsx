import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { SectionProps } from '../ComponentRegistry';

export interface InboxItem {
  id: string;
  type: 'order' | 'task' | 'delivery' | 'booking' | 'alert' | string;
  title: string;
  description: string;
  time: string;
  status: string;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
}

export default function InboxFeed({ props, data = [], onExecuteAction }: SectionProps) {
  const title = props?.title || 'Inbox & Activity Feed';

  const listData: InboxItem[] = (Array.isArray(data) && data.length > 0)
    ? data.map((d, idx) => ({
        id: d.id || `inb_${idx}`,
        type: d.type || 'order',
        title: d.title || d.name || 'Activity Item',
        description: d.description || d.subtitle || '',
        time: d.time || d.created_at || 'Just now',
        status: d.status || 'Active',
        icon: d.icon || (d.type === 'order' ? 'cart-outline' : d.type === 'booking' ? 'calendar-outline' : 'notifications-outline'),
      }))
    : (props?.items || []);

  if (listData.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{listData.length}</Text>
        </View>
      </View>

      <View style={styles.itemsList}>
        {listData.map((item, index) => {
          const isLast = index === listData.length - 1;
          return (
            <Pressable
              key={item.id || index}
              onPress={() => onExecuteAction && onExecuteAction('view_inbox_item', { item })}
              style={[styles.itemRow, isLast && styles.itemRowLast]}
            >
              <View style={styles.iconCircle}>
                <Ionicons
                  name={(item.icon as any) || 'ellipse-outline'}
                  size={16}
                  color="#64748b"
                />
              </View>

              <View style={styles.itemContent}>
                <View style={styles.itemTitleRow}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemTime}>{item.time}</Text>
                </View>

                {item.description ? (
                  <Text style={styles.itemDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                {item.status ? (
                  <View style={styles.statusRow}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 4,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  badge: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  itemsList: {
    width: '100%',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  itemRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  itemTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  itemDesc: {
    fontSize: 12.5,
    color: '#64748b',
    lineHeight: 17,
    marginTop: 1,
  },
  statusRow: {
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    marginVertical: 4,
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
