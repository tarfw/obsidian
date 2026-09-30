import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, FlatList, Keyboard, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionInterfaceHost from '@/action-interfaces/ActionInterfaceHost';
import { TarAvatar } from '@/components/TarAvatar';
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

  const rows = feed.rows;
  const failed = new Set(feed.failed);
  const failedNames = feed.failed.map((id) => feed.sources.find((source) => source.id === id)?.name || id).join(', ');
  const lastUpdated = Math.max(0, ...Object.values(feed.sync));

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
      <Pressable accessibilityRole="button" accessibilityLabel="Open workspace tools" onPress={() => router.push('/(home)/tools')} style={styles.icon}>
        <MaterialIcons name="workspaces-outline" size={24} color="black" />
      </Pressable>
    </View>
    {!loading && (feed.partial || error) ? <Pressable accessibilityRole="button" onPress={() => { setRefreshing(true); void reload(); }} style={styles.partial}>
      <Text style={styles.partialText}>{error || (failedNames ? `Could not refresh ${failedNames}.` : 'Could not verify all sources.')}{feed.rows.length ? ' Known work is shown.' : ''} {lastUpdated ? `Last updated ${new Date(lastUpdated).toLocaleTimeString()}.` : ''} Retry ›</Text>
    </Pressable> : null}
    <FlatList style={styles.list} data={rows} keyExtractor={(row) => row.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void reload(); }} />}
      contentContainerStyle={rows.length === 0 ? styles.emptyList : styles.feedList} initialNumToRender={24} maxToRenderPerBatch={24} windowSize={9}
      renderItem={({ item }) => {
        const isNext = feed.next === item.id;
        const metaParts = [
          item.workspace.name,
          item.parent || (item.role !== 'general' ? item.role : null),
          item.due ? new Date(item.due).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          item.lane === 'waiting' ? 'Waiting' : null,
          failed.has(item.source) ? 'Stale' : null,
        ].filter(Boolean);
        return <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/(home)/open/[source]/[id]', params: { source: item.workspace.slug, id: item.id } })} style={styles.row}>
          <View style={styles.rowHead}>
            <Text numberOfLines={2} style={styles.rowTitle}>{item.quantity ? `${item.quantity}× ` : ''}{item.title}</Text>
            {isNext ? <View style={styles.nextBadge}><Text style={styles.nextBadgeText}>NEXT</Text></View> : null}
          </View>
          {metaParts.length ? <Text style={styles.meta}>{metaParts.join(' · ')}</Text> : null}
        </Pressable>;
      }}
      ListEmptyComponent={loading ? <View style={styles.emptyState}><ActivityIndicator color={blue} /><Text style={styles.emptyDetail}>Loading your work…</Text></View> : <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>{feed.partial ? 'Work is unavailable' : 'All clear for now'}</Text>
        <Text style={styles.emptyDetail}>{feed.partial ? 'Pull down to try loading again.' : 'New work from your workspaces will appear here.'}</Text>
      </View>}
    />
    <View style={[styles.askSafeArea, { paddingBottom: Math.max(insets.bottom, 12) }]}><Pressable accessibilityRole="button" accessibilityLabel="Ask TAR" onPress={() => { setAskError(''); setAskSuggestion(null); setAskOpen(true); }} style={styles.ask}>
      <View style={styles.askLead}>
        <TarAvatar size={24} />
        <Text style={styles.askText}>Ask TAR…</Text>
      </View>
      <Ionicons name="arrow-forward" size={18} color={blue} />
    </Pressable></View>

    <Modal visible={askOpen} transparent animationType="slide" onRequestClose={() => setAskOpen(false)} onShow={() => askInputRef.current?.focus()}>
      <KeyboardAvoidingView style={styles.overlay} behavior="height" automaticOffset>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 8, 24) }]}>
          <View style={styles.sheetHead}>
            <View style={styles.sheetTitleGroup}>
              <TarAvatar size={28} />
              <Text style={styles.sheetTitle}>Ask TAR</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close Ask TAR" onPress={() => setAskOpen(false)} style={styles.closeIcon}><Ionicons name="close" size={22} color={muted} /></Pressable>
          </View>
          <View style={styles.askComposer}>
            <TextInput ref={askInputRef} accessibilityLabel="Ask TAR request" multiline value={askDraft} onChangeText={setAskDraft} placeholder="What do you want to do?" placeholderTextColor={muted} style={styles.askInput} />
            <Pressable accessibilityRole="button" accessibilityLabel="Send request to TAR" disabled={!askDraft.trim() || asking} onPress={() => void askTar()} style={[styles.send, (!askDraft.trim() || asking) && styles.sendDisabled]}>
              {asking ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name="arrow-up" size={20} color="#FFFFFF" />}
            </Pressable>
          </View>
          {askError ? <Text style={styles.askError}>{askError}</Text> : null}
          {askSuggestion ? <View style={styles.suggestion}>
            <View style={styles.suggestionRow}>
              <TarAvatar size={20} />
              <Text style={styles.suggestionText}>{askSuggestion.action ? `Suggested: ${askSuggestion.title || 'Action'}` : 'No matching action. Try a more specific request.'}</Text>
            </View>
            {askSuggestion.action ? <Pressable accessibilityRole="button" onPress={() => void reviewSuggestion()} style={styles.review}><Text style={styles.reviewText}>Review action</Text></Pressable> : null}
          </View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>

    <ActionInterfaceHost action={openAction?.action || null} contracts={openAction?.interfaces || []} scope={openAction?.scope || current.slug} initialInput={openAction?.input} contextTitle={openAction?.title}
      onClose={() => setOpenAction(null)} onSuccess={() => { const source = openAction?.scope; setOpenAction(null); void reload(source); }} />
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' }, list: { flex: 1 }, feedList: { paddingBottom: 12 }, emptyList: { flexGrow: 1, justifyContent: 'center', paddingBottom: 48 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E3E6EC' },
  title: { fontSize: 30, fontWeight: '800', color: ink },
  icon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  partial: { padding: 12, backgroundColor: '#FFF4DF' }, partialText: { color: '#825500', lineHeight: 20 },
  row: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E3E6EC' },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rowTitle: { flex: 1, color: ink, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  nextBadge: { backgroundColor: '#E8F0FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  nextBadgeText: { color: blue, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  meta: { color: muted, fontSize: 13, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingHorizontal: 32, gap: 6 }, emptyTitle: { color: ink, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyDetail: { color: muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  askSafeArea: { backgroundColor: '#FFFFFF' },
  ask: { minHeight: 56, paddingHorizontal: 20, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#D8DBE3', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  askLead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  askText: { color: muted, fontSize: 15 },
  askComposer: { flexDirection: 'row', alignItems: 'flex-end', borderWidth: StyleSheet.hairlineWidth, borderColor: '#C9CED8', borderRadius: 16, backgroundColor: '#FFFFFF' },
  askInput: { flex: 1, minHeight: 52, maxHeight: 132, paddingHorizontal: 14, paddingVertical: 14, color: ink, fontSize: 15, textAlignVertical: 'top' },
  askError: { color: '#B42318', fontSize: 13, marginTop: 10 },
  suggestion: { marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#D8DBE3' },
  suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  suggestionText: { flex: 1, color: ink, fontSize: 14, lineHeight: 20 },
  review: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', marginTop: 8 },
  reviewText: { color: blue, fontSize: 14, fontWeight: '700' },
  send: { width: 40, height: 40, margin: 6, backgroundColor: blue, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },
  back: { color: blue, fontSize: 15, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0006' }, sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '78%' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetTitle: { fontSize: 20, color: ink, fontWeight: '800' },
  closeIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
