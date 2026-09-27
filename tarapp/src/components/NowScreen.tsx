import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionInterfaceHost from '@/action-interfaces/ActionInterfaceHost';
import { useWorkspace } from '@/components/WorkspaceProvider';
import { createOperationKey, HarnessRequestError, harness, type HarnessAction, type HarnessInterfaceContract, type HarnessSpace, type NowFeed } from '@/lib/harness';
import { cachedNow, refreshNow } from '@/lib/now-replica';
import { takeNowReload } from '@/lib/now-navigation';

const ink = '#1B1C20';
const muted = '#626671';
const blue = '#3157A8';
const startupClock = Date.now();
const empty: NowFeed = { rows: [], sources: [], sync: {}, partial: true, failed: [] };
const feedCache = new Map<string, NowFeed>();
export function clearNowCache() { feedCache.clear(); }
type OpenAction = { action: HarnessAction; interfaces: HarnessInterfaceContract[]; scope: string; input: Record<string, unknown>; title: string };
type AskSuggestion = { action: string | null; title: string | null; confidence: number | null; review: true };

export default function NowScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workspaces, current, selectWorkspace, createWorkspace } = useWorkspace();
  const personalId = workspaces.find((workspace) => workspace.mode === 'personal')?.id || current.id;
  const [feed, setFeed] = useState<NowFeed>(() => feedCache.get(personalId) || empty);
  const [space, setSpace] = useState<HarnessSpace | null>(null);
  const [loading, setLoading] = useState(!feedCache.has(personalId));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [finding, setFinding] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [menu, setMenu] = useState<'tools' | 'change' | 'filter' | null>(null);
  const [tools, setTools] = useState<{ scope: string; workspace: string; action: HarnessAction; interfaces: HarnessInterfaceContract[] }[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [openAction, setOpenAction] = useState<OpenAction | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [askDraft, setAskDraft] = useState('');
  const [askSuggestion, setAskSuggestion] = useState<AskSuggestion | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState('');
  const [clock, setClock] = useState(startupClock);
  const activeRefresh = useRef<Promise<void> | null>(null);
  const lastRefresh = useRef(0);
  const lastWorkspaces = useRef(workspaces);

  const reload = useCallback(async (refresh?: string, force = false) => {
    if (activeRefresh.current) {
      if (!refresh && !force) return activeRefresh.current;
      await activeRefresh.current;
    }
    const publish = (next: NowFeed) => {
      feedCache.set(personalId, next);
      setFeed(next);
      setError('');
      if (next.context && next.decision) setSpace({ context: next.context, decision: next.decision,
        alternatives: next.alternatives || [], sections: [] });
    };
    lastRefresh.current = Date.now();
    const task = (async () => {
      try {
        publish(await refreshNow(personalId, workspaces, refresh, publish, feedCache.get(personalId)));
      } catch (cause) {
        if (cause instanceof HarnessRequestError && cause.status === 401) { router.replace('/auth'); return; }
        setFeed((previous) => ({ ...previous, partial: true }));
        setError(cause instanceof Error ? cause.message : 'Now could not refresh.');
      } finally { setLoading(false); setRefreshing(false); }
    })();
    activeRefresh.current = task;
    try { await task; } finally { if (activeRefresh.current === task) activeRefresh.current = null; }
  }, [personalId, router, workspaces]);

  useEffect(() => {
    let active = true;
    const force = lastWorkspaces.current !== workspaces;
    lastWorkspaces.current = workspaces;
    void cachedNow(personalId).then((cached) => {
      if (active && cached) { feedCache.set(personalId, cached); setFeed(cached); setLoading(false); }
    }).catch(() => undefined).finally(() => { if (active) void reload(undefined, force); });
    return () => { active = false; };
  }, [personalId, reload, workspaces]);
  useEffect(() => {
    const refreshIfDue = () => { if (AppState.currentState === 'active' && Date.now() - lastRefresh.current >= 15_000) void reload(); };
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') { setClock(Date.now()); refreshIfDue(); } });
    const interval = setInterval(refreshIfDue, 60_000);
    return () => { subscription.remove(); clearInterval(interval); };
  }, [reload]);
  useEffect(() => {
    const interval = setInterval(() => setClock(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);
  useFocusEffect(useCallback(() => {
    const source = takeNowReload();
    if (source) void reload(source, true);
  }, [reload]));

  const rows = useMemo(() => feed.rows.filter((row) => (!filter || row.workspace.id === filter)
    && (!query.trim() || `${row.title} ${row.parent || ''} ${row.workspace.name} ${row.role} ${row.state}`.toLowerCase().includes(query.trim().toLowerCase()))), [feed.rows, filter, query]);
  const context = space?.context;
  const contextName = feed.decision === 'confirm' ? 'Choose a Space context'
    : context ? `${context.workspace.name} / ${context.role} / Owner: ${context.owner}` : `${current.name} / ${current.workRole || current.role}`;
  const failed = new Set(feed.failed);
  const failedNames = feed.failed.map((id) => feed.sources.find((source) => source.id === id)?.name || id).join(', ');
  const lastUpdated = Math.max(0, ...Object.values(feed.sync));

  const showTools = async () => {
    setMenu('tools');
    setToolsLoading(true);
    const results = await Promise.allSettled(workspaces.map(async (workspace) => ({ workspace,
      registry: await harness.workspaceRegistry(workspace.slug) })));
    const generic = new Set(['pos.open', 'task.create', 'record.create', 'contact.create', 'flow.start', 'site.generate', 'web.search']);
    setTools(results.flatMap((result) => result.status === 'fulfilled'
      ? result.value.registry.actions.filter((action) => generic.has(action.id)).map((action) => ({ scope: result.value.workspace.slug,
        workspace: result.value.workspace.name, action, interfaces: result.value.registry.interfaces })) : []));
    setToolsLoading(false);
  };

  const change = async (slug: string, role?: string) => {
    setMenu(null);
    try {
      await harness.holdContext(slug, 15 * 60_000, role);
      selectWorkspace(slug);
      setSpace(null);
      await reload(undefined, true);
    } catch (cause) { Alert.alert('Could not change context', cause instanceof Error ? cause.message : 'Try again.'); }
  };

  const askTar = async () => {
    const prompt = askDraft.trim();
    if (!prompt || asking) return;
    setAsking(true);
    setAskError('');
    setAskSuggestion(null);
    try {
      const suggestion = await harness.executeAction<AskSuggestion>(current.slug, 'flow.suggest', { prompt }, createOperationKey('flow.suggest'));
      setAskSuggestion(suggestion);
      setAskDraft('');
    } catch (cause) {
      setAskError(cause instanceof Error ? cause.message : 'Ask TAR could not respond. Try again.');
    } finally { setAsking(false); }
  };

  const reviewSuggestion = async () => {
    const suggestion = askSuggestion;
    if (!suggestion?.action) return;
    try {
      const registry = await harness.workspaceRegistry(current.slug);
      const action = registry.actions.find((candidate) => candidate.id === suggestion.action);
      if (!action) throw new Error('This action is no longer available in this workspace.');
      setAskOpen(false);
      setOpenAction({ action, interfaces: registry.interfaces, scope: current.slug, input: {}, title: suggestion.title || action.title });
    } catch (cause) {
      setAskError(cause instanceof Error ? cause.message : 'Could not open the suggested action.');
    }
  };

  return <View style={[styles.page, { paddingTop: insets.top + 8 }]}>
    <View style={styles.top}>
      <View><Text style={styles.title}>Now</Text><Text style={styles.clock}>{new Date(clock).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View>
      <View style={styles.topActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Find work" onPress={() => setFinding((value) => !value)} style={styles.icon}><Ionicons name="search" size={21} color={ink} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Tools" onPress={() => void showTools()} style={styles.icon}><Ionicons name="grid-outline" size={21} color={ink} /></Pressable>
      </View>
    </View>
    <Pressable accessibilityRole="button" onPress={() => setMenu('change')} style={styles.context}>
      <Text style={styles.contextName}>{contextName}</Text>
      <Text style={styles.contextMode}>{feed.decision === 'confirm' ? 'Equal routines need your choice' : `${context?.label || 'Current context'} · ${context?.held ? 'Chosen' : 'Auto'}`}  Change ›</Text>
    </Pressable>
    {finding ? <TextInput autoFocus accessibilityLabel="Search Now" placeholder="Find work across workspaces" value={query} onChangeText={setQuery} style={styles.search} /> : null}
    {filter ? <Pressable accessibilityRole="button" onPress={() => setFilter(null)} style={styles.cue}><Text style={styles.cueText}>Filtered: {feed.sources.find((source) => source.id === filter)?.name || 'Workspace'} · Clear</Text></Pressable>
      : <Pressable accessibilityRole="button" onPress={() => setMenu('filter')} style={styles.filter}><Text style={styles.filterText}>Filter</Text><Ionicons name="options-outline" size={16} color={blue} /></Pressable>}
    {feed.partial || error ? <Pressable accessibilityRole="button" onPress={() => { setRefreshing(true); void reload(); }} style={styles.partial}>
      <Text style={styles.partialText}>{error || `Some sources are stale${failedNames ? `: ${failedNames}` : ''}. Known work is shown.`} {lastUpdated ? `Last updated ${new Date(lastUpdated).toLocaleTimeString()}.` : ''} Retry ›</Text>
    </Pressable> : null}
    <FlatList style={styles.list} data={rows} keyExtractor={(row) => row.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void reload(); }} />}
      contentContainerStyle={{ paddingBottom: 12 }} initialNumToRender={24} maxToRenderPerBatch={24} windowSize={9}
      renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/(home)/open/[source]/[id]', params: { source: item.workspace.slug, id: item.id } })} style={styles.row}>
        <View style={styles.rowHead}><Text style={styles.kind}>[{item.kind === 'action' ? 'A' : item.kind === 'flow' ? 'F' : item.kind === 'artifact' ? '#' : 'S'}]</Text>
          <Text numberOfLines={2} style={styles.rowTitle}>{item.quantity ? `${item.quantity}× ` : ''}{item.title}</Text>
          <Text style={styles.state}>{feed.next === item.id ? 'NEXT' : item.state.toUpperCase()} ›</Text></View>
        <Text style={styles.meta}>{item.workspace.name} / {item.role}{item.parent ? ` / ${item.parent}` : ''}{item.due ? ` / ${new Date(item.due).toLocaleString()}` : ''}{item.lane === 'waiting' ? ' / Waiting' : ''}{failed.has(item.source) ? ' / Stale' : ''}</Text>
      </Pressable>}
      ListEmptyComponent={loading ? <ActivityIndicator style={{ marginTop: 30 }} color={blue} /> : <Text style={styles.empty}>{feed.partial ? 'Known work is unavailable. Retry to load every source.' : query || filter ? 'No work matches this filter.' : 'All clear for now.'}</Text>}
    />
    <View style={[styles.askSafeArea, { paddingBottom: insets.bottom }]}><Pressable accessibilityRole="button" accessibilityLabel="Ask TAR" onPress={() => { setAskError(''); setAskOpen(true); }} style={styles.ask}><Text style={styles.askText}>Ask TAR…</Text><Ionicons name="arrow-forward" size={18} color={blue} /></Pressable></View>

    <Modal visible={askOpen} transparent animationType="slide" onRequestClose={() => setAskOpen(false)}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View style={styles.sheetHead}><Text style={styles.sheetTitle}>Ask TAR</Text><Pressable accessibilityRole="button" onPress={() => setAskOpen(false)}><Text style={styles.back}>Close</Text></Pressable></View>
          <Text style={styles.askHint}>Describe what you want to do. Review the suggested action before it runs.</Text>
          <TextInput accessibilityLabel="Ask TAR request" autoFocus multiline value={askDraft} onChangeText={setAskDraft} placeholder="What would you like to do?" style={styles.askInput} />
          {askError ? <Text style={styles.askError}>{askError}</Text> : null}
          {askSuggestion ? <View style={styles.suggestion}>
            <Text style={styles.suggestionText}>{askSuggestion.title ? `Suggested action: ${askSuggestion.title}` : 'No matching action. Try a more specific request.'}</Text>
            {askSuggestion.action ? <Pressable accessibilityRole="button" onPress={() => void reviewSuggestion()} style={styles.review}><Text style={styles.reviewText}>Review {askSuggestion.title || 'action'}</Text></Pressable> : null}
          </View> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Send request to TAR" disabled={!askDraft.trim() || asking} onPress={() => void askTar()} style={[styles.send, (!askDraft.trim() || asking) && styles.sendDisabled]}>
            {asking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sendText}>Send</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    <Modal visible={Boolean(menu)} transparent animationType="slide" onRequestClose={() => setMenu(null)}><View style={styles.overlay}>
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.sheetHead}><Text style={styles.sheetTitle}>{menu === 'tools' ? 'Tools' : menu === 'filter' ? 'Filter Now' : 'Change context'}</Text><Pressable accessibilityRole="button" onPress={() => setMenu(null)}><Text style={styles.back}>Close</Text></Pressable></View>
        <ScrollView>
          {menu === 'filter' ? <><Pressable onPress={() => { setFilter(null); setMenu(null); }} style={styles.option}><Text>All authorized work</Text></Pressable>{feed.sources.map((source) => <Pressable key={source.id} onPress={() => { setFilter(source.id); setMenu(null); }} style={styles.option}><Text>{source.name}</Text></Pressable>)}</> : null}
          {menu === 'change' ? <><Pressable onPress={() => { setMenu(null); void harness.resumeContext().then(() => { setSpace(null); return reload(undefined, true); }).catch((cause) => Alert.alert('Could not resume automatic context', cause instanceof Error ? cause.message : 'Try again.')); }} style={styles.option}><Text>Automatic context</Text></Pressable>{(space?.decision === 'confirm' ? [space.context, ...space.alternatives] : []).map((choice) => <Pressable key={choice.id} onPress={() => void change(choice.workspace.slug, choice.role)} style={styles.option}><Text>{choice.label} / {choice.workspace.name} / {choice.role}</Text></Pressable>)}{workspaces.map((workspace) => <Pressable key={workspace.id} onPress={() => void change(workspace.slug)} style={styles.option}><Text>{workspace.name}</Text></Pressable>)}</> : null}
          {menu === 'tools' ? <>
            <Pressable accessibilityRole="button" onPress={() => { setMenu(null); router.push('/(home)/workspace'); }} style={styles.option}><Text>Workspace</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setMenu(null); createWorkspace(); }} style={styles.option}><Text>Create workspace</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setMenu(null); router.push('/settings'); }} style={styles.option}><Text>Settings</Text></Pressable>
            {toolsLoading ? <ActivityIndicator color={blue} /> : tools.map((tool) => <Pressable key={`${tool.scope}:${tool.action.id}`} onPress={() => { setMenu(null); setOpenAction({ action: tool.action, interfaces: tool.interfaces, scope: tool.scope, input: {}, title: tool.action.title }); }} style={styles.option}><Text>[T] {tool.action.title} / {tool.workspace}</Text></Pressable>)}
          </> : null}
        </ScrollView>
      </View>
    </View></Modal>
    <ActionInterfaceHost action={openAction?.action || null} contracts={openAction?.interfaces || []} scope={openAction?.scope || current.slug} initialInput={openAction?.input} contextTitle={openAction?.title}
      onClose={() => setOpenAction(null)} onSuccess={() => { const source = openAction?.scope; setOpenAction(null); void reload(source); }} />
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' }, list: { flex: 1 }, top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  title: { fontSize: 30, fontWeight: '800', color: ink }, clock: { fontSize: 12, color: muted }, topActions: { flexDirection: 'row', gap: 8 },
  icon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, context: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F5F7FA' },
  contextName: { fontSize: 13, color: ink, fontWeight: '700' }, contextMode: { fontSize: 12, color: muted, marginTop: 4 },
  search: { margin: 14, marginBottom: 4, borderWidth: 1, borderColor: '#D8DBE3', borderRadius: 10, paddingHorizontal: 12, height: 44 },
  filter: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 5, padding: 12, marginRight: 10 }, filterText: { color: blue, fontWeight: '700' },
  cue: { padding: 12, backgroundColor: '#EAF0FC' }, cueText: { color: blue, fontWeight: '700' }, partial: { padding: 12, backgroundColor: '#FFF4DF' }, partialText: { color: '#825500', lineHeight: 20 },
  row: { paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#D8DBE3', minHeight: 76 }, rowHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  kind: { color: blue, fontSize: 13, fontWeight: '800', marginTop: 2 }, rowTitle: { flex: 1, color: ink, fontSize: 16, fontWeight: '700' }, state: { color: muted, fontSize: 11, fontWeight: '700' },
  meta: { color: muted, fontSize: 12, marginLeft: 27, marginTop: 5 }, empty: { color: muted, textAlign: 'center', marginTop: 36, paddingHorizontal: 25 },
  askSafeArea: { backgroundColor: '#FFFFFF' }, ask: { minHeight: 56, paddingHorizontal: 20, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#D8DBE3', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, askText: { color: muted, fontSize: 15 },
  askHint: { color: muted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  askInput: { minHeight: 90, maxHeight: 160, borderWidth: StyleSheet.hairlineWidth, borderColor: '#C9CED8', borderRadius: 10, padding: 12, color: ink, fontSize: 15, textAlignVertical: 'top' },
  askError: { color: '#B42318', fontSize: 13, marginTop: 10 },
  suggestion: { marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#D8DBE3' },
  suggestionText: { color: ink, fontSize: 14, lineHeight: 20 },
  review: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', marginTop: 8 },
  reviewText: { color: blue, fontSize: 14, fontWeight: '700' },
  send: { minHeight: 46, backgroundColor: blue, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  sendDisabled: { opacity: 0.5 }, sendText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  back: { color: blue, fontSize: 15, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0006' }, sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '78%' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }, sheetTitle: { fontSize: 20, color: ink, fontWeight: '800' }, option: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#D8DBE3' },
});
