import React from 'react';
import { StyleSheet, Text, TextInput, View, TextInputProps } from 'react-native';
import { tokens } from './tokens';

interface InlinePromptProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  prompt: string;
  hint?: string;
}

export function InlinePrompt({ prompt, hint, value, onChangeText, ...rest }: InlinePromptProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.prompt}>{prompt}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={hint}
        placeholderTextColor={tokens.color.inkFaint}
        style={styles.input}
        accessibilityLabel={prompt}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.xs },
  prompt: { ...tokens.type.label, color: tokens.color.inkMuted, textTransform: 'uppercase' },
  input: {
    ...tokens.type.body,
    color: tokens.color.ink,
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.borderSoft,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
  },
});
