import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tar, type HarnessDefinition, type HarnessRecord, type HarnessRecordProfile, type HarnessRecordProfileEvent } from '@/lib/tar';

interface Props {
  scope: string;
  record: HarnessRecord | null;
  definitions: HarnessDefinition[];
  onClose: () => void;
  onOpenWorkflow?: (workflow: { runId: string; botId: string; workflowId: string; stepId: string; recordId: string }) => void;
}

const previewDesign: HarnessRecordProfile['design'] = {
  version: 1,
  component: 'record-profile',
  layout: 'identity-header-insight-activity-fields',
  tokens: { page: '#ffffff', surface: '#ffffff', border: 'transparent', text: '#111111', muted: '#727272', divider: '#dedede', insight: '#dceffc', insightText: '#17364a', panelMaxWidth: 640, panelPadding: 0, avatarSize: 96, borderRadius: 0, rowMinHeight: 72 },
};

const RESERVED_FIELD_KEYS = new Set([
  'name',
  'title',
  'full_name',
  'fullname',
  'first_name',
  'last_name',
  'fn',
  'ln',
  'email',
  'email_address',
  'emailaddress',
  'em',
  'phone',
  'phone_number',
  'phonenumber',
  'mobile',
  'ph',
  'subtitle',
  'organization',
  'company',
  'avatar_ref',
  'avatarref',
  'insight',
  'timeline_heading',
  'timelineheading',
]);

function recordTypeTitle(type?: string): string {
  if (!type) return 'Details';
  const clean = type.replace(/[._-]+/g, ' ').trim().toLowerCase();
  const singular = clean.endsWith('s') && clean.length > 3 ? clean.slice(0, -1) : clean;
  return singular.charAt(0).toUpperCase() + singular.slice(1);
}

function previewRecord(record: HarnessRecord): HarnessRecordProfile {
  const data = record.data || {};
  const subtitle = typeof data.subtitle === 'string' ? data.subtitle : typeof data.organization === 'string' ? data.organization : typeof data.company === 'string' ? data.company : undefined;
  const avatarRef = typeof data.avatar_ref === 'string' ? data.avatar_ref : typeof data.avatarRef === 'string' ? data.avatarRef : undefined;
  const email = typeof data.email === 'string' ? data.email : typeof data.email_address === 'string' ? data.email_address : typeof data.em === 'string' ? data.em : undefined;
  const phone = typeof data.phone === 'string' ? data.phone : typeof data.phone_number === 'string' ? data.phone_number : typeof data.mobile === 'string' ? data.mobile : typeof data.ph === 'string' ? data.ph : undefined;
  const initials = record.title.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';
  const fields = Object.entries(data)
    .filter(([key, value]) => !RESERVED_FIELD_KEYS.has(key.toLowerCase()) && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null))
    .map(([key, value]) => ({ key, value: value as string | number | boolean | null }));
  return {
    design: previewDesign,
    record: { id: record.id, type: record.type, title: record.title, status: record.status, version: record.version, createdAt: Date.now(), updatedAt: Date.now() },
    identity: { title: record.title, ...(subtitle ? { subtitle } : {}), ...(avatarRef ? { avatarRef } : {}), ...(email ? { email } : {}), ...(phone ? { phone } : {}), initials },
    activity: { heading: record.type === 'contact' || record.type === 'contacts' ? 'Recent interactions' : 'Recent activity', events: [], empty: true },
    workflows: [],
    fields,
  };
}

function relativeTime(value: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - value) / 1000));
  if (seconds < 60) return 'Now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week';
  return `${weeks} weeks`;
}

function eventIcon(channel: HarnessRecordProfileEvent['channel']): keyof typeof Ionicons.glyphMap {
  if (channel === 'message') return 'chatbubble-outline';
  if (channel === 'email') return 'mail-outline';
  if (channel === 'phone') return 'call-outline';
  if (channel === 'calendar') return 'calendar-outline';
  if (channel === 'note') return 'document-text-outline';
  return 'sparkles-outline';
}

function fieldValue(screen: HarnessRecordProfile, names: string[]): string | undefined {
  const field = screen.fields.find((item) => names.includes(item.key.toLowerCase()));
  return typeof field?.value === 'string' && field.value.trim() ? field.value.trim() : undefined;
}

