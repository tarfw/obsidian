import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionInterfaceHost from '@/action-interfaces/ActionInterfaceHost';
import SiteScreen from '@/components/site';
import WorkspaceTeam from '@/components/WorkspaceTeam';
import { useWorkspace } from '@/components/WorkspaceProvider';
import { getCurrentUser } from '@/lib/auth';
import { createOperationKey, HarnessRequestError, harness, type HarnessAction, type HarnessFlowBook, type HarnessFlowRun, type HarnessInterfaceContract, type HarnessTool, type HarnessTools, type HarnessWorkspace } from '@/lib/harness';
import { legacyWorkspaceTools } from '@/lib/legacy-tools';

const ink = '#1C2430';
const muted = '#697586';
const blue = '#3157A8';
const line = '#E8ECF1';
const groups = [
  { id: 'pos', title: 'Point of sale', icon: 'storefront-outline' },
  { id: 'commerce', title: 'Commerce', icon: 'bag-handle-outline' },
  { id: 'site', title: 'Site Studio', icon: 'globe-outline' },
  { id: 'flows', title: 'Flow Books', icon: 'git-branch-outline' },
  { id: 'create', title: 'Create', icon: 'add-circle-outline' },
  { id: 'other', title: 'Other tools', icon: 'grid-outline' },
] as const;
type Page = 'home' | 'workspaces' | 'folder' | 'flows' | 'more' | 'manage' | 'teams';
type ListedTool = HarnessTool & { scope: string; workspace: string; role: string };
type ToolGroup = { id: string; title: string; icon: keyof typeof Ionicons.glyphMap; workspace: string; scope: string; tools: ListedTool[] };
type OpenAction = { action: HarnessAction; interfaces: HarnessInterfaceContract[]; scope: string; input: Record<string, unknown>; title: string };
type FlowPicker = { scope: string; workspace: string; action: HarnessAction; interfaces: HarnessInterfaceContract[]; books: HarnessFlowBook[]; runs: HarnessFlowRun[] };
let missingRouteUntil = 0;
const toolSnapshotCache = new Map<string, HarnessTools>();
const cacheKey = (workspace: HarnessWorkspace) => `${workspace.id}:${workspace.role}:${[...(workspace.roles?.length ? workspace.roles : [workspace.workRole || workspace.role])].sort().join(',')}`;
const storedCacheKey = (userId: string, workspace: HarnessWorkspace) => `tar_tools_v1_${userId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 36)}_${workspace.id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 48)}`;
const isToolsSnapshot = (value: unknown): value is HarnessTools => Boolean(value && typeof value === 'object'
  && Array.isArray((value as HarnessTools).tools) && Array.isArray((value as HarnessTools).modules)
  && typeof (value as HarnessTools).role === 'string' && Number.isFinite((value as HarnessTools).version));

const missingRoute = (cause: unknown) => cause instanceof HarnessRequestError && cause.status === 404 && cause.message === 'Route not found.';
const bucket = (tool: HarnessTool) => tool.module !== 'core' ? tool.module
  : tool.kind === 'flows' || tool.id === 'flow' ? 'flows'
  : tool.category === 'create' ? 'create' : 'other';

async function readTools(workspace: HarnessWorkspace): Promise<HarnessTools> {
  if (Date.now() >= missingRouteUntil) {
    try { return await harness.workspaceTools(workspace.slug); }
    catch (cause) { if (!missingRoute(cause)) throw cause; missingRouteUntil = Date.now() + 30_000; }
  }
  const registry = await harness.workspaceRegistry(workspace.slug);
  const actionIds = new Set(registry.actions.map((action) => action.id));
  const roles = [workspace.workRole, ...(workspace.roles || [])].map((role) => role?.toLowerCase());
  const canReadPos = actionIds.has('pos.open') && (workspace.role === 'owner' || workspace.role === 'admin' || roles.includes('cashier') || roles.includes('manager'));
  const [pos, site] = await Promise.all([
    canReadPos ? harness.posOverview(workspace.slug).catch((cause) => { if (missingRoute(cause)) return { settings: null }; throw cause; }) : Promise.resolve({ settings: null }),
    actionIds.has('site.generate') ? harness.site.available(workspace.slug).catch((cause) => { if (missingRoute(cause)) return { site: null }; throw cause; }) : Promise.resolve({ site: null }),
  ]);
  return legacyWorkspaceTools(workspace, registry.actions, registry.interfaces, { pos: Boolean(pos.settings), site: Boolean(site.site) });
}

