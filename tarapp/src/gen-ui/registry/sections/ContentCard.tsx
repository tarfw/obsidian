import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import type { SectionProps } from '../ComponentRegistry';

export default function ContentCard({ props, designTokens, onExecuteAction }: SectionProps) {
  const title = props?.title;
  const body = props?.body;
  const imageUrl = props?.imageUrl;
  const ctaLabel = props?.ctaLabel;
  const ctaAction = props?.ctaAction;
  const colors = designTokens?.colors || {};
  const rounded = designTokens?.rounded || {};
  const spacing = designTokens?.spacing || {};

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: '#fff',
          borderRadius: rounded.md || 12,
          borderWidth: 1,
          borderColor: '#e2e8f0',
          padding: spacing.md || 12,
          marginBottom: spacing.lg || 16,
        },
      ]}
    >
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          style={[styles.image, { borderRadius: rounded.sm || 8 }]}
          resizeMode="cover"
        />
      )}
      {title && <Text style={[styles.title, { color: colors.primary || '#0f172a' }]}>{title}</Text>}
      {body && <Text style={[styles.body, { color: '#475569' }]}>{body}</Text>}
      {ctaLabel && (
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: colors.primary || '#0f172a' }]}
          onPress={() => onExecuteAction?.(ctaAction || 'content.action', {})}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
  },
  image: {
    width: '100%',
    height: 140,
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  ctaBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
