import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createOperationKey, harness, type HarnessActionField, type HarnessRecord } from '@/lib/harness';
import type { ActionInterfaceProps } from './types';

function initialValues(props: ActionInterfaceProps): Record<string, string> {
  return Object.fromEntries(props.action.fields.map((field) => [field.key, String(props.initialInput?.[field.key] ?? field.defaultValue ?? '')]));
}

export default function ActionFormInterface(props: ActionInterfaceProps) {
  if (!props.visible) return null;
  return <ActionForm {...props} />;
}

function ActionForm(props: ActionInterfaceProps) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(props));
  const [records, setRecords] = useState<HarnessRecord[]>([]);
  const [picker, setPicker] = useState<HarnessActionField | null>(null);
  const [saving, setSaving] = useState(false);
  const [operationKey] = useState(() => createOperationKey(props.action.id));
  const recordTypes = useMemo(
    () => [...new Set(props.action.fields.filter((field) => field.kind === 'record').map((field) => field.recordType || ''))],
    [props.action.fields],
  );
  useEffect(() => {
    if (!recordTypes.length) return;
    let current = true;
    void Promise.all(recordTypes.map((type) => harness.records(props.scope, type || undefined)))
      .then((results) => { if (current) setRecords(results.flatMap((result) => result.records)); })
      .catch(() => { if (current) setRecords([]); });
    return () => { current = false; };
  }, [props.scope, recordTypes]);
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
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 32 }]}>{props.action.fields.filter((field) => !field.hidden).map((field, index) => <View key={field.key} style={styles.field}><Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text>{field.kind === 'record' ? <TouchableOpacity disabled={saving} onPress={() => setPicker(field)} style={styles.input}><Text numberOfLines={1} style={[styles.recordValue, !values[field.key] && styles.placeholder]}>{records.find((record) => record.id === values[field.key])?.title || 'Choose a record'}</Text></TouchableOpacity> : <TextInput autoFocus={index === 0} editable={!saving} value={values[field.key] || ''} onChangeText={(value) => setValues((current) => ({ ...current, [field.key]: value }))} keyboardType={field.kind === 'email' ? 'email-address' : field.kind === 'number' ? 'numeric' : 'default'} autoCapitalize={field.kind === 'email' ? 'none' : 'sentences'} multiline={field.kind === 'textarea'} style={[styles.input, field.kind === 'textarea' && styles.textarea]} />}</View>)}</ScrollView>
      <Modal visible={Boolean(picker)} transparent animationType="slide" onRequestClose={() => setPicker(null)}><View style={styles.pickerBackdrop}><View style={[styles.picker, { paddingBottom: insets.bottom + 16 }]}><Text style={styles.pickerTitle}>{picker?.label || 'Choose a record'}</Text><ScrollView>{records.filter((record) => !picker?.recordType || record.type === picker.recordType).map((record) => <TouchableOpacity key={record.id} style={styles.pickerRow} onPress={() => { if (picker) setValues((current) => ({ ...current, [picker.key]: record.id })); setPicker(null); }}><Text style={styles.pickerName}>{record.title}</Text><Text style={styles.pickerType}>{record.type}</Text></TouchableOpacity>)}</ScrollView><TouchableOpacity onPress={() => setPicker(null)} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity></View></View></Modal>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({ page:{flex:1,backgroundColor:'#fff'},header:{minHeight:76,paddingHorizontal:12,paddingBottom:12,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#e3e7ef',flexDirection:'row',alignItems:'center',gap:8},iconButton:{width:44,height:44,alignItems:'center',justifyContent:'center'},headerCopy:{flex:1},title:{fontSize:18,fontWeight:'800',color:'#172033'},description:{fontSize:12,color:'#68758c',marginTop:2},saveButton:{minWidth:64,height:44,alignItems:'center',justifyContent:'center'},saveText:{fontSize:15,fontWeight:'800',color:'#172033'},form:{padding:24,gap:20},field:{gap:7},label:{fontSize:13,fontWeight:'700',color:'#68758c'},input:{minHeight:52,borderWidth:1,borderColor:'#e3e7ef',borderRadius:12,paddingHorizontal:14,fontSize:16,color:'#172033',backgroundColor:'#f7f8fc',justifyContent:'center'},recordValue:{fontSize:16,color:'#172033'},placeholder:{color:'#858c9c'},textarea:{minHeight:120,paddingTop:14,textAlignVertical:'top'},pickerBackdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'#0005'},picker:{maxHeight:'75%',backgroundColor:'#fff',paddingTop:22,borderTopLeftRadius:20,borderTopRightRadius:20},pickerTitle:{fontSize:18,fontWeight:'800',color:'#172033',paddingHorizontal:22,paddingBottom:10},pickerRow:{minHeight:58,paddingHorizontal:22,justifyContent:'center',borderTopWidth:StyleSheet.hairlineWidth,borderColor:'#e3e7ef'},pickerName:{fontSize:15,fontWeight:'700',color:'#172033'},pickerType:{fontSize:12,color:'#68758c',marginTop:2},cancel:{height:48,alignItems:'flex-end',justifyContent:'center',paddingHorizontal:22},cancelText:{fontSize:15,fontWeight:'700',color:'#68758c'} });
