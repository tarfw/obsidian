import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionInterfaceHost from '@/action-interfaces/ActionInterfaceHost';
import { useWorkspace } from '@/components/WorkspaceProvider';
import {
  createOperationKey,
  harness,
  type HarnessAction,
  type HarnessInterfaceContract,
  type HarnessRecord,
} from '@/lib/harness';

const ink = '#1B1C20';
const muted = '#626671';
const blue = '#3157A8';
const softBg = '#F3F4F6';
const borderLine = '#E5E7EB';

type Editor = {
  action: HarnessAction;
  interfaces: HarnessInterfaceContract[];
  input: Record<string, unknown>;
  title: string;
};

type ShiftPreset = {
  id: string;
  name: string;
  label: string;
  start: string;
  end: string;
  days: string;
};

const SHIFT_PRESETS: ShiftPreset[] = [
  { id: 'weekdays', name: 'Weekdays', label: 'Weekdays 9:00–17:00', start: '09:00', end: '17:00', days: '1,2,3,4,5' },
  { id: 'morning', name: 'Morning', label: 'Morning 09:00–13:00', start: '09:00', end: '13:00', days: '1,2,3,4,5' },
  { id: 'evening', name: 'Evening', label: 'Evening 17:00–22:00', start: '17:00', end: '22:00', days: '0,1,2,3,4,5,6' },
  { id: 'weekends', name: 'Weekends', label: 'Weekends 10:00–18:00', start: '10:00', end: '18:00', days: '0,6' },
  { id: 'everyday', name: 'Everyday', label: 'Everyday 09:00–17:00', start: '09:00', end: '17:00', days: '0,1,2,3,4,5,6' },
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
    if (!personal) {
      setLoading(false);
      setError('Personal workspace is unavailable.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const found: HarnessRecord[] = [];
      let offset: number | null = 0;
      while (offset !== null) {
        const page = await harness.records(personal.slug, 'routine', offset);
        found.push(...page.records);
        offset = page.next;
      }
      setRows(found);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load routines.');
    } finally {
      setLoading(false);
    }
  }, [personal]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const open = async (
    record?: HarnessRecord,
    presetValues?: { label?: string; start?: string; end?: string; days?: string },
  ) => {
    if (!personal) return;
    setBusy(record?.id || 'new');
    try {
      const registry = await harness.workspaceRegistry(personal.slug);
      const action = registry.actions.find((item) => item.id === 'routine.save');
      if (!action) throw new Error('Routine editing is unavailable for your role.');
      const now = new Date();
      const clock = (hour: number) =>
        `${String(hour % 24).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const data = record?.data || {};
      const input = record
        ? {
            id: record.id,
            baseVersion: record.version,
            label: record.title,
            workspace: data.workspace,
            role: data.role || '',
            start: data.start,
            end: data.end,
            days: Array.isArray(data.days) ? data.days.join(',') : data.days || '0,1,2,3,4,5,6',
            priority: data.priority ?? 0,
          }
        : {
            label: presetValues?.label || current.name,
            workspace: current.slug,
            role: current.workRole || '',
            start: presetValues?.start || clock(now.getHours()),
            end: presetValues?.end || clock(now.getHours() + 1),
            days: presetValues?.days || '0,1,2,3,4,5,6',
            priority: 0,
          };
      setEditor({
        action,
        interfaces: registry.interfaces,
        input,
        title: record ? 'Edit Routine' : 'Add Routine',
      });
    } catch (cause) {
      Alert.alert('Could not open routine', cause instanceof Error ? cause.message : 'Try again.');
    } finally {
      setBusy(null);
    }
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
    Alert.alert('Remove Routine?', `Remove “${record.title}” from your schedule?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setBusy(record.id);
          void harness
            .executeAction(
              personal.slug,
              'routine.remove',
              { id: record.id, baseVersion: record.version },
              createOperationKey(`routine.remove:${record.id}`),
            )
            .then(() => load())
            .catch((cause) =>
              Alert.alert(
                'Could not remove routine',
                cause instanceof Error ? cause.message : 'Try again.',
              ),
            )
            .finally(() => setBusy(null));
        },
      },
    ]);
  };

  return (
    <View style={[styles.page, { paddingTop: insets.top + 6 }]}>
      {/* Flat Modern Top Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.headerIconButton}
        >
          <Ionicons name="arrow-back" size={21} color={ink} />
        </Pressable>
        <Text style={styles.title}>Routines</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add routine"
          onPress={() => void open()}
          style={styles.headerIconButton}
        >
          <Ionicons name="add" size={24} color={blue} />
        </Pressable>
      </View>

      <Text style={styles.intro}>
        Routines schedule when a workspace becomes active. Saved in Personal.
      </Text>

      {/* 1-Tap Flat Shift Presets */}
      <View style={styles.presetsSection}>
        <Text style={styles.sectionLabel}>Shift Presets</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsList}
        >
          {SHIFT_PRESETS.map((preset) => (
            <Pressable
              key={preset.id}
              accessibilityRole="button"
              accessibilityLabel={`Apply preset ${preset.label}`}
              onPress={() => openPreset(preset)}
              style={styles.presetCard}
            >
              <View style={styles.presetHead}>
                <Ionicons name="time-outline" size={14} color={blue} />
                <Text style={styles.presetName}>{preset.name}</Text>
              </View>
              <Text style={styles.presetHours}>
                {preset.start}–{preset.end}
              </Text>
              <Text style={styles.presetDays}>
                {preset.days === '1,2,3,4,5'
                  ? 'Weekdays'
                  : preset.days === '0,6'
                  ? 'Weekends'
                  : 'Everyday'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {error ? (
        <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.errorBanner}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </Pressable>
      ) : null}

      {/* Saved Routines List with Section Pill Header */}
      <View style={styles.listContainer}>
        {rows.length > 0 ? (
          <View style={styles.sectionPill}>
            <Ionicons name="calendar-outline" size={15} color={blue} />
            <Text style={styles.sectionPillTitle}>Active Schedule</Text>
            <View style={styles.sectionPillBadge}>
              <Text style={styles.sectionPillBadgeText}>{rows.length}</Text>
            </View>
          </View>
        ) : null}

        <FlatList
          data={rows}
          keyExtractor={(record) => record.id}
          contentContainerStyle={
            rows.length === 0 ? styles.emptyList : { paddingBottom: insets.bottom + 24 }
          }
          renderItem={({ item }) => {
            const data = item.data || {};
            const wsName =
              workspaces.find((workspace) => workspace.slug === data.workspace)?.name ||
              String(data.workspace || 'Workspace');
            const timeRange = `${String(data.start || '')}–${String(data.end || '')}`;
            const daysText = formatDays(data.days);

            return (
              <View style={styles.routineRow}>
                <View style={styles.timeBadgeSquircle}>
                  <Ionicons name="time-outline" size={13} color="#FFFFFF" />
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${item.title}`}
                  onPress={() => void open(item)}
                  style={styles.routineMain}
                >
                  <Text numberOfLines={1} style={styles.routineTitle}>
                    {item.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.routineDetail}>
                    {timeRange} · {daysText} · {wsName}
                  </Text>
                </Pressable>

                {busy === item.id ? (
                  <ActivityIndicator size="small" color={blue} />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.title}`}
                    onPress={() => remove(item)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash-outline" size={17} color="#B42318" />
                  </Pressable>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator color={blue} />
                <Text style={styles.emptyDetail}>Loading routines…</Text>
              </View>
            ) : !error ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No routines scheduled</Text>
                <Text style={styles.emptyDetail}>
                  Add a routine or tap a preset to auto-switch your Space.
                </Text>
              </View>
            ) : null
          }
        />
      </View>

      <ActionInterfaceHost
        action={editor?.action || null}
        contracts={editor?.interfaces || []}
        scope={personal?.slug || current.slug}
        initialInput={editor?.input}
        contextTitle={editor?.title}
        onClose={() => setEditor(null)}
        onSuccess={() => {
          setEditor(null);
          void load();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: borderLine,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: ink,
    letterSpacing: -0.2,
  },
  intro: {
    color: muted,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  presetsSection: {
    paddingBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  presetsList: {
    gap: 8,
    paddingHorizontal: 16,
  },
  presetCard: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: softBg,
    borderWidth: 1,
    borderColor: borderLine,
    minWidth: 115,
  },
  presetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  presetName: {
    fontSize: 13,
    fontWeight: '700',
    color: ink,
  },
  presetHours: {
    fontSize: 12,
    color: blue,
    fontWeight: '600',
  },
  presetDays: {
    fontSize: 11,
    color: muted,
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
  },
  sectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: softBg,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
    gap: 8,
  },
  sectionPillTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: ink,
  },
  sectionPillBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  sectionPillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  timeBadgeSquircle: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineMain: {
    flex: 1,
    gap: 2,
  },
  routineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: ink,
  },
  routineDetail: {
    fontSize: 12,
    fontWeight: '500',
    color: muted,
  },
  removeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    padding: 12,
    backgroundColor: '#FFF4DF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  errorText: {
    color: '#825500',
    fontSize: 13,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 48,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 6,
  },
  emptyTitle: {
    color: ink,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDetail: {
    color: muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
