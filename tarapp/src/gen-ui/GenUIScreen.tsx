import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getComponent, hasComponent, type SectionProps } from './registry/ComponentRegistry';
import './registry/builtins';
import { CanvasLifeMode, CanvasBlock, CanvasDocument } from '@/lib/layout-engine';
import { resolveIntent } from '@/lib/intent-resolver';
import AdBanner from '@/components/AdBanner';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface GenUIScreenProps {
  canvasDoc?: CanvasDocument;
  onExecuteAction?: (actionName: string, params: Record<string, any>) => Promise<any>;
  theme?: any;
  designTokens?: any;
  infoBarText?: string;
  onVoiceRecord?: () => void;
  workspaces?: Array<{
    subdomain: string;
    scope: string;
    name?: string;
    role?: string;
    type?: string;
  }>;
  currentWorkspace?: {
    subdomain: string;
    scope: string;
    name?: string;
    role?: string;
    type?: string;
  } | null;
  onSelectWorkspace?: (workspace: any) => void;
  onCreateWorkspace?: () => void;
  onOpenSwitcher?: () => void;
}

const DEFAULT_LIFE_MODES: CanvasLifeMode[] = [];

/**
 * Determine active life mode based on current device hour and routine schedules
 */
function getAutoRoutineMode(modes: CanvasLifeMode[]): string {
  if (!modes || modes.length === 0) return 'personal';

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const mode of modes) {
    if (mode.schedule) {
      const parts = mode.schedule.split('-');
      if (parts.length === 2) {
        const startParts = parts[0].split(':');
        const endParts = parts[1].split(':');
        const startH = Number(startParts[0]) || 0;
        const startM = Number(startParts[1]) || 0;
        const endH = Number(endParts[0]) || 0;
        const endM = Number(endParts[1]) || 0;
        const startMin = startH * 60 + startM;
        let endMin = endH * 60 + endM;
        if (endMin === 0 && endH === 0) endMin = 24 * 60;

        if (currentMinutes >= startMin && currentMinutes < endMin) {
          return mode.id;
        }
      }
    }
  }

  return modes[0].id;
}

function getChipIcon(label: string): any {
  const l = (label || '').toLowerCase();
  if (l.includes('call') || l.includes('phone')) return 'call-outline';
  if (l.includes('note') || l.includes('memo')) return 'document-text-outline';
  if (l.includes('expense') || l.includes('budget') || l.includes('money')) return 'wallet-outline';
  if (l.includes('sale') || l.includes('pos') || l.includes('bill')) return 'receipt-outline';
  if (l.includes('stock') || l.includes('inventory')) return 'cube-outline';
  if (l.includes('contact') || l.includes('customer') || l.includes('supplier')) return 'person-outline';
  if (l.includes('order') || l.includes('product')) return 'cart-outline';
  if (l.includes('deal') || l.includes('pipeline')) return 'git-network-outline';
  return 'flash-outline';
}

