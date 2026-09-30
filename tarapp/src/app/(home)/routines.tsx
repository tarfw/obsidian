import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionInterfaceHost from '@/action-interfaces/ActionInterfaceHost';
import { useWorkspace } from '@/components/WorkspaceProvider';
import { createOperationKey, harness, type HarnessAction, type HarnessInterfaceContract, type HarnessRecord } from '@/lib/harness';

const ink = '#1C2430';
const muted = '#697586';
const blue = '#3157A8';

type Editor = { action: HarnessAction; interfaces: HarnessInterfaceContract[]; input: Record<string, unknown>; title: string };

type ShiftPreset = {
  id: string;
  name: string;
  label: string;
  start: string;
  end: string;
  days: string;
  badge: string;
};

const SHIFT_PRESETS: ShiftPreset[] = [
  { id: 'weekdays', name: 'Weekdays', label: 'Weekdays 9:00–17:00', start: '09:00', end: '17:00', days: '1,2,3,4,5', badge: 'Mon–Fri 09:00–17:00' },
  { id: 'morning', name: 'Morning', label: 'Morning 09:00–13:00', start: '09:00', end: '13:00', days: '1,2,3,4,5', badge: 'Mon–Fri 09:00–13:00' },
  { id: 'evening', name: 'Evening', label: 'Evening 17:00–22:00', start: '17:00', end: '22:00', days: '0,1,2,3,4,5,6', badge: 'Daily 17:00–22:00' },
  { id: 'weekends', name: 'Weekends', label: 'Weekends 10:00–18:00', start: '10:00', end: '18:00', days: '0,6', badge: 'Sat–Sun 10:00–18:00' },
  { id: 'everyday', name: 'Everyday', label: 'Everyday 09:00–17:00', start: '09:00', end: '17:00', days: '0,1,2,3,4,5,6', badge: 'Daily 09:00–17:00' },
];

function formatDays(days: unknown): string {
  const d = Array.isArray(days) ? days.join(',') : typeof days === 'string' ? days : '';
  if (!d || d === '0,1,2,3,4,5,6') return 'Everyday';
  if (d === '1,2,3,4,5') return 'Weekdays';
  if (d === '0,6') return 'Weekends';
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return d.split(',').map((n) => names[Number(n)] || n).join(', ');
}

