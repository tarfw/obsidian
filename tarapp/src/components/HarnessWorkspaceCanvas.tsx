import { BotBuilder } from '@/components/BotBuilder';
import RecordProfile from '@/components/RecordProfile';
import WorkflowFlow, { type WorkflowRunContext } from '@/components/WorkflowFlow';
import { tar, type BotBuilderDraft, type HarnessDefinition, type HarnessHome, type HarnessRecord } from '@/lib/tar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

interface Props { scope: string; workspaceName: string; onOpenWorkspaceSwitcher: () => void; }
type Screen = 'home' | 'inbox' | 'data' | 'build';
type BuildSection = 'bots' | 'definitions' | 'workflows';
type InboxItem = { id: string; ref?: string; title?: string; workspace_id?: string; workspace_name?: string; data?: Record<string, unknown> };
type WorkspaceSnapshot = { home: HarnessHome; defs: HarnessDefinition[]; records: HarnessRecord[]; inbox: InboxItem[] };
const workspaceCache = new Map<string, WorkspaceSnapshot>();
function slug(value: string, fallback: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || fallback; }

function titleCase(value: string) {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function recordTypeLabels(type: string) {
  const base = type.replace(/^data[_-]?/i, '').trim() || 'record';
  const singular = base.endsWith('ies') ? `${base.slice(0, -3)}y` : base.endsWith('s') ? base.slice(0, -1) : base;
  const plural = base.endsWith('s') ? base : base.endsWith('y') ? `${base.slice(0, -1)}ies` : `${base}s`;
  return { singular: titleCase(singular), plural: titleCase(plural) };
}

function recordStatus(status: string) {
  return titleCase(status || 'active');
}

export default function HarnessWorkspaceCanvas({ scope, workspaceName, onOpenWorkspaceSwitcher }: Props) {
  const insets = useSafeAreaInsets();
  const cached = workspaceCache.get(scope);
  const [screen, setScreen] = useState<Screen>('home'); const [buildSection, setBuildSection] = useState<BuildSection>('bots'); const [home, setHome] = useState<HarnessHome | null>(cached?.home ?? null);
  const [defs, setDefs] = useState<HarnessDefinition[]>(cached?.defs ?? []); const [records, setRecords] = useState<HarnessRecord[]>(cached?.records ?? []);
  const [inbox, setInbox] = useState<InboxItem[]>(cached?.inbox ?? []);
  const [loading, setLoading] = useState(!cached); const [recordsLoading, setRecordsLoading] = useState(!cached); const [error, setError] = useState(''); const [builder, setBuilder] = useState(false); const [newData, setNewData] = useState(false); const [name, setName] = useState(''); const [fields, setFields] = useState(''); const [selectedRecord, setSelectedRecord] = useState<HarnessRecord | null>(null); const [flow, setFlow] = useState<WorkflowRunContext | null>(null); const [recordSearch, setRecordSearch] = useState(''); const [filtersOpen, setFiltersOpen] = useState(false); const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const canManage = home?.capabilities?.manageDefinitions === true && scope !== 'p'; const dataDefs = useMemo(() => defs.filter((def) => def.kind === 'data'), [defs]);
  const recordStatuses = useMemo(() => Array.from(new Set(records.map((record) => record.status || 'active'))).sort(), [records]);
  const groupedRecords = useMemo(() => {
    const query = recordSearch.trim().toLowerCase();
    const groups = new Map<string, { label: string; records: HarnessRecord[] }>();
    records.forEach((record) => {
      const status = record.status || 'active';
      const labels = recordTypeLabels(record.type);
      const matchesQuery = !query || [record.title, labels.singular, labels.plural, status].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(status);
      if (!matchesQuery || !matchesStatus) return;
      const key = labels.plural;
      const group = groups.get(key) || { label: labels.plural, records: [] };
      group.records.push(record);
      groups.set(key, group);
    });
    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [recordSearch, records, selectedStatuses]);
  const reload = useCallback(async () => {
    if (!workspaceCache.has(scope)) { setLoading(true); setRecordsLoading(true); }
    setError('');
    const recordsRequest = tar.harness.records(scope);
    const otherRequests = Promise.all([tar.harness.home(scope), tar.harness.defs(scope), tar.harness.inbox(scope)]);
    try {
      const nextRecords = await recordsRequest;
      setRecords(nextRecords.records);
      setRecordsLoading(false);
      const [nextHome, nextDefs, nextInbox] = await otherRequests;
      workspaceCache.set(scope, { home: nextHome, defs: nextDefs.defs, records: nextRecords.records, inbox: nextInbox.items });
      setHome(nextHome); setDefs(nextDefs.defs); setInbox(nextInbox.items);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load this workspace.';
      setError(/provision|prepar|not ready|409/i.test(message) ? 'Workspace is still preparing. Tap to retry.' : message);
    } finally {
      setLoading(false); setRecordsLoading(false);
    }
  }, [scope]);
  useEffect(() => { const timer = setTimeout(() => void reload(), 0); return () => clearTimeout(timer); }, [reload]);
  const start = (card: { botId: string; workflowId: string; stepId: string }) => { console.info('[TarPerf][action-open] instant', JSON.stringify({ botId: card.botId, workflowId: card.workflowId })); setFlow({ botId: card.botId, workflowId: card.workflowId, stepId: card.stepId }); };
  const startInbox = (item: InboxItem) => { const botId = typeof item.data?.botId === 'string' ? item.data.botId : ''; const workflowId = typeof item.data?.workflowId === 'string' ? item.data.workflowId : ''; const stepId = typeof item.data?.stepId === 'string' ? item.data.stepId : ''; if (!item.ref || !botId || !workflowId || !stepId) { Alert.alert('Unavailable', 'This Inbox item cannot be opened as a Workflow step.'); return; } setFlow({ runId: item.ref, botId, workflowId, stepId }); };
  const saveData = async () => { const clean = name.trim(); const columns = fields.split(',').map((value) => slug(value, '')).filter(Boolean); if (!clean || !columns.length) return Alert.alert('Add a name and at least one field.'); try { await tar.harness.saveDef(scope, { id: `data_${slug(clean, 'item')}`, kind: 'data', name: clean, body: { fields: columns, card: { kind: 'data' } } }); setNewData(false); setName(''); setFields(''); await reload(); } catch (cause) { Alert.alert('Could not save', cause instanceof Error ? cause.message : 'Try again.'); } };
  const createFromDraft = async (draft: BotBuilderDraft) => { for (const artifact of draft.artifacts) await tar.harness.saveDef(scope, { id: `data_${artifact.id}`, kind: 'data', name: artifact.name, body: { fields: artifact.fields, initialStatus: artifact.initialStatus, card: { kind: 'data' } } }); await tar.harness.saveDef(scope, { id: `bot_${slug(draft.name, 'bot')}`, kind: 'bot', name: draft.name, body: { purpose: draft.purpose, workflows: draft.workflows.map((workflow) => ({ ...workflow, steps: workflow.steps.map((step, index) => ({ id: step.id, title: step.title, mode: step.handler === 'agent' ? 'agentic' : 'deterministic', actions: step.handler === 'agent' ? ['skill.ai_help'] : ['database.record'], card: step.card ? { kind: index === 0 ? 'action' : step.card.type === 'report' ? 'report' : 'data', fields: step.card.fields } : undefined, instruction: step.instruction, allowed_actions: step.handler === 'agent' ? ['skill.ai_help'] : undefined, allowed_transitions: ['next'] })) })) } }); setBuilder(false); await reload(); };
  return (
    <View style={styles.page}>
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.brandTouch} onPress={onOpenWorkspaceSwitcher}>
            <Text numberOfLines={1} style={styles.brand}>{workspaceName}</Text>
            <Ionicons name="chevron-down" size={16} color="#5f6368" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerDivider} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {(['home', 'inbox', 'data'] as Screen[]).map((item) => (
            <TouchableOpacity key={item} onPress={() => setScreen(item)} style={styles.tabButton}>
              <Text style={[styles.tab, screen === item && styles.active]}>
                {item === 'home' ? 'Work' : item === 'data' ? 'Records' : item[0].toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          {canManage && <TouchableOpacity onPress={() => setScreen('build')} style={styles.tabButton}><Text style={[styles.tab, screen === 'build' && styles.active]}>Build</Text></TouchableOpacity>}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={[styles.content, screen === 'home' && styles.workContent, { paddingBottom: 48 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {error ? <Pressable onPress={() => void reload()} style={styles.notice}><Text style={styles.noticeText}>{error} Tap to retry.</Text></Pressable> : null}
        {screen === 'home' && (
          <>
            {loading && !home ? <InlineLoading /> : home?.actions?.length ? <Section cards={home.actions} onStart={start} /> : <Empty text="No actions are available for your role." />}
          </>
        )}
        {screen === 'inbox' && (
          <>
            {loading && !home ? <InlineLoading /> : inbox.map((item) => (
              <TouchableOpacity key={item.id} style={styles.card} onPress={() => startInbox(item)}>
                <Text style={styles.cardTitle}>{item.title || 'Work item'}</Text>
                  <Text style={styles.cardDetail}>Tap to start</Text>
              </TouchableOpacity>
            ))}
            {!loading && !inbox.length && <View style={styles.inboxEmpty}><Ionicons name="checkmark-circle-outline" size={28} color="#5f6368" /><Text style={styles.inboxEmptyTitle}>You’re all caught up</Text><Text style={styles.inboxEmptyDetail}>New assignments will appear here.</Text></View>}
          </>
        )}
        {screen === 'data' && (
          <>
            <View style={styles.recordControls}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color="#70757a" />
                <TextInput value={recordSearch} onChangeText={setRecordSearch} placeholder="Search records" placeholderTextColor="#70757a" style={styles.searchInput} accessibilityLabel="Search records" />
              </View>
              <TouchableOpacity onPress={() => setFiltersOpen(true)} style={styles.filterButton} accessibilityRole="button" accessibilityLabel="Filter records">
                <Ionicons name="options-outline" size={20} color="#3c4043" />
                {selectedStatuses.length > 0 && <View style={styles.filterIndicator} />}
              </TouchableOpacity>
            </View>
            {recordsLoading ? <InlineLoading /> : groupedRecords.map((group) => (
              <View key={group.label} style={styles.recordGroup}>
                <View style={styles.recordGroupHeader}><Text style={styles.recordGroupTitle}>{group.label}</Text><Text style={styles.recordGroupCount}>{group.records.length}</Text></View>
                {group.records.map((record) => {
                  const labels = recordTypeLabels(record.type);
                  return <TouchableOpacity key={record.id} style={styles.row} onPress={() => setSelectedRecord(record)}>
                    <View style={styles.rowCopy}><Text style={styles.rowTitle}>{record.title}</Text><Text style={styles.rowDetail}>{`${labels.singular} · ${recordStatus(record.status)}`}</Text></View>
                    <Ionicons name="chevron-forward" size={17} color="#777777" />
                  </TouchableOpacity>;
                })}
              </View>
            ))}
            {!loading && !records.length && <Empty text="No records yet." />}
            {!loading && records.length > 0 && !groupedRecords.length && <Empty text="No records match your search or filters." />}
          </>
        )}
        {screen === 'build' && canManage && (
          <>
            <View style={styles.buildTabs}>
              {(['bots', 'definitions', 'workflows'] as BuildSection[]).map((item) => <TouchableOpacity key={item} onPress={() => setBuildSection(item)} style={styles.buildTab}><Text style={[styles.buildTabText, buildSection === item && styles.active]}>{item === 'definitions' ? 'Record types' : item[0].toUpperCase() + item.slice(1)}</Text></TouchableOpacity>)}
            </View>
            {buildSection === 'bots' && <>
            <TouchableOpacity style={styles.primary} onPress={() => setBuilder(true)}>
              <Text style={styles.primaryText}>Create Bot with AI</Text>
            </TouchableOpacity>
            {defs.filter((def) => def.kind === 'bot').map((def) => <Row key={def.id} title={def.name} detail="Workflow definition" />)}
            {!defs.some((def) => def.kind === 'bot') && <Empty text="No Bots yet." />}
            </>}
            {buildSection === 'definitions' && <>
            <TouchableOpacity style={styles.primary} onPress={() => setNewData(true)}>
              <Text style={styles.primaryText}>Create record type</Text>
            </TouchableOpacity>
            {dataDefs.map((def) => (
              <Row
                key={def.id}
                title={def.name}
                detail={`${Array.isArray(def.body.fields) ? def.body.fields.length : 0} fields`}
              />
            ))}
            {!dataDefs.length && <Empty text="No record types yet." />}
            </>}
            {buildSection === 'workflows' && <>
            {defs.filter((def) => def.kind === 'bot').flatMap((bot) => {
              const workflows = Array.isArray(bot.body.workflows) ? bot.body.workflows as { id?: string; title?: string; steps?: unknown[] }[] : [];
              return workflows.map((workflow, index) => <Row key={`${bot.id}:${workflow.id || index}`} title={workflow.title || bot.name} detail={`${Array.isArray(workflow.steps) ? workflow.steps.length : 0} Steps · ${bot.name}`} />);
            })}
            {!defs.some((def) => def.kind === 'bot' && Array.isArray(def.body.workflows) && def.body.workflows.length) && <Empty text="No Workflows yet." />}
            </>}
          </>
        )}
      </ScrollView>
    <BotBuilder visible={builder} scope={scope} existingArtifacts={dataDefs.map((def) => ({ id: def.id.replace(/^data_/, ''), name: def.name, fields: Array.isArray(def.body.fields) ? def.body.fields.map(String) : [] }))} onClose={() => setBuilder(false)} onCreate={createFromDraft} />
      <Modal visible={newData} transparent animationType="fade">
        <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New record type</Text>
            <TextInput autoFocus value={name} onChangeText={setName} placeholder="Name, for example Products" style={styles.input} />
            <TextInput value={fields} onChangeText={setFields} placeholder="Fields, separated by commas" style={styles.input} />
            <View style={styles.sheetActions}>
              <TouchableOpacity onPress={() => setNewData(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void saveData()}>
                <Text style={styles.save}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.drawerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFiltersOpen(false)} accessibilityLabel="Close filters" />
          <View style={[styles.filterDrawer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHeader}><Text style={styles.drawerTitle}>Filter records</Text>{selectedStatuses.length > 0 && <TouchableOpacity onPress={() => setSelectedStatuses([])}><Text style={styles.clearFilters}>Clear</Text></TouchableOpacity>}</View>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.filterChips}>{recordStatuses.map((status) => {
              const selected = selectedStatuses.includes(status);
              return <TouchableOpacity key={status} onPress={() => setSelectedStatuses((current) => selected ? current.filter((item) => item !== status) : [...current, status])} style={[styles.filterChip, selected && styles.filterChipActive]} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}><Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{recordStatus(status)}</Text></TouchableOpacity>;
            })}</View>
            <TouchableOpacity style={styles.drawerDone} onPress={() => setFiltersOpen(false)}><Text style={styles.drawerDoneText}>Done</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
      <RecordProfile scope={scope} record={selectedRecord} definitions={defs} onClose={() => setSelectedRecord(null)} onOpenWorkflow={(workflow) => { setSelectedRecord(null); setFlow(workflow); }} />
      <WorkflowFlow scope={scope} run={flow} definitions={defs} onClose={() => setFlow(null)} onFinished={() => { setFlow(null); void reload(); }} />
    </View>
  );
}
function Section({ cards, onStart }: { cards: { id: string; title: string; botId: string; workflowId: string; stepId: string; mode: string }[]; onStart: (card: { botId: string; workflowId: string; stepId: string }) => void }) { return <View style={styles.actionList}>{cards.map((card) => <TouchableOpacity key={card.id} style={styles.actionRow} onPress={() => onStart(card)}><Ionicons name="add" size={23} color="#5f6368" /><Text style={styles.actionTitle} numberOfLines={1}>{card.title}</Text><Ionicons name="chevron-forward" size={19} color="#777777" /></TouchableOpacity>)}</View>; }
function Row({ title, detail }: { title: string; detail: string }) { return <View style={styles.row}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDetail}>{detail}</Text></View>; }
function Empty({ text }: { text: string }) { return <Text style={styles.empty}>{text}</Text>; }
function InlineLoading() { return <View style={styles.inlineLoading}><ActivityIndicator color="#1a73e8" /></View>; }
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  inlineLoading: { minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  headerContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  topRow: { minHeight: 48, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandTouch: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  brand: { fontSize: 20, fontWeight: '800', color: '#202124' },
  headerDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#eee', width: '100%' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 8, gap: 20, alignItems: 'center' },
  buildTabs: { flexDirection: 'row', gap: 18, marginBottom: 12, flexWrap: 'wrap' },
  buildTab: { paddingVertical: 5 },
  buildTabText: { color: '#5f6368', fontSize: 14, fontWeight: '700' },
  tabButton: { paddingVertical: 4 },
  tab: { fontSize: 15, fontWeight: '600', color: '#5f6368' },
  active: { color: '#1a73e8', fontWeight: '700' },
  content: { paddingHorizontal: 28, paddingTop: 16 },
  workContent: { paddingHorizontal: 0, paddingTop: 6 },
  heading: { fontSize: 34, lineHeight: 40, fontWeight: '700', color: '#202124', marginTop: 20 },
  subheading: { fontSize: 17, lineHeight: 25, color: '#6b7078', marginTop: 8, marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#202124', marginTop: 23, marginBottom: 10 },
  card: { borderWidth: 1, borderColor: '#e8eaed', borderRadius: 10, padding: 16, marginBottom: 10, backgroundColor: '#fff' },
  actionList: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ededed' },
  actionRow: { minHeight: 60, paddingHorizontal: 28, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e5e5', flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionTitle: { flex: 1, color: '#202124', fontSize: 17, fontWeight: '600' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#202124' },
  cardDetail: { fontSize: 14, color: '#5f6368', marginTop: 5 },
  inboxEmpty: { alignItems: 'flex-start', paddingTop: 28 },
  inboxEmptyTitle: { color: '#202124', fontSize: 18, fontWeight: '700', marginTop: 10 },
  inboxEmptyDetail: { color: '#70757a', fontSize: 15, marginTop: 4 },
  recordControls: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  searchBox: { flex: 1, minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: '#dadce0', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, color: '#202124', fontSize: 16, paddingVertical: 9 },
  filterButton: { width: 44, height: 44, borderWidth: 1, borderColor: '#dadce0', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  filterIndicator: { position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: '#1a73e8', borderWidth: 1, borderColor: '#fff' },
  filterLabel: { color: '#202124', fontSize: 14, fontWeight: '700' },
  clearFilters: { color: '#1a73e8', fontSize: 14, fontWeight: '700' },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { borderWidth: 1, borderColor: '#dadce0', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  filterChipActive: { backgroundColor: '#e8f0fe', borderColor: '#1a73e8' },
  filterChipText: { color: '#5f6368', fontSize: 14, fontWeight: '600' },
  filterChipTextActive: { color: '#174ea6' },
  drawerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0004' },
  filterDrawer: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 24, paddingTop: 10 },
  drawerHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#dadce0', marginBottom: 18 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  drawerTitle: { color: '#202124', fontSize: 18, fontWeight: '700' },
  drawerDone: { backgroundColor: '#1a73e8', borderRadius: 8, alignItems: 'center', justifyContent: 'center', minHeight: 46, marginTop: 24 },
  drawerDoneText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  recordGroup: { marginTop: 12 },
  recordGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  recordGroupTitle: { color: '#202124', fontSize: 16, fontWeight: '700' },
  recordGroupCount: { color: '#70757a', fontSize: 14, fontWeight: '600' },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f0f0f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowCopy: { flex: 1 },
  rowTitle: { fontSize: 17, fontWeight: '600', color: '#202124' },
  rowDetail: { fontSize: 14, color: '#70757a', marginTop: 3 },
  empty: { fontSize: 16, color: '#70757a', paddingVertical: 24 },
  primary: { backgroundColor: '#1a73e8', paddingHorizontal: 17, paddingVertical: 13, borderRadius: 6, alignSelf: 'flex-start', marginTop: 6 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondary: { paddingVertical: 15, alignSelf: 'flex-start' },
  secondaryText: { color: '#1a73e8', fontSize: 15, fontWeight: '700' },
  notice: { backgroundColor: '#fce8e6', padding: 12, borderRadius: 8 },
  noticeText: { color: '#a50e0e' },
  overlay: { flex: 1, backgroundColor: '#0005', justifyContent: 'center', paddingHorizontal: 24 },
  sheet: { backgroundColor: '#fff', borderRadius: 12, padding: 22 },
  sheetTitle: { fontSize: 22, fontWeight: '700', color: '#202124', marginBottom: 18 },
  input: { borderBottomWidth: 1, borderColor: '#dadce0', fontSize: 16, paddingVertical: 11, marginBottom: 14, color: '#202124' },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 25, marginTop: 10 },
  cancel: { color: '#5f6368', fontWeight: '700' },
  save: { color: '#1a73e8', fontWeight: '700' },
});
