import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SectionProps } from '../ComponentRegistry';

export default function EntityNavigator({ props, designTokens, onExecuteAction }: SectionProps) {
  const title = props?.title || 'Navigate';
  const entities: string[] = props?.entities || ['contacts', 'inventory', 'orders', 'pipeline'];
  const colors = designTokens?.colors || {};
  const rounded = designTokens?.rounded || {};
  const spacing = designTokens?.spacing || {};

  return (
    <View style={[styles.container, { marginBottom: spacing.lg || 16 }]}>
      <Text style={[styles.title, { color: colors.primary || '#0f172a', marginBottom: spacing.sm || 8 }]}>
        {title}
      </Text>
      <View style={styles.row}>
        {entities.map((ent) => (
          <TouchableOpacity
            key={ent}
            style={[
              styles.btn,
              {
                backgroundColor: '#fff',
                borderRadius: rounded.md || 10,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                padding: spacing.sm || 8,
              },
            ]}
            onPress={() => onExecuteAction?.('navigate.entity', { entity: ent })}
          >
            <Ionicons name="folder-outline" size={16} color="#64748b" />
            <Text style={styles.label}>{ent.charAt(0).toUpperCase() + ent.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  title: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 100 },
  label: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
});