export default function GenUIScreen({
  canvasDoc,
  onExecuteAction,
  theme = {},
  designTokens = {},
  infoBarText = '★ Partner Offer: 0% POS processing fees today · Tap for details',
  onVoiceRecord,
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onCreateWorkspace,
  onOpenSwitcher,
}: GenUIScreenProps) {
  const insets = useSafeAreaInsets();

  // Life Modes: Use workspace canvas definition if available, otherwise default
  const lifeModes = useMemo(() => {
    if (canvasDoc?.lifeModes && canvasDoc.lifeModes.length > 0) {
      return canvasDoc.lifeModes;
    }
    return DEFAULT_LIFE_MODES;
  }, [canvasDoc]);

  // Selected active mode
  const [activeModeId, setActiveModeId] = useState<string>(() => {
    return canvasDoc?.activeModeId || getAutoRoutineMode(lifeModes);
  });

  // Current active mode object
  const currentMode = useMemo(() => {
    return lifeModes.find((m) => m.id === activeModeId) || lifeModes[0];
  }, [lifeModes, activeModeId]);

  // Bottom dock input state
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Slide-Up Card state
  const [slideCardVisible, setSlideCardVisible] = useState(false);
  const [slideCardComponent, setSlideCardComponent] = useState<{
    type: string;
    props?: Record<string, any>;
    title?: string;
  } | null>(null);
  const openSlideCard = (type: string, props: Record<string, any> = {}, title?: string) => {
    // Inherit enriched props (such as full contacts list, products, orders) from active blocks
    const matchingBlock = (currentMode?.blocks || []).find((b) => b.type === type);
    const mergedProps = {
      ...(matchingBlock?.props || {}),
      ...props,
      mode: 'list',
    };
    setSlideCardComponent({ type, props: mergedProps, title });
    setSlideCardVisible(true);
  };

  const closeSlideCard = () => {
    setSlideCardVisible(false);
    setTimeout(() => {
      setSlideCardComponent(null);
    }, 250);
  };

  // Live matching chips while typing
  const liveMatches = useMemo(() => {
    if (!inputText.trim()) return [];
    const q = inputText.toLowerCase();

    const dictionary = [
      { label: 'Check Stock', target: 'stock-sheet' },
      { label: 'Quick POS Register', target: 'quick-pos' },
      { label: 'View Pipeline Deals', target: 'pipeline-card' },
      { label: 'Call Supplier', target: 'contact-card' },
      { label: 'View Today Transactions', target: 'data-grid' },
      { label: 'Confirm Restock Order', target: 'action-confirm' },
    ];

    return dictionary.filter((item) =>
      item.label.toLowerCase().includes(q)
    );
  }, [inputText]);

  // Contextual Chips for active mode in idle state
  const idleChips = useMemo(() => {
    if (canvasDoc?.chips && canvasDoc.chips.length > 0) {
      return canvasDoc.chips;
    }
    if (currentMode?.chips && currentMode.chips.length > 0) {
      return currentMode.chips;
    }
    return [
      { label: 'New Sale', target: 'quick-pos' },
      { label: 'Check Stock', target: 'stock-sheet' },
      { label: 'Contacts', target: 'contact-card' },
    ];
  }, [canvasDoc, currentMode]);

  const handleChipPress = (chip: any) => {
    if (chip.target) {
      openSlideCard(chip.target, chip.props || {}, chip.label);
    } else if (chip.action === 'quick_pos') {
      openSlideCard('quick-pos', {}, 'POS Register');
    } else if (chip.label.toLowerCase().includes('stock')) {
      openSlideCard('stock-sheet', {}, 'Stock Sheet');
    } else if (chip.label.toLowerCase().includes('supplier') || chip.label.toLowerCase().includes('contact')) {
      openSlideCard('contact-card', {}, 'Supplier Contact');
    } else if (chip.label.toLowerCase().includes('order') || chip.label.toLowerCase().includes('trip')) {
      openSlideCard('action-confirm', {}, 'Confirmation Review');
    } else {
      openSlideCard('data-grid', { type: 'item' }, chip.label);
    }
  };

  const handleVoicePress = () => {
    if (onVoiceRecord) {
      onVoiceRecord();
    } else {
      openSlideCard('action-confirm', {
        payload: {
          intentType: 'order',
          title: 'Voice Intent Confirmation',
          subtitle: 'Spoken request: "Order restock from supplier"',
          recipient: 'Primary Supplier',
          totalAmount: '$45.00',
          items: [{ name: 'Restock Supply Pack', qty: '1 batch', price: '$45.00' }],
          actionName: 'record_sale',
          actionParams: { title: 'Voice Restock Order', total: 45 },
        },
      }, 'Confirm Voice Order');
    }
  };

  const handleInputSubmit = async () => {
    if (!inputText.trim()) return;
    const sentence = inputText.trim();
    setInputText('');
    setIsTyping(false);

    // 1. Resolve structured intent
    const resolved = resolveIntent(sentence, ['orders', 'inventory', 'crm', 'transactions', 'schedule']);

    if (resolved.action === 'compose_item' && resolved.itemData) {
      if (onExecuteAction) {
        await onExecuteAction('create_item', resolved.itemData);
      }
      return;
    }

    if (resolved.action === 'show_module' && resolved.moduleName) {
      const mod = resolved.moduleName.toLowerCase();
      if (mod === 'inventory' || mod === 'stock') {
        openSlideCard('stock-sheet', {}, 'Inventory Stock');
        return;
      }
      if (mod === 'transactions' || mod === 'orders' || mod === 'pos') {
        openSlideCard('quick-pos', {}, 'POS Register');
        return;
      }
      if (mod === 'crm' || mod === 'contacts' || mod === 'directory') {
        openSlideCard('contact-card', {}, 'Contacts');
        return;
      }
      if (mod === 'pipeline' || mod === 'deals') {
        openSlideCard('pipeline-card', {}, 'Pipeline Deals');
        return;
      }
    }

    // Extract amount if present (e.g. "$45" or "45")
    const priceMatch = sentence.match(/\$?(\d+(?:\.\d{1,2})?)/);
    const parsedAmount = priceMatch ? parseFloat(priceMatch[1]) : 0;

    // Open confirmation review sheet
    openSlideCard('action-confirm', {
      payload: {
        intentType: 'action',
        title: 'Review Action',
        subtitle: `Command: "${sentence}"`,
        totalAmount: parsedAmount > 0 ? `$${parsedAmount.toFixed(2)}` : undefined,
        items: [{ name: sentence, qty: '1 request', price: parsedAmount > 0 ? `$${parsedAmount.toFixed(2)}` : undefined }],
        actionName: parsedAmount > 0 ? 'record_sale' : 'confirm_action',
        actionParams: { title: sentence, total: parsedAmount },
      },
    }, 'Review Action');
  };

  // Live Action Stream blocks (strictly max 3 cards)
  const streamBlocks = useMemo(() => {
    if (canvasDoc?.blocks && canvasDoc.blocks.length > 0) {
      return canvasDoc.blocks.slice(0, 3);
    }
    const rawBlocks = currentMode?.blocks || [];
    return rawBlocks.slice(0, 3);
  }, [currentMode, canvasDoc]);

  // Registry tokens
  const tokenProps = {
    colors: designTokens?.colors || {},
    rounded: designTokens?.rounded || {},
    spacing: designTokens?.spacing || {},
    typography: designTokens?.typography || {},
  };

  const hasWorkspacesList = Boolean(workspaces && workspaces.length > 0);
  const hasMultipleTabs = (hasWorkspacesList && (workspaces?.length || 0) > 1) || (!hasWorkspacesList && lifeModes.length > 1);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* ── ZONE 1: PURE MINIMAL DROPDOWN HEADER ──────────────────────── */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => onOpenSwitcher && onOpenSwitcher()}
        style={styles.zone1}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.workspaceMainTitle} numberOfLines={2}>
              {currentWorkspace?.name || 'Personal Workspace'}
            </Text>
          </View>
          <View style={styles.dropdownCaretBtn}>
            <Ionicons name="chevron-down" size={20} color="#0f172a" />
          </View>
        </View>
      </TouchableOpacity>

      {/* ── TOP AD / ECOSYSTEM SPONSOR BANNER ───────────────────────── */}
      <AdBanner />

      {/* ── ZONE 2: LIVE ACTION STREAM (Max 3 Cards) ──────────────────── */}
      <ScrollView
        style={styles.zone2}
        contentContainerStyle={styles.streamContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {streamBlocks.map((block: CanvasBlock, index: number) => {
          if (!hasComponent(block.type)) {
            console.warn(`[GenUI] Unknown component type: ${block.type}`);
            return null;
          }

          const entry = getComponent(block.type);
          if (!entry) return null;

          const Component = entry.component;

          return (
            <View key={`block_${block.type}_${index}`} style={styles.cardWrapper}>
              <Component
                type={block.type}
                props={block.props || {}}
                designTokens={tokenProps}
                onExecuteAction={onExecuteAction}
              />
            </View>
          );
        })}
      </ScrollView>

      {/* ── ZONE 3: BOTTOM ACTION DOCK ────────────────────────────────── */}
      <View
        style={[
          styles.zone3,
          {
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 10) + 4,
          },
        ]}
      >
        {/* Suggestion Chips matching the clean ChatGPT-style icons and typography */}
        <View style={styles.chipsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
            keyboardShouldPersistTaps="handled"
          >
            {isTyping && liveMatches.length > 0
              ? liveMatches.map((match: any, idx: number) => (
                  <TouchableOpacity
                    key={`match_${idx}`}
                    activeOpacity={0.7}
                    onPress={() => {
                      setInputText('');
                      setIsTyping(false);
                      openSlideCard(match.target || match.type, match.props || {}, match.label);
                    }}
                    style={styles.chip}
                  >
                    <Ionicons name="flash-outline" size={15} color="#18181b" />
                    <Text style={styles.chipText}>{match.label}</Text>
                  </TouchableOpacity>
                ))
              : idleChips.map((chip: any, idx: number) => (
                  <TouchableOpacity
                    key={`chip_${idx}`}
                    activeOpacity={0.7}
                    onPress={() => handleChipPress(chip)}
                    style={styles.chip}
                  >
                    <Ionicons name={getChipIcon(chip.label)} size={15} color="#18181b" />
                    <Text style={styles.chipText}>{chip.label}</Text>
                  </TouchableOpacity>
                ))}
          </ScrollView>
        </View>

        {/* Modern Minimal Input Dock matching ChatGPT design */}
        <View style={styles.dockBar}>
          {/* Plus Add Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (idleChips.length > 0) {
                handleChipPress(idleChips[0]);
              }
            }}
            style={styles.plusBtn}
            hitSlop={6}
          >
            <Ionicons name="add" size={24} color="#18181b" />
          </TouchableOpacity>

          {/* Text Input Field */}
          <TextInput
            style={styles.dockInput}
            placeholder="Ask anything..."
            placeholderTextColor="#71717a"
            value={inputText}
            onChangeText={(txt) => {
              setInputText(txt);
              setIsTyping(txt.length > 0);
            }}
            onSubmitEditing={handleInputSubmit}
            returnKeyType="go"
          />

          {/* Right Action Button */}
          {inputText.trim().length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleInputSubmit}
              style={styles.sendBtnCircle}
            >
              <Ionicons name="arrow-up" size={17} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleVoicePress}
              style={styles.voiceOrbBtn}
            >
              <Ionicons name="mic" size={18} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── EPHEMERAL SLIDE-UP CARD MODAL ─────────────────────────────── */}
      <Modal
        visible={slideCardVisible}
        transparent
        animationType="slide"
        onRequestClose={closeSlideCard}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropDismiss}
            activeOpacity={1}
            onPress={closeSlideCard}
          />

          <View
            style={[
              styles.slideCard,
              {
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            {/* Slide-Up Component Content */}
            <ScrollView
              style={styles.slideCardContent}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {slideCardComponent && hasComponent(slideCardComponent.type) ? (
                (() => {
                  const entry = getComponent(slideCardComponent.type);
                  if (!entry) return null;
                  const Component = entry.component;
                  return (
                    <Component
                      type={slideCardComponent.type}
                      props={slideCardComponent.props || {}}
                      designTokens={tokenProps}
                      onExecuteAction={async (actionName, params) => {
                        if (onExecuteAction) {
                          await onExecuteAction(actionName, params);
                        }
                        // Auto-dismiss on confirmation completion
                        if (actionName === 'confirm_action' || actionName === 'confirm_order') {
                          setTimeout(closeSlideCard, 800);
                        }
                      }}
                    />
                  );
                })()
              ) : (
                <View style={styles.slideCardFallback}>
                  <Text style={styles.slideCardFallbackText}>Tool loaded</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  // Zone 1: Glance Bar
  zone1: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: 12,
  },
  workspaceMainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  dropdownCaretBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Zone 2: Live Action Stream
  zone2: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  streamContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
    backgroundColor: '#ffffff',
  },
  cardWrapper: {
    marginBottom: 10,
  },
  // Zone 3: Bottom Action Dock
  zone3: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  chipsContainer: {
    marginBottom: 10,
  },
  chipsScroll: {
    gap: 8,
    paddingHorizontal: 2,
  },
  chip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 13,
    paddingVertical: 7.5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#18181b',
    letterSpacing: -0.1,
  },
  dockBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 5,
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  plusBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  dockInput: {
    flex: 1,
    fontSize: 15,
    color: '#18181b',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  dockRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  micIconBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceOrbBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.2,
    marginLeft: 2,
  },
  waveBar: {
    width: 2.5,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  sendBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Ephemeral Slide-Up Card
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  slideCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    maxHeight: SCREEN_HEIGHT * 0.92,
    minHeight: 320,
  },
  slideCardContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: '#ffffff',
  },
  slideCardFallback: {
    padding: 32,
    alignItems: 'center',
  },
  slideCardFallbackText: {
    color: '#64748b',
    fontSize: 14,
  },
});
