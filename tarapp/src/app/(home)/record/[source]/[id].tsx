import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OpenedRecord from '@/components/OpenedRecord';
import { harness, type HarnessRecord, type Link } from '@/lib/harness';

export default function SourceRecord() {
  const { source, id } = useLocalSearchParams<{ source: string; id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [record, setRecord] = useState<HarnessRecord | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!source || !id) return;
    setLoading(true); setError('');
    try {
      const result = await harness.record(source, id);
      setRecord(result.record);
      setLoading(false);
      void harness.links(source, id).then((linked) => setLinks(linked.links)).catch(() => setLinks([]));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'This source record is unavailable.'); }
    finally { setLoading(false); }
  }, [source, id]);
  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load]);
  return <View style={[styles.page, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color="#3157A8" /><Text style={styles.backText}>Back</Text></Pressable><Text style={styles.kind}>{record?.type || 'SOURCE'}</Text></View>
    {loading ? <ActivityIndicator color="#3157A8" style={{ marginTop: 50 }} /> : error ? <View style={styles.content}><Text style={styles.meta}>{error}</Text><Pressable onPress={() => void load()}><Text style={styles.backText}>Try again</Text></Pressable></View> : record ? <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{record.title}</Text><Text style={styles.meta}>Source: {source} / {record.id}</Text><Text style={styles.meta}>Owner: {record.owner || 'Workspace owner'}</Text>
      <OpenedRecord record={record} />
      {links.map((link) => <Pressable key={link.id} accessibilityRole="button" style={styles.linkRow} onPress={() => router.push({ pathname: '/(home)/record/[source]/[id]', params: { source, id: link.other.id } })}><Text style={styles.backText}>{link.other.name}</Text><Ionicons name="chevron-forward" size={18} color="#3157A8" /></Pressable>)}
    </ScrollView> : null}
  </View>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#FFFFFF' }, header: { minHeight: 56, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#D8DBE3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { minHeight: 48, flexDirection: 'row', alignItems: 'center' }, backText: { color: '#3157A8', fontSize: 15, fontWeight: '700' }, kind: { color: '#626671', fontSize: 11, fontWeight: '800' }, content: { padding: 22, paddingBottom: 40 }, title: { color: '#1B1C20', fontSize: 26, fontWeight: '800', marginBottom: 14 }, meta: { color: '#626671', fontSize: 14, lineHeight: 21, marginBottom: 5 }, linkRow: { minHeight: 54, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#D8DBE3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } });
