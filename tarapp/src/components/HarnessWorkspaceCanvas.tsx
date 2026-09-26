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
import { TarLogo } from '@/components/TarLogo';
import { createOperationKey, harness, type HarnessAction, type HarnessCanvasCard, type HarnessFlowBook, type HarnessFlowRun, type HarnessInbox, type HarnessInboxSource, type HarnessInterfaceContract, type HarnessRecord, type HarnessSpaceContext, type HarnessSpaceSection, type HarnessWorkspace } from '@/lib/harness';

export type WorkspaceTab = 'space' | 'inbox' | 'flows' | 'ask';
type OrderLine = { productId: string; title: string; quantity: number; status?: 'pending' | 'preparing' | 'ready' };
type OrderState = 'pending' | 'preparing' | 'ready';
type InboxSource = Omit<HarnessInboxSource, 'permissions'> & { permissions?: HarnessInboxSource['permissions'] };
type InboxEntry = { kind: 'task' | 'order'; record: HarnessRecord; source: InboxSource };
interface Props { tab: WorkspaceTab; scope: string; workspaceName: string; role: 'owner' | 'admin' | 'member' | 'guest'; workspaces: HarnessWorkspace[]; onSelectWorkspace: (slug: string) => void; onCreateWorkspace: () => void; }
interface OpenAction { action: HarnessAction; scope: string; input?: Record<string, unknown>; title?: string; }
interface AskSuggestion extends Record<string, unknown> { action: string | null; title: string | null; confidence: number | null; review: true; }

const flowPublishAction: HarnessAction = {
  id: 'flow.publish', version: 3, type: 'app', title: 'Create Flow Book',
  description: 'Publish a reusable ordered process for this workspace.', interfaceKey: 'flow-builder',
  fields: [], output: [], roles: ['owner', 'admin'], effects: ['definition_publish', 'canvas_update'],
};
const flowBuilderContract: HarnessInterfaceContract = { key: 'flow-builder', version: 1, title: 'Flow builder', presentation: 'screen', submitLabel: 'Create Flow' };

const colors = { ink: '#1B1C20', muted: '#626671', faint: '#8B8F99', line: '#D8DBE3', wash: '#F1F3F8', surface: '#FFFFFF', container: '#EAEFF7', outline: '#C9D2E0', blue: '#3157A8', selected: '#173673', selectedWash: '#DCE5FF', green: '#18865B', amber: '#A66D00', personal: '#D5654F' };
const titleCase = (value: string) => value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const orderLines = (order: HarnessRecord) => Array.isArray(order.data.lines) ? order.data.lines as OrderLine[] : [];
const stateIcon = (state: OrderState): keyof typeof Ionicons.glyphMap => state === 'ready' ? 'checkmark-circle' : state === 'preparing' ? 'time' : 'ellipse-outline';
const stateColor = (state: string) => {
  const s = state.toLowerCase();
  if (s === 'ready' || s === 'active' || s === 'completed' || s === 'won' || s === 'paid' || s === 'live') return colors.green;
  if (s === 'preparing' || s === 'pending' || s === 'open' || s === 'draft') return colors.amber;
  if (s === 'failed' || s === 'cancelled' || s === 'lost' || s === 'archived') return '#D54F4F';
  return colors.muted;
};
const workspaceTint = (workspace: HarnessWorkspace) => workspace.mode === 'personal' ? colors.personal : colors.blue;

type SpacePayload = { sections: HarnessSpaceSection[]; context: HarnessSpaceContext | null; decision: 'automatic' | 'confirm'; alternatives: HarnessSpaceContext[] };
type InboxPayload = { sources: InboxSource[]; groups: HarnessInbox['groups']; partial: boolean };
type FlowPayload = { books: HarnessFlowBook[]; runs: HarnessFlowRun[] };
type RegistryPayload = { actions: HarnessAction[]; interfaces: HarnessInterfaceContract[] };
type RecordsPayload = { records: HarnessRecord[]; next: number | null };
type CachedPayload = SpacePayload | InboxPayload | FlowPayload | RegistryPayload | RecordsPayload;

// Survives tab remounts so returning to a tab renders instantly and refreshes in the background.
const payloadCache = new Map<string, CachedPayload>();
const cached = <T extends CachedPayload>(key: string): T | undefined => payloadCache.get(key) as T | undefined;
const flowsKey = (scope: string) => `flows:${scope}`;
const registryKey = (scope: string) => `registry:${scope}`;
const recordsKey = (scope: string) => `records:${scope}`;

