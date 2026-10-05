import Ionicons from '@expo/vector-icons/Ionicons';
import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createOperationKey, harness, type FlowStepMatch } from '@/lib/harness';
import type { ActionInterfaceProps } from './types';

const READY_FLOWS = [
  {
    name: 'Closing the shop',
    steps: [
      'Count the cash drawer',
      'Check the stock',
      'Send the day report to owner',
      'Lock the shop',
    ],
  },
  {
    name: 'Opening the shop',
    steps: [
      'Unlock the shop',
      'Open the cash drawer',
      'Check opening stock',
      'Start the register',
    ],
  },
  {
    name: 'New order',
    steps: [
      'Order arrives',
      'Accept the order',
      'Prepare and pack',
      'Hand over or deliver',
      'Take payment',
    ],
  },
  {
    name: 'Daily stock check',
    steps: [
      'Count shelves stock',
      'Record damaged or expired items',
      'Update stock in app',
      'Send low stock alert to owner',
    ],
  },
];

const bookActions = new Set([
  'record.create',
  'contact.create',
  'organization.create',
  'task.create',
  'site.generate',
  'web.search',
  'pos.register.count',
  'pos.register.close',
]);
const unattendedActions = new Set([
  'record.create',
  'contact.create',
  'organization.create',
  'task.create',
]);

type EditableFlowStep = FlowStepMatch & {
  chosenKind?: 'human' | 'tool';
  chosenToolId?: string | null;
  chosenToolTitle?: string | null;
};

