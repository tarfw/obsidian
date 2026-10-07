import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
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
import { harness, SITES_URL } from '@/lib/harness';
import type { Section, SiteDocument, SiteSnapshot } from '@/lib/site-schema';

export interface SiteScreenProps {
  visible: boolean;
  onClose: () => void;
  workspaceName: string;
  subdomain: string;
  scope: string;
  workspaceDescription?: string;
}

export interface ToastInfo {
  text: string;
  revision?: number;
}

const siteSnapshotCache = new Map<string, SiteSnapshot>();
const siteStorageKey = (slug: string) => `tar_site_snap_${slug}`;

const QUICK_TASTE_SUGGESTIONS = [
  'Pure Silk & Handloom',
  'Festive Collection',
  'Minimalist & Elegant',
  'WhatsApp Orders',
  'Same-Day Delivery',
  'Traditional Craft',
];

export default function SiteScreen({
  visible,
  onClose,
  workspaceName,
  subdomain,
  scope,
}: SiteScreenProps) {
  const insets = useSafeAreaInsets();
  const slug = useMemo(
    () =>
      scope.replace(/^w:/, '').trim() ||
      subdomain.toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
      workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    [scope, subdomain, workspaceName],
  );
  const mountedRef = useRef(true);

  // Cached initial state
  const initialCached = slug ? siteSnapshotCache.get(slug) || null : null;

  // Site Document & Server State
  const [snapshot, setSnapshot] = useState<SiteSnapshot | null>(initialCached);
  const [initialLoading, setInitialLoading] = useState<boolean>(!initialCached);
  const [busy, setBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState<string>('');
  const [toast, setToast] = useState<ToastInfo | null>(null);

  // Modals
  const [tasteDrawerOpen, setTasteDrawerOpen] = useState(false);
  const [publishDrawerOpen, setPublishDrawerOpen] = useState(false);
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);

  // Inputs
  const [newBullet, setNewBullet] = useState('');
  const [noticeText, setNoticeText] = useState('');

  const site: SiteDocument | null = snapshot?.site?.data ?? null;
  const siteId = snapshot?.site?.id ?? '';
  const isLive = snapshot?.publicationState === 'active' || snapshot?.site?.state === 'live';
  const defaultSiteUrl = slug ? `${SITES_URL}/${slug}` : null;
  const publicUrl = snapshot?.publicUrl || defaultSiteUrl;
  const displayDomain = publicUrl ? publicUrl.replace(/^https?:\/\//, '') : (slug ? `tar-sites.tar-54d.workers.dev/${slug}` : '');

  const tasteBullets: string[] = useMemo(() => {
    if (!site?.taste) return [];
    if (Array.isArray(site.taste.bullets) && site.taste.bullets.length) return site.taste.bullets;
    if (Array.isArray(site.taste.accepted) && site.taste.accepted.length) return site.taste.accepted;
    return [];
  }, [site]);

  const sections: Section[] = useMemo(() => {
    if (!site?.pages?.length) return [];
    const homePage = site.pages.find((p) => p.id === 'home' || p.path === '/') || site.pages[0];
    return homePage.sections || [];
  }, [site]);

  const activeNotice: string | null = useMemo(() => {
    const noticeSec = sections.find((s) => s.purpose === 'notice');
    if (!noticeSec) return null;
    const textNode = noticeSec.nodes?.find((n) => n.kind === 'text');
    return textNode?.props?.text ? String(textNode.props.text) : null;
  }, [sections]);

  // Load site snapshot
  const loadSite = useCallback(async () => {
    if (!slug) return;
    try {
      const snap = await harness.site.get(slug);
      if (mountedRef.current && snap?.site?.data) {
        siteSnapshotCache.set(slug, snap);
        void SecureStore.setItemAsync(siteStorageKey(slug), JSON.stringify(snap)).catch(() => undefined);
        setSnapshot(snap);
      }
    } catch {
      // Retain existing snapshot
    } finally {
      if (mountedRef.current) {
        setInitialLoading(false);
        setBusy(false);
        setBusyMessage('');
      }
    }
  }, [slug]);

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
                  siteSnapshotCache.set(slug, stored);
                  setSnapshot(stored);
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
  }, [visible, slug, loadSite]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Open in browser
  const openInBrowser = useCallback(() => {
    const target = publicUrl || (slug ? `${SITES_URL}/${slug}` : null);
    if (!target) return;
    void Linking.openURL(target).catch(() => {
      Alert.alert('Cannot open link', `Could not open ${target} in browser.`);
    });
  }, [publicUrl, slug]);

  // Add taste bullet
  const addTasteBullet = useCallback(async (bulletToAdd?: string) => {
    const bullet = (bulletToAdd || newBullet).trim();
    if (!bullet || !slug || !siteId || busy) return;
    setBusy(true);
    setBusyMessage('Jev updating Blueprint...');
    setNewBullet('');
    try {
      const res = await harness.site.tasteAdd(slug, siteId, bullet);
      if (mountedRef.current) {
        setSnapshot((prev) => {
          if (!prev) return null;
          const nextSnap: SiteSnapshot = {
            ...prev,
            site: { id: siteId, version: res.version, state: res.state || prev.site?.state || 'draft', data: res.site },
            html: res.preview?.html || prev.html,
          };
          siteSnapshotCache.set(slug, nextSnap);
          void SecureStore.setItemAsync(siteStorageKey(slug), JSON.stringify(nextSnap)).catch(() => undefined);
          return nextSnap;
        });
        setToast({ text: `Taste updated: "${bullet}"` });
      }
    } catch (err) {
      if (mountedRef.current) {
        Alert.alert('Taste update failed', err instanceof Error ? err.message : 'Could not add taste bullet.');
      }
    } finally {
      if (mountedRef.current) {
        setBusy(false);
        setBusyMessage('');
      }
    }
  }, [slug, siteId, busy, newBullet]);

  // Remove taste bullet
  const removeTasteBullet = useCallback(async (bullet: string) => {
    if (!bullet || !slug || !siteId || busy) return;
    setBusy(true);
    setBusyMessage('Jev updating Blueprint...');
    try {
      const res = await harness.site.tasteRemove(slug, siteId, bullet);
      if (mountedRef.current) {
        setSnapshot((prev) => {
          if (!prev) return null;
          const nextSnap: SiteSnapshot = {
            ...prev,
            site: { id: siteId, version: res.version, state: res.state || prev.site?.state || 'draft', data: res.site },
            html: res.preview?.html || prev.html,
          };
          siteSnapshotCache.set(slug, nextSnap);
          void SecureStore.setItemAsync(siteStorageKey(slug), JSON.stringify(nextSnap)).catch(() => undefined);
          return nextSnap;
        });
        setToast({ text: `Removed taste bullet` });
      }
    } catch (err) {
      if (mountedRef.current) {
        Alert.alert('Removal failed', err instanceof Error ? err.message : 'Could not remove taste bullet.');
      }
    } finally {
      if (mountedRef.current) {
        setBusy(false);
        setBusyMessage('');
      }
    }
  }, [slug, siteId, busy]);

  // Voice or prompt input for mic
  const handleVoiceOrPromptAdd = useCallback(() => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Speak / Describe Taste',
        'Add a style bullet (e.g. "Pure silk sarees direct from Salem"):',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add', onPress: (text?: string) => text && void addTasteBullet(text) },
        ],
        'plain-text',
      );
    } else {
      Alert.alert(
        'Speak / Describe Taste',
        'Type or dictate a style bullet into the box above, then tap "+".',
      );
    }
  }, [addTasteBullet]);

  // Set or clear notice
  const handleSaveNotice = useCallback(async () => {
    if (!slug || !siteId || busy) return;
    setBusy(true);
    setBusyMessage('Updating store notice...');
    try {
      const res = await harness.site.noticeSet(slug, siteId, noticeText.trim());
      if (mountedRef.current) {
        setSnapshot((prev) => {
          if (!prev) return null;
          const nextSnap: SiteSnapshot = {
            ...prev,
            site: { id: siteId, version: res.version, state: res.state || prev.site?.state || 'draft', data: res.site },
            html: res.preview?.html || prev.html,
          };
          siteSnapshotCache.set(slug, nextSnap);
          void SecureStore.setItemAsync(siteStorageKey(slug), JSON.stringify(nextSnap)).catch(() => undefined);
          return nextSnap;
        });
        setToast({ text: noticeText.trim() ? 'Notice set' : 'Notice cleared' });
        setNoticeModalOpen(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        Alert.alert('Notice update failed', err instanceof Error ? err.message : 'Could not set notice.');
      }
    } finally {
      if (mountedRef.current) {
        setBusy(false);
        setBusyMessage('');
      }
    }
  }, [slug, siteId, busy, noticeText]);


  // Undo last change
  const undoLastChange = useCallback(async () => {
    if (!slug || !siteId || busy) return;
    setBusy(true);
    setBusyMessage('Undoing change...');
    try {
      const res = await harness.site.undo(slug, siteId);
      if (mountedRef.current) {
        setSnapshot((prev) => {
          if (!prev) return null;
          const nextSnap: SiteSnapshot = {
            ...prev,
            site: { id: siteId, version: res.version, state: prev.site?.state || 'draft', data: res.site },
            html: res.html || prev.html,
          };
          siteSnapshotCache.set(slug, nextSnap);
          void SecureStore.setItemAsync(siteStorageKey(slug), JSON.stringify(nextSnap)).catch(() => undefined);
          return nextSnap;
        });
        setToast({ text: `Undone to revision ${res.revision}` });
      }
    } catch (err) {
      if (mountedRef.current) {
        Alert.alert('Undo failed', err instanceof Error ? err.message : 'Could not undo.');
      }
    } finally {
      if (mountedRef.current) {
        setBusy(false);
        setBusyMessage('');
      }
    }
  }, [slug, siteId, busy]);

  // Publish / Republish
  const publishSite = useCallback(async () => {
    if (!slug || !siteId || busy) return;
    setBusy(true);
    setBusyMessage('Publishing live to edge...');
    try {
      const compiled = await harness.site.compile(slug, siteId);
      const published = await harness.site.publish(slug, siteId, compiled.releaseId, compiled.hash);
      if (mountedRef.current) {
        const livePublicUrl = published.publicUrl || published.liveUrl || (slug ? `${SITES_URL}/${slug}` : '');
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
        setToast({ text: `Live storefront published!` });
        void loadSite();
      }
    } catch (err) {
      if (mountedRef.current) {
        Alert.alert('Publish failed', err instanceof Error ? err.message : 'Could not publish site.');
      }
    } finally {
      if (mountedRef.current) {
        setBusy(false);
        setBusyMessage('');
      }
    }
  }, [slug, siteId, busy, loadSite]);

  // Purge legacy data & reset storefront
  const resetStore = useCallback(() => {
    Alert.alert(
      'Reset Online Store?',
      'This will completely purge all legacy storefront data and rebuild a clean store using your taste bullets.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Store',
          style: 'destructive',
          onPress: async () => {
            if (!slug || busy) return;
            setBusy(true);
            setBusyMessage('Purging legacy data & rebuilding with Jev...');
            try {
              siteSnapshotCache.delete(slug);
              await SecureStore.deleteItemAsync(siteStorageKey(slug)).catch(() => undefined);
              await harness.site.reset(slug);
              if (mountedRef.current) {
                setToast({ text: 'Store cleanly reset to Autonomous Blueprint' });
                void loadSite();
              }
            } catch (err) {
              if (mountedRef.current) {
                Alert.alert('Reset failed', err instanceof Error ? err.message : 'Could not reset store.');
              }
            } finally {
              if (mountedRef.current) {
                setBusy(false);
                setBusyMessage('');
              }
            }
          },
        },
      ],
    );
  }, [slug, busy, loadSite]);

  const hasLegacySections = useMemo(() => {
    const legacyPurposes = ['chrome', 'introduction', 'categories', 'collection', 'recommendations', 'press', 'action'];
    return sections.some((s) => legacyPurposes.includes(s.purpose));
  }, [sections]);

  const handleCopyLink = useCallback(async () => {
    const target = publicUrl || (slug ? `${SITES_URL}/${slug}` : '');
    if (!target) return;
    try {
      await Clipboard.setStringAsync(target);
      setToast({ text: 'Store link copied to clipboard!' });
    } catch {
      setToast({ text: target });
    }
  }, [publicUrl, slug]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { paddingTop: Math.max(insets.top, 10) }]}>
        {/* Navigation Bar: ‹ {workspaceName}   [Open/Preview Arrow ↗] */}
        <View style={styles.topNavBar}>
          <View style={styles.navLeft}>
            <TouchableOpacity
              accessibilityLabel="Back"
              onPress={onClose}
              style={styles.navBackBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={22} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.navTitle} numberOfLines={1}>
              {workspaceName || 'Online Store'}
            </Text>
          </View>

          <TouchableOpacity
            accessibilityLabel="Open storefront in browser"
            onPress={openInBrowser}
            style={styles.navPreviewBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="open-outline" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* Main Content Area */}
        {initialLoading && !site ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#0f172a" />
            <Text style={styles.loadingText}>Connecting to store...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom + 64, 100) },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Toast Notification */}
            {toast ? (
              <View style={styles.toastBanner}>
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                <Text style={styles.toastText} numberOfLines={2}>
                  {toast.text}
                </Text>
                <TouchableOpacity onPress={() => setToast(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={16} color="#71717a" />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Busy Banner */}
            {busy && busyMessage ? (
              <View style={styles.busyBanner}>
                <ActivityIndicator size="small" color="#0f172a" />
                <Text style={styles.busyText}>{busyMessage}</Text>
              </View>
            ) : null}

            {/* Legacy Data Alert Banner */}
            {hasLegacySections ? (
              <View style={styles.legacyAlertBanner}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.legacyAlertTitle}>Legacy Store Data Detected</Text>
                  <Text style={styles.legacyAlertDetail}>
                    Outdated sections detected. Tap below to apply the clean Blueprint.
                  </Text>
                </View>
                <TouchableOpacity onPress={resetStore} disabled={busy} style={styles.legacyResetBtn}>
                  <Text style={styles.legacyResetBtnText}>Reset</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* 1. Status & Domain Single Text Row (Tapping opens Publish Drawer) */}
            <TouchableOpacity
              style={styles.statusRow}
              onPress={() => setPublishDrawerOpen(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Manage publication and domain"
            >
              <View style={styles.statusRowLeft}>
                <Ionicons name="globe-outline" size={15} color="#64748b" />
                <Text style={styles.statusDomainText} numberOfLines={1}>
                  {displayDomain}
                </Text>
              </View>
              <View style={styles.statusRowRight}>
                <View style={[styles.statusDot, isLive ? styles.statusDotLive : styles.statusDotDraft]} />
                <Text style={[styles.statusStateText, isLive ? styles.statusTextLive : styles.statusTextDraft]}>
                  {isLive ? 'Live' : 'Draft'}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* 2. TASTE (Flat list matching CreateWorkspace) */}
            <TouchableOpacity
              style={styles.tasteContainer}
              onPress={() => setTasteDrawerOpen(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Taste"
            >
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>TASTE</Text>
                <Text style={styles.plusActionText}>+</Text>
              </View>
              {tasteBullets.length > 0 ? (
                <View style={styles.bulletsWrap}>
                  {tasteBullets.map((block, idx) => (
                    <View key={idx} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{block}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* 3. SECTIONS (Flat list, zero badges/clutter) */}
            <View style={styles.sectionsContainer}>
              <Text style={styles.sectionLabel}>SECTIONS</Text>
              <View style={styles.sectionsList}>
                {/* 1. Header & Hero */}
                <View style={styles.sectionRow}>
                  <View style={styles.sectionRowLeft}>
                    <Ionicons name="storefront-outline" size={18} color="#0f172a" />
                    <Text style={styles.sectionRowTitle}>Header & Hero</Text>
                  </View>
                </View>

                {/* 2. Announcement Banner */}
                <TouchableOpacity
                  style={[styles.sectionRow, activeNotice ? styles.sectionRowActiveNotice : null]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setNoticeText(activeNotice || '');
                    setNoticeModalOpen(true);
                  }}
                >
                  <View style={styles.sectionRowLeft}>
                    <Ionicons
                      name="megaphone-outline"
                      size={18}
                      color={activeNotice ? '#b45309' : '#0f172a'}
                    />
                    <Text style={[styles.sectionRowTitle, activeNotice ? styles.sectionRowActiveNoticeText : null]} numberOfLines={1}>
                      {activeNotice ? `"${activeNotice}"` : 'Announcement Banner'}
                    </Text>
                  </View>
                  <Text style={styles.plusActionText}>{activeNotice ? '›' : '+'}</Text>
                </TouchableOpacity>

                {/* 3. Product Catalog */}
                <View style={styles.sectionRow}>
                  <View style={styles.sectionRowLeft}>
                    <Ionicons name="grid-outline" size={18} color="#0f172a" />
                    <Text style={styles.sectionRowTitle}>Product Catalog</Text>
                  </View>
                </View>

                {/* 4. WhatsApp & Contact */}
                <View style={[styles.sectionRow, styles.sectionRowLast]}>
                  <View style={styles.sectionRowLeft}>
                    <Ionicons name="logo-whatsapp" size={18} color="#16a34a" />
                    <Text style={styles.sectionRowTitle}>WhatsApp & Contact</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        )}

        {/* TASTE DRAWER (COMPACT, UNCLUTTERED, ZERO HINTS) */}
        <Modal
          visible={tasteDrawerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setTasteDrawerOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setTasteDrawerOpen(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardView}
            >
              <TouchableOpacity
                activeOpacity={1}
                style={[
                  styles.drawerContainer,
                  { paddingBottom: Math.max(insets.bottom + 16, 28) },
                ]}
                onPress={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <View style={styles.drawerHeader}>
                  <Text style={styles.drawerTitle}>Taste</Text>
                  <TouchableOpacity
                    onPress={() => setTasteDrawerOpen(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={20} color="#0f172a" />
                  </TouchableOpacity>
                </View>

                {/* Input row */}
                <View style={styles.drawerInputRow}>
                  <TextInput
                    style={styles.drawerInput}
                    placeholder="Add style..."
                    placeholderTextColor="#94a3b8"
                    value={newBullet}
                    onChangeText={setNewBullet}
                    onSubmitEditing={() => void addTasteBullet()}
                    returnKeyType="done"
                    editable={!busy}
                  />
                  <TouchableOpacity
                    style={[styles.drawerAddBtn, (!newBullet.trim() || busy) && styles.btnDisabled]}
                    onPress={() => void addTasteBullet()}
                    disabled={busy || !newBullet.trim()}
                    accessibilityRole="button"
                    accessibilityLabel="Add fact"
                  >
                    <Ionicons name="arrow-up-circle" size={28} color="#0f172a" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.drawerMicBtn}
                    onPress={handleVoiceOrPromptAdd}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel="Voice input"
                  >
                    <Ionicons name="mic-outline" size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Quick suggestions */}
                <View style={styles.suggestionsWrap}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suggestionsScroll}
                  >
                    {QUICK_TASTE_SUGGESTIONS.filter((s) => !tasteBullets.includes(s)).map((sugg) => (
                      <TouchableOpacity
                        key={sugg}
                        onPress={() => void addTasteBullet(sugg)}
                        disabled={busy}
                        style={styles.suggestionPill}
                      >
                        <Text style={styles.suggestionText}>+ {sugg}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Blocks List without hints */}
                <ScrollView
                  style={styles.drawerScroll}
                  contentContainerStyle={styles.drawerScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {tasteBullets.map((block, idx) => (
                    <View key={idx} style={styles.drawerBlockRow}>
                      <Text style={styles.drawerBlockBullet}>•</Text>
                      <Text style={styles.drawerBlockText}>{block}</Text>
                      <TouchableOpacity
                        style={styles.drawerRemoveBtn}
                        onPress={() => void removeTasteBullet(block)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel="Remove note"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle-outline" size={20} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </Modal>

        {/* PUBLISH DRAWER (COMPACT, UNCLUTTERED, SIMPLE) */}
        <Modal
          visible={publishDrawerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setPublishDrawerOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setPublishDrawerOpen(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[
                styles.publishDrawerCard,
                { paddingBottom: Math.max(insets.bottom + 16, 28) },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>{workspaceName || 'Online Store'}</Text>
                <TouchableOpacity
                  onPress={() => setPublishDrawerOpen(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color="#0f172a" />
                </TouchableOpacity>
              </View>

              {/* Status and Domain Row */}
              <View style={styles.drawerStatusRow}>
                <View style={styles.drawerDomainWrap}>
                  <Ionicons name="globe-outline" size={15} color="#64748b" />
                  <Text style={styles.drawerDomainText} numberOfLines={1}>
                    {displayDomain}
                  </Text>
                  <TouchableOpacity
                    onPress={handleCopyLink}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.drawerCopyBtn}
                  >
                    <Ionicons name="copy-outline" size={15} color="#0284c7" />
                  </TouchableOpacity>
                </View>

                <View style={styles.drawerStatusRight}>
                  <View style={[styles.statusDot, isLive ? styles.statusDotLive : styles.statusDotDraft]} />
                  <Text style={[styles.statusStateText, isLive ? styles.statusTextLive : styles.statusTextDraft]}>
                    {isLive ? 'Live' : 'Draft'}
                  </Text>
                </View>
              </View>

              {/* Main Actions */}
              <View style={styles.publishActionsWrap}>
                {isLive ? (
                  <View style={styles.liveActionsRow}>
                    <TouchableOpacity
                      onPress={() => {
                        setPublishDrawerOpen(false);
                        openInBrowser();
                      }}
                      style={styles.liveOpenBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.liveOpenBtnText}>Open Store ↗</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setPublishDrawerOpen(false);
                        void publishSite();
                      }}
                      disabled={busy}
                      style={styles.liveRepublishBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.liveRepublishBtnText}>Republish</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      setPublishDrawerOpen(false);
                      void publishSite();
                    }}
                    disabled={busy}
                    style={styles.publishBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.publishBtnText}>Publish Live</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Subtle Utilities */}
              {site && site.revision > 1 ? (
                <TouchableOpacity
                  onPress={() => {
                    setPublishDrawerOpen(false);
                    void undoLastChange();
                  }}
                  disabled={busy}
                  style={styles.subtleLink}
                >
                  <Text style={styles.subtleLinkText}>Undo change (rev {site.revision})</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={() => {
                  setPublishDrawerOpen(false);
                  resetStore();
                }}
                disabled={busy}
                style={styles.subtleLink}
              >
                <Text style={styles.subtleLinkText}>Reset Storefront to Default</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* NOTICE MODAL */}
        <Modal
          visible={noticeModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setNoticeModalOpen(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalBackdrop}
          >
            <View style={styles.noticeModalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Notice Banner</Text>
                <TouchableOpacity onPress={() => setNoticeModalOpen(false)}>
                  <Ionicons name="close" size={20} color="#0f172a" />
                </TouchableOpacity>
              </View>
              <Text style={styles.noticeModalHint}>
                1-tap banner on top of the storefront for festival hours, holiday delivery notes, or announcements.
              </Text>
              <TextInput
                style={styles.noticeTextInput}
                value={noticeText}
                onChangeText={setNoticeText}
                placeholder="e.g. Festival offer active: 10% off bridal silk sarees"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                editable={!busy}
              />
              <View style={styles.noticeModalActionsRow}>
                {activeNotice ? (
                  <TouchableOpacity
                    onPress={() => {
                      setNoticeText('');
                      void handleSaveNotice();
                    }}
                    disabled={busy}
                    style={styles.clearNoticeBtn}
                  >
                    <Text style={styles.clearNoticeBtnText}>Clear Banner</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  onPress={() => void handleSaveNotice()}
                  disabled={busy}
                  style={styles.saveNoticeBtn}
                >
                  <Text style={styles.saveNoticeBtnText}>Save Notice</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  navBackBtn: {
    padding: 2,
    marginRight: 2,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  navPreviewBtn: {
    padding: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  statusRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 12,
  },
  statusDomainText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
    flexShrink: 1,
  },
  statusRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusStateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusDotLive: {
    backgroundColor: '#16a34a',
  },
  statusDotDraft: {
    backgroundColor: '#d97706',
  },
  statusTextLive: {
    color: '#16a34a',
  },
  statusTextDraft: {
    color: '#d97706',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  scrollArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 10,
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    color: '#15803d',
    fontWeight: '500',
  },
  busyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    marginBottom: 10,
  },
  busyText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  legacyAlertBanner: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  legacyAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#be123c',
  },
  legacyAlertDetail: {
    fontSize: 12,
    color: '#9f1239',
    lineHeight: 16,
  },
  legacyResetBtn: {
    backgroundColor: '#be123c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  legacyResetBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Taste
  tasteContainer: {
    paddingVertical: 4,
    minHeight: 36,
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  plusActionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0284c7',
    paddingHorizontal: 4,
  },
  bulletsWrap: {
    gap: 8,
    paddingVertical: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 22,
    color: '#334155',
    fontWeight: '700',
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#1E293B',
  },

  // Sections
  sectionsContainer: {
    paddingVertical: 4,
    gap: 6,
  },
  sectionsList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    marginTop: 4,
  },
  sectionRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  sectionRowLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sectionRowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
  },
  sectionRowActiveNotice: {
    backgroundColor: '#fffbeb',
    borderRadius: 6,
    paddingHorizontal: 6,
  },
  sectionRowActiveNoticeText: {
    color: '#b45309',
    fontWeight: '600',
  },

  // Drawers Common
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  drawerContainer: {
    height: '75%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  drawerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drawerInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  drawerAddBtn: {
    padding: 2,
  },
  drawerMicBtn: {
    padding: 4,
  },
  suggestionsWrap: {
    gap: 6,
  },
  suggestionsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  suggestionPill: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  suggestionText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollContent: {
    gap: 8,
    paddingVertical: 4,
  },
  drawerBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  drawerBlockBullet: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '700',
    marginRight: 8,
  },
  drawerBlockText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
    flex: 1,
  },
  drawerRemoveBtn: {
    padding: 4,
  },
  btnDisabled: {
    opacity: 0.35,
  },

  // Publish Drawer
  publishDrawerCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 14,
  },
  drawerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  drawerDomainWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 10,
  },
  drawerDomainText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
    flexShrink: 1,
  },
  drawerCopyBtn: {
    padding: 3,
  },
  drawerStatusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  publishActionsWrap: {
    gap: 10,
    marginTop: 4,
  },
  publishBtn: {
    minHeight: 48,
    height: 48,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  publishBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  liveActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  liveOpenBtn: {
    flex: 1,
    minHeight: 48,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  liveOpenBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  liveRepublishBtn: {
    flex: 1,
    minHeight: 48,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  liveRepublishBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  subtleLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  subtleLinkText: {
    fontSize: 12,
    color: '#94a3b8',
  },

  // Notice Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  noticeModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  noticeModalHint: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  noticeTextInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  noticeModalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  clearNoticeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearNoticeBtnText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  saveNoticeBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveNoticeBtnText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
});
