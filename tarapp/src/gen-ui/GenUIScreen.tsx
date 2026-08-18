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
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getComponent, hasComponent, type SectionProps } from './registry/ComponentRegistry';
import './registry/builtins';
import { CanvasLifeMode, CanvasBlock, CanvasDocument } from '@/lib/layout-engine';
import { resolveIntent } from '@/lib/intent-resolver';

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

// Real operational life modes for workspaces when canvas.md has no custom modes
const DEFAULT_LIFE_MODES: CanvasLifeMode[] = [
  {
    id: 'overview',
    label: 'Overview',
    chips: [
      { label: 'New Sale', target: 'quick-pos' },
      { label: 'Check Stock', target: 'stock-sheet' },
      { label: 'Contacts', target: 'contact-card' },
    ],
    blocks: [
      {
        title: 'Action Inbox',
        type: 'task-inbox',
        props: {
          title: 'Action Inbox',
        },
      },
      {
        title: "Today's Revenue",
        type: 'stat-counter',
        props: {
          title: "Today's Revenue",
          subtitle: 'Live Operations',
        },
      },
      {
        title: 'POS Terminal',
        type: 'quick-pos',
        props: {
          title: 'Quick Billing',
          subtitle: 'Floor Tables & Register',
        },
      },
    ],
  },
  {
    id: 'sales_pos',
    label: 'Sales & POS',
    chips: [
      { label: 'Start Order', target: 'quick-pos' },
      { label: 'Recent Receipts', target: 'data-grid' },
    ],
    blocks: [
      {
        title: 'POS Floor Terminal',
        type: 'quick-pos',
        props: {
          title: 'POS Register',
          subtitle: 'Tap table or order to bill',
        },
      },
      {
        title: "Today's Orders",
        type: 'data-grid',
        props: {
          title: 'Recent Transactions',
          type: 'order',
        },
      },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    chips: [
      { label: 'Stock Sheet', target: 'stock-sheet' },
      { label: 'Product Catalog', target: 'data-grid' },
    ],
    blocks: [
      {
        title: 'Stock Counter',
        type: 'stock-sheet',
        props: {
          title: 'Inventory Stock Sheet',
          subtitle: 'Tap - / + to adjust quantity',
        },
      },
      {
        title: 'All Products',
        type: 'data-grid',
        props: {
          title: 'Catalog Items',
          type: 'product',
        },
      },
    ],
  },
  {
    id: 'directory',
    label: 'Directory',
    chips: [
      { label: 'Add Contact', target: 'contact-card' },
      { label: 'View Pipeline', target: 'pipeline-card' },
    ],
    blocks: [
      {
        title: 'Customer Directory',
        type: 'contact-card',
        props: {},
      },
      {
        title: 'Deal Pipeline',
        type: 'pipeline-card',
        props: {
          title: 'Active Deal Pipeline',
        },
      },
    ],
  },
];

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

  // Pan Responder for downward swipe to close Slide-Up Card (non-blocking)
  const panY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.6) {
          closeSlideCard();
        } else {
          Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const openSlideCard = (type: string, props: Record<string, any> = {}, title?: string) => {
    // Inherit enriched props (such as full contacts list, products, orders) from active blocks
    const matchingBlock = (currentMode?.blocks || []).find((b) => b.type === type);
    const mergedProps = {
      ...(matchingBlock?.props || {}),
      ...props,
      mode: 'list',
    };
    setSlideCardComponent({ type, props: mergedProps, title });
    panY.setValue(0);
    setSlideCardVisible(true);
  };

  const closeSlideCard = () => {
    Animated.timing(panY, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSlideCardVisible(false);
      setSlideCardComponent(null);
      panY.setValue(0);
    });
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
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

      {/* ── ZONE 2: LIVE ACTION STREAM (Max 3 Cards) ──────────────────── */}
      <ScrollView
        style={styles.zone2}
        contentContainerStyle={styles.streamContent}
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
        style={[
          styles.zone3,
          {
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16) + (Platform.OS === 'android' ? 6 : 4),
          },
        ]}
      >
        {/* State 1 & 2: Quick Action Chips */}
        <View style={styles.chipsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
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
                    style={[styles.chip, styles.chipMatch]}
                  >
                    <Ionicons name="flash" size={13} color="#2563eb" />
                    <Text style={styles.chipMatchText}>{match.label}</Text>
                  </TouchableOpacity>
                ))
              : idleChips.map((chip: any, idx: number) => (
                  <TouchableOpacity
                    key={`chip_${idx}`}
                    activeOpacity={0.7}
                    onPress={() => handleChipPress(chip)}
                    style={styles.chip}
                  >
                    <Ionicons name={getChipIcon(chip.label)} size={13.5} color="#475569" />
                    <Text style={styles.chipText}>{chip.label}</Text>
                  </TouchableOpacity>
                ))}
          </ScrollView>
        </View>

        {/* Input Bar with Mic / Send Button */}
        <View style={styles.dockBar}>
          <Ionicons name="search-outline" size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.dockInput}
            placeholder="Search or speak intent..."
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={(txt) => {
              setInputText(txt);
              setIsTyping(txt.length > 0);
            }}
            onSubmitEditing={handleInputSubmit}
            returnKeyType="go"
          />

          {inputText.trim().length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleInputSubmit}
              style={[styles.actionBtn, styles.sendBtn]}
            >
              <Ionicons name="arrow-up" size={16} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleVoicePress}
              style={[styles.actionBtn, styles.micBtn]}
            >
              <Ionicons name="mic" size={16} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* ── EPHEMERAL SLIDE-UP CARD MODAL ─────────────────────────────── */}
      <Modal
        visible={slideCardVisible}
        transparent
        animationType="none"
        onRequestClose={closeSlideCard}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropDismiss}
            activeOpacity={1}
            onPress={closeSlideCard}
          />

          <Animated.View
            style={[
              styles.slideCard,
              {
                transform: [{ translateY: panY }],
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            {/* Swipe Down Drag Handle */}
            <View {...panResponder.panHandlers} style={styles.dragHandleZone}>
              <View style={styles.dragBar} />
              <Text style={styles.dragHint}>Swipe down to close</Text>
            </View>

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
          </Animated.View>
        </View>
      </Modal>
    </View>
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
    backgroundColor: '#f8fafc',
    paddingHorizontal: 13,
    paddingVertical: 7.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipMatch: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    letterSpacing: -0.1,
  },
  chipMatchText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2563eb',
  },
  dockBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 6,
  },
  dockInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0f172a',
    paddingVertical: 6,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  micBtn: {
    backgroundColor: '#0f172a',
  },
  sendBtn: {
    backgroundColor: '#2563eb',
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
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: 320,
  },
  dragHandleZone: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    marginBottom: 4,
  },
  dragHint: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  slideCardContent: {
    paddingHorizontal: 16,
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
