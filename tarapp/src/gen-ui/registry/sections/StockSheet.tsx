import React, { useState } from 'react';
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

export default function StockSheet({ props, designTokens, data = [], onExecuteAction }: SectionProps) {
  const title = props?.title || 'Milk & Dairy Stock';
  const subtitle = props?.subtitle || 'Tap - / + to adjust or order restock';
  const rounded = designTokens?.rounded || {};

  const defaultItems: StockItem[] = [
    { id: 'item-1', name: 'Whole Milk (1L)', unit: 'units', stock: 4, threshold: 6, reorderPrice: 16.00, category: 'Dairy' },
    { id: 'item-2', name: 'Salted Butter (500g)', unit: 'packs', stock: 12, threshold: 5, reorderPrice: 24.00, category: 'Dairy' },
    { id: 'item-3', name: 'Cheddar Cheese Block', unit: 'kg', stock: 2, threshold: 3, reorderPrice: 32.00, category: 'Dairy' },
    { id: 'item-4', name: 'Heavy Cream (500ml)', unit: 'bottles', stock: 8, threshold: 4, reorderPrice: 18.00, category: 'Dairy' },
  ];

  const initialItems: StockItem[] = (data.length > 0 ? data : (props?.items || defaultItems)).map((it: any) => ({
    id: it.id || it.name,
    name: it.title || it.name || 'Item',
    unit: it.unit || 'units',
    stock: typeof it.stock === 'number' ? it.stock : (typeof it.value === 'number' ? it.value : 0),
    threshold: it.threshold || 5,
    reorderPrice: it.reorderPrice || (it.price ? it.price * 5 : 25),
    category: it.category || 'Stock',
  }));

  const [items, setItems] = useState<StockItem[]>(initialItems);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  const updateQuantity = async (itemId: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newQty = Math.max(0, item.stock + delta);
          return { ...item, stock: newQty };
        }
        return item;
      })
    );

    try {
      if (onExecuteAction) {
        const item = items.find((i) => i.id === itemId);
        const newQty = Math.max(0, (item?.stock || 0) + delta);
        await onExecuteAction('adjust_stock', {
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

  const handleOrderSupplier = async (item?: StockItem) => {
    setBusyItem(item ? item.id : 'all');
    try {
      if (onExecuteAction) {
        await onExecuteAction('create_po', {
          supplier: 'Dairy Direct',
          items: item ? [item] : items.filter((i) => i.stock <= (i.threshold || 5)),
          total: item ? item.reorderPrice : 32.00,
        });
      }
    } catch (e) {
      console.warn('[StockSheet] order error:', e);
    } finally {
      setBusyItem(null);
    }
  };

  const lowStockCount = items.filter((i) => i.stock <= (i.threshold || 5)).length;

  return (
    <View style={styles.container}>
      {/* Title Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {lowStockCount > 0 && (
          <View style={styles.lowBadge}>
            <Ionicons name="warning-outline" size={12} color="#b45309" />
            <Text style={styles.lowBadgeText}>{lowStockCount} Low</Text>
          </View>
        )}
      </View>

      {/* Stock Items List */}
      <View style={styles.itemList}>
        {items.map((item) => {
          const isLow = item.stock <= (item.threshold || 5);

          return (
            <View
              key={item.id}
              style={[
                styles.itemCard,
                { borderRadius: rounded.md || 16 },
                isLow && styles.itemCardLow,
              ]}
            >
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCategory}>
                  {item.category} · Threshold: {item.threshold} {item.unit}
                </Text>
              </View>

              {/* Stepper */}
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => updateQuantity(item.id, -1)}
                  style={styles.stepperBtn}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </TouchableOpacity>

                <View style={styles.qtyContainer}>
                  <Text style={[styles.qtyText, isLow && styles.qtyTextLow]}>
                    {item.stock}
                  </Text>
                  <Text style={styles.unitText}>{item.unit}</Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => updateQuantity(item.id, 1)}
                  style={styles.stepperBtn}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Supplier Order CTA */}
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={busyItem !== null}
        onPress={() => handleOrderSupplier()}
        style={[styles.orderBtn, { borderRadius: rounded.md || 14 }]}
      >
        <Ionicons name="cart-outline" size={18} color="#ffffff" />
        <Text style={styles.orderBtnText}>
          {busyItem !== null ? 'Ordering...' : 'Order Low Stock from Supplier ($32)'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  lowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lowBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  itemList: {
    gap: 8,
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemCardLow: {
    borderColor: '#fde68a',
    backgroundColor: '#fffdf5',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemCategory: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 2,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepperBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  qtyContainer: {
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 46,
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  qtyTextLow: {
    color: '#dc2626',
  },
  unitText: {
    fontSize: 9,
    color: '#64748b',
    marginTop: -2,
  },
  orderBtn: {
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  orderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
