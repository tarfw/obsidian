import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SectionProps } from '../ComponentRegistry';

export default function DataTable({ props, designTokens, data = [], onExecuteAction, onOpenScreen }: SectionProps) {
  const title = props?.title || (props?.type ? `${props.type.charAt(0).toUpperCase() + props.type.slice(1)} Records` : 'Data Records');
  const emptyMessage = props?.emptyMessage;
  const rounded = designTokens?.rounded || {};

  const [searchQuery, setSearchQuery] = useState('');
  const rawData = data && data.length > 0 ? data : (props?.data || []);

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
      onExecuteAction('row.select', { row, type: props?.type });
    }
  };

  return (
    <View style={[styles.container, { borderRadius: rounded.lg || 16 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.countBadge}>{filteredData.length} entries</Text>
      </View>

      {rawData.length > 3 && (
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={14} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Filter records..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={14} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {filteredData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={24} color="#cbd5e1" />
          <Text style={styles.emptyText}>
            {emptyMessage || `No ${props?.type || 'records'} found in live database`}
          </Text>
        </View>
      ) : (
        <View style={styles.recordList}>
          {filteredData.slice(0, 5).map((row: any, idx: number) => {
            let rowDataObj: any = {};
            if (typeof row.data === 'string') {
              try { rowDataObj = JSON.parse(row.data); } catch {}
            } else if (typeof row.data === 'object' && row.data !== null) {
              rowDataObj = row.data;
            }

            const itemTitle = row.title || row.name || rowDataObj.title || rowDataObj.name || `Item #${idx + 1}`;
            const subtitle = rowDataObj.category || row.category || (rowDataObj.price ? `₹${rowDataObj.price}` : '') || '';
            const value = row.value || rowDataObj.value || (rowDataObj.stock !== undefined ? `${rowDataObj.stock} in stock` : '');

            return (
              <TouchableOpacity
                key={row.id || idx}
                style={styles.recordRow}
                activeOpacity={0.7}
                onPress={() => handleRowPress(row)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordTitle} numberOfLines={1}>{itemTitle}</Text>
                  {subtitle ? <Text style={styles.recordSubtitle}>{subtitle}</Text> : null}
                </View>
                {value ? <Text style={styles.recordValue}>{String(value)}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  countBadge: {
    fontSize: 11,
    color: '#94a3b8',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    padding: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  recordList: {
    gap: 6,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  recordTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  recordSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  recordValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
});
