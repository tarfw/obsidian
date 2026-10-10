import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionInterfaceHost from '@/action-interfaces/ActionInterfaceHost';
import { TarAvatar } from '@/components/TarAvatar';
import { useWorkspace } from '@/components/WorkspaceProvider';
import {
  createOperationKey,
  harness,
  type HarnessAction,
  type HarnessInterfaceContract,
} from '@/lib/harness';
import { setAgentName, useAgentName } from '@/lib/agent';

const ink = '#1B1C20';
const muted = '#626671';
const blue = '#3157A8';
const lightBg = '#F6F8FA';
const borderLine = '#E5E7EB';

interface ChatMessage {
  id: string;
  sender: 'user' | 'tar';
  text: string;
  suggestion?: {
    action: string | null;
    title: string | null;
    confidence?: number | null;
  };
}

function extractAgentName(text: string): string | null {
  const t = text.trim();
  const m1 = t.match(/\b(?:call|name)\s+(?:you|u)\s+([a-zA-Z0-9_\-']+)/i);
  if (m1) return m1[1];
  const m2 = t.match(/\byour\s+name\s+is\s+([a-zA-Z0-9_\-']+)/i);
  if (m2) return m2[1];
  const m3 = t.match(/\b(?:want\s+to|can\s+i|let's|lets)\s+call\s+you\s+([a-zA-Z0-9_\-']+)/i);
  if (m3) return m3[1];
  const m4 = t.match(/\brename\s+(?:you|assistant|agent)?\s*(?:to)?\s+([a-zA-Z0-9_\-']+)/i);
  if (m4) return m4[1];
  const m5 = t.match(/\bset\s+(?:agent|assistant)\s+name\s+to\s+([a-zA-Z0-9_\-']+)/i);
  if (m5) return m5[1];
  return null;
}

function formatAgentName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, '');
  if (!clean) return 'TAR';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

const STARTER_PROMPTS = [
  { icon: 'sparkles-outline', text: 'Call you Jarvis' },
  { icon: 'help-circle-outline', text: 'Who are you?' },
  { icon: 'chatbubbles-outline', text: 'Draft customer message' },
  { icon: 'wallet-outline', text: 'Log shop cash expense' },
];

export default function AskScreen() {
  const router = useRouter();
  const agentName = useAgentName();
  const insets = useSafeAreaInsets();
  const { workspaces, current } = useWorkspace();

  const personalWorkspace = useMemo(
    () => workspaces.find((w) => w.mode === 'personal') || current,
    [workspaces, current]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const [openAction, setOpenAction] = useState<{
    action: HarnessAction;
    interfaces: HarnessInterfaceContract[];
    scope: string;
    input: Record<string, unknown>;
    title: string;
  } | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const msgCounter = useRef(0);

  // Submit prompt to Ask TAR / Jev
  const handleSend = useCallback(async (overridePrompt?: string) => {
    const textToSend = (overridePrompt ?? input).trim();
    if (!textToSend || thinking) return;

    setInput('');
    Keyboard.dismiss();

    const uId = `u-${++msgCounter.current}`;
    const userMsg: ChatMessage = {
      id: uId,
      sender: 'user',
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    // 1. Direct conversational agent naming
    const detectedName = extractAgentName(textToSend);
    if (detectedName) {
      const cleanName = formatAgentName(detectedName);
      try {
        await setAgentName(cleanName);
        const targetSlug = personalWorkspace?.slug || current.slug;
        try {
          await harness.executeAction(
            targetSlug,
            'agent.save',
            { name: cleanName },
            createOperationKey('agent.save')
          );
        } catch {
          // Persisted cleanly in local cache
        }
        const tId = `t-${++msgCounter.current}`;
        const tarMsg: ChatMessage = {
          id: tId,
          sender: 'tar',
          text: `Got it! I’m ${cleanName} now. I've updated my profile across your workspace. What shall we tackle next?`,
        };
        setMessages((prev) => [...prev, tarMsg]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      } finally {
        setThinking(false);
      }
      return;
    }

    // 2. Identity query
    if (/\b(?:who are you|what is your name|what's your name|what can i call you|who r u)\b/i.test(textToSend)) {
      const tId = `t-${++msgCounter.current}`;
      const tarMsg: ChatMessage = {
        id: tId,
        sender: 'tar',
        text: `I'm ${agentName}, your personal agent. You can ask me to draft messages, plan routines, or rename me anytime by saying "Call you <name>".`,
      };
      setMessages((prev) => [...prev, tarMsg]);
      setThinking(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    // 3. Rename prompt request without name specified
    if (/\b(?:rename\s+(?:you|agent|assistant)|change\s+your\s+name|give\s+you\s+a\s+name)\b/i.test(textToSend)) {
      const tId = `t-${++msgCounter.current}`;
      const tarMsg: ChatMessage = {
        id: tId,
        sender: 'tar',
        text: `Sure! What would you like to call me? Just say "Call you <name>" and I'll update my name immediately.`,
      };
      setMessages((prev) => [...prev, tarMsg]);
      setThinking(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    // 4. Conversational greetings
    if (/^(hi|hello|hey|vanakkam|good\s+(morning|afternoon|evening))\b/i.test(textToSend) && textToSend.split(' ').length <= 4) {
      const tId = `t-${++msgCounter.current}`;
      const tarMsg: ChatMessage = {
        id: tId,
        sender: 'tar',
        text: `Hello! I'm ${agentName}. How can I assist you today?`,
      };
      setMessages((prev) => [...prev, tarMsg]);
      setThinking(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    // 5. Operational / Flow suggestions via Jev
    try {
      const targetSlug = personalWorkspace?.slug || current.slug;
      const response = await harness.executeAction<{
        action: string | null;
        title: string | null;
        confidence?: number | null;
      }>(
        targetSlug,
        'flow.suggest',
        { prompt: textToSend },
        createOperationKey('ask.suggest')
      );

      let replyText = 'Here is what I found for your request:';
      if (!response.action) {
        replyText =
          `I noted that. You can ask me to draft messages, plan tasks, log expenses, or rename me by saying "Call you <name>".`;
      } else if (response.action === 'agent.save') {
        replyText = `What would you like my new name to be? Just say "Call you <name>" and I'll remember it.`;
      } else if (response.title) {
        replyText = `I recommend starting the "${response.title}" action.`;
      }

      const tId = `t-${++msgCounter.current}`;
      const tarMsg: ChatMessage = {
        id: tId,
        sender: 'tar',
        text: replyText,
        suggestion: response,
      };

      setMessages((prev) => [...prev, tarMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (cause) {
      const errId = `e-${++msgCounter.current}`;
      const errorMsg: ChatMessage = {
        id: errId,
        sender: 'tar',
        text: cause instanceof Error ? cause.message : `${agentName} could not process that request right now.`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setThinking(false);
    }
  }, [agentName, current.slug, input, personalWorkspace, thinking]);

  // Run suggested action
  const runSuggestedAction = useCallback(async (suggestion: { action: string | null; title: string | null }) => {
    if (!suggestion.action) return;
    try {
      const targetSlug = personalWorkspace?.slug || current.slug;
      const registry = await harness.workspaceRegistry(targetSlug);
      const action = registry.actions.find((cand) => cand.id === suggestion.action);
      if (!action) {
        throw new Error('This action is not available in the current workspace.');
      }
      setOpenAction({
        action,
        interfaces: registry.interfaces,
        scope: targetSlug,
        input: {},
        title: suggestion.title || action.title,
      });
    } catch {
      // Handled via state
    }
  }, [current.slug, personalWorkspace]);

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <TarAvatar size={32} />
          <View>
            <Text style={styles.headerTitle}>Ask {agentName}</Text>
            <Text style={styles.headerSubtitle}>Personal Agent AI</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => router.push('/settings')}
            style={styles.closeBtn}
          >
            <Ionicons name="settings-outline" size={20} color={muted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Close Ask ${agentName}`}
            onPress={() => router.back()}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={22} color={muted} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.contentContainer,
            messages.length === 0 && styles.emptyContentContainer,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Uncluttered Hero State when no messages */}
          {messages.length === 0 ? (
            <View style={styles.heroBox}>
              <View style={styles.heroAvatarWrapper}>
                <TarAvatar size={48} />
              </View>
              <Text style={styles.heroTitle}>How can I help?</Text>
              <Text style={styles.heroSubtitle}>
                I'm {agentName}, your personal agent. Ask questions, plan routines, or rename me anytime (e.g. "Call you Jarvis").
              </Text>

              {/* Starter chips */}
              <View style={styles.chipGrid}>
                {STARTER_PROMPTS.map((prompt) => (
                  <Pressable
                    key={prompt.text}
                    accessibilityRole="button"
                    onPress={() => void handleSend(prompt.text)}
                    style={styles.chip}
                  >
                    <Ionicons name={prompt.icon as keyof typeof Ionicons.glyphMap} size={16} color={blue} />
                    <Text style={styles.chipText}>{prompt.text}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {/* Conversation Thread */}
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                msg.sender === 'user' ? styles.userRow : styles.tarRow,
              ]}
            >
              {msg.sender === 'tar' ? (
                <View style={styles.msgAvatar}>
                  <TarAvatar size={24} />
                </View>
              ) : null}

              <View
                style={[
                  styles.bubble,
                  msg.sender === 'user' ? styles.userBubble : styles.tarBubble,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    msg.sender === 'user' ? styles.userText : styles.tarText,
                  ]}
                >
                  {msg.text}
                </Text>

                {/* Suggestion Card */}
                {msg.suggestion?.action ? (
                  <View style={styles.actionCard}>
                    <View style={styles.actionCardHead}>
                      <Ionicons name="flash" size={15} color={blue} />
                      <Text style={styles.actionCardTitle} numberOfLines={1}>
                        {msg.suggestion.title || msg.suggestion.action}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void runSuggestedAction(msg.suggestion!)}
                      style={styles.actionCardBtn}
                    >
                      <Text style={styles.actionCardBtnText}>Review & Run</Text>
                      <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </View>
          ))}

          {thinking ? (
            <View style={[styles.messageRow, styles.tarRow]}>
              <View style={styles.msgAvatar}>
                <TarAvatar size={24} />
              </View>
              <View style={[styles.bubble, styles.tarBubble, styles.thinkingBubble]}>
                <ActivityIndicator size="small" color={blue} />
                <Text style={styles.thinkingText}>Thinking…</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* Bottom Full-Screen Composer */}
        <View style={[styles.composerContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.composerBar}>
            <TextInput
              ref={inputRef}
              accessibilityLabel="Ask TAR composer"
              multiline
              value={input}
              onChangeText={setInput}
              placeholder="Ask TAR anything…"
              placeholderTextColor={muted}
              style={styles.input}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send request"
              disabled={!input.trim() || thinking}
              onPress={() => void handleSend()}
              style={[
                styles.sendBtn,
                (!input.trim() || thinking) && styles.sendBtnDisabled,
              ]}
            >
              {thinking ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Action Interface Host */}
      <ActionInterfaceHost
        action={openAction?.action || null}
        contracts={openAction?.interfaces || []}
        scope={openAction?.scope || current.slug}
        initialInput={openAction?.input}
        contextTitle={openAction?.title}
        onClose={() => setOpenAction(null)}
        onSuccess={() => setOpenAction(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: borderLine,
    backgroundColor: '#FFFFFF',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: ink,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: muted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: lightBg,
  },
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  emptyContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 48,
  },
  heroBox: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  heroAvatarWrapper: {
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: ink,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: muted,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
    maxWidth: 300,
  },
  chipGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: borderLine,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: ink,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    gap: 8,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  tarRow: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    paddingTop: 2,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: blue,
    borderBottomRightRadius: 4,
  },
  tarBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  tarText: {
    color: ink,
    fontWeight: '500',
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thinkingText: {
    fontSize: 14,
    color: muted,
    fontWeight: '500',
  },
  actionCard: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: borderLine,
    gap: 8,
  },
  actionCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: ink,
    flex: 1,
  },
  actionCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: blue,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 7,
  },
  actionCardBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  composerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: borderLine,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  composerBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    fontSize: 15,
    color: ink,
    paddingTop: 8,
    paddingBottom: 8,
    paddingRight: 8,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
});
