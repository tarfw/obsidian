import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SectionProps } from '../ComponentRegistry';

export default function QuickActions({ props, designTokens, onExecuteAction, onOpenScreen }: SectionProps) {
  const title = props?.title || 'Quick Actions';
  const actions: Array<{ id: string; label: string; icon?: string; screen?: string }> = props?.actions || [
    { id: 'sale.create', label: 'New Sale', icon: 'receipt-outline', screen: 'pos-sale' },
    { id: 'inventory.adjust', label: 'Adjust Stock', icon: 'cube-outline', screen: 'stock-adjust' },
    { id: 'contact.create', label: 'Add Contact', icon: 'person-add-outline', screen: 'contact-add' },
  ];
  const colors = designTokens?.colors || {};
  const rounded = designTokens?.rounded || {};
  const spacing = designTokens?.spacing || {};

  return (
    <View style={[styles.container, { marginBottom: spacing.lg || 16 }]}>
      <Text style={[styles.title, { color: colors.primary || '#0f172a', marginBottom: spacing.sm || 8 }]}>
        {title}
      </Text>
      <View style={styles.grid}>
        {actions.map((act) => (
          <TouchableOpacity
            key={act.id}
            style={[
              styles.actionBtn,
              {
                backgroundColor: '#fff',
                borderRadius: rounded.md || 10,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                padding: spacing.sm || 10,
              },
            ]}
            onPress={() => {
              if (act.screen && onOpenScreen) {
                onOpenScreen(act.screen);
              } else if (onExecuteAction) {
                onExecuteAction(act.id, {});
              }
            }}
          >
            <Ionicons name={(act.icon as any) || 'flash-outline'} size={18} color="#0f172a" />
            <Text style={styles.actionText}>{act.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  title: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 120 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
});
