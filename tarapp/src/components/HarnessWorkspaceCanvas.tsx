import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ActionInterfaceHost from '@/action-interfaces/ActionInterfaceHost';
import RecordDetailModal from '@/components/RecordDetailModal';
import SearchRecordsModal from '@/components/SearchRecordsModal';
import SiteScreen from '@/components/site';
import WorkspaceTeam from '@/components/WorkspaceTeam';
import { createOperationKey, harness, type HarnessAction, type HarnessCanvasCard, type HarnessFlowBook, type HarnessFlowRun, type HarnessInterfaceContract, type HarnessRecord, type HarnessSpaceContext, type HarnessSpaceSection, type HarnessWorkspace } from '@/lib/harness';

export type WorkspaceTab = 'space' | 'flows';
interface Props { tab: WorkspaceTab; scope: string; workspaceName: string; role: 'owner' | 'admin' | 'member' | 'guest'; workspaces: HarnessWorkspace[]; onSelectWorkspace: (slug: string) => void; onCreateWorkspace: () => void; underHeader?: boolean; }
interface OpenAction { action: HarnessAction; scope: string; input?: Record<string, unknown>; title?: string; }

const flowPublishAction: HarnessAction = {
  id: 'flow.publish', version: 3, type: 'app', title: 'Create Flow Book',
  description: 'Publish a reusable ordered process for this workspace.', interfaceKey: 'flow-builder',
  fields: [], output: [], roles: ['owner', 'admin'], effects: ['definition_publish', 'canvas_update'],
};
const flowBuilderContract: HarnessInterfaceContract = { key: 'flow-builder', version: 1, title: 'Flow builder', presentation: 'screen', submitLabel: 'Create Flow' };

const colors = { ink: '#1B1C20', muted: '#626671', faint: '#8B8F99', line: '#D8DBE3', wash: '#F1F3F8', surface: '#FFFFFF', container: '#EAEFF7', outline: '#C9D2E0', blue: '#3157A8', selected: '#173673', selectedWash: '#DCE5FF', green: '#18865B', amber: '#A66D00', personal: '#D5654F' };
const titleCase = (value: string) => value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const stateColor = (state: string) => {
  const s = state.toLowerCase();
  if (s === 'ready' || s === 'active' || s === 'completed' || s === 'won' || s === 'paid' || s === 'live') return colors.green;
  if (s === 'preparing' || s === 'pending' || s === 'open' || s === 'draft') return colors.amber;
  if (s === 'failed' || s === 'cancelled' || s === 'lost' || s === 'archived') return '#D54F4F';
  return colors.muted;
};

type SpacePayload = { sections: HarnessSpaceSection[]; context: HarnessSpaceContext | null; decision: 'automatic' | 'confirm'; alternatives: HarnessSpaceContext[] };
type FlowPayload = { books: HarnessFlowBook[]; runs: HarnessFlowRun[] };
type RegistryPayload = { actions: HarnessAction[]; interfaces: HarnessInterfaceContract[] };
type RecordsPayload = { records: HarnessRecord[]; next: number | null };
type CachedPayload = SpacePayload | FlowPayload | RegistryPayload | RecordsPayload;

// Reuses cached workspace data when returning from Now and refreshes in the background.
const payloadCache = new Map<string, CachedPayload>();
export function clearWorkspacePayloadCache() { payloadCache.clear(); }
const cacheKey = (personalId: string | undefined, key: string) => personalId ? `${personalId}:${key}` : null;
const cached = <T extends CachedPayload>(personalId: string | undefined, key: string): T | undefined => {
  const identityKey = cacheKey(personalId, key);
  return identityKey ? payloadCache.get(identityKey) as T | undefined : undefined;
};
const cache = (personalId: string | undefined, key: string, value: CachedPayload) => {
  const identityKey = cacheKey(personalId, key);
  if (identityKey) payloadCache.set(identityKey, value);
};
const flowsKey = (scope: string) => `flows:${scope}`;
const registryKey = (scope: string) => `registry:${scope}`;
const recordsKey = (scope: string) => `records:${scope}`;