export default function FlowBuilderInterface(props: ActionInterfaceProps) {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<'start' | 'check'>('start');
  const [name, setName] = useState('Closing the shop');
  const [isRenaming, setIsRenaming] = useState(false);
  const [linesText, setLinesText] = useState('');
  const [steps, setSteps] = useState<EditableFlowStep[]>([]);
  const [matching, setMatching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingStep, setAddingStep] = useState(false);
  const [newStepText, setNewStepText] = useState('');
  const [flowId] = useState(
    () => `book.${Crypto.randomUUID().replace(/[^a-z0-9]/g, '').slice(0, 32)}`,
  );

  const matchAndProceed = async (flowName: string, lines: string[]) => {
    if (!lines.length) {
      Alert.alert('No steps', 'Enter at least one step for this flow.');
      return;
    }
    setName(flowName);
    setMatching(true);
    try {
      const result = await harness.matchFlowSteps(props.scope, lines);
      setSteps(
        result.steps.map((s) => ({
          ...s,
          chosenKind: s.kind,
          chosenToolId: s.toolId,
          chosenToolTitle: s.toolTitle,
        })),
      );
      setScreen('check');
    } catch {
      // Fallback: convert all lines to 'human' (You do) steps
      setSteps(
        lines.map((line, index) => ({
          line,
          stepNumber: index + 1,
          kind: 'human',
          chosenKind: 'human',
          toolId: null,
          toolTitle: null,
          confidence: 1.0,
          asksFirst: false,
        })),
      );
      setScreen('check');
    } finally {
      setMatching(false);
    }
  };

  const chooseReadyFlow = (preset: (typeof READY_FLOWS)[number]) => {
    setLinesText(preset.steps.join('\n'));
    void matchAndProceed(preset.name, preset.steps);
  };

  const onNextFromStart = () => {
    const lines = linesText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) {
      Alert.alert('Say your steps', 'Type at least one step, one per line.');
      return;
    }
    const chosenName = name.trim() || lines[0].slice(0, 40) || 'New flow';
    void matchAndProceed(chosenName, lines);
  };

  const saveAndUse = async () => {
    if (saving) return;
    if (!steps.length) {
      Alert.alert('No steps', 'Add at least one step.');
      return;
    }
    setSaving(true);
    try {
      const actions = steps.map((step) => {
        const isTool = (step.chosenKind || step.kind) === 'tool';
        const toolId = step.chosenToolId !== undefined ? step.chosenToolId : step.toolId;
        let actionId = 'task.create';
        if (isTool && toolId) {
          if (toolId === 'contact' || toolId === 'chat') actionId = 'contact.create';
          else if (toolId === 'register') actionId = 'pos.register.count';
          else if (toolId === 'site') actionId = 'site.generate';
        }
        if (!bookActions.has(actionId)) actionId = 'task.create';
        const isAuto = isTool && !step.asksFirst && unattendedActions.has(actionId);
        return {
          id: actionId,
          auto: isAuto,
          role: isAuto ? '' : 'any',
          input: {
            title: step.line,
            prompt: step.line,
          },
        };
      });

      const payload = {
        flowId,
        name: name.trim() || 'New flow',
        description: `Flow with ${actions.length} steps`,
        actions,
      };

      const result = await harness.executeAction(
        props.scope,
        props.action.id,
        payload,
        createOperationKey('flow.publish'),
      );
      props.onSuccess(result);
    } catch (cause) {
      Alert.alert('Could not save flow', cause instanceof Error ? cause.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const selectAlternative = (index: number, toolId: string, toolTitle: string) => {
    setSteps((prev) =>
      prev.map((s, i) =>
        i === index
          ? {
              ...s,
              chosenKind: 'tool',
              chosenToolId: toolId,
              chosenToolTitle: toolTitle,
              confidence: 1.0,
            }
          : s,
      ),
    );
  };

  const selectHuman = (index: number) => {
    setSteps((prev) =>
      prev.map((s, i) =>
        i === index
          ? {
              ...s,
              chosenKind: 'human',
              confidence: 1.0,
            }
          : s,
      ),
    );
  };

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={props.onClose}
    >
      <View style={[styles.page, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          {screen === 'check' ? (
            <Pressable
              onPress={() => setScreen('start')}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={24} color="#172033" />
            </Pressable>
          ) : (
            <Pressable
              onPress={props.onClose}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color="#172033" />
            </Pressable>
          )}

          <View style={styles.headerCopy}>
            {screen === 'check' && isRenaming ? (
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.renameInput}
                autoFocus
                onBlur={() => setIsRenaming(false)}
              />
            ) : (
              <Text style={styles.title} numberOfLines={1}>
                {screen === 'start' ? 'New flow' : name}
              </Text>
            )}
            <Text style={styles.subtitle}>
              {screen === 'start'
                ? 'Start with a ready one or say your steps'
                : 'Check, fix, and save flow'}
            </Text>
          </View>

          {screen === 'check' && (
            <Pressable
              onPress={() => setIsRenaming((curr) => !curr)}
              style={styles.renameButton}
              accessibilityRole="button"
            >
              <Text style={styles.renameText}>{isRenaming ? 'Done' : 'Rename'}</Text>
            </Pressable>
          )}
        </View>

        {/* Screen 7a: Start */}
        {screen === 'start' && (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionHeading}>START WITH A READY ONE</Text>
            <View style={styles.readyGrid}>
              {READY_FLOWS.map((preset) => (
                <Pressable
                  key={preset.name}
                  onPress={() => chooseReadyFlow(preset)}
                  disabled={matching}
                  style={styles.readyCard}
                  accessibilityRole="button"
                >
                  <Ionicons name="git-branch-outline" size={18} color="#3157A8" />
                  <Text style={styles.readyCardTitle}>{preset.name}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.divider} />

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>OR SAY YOUR STEPS, ONE PER LINE</Text>
              <Ionicons name="mic-outline" size={18} color="#68758c" />
            </View>

            <TextInput
              value={linesText}
              onChangeText={setLinesText}
              placeholder={'Count the cash\nCheck the stock\nSend the day report to owner'}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={6}
              style={styles.stepsTextArea}
            />

            <Pressable
              disabled={matching}
              onPress={onNextFromStart}
              style={[styles.primaryButton, matching && styles.disabled]}
              accessibilityRole="button"
            >
              {matching ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Next ›</Text>
              )}
            </Pressable>
          </ScrollView>
        )}

        {/* Screen 7b: Check and Save */}
        {screen === 'check' && (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.stepsList}>
              {steps.map((step, index) => {
                const isHuman = (step.chosenKind || step.kind) === 'human';
                const toolName =
                  step.chosenToolTitle || step.toolTitle || step.chosenToolId || step.toolId || 'App tool';
                const needsChoice = step.confidence < 0.80 && !step.chosenKind;

                return (
                  <View key={`${step.line}-${index}`} style={styles.stepCard}>
                    <View style={styles.stepTopRow}>
                      <View style={styles.stepNumberBadge}>
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.stepLineText}>{step.line}</Text>
                      <Pressable
                        onPress={() => removeStep(index)}
                        style={styles.stepRemoveButton}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove step ${index + 1}`}
                      >
                        <Ionicons name="trash-outline" size={17} color="#9ca3af" />
                      </Pressable>
                    </View>

                    {/* Matched kind badge or choice chips */}
                    {needsChoice ? (
                      <View style={styles.choiceSection}>
                        <Text style={styles.choicePrompt}>Pick one:</Text>
                        <View style={styles.choiceChipsRow}>
                          {step.suggestions?.map((alt) => (
                            <Pressable
                              key={alt.toolId}
                              onPress={() => selectAlternative(index, alt.toolId, alt.title)}
                              style={styles.choiceChip}
                            >
                              <Text style={styles.choiceChipText}>{alt.title}</Text>
                            </Pressable>
                          ))}
                          <Pressable
                            onPress={() => selectHuman(index)}
                            style={styles.choiceChip}
                          >
                            <Text style={styles.choiceChipText}>I’ll do it</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.kindRow}>
                        <View
                          style={[
                            styles.kindBadge,
                            isHuman ? styles.kindBadgeHuman : styles.kindBadgeTool,
                          ]}
                        >
                          <Ionicons
                            name={isHuman ? 'hand-left-outline' : 'construct-outline'}
                            size={13}
                            color={isHuman ? '#3157A8' : '#18865B'}
                          />
                          <Text
                            style={[
                              styles.kindBadgeText,
                              isHuman ? styles.kindBadgeTextHuman : styles.kindBadgeTextTool,
                            ]}
                          >
                            {isHuman ? 'You do' : `App: ${toolName}`}
                          </Text>
                        </View>

                        {step.asksFirst ? (
                          <View style={styles.safetyBadge}>
                            <Ionicons name="alert-circle-outline" size={13} color="#A66D00" />
                            <Text style={styles.safetyBadgeText}>Asks you first</Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Add Step row */}
            {addingStep ? (
              <View style={styles.addStepRow}>
                <TextInput
                  value={newStepText}
                  onChangeText={setNewStepText}
                  placeholder="e.g. Lock the shop"
                  placeholderTextColor="#9ca3af"
                  style={styles.addStepInput}
                  autoFocus
                />
                <Pressable
                  onPress={() => {
                    if (newStepText.trim()) {
                      setSteps((prev) => [
                        ...prev,
                        {
                          line: newStepText.trim(),
                          stepNumber: prev.length + 1,
                          kind: 'human',
                          chosenKind: 'human',
                          toolId: null,
                          toolTitle: null,
                          confidence: 1.0,
                          asksFirst: false,
                        },
                      ]);
                      setNewStepText('');
                      setAddingStep(false);
                    }
                  }}
                  style={styles.addStepConfirm}
                >
                  <Text style={styles.addStepConfirmText}>Add</Text>
                </Pressable>
                <Pressable
                  onPress={() => setAddingStep(false)}
                  style={styles.addStepCancel}
                >
                  <Ionicons name="close" size={20} color="#68758c" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setAddingStep(true)}
                style={styles.addStepButton}
                accessibilityRole="button"
              >
                <Ionicons name="add" size={18} color="#3157A8" />
                <Text style={styles.addStepButtonText}>+ Add a step</Text>
              </Pressable>
            )}

            <View style={styles.footerSpacing} />

            <Pressable
              disabled={saving}
              onPress={() => void saveAndUse()}
              style={[styles.primaryButton, saving && styles.disabled]}
              accessibilityRole="button"
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Save and use</Text>
              )}
            </Pressable>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#e3e7ef',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: '#172033' },
  subtitle: { fontSize: 12, color: '#68758c', marginTop: 1 },
  renameButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f3f5f8' },
  renameText: { fontSize: 13, fontWeight: '700', color: '#3157A8' },
  renameInput: { fontSize: 16, fontWeight: '800', color: '#172033', paddingVertical: 2 },
  content: { padding: 20, gap: 14 },
  sectionHeading: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: '#68758c' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  readyCard: {
    width: '48%',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#e3e7ef',
  },
  readyCardTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#172033' },
  divider: { height: 1, backgroundColor: '#e3e7ef', marginVertical: 6 },
  stepsTextArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#e3e7ef',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: '#172033',
    backgroundColor: '#f7f8fc',
    textAlignVertical: 'top',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#172033',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryButtonText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  disabled: { opacity: 0.5 },
  stepsList: { gap: 10 },
  stepCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e3e7ef',
    gap: 8,
  },
  stepTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f5f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { fontSize: 12, fontWeight: '800', color: '#68758c' },
  stepLineText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#172033' },
  stepRemoveButton: { padding: 4 },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  kindBadgeHuman: { backgroundColor: '#EBF2FF' },
  kindBadgeTool: { backgroundColor: '#E8F7F0' },
  kindBadgeText: { fontSize: 12, fontWeight: '700' },
  kindBadgeTextHuman: { color: '#3157A8' },
  kindBadgeTextTool: { color: '#18865B' },
  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#FFF7E6',
  },
  safetyBadgeText: { fontSize: 11, fontWeight: '700', color: '#A66D00' },
  choiceSection: { gap: 6, marginTop: 2 },
  choicePrompt: { fontSize: 12, fontWeight: '700', color: '#68758c' },
  choiceChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f3f5f8',
    borderWidth: 1,
    borderColor: '#e3e7ef',
  },
  choiceChipText: { fontSize: 12, fontWeight: '700', color: '#3157A8' },
  addStepButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f7f8fc',
    borderWidth: 1,
    borderColor: '#e3e7ef',
    borderStyle: 'dashed',
  },
  addStepButtonText: { fontSize: 13, fontWeight: '700', color: '#3157A8' },
  addStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f7f8fc',
    borderWidth: 1,
    borderColor: '#e3e7ef',
  },
  addStepInput: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    color: '#172033',
  },
  addStepConfirm: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3157A8',
  },
  addStepConfirmText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  addStepCancel: { padding: 6 },
  footerSpacing: { height: 8 },
});
