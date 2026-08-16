import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { SectionProps } from '../ComponentRegistry';

export default function DataTable({ props, designTokens, data = [], onExecuteAction }: SectionProps) {
  const { title, emptyMessage } = props;
  const { colors, rounded } = designTokens;

  return (
    <View style={styles.container}>
      {title && (
        <Text style={[styles.title, { color: colors.primary, marginBottom: 6 }]}>
          {title}
        </Text>
      )}
      <View
        style={[
          styles.table,
          {
            backgroundColor: '#fff',
            borderColor: 'rgba(0,0,0,0.06)',
            borderRadius: rounded.sm || 8,
            padding: 8,
          },
        ]}
      >
        {data.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.empty, { color: '#94a3b8' }]}>
              {emptyMessage || `No ${props?.type || 'items'} recorded`}
            </Text>
            {onExecuteAction && (
              <TouchableOpacity
                style={styles.addStarterBtn}
                onPress={() => onExecuteAction('create_item', { type: props?.type || 'item' })}
              >
                <Text style={styles.addStarterText}>+ Add {props?.type ? props.type.charAt(0).toUpperCase() + props.type.slice(1) : 'Item'}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          data.map((row: any, idx: number) => {
            let rowDataObj: any = {};
            if (typeof row.data === 'string') {
              try { rowDataObj = JSON.parse(row.data); } catch {}
            } else if (typeof row.data === 'object' && row.data !== null) {
              rowDataObj = row.data;
            }

            const itemTitle = row.title || row.name || rowDataObj.title || row.id;
            const price = rowDataObj.price ?? row.price;
            const stock = row.value ?? rowDataObj.stock;
            const category = rowDataObj.category || row.category || row.type;

            return (
              <View
                key={row.id || idx}
                style={[
                  styles.row,
                  {
                    borderBottomWidth: idx < data.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: 'rgba(0,0,0,0.06)',
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                  },
                ]}
              >
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: '#111' }]} numberOfLines={1}>
                    {itemTitle}
                  </Text>
                  {price !== undefined && (
                    <Text style={[styles.rowValue, { color: colors.primary || '#10b981' }]}>
                      ₹{price}
                    </Text>
                  )}
                </View>
                <View style={styles.rowSubContent}>
                  {category && (
                    <Text style={[styles.rowSubtitle, { color: '#64748b' }]} numberOfLines={1}>
                      {category}
                    </Text>
                  )}
                  {stock !== undefined && (
                    <Text style={[styles.rowStock, { color: '#64748b', fontSize: 11 }]}>
                      Stock: {stock}
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  title: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, color: '#94a3b8' },
  table: { borderWidth: 1 },
  emptyContainer: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 12, color: '#94a3b8', textAlign: 'center' },
  addStarterBtn: {
    marginTop: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addStarterText: { fontSize: 11, fontWeight: '700', color: '#2563eb' },
  row: {},
  rowContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowSubContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  rowTitle: { fontSize: 13, fontWeight: '600', flex: 1 },
  rowValue: { fontSize: 13, fontWeight: '700' },
  rowSubtitle: { fontSize: 11, color: '#64748b' },
  rowStock: { fontSize: 11, color: '#64748b' },
});