export default function ToolsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const insets = useSafeAreaInsets();
  const { workspaces, current, createWorkspace } = useWorkspace();
  const active = useMemo(() => workspaces.filter((workspace) => workspace.state === 'active')
    .sort((a, b) => Number(b.slug === current.slug) - Number(a.slug === current.slug)), [workspaces, current.slug]);
  const [sources, setSources] = useState<Record<string, HarnessTools>>({});
  const [loadedScopes, setLoadedScopes] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [page, setPage] = useState<Page>('home');
  const [selected, setSelected] = useState(params.source || current.slug);
  const [managedSlug, setManagedSlug] = useState(current.slug);
  const [folder, setFolder] = useState<ToolGroup | null>(null);
  const [flowPicker, setFlowPicker] = useState<FlowPicker | null>(null);
  const [backFromFlow, setBackFromFlow] = useState<Page>('home');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState('');
  const [openAction, setOpenAction] = useState<OpenAction | null>(null);
  const [siteOpen, setSiteOpen] = useState<{ scope: string; workspace: string } | null>(null);
  const [teamScope, setTeamScope] = useState<string | null>(null);
  const loadGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    const cached = Object.fromEntries(active.flatMap((workspace) => {
      const snapshot = toolSnapshotCache.get(cacheKey(workspace));
      return snapshot ? [[workspace.slug, snapshot]] : [];
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
            cached[workspace.slug] = entry.snapshot;
            toolSnapshotCache.set(cacheKey(workspace), entry.snapshot);
          } catch { /* Local snapshots are only a fast display hint. */ }
        }));
        if (generation !== loadGeneration.current) return;
        setSources((previous) => ({ ...previous, ...cached }));
        setLoadedScopes((previous) => ({ ...previous, ...Object.fromEntries(Object.keys(cached).map((slug) => [slug, true])) }));
      }
    } catch { /* Server checks still run when secure storage is unavailable. */ }
    await Promise.allSettled(active.map(async (workspace) => {
      try {
        const snapshot = await readTools(workspace);
        toolSnapshotCache.set(cacheKey(workspace), snapshot);
        if (userId) void SecureStore.setItemAsync(storedCacheKey(userId, workspace), JSON.stringify({ authority: cacheKey(workspace), snapshot })).catch(() => undefined);
        if (generation === loadGeneration.current) {
          setSources((previous) => ({ ...previous, [workspace.slug]: snapshot }));
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
  const allTools = active.flatMap((workspace) => (sources[workspace.slug]?.tools || []).map((tool) => ({ ...tool, scope: workspace.slug, workspace: workspace.name, role: sources[workspace.slug].role })));
  const visible = allTools.filter((tool) => selected === 'all' || tool.scope === selected);
  const matches = allTools.filter((tool) => `${tool.title} ${tool.description} ${tool.workspace}`.toLowerCase().includes(query.trim().toLowerCase()));
  const toolGroups: ToolGroup[] = chosen.flatMap((workspace) => groups.flatMap((group) => {
    const tools = visible.filter((tool) => tool.scope === workspace.slug && bucket(tool) === group.id);
    return tools.length ? [{ ...group, icon: group.icon as keyof typeof Ionicons.glyphMap, scope: workspace.slug, workspace: workspace.name, tools }] : [];
  }));
  const pending = chosen.some((workspace) => !loadedScopes[workspace.slug]);
  const manageable = active.filter((workspace) => sources[workspace.slug]?.canManage);
  const managing = manageable.find((workspace) => workspace.slug === managedSlug) || manageable[0];
  const legacy = chosen.some((workspace) => sources[workspace.slug]?.legacy);

  const openTool = async (tool: ListedTool) => {
    if (busy) return;
    setBusy(`${tool.scope}:${tool.id}`);
    try {
      const workspace = active.find((item) => item.slug === tool.scope);
      if (!workspace) throw new Error('Workspace is no longer available.');
      const [available, registry] = await Promise.all([readTools(workspace), harness.workspaceRegistry(tool.scope)]);
      const fresh = available.tools.find((item) => item.id === tool.id);
      const action = fresh && registry.actions.find((item) => item.id === fresh.action);
      if (!fresh || !action || !registry.interfaces.some((item) => item.key === action.interfaceKey)) throw new Error('This tool is no longer available. Refresh Tools.');
      if (fresh.kind === 'site') setSiteOpen({ scope: tool.scope, workspace: tool.workspace });
      else if (fresh.kind === 'flows') {
        const flows = await harness.flows(tool.scope);
        setFlowPicker({ scope: tool.scope, workspace: tool.workspace, action, interfaces: registry.interfaces, ...flows });
        setBackFromFlow(page);
        setPage('flows');
      } else setOpenAction({ action, interfaces: registry.interfaces, scope: tool.scope, input: fresh.input, title: fresh.title });
    } catch (cause) { Alert.alert('Could not open tool', cause instanceof Error ? cause.message : 'Try again.'); void load(); }
    finally { setBusy(''); }
  };

  const changeModule = async (module: HarnessTools['modules'][number]) => {
    if (!managing || busy) return;
    setBusy(module.id);
    try {
      const source = await harness.workspaceTools(managing.slug);
      if (!source.canManage) throw new Error('You no longer have permission to manage this workspace.');
      const currentModule = source.modules.find((item) => item.id === module.id);
      if (!currentModule) throw new Error('This capability is no longer available.');
      await harness.executeAction(managing.slug, 'capability.save', { module: module.id, enabled: !currentModule.enabled, baseVersion: source.version }, createOperationKey(`capability:${managing.slug}:${module.id}`));
      const updated = await harness.workspaceTools(managing.slug);
      toolSnapshotCache.set(cacheKey(managing), updated);
      const user = await getCurrentUser().catch(() => null);
      if (user?.id) void SecureStore.setItemAsync(storedCacheKey(user.id, managing), JSON.stringify({ authority: cacheKey(managing), snapshot: updated })).catch(() => undefined);
      setSources((previous) => ({ ...previous, [managing.slug]: updated }));
    } catch (cause) { Alert.alert('Could not update tools', cause instanceof Error ? cause.message : 'Try again.'); void load(); }
    finally { setBusy(''); }
  };

  const chooseFlow = (book: HarnessFlowBook, run?: HarnessFlowRun) => {
    if (!flowPicker) return;
    const requiresRegister = Array.isArray(book.data.actions) && book.data.actions.some((entry) => Boolean(entry && typeof entry === 'object' && ['pos.register.count', 'pos.register.close'].includes(String((entry as Record<string, unknown>).id || ''))));
    setOpenAction({ action: flowPicker.action, interfaces: flowPicker.interfaces, scope: flowPicker.scope,
      input: { flowId: book.id, ...(requiresRegister ? { requiresRegister: true } : {}), ...(run ? { runId: run.id } : {}) }, title: run ? `Continue ${book.name}` : book.name });
    setFlowPicker(null);
    setPage(backFromFlow);
  };

  const back = () => {
    if (page === 'flows') { setFlowPicker(null); setPage(backFromFlow); }
    else if (page === 'manage' || page === 'teams') setPage('more');
    else if (page !== 'home') setPage('home');
    else if (searchOpen) { setSearchOpen(false); setQuery(''); }
    else router.back();
  };
  const title = page === 'home' ? 'Tools' : page === 'workspaces' ? 'Workspaces' : page === 'folder' ? folder?.title || 'Tools'
    : page === 'flows' ? 'Flow Books' : page === 'manage' ? 'Capabilities' : page === 'teams' ? 'Members & chat' : 'More';
  const bottom = Math.max(insets.bottom + 20, 36);

  return <View style={[styles.page, { paddingTop: insets.top }]}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={page === 'home' ? 'Back to Now' : 'Back to Tools'} onPress={back} style={styles.iconButton}><Ionicons name="arrow-back" size={22} color={ink} /></Pressable>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {page === 'home' ? <View style={styles.headerActions}>
        <Pressable accessibilityRole="button" accessibilityLabel={searchOpen ? 'Close search' : 'Search tools'} onPress={() => { setSearchOpen(!searchOpen); setQuery(''); }} style={styles.iconButton}><Ionicons name={searchOpen ? 'close' : 'search-outline'} size={21} color={ink} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="More options" onPress={() => setPage('more')} style={styles.iconButton}><Ionicons name="ellipsis-horizontal" size={22} color={ink} /></Pressable>
      </View> : <View style={styles.iconButton} />}
    </View>

    {page === 'home' ? <>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose workspace for tools" onPress={() => setPage('workspaces')} style={styles.scopeRow}>
        <View style={styles.scopeCopy}><Text style={styles.scopeName}>{selected === 'all' ? 'All workspaces' : selectedWorkspace?.name || current.name}</Text>
          <Text style={styles.scopeRole}>{selected === 'all' ? 'Your available tools' : sources[selected]?.role || selectedWorkspace?.workRole || selectedWorkspace?.role || ''}</Text></View>
        <Ionicons name="chevron-down" size={19} color={muted} />
      </Pressable>
      {searchOpen ? <View style={styles.searchWrap}><Ionicons name="search-outline" size={19} color={muted} /><TextInput autoFocus accessibilityLabel="Find a tool or workspace" placeholder="Find a tool or workspace" placeholderTextColor={muted} value={query} onChangeText={setQuery} style={styles.searchInput} /></View> : null}
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: bottom }]}>
        {pending && !toolGroups.length ? <ActivityIndicator color={blue} style={styles.loading} /> : <>
          {failed.length ? <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.notice}><Text style={styles.noticeText}>Could not load {failed.join(', ')}. Retry</Text><Ionicons name="arrow-forward" size={17} color={blue} /></Pressable> : null}
          {query.trim() ? <>
            {matches.map((tool) => <Row key={`${tool.scope}:${tool.id}`} icon={tool.icon as keyof typeof Ionicons.glyphMap} title={tool.title} detail={`${tool.workspace} · ${tool.description}`} busy={busy === `${tool.scope}:${tool.id}`} onPress={() => void openTool(tool)} />)}
            {!matches.length && pending ? <View style={styles.refreshing}><ActivityIndicator size="small" color={blue} /><Text style={styles.rowDetail}>Loading tools…</Text></View> : !matches.length ? <Empty title="No matching tools" detail="Try another name or workspace." /> : null}
          </> : <>
            {toolGroups.map((group, index) => <View key={`${group.scope}:${group.id}`}>
              {selected === 'all' && (index === 0 || toolGroups[index - 1].scope !== group.scope) ? <Text style={styles.groupHeading}>{group.workspace}</Text> : null}
              <Row icon={group.icon} title={group.title} detail={group.tools.length > 1 ? `${group.tools.length} tools` : undefined} onPress={() => {
                if (group.tools.length === 1) void openTool(group.tools[0]);
                else { setFolder(group); setPage('folder'); }
              }} />
            </View>)}
            {!toolGroups.length && !failed.length && !pending ? <Empty title="No tools available" detail="Try another workspace." /> : null}
          </>}
          {pending && toolGroups.length ? <View style={styles.refreshing}><ActivityIndicator size="small" color={blue} /><Text style={styles.rowDetail}>Loading more workspaces…</Text></View> : null}
          {legacy ? <Pressable accessibilityRole="button" onPress={() => { missingRouteUntil = 0; void load(); }}><Text style={styles.helper}>Some tools await the server update. Check again ›</Text></Pressable> : null}
        </>}
      </ScrollView>
    </> : null}

    {page === 'workspaces' ? <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: bottom }]}>
      <Row icon="layers-outline" title="All workspaces" onPress={() => { setSelected('all'); setPage('home'); }} selected={selected === 'all'} />
      {active.map((workspace) => <Row key={workspace.slug} icon="albums-outline" title={workspace.name} detail={sources[workspace.slug]?.role || workspace.workRole || workspace.role} onPress={() => { setSelected(workspace.slug); setPage('home'); }} selected={selected === workspace.slug} />)}
    </ScrollView> : null}

    {page === 'folder' && folder ? <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: bottom }]}>
      <Text style={styles.caption}>{folder.workspace}</Text>
      {folder.tools.map((tool) => <Row key={tool.id} icon={tool.icon as keyof typeof Ionicons.glyphMap} title={tool.title} detail={tool.description} busy={busy === `${tool.scope}:${tool.id}`} onPress={() => void openTool(tool)} />)}
    </ScrollView> : null}

    {page === 'flows' && flowPicker ? <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: bottom }]}>
      <Text style={styles.caption}>{flowPicker.workspace}</Text>
      {flowPicker.runs.filter((run) => run.state !== 'completed').map((run) => {
        const book = flowPicker.books.find((item) => item.id === run.flowId);
        return book ? <Row key={run.id} icon="play-outline" title={`Continue ${run.name || book.name}`} onPress={() => chooseFlow(book, run)} /> : null;
      })}
      {flowPicker.books.map((book) => <Row key={book.id} icon="git-branch-outline" title={book.name} onPress={() => chooseFlow(book)} />)}
      {!flowPicker.books.length ? <Empty title="No Flow Books" detail="Published processes will appear here." /> : null}
    </ScrollView> : null}

    {page === 'more' ? <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: bottom }]}>
      <Row icon="folder-outline" title="Browse records" onPress={() => router.push({ pathname: '/(home)/records', params: { source: selected === 'all' ? current.slug : selected } })} />
      <Row icon="time-outline" title="Space routines" onPress={() => router.push('/(home)/routines')} />
      {active.some((workspace) => workspace.mode === 'work') ? <Row icon="people-outline" title="Members & chat" onPress={() => {
        const work = active.filter((workspace) => workspace.mode === 'work');
        if (work.length === 1) setTeamScope(work[0].slug);
        else setPage('teams');
      }} /> : null}
      <Row icon="add-outline" title="Create workspace" onPress={createWorkspace} />
      {manageable.length ? <Row icon="options-outline" title="Capabilities" onPress={() => { setManagedSlug(manageable.find((item) => item.slug === current.slug)?.slug || manageable[0].slug); setPage('manage'); }} /> : null}
      <Row icon="settings-outline" title="Settings" onPress={() => router.push('/settings')} />
    </ScrollView> : null}

    {page === 'teams' ? <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: bottom }]}>
      {active.filter((workspace) => workspace.mode === 'work').map((workspace) =>
        <Row key={workspace.slug} icon="people-outline" title={workspace.name} detail={sources[workspace.slug]?.role || workspace.workRole || workspace.role} onPress={() => setTeamScope(workspace.slug)} />)}
    </ScrollView> : null}

    {page === 'manage' ? <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: bottom }]}>
      {manageable.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {manageable.map((workspace) => <Pressable key={workspace.slug} accessibilityRole="button" accessibilityState={{ selected: managing?.slug === workspace.slug }} onPress={() => setManagedSlug(workspace.slug)} style={[styles.chip, managing?.slug === workspace.slug && styles.chipSelected]}><Text style={[styles.chipText, managing?.slug === workspace.slug && styles.chipTextSelected]}>{workspace.name}</Text></Pressable>)}
      </ScrollView> : null}
      <Text style={styles.caption}>{managing?.name}</Text>
      {managing && sources[managing.slug]?.modules.map((module) => <View key={module.id} style={styles.moduleRow}>
        <View style={styles.moduleCopy}><Text style={styles.rowTitle}>{module.title}</Text><Text style={styles.rowDetail}>{module.description}</Text></View>
        {busy === module.id ? <ActivityIndicator color={blue} /> : <Switch accessibilityLabel={`${module.title} in ${managing.name}`} value={module.enabled} onValueChange={() => void changeModule(module)} trackColor={{ false: '#DDE3EB', true: '#A9BCE8' }} thumbColor={module.enabled ? blue : '#FFFFFF'} />}
      </View>)}
      <Text style={styles.helper}>Members see only tools allowed by their role.</Text>
    </ScrollView> : null}

    <ActionInterfaceHost action={openAction?.action || null} contracts={openAction?.interfaces || []} scope={openAction?.scope || current.slug} initialInput={openAction?.input} contextTitle={openAction?.title} onClose={() => setOpenAction(null)} onSuccess={() => { setOpenAction(null); void load(); }} />
    {siteOpen ? <SiteScreen visible onClose={() => { setSiteOpen(null); void load(); }} workspaceName={siteOpen.workspace} subdomain={siteOpen.scope} scope={siteOpen.scope} /> : null}
    {teamScope ? <WorkspaceTeam key={teamScope} scope={teamScope} name={active.find((workspace) => workspace.slug === teamScope)?.name || 'Workspace'} onClose={() => setTeamScope(null)} onChanged={() => void load()} /> : null}
  </View>;
}

