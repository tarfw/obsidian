import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { tar } from '@/lib/tar';
import { parseCanvasMarkdown } from '@/lib/layout-engine';

export interface CanvasModuleSpec {
  id: string;
  name: string;
  type: string;
  icon: string;
  description: string;
  props: Record<string, any>;
}

export const AVAILABLE_CANVAS_MODULES: CanvasModuleSpec[] = [
  {
    id: 'orders',
    name: 'Orders & POS Register',
    type: 'pos-sale',
    icon: 'cart-outline',
    description: 'Point of sale register and live order tickets',
    props: { catalogType: 'product', taxRate: 0.05 },
  },
  {
    id: 'inventory',
    name: 'Inventory & Catalog',
    type: 'catalog-grid',
    icon: 'cube-outline',
    description: 'Product catalog with live stock & price tags',
    props: { type: 'product', mode: 'table' },
  },
  {
    id: 'bookings',
    name: 'Bookings & Reservations',
    type: 'data-grid',
    icon: 'calendar-outline',
    description: 'Calendar appointments and slot scheduling',
    props: { type: 'booking', mode: 'calendar' },
  },
  {
    id: 'crm',
    name: 'CRM & Client Directory',
    type: 'data-grid',
    icon: 'people-outline',
    description: 'Customer profiles, contact details and history',
    props: { type: 'crm', mode: 'table' },
  },
  {
    id: 'reports',
    name: 'Daily Sales & Reports',
    type: 'metric-card',
    icon: 'trending-up-outline',
    description: 'Revenue totals, order count and sales pulse',
    props: { title: 'Daily Sales', type: 'report' },
  },
  {
    id: 'tables',
    name: 'Table Grid POS',
    type: 'data-grid',
    icon: 'grid-outline',
    description: 'Interactive restaurant table status & floor map',
    props: { type: 'table', mode: 'grid' },
  },
  {
    id: 'expenses',
    name: 'Expense Tracker',
    type: 'data-grid',
    icon: 'wallet-outline',
    description: 'Log and track business operational expenses',
    props: { type: 'expense', mode: 'table' },
  },
];

const PRESETS = [
  { label: '🍽️ Restaurant / Cafe', prompt: 'Restaurant POS with table grid and live menu' },
  { label: '🛍️ Retail Store', prompt: 'Retail store with inventory catalog and sales register' },
  { label: '🏥 Clinic / Salon', prompt: 'Appointment bookings with client CRM directory' },
  { label: '💼 Agency / Services', prompt: 'Client directory with daily sales and expenses' },
];

interface CanvasCustomizerModalProps {
  visible: boolean;
  onClose: () => void;
  scope: string;
  workspaceName?: string;
  activeBlocks?: any[];
  onUpdated: () => void;
}

