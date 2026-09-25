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
import { createOperationKey, harness, type HarnessAction, type HarnessCanvasCard, type HarnessFlowBook, type HarnessFlowRun, type HarnessInboxSource, type HarnessInterfaceContract, type HarnessRecord, type HarnessSpaceContext, type HarnessWorkspace } from '@/lib/harness';

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

const colors = { ink: '#1B1C20', muted: '#626671', faint: '#8B8F99', line: '#D8DBE3', wash: '#F1F3F8', blue: '#3157A8', selected: '#173673', selectedWash: '#DCE5FF', green: '#18865B', amber: '#A66D00', personal: '#D5654F' };
const titleCase = (value: string) => value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const orderLines = (order: HarnessRecord) => Array.isArray(order.data.lines) ? order.data.lines as OrderLine[] : [];
const orderState = (order: HarnessRecord): OrderState => { const states = orderLines(order).map((line) => line.status || 'pending'); if (states.some((state) => state === 'pending')) return 'pending'; if (states.some((state) => state === 'preparing')) return 'preparing'; return 'ready'; };
const stateIcon = (state: OrderState): keyof typeof Ionicons.glyphMap => state === 'ready' ? 'checkmark-circle' : state === 'preparing' ? 'time' : 'ellipse-outline';
const stateColor = (state: string) => {
  const s = state.toLowerCase();
  if (s === 'ready' || s === 'active' || s === 'completed' || s === 'won' || s === 'paid' || s === 'live') return colors.green;
  if (s === 'preparing' || s === 'pending' || s === 'open' || s === 'draft') return colors.amber;
  if (s === 'failed' || s === 'cancelled' || s === 'lost' || s === 'archived') return '#D54F4F';
  return colors.muted;
};
const workspaceTint = (workspace: HarnessWorkspace) => workspace.mode === 'personal' ? colors.personal : colors.blue;
const scheduledAt = (record: HarnessRecord) => { const value = record.data.scheduledAt ?? record.data.dueAt ?? record.data.startsAt; if (typeof value === 'number') return value; if (typeof value === 'string') { const parsed = Date.parse(value); return Number.isNaN(parsed) ? null : parsed; } return null; };
const entryPriority = (entry: InboxEntry, now: number) => { if (entry.kind === 'order' && orderState(entry.record) !== 'pending') return 0; const time = scheduledAt(entry.record); if (time !== null && time <= now + 30 * 60 * 1000) return 1; if (entry.kind === 'task' && time === null) return 2; return 3; };

