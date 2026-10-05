import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createOperationKey, harness, type HarnessWorkspace } from '@/lib/harness';
import WorkspaceTeam from './WorkspaceTeam';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (slug: string) => Promise<void>;
  canClose: boolean;
  existingSlugs?: string[];
  workspace?: HarnessWorkspace | null;
}

interface ToolItem {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  module: 'pos' | 'commerce' | 'site' | 'core';
}

const TOOLS_CATALOG: ToolItem[] = [
  { id: 'pos', name: 'Point of sale', icon: 'cart-outline', module: 'pos' },
  { id: 'register', name: 'Cash drawer', icon: 'cash-outline', module: 'commerce' },
  { id: 'item', name: 'Products', icon: 'pricetag-outline', module: 'commerce' },
  { id: 'inventory', name: 'Inventory', icon: 'cube-outline', module: 'commerce' },
  { id: 'order', name: 'Orders', icon: 'receipt-outline', module: 'commerce' },
  { id: 'invoice', name: 'Invoices', icon: 'document-text-outline', module: 'commerce' },
  { id: 'payment', name: 'Payments', icon: 'card-outline', module: 'commerce' },
  { id: 'expense', name: 'Expenses', icon: 'wallet-outline', module: 'commerce' },
  { id: 'site', name: 'Online store', icon: 'globe-outline', module: 'site' },
  { id: 'members', name: 'Team', icon: 'people-outline', module: 'core' },
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

function classifyTrade(text: string): string {
  const lower = text.toLowerCase();
  if (
    lower.includes('saree') ||
    lower.includes('handloom') ||
    lower.includes('silk') ||
    lower.includes('apparel') ||
    lower.includes('boutique') ||
    lower.includes('cloth') ||
    lower.includes('tailor') ||
    lower.includes('garment') ||
    lower.includes('textile') ||
    lower.includes('weaving')
  ) {
    return 'Handloom & Apparel Atelier';
  }
  if (
    lower.includes('cafe') ||
    lower.includes('coffee') ||
    lower.includes('tea') ||
    lower.includes('restaurant') ||
    lower.includes('food') ||
    lower.includes('bakery') ||
    lower.includes('kitchen') ||
    lower.includes('dining') ||
    lower.includes('mess') ||
    lower.includes('bistro')
  ) {
    return 'Food & Beverage Service';
  }
  if (
    lower.includes('grocery') ||
    lower.includes('supermarket') ||
    lower.includes('provision') ||
    lower.includes('mart') ||
    lower.includes('fruits') ||
    lower.includes('vegetable') ||
    lower.includes('kirana')
  ) {
    return 'Retail & Grocery';
  }
  if (
    lower.includes('clinic') ||
    lower.includes('pharmacy') ||
    lower.includes('medical') ||
    lower.includes('doctor') ||
    lower.includes('hospital') ||
    lower.includes('health')
  ) {
    return 'Healthcare & Pharmacy';
  }
  if (
    lower.includes('jewel') ||
    lower.includes('gold') ||
    lower.includes('silver') ||
    lower.includes('diamond')
  ) {
    return 'Jewellery & Ornaments';
  }
  if (
    lower.includes('software') ||
    lower.includes('agency') ||
    lower.includes('consulting') ||
    lower.includes('tech') ||
    lower.includes('digital')
  ) {
    return 'Digital Services & Consulting';
  }
  if (
    lower.includes('electronic') ||
    lower.includes('mobile') ||
    lower.includes('hardware') ||
    lower.includes('repair')
  ) {
    return 'Electronics & Hardware';
  }
  return 'General Retail & Merchant';
}

function computeDefaultTools(tradeName: string, text: string): string[] {
  const lower = text.toLowerCase();
  const tradeLower = tradeName.toLowerCase();
  const tools = ['item', 'order', 'invoice', 'payment', 'expense'];

  if (
    !tradeLower.includes('service') &&
    !tradeLower.includes('consulting') &&
    !lower.includes('service') &&
    !lower.includes('consulting')
  ) {
    tools.splice(1, 0, 'inventory');
  }

  const hasPos =
    lower.includes('pos') ||
    lower.includes('counter') ||
    lower.includes('cashier') ||
    lower.includes('cash box') ||
    lower.includes('cash drawer') ||
    lower.includes('register') ||
    lower.includes('dine') ||
    lower.includes('cafe') ||
    lower.includes('restaurant') ||
    lower.includes('bakery') ||
    lower.includes('table');

  if (hasPos) {
    tools.unshift('pos', 'register');
  }

  const hasSite =
    lower.includes('site') ||
    lower.includes('website') ||
    lower.includes('online') ||
    lower.includes('storefront') ||
    lower.includes('catalog') ||
    lower.includes('whatsapp');

  if (hasSite) {
    tools.push('site');
  }

  tools.push('members');

  return Array.from(new Set(tools));
}

function WorkspaceForm({
  onClose,
  onSuccess,
  canClose,
  existingSlugs = [],
  workspace,
}: Props) {
  const insets = useSafeAreaInsets();
  const isViewMode = Boolean(workspace);

  const [name, setName] = useState(workspace?.name || '');

  // Initialize taste: load actual taste if present.
  // Sample handloom boutique facts are ONLY applied to the demo brand "Aambal Neyvagam".
  // Other workspaces (e.g. Cloth21) start clean without dummy data.
  const [tasteBlocks, setTasteBlocks] = useState<string[]>(() => {
    if (workspace?.name && /aambal/i.test(workspace.name)) {
      return [
        'Handloom saree boutique in Kanchipuram',
        'Counter sales with UPI QR & physical cash box',
        'Public website for online catalog & WhatsApp',
      ];
    }
    const raw = (workspace as unknown as Record<string, unknown>)?.taste;
    if (typeof raw === 'string' && raw.trim()) {
      return raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    }
    if (Array.isArray(raw)) {
      return raw.map(String).filter(Boolean);
    }
    return [];
  });

  const [trade, setTrade] = useState<string>(() => {
    const rawTrade = (workspace as unknown as Record<string, unknown>)?.trade;
    if (typeof rawTrade === 'string' && rawTrade.trim()) return rawTrade;
    const initialText = tasteBlocks.join(' ').trim();
    if (!initialText) return '';
    return classifyTrade(initialText);
  });

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [newBlock, setNewBlock] = useState('');

  const [selectedTools, setSelectedTools] = useState<string[]>(() => {
    const initialText = tasteBlocks.join(' ').trim();
    if (!initialText) return [];
    const initialTrade = classifyTrade(initialText);
    return computeDefaultTools(initialTrade, initialText);
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const workspaceName = name.trim() || (isViewMode ? workspace?.name || 'Workspace' : 'My Workspace');

  const slug = useMemo(() => {
    if (isViewMode && workspace) return workspace.slug;
    const base = slugify(workspaceName) || 'my-workspace';
    if (!existingSlugs.includes(base)) return base;
    let suffix = 2;
    while (existingSlugs.includes(`${base}-${suffix}`)) suffix += 1;
    return `${base}-${suffix}`;
  }, [existingSlugs, workspaceName, isViewMode, workspace]);

  // Sync saved taste and trade from Turso database
  useEffect(() => {
    if (workspace) {
      void harness
        .workspaceTools(workspace.slug)
        .then((res) => {
          if (res) {
            if (Array.isArray(res.taste) && res.taste.length > 0) {
              setTasteBlocks(res.taste);
            }
            if (typeof res.trade === 'string' && res.trade.trim()) {
              setTrade(res.trade);
            }
          }
        })
        .catch(() => undefined);
    }
  }, [workspace]);

  // JEV System One live classification: driven strictly and exclusively by Taste data
  useEffect(() => {
    const prompt = tasteBlocks.join('. ').trim();
    if (!prompt) {
      setTrade('');
      setSelectedTools([]);
      return;
    }

    // Fast local estimation
    const estimatedTrade = classifyTrade(prompt);
    setTrade(estimatedTrade);
    setSelectedTools(computeDefaultTools(estimatedTrade, prompt));

    // Live TypeSafe JEV System One judgment via server
    const timer = setTimeout(() => {
      harness
        .suggestWorkspace(prompt)
        .then((sugg) => {
          if (sugg) {
            if (sugg.trade?.title) {
              setTrade(sugg.trade.title);
            }
            if (Array.isArray(sugg.tools) && sugg.tools.length > 0) {
              setSelectedTools(sugg.tools);
            }
          }
        })
        .catch(() => undefined);
    }, 250);

    return () => clearTimeout(timer);
  }, [tasteBlocks]);

  const close = () => {
    if (!submitting && canClose) {
      setError('');
      onClose();
    }
  };

  const addBlock = () => {
    const text = newBlock.trim();
    if (!text) return;
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      setTasteBlocks((prev) => [...prev, ...lines]);
    }
    setNewBlock('');
  };

  const removeBlock = (index: number) => {
    setTasteBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const closeDrawer = () => {
    if (newBlock.trim()) {
      addBlock();
    }
    setDrawerVisible(false);
  };

  const activeToolItems = TOOLS_CATALOG.filter((tool) => selectedTools.includes(tool.id));

  const submit = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Workspace name is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const targetSlug = isViewMode && workspace ? workspace.slug : slug;

      if (!isViewMode) {
        await harness.createWorkspace(cleanName, targetSlug);
      }

      const enablePos = selectedTools.includes('pos');
      const enableCommerce =
        selectedTools.length === 0 ||
        selectedTools.some((id) =>
          ['item', 'inventory', 'order', 'invoice', 'payment', 'expense', 'register'].includes(id)
        );
      const enableSite = selectedTools.includes('site');
      const finalTrade = trade.trim() || 'General Retail & Merchant';

      await Promise.all([
        // 1. Persist Taste Profile & Classified Trade to Turso records
        harness
          .executeAction(
            targetSlug,
            'taste.save',
            { taste: tasteBlocks, trade: finalTrade },
            createOperationKey(`taste:${targetSlug}`)
          )
          .catch(() => undefined),

        // 2. Persist Capabilities to Turso records
        harness
          .executeAction(
            targetSlug,
            'capability.save',
            { module: 'pos', enabled: enablePos, baseVersion: 0 },
            createOperationKey(`cap:${targetSlug}:pos`)
          )
          .catch(() => undefined),
        harness
          .executeAction(
            targetSlug,
            'capability.save',
            { module: 'commerce', enabled: enableCommerce, baseVersion: 0 },
            createOperationKey(`cap:${targetSlug}:commerce`)
          )
          .catch(() => undefined),
        harness
          .executeAction(
            targetSlug,
            'capability.save',
            { module: 'site', enabled: enableSite, baseVersion: 0 },
            createOperationKey(`cap:${targetSlug}:site`)
          )
          .catch(() => undefined),
      ]);

      await onSuccess(targetSlug);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save workspace.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={close}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.page}
      >
        {/* Top Header: Title on left, Action on right */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {isViewMode ? workspaceName : 'New Workspace'}
          </Text>

          <TouchableOpacity
            disabled={submitting || !name.trim()}
            style={styles.headerActionBtn}
            onPress={() => void submit()}
            accessibilityLabel={isViewMode ? 'Save Workspace' : 'Create Workspace'}
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Text
                style={[
                  styles.headerActionText,
                  !name.trim() && styles.headerActionDisabled,
                ]}
              >
                {isViewMode ? 'Save' : 'Create'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* One Column Full-Width Content */}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 80 },
          ]}
        >
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Section 1: WORKSPACE NAME */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>WORKSPACE NAME</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Aambal Neyvagam"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
              editable={!submitting}
              autoFocus={!isViewMode}
            />
          </View>

          <View style={styles.divider} />

          {/* Section 2: TASTE */}
          <TouchableOpacity
            style={styles.tasteContainer}
            onPress={() => setDrawerVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Taste"
          >
            <Text style={styles.sectionLabel}>TASTE</Text>
            {tasteBlocks.length > 0 ? (
              <View style={styles.bulletsWrap}>
                {tasteBlocks.map((block, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{block}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </TouchableOpacity>

          {trade ? (
            <>
              <View style={styles.divider} />
              {/* Section 3: TRADE */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>TRADE</Text>
                <View style={styles.tradeBox}>
                  <Text style={styles.tradeText}>{trade}</Text>
                </View>
              </View>
            </>
          ) : null}

          {activeToolItems.length > 0 ? (
            <>
              <View style={styles.divider} />
              {/* Section 4: TOOLS */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>TOOLS</Text>
                <View style={styles.toolsList}>
                  {activeToolItems.map((tool) => {
                    const isTeamTool = tool.id === 'members';
                    const isClickable = isTeamTool && isViewMode && Boolean(workspace);

                    return (
                      <TouchableOpacity
                        key={tool.id}
                        style={styles.toolRow}
                        onPress={() => {
                          if (isClickable) {
                            setTeamModalVisible(true);
                          }
                        }}
                        activeOpacity={isClickable ? 0.7 : 1}
                      >
                        <View style={styles.toolLeft}>
                          <Ionicons
                            name={tool.icon}
                            size={20}
                            color="#0F172A"
                            style={styles.toolIcon}
                          />
                          <Text style={styles.toolName}>{tool.name}</Text>
                        </View>
                        {isClickable ? (
                          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>

        {/* DETACHED TASTE DRAWER (>70% Height) */}
        <Modal
          visible={drawerVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={closeDrawer}
        >
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={closeDrawer}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.drawerSheetWrap}
            >
              <TouchableOpacity
                activeOpacity={1}
                style={[
                  styles.drawerSheet,
                  { paddingBottom: Math.max(insets.bottom, 16) },
                ]}
              >
                {/* Drawer Header */}
                <View style={styles.drawerHeader}>
                  <Text style={styles.drawerTitle}>Taste</Text>
                  <TouchableOpacity
                    style={styles.drawerDoneBtn}
                    onPress={closeDrawer}
                    accessibilityRole="button"
                    accessibilityLabel="Done"
                  >
                    <Text style={styles.drawerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>

                {/* Input row */}
                <View style={styles.drawerInputRow}>
                  <TextInput
                    style={styles.drawerInput}
                    placeholder="Describe business fact or style..."
                    placeholderTextColor="#94A3B8"
                    value={newBlock}
                    onChangeText={setNewBlock}
                    onSubmitEditing={addBlock}
                    returnKeyType="done"
                    autoFocus={true}
                  />
                  <TouchableOpacity
                    style={styles.drawerAddBtn}
                    onPress={addBlock}
                    accessibilityRole="button"
                    accessibilityLabel="Add fact"
                  >
                    <Ionicons name="arrow-up-circle" size={26} color="#2563EB" />
                  </TouchableOpacity>
                </View>

                {/* Blocks List */}
                <ScrollView
                  style={styles.drawerScroll}
                  contentContainerStyle={styles.drawerScrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {tasteBlocks.map((block, idx) => (
                    <View key={idx} style={styles.drawerBlockRow}>
                      <Text style={styles.drawerBlockBullet}>•</Text>
                      <Text style={styles.drawerBlockText}>{block}</Text>
                      <TouchableOpacity
                        style={styles.drawerRemoveBtn}
                        onPress={() => removeBlock(idx)}
                        accessibilityRole="button"
                        accessibilityLabel="Remove note"
                      >
                        <Ionicons name="close-circle-outline" size={20} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </Modal>

        {teamModalVisible && workspace ? (
          <WorkspaceTeam
            scope={workspace.slug}
            name={workspace.name}
            onClose={() => setTeamModalVisible(false)}
            onChanged={() => undefined}
          />
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function CreateWorkspace(props: Props) {
  if (!props.visible) return null;
  return <WorkspaceForm key={props.workspace?.slug || 'new'} {...props} />;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    minHeight: 56,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  headerActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  headerActionDisabled: {
    color: '#94A3B8',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  errorBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
  },

  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
    marginVertical: 18,
  },

  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },

  // Taste
  bulletsWrap: {
    gap: 8,
    paddingVertical: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 22,
    color: '#334155',
    fontWeight: '700',
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#1E293B',
  },
  tasteContainer: {
    paddingVertical: 4,
    minHeight: 36,
    gap: 8,
  },

  // Trade Box
  tradeBox: {
    paddingVertical: 6,
  },
  tradeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },

  // Tools List
  toolsList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  toolRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  toolLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toolIcon: {
    width: 24,
    textAlign: 'center',
  },
  toolName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },

  // Detached Drawer (>70% Height)
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  drawerSheetWrap: {
    height: '76%',
    maxHeight: '80%',
    width: '100%',
  },
  drawerSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  drawerDoneBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  drawerDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  drawerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  drawerInput: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: '#0F172A',
  },
  drawerAddBtn: {
    paddingLeft: 8,
    paddingVertical: 8,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollContent: {
    paddingVertical: 10,
    gap: 10,
  },
  drawerBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 8,
  },
  drawerBlockBullet: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  drawerBlockText: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
  },
  drawerRemoveBtn: {
    padding: 4,
  },
});
