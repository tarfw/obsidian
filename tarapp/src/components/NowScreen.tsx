import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, FlatList, Keyboard, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionInterfaceHost from '@/action-interfaces/ActionInterfaceHost';
import { useWorkspace } from '@/components/WorkspaceProvider';
import { createOperationKey, HarnessRequestError, harness, type HarnessAction, type HarnessInterfaceContract, type HarnessSpaceContext, type NowFeed } from '@/lib/harness';
import { cachedNow, refreshNow } from '@/lib/now-sync';
import { takeNowReload } from '@/lib/now-navigation';

const ink = '#1B1C20';
const muted = '#626671';
const blue = '#3157A8';
const empty: NowFeed = { rows: [], sources: [], sync: {}, partial: true, failed: [] };
const feedCache = new Map<string, NowFeed>();
export function clearNowCache() { feedCache.clear(); }
type OpenAction = { action: HarnessAction; interfaces: HarnessInterfaceContract[]; scope: string; input: Record<string, unknown>; title: string };
type AskSuggestion = { action: string | null; title: string | null; confidence: number | null; review: true };

export default function NowScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workspaces, current, selectWorkspace } = useWorkspace();
  const personalId = workspaces.find((workspace) => workspace.mode === 'personal')?.id || current.id;
  const [feed, setFeed] = useState<NowFeed>(() => feedCache.get(personalId) || empty);
  const [space, setSpace] = useState<{ context: HarnessSpaceContext; alternatives: HarnessSpaceContext[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [finding, setFinding] = useState(false);
  const [menu, setMenu] = useState<'change' | null>(null);
  const [openAction, setOpenAction] = useState<OpenAction | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [askDraft, setAskDraft] = useState('');
  const [askSuggestion, setAskSuggestion] = useState<AskSuggestion | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState('');
  const activeRefresh = useRef<Promise<void> | null>(null);
  const askInputRef = useRef<TextInput>(null);
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
      if (next.context && next.decision) setSpace({ context: next.context, alternatives: next.alternatives || [] });
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
      if (active && cached) { feedCache.set(personalId, cached); setFeed(cached); }
    }).catch(() => undefined).finally(() => { if (active) void reload(undefined, force); });
    return () => { active = false; };
  }, [personalId, reload, workspaces]);
  useEffect(() => {
    const refreshIfDue = () => { if (AppState.currentState === 'active' && Date.now() - lastRefresh.current >= 15_000) void reload(); };
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refreshIfDue(); });
    const interval = setInterval(refreshIfDue, 60_000);
    return () => { subscription.remove(); clearInterval(interval); };
  }, [reload]);
  useFocusEffect(useCallback(() => {
    const source = takeNowReload();
    if (source) void reload(source, true);
  }, [reload]));

  const rows = useMemo(() => feed.rows.filter((row) => !query.trim()
    || `${row.title} ${row.parent || ''} ${row.workspace.name} ${row.role} ${row.state}`.toLowerCase().includes(query.trim().toLowerCase())), [feed.rows, query]);
  const context = space?.context;
  const workspaceName = feed.decision === 'confirm' ? 'Choose workspace' : context?.label || context?.workspace.name || current.name;
  const workspaceMode = context?.workspace.mode || current.mode;
  const targetWorkspaceName = context?.workspace.name || current.name;
  const workspaceDetails = feed.decision === 'confirm' ? ''
    : `${targetWorkspaceName} · ${workspaceMode === 'personal' ? 'Individual' : (context?.role || current.workRole || current.role)} · Owner: ${workspaceMode === 'personal' ? 'You' : (context?.owner || current.owner || 'Workspace owner')}`;
  const activeWorkspaceSlug = context?.workspace.slug || current.slug;
  const contextChoices = feed.decision === 'confirm' && space ? [space.context, ...space.alternatives] : [];
  const workspaceOptions = workspaces.filter((workspace) => !contextChoices.some((choice) => choice.workspace.slug === workspace.slug));
  const failed = new Set(feed.failed);
  const failedNames = feed.failed.map((id) => feed.sources.find((source) => source.id === id)?.name || id).join(', ');
  const lastUpdated = Math.max(0, ...Object.values(feed.sync));

  const change = async (slug: string, role?: string) => {
    setMenu(null);
    try {
      await harness.holdContext(slug, 15 * 60_000, role);
      selectWorkspace(slug);
      setSpace(null);
      await reload(undefined, true);
    } catch (cause) { Alert.alert('Could not change context', cause instanceof Error ? cause.message : 'Try again.'); }
  };

  const resumeAutomatic = async () => {
    setMenu(null);
    try {
      await harness.resumeContext();
      setSpace(null);
      await reload(undefined, true);
    } catch (cause) { Alert.alert('Could not resume automatic switching', cause instanceof Error ? cause.message : 'Try again.'); }
  };

  const askTar = async () => {
    const prompt = askDraft.trim();
    if (!prompt || asking) return;
    Keyboard.dismiss();
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
      <Text style={styles.title}>Now</Text>
      <View style={styles.topActions}>
        <Pressable accessibilityRole="button" accessibilityLabel={finding ? 'Close search' : 'Find work'} onPress={() => { if (finding) setQuery(''); setFinding(!finding); }} style={styles.icon}>
          <Ionicons name={finding ? 'close' : 'search'} size={21} color={ink} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open workspace tools" onPress={() => router.push({ pathname: '/(home)/tools', params: { source: activeWorkspaceSlug } })} style={styles.icon}>
          <MaterialIcons name="workspaces-outline" size={24} color="black" />
        </Pressable>
      </View>
    </View>
    <View style={styles.contextBar}>
      <Pressable accessibilityRole="button" accessibilityLabel={feed.decision === 'confirm' ? 'Choose workspace' : `Switch workspace, ${workspaceName}${workspaceDetails ? `, ${workspaceDetails}` : ''}${context?.held ? ', manually selected' : ''}`} onPress={() => setMenu('change')} style={styles.context}>
        <View style={styles.contextIdentity}>
          <Text numberOfLines={1} style={styles.workspaceName}>{workspaceName}</Text>
          {workspaceDetails ? <Text numberOfLines={1} style={styles.contextDetails}>{workspaceDetails}</Text> : null}
        </View>
        <Ionicons name="chevron-down" size={18} color={muted} />
      </Pressable>
      <View style={styles.contextActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Schedule Space routine" onPress={() => router.push('/(home)/routines')} style={styles.contextBtn}>
          <Text style={styles.contextBtnText}>Schedule</Text>
        </Pressable>
        {context?.held ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Release manual hold to automatic" onPress={() => void resumeAutomatic()} style={[styles.contextBtn, styles.contextBtnAuto]}>
            <Text style={[styles.contextBtnText, styles.contextBtnAutoText]}>Auto</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
    {finding ? <TextInput autoFocus accessibilityLabel="Search Now" placeholder="Find work across workspaces" value={query} onChangeText={setQuery} style={styles.search} /> : null}
    {!loading && (feed.partial || error) ? <Pressable accessibilityRole="button" onPress={() => { setRefreshing(true); void reload(); }} style={styles.partial}>
      <Text style={styles.partialText}>{error || (failedNames ? `Could not refresh ${failedNames}.` : 'Could not verify all sources.')}{feed.rows.length ? ' Known work is shown.' : ''} {lastUpdated ? `Last updated ${new Date(lastUpdated).toLocaleTimeString()}.` : ''} Retry ›</Text>
    </Pressable> : null}
    <FlatList style={styles.list} data={rows} keyExtractor={(row) => row.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void reload(); }} />}
      contentContainerStyle={rows.length === 0 ? styles.emptyList : styles.feedList} initialNumToRender={24} maxToRenderPerBatch={24} windowSize={9}
      renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/(home)/open/[source]/[id]', params: { source: item.workspace.slug, id: item.id } })} style={styles.row}>
        <View style={styles.rowHead}><Text style={styles.kind}>[{item.kind === 'action' ? 'A' : item.kind === 'flow' ? 'F' : item.kind === 'artifact' ? '#' : 'S'}]</Text>
          <Text numberOfLines={2} style={styles.rowTitle}>{item.quantity ? `${item.quantity}× ` : ''}{item.title}</Text>
          <Text style={styles.state}>{feed.next === item.id ? 'NEXT' : item.state.toUpperCase()} ›</Text></View>
        <Text style={styles.meta}>{item.workspace.name} / {item.role}{item.parent ? ` / ${item.parent}` : ''}{item.due ? ` / ${new Date(item.due).toLocaleString()}` : ''}{item.lane === 'waiting' ? ' / Waiting' : ''}{failed.has(item.source) ? ' / Stale' : ''}</Text>
      </Pressable>}
      ListEmptyComponent={loading ? <View style={styles.emptyState}><ActivityIndicator color={blue} /><Text style={styles.emptyDetail}>Loading your work…</Text></View> : <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>{feed.partial ? 'Work is unavailable' : query.trim() ? 'No matching work' : 'All clear for now'}</Text>
        <Text style={styles.emptyDetail}>{feed.partial ? 'Pull down to try loading again.' : query.trim() ? 'Try another search.' : 'New work from your workspaces will appear here.'}</Text>
      </View>}
    />
    <View style={[styles.askSafeArea, { paddingBottom: Math.max(insets.bottom, 12) }]}><Pressable accessibilityRole="button" accessibilityLabel="Ask TAR" onPress={() => { setAskError(''); setAskSuggestion(null); setAskOpen(true); }} style={styles.ask}><Text style={styles.askText}>Ask TAR…</Text><Ionicons name="arrow-forward" size={18} color={blue} /></Pressable></View>

    <Modal visible={askOpen} transparent animationType="slide" onRequestClose={() => setAskOpen(false)} onShow={() => askInputRef.current?.focus()}>
      <KeyboardAvoidingView style={styles.overlay} behavior="height" automaticOffset>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 8, 24) }]}>
          <View style={styles.sheetHead}><Text style={styles.sheetTitle}>Ask TAR</Text><Pressable accessibilityRole="button" accessibilityLabel="Close Ask TAR" onPress={() => setAskOpen(false)} style={styles.closeIcon}><Ionicons name="close" size={22} color={muted} /></Pressable></View>
          <View style={styles.askComposer}>
            <TextInput ref={askInputRef} accessibilityLabel="Ask TAR request" multiline value={askDraft} onChangeText={setAskDraft} placeholder="What do you want to do?" placeholderTextColor={muted} style={styles.askInput} />
            <Pressable accessibilityRole="button" accessibilityLabel="Send request to TAR" disabled={!askDraft.trim() || asking} onPress={() => void askTar()} style={[styles.send, (!askDraft.trim() || asking) && styles.sendDisabled]}>
              {asking ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name="arrow-up" size={20} color="#FFFFFF" />}
            </Pressable>
          </View>
          {askError ? <Text style={styles.askError}>{askError}</Text> : null}
          {askSuggestion ? <View style={styles.suggestion}>
            <Text style={styles.suggestionText}>{askSuggestion.action ? `Suggested: ${askSuggestion.title || 'Action'}` : 'No matching action. Try a more specific request.'}</Text>
            {askSuggestion.action ? <Pressable accessibilityRole="button" onPress={() => void reviewSuggestion()} style={styles.review}><Text style={styles.reviewText}>Review action</Text></Pressable> : null}
          </View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>

    <Modal visible={menu === 'change'} transparent animationType="slide" onRequestClose={() => setMenu(null)}><View style={styles.overlay}>
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.sheetHead}><Text style={styles.sheetTitle}>Workspaces</Text><Pressable accessibilityRole="button" accessibilityLabel="Close workspaces" onPress={() => setMenu(null)} style={styles.closeIcon}><Ionicons name="close" size={22} color={muted} /></Pressable></View>
        <ScrollView>
          {contextChoices.map((choice) => <Pressable key={choice.id} accessibilityRole="button" onPress={() => void change(choice.workspace.slug, choice.role)} style={styles.workspaceOption}>
            <View style={styles.workspaceOptionIdentity}><Text style={styles.workspaceOptionName}>{choice.workspace.name}</Text><Text style={styles.workspaceOptionDetail}>{choice.label === choice.workspace.name ? choice.role : `${choice.label} · ${choice.role}`}</Text></View>
            <Ionicons name="chevron-forward" size={18} color={muted} />
          </Pressable>)}
          {workspaceOptions.map((workspace) => {
            const selected = feed.decision !== 'confirm' && workspace.slug === activeWorkspaceSlug;
            return <Pressable key={workspace.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => selected ? setMenu(null) : void change(workspace.slug)} style={styles.workspaceOption}>
              <View style={styles.workspaceOptionIdentity}><Text numberOfLines={1} style={styles.workspaceOptionName}>{workspace.name}</Text></View>
              {selected ? <Ionicons name="checkmark" size={20} color={blue} /> : <Ionicons name="chevron-forward" size={18} color={muted} />}
            </Pressable>;
          })}
          {context?.held ? <Pressable accessibilityRole="button" onPress={() => void resumeAutomatic()} style={styles.automaticOption}><Text style={styles.automaticOptionText}>Switch automatically</Text></Pressable> : null}
        </ScrollView>
      </View>
    </View></Modal>

    <ActionInterfaceHost action={openAction?.action || null} contracts={openAction?.interfaces || []} scope={openAction?.scope || current.slug} initialInput={openAction?.input} contextTitle={openAction?.title}
      onClose={() => setOpenAction(null)} onSuccess={() => { const source = openAction?.scope; setOpenAction(null); void reload(source); }} />
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' }, list: { flex: 1 }, feedList: { paddingBottom: 12 }, emptyList: { flexGrow: 1, justifyContent: 'center', paddingBottom: 48 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 30, fontWeight: '800', color: ink }, topActions: { flexDirection: 'row', gap: 4 },
  icon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  contextBar: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E3E6EC', paddingRight: 14 },
  context: { flex: 1, minHeight: 54, paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  contextIdentity: { flex: 1, minWidth: 0 }, workspaceName: { fontSize: 15, lineHeight: 20, color: ink, fontWeight: '700' },
  contextDetails: { fontSize: 12, lineHeight: 17, color: muted, marginTop: 2 },
  contextActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contextBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F0F3F9', borderWidth: StyleSheet.hairlineWidth, borderColor: '#D0D7E5' },
  contextBtnText: { fontSize: 12, fontWeight: '700', color: blue },
  contextBtnAuto: { backgroundColor: blue, borderColor: blue },
  contextBtnAutoText: { color: '#FFFFFF' },
  search: { margin: 14, marginBottom: 4, borderWidth: 1, borderColor: '#D8DBE3', borderRadius: 10, paddingHorizontal: 12, height: 44 },
  partial: { padding: 12, backgroundColor: '#FFF4DF' }, partialText: { color: '#825500', lineHeight: 20 },
  row: { paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#D8DBE3', minHeight: 76 }, rowHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  kind: { color: blue, fontSize: 13, fontWeight: '800', marginTop: 2 }, rowTitle: { flex: 1, color: ink, fontSize: 16, fontWeight: '700' }, state: { color: muted, fontSize: 11, fontWeight: '700' },
  meta: { color: muted, fontSize: 12, marginLeft: 27, marginTop: 5 },
  emptyState: { alignItems: 'center', paddingHorizontal: 32, gap: 6 }, emptyTitle: { color: ink, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyDetail: { color: muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  askSafeArea: { backgroundColor: '#FFFFFF' },
  ask: { minHeight: 56, paddingHorizontal: 20, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#D8DBE3', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  askText: { color: muted, fontSize: 15 },
  askComposer: { flexDirection: 'row', alignItems: 'flex-end', borderWidth: StyleSheet.hairlineWidth, borderColor: '#C9CED8', borderRadius: 16, backgroundColor: '#FFFFFF' },
  askInput: { flex: 1, minHeight: 52, maxHeight: 132, paddingHorizontal: 14, paddingVertical: 14, color: ink, fontSize: 15, textAlignVertical: 'top' },
  askError: { color: '#B42318', fontSize: 13, marginTop: 10 },
  suggestion: { marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#D8DBE3' },
  suggestionText: { color: ink, fontSize: 14, lineHeight: 20 },
  review: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', marginTop: 8 },
  reviewText: { color: blue, fontSize: 14, fontWeight: '700' },
  send: { width: 40, height: 40, margin: 6, backgroundColor: blue, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },
  back: { color: blue, fontSize: 15, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0006' }, sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '78%' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, sheetTitle: { fontSize: 20, color: ink, fontWeight: '800' },
  closeIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  workspaceOption: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E3E6EC' },
  workspaceOptionIdentity: { flex: 1 }, workspaceOptionName: { color: ink, fontSize: 15, fontWeight: '700' },
  workspaceOptionDetail: { color: muted, fontSize: 12, marginTop: 3 }, automaticOption: { minHeight: 48, justifyContent: 'center', marginTop: 8 },
  automaticOptionText: { color: blue, fontSize: 14, fontWeight: '600' }, option: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#D8DBE3' },
});
