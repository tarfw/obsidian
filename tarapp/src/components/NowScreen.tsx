import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionInterfaceHost from '@/action-interfaces/ActionInterfaceHost';
import { TarAvatar } from '@/components/TarAvatar';
import { useWorkspace } from '@/components/WorkspaceProvider';
import {
  createOperationKey,
  HarnessRequestError,
  harness,
  type HarnessAction,
  type HarnessInterfaceContract,
  type HarnessWorkspace,
  type NowFeed,
  type NowRow,
} from '@/lib/harness';
import { cachedNow, refreshNow } from '@/lib/now-sync';
import { takeNowReload } from '@/lib/now-navigation';

const ink = '#1B1C20';
const muted = '#626671';
const blue = '#3157A8';
const emerald = '#18865B';
const borderLine = '#E5E7EB';
const BRAND_COLORS = [
  '#EA580C',
  '#059669',
  '#7C3AED',
  '#047857',
  '#B45309',
  '#CA8A04',
  '#312E81',
  '#374151',
  '#1E293B',
  '#E11D48',
];

type SpaceBadge = { bg: string; initial: string };

function getSpaceBadge(workspace: HarnessWorkspace): SpaceBadge {
  if (workspace.mode === 'personal') {
    return { bg: '#3157A8', initial: 'P' };
  }
  const initial = (workspace.name || 'W').trim().charAt(0).toUpperCase();
  const seed = (workspace.name || 'w')
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bg = BRAND_COLORS[seed % BRAND_COLORS.length];
  return { bg, initial };
}

function formatRowDate(due: number | null): string {
  if (!due) return '';
  const date = new Date(due);
  const now = new Date();

  const diffMinutes = Math.round((due - now.getTime()) / 60000);
  if (diffMinutes > 0 && diffMinutes <= 120) {
    return `Due in ${diffMinutes}m`;
  }
  if (diffMinutes < 0 && diffMinutes >= -120) {
    return `Overdue ${Math.abs(diffMinutes)}m`;
  }

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  if (isTomorrow) {
    return 'Tomorrow';
  }

  const isCurrentYear = date.getFullYear() === now.getFullYear();
  const day = date.getDate();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];

  return isCurrentYear ? `${day} ${month}` : `${day} ${month} ${date.getFullYear()}`;
}

const empty: NowFeed = { rows: [], sources: [], sync: {}, partial: true, failed: [] };
const feedCache = new Map<string, NowFeed>();
export function clearNowCache() { feedCache.clear(); }

type OpenAction = {
  action: HarnessAction;
  interfaces: HarnessInterfaceContract[];
  scope: string;
  input: Record<string, unknown>;
  title: string;
};

type AskSuggestion = {
  action: string | null;
  title: string | null;
  confidence: number | null;
  review: true;
};

interface FeedSection {
  key: string;
  title: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  data: NowRow[];
}

