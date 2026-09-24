import Ionicons from '@expo/vector-icons/Ionicons';
import * as Crypto from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createOperationKey, harness, type HarnessAction } from '@/lib/harness';
import type { ActionInterfaceProps } from './types';

type DraftStep = { id: string; auto: boolean; input: Record<string, string> };

const bookActions = new Set(['record.create', 'contact.create', 'organization.create', 'task.create', 'site.generate', 'web.search']);
const automaticActions = new Set(['record.create', 'contact.create', 'organization.create', 'task.create']);
const editableField = (kind: string) => ['text', 'email', 'number', 'textarea'].includes(kind);

export default function FlowBuilderInterface(props: ActionInterfaceProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [available, setAvailable] = useState<HarnessAction[]>([]);
  const [canSuggest, setCanSuggest] = useState(false);
  const [selected, setSelected] = useState<DraftStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [flowId] = useState(() => `book.${Crypto.randomUUID().replace(/-/g, '')}`);
  const attempt = useRef<{ body: string; key: string } | null>(null);

  useEffect(() => {
    let active = true;
    void harness.workspaceRegistry(props.scope).then((result) => {
      if (!active) return;
      setAvailable(result.actions.filter((action) => bookActions.has(action.id)));
      setCanSuggest(result.actions.some((action) => action.id === 'flow.suggest'));
    }).catch((cause) => {
      if (active) Alert.alert('Could not load Actions', cause instanceof Error ? cause.message : 'Try again.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [props.scope]);

  const add = (id: string) => {
    const action = available.find((item) => item.id === id);
    if (!action) return;
    setSelected((current) => [...current, { id, auto: false, input: Object.fromEntries(action.fields.flatMap((field) => field.defaultValue === undefined ? [] : [[field.key, field.defaultValue]])) }]);
  };
  const update = (index: number, next: (step: DraftStep) => DraftStep) => {
    setSelected((current) => current.map((step, at) => at === index ? next(step) : step));
  };
  const suggest = async () => {
    const prompt = description.trim() || name.trim();
    if (!prompt) { Alert.alert('Describe the Flow Book', 'Add a name or outcome first.'); return; }
    setSuggesting(true);
    try {
      const result = await harness.executeAction<{ action: string | null }>(props.scope, 'flow.suggest', { prompt }, createOperationKey('flow.suggest'));
      const action = available.find((item) => item.id === result.action);
      if (!action) { Alert.alert('No clear first step', 'Choose an Action from the list.'); return; }
      Alert.alert('Suggested first step', `${action.title}\n\nReview this suggestion before adding it.`, [
        { text: 'Add step', onPress: () => add(action.id) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } catch (cause) { Alert.alert('Could not get a suggestion', cause instanceof Error ? cause.message : 'Try again.'); }
    finally { setSuggesting(false); }
  };

  const review = () => {
    if (!name.trim() || !selected.length) { Alert.alert('Flow Book needs more information', 'Enter a name and choose at least one Action.'); return; }
    for (const step of selected) {
      if (!step.auto) continue;
      const action = available.find((item) => item.id === step.id);
      const missing = action?.fields.find((field) => field.required && !step.input[field.key]?.trim());
      if (missing) { Alert.alert('Automatic step needs input', `Enter ${missing.label.toLowerCase()} for ${action?.title}.`); return; }
    }
    setReviewing(true);
  };

  const publish = async () => {
    if (saving) return;
    const actions = selected.map((step) => ({
      id: step.id,
      auto: step.auto,
      input: step.auto ? Object.fromEntries(Object.entries(step.input).flatMap(([key, raw]) => {
        const value = raw.trim();
        if (!value) return [];
        const field = available.find((item) => item.id === step.id)?.fields.find((item) => item.key === key);
        return [[key, field?.kind === 'number' ? Number(value) : value]];
      })) : {},
    }));
    const payload = { flowId, name: name.trim(), description: description.trim(), actions };
    const body = JSON.stringify(payload);
    if (attempt.current?.body !== body) attempt.current = { body, key: createOperationKey('flow.publish') };
    setSaving(true);
    try {
      const result = await harness.executeAction(props.scope, props.action.id, payload, attempt.current.key);
      props.onSuccess(result);
    } catch (cause) { Alert.alert('Could not publish Flow Book', cause instanceof Error ? cause.message : 'Review the steps and try again.'); }
    finally { setSaving(false); }
  };

  return <Modal visible={props.visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={props.onClose}>
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={reviewing ? () => setReviewing(false) : props.onClose} accessibilityRole="button" accessibilityLabel={reviewing ? 'Back to editor' : 'Close'}>
          <Ionicons name={reviewing ? 'arrow-back' : 'close'} size={26} color="#172033" />
        </TouchableOpacity>
        <View style={styles.headerCopy}><Text style={styles.title}>{reviewing ? 'Review Flow Book' : 'Create Flow Book'}</Text><Text style={styles.subtitle}>{props.contextTitle || 'Choose Actions in the order they happen.'}</Text></View>
        {!reviewing && <TouchableOpacity disabled={loading || saving} onPress={review} accessibilityRole="button"><Text style={styles.create}>Review</Text></TouchableOpacity>}
      </View>
      {reviewing ? <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
        <Text style={styles.reviewTitle}>{name.trim()}</Text>
        {!!description.trim() && <Text style={styles.actionDescription}>{description.trim()}</Text>}
        {selected.map((step, index) => {
          const action = available.find((item) => item.id === step.id);
          return <View key={`${step.id}-${index}`} style={styles.reviewStep}>
            <Text style={styles.actionTitle}>{index + 1}. {action?.title || step.id}</Text>
            <Text style={styles.actionDescription}>{step.auto ? 'Runs automatically with the input below' : 'Waits for a person to complete it'}</Text>
            {step.auto && Object.entries(step.input).filter(([, value]) => value.trim()).map(([key, value]) => <Text key={key} style={styles.reviewValue}>{action?.fields.find((field) => field.key === key)?.label || key}: {value.trim()}</Text>)}
          </View>;
        })}
        <Text style={styles.actionDescription}>Publishing saves this version. Starting a run uses these reviewed steps and checks current workspace access again.</Text>
        <TouchableOpacity disabled={saving} style={styles.button} onPress={() => void publish()} accessibilityRole="button">
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Publish Flow Book</Text>}
        </TouchableOpacity>
      </ScrollView> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>FLOW BOOK NAME</Text>
        <TextInput value={name} onChangeText={setName} placeholder="For example: Member onboarding" style={styles.input} />
        <TextInput value={description} onChangeText={setDescription} placeholder="What outcome should this Flow Book produce?" multiline style={[styles.input, styles.description]} />
        <Text style={styles.label}>ACTION ORDER</Text>
        {selected.length ? selected.map((step, index) => {
          const action = available.find((item) => item.id === step.id);
          return <View key={`${step.id}-${index}`} style={styles.selectedStep}>
            <View style={styles.sequenceRow}><Text style={styles.number}>{index + 1}</Text><Text style={styles.sequenceText}>{action?.title || step.id}</Text><TouchableOpacity onPress={() => setSelected((current) => current.filter((_, at) => at !== index))} accessibilityRole="button" accessibilityLabel={`Remove Action ${index + 1}`}><Ionicons name="close" size={19} color="#7b879a" /></TouchableOpacity></View>
            {automaticActions.has(step.id) && <View style={styles.switchRow}><Text style={styles.actionDescription}>Run automatically</Text><Switch value={step.auto} onValueChange={(auto) => update(index, (current) => ({ ...current, auto }))} accessibilityLabel={`Run ${action?.title || step.id} automatically`} /></View>}
            {step.auto && <View style={styles.fields}>{action?.fields.filter((field) => !field.hidden && editableField(field.kind)).map((field) => <View key={field.key} style={styles.field}><Text style={styles.fieldLabel}>{field.label}{field.required ? ' *' : ''}</Text><TextInput value={step.input[field.key] || ''} onChangeText={(value) => update(index, (current) => ({ ...current, input: { ...current.input, [field.key]: value } }))} placeholder={field.label} keyboardType={field.kind === 'email' ? 'email-address' : field.kind === 'number' ? 'numeric' : 'default'} autoCapitalize={field.kind === 'email' ? 'none' : 'sentences'} multiline={field.kind === 'textarea'} style={styles.input} /></View>)}</View>}
          </View>;
        }) : <Text style={styles.empty}>Tap Actions below to build the sequence.</Text>}
        {canSuggest && <TouchableOpacity disabled={suggesting || saving} style={styles.suggest} onPress={() => void suggest()} accessibilityRole="button"><Ionicons name="sparkles-outline" size={17} color="#3157A8" />{suggesting ? <ActivityIndicator size="small" color="#3157A8" /> : <Text style={styles.suggestText}>Suggest a first step with Jev</Text>}</TouchableOpacity>}
        <Text style={styles.label}>AVAILABLE ACTIONS</Text>
        {loading ? <ActivityIndicator color="#172033" /> : available.map((action) => <TouchableOpacity key={action.id} style={styles.actionRow} onPress={() => add(action.id)} accessibilityRole="button"><View style={styles.actionCopy}><Text style={styles.actionTitle}>{action.title}</Text><Text style={styles.actionDescription}>{action.description}</Text></View><Ionicons name="add-circle-outline" size={23} color="#68758c" /></TouchableOpacity>)}
      </ScrollView>}
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  header: { minHeight: 78, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderColor: '#e3e7ef', flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  title: { fontSize: 19, fontWeight: '800', color: '#172033' },
  subtitle: { fontSize: 12, color: '#68758c', marginTop: 2 },
  create: { fontSize: 15, fontWeight: '800', color: '#172033', paddingHorizontal: 10 },
  content: { padding: 24, gap: 10 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: '#7b879a', marginTop: 20, marginBottom: 8 },
  input: { minHeight: 52, borderWidth: 1, borderColor: '#e3e7ef', borderRadius: 12, paddingHorizontal: 14, fontSize: 16, color: '#172033', backgroundColor: '#f7f8fc' },
  description: { height: 88, paddingTop: 14, textAlignVertical: 'top' },
  selectedStep: { borderWidth: 1, borderColor: '#e3e7ef', borderRadius: 14, padding: 12, gap: 8 },
  sequenceRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 12 },
  number: { width: 22, fontSize: 12, fontWeight: '800', color: '#7b879a' },
  sequenceText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#172033' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  fields: { gap: 10 },
  field: { gap: 5 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#68758c' },
  empty: { fontSize: 14, color: '#68758c', paddingVertical: 8 },
  suggest: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#dce5ff', borderRadius: 12, backgroundColor: '#f3f6ff', marginTop: 14 },
  suggestText: { fontSize: 13, fontWeight: '700', color: '#3157A8' },
  actionRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: '#e3e7ef', borderRadius: 14 },
  actionCopy: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '800', color: '#172033' },
  actionDescription: { fontSize: 12, lineHeight: 17, color: '#68758c' },
  reviewTitle: { fontSize: 22, fontWeight: '800', color: '#172033' },
  reviewStep: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e3e7ef', gap: 4 },
  reviewValue: { fontSize: 13, color: '#172033' },
  button: { minHeight: 54, borderRadius: 18, backgroundColor: '#172033', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  buttonText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
