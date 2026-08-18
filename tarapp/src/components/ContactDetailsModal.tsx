import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  Linking,
  BackHandler,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { tar } from '@/lib/tar';
import { TarLogoLoader } from '@/components/TarLogoLoader';

export interface EntityDetailsModalProps {
  visible: boolean;
  entity: any | null;
  scope?: string;
  theme: any;
  onClose: () => void;
  onRefresh?: () => void;
  onLogEventForEntity?: (entity: any, eventKind?: 'stage' | 'activity') => void;
  onEditEntity?: (entity: any) => void;
  onSelectDeal?: (deal: any) => void;
  allEntities?: any[];
}

export const FLOW_STAGES = [
  { id: 'new', label: 'New / Intake', color: '#3B82F6', icon: 'checkmark-circle-outline' },
  { id: 'in_progress', label: 'In Progress', color: '#06B6D4', icon: 'sync-outline' },
  { id: 'review', label: 'Review / Proposal', color: '#8B5CF6', icon: 'document-text-outline' },
  { id: 'action', label: 'Action Required', color: '#F59E0B', icon: 'alert-circle-outline' },
  { id: 'completed', label: 'Completed / Won', color: '#10B981', icon: 'checkmark-done-circle-outline' },
  { id: 'dropped', label: 'Dropped / Cancelled', color: '#EF4444', icon: 'close-circle-outline' },
];

