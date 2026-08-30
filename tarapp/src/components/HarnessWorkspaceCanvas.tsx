import { BotBuilder } from '@/components/BotBuilder';
import { tar, type BotBuilderDraft, type HarnessDefinition, type HarnessHome, type HarnessRecord } from '@/lib/tar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

interface Props { scope: string; workspaceName: string; workspaceNames?: Record<string, string>; onOpenWorkspace: (workspaceId: string) => void; onOpenWorkspaceSwitcher: () => void; }
type Screen = 'home' | 'inbox' | 'data' | 'bots' | 'definitions' | 'workflows';
type WorkspaceSnapshot = { home: HarnessHome; defs: HarnessDefinition[]; records: HarnessRecord[]; inbox: { id: string; title?: string; workspace_id?: string; workspace_name?: string; data?: Record<string, unknown> }[] };
const workspaceCache = new Map<string, WorkspaceSnapshot>();
function slug(value: string, fallback: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || fallback; }
function recordTitle(record: HarnessRecord) { return record.title || String(record.data.name || record.data.title || record.id); }

export default function HarnessWorkspaceCanvas({ scope, workspaceName, workspaceNames = {}, onOpenWorkspace, onOpenWorkspaceSwitcher }: Props) {
  const insets = useSafeAreaInsets();
  const cached = workspaceCache.get(scope);
  const [screen, setScreen] = useState<Screen>('home'); const [home, setHome] = useState<HarnessHome | null>(cached?.home ?? null);
  const [defs, setDefs] = useState<HarnessDefinition[]>(cached?.defs ?? []); const [records, setRecords] = useState<HarnessRecord[]>(cached?.records ?? []);
  const [inbox, setInbox] = useState<{ id: string; title?: string; workspace_id?: string; workspace_name?: string; data?: Record<string, unknown> }[]>(cached?.inbox ?? []);
  const [loading, setLoading] = useState(!cached); const [error, setError] = useState(''); const [builder, setBuilder] = useState(false); const [newData, setNewData] = useState(false); const [name, setName] = useState(''); const [fields, setFields] = useState('');
  const canManage = home?.capabilities?.manageDefinitions === true && scope !== 'p'; const dataDefs = useMemo(() => defs.filter((def) => def.kind === 'data'), [defs]);
  const reload = useCallback(async () => { if (!workspaceCache.has(scope)) setLoading(true); setError(''); try { const [nextHome, nextDefs, nextRecords, nextInbox] = await Promise.all([tar.harness.home(scope), tar.harness.defs(scope), tar.harness.records(scope), tar.harness.inbox(scope)]); workspaceCache.set(scope, { home: nextHome, defs: nextDefs.defs, records: nextRecords.records, inbox: nextInbox.items }); setHome(nextHome); setDefs(nextDefs.defs); setRecords(nextRecords.records); setInbox(nextInbox.items); } catch (cause) { const message = cause instanceof Error ? cause.message : 'Could not load this workspace.'; if (/provision|prepar|not ready|409/i.test(message)) { setTimeout(() => void reload(), 2500); } else { setError(message); } } finally { setLoading(false); } }, [scope]);
  useEffect(() => { const timer = setTimeout(() => void reload(), 0); return () => clearTimeout(timer); }, [reload]);
  const start = async (card: { botId: string; workflowId: string; workspaceId?: string }) => { if (scope === 'p' && card.workspaceId) return onOpenWorkspace(card.workspaceId); try { await tar.harness.command(scope, { action: 'run.start', botId: card.botId, workflowId: card.workflowId }); Alert.alert('Started', 'This work is now in Work.'); await reload(); } catch (cause) { Alert.alert('Could not start', cause instanceof Error ? cause.message : 'Try again.'); } };
  const startInbox = async (item: { id: string; workspace_id?: string }) => { try { await tar.harness.completeInbox(scope, item.id); if (scope === 'p' && item.workspace_id) onOpenWorkspace(item.workspace_id); else await reload(); } catch (cause) { Alert.alert('Could not start', cause instanceof Error ? cause.message : 'Try again.'); } };
  const saveData = async () => { const clean = name.trim(); const columns = fields.split(',').map((value) => slug(value, '')).filter(Boolean); if (!clean || !columns.length) return Alert.alert('Add a name and at least one field.'); try { await tar.harness.saveDef(scope, { id: `data_${slug(clean, 'item')}`, kind: 'data', name: clean, body: { fields: columns, card: { kind: 'data' } } }); setNewData(false); setName(''); setFields(''); await reload(); } catch (cause) { Alert.alert('Could not save', cause instanceof Error ? cause.message : 'Try again.'); } };
  const createFromDraft = async (draft: BotBuilderDraft) => { for (const artifact of draft.artifacts) await tar.harness.saveDef(scope, { id: `data_${artifact.id}`, kind: 'data', name: artifact.name, body: { fields: artifact.fields, initialStatus: artifact.initialStatus, card: { kind: 'data' } } }); await tar.harness.saveDef(scope, { id: `bot_${slug(draft.name, 'bot')}`, kind: 'bot', name: draft.name, body: { purpose: draft.purpose, workflows: draft.workflows.map((workflow) => ({ ...workflow, steps: workflow.steps.map((step, index) => ({ id: step.id, title: step.title, mode: step.handler === 'agent' ? 'agentic' : 'deterministic', actions: step.handler === 'agent' ? ['skill.ai_help'] : ['database.record'], card: step.card ? { kind: index === 0 ? 'action' : step.card.type === 'report' ? 'report' : 'data', fields: step.card.fields } : undefined, instruction: step.instruction, allowed_actions: step.handler === 'agent' ? ['skill.ai_help'] : undefined, allowed_transitions: ['next'] })) })) } }); setBuilder(false); await reload(); };
  if (loading && !home) return <View style={styles.center}><ActivityIndicator color="#1a73e8" /></View>;
  return (
    <View style={styles.page}>
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.brandTouch} onPress={onOpenWorkspaceSwitcher}>
            <Text numberOfLines={1} style={styles.brand}>{workspaceName}</Text>
            <Ionicons name="chevron-down" size={16} color="#5f6368" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerDivider} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {(['home', 'inbox', 'data'] as Screen[]).map((item) => (
            <TouchableOpacity key={item} onPress={() => setScreen(item)} style={styles.tabButton}>
              <Text style={[styles.tab, screen === item && styles.active]}>
                {item === 'home' ? 'Work' : item[0].toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          {canManage && (
            <>
              <TouchableOpacity onPress={() => setScreen('bots')} style={styles.tabButton}>
                <Text style={[styles.tab, screen === 'bots' && styles.active]}>Bots</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setScreen('definitions')} style={styles.tabButton}>
                <Text style={[styles.tab, screen === 'definitions' && styles.active]}>Definitions</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setScreen('workflows')} style={styles.tabButton}>
                <Text style={[styles.tab, screen === 'workflows' && styles.active]}>Workflows</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 48 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {error ? <Pressable onPress={() => void reload()} style={styles.notice}><Text style={styles.noticeText}>{error} Tap to retry.</Text></Pressable> : null}
        {screen === 'home' && (
          <>
            <Text style={styles.heading}>Start work</Text>
            <Text style={styles.subheading}>Your next actions, based on your role.</Text>
            {home?.now?.length ? <Section title="In progress" cards={home.now} onStart={start} workspaceNames={workspaceNames} /> : null}
            {home?.actions?.length ? <Section title="Actions" cards={home.actions} onStart={start} workspaceNames={workspaceNames} /> : (!home?.now?.length && <Empty text="Nothing needs your attention." />)}
          </>
        )}
        {screen === 'inbox' && (
          <>
            <Text style={styles.heading}>Inbox</Text>
            <Text style={styles.subheading}>Work assigned to you appears here.</Text>
            {inbox.map((item) => (
              <TouchableOpacity key={item.id} style={styles.card} onPress={() => void startInbox(item)}>
                <Text style={styles.cardTitle}>{item.title || 'Work item'}</Text>
                <Text style={styles.cardDetail}>{scope === 'p' && item.workspace_id ? `${item.workspace_name || workspaceNames[item.workspace_id]} · Tap to start` : 'Tap to start'}</Text>
              </TouchableOpacity>
            ))}
            {!inbox.length && <Empty text="No open work." />}
          </>
        )}
        {screen === 'data' && (
          <>
            <Text style={styles.heading}>{scope === 'p' ? 'Saved data' : 'Data'}</Text>
            <Text style={styles.subheading}>{scope === 'p' ? 'Records you saved for yourself or offline use.' : 'Find the records you can access.'}</Text>
            {scope === 'p' ? records.map((record) => <Row key={record.id} title={recordTitle(record)} detail={record.type} />) : dataDefs.map((def) => (
              <Row
                key={def.id}
                title={def.name}
                detail={`${records.filter((record) => record.type === def.id || record.type === def.id.replace(/^data_/, '')).length} records`}
              />
            ))}
            {scope === 'p' && !records.length && <Empty text="No saved data." />}
            {scope !== 'p' && !dataDefs.length && <Empty text="No data definitions yet." />}
          </>
        )}
        {screen === 'bots' && canManage && (
          <>
            <Text style={styles.heading}>Bots</Text>
            <Text style={styles.subheading}>Bots own the work your team can run.</Text>
            <TouchableOpacity style={styles.primary} onPress={() => setBuilder(true)}>
              <Text style={styles.primaryText}>Create Bot with AI</Text>
            </TouchableOpacity>
            {defs.filter((def) => def.kind === 'bot').map((def) => <Row key={def.id} title={def.name} detail="Workflow definition" />)}
            {!defs.some((def) => def.kind === 'bot') && <Empty text="No Bots yet." />}
          </>
        )}
        {screen === 'definitions' && canManage && (
          <>
            <Text style={styles.heading}>Definitions</Text>
            <Text style={styles.subheading}>Define the Data your workspace keeps.</Text>
            <TouchableOpacity style={styles.primary} onPress={() => setNewData(true)}>
              <Text style={styles.primaryText}>Add data definition</Text>
            </TouchableOpacity>
            {dataDefs.map((def) => (
              <Row
                key={def.id}
                title={def.name}
                detail={`${Array.isArray(def.body.fields) ? def.body.fields.length : 0} fields`}
              />
            ))}
            {!dataDefs.length && <Empty text="No data definitions yet." />}
          </>
        )}
        {screen === 'workflows' && canManage && (
          <>
            <Text style={styles.heading}>Workflows</Text>
            <Text style={styles.subheading}>Ordered Steps inside each Bot.</Text>
            {defs.filter((def) => def.kind === 'bot').flatMap((bot) => {
              const workflows = Array.isArray(bot.body.workflows) ? bot.body.workflows as Array<{ id?: string; title?: string; steps?: Array<unknown> }> : [];
              return workflows.map((workflow, index) => <Row key={`${bot.id}:${workflow.id || index}`} title={workflow.title || bot.name} detail={`${Array.isArray(workflow.steps) ? workflow.steps.length : 0} Steps · ${bot.name}`} />);
            })}
            {!defs.some((def) => def.kind === 'bot' && Array.isArray(def.body.workflows) && def.body.workflows.length) && <Empty text="No Workflows yet." />}
          </>
        )}
      </ScrollView>
    <BotBuilder visible={builder} scope={scope} existingArtifacts={dataDefs.map((def) => ({ id: def.id.replace(/^data_/, ''), name: def.name, fields: Array.isArray(def.body.fields) ? def.body.fields.map(String) : [] }))} onClose={() => setBuilder(false)} onCreate={createFromDraft} />
      <Modal visible={newData} transparent animationType="fade">
        <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New data</Text>
            <TextInput autoFocus value={name} onChangeText={setName} placeholder="Name, for example Products" style={styles.input} />
            <TextInput value={fields} onChangeText={setFields} placeholder="Fields, separated by commas" style={styles.input} />
            <View style={styles.sheetActions}>
              <TouchableOpacity onPress={() => setNewData(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void saveData()}>
                <Text style={styles.save}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
function Section({ title, cards, onStart, workspaceNames }: { title: string; cards: { id: string; title: string; botId: string; workflowId: string; mode: string; workspaceId?: string }[]; onStart: (card: { botId: string; workflowId: string }) => void; workspaceNames: Record<string, string> }) { return <><Text style={styles.sectionTitle}>{title}</Text>{cards.map((card) => <TouchableOpacity key={card.id} style={styles.card} onPress={() => void onStart(card)}><Text style={styles.cardTitle}>{card.title}</Text><Text style={styles.cardDetail}>{card.workspaceId ? `${workspaceNames[card.workspaceId] || 'Workspace'} · Continue` : card.mode === 'agentic' ? 'AI-guided step' : 'Open action'}</Text></TouchableOpacity>)}</>; }
function Row({ title, detail }: { title: string; detail: string }) { return <View style={styles.row}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDetail}>{detail}</Text></View>; }
function Empty({ text }: { text: string }) { return <Text style={styles.empty}>{text}</Text>; }
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  headerContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  topRow: { minHeight: 48, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandTouch: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  brand: { fontSize: 20, fontWeight: '800', color: '#202124' },
  headerDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#eee', width: '100%' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 8, gap: 20, alignItems: 'center' },
  tabButton: { paddingVertical: 4 },
  tab: { fontSize: 15, fontWeight: '600', color: '#5f6368' },
  active: { color: '#1a73e8', fontWeight: '700' },
  content: { padding: 28 },
  heading: { fontSize: 34, lineHeight: 40, fontWeight: '700', color: '#202124', marginTop: 20 },
  subheading: { fontSize: 17, lineHeight: 25, color: '#6b7078', marginTop: 8, marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#202124', marginTop: 23, marginBottom: 10 },
  card: { borderWidth: 1, borderColor: '#e8eaed', borderRadius: 10, padding: 16, marginBottom: 10, backgroundColor: '#fff' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#202124' },
  cardDetail: { fontSize: 14, color: '#5f6368', marginTop: 5 },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  rowTitle: { fontSize: 17, fontWeight: '600', color: '#202124' },
  rowDetail: { fontSize: 14, color: '#70757a', marginTop: 3 },
  empty: { fontSize: 16, color: '#70757a', paddingVertical: 24 },
  primary: { backgroundColor: '#1a73e8', paddingHorizontal: 17, paddingVertical: 13, borderRadius: 6, alignSelf: 'flex-start', marginTop: 6 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondary: { paddingVertical: 15, alignSelf: 'flex-start' },
  secondaryText: { color: '#1a73e8', fontSize: 15, fontWeight: '700' },
  notice: { backgroundColor: '#fce8e6', padding: 12, borderRadius: 8 },
  noticeText: { color: '#a50e0e' },
  overlay: { flex: 1, backgroundColor: '#0005', justifyContent: 'center', paddingHorizontal: 24 },
  sheet: { backgroundColor: '#fff', borderRadius: 12, padding: 22 },
  sheetTitle: { fontSize: 22, fontWeight: '700', color: '#202124', marginBottom: 18 },
  input: { borderBottomWidth: 1, borderColor: '#dadce0', fontSize: 16, paddingVertical: 11, marginBottom: 14, color: '#202124' },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 25, marginTop: 10 },
  cancel: { color: '#5f6368', fontWeight: '700' },
  save: { color: '#1a73e8', fontWeight: '700' },
});
