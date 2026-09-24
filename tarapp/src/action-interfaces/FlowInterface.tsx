import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createOperationKey, harness, type HarnessAction, type HarnessFlowRun } from '@/lib/harness';
import type { ActionInterfaceProps } from './types';

type Step = { id: string; auto?: boolean };
const text = (value: unknown) => typeof value === 'string' ? value : '';

export default function FlowInterface(props: ActionInterfaceProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [run, setRun] = useState<HarnessFlowRun | null>(null);
  const [actions, setActions] = useState<HarnessAction[]>([]);
  const [form, setForm] = useState<{ key: string; values: Record<string, string> }>({ key: '', values: {} });
  const [loadError, setLoadError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const stepAttempt = useRef<{ body: string; key: string } | null>(null);
  const [startKey] = useState(() => createOperationKey(`flow.start:${String(props.initialInput?.flowId || '')}`));

  useEffect(() => {
    if (!props.visible) return;
    let current = true;
    const runId = props.initialInput?.runId;
    const timer = setTimeout(() => {
      setLoadError('');
      if (typeof runId !== 'string') { setRun(null); setActions([]); return; }
      setRun(null);
      setLoading(true);
      void Promise.all([harness.flowRun(props.scope, runId), harness.workspaceRegistry(props.scope)])
        .then(([saved, registry]) => { if (current) { setRun(saved.run); setActions(registry.actions); } })
        .catch((cause) => { if (current) setLoadError(cause instanceof Error ? cause.message : 'Try again.'); })
        .finally(() => { if (current) setLoading(false); });
    }, 0);
    return () => { current = false; clearTimeout(timer); };
  }, [props.initialInput?.flowId, props.initialInput?.runId, props.scope, props.visible, refresh]);

  const steps = useMemo<Step[]>(() => {
    const raw = run?.context?.actions;
    return Array.isArray(raw) ? raw.filter((item): item is Step => Boolean(item && typeof item === 'object' && typeof (item as Step).id === 'string')) : [];
  }, [run?.context]);
  const step = run?.step ?? Number(run?.context?.step || 0);
  const currentAction = actions.find((item) => item.id === run?.actionId) || null;
  const formKey = `${run?.id || ''}:${step}:${currentAction?.id || ''}`;
  const values = form.key === formKey ? form.values : Object.fromEntries(currentAction?.fields.map((field) => [field.key, String(field.defaultValue ?? '')]) || []);
  const automatic = run?.state === 'ready' && steps[step]?.auto === true;
  const bookName = props.contextTitle || 'Flow Book';

  useEffect(() => {
    if (!props.visible || !run?.id || !automatic) return;
    let active = true;
    const timer = setInterval(() => {
      void harness.flowRun(props.scope, run.id).then(({ run: next }) => { if (active) setRun(next); }).catch(() => undefined);
    }, 2000);
    return () => { active = false; clearInterval(timer); };
  }, [automatic, props.scope, props.visible, run?.id]);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const result = await harness.executeAction<{ run: HarnessFlowRun }>(props.scope, props.action.id, props.initialInput || {}, startKey);
      const [saved, registry] = await Promise.all([harness.flowRun(props.scope, result.run.id), harness.workspaceRegistry(props.scope)]);
      setRun(saved.run); setActions(registry.actions);
    } catch (cause) { Alert.alert('Could not start Flow Book', cause instanceof Error ? cause.message : 'Try again.'); }
    finally { setStarting(false); }
  };

  const advance = async () => {
    if (!run || !currentAction || saving) return;
    const missing = currentAction.fields.find((field) => field.required && !field.hidden && !values[field.key]?.trim());
    if (missing) { Alert.alert('Required information', `Enter ${missing.label.toLowerCase()}.`); return; }
    const data = Object.fromEntries(currentAction.fields.flatMap((field) => { const value = values[field.key]?.trim(); return value ? [[field.key, field.kind === 'number' ? Number(value) : value]] : []; }));
    const payload = { runId: run.id, actionId: currentAction.id, data };
    const body = JSON.stringify(payload);
    if (stepAttempt.current?.body !== body) stepAttempt.current = { body, key: createOperationKey(`flow.step:${run.id}:${step}`) };
    setSaving(true);
    try {
      const result = await harness.executeAction<{ run: HarnessFlowRun }>(props.scope, 'flow.advance', payload, stepAttempt.current.key);
      const saved = await harness.flowRun(props.scope, result.run.id).catch(() => null);
      setRun((current) => saved?.run || (current ? { ...current, ...result.run, context: { ...current.context, step: result.run.step } } : null));
    } catch (cause) { Alert.alert('Could not save this step', cause instanceof Error ? cause.message : 'Refresh the Flow Book and try again.'); }
    finally { setSaving(false); }
  };

  const done = run?.state === 'completed';
  const blocked = run?.state === 'blocked';
  return <Modal visible={props.visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={props.onClose}>
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top }]}><TouchableOpacity style={styles.iconButton} onPress={props.onClose} accessibilityRole="button" accessibilityLabel="Close"><Ionicons name="close" size={25} color="#172033" /></TouchableOpacity><View style={styles.headerCopy}><Text numberOfLines={1} style={styles.title}>{bookName}</Text><Text style={styles.subtitle}>{run ? done ? 'Completed' : blocked ? 'Needs review' : `Step ${Math.min(step + 1, steps.length)} of ${steps.length}` : 'A saved process you can resume later.'}</Text></View></View>
      {loading ? <View style={styles.center}><ActivityIndicator color="#3157A8" /></View> : loadError ? <View style={styles.center}><Text style={styles.title}>Could not reopen Flow Book</Text><Text style={styles.body}>{loadError}</Text><TouchableOpacity style={styles.button} onPress={() => setRefresh((value) => value + 1)}><Text style={styles.buttonText}>Try again</Text></TouchableOpacity></View> : !run ? <View style={styles.center}><Text style={styles.body}>TAR will save each step. You can leave and continue this Flow Book later.</Text><TouchableOpacity disabled={starting} style={styles.button} onPress={() => void start()}>{starting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Start Flow Book</Text>}</TouchableOpacity></View> : done ? <View style={styles.center}><Text style={styles.doneIcon}>✓</Text><Text style={styles.title}>Flow Book complete</Text><Text style={styles.body}>Your progress and results are saved.</Text>{run.steps?.map((item) => <Text key={item.id} style={styles.body}>{item.occurrence + 1}. {actions.find((action) => action.id === item.action)?.title || item.action} · {item.state}</Text>)}<TouchableOpacity style={styles.button} onPress={() => void props.onSuccess({ run })}><Text style={styles.buttonText}>Done</Text></TouchableOpacity></View> : blocked ? <View style={styles.center}><Text style={styles.title}>Flow Book paused</Text><Text style={styles.body}>{text(run.context?.reason) || 'A workspace admin needs to review this run before it can continue.'}</Text></View> : automatic ? <View style={styles.center}><ActivityIndicator size="large" color="#3157A8" /><Text style={styles.title}>TAR is working on this step</Text><Text style={styles.body}>Progress is saved. You can leave this screen and return later.</Text></View> : !currentAction ? <View style={styles.center}><Text style={styles.body}>This step is unavailable for your current role. Ask a workspace admin to review the Flow Book.</Text></View> : <>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(6, Math.min(100, (step / Math.max(steps.length, 1)) * 100))}%` }]} /></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 32 }]}><Text style={styles.stepTitle}>{currentAction.title}</Text><Text style={styles.body}>{currentAction.description}</Text>{currentAction.fields.filter((field) => !field.hidden).map((field, index) => <View key={field.key} style={styles.field}><Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text><TextInput autoFocus={index === 0} editable={!saving} value={values[field.key] || ''} onChangeText={(value) => setForm({ key: formKey, values: { ...values, [field.key]: value } })} keyboardType={field.kind === 'email' ? 'email-address' : field.kind === 'number' ? 'numeric' : 'default'} autoCapitalize={field.kind === 'email' ? 'none' : 'sentences'} multiline={field.kind === 'textarea'} style={[styles.input, field.kind === 'textarea' && styles.textarea]} /></View>)}<TouchableOpacity disabled={saving} style={styles.button} onPress={() => void advance()}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{step + 1 === steps.length ? 'Complete Flow Book' : 'Continue'}</Text>}</TouchableOpacity></ScrollView>
      </>}
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({ page:{flex:1,backgroundColor:'#fff'},header:{minHeight:82,paddingHorizontal:12,paddingBottom:12,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#e3e7ef',flexDirection:'row',alignItems:'center',gap:8},iconButton:{width:44,height:44,alignItems:'center',justifyContent:'center'},headerCopy:{flex:1},title:{fontSize:20,fontWeight:'800',color:'#172033'},subtitle:{fontSize:12,color:'#68758c',marginTop:3},center:{flex:1,justifyContent:'center',alignItems:'stretch',padding:28,gap:14},body:{fontSize:15,lineHeight:23,color:'#68758c'},stepTitle:{fontSize:25,fontWeight:'800',color:'#172033'},progressTrack:{height:3,backgroundColor:'#e9edf5'},progressFill:{height:3,backgroundColor:'#3157A8'},form:{padding:24,gap:20},field:{gap:7},label:{fontSize:13,fontWeight:'700',color:'#68758c'},input:{minHeight:52,borderWidth:1,borderColor:'#e3e7ef',borderRadius:12,paddingHorizontal:14,fontSize:16,color:'#172033',backgroundColor:'#f7f8fc'},textarea:{minHeight:120,paddingTop:14,textAlignVertical:'top'},button:{minHeight:54,borderRadius:18,backgroundColor:'#172033',alignItems:'center',justifyContent:'center',marginTop:10},buttonText:{fontSize:16,fontWeight:'800',color:'#fff'},doneIcon:{width:42,height:42,overflow:'hidden',borderRadius:21,textAlign:'center',textAlignVertical:'center',color:'#18865B',backgroundColor:'#e4f5ed',fontSize:26,fontWeight:'800'} });