export default function RoutinesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workspaces, current } = useWorkspace();
  const personal = workspaces.find((workspace) => workspace.mode === 'personal');
  const [rows, setRows] = useState<HarnessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!personal) { setLoading(false); setError('Personal is unavailable.'); return; }
    setLoading(true); setError('');
    try {
      const found: HarnessRecord[] = [];
      let offset: number | null = 0;
      while (offset !== null) {
        const page = await harness.records(personal.slug, 'routine', offset);
        found.push(...page.records);
        offset = page.next;
      }
      setRows(found);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load routines.'); }
    finally { setLoading(false); }
  }, [personal]);
  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load]);

  const open = async (record?: HarnessRecord, presetValues?: { label?: string; start?: string; end?: string; days?: string }) => {
    if (!personal) return;
    setBusy(record?.id || 'new');
    try {
      const registry = await harness.workspaceRegistry(personal.slug);
      const action = registry.actions.find((item) => item.id === 'routine.save');
      if (!action) throw new Error('Routine editing is unavailable for your role.');
      const now = new Date();
      const clock = (hour: number) => `${String(hour % 24).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const data = record?.data || {};
      const input = record ? {
        id: record.id, baseVersion: record.version, label: record.title,
        workspace: data.workspace, role: data.role || '', start: data.start, end: data.end,
        days: Array.isArray(data.days) ? data.days.join(',') : data.days || '0,1,2,3,4,5,6', priority: data.priority ?? 0,
      } : {
        label: presetValues?.label || current.name,
        workspace: current.slug,
        role: current.workRole || '',
        start: presetValues?.start || clock(now.getHours()),
        end: presetValues?.end || clock(now.getHours() + 1),
        days: presetValues?.days || '0,1,2,3,4,5,6',
        priority: 0,
      };
      setEditor({ action, interfaces: registry.interfaces, input, title: record ? 'Edit Space routine' : 'Add Space routine' });
    } catch (cause) { Alert.alert('Could not open routine', cause instanceof Error ? cause.message : 'Try again.'); }
    finally { setBusy(null); }
  };

  const openPreset = (preset: ShiftPreset) => {
    void open(undefined, {
      label: current.mode === 'personal' ? preset.name : `${current.name} · ${preset.name}`,
      start: preset.start,
      end: preset.end,
      days: preset.days,
    });
  };

  const remove = (record: HarnessRecord) => {
    if (!personal) return;
    Alert.alert('Remove Space routine?', `Remove “${record.title}” from your schedule?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        setBusy(record.id);
        void harness.executeAction(personal.slug, 'routine.remove', { id: record.id, baseVersion: record.version }, createOperationKey(`routine.remove:${record.id}`))
          .then(() => load())
          .catch((cause) => Alert.alert('Could not remove routine', cause instanceof Error ? cause.message : 'Try again.'))
          .finally(() => setBusy(null));
      } },
    ]);
  };

  return <View style={[styles.page, { paddingTop: insets.top }]}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to Tools" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color={ink} /></Pressable>
      <Text style={styles.title}>Space routines</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Add routine" onPress={() => void open()} style={styles.back}><Ionicons name="add" size={23} color={blue} /></Pressable>
    </View>
    <Text style={styles.intro}>Choose when a workspace becomes your active Space. Routines are saved in Personal.</Text>
    
    <View style={styles.presetsBlock}>
      <Text style={styles.presetsTitle}>1-Tap Shift Presets</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsList}>
        {SHIFT_PRESETS.map((preset) => (
          <Pressable
            key={preset.id}
            accessibilityRole="button"
            accessibilityLabel={`Apply preset ${preset.label}`}
            onPress={() => openPreset(preset)}
            style={styles.presetChip}
          >
            <View style={styles.presetChipHead}>
              <Ionicons name="time-outline" size={14} color={blue} />
              <Text style={styles.presetChipName}>{preset.name}</Text>
            </View>
            <Text style={styles.presetChipHours}>{preset.start}–{preset.end}</Text>
            <Text style={styles.presetChipDays}>{preset.days === '1,2,3,4,5' ? 'Weekdays' : preset.days === '0,6' ? 'Weekends' : 'Everyday'}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>

    {error ? <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.error}><Text style={styles.errorText}>{error} Tap to retry.</Text></Pressable> : null}
    <FlatList data={rows} keyExtractor={(record) => record.id} contentContainerStyle={rows.length ? { paddingBottom: insets.bottom + 24 } : styles.emptyList}
      renderItem={({ item }) => <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.title}`} onPress={() => void open(item)} style={styles.rowMain}>
          <Text numberOfLines={1} style={styles.rowTitle}>{item.title}</Text>
          <Text numberOfLines={1} style={styles.rowDetail}>{String(item.data.start || '')}–{String(item.data.end || '')} · {formatDays(item.data.days)} · {workspaces.find((workspace) => workspace.slug === item.data.workspace)?.name || String(item.data.workspace || 'Workspace')}</Text>
        </Pressable>
        {busy === item.id ? <ActivityIndicator color={blue} /> : <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.title}`} onPress={() => remove(item)} style={styles.remove}><Ionicons name="trash-outline" size={18} color="#B42318" /></Pressable>}
      </View>}
      ListEmptyComponent={loading ? <ActivityIndicator color={blue} /> : !error ? <Text style={styles.emptyText}>No routines yet. Add one or tap a preset to schedule your Space.</Text> : null} />
    <ActionInterfaceHost action={editor?.action || null} contracts={editor?.interfaces || []} scope={personal?.slug || current.slug} initialInput={editor?.input} contextTitle={editor?.title} onClose={() => setEditor(null)} onSuccess={() => { setEditor(null); void load(); }} />
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' }, header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, title: { color: ink, fontSize: 20, fontWeight: '700' },
  intro: { color: muted, fontSize: 13, lineHeight: 19, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  presetsBlock: { paddingHorizontal: 20, paddingBottom: 14 },
  presetsTitle: { color: muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  presetsList: { gap: 8, paddingRight: 20 },
  presetChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F0F3F9', borderWidth: StyleSheet.hairlineWidth, borderColor: '#D0D7E5', minWidth: 120 },
  presetChipHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  presetChipName: { fontSize: 13, fontWeight: '700', color: ink },
  presetChipHours: { fontSize: 12, color: blue, fontWeight: '600' },
  presetChipDays: { fontSize: 11, color: muted, marginTop: 2 },
  row: { minHeight: 74, marginHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E8ECF1', flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowMain: { flex: 1, justifyContent: 'center', gap: 5, minHeight: 70 }, rowTitle: { color: ink, fontSize: 15, fontWeight: '600' }, rowDetail: { color: muted, fontSize: 12 },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  error: { padding: 14, backgroundColor: '#FFF4DF' }, errorText: { color: '#825500', fontSize: 13 },
  emptyList: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }, emptyText: { color: muted, fontSize: 14, textAlign: 'center' },
});
