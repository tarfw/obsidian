import React, { useState, useMemo, useRef } from 'react';
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
  TouchableWithoutFeedback,
  Animated,
  PanResponder,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { tar } from '@/lib/tar';

export interface AgentBuilderProps {
  visible: boolean;
  onClose: () => void;
  scope: string;
  workspaceName?: string;
  onSaved?: (manifestYaml: string) => void;
}

export type ActionPrimitiveType =
  | 'skill'
  | 'tool'
  | 'mcp'
  | 'channel'
  | 'database'
  | 'sandbox'
  | 'subagent'
  | 'schedule';

export interface PipelineStep {
  id: string;
  title: string;
  actionType: ActionPrimitiveType;
  actionName: string;
}

export interface AgentPipeline {
  id: string;
  title: string;
  steps: PipelineStep[];
}

interface ModelOption {
  id: string;
  label: string;
  pricing: string;
}

const MODELS: ModelOption[] = [
  {
    id: 'deepseek-v4-flash-0731',
    label: 'DeepSeek-V4-Flash-0731',
    pricing: '$0.08 in · $0.18 out · $0.016 cache',
  },
  {
    id: 'gemma-4-e4b-it',
    label: 'gemma-4-E4B-it',
    pricing: '$0.02 in · $0.10 out',
  },
];

const ACTION_PRIMITIVES: Array<{ type: ActionPrimitiveType; label: string; desc: string }> = [
  { type: 'skill', label: 'SKILL', desc: 'Execute SOP or markdown guide' },
  { type: 'tool', label: 'TOOL', desc: 'Deterministic TypeScript function' },
  { type: 'mcp', label: 'MCP', desc: 'Model Context Protocol connector' },
  { type: 'channel', label: 'CHANNEL', desc: 'Email, WhatsApp, or Webhook' },
  { type: 'database', label: 'DATABASE', desc: 'Update OKF or D1 record' },
  { type: 'sandbox', label: 'SANDBOX', desc: 'Execute isolated code env' },
  { type: 'subagent', label: 'SUBAGENT', desc: 'Delegate to worker agent' },
  { type: 'schedule', label: 'SCHEDULE', desc: 'Cron or timed recurring task' },
];

const STARTER_PIPELINES: AgentPipeline[] = [
  {
    id: 'computer_sale',
    title: 'Computer Sale',
    steps: [
      { id: 's1', title: 'Search Products', actionType: 'skill', actionName: 'search_product.md' },
      { id: 's2', title: 'Explain Specs', actionType: 'tool', actionName: 'catalog_lookup' },
      { id: 's3', title: 'Store Visit', actionType: 'tool', actionName: 'calendar_book' },
      { id: 's4', title: 'Close Deal & Invoice', actionType: 'database', actionName: 'update_artifact' },
    ],
  },
];

/* ------------------------------------------------------------- */
/* Slide-Left Swipeable Row Component                           */
/* ------------------------------------------------------------- */
interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  onPress?: () => void;
}

function SwipeableRow({ children, onDelete, onPress }: SwipeableRowProps) {
  const pan = useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = useState(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 12 && Math.abs(gesture.dy) < 10,
        onPanResponderMove: (_, gesture) => {
          if (gesture.dx < 0) {
            pan.setValue(Math.max(gesture.dx, -76));
          } else if (isOpen) {
            pan.setValue(Math.min(-76 + gesture.dx, 0));
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -25) {
            Animated.spring(pan, {
              toValue: -76,
              useNativeDriver: true,
              tension: 90,
              friction: 9,
            }).start();
            setIsOpen(true);
          } else {
            Animated.spring(pan, {
              toValue: 0,
              useNativeDriver: true,
              tension: 90,
              friction: 9,
            }).start();
            setIsOpen(false);
          }
        },
      }),
    [isOpen]
  );

  const close = () => {
    Animated.spring(pan, {
      toValue: 0,
      useNativeDriver: true,
      tension: 90,
      friction: 9,
    }).start();
    setIsOpen(false);
  };

  return (
    <View style={swipeStyles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          close();
          onDelete();
        }}
        style={swipeStyles.deleteAction}
      >
        <Text style={swipeStyles.deleteActionText}>Delete</Text>
      </TouchableOpacity>

      <Animated.View
        {...panResponder.panHandlers}
        style={[swipeStyles.surface, { transform: [{ translateX: pan }] }]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            if (isOpen) {
              close();
            } else if (onPress) {
              onPress();
            }
          }}
          style={swipeStyles.surfaceInner}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const swipeStyles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 76,
    backgroundColor: '#d93025',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  deleteActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  surface: {
    backgroundColor: '#ffffff',
    zIndex: 2,
  },
  surfaceInner: {
    backgroundColor: '#ffffff',
  },
});

