import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createOperationKey, harness } from '@/lib/harness';
import type { ActionInterfaceProps } from './types';

export default function ConfirmationInterface(props: ActionInterfaceProps) {
  const [saving, setSaving] = useState(false); const [operationKey] = useState(() => createOperationKey(props.action.id));
  const submit = async () => { setSaving(true); try { const result = await harness.executeAction(props.scope, props.action.id, props.initialInput || {}, operationKey); props.onSuccess(result); } catch (cause) { Alert.alert('Could not complete', cause instanceof Error ? cause.message : 'Try again.'); } finally { setSaving(false); } };
  return <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}><View style={styles.backdrop}><View style={styles.sheet}><Text style={styles.eyebrow}>{props.action.type === 'human' ? 'HUMAN ACTION' : 'ACTION'}</Text><Text style={styles.title}>{props.contextTitle || props.action.title}</Text><Text style={styles.body}>{props.action.description}</Text><View style={styles.actions}><TouchableOpacity disabled={saving} onPress={props.onClose}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={saving} style={styles.confirm} onPress={() => void submit()}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>{props.contract.submitLabel}</Text>}</TouchableOpacity></View></View></View></Modal>;
}

const styles = StyleSheet.create({ backdrop:{flex:1,justifyContent:'center',padding:24,backgroundColor:'#0006'},sheet:{backgroundColor:'#fff',borderRadius:18,padding:24},eyebrow:{fontSize:11,fontWeight:'800',letterSpacing:1,color:'#68758c'},title:{fontSize:23,fontWeight:'800',color:'#172033',marginTop:8},body:{fontSize:15,lineHeight:22,color:'#68758c',marginTop:8},actions:{marginTop:24,flexDirection:'row',justifyContent:'flex-end',alignItems:'center',gap:18},cancel:{fontSize:15,fontWeight:'700',color:'#68758c'},confirm:{minWidth:108,height:46,borderRadius:14,backgroundColor:'#172033',alignItems:'center',justifyContent:'center'},confirmText:{fontSize:15,fontWeight:'800',color:'#fff'} });
