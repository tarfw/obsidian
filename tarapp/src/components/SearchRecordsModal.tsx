import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { harness, type HarnessRecord } from '@/lib/harness';

const colors = { ink: '#1B1C20', muted: '#626671', faint: '#8B8F99', line: '#D8DBE3', wash: '#F1F3F8', blue: '#3157A8' };

interface Props {
  visible: boolean;
  scope: string;
  onClose: () => void;
  onSelect: (record: HarnessRecord) => void;
}

export default function SearchRecordsModal({ visible, scope, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<HarnessRecord[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    if (!visible) {
      setSearch('');
      setRecords([]);
      setNext(null);
      setError('');
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const current = ++generation.current;
    const term = search.trim();
    setRecords([]);
    setNext(null);
    setError('');
    setLoadingMore(false);
    if (!term) { setLoading(false); return; }

    setLoading(true);
    const timer = setTimeout(() => {
      void harness.records(scope, undefined, 0, term).then((page) => {
        if (current !== generation.current) return;
        setRecords(page.records);
        setNext(page.next);
      }).catch((cause) => {
        if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Could not search this workspace.');
      }).finally(() => {
        if (current === generation.current) setLoading(false);
      });
    }, 220);
    return () => clearTimeout(timer);
  }, [visible, scope, search, retry]);

  const loadMore = async () => {
    if (next === null || loadingMore || !search.trim()) return;
    const current = generation.current;
    setLoadingMore(true);
    setError('');
    try {
      const page = await harness.records(scope, undefined, next, search.trim());
      if (current !== generation.current) return;
      setRecords((existing) => {
        const known = new Set(existing.map((record) => record.id));
        return [...existing, ...page.records.filter((record) => !known.has(record.id))];
      });
      setNext(page.next);
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Could not load more records.');
    } finally {
      if (current === generation.current) setLoadingMore(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close search" onPress={onClose} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={21} color={colors.ink} />
          </Pressable>
          <Text style={styles.title}>Search</Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            accessibilityLabel="Search records in this workspace"
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            placeholder="Search records, contacts, email, or phone"
            placeholderTextColor={colors.faint}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
          {search ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.faint} /></Pressable> : null}
        </View>

        {error ? <View style={styles.errorRow}><Text style={styles.errorText}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setRetry((value) => value + 1)}><Text style={styles.actionText}>Retry</Text></Pressable></View> : null}

        <FlatList
          data={records}
          keyExtractor={(record) => record.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={records.length ? styles.resultList : styles.emptyList}
          ListEmptyComponent={loading ? <ActivityIndicator color={colors.blue} /> : <Text style={styles.emptyText}>{search.trim() ? error ? '' : 'No matching records' : 'Search this workspace’s records'}</Text>}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" onPress={() => onSelect(item)} style={styles.resultRow}>
              <View style={styles.resultCopy}>
                <Text numberOfLines={1} style={styles.recordTitle}>{item.title}</Text>
                <Text numberOfLines={1} style={styles.recordMeta}>{item.type.replace(/^pos\./, '').replace(/[._-]+/g, ' ')} · {item.state}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.faint} />
            </Pressable>
          )}
          ListFooterComponent={next !== null ? <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => void loadMore()} style={styles.moreButton}><Text style={styles.actionText}>{loadingMore ? 'Loading…' : 'Load more'}</Text></Pressable> : null}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  closeButton: { width: 48, height: 48, alignItems: 'flex-start', justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  searchBox: { minHeight: 48, marginHorizontal: 16, marginTop: 12, marginBottom: 8, paddingHorizontal: 12, borderRadius: 9, backgroundColor: colors.wash, flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchInput: { flex: 1, minWidth: 0, height: 48, paddingHorizontal: 0, paddingVertical: 0, color: colors.ink, fontSize: 14, includeFontPadding: false },
  errorRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  errorText: { flex: 1, color: '#B42318', fontSize: 13, paddingRight: 12 },
  resultList: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyList: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  resultRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, gap: 12 },
  resultCopy: { flex: 1, minWidth: 0, gap: 4 },
  recordTitle: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  recordMeta: { color: colors.muted, fontSize: 12, textTransform: 'capitalize' },
  moreButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: colors.blue, fontSize: 14, fontWeight: '600' },
});
