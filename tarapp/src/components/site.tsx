import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { harness } from '@/lib/harness';
import type { AskOutcome, Node, Section, SiteDocument, SiteSnapshot } from '@/lib/site-schema';

export interface SiteScreenProps {
  visible: boolean;
  onClose: () => void;
  workspaceName: string;
  subdomain: string;
  scope: string;
  workspaceDescription?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'jev';
  text: string;
  revision?: number;
  ms?: number;
  details?: string;
  target?: string;
}

const QUICK_PROMPTS = [
  'Run Festive Sale',
  'Photo Bigger',
  'Darker Theme',
  'Add Location',
];

const siteSnapshotCache = new Map<string, SiteSnapshot>();
const siteStorageKey = (slug: string) => `tar_site_snap_${slug}`;

/**
 * The two opening chat messages, captured once when a storefront first loads.
 * Seeded from the async load callbacks rather than an effect so the opener's
 * revision stays frozen at its first value and never grows an Undo action.
 */
function buildSeedMessages(site: SiteDocument, workspaceName: string): ChatMessage[] {
  const pagesSummary = site.pages.map((p) => p.title || p.path).join(', ');
  return [
    { id: 'brief_init', role: 'user', text: site.brief?.goal || `Build a storefront for ${workspaceName}.` },
    { id: 'jev_init', role: 'jev', revision: site.revision || 1, text: `Storefront ready with live catalog bindings and pages [${pagesSummary}].` },
  ];
}

