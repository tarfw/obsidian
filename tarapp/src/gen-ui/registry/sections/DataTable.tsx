import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SectionProps } from '../ComponentRegistry';

export default function DataTable({ props, designTokens, data = [], onExecuteAction }: SectionProps) {
  const title = props?.title || (props?.type ? `${props.type.charAt(0).toUpperCase() + props.type.slice(1)} Records` : 'Data Records');
  const emptyMessage = props?.emptyMessage;
  const colors = designTokens?.colors || {};
  const rounded = designTokens?.rounded || {};
  const columns: string[] = props?.columns || ['name', 'category', 'price', 'stock'];
  const filterKey = props?.filter;

  const [searchQuery, setSearchQuery] = useState('');

  // Sample default data if none provided
  const defaultSampleData = [
    { id: '1', name: 'Whole Milk 1L', category: 'Dairy', price: 2.50, stock: 18, status: 'in_stock' },
    { id: '2', name: 'Almond Butter', category: 'Spreads', price: 6.80, stock: 8, status: 'in_stock' },
    { id: '3', name: 'Organic Eggs (12)', category: 'Poultry', price: 4.20, stock: 24, status: 'in_stock' },
    { id: '4', name: 'Sourdough Bread', category: 'Bakery', price: 3.50, stock: 5, status: 'low_stock' },
  ];

  const rawData = data && data.length > 0 ? data : (props?.data || defaultSampleData);

  const filteredData = useMemo(() => {
    return rawData.filter((row: any) => {
      let rowDataObj: any = {};
      if (typeof row.data === 'string') {
        try { rowDataObj = JSON.parse(row.data); } catch {}
      } else if (typeof row.data === 'object' && row.data !== null) {
        rowDataObj = row.data;
      }
      const itemTitle = row.title || row.name || rowDataObj.title || rowDataObj.name || row.id || '';
      const category = rowDataObj.category || row.category || row.type || '';
      const matchSearch = String(itemTitle).toLowerCase().includes(searchQuery.toLowerCase()) ||
                          String(category).toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [rawData, searchQuery]);

  const handleRowPress = (row: any) => {
    if (onExecuteAction) {
      onExecuteAction('select_row', { row, type: props?.type });
    }
  };

  return (
    <View style={styles.container}>
      {/* Title and Search Bar */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.countBadge}>{filteredData.length} entries</Text>
      </View>

      {/* Quick Search Filter */}
      <View style={[styles.searchBox, { borderRadius: rounded.sm || 10 }]}>
        <Ionicons name="search-outline" size={16} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter records..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Records Card List */}
      <View
        style={[
          styles.tableCard,
          {
            borderRadius: rounded.md || 16,
          },
        ]}
      >
        {filteredData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={28} color="#cbd5e1" />
            <Text style={styles.empty}>
              {emptyMessage || `No ${props?.type || 'records'} found`}
            </Text>
            {onExecuteAction && (
              <TouchableOpacity
                style={styles.addStarterBtn}
                onPress={() => onExecuteAction('create_item', { type: props?.type || 'item' })}
              >
                <Text style={styles.addStarterText}>
                  + Add {props?.type ? props.type.charAt(0).toUpperCase() + props.type.slice(1) : 'Record'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredData.map((row: any, idx: number) => {
            let rowDataObj: any = {};
            if (typeof row.data === 'string') {
              try { rowDataObj = JSON.parse(row.data); } catch {}
            } else if (typeof row.data === 'object' && row.data !== null) {
              rowDataObj = row.data;
            }

            const itemTitle = row.title || row.name || rowDataObj.title || rowDataObj.name || row.id;
            const price = rowDataObj.price ?? row.price;
            const stock = row.value ?? rowDataObj.stock ?? row.stock;
            const category = rowDataObj.category || row.category || row.type;
            const status = rowDataObj.status || row.status;

            return (
              <TouchableOpacity
                key={row.id || idx}
                activeOpacity={0.7}
                onPress={() => handleRowPress(row)}
                style={[
                  styles.row,
                  idx < filteredData.length - 1 && styles.rowDivider,
                ]}
              >
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {itemTitle}
                  </Text>
                  {category ? (
                    <Text style={styles.rowSubtitle} numberOfLines={1}>
                      {category} {status ? `· ${status}` : ''}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.rowMeta}>
                  {price !== undefined && (
                    <Text style={styles.rowPrice}>
                      ${typeof price === 'number' ? price.toFixed(2) : price}
                    </Text>
                  )}
                  {stock !== undefined && (
                    <Text style={styles.rowStock}>
                      Stock: {stock}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  countBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  empty: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  addStarterBtn: {
    marginTop: 6,
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addStarterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowMain: {
    flex: 1,
    marginRight: 10,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  rowMeta: {
    alignItems: 'flex-end',
  },
  rowPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  rowStock: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});
