import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from './tokens';

interface FirstActionProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  onPress: () => void;
  fullWidth?: boolean;
}

export function FirstAction({ icon = 'arrow-forward-circle-outline', title, body, onPress, fullWidth = true }: FirstActionProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.base, fullWidth && styles.full, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={22} color={tokens.color.ink} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={tokens.color.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.color.borderSoft,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
  },
  full: { alignSelf: 'stretch' },
  pressed: { backgroundColor: tokens.color.pressedOverlay },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  title: { ...tokens.type.bodyStrong, color: tokens.color.ink },
  body: { ...tokens.type.bodySm, color: tokens.color.inkMuted },
});
