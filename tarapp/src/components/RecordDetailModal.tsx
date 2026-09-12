import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HarnessRecord } from '@/lib/harness';

interface Props {
  visible: boolean;
  record: HarnessRecord | null;
  scope: string;
  onClose: () => void;
  onAction: (actionId: string, input?: Record<string, unknown>, title?: string) => void;
}

const colors = {
  ink: '#171A21',
  muted: '#737985',
  faint: '#9AA0AA',
  line: '#E7E9ED',
  wash: '#F6F7F9',
  blue: '#3559E0',
  green: '#168563',
  amber: '#A66D00',
  red: '#D54F4F',
};

const businessTypeNames: Record<string, string> = {
  contact: 'Contact / Customer',
  customer: 'Customer',
  order: 'Order',
  'pos.order': 'Retail Order',
  product: 'Product',
  'pos.product': 'Retail Product',
  task: 'Task',
  lead: 'Sales Lead',
  deal: 'Sales Deal',
  ticket: 'Support Ticket',
  subscription: 'Subscription',
  account: 'Organization / Account',
  site: 'Public Site',
};

function formatType(type: string): string {
  return businessTypeNames[type.toLowerCase()] || type.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function stateColor(state: string): string {
  const s = state.toLowerCase();
  if (['active', 'ready', 'won', 'completed', 'paid', 'live'].includes(s)) return colors.green;
  if (['pending', 'open', 'preparing', 'draft'].includes(s)) return colors.amber;
  if (['cancelled', 'lost', 'failed', 'archived', 'revoked'].includes(s)) return colors.red;
  return colors.muted;
}

function formatDate(ts?: number | string | null): string {
  if (!ts) return '—';
  const d = typeof ts === 'number' ? new Date(ts) : new Date(String(ts));
  return Number.isNaN(d.getTime()) ? String(ts) : d.toLocaleString();
}

export default function RecordDetailModal({ visible, record, onClose, onAction }: Props) {
  const insets = useSafeAreaInsets();
  if (!record) return null;

  const type = record.type.toLowerCase();
  const data = record.data || {};
  const isTask = type === 'task';
  const isOrder = type === 'order' || type === 'pos.order';
  const isContact = type === 'contact' || type === 'customer';
  const isProduct = type === 'product' || type === 'pos.product';

  const lines = Array.isArray(data.lines) ? data.lines : [];
  const price = data.price != null ? Number(data.price) : null;
  const total = data.total != null ? Number(data.total) : null;
  const currency = String(data.currency || 'INR');

  const ignoredKeys = new Set(['lines', 'price', 'total', 'currency', 'title', 'name', 'id', 'type', 'state']);
  const extraFields = Object.entries(data).filter(([k]) => !ignoredKeys.has(k));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.page, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text numberOfLines={1} style={styles.typeLabel}>{formatType(record.type)}</Text>
            <Text numberOfLines={2} style={styles.title}>{record.title}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Close record details">
            <Ionicons name="close" size={22} color={colors.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          <View style={styles.statusRow}>
            <View style={[styles.badge, { backgroundColor: `${stateColor(record.state)}18` }]}>
              <View style={[styles.badgeDot, { backgroundColor: stateColor(record.state) }]} />
              <Text style={[styles.badgeText, { color: stateColor(record.state) }]}>{record.state.toUpperCase()}</Text>
            </View>
            <Text style={styles.versionText}>v{record.version}</Text>
          </View>

          {isProduct && price !== null && (
            <View style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>PRICE</Text>
              <Text style={styles.highlightValue}>
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(price / 100)}
              </Text>
              {data.description ? <Text style={styles.descriptionText}>{String(data.description)}</Text> : null}
            </View>
          )}

          {isOrder && (
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeader}>ORDER ITEMS</Text>
              {lines.length > 0 ? (
                lines.map((line: any, idx: number) => (
                  <View key={idx} style={styles.lineRow}>
                    <Text style={styles.lineQty}>{line.quantity || 1}×</Text>
                    <Text style={styles.lineTitle}>{line.title || line.name || 'Item'}</Text>
                    {line.price != null && (
                      <Text style={styles.linePrice}>
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(((line.price || 0) * (line.quantity || 1)) / 100)}
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No item lines recorded.</Text>
              )}
              {total !== null && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(total / 100)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {Boolean(isContact && (data.email || data.phone || data.organization)) && (
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeader}>CONTACT DETAILS</Text>
              {data.phone ? (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${data.phone}`)} style={styles.contactRow}>
                  <Ionicons name="call-outline" size={16} color={colors.blue} />
                  <Text style={styles.contactLink}>{String(data.phone)}</Text>
                </TouchableOpacity>
              ) : null}
              {data.email ? (
                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${data.email}`)} style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={16} color={colors.blue} />
                  <Text style={styles.contactLink}>{String(data.email)}</Text>
                </TouchableOpacity>
              ) : null}
              {data.organization ? (
                <View style={styles.contactRow}>
                  <Ionicons name="business-outline" size={16} color={colors.muted} />
                  <Text style={styles.contactText}>{String(data.organization)}</Text>
                </View>
              ) : null}
            </View>
          )}

          {extraFields.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeader}>RECORD DATA</Text>
              {extraFields.map(([key, val]) => (
                <View key={key} style={styles.kvRow}>
                  <Text style={styles.kvKey}>{key}</Text>
                  <Text style={styles.kvValue}>
                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Record ID</Text>
              <Text style={styles.metaValue}>{record.id}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Created</Text>
              <Text style={styles.metaValue}>{formatDate(record.createdAt)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Updated</Text>
              <Text style={styles.metaValue}>{formatDate(record.updatedAt)}</Text>
            </View>
            {record.owner && (
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Owner</Text>
                <Text style={styles.metaValue}>{record.owner}</Text>
              </View>
            )}
            {record.assignee && (
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Assignee</Text>
                <Text style={styles.metaValue}>{record.assignee}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {isTask && record.state !== 'completed' && (
            <Pressable
              style={styles.primaryAction}
              onPress={() => {
                onClose();
                onAction('task.complete', { taskId: record.id }, `Complete ${record.title}`);
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.primaryActionText}>Mark Done</Text>
            </Pressable>
          )}

          {isOrder && (
            <Pressable
              style={styles.primaryAction}
              onPress={() => {
                onClose();
                onAction('pos.open', { section: 'sell', orderId: record.id }, `Order ${record.id}`);
              }}
            >
              <Ionicons name="cart-outline" size={18} color="#fff" />
              <Text style={styles.primaryActionText}>Open in POS</Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.secondaryAction, (isTask || isOrder) && { flex: 1 }]}
            onPress={() => {
              onClose();
              onAction(
                'record.update',
                { recordId: record.id, baseVersion: record.version, title: record.title, state: record.state },
                `Update ${record.title}`
              );
            }}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.ink} />
            <Text style={styles.secondaryActionText}>Edit Record</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  headerCopy: { flex: 1 },
  typeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: colors.blue, textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink },
  closeButton: { padding: 8 },
  content: { padding: 20, gap: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  versionText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  highlightCard: {
    backgroundColor: '#F0F5FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4E2FF',
  },
  highlightLabel: { fontSize: 11, fontWeight: '700', color: colors.blue, letterSpacing: 0.6 },
  highlightValue: { fontSize: 28, fontWeight: '800', color: colors.ink, marginTop: 4 },
  descriptionText: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 8 },
  sectionCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  cardHeader: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.faint },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  lineQty: { fontSize: 13, fontWeight: '700', color: colors.blue, width: 28 },
  lineTitle: { flex: 1, fontSize: 14, color: colors.ink, fontWeight: '600' },
  linePrice: { fontSize: 14, fontWeight: '700', color: colors.ink },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: colors.line,
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: '800', color: colors.ink },
  totalValue: { fontSize: 17, fontWeight: '800', color: colors.blue },
  emptyText: { fontSize: 13, color: colors.muted },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  contactLink: { fontSize: 14, color: colors.blue, fontWeight: '600' },
  contactText: { fontSize: 14, color: colors.ink, fontWeight: '500' },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 4, gap: 12 },
  kvKey: { fontSize: 13, fontWeight: '600', color: colors.muted, textTransform: 'capitalize', width: 110 },
  kvValue: { flex: 1, fontSize: 13, color: colors.ink, textAlign: 'right' },
  metaCard: {
    backgroundColor: colors.wash,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaKey: { fontSize: 12, color: colors.muted },
  metaValue: { fontSize: 12, fontWeight: '600', color: colors.ink },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: '#fff',
  },
  primaryAction: {
    flex: 1,
    height: 48,
    backgroundColor: colors.blue,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryAction: {
    height: 48,
    backgroundColor: colors.wash,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  secondaryActionText: { color: colors.ink, fontWeight: '700', fontSize: 14 },
});