export default function SiteScreen({
  visible,
  onClose,
  workspaceName,
  scope,
}: SiteScreenProps) {
  const insets = useSafeAreaInsets();
  const slug = useMemo(
    () =>
      scope.replace(/^w:/, '').trim() ||
      workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    [scope, workspaceName],
  );
  const mountedRef = useRef(true);

  // Cached initial state
  const initialCached = slug ? siteSnapshotCache.get(slug) || null : null;

  // Site Document & Server State
  const [snapshot, setSnapshot] = useState<SiteSnapshot | null>(initialCached);
  const [html, setHtml] = useState<string>(initialCached?.html || '');
  const [initialLoading, setInitialLoading] = useState<boolean>(!initialCached);
  const [busy, setBusy] = useState(false);
  const [busyStep, setBusyStep] = useState<string>('');

  // Preview Modal Sheet
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activePageId, setActivePageId] = useState<string>(
    initialCached?.site?.data?.pages?.[0]?.id || 'home',
  );

  // Input & Target State
  const [command, setCommand] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('all');
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialCached?.site?.data ? buildSeedMessages(initialCached.site.data, workspaceName) : [],
  );
  const [pendingInstruction, setPendingInstruction] = useState<string | null>(null);

  const chatScrollRef = useRef<ScrollView>(null);

  const site = snapshot?.site?.data ?? null;
  const siteId = snapshot?.site?.id ?? '';
  const isLive = snapshot?.publicationState === 'active' || snapshot?.site?.state === 'live';
  const publicUrl = snapshot?.publicUrl ?? null;
  const revision = site?.revision ?? 1;

  // Active page for preview
  const activePage = useMemo(() => {
    if (!site?.pages?.length) return null;
    return site.pages.find((p) => p.id === activePageId) || site.pages[0];
  }, [site, activePageId]);

  // Load site snapshot
  const loadSite = useCallback(async () => {
    if (!slug) return;
    try {
      const snap = await harness.site.get(slug);
      if (mountedRef.current && snap?.site?.data) {
        const siteData = snap.site.data;
        siteSnapshotCache.set(slug, snap);
        void SecureStore.setItemAsync(siteStorageKey(slug), JSON.stringify(snap)).catch(() => undefined);
        setSnapshot(snap);
        if (snap.html) setHtml(snap.html);
        const firstPageId = siteData.pages?.[0]?.id;
        if (firstPageId) setActivePageId((curr) => curr || firstPageId);
        setMessages((prev) => (prev.length > 0 ? prev : buildSeedMessages(siteData, workspaceName)));
      }
    } catch {
      // Retain existing snapshot
    } finally {
      if (mountedRef.current) {
        setInitialLoading(false);
        setBusy(false);
        setBusyStep('');
      }
    }
  }, [slug, workspaceName]);

  useEffect(() => {
    mountedRef.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (visible && slug) {
      if (!siteSnapshotCache.has(slug)) {
        void SecureStore.getItemAsync(siteStorageKey(slug))
          .then((raw) => {
            if (raw && mountedRef.current) {
              try {
                const stored = JSON.parse(raw) as SiteSnapshot;
                if (stored?.site?.data) {
                  const storedData = stored.site.data;
                  siteSnapshotCache.set(slug, stored);
                  setSnapshot(stored);
                  if (stored.html) setHtml(stored.html);
                  const firstPageId = storedData.pages?.[0]?.id;
                  if (firstPageId) setActivePageId((curr) => curr || firstPageId);
                  setMessages((prev) => (prev.length > 0 ? prev : buildSeedMessages(storedData, workspaceName)));
                  setInitialLoading(false);
                }
              } catch { /* ignore */ }
            }
          })
          .catch(() => undefined);
      }
      timer = setTimeout(() => {
        void loadSite();
      }, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
      mountedRef.current = false;
    };
  }, [visible, slug, loadSite, workspaceName]);

  // Auto scroll chat to bottom
  useEffect(() => {
    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, busy]);

  // Apply Prompt Edit
  const applyJevEdit = useCallback(async (promptText?: string) => {
    const instruction = (promptText || command).trim();
    if (!slug || !siteId || !instruction || busy || !site) return;

    setBusy(true);
    setBusyStep('Thinking...');
    const userMsgId = `user_${Date.now()}`;
    const targetParam = selectedSectionId !== 'all' ? selectedSectionId : undefined;

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        text: instruction,
        target: targetParam,
      },
    ]);
    setCommand('');

    const start = Date.now();

    // A full (re)generation is requested by a build verb or a long initial brief;
    // every other fragment is a targeted correction for the 3-lane router.
    const isFullGeneration = targetParam === undefined
      && (/^(build|create|generate|rebuild|make|design|setup|adanola|lookbook)\b/i.test(instruction)
          || /editorial|lookbook|activewear|storefront|4-column|monochrome|adanola/i.test(instruction)
          || instruction.length > 80);

    if (isFullGeneration) {
      setBusyStep('Generating site...');
      try {
        // Theme, category and gates are judged server-side from the brief; pass explicit category if lookbook/retail is requested.
        const isLookbookBrief = /editorial|lookbook|activewear|adanola/i.test(instruction);
        const genRes = await harness.site.generate(slug, {
          prompt: instruction,
          title: workspaceName,
          ...(isLookbookBrief ? { category: 'retail', theme: 'editorial-lookbook' } : {}),
        });
        const elapsed = Date.now() - start;
        if (mountedRef.current) {
          if (genRes.preview?.html) setHtml(genRes.preview.html);
          setSnapshot((prev) => {
            if (!prev) return null;
            const nextSnap: SiteSnapshot = {
              ...prev,
              site: { id: genRes.siteId, version: genRes.version, state: genRes.state, data: genRes.site },
              html: genRes.preview?.html || prev.html,
            };
            siteSnapshotCache.set(slug, nextSnap);
            void SecureStore.setItemAsync(siteStorageKey(slug), JSON.stringify(nextSnap)).catch(() => undefined);
            return nextSnap;
          });

          setMessages((prev) => [
            ...prev,
            {
              id: `jev_${Date.now()}`,
              role: 'jev',
              revision: genRes.version,
              ms: elapsed,
              text: `Storefront generated from your brief with live catalog bindings and published pages. (rev ${genRes.version})`,
            },
          ]);
        }
      } catch (err) {
        if (mountedRef.current) {
          await loadSite().catch(() => undefined);
          Alert.alert('Generation failed', err instanceof Error ? err.message : 'Could not generate site.');
        }
      } finally {
        if (mountedRef.current) {
          setBusy(false);
          setBusyStep('');
        }
      }
      return;
    }

    const effectiveInstruction = pendingInstruction
      ? `${pendingInstruction} in ${instruction}`
      : instruction;

    try {
      const proposal: AskOutcome = await harness.site.ask(slug, siteId, effectiveInstruction, targetParam);

      if (!proposal.operations?.length) {
        if (proposal.questions?.length) {
          setPendingInstruction(effectiveInstruction);
        }
        const elapsed = Date.now() - start;
        setMessages((prev) => [
          ...prev,
          {
            id: `jev_${Date.now()}`,
            role: 'jev',
            revision: site.revision,
            ms: elapsed,
            text: proposal.questions?.length
              ? proposal.questions.join(' ')
              : 'No layout or style adjustments were needed for this request.',
          },
        ]);
        return;
      }

      setPendingInstruction(null);
      setBusyStep('Applying changes...');
      const summaryText = proposal.summary || instruction;
      const edited = await harness.site.edit(
        slug,
        siteId,
        proposal.base,
        proposal.operations,
        summaryText,
      );

      const elapsed = Date.now() - start;

      if (mountedRef.current) {
        if (edited.html) setHtml(edited.html);
        setSnapshot((prev) => {
          if (!prev) return null;
          const nextSnap: SiteSnapshot = {
            ...prev,
            site: { id: siteId, version: edited.version, state: prev.site?.state || 'draft', data: edited.site },
            html: edited.html || prev.html,
          };
          siteSnapshotCache.set(slug, nextSnap);
          void SecureStore.setItemAsync(siteStorageKey(slug), JSON.stringify(nextSnap)).catch(() => undefined);
          return nextSnap;
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `jev_${Date.now()}`,
            role: 'jev',
            revision: edited.revision,
            ms: elapsed,
            text: `${summaryText}. (rev ${edited.revision})`,
          },
        ]);
      }
    } catch (err) {
      if (mountedRef.current) {
        await loadSite().catch(() => undefined);
        Alert.alert('Edit failed', err instanceof Error ? err.message : 'Could not apply prompt edit.');
      }
    } finally {
      if (mountedRef.current) {
        setBusy(false);
        setBusyStep('');
      }
    }
  }, [slug, siteId, command, busy, site, selectedSectionId, pendingInstruction, loadSite, workspaceName]);

  // Undo last revision
  const undoLastEdit = useCallback(async () => {
    if (!slug || !siteId || busy) return;
    setBusy(true);
    setBusyStep('Reverting...');
    const start = Date.now();
    try {
      const undone = await harness.site.undo(slug, siteId);
      const elapsed = Date.now() - start;
      if (mountedRef.current) {
        if (undone.html) setHtml(undone.html);
        setSnapshot((prev) => {
          if (!prev) return null;
          const nextSnap: SiteSnapshot = {
            ...prev,
            site: { id: siteId, version: undone.version, state: prev.site?.state || 'draft', data: undone.site },
            html: undone.html || prev.html,
          };
          siteSnapshotCache.set(slug, nextSnap);
          void SecureStore.setItemAsync(siteStorageKey(slug), JSON.stringify(nextSnap)).catch(() => undefined);
          return nextSnap;
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `undo_${Date.now()}`,
            role: 'jev',
            revision: undone.revision,
            ms: elapsed,
            text: `Restored previous state as revision ${undone.revision}.`,
          },
        ]);
      }
    } catch (err) {
      if (mountedRef.current) {
        Alert.alert('Undo failed', err instanceof Error ? err.message : 'Could not undo.');
      }
    } finally {
      if (mountedRef.current) {
        setBusy(false);
        setBusyStep('');
      }
    }
  }, [slug, siteId, busy]);

  // One-Tap Publish
  const publishSite = useCallback(async () => {
    if (!slug || !siteId || busy) return;
    setBusy(true);
    setBusyStep('Publishing live...');
    const start = Date.now();
    try {
      const compiled = await harness.site.compile(slug, siteId);
      const published = await harness.site.publish(slug, siteId, compiled.releaseId, compiled.hash);
      const elapsed = Date.now() - start;

      if (mountedRef.current) {
        const livePublicUrl = published.publicUrl || published.liveUrl || `https://${slug}.workers.dev`;
        setSnapshot((prev) => {
          if (!prev) return null;
          const nextSnap: SiteSnapshot = {
            ...prev,
            publicationState: 'active',
            publicUrl: livePublicUrl,
            liveRelease: published.releaseId,
            site: prev.site ? { ...prev.site, state: 'live' } : null,
          };
          siteSnapshotCache.set(slug, nextSnap);
          void SecureStore.setItemAsync(siteStorageKey(slug), JSON.stringify(nextSnap)).catch(() => undefined);
          return nextSnap;
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `pub_${Date.now()}`,
            role: 'jev',
            revision: site?.revision,
            ms: elapsed,
            text: `Live storefront published at ${livePublicUrl}`,
          },
        ]);
        void loadSite();
      }
    } catch (err) {
      if (mountedRef.current) {
        Alert.alert('Publish failed', err instanceof Error ? err.message : 'Could not publish site.');
      }
    } finally {
      if (mountedRef.current) {
        setBusy(false);
        setBusyStep('');
      }
    }
  }, [slug, siteId, busy, site?.revision, loadSite]);

  // Native node rendering for preview modal
  const renderNativeNode = (node: Node, toneColors: { ink: string; surface: string; border: string; accent: string }) => {
    switch (node.kind) {
      case 'heading': {
        const level = Number(node.props?.level) || 2;
        const fontSize = level === 1 ? 24 : level === 2 ? 19 : 15;
        return (
          <Text
            key={node.id}
            style={[
              styles.previewHeading,
              { fontSize, color: toneColors.ink, lineHeight: fontSize * 1.25 },
            ]}
          >
            {String(node.props?.text || '')}
          </Text>
        );
      }
      case 'text':
        return (
          <Text key={node.id} style={[styles.previewBody, { color: toneColors.ink }]}>
            {String(node.props?.text || '')}
          </Text>
        );
      case 'button':
        return (
          <View
            key={node.id}
            style={[styles.previewButton, { backgroundColor: toneColors.accent }]}
          >
            <Text style={styles.previewButtonText}>
              {String(node.props?.label || node.props?.text || 'Explore')}
            </Text>
          </View>
        );
      case 'card':
        return (
          <View
            key={node.id}
            style={[
              styles.previewCard,
              { backgroundColor: toneColors.surface, borderColor: toneColors.border },
            ]}
          >
            {node.children?.map((child) => renderNativeNode(child, toneColors))}
          </View>
        );
      case 'collection': {
        const items = Array.isArray(node.props?.items) ? node.props.items : [];
        return (
          <View key={node.id} style={styles.previewCollectionGrid}>
            {items.map((item: Record<string, unknown>, idx: number) => {
              const itemTitle = String(item.title || `Item ${idx + 1}`);
              const rawPrice = Number(item.price);
              const itemPrice = Number.isFinite(rawPrice)
                ? (rawPrice >= 100 ? `$${(rawPrice / 100).toFixed(2)}` : `$${rawPrice}`)
                : '';
              return (
                <View
                  key={String(item.id || idx)}
                  style={[
                    styles.previewProductCard,
                    { backgroundColor: toneColors.surface, borderColor: toneColors.border },
                  ]}
                >
                  <View style={[styles.productImageMock, { backgroundColor: toneColors.border }]} />
                  <Text style={[styles.productTitle, { color: toneColors.ink }]} numberOfLines={1}>
                    {itemTitle}
                  </Text>
                  {itemPrice ? (
                    <Text style={[styles.productPrice, { color: toneColors.accent }]}>{itemPrice}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      }
      case 'flex':
        return (
          <View key={node.id} style={styles.previewFlexRow}>
            {node.children?.map((child) => renderNativeNode(child, toneColors))}
          </View>
        );
      case 'stack':
        return (
          <View key={node.id} style={styles.previewStack}>
            {node.children?.map((child) => renderNativeNode(child, toneColors))}
          </View>
        );
      default:
        return (
          <View key={node.id} style={{ marginVertical: 2 }}>
            {node.children?.map((child) => renderNativeNode(child, toneColors))}
          </View>
        );
    }
  };

  const renderNativeSection = (section: Section) => {
    const tone = section.style?.base?.background?.includes('ink') ? 'ink'
      : section.style?.base?.background?.includes('surface') ? 'surface'
      : section.style?.base?.background?.includes('accent') ? 'accent' : 'canvas';

    const toneColors = {
      ink: tone === 'ink' ? '#ffffff' : '#09090b',
      canvas: tone === 'ink' ? '#09090b' : '#ffffff',
      surface: tone === 'ink' ? '#18181b' : '#f4f4f5',
      border: tone === 'ink' ? '#27272a' : '#e4e4e7',
      accent: site?.design?.color?.accent || '#18181b',
    };

    return (
      <View
        key={section.id}
        style={[
          styles.previewSectionContainer,
          { backgroundColor: toneColors.canvas, borderColor: toneColors.border },
        ]}
      >
        <Text style={[styles.sectionBadge, { color: tone === 'ink' ? '#71717a' : '#a1a1aa' }]}>
          {section.purpose.toUpperCase()}
        </Text>
        {section.nodes?.map((node) => renderNativeNode(node, toneColors))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
        {/* ChatGPT Light Minimalist Header */}
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityLabel="Close Studio"
            onPress={onClose}
            style={styles.headerIconBtn}
          >
            <Ionicons name="close" size={20} color="#18181b" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {workspaceName}
            </Text>
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, isLive ? styles.statusDotLive : styles.statusDotDraft]} />
              <Text style={styles.statusText}>
                {isLive ? 'Live' : 'Draft'} · rev {revision}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setPreviewOpen(true)}
              style={styles.previewPill}
              accessibilityLabel="Preview Storefront"
            >
              <Text style={styles.previewPillText}>Preview</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={busy || !site}
              onPress={() => void publishSite()}
              style={[
                styles.publishPill,
                isLive ? styles.publishPillLive : styles.publishPillDraft,
                (busy || !site) && styles.disabled,
              ]}
            >
              <Text
                style={[
                  styles.publishPillText,
                  isLive ? styles.publishPillTextLive : styles.publishPillTextDraft,
                ]}
              >
                {isLive ? 'Republish' : 'Publish'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ChatGPT Light Chat Feed */}
        {initialLoading && !site ? (
          <View style={styles.loadingFeed}>
            <ActivityIndicator size="small" color="#71717a" />
            <Text style={styles.loadingFeedText}>Connecting...</Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.chatContainer}
          >
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatFeed}
              contentContainerStyle={[styles.chatFeedContent, { paddingBottom: 24 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <View
                    key={msg.id || index}
                    style={[
                      styles.chatRow,
                      isUser ? styles.chatRowUser : styles.chatRowJev,
                    ]}
                  >
                    {!isUser ? (
                      <View style={styles.jevAvatar}>
                        <Text style={styles.jevAvatarText}>J</Text>
                      </View>
                    ) : null}

                    <View
                      style={[
                        styles.bubble,
                        isUser ? styles.userBubble : styles.jevBubble,
                      ]}
                    >
                      <Text style={styles.bubbleText}>
                        {msg.text}
                      </Text>

                      {!isUser && msg.revision && msg.revision > 1 ? (
                        <View style={styles.jevFooterRow}>
                          <TouchableOpacity
                            onPress={() => void undoLastEdit()}
                            disabled={busy}
                            style={styles.bubbleActionBtn}
                          >
                            <Text style={styles.bubbleActionText}>Undo</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}

              {busy && busyStep ? (
                <View style={styles.chatRowJev}>
                  <View style={styles.jevAvatar}>
                    <ActivityIndicator size="small" color="#71717a" />
                  </View>
                  <View style={[styles.bubble, styles.jevBubble, styles.thinkingBubble]}>
                    <Text style={styles.thinkingText}>{busyStep}</Text>
                  </View>
                </View>
              ) : null}
            </ScrollView>

            {/* ChatGPT Light Floating Bottom Bar */}
            <View style={[styles.bottomBarWrap, { paddingBottom: Math.max(insets.bottom + 6, 16) }]}>
              {/* Subtle Horizontal Suggestion Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
              >
                {QUICK_PROMPTS.map((prompt) => (
                  <TouchableOpacity
                    key={prompt}
                    onPress={() => void applyJevEdit(prompt)}
                    disabled={busy}
                    style={styles.chip}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipText}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Floating Input Dock */}
              <View style={styles.inputDock}>
                {/* Optional Target Pill */}
                {selectedSectionId !== 'all' ? (
                  <TouchableOpacity
                    onPress={() => setSelectedSectionId('all')}
                    style={styles.targetIndicator}
                  >
                    <Text style={styles.targetIndicatorText}>{selectedSectionId}</Text>
                    <Ionicons name="close" size={11} color="#71717a" />
                  </TouchableOpacity>
                ) : null}

                <TextInput
                  style={styles.textInput}
                  value={command}
                  onChangeText={setCommand}
                  placeholder="Describe a change..."
                  placeholderTextColor="#a1a1aa"
                  multiline
                  editable={!busy}
                />

                <TouchableOpacity
                  disabled={busy || !command.trim()}
                  onPress={() => void applyJevEdit()}
                  style={[
                    styles.sendBtn,
                    command.trim() ? styles.sendBtnActive : styles.sendBtnDisabled,
                  ]}
                  activeOpacity={0.8}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons
                      name="arrow-up"
                      size={18}
                      color={command.trim() ? '#ffffff' : '#a1a1aa'}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* Clean Slide-Up Storefront Preview Modal */}
        <Modal
          visible={previewOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setPreviewOpen(false)}
        >
          <View style={[styles.previewRoot, { paddingTop: Math.max(insets.top, 8) }]}>
            <View style={styles.previewHeader}>
              <TouchableOpacity
                onPress={() => setPreviewOpen(false)}
                style={styles.headerIconBtn}
              >
                <Ionicons name="close" size={20} color="#18181b" />
              </TouchableOpacity>

              <Text style={styles.previewTitle}>{workspaceName}</Text>

              <TouchableOpacity
                onPress={async () => {
                  const target = publicUrl || `https://${slug}.workers.dev`;
                  try {
                    if (Platform.OS === 'web') {
                      void Linking.openURL(target);
                    } else {
                      await WebBrowser.openBrowserAsync(target, {
                        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                        toolbarColor: '#000000',
                        controlsColor: '#ffffff',
                      });
                    }
                  } catch {
                    void Linking.openURL(target);
                  }
                }}
                style={styles.browserLinkBtn}
              >
                <Text style={styles.browserLinkText}>Browser</Text>
                <Ionicons name="open-outline" size={12} color="#18181b" />
              </TouchableOpacity>
            </View>

            {/* Page tabs */}
            {site?.pages && site.pages.length > 1 ? (
              <View style={styles.pageTabsBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
                  {site.pages.map((p) => {
                    const isActive = activePage?.id === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => setActivePageId(p.id)}
                        style={[styles.pageTabPill, isActive && styles.pageTabPillActive]}
                      >
                        <Text style={[styles.pageTabPillText, isActive && styles.pageTabPillTextActive]}>
                          {p.title || p.path}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* Full Visual Content */}
            <View style={styles.previewCanvas}>
              {Platform.OS === 'web' && html ? (
                React.createElement('iframe', {
                  srcDoc: html,
                  title: 'Storefront',
                  style: { width: '100%', height: '100%', border: 'none', backgroundColor: '#ffffff' },
                })
              ) : (
                <ScrollView style={styles.nativePreviewScroll} showsVerticalScrollIndicator={false}>
                  <View style={styles.nativeHeaderBar}>
                    <Text style={styles.nativeBrandTitle}>{workspaceName}</Text>
                    <View style={styles.nativeNavRow}>
                      {(site?.pages || []).slice(0, 3).map((p) => (
                        <TouchableOpacity key={p.id} onPress={() => setActivePageId(p.id)}>
                          <Text style={[styles.nativeNavLink, p.id === activePageId && styles.nativeNavLinkActive]}>
                            {p.title || p.path}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  {(activePage?.sections || []).map((sec) => renderNativeSection(sec))}
                  <View style={styles.nativeFooterBar}>
                    <Text style={styles.nativeFooterText}>© {new Date().getFullYear()} {workspaceName} · TAR</Text>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },

  // Header
  header: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f4f4f5',
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#18181b', letterSpacing: -0.2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusDotLive: { backgroundColor: '#16a34a' },
  statusDotDraft: { backgroundColor: '#a1a1aa' },
  statusText: { fontSize: 11, color: '#71717a', fontWeight: '500' },

  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  previewPillText: { fontSize: 12, fontWeight: '600', color: '#18181b' },
  publishPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  publishPillDraft: {
    backgroundColor: '#18181b',
  },
  publishPillLive: {
    backgroundColor: '#f4f4f5',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  publishPillText: { fontSize: 12, fontWeight: '600' },
  publishPillTextDraft: { color: '#ffffff' },
  publishPillTextLive: { color: '#18181b' },
  disabled: { opacity: 0.4 },

  // Loading
  loadingFeed: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingFeedText: { fontSize: 13, color: '#71717a' },

  // Chat Feed - Pure ChatGPT Light Design System
  chatContainer: { flex: 1, backgroundColor: '#ffffff' },
  chatFeed: { flex: 1 },
  chatFeedContent: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  chatRow: { flexDirection: 'row', width: '100%' },
  chatRowUser: { justifyContent: 'flex-end' },
  chatRowJev: { justifyContent: 'flex-start', alignItems: 'flex-start', gap: 10 },

  jevAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f4f4f5',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  jevAvatarText: { fontSize: 11, fontWeight: '700', color: '#71717a' },

  bubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 11,
    maxWidth: '84%',
  },
  userBubble: {
    backgroundColor: '#f4f4f6',
    borderBottomRightRadius: 4,
  },
  jevBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f4f4f5',
    borderBottomLeftRadius: 4,
  },
  thinkingBubble: {
    paddingVertical: 8,
    backgroundColor: '#fafafa',
  },
  thinkingText: { fontSize: 13, color: '#71717a', fontStyle: 'italic' },
  bubbleText: { fontSize: 14, lineHeight: 21, color: '#18181b' },

  jevFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f4f4f5',
    gap: 12,
  },
  jevMetaText: { fontSize: 10, color: '#a1a1aa', fontWeight: '500' },
  jevActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bubbleActionBtn: {
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  bubbleActionText: { fontSize: 10, color: '#52525b', fontWeight: '600' },

  // Bottom Floating Bar (ChatGPT Light)
  bottomBarWrap: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  chipsScroll: { gap: 6, paddingBottom: 8 },
  chip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  chipText: { fontSize: 12, color: '#52525b', fontWeight: '500' },

  inputDock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f6',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minHeight: 44,
  },
  targetIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e4e4e7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
    gap: 3,
  },
  targetIndicatorText: { fontSize: 10, color: '#18181b', fontWeight: '600' },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#18181b',
    maxHeight: 80,
    paddingVertical: 4,
  },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  sendBtnActive: { backgroundColor: '#18181b' },
  sendBtnDisabled: { backgroundColor: '#e4e4e7' },

  // Preview Modal Sheet
  previewRoot: { flex: 1, backgroundColor: '#ffffff' },
  previewHeader: {
    height: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f4f4f5',
  },
  previewTitle: { fontSize: 15, fontWeight: '700', color: '#18181b' },
  browserLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#f4f4f5' },
  browserLinkText: { fontSize: 11, fontWeight: '600', color: '#18181b' },
  pageTabsBar: { paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f4f4f5' },
  pageTabPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: '#f4f4f5' },
  pageTabPillActive: { backgroundColor: '#18181b' },
  pageTabPillText: { fontSize: 12, color: '#71717a', fontWeight: '500' },
  pageTabPillTextActive: { color: '#ffffff', fontWeight: '600' },
  previewCanvas: { flex: 1, backgroundColor: '#ffffff' },

  // Native Preview Renderer
  nativePreviewScroll: { flex: 1, backgroundColor: '#ffffff' },
  nativeHeaderBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  nativeBrandTitle: { fontSize: 16, fontWeight: '800', color: '#09090b', letterSpacing: -0.3 },
  nativeNavRow: { flexDirection: 'row', gap: 12 },
  nativeNavLink: { fontSize: 12, color: '#71717a', fontWeight: '500' },
  nativeNavLinkActive: { color: '#09090b', fontWeight: '700' },
  previewSectionContainer: { paddingHorizontal: 18, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  sectionBadge: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },
  previewHeading: { fontWeight: '800', marginBottom: 8, letterSpacing: -0.3 },
  previewBody: { fontSize: 14, lineHeight: 21, marginBottom: 12 },
  previewButton: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 6, marginVertical: 4 },
  previewButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  previewCard: { padding: 14, borderRadius: 8, borderWidth: 1, marginVertical: 6 },
  previewCollectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8, width: '100%', justifyContent: 'space-between' },
  previewProductCard: { width: '48%', padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 4 },
  productImageMock: { width: '100%', aspectRatio: 3 / 4, borderRadius: 4, marginBottom: 8 },
  productTitle: { fontSize: 12, fontWeight: '600', marginBottom: 3, lineHeight: 16 },
  productPrice: { fontSize: 12, fontWeight: '700' },
  previewFlexRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 4 },
  previewStack: { gap: 8 },
  nativeFooterBar: { padding: 24, alignItems: 'center', backgroundColor: '#f4f4f5', borderTopWidth: 1, borderTopColor: '#e4e4e7' },
  nativeFooterText: { fontSize: 11, color: '#a1a1aa' },
});