export default function RecordProfile({ scope, record, definitions, onClose, onOpenWorkflow }: Props) {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<HarnessRecordProfile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [workflowPickerOpen, setWorkflowPickerOpen] = useState(false);
  const [startingWorkflowId, setStartingWorkflowId] = useState('');
  const showingPreview = Boolean(record && screen?.record.id !== record.id);
  const currentScreen = record ? (screen?.record.id === record.id ? screen : previewRecord(record)) : null;
  const workflows = Array.isArray(currentScreen?.workflows) ? currentScreen.workflows : [];
  const isContact = currentScreen?.record.type === 'contact' || currentScreen?.record.type === 'contacts';
  const interactions = currentScreen?.activity.events.filter((event) => event.channel !== 'system').slice(0, 5) || [];
  const availableWorkflows = useMemo(() => definitions.filter((definition) => definition.kind === 'bot').flatMap((bot) => {
    const definitions = Array.isArray(bot.body.workflows) ? bot.body.workflows as Record<string, unknown>[] : [];
    return definitions.flatMap((workflow) => {
      const steps = Array.isArray(workflow.steps) ? workflow.steps as Record<string, unknown>[] : [];
      const firstStep = steps[0];
      const actions = Array.isArray(firstStep?.actions) ? firstStep.actions.map(String) : [];
      if (!firstStep || actions.includes('database.record.create')) return [];
      return [{ id: `${bot.id}:${String(workflow.id)}`, botId: bot.id, workflowId: String(workflow.id), stepId: String(firstStep.id), title: String(workflow.title || bot.name), firstStep: String(firstStep.title || 'Start') }];
    });
  }), [definitions]);

  useEffect(() => {
    let live = true;
    if (!record) return () => { live = false; };
    const timer = setTimeout(() => {
      if (!live) return;
      setLoading(true); setError('');
      void tar.harness.recordProfile(scope, record.id)
        .then((result) => { if (live) setScreen(result.screen); })
        .catch((cause) => { if (live) setError(cause instanceof Error ? cause.message : 'Could not load this record.'); })
        .finally(() => { if (live) setLoading(false); });
    }, 0);
    return () => { live = false; clearTimeout(timer); };
  }, [record, scope]);

  const email = useMemo(() => {
    if (!currentScreen) return undefined;
    if (typeof currentScreen.identity.email === 'string' && currentScreen.identity.email.trim()) {
      return currentScreen.identity.email.trim();
    }
    const data = record?.data || {};
    const fromData = data.email || data.email_address || data.em;
    if (typeof fromData === 'string' && fromData.trim()) return fromData.trim();
    return fieldValue(currentScreen, ['email', 'email_address', 'em']);
  }, [currentScreen, record?.data]);

  const phone = useMemo(() => {
    if (!currentScreen) return undefined;
    if (typeof currentScreen.identity.phone === 'string' && currentScreen.identity.phone.trim()) {
      return currentScreen.identity.phone.trim();
    }
    const data = record?.data || {};
    const fromData = data.phone || data.phone_number || data.mobile || data.ph;
    if (typeof fromData === 'string' && fromData.trim()) return fromData.trim();
    return fieldValue(currentScreen, ['phone', 'phone_number', 'mobile', 'ph']);
  }, [currentScreen, record?.data]);

  const startWorkflow = async (workflow: { id: string; botId: string; workflowId: string; stepId: string }) => {
    if (!record || startingWorkflowId) return;
    setStartingWorkflowId(workflow.id);
    try {
      const result = await tar.harness.command(scope, { action: 'run.start', botId: workflow.botId, workflowId: workflow.workflowId, recordId: record.id }) as { run?: { id: string; stepId: string } };
      const runId = result.run?.id;
      if (!runId) throw new Error('Could not start the workflow.');
      setWorkflowPickerOpen(false);
      onOpenWorkflow?.({ runId, botId: workflow.botId, workflowId: workflow.workflowId, stepId: result.run?.stepId || workflow.stepId, recordId: record.id });
    } catch (cause) {
      Alert.alert('Could not start workflow', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setStartingWorkflowId('');
    }
  };

  return (
    <Modal visible={Boolean(record)} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.page, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.navigation}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to data" onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={21} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.navigationTitle} numberOfLines={1}>
            {recordTypeTitle(record?.type)}
          </Text>
          <View style={styles.backButton} />
        </View>
        {currentScreen ? (
          <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]} showsVerticalScrollIndicator={false}>
            <View style={styles.panel}>
              <View style={styles.identityRow}>
                {currentScreen.identity.avatarRef ? <Image source={{ uri: currentScreen.identity.avatarRef }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarInitials}>{currentScreen.identity.initials}</Text></View>}
                <View style={styles.identityCopy}>
                  <Text style={styles.name}>{currentScreen.identity.title}</Text>
                  {currentScreen.identity.subtitle ? <Text style={styles.subtitle}>{currentScreen.identity.subtitle}</Text> : null}
                </View>
                {(email || phone) ? <View style={styles.contactActions}>
                  {email ? <Pressable accessibilityRole="button" accessibilityLabel="Send email" style={styles.contactButton} onPress={() => void Linking.openURL(`mailto:${email}`)}><Ionicons name="mail-outline" size={18} color="#555555" /></Pressable> : null}
                  {phone ? <Pressable accessibilityRole="button" accessibilityLabel="Call" style={styles.contactButton} onPress={() => void Linking.openURL(`tel:${phone}`)}><Ionicons name="call-outline" size={17} color="#555555" /></Pressable> : null}
                </View> : null}
              </View>

              {!isContact && currentScreen.insight ? <View style={styles.insight}><Ionicons name="information-circle-outline" size={18} color="#17364a" /><Text style={styles.insightText}>{currentScreen.insight}</Text></View> : null}

              {isContact && <View style={styles.workflows}>
                <View style={styles.workflowHeader}><Text style={styles.workflowHeading}>Active workflows</Text><TouchableOpacity onPress={() => setWorkflowPickerOpen(true)} accessibilityRole="button" accessibilityLabel="Add workflow"><Text style={styles.addWorkflow}>Add workflow</Text></TouchableOpacity></View>
                {workflows.length === 0 ? <Text style={styles.workflowEmpty}>No active workflows</Text> : workflows.map((workflow, index) => <TouchableOpacity key={workflow.id} disabled={!onOpenWorkflow} onPress={() => onOpenWorkflow?.({ runId: workflow.id, botId: workflow.botId, workflowId: workflow.workflowId, stepId: workflow.stepId, recordId: currentScreen.record.id })} style={[styles.workflowRow, index < workflows.length - 1 && styles.workflowDivider]}>
                  <View style={styles.workflowCopy}><Text style={styles.workflowTitle}>{workflow.title}</Text><Text style={styles.workflowStep}>Current: {workflow.step}</Text></View>
                  {onOpenWorkflow ? <Ionicons name="chevron-forward" size={18} color="#777777" /> : null}
                </TouchableOpacity>)}
              </View>}

              <View style={styles.activityTitleRow}><Text style={styles.activityHeading}>{isContact ? 'Interactions' : currentScreen.activity.heading}</Text>{loading || showingPreview ? <ActivityIndicator size="small" color="#777777" /> : null}</View>
              {loading || showingPreview ? null : error ? <Text style={styles.empty}>Activity could not be loaded.</Text> : interactions.length === 0 ? <Text style={styles.empty}>{isContact ? 'No recent interactions' : 'No activity yet.'}</Text> : interactions.map((event, index) => (
                <View key={event.id} style={[styles.eventRow, index < interactions.length - 1 && styles.eventDivider]}>
                  <View style={styles.eventIcon}><Ionicons name={eventIcon(event.channel)} size={19} color="#3f9f63" /></View>
                  <Text style={styles.eventSummary} numberOfLines={2}>{event.summary}</Text>
                  <Text style={styles.eventTime}>{relativeTime(event.occurredAt)}</Text>
                </View>
              ))}

              {!isContact && currentScreen.fields.length ? <View style={styles.fields}>{currentScreen.fields.map((field) => <View key={field.key} style={styles.fieldRow}><Text style={styles.fieldName}>{field.key.replace(/[_-]+/g, ' ')}</Text><Text style={styles.fieldValue}>{String(field.value ?? '')}</Text></View>)}</View> : null}
            </View>
          </ScrollView>
        ) : !loading && error ? <View style={styles.center}><Text style={styles.error}>{error}</Text><TouchableOpacity onPress={onClose}><Text style={styles.closeText}>Close</Text></TouchableOpacity></View> : null}
        <Modal visible={workflowPickerOpen} transparent animationType="slide" onRequestClose={() => setWorkflowPickerOpen(false)}>
          <View style={styles.pickerOverlay}><Pressable style={StyleSheet.absoluteFill} onPress={() => setWorkflowPickerOpen(false)} accessibilityLabel="Close workflow picker" /><View style={[styles.workflowPicker, { paddingBottom: Math.max(insets.bottom, 20) }]}><View style={styles.pickerHandle} /><Text style={styles.pickerTitle}>Add workflow</Text><Text style={styles.pickerHint}>Choose a workflow for {currentScreen?.identity.title || 'this contact'}.</Text>{availableWorkflows.length ? <ScrollView style={styles.pickerList}>{availableWorkflows.map((workflow) => <TouchableOpacity key={workflow.id} disabled={Boolean(startingWorkflowId)} onPress={() => void startWorkflow(workflow)} style={styles.pickerRow}><View style={styles.workflowCopy}><Text style={styles.workflowTitle}>{workflow.title}</Text><Text style={styles.workflowStep}>Starts with: {workflow.firstStep}</Text></View>{startingWorkflowId === workflow.id ? <ActivityIndicator size="small" color="#1a73e8" /> : <Ionicons name="chevron-forward" size={18} color="#777777" />}</TouchableOpacity>)}</ScrollView> : <Text style={styles.workflowEmpty}>No workflows are available yet.</Text>}<TouchableOpacity style={styles.pickerCancel} onPress={() => setWorkflowPickerOpen(false)}><Text style={styles.pickerCancelText}>Cancel</Text></TouchableOpacity></View></View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#ffffff' },
  navigation: { minHeight: 50, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0' },
  navigationTitle: { maxWidth: '70%', fontSize: 16, fontWeight: '700', color: '#111111' },
  backButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12 },
  panel: { width: '100%', maxWidth: 640, alignSelf: 'center', backgroundColor: '#ffffff' },
  identityRow: { minHeight: 88, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 82, height: 82, borderRadius: 41, backgroundColor: '#eeeeee' },
  avatarFallback: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e9e9e9' },
  avatarInitials: { color: '#303030', fontSize: 25, fontWeight: '700' },
  identityCopy: { flex: 1, marginLeft: 20 },
  name: { color: '#111111', fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#707070', fontSize: 16, lineHeight: 22, marginTop: 4 },
  contactActions: { flexDirection: 'row', gap: 8, alignSelf: 'flex-start' },
  contactButton: { width: 36, height: 36, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  insight: { marginTop: 20, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#dceffc', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 9 },
  insightText: { flex: 1, color: '#17364a', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  workflows: { marginTop: 28 },
  workflowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  workflowHeading: { color: '#111111', fontSize: 20, lineHeight: 26, fontWeight: '700', marginBottom: 6 },
  addWorkflow: { color: '#1a73e8', fontSize: 14, fontWeight: '700' },
  workflowRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12 },
  workflowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0' },
  workflowCopy: { flex: 1 },
  workflowTitle: { color: '#252525', fontSize: 16, fontWeight: '600' },
  workflowStep: { color: '#70757a', fontSize: 14, marginTop: 3 },
  workflowEmpty: { color: '#70757a', fontSize: 15, paddingVertical: 10 },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0004' },
  workflowPicker: { maxHeight: '70%', backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 24, paddingTop: 10 },
  pickerHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#dadce0', marginBottom: 18 },
  pickerTitle: { color: '#111111', fontSize: 20, fontWeight: '700' },
  pickerHint: { color: '#70757a', fontSize: 15, marginTop: 5, marginBottom: 14 },
  pickerList: { marginHorizontal: -24 },
  pickerRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#f0f0f0' },
  pickerCancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  pickerCancelText: { color: '#1a73e8', fontSize: 15, fontWeight: '700' },
  activityTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, marginBottom: 10 },
  activityHeading: { color: '#111111', fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.4 },
  eventRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center' },
  eventDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0' },
  eventIcon: { width: 36, alignItems: 'flex-start' },
  eventSummary: { flex: 1, paddingRight: 12, color: '#252525', fontSize: 16, lineHeight: 22, fontWeight: '500' },
  eventTime: { color: '#777777', fontSize: 14, lineHeight: 20, textAlign: 'right' },
  empty: { color: '#777777', fontSize: 15, lineHeight: 22, paddingVertical: 12 },
  fields: { marginTop: 24, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#f0f0f0' },
  fieldRow: { minHeight: 48, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0', flexDirection: 'row', gap: 16, alignItems: 'center' },
  fieldName: { flex: 1, color: '#777777', fontSize: 14, textTransform: 'capitalize' },
  fieldValue: { flex: 1.3, color: '#252525', fontSize: 15, textAlign: 'right' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  error: { color: '#8d1b1b', fontSize: 15, textAlign: 'center' },
  closeText: { color: '#111111', fontSize: 15, fontWeight: '700' },
});
