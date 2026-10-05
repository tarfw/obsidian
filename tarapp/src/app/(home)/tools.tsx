import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionInterfaceHost from '@/action-interfaces/ActionInterfaceHost';
import { ITEM_INTERFACE_CONTRACT } from '@/action-interfaces/registry';
import SiteScreen from '@/components/site';
import WorkspaceTeam from '@/components/WorkspaceTeam';
import { useWorkspace } from '@/components/WorkspaceProvider';
import { getCurrentUser } from '@/lib/auth';
import { harness, type HarnessAction, type HarnessFlowBook, type HarnessFlowRun, type HarnessInterfaceContract, type HarnessTool, type HarnessTools, type HarnessWorkspace } from '@/lib/harness';

const ink = '#1C2430';
const muted = '#697586';
const blue = '#3157A8';
const line = '#E8ECF1';

const WORKSPACE_LIGHT_BGS = [
  '#EBF3FE',
  '#F0FDF4',
  '#F5F3FF',
  '#FEF3C7',
  '#FFF1F2',
  '#F0FDF9',
  '#F8FAFC',
  '#EFF6FF',
  '#FDF4FF',
  '#FAF5FF',
];
const WORKSPACE_INK_COLORS = [
  '#1E40AF',
  '#065F46',
  '#5B21B6',
  '#92400E',
  '#9F1239',
  '#115E59',
  '#334155',
  '#075985',
  '#86198F',
  '#6B21A8',
];

type WorkspaceBadge = { bg: string; color: string; initial: string };

function getWorkspaceBadge(name: string): WorkspaceBadge {
  const initial = (name || 'W').trim().charAt(0).toUpperCase() || 'W';
  const seed = (name || 'w')
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bg = WORKSPACE_LIGHT_BGS[seed % WORKSPACE_LIGHT_BGS.length];
  const color = WORKSPACE_INK_COLORS[seed % WORKSPACE_INK_COLORS.length];
  return { bg, color, initial };
}

type Page = 'home' | 'workspaces' | 'flows' | 'more';
type ListedTool = HarnessTool & { scope: string; workspace: string; role: string };
type OpenAction = { action: HarnessAction; interfaces: HarnessInterfaceContract[]; scope: string; input: Record<string, unknown>; title: string };
type FlowPicker = { scope: string; workspace: string; action: HarnessAction; interfaces: HarnessInterfaceContract[]; books: HarnessFlowBook[]; runs: HarnessFlowRun[] };

function sanitizeTools(snapshot: HarnessTools): HarnessTools {
  return {
    ...snapshot,
    tools: snapshot.tools.filter((tool) => {
      if (tool.id === 'inbox') return false;
      if (tool.id === 'flow' || tool.kind === 'flow') return false;
      return true;
    }),
  };
}

const toolSnapshotCache = new Map<string, HarnessTools>();
const cacheKey = (workspace: HarnessWorkspace) => `${workspace.id}:${workspace.role}:${[...(workspace.roles?.length ? workspace.roles : [workspace.workRole || workspace.role])].sort().join(',')}`;
const storedCacheKey = (userId: string, workspace: HarnessWorkspace) => `tar_tools_v8_${userId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 36)}_${workspace.id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 48)}`;
const isToolsSnapshot = (value: unknown): value is HarnessTools => Boolean(value && typeof value === 'object'
  && Array.isArray((value as HarnessTools).tools) && Array.isArray((value as HarnessTools).modules)
  && typeof (value as HarnessTools).role === 'string' && Number.isFinite((value as HarnessTools).version));

async function readTools(workspace: HarnessWorkspace): Promise<HarnessTools> {
  const result = await harness.workspaceTools(workspace.slug);
  return sanitizeTools(result);
}

