import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionInterfaceHost from '@/action-interfaces/ActionInterfaceHost';
import RecordDetailModal from '@/components/RecordDetailModal';
import { useWorkspace } from '@/components/WorkspaceProvider';
import { harness, type HarnessAction, type HarnessInterfaceContract, type HarnessRecord } from '@/lib/harness';

const ink = '#1C2430';
const muted = '#697586';
const blue = '#3157A8';
const line = '#E8ECF1';
type OpenAction = { action: HarnessAction; interfaces: HarnessInterfaceContract[]; input: Record<string, unknown>; title: string };

export default function RecordsScreen() {
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const insets = useSafeAreaInsets();
  const { workspaces, current } = useWorkspace();
  const available = workspaces.filter((workspace) => workspace.state === 'active');
  const [scope, setScope] = useState(source || current.slug);
  const [kind, setKind] = useState<'all' | 'contacts'>('all');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<HarnessRecord[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [canCreate, setCanCreate] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HarnessRecord | null>(null);
  const [openAction, setOpenAction] = useState<OpenAction | null>(null);
  const generation = useRef(0);
  const selected = available.find((workspace) => workspace.slug === scope);
  const activeScope = selected?.slug || available[0]?.slug || scope;

  useEffect(() => {
    let active = true;
    void harness.workspaceRegistry(activeScope).then((registry) => {
      if (active) setCanCreate(registry.actions.some((action) => action.id === 'record.create'));
    }).catch(() => { if (active) setCanCreate(false); });
    return () => { active = false; };
  }, [activeScope]);

  useEffect(() => {
    const current = ++generation.current;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true); setRows([]); setNext(null); setError('');
      const page = kind === 'contacts' ? harness.contacts(activeScope, query.trim()) : harness.records(activeScope, undefined, 0, query.trim());
      void page.then((result) => {
        if (!active || current !== generation.current) return;
        setRows('contacts' in result ? result.contacts : result.records);
        setNext(result.next);
      }).catch((cause) => {
        if (active && current === generation.current) setError(cause instanceof Error ? cause.message : 'Could not load records.');
      }).finally(() => { if (active && current === generation.current) setLoading(false); });
    }, query.trim() ? 220 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [activeScope, kind, query, retry]);

  const loadMore = async () => {
    if (next === null || loading || more || error) return;
    const current = generation.current;
    setMore(true);
    try {
      const result = kind === 'contacts' ? await harness.contacts(activeScope, query.trim(), next) : await harness.records(activeScope, undefined, next, query.trim());
      if (current !== generation.current) return;
      const page = 'contacts' in result ? result.contacts : result.records;
      setRows((existing) => {
        const known = new Set(existing.map((record) => record.id));
        return [...existing, ...page.filter((record) => !known.has(record.id))];
      });
      setNext(result.next);
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Could not load more records.');
    } finally { if (current === generation.current) setMore(false); }
  };

  const actOnRecord = async (actionId: string, input: Record<string, unknown> = {}, title = 'Record action') => {
    try {
      const registry = await harness.workspaceRegistry(activeScope);
      const action = registry.actions.find((item) => item.id === actionId);
      if (!action || !registry.interfaces.some((item) => item.key === action.interfaceKey)) throw new Error('This action is unavailable for your role.');
      setOpenAction({ action, interfaces: registry.interfaces, input, title });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open action.'); }
  };

  return <View style={[styles.page, { paddingTop: insets.top }]}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to Tools" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color={ink} /></Pressable>
      <Text style={styles.title}>Records</Text>
      {canCreate ? <Pressable accessibilityRole="button" accessibilityLabel="Create record" onPress={() => { void actOnRecord('record.create', { type: 'note' }, 'New record'); }} style={styles.addButton}><Ionicons name="add" size={23} color={blue} /></Pressable> : <View style={styles.back} />}
    </View>
    {available.length > 1 ? <View style={styles.sources}>{available.map((workspace) => <Pressable key={workspace.slug} accessibilityRole="button" accessibilityState={{ selected: activeScope === workspace.slug }} onPress={() => setScope(workspace.slug)} style={[styles.chip, activeScope === workspace.slug && styles.chipSelected]}><Text numberOfLines={1} style={[styles.chipText, activeScope === workspace.slug && styles.chipTextSelected]}>{workspace.name}</Text></Pressable>)}</View> : <Text style={styles.scope}>{selected?.name || current.name}</Text>}
    <View style={styles.search}><Ionicons name="search-outline" size={18} color={muted} /><TextInput accessibilityLabel="Search records" placeholder="Search records" placeholderTextColor={muted} value={query} onChangeText={setQuery} autoCapitalize="none" style={styles.input} />{query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')}><Ionicons name="close-circle" size={18} color={muted} /></Pressable> : null}</View>
    <View style={styles.filters}>{(['all', 'contacts'] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: kind === value }} onPress={() => setKind(value)} style={[styles.filter, kind === value && styles.filterSelected]}><Text style={[styles.filterText, kind === value && styles.filterTextSelected]}>{value === 'all' ? 'All records' : 'Contacts'}</Text></Pressable>)}</View>
    {error ? <Pressable accessibilityRole="button" onPress={() => setRetry((value) => value + 1)} style={styles.error}><Text style={styles.errorText}>{error} Tap to retry.</Text></Pressable> : null}
    <FlatList data={rows} keyExtractor={(record) => record.id} keyboardShouldPersistTaps="handled" contentContainerStyle={rows.length ? { paddingBottom: insets.bottom + 24 } : styles.emptyList} onEndReached={() => void loadMore()} onEndReachedThreshold={0.4}
      renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => setSelectedRecord(item)} style={styles.row}><View style={styles.recordCopy}><Text numberOfLines={1} style={styles.recordTitle}>{item.title}</Text><Text numberOfLines={1} style={styles.recordMeta}>{item.type.replace(/[._-]+/g, ' ')} · {item.state}</Text></View><Ionicons name="chevron-forward" size={18} color={muted} /></Pressable>}
      ListEmptyComponent={loading ? <ActivityIndicator color={blue} /> : !error ? <View style={styles.emptyState}><Text style={styles.emptyText}>No {kind === 'contacts' ? 'contacts' : 'records'} yet.</Text>{canCreate && !query.trim() ? <Pressable accessibilityRole="button" onPress={() => { void actOnRecord('record.create', { type: 'note' }, 'New record')} } style={styles.emptyAction}><Ionicons name="add" size={18} color="#FFFFFF" /><Text style={styles.emptyActionText}>Create first record</Text></Pressable> : null}</View> : null}
      ListFooterComponent={more ? <ActivityIndicator color={blue} style={styles.loadingMore} /> : null} />
    <RecordDetailModal visible={Boolean(selectedRecord)} record={selectedRecord} scope={activeScope} onClose={() => setSelectedRecord(null)} onAction={(actionId, input, title) => { void actOnRecord(actionId, input, title); }} />
    <ActionInterfaceHost action={openAction?.action || null} contracts={openAction?.interfaces || []} scope={activeScope} initialInput={openAction?.input} contextTitle={openAction?.title} onClose={() => setOpenAction(null)} onSuccess={() => { setOpenAction(null); setRetry((value) => value + 1); }} />
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' }, header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, title: { color: ink, fontSize: 20, fontWeight: '700' }, addButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#EEF3FF' },
  scope: { color: muted, fontSize: 13, paddingHorizontal: 20, paddingBottom: 10 }, sources: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, flexWrap: 'wrap' },
  chip: { maxWidth: 170, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: 18, backgroundColor: '#F3F5F8' }, chipSelected: { backgroundColor: blue },
  chipText: { color: ink, fontSize: 13, fontWeight: '600' }, chipTextSelected: { color: '#FFFFFF' },
  search: { marginHorizontal: 18, marginVertical: 10, height: 46, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#F3F5F8', flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, color: ink, fontSize: 15 }, filters: { flexDirection: 'row', paddingHorizontal: 18, gap: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: line },
  filter: { minHeight: 43, justifyContent: 'center', borderBottomWidth: 2, borderColor: 'transparent' }, filterSelected: { borderColor: blue }, filterText: { color: muted, fontSize: 14, fontWeight: '600' }, filterTextSelected: { color: blue },
  row: { minHeight: 68, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: line, flexDirection: 'row', alignItems: 'center', gap: 12 }, recordCopy: { flex: 1, gap: 4 }, recordTitle: { color: ink, fontSize: 15, fontWeight: '600' }, recordMeta: { color: muted, fontSize: 12, textTransform: 'capitalize' },
  error: { padding: 14, backgroundColor: '#FFF4DF' }, errorText: { color: '#825500', fontSize: 13 }, emptyList: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, emptyState: { alignItems: 'center', gap: 14 }, emptyText: { color: muted, fontSize: 14 }, emptyAction: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, borderRadius: 22, backgroundColor: blue }, emptyActionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' }, loadingMore: { paddingVertical: 20 },
});
