import { useState } from 'react';
import {
  ActivityIndicator,
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
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface PosField {
  key: string;
  label: string;
  value?: string;
  numeric?: boolean;
  hint?: string;
  advanced?: boolean;
  multiline?: boolean;
}

export interface PosFormSpec {
  title: string;
  submit: string;
  fields: PosField[];
  summary?: (values: Record<string, string>) => string;
  save: (values: Record<string, string>) => Promise<void>;
  assist?: (values: Record<string, string>) => Promise<Record<string, string>>;
}

export default function PosForm({ form, onClose }: { form: PosFormSpec; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(form.fields.map((field) => [field.key, field.value || ''])),
  );
  const [busy, setBusy] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [error, setError] = useState('');

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await form.save(values);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const assist = async () => {
    if (!form.assist || busy) return;
    setBusy(true);
    setError('');
    try {
      const draft = await form.assist(values);
      setValues((previous) => ({ ...previous, ...draft }));
      setShowMore(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not draft product details.');
    } finally {
      setBusy(false);
    }
  };

  const renderField = (field: PosField) => {
    const focused = focusedField === field.key;
    return (
      <View key={field.key} style={[styles.field, focused && styles.fieldFocused]}>
        <View style={[styles.fieldLine, field.multiline && styles.fieldLineMultiline]}>
          <Text style={[styles.label, focused && styles.labelFocused]}>{field.label}</Text>
          <TextInput
            accessibilityLabel={field.label}
            autoFocus={form.fields[0]?.key === field.key}
            value={values[field.key]}
            editable={!busy}
            onFocus={() => setFocusedField(field.key)}
            onBlur={() => setFocusedField(null)}
            onChangeText={(value) => setValues((previous) => ({ ...previous, [field.key]: value }))}
            keyboardType={field.numeric ? 'decimal-pad' : 'default'}
            autoCapitalize={field.key === 'sourceUrl' || field.key === 'imageUrl' ? 'none' : 'sentences'}
            autoCorrect={!['sourceUrl', 'imageUrl', 'sku', 'barcode'].includes(field.key)}
            selectTextOnFocus={field.numeric && values[field.key] === '0'}
            multiline={field.multiline}
            textAlignVertical={field.multiline ? 'top' : 'center'}
            style={[styles.input, field.multiline && styles.textarea]}
          />
        </View>
        {field.hint ? <Text style={styles.hint}>{field.hint}</Text> : null}
      </View>
    );
  };

  const basicFields = form.fields.filter((field) => !field.advanced);
  const advancedFields = form.fields.filter((field) => field.advanced);

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" onRequestClose={() => { if (!busy) onClose(); }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            disabled={busy}
            style={styles.headerAction}
            hitSlop={8}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={25} color="#202124" />
          </TouchableOpacity>
          <Text numberOfLines={1} style={styles.title}>{form.title}</Text>
          {form.assist ? (
            <TouchableOpacity
              disabled={busy}
              style={styles.headerAction}
              hitSlop={8}
              onPress={() => void assist()}
              accessibilityRole="button"
              accessibilityLabel="Draft product details"
            >
              <Ionicons name="sparkles-outline" size={21} color="#3c4043" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            disabled={busy}
            style={[styles.saveAction, busy && styles.disabled]}
            hitSlop={8}
            onPress={() => void save()}
            accessibilityRole="button"
            accessibilityLabel={form.submit}
          >
            {busy ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={22} color="#fff" />}
          </TouchableOpacity>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.fields}>{basicFields.map(renderField)}</View>

          {advancedFields.length ? (
            <>
              <TouchableOpacity
                style={styles.more}
                onPress={() => setShowMore((value) => !value)}
                accessibilityRole="button"
                accessibilityState={{ expanded: showMore }}
              >
                <Text style={styles.moreText}>{showMore ? 'Hide details' : 'More details'}</Text>
                <Ionicons name={showMore ? 'chevron-up' : 'chevron-down'} size={18} color="#5f6368" />
              </TouchableOpacity>
              {showMore ? <View style={styles.fields}>{advancedFields.map(renderField)}</View> : null}
            </>
          ) : null}

          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {form.summary ? <Text style={styles.summary}>{form.summary(values)}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#dadce0' },
  headerAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  title: { flex: 1, marginLeft: 4, color: '#202124', fontSize: 20, fontWeight: '500', letterSpacing: -0.25 },
  saveAction: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#2463a7' },
  disabled: { opacity: 0.55 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: 40 },
  fields: { paddingHorizontal: 20 },
  field: { minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#dadce0' },
  fieldFocused: { borderBottomWidth: 2, borderBottomColor: '#2463a7' },
  fieldLine: { minHeight: 63, flexDirection: 'row', alignItems: 'center' },
  fieldLineMultiline: { minHeight: 132, alignItems: 'flex-start', paddingTop: 19 },
  label: { width: 136, paddingRight: 12, color: '#5f6368', fontSize: 14, lineHeight: 20 },
  labelFocused: { color: '#2463a7' },
  input: { flex: 1, minHeight: 56, paddingHorizontal: 0, paddingVertical: 10, color: '#202124', fontSize: 16, lineHeight: 22 },
  textarea: { minHeight: 112, paddingTop: 0 },
  hint: { marginTop: -8, marginLeft: 136, marginBottom: 10, color: '#80868b', fontSize: 12, lineHeight: 17 },
  more: { minHeight: 56, marginTop: 8, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moreText: { color: '#3c4043', fontSize: 15, fontWeight: '500' },
  error: { marginHorizontal: 20, marginTop: 14, padding: 12, borderRadius: 8, color: '#b3261e', backgroundColor: '#fce8e6', fontSize: 13, lineHeight: 18 },
  summary: { marginHorizontal: 20, marginTop: 18, color: '#202124', fontSize: 18, fontWeight: '600' },
});