export default function ToolsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const insets = useSafeAreaInsets();
  const { workspaces, current, createWorkspace } = useWorkspace();
  const active = useMemo(() => workspaces.filter((workspace) => workspace.state === 'active' && workspace.mode !== 'personal')
    .sort((a, b) => Number(b.slug === current.slug) - Number(a.slug === current.slug)), [workspaces, current.slug]);
  const [sources, setSources] = useState<Record<string, HarnessTools>>({});
  const [workspaceFlows, setWorkspaceFlows] = useState<Record<string, { books: HarnessFlowBook[]; runs: HarnessFlowRun[] }>>({});
  const [loadedScopes, setLoadedScopes] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [page, setPage] = useState<Page>('home');
  const [selected, setSelected] = useState(() => (params.source && params.source !== 'personal' ? params.source : 'all'));
  const [flowPicker, setFlowPicker] = useState<FlowPicker | null>(null);
  const [backFromFlow, setBackFromFlow] = useState<Page>('home');
  const [busy, setBusy] = useState('');
  const [openAction, setOpenAction] = useState<OpenAction | null>(null);
  const [siteOpen, setSiteOpen] = useState<{ scope: string; workspace: string } | null>(null);
  const [teamScope, setTeamScope] = useState<string | null>(null);
  const loadGeneration = useRef(0);

  const chooseWorkspace = useCallback((slug: string) => {
    setSelected(slug);
    void SecureStore.setItemAsync('tar_tools_preferred_scope', slug).catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    try {
      const saved = await SecureStore.getItemAsync('tar_tools_preferred_scope');
      if (saved && (saved === 'all' || active.some((w) => w.slug === saved))) {
        setSelected(saved);
      } else if (!saved) {
        setSelected('all');
      }
    } catch { /* Local storage fallback */ }
    const cached = Object.fromEntries(active.flatMap((workspace) => {
      const snapshot = toolSnapshotCache.get(cacheKey(workspace));
      return snapshot ? [[workspace.slug, sanitizeTools(snapshot)]] : [];
    }));
    setSources(cached);
    setLoadedScopes(Object.fromEntries(active.map((workspace) => [workspace.slug, Boolean(cached[workspace.slug])])));
    setFailed([]);
    let userId: string | null = null;
    try {
      userId = (await getCurrentUser())?.id || null;
      if (userId) {
        await Promise.all(active.map(async (workspace) => {
          if (cached[workspace.slug]) return;
          try {
            const raw = await SecureStore.getItemAsync(storedCacheKey(userId!, workspace));
            if (!raw) return;
            const entry = JSON.parse(raw) as { authority?: unknown; snapshot?: unknown };
            if (entry.authority !== cacheKey(workspace) || !isToolsSnapshot(entry.snapshot)) return;
            const cleanSnapshot = sanitizeTools(entry.snapshot);
            cached[workspace.slug] = cleanSnapshot;
            toolSnapshotCache.set(cacheKey(workspace), cleanSnapshot);
          } catch { /* Local snapshots are only a fast display hint. */ }
        }));
        if (generation !== loadGeneration.current) return;
        setSources((previous) => ({ ...previous, ...cached }));
        setLoadedScopes((previous) => ({ ...previous, ...Object.fromEntries(Object.keys(cached).map((slug) => [slug, true])) }));
      }
    } catch { /* Server checks still run when secure storage is unavailable. */ }
    await Promise.allSettled(active.map(async (workspace) => {
      try {
        const [snapshot, flows] = await Promise.all([
          readTools(workspace),
          harness.flows(workspace.slug).catch(() => ({ books: [], runs: [] })),
        ]);
        toolSnapshotCache.set(cacheKey(workspace), snapshot);
        if (userId) void SecureStore.setItemAsync(storedCacheKey(userId, workspace), JSON.stringify({ authority: cacheKey(workspace), snapshot })).catch(() => undefined);
        if (generation === loadGeneration.current) {
          setSources((previous) => ({ ...previous, [workspace.slug]: snapshot }));
          setWorkspaceFlows((previous) => ({ ...previous, [workspace.slug]: flows }));
          setLoadedScopes((previous) => ({ ...previous, [workspace.slug]: true }));
          setFailed((previous) => previous.filter((name) => name !== workspace.name));
        }
      } catch {
        if (generation === loadGeneration.current) {
          setLoadedScopes((previous) => ({ ...previous, [workspace.slug]: true }));
          setFailed((previous) => previous.includes(workspace.name) ? previous : [...previous, workspace.name]);
        }
      }
    }));
  }, [active]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const selectedWorkspace = active.find((workspace) => workspace.slug === selected);
  const chosen = active.filter((workspace) => selected === 'all' || workspace.slug === selected);
  const workspaceSections = chosen.map((workspace) => ({ workspace }));
  const pending = chosen.some((workspace) => !loadedScopes[workspace.slug]);

  const openTool = async (tool: ListedTool) => {
    if (busy) return;
    try {
      const workspace = active.find((item) => item.slug === tool.scope);
      if (!workspace) throw new Error('Workspace is no longer available.');

      if (tool.id === 'members' || tool.id === 'telegram') {
        setTeamScope(tool.scope);
        return;
      }
      if (tool.id === 'chat') {
        void Linking.openURL('https://wa.me').catch(() => Alert.alert('WhatsApp', 'WhatsApp is not installed on this device.'));
        return;
      }
      if (tool.id === 'inbox') {
        router.replace('/(home)/now');
        return;
      }
      if (tool.kind === 'site' || tool.id === 'site') {
        setSiteOpen({ scope: tool.scope, workspace: tool.workspace });
        return;
      }
      if (tool.kind === 'flow' || tool.id === 'flow') {
        setBusy(`${tool.scope}:${tool.id}`);
        const registry = await harness.workspaceRegistry(tool.scope);
        const action = registry.actions.find((item) => item.id === 'flow.start') || registry.actions[0];
        const flows = await harness.flows(tool.scope);
        setFlowPicker({ scope: tool.scope, workspace: tool.workspace, action, interfaces: registry.interfaces, ...flows });
        setBackFromFlow(page);
        setPage('flows');
        return;
      }

      const registry = await harness.workspaceRegistry(tool.scope);
      const available = sources[tool.scope] || (await readTools(workspace));
      const fresh = available.tools.find((item) => item.id === tool.id) || tool;
      const action = registry.actions.find((item) => item.id === fresh.action);

      if (tool.id === 'item' || fresh.action === 'catalog.item.save') {
        const itemAction: HarnessAction = action
          ? { ...action, interfaceKey: 'item' }
          : {
              id: 'catalog.item.save',
              version: 1,
              title: fresh.title || 'Products',
              description: 'Add/edit products, photos, variants, units, prices',
              type: 'app',
              interfaceKey: 'item',
              fields: [],
              output: ['item', 'variant', 'price', 'stock'],
              roles: ['owner', 'admin'],
              effects: ['record_create'],
            };
        const contracts = registry.interfaces.some((item) => item.key === 'item')
          ? registry.interfaces
          : [...registry.interfaces, ITEM_INTERFACE_CONTRACT];
        setOpenAction({ action: itemAction, interfaces: contracts, scope: tool.scope, input: fresh.input || {}, title: fresh.title });
        return;
      }

      if (fresh && action && registry.interfaces.some((item) => item.key === action.interfaceKey)) {
        setOpenAction({ action, interfaces: registry.interfaces, scope: tool.scope, input: fresh.input || {}, title: fresh.title });
        return;
      }

      setBusy(`${tool.scope}:${tool.id}`);
      const [freshAvailable, freshRegistry] = await Promise.all([readTools(workspace), harness.workspaceRegistry(tool.scope, true)]);
      const retryFresh = freshAvailable.tools.find((item) => item.id === tool.id);
      const retryAction = retryFresh && freshRegistry.actions.find((item) => item.id === retryFresh.action);
      if (!retryFresh || !retryAction || !freshRegistry.interfaces.some((item) => item.key === retryAction.interfaceKey)) {
        throw new Error('This tool is no longer available. Refresh Tools.');
      }
      setOpenAction({ action: retryAction, interfaces: freshRegistry.interfaces, scope: tool.scope, input: retryFresh.input || {}, title: retryFresh.title });
    } catch (cause) {
      Alert.alert('Could not open tool', cause instanceof Error ? cause.message : 'Try again.');
      void load();
    } finally {
      setBusy('');
    }
  };

  const startFlow = async (book: HarnessFlowBook, scope: string) => {
    if (busy) return;
    try {
      setBusy(`flow:${book.id}`);
      const registry = await harness.workspaceRegistry(scope);
      const action = registry.actions.find((item) => item.id === 'flow.start') || registry.actions[0];
      const requiresRegister = Array.isArray(book.data.actions) && book.data.actions.some((entry) =>
        Boolean(entry && typeof entry === 'object' && ['pos.register.count', 'pos.register.close'].includes(String((entry as Record<string, unknown>).id || '')))
      );
      setOpenAction({
        action,
        interfaces: registry.interfaces,
        scope,
        input: { flowId: book.id, ...(requiresRegister ? { requiresRegister: true } : {}) },
        title: book.name,
      });
    } catch (cause) {
      Alert.alert('Could not start flow', cause instanceof Error ? cause.message : 'Try again.');
    } finally {
      setBusy('');
    }
  };

  const resumeFlowRun = async (run: HarnessFlowRun, book: HarnessFlowBook | undefined, scope: string) => {
    if (busy) return;
    try {
      setBusy(`run:${run.id}`);
      const registry = await harness.workspaceRegistry(scope);
      const action = registry.actions.find((item) => item.id === 'flow.advance') || registry.actions.find((item) => item.id === 'flow.start') || registry.actions[0];
      const bookName = book?.name || run.name || 'Flow';
      setOpenAction({
        action,
        interfaces: registry.interfaces,
        scope,
        input: { flowId: run.flowId, runId: run.id, actionId: run.actionId || '' },
        title: `Continue ${bookName}`,
      });
    } catch (cause) {
      Alert.alert('Could not resume flow', cause instanceof Error ? cause.message : 'Try again.');
    } finally {
      setBusy('');
    }
  };

  const createNewFlow = async (scope: string) => {
    if (busy) return;
    try {
      setBusy('flow:new');
      const registry = await harness.workspaceRegistry(scope);
      const action = registry.actions.find((item) => item.id === 'flow.publish');
      if (!action) throw new Error('Flow creator not available.');
      setOpenAction({
        action,
        interfaces: registry.interfaces,
        scope,
        input: {},
        title: 'New flow',
      });
    } catch (cause) {
      Alert.alert('Could not open flow creator', cause instanceof Error ? cause.message : 'Try again.');
    } finally {
      setBusy('');
    }
  };

  const chooseFlow = (book: HarnessFlowBook, run?: HarnessFlowRun) => {
    if (!flowPicker) return;
    const requiresRegister = Array.isArray(book.data.actions) && book.data.actions.some((entry) => Boolean(entry && typeof entry === 'object' && ['pos.register.count', 'pos.register.close'].includes(String((entry as Record<string, unknown>).id || ''))));
    setOpenAction({ action: flowPicker.action, interfaces: flowPicker.interfaces, scope: flowPicker.scope,
      input: { flowId: book.id, ...(requiresRegister ? { requiresRegister: true } : {}) }, ...(run ? { runId: run.id } : {}), title: run ? `Continue ${book.name}` : book.name });
    setFlowPicker(null);
    setPage(backFromFlow);
  };

  const back = () => {
    if (page === 'flows') { setFlowPicker(null); setPage(backFromFlow); }
    else if (page !== 'home') setPage('home');
    else router.back();
  };
  const title = page === 'home' ? 'Tools' : page === 'workspaces' ? 'Workspaces'
    : page === 'flows' ? 'Flows' : 'More';
  const bottom = Math.max(insets.bottom + 20, 36);

  return <View style={[styles.page, { paddingTop: insets.top }]}>
    <View style={styles.header}>
      {page === 'home' ? (
        <Text style={styles.titleHome} numberOfLines={1}>{title}</Text>
      ) : (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={styles.iconButton}><Ionicons name="arrow-back" size={22} color={ink} /></Pressable>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </>
      )}
      {page === 'home' ? <View style={styles.headerActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="More options" onPress={() => setPage('more')} style={styles.iconButton}><Ionicons name="ellipsis-horizontal" size={22} color={ink} /></Pressable>
      </View> : <View style={styles.iconButton} />}
    </View>

    {page === 'home' ? <>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose workspace for tools" onPress={() => setPage('workspaces')} style={styles.scopeRow}>
        <View style={styles.scopeCopy}>
          <Text style={styles.scopeName}>{selected === 'all' ? (active.length > 1 ? 'All workspaces' : active[0]?.name || 'Workspaces') : selectedWorkspace?.name || active[0]?.name || 'Workspace'}</Text>
          {selected !== 'all' ? (
            <Text style={styles.scopeRole}>
              {sources[selected]?.role || selectedWorkspace?.workRole || selectedWorkspace?.role || 'Active workspace'}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-down" size={19} color={muted} />
      </Pressable>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: bottom }]}>
        {pending && !chosen.some((w) => sources[w.slug]) ? <ActivityIndicator color={blue} style={styles.loading} /> : <>
          {failed.length ? <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.notice}><Text style={styles.noticeText}>Could not load {failed.join(', ')}. Retry</Text><Ionicons name="arrow-forward" size={17} color={blue} /></Pressable> : null}
          {workspaceSections.map((section) => {
            const badge = getWorkspaceBadge(section.workspace.name);
            const showHeader = selected === 'all' || chosen.length > 1;
            const role = sources[section.workspace.slug]?.role || section.workspace.workRole || section.workspace.role;
            const flows = workspaceFlows[section.workspace.slug] || { books: [], runs: [] };
            const activeRuns = flows.runs.filter((run) => run.state !== 'completed');
            const books = flows.books;
            const tools = (sources[section.workspace.slug]?.tools || []).filter((tool) => {
              if (tool.id === 'inbox') return false;
              if (tool.id === 'flow' || tool.kind === 'flow') return false;
              return true;
            });

            return (
              <View key={section.workspace.slug} style={styles.workspaceSection}>
                {showHeader ? (
                  <View style={styles.workspaceCard}>
                    <View style={[styles.workspaceThumbnail, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.workspaceInitial, { color: badge.color }]}>{badge.initial}</Text>
                    </View>
                    <View style={styles.workspaceCardCopy}>
                      <Text style={styles.workspaceCardTitle} numberOfLines={1}>
                        {section.workspace.name}
                      </Text>
                      {role ? (
                        <Text style={styles.workspaceCardRole} numberOfLines={1}>
                          {role}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                {/* SECTION 1: ACTIVE FLOWS */}
                {activeRuns.length > 0 ? (
                  <View style={styles.sectionBlock}>
                    <Text style={styles.sectionHeading}>ACTIVE FLOWS</Text>
                    {activeRuns.map((run) => {
                      const book = books.find((b) => b.id === run.flowId);
                      return (
                        <Pressable
                          key={run.id}
                          accessibilityRole="button"
                          onPress={() => void resumeFlowRun(run, book, section.workspace.slug)}
                          style={styles.activeRunCard}
                        >
                          <Ionicons name="play-circle-outline" size={24} color={blue} />
                          <View style={styles.activeRunCopy}>
                            <Text style={styles.activeRunTitle} numberOfLines={1}>
                              {run.name || book?.name || 'Active Process'}
                            </Text>
                            <Text style={styles.activeRunStep}>
                              {run.step && run.steps?.length
                                ? `Step ${run.step} of ${run.steps.length}`
                                : 'In progress'}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={muted} />
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                {/* SECTION 2: TOOLS */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>TOOLS</Text>
                  {tools.map((tool) => (
                    <Row
                      key={tool.id}
                      icon={(tool.icon || 'apps-outline') as keyof typeof Ionicons.glyphMap}
                      title={tool.title}
                      busy={busy === `${section.workspace.slug}:${tool.id}`}
                      onPress={() => void openTool({ ...tool, scope: section.workspace.slug, workspace: section.workspace.name, role })}
                    />
                  ))}
                  {tools.length === 0 ? (
                    <Text style={styles.emptyNote}>No tools available for your role.</Text>
                  ) : null}
                </View>

                {/* SECTION 3: AVAILABLE FLOWS */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>AVAILABLE FLOWS</Text>
                  {books.map((book) => (
                    <Row
                      key={book.id}
                      icon="git-branch-outline"
                      title={book.name}
                      detail={typeof book.data?.description === 'string' ? book.data.description : undefined}
                      arrow
                      onPress={() => void startFlow(book, section.workspace.slug)}
                    />
                  ))}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void createNewFlow(section.workspace.slug)}
                    style={styles.newFlowRow}
                  >
                    <Ionicons name="add" size={20} color={blue} />
                    <Text style={styles.newFlowText}>New flow</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          {active.length === 0 ? (
            <Empty title="No business workspaces" detail="Join or create a work workspace to access commercial tools." />
          ) : !chosen.some((w) => (sources[w.slug]?.tools || []).length > 0) && !failed.length && !pending ? (
            <Empty title="No tools available" detail="Try another workspace." />
          ) : null}
          {pending && chosen.some((w) => sources[w.slug]) ? (
            <View style={styles.refreshing}><ActivityIndicator size="small" color={blue} /><Text style={styles.rowDetail}>Loading more workspaces…</Text></View>
          ) : null}
        </>}
      </ScrollView>
    </> : null}

    {page === 'workspaces' ? <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: bottom }]}>
      <Row icon="layers-outline" title="All workspaces" onPress={() => { chooseWorkspace('all'); setPage('home'); }} selected={selected === 'all'} />

      {active.length > 0 ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeading}>WORKSPACES</Text>
          {active.map((workspace) => (
            <Row
              key={workspace.slug}
              icon="business-outline"
              title={workspace.name}
              detail={sources[workspace.slug]?.role || workspace.workRole || workspace.role}
              onPress={() => { chooseWorkspace(workspace.slug); setPage('home'); }}
              selected={selected === workspace.slug}
            />
          ))}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          createWorkspace();
          setPage('home');
        }}
        style={styles.newFlowRow}
      >
        <Ionicons name="add" size={20} color={blue} />
        <Text style={styles.newFlowText}>Create new workspace</Text>
      </Pressable>
    </ScrollView> : null}

    {page === 'flows' && flowPicker ? <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: bottom }]}>
      <Text style={styles.caption}>{flowPicker.workspace}</Text>
      {flowPicker.runs.filter((run) => run.state !== 'completed').map((run) => {
        const book = flowPicker.books.find((item) => item.id === run.flowId);
        return book ? <Row key={run.id} icon="play-outline" title={`Continue ${run.name || book.name}`} busy={busy === `${flowPicker.scope}:${run.id}`} onPress={() => chooseFlow(book, run)} /> : null;
      })}
      {flowPicker.books.map((book) => <Row key={book.id} icon="git-branch-outline" title={book.name} onPress={() => chooseFlow(book)} />)}
      {!flowPicker.books.length ? <Empty title="No Flows" detail="Published processes will appear here." /> : null}
    </ScrollView> : null}

    {page === 'more' ? <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: bottom }]}>
      <Row icon="settings-outline" title="Settings" arrow onPress={() => router.push('/settings')} />
    </ScrollView> : null}

    <ActionInterfaceHost action={openAction?.action || null} contracts={openAction?.interfaces || []} scope={openAction?.scope || current.slug} initialInput={openAction?.input} contextTitle={openAction?.title} onClose={() => setOpenAction(null)} onSuccess={() => { setOpenAction(null); void load(); }} />
    {siteOpen ? <SiteScreen visible onClose={() => { setSiteOpen(null); void load(); }} workspaceName={siteOpen.workspace} subdomain={siteOpen.scope} scope={siteOpen.scope} /> : null}
    {teamScope ? <WorkspaceTeam key={teamScope} scope={teamScope} name={active.find((workspace) => workspace.slug === teamScope)?.name || 'Workspace'} onClose={() => setTeamScope(null)} onChanged={() => void load()} /> : null}
  </View>;
}

function Row({ icon, title, detail, busy, selected, arrow, badge, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail?: string;
  busy?: boolean;
  selected?: boolean;
  arrow?: boolean;
  badge?: string | number;
  onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={selected === undefined ? undefined : { selected }} disabled={busy} onPress={onPress} style={[styles.row, !detail && styles.compactRow]}>
    <Ionicons name={icon} size={20} color={muted} style={styles.rowIcon} />
    <View style={styles.rowCopy}>
      <Text style={styles.rowTitle}>{title}</Text>
      {detail ? <Text style={styles.rowDetail} numberOfLines={1}>{detail}</Text> : null}
    </View>
    {badge !== undefined ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : null}
    {busy ? <ActivityIndicator size="small" color={blue} /> : selected === undefined ? (arrow ? <Ionicons name="chevron-forward" size={17} color="#A8B0BE" /> : null) : selected ? <Ionicons name="checkmark" size={18} color={blue} /> : null}
  </Pressable>;
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return <View style={styles.empty}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDetail}>{detail}</Text></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' }, scroll: { flex: 1 },
  header: { minHeight: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: ink, fontSize: 22, fontWeight: '700', flex: 1, marginLeft: 8 },
  titleHome: { color: ink, fontSize: 22, fontWeight: '700', flex: 1, paddingLeft: 8 },
  headerActions: { flexDirection: 'row' }, iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  scopeRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: line, gap: 12 },
  scopeCopy: { flex: 1 },
  scopeName: { color: ink, fontSize: 16, fontWeight: '700' },
  scopeRole: { color: muted, fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
  content: { paddingTop: 0 },
  workspaceSection: { width: '100%' },
  workspaceCard: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FAFBFC',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: line,
    gap: 12,
  },
  workspaceThumbnail: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  workspaceInitial: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  workspaceCardCopy: { flex: 1, justifyContent: 'center' },
  workspaceCardTitle: { fontSize: 16, fontWeight: '800', color: ink, letterSpacing: -0.2 },
  workspaceCardRole: { color: muted, fontSize: 12, lineHeight: 16, marginTop: 2, textTransform: 'capitalize' },
  sectionBlock: { marginTop: 16, marginBottom: 8 },
  sectionHeading: { color: muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginHorizontal: 24, marginBottom: 8, marginTop: 4 },
  activeRunCard: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 24, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: line, backgroundColor: '#FFFFFF' },
  activeRunCopy: { flex: 1, gap: 2 },
  activeRunTitle: { color: ink, fontSize: 15, fontWeight: '700' },
  activeRunStep: { color: blue, fontSize: 12, fontWeight: '600' },
  newFlowRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: line },
  newFlowText: { color: blue, fontSize: 15, fontWeight: '700' },
  emptyNote: { color: muted, fontSize: 13, marginHorizontal: 24, marginVertical: 8 },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 24, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: line, backgroundColor: '#FFFFFF' },
  compactRow: { minHeight: 48, paddingVertical: 11 },
  rowIcon: { width: 24 },
  rowCopy: { flex: 1 },
  rowTitle: { color: ink, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  rowDetail: { color: muted, fontSize: 12, lineHeight: 16, marginTop: 2 },
  badge: { minWidth: 22, height: 22, paddingHorizontal: 7, borderRadius: 11, backgroundColor: '#F0F3F8', alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  badgeText: { color: muted, fontSize: 12, fontWeight: '700' },
  caption: { color: muted, fontSize: 13, marginHorizontal: 24, marginTop: 8, marginBottom: 8 },
  notice: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, paddingHorizontal: 12, backgroundColor: '#F5F7FA', marginBottom: 12, borderRadius: 8 },
  noticeText: { color: ink, fontSize: 13, flex: 1 }, loading: { marginTop: 48 },
  refreshing: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 24, paddingVertical: 10 },
  empty: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 76 }, emptyTitle: { color: ink, fontSize: 17, fontWeight: '700' }, emptyDetail: { color: muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
});
