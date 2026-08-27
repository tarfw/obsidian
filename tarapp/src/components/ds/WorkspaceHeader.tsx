import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from './tokens';

interface WorkspaceHeaderProps {
  title: string;
  subtitle?: string;
  onOpenSwitcher?: () => void;
  onRename?: () => void;
  busy?: boolean;
}

export function WorkspaceHeader({ title, subtitle, onOpenSwitcher, onRename, busy }: WorkspaceHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          onPress={onOpenSwitcher}
          disabled={!onOpenSwitcher}
          style={({ pressed }) => [styles.titlePressable, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Open workspace switcher. Current: ${title}`}
        >
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </Pressable>
        <View style={styles.actions}>
          {onRename ? (
            <Pressable
              onPress={onRename}
              style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Rename workspace"
            >
              <Text style={styles.editLabel}>Edit</Text>
            </Pressable>
          ) : null}
          {onOpenSwitcher ? (
            <Pressable
              onPress={onOpenSwitcher}
              style={({ pressed }) => [styles.chevron, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Open workspace switcher"
            >
              <Ionicons name="chevron-down" size={20} color={tokens.color.ink} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {busy ? <Text style={styles.busy}>Preparing…</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.md, paddingBottom: tokens.spacing.sm, gap: tokens.spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md },
  titlePressable: { flex: 1, gap: 2 },
  pressed: { opacity: 0.6 },
  title: { ...tokens.type.heading, color: tokens.color.ink },
  subtitle: { ...tokens.type.bodySm, color: tokens.color.inkMuted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  editBtn: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.color.borderSoft,
  },
  editLabel: { ...tokens.type.label, color: tokens.color.ink },
  chevron: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.surfaceSunk,
  },
  busy: { ...tokens.type.bodySm, color: tokens.color.inkMuted },
});
