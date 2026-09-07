import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createOperationKey, harness } from '@/lib/harness';
import type { ActionInterfaceProps } from './types';

export default function FlowInterface(props: ActionInterfaceProps) {
  const insets = useSafeAreaInsets(); const [saving, setSaving] = useState(false); const [operationKey] = useState(() => createOperationKey(`flow:${String(props.initialInput?.flowId || '')}`));
  const start = async () => { setSaving(true); try { const result = await harness.executeAction(props.scope, props.action.id, props.initialInput || {}, operationKey); props.onSuccess(result); } catch (cause) { Alert.alert('Could not start Flow', cause instanceof Error ? cause.message : 'Try again.'); } finally { setSaving(false); } };
  return <Modal visible={props.visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={props.onClose}><View style={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom }]}><View style={styles.header}><TouchableOpacity onPress={props.onClose}><Text style={styles.close}>Close</Text></TouchableOpacity></View><View style={styles.content}><Text style={styles.eyebrow}>FLOW</Text><Text style={styles.title}>{props.contextTitle || 'Start Flow'}</Text><Text style={styles.body}>Tar will save progress after every Action. If another person is needed, their work appears in the Inbox.</Text><TouchableOpacity disabled={saving} style={styles.start} onPress={() => void start()}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.startText}>{props.contract.submitLabel} Flow</Text>}</TouchableOpacity></View></View></Modal>;
}

const styles = StyleSheet.create({ page:{flex:1,backgroundColor:'#fff'},header:{height:56,paddingHorizontal:24,justifyContent:'center',alignItems:'flex-end'},close:{fontSize:15,fontWeight:'700',color:'#68758c'},content:{flex:1,justifyContent:'center',padding:32},eyebrow:{fontSize:12,fontWeight:'800',letterSpacing:1.2,color:'#68758c'},title:{fontSize:32,lineHeight:38,fontWeight:'800',color:'#172033',marginTop:10},body:{fontSize:16,lineHeight:24,color:'#68758c',marginTop:12,marginBottom:28},start:{height:54,borderRadius:18,backgroundColor:'#172033',alignItems:'center',justifyContent:'center'},startText:{fontSize:16,fontWeight:'800',color:'#fff'} });