function Row({ icon, title, detail, busy, selected, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail?: string; busy?: boolean; selected?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={selected === undefined ? undefined : { selected }} disabled={busy} onPress={onPress} style={styles.row}>
    <Ionicons name={icon} size={20} color={muted} style={styles.rowIcon} />
    <View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text>{detail ? <Text style={styles.rowDetail} numberOfLines={1}>{detail}</Text> : null}</View>
    {busy ? <ActivityIndicator color={blue} /> : <Ionicons name={selected ? 'checkmark' : 'chevron-forward'} size={18} color={selected ? blue : '#9CA5B3'} />}
  </Pressable>;
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return <View style={styles.empty}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDetail}>{detail}</Text></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' }, scroll: { flex: 1 },
  header: { minHeight: 58, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: ink, fontSize: 22, fontWeight: '700', flex: 1, marginLeft: 8 },
  headerActions: { flexDirection: 'row' }, iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  scopeRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: line, gap: 12 },
  scopeCopy: { flex: 1 }, scopeName: { color: ink, fontSize: 16, fontWeight: '700' }, scopeRole: { color: muted, fontSize: 12, marginTop: 4, textTransform: 'capitalize' },
  searchWrap: { height: 48, marginHorizontal: 24, marginTop: 16, marginBottom: 4, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#F5F7FA', flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchInput: { flex: 1, height: '100%', color: ink, fontSize: 15 },
  content: { paddingHorizontal: 24, paddingTop: 12 },
  groupHeading: { color: muted, fontSize: 12, fontWeight: '700', marginTop: 20, marginBottom: 4 },
  row: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: line },
  rowIcon: { width: 24 }, rowCopy: { flex: 1 }, rowTitle: { color: ink, fontSize: 16, fontWeight: '600', lineHeight: 21 },
  rowDetail: { color: muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  caption: { color: muted, fontSize: 13, marginTop: 8, marginBottom: 8 },
  notice: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: '#F5F7FA', marginBottom: 12, borderRadius: 8 },
  noticeText: { color: ink, fontSize: 13, flex: 1 }, loading: { marginTop: 48 },
  helper: { color: muted, fontSize: 12, lineHeight: 18, marginTop: 24 }, refreshing: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 10 },
  empty: { alignItems: 'center', paddingHorizontal: 18, paddingTop: 76 }, emptyTitle: { color: ink, fontSize: 17, fontWeight: '700' }, emptyDetail: { color: muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  chips: { gap: 8, paddingVertical: 8 }, chip: { paddingHorizontal: 14, minHeight: 35, borderRadius: 18, backgroundColor: '#F5F7FA', justifyContent: 'center' }, chipSelected: { backgroundColor: blue }, chipText: { color: ink, fontSize: 13 }, chipTextSelected: { color: '#FFFFFF' },
  moduleRow: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: line }, moduleCopy: { flex: 1, paddingVertical: 12 },
});
