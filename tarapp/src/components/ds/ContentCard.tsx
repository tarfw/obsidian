import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { tokens } from './tokens';

interface ContentCardProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  variant?: 'default' | 'sunken';
}

export function ContentCard({ title, subtitle, children, footer, style, contentStyle, variant = 'default' }: ContentCardProps) {
  return (
    <View style={[styles.card, variant === 'sunken' && styles.sunken, style]}>
      {(title || subtitle) && (
        <View style={styles.header}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      )}
      <View style={[styles.body, contentStyle]}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.color.borderSoft,
    padding: tokens.spacing.lg,
  },
  sunken: {
    backgroundColor: tokens.color.surfaceSunk,
    borderColor: tokens.color.border,
  },
  header: { marginBottom: tokens.spacing.md, gap: tokens.spacing.xs },
  title: { ...tokens.type.heading, color: tokens.color.ink },
  subtitle: { ...tokens.type.bodySm, color: tokens.color.inkMuted },
  body: { gap: tokens.spacing.md },
  footer: { marginTop: tokens.spacing.lg, gap: tokens.spacing.sm },
});
