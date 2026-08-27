import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { SectionProps } from '../ComponentRegistry';

export default function CatalogGrid({ props, designTokens, data = [], onExecuteAction }: SectionProps) {
  const title = props?.title;
  const columns = props?.columns || 2;
  const emptyMessage = props?.emptyMessage;
  const colors = designTokens?.colors || {};
  const rounded = designTokens?.rounded || {};
  const spacing = designTokens?.spacing || {};

  return (
    <View style={[styles.container, { marginBottom: spacing.lg || 16 }]}>
      {title && (
        <Text style={[styles.title, { color: colors.primary || '#0f172a', marginBottom: spacing.sm || 8 }]}>
          {title}
        </Text>
      )}
      {data.length === 0 ? (
        <Text style={[styles.empty, { color: '#94a3b8' }]}>{emptyMessage || 'No products in catalog'}</Text>
      ) : (
        <View style={[styles.grid, { gap: spacing.sm || 8 }]}>
          {data.map((item: any, idx: number) => {
            const itemTitle = item.title || item.name || item.data?.title || 'Product';
            const price = item.price || item.data?.price || item.value || null;
            return (
              <TouchableOpacity
                key={item.id || idx}
                activeOpacity={0.75}
                onPress={() => onExecuteAction?.('product.select', { item })}
                style={[
                  styles.card,
                  {
                    flex: 1 / columns,
                    backgroundColor: '#fff',
                    borderRadius: rounded.md || 12,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    padding: spacing.md || 12,
                  },
                ]}
              >
                <Text style={styles.itemName} numberOfLines={1}>
                  {itemTitle}
                </Text>
                {price !== null && (
                  <Text style={styles.itemPrice}>
                    ₹{Number(price).toLocaleString()}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  title: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { fontSize: 13, padding: 12, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { marginBottom: 8 },
  itemName: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  itemPrice: { fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 4 },
});
