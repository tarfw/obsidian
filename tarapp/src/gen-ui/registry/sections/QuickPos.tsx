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

export default function QuickPos({ props, designTokens, data = [], onExecuteAction }: SectionProps) {
  const rounded = designTokens?.rounded || {};
  const { width: screenWidth } = useWindowDimensions();

  // Calculate exact geometric circle size for 5 columns
  // Screen horizontal padding = 32, card padding = 32, gap between 5 circles = 4 * 10 = 40
  const availableWidth = Math.max(screenWidth - 64, 260);
  const circleSize = Math.min(Math.floor((availableWidth - 40) / 5), 58);

  // 20 tables (exact 4 rows of 5 tables each)
  const defaultTables: PosTable[] = Array.from({ length: 20 }, (_, i) => {
    const num = i + 1;
    const isOccupied = [4, 7, 11, 14, 17, 19].includes(num);
    return {
      id: `T${num}`,
      num,
      status: isOccupied ? 'occupied' : 'free',
      orderTotal: isOccupied ? Math.floor(20 + (num * 7.5)) : 0,
      itemsCount: isOccupied ? (num % 4) + 1 : 0,
    };
  });

  const [tables, setTables] = useState<PosTable[]>(
    data.length > 0 ? (data as any) : defaultTables
  );
  const [selectedTable, setSelectedTable] = useState<PosTable | null>(tables.find(t => t.status === 'occupied') || tables[0]);

  const activeCount = tables.filter((t) => t.status === 'occupied' || t.status === 'billing').length;
  const totalOrders = 125;

  const handleTablePress = (table: PosTable) => {
    setSelectedTable(table);
  };

  return (
    <View style={[styles.card, { borderRadius: rounded.lg || 24 }]}>
      {/* 5 Big Circles Per Row Grid */}
      <View style={styles.bubbleGrid}>
        {tables.map((table) => {
          const isOccupied = table.status === 'occupied' || table.status === 'billing';

          return (
            <TouchableOpacity
              key={table.id}
              activeOpacity={0.75}
              onPress={() => handleTablePress(table)}
              style={[
                styles.bubbleNode,
                {
                  width: circleSize,
                  height: circleSize,
                  borderRadius: Math.floor(circleSize / 2),
                },
                isOccupied ? styles.bubbleOccupied : styles.bubbleFree,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  isOccupied ? styles.bubbleTextOccupied : styles.bubbleTextFree,
                ]}
              >
                {table.num}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Big Typographic Bottom Summary Stats */}
      <View style={styles.bottomRow}>
        <View style={styles.statCol}>
          <Text style={styles.statNumber}>{activeCount}</Text>
          <Text style={styles.statLabel}>Tables</Text>
        </View>

        <View style={styles.statColRight}>
          <Text style={styles.statNumber}>{totalOrders}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#eff6ff', // Clean subtle light blue
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginVertical: 6,
  },
  bubbleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    columnGap: 8,
    paddingHorizontal: 2,
    paddingBottom: 18,
  },
  bubbleNode: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleFree: {
    backgroundColor: '#dbeafe',
  },
  bubbleOccupied: {
    backgroundColor: '#0f172a',
  },
  bubbleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  bubbleTextFree: {
    color: '#334155',
  },
  bubbleTextOccupied: {
    color: '#ffffff',
    fontWeight: '800',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
  },
  statCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  statColRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  statNumber: {
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
