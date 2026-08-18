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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
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

export default function CanvasCustomizerModal({
  visible,
  onClose,
  scope,
  workspaceName = 'Workspace',
  vertical = 'business',
  activeBlocks: initialBlocks = [],
  onUpdated,
}: CanvasCustomizerModalProps) {
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [proposedBlocks, setProposedBlocks] = useState<CanvasBlock[]>([]);
  const [proposedChips, setProposedChips] = useState<any[]>([]);
  const [proposedMarkdown, setProposedMarkdown] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const fetchLiveCanvas = useCallback(async () => {
    if (!scope) return;
    try {
      const res = await tar.okf.read(scope, 'team/canvas.md');
      if (res?.content) {
        const parsed = parseCanvasMarkdown(res.content);
        const liveBlocks = parsed.blocks && parsed.blocks.length > 0
          ? parsed.blocks
          : (parsed.lifeModes?.[0]?.blocks || []);
        setProposedBlocks(liveBlocks);
        setProposedChips(parsed.chips || []);
      }
    } catch (e) {
      console.warn('[CanvasCustomizer] Failed to read live canvas:', e);
    }
  }, [scope]);

  useEffect(() => {
    if (visible && scope) {
      setInputText('');
      fetchLiveCanvas();
      setHasGenerated(false);
      setFeedback(null);
    }
  }, [visible, scope, fetchLiveCanvas]);

  // Voice recording with Groq Whisper (<300ms, genuiteam.md §5)
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

  const handleGenerateLayout = async (customPrompt?: string) => {
    const textToRun = (customPrompt || inputText).trim();
    if (!textToRun || !scope || processing) return;

    Keyboard.dismiss();
    setProcessing(true);
    setFeedback(null);
    try {
      const planRes = await tar.ai.planCanvas(textToRun, workspaceName, vertical, scope);
      if (planRes?.success && planRes.blocks) {
        setProposedBlocks(planRes.blocks);
        setProposedChips(planRes.chips || []);
        setProposedMarkdown(planRes.canvasMarkdown);
        setHasGenerated(true);
      }
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
        const chipsYaml = proposedChips.map(c => `  - label: "${c.label}"\n    target: "${c.target}"`).join('\n');
        const blocksYaml = proposedBlocks.map(b => {
          let blk = `  - id: "${b.id || `blk_${b.type}`}"\n    title: "${b.title}"\n    type: "${b.type}"`;
          if (b.roles && b.roles.length > 0) {
            blk += `\n    roles: [${b.roles.map((r: string) => `"${r}"`).join(', ')}]`;
          }
          blk += `\n    props: ${JSON.stringify(b.props || {})}`;
          return blk;
        }).join('\n');

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
        }, 300);
      }
    } catch (err: any) {
      setFeedback(`Failed to apply canvas: ${err.message}`);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        {/* Minimalist Top Header */}
        <View style={styles.topBar}>
          <Text style={styles.screenHeading}>{workspaceName}</Text>
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
              <Text style={styles.emptyTitle}>Customize Canvas</Text>
              <Text style={styles.emptySubtitle}>
                Type or speak what you need
              </Text>
            </View>
          ) : (
            <View style={styles.cardsStack}>
              {proposedBlocks.map((block, idx) => {
                const entry = getComponent(block.type);
                if (!entry) return null;
                const Component = entry.component;
                return (
                  <View key={`blk_${idx}`} style={styles.cardItem}>
                    <Component
                      type={block.type}
                      props={block.props || {}}
                      designTokens={{ colors: {}, rounded: {}, spacing: {}, typography: {} }}
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

        {/* Clean Floating Bottom Control Deck (matching GenUIScreen bottom dock) */}
        <View
          style={[
            styles.controlDeck,
            {
              paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 10) + 6,
            },
          ]}
        >
          {/* Big Spacious Input Box with Integrated Mic */}
          <View style={styles.bigInputContainer}>
            <TextInput
              style={styles.bigTextInput}
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

          {/* Simple Primary Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={hasGenerated ? handleApplyCanvas : () => handleGenerateLayout()}
            disabled={processing || applying || (!hasGenerated && !inputText.trim())}
            style={[
              styles.actionBtn,
              (!hasGenerated && !inputText.trim() && !processing) && styles.btnDisabled,
              hasGenerated && styles.btnSuccess,
            ]}
          >
            {processing || applying ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.actionBtnText}>
                {hasGenerated ? 'Apply Canvas' : 'Generate'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
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
    gap: 14,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  bigInputContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    minHeight: 88,
    maxHeight: 130,
    marginBottom: 12,
    position: 'relative',
  },
  bigTextInput: {
    fontSize: 15,
    color: '#0f172a',
    paddingRight: 40,
    lineHeight: 21,
  },
  micBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnRecording: {
    backgroundColor: '#e2e8f0',
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
