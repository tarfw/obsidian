import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createOperationKey, harness, type HarnessActionField, type HarnessRecord, type HarnessWorkspace } from '@/lib/harness';
import type { ActionInterfaceProps } from './types';

function initialValues(props: ActionInterfaceProps): Record<string, string> {
  return Object.fromEntries(props.action.fields.map((field) => [field.key, String(props.initialInput?.[field.key] ?? field.defaultValue ?? '')]));
}

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const allDays = '0,1,2,3,4,5,6';

export default function ActionFormInterface(props: ActionInterfaceProps) {
  if (!props.visible) return null;
  return <ActionForm {...props} />;
}

function ActionForm(props: ActionInterfaceProps) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(props));
  const [records, setRecords] = useState<HarnessRecord[]>([]);
  const [routineWorkspaces, setRoutineWorkspaces] = useState<HarnessWorkspace[]>([]);
  const [picker, setPicker] = useState<HarnessActionField | null>(null);
  const [saving, setSaving] = useState(false);
  const [operationKey] = useState(() => createOperationKey(props.action.id));
  const isRoutine = props.action.id === 'routine.save';
  const visibleFields = useMemo(() => props.action.fields.filter((field) => !field.hidden), [props.action.fields]);
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
  useEffect(() => {
    if (props.action.id !== 'routine.save') return;
    let current = true;
    void harness.listWorkspaces().then((result) => {
      if (current) setRoutineWorkspaces(result.workspaces.filter((item) => item.state === 'active'));
    }).catch(() => { if (current) setRoutineWorkspaces([]); });
    return () => { current = false; };
  }, [props.action.id]);
  const setValue = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const toggleDay = (day: number) => {
    setValues((current) => {
      const chosen = new Set(current.days.split(',').map(Number).filter((value) => Number.isInteger(value) && value >= 0 && value <= 6));
      if (chosen.has(day)) chosen.delete(day); else chosen.add(day);
      return { ...current, days: [...chosen].sort((left, right) => left - right).join(',') };
    });
  };
  const submit = async () => {
    const missing = props.action.fields.find((field) => field.required && !values[field.key]?.trim());
    if (missing) { Alert.alert('Required information', `Enter ${missing.label.toLowerCase()}.`); return; }
    if (isRoutine && !values.days.trim()) { Alert.alert('Choose days', 'Select at least one day for this routine.'); return; }
    setSaving(true);
    try {
      const input = Object.fromEntries(props.action.fields.flatMap((field) => { const raw = values[field.key]?.trim(); return raw ? [[field.key, field.kind === 'number' ? Number(raw) : raw]] : []; }));
      const result = await harness.executeAction(props.scope, props.action.id, input, operationKey);
      props.onSuccess(result);
    } catch (cause) { Alert.alert('Could not save', cause instanceof Error ? cause.message : 'Try again.'); }
    finally { setSaving(false); }
  };

  const input = (field: HarnessActionField, autoFocus = false) => (
    <TextInput
      autoFocus={autoFocus}
      editable={!saving}
      value={values[field.key] || ''}
      onChangeText={(value) => setValue(field.key, value)}
      keyboardType={field.kind === 'email' ? 'email-address' : field.kind === 'number' ? 'numeric' : 'default'}
      autoCapitalize={field.kind === 'email' ? 'none' : 'sentences'}
      multiline={field.kind === 'textarea'}
      placeholder={field.kind === 'number' ? '0' : undefined}
      placeholderTextColor="#9AA3B2"
      style={[styles.input, field.kind === 'textarea' && styles.textarea]}
    />
  );
  const label = (field: HarnessActionField) => (
    <Text style={styles.label}>{field.label}{field.required ? <Text style={styles.required}> *</Text> : null}</Text>
  );
  const field = (field: HarnessActionField, autoFocus = false) => (
    <View style={styles.field} key={field.key}>
      {label(field)}
      {field.kind === 'record' ? (
        <TouchableOpacity disabled={saving} onPress={() => setPicker(field)} style={styles.input}>
          <Text numberOfLines={1} style={[styles.recordValue, !values[field.key] && styles.placeholder]}>{records.find((record) => record.id === values[field.key])?.title || 'Choose a record'}</Text>
        </TouchableOpacity>
      ) : input(field, autoFocus)}
    </View>
  );
  const byKey = (key: string) => visibleFields.find((item) => item.key === key);

  const selectedDays = values.days.split(',');
  const nameField = byKey('label');
  const workspaceField = byKey('workspace');
  const roleField = byKey('role');
  const startField = byKey('start');
  const endField = byKey('end');
  const priorityField = byKey('priority');

  return <Modal visible={props.visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={props.onClose}>
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.iconButton} onPress={props.onClose} accessibilityLabel="Close"><Ionicons name="close" size={22} color="#68758c" /></TouchableOpacity>
        <View style={styles.headerCopy}><Text numberOfLines={1} style={styles.title}>{props.contextTitle || props.action.title}</Text></View>
        <TouchableOpacity disabled={saving} style={styles.saveButton} onPress={() => void submit()} accessibilityLabel={props.contract.submitLabel}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{props.contract.submitLabel}</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 32 }]}>
        {isRoutine ? (
          <View style={styles.routine}>
            {nameField ? (
              <TextInput
                autoFocus
                editable={!saving}
                value={values.label || ''}
                onChangeText={(value) => setValue('label', value)}
                placeholder="Name this routine"
                placeholderTextColor="#9AA3B2"
                accessibilityLabel={nameField.label}
                style={styles.nameInput}
              />
            ) : null}
            {startField && endField ? <View style={styles.timeRow}>
              <TextInput editable={!saving} value={values.start || ''} onChangeText={(value) => setValue('start', value)} placeholder="HH:MM" placeholderTextColor="#9AA3B2" keyboardType="number-pad" accessibilityLabel={startField.label} style={styles.timeInput} />
              <Text style={styles.timeDash}>–</Text>
              <TextInput editable={!saving} value={values.end || ''} onChangeText={(value) => setValue('end', value)} placeholder="HH:MM" placeholderTextColor="#9AA3B2" keyboardType="number-pad" accessibilityLabel={endField.label} style={styles.timeInput} />
            </View> : null}
            <View style={styles.daysBlock}>
              <View style={styles.daysRow}>
                {weekdays.map((day, number) => {
                  const selected = selectedDays.includes(String(number));
                  return <TouchableOpacity key={day} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={day} disabled={saving} onPress={() => toggleDay(number)} style={[styles.dayCircle, selected && styles.dayCircleSelected]}>
                    <Text style={[styles.dayCircleText, selected && styles.dayCircleTextSelected]}>{day[0]}</Text>
                  </TouchableOpacity>;
                })}
              </View>
              <TouchableOpacity disabled={saving} onPress={() => setValue('days', selectedDays.length === 7 ? '1,2,3,4,5' : allDays)} accessibilityRole="button" style={styles.daysQuick}>
                <Text style={styles.allText}>{selectedDays.length === 7 ? 'Weekdays' : 'Every day'}</Text>
              </TouchableOpacity>
            </View>
            {workspaceField ? <View style={styles.choices}>
              {(routineWorkspaces.length ? routineWorkspaces : [{ id: values.workspace || 'current', slug: values.workspace || '', name: values.workspace || 'Current', mode: 'work' as const, scope: '', role: 'owner' as const, state: 'active' as const }]).map((workspace) => {
                const selected = values.workspace === workspace.slug;
                return (
                  <TouchableOpacity key={workspace.id} accessibilityRole="radio" accessibilityState={{ selected }} disabled={saving} onPress={() => setValue('workspace', workspace.slug)} style={[styles.choice, selected && styles.choiceSelected]}>
                    <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{workspace.mode === 'personal' ? 'Personal' : workspace.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View> : null}
            {roleField || priorityField ? <View style={styles.inlineRow}>
              {roleField ? <TextInput editable={!saving} value={values.role || ''} onChangeText={(value) => setValue('role', value)} placeholder={roleField.label} placeholderTextColor="#9AA3B2" accessibilityLabel={roleField.label} style={styles.plainInput} /> : null}
              {priorityField ? <TextInput editable={!saving} value={values.priority || ''} onChangeText={(value) => setValue('priority', value)} keyboardType="numeric" placeholder="Priority" placeholderTextColor="#9AA3B2" accessibilityLabel={priorityField.label} style={styles.plainInputShort} /> : null}
            </View> : null}
          </View>
        ) : visibleFields.map((item, index) => field(item, index === 0))}
      </ScrollView>
      <Modal visible={Boolean(picker)} transparent animationType="slide" onRequestClose={() => setPicker(null)}><View style={styles.pickerBackdrop}><View style={[styles.picker, { paddingBottom: insets.bottom + 16 }]}><Text style={styles.pickerTitle}>{picker?.label || 'Choose a record'}</Text><ScrollView>{records.filter((record) => !picker?.recordType || record.type === picker.recordType).map((record) => <TouchableOpacity key={record.id} style={styles.pickerRow} onPress={() => { if (picker) setValue(picker.key, record.id); setPicker(null); }}><Text style={styles.pickerName}>{record.title}</Text><Text style={styles.pickerType}>{record.type}</Text></TouchableOpacity>)}</ScrollView><TouchableOpacity onPress={() => setPicker(null)} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity></View></View></Modal>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { minHeight: 60, paddingHorizontal: 12, paddingRight: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 19, fontWeight: '800', color: '#172033', letterSpacing: -0.3 },
  saveButton: { minHeight: 40, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#3157A8', alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  form: { padding: 20 },
  routine: { gap: 22 },
  nameInput: { fontSize: 20, fontWeight: '700', color: '#172033', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#C9D2E0' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeInput: { flex: 1, minHeight: 60, borderRadius: 18, backgroundColor: '#F1F3F8', fontSize: 22, fontWeight: '800', color: '#172033', textAlign: 'center' },
  timeDash: { color: '#9AA3B2', fontSize: 18 },
  daysBlock: { gap: 6 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  daysQuick: { alignSelf: 'flex-end', minHeight: 28, justifyContent: 'center', paddingHorizontal: 4 },
  field: { gap: 8 },
  label: { fontSize: 12, fontWeight: '700', color: '#5F6672', letterSpacing: 0.3 },
  required: { color: '#3157A8' },
  input: { minHeight: 48, borderRadius: 14, paddingHorizontal: 14, fontSize: 15, color: '#172033', backgroundColor: '#F1F3F8', justifyContent: 'center' },
  textarea: { minHeight: 110, paddingTop: 14, textAlignVertical: 'top' },
  recordValue: { fontSize: 16, color: '#172033' },
  placeholder: { color: '#9AA3B2' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#EAEFF7' },
  choiceSelected: { backgroundColor: '#DCE5FF' },
  choiceText: { fontSize: 13, fontWeight: '700', color: '#5F6672' },
  choiceTextSelected: { color: '#173673' },
  inlineRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  plainInput: { flex: 1, minWidth: 0, minHeight: 44, fontSize: 15, color: '#172033', borderBottomWidth: 1, borderBottomColor: '#C9D2E0', paddingVertical: 8 },
  plainInputShort: { width: 96, minHeight: 44, fontSize: 15, color: '#172033', textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#C9D2E0', paddingVertical: 8 },
  allText: { fontSize: 13, fontWeight: '800', color: '#3157A8' },
  dayCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAEFF7' },
  dayCircleSelected: { backgroundColor: '#3157A8' },
  dayCircleText: { fontSize: 14, fontWeight: '800', color: '#5F6672' },
  dayCircleTextSelected: { color: '#fff' },
  pickerBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0005' },
  picker: { maxHeight: '75%', backgroundColor: '#FFFFFF', paddingTop: 22, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  pickerTitle: { fontSize: 20, fontWeight: '800', color: '#172033', paddingHorizontal: 24, paddingBottom: 10 },
  pickerRow: { minHeight: 58, paddingHorizontal: 24, justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#E3E7EF' },
  pickerName: { fontSize: 15, fontWeight: '700', color: '#172033' },
  pickerType: { fontSize: 12, color: '#5F6672', marginTop: 2 },
  cancel: { height: 52, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 24 },
  cancelText: { fontSize: 15, fontWeight: '800', color: '#3157A8' },
});
