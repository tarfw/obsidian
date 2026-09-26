import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { harness, type Consent, type HarnessFlowBook, type HarnessRecord, type Link } from '@/lib/harness';
import { tokens } from '@/components/ds/tokens';

interface Props {
  visible: boolean;
  record: HarnessRecord | null;
  scope: string;
  onClose: () => void;
  onAction: (actionId: string, input?: Record<string, unknown>, title?: string) => void;
}

const colors = {
  ink: tokens.color.ink,
  muted: tokens.color.inkMuted,
  faint: tokens.color.inkFaint,
  line: tokens.color.border,
  wash: tokens.color.surfaceSunk,
  blue: tokens.color.accent,
  green: tokens.color.success,
  amber: '#A66D00',
  red: '#D54F4F',
};

const businessTypeNames: Record<string, string> = {
  person: 'Person',
  organization: 'Organization',
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

export default function RecordDetailModal({ visible, record, scope, onClose, onAction }: Props) {
  const insets = useSafeAreaInsets();
  const [links, setLinks] = useState<Link[]>([]);
  const [books, setBooks] = useState<HarnessFlowBook[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [consentError, setConsentError] = useState(false);
  const contactId = visible && record && ['person', 'organization'].includes(record.type) ? record.id : null;
  useEffect(() => {
    if (!contactId) return;
    let current = true;
    void harness.links(scope, contactId).then((result) => { if (current) setLinks(result.links); }).catch(() => { if (current) setLinks([]); });
    return () => { current = false; };
  }, [contactId, scope]);
  useEffect(() => {
    if (!contactId) return;
    let current = true;
    void harness.consents(scope, contactId).then((result) => { if (current) { setConsents(result.consents); setConsentError(false); } }).catch(() => { if (current) { setConsents([]); setConsentError(true); } });
    return () => { current = false; };
  }, [contactId, scope]);
  useEffect(() => {
    if (!contactId) return;
    let current = true;
    void harness.flows(scope).then((result) => { if (current) setBooks(result.books); }).catch(() => { if (current) setBooks([]); });
    return () => { current = false; };
  }, [contactId, scope]);
  if (!record) return null;

  const type = record.type.toLowerCase();
  const data = record.data || {};
  const isTask = type === 'task';
  const isOrder = type === 'order' || type === 'pos.order';
  const isContact = type === 'person' || type === 'contact' || type === 'customer';
  const isOrganization = type === 'organization';
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

          {Boolean((isContact || isOrganization) && (data.email || data.phone || data.organization || data.website)) && (
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeader}>{isOrganization ? 'ORGANIZATION DETAILS' : 'CONTACT DETAILS'}</Text>
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
              {data.website ? (
                <TouchableOpacity onPress={() => Linking.openURL(String(data.website))} style={styles.contactRow}>
                  <Ionicons name="globe-outline" size={16} color={colors.blue} />
                  <Text style={styles.contactLink}>{String(data.website)}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {links.length > 0 ? (
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeader}>{isContact ? 'EXPERIENCE' : 'PEOPLE & ROLES'}</Text>
              {links.map((link) => <View key={link.id} style={styles.linkRow}>
                <View style={{ flex: 1 }}><Text style={styles.contactText}>{link.other.name} · {link.role}</Text><Text style={styles.emptyText}>{formatDate(link.since)} — {link.until === null ? 'Present' : formatDate(link.until)}</Text></View>
                {link.until === null ? <TouchableOpacity accessibilityRole="button" onPress={() => { onClose(); onAction('relationship.end', { id: link.id, until: Date.now() }, `End ${link.role}`); }}><Text style={styles.endLink}>End</Text></TouchableOpacity> : null}
              </View>)}
            </View>
          ) : null}

          {(isContact || isOrganization) && books.length > 0 ? (
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeader}>FLOW BOOKS</Text>
              {books.map((book) => <Pressable key={book.id} accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center' }} onPress={() => { onClose(); onAction('flow.start', { flowId: book.id, recordId: record.id }, book.name); }}>
                <Text style={styles.contactLink}>{book.name}</Text>
                {typeof book.data.description === 'string' ? <Text style={styles.emptyText}>{book.data.description}</Text> : null}
              </Pressable>)}
            </View>
          ) : null}

          {(isContact || isOrganization) ? (
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeader}>CONTACT CONSENT</Text>
              {consentError ? <Text style={styles.emptyText}>Consent history is unavailable. Check the connection before relying on this contact.</Text> : consents.length ? consents.map((item) => <View key={item.id} style={styles.linkRow}>
                <View style={{ flex: 1 }}><Text style={styles.contactText}>{item.channel} · {item.purpose} · {item.state}</Text><Text style={styles.emptyText}>{item.source} · {formatDate(item.created)}</Text></View>
              </View>) : <Text style={styles.emptyText}>No consent decision recorded. Contact details do not grant permission.</Text>}
              {!consentError ? <Pressable accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center' }} onPress={() => { onClose(); onAction('consent.record', { contactId: record.id }, `Record consent for ${record.title}`); }}><Text style={styles.contactLink}>Record decision</Text></Pressable> : null}
            </View>
          ) : null}

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
          {isTask && record.state === 'open' && (
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

          {(isContact || isOrganization) && (
            <Pressable
              style={styles.primaryAction}
              onPress={() => {
                onClose();
                onAction('relationship.create', isContact ? { source: record.id } : { target: record.id }, `Add role for ${record.title}`);
              }}
            >
              <Ionicons name="people-outline" size={18} color="#fff" />
              <Text style={styles.primaryActionText}>Add relationship</Text>
            </Pressable>
          )}

          {type === 'routine' ? <Pressable
            style={styles.secondaryAction}
            onPress={() => {
              onClose();
              onAction('routine.save', {
                id: record.id, baseVersion: record.version, label: record.title,
                workspace: data.workspace, role: data.role || '', start: data.start, end: data.end,
                days: Array.isArray(data.days) ? data.days.join(',') : '0,1,2,3,4,5,6',
                priority: data.priority ?? 0,
              }, 'Edit Space routine');
            }}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.ink} />
            <Text style={styles.secondaryActionText}>Edit routine</Text>
          </Pressable> : !isOrder && !isProduct && type !== 'site' && type !== 'relationship' ? <Pressable
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
          </Pressable> : null}
          {type === 'routine' ? <Pressable
            style={styles.secondaryAction}
            onPress={() => { onClose(); onAction('routine.remove', { id: record.id, baseVersion: record.version }, `Remove ${record.title}?`); }}
          >
            <Ionicons name="trash-outline" size={16} color={colors.red} />
            <Text style={[styles.secondaryActionText, { color: colors.red }]}>Remove</Text>
          </Pressable> : null}
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
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  closeButton: { padding: 8 },
  content: { padding: 20, gap: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  versionText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  highlightCard: {
    backgroundColor: tokens.color.accentSurface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  highlightLabel: { fontSize: 11, fontWeight: '700', color: colors.blue, letterSpacing: 0.6 },
  highlightValue: { fontSize: 28, fontWeight: '800', color: colors.ink, marginTop: 4 },
  descriptionText: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 8 },
  sectionCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
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
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5 },
  endLink: { fontSize: 13, fontWeight: '800', color: colors.blue, paddingHorizontal: 8, paddingVertical: 6 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 4, gap: 12 },
  kvKey: { fontSize: 13, fontWeight: '600', color: colors.muted, textTransform: 'capitalize', width: 110 },
  kvValue: { flex: 1, fontSize: 13, color: colors.ink, textAlign: 'right' },
  metaCard: {
    backgroundColor: colors.wash,
    borderRadius: 8,
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
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryAction: {
    height: 48,
    backgroundColor: colors.wash,
    borderRadius: 8,
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
