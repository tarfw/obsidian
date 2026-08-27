import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

import { ContentCard, PrimaryButton, SecondaryTextAction, tokens } from '@/components/ds';
import { tar, type WorkspaceBlueprintCatalog, type WorkspaceCategory, type WorkspaceOnboardingInput } from '@/lib/tar';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (subdomain: string, name: string) => Promise<void>;
  canClose: boolean;
  existingSubdomains?: string[];
  onOpenCredits?: () => void;
}

type StartingPoint = 'organise' | 'retail' | 'services' | 'project' | 'other';
type CategoryId = 'general' | 'retail' | 'services' | 'project' | 'personal';

const STARTING_POINTS: { id: StartingPoint; label: string; detail: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'organise', label: 'Keep work organised', detail: 'Tasks, notes and customers', icon: 'checkbox-outline' },
  { id: 'retail', label: 'Sell things', detail: 'Sales, orders and stock', icon: 'storefront-outline' },
  { id: 'services', label: 'Manage customers', detail: 'Bookings, customers and tasks', icon: 'people-outline' },
  { id: 'project', label: 'Plan a project', detail: 'Tasks and shared work', icon: 'git-network-outline' },
  { id: 'other', label: 'Something else', detail: 'A simple, flexible space', icon: 'grid-outline' },
];

const STARTER_CATEGORY: Record<StartingPoint, CategoryId> = {
  organise: 'general', retail: 'retail', services: 'services', project: 'project', other: 'general',
};

const FALLBACK_CATEGORIES: Record<CategoryId, WorkspaceCategory> = {
  general: { id: 'general', label: 'General workspace', icon: 'grid-outline', keywords: [], suggestedName: 'My Space', activities: ['tasks', 'customers', 'notes'], priorities: ['tasks.urgent', 'contacts.recent'], actions: ['task.create', 'contact.create', 'pipeline.create'] },
  retail: { id: 'retail', label: 'Shop or retail store', icon: 'storefront-outline', keywords: [], suggestedName: 'My Store', activities: ['sales', 'orders', 'inventory', 'customers'], priorities: ['sales.today', 'inventory.low', 'orders.upcoming'], actions: ['sale.create', 'product.create', 'inventory.view_low'] },
  services: { id: 'services', label: 'Service business', icon: 'briefcase-outline', keywords: [], suggestedName: 'My Business', activities: ['customers', 'bookings', 'tasks', 'projects'], priorities: ['tasks.urgent', 'bookings.upcoming', 'pipeline.active'], actions: ['task.create', 'contact.create', 'booking.create'] },
  project: { id: 'project', label: 'Project or team', icon: 'git-network-outline', keywords: [], suggestedName: 'My Project', activities: ['tasks', 'projects', 'team', 'notes'], priorities: ['tasks.urgent', 'pipeline.active', 'contacts.recent'], actions: ['task.create', 'pipeline.create', 'contact.create'] },
  personal: { id: 'personal', label: 'Something else', icon: 'grid-outline', keywords: [], suggestedName: 'My Space', activities: ['tasks', 'notes'], priorities: ['tasks.urgent'], actions: ['task.create', 'contact.create'] },
};

