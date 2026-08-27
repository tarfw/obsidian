import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SectionProps } from '../ComponentRegistry';

export default function TimelineFeed({ props, designTokens, data = [] }: SectionProps) {
  const title = props?.title || 'Timeline Feed';
  const colors = designTokens?.colors || {};
  const rounded = designTokens?.rounded || {};
  const spacing = designTokens?.spacing || {};

  return (
    <View style={[styles.container, { marginBottom: spacing.lg || 16 }]}>
      <Text style={[styles.title, { color: colors.primary || '#0f172a', marginBottom: spacing.sm || 8 }]}>
        {title}
      </Text>
      {data.length === 0 ? (
        <Text style={[styles.empty, { color: '#94a3b8' }]}>No timeline activity</Text>
      ) : (
        <View style={styles.list}>
          {data.map((item: any, idx: number) => (
            <View
              key={item.id || idx}
              style={[
                styles.row,
                {
                  backgroundColor: '#fff',
                  borderRadius: rounded.sm || 8,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  padding: spacing.sm || 10,
                },
              ]}
            >
              <Text style={styles.rowTitle}>{item.title || item.name || 'Activity'}</Text>
              {item.subtitle && <Text style={styles.rowSub}>{item.subtitle}</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  title: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { fontSize: 12, padding: 8, color: '#94a3b8' },
  list: { gap: 6 },
  row: {},
  rowTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  rowSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
});
