import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionInterfaceHost from '@/action-interfaces/ActionInterfaceHost';
import BotDirectory from '@/components/BotDirectory';
import { harness, type HarnessAction, type HarnessCanvasCard, type HarnessInterfaceContract, type HarnessRecord } from '@/lib/harness';

type Tab = 'canvas' | 'inbox' | 'records';
interface Props { scope: string; workspaceName: string; role: 'owner' | 'admin' | 'member' | 'guest'; onOpenWorkspaceSwitcher: () => void; }
interface OpenAction { action: HarnessAction; input?: Record<string, unknown>; title?: string; }
const titleCase = (value: string) => value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function HarnessWorkspaceCanvas({ scope, workspaceName, role, onOpenWorkspaceSwitcher }: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('canvas');
  const [cards, setCards] = useState<HarnessCanvasCard[]>([]);
  const [records, setRecords] = useState<HarnessRecord[]>([]);
  const [tasks, setTasks] = useState<HarnessRecord[]>([]);
  const [actions, setActions] = useState<HarnessAction[]>([]);
  const [interfaces, setInterfaces] = useState<HarnessInterfaceContract[]>([]);
  const [openAction, setOpenAction] = useState<OpenAction | null>(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setError('');
    try {
      const [nextCanvas, nextRecords, nextInbox, registry] = await Promise.all([harness.canvas(scope), harness.records(scope), harness.inbox(scope), harness.registry()]);
      setCards(nextCanvas.cards); setRecords(nextRecords.records); setTasks(nextInbox.tasks); setActions(registry.actions); setInterfaces(registry.interfaces);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load workspace.'); }
    finally { setLoading(false); }
  }, [scope]);

  useEffect(() => { const timer = setTimeout(() => { void reload(); }, 0); return () => clearTimeout(timer); }, [reload]);
  const retryWorkspace = async () => { setLoading(true); await reload(); };
  const open = (actionId: string, input?: Record<string, unknown>, title?: string) => { const action = actions.find((item) => item.id === actionId); if (!action) { Alert.alert('Action unavailable', 'This Action is not registered for the workspace.'); return; } setOpenAction({ action, input, title }); };
  const openCard = (card: HarnessCanvasCard) => { if (card.kind === 'action') open(card.actionId, card.initialInput, card.title); else if (card.kind === 'flow') open(card.actionId || 'flow.start', card.initialInput || { flowId: card.flowId }, card.title); };

  return <View style={styles.page}>
    <View style={[styles.header, { paddingTop: insets.top }]}><TouchableOpacity onPress={onOpenWorkspaceSwitcher} style={styles.workspace}><Text numberOfLines={1} style={styles.workspaceName}>{workspaceName}</Text><Ionicons name="chevron-down" size={16} color="#68758c" /></TouchableOpacity><View style={styles.tabs}>{(['canvas', 'inbox', 'records'] as Tab[]).map((item) => <TouchableOpacity key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabSelected]}><Text style={[styles.tabText, tab === item && styles.tabActive]}>{titleCase(item)}</Text></TouchableOpacity>)}</View></View>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>{error ? <Pressable style={styles.error} onPress={() => void retryWorkspace()}><Text style={styles.errorText}>{error} Tap to retry.</Text></Pressable> : null}{loading ? <View style={styles.center}><ActivityIndicator color="#172033" /></View> : <>
      {tab === 'canvas' ? <Canvas cards={cards} onOpen={openCard} onOpenDirectory={() => setDirectoryOpen(true)} /> : null}
      {tab === 'inbox' ? <><Text style={styles.heading}>Inbox</Text><Text style={styles.subheading}>Your human Actions, in one place.</Text>{tasks.length ? tasks.map((task) => <TaskRow key={task.id} task={task} onOpen={() => open('task.complete', { taskId: task.id }, task.title)} />) : <Empty text="Nothing waiting." />}</> : null}
      {tab === 'records' ? <><Text style={styles.heading}>Records</Text><Text style={styles.subheading}>Shared information created by your work.</Text>{records.length ? records.map((record) => <View key={record.id} style={styles.record}><View style={styles.recordCopy}><Text style={styles.recordTitle}>{record.title}</Text><Text style={styles.recordDetail}>{titleCase(record.type)} · {titleCase(record.state)}</Text></View></View>) : <Empty text="No records yet." />}</> : null}
    </>}</ScrollView>
    <ActionInterfaceHost action={openAction?.action || null} contracts={interfaces} scope={scope} initialInput={openAction?.input} contextTitle={openAction?.title} onClose={() => setOpenAction(null)} onSuccess={() => { setOpenAction(null); void reload(); }} />
    <BotDirectory visible={directoryOpen} scope={scope} canInstall={role === 'owner' || role === 'admin'} onClose={() => setDirectoryOpen(false)} onChanged={() => { void reload(); }} onCreateCustom={(botId, botTitle) => { setDirectoryOpen(false); open('flow.publish', { botId }, botTitle); }} />
  </View>;
}

