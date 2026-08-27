import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SectionProps } from '../ComponentRegistry';

export interface StockItem {
  id: string;
  name: string;
  unit: string;
  stock: number;
  threshold?: number;
  reorderPrice?: number;
  category?: string;
}

export default function StockSheet({ props, designTokens, data = [], onExecuteAction, onOpenScreen }: SectionProps) {
  const title = props?.title || 'Stock & Inventory';
  const subtitle = props?.subtitle || 'Tap - / + to adjust count';
  const rounded = designTokens?.rounded || {};

  const itemsProp = props?.items;
  const initialItems: StockItem[] = useMemo(() => {
    const sourceItems = Array.isArray(data) && data.length > 0
      ? data
      : (Array.isArray(itemsProp) ? itemsProp : []);

    return sourceItems.map((it: any) => ({
      id: it.id || it.name || 'item',
      name: it.title || it.name || it.data?.title || 'Item',
      unit: it.unit || it.data?.unit || 'units',
      stock: typeof it.stock === 'number' ? it.stock : (typeof it.value === 'number' ? it.value : (it.data?.qty || 0)),
      threshold: it.threshold || it.data?.threshold || 5,
      reorderPrice: it.reorderPrice || (it.price ? it.price * 5 : 25),
      category: it.category || it.data?.category || 'Stock',
    }));
  }, [data, itemsProp]);

  const [qtyDeltas, setQtyDeltas] = useState<Record<string, number>>({});

  const items = useMemo(() => {
    return initialItems.map((item) => {
      const delta = qtyDeltas[item.id] || 0;
      return { ...item, stock: Math.max(0, item.stock + delta) };
    });
  }, [initialItems, qtyDeltas]);

  if (items.length === 0) {
    return (
      <View style={[styles.cardContainer, { borderRadius: rounded.lg || 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={() => onOpenScreen ? onOpenScreen('stock-adjust') : onExecuteAction?.('inventory.adjust', {})}
          >
            <Ionicons name="add-outline" size={14} color="#ffffff" />
            <Text style={styles.adjustBtnText}>Adjust Stock</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={24} color="#94a3b8" />
          <Text style={styles.emptyStateText}>All stock levels normal · No low stock alerts</Text>
        </View>
      </View>
    );
  }

  const updateQuantity = async (itemId: string, delta: number) => {
    setQtyDeltas((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + delta,
    }));

    try {
      if (onExecuteAction) {
        const item = items.find((i) => i.id === itemId);
        const newQty = Math.max(0, (item?.stock || 0) + delta);
        await onExecuteAction('inventory.adjust', {
          itemId,
          name: item?.name,
          quantity: newQty,
          delta,
        });
      }
    } catch (e) {
      console.warn('[StockSheet] update error:', e);
    }
  };

  return (
    <View style={[styles.cardContainer, { borderRadius: rounded.lg || 16 }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <TouchableOpacity
          style={styles.adjustBtn}
          onPress={() => onOpenScreen ? onOpenScreen('stock-adjust') : onExecuteAction?.('inventory.adjust', {})}
        >
          <Ionicons name="options-outline" size={13} color="#ffffff" />
          <Text style={styles.adjustBtnText}>Manage</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.itemList}>
        {items.slice(0, 4).map((item) => {
          const isLow = item.stock <= (item.threshold || 5);
          return (
            <View key={item.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  {isLow && (
                    <View style={styles.lowBadge}>
                      <Text style={styles.lowBadgeText}>Low</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.itemCategory}>{item.category}</Text>
              </View>

              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => updateQuantity(item.id, -1)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={16} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.stockValue}>{item.stock}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => updateQuantity(item.id, 1)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={16} color="#0f172a" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  adjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  adjustBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  itemList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  lowBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  lowBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#dc2626',
  },
  itemCategory: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
    gap: 6,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 6,
  },
  stockValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    minWidth: 20,
    textAlign: 'center',
  },
});