export default function ContactDetailsModal({
  visible,
  entity,
  scope,
  theme,
  onClose,
  onRefresh,
  onLogEventForEntity,
  onEditEntity,
  onSelectDeal,
  allEntities = [],
}: EntityDetailsModalProps) {
  const insets = useSafeAreaInsets();
  const [loadingMotions, setLoadingMotions] = useState(false);
  const [linkedMotions, setLinkedMotions] = useState<any[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(false);
  const [linkedFlows, setLinkedFlows] = useState<any[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [activeStage, setActiveStage] = useState<string>('In Progress');
  const [updatingStage, setUpdatingStage] = useState(false);

  // New Interaction / Event Modal State
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [interactionTitle, setInteractionTitle] = useState('');
  const [interactionDateStr, setInteractionDateStr] = useState('');
  const [interactionDateValue, setInteractionDateValue] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [interactionDescription, setInteractionDescription] = useState('');
  const [submittingInteraction, setSubmittingInteraction] = useState(false);

  // Safe type detection
  const typeCode = typeof entity?.type === 'number' ? entity.type : undefined;
  const rawTypeStr = typeof entity?.type === 'string' ? entity.type : typeCode === 10 ? 'flow' : typeCode === 2 ? 'company' : typeCode === 1 ? 'customer' : '';
  const typeStr = String(rawTypeStr || entity?.category || '').toLowerCase();
  const isFlow = typeStr === 'flow' || typeStr === '10' || typeStr === 'deal';

  // Safe Name and Contact Resolution
  const name = entity?.name || entity?.title || entity?.data?.fn || '';
  const phone = entity?.phone || entity?.data?.phone || entity?.data?.ph || '';
  const email = entity?.email || entity?.data?.email || entity?.data?.em || '';
  const companyName = entity?.company || entity?.data?.company || entity?.data?.org || '';
  const notes = entity?.notes || entity?.data?.notes || entity?.data?.description || '';

  // Determine human-readable role badge
  const rawRole = entity?.subRole || entity?.role || entity?.data?.role;
  const humanRole =
    typeof rawRole === 'string' && rawRole && isNaN(Number(rawRole))
      ? rawRole.charAt(0).toUpperCase() + rawRole.slice(1)
      : typeCode === 2 || typeStr === 'company'
      ? 'Company'
      : isFlow
      ? 'Flow'
      : 'Customer';

  useEffect(() => {
    if (entity?.id) {
      fetchLinkedMotions(entity.id);
      fetchLinkedFlows(entity.id);
      setActiveStage(entity.data?.stage || entity.stage || 'In Progress');
    } else {
      setLinkedFlows([]);
      setLinkedMotions([]);
    }
  }, [entity?.id, scope]);

  const fetchLinkedFlows = async (entityId: string) => {
    if (!scope || !entityId) return;
    setLoadingFlows(true);
    try {
      const graphQueries: Promise<any>[] = [
        tar.tool('read', { table: 'graph', tgt: entityId, scope }).catch(() => ({ rows: [] })),
        tar.tool('read', { table: 'graph', src: entityId, scope }).catch(() => ({ rows: [] })),
      ];
      if (name && name.trim() !== entityId) {
        graphQueries.push(tar.tool('read', { table: 'graph', tgt: name.trim(), scope }).catch(() => ({ rows: [] })));
        graphQueries.push(tar.tool('read', { table: 'graph', src: name.trim(), scope }).catch(() => ({ rows: [] })));
      }

      const graphResults = await Promise.all(graphQueries);

      const flowIds = new Set<string>();
      graphResults.forEach((res: any) => {
        (res?.rows || []).forEach((r: any) => {
          const isRelevantRel = r.rel === 'for_contact' || r.rel === 'customer' || r.rel === 8 || r.rel === 'flow' || r.rel === 10 || r.rel === 'member';
          if (!isRelevantRel) return;

          const rSrc = String(r.src || '').trim();
          const rTgt = String(r.tgt || '').trim();

          if (rTgt === entityId || (name && rTgt.toLowerCase() === name.toLowerCase())) {
            if (rSrc && rSrc !== entityId && rSrc !== name) flowIds.add(rSrc);
          }
          if (rSrc === entityId || (name && rSrc.toLowerCase() === name.toLowerCase())) {
            if (rTgt && rTgt !== entityId && rTgt !== name) flowIds.add(rTgt);
          }
        });
      });

      const matterRes = await tar.tool('read', { table: 'matter', scope }).catch(() => ({ rows: [] }));
      const allRows = (matterRes?.rows && matterRes.rows.length > 0) ? matterRes.rows : (allEntities || []);

      const cleanEntityName = (name || entity?.title || '').trim().toLowerCase();
      const cleanEntityId = String(entityId).trim().toLowerCase();

      const matched = allRows.filter((m: any) => {
        const isFlowType = m.type === 'flow' || m.type === 10 || m.type === 'deal' || m.subtype === 'flow';
        if (!isFlowType) return false;

        // 1. Direct graph connection specifically for this contact
        if (flowIds.has(String(m.id))) return true;

        const mData = typeof m.data === 'string' ? (JSON.parse(m.data || '{}') || {}) : (m.data || {});
        
        // 2. Exact match on contact_id or customer_id in flow data
        const flowContactId = String(mData.contact_id || mData.customer_id || m.contact_id || m.customer_id || '').trim().toLowerCase();
        if (flowContactId && (flowContactId === cleanEntityId || (cleanEntityName && flowContactId === cleanEntityName))) {
          return true;
        }

        // 3. Exact match on customer / client name (only if non-empty string and exact match)
        const flowCustomer = String(mData.customer || mData.client || mData.contact || '').trim().toLowerCase();
        if (flowCustomer && (flowCustomer === cleanEntityId || (cleanEntityName && flowCustomer === cleanEntityName))) {
          return true;
        }

        return false;
      });

      setLinkedFlows(matched);
    } catch (e) {
      console.warn('[ContactDetails] Failed to fetch linked flows:', e);
      setLinkedFlows([]);
    } finally {
      setLoadingFlows(false);
    }
  };

  const fetchLinkedMotions = async (entityId: string) => {
    if (!scope || !entityId) return;
    setLoadingMotions(true);
    try {
      const res = await tar.tool('read', { table: 'motion', ref: entityId, scope });
      const rows = res?.rows || [];
      rows.sort((a: any, b: any) => {
        const aData = typeof a.data === 'string' ? (JSON.parse(a.data || '{}') || {}) : (a.data || {});
        const bData = typeof b.data === 'string' ? (JSON.parse(b.data || '{}') || {}) : (b.data || {});
        const timeA = parseTimestampMs(a.timestamp || a.created_at || aData.date_str || a.id);
        const timeB = parseTimestampMs(b.timestamp || b.created_at || bData.date_str || b.id);
        return timeB - timeA;
      });
      setLinkedMotions(rows);
    } catch (e) {
      console.warn('[ContactDetails] Failed to fetch linked motions:', e);
      setLinkedMotions([]);
    } finally {
      setLoadingMotions(false);
    }
  };

  const handleUpdateFlowStage = async (newStage: string) => {
    if (!scope || !entity?.id || updatingStage) return;
    setUpdatingStage(true);
    setActiveStage(newStage);
    try {
      await tar.tool('update', {
        table: 'matter',
        id: entity.id,
        scope,
        patch: {
          data: {
            ...(entity.data || {}),
            stage: newStage,
          },
        },
      });

      let motionType = 120;
      if (newStage.toLowerCase().includes('complete') || newStage.toLowerCase().includes('won')) {
        motionType = 121;
      } else if (newStage.toLowerCase().includes('drop') || newStage.toLowerCase().includes('cancel') || newStage.toLowerCase().includes('lost')) {
        motionType = 122;
      }

      await tar.tool('create', {
        table: 'motion',
        type: motionType,
        ref: entity.id,
        data: {
          title: `Stage: ${newStage}`,
          stage: newStage,
          flow_id: entity.id,
          timestamp: new Date().toISOString(),
          date_str: formatDateString(new Date()),
        },
        scope,
      });

      if (onRefresh) onRefresh();
      fetchLinkedMotions(entity.id);
    } catch (e) {
      console.warn('[ContactDetails] Failed to advance stage:', e);
    } finally {
      setUpdatingStage(false);
    }
  };

  const parseTimestampMs = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const ms = Date.parse(val);
    if (!isNaN(ms)) return ms;
    return 0;
  };

  const formatDateString = (d: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateNum = String(d.getDate()).padStart(2, '0');
    const monthName = months[d.getMonth()];
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    return `${dateNum} ${monthName}, ${hours}:${minutes} ${ampm}`;
  };

  const compactTimestamp = (rawStr: string) => {
    if (!rawStr) return '';
    try {
      const d = new Date(rawStr);
      if (isNaN(d.getTime())) return rawStr.replace(/^[A-Za-z]+,\s*/, '');
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();

      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const timePart = `${hours}:${minutes} ${ampm}`;

      if (isToday) return `Today ${timePart}`;
      if (isYesterday) return `Yesterday ${timePart}`;

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateNum = String(d.getDate()).padStart(2, '0');
      const monthName = months[d.getMonth()];
      return `${dateNum} ${monthName}, ${timePart}`;
    } catch {
      return rawStr;
    }
  };

  const getInitials = (str: string) => {
    if (!str) return 'C';
    const clean = str.trim();
    if (clean.length === 0) return 'C';
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const PASTEL_COLORS = ['#3b82f6', '#06b6d4', '#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];
  const getAvatarColor = (nameStr: string) => {
    let hash = 0;
    for (let i = 0; i < nameStr.length; i++) hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
    return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length];
  };

  const resolveContactName = (raw: string): string => {
    if (!raw) return '';
    const byId = allEntities.find((e: any) => e.id === raw);
    if (byId) return byId.title || byId.name || byId.data?.fn || '';
    const byDataId = allEntities.find((e: any) => e.data?.customer_id === raw || e.data?.contact_id === raw);
    if (byDataId) return byDataId.title || byDataId.name || byDataId.data?.fn || '';
    return raw;
  };

  const handleDeleteEntity = () => {
    setShowMenu(false);
    Alert.alert(
      'Delete',
      `Delete "${name || 'this item'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!entity?.id) return;
            try {
              await Promise.all([
                tar.tool('delete', { table: 'matter', id: entity.id, scope: scope || '' }).catch(() => null),
                tar.tool('update', { table: 'matter', id: entity.id, scope: scope || '', type: entity.type || 'matter', patch: { status: 'deleted' } }).catch(() => null),
              ]);
            } catch (e: any) {
              console.warn('[ContactDetails] Delete error:', e);
            } finally {
              onClose();
              if (onRefresh) onRefresh();
            }
          },
        },
      ]
    );
  };

  const openInteractionModal = () => {
    setInteractionTitle('');
    const now = new Date();
    setInteractionDateValue(now);
    setInteractionDateStr(formatDateString(now));
    setShowDatePicker(false);
    setInteractionDescription('');
    setShowInteractionModal(true);
  };

  const handleSaveInteraction = async () => {
    if (!scope || !entity?.id || !interactionTitle.trim()) return;
    setSubmittingInteraction(true);
    try {
      await tar.tool('create', {
        table: 'motion',
        type: 'interaction',
        ref: entity.id,
        data: {
          title: interactionTitle.trim(),
          date_str: interactionDateStr,
          notes: interactionDescription.trim(),
          contact: name,
        },
        scope,
      });

      setShowInteractionModal(false);
      if (onRefresh) onRefresh();
      fetchLinkedMotions(entity.id);
    } catch (e) {
      console.warn('[ContactDetails] Save interaction error:', e);
    } finally {
      setSubmittingInteraction(false);
    }
  };

  const handleBackAction = useCallback(() => {
    if (showDatePicker) {
      setShowDatePicker(false);
      return true;
    }
    if (showInteractionModal) {
      setShowInteractionModal(false);
      return true;
    }
    if (showMenu) {
      setShowMenu(false);
      return true;
    }
    onClose();
    return true;
  }, [showDatePicker, showInteractionModal, showMenu, onClose]);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackAction);
    return () => subscription.remove();
  }, [visible, handleBackAction]);

  if (!visible || !entity) return null;

  const linkedContactName = isFlow
    ? resolveContactName(entity.data?.contact_id || entity.data?.customer_id || entity.data?.customer || entity.data?.client || '')
    : '';

  const avatarColor = getAvatarColor(name || 'Contact');
  const initials = getInitials(name || 'Contact');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={handleBackAction}
    >
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: Math.max(insets.top, 16) }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 32) }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Horizontal Profile Header */}
            <View style={styles.horizontalHero}>
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={!onEditEntity || isFlow}
                onPress={() => !isFlow && onEditEntity && onEditEntity(entity)}
                style={[
                  styles.avatarCircle,
                  { backgroundColor: avatarColor + '15', borderColor: avatarColor + '35' },
                ]}
              >
                {isFlow ? (
                  <Ionicons name="git-network-outline" size={24} color={avatarColor} />
                ) : (
                  <Text style={[styles.avatarText, { color: avatarColor }]}>{initials}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                disabled={!onEditEntity || isFlow}
                onPress={() => !isFlow && onEditEntity && onEditEntity(entity)}
                style={styles.heroTextCol}
              >
                <Text style={[styles.heroName, { color: theme.text }]} numberOfLines={1}>
                  {name || (isFlow ? 'Flow' : 'Contact')}
                </Text>

                {/* Minimal Tag Pill */}
                <View style={styles.badgeRow}>
                  <View style={[styles.pillBadge, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '25' }]}>
                    <Text style={[styles.pillBadgeText, { color: theme.primary }]}>
                      {humanRole}
                    </Text>
                  </View>

                  {Boolean(companyName) && !isFlow && (
                    <View style={[styles.pillBadge, { backgroundColor: theme.border + '20', borderColor: theme.border + '40' }]}>
                      <Text style={[styles.pillBadgeText, { color: theme.textSecondary }]}>
                        {companyName}
                      </Text>
                    </View>
                  )}

                  {isFlow && Boolean(linkedContactName) && (
                    <View style={[styles.pillBadge, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '25' }]}>
                      <Ionicons name="person-outline" size={11} color={theme.primary} />
                      <Text style={[styles.pillBadgeText, { color: theme.primary }]}>
                        {linkedContactName}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowMenu(true)}
                hitSlop={12}
                style={styles.iconBtn}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* FLOW MODE: Compact Stage Progress Selector */}
            {isFlow && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeaderLabel, { color: theme.textMuted }]}>
                    STAGE
                  </Text>
                  {updatingStage && <TarLogoLoader size={16} color={theme.primary} />}
                </View>

                <View style={styles.stageGrid}>
                  {FLOW_STAGES.map((stg) => {
                    const isSelected = activeStage.toLowerCase() === stg.label.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={stg.id}
                        onPress={() => handleUpdateFlowStage(stg.label)}
                        activeOpacity={0.7}
                        style={[
                          styles.stagePill,
                          {
                            backgroundColor: isSelected ? stg.color : theme.backgroundElement,
                            borderColor: isSelected ? stg.color : theme.border + '40',
                          },
                        ]}
                      >
                        <Ionicons
                          name={stg.icon as any}
                          size={13}
                          color={isSelected ? '#ffffff' : theme.textSecondary}
                        />
                        <Text
                          style={[
                            styles.stagePillText,
                            { color: isSelected ? '#ffffff' : theme.text },
                          ]}
                        >
                          {stg.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* CONTACT MODE: Minimal Horizontal Contact Action Icons (No BG Color) */}
            {!isFlow && (Boolean(phone) || Boolean(email)) && (
              <View style={styles.contactActionsRow}>
                {Boolean(phone) && (
                  <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={() => Linking.openURL(`tel:${phone}`).catch(() => null)}
                    hitSlop={8}
                    style={styles.actionIconBtn}
                    accessibilityLabel={`Call ${phone}`}
                  >
                    <Ionicons name="call-outline" size={20} color={theme.text} />
                  </TouchableOpacity>
                )}

                {Boolean(phone) && (
                  <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={() => Linking.openURL(`sms:${phone}`).catch(() => null)}
                    hitSlop={8}
                    style={styles.actionIconBtn}
                    accessibilityLabel={`Message ${phone}`}
                  >
                    <Ionicons name="chatbubble-outline" size={20} color={theme.text} />
                  </TouchableOpacity>
                )}

                {Boolean(email) && (
                  <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={() => Linking.openURL(`mailto:${email}`).catch(() => null)}
                    hitSlop={8}
                    style={styles.actionIconBtn}
                    accessibilityLabel={`Email ${email}`}
                  >
                    <Ionicons name="mail-outline" size={20} color={theme.text} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {Boolean(notes) && !isFlow && (
              <View style={styles.notesBlock}>
                <Text style={[styles.notesText, { color: theme.textSecondary }]}>{notes}</Text>
              </View>
            )}

            {/* CONTACT MODE: Minimal Flat Work Section */}
            {!isFlow && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeaderLabel, { color: theme.textMuted }]}>
                    WORK {linkedFlows.length > 0 ? `(${linkedFlows.length})` : ''}
                  </Text>
                  {onLogEventForEntity && (
                    <TouchableOpacity
                      onPress={() => onLogEventForEntity(entity, 'stage')}
                      hitSlop={8}
                    >
                      <Text style={[styles.headerActionLink, { color: theme.primary }]}>+ New Work</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {loadingFlows ? (
                  <TarLogoLoader size={26} color={theme.primary} style={{ marginVertical: 12 }} />
                ) : linkedFlows.length > 0 ? (
                  <View style={styles.flatFlowsContainer}>
                    {linkedFlows.map((flow, idx) => {
                      const fData = typeof flow.data === 'string' ? (JSON.parse(flow.data || '{}') || {}) : (flow.data || {});
                      const dVal = flow.value || fData.value ? `$${Number(flow.value || fData.value).toLocaleString()}` : '';
                      const dStage = fData.stage || flow.stage || 'In Progress';
                      const stageConfig = FLOW_STAGES.find(s => s.label.toLowerCase() === dStage.toLowerCase()) || FLOW_STAGES[1];

                      return (
                        <TouchableOpacity
                          key={flow.id || idx}
                          activeOpacity={0.6}
                          onPress={() => onSelectDeal?.(flow)}
                          style={[
                            styles.flatFlowRow,
                            idx < linkedFlows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border + '25' },
                          ]}
                        >
                          <View style={{ flex: 1, marginRight: 12 }}>
                            <Text style={[styles.flatFlowTitle, { color: theme.text }]} numberOfLines={1}>
                              {flow.title || flow.name || fData.name || 'Work'}
                            </Text>
                            {Boolean(dVal) && (
                              <Text style={[styles.flatFlowSubtext, { color: theme.textSecondary }]}>
                                {dVal}
                              </Text>
                            )}
                          </View>

                          <Text style={[styles.flowStatusText, { color: theme.textSecondary }]}>
                            {dStage}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => onLogEventForEntity?.(entity, 'stage')}
                    activeOpacity={0.7}
                    style={[styles.emptyFlowStrip, { borderColor: theme.border + '40' }]}
                  >
                    <Ionicons name="git-network-outline" size={16} color={theme.primary} />
                    <Text style={[styles.emptyFlowStripText, { color: theme.primary }]}>
                      + Add Work for {name || 'contact'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Minimal Activity & Timeline (Flat List Design) */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionHeaderLabel, { color: theme.textMuted }]}>
                  ACTIVITY
                </Text>
                <TouchableOpacity onPress={openInteractionModal} hitSlop={8}>
                  <Text style={[styles.headerActionLink, { color: theme.primary }]}>+ Log Note</Text>
                </TouchableOpacity>
              </View>

              {loadingMotions ? (
                <TarLogoLoader size={26} color={theme.primary} style={{ marginVertical: 14 }} />
              ) : linkedMotions.filter(m => String(m.type || '').toLowerCase() !== 'change').length > 0 ? (
                <View style={styles.flatActivityContainer}>
                  {linkedMotions.filter(m => String(m.type || '').toLowerCase() !== 'change').map((m, idx, arr) => {
                    const mData = typeof m.data === 'string' ? (JSON.parse(m.data || '{}') || {}) : (m.data || {});
                    const title = mData.title || (m.type === 'stage' || m.type === 120 ? `Stage: ${mData.stage || 'Updated'}` : 'Note logged');
                    const dateStr = mData.date_str || m.timestamp || '';
                    const notesText = mData.notes || '';

                    return (
                      <View
                        key={m.id || idx}
                        style={[
                          styles.flatActivityRow,
                          idx < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border + '25' },
                        ]}
                      >
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <Text style={[styles.flatActivityTitle, { color: theme.text }]} numberOfLines={1}>
                            {title}
                          </Text>
                          {Boolean(notesText) && (
                            <Text style={[styles.flatActivityNotes, { color: theme.textSecondary }]}>
                              {notesText}
                            </Text>
                          )}
                        </View>
                        {Boolean(dateStr) && (
                          <Text style={[styles.flatActivityTime, { color: theme.textMuted }]}>
                            {compactTimestamp(dateStr)}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={[styles.emptyStateText, { color: theme.textMuted }]}>
                  No activities recorded yet.
                </Text>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Options Menu Overlay */}
        {showMenu && (
          <Pressable style={styles.menuBackdrop} onPress={() => setShowMenu(false)}>
            <View style={[styles.menuContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              {!isFlow && onEditEntity && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    onEditEntity(entity);
                  }}
                >
                  <Ionicons name="pencil-outline" size={16} color={theme.text} />
                  <Text style={[styles.menuItemText, { color: theme.text }]}>Edit Contact</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleDeleteEntity}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        )}

        {/* Minimal Log Note Overlay */}
        {showInteractionModal && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background, zIndex: 100 }]}>
            <View style={[styles.topBar, { borderBottomColor: theme.border + '30', paddingTop: Math.max(insets.top, 12) }]}>
              <TouchableOpacity onPress={() => setShowInteractionModal(false)} hitSlop={12} style={styles.iconBtn}>
                <Ionicons name="close" size={20} color={theme.text} />
              </TouchableOpacity>

              <Text style={[styles.topBarTitle, { color: theme.text }]}>Log Activity</Text>

              <TouchableOpacity
                onPress={handleSaveInteraction}
                disabled={submittingInteraction || !interactionTitle.trim()}
                style={[
                  styles.savePill,
                  { backgroundColor: interactionTitle.trim() ? theme.primary : theme.border + '40' },
                ]}
              >
                {submittingInteraction ? (
                  <TarLogoLoader color="#ffffff" size={16} />
                ) : (
                  <Text style={styles.savePillText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14 }}>
              <View>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>TITLE</Text>
                <TextInput
                  style={[styles.cleanInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                  value={interactionTitle}
                  onChangeText={setInteractionTitle}
                  placeholder="e.g. Call regarding quotation"
                  placeholderTextColor={theme.textMuted + '80'}
                  autoFocus
                />
              </View>

              <View>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>DATE</Text>
                <TouchableOpacity
                  onPress={() => {
                    setDatePickerMode('date');
                    setShowDatePicker(true);
                  }}
                  style={[styles.cleanInput, { justifyContent: 'center', borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                >
                  <Text style={{ fontSize: 14, color: theme.text }}>{interactionDateStr}</Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={interactionDateValue}
                  mode={Platform.OS === 'ios' ? 'datetime' : datePickerMode}
                  onChange={(evt: any, selectedDateObj?: Date) => {
                    if (evt.type === 'dismissed') {
                      setShowDatePicker(false);
                      return;
                    }
                    if (selectedDateObj) {
                      const updated = new Date(interactionDateValue);
                      if (Platform.OS === 'ios') {
                        setInteractionDateValue(selectedDateObj);
                        setInteractionDateStr(formatDateString(selectedDateObj));
                        setShowDatePicker(false);
                      } else if (datePickerMode === 'date') {
                        updated.setFullYear(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate());
                        setInteractionDateValue(updated);
                        setInteractionDateStr(formatDateString(updated));
                        setShowDatePicker(false);
                        setTimeout(() => {
                          setDatePickerMode('time');
                          setShowDatePicker(true);
                        }, 150);
                      } else {
                        updated.setHours(selectedDateObj.getHours(), selectedDateObj.getMinutes());
                        setInteractionDateValue(updated);
                        setInteractionDateStr(formatDateString(updated));
                        setShowDatePicker(false);
                      }
                    } else {
                      setShowDatePicker(false);
                    }
                  }}
                />
              )}

              <View>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>DETAILS</Text>
                <TextInput
                  style={[styles.cleanInput, { minHeight: 100, textAlignVertical: 'top', color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                  value={interactionDescription}
                  onChangeText={setInteractionDescription}
                  placeholder="Notes, discussion points, or next steps..."
                  placeholderTextColor={theme.textMuted + '80'}
                  multiline
                />
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  textActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  textActionLabel: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 14,
  },
  horizontalHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTextCol: {
    flex: 1,
    gap: 3,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  pillBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  contactActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  actionIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  notesBlock: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerActionLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  stageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  stagePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  flatFlowsContainer: {
    backgroundColor: 'transparent',
  },
  flatFlowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 2,
    backgroundColor: 'transparent',
  },
  flatFlowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  flatFlowSubtext: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  flowStatusText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  emptyFlowStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyFlowStripText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  flatActivityContainer: {
    backgroundColor: 'transparent',
  },
  flatActivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 2,
    backgroundColor: 'transparent',
  },
  flatActivityTitle: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  flatActivityNotes: {
    fontSize: 12,
    marginTop: 2,
  },
  flatActivityTime: {
    fontSize: 11.5,
  },
  emptyStateText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    paddingTop: 50,
    paddingRight: 16,
    alignItems: 'flex-end',
    zIndex: 99,
  },
  menuContainer: {
    width: 150,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    elevation: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '600',
  },
  savePill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savePillText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cleanInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13.5,
  },
});
