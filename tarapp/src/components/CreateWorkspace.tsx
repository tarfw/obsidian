import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TarLogo } from '@/components/TarLogo';
import { createOperationKey, harness } from '@/lib/harness';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (slug: string) => Promise<void>;
  canClose: boolean;
  existingSlugs?: string[];
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

export default function CreateWorkspace({
  visible,
  onClose,
  onSuccess,
  canClose,
  existingSlugs = [],
}: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capabilities, setCapabilities] = useState<{ pos: boolean; commerce: boolean; site: boolean }>({
    pos: false,
    commerce: true,
    site: false,
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const workspaceName = name.trim() || 'My Workspace';
  const slug = useMemo(() => {
    const base = slugify(workspaceName) || 'my-workspace';
    if (!existingSlugs.includes(base)) return base;
    let suffix = 2;
    while (existingSlugs.includes(`${base}-${suffix}`)) suffix += 1;
    return `${base}-${suffix}`;
  }, [existingSlugs, workspaceName]);

  const close = () => {
    if (!submitting && !analyzing && canClose) {
      setName('');
      setDescription('');
      setStep(1);
      setError('');
      onClose();
    }
  };

  const nextStep = async () => {
    if (!name.trim()) {
      setError('Workspace name is required.');
      return;
    }
    setError('');
    setAnalyzing(true);
    try {
      const brief = `${name}. ${description}`.trim();
      const result = await harness.suggestWorkspace(brief);
      if (result?.capabilities) {
        setCapabilities(result.capabilities);
      }
      setStep(2);
    } catch {
      // Fallback: advance to step 2 with defaults
      setStep(2);
    } finally {
      setAnalyzing(false);
    }
  };

  const create = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await harness.createWorkspace(workspaceName, slug);

      // Save chosen capabilities if any non-default
      const mods = ['pos', 'commerce', 'site'] as const;
      for (const mod of mods) {
        if (capabilities[mod]) {
          await harness
            .executeAction(
              slug,
              'capability.save',
              { module: mod, enabled: true, baseVersion: 0 },
              createOperationKey(`init-cap:${slug}:${mod}`),
            )
            .catch(() => undefined);
        }
      }

      await onSuccess(slug);
      setName('');
      setDescription('');
      setStep(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Workspace could not be created.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: Math.max(insets.top, 24) + 24,
              paddingBottom: Math.max(insets.bottom, 20) + 96,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topRow}>
            <View style={styles.mark}>
              <TarLogo size={52} color="#1E5631" bgColor="#EEF5F1" />
            </View>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP {step} OF 2</Text>
            </View>
          </View>

          {step === 1 ? (
            <>
              <Text style={styles.title}>Describe your workspace</Text>
              <Text style={styles.subtitle}>
                Tell TAR about your business or project. Jev will configure the right capability modules.
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>Workspace name *</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Northstar, Blue Bottle Cafe"
                  placeholderTextColor="#87938A"
                  style={styles.nameInput}
                  maxLength={48}
                  autoFocus
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Describe your work</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g. Restaurant: sales, products and a site"
                  placeholderTextColor="#87938A"
                  multiline
                  numberOfLines={3}
                  style={styles.descInput}
                />
                <Text style={styles.helper}>
                  Mention retail, kitchen, catalog, online store, or public website.
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Review capabilities</Text>
              <Text style={styles.subtitle}>
                Selected by Jev for {workspaceName}. Review and adjust as needed. You can change these anytime in Capabilities.
              </Text>

              <View style={styles.modulesCard}>
                <View style={styles.moduleRow}>
                  <View style={styles.moduleCopy}>
                    <View style={styles.moduleTitleRow}>
                      <Ionicons name="storefront-outline" size={18} color="#1E5631" />
                      <Text style={styles.moduleTitle}>Point of Sale (POS)</Text>
                    </View>
                    <Text style={styles.moduleDesc}>
                      Counter checkout, cash register, food/kitchen order management.
                    </Text>
                  </View>
                  <Switch
                    value={capabilities.pos}
                    onValueChange={(val) => setCapabilities((c) => ({ ...c, pos: val }))}
                    trackColor={{ false: '#DCE8E0', true: '#8DC99F' }}
                    thumbColor={capabilities.pos ? '#1E5631' : '#FFFFFF'}
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.moduleRow}>
                  <View style={styles.moduleCopy}>
                    <View style={styles.moduleTitleRow}>
                      <Ionicons name="bag-handle-outline" size={18} color="#1E5631" />
                      <Text style={styles.moduleTitle}>Commerce</Text>
                    </View>
                    <Text style={styles.moduleDesc}>
                      Catalog items, variants, purchasing, customer orders, invoices & payments.
                    </Text>
                  </View>
                  <Switch
                    value={capabilities.commerce}
                    onValueChange={(val) => setCapabilities((c) => ({ ...c, commerce: val }))}
                    trackColor={{ false: '#DCE8E0', true: '#8DC99F' }}
                    thumbColor={capabilities.commerce ? '#1E5631' : '#FFFFFF'}
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.moduleRow}>
                  <View style={styles.moduleCopy}>
                    <View style={styles.moduleTitleRow}>
                      <Ionicons name="globe-outline" size={18} color="#1E5631" />
                      <Text style={styles.moduleTitle}>Site Studio</Text>
                    </View>
                    <Text style={styles.moduleDesc}>
                      Generate and publish public website or online storefront.
                    </Text>
                  </View>
                  <Switch
                    value={capabilities.site}
                    onValueChange={(val) => setCapabilities((c) => ({ ...c, site: val }))}
                    trackColor={{ false: '#DCE8E0', true: '#8DC99F' }}
                    thumbColor={capabilities.site ? '#1E5631' : '#FFFFFF'}
                  />
                </View>
              </View>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          {step === 1 ? (
            <>
              <Pressable
                onPress={() => void nextStep()}
                disabled={analyzing || submitting}
                style={[styles.create, (analyzing || submitting) && styles.disabled]}
              >
                {analyzing ? (
                  <View style={styles.creating}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.createText}>Matching with Jev…</Text>
                  </View>
                ) : (
                  <Text style={styles.createText}>Next: Review capabilities ›</Text>
                )}
              </Pressable>
              {canClose ? (
                <Pressable onPress={close} disabled={analyzing || submitting} style={styles.cancel}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <>
              <Pressable
                onPress={() => void create()}
                disabled={submitting}
                style={[styles.create, submitting && styles.disabled]}
              >
                {submitting ? (
                  <View style={styles.creating}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.createText}>Saving workspace…</Text>
                  </View>
                ) : (
                  <Text style={styles.createText}>Save workspace</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => setStep(1)}
                disabled={submitting}
                style={styles.cancel}
              >
                <Text style={styles.cancelText}>‹ Back to details</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EEF5F1' },
  content: { flexGrow: 1, paddingHorizontal: 24 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#DCEDE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadge: {
    backgroundColor: '#DCEDE2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  stepBadgeText: { fontSize: 11, fontWeight: '800', color: '#1E5631', letterSpacing: 0.8 },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: '#163A23',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5C7163',
    marginTop: 8,
    marginBottom: 24,
  },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#355142', marginBottom: 8 },
  nameInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DCE8E0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: '700',
    color: '#163A23',
  },
  descInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DCE8E0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#163A23',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helper: { fontSize: 12, color: '#6A8172', marginTop: 6 },
  modulesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCE8E0',
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  moduleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moduleCopy: { flex: 1, gap: 3 },
  moduleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moduleTitle: { fontSize: 15, fontWeight: '700', color: '#163A23' },
  moduleDesc: { fontSize: 12, lineHeight: 17, color: '#5C7163' },
  divider: { height: 1, backgroundColor: '#EEF5F1' },
  error: { color: '#B3261E', fontSize: 13, lineHeight: 18, marginTop: 4 },
  footer: {
    paddingTop: 14,
    paddingHorizontal: 22,
    borderTopWidth: 1,
    borderColor: '#DCE8E0',
    backgroundColor: '#F8FCF9',
    gap: 4,
  },
  create: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1E5631',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creating: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  disabled: { opacity: 0.6 },
  createText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  cancel: { height: 40, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#537060' },
});
