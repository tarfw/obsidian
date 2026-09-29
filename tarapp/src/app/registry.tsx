import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { harness, type HarnessAction, type HarnessInterfaceContract } from '@/lib/harness';

type ModuleCategory = 'all' | 'commerce' | 'finance' | 'pos' | 'workforce' | 'site' | 'core';

function getActionCategory(actionId: string): ModuleCategory {
  if (actionId.startsWith('pos.')) return 'pos';
  if (actionId.startsWith('site.')) return 'site';
  if (
    actionId.startsWith('catalog.') ||
    actionId.startsWith('price.') ||
    actionId.startsWith('stock.') ||
    actionId.startsWith('purchase.') ||
    actionId.startsWith('order.') ||
    actionId.startsWith('quote.') ||
    actionId.startsWith('warehouse.') ||
    actionId.startsWith('shipment.') ||
    actionId.startsWith('batch.') ||
    actionId.startsWith('recipe.') ||
    actionId.startsWith('production.') ||
    actionId.startsWith('forecast.') ||
    actionId.startsWith('replenishment.') ||
    actionId.startsWith('supplier.') ||
    actionId.startsWith('quality.')
  ) {
    return 'commerce';
  }
  if (
    actionId.startsWith('invoice.') ||
    actionId.startsWith('payment.') ||
    actionId.startsWith('refund.') ||
    actionId.startsWith('expense.') ||
    actionId.startsWith('bank.') ||
    actionId.startsWith('period.')
  ) {
    return 'finance';
  }
  if (
    actionId.startsWith('shift.') ||
    actionId.startsWith('attendance.') ||
    actionId.startsWith('payroll.') ||
    actionId.startsWith('time.') ||
    actionId.startsWith('trip.') ||
    actionId.startsWith('fare.') ||
    actionId.startsWith('booking.')
  ) {
    return 'workforce';
  }
  return 'core';
}

