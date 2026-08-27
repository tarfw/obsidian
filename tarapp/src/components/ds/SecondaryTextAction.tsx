import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { tokens } from './tokens';

interface SecondaryTextActionProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export function SecondaryTextAction({ label, onPress, disabled }: SecondaryTextActionProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [pressed && !disabled && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={label}
    >
      <Text style={[styles.label, disabled && styles.disabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    color: tokens.color.inkMuted,
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
    textDecorationColor: tokens.color.border,
    paddingVertical: tokens.spacing.sm,
    textAlign: 'center',
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.6 },
});