function slugify(input: string): string {
  return input.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

export default function CreateWorkspace({ visible, onClose, onSuccess, canClose, existingSubdomains = [], onOpenCredits }: Props) {
  const insets = useSafeAreaInsets();
  const [catalog, setCatalog] = useState<WorkspaceBlueprintCatalog | null>(null);
  const [startingPoint, setStartingPoint] = useState<StartingPoint>('organise');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [needsCredits, setNeedsCredits] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    tar.workspaceBlueprints().then((data) => {
      if (!cancelled) setCatalog(data);
    }).catch(() => {
      // The general starter keeps creation available during a catalogue outage.
    });
    return () => { cancelled = true; };
  }, [visible]);

  const category = useMemo(() => {
    const categoryId = STARTER_CATEGORY[startingPoint];
    return catalog?.categories.find((item) => item.id === categoryId) || FALLBACK_CATEGORIES[categoryId];
  }, [catalog, startingPoint]);
  const workspaceName = name.trim() || 'My Space';
  const slug = useMemo(() => {
    const base = slugify(workspaceName) || 'my-space';
    if (!existingSubdomains.includes(base)) return base;
    let suffix = 2;
    while (existingSubdomains.includes(`${base}-${suffix}`)) suffix += 1;
    return `${base}-${suffix}`;
  }, [workspaceName, existingSubdomains]);

  const close = () => {
    if (submitting || !canClose) return;
    setStartingPoint('organise');
    setName('');
    setSubmitError(null);
    setNeedsCredits(false);
    onClose();
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setNeedsCredits(false);
    try {
      const onboarding: WorkspaceOnboardingInput = {
        category: category.id,
        activities: category.activities,
        priorities: category.priorities.slice(0, 3),
        actions: category.actions.slice(0, 3),
        audience: STARTER_CATEGORY[startingPoint] === 'project' ? 'team' : 'solo',
      };
      await tar.createWorkspace({ name: workspaceName, subdomain: slug, onboarding });
      await SecureStore.setItemAsync('active_workspace_subdomain', slug).catch(() => null);
      await onSuccess(slug, workspaceName);
      setStartingPoint('organise');
      setName('');
    } catch (cause: any) {
      const credits = cause?.status === 402 || /not enough credits/i.test(cause?.message || '');
      setNeedsCredits(credits);
      setSubmitError(credits ? 'You need 100 credits to create a new space.' : cause?.message || 'Your space could not be created. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) + 8 }]}>
          <Pressable onPress={close} disabled={submitting || !canClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close create space">
            <Ionicons name="arrow-back" size={20} color={tokens.color.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>New space</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Start with a simple space</Text>
          <Text style={styles.subtitle}>Choose a starting point if it helps. You can change everything later.</Text>

          <ContentCard>
            <Text style={styles.fieldLabel}>Name your space <Text style={styles.optional}>optional</Text></Text>
            <TextInput value={name} onChangeText={setName} placeholder="My Space" placeholderTextColor={tokens.color.inkFaint} style={styles.nameInput} maxLength={48} returnKeyType="done" accessibilityLabel="Space name" />
            <Text style={styles.fieldMeta}>Its address will be {slug}.</Text>
          </ContentCard>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>What are you starting with?</Text>
            <Text style={styles.fieldMeta}>Pick one, or keep the general space selected.</Text>
            <View style={styles.optionsList}>
              {STARTING_POINTS.map((option) => {
                const selected = startingPoint === option.id;
                return (
                  <Pressable key={option.id} onPress={() => setStartingPoint(option.id)} style={({ pressed }) => [styles.optionRow, selected && styles.optionRowSelected, pressed && styles.pressed]} accessibilityRole="radio" accessibilityState={{ selected }}>
                    <View style={[styles.optionIcon, selected && styles.optionIconSelected]}><Ionicons name={option.icon} size={18} color={selected ? tokens.color.accentInk : tokens.color.inkSoft} /></View>
                    <View style={styles.optionText}><Text style={styles.optionLabel}>{option.label}</Text><Text style={styles.optionDetail}>{option.detail}</Text></View>
                    <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? tokens.color.ink : tokens.color.inkFaint} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          {submitError ? <View style={styles.error}>
            <Ionicons name="alert-circle-outline" size={18} color={tokens.color.danger} />
            <Text style={styles.errorText}>{submitError}</Text>
            {needsCredits && onOpenCredits ? <Pressable onPress={onOpenCredits}><Text style={styles.creditsLink}>Add credits</Text></Pressable> : null}
          </View> : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <PrimaryButton label="Create space" onPress={submit} busy={submitting} />
          <SecondaryTextAction label="Cancel" onPress={close} disabled={submitting} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.color.surfaceSunk },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: tokens.spacing.lg, paddingBottom: tokens.spacing.sm },
  closeButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.color.surface, borderWidth: 1, borderColor: tokens.color.borderSoft },
  headerTitle: { ...tokens.type.bodyStrong, color: tokens.color.ink },
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.lg },
  title: { ...tokens.type.headingXl, color: tokens.color.ink },
  subtitle: { ...tokens.type.body, color: tokens.color.inkMuted },
  section: { gap: tokens.spacing.sm },
  fieldLabel: { ...tokens.type.label, color: tokens.color.inkMuted, textTransform: 'uppercase' },
  optional: { color: tokens.color.inkFaint, fontWeight: '500' },
  fieldMeta: { ...tokens.type.bodySm, color: tokens.color.inkMuted },
  nameInput: { ...tokens.type.headingLg, color: tokens.color.ink, paddingVertical: tokens.spacing.sm },
  optionsList: { gap: tokens.spacing.sm },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, padding: tokens.spacing.md, backgroundColor: tokens.color.surface, borderRadius: tokens.radius.md, borderWidth: 1, borderColor: tokens.color.borderSoft },
  optionRowSelected: { borderColor: tokens.color.ink, backgroundColor: tokens.color.surfaceSunken },
  optionIcon: { width: 36, height: 36, borderRadius: tokens.radius.md, backgroundColor: tokens.color.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  optionIconSelected: { backgroundColor: tokens.color.ink },
  optionText: { flex: 1, gap: 1 },
  optionLabel: { ...tokens.type.bodyStrong, color: tokens.color.ink },
  optionDetail: { ...tokens.type.bodySm, color: tokens.color.inkMuted },
  pressed: { opacity: 0.82 },
  footer: { borderTopWidth: 1, borderTopColor: tokens.color.borderSoft, paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.md, backgroundColor: tokens.color.surface, gap: tokens.spacing.sm },
  error: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm, backgroundColor: tokens.color.dangerBg, borderRadius: tokens.radius.md, padding: tokens.spacing.md },
  errorText: { ...tokens.type.bodySm, color: tokens.color.danger, flex: 1 },
  creditsLink: { ...tokens.type.label, color: tokens.color.ink, textDecorationLine: 'underline' },
});