export default function RegistryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [actions, setActions] = useState<HarnessAction[]>([]);
  const [interfaces, setInterfaces] = useState<HarnessInterfaceContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ModuleCategory>('all');
  const [selectedAction, setSelectedAction] = useState<HarnessAction | null>(null);

  useEffect(() => {
    let alive = true;
    void harness
      .registry()
      .then((result) => {
        if (alive) {
          setActions(result.actions || []);
          setInterfaces(result.interfaces || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const categories: { id: ModuleCategory; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'commerce', label: 'Commerce' },
    { id: 'finance', label: 'Finance' },
    { id: 'pos', label: 'POS' },
    { id: 'workforce', label: 'Workforce' },
    { id: 'site', label: 'Site' },
    { id: 'core', label: 'Core' },
  ];

  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return actions.filter((action) => {
      const matchesCategory = category === 'all' || getActionCategory(action.id) === category;
      if (!matchesCategory) return false;
      if (!q) return true;
      const idMatch = action.id.toLowerCase().includes(q);
      const titleMatch = action.title.toLowerCase().includes(q);
      const descMatch = action.description.toLowerCase().includes(q);
      const effectMatch = action.effects?.some((e) => e.toLowerCase().includes(q));
      const roleMatch = action.roles?.some((r) => r.toLowerCase().includes(q));
      return idMatch || titleMatch || descMatch || effectMatch || roleMatch;
    });
  }, [actions, category, query]);

  const contractMap = useMemo(() => {
    return new Map(interfaces.map((i) => [i.key, i]));
  }, [interfaces]);

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color="#172033" />
        </TouchableOpacity>
        <Text style={styles.title}>Registry</Text>
        <Text style={styles.countTag}>{actions.length} actions</Text>
      </View>

      {/* Flat Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#718096" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Filter actions..."
          placeholderTextColor="#718096"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color="#718096" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Clean Touch-Friendly Tabs */}
      <View style={styles.tabBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.tabBar}
        >
          {categories.map((item) => {
            const isSelected = category === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setCategory(item.id)}
                delayPressIn={0}
                activeOpacity={0.6}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                style={[styles.tabItem, isSelected && styles.tabItemSelected]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 1-Line Ultra Clean List with Crisp Visible Dividers */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#3157A8" />
          <Text style={styles.loadingText}>Loading actions…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredActions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
          renderItem={({ item }) => {
            const contract = contractMap.get(item.interfaceKey);
            const presentation = contract?.presentation || item.interfaceKey;
            return (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setSelectedAction(item)}
                style={styles.row}
                activeOpacity={0.5}
              >
                <Text style={styles.actionId}>{item.id}</Text>
                <View style={styles.rowRight}>
                  <Text style={styles.interfaceTag}>{presentation}</Text>
                  <Ionicons name="chevron-forward" size={15} color="#A0AEC0" />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No matching actions</Text>
              <Text style={styles.emptySubtitle}>Try another search query.</Text>
            </View>
          }
        />
      )}

      {/* Action Detail Inspector Modal */}
      <Modal
        visible={Boolean(selectedAction)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedAction(null)}
      >
        {selectedAction ? (
          <View style={styles.modalContainer}>
            <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
              <View style={styles.modalHeaderTitle}>
                <Text style={styles.modalActionId}>{selectedAction.id}</Text>
                <Text style={styles.modalTitle}>{selectedAction.title}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedAction(null)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color="#172033" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={[styles.modalBody, { paddingBottom: insets.bottom + 32 }]}>
              <Text style={styles.modalDesc}>{selectedAction.description}</Text>

              {/* Specs Grid */}
              <View style={styles.specSection}>
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>Interface</Text>
                  <Text style={styles.specVal}>
                    {contractMap.get(selectedAction.interfaceKey)?.title || selectedAction.interfaceKey} ({contractMap.get(selectedAction.interfaceKey)?.presentation || 'screen'})
                  </Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>Execution</Text>
                  <Text style={[styles.specVal, { textTransform: 'capitalize' }]}>
                    {selectedAction.type} · v{selectedAction.version}
                  </Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>Allowed Roles</Text>
                  <Text style={styles.specVal}>
                    {selectedAction.roles.join(', ')}
                  </Text>
                </View>
                {selectedAction.effects && selectedAction.effects.length > 0 ? (
                  <View style={styles.specRow}>
                    <Text style={styles.specKey}>Effects</Text>
                    <Text style={styles.specVal}>
                      {selectedAction.effects.join(', ')}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Fields Spec */}
              <View style={styles.fieldsSection}>
                <Text style={styles.sectionHeading}>
                  Fields ({selectedAction.fields.length})
                </Text>
                {selectedAction.fields.map((field) => (
                  <View key={field.key} style={styles.fieldItem}>
                    <View style={styles.fieldItemTop}>
                      <Text style={styles.fieldName}>{field.label}</Text>
                      <Text selectable style={styles.fieldKey}>`{field.key}`</Text>
                    </View>
                    <View style={styles.fieldMetaRow}>
                      <Text style={styles.fieldKind}>{field.kind}</Text>
                      <Text style={styles.fieldDot}>·</Text>
                      <Text style={[styles.fieldReq, field.required && styles.fieldReqActive]}>
                        {field.required ? 'required' : 'optional'}
                      </Text>
                      {field.hidden ? (
                        <>
                          <Text style={styles.fieldDot}>·</Text>
                          <Text style={styles.fieldHidden}>hidden</Text>
                        </>
                      ) : null}
                      {field.recordType ? (
                        <>
                          <Text style={styles.fieldDot}>·</Text>
                          <Text style={styles.fieldRef}>ref: {field.recordType}</Text>
                        </>
                      ) : null}
                      {field.defaultValue !== undefined ? (
                        <>
                          <Text style={styles.fieldDot}>·</Text>
                          <Text style={styles.fieldRef}>default: &quot;{field.defaultValue}&quot;</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>

              {/* Outputs */}
              {selectedAction.output && selectedAction.output.length > 0 ? (
                <View style={styles.outputSection}>
                  <Text style={styles.sectionHeading}>Outputs</Text>
                  <Text style={styles.outputKeys}>
                    {selectedAction.output.join(', ')}
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, color: '#172033' },
  countTag: { fontSize: 13, color: '#718096', marginLeft: 'auto' },
  searchWrap: {
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, height: '100%', fontSize: 13, color: '#172033' },
  tabBarWrap: {
    borderBottomWidth: 1,
    borderColor: '#CBD5E0',
    backgroundColor: '#FFFFFF',
  },
  tabBar: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tabItem: {
    minHeight: 44,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemSelected: {
    borderBottomColor: '#172033',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  tabTextSelected: {
    color: '#172033',
    fontWeight: '700',
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { fontSize: 13, color: '#718096' },
  listContent: { paddingHorizontal: 20 },
  row: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  actionId: { fontSize: 14, fontWeight: '700', color: '#172033', fontFamily: 'monospace' },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  interfaceTag: {
    fontSize: 12,
    fontWeight: '500',
    color: '#718096',
    textTransform: 'capitalize',
  },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#172033' },
  emptySubtitle: { fontSize: 13, color: '#718096' },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalHeaderTitle: { flex: 1, gap: 1 },
  modalActionId: { fontSize: 12, fontWeight: '700', fontFamily: 'monospace', color: '#3157A8' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#172033' },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAFC',
  },
  modalBody: { padding: 20, gap: 18 },
  modalDesc: { fontSize: 14, lineHeight: 20, color: '#4A5568' },
  specSection: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specKey: { fontSize: 12, fontWeight: '500', color: '#718096' },
  specVal: { fontSize: 12, fontWeight: '600', color: '#172033' },
  sectionHeading: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, color: '#718096', textTransform: 'uppercase', marginBottom: 6 },
  fieldsSection: { gap: 6 },
  fieldItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#EDF2F7',
    gap: 2,
  },
  fieldItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldName: { fontSize: 13, fontWeight: '600', color: '#172033' },
  fieldKey: { fontSize: 11, fontFamily: 'monospace', color: '#718096' },
  fieldMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fieldKind: { fontSize: 11, color: '#3157A8', fontWeight: '600' },
  fieldDot: { fontSize: 10, color: '#A0AEC0' },
  fieldReq: { fontSize: 11, color: '#718096' },
  fieldReqActive: { color: '#B42318', fontWeight: '600' },
  fieldHidden: { fontSize: 11, color: '#A66D00' },
  fieldRef: { fontSize: 11, color: '#4A5568' },
  outputSection: { gap: 4 },
  outputKeys: { fontSize: 13, fontFamily: 'monospace', color: '#18865B' },
});
