import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TarLogo } from '@/components/TarLogo';
import { createOperationKey, harness, type HarnessDirectoryBot } from '@/lib/harness';

const BOT_COLORS: Record<string, { color: string; background: string }> = {
  pos: { color: '#2463A7', background: '#E7F1FC' },
  sales: { color: '#6846C7', background: '#EEE9FF' },
  team: { color: '#13795B', background: '#E3F6EE' },
  operations: { color: '#B45309', background: '#FFF0DA' },
};
const defaultBotColor = { color: '#2463A7', background: '#E7F1FC' };

interface Props {
  visible: boolean;
  embedded?: boolean;
  scope: string;
  canInstall: boolean;
  onClose: () => void;
  onChanged: () => void;
  onCreateCustom: (botId: string, botTitle: string) => void;
}

export default function BotDirectory({ visible, embedded = false, scope, canInstall, onClose, onChanged, onCreateCustom }: Props) {
  const insets = useSafeAreaInsets();
  const [bots, setBots] = useState<HarnessDirectoryBot[]>([]);
  const [selected, setSelected] = useState<HarnessDirectoryBot | null>(null);
  const [flowIds, setFlowIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [changing, setChanging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const result = await harness.directory(scope); setBots(result.bots); }
    catch (cause) { Alert.alert('Could not open Bots', cause instanceof Error ? cause.message : 'Try again.'); }
    finally { setLoading(false); }
  }, [scope]);

  useEffect(() => { if (!visible) return; const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load, visible]);

  const openBot = (bot: HarnessDirectoryBot) => {
    const templates = bot.flows.filter((flow) => flow.template);
    const installed = templates.filter((flow) => flow.installed).map((flow) => flow.id);
    setFlowIds(installed.length ? installed : templates.map((flow) => flow.id));
    setSelected(bot);
  };

  const toggleFlow = (id: string) => setFlowIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  const saveBot = async () => {
    if (!selected || changing) return;
    if (!flowIds.length) { Alert.alert('Choose a Flow', 'A Bot needs at least one Flow.'); return; }
    setChanging(true);
    try {
      await harness.installDirectoryBot(scope, selected.id, flowIds, createOperationKey(`bot:${selected.id}:save`));
      await load(); setSelected(null); onChanged();
    } catch (cause) { Alert.alert('Could not save Bot', cause instanceof Error ? cause.message : 'Try again.'); }
    finally { setChanging(false); }
  };

  const removeBot = async () => {
    if (!selected || changing) return;
    setChanging(true);
    try {
      await harness.removeDirectoryBot(scope, selected.id, createOperationKey(`bot:${selected.id}:remove`));
      await load(); setSelected(null); onChanged();
    } catch (cause) { Alert.alert('Could not remove Bot', cause instanceof Error ? cause.message : 'Try again.'); }
    finally { setChanging(false); }
  };

  const templateFlows = selected?.flows.filter((flow) => flow.template) || [];
  const customFlows = selected?.flows.filter((flow) => !flow.template) || [];

  const directoryList = <>{loading && !bots.length ? <View style={styles.center}><ActivityIndicator color="#172033" /></View> : <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}>{bots.map((bot) => <TouchableOpacity key={bot.id} style={styles.row} onPress={() => openBot(bot)} accessibilityLabel={`Open ${bot.title}`}><BotThumbnail botId={bot.id} /><View style={styles.rowCopy}><Text numberOfLines={1} style={styles.rowTitle}>{bot.title}</Text><Text numberOfLines={1} style={styles.rowMeta}>{bot.category}</Text></View>{bot.installed ? <Ionicons name="checkmark-circle" size={21} color="#18865b" /> : null}</TouchableOpacity>)}</ScrollView>}
      <Modal visible={Boolean(selected)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        <View style={[styles.page, { paddingTop: insets.top }]}><View style={styles.detailHeader}><TouchableOpacity style={styles.iconButton} onPress={() => setSelected(null)} accessibilityLabel="Back to Bots"><Ionicons name="chevron-back" size={25} color="#172033" /></TouchableOpacity><Text style={styles.detailHeaderTitle}>{selected?.title}</Text><View style={styles.iconButton} /></View>
          <ScrollView contentContainerStyle={[styles.detail, { paddingBottom: insets.bottom + 28 }]}> 
            {selected ? <View style={styles.botSummary}><BotThumbnail botId={selected.id} /><Text style={styles.summaryText}>{selected.description}</Text></View> : null}
            <Text style={styles.label}>Flows</Text>
            {templateFlows.map((flow) => { const active = flowIds.includes(flow.id); return <TouchableOpacity key={flow.id} disabled={!canInstall} style={styles.flowRow} onPress={() => toggleFlow(flow.id)}><View style={[styles.check, active && styles.checkActive]}>{active ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}</View><View style={styles.rowCopy}><Text style={styles.flowTitle}>{flow.title}</Text><Text style={styles.steps}>{flow.actions.length} {flow.actions.length === 1 ? 'Action' : 'Actions'}</Text></View></TouchableOpacity>; })}
            {customFlows.map((flow) => <View key={flow.id} style={styles.flowRow}><View style={styles.customIcon}><Ionicons name="git-branch-outline" size={15} color="#172033" /></View><View style={styles.rowCopy}><Text style={styles.flowTitle}>{flow.title}</Text><Text style={styles.steps}>Custom Flow</Text></View></View>)}
            {canInstall ? <>{selected?.installed ? <TouchableOpacity style={styles.newFlow} onPress={() => { const bot = selected; setSelected(null); onCreateCustom(bot.id, bot.title); }}><Ionicons name="add" size={18} color="#68758c" /><Text style={styles.newFlowText}>New Flow</Text></TouchableOpacity> : null}<TouchableOpacity disabled={changing} style={styles.primary} onPress={() => void saveBot()}>{changing ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{selected?.installed ? 'Save' : 'Add Bot'}</Text>}</TouchableOpacity>{selected?.installed ? <TouchableOpacity disabled={changing} style={styles.remove} onPress={() => void removeBot()}><Text style={styles.removeText}>Remove Bot</Text></TouchableOpacity> : null}</> : null}
          </ScrollView>
        </View>
      </Modal></>;
  if (embedded) return <View style={styles.embedded}>{directoryList}</View>;
  return <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}><View style={[styles.page, { paddingTop: insets.top }]}><View style={styles.header}><TouchableOpacity style={styles.iconButton} onPress={onClose} accessibilityLabel="Back"><Ionicons name="chevron-back" size={25} color="#172033" /></TouchableOpacity><Text style={styles.title}>Bots</Text><View style={styles.iconButton} /></View>{directoryList}</View></Modal>;
}

