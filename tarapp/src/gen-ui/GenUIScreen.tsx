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
  ActivityIndicator,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getComponent, hasComponent, type SectionProps } from './registry/ComponentRegistry';
import './registry/builtins';
import { CanvasLifeMode, CanvasBlock, CanvasDocument } from '@/lib/layout-engine';
import { resolveIntent } from '@/lib/intent-resolver';
import { tar } from '@/lib/tar';
import { WorkspaceHeader, EmptyState, ContentCard, FirstAction, tokens } from '@/components/ds';

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
    state?: 'provisioning' | 'active' | 'grace' | 'readonly' | 'archived' | 'cold' | 'restoring' | 'error';
  } | null;
  onSelectWorkspace?: (workspace: any) => void;
  onCreateWorkspace?: () => void;
  onOpenSwitcher?: () => void;
  onOpenCanvasCustomizer?: () => void;
  onRenameWorkspace?: () => void;
  assistantReply?: string | null;
  isThinking?: boolean;
  justCreated?: boolean;
  welcomeActions?: Array<{ label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }>;
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
  if (l.includes('agent') || l.includes('plan')) return 'extension-puzzle-outline';
  if (l.includes('customize') || l.includes('canvas')) return 'color-palette-outline';
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
  infoBarText,
  onVoiceRecord,
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onCreateWorkspace,
  onOpenSwitcher,
  onOpenCanvasCustomizer,
  onRenameWorkspace,
  assistantReply,
  isThinking = false,
  justCreated = false,
  welcomeActions = [],
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
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Slide-Up Card state
  const [slideCardVisible, setSlideCardVisible] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
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
    const source = canvasDoc?.chips?.length ? canvasDoc.chips : [];
    return source
      .filter((chip: any) => chip?.label && String(chip.label).toLowerCase().includes(q))
      .slice(0, 5);
  }, [inputText, canvasDoc]);

  // Contextual Chips for active mode in idle state — sourced only from the workspace profile.
  const idleChips = useMemo(() => {
    if (canvasDoc?.chips && canvasDoc.chips.length > 0) {
      return [...canvasDoc.chips];
    }
    if (currentMode?.chips && currentMode.chips.length > 0) {
      return [...currentMode.chips];
    }
    return [];
  }, [canvasDoc, currentMode]);

  const handleChipPress = (chip: any) => {
    if (chip?.action === 'customize_canvas' || String(chip?.label || '').toLowerCase().includes('customize canvas')) {
      if (onOpenCanvasCustomizer) {
        onOpenCanvasCustomizer();
        return;
      }
    }
    if (chip?.target) {
      openSlideCard(chip.target, chip.props || {}, chip.label);
      return;
    }
    if (chip?.action && onExecuteAction) {
      onExecuteAction(chip.action, chip.props || {}).catch((error) => console.warn('[GenUI] Action failed:', error));
      return;
    }
    if (chip?.label) {
      console.warn('[GenUI] Chip has no target or registered action, opening as data-grid fallback', chip);
      openSlideCard('data-grid', { type: 'item' }, chip.label);
    }
  };

  const availableActions = useMemo(() => {
    const actions = canvasDoc?.actions?.length ? canvasDoc.actions : idleChips;
    return actions.filter((item: any, index: number, list: any[]) => item?.label && list.findIndex((candidate) => candidate?.action === item?.action && candidate?.label === item?.label) === index);
  }, [canvasDoc, idleChips]);

  const handleVoicePress = async () => {
    if (onVoiceRecord) {
      onVoiceRecord();
      return;
    }

    if (isRecordingVoice) {
      setIsRecordingVoice(false);
      setIsTranscribing(true);
      try {
        const res = await tar.ai.transcribe('', 'audio/m4a').catch(() => ({ text: '' }));
        const text = (res.text || '').trim();
        if (text) {
          setInputText(text);
          setIsTyping(true);
        }
      } catch (err) {
        console.warn('[GenUIScreen] Voice error:', err);
      } finally {
        setIsTranscribing(false);
      }
    } else {
      setIsRecordingVoice(true);
    }
  };

  const handleInputSubmit = async (overrideText?: string) => {
    const textToSubmit = typeof overrideText === 'string' ? overrideText : inputText;
    if (!textToSubmit.trim()) return;
    const sentence = textToSubmit.trim();
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
    const needsConfirmation = parsedAmount > 0 || /\b(record|log|charge|sell|pay|send|delete|remove|publish)\b/i.test(sentence);

    // Questions and planning requests should go to Tar directly. They are not
    // external actions and must not be presented as a safety review.
    if (!needsConfirmation && onExecuteAction) {
      onExecuteAction('chat', { message: sentence }).catch((error) => console.warn('[GenUI] Chat failed:', error));
      return;
    }

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

  const showStarterWelcome = useMemo(() => streamBlocks.length > 0 && streamBlocks.every((block) => {
    const items = block.props?.tasks ?? block.props?.contacts;
    return Array.isArray(items) && items.length === 0;
  }), [streamBlocks]);

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
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* ── ZONE 1: WORKSPACE HEADER (design-system component) ─────── */}
      <WorkspaceHeader
        title={currentWorkspace?.name || 'Personal Workspace'}
        subtitle={
          currentWorkspace?.state === 'provisioning' || currentWorkspace?.state === 'restoring'
            ? 'Preparing…'
            : currentWorkspace?.state === 'error'
              ? 'Database setup failed'
              : currentWorkspace?.role
                ? currentWorkspace.role === 'owner'
                  ? 'Owner'
                  : currentWorkspace.role === 'admin'
                    ? 'Admin'
                    : 'Member'
                : undefined
        }
        onOpenSwitcher={onOpenSwitcher}
        onRename={onRenameWorkspace}
        busy={currentWorkspace?.state === 'provisioning' || currentWorkspace?.state === 'restoring'}
      />

      {/* ── ZONE 2: LIVE ACTION STREAM (Max 3 Cards) ──────────────────── */}
      <ScrollView
        style={styles.zone2}
        contentContainerStyle={styles.streamContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {(isThinking || assistantReply) && (
          <View style={styles.assistantCard}>
            <View style={styles.assistantIcon}><Ionicons name="chatbox-ellipses" size={17} color={tokens.color.ink} /></View>
            <View style={styles.assistantContent}>
              <Text style={styles.assistantLabel}>Tar</Text>
              {isThinking ? <View style={styles.thinkingRow}><ActivityIndicator size="small" color={tokens.color.ink} /><Text style={styles.thinkingText}>Working…</Text></View> : <Text style={styles.assistantReply}>{assistantReply}</Text>}
            </View>
          </View>
        )}
        {justCreated && welcomeActions.length > 0 ? (
          <ContentCard
            title={`Welcome to ${currentWorkspace?.name || 'your space'}`}
            subtitle="This is a calm place for your everyday work. Tar will help you add what you need as you go."
            style={styles.welcomeCard}
          >
            <View style={styles.welcomeActions}>
              {welcomeActions.slice(0, 3).map((action) => (
                <FirstAction
                  key={action.label}
                  icon={action.icon || 'add-circle-outline'}
                  title={action.label}
                  onPress={action.onPress}
                />
              ))}
            </View>
          </ContentCard>
        ) : null}
        {(streamBlocks.length === 0 || showStarterWelcome) && !justCreated ? (
          <EmptyState
            iconName="apps-outline"
            title="No active cards yet"
            body="Ask Tar to add tasks, products, contacts, or anything else you want to track here."
          />
        ) : null}
        {!showStarterWelcome && streamBlocks.map((block: CanvasBlock, index: number) => {
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
        {/* Suggestion Chips Loaded Dynamically from canvas.md */}
        {idleChips.length > 0 && (
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
                      <Ionicons name="flash-outline" size={14} color="#18181b" />
                      <Text style={styles.chipText}>{match.label}</Text>
                    </TouchableOpacity>
                  ))
                : idleChips.map((chip: any, idx: number) => {
                    return (
                      <TouchableOpacity
                        key={`chip_${idx}`}
                        activeOpacity={0.7}
                        onPress={() => handleChipPress(chip)}
                        style={styles.chip}
                      >
                        <Ionicons
                          name={getChipIcon(chip.label)}
                          size={14}
                          color="#18181b"
                        />
                        <Text style={styles.chipText}>
                          {chip.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
            </ScrollView>
          </View>
        )}

        {/* Modern Minimal Input Dock matching ChatGPT design */}
        <View style={styles.dockBar}>
          {/* Plus Add Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActionMenuVisible(true)}
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
            onSubmitEditing={() => handleInputSubmit()}
            returnKeyType="go"
          />

          {/* Right Action Button */}
          {inputText.trim().length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleInputSubmit()}
              style={styles.sendBtnCircle}
            >
              <Ionicons name="arrow-up" size={17} color="#18181b" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleVoicePress}
              disabled={isTranscribing}
              style={[
                styles.voiceOrbBtn,
                isRecordingVoice && styles.voiceOrbBtnRecording,
              ]}
            >
              <Ionicons
                name={isRecordingVoice ? 'stop' : 'mic'}
                size={isRecordingVoice ? 16 : 18}
                color="#18181b"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal visible={actionMenuVisible} transparent animationType="fade" onRequestClose={() => setActionMenuVisible(false)}>
        <View style={styles.actionMenuBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setActionMenuVisible(false)} />
          <View style={[styles.actionMenu, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <View style={styles.actionMenuHandle} />
            <Text style={styles.actionMenuTitle}>What would you like to do?</Text>
            <Text style={styles.actionMenuSubtitle}>Actions available in this workspace</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.actionMenuList}>
              {availableActions.map((action, index) => (
                <TouchableOpacity key={`${action.action || action.target || action.label}_${index}`} style={styles.actionMenuRow} onPress={() => { setActionMenuVisible(false); handleChipPress(action); }}>
                  <View style={styles.actionMenuIcon}><Ionicons name={getChipIcon(action.label)} size={19} color="#18181b" /></View>
                  <Text style={styles.actionMenuLabel}>{action.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#a1a1aa" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  // Zone 2: Live Action Stream
  zone2: {
    flex: 1,
    backgroundColor: tokens.color.surface,
  },
  streamContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.xl,
    backgroundColor: tokens.color.surface,
  },
  cardWrapper: {
    marginBottom: 10,
  },
  assistantCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 15,
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: tokens.color.surfaceSunk,
    borderWidth: 1,
    borderColor: tokens.color.borderSoft,
  },
  assistantIcon: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.borderSoft,
  },
  assistantContent: { flex: 1 },
  assistantLabel: { ...tokens.type.label, color: tokens.color.inkMuted, textTransform: 'uppercase' },
  assistantReply: { ...tokens.type.body, color: tokens.color.ink, marginTop: 4 },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  thinkingText: { color: tokens.color.ink, fontSize: 14, fontWeight: '600' },
  welcomeCard: { marginBottom: 12 },
  welcomeActions: { gap: 8 },
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
  chipAgent: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#18181b',
    letterSpacing: -0.1,
  },
  chipTextAgent: {
    color: '#065f46',
    fontWeight: '700',
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
    backgroundColor: '#e4e4e7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.2,
    marginLeft: 2,
  },
  voiceOrbBtnRecording: {
    backgroundColor: '#d4d4d8',
  },
  voiceOrbBtnTranscribing: {
    backgroundColor: '#f4f4f5',
    opacity: 0.7,
  },
  waveBar: {
    width: 2.5,
    borderRadius: 2,
    backgroundColor: '#18181b',
  },
  sendBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e4e4e7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.34)',
    justifyContent: 'flex-end',
  },
  actionMenu: {
    maxHeight: SCREEN_HEIGHT * 0.72,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  actionMenuHandle: {
    width: 38,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#d4d4d8',
    alignSelf: 'center',
    marginBottom: 18,
  },
  actionMenuTitle: {
    color: '#18181b',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  actionMenuSubtitle: {
    color: '#71717a',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
  },
  actionMenuList: { paddingBottom: 10 },
  actionMenuRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e4e4e7',
  },
  actionMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMenuLabel: { flex: 1, color: '#18181b', fontSize: 15, fontWeight: '600' },
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
