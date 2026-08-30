import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TarLogo } from '@/components/TarLogo';
import { tar, type BotBuilderDraft } from '@/lib/tar';

type AnswerKey = 'goal' | 'place' | 'data';

const QUESTIONS: Array<{ key: AnswerKey; question: string; options: string[] }> = [
  { key: 'goal', question: 'What would you like this Bot to help with?', options: ['Sell products', 'Support customers', 'Manage bookings', 'Track work'] },
  { key: 'place', question: 'Where will people use it?', options: ['At a counter', 'On a phone', 'On a website', 'In chat'] },
  { key: 'data', question: 'What should it keep track of?', options: ['Products and sales', 'Customers', 'Bookings', 'All of these'] },
];

interface BotBuilderProps {
  visible: boolean;
  scope: string;
  existingArtifacts: Array<{ id: string; name: string; fields: string[] }>;
  onClose: () => void;
  onCreate: (draft: BotBuilderDraft) => Promise<void>;
}

function AnimatedTarAvatar({ size = 26 }: { size?: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3],
  });

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <Animated.View style={[styles.avatarCircle, { transform: [{ translateY }, { scale }] }]}>
      <TarLogo size={size} color="#1a73e8" bgColor="#e8f0fe" />
    </Animated.View>
  );
}

export function BotBuilder({ visible, scope, existingArtifacts, onClose, onCreate }: BotBuilderProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [answers, setAnswers] = useState<Partial<Record<AnswerKey, string>>>({});
  const [customAnswer, setCustomAnswer] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [draft, setDraft] = useState<BotBuilderDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questionIndex = QUESTIONS.findIndex((question) => !answers[question.key]);
  const activeQuestion = questionIndex >= 0 ? QUESTIONS[questionIndex] : null;

  const reset = () => {
    setAnswers({});
    setCustomAnswer('');
    setShowCustom(false);
    setDraft(null);
    setLoading(false);
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const choose = async (value: string) => {
    if (!activeQuestion) return;
    const nextAnswers = { ...answers, [activeQuestion.key]: value };
    setAnswers(nextAnswers);
    setShowCustom(false);
    setCustomAnswer('');
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    if (questionIndex !== QUESTIONS.length - 1) return;
    await generate(nextAnswers);
  };

  const submitCustom = async () => {
    if (!activeQuestion || !customAnswer.trim()) return;
    await choose(customAnswer.trim());
  };

  const generate = useCallback(async (nextAnswers: Partial<Record<AnswerKey, string>>, directPrompt = '') => {
    setLoading(true);
    setError(null);
    try {
      const nextPrompt = directPrompt || `Create a Bot to ${nextAnswers.goal || 'help with work'}. It will be used ${nextAnswers.place || 'in a workspace'} and should keep track of ${nextAnswers.data || 'the data needed for the job'}.`;
      const generatedDraft = await tar.botBuilder.generate(scope, nextPrompt, nextAnswers as Record<string, string>, existingArtifacts);
      setDraft(generatedDraft);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The Bot Builder could not create a draft. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [existingArtifacts, scope]);

  const create = async () => {
    if (!draft) return;
    setLoading(true);
    setError(null);
    try {
      await onCreate(draft);
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The Bot could not be created. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={close} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#1f1f1f" />
          </TouchableOpacity>
          <Text style={styles.title}>{draft ? 'Your Bot is ready' : 'Create a Bot'}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {QUESTIONS.map((question, index) => {
            const answer = answers[question.key];
            const isActive = activeQuestion?.key === question.key;
            if (!answer && !isActive && !draft) return null;

            return (
              <React.Fragment key={question.key}>
                {/* Bot Question Bubble */}
                <View style={styles.botRow}>
                  <AnimatedTarAvatar size={25} />
                  <View style={styles.botBubble}>
                    <Text style={styles.questionText}>{question.question}</Text>
                    {isActive && !draft && (
                      <View style={styles.optionsContainer}>
                        {question.options.map((option) => (
                          <TouchableOpacity
                            key={option}
                            accessibilityRole="button"
                            onPress={() => void choose(option)}
                            style={styles.option}
                          >
                            <Text style={styles.optionText}>{option}</Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                          accessibilityRole="button"
                          onPress={() => setShowCustom(true)}
                          style={styles.option}
                        >
                          <Text style={styles.optionTextCustom}>Type my own answer</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                {/* Custom Text Input if open */}
                {isActive && showCustom && !draft && (
                  <View style={styles.customRow}>
                    <TextInput
                      value={customAnswer}
                      onChangeText={setCustomAnswer}
                      placeholder="Type your answer…"
                      placeholderTextColor="#80868b"
                      style={styles.input}
                      autoFocus
                    />
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Send answer"
                      disabled={!customAnswer.trim()}
                      onPress={() => void submitCustom()}
                      style={[styles.sendButton, !customAnswer.trim() && styles.sendButtonDisabled]}
                    >
                      <Ionicons name="arrow-up" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* User Answer Bubble (Clean text, NO tick mark) */}
                {!!answer && (
                  <View style={styles.userRow}>
                    <View style={styles.userBubble}>
                      <Text style={styles.userAnswerText}>{answer}</Text>
                    </View>
                  </View>
                )}
              </React.Fragment>
            );
          })}

          {/* Loading / Thinking State */}
          {loading && !draft && (
            <View style={styles.botRow}>
              <AnimatedTarAvatar size={25} />
              <View style={[styles.botBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color="#1a73e8" />
                <Text style={styles.loadingText}>TAR is building your Bot…</Text>
              </View>
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View style={styles.error}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => void generate(answers)} style={styles.retry}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Draft Preview */}
          {draft && (
            <View style={styles.draftCard}>
              <View style={styles.draftHeader}>
                <View style={styles.botIconWrapper}>
                  <TarLogo size={36} color="#1a73e8" bgColor="#e8f0fe" />
                </View>
                <View style={styles.draftTitleCopy}>
                  <Text style={styles.botName}>{draft.name}</Text>
                  <Text style={styles.purpose}>{draft.purpose}</Text>
                </View>
              </View>

              <Text style={styles.sectionLabel}>DATA</Text>
              {draft.artifacts.map((artifact) => (
                <Text key={artifact.id} style={styles.dataLine}>• {artifact.name}</Text>
              ))}

              <Text style={styles.sectionLabel}>WORKFLOWS</Text>
              {draft.workflows.map((workflow) => (
                <View key={workflow.id} style={styles.workflow}>
                  <Text style={styles.workflowTitle}>{workflow.title}</Text>
                  {workflow.steps.map((step, index) => (
                    <Text key={step.id} style={styles.step}>{index + 1}. {step.title}</Text>
                  ))}
                </View>
              ))}

              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => void create()}
                disabled={loading}
                style={styles.primary}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Create Bot</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={reset}
                disabled={loading}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>Start over</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8eaed',
  },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { width: 36 },
  title: { color: '#202124', fontSize: 18, fontWeight: '700' },
  content: { padding: 16, paddingTop: 20 },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#e8f0fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  botRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  botBubble: {
    flex: 1,
    backgroundColor: '#f1f3f4',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    padding: 14,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  questionText: {
    color: '#202124',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  optionsContainer: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#dadce0',
  },
  option: {
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dadce0',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  optionText: {
    color: '#1a73e8',
    fontSize: 15,
    fontWeight: '600',
  },
  optionTextCustom: {
    color: '#5f6368',
    fontSize: 14,
    fontWeight: '500',
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 18,
  },
  userBubble: {
    backgroundColor: '#1a73e8',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '82%',
  },
  userAnswerText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    paddingLeft: 48,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#dadce0',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#202124',
    backgroundColor: '#fff',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a73e8',
  },
  sendButtonDisabled: { opacity: 0.4 },
  loadingText: { color: '#5f6368', fontSize: 14, fontWeight: '500' },
  error: { borderRadius: 12, backgroundColor: '#fce8e6', padding: 14, marginBottom: 16 },
  errorText: { color: '#b3261e', fontSize: 14, lineHeight: 20 },
  retry: { marginTop: 10, alignSelf: 'flex-start' },
  retryText: { color: '#1a73e8', fontWeight: '700', fontSize: 14 },
  draftCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8eaed',
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
  },
  draftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  botIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#e8f0fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftTitleCopy: { flex: 1 },
  botName: { color: '#202124', fontSize: 20, fontWeight: '800' },
  purpose: { color: '#5f6368', fontSize: 14, lineHeight: 20, marginTop: 3 },
  sectionLabel: { color: '#5f6368', fontWeight: '700', fontSize: 11, letterSpacing: 0.7, marginTop: 18, marginBottom: 8 },
  dataLine: { color: '#202124', fontSize: 14, lineHeight: 22 },
  workflow: { marginBottom: 10 },
  workflowTitle: { color: '#202124', fontWeight: '700', fontSize: 15, marginBottom: 4 },
  step: { color: '#3c4043', fontSize: 13, lineHeight: 20, paddingLeft: 4 },
  primary: { minHeight: 48, backgroundColor: '#1a73e8', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondary: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  secondaryText: { color: '#5f6368', fontSize: 14, fontWeight: '600' },
});