export default function CanvasCustomizerModal({
  visible,
  onClose,
  scope,
  workspaceName = 'Workspace',
  activeBlocks: initialBlocks = [],
  onUpdated,
}: CanvasCustomizerModalProps) {
  const insets = useSafeAreaInsets();
  const [blocks, setBlocks] = useState<any[]>(initialBlocks);
  const [aiPrompt, setAiPrompt] = useState('');
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchLiveCanvas = useCallback(async () => {
    if (!scope) return;
    try {
      const res = await tar.okf.read(scope, 'team/canvas.md');
      if (res?.content) {
        const parsed = parseCanvasMarkdown(res.content);
        const liveBlocks = parsed.blocks && parsed.blocks.length > 0
          ? parsed.blocks
          : (parsed.lifeModes?.[0]?.blocks || []);
        setBlocks(liveBlocks);
      }
    } catch (e) {
      console.warn('[CanvasCustomizer] Failed to read live canvas:', e);
    }
  }, [scope]);

  useEffect(() => {
    if (visible && scope) {
      fetchLiveCanvas();
    }
  }, [visible, scope, fetchLiveCanvas]);

  const isModuleActive = (modId: string) => {
    return blocks.some((b: any) => {
      const bTitle = String(b.title || '').toLowerCase();
      const bType = String(b.props?.type || b.type || '').toLowerCase();
      return bTitle.includes(modId) || bType.includes(modId) || b.type === modId;
    });
  };

  const handleToggleModule = async (mod: CanvasModuleSpec) => {
    if (!scope || processing) return;
    setProcessing(true);
    setFeedback(null);
    const active = isModuleActive(mod.id);

    // 1. Optimistic UI update
    if (active) {
      setBlocks(prev => prev.filter(b => {
        const bTitle = String(b.title || '').toLowerCase();
        const bType = String(b.props?.type || b.type || '').toLowerCase();
        return !bTitle.includes(mod.id) && !bType.includes(mod.id) && b.type !== mod.id;
      }));
    } else {
      setBlocks(prev => [...prev, { title: mod.name, type: mod.type, props: mod.props }]);
    }

    try {
      if (active) {
        await tar.canvas.remove(scope, mod.id);
        setFeedback(`Removed ${mod.name}.`);
      } else {
        await tar.canvas.add(scope, mod.id);
        setFeedback(`Added ${mod.name}!`);
      }
      await fetchLiveCanvas();
      onUpdated();
    } catch (err: any) {
      console.warn('[CanvasCustomizer] Toggle error:', err);
      setFeedback('Failed to update canvas. Reverting.');
      fetchLiveCanvas();
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyPrompt = async (customText?: string) => {
    const textToRun = (customText || aiPrompt).trim();
    if (!textToRun || !scope || processing) return;
    setProcessing(true);
    setFeedback(null);
    try {
      const promptLower = textToRun.toLowerCase();
      const selectedMods: string[] = [];
      if (promptLower.includes('restaurant') || promptLower.includes('cafe') || promptLower.includes('food') || promptLower.includes('waiter') || promptLower.includes('table')) {
        selectedMods.push('tables', 'orders', 'inventory');
      } else if (promptLower.includes('clinic') || promptLower.includes('doctor') || promptLower.includes('salon') || promptLower.includes('appointment')) {
        selectedMods.push('bookings', 'crm', 'reports');
      } else if (promptLower.includes('retail') || promptLower.includes('store') || promptLower.includes('shop') || promptLower.includes('product')) {
        selectedMods.push('inventory', 'orders', 'reports');
      } else if (promptLower.includes('agency') || promptLower.includes('consult') || promptLower.includes('service')) {
        selectedMods.push('crm', 'reports', 'expenses');
      } else {
        selectedMods.push('orders', 'inventory', 'crm');
      }

      const defaultBlocksStr = selectedMods.map(modId => {
        const mod = AVAILABLE_CANVAS_MODULES.find(m => m.id === modId);
        if (!mod) return '';
        return `  - title: "${mod.name}"\n    type: "${mod.type}"\n    props: ${JSON.stringify(mod.props)}`;
      }).filter(Boolean).join('\n');

      const sScope = scope.replace(/^w:/, '');
      const updatedCanvasMd = `---
type: CanvasLayout
title: "${sScope} Canvas"
timestamp: "${new Date().toISOString()}"
blocks:
${defaultBlocksStr}
---

# Workspace Canvas
`;
      await tar.okf.upload(scope, 'team/canvas.md', updatedCanvasMd);
      await fetchLiveCanvas();
      setAiPrompt('');
      setFeedback(`✨ Layout generated for "${textToRun}"!`);
      onUpdated();
    } catch (err) {
      console.warn('[CanvasCustomizer] AI config failed:', err);
      setFeedback('Failed to generate layout.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        
        {/* Header Bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Canvas Studio</Text>
            <Text style={styles.headerSubtitle}>{workspaceName} • Live OKF Layout</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          
          {/* AI Generator Box */}
          <View style={styles.aiBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="sparkles" size={15} color="#0f172a" />
              <Text style={styles.aiBoxTitle}>AI Canvas Assistant</Text>
            </View>
            <Text style={styles.aiBoxSubtitle}>
              Describe your workflow or tap a quick blueprint:
            </Text>
            
            {/* Quick Preset Pills */}
            <View style={styles.presetWrap}>
              {PRESETS.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  style={styles.presetPill}
                  onPress={() => handleApplyPrompt(p.prompt)}
                  disabled={processing}
                >
                  <Text style={styles.presetPillText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputRow}>
              <TextInput
                value={aiPrompt}
                onChangeText={setAiPrompt}
                placeholder="e.g. Retail shop with barcode catalog..."
                placeholderTextColor="#94a3b8"
                style={styles.aiInput}
                multiline={false}
              />
              <TouchableOpacity
                style={[styles.aiBtn, { opacity: aiPrompt.trim().length > 0 && !processing ? 1 : 0.5 }]}
                disabled={!aiPrompt.trim() || processing}
                onPress={() => handleApplyPrompt()}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="arrow-up" size={18} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Feedback Banner */}
          {feedback && (
            <View style={styles.feedbackBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
              <Text style={styles.feedbackText}>{feedback}</Text>
            </View>
          )}

          {/* Card Library */}
          <Text style={styles.sectionTitle}>Available Cards & Tools</Text>
          <Text style={styles.sectionSubtitle}>Tap to add or remove any module from your Canvas:</Text>

          <View style={styles.cardList}>
            {AVAILABLE_CANVAS_MODULES.map((mod) => {
              const active = isModuleActive(mod.id);
              return (
                <TouchableOpacity
                  key={mod.id}
                  activeOpacity={0.7}
                  disabled={processing}
                  style={[
                    styles.moduleCard,
                    active ? styles.moduleCardActive : styles.moduleCardInactive,
                  ]}
                  onPress={() => handleToggleModule(mod)}
                >
                  <View style={[styles.iconBox, { backgroundColor: active ? '#dcfce7' : '#f8fafc' }]}>
                    <Ionicons
                      name={mod.icon as any}
                      size={20}
                      color={active ? '#16a34a' : '#64748b'}
                    />
                  </View>
                  <View style={styles.moduleTextWrap}>
                    <Text style={styles.moduleName}>{mod.name}</Text>
                    <Text style={styles.moduleDesc}>{mod.description}</Text>
                  </View>
                  <View style={[styles.toggleBadge, active ? styles.badgeActive : styles.badgeInactive]}>
                    <Text style={[styles.toggleBadgeText, active ? styles.badgeTextActive : styles.badgeTextInactive]}>
                      {active ? '✓ Active' : '+ Add'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  aiBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  aiBoxTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  aiBoxSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  presetPill: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  presetPillText: {
    fontSize: 11.5,
    color: '#334155',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  aiInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  aiBtn: {
    backgroundColor: '#0f172a',
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dcfce7',
    marginBottom: 16,
  },
  feedbackText: {
    fontSize: 12.5,
    color: '#16a34a',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
    marginBottom: 12,
  },
  cardList: {
    gap: 8,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  moduleCardActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  moduleCardInactive: {
    backgroundColor: '#ffffff',
    borderColor: '#f1f5f9',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  moduleTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  moduleName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  moduleDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  toggleBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeActive: {
    backgroundColor: '#16a34a',
  },
  badgeInactive: {
    backgroundColor: '#f1f5f9',
  },
  toggleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: '#ffffff',
  },
  badgeTextInactive: {
    color: '#475569',
  },
});