export default function NowScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workspaces, current } = useWorkspace();
  const personalId = workspaces.find((workspace) => workspace.mode === 'personal')?.id || current.id;

  const [feed, setFeed] = useState<NowFeed>(() => feedCache.get(personalId) || empty);
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
        if (cause instanceof HarnessRequestError && cause.status === 401) {
          router.replace('/auth');
          return;
        }
        setFeed((previous) => ({ ...previous, partial: true }));
        setError(cause instanceof Error ? cause.message : 'Now could not refresh.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    })();
    activeRefresh.current = task;
    try {
      await task;
    } finally {
      if (activeRefresh.current === task) activeRefresh.current = null;
    }
  }, [personalId, router, workspaces]);

  useEffect(() => {
    let active = true;
    const force = lastWorkspaces.current !== workspaces;
    lastWorkspaces.current = workspaces;
    void cachedNow(personalId).then((cached) => {
      if (active && cached) {
        feedCache.set(personalId, cached);
        setFeed(cached);
      }
    }).catch(() => undefined).finally(() => {
      if (active) void reload(undefined, force);
    });
    return () => { active = false; };
  }, [personalId, reload, workspaces]);

  useEffect(() => {
    const refreshIfDue = () => {
      if (AppState.currentState === 'active' && Date.now() - lastRefresh.current >= 15_000) {
        void reload();
      }
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshIfDue();
    });
    const interval = setInterval(refreshIfDue, 60_000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [reload]);

  useFocusEffect(useCallback(() => {
    const source = takeNowReload();
    if (source) void reload(source, true);
  }, [reload]));

  const failedNames = feed.failed
    .map((id) => feed.sources.find((source) => source.id === id)?.name || id)
    .join(', ');
  const lastUpdated = Math.max(0, ...Object.values(feed.sync));

  // Group all feed rows into operational urgency & lane sections (Up Next, Available, Waiting, Completed)
  const sections = useMemo<FeedSection[]>(() => {
    const upNextRows: NowRow[] = [];
    const availableRows: NowRow[] = [];
    const waitingRows: NowRow[] = [];
    const completedRows: NowRow[] = [];

    for (const row of feed.rows) {
      if (row.state === 'completed' || row.state === 'closed' || row.state === 'done') {
        completedRows.push(row);
      } else if (feed.next === row.id || row.lane === 'mine') {
        upNextRows.push(row);
      } else if (row.lane === 'waiting') {
        waitingRows.push(row);
      } else {
        availableRows.push(row);
      }
    }

    const result: FeedSection[] = [];
    if (upNextRows.length > 0) {
      result.push({
        key: 'up_next',
        title: 'Up Next',
        iconName: 'reload-circle-outline',
        iconColor: emerald,
        data: upNextRows,
      });
    }
    if (availableRows.length > 0) {
      result.push({
        key: 'available',
        title: 'Available',
        iconName: 'ellipse-outline',
        iconColor: emerald,
        data: availableRows,
      });
    }
    if (waitingRows.length > 0) {
      result.push({
        key: 'waiting',
        title: 'Waiting',
        iconName: 'time-outline',
        iconColor: muted,
        data: waitingRows,
      });
    }
    if (completedRows.length > 0) {
      result.push({
        key: 'completed',
        title: 'Completed',
        iconName: 'checkmark-circle',
        iconColor: emerald,
        data: completedRows,
      });
    }

    if (result.length === 0 && feed.rows.length > 0) {
      result.push({
        key: 'all',
        title: 'Active Work',
        iconName: 'reload-circle-outline',
        iconColor: emerald,
        data: feed.rows,
      });
    }

    return result;
  }, [feed.next, feed.rows]);

  const askTar = async () => {
    const prompt = askDraft.trim();
    if (!prompt || asking) return;
    Keyboard.dismiss();
    setAsking(true);
    setAskError('');
    setAskSuggestion(null);
    try {
      const suggestion = await harness.executeAction<AskSuggestion>(
        current.slug,
        'flow.suggest',
        { prompt },
        createOperationKey('flow.suggest'),
      );
      setAskSuggestion(suggestion);
      setAskDraft('');
    } catch (cause) {
      setAskError(cause instanceof Error ? cause.message : 'Ask TAR could not respond. Try again.');
    } finally {
      setAsking(false);
    }
  };

  const reviewSuggestion = async () => {
    const suggestion = askSuggestion;
    if (!suggestion?.action) return;
    try {
      const registry = await harness.workspaceRegistry(current.slug);
      const action = registry.actions.find((candidate) => candidate.id === suggestion.action);
      if (!action) throw new Error('This action is no longer available in this workspace.');
      setAskOpen(false);
      setOpenAction({
        action,
        interfaces: registry.interfaces,
        scope: current.slug,
        input: {},
        title: suggestion.title || action.title,
      });
    } catch (cause) {
      setAskError(cause instanceof Error ? cause.message : 'Could not open the suggested action.');
    }
  };

  return (
    <View style={[styles.page, { paddingTop: insets.top + 6 }]}>
      {/* Top Header Bar: Clean Left-Aligned Inbox Header with Direct Tools Navigation */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            Inbox
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open tools"
          onPress={() => router.push('/(home)/tools')}
          style={styles.headerIconButton}
        >
          <Ionicons name="grid-outline" size={20} color={ink} />
        </Pressable>
      </View>

      {/* Partial / Offline Retry Banner */}
      {!loading && (feed.partial || error) ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setRefreshing(true);
            void reload();
          }}
          style={styles.partial}
        >
          <Text style={styles.partialText}>
            {error || (failedNames ? `Could not refresh ${failedNames}.` : 'Could not verify all sources.')}
            {feed.rows.length ? ' Known work is shown.' : ''}{' '}
            {lastUpdated ? `Last updated ${new Date(lastUpdated).toLocaleTimeString()}.` : ''} Retry ›
          </Text>
        </Pressable>
      ) : null}

      {/* Grouped Feed List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={feed.rows.length === 0 ? styles.emptyScroll : styles.feedScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void reload();
            }}
          />
        }
      >
        {loading && feed.rows.length === 0 ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={blue} />
            <Text style={styles.emptyDetail}>Loading your work…</Text>
          </View>
        ) : feed.rows.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {feed.partial ? 'Work is unavailable' : 'All clear for now'}
            </Text>
            <Text style={styles.emptyDetail}>
              {feed.partial
                ? 'Pull down to try loading again.'
                : 'New work from your workspaces will appear here.'}
            </Text>
          </View>
        ) : (
          sections.map((section) => (
            <View key={section.key} style={styles.sectionContainer}>
              {/* Full-Width Rectangular Section Bar */}
              <View style={styles.sectionBar}>
                <Ionicons name={section.iconName} size={15} color={section.iconColor} />
                <Text style={styles.sectionBarTitle}>{section.title}</Text>
                <View style={styles.sectionBarBadge}>
                  <Text style={styles.sectionBarBadgeText}>{section.data.length}</Text>
                </View>
              </View>

              {/* Section Items */}
              {section.data.map((item) => {
                const badge = getSpaceBadge(item.workspace);
                const dateText = formatRowDate(item.due);

                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: '/(home)/open/[source]/[id]',
                        params: { source: item.workspace.slug, id: item.id },
                      })
                    }
                    style={styles.itemRow}
                  >
                    {/* Left: Space Monogram Squircle Badge */}
                    <View style={[styles.brandSquircle, { backgroundColor: badge.bg }]}>
                      <Text style={styles.brandInitial}>{badge.initial}</Text>
                    </View>

                    {/* Middle: Clean, Bold Title Only */}
                    <View style={styles.itemMain}>
                      <Text numberOfLines={1} style={styles.itemTitle}>
                        {item.quantity ? `${item.quantity}× ` : ''}
                        {item.title}
                      </Text>
                    </View>

                    {/* Right: Due/Date & Optional Team Avatar */}
                    <View style={styles.itemRight}>
                      {dateText ? <Text style={styles.itemDate}>{dateText}</Text> : null}
                      {item.workspace.mode === 'work' && (item.input?.assignee || (item.role && item.role !== 'general' && item.role !== 'member')) ? (
                        <TarAvatar size={20} bgColor="#E2E8F0" expression="dots" />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Clean Flat Bottom Ask TAR Trigger (Zero Shadows, Zero Elevations) */}
      <View style={[styles.askSafeArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ask TAR"
          onPress={() => {
            setAskError('');
            setAskSuggestion(null);
            setAskOpen(true);
          }}
          style={styles.askBar}
        >
          <View style={styles.askLead}>
            <TarAvatar size={24} />
            <Text style={styles.askText}>Ask TAR…</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={blue} />
        </Pressable>
      </View>


      {/* Ask TAR Sheet Modal */}
      <Modal
        visible={askOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAskOpen(false)}
        onShow={() => askInputRef.current?.focus()}
      >
        <KeyboardAvoidingView style={styles.overlay} behavior="height" automaticOffset>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 8, 24) }]}>
            <View style={styles.sheetHead}>
              <View style={styles.sheetTitleGroup}>
                <TarAvatar size={28} />
                <Text style={styles.sheetTitle}>Ask TAR</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close Ask TAR"
                onPress={() => setAskOpen(false)}
                style={styles.closeIcon}
              >
                <Ionicons name="close" size={22} color={muted} />
              </Pressable>
            </View>
            <View style={styles.askComposer}>
              <TextInput
                ref={askInputRef}
                accessibilityLabel="Ask TAR request"
                multiline
                value={askDraft}
                onChangeText={setAskDraft}
                placeholder="What do you want to do?"
                placeholderTextColor={muted}
                style={styles.askInput}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send request to TAR"
                disabled={!askDraft.trim() || asking}
                onPress={() => void askTar()}
                style={[styles.send, (!askDraft.trim() || asking) && styles.sendDisabled]}
              >
                {asking ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
            {askError ? <Text style={styles.askError}>{askError}</Text> : null}
            {askSuggestion ? (
              <View style={styles.suggestion}>
                <View style={styles.suggestionRow}>
                  <TarAvatar size={20} />
                  <Text style={styles.suggestionText}>
                    {askSuggestion.action
                      ? `Suggested: ${askSuggestion.title || 'Action'}`
                      : 'No matching action. Try a more specific request.'}
                  </Text>
                </View>
                {askSuggestion.action ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void reviewSuggestion()}
                    style={styles.review}
                  >
                    <Text style={styles.reviewText}>Review action</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Action Interface Host */}
      <ActionInterfaceHost
        action={openAction?.action || null}
        contracts={openAction?.interfaces || []}
        scope={openAction?.scope || current.slug}
        initialInput={openAction?.input}
        contextTitle={openAction?.title}
        onClose={() => setOpenAction(null)}
        onSuccess={() => {
          const source = openAction?.scope;
          setOpenAction(null);
          void reload(source);
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
  topHeader: {
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
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ink,
    letterSpacing: -0.2,
  },
  partial: {
    padding: 12,
    backgroundColor: '#FFF4DF',
  },
  partialText: {
    color: '#825500',
    fontSize: 13,
    lineHeight: 18,
  },
  scroll: {
    flex: 1,
  },
  feedScroll: {
    paddingBottom: 24,
  },
  emptyScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 48,
  },
  sectionContainer: {
    marginBottom: 6,
  },
  sectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: borderLine,
    gap: 8,
  },
  sectionBarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: ink,
    letterSpacing: -0.1,
  },
  sectionBarBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  sectionBarBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  itemRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#F0F2F5',
    backgroundColor: '#FFFFFF',
  },
  brandSquircle: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandInitial: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 15,
  },
  itemMain: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: ink,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemDate: {
    fontSize: 13,
    fontWeight: '500',
    color: muted,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 6,
  },
  emptyTitle: {
    color: ink,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDetail: {
    color: muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  askSafeArea: {
    backgroundColor: '#FFFFFF',
  },
  askBar: {
    minHeight: 50,
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: borderLine,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  askLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  askText: {
    color: muted,
    fontSize: 14,
    fontWeight: '500',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: '78%',
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetTitle: {
    fontSize: 18,
    color: ink,
    fontWeight: '800',
  },
  closeIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C9CED8',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  askInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: ink,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  send: {
    width: 36,
    height: 36,
    margin: 6,
    backgroundColor: blue,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  askError: {
    color: '#B42318',
    fontSize: 13,
    marginTop: 10,
  },
  suggestion: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: borderLine,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  suggestionText: {
    flex: 1,
    color: ink,
    fontSize: 14,
    lineHeight: 20,
  },
  review: {
    minHeight: 40,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginTop: 8,
  },
  reviewText: {
    color: blue,
    fontSize: 14,
    fontWeight: '700',
  },
});
