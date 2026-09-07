import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createOperationKey, harness } from '@/lib/harness';
import type { ActionInterfaceProps } from './types';

function initialValues(props: ActionInterfaceProps): Record<string, string> {
  return Object.fromEntries(props.action.fields.map((field) => [field.key, String(props.initialInput?.[field.key] ?? field.defaultValue ?? '')]));
}

export default function ActionFormInterface(props: ActionInterfaceProps) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(props));
  const [saving, setSaving] = useState(false);
  const [operationKey] = useState(() => createOperationKey(props.action.id));
  const submit = async () => {
    const missing = props.action.fields.find((field) => field.required && !values[field.key]?.trim());
    if (missing) { Alert.alert('Required information', `Enter ${missing.label.toLowerCase()}.`); return; }
    setSaving(true);
    try {
      const input = Object.fromEntries(props.action.fields.flatMap((field) => { const raw = values[field.key]?.trim(); return raw ? [[field.key, field.kind === 'number' ? Number(raw) : raw]] : []; }));
      const result = await harness.executeAction(props.scope, props.action.id, input, operationKey);
      props.onSuccess(result);
    } catch (cause) { Alert.alert('Could not save', cause instanceof Error ? cause.message : 'Try again.'); }
    finally { setSaving(false); }
  };
  return <Modal visible={props.visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={props.onClose}>
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top }]}><TouchableOpacity style={styles.iconButton} onPress={props.onClose} accessibilityLabel="Close"><Ionicons name="close" size={26} color="#172033" /></TouchableOpacity><View style={styles.headerCopy}><Text numberOfLines={1} style={styles.title}>{props.contextTitle || props.action.title}</Text><Text numberOfLines={1} style={styles.description}>{props.action.description}</Text></View><TouchableOpacity disabled={saving} style={styles.saveButton} onPress={() => void submit()} accessibilityLabel={props.contract.submitLabel}>{saving ? <ActivityIndicator size="small" color="#172033" /> : <Text style={styles.saveText}>{props.contract.submitLabel}</Text>}</TouchableOpacity></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 32 }]}>{props.action.fields.filter((field) => !field.hidden).map((field, index) => <View key={field.key} style={styles.field}><Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text><TextInput autoFocus={index === 0} editable={!saving} value={values[field.key] || ''} onChangeText={(value) => setValues((current) => ({ ...current, [field.key]: value }))} keyboardType={field.kind === 'email' ? 'email-address' : field.kind === 'number' ? 'numeric' : 'default'} autoCapitalize={field.kind === 'email' ? 'none' : 'sentences'} multiline={field.kind === 'textarea'} style={[styles.input, field.kind === 'textarea' && styles.textarea]} /></View>)}</ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({ page:{flex:1,backgroundColor:'#fff'},header:{minHeight:76,paddingHorizontal:12,paddingBottom:12,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#e3e7ef',flexDirection:'row',alignItems:'center',gap:8},iconButton:{width:44,height:44,alignItems:'center',justifyContent:'center'},headerCopy:{flex:1},title:{fontSize:18,fontWeight:'800',color:'#172033'},description:{fontSize:12,color:'#68758c',marginTop:2},saveButton:{minWidth:64,height:44,alignItems:'center',justifyContent:'center'},saveText:{fontSize:15,fontWeight:'800',color:'#172033'},form:{padding:24,gap:20},field:{gap:7},label:{fontSize:13,fontWeight:'700',color:'#68758c'},input:{minHeight:52,borderWidth:1,borderColor:'#e3e7ef',borderRadius:12,paddingHorizontal:14,fontSize:16,color:'#172033',backgroundColor:'#f7f8fc'},textarea:{minHeight:120,paddingTop:14,textAlignVertical:'top'} });