export default function HarnessWorkspaceCanvas({ tab, scope, workspaceName, role, workspaces, onSelectWorkspace, onCreateWorkspace }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [areaFilter, setAreaFilter] = useState('all');
  const [now, setNow] = useState(() => Date.now());
  const [teamOpen, setTeamOpen] = useState(false);
  const [siteOpen, setSiteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HarnessRecord | null>(null);
  const [selectedRecordScope, setSelectedRecordScope] = useState(scope);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cards, setCards] = useState<HarnessCanvasCard[]>([]);
  const [spaceContext, setSpaceContext] = useState<HarnessSpaceContext | null>(null);
  const [spaceDecision, setSpaceDecision] = useState<'automatic' | 'confirm'>('automatic');
  const [spaceAlternatives, setSpaceAlternatives] = useState<HarnessSpaceContext[]>([]);
  const [spaceOverride, setSpaceOverride] = useState<string>();
  const [records, setRecords] = useState<HarnessRecord[]>([]);
  const [recordNext, setRecordNext] = useState<number | null>(null);
  const [loadingMoreRecords, setLoadingMoreRecords] = useState(false);
  const [spaceRecords, setSpaceRecords] = useState<'all' | 'contacts' | null>(null);
  const [spaceFlows, setSpaceFlows] = useState(false);
  const [books, setBooks] = useState<HarnessFlowBook[]>([]);
  const [flowRuns, setFlowRuns] = useState<HarnessFlowRun[]>([]);
  const [inboxSources, setInboxSources] = useState<InboxSource[]>([]);
  const [actions, setActions] = useState<HarnessAction[]>([]);
  const [interfaces, setInterfaces] = useState<HarnessInterfaceContract[]>([]);
  const [openAction, setOpenAction] = useState<OpenAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [askDraft, setAskDraft] = useState('');
  const [askSuggestion, setAskSuggestion] = useState<AskSuggestion | null>(null);
  const [asking, setAsking] = useState(false);
  const currentScope = useRef(scope);
  const selectRecord = (record: HarnessRecord, recordScope = scope) => {
    setSelectedRecordScope(recordScope);
    setSelectedRecord(record);
  };

  const reload = useCallback(async () => {
    if (currentScope.current !== scope) return;
    setLoading(true);
    setError('');
    try {
      const [registry, nextSpace, nextRecords, inbox, flowData] = await Promise.all([
        harness.workspaceRegistry(scope),
        tab === 'space' ? harness.space(spaceOverride) : Promise.resolve(null),
        tab === 'space' && spaceRecords ? harness.records(scope) : Promise.resolve(null),
        tab === 'inbox' ? harness.unifiedInbox() : Promise.resolve(null),
        tab === 'flows' || (tab === 'space' && spaceFlows) ? harness.flows(scope) : Promise.resolve(null),
      ]);
      if (currentScope.current !== scope) return;
      if (nextSpace) {
        setCards(nextSpace.sections.flatMap((section) => section.cards));
        setSpaceContext(nextSpace.context);
        setSpaceDecision(nextSpace.decision);
        setSpaceAlternatives(nextSpace.alternatives);
        if (nextSpace.context.workspace.slug !== scope) onSelectWorkspace(nextSpace.context.workspace.slug);
      }
      if (nextRecords) { setRecords(nextRecords.records); setRecordNext(nextRecords.next); }
      if (flowData) { setBooks(flowData.books); setFlowRuns(flowData.runs); }
      setActions(registry.actions);
      setInterfaces(registry.interfaces);
      if (inbox) setInboxSources(inbox.sources);
    } catch (cause) {
      if (currentScope.current !== scope) return;
      setError(cause instanceof Error ? cause.message : 'Could not load this workspace.');
    } finally {
      if (currentScope.current === scope) setLoading(false);
    }
  }, [scope, tab, spaceOverride, spaceRecords, spaceFlows, onSelectWorkspace]);

  useEffect(() => {
    currentScope.current = scope;
    const timer = setTimeout(() => {
      setCards([]);
      setSpaceContext(null);
      setRecords([]);
      setRecordNext(null);
      setBooks([]);
      setFlowRuns([]);
      setSpaceFlows(false);
      setInboxSources([]);
      setActions([]);
      setInterfaces([]);
    }, 0);
    return () => clearTimeout(timer);
  }, [scope]);

  useEffect(() => { const timer = setTimeout(() => { void reload(); }, 0); return () => clearTimeout(timer); }, [reload]);
  useEffect(() => { const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void reload(); }); return () => subscription.remove(); }, [reload]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(timer); }, []);

  const open = (actionScope: string, actionId: string, input?: Record<string, unknown>, title?: string) => {
    void (async () => {
      try {
        const registry = actionScope === scope ? { actions } : await harness.workspaceRegistry(actionScope);
        const action = registry.actions.find((item) => item.id === actionId);
        if (!action) {
          Alert.alert('Action unavailable', 'Your role cannot perform this action.');
          return;
        }
        setOpenAction({ action, scope: actionScope, input, title });
      } catch (cause) {
        Alert.alert('Could not open action', cause instanceof Error ? cause.message : 'Try again.');
      }
    })();
  };

  const openCard = (card: HarnessCanvasCard) => {
    if (card.kind === 'action') open(scope, card.actionId, card.initialInput, card.title);
    else if (card.kind === 'flow') open(scope, card.actionId || 'flow.start', card.initialInput || { flowId: card.flowId }, card.title);
  };

  const openOrder = (source: InboxSource, order: HarnessRecord) => {
    open(source.workspace.slug, 'pos.open', { section: 'sell', orderId: order.id }, `Order ${order.id.slice(-6).toUpperCase()}`);
  };

  const updateOrderItem = async (source: InboxSource, order: HarnessRecord, productId: string, status: 'preparing' | 'ready') => {
    try {
      await harness.executeAction(source.workspace.slug, 'pos.order.item.update', { orderId: order.id, version: order.version, productId, status }, createOperationKey(`pos.order.item:${order.id}:${productId}`));
      await reload();
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
    setAreaFilter(slug);
    if (slug === 'all' || tab === 'inbox') return;
    if (tab === 'space') {
      setSpaceOverride(slug);
      void harness.holdContext(slug).catch((cause) => Alert.alert('Could not hold this Space', cause instanceof Error ? cause.message : 'Try again.'));
    }
    onSelectWorkspace(slug);
  };
  const resumeAutomaticContext = () => {
    void harness.resumeContext().then(() => { setSpaceOverride(undefined); void reload(); })
      .catch((cause) => Alert.alert('Could not resume automatic Space', cause instanceof Error ? cause.message : 'Try again.'));
  };
  const activeWorkspace = workspaces.find((item) => item.slug === scope) || workspaces[0];
  const canManageSite = activeWorkspace?.mode === 'work' && (role === 'owner' || role === 'admin');
  const configureRoutine = () => {
    const personal = workspaces.find((item) => item.mode === 'personal');
    if (!personal) { Alert.alert('Personal is unavailable', 'Refresh your workspaces and try again.'); return; }
    open(personal.slug, 'routine.save', {
      label: workspaceName || activeWorkspace?.name || 'Work', workspace: scope,
      role: activeWorkspace?.workRole && activeWorkspace.workRole !== 'general' ? activeWorkspace.workRole : '',
      start: '09:00', end: '17:00', days: '1,2,3,4,5', priority: 0,
    }, 'When should this Space appear?');
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
      {teamOpen ? <WorkspaceTeam key={scope} scope={scope} name={workspaceName} onClose={() => setTeamOpen(false)} onChanged={() => { void reload(); }} /> : null}
      {tab === 'flows' ? (
        <View style={[styles.tabBody, { paddingTop: insets.top }]}>
          <AreaRail sources={workspaces.map((workspace) => ({ workspace, tasks: [], orders: [] }))} value={scope} onChange={chooseArea} onCreate={onCreateWorkspace} showAllWorkspaces onSearch={() => setSearchOpen(true)} onSettings={() => router.push('/settings')} showMembers={activeWorkspace?.mode === 'work'} onMembers={() => setTeamOpen(true)} />
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
        <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setLoading(true); void reload(); }} />} style={styles.scroll} contentContainerStyle={[styles.content, tab === 'ask' && styles.askContent, { paddingTop: insets.top + 12, paddingBottom: tab === 'ask' ? 16 : insets.bottom + 24 }]}>
          {tab === 'inbox' ? <AreaRail sources={inboxSources} value={areaFilter} onChange={chooseArea} onCreate={onCreateWorkspace} showAllWorkspaces allowAllAreas onSearch={() => setSearchOpen(true)} onSettings={() => router.push('/settings')} showMembers={activeWorkspace?.mode === 'work'} onMembers={() => setTeamOpen(true)} /> : null}
          {(tab === 'space' || tab === 'ask') && activeWorkspace ? <AreaRail sources={workspaces.map((workspace) => ({ workspace, tasks: [], orders: [] }))} value={scope} onChange={chooseArea} onCreate={onCreateWorkspace} showAllWorkspaces onSearch={() => setSearchOpen(true)} onSettings={() => router.push('/settings')} showMembers={activeWorkspace.mode === 'work'} onMembers={() => setTeamOpen(true)} /> : null}

          {tab === 'space' && spaceContext ? <View style={styles.contextPanel}>
            <View style={styles.contextCopy}>
              <Text style={styles.contextTitle}>{spaceContext.label}</Text>
              <Text style={styles.contextMeta}>{spaceContext.workspace.name} · {spaceContext.role} · Owner: {spaceContext.owner}</Text>
            </View>
            <View style={styles.contextControls}>
              <Pressable accessibilityRole="button" onPress={configureRoutine} style={styles.autoButton}><Text style={styles.autoButtonText}>Schedule</Text></Pressable>
              {spaceContext.held ? <Pressable accessibilityRole="button" onPress={resumeAutomaticContext} style={styles.autoButton}><Text style={styles.autoButtonText}>Auto</Text></Pressable> : null}
            </View>
          </View> : null}
          {tab === 'space' && spaceDecision === 'confirm' && spaceContext ? <View style={styles.contextQuestion}>
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
                <Text style={styles.askMessage}>{askSuggestion ? askSuggestion.title ? `${askSuggestion.title} is the clearest first action${askSuggestion.confidence === null ? '.' : ` (${Math.round(askSuggestion.confidence * 100)}% confidence).`}` : 'No registered action is a clear match. Add detail or create a Flow Book.' : 'Describe an outcome. Jev will rank registered actions and keep execution behind your review.'}</Text>
                {askSuggestion?.action ? <Pressable accessibilityRole="button" onPress={() => open(scope, askSuggestion.action!, {}, askSuggestion.title || 'Review action')} style={styles.askReview}><Text style={styles.askReviewText}>Review {askSuggestion.title || 'action'}</Text></Pressable> : null}
              </View> : null}
              {tab === 'space' ? spaceRecords ? <>
                <TouchableOpacity style={styles.workCard} onPress={() => setSpaceRecords(null)} accessibilityRole="button" accessibilityLabel="Back to Space"><Ionicons name="arrow-back" size={20} color={colors.blue} /><Text style={styles.canvasRowTitle}>Space</Text></TouchableOpacity>
                <RecordsSection key={spaceRecords} scope={scope} records={records} initialFilter={spaceRecords} hasMore={spaceRecords === 'all' && recordNext !== null} isLoading={loading} loadError={error} loadingMore={loadingMoreRecords} onLoadMore={() => void loadMoreRecords()} onRetry={() => { setLoading(true); void reload(); }} canCreate={canCreateRecord} onSelectRecord={(r) => selectRecord(r)} onCreateRecord={handleCreateRecord} />
              </> : spaceFlows ? <>
                <TouchableOpacity style={styles.workCard} onPress={() => setSpaceFlows(false)} accessibilityRole="button" accessibilityLabel="Back to Space"><Ionicons name="arrow-back" size={20} color={colors.blue} /><Text style={styles.canvasRowTitle}>Space</Text></TouchableOpacity>
                <FlowBooks
                  books={books}
                  runs={flowRuns}
                  canCreate={role === 'owner' || role === 'admin'}
                  onCreate={() => setOpenAction({ action: flowPublishAction, scope, input: {}, title: 'Create a reusable process' })}
                  onStart={(flowId, title) => open(scope, 'flow.start', { flowId }, title)}
                  onResume={(run) => open(scope, 'flow.start', { flowId: run.flowId, runId: run.id }, run.name || 'Continue Flow Book')}
                />
              </> : <>
                <TouchableOpacity style={styles.workCard} onPress={() => setSpaceRecords('contacts')} accessibilityRole="button" accessibilityLabel="Open Contacts"><Ionicons name="people-outline" size={21} color={colors.blue} /><Text style={styles.canvasRowTitle}>Contacts</Text><Ionicons name="chevron-forward" size={17} color="#9aa3b1" /></TouchableOpacity>
                <TouchableOpacity style={styles.workCard} onPress={() => setSpaceRecords('all')} accessibilityRole="button" accessibilityLabel="Open Records"><Ionicons name="folder-outline" size={21} color={colors.blue} /><Text style={styles.canvasRowTitle}>Records</Text><Ionicons name="chevron-forward" size={17} color="#9aa3b1" /></TouchableOpacity>
                <TouchableOpacity style={[styles.workCard, styles.workCardLast]} onPress={() => setSpaceFlows(true)} accessibilityRole="button" accessibilityLabel="Open Flow Books"><Ionicons name="git-branch-outline" size={21} color={colors.blue} /><Text style={styles.canvasRowTitle}>Flow Books</Text><Ionicons name="chevron-forward" size={17} color="#9aa3b1" /></TouchableOpacity>
                <View style={styles.canvasSection}><Canvas cards={cards} onOpen={openCard} onOpenSite={() => setSiteOpen(true)} canManageSite={canManageSite} /></View>
              </> : null}
              {tab === 'inbox' ? (
                <UnifiedInbox
                  sources={inboxSources}
                  filter={areaFilter}
                  now={now}
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
        onSuccess={() => { setOpenAction(null); void reload(); }}
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
        onClose={() => { setSiteOpen(false); void reload(); }}
        workspaceName={workspaceName}
        subdomain={scope}
        scope={scope}
      />
    </View>
  );
}

function AreaRail({ sources, value, onChange, onCreate, showAllWorkspaces = false, allowAllAreas = false, onSearch, onSettings, showMembers = false, onMembers }: { sources: InboxSource[]; value: string; onChange: (slug: string) => void; onCreate: () => void; showAllWorkspaces?: boolean; allowAllAreas?: boolean; onSearch: () => void; onSettings: () => void; showMembers?: boolean; onMembers: () => void }) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const relevant = sources.filter((source) => showAllWorkspaces || source.tasks.length || source.orders.length);
  const selected = sources.find((source) => source.workspace.slug === value);
  const label = selected ? selected.workspace.mode === 'personal' ? 'Personal' : selected.workspace.name : 'All areas';
  const sheetMaxHeight = Math.min(520, screenHeight * 0.72);
  const choose = (slug: string) => { onChange(slug); setOpen(false); };

  return (
    <View style={styles.areaPicker}>
      <View style={styles.workspaceBar}>
      <TouchableOpacity onPress={() => setOpen((current) => !current)} style={styles.areaTrigger} accessibilityRole="button" accessibilityLabel={`Switch workspace. Current: ${label}`} accessibilityState={{ expanded: open }}>
        <Text numberOfLines={1} style={styles.areaTriggerText}>{label}</Text>
      </TouchableOpacity>
        <View style={styles.workspaceActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Search contacts and records" onPress={onSearch} style={styles.headerIconButton}><Ionicons name="search-outline" size={19} color={colors.blue} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open Settings" onPress={onSettings} style={styles.headerIconButton}><Ionicons name="settings-outline" size={19} color={colors.blue} /></Pressable>
          {showMembers ? <Pressable accessibilityRole="button" accessibilityLabel="Open Members and chat" onPress={onMembers} style={styles.headerIconButton}><Ionicons name="people-outline" size={19} color={colors.blue} /></Pressable> : null}
        </View>
      </View>
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
              {relevant.map(({ workspace }) => {
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
  filter,
  now,
  onOpenOrder,
  onUpdateOrder,
  onOpenTask,
  onCompleteTask,
}: {
  sources: InboxSource[];
  filter: string;
  now: number;
  onOpenOrder: (source: InboxSource, order: HarnessRecord) => void;
  onUpdateOrder: (source: InboxSource, order: HarnessRecord, productId: string, status: 'preparing' | 'ready') => void;
  onOpenTask: (source: InboxSource, task: HarnessRecord) => void;
  onCompleteTask: (source: InboxSource, task: HarnessRecord) => void;
}) {
  const visibleSources = useMemo(() => filter === 'all' ? sources : sources.filter((source) => source.workspace.slug === filter), [filter, sources]);
  const showWorkspace = filter === 'all' && visibleSources.filter((source) => source.tasks.length || source.orders.length).length > 1;
  const groups = useMemo(() => {
    const entries: InboxEntry[] = visibleSources.flatMap((source) => [
      ...source.tasks.map((record) => ({ kind: 'task' as const, record, source })),
      ...source.orders.map((record) => ({ kind: 'order' as const, record, source })),
    ]).sort((a, b) => entryPriority(a, now) - entryPriority(b, now) || (scheduledAt(a.record) ?? a.record.updatedAt) - (scheduledAt(b.record) ?? b.record.updatedAt));
    return [
      { label: 'NOW', entries: entries.filter((entry) => entryPriority(entry, now) < 3) },
      { label: 'NEXT', entries: entries.filter((entry) => entryPriority(entry, now) === 3) },
    ].filter((group) => group.entries.length);
  }, [now, visibleSources]);

  if (!groups.length) return <Empty text="Nothing needs your attention here." />;
  return (
    <>
      {groups.map((group) => (
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

function FlowBooks({ books, runs, canCreate, onCreate, onStart, onResume }: { books: HarnessFlowBook[]; runs: HarnessFlowRun[]; canCreate: boolean; onCreate: () => void; onStart: (flowId: string, title: string) => void; onResume: (run: HarnessFlowRun) => void }) {
  return <View>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}><View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontSize: 25, fontWeight: '800' }}>Flow Books</Text><Text style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}>Reusable processes for the work you do.</Text></View>{canCreate ? <TouchableOpacity accessibilityRole="button" onPress={onCreate} style={styles.createButton}><Ionicons name="add" size={17} color={colors.blue} /><Text style={styles.createButtonText}>Create</Text></TouchableOpacity> : null}</View>
    {runs.length ? <><Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginTop: 20, marginBottom: 8 }}>IN PROGRESS</Text>{runs.map((run) => <TouchableOpacity key={run.id} accessibilityRole="button" onPress={() => onResume(run)} style={styles.workCard}><View style={[styles.workIcon, { backgroundColor: '#FFF2D7' }]}><Ionicons name="time-outline" size={20} color={colors.amber} /></View><View style={{ flex: 1 }}><Text style={styles.canvasRowTitle}>{run.name || 'Flow Book'}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>Continue at step {(run.step || 0) + 1}</Text></View><Ionicons name="chevron-forward" size={17} color="#9aa3b1" /></TouchableOpacity>)}</> : null}
    <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginTop: 20, marginBottom: 8 }}>AVAILABLE BOOKS</Text>
    {books.length ? books.map((book) => {
      const actions = Array.isArray(book.data.actions) ? book.data.actions : [];
      const description = typeof book.data.description === 'string' && book.data.description ? book.data.description : `${actions.length} ordered ${actions.length === 1 ? 'step' : 'steps'}`;
      return <TouchableOpacity key={book.id} accessibilityRole="button" onPress={() => onStart(book.id, book.name)} style={styles.workCard}><View style={styles.workIcon}><Ionicons name="git-branch-outline" size={20} color={colors.blue} /></View><View style={{ flex: 1 }}><Text style={styles.canvasRowTitle}>{book.name}</Text><Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 }}>{description}</Text></View><Ionicons name="play-circle-outline" size={21} color={colors.blue} /></TouchableOpacity>;
    }) : <View style={{ paddingVertical: 28, alignItems: 'center' }}><Ionicons name="git-branch-outline" size={32} color={colors.faint} /><Text style={{ color: colors.muted, fontSize: 14, marginTop: 10 }}>No Flow Books yet.</Text>{canCreate ? <Text style={{ color: colors.faint, fontSize: 12, marginTop: 3 }}>Create one from your registered Actions.</Text> : null}</View>}
  </View>;
}

