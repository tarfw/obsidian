import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
  image?: boolean;
}

export interface PosFormSpec {
  title: string;
  submit: string;
  fields: PosField[];
  product?: boolean;
  summary?: (values: Record<string, string>) => string;
  save: (values: Record<string, string>) => Promise<void>;
}

export default function PosForm({ form, onClose }: { form: PosFormSpec; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(form.fields.map((field) => [field.key, field.value || ''])),
  );
  const [busy, setBusy] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [productTab, setProductTab] = useState<'details' | 'inventory' | 'more'>('details');
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

  const renderField = (field: PosField) => {
    return (
      <View key={field.key} style={[styles.field, form.product && styles.productField]}>
        {field.image && !form.product ? <View style={styles.imageField}><View style={styles.imageThumbnail}>{values[field.key] ? <Image source={{ uri: values[field.key] }} style={styles.image} /> : <Ionicons name="image-outline" size={22} color="#8a95a6" />}</View><View style={styles.imageInput}><Text style={styles.label}>{field.label}</Text><TextInput accessibilityLabel={field.label} value={values[field.key]} editable={!busy} onChangeText={(value) => setValues((previous) => ({ ...previous, [field.key]: value }))} autoCapitalize="none" autoCorrect={false} placeholder="Image link" placeholderTextColor="#a0a8b5" style={styles.input} /></View></View> :
        <View style={[styles.fieldLine, form.product && styles.productFieldLine, field.multiline && styles.fieldLineMultiline]}>
          <Text style={[styles.label, form.product && styles.productLabel]}>{field.label}</Text>
          <TextInput
            accessibilityLabel={field.label}
            autoFocus={form.fields[0]?.key === field.key}
            value={values[field.key]}
            editable={!busy}
            onChangeText={(value) => setValues((previous) => ({ ...previous, [field.key]: value }))}
            keyboardType={field.numeric ? 'decimal-pad' : 'default'}
            autoCapitalize={field.key === 'sourceUrl' || field.key === 'imageUrl' ? 'none' : 'sentences'}
            autoCorrect={!['sourceUrl', 'imageUrl', 'sku', 'barcode'].includes(field.key)}
            selectTextOnFocus={field.numeric && values[field.key] === '0'}
            multiline={field.multiline}
            textAlignVertical={field.multiline ? 'top' : 'center'}
            style={[styles.input, form.product && styles.productInput, form.product && field.numeric && styles.productNumericInput, field.multiline && styles.textarea]}
          />
        </View>}
      </View>
    );
  };

  const titleField = form.fields.find((field) => field.key === 'title');
  const inventoryKeys = new Set(['stock', 'lowStock', 'cost']);
  const basicFields = form.fields.filter((field) => !field.advanced && (!form.product || field.key !== 'title'));
  const advancedFields = form.fields.filter((field) => field.advanced && (!form.product || !inventoryKeys.has(field.key)));
  const visibleBasicFields = form.product ? productTab === 'inventory' ? form.fields.filter((field) => inventoryKeys.has(field.key)) : productTab === 'more' ? advancedFields : basicFields.filter((field) => !inventoryKeys.has(field.key)) : basicFields;

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
          <Text numberOfLines={1} style={styles.title}>{form.product ? 'Product' : form.title}</Text>
          <TouchableOpacity
            disabled={busy}
            style={[styles.saveAction, busy && styles.disabled]}
            hitSlop={8}
            onPress={() => void save()}
            accessibilityRole="button"
            accessibilityLabel={form.submit}
          >
            {busy ? <ActivityIndicator size="small" color="#2463a7" /> : <Text style={styles.saveText}>{form.submit === 'Save product' ? 'Save' : form.submit}</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {form.product && titleField ? <><View style={styles.productHero}><View style={styles.heroThumbnail}>{values.imageUrl ? <Image source={{ uri: values.imageUrl }} style={styles.image} /> : <Ionicons name="cube-outline" size={26} color="#8a95a6" />}</View><View style={styles.heroCopy}><TextInput accessibilityLabel="Product name" autoFocus value={values.title} editable={!busy} onChangeText={(value) => setValues((previous) => ({ ...previous, title: value }))} placeholder="Product name" placeholderTextColor="#a0a8b5" style={styles.heroTitle} /><Text style={styles.heroMeta}>Product</Text></View></View><View style={styles.productTabs}>{(['details', 'inventory', 'more'] as const).map((tab) => <TouchableOpacity key={tab} onPress={() => setProductTab(tab)} style={[styles.productTab, productTab === tab && styles.productTabActive]}><Text style={[styles.productTabText, productTab === tab && styles.productTabTextActive]}>{tab === 'more' ? 'More' : tab[0].toUpperCase() + tab.slice(1)}</Text></TouchableOpacity>)}</View></> : null}
          <View style={[styles.fields, form.product && styles.productFields]}>{visibleBasicFields.map(renderField)}</View>

          {advancedFields.length && !form.product ? (
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
  headerAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, marginLeft: 4, color: '#202124', fontSize: 18, fontWeight: '600' },
  saveAction: { minWidth: 48, height: 40, alignItems: 'center', justifyContent: 'center' }, saveText: { color: '#2463a7', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: 40 },
  fields: { paddingHorizontal: 20 },
  field: { minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e8eaed' },
  fieldLine: { minHeight: 55, flexDirection: 'row', alignItems: 'center' },
  fieldLineMultiline: { minHeight: 132, alignItems: 'flex-start', paddingTop: 19 },
  label: { width: 104, paddingRight: 10, color: '#6d7684', fontSize: 12, lineHeight: 17 },
  input: { flex: 1, minHeight: 54, paddingHorizontal: 0, paddingVertical: 8, color: '#202124', fontSize: 15, lineHeight: 21 },
  textarea: { minHeight: 112, paddingTop: 0 },
  imageField: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12 },
  imageThumbnail: { width: 54, height: 54, borderRadius: 8, backgroundColor: '#f4f6f8', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  imageInput: { flex: 1, minWidth: 0 },
  productHero: { minHeight: 98, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroThumbnail: { width: 62, height: 62, borderRadius: 12, backgroundColor: '#f4f6f8', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, minWidth: 0 }, heroTitle: { minHeight: 40, padding: 0, color: '#202124', fontSize: 22, fontWeight: '600' }, heroMeta: { marginTop: 1, color: '#6d7684', fontSize: 14 },
  productTabs: { height: 50, paddingHorizontal: 22, flexDirection: 'row', gap: 26, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e8eaed' }, productTab: { justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' }, productTabActive: { borderBottomColor: '#202124' }, productTabText: { color: '#6d7684', fontSize: 15, fontWeight: '600' }, productTabTextActive: { color: '#202124' }, productFields: { paddingHorizontal: 0 }, productField: { minHeight: 52, borderBottomColor: '#edf0f2' }, productFieldLine: { minHeight: 51 }, productLabel: { width: '34%', minHeight: 51, paddingHorizontal: 14, paddingRight: 10, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#edf0f2', textAlignVertical: 'center', color: '#59616d', fontSize: 14, fontWeight: '400' }, productInput: { minHeight: 50, paddingHorizontal: 14, paddingVertical: 6, fontSize: 15, color: '#30363d' }, productNumericInput: { textAlign: 'right', paddingRight: 16 },
  more: { minHeight: 56, marginTop: 8, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moreText: { color: '#3c4043', fontSize: 15, fontWeight: '500' },
  error: { marginHorizontal: 20, marginTop: 14, padding: 12, borderRadius: 8, color: '#b3261e', backgroundColor: '#fce8e6', fontSize: 13, lineHeight: 18 },
  summary: { marginHorizontal: 20, marginTop: 18, color: '#202124', fontSize: 18, fontWeight: '600' },
});
