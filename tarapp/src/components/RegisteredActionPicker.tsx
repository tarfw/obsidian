import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tar, type WorkspaceBlueprintCatalog } from '@/lib/tar';
import { tokens } from './ds/tokens';

interface RegisteredActionPickerProps {
  scope: string;
  selectedActionIds: string[];
  onChange: (selectedActionIds: string[]) => void;
  maxSelections?: number;
  catalogCache?: WorkspaceBlueprintCatalog | null;
}

interface ActionRow {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description?: string;
  target?: string;
}

const FALLBACK_ACTIONS: ActionRow[] = [
  { id: 'task.create', label: 'Create task', icon: 'checkbox-outline' },
  { id: 'contact.create', label: 'Add contact', icon: 'person-add-outline' },
  { id: 'pipeline.create', label: 'Start a pipeline', icon: 'git-network-outline' },
  { id: 'sale.create', label: 'Record sale', icon: 'receipt-outline', target: 'quick-pos' },
  { id: 'product.create', label: 'Add product', icon: 'cube-outline' },
  { id: 'order.create', label: 'Add order', icon: 'bag-add-outline' },
  { id: 'inventory.view_low', label: 'Check stock', icon: 'cube-outline', target: 'stock-sheet' },
  { id: 'booking.create', label: 'Add booking', icon: 'calendar-outline' },
];

export function RegisteredActionPicker({ scope: _scope, selectedActionIds, onChange, maxSelections = 3, catalogCache }: RegisteredActionPickerProps) {
  const [fetched, setFetched] = useState<WorkspaceBlueprintCatalog | null>(null);
  const [loading, setLoading] = useState(catalogCache == null);

  useEffect(() => {
    if (catalogCache) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    tar.workspaceBlueprints()
      .then((data) => {
        if (cancelled) return;
        setFetched(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFetched(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [catalogCache]);

  const catalog = catalogCache ?? fetched;

  const actions: ActionRow[] = useMemo(() => {
    if (!catalog?.actions?.length) return FALLBACK_ACTIONS;
    return catalog.actions.map((a) => ({
      id: a.id,
      label: a.label,
      icon: (a.icon as keyof typeof Ionicons.glyphMap) || 'flash-outline',
      target: a.target,
    }));
  }, [catalog]);

  const toggle = (id: string) => {
    if (selectedActionIds.includes(id)) {
      onChange(selectedActionIds.filter((item) => item !== id));
      return;
    }
    if (selectedActionIds.length >= maxSelections) {
      onChange([...selectedActionIds.slice(1), id]);
      return;
    }
    onChange([...selectedActionIds, id]);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={tokens.color.ink} size="small" />
        <Text style={styles.loadingLabel}>Loading actions…</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.hint}>Choose up to {maxSelections}.</Text>
      <View style={styles.list}>
        {actions.map((action) => {
          const isSelected = selectedActionIds.includes(action.id);
          return (
            <Pressable
              key={action.id}
              onPress={() => toggle(action.id)}
              style={({ pressed }) => [styles.row, isSelected && styles.rowSelected, pressed && styles.pressed]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={action.label}
            >
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected ? <Ionicons name="checkmark" size={14} color={tokens.color.accentInk} /> : null}
              </View>
              <Ionicons name={action.icon} size={18} color={tokens.color.inkSoft} />
              <Text style={styles.rowLabel}>{action.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { ...tokens.type.bodySm, color: tokens.color.inkMuted, marginBottom: tokens.spacing.sm },
  list: { gap: tokens.spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.borderSoft,
    backgroundColor: tokens.color.surface,
  },
  rowSelected: { backgroundColor: tokens.color.ink, borderColor: tokens.color.ink },
  pressed: { opacity: 0.85 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: tokens.radius.sm,
    borderWidth: 1.5,
    borderColor: tokens.color.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.surface,
  },
  checkboxSelected: { backgroundColor: tokens.color.accent, borderColor: tokens.color.accent },
  rowLabel: { ...tokens.type.body, color: tokens.color.ink, flex: 1 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm, paddingVertical: tokens.spacing.lg },
  loadingLabel: { ...tokens.type.bodySm, color: tokens.color.inkMuted },
});