function Canvas({
  cards,
  onOpen,
  onOpenSite,
  canManageSite,
}: {
  cards: HarnessCanvasCard[];
  onOpen: (card: HarnessCanvasCard) => void;
  onOpenSite: () => void;
  canManageSite: boolean;
}) {
  const data = cards.filter((card) => card.kind === 'data');
  const work = cards.filter((card) => card.kind !== 'data');
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = { sell: 'bag-outline', orders: 'receipt-outline', stock: 'cube-outline', customers: 'people-outline', register: 'cash-outline' };

  return (
    <>
      <View style={styles.metricGrid}>
        {data.map((card) => (
          <View key={card.id} style={[styles.metric, card.id.startsWith('pos-') && styles.posMetric]}>
            <Text numberOfLines={1} style={styles.metricTitle}>{card.title}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, card.id.startsWith('pos-') && styles.posMetricValue]}>{card.value}</Text>
          </View>
        ))}
      </View>
      {canManageSite ? (
        <TouchableOpacity style={styles.workCard} onPress={onOpenSite} accessibilityRole="button" accessibilityLabel="Open Site Studio">
          <View style={styles.workIcon}>
            <Ionicons name="globe-outline" size={21} color="#536174" />
          </View>
          <Text style={styles.canvasRowTitle}>Site Studio</Text>
          <Ionicons name="chevron-forward" size={17} color="#9aa3b1" />
        </TouchableOpacity>
      ) : null}
      {work.map((card) => (
        <TouchableOpacity key={card.id} style={styles.workCard} onPress={() => onOpen(card)}>
          <View style={styles.workIcon}>
            <Ionicons name={icons[String(card.initialInput?.section)] || (card.kind === 'flow' ? 'git-branch-outline' : 'flash-outline')} size={21} color="#536174" />
          </View>
          <Text style={styles.canvasRowTitle}>{card.title}</Text>
          <Ionicons name="chevron-forward" size={17} color="#9aa3b1" />
        </TouchableOpacity>
      ))}
    </>
  );
}