function Canvas({ cards, onOpen, onOpenDirectory }: { cards: HarnessCanvasCard[]; onOpen: (card: HarnessCanvasCard) => void; onOpenDirectory: () => void }) {
  const data = cards.filter((card) => card.kind === 'data');
  const work = cards.filter((card) => card.kind !== 'data');
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    sell: 'bag-outline', orders: 'receipt-outline', stock: 'cube-outline',
    customers: 'people-outline', register: 'cash-outline',
  };
  return <>
    <View style={styles.canvasToolbar}>
      <Text style={styles.overviewTitle}>Overview</Text>
      <TouchableOpacity style={styles.directoryButton} onPress={onOpenDirectory} accessibilityLabel="Add Bot"><Ionicons name="add" size={17} color="#172033" /><Text style={styles.directoryText}>Add</Text></TouchableOpacity>
    </View>
    <View style={styles.metricGrid}>{data.map((card) => <View key={card.id} accessibilityLabel={card.title + ': ' + card.value + (card.caption ? '. ' + card.caption : '')} style={[styles.metric, card.id.startsWith('pos-') && styles.posMetric]}>
      <Text numberOfLines={1} style={styles.metricTitle}>{card.title}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, card.id.startsWith('pos-') && styles.posMetricValue]}>{card.value}</Text>
    </View>)}</View>
    {work.map((card) => <TouchableOpacity key={card.id} style={styles.workCard} onPress={() => onOpen(card)} accessibilityLabel={card.title}>
      <View style={styles.workIcon}><Ionicons name={icons[String(card.initialInput?.section)] || (card.kind === 'flow' ? 'git-branch-outline' : 'flash-outline')} size={21} color="#536174" /></View>
      <Text style={styles.canvasRowTitle}>{card.title}</Text>
      <Ionicons name="chevron-forward" size={17} color="#9aa3b1" />
    </TouchableOpacity>)}
  </>;
}

function TaskRow({ task, onOpen }: { task: HarnessRecord; onOpen: () => void }) { return <TouchableOpacity onPress={onOpen} style={styles.task}><View style={styles.recordCopy}><Text style={styles.recordTitle}>{task.title}</Text><Text style={styles.recordDetail}>Assigned to you · Open</Text></View><View style={styles.review}><Text style={styles.reviewText}>Review</Text></View></TouchableOpacity>; }
function Empty({ text }: { text: string }) { return <Text style={styles.empty}>{text}</Text>; }

const styles = StyleSheet.create({
  canvasToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  overviewTitle: { fontSize: 15, fontWeight: '600', color: '#68758c' },
  canvasRowTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#172033' },
  posMetric: { minHeight: 76, flexBasis: '27%', padding: 10, borderRadius: 10 },
  posMetricValue: { fontSize: 21 },
  page:{flex:1,backgroundColor:'#fff'},header:{borderBottomWidth:1,borderColor:'#e3e7ef',backgroundColor:'#fff'},workspace:{height:52,paddingHorizontal:24,flexDirection:'row',gap:6,alignItems:'center'},workspaceName:{flexShrink:1,fontSize:20,fontWeight:'800',color:'#172033'},tabs:{flexDirection:'row',paddingHorizontal:24,gap:24},tab:{paddingVertical:12,borderBottomWidth:2,borderColor:'transparent'},tabSelected:{borderColor:'#172033'},tabText:{fontSize:14,fontWeight:'600',color:'#68758c'},tabActive:{color:'#172033'},content:{padding:20},center:{minHeight:180,justifyContent:'center',alignItems:'center'},canvasTitleRow:{flexDirection:'row',alignItems:'flex-start',gap:12},directoryButton:{height:38,paddingHorizontal:13,borderRadius:19,backgroundColor:'#f1f3f8',flexDirection:'row',alignItems:'center',gap:4},directoryText:{fontSize:13,fontWeight:'800',color:'#172033'},heading:{fontSize:25,fontWeight:'800',color:'#172033'},subheading:{fontSize:14,lineHeight:20,color:'#68758c',marginTop:4,marginBottom:20},metricGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16},metric:{flexGrow:1,flexBasis:'45%',minHeight:132,borderWidth:1,borderColor:'#e3e7ef',borderRadius:18,padding:16,justifyContent:'space-between',backgroundColor:'#fff'},metricTitle:{fontSize:13,fontWeight:'700',color:'#68758c'},metricValue:{fontSize:34,fontWeight:'800',color:'#172033'},metricCaption:{fontSize:11,lineHeight:15,color:'#7b879a'},sectionLabel:{fontSize:11,fontWeight:'800',letterSpacing:1.2,color:'#7b879a',marginBottom:8},workCard:{minHeight:56,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#e3e7ef',flexDirection:'row',alignItems:'center',gap:12},workIcon:{width:28,height:36,alignItems:'center',justifyContent:'center'},flowIcon:{backgroundColor:'#e8f7f0'},task:{minHeight:72,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#e3e7ef',flexDirection:'row',alignItems:'center',gap:14},record:{minHeight:64,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#e3e7ef',justifyContent:'center'},recordCopy:{flex:1},recordTitle:{fontSize:16,fontWeight:'700',color:'#172033'},recordDetail:{fontSize:13,lineHeight:18,color:'#68758c',marginTop:3},review:{paddingHorizontal:12,paddingVertical:7,borderRadius:14,backgroundColor:'#f1f3f8'},reviewText:{fontSize:12,fontWeight:'800',color:'#172033'},empty:{color:'#68758c',fontSize:16,paddingVertical:18},error:{backgroundColor:'#fff1f0',borderRadius:12,padding:12,marginBottom:14},errorText:{color:'#b42318'},
});
