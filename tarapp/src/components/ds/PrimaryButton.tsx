import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from './tokens';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
}

export function PrimaryButton({ label, onPress, busy, disabled, trailingIcon = 'arrow-forward', fullWidth = true }: PrimaryButtonProps) {
  const isDisabled = busy || disabled;
  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.full,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!busy }}
      accessibilityLabel={label}
    >
      {busy ? (
        <ActivityIndicator color={tokens.color.accentInk} size="small" />
      ) : (
        <View style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Ionicons name={trailingIcon} size={18} color={tokens.color.accentInk} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    paddingHorizontal: tokens.spacing.xl,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: { alignSelf: 'stretch' },
  pressed: { backgroundColor: tokens.color.inkSoft },
  disabled: { opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  label: { color: tokens.color.accentInk, fontSize: 16, fontWeight: '800', letterSpacing: -0.1 },
});
