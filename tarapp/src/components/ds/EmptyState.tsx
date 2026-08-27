import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from './tokens';

interface EmptyStateProps {
  iconName?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ iconName = 'document-outline', title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconBox}>
        <Ionicons name={iconName} size={22} color={tokens.color.inkMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: tokens.spacing.lg, gap: tokens.spacing.sm },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...tokens.type.bodyStrong, color: tokens.color.ink, textAlign: 'center' },
  body: { ...tokens.type.bodySm, color: tokens.color.inkMuted, textAlign: 'center' },
  action: {
    marginTop: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.color.borderSoft,
  },
  pressed: { backgroundColor: tokens.color.pressedOverlay },
  actionLabel: { ...tokens.type.label, color: tokens.color.ink },
});
