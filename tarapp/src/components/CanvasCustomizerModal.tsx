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
  Platform,
  Keyboard,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { tar } from '@/lib/tar';
import { parseCanvasMarkdown, CanvasBlock } from '@/lib/layout-engine';
import { getComponent } from '@/gen-ui/registry/ComponentRegistry';
import '@/gen-ui/registry/builtins';

export interface CanvasCustomizerModalProps {
  visible: boolean;
  onClose: () => void;
  scope: string;
  workspaceName?: string;
  vertical?: string;
  activeBlocks?: any[];
  onUpdated: () => void;
}

// Local instant deterministic layout generator (100% reliable offline & online)
function generateLayoutPlanLocally(prompt: string, workspaceName = 'Workspace') {
  const cleanPrompt = prompt.toLowerCase().trim();
  const blocks: CanvasBlock[] = [];
  const chips: any[] = [];

  const hasStock = cleanPrompt.includes('stock') || cleanPrompt.includes('supply') || cleanPrompt.includes('supplies') || cleanPrompt.includes('reorder') || cleanPrompt.includes('inventory');
  const hasCatalog = cleanPrompt.includes('catalog') || cleanPrompt.includes('menu') || cleanPrompt.includes('product') || cleanPrompt.includes('item') || cleanPrompt.includes('grid') || cleanPrompt.includes('items list');
  const hasSales = cleanPrompt.includes('sale') || cleanPrompt.includes('revenue') || cleanPrompt.includes('kpi') || cleanPrompt.includes('metric') || cleanPrompt.includes('total') || cleanPrompt.includes('income') || cleanPrompt.includes('earnings') || cleanPrompt.includes('stats');
  const hasPos = cleanPrompt.includes('pos') || cleanPrompt.includes('register') || cleanPrompt.includes('floor') || cleanPrompt.includes('table') || cleanPrompt.includes('billing') || cleanPrompt.includes('checkout') || cleanPrompt.includes('cashier');
  const hasTasks = cleanPrompt.includes('task') || cleanPrompt.includes('kitchen') || cleanPrompt.includes('order queue') || cleanPrompt.includes('inbox') || cleanPrompt.includes('action inbox') || cleanPrompt.includes('ticket') || cleanPrompt.includes('approval') || cleanPrompt.includes('order');
  const hasContacts = cleanPrompt.includes('contact') || cleanPrompt.includes('supplier') || cleanPrompt.includes('vendor') || cleanPrompt.includes('client') || cleanPrompt.includes('customer') || cleanPrompt.includes('directory') || cleanPrompt.includes('people') || cleanPrompt.includes('phone') || cleanPrompt.includes('patient');
  const hasPipeline = cleanPrompt.includes('deal') || cleanPrompt.includes('pipeline') || cleanPrompt.includes('catering') || cleanPrompt.includes('event') || cleanPrompt.includes('lead');
  const hasConfirm = cleanPrompt.includes('confirm') || cleanPrompt.includes('review') || cleanPrompt.includes('dispatch') || cleanPrompt.includes('trip') || cleanPrompt.includes('delivery');

  // Add requested blocks additively
  if (hasStock) {
    blocks.push({
      id: 'blk_stock_sheet',
      title: 'Low Stock Inventory',
      type: 'stock-sheet',
      roles: ['owner', 'manager', 'staff'],
      props: {
        title: 'Low Stock Stepper',
        subtitle: 'Tap [-] or [+] to adjust live quantity',
        query: "SELECT id, title, qty, min_qty, price FROM matter WHERE type = 1 AND qty <= min_qty ORDER BY qty ASC",
      },
    });
    chips.push({ label: 'Check Stock', target: 'stock-sheet' });
  }

  if (hasSales) {
    blocks.push({
      id: 'blk_sales_kpi',
      title: 'Shift Net Total',
      type: 'metric-card',
      roles: ['owner', 'manager'],
      props: {
        title: "Today's Shift Sales",
        query: "SELECT COALESCE(SUM(amount), 0) AS value, COUNT(*) AS count FROM motion WHERE at >= unixepoch('start of day')",
        valueFormat: 'currency',
      },
    });
    chips.push({ label: 'Shift Sales', target: 'metric-card' });
  }

  if (hasPos) {
    blocks.push({
      id: 'blk_table_pos',
      title: 'Floor Register',
      type: 'quick-pos',
      roles: ['owner', 'manager', 'cashier', 'staff'],
      props: {
        title: 'Floor Table POS',
        catalogType: 'product',
      },
    });
    chips.push({ label: 'New Sale', target: 'quick-pos' });
  }

  if (hasTasks) {
    blocks.push({
      id: 'blk_action_inbox',
      title: 'Action Inbox',
      type: 'task-inbox',
      roles: ['owner', 'manager', 'staff'],
      props: {
        title: cleanPrompt.includes('kitchen') ? 'Active Kitchen Orders' : 'Action Inbox',
        query: "SELECT id, title, status, data FROM matter WHERE type = 10 AND status = 'pending' ORDER BY at ASC",
      },
    });
    chips.push({ label: 'Task Inbox', target: 'task-inbox' });
  }

  if (hasCatalog && !hasStock) {
    blocks.push({
      id: 'blk_inventory_catalog',
      title: 'Full Product Catalog',
      type: 'data-grid',
      roles: ['owner', 'manager', 'staff'],
      props: {
        title: 'Product Catalog',
        query: "SELECT id, title, price, status FROM matter WHERE type = 1 ORDER BY title ASC LIMIT 20",
        columns: ['title', 'price', 'status'],
      },
    });
    chips.push({ label: 'Catalog', target: 'data-grid' });
  } else if (hasCatalog && hasStock && (cleanPrompt.includes('catalog') || cleanPrompt.includes('menu') || cleanPrompt.includes('grid'))) {
    blocks.push({
      id: 'blk_inventory_catalog',
      title: 'Full Product Catalog',
      type: 'data-grid',
      roles: ['owner', 'manager', 'staff'],
      props: {
        title: 'Product Catalog',
        query: "SELECT id, title, price, status FROM matter WHERE type = 1 ORDER BY title ASC LIMIT 20",
        columns: ['title', 'price', 'status'],
      },
    });
    chips.push({ label: 'Catalog', target: 'data-grid' });
  }

  if (hasContacts) {
    blocks.push({
      id: 'blk_contacts',
      title: 'Contacts Directory',
      type: 'contact-card',
      roles: ['owner', 'manager', 'staff'],
      props: {
        title: cleanPrompt.includes('supplier') || cleanPrompt.includes('vendor') ? 'Supplier Directory' : 'Contact Directory',
        query: "SELECT id, title, data FROM matter WHERE type = 1 ORDER BY title ASC LIMIT 20",
      },
    });
    chips.push({ label: 'Contacts', target: 'contact-card' });
  }

  if (hasPipeline) {
    blocks.push({
      id: 'blk_pipeline',
      title: 'Deal Pipeline',
      type: 'pipeline-card',
      roles: ['owner', 'manager'],
      props: {
        title: 'Deals & Bookings Pipeline',
        query: "SELECT id, title, data FROM matter WHERE type = 14 ORDER BY updated DESC LIMIT 10",
      },
    });
    chips.push({ label: 'Pipeline', target: 'pipeline-card' });
  }

  if (hasConfirm) {
    blocks.push({
      id: 'blk_action_confirm',
      title: 'Action Review & Confirm',
      type: 'action-confirm',
      roles: ['owner', 'manager', 'staff'],
      props: {
        title: 'Review & Confirm',
      },
    });
    chips.push({ label: 'Review', target: 'action-confirm' });
  }

  // If no specific keyword was recognized, provide a standard balanced starter layout
  if (blocks.length === 0) {
    blocks.push(
      {
        id: 'blk_sales_kpi',
        title: 'Shift Net Total',
        type: 'metric-card',
        roles: ['owner', 'manager'],
        props: {
          title: "Today's Shift Sales",
          query: "SELECT COALESCE(SUM(amount), 0) AS value, COUNT(*) AS count FROM motion WHERE at >= unixepoch('start of day')",
          valueFormat: 'currency',
        },
      },
      {
        id: 'blk_table_pos',
        title: 'Floor Register',
        type: 'quick-pos',
        roles: ['owner', 'manager', 'cashier', 'staff'],
        props: {
          title: 'Floor Table POS',
          catalogType: 'product',
        },
      },
      {
        id: 'blk_stock_sheet',
        title: 'Low Stock Watch',
        type: 'stock-sheet',
        roles: ['owner', 'manager', 'staff'],
        props: {
          title: 'Critical Stock Stepper',
          subtitle: 'Tap [-] or [+] to adjust live quantity',
          query: "SELECT id, title, qty, min_qty, price FROM matter WHERE type = 1 AND qty <= min_qty ORDER BY qty ASC",
        },
      }
    );
    chips.push(
      { label: 'New Sale', target: 'quick-pos' },
      { label: 'Check Stock', target: 'stock-sheet' },
      { label: 'Kitchen Queue', target: 'task-inbox' }
    );
  }

  const chipsYaml = chips.map((c) => `  - label: "${c.label}"\n    target: "${c.target}"`).join('\n');
  const blocksYaml = blocks
    .map((b) => {
      let blk = `  - id: "${b.id || `blk_${b.type}`}"\n    title: "${b.title}"\n    type: "${b.type}"`;
      if (b.roles && b.roles.length > 0) {
        blk += `\n    roles: [${b.roles.map((r: string) => `"${r}"`).join(', ')}]`;
      }
      blk += `\n    props: ${JSON.stringify(b.props || {})}`;
      return blk;
    })
    .join('\n');

  const canvasMarkdown = `---
type: CanvasLayout
title: "${workspaceName} Canvas"
timestamp: "${new Date().toISOString()}"
chips:
${chipsYaml}
blocks:
${blocksYaml}
---

# Workspace Canvas
`;

  return { chips, blocks, canvasMarkdown };
}