function BotThumbnail({ botId }: { botId: string }) {
  const colors = BOT_COLORS[botId] || defaultBotColor;
  return <TarLogo size={23} color={colors.color} bgColor="#fff" />;
}

const styles = StyleSheet.create({
  page:{flex:1,backgroundColor:'#fff'},
  embedded:{flex:1},
  header:{height:56,paddingHorizontal:8,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#e3e7ef',flexDirection:'row',alignItems:'center'},
  iconButton:{width:44,height:44,alignItems:'center',justifyContent:'center'},
  title:{flex:1,textAlign:'center',fontSize:18,fontWeight:'800',color:'#172033'},
  center:{flex:1,alignItems:'center',justifyContent:'center'},
  list:{paddingHorizontal:20},
  row:{height:64,flexDirection:'row',alignItems:'center',gap:11,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#e3e7ef'},
  rowCopy:{flex:1,minWidth:0},
  rowTitle:{fontSize:15,fontWeight:'700',color:'#172033'},
  rowMeta:{fontSize:11,color:'#7b879a',marginTop:2},
  detailHeader:{height:56,paddingHorizontal:8,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#e3e7ef',flexDirection:'row',alignItems:'center'},
  detailHeaderTitle:{flex:1,textAlign:'center',fontSize:17,fontWeight:'800',color:'#172033'},
  detail:{paddingHorizontal:24,paddingTop:20},
  botSummary:{flexDirection:'row',alignItems:'center',gap:12},
  summaryText:{flex:1,fontSize:13,lineHeight:19,color:'#68758c'},
  label:{fontSize:13,fontWeight:'800',color:'#172033',marginTop:25,marginBottom:4},
  flowRow:{height:62,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#e3e7ef'},
  check:{width:22,height:22,borderRadius:7,borderWidth:1.5,borderColor:'#c7ced9',alignItems:'center',justifyContent:'center'},
  checkActive:{backgroundColor:'#172033',borderColor:'#172033'},
  customIcon:{width:22,height:22,borderRadius:7,backgroundColor:'#e8f7f0',alignItems:'center',justifyContent:'center'},
  flowTitle:{fontSize:14,fontWeight:'700',color:'#172033'},
  steps:{fontSize:11,color:'#7b879a',marginTop:2},
  newFlow:{height:46,flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#e3e7ef'},
  newFlowText:{fontSize:13,fontWeight:'700',color:'#68758c'},
  primary:{height:46,borderRadius:13,backgroundColor:'#172033',alignItems:'center',justifyContent:'center',marginTop:20},
  primaryText:{fontSize:14,fontWeight:'800',color:'#fff'},
  remove:{height:42,alignItems:'center',justifyContent:'center'},
  removeText:{fontSize:12,fontWeight:'700',color:'#b42318'},
});