/* ------------------------------------------------------------- */
/* AgentBuilder Main Screen                                      */
/* ------------------------------------------------------------- */
export default function AgentBuilder({
  visible,
  onClose,
  scope,
  workspaceName = 'Workspace',
  onSaved,
}: AgentBuilderProps) {
  const insets = useSafeAreaInsets();

  // 1. Identity Fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [objective, setObjective] = useState('');

  // 2. Model
  const [model, setModel] = useState('deepseek-v4-flash-0731');

  // 3. Pipelines Router
  const [pipelines, setPipelines] = useState<AgentPipeline[]>(STARTER_PIPELINES);
  const [editingPipelineIndex, setEditingPipelineIndex] = useState<number | null>(null);

  // Screen 2: New Pipeline Screen State
  const [isCreatingNewPipeline, setIsCreatingNewPipeline] = useState(false);
  const [newPipelineTitle, setNewPipelineTitle] = useState('');

  // Screen 4: New Step Screen State
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepActionType, setNewStepActionType] = useState<ActionPrimitiveType>('skill');
  const [newStepActionName, setNewStepActionName] = useState('');

  // Drawers & States
  const [showModelDrawer, setShowModelDrawer] = useState(false);
  const [viewYaml, setViewYaml] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Safe Deletion Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'pipeline' | 'step';
    title: string;
    index: number;
  } | null>(null);

  const selectedModelObj = useMemo(() => {
    return MODELS.find((m) => m.id === model) || MODELS[0];
  }, [model]);

  // Active pipeline for sub-screen
  const activeEditingPipeline = editingPipelineIndex !== null ? pipelines[editingPipelineIndex] : null;

  const handleCreatePipeline = () => {
    if (!newPipelineTitle.trim()) return;
    const slug = newPipelineTitle.trim().toLowerCase().replace(/\s+/g, '_');
    const newPipe: AgentPipeline = {
      id: slug,
      title: newPipelineTitle.trim(),
      steps: [],
    };
    const nextList = [...pipelines, newPipe];
    setPipelines(nextList);
    setNewPipelineTitle('');
    setIsCreatingNewPipeline(false);
    setEditingPipelineIndex(nextList.length - 1);
  };

  const handleAddStepToActivePipeline = () => {
    if (!newStepTitle.trim() || editingPipelineIndex === null) return;
    const current = pipelines[editingPipelineIndex];
    const newStep: PipelineStep = {
      id: `step_${Date.now()}`,
      title: newStepTitle.trim(),
      actionType: newStepActionType,
      actionName: newStepActionName.trim() || `${newStepActionType}_action`,
    };
    const updated = { ...current, steps: [...current.steps, newStep] };
    const nextPipelines = [...pipelines];
    nextPipelines[editingPipelineIndex] = updated;
    setPipelines(nextPipelines);
    setNewStepTitle('');
    setNewStepActionName('');
    setIsAddingStep(false);
  };

  const confirmDeleteAction = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'pipeline') {
      setPipelines(pipelines.filter((_, i) => i !== deleteTarget.index));
      if (editingPipelineIndex === deleteTarget.index) {
        setEditingPipelineIndex(null);
      }
    } else if (deleteTarget.type === 'step' && editingPipelineIndex !== null) {
      const current = pipelines[editingPipelineIndex];
      const updated = {
        ...current,
        steps: current.steps.filter((_, i) => i !== deleteTarget.index),
      };
      const nextPipelines = [...pipelines];
      nextPipelines[editingPipelineIndex] = updated;
      setPipelines(nextPipelines);
    }
    setDeleteTarget(null);
  };

  // Minimalist YAML
  const manifestYaml = useMemo(() => {
    const roleSlug = role.trim().toLowerCase().replace(/\s+/g, '_') || (name.trim().toLowerCase().replace(/\s+/g, '_') || 'agent');
    const routerMode = pipelines.length > 1 ? 'artifact_router' : 'single_workflow';

    const pipelinesYaml = pipelines
      .map((p) => {
        const stepsBlock = p.steps.length > 0
          ? p.steps
              .map(
                (s, i) =>
                  `        - step: ${i + 1}\n          title: "${s.title}"\n          action: "${s.actionType}:${s.actionName}"`
              )
              .join('\n')
          : '        []';
        return `    - id: "${p.id}"\n      title: "${p.title}"\n      steps:\n${stepsBlock}`;
      })
      .join('\n');

    return `# Auto-generated by TAR Harness
agent:
  id: "${roleSlug}"
  name: "${name.trim() || 'Custom Agent'}"
  role: "${roleSlug}"
  model: "${model}"

workflow_router:
  mode: "${routerMode}"
  pipelines:
${pipelinesYaml}
`;
  }, [name, role, model, pipelines]);

  const handleSave = async () => {
    if (!name.trim() && !role.trim()) return;
    setSaving(true);
    setFeedback(null);
    Keyboard.dismiss();

    try {
      const roleSlug = role.trim().toLowerCase().replace(/\s+/g, '_') || name.trim().toLowerCase().replace(/\s+/g, '_');
      if (scope) {
        await tar.okf.upload(scope, `agents/${roleSlug}.yaml`, manifestYaml);
      }
      setFeedback('Deployed');
      if (onSaved) onSaved(manifestYaml);
      setTimeout(onClose, 250);
    } catch (err: any) {
      setFeedback(err.message || 'Failed to deploy');
    } finally {
      setSaving(false);
    }
  };

  const isSavable = (name.trim().length > 0 || role.trim().length > 0) && !saving;

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
          style={styles.flexOne}
        >
          {/* ========================================================= */}
          {/* SCREEN 1: MAIN AGENT COMPOSER (Google Design System)       */}
          {/* ========================================================= */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.navBtn}>
              <Ionicons name="close" size={22} color="#1f1f1f" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>New Agent</Text>

            <View style={styles.topRightActions}>
              <TouchableOpacity
                onPress={() => setViewYaml(!viewYaml)}
                hitSlop={8}
                style={styles.textBtn}
              >
                <Text style={styles.textBtnMuted}>{viewYaml ? 'Edit' : 'YAML'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={!isSavable}
                hitSlop={8}
                style={styles.textBtn}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#1a73e8" />
                ) : (
                  <Text style={[styles.textBtnPrimary, !isSavable && styles.textBtnDisabled]}>
                    Deploy
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Content */}
          {viewYaml ? (
            <ScrollView style={styles.yamlView} contentContainerStyle={styles.yamlContent}>
              <Text style={styles.yamlCode}>{manifestYaml}</Text>
            </ScrollView>
          ) : (
            <ScrollView
              style={styles.composerScroll}
              contentContainerStyle={[styles.composerContent, { paddingBottom: insets.bottom + 60 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Name */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldPrefix}>Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Sales SDR"
                  placeholderTextColor="#80868b"
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (!role) setRole(val.toLowerCase().replace(/\s+/g, '_'));
                  }}
                  autoFocus
                />
              </View>

              {/* Role */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldPrefix}>Role</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="sdr"
                  placeholderTextColor="#80868b"
                  value={role}
                  onChangeText={setRole}
                  autoCapitalize="none"
                />
              </View>

              {/* Model Selector */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowModelDrawer(true)}
                style={styles.fieldRow}
              >
                <Text style={styles.fieldPrefix}>Model</Text>
                <Text style={styles.fieldModelText}>{selectedModelObj.label}</Text>
              </TouchableOpacity>

              {/* Objective */}
              <View style={styles.bodySection}>
                <TextInput
                  style={styles.bodyInput}
                  placeholder="Objective and instructions..."
                  placeholderTextColor="#80868b"
                  value={objective}
                  onChangeText={setObjective}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Pipelines Section */}
              <View style={styles.pipelineSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeader}>Pipelines</Text>
                  <TouchableOpacity
                    onPress={() => setIsCreatingNewPipeline(true)}
                    hitSlop={8}
                    style={styles.actionTextBtn}
                  >
                    <Ionicons name="add" size={16} color="#1a73e8" />
                    <Text style={styles.actionTextBtnLabel}>Add Pipeline</Text>
                  </TouchableOpacity>
                </View>

                {pipelines.map((pipe, idx) => (
                  <SwipeableRow
                    key={pipe.id || idx}
                    onPress={() => setEditingPipelineIndex(idx)}
                    onDelete={() =>
                      setDeleteTarget({ type: 'pipeline', title: pipe.title, index: idx })
                    }
                  >
                    <View style={styles.pipelineRowContent}>
                      <Text style={styles.pipelineTitle}>{pipe.title}</Text>
                      <Text style={styles.pipelineSubtitle}>
                        {pipe.steps.length} {pipe.steps.length === 1 ? 'step' : 'steps'}
                      </Text>
                    </View>
                  </SwipeableRow>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Toast */}
          {feedback && (
            <View style={styles.toast}>
              <Text style={styles.toastText}>{feedback}</Text>
            </View>
          )}

          {/* ========================================================= */}
          {/* SCREEN 2: DEDICATED NEW PIPELINE SCREEN                   */}
          {/* ========================================================= */}
          <Modal
            visible={isCreatingNewPipeline}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent={true}
            onRequestClose={() => setIsCreatingNewPipeline(false)}
          >
            <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 8) }]}>
              <View style={styles.topBar}>
                <TouchableOpacity
                  onPress={() => setIsCreatingNewPipeline(false)}
                  hitSlop={12}
                  style={styles.navBtn}
                >
                  <Ionicons name="arrow-back" size={20} color="#1f1f1f" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>New Pipeline</Text>

                <TouchableOpacity
                  onPress={handleCreatePipeline}
                  disabled={!newPipelineTitle.trim()}
                  hitSlop={8}
                  style={styles.textBtn}
                >
                  <Text
                    style={[
                      styles.textBtnPrimary,
                      !newPipelineTitle.trim() && styles.textBtnDisabled,
                    ]}
                  >
                    Create
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dedicatedFormContainer}>
                <Text style={styles.formInputLabel}>Pipeline Title</Text>
                <TextInput
                  style={styles.googleInputField}
                  placeholder="e.g. Enterprise Onboarding"
                  placeholderTextColor="#80868b"
                  value={newPipelineTitle}
                  onChangeText={setNewPipelineTitle}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCreatePipeline}
                />
              </View>
            </View>
          </Modal>

          {/* ========================================================= */}
          {/* SCREEN 3: PIPELINE DETAILS & STEPS MANAGER SCREEN          */}
          {/* ========================================================= */}
          {activeEditingPipeline !== null && (
            <Modal
              visible={editingPipelineIndex !== null}
              animationType="slide"
              presentationStyle="fullScreen"
              statusBarTranslucent={true}
              onRequestClose={() => setEditingPipelineIndex(null)}
            >
              <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 8) }]}>
                <View style={styles.topBar}>
                  <TouchableOpacity
                    onPress={() => setEditingPipelineIndex(null)}
                    hitSlop={12}
                    style={styles.navBtn}
                  >
                    <Ionicons name="arrow-back" size={20} color="#1f1f1f" />
                  </TouchableOpacity>

                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {activeEditingPipeline.title}
                  </Text>

                  <TouchableOpacity
                    onPress={() => setEditingPipelineIndex(null)}
                    hitSlop={8}
                    style={styles.textBtn}
                  >
                    <Text style={styles.textBtnPrimary}>Done</Text>
                  </TouchableOpacity>
                </View>

                {/* Steps Sequence */}
                <ScrollView
                  style={styles.composerScroll}
                  contentContainerStyle={[styles.composerContent, { paddingBottom: insets.bottom + 40 }]}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeader}>Steps ({activeEditingPipeline.steps.length})</Text>
                    <TouchableOpacity
                      onPress={() => setIsAddingStep(true)}
                      hitSlop={8}
                      style={styles.actionTextBtn}
                    >
                      <Ionicons name="add" size={16} color="#1a73e8" />
                      <Text style={styles.actionTextBtnLabel}>Add Step</Text>
                    </TouchableOpacity>
                  </View>

                  {activeEditingPipeline.steps.length === 0 ? (
                    <View style={styles.emptyStateWrap}>
                      <Text style={styles.emptyStateText}>No steps configured yet.</Text>
                      <TouchableOpacity
                        onPress={() => setIsAddingStep(true)}
                        style={styles.actionTextBtn}
                      >
                        <Text style={styles.actionTextBtnLabel}>+ Add first step</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    activeEditingPipeline.steps.map((step, sIdx) => (
                      <SwipeableRow
                        key={step.id || sIdx}
                        onDelete={() =>
                          setDeleteTarget({ type: 'step', title: step.title, index: sIdx })
                        }
                      >
                        <View style={styles.stepRowContent}>
                          <Text style={styles.stepNumberText}>{sIdx + 1}</Text>
                          <View style={styles.flexOne}>
                            <Text style={styles.stepTitle}>{step.title}</Text>
                            <Text style={styles.stepActionName}>
                              {step.actionType.toUpperCase()}: {step.actionName}
                            </Text>
                          </View>
                        </View>
                      </SwipeableRow>
                    ))
                  )}
                </ScrollView>
              </View>
            </Modal>
          )}

          {/* ========================================================= */}
          {/* SCREEN 4: DEDICATED ADD STEP SCREEN (Google Material 3)   */}
          {/* ========================================================= */}
          <Modal
            visible={isAddingStep}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent={true}
            onRequestClose={() => setIsAddingStep(false)}
          >
            <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 8) }]}>
              <View style={styles.topBar}>
                <TouchableOpacity
                  onPress={() => setIsAddingStep(false)}
                  hitSlop={12}
                  style={styles.navBtn}
                >
                  <Ionicons name="arrow-back" size={20} color="#1f1f1f" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>New Step</Text>

                <TouchableOpacity
                  onPress={handleAddStepToActivePipeline}
                  disabled={!newStepTitle.trim()}
                  hitSlop={8}
                  style={styles.textBtn}
                >
                  <Text
                    style={[
                      styles.textBtnPrimary,
                      !newStepTitle.trim() && styles.textBtnDisabled,
                    ]}
                  >
                    Add
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.composerScroll}
                contentContainerStyle={[styles.composerContent, { paddingBottom: insets.bottom + 40 }]}
                keyboardShouldPersistTaps="handled"
              >
                {/* Step Title Input */}
                <View style={styles.dedicatedFormGroup}>
                  <Text style={styles.formInputLabel}>Step Title</Text>
                  <TextInput
                    style={styles.googleInputField}
                    placeholder="e.g. Search Products"
                    placeholderTextColor="#80868b"
                    value={newStepTitle}
                    onChangeText={setNewStepTitle}
                    autoFocus
                  />
                </View>

                {/* Action Primitive Selector (Google Material Tonal Filter Chips) */}
                <View style={styles.dedicatedFormGroup}>
                  <Text style={styles.formInputLabel}>Action Primitive</Text>
                  <View style={styles.chipsContainer}>
                    {ACTION_PRIMITIVES.map((item) => {
                      const isActive = newStepActionType === item.type;
                      return (
                        <TouchableOpacity
                          key={item.type}
                          activeOpacity={0.7}
                          onPress={() => setNewStepActionType(item.type)}
                          style={[styles.materialChip, isActive && styles.materialChipActive]}
                        >
                          <Text
                            style={[
                              styles.materialChipLabel,
                              isActive && styles.materialChipLabelActive,
                            ]}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Action Target Input */}
                <View style={styles.dedicatedFormGroup}>
                  <Text style={styles.formInputLabel}>Action Target</Text>
                  <TextInput
                    style={styles.googleInputField}
                    placeholder="e.g. search_product.md or catalog_lookup"
                    placeholderTextColor="#80868b"
                    value={newStepActionName}
                    onChangeText={setNewStepActionName}
                    autoCapitalize="none"
                  />
                </View>
              </ScrollView>
            </View>
          </Modal>

          {/* Model Bottom Sheet */}
          <Modal
            visible={showModelDrawer}
            transparent
            animationType="fade"
            onRequestClose={() => setShowModelDrawer(false)}
          >
            <View style={styles.drawerBackdrop}>
              <TouchableWithoutFeedback onPress={() => setShowModelDrawer(false)}>
                <View style={styles.drawerBackdropTouchable} />
              </TouchableWithoutFeedback>
              <View style={[styles.drawerSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                <View style={styles.drawerHandle} />
                <Text style={styles.drawerHeading}>Model Engine</Text>

                {MODELS.map((m) => {
                  const isSelected = model === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      activeOpacity={0.7}
                      onPress={() => {
                        setModel(m.id);
                        setShowModelDrawer(false);
                      }}
                      style={[styles.drawerOption, isSelected && styles.drawerOptionActive]}
                    >
                      <View style={styles.flexOne}>
                        <Text style={[styles.drawerOptionTitle, isSelected && styles.drawerOptionTitleActive]}>
                          {m.label}
                        </Text>
                        <Text style={styles.drawerOptionDesc}>{m.pricing}</Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark" size={18} color="#1a73e8" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Modal>

          {/* Safe Area Protected Flat Bottom Sheet for Deletion */}
          <Modal
            visible={deleteTarget !== null}
            transparent
            animationType="fade"
            onRequestClose={() => setDeleteTarget(null)}
          >
            <View style={styles.drawerBackdrop}>
              <TouchableWithoutFeedback onPress={() => setDeleteTarget(null)}>
                <View style={styles.drawerBackdropTouchable} />
              </TouchableWithoutFeedback>
              <View style={[styles.drawerSheet, { paddingBottom: Math.max(insets.bottom, 28) }]}>
                <View style={styles.drawerHandle} />
                <Text style={styles.confirmHeading}>
                  Delete {deleteTarget?.type === 'pipeline' ? 'Pipeline' : 'Step'}?
                </Text>
                <Text style={styles.confirmDesc}>
                  "{deleteTarget?.title}" will be permanently removed.
                </Text>

                <View style={styles.confirmActions}>
                  <TouchableOpacity
                    onPress={() => setDeleteTarget(null)}
                    style={styles.textActionBtn}
                  >
                    <Text style={styles.textActionBtnCancel}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={confirmDeleteAction}
                    style={styles.textActionBtn}
                  >
                    <Text style={styles.textActionBtnDelete}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
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
  flexOne: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  navBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f1f1f',
    letterSpacing: -0.2,
    maxWidth: '65%',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  textBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  textBtnPrimary: {
    color: '#1a73e8',
    fontSize: 14,
    fontWeight: '700',
  },
  textBtnMuted: {
    color: '#5f6368',
    fontSize: 14,
    fontWeight: '600',
  },
  textBtnDisabled: {
    opacity: 0.4,
  },
  composerScroll: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  composerContent: {
    paddingHorizontal: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 12,
  },
  fieldPrefix: {
    width: 52,
    fontSize: 13.5,
    fontWeight: '500',
    color: '#5f6368',
  },
  fieldInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#1f1f1f',
    paddingVertical: 2,
  },
  fieldModelText: {
    flex: 1,
    fontSize: 14.5,
    color: '#1f1f1f',
  },
  tonalPill: {
    backgroundColor: '#f1f3f4',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tonalPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5f6368',
  },
  bodySection: {
    paddingVertical: 14,
    minHeight: 120,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  bodyInput: {
    fontSize: 14.5,
    color: '#1f1f1f',
    lineHeight: 22,
  },
  pipelineSection: {
    paddingVertical: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#80868b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  actionTextBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a73e8',
  },
  pipelineRowContent: {
    paddingVertical: 12,
  },
  pipelineTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f1f1f',
  },
  pipelineSubtitle: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 2,
  },
  stepRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  stepNumberText: {
    width: 20,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#80868b',
    textAlign: 'center',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f1f1f',
  },
  stepActionName: {
    fontSize: 11.5,
    color: '#5f6368',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  dedicatedFormContainer: {
    padding: 20,
  },
  dedicatedFormGroup: {
    marginTop: 16,
  },
  formInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5f6368',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  googleInputField: {
    borderWidth: 1,
    borderColor: '#dadce0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14.5,
    color: '#1f1f1f',
    backgroundColor: '#ffffff',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  materialChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f1f3f4',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  materialChipActive: {
    backgroundColor: '#e8f0fe',
    borderColor: '#1a73e8',
  },
  materialChipLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#5f6368',
  },
  materialChipLabelActive: {
    color: '#1a73e8',
  },
  emptyStateWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#80868b',
  },
  yamlView: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  yamlContent: {
    padding: 16,
  },
  yamlCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#38bdf8',
    lineHeight: 18,
  },
  toast: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#323232',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  toastText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#ffffff',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(32, 33, 36, 0.4)',
    justifyContent: 'flex-end',
  },
  drawerBackdropTouchable: {
    flex: 1,
  },
  drawerSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  drawerHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#dadce0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  drawerHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f1f1f',
    marginBottom: 12,
  },
  drawerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f3f4',
  },
  drawerOptionActive: {
    backgroundColor: '#f8fafd',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  drawerOptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drawerOptionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3c4043',
  },
  drawerOptionTitleActive: {
    color: '#1a73e8',
    fontWeight: '700',
  },
  drawerOptionDesc: {
    fontSize: 11.5,
    color: '#80868b',
    marginTop: 2,
  },
  confirmHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f1f1f',
    marginBottom: 6,
  },
  confirmDesc: {
    fontSize: 13.5,
    color: '#5f6368',
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  textActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  textActionBtnCancel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5f6368',
  },
  textActionBtnDelete: {
    fontSize: 14,
    fontWeight: '700',
    color: '#d93025',
  },
});