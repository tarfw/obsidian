import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SectionProps } from '../ComponentRegistry';

export interface PosTableItem {
  id: string;
  num: number | string;
  title?: string;
  status: 'free' | 'occupied' | 'billing';
  orderTotal?: number;
  itemsCount?: number;
}

export default function QuickPos({ props, data = [], designTokens, onExecuteAction, onOpenScreen }: SectionProps) {
  const { width } = useWindowDimensions();
  const rounded = designTokens?.rounded || {};
  const screenWidth = width || 360;

  const availableWidth = Math.max(screenWidth - 32, 280);
  const circleSize = Math.min(Math.floor((availableWidth - 36) / 4), 68);

  const tables: PosTableItem[] = useMemo(() => {
    if (Array.isArray(data) && data.length > 0) {
      return data.map((t: any, index: number) => ({
        id: t.id || `T${index + 1}`,
        num: t.num || t.table_no || t.title || index + 1,
        title: t.title || `Table ${index + 1}`,
        status: t.status === 'occupied' || t.status === 'billing' ? t.status : 'free',
        orderTotal: Number(t.orderTotal || t.amount || 0),
        itemsCount: Number(t.itemsCount || t.items_count || 0),
      }));
    }
    if (Array.isArray(props?.tables) && props.tables.length > 0) {
      return props.tables;
    }
    return [];
  }, [data, props?.tables]);

  const [activeTables, setActiveTables] = useState<Record<string, boolean>>({});

  const occupiedCount = useMemo(() => {
    return tables.filter((t) => (activeTables[t.id] !== undefined ? activeTables[t.id] : t.status === 'occupied')).length;
  }, [tables, activeTables]);

  const handleTablePress = (table: PosTableItem) => {
    const isCurrentlyOccupied = activeTables[table.id] !== undefined ? activeTables[table.id] : table.status === 'occupied';
    const nextState = !isCurrentlyOccupied;
    setActiveTables((prev) => ({ ...prev, [table.id]: nextState }));

    if (onOpenScreen) {
      onOpenScreen('pos-sale', { tableId: table.id, tableNum: table.num });
    } else if (onExecuteAction) {
      onExecuteAction('pos.select_table', { tableId: table.id, tableNum: table.num }).catch(() => null);
    }
  };

  const handleQuickSale = () => {
    if (onOpenScreen) {
      onOpenScreen('pos-sale', {});
    } else if (onExecuteAction) {
      onExecuteAction('sale.create', {}).catch(() => null);
    }
  };

  if (tables.length === 0) {
    return (
      <View style={[styles.container, { borderRadius: rounded.lg || 16 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{props?.title || 'Quick POS'}</Text>
          <TouchableOpacity style={styles.newSaleBtn} onPress={handleQuickSale} activeOpacity={0.8}>
            <Ionicons name="receipt-outline" size={14} color="#ffffff" />
            <Text style={styles.newSaleBtnText}>New Sale</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={24} color="#94a3b8" />
          <Text style={styles.emptyText}>Quick billing ready · Tap New Sale to begin</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderRadius: rounded.lg || 16 }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{props?.title || 'POS Register & Tables'}</Text>
        <TouchableOpacity style={styles.newSaleBtn} onPress={handleQuickSale} activeOpacity={0.8}>
          <Ionicons name="receipt-outline" size={14} color="#ffffff" />
          <Text style={styles.newSaleBtnText}>New Sale</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {tables.slice(0, 12).map((table) => {
          const isOccupied = activeTables[table.id] !== undefined ? activeTables[table.id] : table.status === 'occupied';

          return (
            <TouchableOpacity
              key={table.id}
              activeOpacity={0.75}
              onPress={() => handleTablePress(table)}
              style={[
                styles.circleNode,
                {
                  width: circleSize,
                  height: circleSize,
                  borderRadius: Math.floor(circleSize / 2),
                },
                isOccupied ? styles.circleOccupied : styles.circleFree,
              ]}
            >
              <Text style={[styles.circleText, isOccupied ? styles.textOccupied : styles.textFree]}>
                {String(table.num)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footerRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{occupiedCount}</Text>
          <Text style={styles.statLabel}>Active Tables</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{tables.length}</Text>
          <Text style={styles.statLabel}>Total Floor</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 4,
  },
  headerRow: {
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
  newSaleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  newSaleBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  circleNode: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  circleFree: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  circleOccupied: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  circleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  textFree: {
    color: '#475569',
  },
  textOccupied: {
    color: '#ffffff',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
});