const DEFAULT_DESIGN_TOKENS = { colors: {}, rounded: {}, spacing: {}, typography: {} };

export default function CanvasCustomizerModal({
  visible,
  onClose,
  scope,
  workspaceName = 'Workspace',
  vertical = 'business',
  activeBlocks = [],
  onUpdated,
}: CanvasCustomizerModalProps) {
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const [lastGeneratedPrompt, setLastGeneratedPrompt] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [proposedBlocks, setProposedBlocks] = useState<CanvasBlock[]>([]);
  const [proposedChips, setProposedChips] = useState<any[]>([]);
  const [proposedMarkdown, setProposedMarkdown] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Enrich blocks by querying live workspace SQLite records
  // Canvas is presentation-only. Tarai resolves registered data views; this
  // app never evaluates SQL supplied through OKF, AI output, or a channel.
  const enrichBlocksWithLiveDb = useCallback(async (blocksToEnrich: CanvasBlock[]) => blocksToEnrich, []);

  useEffect(() => {
    if (visible && scope) {
      setInputText('');
      setLastGeneratedPrompt(null);
      setProposedBlocks([]);
      setProposedChips([]);
      setProposedMarkdown(null);
      setHasGenerated(false);
      setFeedback(null);
    }
  }, [visible, scope]);

  // Voice transcription for a reviewed canvas patch (matter.md §9).
  const handleVoiceToggle = async () => {
    if (isRecording) {
      setIsRecording(false);
      setProcessing(true);
      try {
        const res = await tar.ai.transcribe('', 'audio/m4a').catch(() => ({ text: '' }));
        const transcribedText = res.text || '';
        if (transcribedText.trim()) {
          setInputText(transcribedText);
          setFeedback(null);
          await handleGenerateLayout(transcribedText);
        } else {
          setFeedback('No speech detected. Please try speaking again.');
        }
      } catch (err: any) {
        setFeedback(`Voice error: ${err.message || 'Speech recognition failed'}`);
      } finally {
        setProcessing(false);
      }
    } else {
      setIsRecording(true);
      setFeedback('Listening... Tap mic again when finished speaking.');
    }
  };

function mergeBlocks(existingBlocks: CanvasBlock[], newBlocks: CanvasBlock[], isReset = false): CanvasBlock[] {
  if (isReset || !existingBlocks || existingBlocks.length === 0) {
    return newBlocks;
  }
  const merged = [...existingBlocks];
  for (const nb of newBlocks) {
    const existingIdx = merged.findIndex((eb) => eb.type === nb.type || eb.id === nb.id);
    if (existingIdx >= 0) {
      merged[existingIdx] = nb;
    } else {
      merged.push(nb);
    }
  }
  return merged.slice(0, 4);
}

function mergeChips(existingChips: any[], newChips: any[], isReset = false): any[] {
  if (isReset || !existingChips || existingChips.length === 0) {
    return newChips;
  }
  const merged = [...existingChips];
  for (const nc of newChips) {
    if (!merged.some((ec) => ec.target === nc.target || ec.label === nc.label)) {
      merged.push(nc);
    }
  }
  return merged.slice(0, 5);
}

  const handleGenerateLayout = async (customPrompt?: string) => {
    const textToRun = (customPrompt || inputText).trim();
    if (!textToRun || !scope || processing) return;

    Keyboard.dismiss();
    setProcessing(true);
    setFeedback(null);
    try {
      // 1. Fetch current live blocks from workspace to preserve existing layout
      let existingBlocks: CanvasBlock[] = activeBlocks && activeBlocks.length > 0 ? [...activeBlocks] : [];
      let existingChips: any[] = [];
      try {
        const res = await tar.okf.read(scope, 'team/canvas.md');
        if (res?.content) {
          const parsed = parseCanvasMarkdown(res.content);
          const liveBlocks = parsed.blocks && parsed.blocks.length > 0 ? parsed.blocks : (parsed.lifeModes?.[0]?.blocks || []);
          if (liveBlocks.length > 0) {
            existingBlocks = liveBlocks;
          }
          if (parsed.chips && parsed.chips.length > 0) {
            existingChips = parsed.chips;
          }
        }
      } catch (e) {}

      const cleanLower = textToRun.toLowerCase();
      const isResetPrompt = cleanLower.includes('reset') || cleanLower.includes('replace all') || cleanLower.includes('clear canvas');

      // 2. Generate instant deterministic granular layout plan for requested items
      const localPlan = generateLayoutPlanLocally(textToRun, workspaceName);

      // 3. Merge new blocks with existing blocks (preserves other cards on save)
      const mergedBlocks = mergeBlocks(existingBlocks, localPlan.blocks, isResetPrompt);
      const mergedChips = mergeChips(existingChips, localPlan.chips, isResetPrompt);

      // 4. Enrich proposed blocks with live Turso database records
      const enriched = await enrichBlocksWithLiveDb(mergedBlocks);

      // 5. Construct updated markdown with preserved + new blocks
      const chipsYaml = mergedChips.map((c) => `  - label: "${c.label}"\n    target: "${c.target}"`).join('\n');
      const blocksYaml = enriched
        .map((b) => {
          let blk = `  - id: "${b.id || `blk_${b.type}`}"\n    title: "${b.title}"\n    type: "${b.type}"`;
          if (b.roles && b.roles.length > 0) {
            blk += `\n    roles: [${b.roles.map((r: string) => `"${r}"`).join(', ')}]`;
          }
          blk += `\n    props: ${JSON.stringify(b.props || {})}`;
          return blk;
        })
        .join('\n');

      const fullMarkdown = `---
type: CanvasLayout
title: "${workspaceName} Canvas"
timestamp: "${new Date().toISOString()}"
chips:
${chipsYaml}
blocks:
${blocksYaml}
---

# Workspace Canvas
`;

      setProposedBlocks(enriched);
      setProposedChips(mergedChips);
      setProposedMarkdown(fullMarkdown);
      setLastGeneratedPrompt(textToRun);
      setHasGenerated(true);
    } catch (err: any) {
      console.warn('[CanvasCustomizer] Plan error:', err);
      setFeedback(`Error: ${err.message || 'Failed to generate layout'}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyCanvas = async () => {
    if (!scope || applying) return;
    setApplying(true);
    try {
      let mdToUpload = proposedMarkdown;
      if (!mdToUpload && proposedBlocks.length > 0) {
        const chipsYaml = proposedChips.map((c) => `  - label: "${c.label}"\n    target: "${c.target}"`).join('\n');
        const blocksYaml = proposedBlocks
          .map((b) => {
            let blk = `  - id: "${b.id || `blk_${b.type}`}"\n    title: "${b.title}"\n    type: "${b.type}"`;
            if (b.roles && b.roles.length > 0) {
              blk += `\n    roles: [${b.roles.map((r: string) => `"${r}"`).join(', ')}]`;
            }
            blk += `\n    props: ${JSON.stringify(b.props || {})}`;
            return blk;
          })
          .join('\n');

        mdToUpload = `---
type: CanvasLayout
title: "${workspaceName} Canvas"
timestamp: "${new Date().toISOString()}"
chips:
${chipsYaml}
blocks:
${blocksYaml}
---

# Workspace Canvas
`;
      }

      if (mdToUpload) {
        await tar.okf.upload(scope, 'team/canvas.md', mdToUpload);
        onUpdated();
        setTimeout(() => {
          onClose();
        }, 200);
      }
    } catch (err: any) {
      setFeedback(`Failed to apply canvas: ${err.message}`);
    } finally {
      setApplying(false);
    }
  };

  const isPromptEdited = inputText.trim() !== (lastGeneratedPrompt || '');
  const isReadyToApply = hasGenerated && !isPromptEdited && proposedBlocks.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 8) }]}>
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
          style={styles.contentFlex}
        >
          {/* Minimalist Top Header */}
          <View style={styles.topBar}>
            <View>
              <Text style={styles.screenHeading}>{workspaceName}</Text>
              <Text style={styles.screenSubheading}>Canvas Customizer</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={14} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#0f172a" />
            </TouchableOpacity>
          </View>

          {/* Spacious Live Cards Preview */}
          <ScrollView
            style={styles.previewScroll}
            contentContainerStyle={styles.previewContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {proposedBlocks.length === 0 ? (
              <View style={styles.emptyHero}>
                <Ionicons name="color-wand-outline" size={36} color="#6366f1" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>Customize Canvas</Text>
                <Text style={styles.emptySubtitle}>
                  Type what tools you want on your screen (e.g. low stock, table POS, kitchen orders)
                </Text>
              </View>
            ) : (
              <View style={styles.cardsStack}>
                {proposedBlocks.map((block, idx) => {
                  const entry = getComponent(block.type);
                  if (!entry) return null;
                  const Component = entry.component;
                  return (
                    <View key={`blk_${idx}_${block.id || block.type}`} style={styles.cardItem}>
                      <Component
                        type={block.type}
                        props={block.props || {}}
                        designTokens={DEFAULT_DESIGN_TOKENS}
                        onExecuteAction={async () => ({ success: true })}
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Status Toast (only if active) */}
          {feedback && (
            <View style={styles.toast}>
              <Text style={styles.toastText}>{feedback}</Text>
            </View>
          )}

          {/* Clean Flush Bottom Control Deck */}
          <View
            style={[
              styles.controlDeck,
              {
                paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 12),
              },
            ]}
          >
            {/* Input Box */}
            <View style={styles.inputCard}>
              <TextInput
                style={styles.dockInput}
                placeholder="What would you like on your screen?"
                placeholderTextColor="#94a3b8"
                value={inputText}
                onChangeText={setInputText}
                multiline
                textAlignVertical="top"
                autoCapitalize="sentences"
                autoCorrect
              />
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleVoiceToggle}
                style={[styles.micBtn, isRecording && styles.micBtnRecording]}
              >
                <Ionicons
                  name={isRecording ? 'stop' : 'mic'}
                  size={18}
                  color="#0f172a"
                />
              </TouchableOpacity>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={isReadyToApply ? handleApplyCanvas : () => handleGenerateLayout()}
              disabled={processing || applying || (!isReadyToApply && !inputText.trim())}
              style={[
                styles.actionBtn,
                (!isReadyToApply && !inputText.trim() && !processing) && styles.btnDisabled,
                isReadyToApply && styles.btnSuccess,
              ]}
            >
              {processing || applying ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.actionBtnText}>
                  {isReadyToApply ? 'Apply Canvas' : 'Generate Layout'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentFlex: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  screenHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  screenSubheading: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewScroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  previewContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  emptyHero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  cardsStack: {
    gap: 12,
  },
  cardItem: {
    marginBottom: 2,
  },
  toast: {
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  controlDeck: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  inputCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    minHeight: 74,
    maxHeight: 110,
    marginBottom: 10,
    position: 'relative',
  },
  dockInput: {
    fontSize: 15,
    color: '#0f172a',
    paddingRight: 40,
    lineHeight: 20,
  },
  micBtn: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnRecording: {
    backgroundColor: '#fee2e2',
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 14,
    height: 48,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnSuccess: {
    backgroundColor: '#10b981',
  },
});