export default function HarnessWorkspaceCanvas({ tab, scope, workspaceName, role, workspaces, onSelectWorkspace, onCreateWorkspace }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [areaFilter, setAreaFilter] = useState('all');
  const [teamOpen, setTeamOpen] = useState(false);
  const [siteOpen, setSiteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HarnessRecord | null>(null);
  const [selectedRecordScope, setSelectedRecordScope] = useState(scope);
  const [searchOpen, setSearchOpen] = useState(false);
  const spaceSeed = cached<SpacePayload>('space');
  const inboxSeed = cached<InboxPayload>('inbox');
  const flowSeed = cached<FlowPayload>(flowsKey(scope));
  const registrySeed = cached<RegistryPayload>(registryKey(scope));
  const recordsSeed = cached<RecordsPayload>(recordsKey(scope));
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
  const [inboxSources, setInboxSources] = useState<InboxSource[]>(inboxSeed?.sources ?? []);
  const [inboxGroups, setInboxGroups] = useState<HarnessInbox['groups']>(inboxSeed?.groups ?? { mine: [], available: [], waiting: [] });
  const [inboxPartial, setInboxPartial] = useState(inboxSeed?.partial ?? false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [actions, setActions] = useState<HarnessAction[]>(registrySeed?.actions ?? []);
  const [interfaces, setInterfaces] = useState<HarnessInterfaceContract[]>(registrySeed?.interfaces ?? []);
  const [openAction, setOpenAction] = useState<OpenAction | null>(null);
  const [loading, setLoading] = useState(!(tab === 'inbox' ? inboxSeed : tab === 'flows' ? flowSeed : spaceSeed));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [askDraft, setAskDraft] = useState('');
  const [askSuggestion, setAskSuggestion] = useState<AskSuggestion | null>(null);
  const [asking, setAsking] = useState(false);
  const currentScope = useRef(scope);
  const selectRecord = (record: HarnessRecord, recordScope = scope) => {
    setSelectedRecordScope(recordScope);
    setSelectedRecord(record);
  };

  const reload = useCallback(async (silent = false) => {
    if (currentScope.current !== scope) return;
    if (!silent) { setLoading(true); setError(''); }
    try {
      const [registry, nextSpace, nextRecords, inbox, flowData] = await Promise.all([
        tab === 'flows' || (tab === 'space' && (spaceRecords || spaceFlows)) ? harness.workspaceRegistry(scope) : Promise.resolve(null),
        tab === 'space' ? harness.space() : Promise.resolve(null),
        tab === 'space' && spaceRecords ? harness.records(scope) : Promise.resolve(null),
        tab === 'inbox' ? harness.unifiedInbox() : Promise.resolve(null),
        tab === 'flows' || (tab === 'space' && spaceFlows) ? harness.flows(scope) : Promise.resolve(null),
      ]);
      if (currentScope.current !== scope) return;
      if (nextSpace) {
        setError('');
        const payload: SpacePayload = { sections: nextSpace.sections, context: nextSpace.context, decision: nextSpace.decision, alternatives: nextSpace.alternatives };
        payloadCache.set('space', payload);
        setSections(nextSpace.sections);
        setSpaceContext(nextSpace.context);
        setSpaceDecision(nextSpace.decision);
        setSpaceAlternatives(nextSpace.alternatives);
        if (nextSpace.context.workspace.slug !== scope) onSelectWorkspace(nextSpace.context.workspace.slug);
      }
      if (nextRecords) { payloadCache.set(recordsKey(scope), { records: nextRecords.records, next: nextRecords.next }); setRecords(nextRecords.records); setRecordNext(nextRecords.next); }
      if (flowData) { payloadCache.set(flowsKey(scope), { books: flowData.books, runs: flowData.runs }); setBooks(flowData.books); setFlowRuns(flowData.runs); }
      if (registry) { payloadCache.set(registryKey(scope), { actions: registry.actions, interfaces: registry.interfaces }); setActions(registry.actions); setInterfaces(registry.interfaces); }
      if (inbox) { payloadCache.set('inbox', { sources: inbox.sources, groups: inbox.groups, partial: inbox.partial }); setInboxSources(inbox.sources); setInboxGroups(inbox.groups); setInboxPartial(inbox.partial); }
    } catch (cause) {
      if (currentScope.current !== scope) return;
      if (tab === 'space') setSections([]);
      setError(cause instanceof Error ? cause.message : 'Could not load this workspace.');
    } finally {
      if (!silent && currentScope.current === scope) setLoading(false);
    }
  }, [scope, tab, spaceRecords, spaceFlows, onSelectWorkspace]);

  const [seededScope, setSeededScope] = useState(scope);
  if (seededScope !== scope) {
    setSeededScope(scope);
    const flows = cached<FlowPayload>(flowsKey(scope));
    const registry = cached<RegistryPayload>(registryKey(scope));
    const page = cached<RecordsPayload>(recordsKey(scope));
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
    const seedKey = tab === 'inbox' ? 'inbox' : tab === 'flows' ? flowsKey(scope) : 'space';
    const timer = setTimeout(() => { void reload(payloadCache.has(seedKey)); }, 0);
    return () => clearTimeout(timer);
  }, [reload, tab, scope]);
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
    else if (card.kind === 'inbox') router.push('/(tabs)/inbox');
  };

  const openOrder = (source: InboxSource, order: HarnessRecord) => {
    open(source.workspace.slug, 'pos.open', { section: 'sell', orderId: order.id }, `Order ${order.id.slice(-6).toUpperCase()}`);
  };

  const updateOrderItem = async (source: InboxSource, order: HarnessRecord, productId: string, status: 'preparing' | 'ready') => {
    try {
      await harness.executeAction(source.workspace.slug, 'pos.order.item.update', { orderId: order.id, version: order.version, productId, status }, createOperationKey(`pos.order.item:${order.id}:${productId}`));
      await reload(true);
    } catch (cause) {
      Alert.alert('Could not update item', cause instanceof Error ? cause.message : 'Reload the Inbox and try again.');
    }
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

  const chooseArea = (slug: string) => {
    if (tab === 'inbox') { setAreaFilter(slug); return; }
    if (slug === 'all') return;
    if (tab === 'space') {
      void harness.holdContext(slug).then(() => {
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
  const inboxFilterWorkspace = inboxSources.find((source) => source.workspace.slug === areaFilter)?.workspace;
  const inboxTitle = areaFilter === 'all' ? 'All areas' : inboxFilterWorkspace ? (inboxFilterWorkspace.mode === 'personal' ? 'Personal' : inboxFilterWorkspace.name) : 'Inbox';
  const contextTitle = spaceContext?.label || workspaceName;
  const contextWorkspaceName = spaceContext ? (spaceContext.workspace.mode === 'personal' ? 'Personal' : spaceContext.workspace.name) : '';
  const contextMeta = spaceContext ? [contextWorkspaceName === contextTitle ? '' : contextWorkspaceName, spaceContext.role, `Owner: ${spaceContext.owner}`].filter(Boolean).join(' · ') : null;
  const configureRoutine = async (editCurrent = false) => {
    const personal = workspaces.find((item) => item.mode === 'personal');
    if (!personal) { Alert.alert('Personal is unavailable', 'Refresh your workspaces and try again.'); return; }
    const clock = new Date();
    const time = (offset: number) => `${String((clock.getHours() + offset) % 24).padStart(2, '0')}:${String(clock.getMinutes()).padStart(2, '0')}`;
    const source = spaceContext?.workspace.slug || scope;
    let input: Record<string, unknown> = {
      label: spaceContext?.workspace.name || workspaceName || activeWorkspace?.name || 'Work', workspace: source,
      role: activeWorkspace?.workRole && activeWorkspace.workRole !== 'general' ? activeWorkspace.workRole : '',
      start: time(0), end: time(1), days: '0,1,2,3,4,5,6', priority: 0,
    };
    if (editCurrent && spaceContext?.source === 'routine') {
      try {
        let offset = 0;
        let found: HarnessRecord | undefined;
        do {
          const page = await harness.records(personal.slug, 'routine', offset);
          found = page.records.find((item) => item.id === spaceContext.id);
          if (found || page.next === null) break;
          offset = page.next;
        } while (true);
        if (!found) throw new Error('This routine is no longer available. Reload Space and try again.');
        input = { id: found.id, baseVersion: found.version, label: found.title, workspace: found.data.workspace,
          role: found.data.role || '', start: found.data.start, end: found.data.end,
          days: Array.isArray(found.data.days) ? found.data.days.join(',') : '0,1,2,3,4,5,6',
          priority: found.data.priority ?? 0 };
      } catch (cause) {
        Alert.alert('Could not load routine', cause instanceof Error ? cause.message : 'Try again.');
        return;
      }
    }
    open(personal.slug, 'routine.save', input, 'Schedule Space');
  };
  const scheduleRoutine = () => {
    if (spaceContext?.source !== 'routine') { void configureRoutine(); return; }
    Alert.alert('Schedule Space', 'Add another routine or edit the one active now.', [
      { text: 'Add routine', onPress: () => { void configureRoutine(); } },
      { text: 'Edit current', onPress: () => { void configureRoutine(true); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const askTar = async () => {
    const prompt = askDraft.trim();
    if (!prompt || asking) return;
    setAsking(true);
    try {
      const suggestion = await harness.executeAction<AskSuggestion>(scope, 'flow.suggest', { prompt }, createOperationKey('flow.suggest'));
      setAskSuggestion(suggestion);
      setAskDraft('');
    } catch (cause) {
      Alert.alert('Could not decide', cause instanceof Error ? cause.message : 'Try again.');
    } finally { setAsking(false); }
  };

  return (
      <View style={styles.page}>
      {teamOpen ? <WorkspaceTeam key={scope} scope={scope} name={workspaceName} onClose={() => setTeamOpen(false)} onChanged={() => { void reload(true); }} /> : null}
      {tab === 'flows' ? (
        <View style={[styles.tabBody, { paddingTop: insets.top }]}>
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
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void reload(true).finally(() => setRefreshing(false)); }} />} style={styles.scroll} contentContainerStyle={[styles.content, tab === 'ask' && styles.askContent, { paddingTop: insets.top + 12, paddingBottom: tab === 'ask' ? 16 : insets.bottom + 24 }]}>
          {tab === 'inbox' ? <WorkspaceHeader sources={inboxSources} value={areaFilter} onChange={chooseArea} onCreate={onCreateWorkspace} allowAllAreas onSearch={() => setSearchOpen(true)} onSettings={() => router.push('/settings')} showMembers={activeWorkspace?.mode === 'work'} onMembers={() => setTeamOpen(true)} title={inboxTitle} /> : null}
          {(tab === 'ask' || (tab === 'space' && !spaceRecords && !spaceFlows)) && activeWorkspace ? <WorkspaceHeader sources={workspaceSources} value={scope} onChange={chooseArea} onCreate={onCreateWorkspace} onSearch={() => setSearchOpen(true)} onSettings={() => router.push('/settings')} showMembers={activeWorkspace.mode === 'work'} onMembers={() => setTeamOpen(true)} title={tab === 'space' ? contextTitle : workspaceName} meta={tab === 'space' ? contextMeta : null} chips={tab === 'space' ? [{ label: 'Schedule', onPress: scheduleRoutine }, ...(spaceContext?.held ? [{ label: 'Auto', onPress: resumeAutomaticContext }] : [])] : undefined} /> : null}
          {tab === 'space' && !spaceRecords && !spaceFlows && spaceDecision === 'confirm' && spaceContext ? <View style={styles.contextQuestion}>
            <Text style={styles.contextQuestionTitle}>Which Space are you in now?</Text>
            {[spaceContext, ...spaceAlternatives].map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => chooseArea(item.workspace.slug)} style={styles.contextOption}>
              <Text style={styles.contextOptionTitle}>{item.label}</Text><Text style={styles.contextOptionMeta}>{item.workspace.name} · {item.role}</Text>
            </Pressable>)}
          </View> : null}

          {error ? <Pressable style={styles.error} onPress={() => { setLoading(true); void reload(); }}><Text style={styles.errorText}>{error} Tap to retry.</Text></Pressable> : null}

          {loading && tab !== 'space' ? (
            <View style={styles.center}><ActivityIndicator color={colors.blue} /></View>
          ) : (
            <>
              {tab === 'space' && loading ? <View style={styles.progress}><ActivityIndicator size="small" color={colors.blue} /><Text style={styles.progressText}>Loading this space…</Text></View> : null}
              {tab === 'ask' ? <View style={styles.askEmpty}>
                <View style={styles.askMark}><TarLogo size={24} color="#6D45C5" bgColor="#F1ECFA" /></View>
                <Text style={styles.askTitle}>Ask tar</Text>
                <Text style={styles.askMessage}>{askSuggestion ? askSuggestion.title ? `Suggested action: ${askSuggestion.title}.` : 'No matching action. Try a more specific request.' : 'Describe what you want to do. Review the suggested action before it runs.'}</Text>
                {askSuggestion?.action ? <Pressable accessibilityRole="button" onPress={() => open(scope, askSuggestion.action!, {}, askSuggestion.title || 'Review action')} style={styles.askReview}><Text style={styles.askReviewText}>Review {askSuggestion.title || 'action'}</Text></Pressable> : null}
              </View> : null}
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
              {tab === 'inbox' ? (
                <UnifiedInbox
                  sources={inboxSources}
                  groups={inboxGroups}
                  partial={inboxPartial}
                  filter={areaFilter}
                  onOpenOrder={openOrder}
                  onUpdateOrder={(source, order, productId, status) => void updateOrderItem(source, order, productId, status)}
                  onOpenTask={(source, task) => {
                    selectRecord(task, source.workspace.slug);
                  }}
                  onCompleteTask={(source, task) => {
                    open(source.workspace.slug, 'task.complete', { taskId: task.id }, task.title);
                  }}
                />
              ) : null}
            </>
          )}
        </ScrollView>
        {tab === 'ask' ? <View style={styles.askComposer}>
          <View style={styles.askInputBar}>
            <TextInput accessibilityLabel="Message tar" value={askDraft} onChangeText={setAskDraft} placeholder="Message" placeholderTextColor="#8B8F99" multiline style={styles.askInput} />
            <Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!askDraft.trim() || asking} onPress={() => void askTar()} style={styles.askControl}>
              {asking ? <ActivityIndicator size="small" color="#7048C8" /> : <Ionicons name="arrow-up" size={21} color={askDraft.trim() ? '#7048C8' : colors.faint} />}
            </Pressable>
          </View>
        </View> : null}
        </KeyboardAvoidingView>
      )}

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

function WorkspaceHeader({ sources, value, onChange, onCreate, allowAllAreas = false, onSearch, onSettings, showMembers = false, onMembers, title, meta = null, chips }: { sources: InboxSource[]; value: string; onChange: (slug: string) => void; onCreate: () => void; allowAllAreas?: boolean; onSearch: () => void; onSettings: () => void; showMembers?: boolean; onMembers: () => void; title: string; meta?: string | null; chips?: { label: string; onPress: () => void }[] }) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const sheetMaxHeight = Math.min(520, screenHeight * 0.72);
  const choose = (slug: string) => { onChange(slug); setOpen(false); };

  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => setOpen(true)} style={styles.headerTitleButton} accessibilityRole="button" accessibilityLabel={`Switch workspace. Current: ${title}`} accessibilityState={{ expanded: open }}>
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
        {meta ? <Text numberOfLines={1} style={styles.headerMeta}>{meta}</Text> : <View style={styles.headerMetaSpacer} />}
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
              {allowAllAreas ? <TouchableOpacity activeOpacity={0.7} onPress={() => choose('all')} style={[styles.workspaceOption, value === 'all' && styles.workspaceOptionSelected]} accessibilityRole="button" accessibilityState={{ selected: value === 'all' }}>
                <Text style={[styles.workspaceOptionText, value === 'all' && styles.workspaceOptionTextSelected]}>All areas</Text>
                {value === 'all' ? <Ionicons name="checkmark-circle" size={20} color={colors.blue} /> : null}
              </TouchableOpacity> : null}
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

function UnifiedInbox({
  sources,
  groups,
  partial,
  filter,
  onOpenOrder,
  onUpdateOrder,
  onOpenTask,
  onCompleteTask,
}: {
  sources: InboxSource[];
  groups: HarnessInbox['groups'];
  partial: boolean;
  filter: string;
  onOpenOrder: (source: InboxSource, order: HarnessRecord) => void;
  onUpdateOrder: (source: InboxSource, order: HarnessRecord, productId: string, status: 'preparing' | 'ready') => void;
  onOpenTask: (source: InboxSource, task: HarnessRecord) => void;
  onCompleteTask: (source: InboxSource, task: HarnessRecord) => void;
}) {
  const visibleSources = filter === 'all' ? sources : sources.filter((source) => source.workspace.slug === filter);
  const showWorkspace = filter === 'all' && visibleSources.filter((source) => source.tasks.length || source.orders.length).length > 1;
  const sourcesById = new Map(visibleSources.map((source) => [source.workspace.id, source]));
  const sections = (['mine', 'available', 'waiting'] as const).map((key) => ({
    label: key === 'mine' ? 'Mine' : key === 'available' ? 'Available' : 'Waiting',
    entries: groups[key].flatMap((item): InboxEntry[] => {
      const source = sourcesById.get(item.workspace.id);
      return source ? [{ kind: item.kind, record: item.item, source }] : [];
    }),
  })).filter((section) => section.entries.length);

  return (
    <>
      {partial ? <Text style={styles.partialNotice}>Some workspaces could not load. Pull down to retry.</Text> : null}
      {!sections.length ? <Empty text="Nothing needs your attention here." /> : null}
      {sections.map((group) => (
        <View key={group.label} style={styles.inboxGroup}>
          <Text style={styles.inboxGroupLabel}>{group.label}</Text>
          {group.entries.map((entry) => entry.kind === 'order' ? (
            <OrderRow
              key={`${entry.source.workspace.id}:${entry.record.id}`}
              source={entry.source}
              order={entry.record}
              showWorkspace={showWorkspace}
              onOpen={() => onOpenOrder(entry.source, entry.record)}
              onUpdate={(productId, status) => onUpdateOrder(entry.source, entry.record, productId, status)}
            />
          ) : (
            <TaskRow
              key={`${entry.source.workspace.id}:${entry.record.id}`}
              source={entry.source}
              task={entry.record}
              showWorkspace={showWorkspace}
              onOpen={() => onOpenTask(entry.source, entry.record)}
              onComplete={() => onCompleteTask(entry.source, entry.record)}
            />
          ))}
        </View>
      ))}
    </>
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
  if (card.kind === 'inbox') return { name: 'receipt-outline', color: colors.blue };
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

function WorkspaceLabel({ workspace }: { workspace: HarnessWorkspace }) {
  return (
    <View style={styles.workspaceLabel}>
      <View style={[styles.workspaceLabelDot, { backgroundColor: workspaceTint(workspace) }]} />
      <Text numberOfLines={1} style={styles.workspaceLabelText}>{workspace.mode === 'personal' ? 'Personal' : workspace.name}</Text>
    </View>
  );
}

function TaskRow({ source, task, showWorkspace, onOpen, onComplete }: { source: InboxSource; task: HarnessRecord; showWorkspace: boolean; onOpen: () => void; onComplete: () => void }) {
  return (
    <View style={styles.parentBlock}>
      <View style={styles.parentRow}>
        <Pressable accessibilityRole="button" onPress={onOpen} style={styles.parentCopy}>
          <Text numberOfLines={2} style={styles.parentTitle}>{task.title}</Text>
          {showWorkspace ? <WorkspaceLabel workspace={source.workspace} /> : null}
        </Pressable>
        {task.state === 'open' && source.permissions?.completeTask ? <Pressable onPress={onComplete} hitSlop={8} style={styles.rowAction} accessibilityLabel={`Complete ${task.title}`}>
          <Text style={styles.rowActionText}>Done</Text>
          <Ionicons name="ellipse-outline" size={16} color={colors.blue} />
        </Pressable> : <Text style={styles.waitingState}>{task.state === 'blocked' ? 'Blocked' : task.state === 'waiting' ? 'Waiting' : 'Open'}</Text>}
      </View>
    </View>
  );
}

function OrderRow({
  source,
  order,
  showWorkspace,
  onOpen,
  onUpdate,
}: {
  source: InboxSource;
  order: HarnessRecord;
  showWorkspace: boolean;
  onOpen: () => void;
  onUpdate: (productId: string, status: 'preparing' | 'ready') => void;
}) {
  const lines = orderLines(order);
  const type = String(order.data.orderType || 'counter').toLowerCase();
  const table = String(order.data.table || '').trim();
  const typeCode = type === 'delivery' ? 'D' : type === 'table' || table ? `T${table || ''}` : 'C';
  const orderKey = `#${typeCode}-${order.id.slice(-6).toUpperCase()}`;
  const total = Number(order.data.total || 0);
  const currency = String(order.data.currency || 'INR');
  const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(total / 100);

  return (
    <View style={styles.parentBlock}>
      <Pressable onPress={onOpen} disabled={!source.permissions?.openOrder} accessibilityRole="button" style={({ pressed }) => [styles.parentRow, pressed && styles.orderPressed]}>
        <View style={styles.parentCopy}>
          <Text style={styles.parentTitle}>{orderKey}</Text>
          {showWorkspace ? <WorkspaceLabel workspace={source.workspace} /> : null}
        </View>
      </Pressable>
      {lines.map((line) => {
        const status = line.status || 'pending';
        const next = status === 'pending' ? 'preparing' as const : status === 'preparing' ? 'ready' as const : null;
        const label = status === 'pending' ? 'Start' : status === 'preparing' ? 'Ready' : 'Ready';
        return (
          <View key={line.productId} style={styles.childRow}>
            <View style={styles.childCopy}>
              <Text numberOfLines={2} style={styles.childTitle}>{line.quantity} × {line.title}</Text>
            </View>
            <Pressable disabled={!next || !source.permissions?.prepare} onPress={() => { if (next) onUpdate(line.productId, next); }} hitSlop={6} style={styles.childAction}>
              <Text style={[styles.childStatus, { color: stateColor(status) }]}>{label}</Text>
              <Ionicons name={stateIcon(status)} size={16} color={stateColor(status)} />
            </Pressable>
          </View>
        );
      })}
      {total > 0 && source.permissions?.collect ? (
        <Pressable onPress={onOpen} style={styles.childRow} accessibilityLabel={`Collect ${amount}`}>
          <View style={styles.childCopy}>
            <Text style={styles.childTitle}>Payment · {amount}</Text>
          </View>
          <View style={styles.childAction}>
            <Text style={styles.collectText}>Collect</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.blue} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

function Empty({ text }: { text: string }) { return <Text style={styles.empty}>{text}</Text>; }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  tabBody: { flex: 1 },
  content: { paddingHorizontal: 18 },
  askContent: { flexGrow: 1 },
  askEmpty: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 60 },
  askMark: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#F1ECFA' },
  askTitle: { color: colors.ink, fontSize: 20, fontWeight: '700', marginTop: 14 },
  askMessage: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center', maxWidth: 280 },
  askComposer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, backgroundColor: colors.surface },
  askInputBar: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, borderRadius: 27, backgroundColor: '#E7EBF3' },
  askControl: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  askInput: { flex: 1, maxHeight: 104, paddingVertical: 12, color: colors.ink, fontSize: 15 },
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
  askReview: { marginTop: 4, minHeight: 42, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#6D45C5' },
  askReviewText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  contextQuestion: { gap: 8, padding: 12, borderRadius: 24, backgroundColor: '#fff', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E3E7EF' },
  contextQuestionTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  contextOption: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.container },
  contextOptionTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  contextOptionMeta: { color: colors.muted, fontSize: 12 },
  workspaceActions: { flexDirection: 'row', alignItems: 'center' },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(18, 24, 36, 0.32)' },
  workspaceSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 10, paddingHorizontal: 18, shadowColor: '#111827', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 12 },
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
  inboxGroup: { backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 6, paddingVertical: 6, marginBottom: 16, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E3E7EF' },
  inboxGroupLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: colors.faint, marginBottom: 7, paddingHorizontal: 10, paddingTop: 6 },
  partialNotice: { color: '#7C5300', backgroundColor: '#FFF7E8', borderRadius: 8, padding: 12, marginBottom: 18, fontSize: 13, lineHeight: 19 },
  parentBlock: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  parentRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  orderPressed: { backgroundColor: colors.wash },
  parentCopy: { flex: 1, minWidth: 0, paddingRight: 10 },
  parentTitle: { fontSize: 14, lineHeight: 19, fontWeight: '700', color: colors.ink },
  workspaceLabel: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 5 },
  workspaceLabelDot: { width: 5, height: 5, borderRadius: 3 },
  workspaceLabelText: { maxWidth: 140, fontSize: 10, fontWeight: '600', color: colors.muted },
  rowAction: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 10 },
  rowActionText: { fontSize: 12, fontWeight: '700', color: colors.blue },
  waitingState: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  childRow: { minHeight: 42, paddingLeft: 16, flexDirection: 'row', alignItems: 'stretch', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  childCopy: { flex: 1, minWidth: 0, justifyContent: 'center', paddingVertical: 8, paddingRight: 8 },
  childTitle: { fontSize: 13, lineHeight: 18, color: '#59606C' },
  childAction: { width: 88, minHeight: 41, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 5 },
  childStatus: { fontSize: 11, fontWeight: '700', textAlign: 'right' },
  collectText: { fontSize: 11, fontWeight: '700', color: colors.blue },
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