export default function HarnessWorkspaceCanvas({ tab, scope, workspaceName, role, workspaces, onSelectWorkspace, onCreateWorkspace, underHeader = false }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const personalId = workspaces.find((item) => item.mode === 'personal')?.id;
  const [teamOpen, setTeamOpen] = useState(false);
  const [siteOpen, setSiteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HarnessRecord | null>(null);
  const [selectedRecordScope, setSelectedRecordScope] = useState(scope);
  const [searchOpen, setSearchOpen] = useState(false);
  const spaceSeed = cached<SpacePayload>(personalId, 'space');
  const flowSeed = cached<FlowPayload>(personalId, flowsKey(scope));
  const registrySeed = cached<RegistryPayload>(personalId, registryKey(scope));
  const recordsSeed = cached<RecordsPayload>(personalId, recordsKey(scope));
  const [sections, setSections] = useState<HarnessSpaceSection[]>(spaceSeed?.sections ?? []);
  const [spaceContext, setSpaceContext] = useState<HarnessSpaceContext | null>(spaceSeed?.context ?? null);
  const [spaceDecision, setSpaceDecision] = useState<'automatic' | 'confirm'>(spaceSeed?.decision ?? 'automatic');
  const [spaceAlternatives, setSpaceAlternatives] = useState<HarnessSpaceContext[]>(spaceSeed?.alternatives ?? []);
  const [records, setRecords] = useState<HarnessRecord[]>(recordsSeed?.records ?? []);
  const [recordNext, setRecordNext] = useState<number | null>(recordsSeed?.next ?? null);
  const [loadingMoreRecords, setLoadingMoreRecords] = useState(false);
  const [spaceRecords, setSpaceRecords] = useState<'all' | 'contacts' | null>(null);
  const [spaceFlows, setSpaceFlows] = useState(false);
  const [books, setBooks] = useState<HarnessFlowBook[]>(flowSeed?.books ?? []);
  const [flowRuns, setFlowRuns] = useState<HarnessFlowRun[]>(flowSeed?.runs ?? []);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [routineRecords, setRoutineRecords] = useState<HarnessRecord[]>([]);
  const [routineLoading, setRoutineLoading] = useState(false);
  const [routineError, setRoutineError] = useState('');
  const [actions, setActions] = useState<HarnessAction[]>(registrySeed?.actions ?? []);
  const [interfaces, setInterfaces] = useState<HarnessInterfaceContract[]>(registrySeed?.interfaces ?? []);
  const [openAction, setOpenAction] = useState<OpenAction | null>(null);
  const [loading, setLoading] = useState(!(tab === 'flows' ? flowSeed : spaceSeed));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const currentScope = useRef(scope);
  const selectRecord = (record: HarnessRecord, recordScope = scope) => {
    setSelectedRecordScope(recordScope);
    setSelectedRecord(record);
  };

  const reload = useCallback(async (silent = false) => {
    if (currentScope.current !== scope) return;
    if (!silent) { setLoading(true); setError(''); }
    try {
      const [registry, nextSpace, nextRecords, flowData] = await Promise.all([
        tab === 'flows' || (tab === 'space' && (spaceRecords || spaceFlows)) ? harness.workspaceRegistry(scope) : Promise.resolve(null),
        tab === 'space' ? harness.space() : Promise.resolve(null),
        tab === 'space' && spaceRecords ? harness.records(scope) : Promise.resolve(null),
        tab === 'flows' || (tab === 'space' && spaceFlows) ? harness.flows(scope) : Promise.resolve(null),
      ]);
      if (currentScope.current !== scope) return;
      if (nextSpace) {
        setError('');
        const payload: SpacePayload = { sections: nextSpace.sections, context: nextSpace.context, decision: nextSpace.decision, alternatives: nextSpace.alternatives };
        cache(personalId, 'space', payload);
        setSections(nextSpace.sections);
        setSpaceContext(nextSpace.context);
        setSpaceDecision(nextSpace.decision);
        setSpaceAlternatives(nextSpace.alternatives);
        if (nextSpace.decision === 'automatic' && nextSpace.context.workspace.slug !== scope) onSelectWorkspace(nextSpace.context.workspace.slug);
      }
      if (nextRecords) { cache(personalId, recordsKey(scope), { records: nextRecords.records, next: nextRecords.next }); setRecords(nextRecords.records); setRecordNext(nextRecords.next); }
      if (flowData) { cache(personalId, flowsKey(scope), { books: flowData.books, runs: flowData.runs }); setBooks(flowData.books); setFlowRuns(flowData.runs); }
      if (registry) { cache(personalId, registryKey(scope), { actions: registry.actions, interfaces: registry.interfaces }); setActions(registry.actions); setInterfaces(registry.interfaces); }
    } catch (cause) {
      if (currentScope.current !== scope) return;
      if (tab === 'space') setSections([]);
      setError(cause instanceof Error ? cause.message : 'Could not load this workspace.');
    } finally {
      if (!silent && currentScope.current === scope) setLoading(false);
    }
  }, [scope, tab, spaceRecords, spaceFlows, onSelectWorkspace, personalId]);

  const [seededScope, setSeededScope] = useState(scope);
  if (seededScope !== scope) {
    setSeededScope(scope);
    const flows = cached<FlowPayload>(personalId, flowsKey(scope));
    const registry = cached<RegistryPayload>(personalId, registryKey(scope));
    const page = cached<RecordsPayload>(personalId, recordsKey(scope));
    setBooks(flows?.books ?? []);
    setFlowRuns(flows?.runs ?? []);
    setActions(registry?.actions ?? []);
    setInterfaces(registry?.interfaces ?? []);
    setRecords(page?.records ?? []);
    setRecordNext(page?.next ?? null);
    setSpaceRecords(null);
    setSpaceFlows(false);
    setBrowseOpen(false);
  }

  useEffect(() => {
    currentScope.current = scope;
    const seedKey = tab === 'flows' ? flowsKey(scope) : 'space';
    const key = cacheKey(personalId, seedKey);
    const timer = setTimeout(() => { void reload(Boolean(key && payloadCache.has(key))); }, 0);
    return () => clearTimeout(timer);
  }, [reload, tab, scope, personalId]);
  useEffect(() => { const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void reload(true); }); return () => subscription.remove(); }, [reload]);
  useEffect(() => {
    if (tab !== 'space' || spaceRecords || spaceFlows) return;
    const timer = setInterval(() => { if (AppState.currentState === 'active') void reload(true); }, 60_000);
    return () => clearInterval(timer);
  }, [tab, spaceRecords, spaceFlows, reload]);

  const open = (actionScope: string, actionId: string, input?: Record<string, unknown>, title?: string) => {
    void (async () => {
      try {
        const registry = await harness.workspaceRegistry(actionScope);
        const action = registry.actions.find((item) => item.id === actionId);
        if (!action) {
          Alert.alert('Action unavailable', 'Your role cannot perform this action.');
          return;
        }
        setInterfaces(registry.interfaces);
        if (actionScope === scope) setActions(registry.actions);
        setOpenAction({ action, scope: actionScope, input, title });
      } catch (cause) {
        Alert.alert('Could not open action', cause instanceof Error ? cause.message : 'Try again.');
      }
    })();
  };

  const openCard = (card: HarnessCanvasCard) => {
    const source = spaceContext?.workspace.slug || scope;
    if (card.kind === 'action') open(source, card.actionId, card.initialInput, card.title);
    else if (card.kind === 'flow') open(source, card.actionId || 'flow.start', card.initialInput || { flowId: card.flowId }, card.title);
    else if (card.kind === 'now') router.push('/(home)/now');
  };

  const handleCreateRecord = (category?: string) => {
    if (category === 'orders') open(scope, 'pos.open', { section: 'sell' }, 'New Order / Sale');
    else if (category === 'tasks') open(scope, 'task.create', {}, 'New Task');
    else if (category === 'contacts') Alert.alert('Add a contact', 'Choose the identity to add.', [
      ...(actions.some((action) => action.id === 'contact.create') ? [{ text: 'Person', onPress: () => open(scope, 'contact.create', {}, 'Add person') }] : []),
      ...(actions.some((action) => action.id === 'organization.create') ? [{ text: 'Organization', onPress: () => open(scope, 'organization.create', {}, 'Add organization') }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
    else if (category === 'products') open(scope, 'pos.product.create', {}, 'New Product');
    else open(scope, 'record.create', {}, 'New Record');
  };

  const loadMoreRecords = async () => {
    if (recordNext === null || loadingMoreRecords) return;
    setLoadingMoreRecords(true);
    try {
      const page = await harness.records(scope, undefined, recordNext);
      if (currentScope.current === scope) {
        setRecords((current) => {
          const known = new Set(current.map((record) => record.id));
          return [...current, ...page.records.filter((record) => !known.has(record.id))];
        });
        setRecordNext(page.next);
      }
    } catch (cause) {
      Alert.alert('Could not load more records', cause instanceof Error ? cause.message : 'Try again.');
    } finally {
      setLoadingMoreRecords(false);
    }
  };

  const canCreateRecord = (category?: string) => {
    const eligible = new Set(actions.map((action) => action.id));
    if (category === 'orders') return eligible.has('pos.open');
    if (category === 'contacts') return eligible.has('contact.create') || eligible.has('organization.create');
    if (category === 'products') return eligible.has('pos.product.create');
    if (category === 'tasks') return eligible.has('task.create');
    return eligible.has('record.create');
  };

  const chooseArea = (slug: string, chosenRole?: string) => {
    if (slug === 'all') return;
    if (tab === 'space') {
      void harness.holdContext(slug, 43_200_000, chosenRole).then(() => {
        onSelectWorkspace(slug);
        if (slug === scope) void reload();
      }).catch((cause) => Alert.alert('Could not hold this Space', cause instanceof Error ? cause.message : 'Try again.'));
      return;
    }
    onSelectWorkspace(slug);
  };
  const resumeAutomaticContext = () => {
    void harness.resumeContext().then(() => { void reload(); })
      .catch((cause) => Alert.alert('Could not resume automatic Space', cause instanceof Error ? cause.message : 'Try again.'));
  };
  const activeWorkspace = workspaces.find((item) => item.slug === scope) || workspaces[0];
  const canManageSite = activeWorkspace?.mode === 'work' && (role === 'owner' || role === 'admin');
  const workspaceSources = workspaces.map((workspace) => ({ workspace, tasks: [], orders: [] }));
  const contextTitle = spaceDecision === 'confirm' ? 'Choose a Space' : spaceContext?.label || workspaceName;
  const contextWorkspaceName = spaceContext ? (spaceContext.workspace.mode === 'personal' ? 'Personal' : spaceContext.workspace.name) : '';
  const contextMeta = spaceDecision === 'confirm'
    ? [activeWorkspace?.mode === 'personal' ? 'Personal' : activeWorkspace?.name || workspaceName,
      titleCase(activeWorkspace?.workRole || role), `Owner: ${activeWorkspace?.owner || 'Workspace owner'}`].join(' · ')
    : spaceContext ? [contextWorkspaceName, spaceContext.role, `Owner: ${spaceContext.owner}`].join(' · ') : null;
  const configureRoutine = (existing?: HarnessRecord) => {
    const personal = workspaces.find((item) => item.mode === 'personal');
    if (!personal) { Alert.alert('Personal is unavailable', 'Refresh your workspaces and try again.'); return; }
    const clock = new Date();
    const time = (offset: number) => `${String((clock.getHours() + offset) % 24).padStart(2, '0')}:${String(clock.getMinutes()).padStart(2, '0')}`;
    const source = spaceDecision === 'confirm' ? scope : spaceContext?.workspace.slug || scope;
    const targetWorkspace = workspaces.find((item) => item.slug === source) || activeWorkspace;
    let input: Record<string, unknown> = {
      label: spaceDecision === 'confirm' ? targetWorkspace?.name || workspaceName : spaceContext?.label || targetWorkspace?.name || 'Work', workspace: source,
      role: spaceDecision === 'confirm' ? targetWorkspace?.workRole || '' : spaceContext?.role || targetWorkspace?.workRole || '',
      start: time(0), end: time(1), days: '0,1,2,3,4,5,6', priority: 0,
    };
    if (existing) {
      input = { id: existing.id, baseVersion: existing.version, label: existing.title, workspace: existing.data.workspace,
        role: existing.data.role || '', start: existing.data.start, end: existing.data.end,
        days: Array.isArray(existing.data.days) ? existing.data.days.join(',') : '0,1,2,3,4,5,6',
        priority: existing.data.priority ?? 0 };
    }
    setScheduleOpen(false);
    open(personal.slug, 'routine.save', input, existing ? 'Edit Space routine' : 'Schedule Space');
  };
  const loadRoutines = async () => {
    const personal = workspaces.find((item) => item.mode === 'personal');
    if (!personal) { setRoutineError('Personal is unavailable. Refresh your workspaces and try again.'); return; }
    setRoutineLoading(true); setRoutineError('');
    try {
      const all: HarnessRecord[] = [];
      let offset: number | null = 0;
      while (offset !== null) {
        const page = await harness.records(personal.slug, 'routine', offset);
        all.push(...page.records);
        offset = page.next;
      }
      setRoutineRecords(all);
    } catch (cause) { setRoutineError(cause instanceof Error ? cause.message : 'Could not load routines.'); }
    finally { setRoutineLoading(false); }
  };
  const scheduleRoutine = () => { setScheduleOpen(true); void loadRoutines(); };
  const removeRoutine = (record: HarnessRecord) => {
    const personal = workspaces.find((item) => item.mode === 'personal');
    if (!personal) return;
    Alert.alert('Remove Space routine?', `Remove “${record.title}” from your schedule?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        void harness.executeAction(personal.slug, 'routine.remove', { id: record.id, baseVersion: record.version }, createOperationKey(`routine.remove:${record.id}`))
          .then(async () => { await loadRoutines(); await reload(true); })
          .catch((cause) => Alert.alert('Could not remove routine', cause instanceof Error ? cause.message : 'Try again.'));
      } },
    ]);
  };
  return (
      <View style={styles.page}>
      {teamOpen ? <WorkspaceTeam key={scope} scope={scope} name={workspaceName} onClose={() => setTeamOpen(false)} onChanged={() => { void reload(true); }} /> : null}
      {tab === 'flows' ? (
        <View style={[styles.tabBody, { paddingTop: underHeader ? 0 : insets.top }]}>
          <WorkspaceHeader sources={workspaceSources} value={scope} onChange={chooseArea} onCreate={onCreateWorkspace} onSearch={() => setSearchOpen(true)} onSettings={() => router.push('/settings')} showMembers={activeWorkspace?.mode === 'work'} onMembers={() => setTeamOpen(true)} title={workspaceName} />
          <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          <FlowBooks
            books={books}
            runs={flowRuns}
            canCreate={role === 'owner' || role === 'admin'}
            onCreate={() => setOpenAction({ action: flowPublishAction, scope, input: {}, title: 'Create a reusable process' })}
            onStart={(flowId, title) => open(scope, 'flow.start', { flowId }, title)}
            onResume={(run) => open(scope, 'flow.start', { flowId: run.flowId, runId: run.id }, run.name || 'Continue Flow Book')}
          />
          </ScrollView>
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.tabBody} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void reload(true).finally(() => setRefreshing(false)); }} />} style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: (underHeader ? 0 : insets.top) + 12, paddingBottom: insets.bottom + 24 }]}>
          {tab === 'space' && !spaceRecords && !spaceFlows && activeWorkspace ? <WorkspaceHeader sources={workspaceSources} value={scope} onChange={chooseArea} onCreate={onCreateWorkspace} onSearch={() => setSearchOpen(true)} onSettings={() => router.push('/settings')} showMembers={activeWorkspace.mode === 'work'} onMembers={() => setTeamOpen(true)} title={contextTitle} meta={contextMeta} chips={[{ label: 'Schedule', onPress: scheduleRoutine }, ...(spaceContext?.held ? [{ label: 'Auto', onPress: resumeAutomaticContext }] : [])]} /> : null}
          {tab === 'space' && !spaceRecords && !spaceFlows && spaceDecision === 'confirm' && spaceContext ? <View style={styles.contextQuestion}>
            <Text style={styles.contextQuestionTitle}>Which Space are you in now?</Text>
            {[spaceContext, ...spaceAlternatives].map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => chooseArea(item.workspace.slug, item.role)} style={styles.contextOption}>
              <Text style={styles.contextOptionTitle}>{item.label}</Text><Text style={styles.contextOptionMeta}>{item.workspace.name} · {item.role} · Owner: {item.owner}</Text>
            </Pressable>)}
          </View> : null}

          {error ? <Pressable style={styles.error} onPress={() => { setLoading(true); void reload(); }}><Text style={styles.errorText}>{error} Tap to retry.</Text></Pressable> : null}

          {loading && tab !== 'space' ? (
            <View style={styles.center}><ActivityIndicator color={colors.blue} /></View>
          ) : (
            <>
              {tab === 'space' && loading ? <View style={styles.progress}><ActivityIndicator size="small" color={colors.blue} /><Text style={styles.progressText}>Loading this space…</Text></View> : null}
              {tab === 'space' ? spaceRecords ? (
                <RecordsSection
                  key={spaceRecords}
                  scope={scope}
                  mode={activeWorkspace?.mode === 'personal' ? 'personal' : 'work'}
                  records={records}
                  initialFilter={spaceRecords}
                  hasMore={spaceRecords === 'all' && recordNext !== null}
                  isLoading={loading}
                  loadError={error}
                  loadingMore={loadingMoreRecords}
                  onLoadMore={() => void loadMoreRecords()}
                  onRetry={() => { setLoading(true); void reload(); }}
                  canCreate={canCreateRecord}
                  onSelectRecord={(record) => selectRecord(record)}
                  onCreateRecord={handleCreateRecord}
                  onBack={() => setSpaceRecords(null)}
                />
              ) : spaceFlows ? (
                <FlowBooks
                  books={books}
                  runs={flowRuns}
                  canCreate={role === 'owner' || role === 'admin'}
                  onCreate={() => setOpenAction({ action: flowPublishAction, scope, input: {}, title: 'Create a reusable process' })}
                  onStart={(flowId, title) => open(scope, 'flow.start', { flowId }, title)}
                  onResume={(run) => open(scope, 'flow.start', { flowId: run.flowId, runId: run.id }, run.name || 'Continue Flow Book')}
                  onBack={() => setSpaceFlows(false)}
                />
              ) : (
                <>
                  <SpaceSections sections={sections} onOpen={openCard} />
                  {!sections.length && !loading && !error ? <View style={styles.spaceEmptyState}>
                    <View style={styles.spaceEmptyMark}><Ionicons name="layers-outline" size={26} color={colors.faint} /></View>
                    <Text style={styles.spaceEmptyTitle}>Nothing needs attention here.</Text>
                    <Text style={styles.spaceEmptyHint}>Urgent signals, next actions and active Flow Books appear here as they happen.</Text>
                  </View> : null}
                  <View style={styles.browseSection}>
                    <Pressable accessibilityRole="button" accessibilityState={{ expanded: browseOpen }} onPress={() => setBrowseOpen((current) => !current)} style={styles.browseTrigger}>
                      <Text style={styles.browseTitle}>Browse workspace</Text>
                      <Ionicons name={browseOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.faint} />
                    </Pressable>
                    {browseOpen ? <View style={styles.browseList}>
                      <TouchableOpacity style={styles.browseRow} onPress={() => setSpaceRecords('all')} accessibilityRole="button">
                        <View style={[styles.browseIcon, { backgroundColor: '#EEF2FB' }]}><Ionicons name="folder-outline" size={17} color={colors.blue} /></View>
                        <Text style={styles.browseRowTitle}>Records</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.faint} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.browseRow} onPress={() => setSpaceRecords('contacts')} accessibilityRole="button">
                        <View style={[styles.browseIcon, { backgroundColor: '#E8F5EE' }]}><Ionicons name="people-outline" size={17} color={colors.green} /></View>
                        <Text style={styles.browseRowTitle}>Contacts</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.faint} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.browseRow} onPress={() => setSpaceFlows(true)} accessibilityRole="button">
                        <View style={[styles.browseIcon, { backgroundColor: '#FFF6E3' }]}><Ionicons name="git-branch-outline" size={17} color={colors.amber} /></View>
                        <Text style={styles.browseRowTitle}>Flow Books</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.faint} />
                      </TouchableOpacity>
                      {canManageSite ? <TouchableOpacity style={styles.browseRow} onPress={() => setSiteOpen(true)} accessibilityRole="button">
                        <View style={[styles.browseIcon, { backgroundColor: '#F1ECFA' }]}><Ionicons name="globe-outline" size={17} color="#6D45C5" /></View>
                        <Text style={styles.browseRowTitle}>Site Studio</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.faint} />
                      </TouchableOpacity> : null}
                    </View> : null}
                  </View>
                </>
              ) : null}
            </>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      )}

      <Modal visible={scheduleOpen} transparent animationType="slide" presentationStyle="overFullScreen" statusBarTranslucent onRequestClose={() => setScheduleOpen(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setScheduleOpen(false)} accessibilityRole="button" accessibilityLabel="Close Space schedule" />
          <View style={[styles.scheduleSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Space schedule</Text>
              <Pressable onPress={() => setScheduleOpen(false)} style={styles.sheetClose} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>
            <Text style={styles.scheduleHint}>Routines are saved in Personal. Space switches automatically when one routine has the highest priority.</Text>
            <Pressable accessibilityRole="button" onPress={() => configureRoutine()} style={styles.scheduleAdd}>
              <Ionicons name="add-circle-outline" size={20} color={colors.blue} />
              <Text style={styles.scheduleAddText}>Add routine</Text>
            </Pressable>
            {routineLoading ? <View style={styles.progress}><ActivityIndicator size="small" color={colors.blue} /><Text style={styles.progressText}>Loading routines…</Text></View> : null}
            {routineError ? <Pressable accessibilityRole="button" onPress={() => void loadRoutines()} style={styles.error}><Text style={styles.errorText}>{routineError} Tap to retry.</Text></Pressable> : null}
            {!routineLoading && !routineError && !routineRecords.length ? <Text style={styles.empty}>No routines scheduled yet.</Text> : null}
            <ScrollView style={styles.scheduleList} showsVerticalScrollIndicator={false}>
              {routineRecords.map((record) => {
                const workspace = workspaces.find((item) => item.slug === record.data.workspace || item.id === record.data.workspace);
                const days = Array.isArray(record.data.days) ? record.data.days.join(', ') : 'Every day';
                return <View key={record.id} style={styles.routineRow}>
                  <View style={styles.routineCopy}>
                    <Text style={styles.parentTitle}>{record.title}</Text>
                    <Text style={styles.scheduleHint}>{workspace?.name || String(record.data.workspace || 'Unavailable workspace')} · {String(record.data.start || '')}–{String(record.data.end || '')}</Text>
                    <Text style={styles.scheduleHint}>Days: {days} · Priority: {String(record.data.priority ?? 0)}</Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${record.title}`} onPress={() => configureRoutine(record)} style={styles.scheduleControl}><Ionicons name="create-outline" size={19} color={colors.blue} /></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${record.title}`} onPress={() => removeRoutine(record)} style={styles.scheduleControl}><Ionicons name="trash-outline" size={19} color="#B42318" /></Pressable>
                </View>;
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ActionInterfaceHost
        action={openAction?.action || null}
        contracts={interfaces.some((item) => item.key === flowBuilderContract.key) ? interfaces : [...interfaces, flowBuilderContract]}
        scope={openAction?.scope || scope}
        initialInput={openAction?.input}
        contextTitle={openAction?.title}
        onClose={() => setOpenAction(null)}
        onSuccess={() => { setOpenAction(null); void reload(true); }}
      />

      <RecordDetailModal
        visible={Boolean(selectedRecord)}
        record={selectedRecord}
        scope={selectedRecordScope}
        onClose={() => setSelectedRecord(null)}
        onAction={(actId, inp, tit) => open(selectedRecordScope, actId, inp, tit)}
      />

      <SearchRecordsModal
        visible={searchOpen}
        scope={scope}
        onClose={() => setSearchOpen(false)}
        onSelect={(record) => { selectRecord(record); setSearchOpen(false); }}
      />

      <SiteScreen
        visible={siteOpen}
        onClose={() => { setSiteOpen(false); void reload(true); }}
        workspaceName={workspaceName}
        subdomain={scope}
        scope={scope}
      />
    </View>
  );
}

function WorkspaceHeader({ sources, value, onChange, onCreate, onSearch, onSettings, showMembers = false, onMembers, title, meta = null, chips }: { sources: { workspace: HarnessWorkspace }[]; value: string; onChange: (slug: string) => void; onCreate: () => void; onSearch: () => void; onSettings: () => void; showMembers?: boolean; onMembers: () => void; title: string; meta?: string | null; chips?: { label: string; onPress: () => void }[] }) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const sheetMaxHeight = Math.min(520, screenHeight * 0.72);
  const choose = (slug: string) => { onChange(slug); setOpen(false); };

  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => setOpen(true)} style={styles.headerTitleButton} accessibilityRole="button" accessibilityLabel={`Switch workspace. Current: ${title}${meta ? `. ${meta}` : ''}`} accessibilityState={{ expanded: open }}>
          <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
          <Ionicons name="chevron-down" size={13} color={colors.faint} />
        </TouchableOpacity>
        <View style={styles.workspaceActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Search contacts and records" onPress={onSearch} style={styles.headerIconButton}><Ionicons name="search-outline" size={19} color={colors.blue} /></Pressable>
          {showMembers ? <Pressable accessibilityRole="button" accessibilityLabel="Open Members and chat" onPress={onMembers} style={styles.headerIconButton}><Ionicons name="people-outline" size={19} color={colors.blue} /></Pressable> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Open Settings" onPress={onSettings} style={styles.headerIconButton}><Ionicons name="settings-outline" size={19} color={colors.blue} /></Pressable>
        </View>
      </View>
      {meta || (chips && chips.length) ? <View style={styles.headerMetaRow}>
        {meta ? <Text style={styles.headerMeta}>{meta}</Text> : <View style={styles.headerMetaSpacer} />}
        {chips && chips.length ? <View style={styles.headerChips}>
          {chips.map((chip) => <Pressable key={chip.label} accessibilityRole="button" onPress={chip.onPress} style={styles.headerChip}><Text style={styles.headerChipText}>{chip.label}</Text></Pressable>)}
        </View> : null}
      </View> : null}
      <View style={styles.headerDivider} />
      <Modal visible={open} transparent animationType="slide" presentationStyle="overFullScreen" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close workspace switcher" />
          <View style={[styles.workspaceSheet, { maxHeight: sheetMaxHeight, paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Switch workspace</Text>
              <Pressable onPress={() => setOpen(false)} style={styles.sheetClose} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView style={[styles.workspaceList, { maxHeight: Math.max(120, sheetMaxHeight - 150 - insets.bottom) }]} showsVerticalScrollIndicator={false}>
              {sources.map(({ workspace }) => {
                const selectedWorkspace = value === workspace.slug;
                return <TouchableOpacity key={workspace.id} activeOpacity={0.7} onPress={() => choose(workspace.slug)} style={[styles.workspaceOption, selectedWorkspace && styles.workspaceOptionSelected]} accessibilityRole="button" accessibilityState={{ selected: selectedWorkspace }}>
                  <Text numberOfLines={1} style={[styles.workspaceOptionText, selectedWorkspace && styles.workspaceOptionTextSelected]}>{workspace.mode === 'personal' ? 'Personal' : workspace.name}</Text>
                  {selectedWorkspace ? <Ionicons name="checkmark-circle" size={20} color={colors.blue} /> : null}
                </TouchableOpacity>;
              })}
            </ScrollView>
            <TouchableOpacity activeOpacity={0.7} onPress={() => { setOpen(false); onCreate(); }} style={styles.createWorkspaceOption} accessibilityRole="button">
              <Ionicons name="add-circle-outline" size={20} color={colors.blue} />
              <Text style={styles.createWorkspaceText}>Create workspace</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FlowBooks({ books, runs, canCreate, onCreate, onStart, onResume, onBack }: { books: HarnessFlowBook[]; runs: HarnessFlowRun[]; canCreate: boolean; onCreate: () => void; onStart: (flowId: string, title: string) => void; onResume: (run: HarnessFlowRun) => void; onBack?: () => void }) {
  return <View>
    <View style={styles.subHeader}>
      {onBack ? <Pressable onPress={onBack} hitSlop={8} style={styles.subHeaderBack} accessibilityRole="button" accessibilityLabel="Back to Space"><Ionicons name="arrow-back" size={20} color={colors.blue} /></Pressable> : <View style={styles.subHeaderBack} />}
      <Text numberOfLines={1} style={styles.subHeaderTitle}>Flow Books</Text>
      {canCreate ? <Pressable accessibilityRole="button" onPress={onCreate} style={styles.createButton}><Ionicons name="add" size={17} color={colors.blue} /><Text style={styles.createButtonText}>Create</Text></Pressable> : <View style={styles.subHeaderBack} />}
    </View>
    <Text style={styles.subHeaderHint}>Reusable processes for the work you do.</Text>
    {runs.length ? <><Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginTop: 20, marginBottom: 8 }}>IN PROGRESS</Text><View style={styles.listCard}>{runs.map((run) => <TouchableOpacity key={run.id} accessibilityRole="button" onPress={() => onResume(run)} style={styles.workCard}><View style={[styles.workIcon, { backgroundColor: '#FFF2D7' }]}><Ionicons name="time-outline" size={20} color={colors.amber} /></View><View style={{ flex: 1 }}><Text style={styles.canvasRowTitle}>{run.name || 'Flow Book'}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>Continue at step {(run.step || 0) + 1}</Text></View><Ionicons name="chevron-forward" size={17} color="#9aa3b1" /></TouchableOpacity>)}</View></> : null}
    <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginTop: 20, marginBottom: 8 }}>AVAILABLE BOOKS</Text>
    {books.length ? <View style={styles.listCard}>{books.map((book) => {
      const actions = Array.isArray(book.data.actions) ? book.data.actions : [];
      const description = typeof book.data.description === 'string' && book.data.description ? book.data.description : `${actions.length} ordered ${actions.length === 1 ? 'step' : 'steps'}`;
      return <TouchableOpacity key={book.id} accessibilityRole="button" onPress={() => onStart(book.id, book.name)} style={styles.workCard}><View style={styles.workIcon}><Ionicons name="git-branch-outline" size={20} color={colors.blue} /></View><View style={{ flex: 1 }}><Text style={styles.canvasRowTitle}>{book.name}</Text><Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 }}>{description}</Text></View><Ionicons name="play-circle-outline" size={21} color={colors.blue} /></TouchableOpacity>;
    })}</View> : <View style={{ paddingVertical: 28, alignItems: 'center' }}><Ionicons name="git-branch-outline" size={32} color={colors.faint} /><Text style={{ color: colors.muted, fontSize: 14, marginTop: 10 }}>No Flow Books yet.</Text>{canCreate ? <Text style={{ color: colors.faint, fontSize: 12, marginTop: 3 }}>Create one from your registered Actions.</Text> : null}</View>}
  </View>;
}

const spaceCardIcon = (card: HarnessCanvasCard): { name: keyof typeof Ionicons.glyphMap; color: string } => {
  if (card.kind === 'flow') return { name: 'time-outline', color: colors.amber };
  if (card.kind === 'now') return { name: 'receipt-outline', color: colors.blue };
  return { name: 'checkbox-outline', color: '#7C3AED' };
};

function SpaceSections({ sections, onOpen }: { sections: HarnessSpaceSection[]; onOpen: (card: HarnessCanvasCard) => void }) {
  return <>
    {sections.map((section) => <View key={section.id} style={styles.spaceSection}>
      <Text style={styles.spaceSectionTitle}>{section.title}</Text>
      {section.id === 'signals' ? <View style={styles.spaceCard}><View style={styles.signalRow}>
        {section.cards.filter((card) => card.kind === 'data').map((card) => <View key={card.id} style={styles.signalTile}>
          <Text style={styles.signalValue}>{card.kind === 'data' ? card.value : ''}</Text>
          <Text style={styles.signalLabel}>{card.title}</Text>
        </View>)}
      </View></View> : <View style={styles.spaceCard}>{section.cards.map((card) => {
        const icon = spaceCardIcon(card);
        return <TouchableOpacity key={card.id} style={styles.spaceItem} accessibilityRole="button" onPress={() => onOpen(card)}>
          <View style={[styles.spaceItemIcon, { backgroundColor: `${icon.color}14` }]}>
            <Ionicons name={icon.name} size={17} color={icon.color} />
          </View>
          <View style={styles.spaceItemCopy}>
            <Text style={styles.spaceItemTitle}>{card.title}</Text>
            {card.kind !== 'data' && card.description ? <Text style={styles.spaceItemDetail}>{card.description}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.faint} />
        </TouchableOpacity>;
      })}</View>}
    </View>)}
  </>;
}

function RecordsSection({
  scope,
  mode,
  records,
  initialFilter = 'all',
  hasMore,
  isLoading,
  loadError,
  loadingMore,
  canCreate,
  onLoadMore,
  onRetry,
  onSelectRecord,
  onCreateRecord,
  onBack,
}: {
  scope: string;
  mode: 'personal' | 'work';
  records: HarnessRecord[];
  initialFilter?: 'all' | 'contacts';
  hasMore: boolean;
  isLoading: boolean;
  loadError: string;
  loadingMore: boolean;
  canCreate: (type?: string) => boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onSelectRecord: (record: HarnessRecord) => void;
  onCreateRecord: (type?: string) => void;
  onBack: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'orders' | 'contacts' | 'products' | 'tasks' | 'other'>(initialFilter);
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<HarnessRecord[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactRetry, setContactRetry] = useState(0);
  const searchGeneration = useRef(0);

  useEffect(() => {
    const generation = ++searchGeneration.current;
    if (filter !== 'contacts') return;
    let current = true;
    const timer = setTimeout(() => {
      setContacts([]); setNext(null); setSearching(true); setContactError('');
      void harness.contacts(scope, search).then((page) => {
        if (!current || generation !== searchGeneration.current) return;
        setContacts(page.contacts); setNext(page.next); setContactError('');
      }).catch((cause) => {
        if (current && generation === searchGeneration.current) setContactError(cause instanceof Error ? cause.message : 'Could not search contacts.');
      }).finally(() => { if (current && generation === searchGeneration.current) setSearching(false); });
    }, search ? 250 : 0);
    return () => { current = false; clearTimeout(timer); };
  }, [filter, scope, search, contactRetry]);

  const loadMoreContacts = async () => {
    if (next === null || searching) return;
    const generation = searchGeneration.current;
    setSearching(true);
    try {
      const page = await harness.contacts(scope, search, next);
      if (generation === searchGeneration.current) { setContacts((current) => [...current, ...page.contacts]); setNext(page.next); setContactError(''); }
    } catch (cause) { if (generation === searchGeneration.current) setContactError(cause instanceof Error ? cause.message : 'Could not load contacts.'); }
    finally { if (generation === searchGeneration.current) setSearching(false); }
  };

  const categories = mode === 'personal' ? [
    { id: 'all' as const, label: 'All' },
    { id: 'tasks' as const, label: 'Tasks' },
    { id: 'contacts' as const, label: 'Contacts' },
    { id: 'other' as const, label: 'Other' },
  ] : [
    { id: 'all' as const, label: 'All' },
    { id: 'orders' as const, label: 'Orders' },
    { id: 'contacts' as const, label: 'Contacts' },
    { id: 'products' as const, label: 'Products' },
    { id: 'tasks' as const, label: 'Tasks' },
    { id: 'other' as const, label: 'Other' },
  ];

  const matchesCategory = (record: HarnessRecord, cat: string) => {
    const t = record.type.toLowerCase();
    if (cat === 'all') return true;
    if (cat === 'orders') return t === 'order' || t.startsWith('pos.order');
    if (cat === 'contacts') return t === 'person' || t === 'organization' || t === 'contact' || t === 'customer' || t === 'account' || t === 'lead';
    if (cat === 'products') return t === 'product' || t.startsWith('pos.product');
    if (cat === 'tasks') return t === 'task';
    if (cat === 'other') return !['order', 'person', 'organization', 'contact', 'customer', 'account', 'lead', 'product', 'task'].some((k) => t === k || t.startsWith(`pos.${k}`));
    return true;
  };

  const filtered = useMemo(() => filter === 'contacts' ? contacts : records.filter((r) => matchesCategory(r, filter)), [records, filter, contacts]);
  const canLoadMore = filter === 'contacts' ? next !== null : hasMore;

  const recordIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    const t = type.toLowerCase();
    if (t === 'order' || t.startsWith('pos.order')) return 'receipt-outline';
    if (t === 'person' || t === 'organization' || t === 'contact' || t === 'customer' || t === 'account') return 'people-outline';
    if (t === 'product' || t.startsWith('pos.product')) return 'cube-outline';
    if (t === 'task') return 'checkbox-outline';
    if (t === 'lead' || t === 'deal') return 'trending-up-outline';
    if (t === 'site') return 'globe-outline';
    return 'folder-outline';
  };

  const recordIconColor = (type: string): string => {
    const t = type.toLowerCase();
    if (t === 'order' || t.startsWith('pos.order')) return colors.blue;
    if (t === 'person' || t === 'organization' || t === 'contact' || t === 'customer' || t === 'account') return colors.green;
    if (t === 'product' || t.startsWith('pos.product')) return colors.amber;
    if (t === 'task') return '#7C3AED';
    if (t === 'lead' || t === 'deal') return '#2563EB';
    return colors.muted;
  };

  return (
    <View style={styles.recordsWrapper}>
      <View style={styles.subHeader}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.subHeaderBack} accessibilityRole="button" accessibilityLabel="Back to Space">
          <Ionicons name="arrow-back" size={20} color={colors.blue} />
        </Pressable>
        <Text numberOfLines={1} style={styles.subHeaderTitle}>Records</Text>
        {canCreate(filter === 'all' ? undefined : filter) ? <Pressable accessibilityRole="button" style={styles.createButton} onPress={() => onCreateRecord(filter === 'all' ? undefined : filter)}>
          <Ionicons name="add" size={17} color={colors.blue} />
          <Text style={styles.createButtonText}>{filter === 'contacts' ? 'Add contact' : filter === 'orders' ? 'New order' : filter === 'products' ? 'New product' : filter === 'tasks' ? 'New task' : 'New'}</Text>
        </Pressable> : <View style={styles.subHeaderBack} />}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
        {categories.map((cat) => {
          const active = filter === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(cat.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filter === 'contacts' && (contacts.length > 0 || search) ? <View style={styles.contactSearch}>
        <Ionicons name="search-outline" size={17} color={colors.muted} />
        <TextInput
          accessibilityLabel="Search contacts"
          placeholder="Search contacts, email, or phone"
          placeholderTextColor={colors.faint}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.contactSearchInput}
        />
        {search ? <Pressable accessibilityRole="button" accessibilityLabel="Clear contact search" onPress={() => setSearch('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.faint} /></Pressable> : null}
      </View> : null}
      {contactError && filtered.length > 0 ? <Text style={{ color: colors.muted, marginHorizontal: 16 }}>{contactError}</Text> : null}

      {/* Records list */}
      {filtered.length ? (
        <View style={styles.listCard}>{filtered.map((record) => {
          const total = record.data?.total != null ? Number(record.data.total) : record.data?.price != null ? Number(record.data.price) : null;
          const currency = String(record.data?.currency || 'INR');
          const formattedAmount = total !== null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(total / 100) : null;

          return (
            <TouchableOpacity
              key={record.id}
              style={styles.recordCard}
              onPress={() => onSelectRecord(record)}
              accessibilityLabel={`Open ${record.title}`}
            >
              <View style={[styles.recordIconBox, { backgroundColor: `${recordIconColor(record.type)}15` }]}>
                <Ionicons name={recordIcon(record.type)} size={18} color={recordIconColor(record.type)} />
              </View>
              <View style={styles.recordCopy}>
                <View style={styles.recordTitleRow}>
                  <Text numberOfLines={1} style={styles.recordTitle}>{record.title}</Text>
                  {formattedAmount ? <Text style={styles.recordAmount}>{formattedAmount}</Text> : null}
                </View>
                <View style={styles.recordMetaRow}>
                  <Text style={styles.recordTypeTag}>{titleCase(record.type.replace(/^pos\./, ''))}</Text>
                  <Text style={styles.recordMetaDot}>·</Text>
                  <View style={[styles.recordStateTag, { backgroundColor: `${stateColor(record.state)}18` }]}>
                    <Text style={[styles.recordStateText, { color: stateColor(record.state) }]}>{titleCase(record.state)}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.faint} />
            </TouchableOpacity>
          );
        })}</View>
      ) : (
        isLoading || searching ? <View style={styles.recordsLoading}><ActivityIndicator color={colors.blue} /><Text style={styles.emptyHint}>{filter === 'contacts' ? 'Searching contacts…' : 'Loading records…'}</Text></View> : loadError ? <View style={styles.emptyState}><Text style={styles.emptyTitle}>Records couldn’t be loaded</Text><Text style={styles.emptyHint}>{loadError}</Text><Pressable accessibilityRole="button" onPress={onRetry} style={styles.emptyAction}><Text style={styles.emptyActionText}>Try again</Text></Pressable></View> : contactError ? <View style={styles.emptyState}><Text style={styles.emptyTitle}>Contacts couldn’t be loaded</Text><Text style={styles.emptyHint}>{contactError}</Text><Pressable accessibilityRole="button" onPress={() => setContactRetry((value) => value + 1)} style={styles.emptyAction}><Text style={styles.emptyActionText}>Try again</Text></Pressable></View> : canLoadMore ? <View style={styles.emptyPageState}>
          <Pressable accessibilityRole="button" style={styles.inlineLoadMore} disabled={filter === 'contacts' ? searching : loadingMore} onPress={() => { if (filter === 'contacts') void loadMoreContacts(); else onLoadMore(); }}><Text style={styles.loadMoreText}>{filter === 'contacts' ? searching ? 'Loading…' : 'Load more contacts' : loadingMore ? 'Loading…' : 'Load more records'}</Text></Pressable>
        </View> : <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{filter === 'all' ? 'No records yet' : filter === 'contacts' ? search ? 'No contacts found' : 'No contacts yet' : `No ${categories.find((item) => item.id === filter)?.label.toLowerCase()} yet`}</Text>
          {filter === 'contacts' && !search ? <Text style={styles.emptyHint}>Add a person or organization to get started.</Text> : null}
        </View>
      )}
      {filter === 'contacts' && next !== null && filtered.length > 0 ? <Pressable accessibilityRole="button" style={styles.loadMore} disabled={searching} onPress={() => void loadMoreContacts()}><Text style={styles.loadMoreText}>{searching ? 'Loading…' : 'Load more contacts'}</Text></Pressable> : null}
      {filter !== 'contacts' && hasMore && filtered.length > 0 ? <Pressable accessibilityRole="button" style={styles.loadMore} disabled={loadingMore} onPress={onLoadMore}><Text style={styles.loadMoreText}>{loadingMore ? 'Loading…' : 'Load more records'}</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  tabBody: { flex: 1 },
  content: { paddingHorizontal: 18 },
  headerIconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 12 },
  headerTitleButton: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8 },
  headerTitle: { flexShrink: 1, fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  headerMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 },
  headerMeta: { flexShrink: 1, color: colors.muted, fontSize: 13, lineHeight: 18 },
  headerMetaSpacer: { flex: 1 },
  headerChips: { flexDirection: 'row', gap: 8 },
  headerChip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 18, backgroundColor: colors.selectedWash },
  headerChipText: { color: colors.selected, fontSize: 13, fontWeight: '800' },
  headerDivider: { height: 0, marginTop: 4 },
  contextQuestion: { gap: 8, padding: 12, borderRadius: 24, backgroundColor: '#fff', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E3E7EF' },
  contextQuestionTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  contextOption: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.container },
  contextOptionTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  contextOptionMeta: { color: colors.muted, fontSize: 12 },
  workspaceActions: { flexDirection: 'row', alignItems: 'center' },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(18, 24, 36, 0.32)' },
  workspaceSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 10, paddingHorizontal: 18, shadowColor: '#111827', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 12 },
  scheduleSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 10, paddingHorizontal: 18, maxHeight: '80%' },
  scheduleHint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  scheduleAdd: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 8 },
  scheduleAddText: { color: colors.blue, fontSize: 14, fontWeight: '700' },
  scheduleList: { flexGrow: 0, marginTop: 8 },
  routineRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  routineCopy: { flex: 1, paddingVertical: 10 },
  scheduleControl: { minWidth: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  sheetHandle: { width: 34, height: 4, borderRadius: 2, backgroundColor: '#C9CDD5', alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sheetTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  sheetClose: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  workspaceList: { flexGrow: 0, flexShrink: 1 },
  workspaceOption: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 12, borderRadius: 10 },
  workspaceOptionSelected: { backgroundColor: '#F2F5FC' },
  workspaceOptionText: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: '600' },
  workspaceOptionTextSelected: { color: colors.selected, fontWeight: '800' },
  createWorkspaceOption: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  createWorkspaceText: { color: colors.blue, fontSize: 15, fontWeight: '700' },
  parentTitle: { fontSize: 14, lineHeight: 19, fontWeight: '700', color: colors.ink },
  center: { minHeight: 180, justifyContent: 'center', alignItems: 'center' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 12 },
  progressText: { color: colors.muted, fontSize: 13 },
  empty: { color: colors.muted, fontSize: 14, paddingVertical: 24 },
  recordsLoading: { minHeight: 88, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyState: { minHeight: 200, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 4 },
  emptyPageState: { minHeight: 48, alignItems: 'stretch', justifyContent: 'center', paddingHorizontal: 0 },
  emptyTitle: { color: colors.muted, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  emptyHint: { maxWidth: 300, color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  emptyAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 2, paddingHorizontal: 8 },
  emptyActionText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  loadMore: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  inlineLoadMore: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  loadMoreText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  error: { backgroundColor: '#FFF1F0', borderRadius: 10, padding: 12, marginBottom: 14 },
  errorText: { color: '#B42318' },
  spaceSection: { marginTop: 16 },
  spaceSectionTitle: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  spaceCard: { backgroundColor: '#fff', borderRadius: 24, padding: 6, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E3E7EF' },
  signalRow: { flexDirection: 'row', gap: 8, padding: 6 },
  signalTile: { flex: 1, minWidth: 0, backgroundColor: colors.container, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  signalValue: { color: colors.ink, fontSize: 24, lineHeight: 29, fontWeight: '700', fontVariant: ['tabular-nums'] },
  signalLabel: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  spaceItem: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 10 },
  spaceItemIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  spaceItemCopy: { flex: 1, minWidth: 0 },
  spaceItemTitle: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  spaceItemDetail: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  spaceEmptyState: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 44, paddingBottom: 8 },
  spaceEmptyMark: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.container, alignItems: 'center', justifyContent: 'center' },
  spaceEmptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '700', marginTop: 14 },
  spaceEmptyHint: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4, textAlign: 'center', maxWidth: 260 },
  browseSection: { marginTop: 28 },
  browseTrigger: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  browseTitle: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  browseList: { backgroundColor: '#fff', borderRadius: 24, paddingVertical: 6, marginTop: 4, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E3E7EF' },
  browseRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10 },
  browseIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  browseRowTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink },
  subHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 48 },
  subHeaderBack: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  subHeaderTitle: { flex: 1, minWidth: 0, fontSize: 17, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 },
  subHeaderHint: { color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  workCard: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10 },
  workIcon: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' },
  canvasRowTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink },
  recordsWrapper: { marginTop: 0 },
  listCard: { backgroundColor: '#fff', borderRadius: 24, paddingVertical: 6, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E3E7EF' },
  filterRail: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 6 },
  filterChip: { minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  filterChipActive: { borderBottomColor: colors.blue },
  filterChipText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  filterChipTextActive: { color: colors.selected },
  contactSearch: { minHeight: 48, marginTop: 8, marginBottom: 8, paddingHorizontal: 12, borderRadius: 9, backgroundColor: colors.wash, flexDirection: 'row', alignItems: 'center', gap: 9 },
  contactSearchInput: { flex: 1, minWidth: 0, height: 48, paddingHorizontal: 0, paddingVertical: 0, color: colors.ink, fontSize: 14, includeFontPadding: false },
  createButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4 },
  createButtonText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  recordCard: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 10 },
  recordIconBox: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  recordCopy: { flex: 1, minWidth: 0 },
  recordTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  recordTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  recordAmount: { fontSize: 14, fontWeight: '700', color: colors.ink },
  recordMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  recordTypeTag: { fontSize: 11, fontWeight: '700', color: colors.muted },
  recordMetaDot: { fontSize: 11, color: colors.faint },
  recordStateTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  recordStateText: { fontSize: 10, fontWeight: '800' },
});