function RecordsSection({
  scope,
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
}: {
  scope: string;
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

  const categories = [
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
      {/* Category filter rail */}
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

      {filter === 'contacts' ? <View style={styles.contactSearch}>
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

      {/* Action Header */}
      <View style={styles.recordsHeader}>
        <Text style={styles.recordsHeaderTitle}>
          {filter === 'all' ? 'Records' : categories.find((c) => c.id === filter)?.label}
        </Text>
        {canCreate(filter === 'all' ? undefined : filter) ? <TouchableOpacity accessibilityRole="button" style={styles.createButton} onPress={() => onCreateRecord(filter === 'all' ? undefined : filter)}>
          <Ionicons name="add" size={17} color={colors.blue} />
          <Text style={styles.createButtonText}>{filter === 'contacts' ? 'Add contact' : filter === 'orders' ? 'New order' : filter === 'products' ? 'New product' : filter === 'tasks' ? 'New task' : 'New'}</Text>
        </TouchableOpacity> : null}
      </View>

      {/* Records list */}
      {filtered.length ? (
        filtered.map((record) => {
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
        })
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
        <Pressable onPress={onComplete} disabled={!source.permissions?.completeTask} hitSlop={8} style={styles.rowAction} accessibilityLabel={`Complete ${task.title}`}>
          <Text style={styles.rowActionText}>Done</Text>
          <Ionicons name="ellipse-outline" size={16} color={colors.blue} />
        </Pressable>
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
  page: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  tabBody: { flex: 1 },
  content: { paddingHorizontal: 18 },
  askContent: { flexGrow: 1 },
  askEmpty: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 60 },
  askMark: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#F1ECFA' },
  askTitle: { color: colors.ink, fontSize: 20, fontWeight: '700', marginTop: 14 },
  askMessage: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center', maxWidth: 280 },
  askComposer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, backgroundColor: '#fff' },
  askInputBar: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, borderRadius: 27, backgroundColor: '#F0F0F2' },
  askControl: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  askInput: { flex: 1, maxHeight: 104, paddingVertical: 12, color: colors.ink, fontSize: 15 },
  headerIconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  areaPicker: { alignItems: 'stretch', marginBottom: 12 },
  contextPanel: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  contextCopy: { flex: 1, gap: 2 },
  contextTitle: { color: colors.ink, fontSize: 19, lineHeight: 24, fontWeight: '700' },
  contextMeta: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  autoButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.wash },
  autoButtonText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  contextControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  askReview: { marginTop: 4, minHeight: 42, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#6D45C5' },
  askReviewText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  contextQuestion: { gap: 8, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: '#FAFBFD' },
  contextQuestionTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  contextOption: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 9, backgroundColor: '#FFFFFF' },
  contextOptionTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  contextOptionMeta: { color: colors.muted, fontSize: 12 },
  workspaceBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 18, paddingTop: 12 },
  workspaceActions: { flexDirection: 'row', alignItems: 'center' },
  areaTrigger: { minHeight: 56, maxWidth: 210, minWidth: 0, flexShrink: 1, paddingHorizontal: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10 },
  areaTriggerText: { flexShrink: 1, fontSize: 22, fontWeight: '900', color: colors.ink, letterSpacing: -0.4 },
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
  inboxGroup: { marginBottom: 22 },
  inboxGroupLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: colors.faint, marginBottom: 7 },
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
  emptyState: { minHeight: 72, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 4 },
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
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  metric: { flexGrow: 1, flexBasis: '45%', minHeight: 132, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 16, justifyContent: 'space-between', backgroundColor: '#fff' },
  posMetric: { minHeight: 76, flexBasis: '27%', padding: 10, borderRadius: 6 },
  metricTitle: { fontSize: 13, fontWeight: '700', color: colors.muted },
  metricValue: { fontSize: 28, fontWeight: '700', color: colors.ink },
  posMetricValue: { fontSize: 21 },
  workCard: { minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 12 },
  workCardLast: { borderBottomWidth: 0 },
  canvasSection: { marginTop: 14 },
  workIcon: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' },
  canvasRowTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink },
  recordsWrapper: { marginTop: 0 },
  filterRail: { flexGrow: 1, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 2 },
  filterChip: { minHeight: 48, minWidth: 48, flexGrow: 1, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  filterChipActive: { borderBottomColor: colors.blue },
  filterChipText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  filterChipTextActive: { color: colors.selected },
  contactSearch: { minHeight: 48, marginTop: 8, marginBottom: 8, paddingHorizontal: 12, borderRadius: 9, backgroundColor: colors.wash, flexDirection: 'row', alignItems: 'center', gap: 9 },
  contactSearchInput: { flex: 1, minWidth: 0, height: 48, paddingHorizontal: 0, paddingVertical: 0, color: colors.ink, fontSize: 14, includeFontPadding: false },
  recordsHeader: { minHeight: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  recordsHeaderTitle: { fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  createButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4 },
  createButtonText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  recordCard: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingVertical: 10 },
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
