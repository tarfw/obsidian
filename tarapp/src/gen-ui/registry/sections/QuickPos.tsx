import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import type { SectionProps } from '../ComponentRegistry';

export interface PosTable {
  id: string;
  num: number;
  status: 'free' | 'occupied' | 'billing';
  orderTotal?: number;
  itemsCount?: number;
}

const INITIAL_TABLES: PosTable[] = [
  { id: 'T1', num: 1, status: 'free', orderTotal: 0, itemsCount: 0 },
  { id: 'T2', num: 2, status: 'free', orderTotal: 0, itemsCount: 0 },
  { id: 'T3', num: 3, status: 'occupied', orderTotal: 42.5, itemsCount: 2 },
  { id: 'T4', num: 4, status: 'free', orderTotal: 0, itemsCount: 0 },
  { id: 'T5', num: 5, status: 'free', orderTotal: 0, itemsCount: 0 },
  { id: 'T6', num: 6, status: 'occupied', orderTotal: 65.0, itemsCount: 3 },
  { id: 'T7', num: 7, status: 'free', orderTotal: 0, itemsCount: 0 },
  { id: 'T8', num: 8, status: 'occupied', orderTotal: 80.0, itemsCount: 4 },
  { id: 'T9', num: 9, status: 'free', orderTotal: 0, itemsCount: 0 },
  { id: 'T10', num: 10, status: 'free', orderTotal: 0, itemsCount: 0 },
  { id: 'T11', num: 11, status: 'occupied', orderTotal: 102.5, itemsCount: 5 },
  { id: 'T12', num: 12, status: 'free', orderTotal: 0, itemsCount: 0 },
];

export default function QuickPos({ props, data, onExecuteAction }: SectionProps) {
  const { width } = useWindowDimensions();
  const screenWidth = width || 360;

  // Compute 4-column circle size safely
  const availableWidth = Math.max(screenWidth - 32, 280);
  const circleSize = Math.min(Math.floor((availableWidth - 36) / 4), 68);

  const [tables, setTables] = useState<PosTable[]>(() => {
    if (Array.isArray(data) && data.length > 0) {
      return data as PosTable[];
    }
    return INITIAL_TABLES;
  });

  const activeCount = tables.filter((t) => t.status === 'occupied' || t.status === 'billing').length;
  const totalOrders = 125;

  const handleTablePress = (table: PosTable) => {
    // Toggle table status safely on tap
    setTables((prev) =>
      prev.map((t) =>
        t.id === table.id
          ? {
              ...t,
              status: t.status === 'occupied' ? 'free' : 'occupied',
              orderTotal: t.status === 'occupied' ? 0 : 50,
            }
          : t
      )
    );

    if (onExecuteAction) {
      onExecuteAction('select_table', { tableId: table.id, tableNum: table.num }).catch(() => null);
    }
  };

  return (
    <View style={styles.container}>
      {/* 4 Columns x 3 Rows Grid */}
      <View style={styles.grid}>
        {tables.map((table) => {
          const isOccupied = table.status === 'occupied' || table.status === 'billing';

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
                {table.num}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Summary Footer */}
      <View style={styles.footerRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{activeCount}</Text>
          <Text style={styles.statLabel}>Tables</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalOrders}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    columnGap: 10,
    paddingHorizontal: 2,
    paddingBottom: 20,
  },
  circleNode: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleFree: {
    backgroundColor: '#f1f5f9',
  },
  circleOccupied: {
    backgroundColor: '#0f172a',
  },
  circleText: {
    fontSize: 18,
    fontWeight: '700',
  },
  textFree: {
    color: '#334155',
  },
  textOccupied: {
    color: '#ffffff',
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -1,
    lineHeight: 40,
  },
  statLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#475569',
  },
});
