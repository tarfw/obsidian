import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createOperationKey,
  harness,
  type HarnessActionField,
  type HarnessRecord,
  type HarnessWorkspace,
} from '@/lib/harness';
import type { ActionInterfaceProps } from './types';

function initialValues(props: ActionInterfaceProps): Record<string, string> {
  return Object.fromEntries(
    props.action.fields.map((field) => [
      field.key,
      String(props.initialInput?.[field.key] ?? field.defaultValue ?? ''),
    ]),
  );
}

interface SlipLineItem {
  id: string;
  item: string;
  quantity: number;
  rate: number;
  unit?: string;
}

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const allDays = '0,1,2,3,4,5,6';
const routineRole = (value: string) => {
  const role = value.trim().toLowerCase();
  return ['chef', 'cook', 'kitchen'].includes(role) ? 'kitchen' : role;
};
const grantedRoles = (workspace: HarnessWorkspace) =>
  workspace.roles?.length ? workspace.roles : [workspace.workRole || 'general'];
type SearchSource = { title: string; url: string; snippet: string; date: string | null };

export default function ActionFormInterface(props: ActionInterfaceProps) {
  if (!props.visible) return null;
  return <ActionForm {...props} />;
}

function ActionForm(props: ActionInterfaceProps) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(props));
  const [records, setRecords] = useState<HarnessRecord[]>([]);
  const [recordQuery, setRecordQuery] = useState('');
  const [routineWorkspaces, setRoutineWorkspaces] = useState<HarnessWorkspace[]>([]);
  const [picker, setPicker] = useState<HarnessActionField | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchSources, setSearchSources] = useState<SearchSource[] | null>(null);
  const attempt = useRef<{ body: string; key: string } | null>(null);

  const isRoutine = props.action.id === 'routine.save';
  const visibleFields = useMemo(
    () => props.action.fields.filter((field) => !field.hidden),
    [props.action.fields],
  );

  // Identify if this action supports multi-line items
  const linesFieldKey = useMemo(() => {
    const candidate = props.action.fields.find(
      (f) =>
        f.key === 'lines' ||
        f.key === 'items' ||
        f.key === 'ingredients' ||
        f.key === 'packages',
    );
    return candidate ? candidate.key : null;
  }, [props.action.fields]);

  // Initial line items
  const [lineItems, setLineItems] = useState<SlipLineItem[]>(() => {
    if (!linesFieldKey) return [];
    try {
      const raw = props.initialInput?.[linesFieldKey];
      if (typeof raw === 'string' && raw.trim()) {
        const parsed = JSON.parse(raw) as Record<string, unknown>[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p, idx) => ({
            id: String(idx + 1),
            item: String(p.item || p.description || p.name || p.sku || ''),
            quantity: Number(p.quantity || p.qty || 1),
            rate: Number(p.rate || p.price || p.cost || p.amount || 0),
            unit: typeof p.unit === 'string' ? p.unit : undefined,
          }));
        }
      }
    } catch {
      // ignore parse error
    }
    return [{ id: '1', item: '', quantity: 1, rate: 0 }];
  });

  // Keep serialized lines JSON field synchronized
  useEffect(() => {
    if (!linesFieldKey) return;
    const serializable = lineItems
      .filter((line) => line.item.trim() || line.rate > 0)
      .map((line) => ({
        item: line.item.trim(),
        quantity: line.quantity,
        rate: line.rate,
        total: line.quantity * line.rate,
        ...(line.unit ? { unit: line.unit } : {}),
      }));
    setValues((curr) => ({
      ...curr,
      [linesFieldKey]: serializable.length ? JSON.stringify(serializable) : '',
    }));
  }, [lineItems, linesFieldKey]);

  const recordTypes = useMemo(
    () => [
      ...new Set(
        props.action.fields
          .filter((field) => field.kind === 'record')
          .map((field) => field.recordType || ''),
      ),
    ],
    [props.action.fields],
  );

  useEffect(() => {
    if (!recordTypes.length) return;
    let current = true;
    void Promise.all(
      recordTypes.map((type) => harness.records(props.scope, type || undefined)),
    )
      .then((results) => {
        if (current) setRecords(results.flatMap((result) => result.records));
      })
      .catch(() => {
        if (current) setRecords([]);
      });
    return () => {
      current = false;
    };
  }, [props.scope, recordTypes]);

  useEffect(() => {
    if (props.action.id !== 'routine.save') return;
    let current = true;
    void harness
      .listWorkspaces()
      .then((result) => {
        if (current) {
          const available = result.workspaces.filter((item) => item.state === 'active');
          setRoutineWorkspaces(available);
          setValues((values) => {
            const selected = available.find((item) => item.slug === values.workspace);
            return selected?.role === 'member' && !values.role.trim()
              ? { ...values, role: grantedRoles(selected)[0] || '' }
              : values;
          });
        }
      })
      .catch(() => {
        if (current) setRoutineWorkspaces([]);
      });
    return () => {
      current = false;
    };
  }, [props.action.id]);

  const setValue = (key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const toggleDay = (dayNumber: number) => {
    const raw = values.days || '';
    const current = raw ? raw.split(',').filter(Boolean) : [];
    const day = String(dayNumber);
    const next = current.includes(day)
      ? current.filter((item) => item !== day)
      : [...current, day].sort();
    setValue('days', next.join(','));
  };

  const addLine = () => {
    setLineItems((curr) => [
      ...curr,
      { id: String(Date.now()), item: '', quantity: 1, rate: 0 },
    ]);
  };

  const removeLine = (id: string) => {
    setLineItems((curr) => (curr.length > 1 ? curr.filter((l) => l.id !== id) : curr));
  };

  const updateLine = (id: string, patch: Partial<SlipLineItem>) => {
    setLineItems((curr) =>
      curr.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  };

  const subtotal = useMemo(() => {
    if (!linesFieldKey) return 0;
    return lineItems.reduce((acc, line) => acc + line.quantity * line.rate, 0);
  }, [lineItems, linesFieldKey]);

  const submit = async () => {
    const missing = props.action.fields.find(
      (field) => field.required && !field.hidden && !values[field.key]?.trim(),
    );
    if (missing) {
      Alert.alert('Required field', `Please enter ${missing.label.toLowerCase()}.`);
      return;
    }
    const missingHidden = props.action.fields.find(
      (field) => field.required && field.hidden && !values[field.key]?.trim(),
    );
    if (missingHidden) {
      Alert.alert('Missing reference', `${missingHidden.label} reference is required.`);
      return;
    }
    if (isRoutine && !values.days?.trim()) {
      Alert.alert('Choose days', 'Select at least one day for this routine.');
      return;
    }
    if (isRoutine && routineWorkspaces.length) {
      const workspace = routineWorkspaces.find((item) => item.slug === values.workspace);
      if (!workspace) {
        Alert.alert('Choose a workspace', 'Select one of your active workspaces.');
        return;
      }
      if (
        workspace.role === 'member' &&
        !grantedRoles(workspace).some((role) => routineRole(role) === routineRole(values.role))
      ) {
        Alert.alert(
          'Choose an assigned role',
          'This workspace role is no longer assigned to you. Select one of the available roles.',
        );
        return;
      }
    }
    setSaving(true);
    try {
      const input = Object.fromEntries(
        props.action.fields.flatMap((field) => {
          const raw = values[field.key]?.trim();
          return raw ? [[field.key, field.kind === 'number' ? Number(raw) : raw]] : [];
        }),
      );
      const body = JSON.stringify(input);
      if (attempt.current?.body !== body)
        attempt.current = { body, key: createOperationKey(props.action.id) };
      const result = await harness.executeAction(
        props.scope,
        props.action.id,
        input,
        attempt.current.key,
      );
      if (props.action.id === 'web.search') {
        setSearchSources(
          Array.isArray(result.sources)
            ? result.sources.filter(
                (source): source is SearchSource =>
                  source !== null &&
                  typeof source === 'object' &&
                  typeof (source as Record<string, unknown>).url === 'string' &&
                  /^https?:\/\//.test(String((source as Record<string, unknown>).url)),
              )
            : [],
        );
      } else {
        props.onSuccess(result);
      }
    } catch (cause) {
      Alert.alert(
        props.action.id === 'web.search' ? 'Could not search' : 'Could not save',
        cause instanceof Error ? cause.message : 'Try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const byKey = (key: string) => visibleFields.find((item) => item.key === key);
  const selectedDays = isRoutine ? (values.days || '').split(',').filter(Boolean) : [];
  const nameField = byKey('label');
  const workspaceField = byKey('workspace');
  const roleField = byKey('role');
  const startField = byKey('start');
  const endField = byKey('end');
  const priorityField = byKey('priority');
  const selectedRoutineWorkspace = routineWorkspaces.find((item) => item.slug === values.workspace);

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={props.onClose}
    >
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Crisp Pure White Header */}
        <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={props.onClose}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text numberOfLines={1} style={styles.title}>
              {props.contextTitle || props.action.title}
            </Text>
            <Text style={styles.scopeTag}>{props.scope}</Text>
          </View>
          <TouchableOpacity
            disabled={saving}
            style={styles.saveButton}
            onPress={() => void submit()}
            accessibilityLabel={
              props.action.id === 'web.search' ? 'Search' : props.contract.submitLabel
            }
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveText}>
                {props.action.id === 'web.search' ? 'Search' : props.contract.submitLabel}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
        >
          {/* Routine Configuration */}
          {isRoutine ? (
            <View style={styles.routineBlock}>
              {nameField ? (
                <View style={styles.field}>
                  <Text style={styles.label}>Routine Name *</Text>
                  <TextInput
                    autoFocus
                    editable={!saving}
                    value={values.label || ''}
                    onChangeText={(value) => setValue('label', value)}
                    placeholder="e.g. Morning Shift"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                  />
                </View>
              ) : null}

              {startField && endField ? (
                <View style={styles.field}>
                  <Text style={styles.label}>Time Range *</Text>
                  <View style={styles.timeRow}>
                    <TextInput
                      editable={!saving}
                      value={values.start || ''}
                      onChangeText={(value) => setValue('start', value)}
                      placeholder="09:00"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      style={styles.timeInput}
                    />
                    <Text style={styles.timeDash}>–</Text>
                    <TextInput
                      editable={!saving}
                      value={values.end || ''}
                      onChangeText={(value) => setValue('end', value)}
                      placeholder="17:00"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      style={styles.timeInput}
                    />
                  </View>
                </View>
              ) : null}

              <View style={styles.daysBlock}>
                <Text style={styles.label}>Days</Text>
                <View style={styles.daysRow}>
                  {weekdays.map((day, number) => {
                    const selected = selectedDays.includes(String(number));
                    return (
                      <TouchableOpacity
                        key={day}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        accessibilityLabel={day}
                        disabled={saving}
                        onPress={() => toggleDay(number)}
                        style={[styles.dayCircle, selected && styles.dayCircleSelected]}
                      >
                        <Text
                          style={[
                            styles.dayCircleText,
                            selected && styles.dayCircleTextSelected,
                          ]}
                        >
                          {day[0]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  disabled={saving}
                  onPress={() =>
                    setValue('days', selectedDays.length === 7 ? '1,2,3,4,5' : allDays)
                  }
                  style={styles.daysQuick}
                >
                  <Text style={styles.allText}>
                    {selectedDays.length === 7 ? 'Switch to Weekdays' : 'Select Every Day'}
                  </Text>
                </TouchableOpacity>
              </View>

              {workspaceField ? (
                <View style={styles.field}>
                  <Text style={styles.label}>Workspace *</Text>
                  <View style={styles.choices}>
                    {(routineWorkspaces.length
                      ? routineWorkspaces
                      : [
                          {
                            id: values.workspace || 'current',
                            slug: values.workspace || '',
                            name: values.workspace || 'Current',
                            mode: 'work' as const,
                            scope: '',
                            role: 'owner' as const,
                            state: 'active' as const,
                          },
                        ]
                    ).map((workspace) => {
                      const selected = values.workspace === workspace.slug;
                      return (
                        <TouchableOpacity
                          key={workspace.id}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                          disabled={saving}
                          onPress={() =>
                            setValues((current) => ({
                              ...current,
                              workspace: workspace.slug,
                              role:
                                workspace.role === 'member'
                                  ? grantedRoles(workspace)[0] || ''
                                  : current.role,
                            }))
                          }
                          style={[styles.choice, selected && styles.choiceSelected]}
                        >
                          <Text
                            style={[
                              styles.choiceText,
                              selected && styles.choiceTextSelected,
                            ]}
                          >
                            {workspace.mode === 'personal' ? 'Personal' : workspace.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {roleField || priorityField ? (
                <View style={styles.inlineRow}>
                  {roleField && selectedRoutineWorkspace?.role === 'member' ? (
                    <View style={styles.roleChoices}>
                      <Text style={styles.label}>Role</Text>
                      <View style={styles.choices}>
                        {grantedRoles(selectedRoutineWorkspace).map((role) => {
                          const selected =
                            routineRole(values.role || '') === routineRole(role);
                          return (
                            <TouchableOpacity
                              key={role}
                              accessibilityRole="radio"
                              accessibilityState={{ selected }}
                              disabled={saving}
                              onPress={() => setValue('role', role)}
                              style={[styles.choice, selected && styles.choiceSelected]}
                            >
                              <Text
                                style={[
                                  styles.choiceText,
                                  selected && styles.choiceTextSelected,
                                ]}
                              >
                                {role}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ) : roleField ? (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>{roleField.label}</Text>
                      <TextInput
                        editable={!saving}
                        value={values.role || ''}
                        onChangeText={(value) => setValue('role', value)}
                        placeholder="Role"
                        placeholderTextColor="#94A3B8"
                        style={styles.input}
                      />
                    </View>
                  ) : null}

                  {priorityField ? (
                    <View style={{ width: 80 }}>
                      <Text style={styles.label}>Priority</Text>
                      <TextInput
                        editable={!saving}
                        value={values.priority || ''}
                        onChangeText={(value) => setValue('priority', value)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        style={[styles.input, { textAlign: 'center' }]}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : (
            /* 100% Uncluttered Clean Standard Fields */
            <View style={styles.fieldsContainer}>
              {visibleFields
                .filter((f) => f.key !== linesFieldKey)
                .map((field) => (
                  <View style={styles.field} key={field.key}>
                    <Text style={styles.label}>
                      {field.label}
                      {field.required ? <Text style={styles.required}> *</Text> : null}
                    </Text>

                    {field.kind === 'record' ? (
                      <TouchableOpacity
                        disabled={saving}
                        onPress={() => {
                          setRecordQuery('');
                          setPicker(field);
                        }}
                        style={styles.recordInput}
                      >
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.recordValue,
                            !values[field.key] && styles.placeholder,
                          ]}
                        >
                          {records.find((r) => r.id === values[field.key])?.title ||
                            values[field.key] ||
                            `Select ${field.label.toLowerCase()}`}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    ) : (
                      <TextInput
                        editable={!saving}
                        value={values[field.key] || ''}
                        onChangeText={(val) => setValue(field.key, val)}
                        keyboardType={
                          field.kind === 'email'
                            ? 'email-address'
                            : field.kind === 'number'
                            ? 'numeric'
                            : 'default'
                        }
                        autoCapitalize={field.kind === 'email' ? 'none' : 'sentences'}
                        multiline={field.kind === 'textarea'}
                        placeholder={field.defaultValue || ''}
                        placeholderTextColor="#94A3B8"
                        style={[
                          styles.input,
                          field.kind === 'textarea' && styles.textarea,
                        ]}
                      />
                    )}
                  </View>
                ))}

              {/* Clean Inline Multi-Line Items */}
              {linesFieldKey ? (
                <View style={styles.linesSection}>
                  <View style={styles.linesHeader}>
                    <Text style={styles.linesSectionTitle}>Line items</Text>
                    <TouchableOpacity onPress={addLine} style={styles.addLineButton}>
                      <Ionicons name="add" size={16} color="#1E293B" />
                      <Text style={styles.addLineText}>Add line</Text>
                    </TouchableOpacity>
                  </View>

                  {lineItems.map((line, idx) => (
                    <View key={line.id} style={styles.lineRowCard}>
                      <View style={styles.lineRowTop}>
                        <Text style={styles.lineIndex}>#{idx + 1}</Text>
                        <TextInput
                          editable={!saving}
                          value={line.item}
                          onChangeText={(val) => updateLine(line.id, { item: val })}
                          placeholder="Item description"
                          placeholderTextColor="#94A3B8"
                          style={styles.lineItemInput}
                        />
                        {lineItems.length > 1 ? (
                          <TouchableOpacity
                            onPress={() => removeLine(line.id)}
                            style={styles.removeLineButton}
                          >
                            <Ionicons name="close" size={18} color="#94A3B8" />
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      <View style={styles.lineRowBottom}>
                        <View style={styles.lineQtyWrap}>
                          <Text style={styles.lineSubLabel}>Qty</Text>
                          <TextInput
                            editable={!saving}
                            value={String(line.quantity || '')}
                            onChangeText={(val) =>
                              updateLine(line.id, { quantity: Number(val) || 0 })
                            }
                            keyboardType="numeric"
                            placeholder="1"
                            placeholderTextColor="#94A3B8"
                            style={styles.lineSmallInput}
                          />
                        </View>
                        <View style={styles.lineRateWrap}>
                          <Text style={styles.lineSubLabel}>Rate</Text>
                          <TextInput
                            editable={!saving}
                            value={line.rate === 0 ? '' : String(line.rate)}
                            onChangeText={(val) =>
                              updateLine(line.id, { rate: Number(val) || 0 })
                            }
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor="#94A3B8"
                            style={styles.lineSmallInput}
                          />
                        </View>
                        <View style={styles.lineTotalWrap}>
                          <Text style={styles.lineSubLabel}>Total</Text>
                          <Text style={styles.lineTotalText}>
                            {(line.quantity * line.rate).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Clean Subtotal Summary */}
                  <View style={styles.subtotalRow}>
                    <Text style={styles.subtotalLabel}>Subtotal</Text>
                    <Text style={styles.subtotalValue}>
                      {subtotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          )}

          {/* Web search results */}
          {searchSources ? (
            <View style={styles.results}>
              <Text style={styles.resultsTitle}>Sources</Text>
              {searchSources.length ? (
                searchSources.map((source) => (
                  <View key={source.url} style={styles.source}>
                    <Text style={styles.sourceTitle}>{source.title}</Text>
                    <Text style={styles.sourceSnippet}>{source.snippet}</Text>
                    <Text numberOfLines={1} style={styles.sourceUrl}>
                      {source.url}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.placeholder}>No matching sources found.</Text>
              )}
            </View>
          ) : null}
        </ScrollView>

        {/* Record Picker Modal */}
        <Modal
          visible={Boolean(picker)}
          transparent
          animationType="fade"
          onRequestClose={() => setPicker(null)}
        >
          <View style={styles.pickerBackdrop}>
            <View style={[styles.picker, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select {picker?.label}</Text>
                <TouchableOpacity onPress={() => setPicker(null)}>
                  <Ionicons name="close" size={22} color="#1E293B" />
                </TouchableOpacity>
              </View>
              <View style={styles.pickerSearch}>
                <Ionicons name="search-outline" size={16} color="#94A3B8" />
                <TextInput
                  value={recordQuery}
                  onChangeText={setRecordQuery}
                  placeholder="Search records..."
                  placeholderTextColor="#94A3B8"
                  style={styles.pickerSearchInput}
                />
              </View>
              <ScrollView style={{ maxHeight: 320 }}>
                {records
                  .filter((r) => !picker?.recordType || r.type === picker.recordType)
                  .filter(
                    (r) =>
                      !recordQuery.trim() ||
                      r.title.toLowerCase().includes(recordQuery.toLowerCase()),
                  )
                  .map((record) => (
                    <TouchableOpacity
                      key={record.id}
                      onPress={() => {
                        if (picker) setValue(picker.key, record.id);
                        setPicker(null);
                      }}
                      style={styles.pickerRow}
                    >
                      <View>
                        <Text style={styles.pickerName}>{record.title}</Text>
                        <Text style={styles.pickerType}>
                          {record.type} · {record.id}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
  },
  headerCopy: { flex: 1, marginHorizontal: 12 },
  title: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  scopeTag: { fontSize: 12, color: '#64748B', marginTop: 1 },
  saveButton: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  saveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  form: { padding: 16, gap: 16, backgroundColor: '#FFFFFF' },

  /* Clean Uncluttered Fields */
  fieldsContainer: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  required: { color: '#DC2626' },
  input: {
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textarea: { minHeight: 88, paddingTop: 10, textAlignVertical: 'top' },
  recordInput: {
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recordValue: { flex: 1, fontSize: 14, color: '#0F172A' },
  placeholder: { color: '#94A3B8' },

  /* Clean Line Items */
  linesSection: { marginTop: 8, gap: 12 },
  linesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  linesSectionTitle: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  addLineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addLineText: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  lineRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 10,
  },
  lineRowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineIndex: { fontSize: 12, fontWeight: '600', color: '#94A3B8', width: 24 },
  lineItemInput: {
    flex: 1,
    minHeight: 38,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  removeLineButton: { padding: 4 },
  lineRowBottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineQtyWrap: { width: 70 },
  lineRateWrap: { flex: 1 },
  lineTotalWrap: { width: 90, alignItems: 'flex-end' },
  lineSubLabel: { fontSize: 11, fontWeight: '500', color: '#64748B', marginBottom: 4 },
  lineSmallInput: {
    height: 36,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  lineTotalText: { fontSize: 14, fontWeight: '700', color: '#0F172A', height: 36, textAlignVertical: 'center', paddingTop: 8 },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  subtotalLabel: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  subtotalValue: { fontSize: 17, fontWeight: '700', color: '#0F172A' },

  /* Routines */
  routineBlock: { gap: 16 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
  timeDash: { color: '#94A3B8', fontSize: 16 },
  daysBlock: { gap: 8 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  daysQuick: { alignSelf: 'flex-end', paddingVertical: 4 },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayCircleSelected: { backgroundColor: '#1E293B', borderColor: '#1E293B' },
  dayCircleText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  dayCircleTextSelected: { color: '#FFFFFF' },
  allText: { fontSize: 12, fontWeight: '600', color: '#1E293B' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceSelected: { backgroundColor: '#1E293B', borderColor: '#1E293B' },
  choiceText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  choiceTextSelected: { color: '#FFFFFF' },
  inlineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  roleChoices: { flex: 1, gap: 8 },

  /* Search sources */
  results: { marginTop: 16, gap: 8 },
  resultsTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  source: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  sourceTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  sourceSnippet: { fontSize: 12, lineHeight: 18, color: '#475569' },
  sourceUrl: { fontSize: 11, color: '#94A3B8' },

  /* Record Picker Modal */
  pickerBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000040' },
  picker: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerSearchInput: { flex: 1, fontSize: 13, color: '#0F172A' },
  pickerRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#F1F5F9',
    paddingVertical: 8,
  },
  pickerName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  pickerType: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
});
