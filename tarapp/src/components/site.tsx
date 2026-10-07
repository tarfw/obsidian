import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TarAvatar } from './TarAvatar';
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

const STYLE_SUGGESTIONS = [
  'Pure Silk & Handloom',
  'Festive Collection',
  'Minimalist & Elegant',
  'Traditional Craft',
  'Modern Chic',
  'Handmade & Organic',
];

const VOICE_SUGGESTIONS = [
  'Warm & Welcoming',
  'Luxury & Exclusive',
  'Authentic & Artisanal',
  'Friendly & Caring',
  'Bold & Energetic',
  'Calm & Poetic',
];

const RULES_SUGGESTIONS = [
  'No Flashy Popups',
  'No Neon Colors',
  'No Fake Urgency',
  'No Clutter',
  'No Low-Res Photos',
  'No Hidden Fees',
];

function SlideItem({
  text,
  onDelete,
  disabled,
}: {
  text: string;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const open = useRef(false);

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5;
      },
      onPanResponderMove: (_, gesture) => {
        const offset = open.current ? -72 : 0;
        const target = offset + gesture.dx;
        if (target <= 0 && target >= -80) {
          x.setValue(target);
        } else if (target > 0) {
          x.setValue(0);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -30 || (open.current && gesture.dx < 15)) {
          Animated.spring(x, {
            toValue: -72,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start(() => {
            open.current = true;
          });
        } else {
          Animated.spring(x, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start(() => {
            open.current = false;
          });
        }
      },
    }),
  ).current;

  const close = () => {
    Animated.spring(x, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start(() => {
      open.current = false;
    });
  };

  return (
    <View style={item.wrap}>
      <View style={item.under}>
        <TouchableOpacity
          style={item.action}
          onPress={() => {
            close();
            onDelete();
          }}
          disabled={disabled}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${text}`}
        >
          <Ionicons name="trash-outline" size={16} color="#ffffff" />
          <Text style={item.label}>Delete</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          item.front,
          {
            transform: [{ translateX: x }],
          },
        ]}
        {...responder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={close}
          style={item.content}
        >
          <Text style={item.dot}>•</Text>
          <Text style={item.text}>{text}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

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
  const [tab, setTab] = useState<'style' | 'voice' | 'rules'>('style');
  const [segwidth, setSegwidth] = useState(240);
  const tabAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);

  // Rotation animation for in-card publish button
  const [spinAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (busy) {
      const loop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      loop.start();
      return () => loop.stop();
    }
    spinAnim.setValue(0);
    return undefined;
  }, [busy, spinAnim]);

  const spin = useMemo(
    () =>
      spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      }),
    [spinAnim],
  );

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

  const sectionMeta = useCallback((purpose: string) => {
    switch (purpose) {
      case 'header':
        return { title: 'Header & Hero', icon: 'storefront-outline' as const };
      case 'notice':
        return { title: 'Announcement Banner', icon: 'megaphone-outline' as const };
      case 'spotlight':
        return { title: 'Spotlight & Offers', icon: 'sparkles-outline' as const };
      case 'catalog':
        return { title: 'Product Catalog', icon: 'grid-outline' as const };
      case 'menu':
        return { title: 'Food & Menu', icon: 'restaurant-outline' as const };
      case 'services':
        return { title: 'Services & Booking', icon: 'calendar-outline' as const };
      case 'story':
        return { title: 'Heritage & Story', icon: 'book-outline' as const };
      case 'trust':
        return { title: 'Trust & Verified Badges', icon: 'shield-checkmark-outline' as const };
      case 'contact':
        return { title: 'WhatsApp & Contact', icon: 'logo-whatsapp' as const };
      default:
        return { title: purpose.charAt(0).toUpperCase() + purpose.slice(1), icon: 'layers-outline' as const };
    }
  }, []);

  const displaySections = useMemo(() => {
    if (!sections.length) {
      const defaultKind = site?.blueprint?.kind || site?.category || 'goods';
      const mainSection = defaultKind === 'services' ? 'services' : defaultKind === 'food' ? 'menu' : 'catalog';
      return [
        { id: 'header', purpose: 'header', layout: { kind: 'stack' }, nodes: [] },
        { id: 'notice', purpose: 'notice', layout: { kind: 'stack' }, nodes: [] },
        { id: mainSection, purpose: mainSection, layout: { kind: 'stack' }, nodes: [] },
        { id: 'contact', purpose: 'contact', layout: { kind: 'stack' }, nodes: [] },
      ] as Section[];
    }
    const hasNotice = sections.some((s) => s.purpose === 'notice');
    if (hasNotice) {
      return sections;
    }
    const result: Section[] = [];
    for (const sec of sections) {
      result.push(sec);
      if (sec.purpose === 'header') {
        result.push({ id: 'notice', purpose: 'notice', layout: { kind: 'stack' }, nodes: [] });
      }
    }
    return result;
  }, [sections, site?.blueprint?.kind, site?.category]);

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

  const switchTab = useCallback((nextTab: 'style' | 'voice' | 'rules') => {
    if (tab === nextTab) return;
    const target = nextTab === 'style' ? 0 : nextTab === 'voice' ? 1 : 2;

    Animated.spring(tabAnim, {
      toValue: target,
      useNativeDriver: true,
      tension: 72,
      friction: 10,
    }).start();

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.15,
        duration: 80,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 170,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    setTab(nextTab);
  }, [tab, tabAnim, fadeAnim]);

  const tabBullets = useMemo(() => {
    if (tab === 'voice') {
      return tasteBullets.filter(
        (b) => b.toLowerCase().startsWith('voice:') || b.toLowerCase().startsWith('tone:'),
      );
    }
    if (tab === 'rules') {
      return tasteBullets.filter(
        (b) =>
          b.toLowerCase().startsWith('avoid:') ||
          b.toLowerCase().startsWith('rule:') ||
          b.toLowerCase().startsWith('no '),
      );
    }
    return tasteBullets.filter(
      (b) =>
        !b.toLowerCase().startsWith('voice:') &&
        !b.toLowerCase().startsWith('tone:') &&
        !b.toLowerCase().startsWith('avoid:') &&
        !b.toLowerCase().startsWith('rule:') &&
        !b.toLowerCase().startsWith('no '),
    );
  }, [tasteBullets, tab]);

  const tabSuggestions = useMemo(() => {
    if (tab === 'voice') return VOICE_SUGGESTIONS;
    if (tab === 'rules') return RULES_SUGGESTIONS;
    return STYLE_SUGGESTIONS;
  }, [tab]);

  const placeholder = useMemo(() => {
    if (tab === 'voice') return 'Add brand voice...';
    if (tab === 'rules') return 'Add rule or avoid...';
    return 'Add style...';
  }, [tab]);

  const handleAddTaste = useCallback(
    (customText?: string) => {
      const raw = (customText || newBullet).trim();
      if (!raw) return;
      let bullet = raw;
      if (tab === 'voice' && !raw.toLowerCase().startsWith('voice:') && !raw.toLowerCase().startsWith('tone:')) {
        bullet = `Voice: ${raw}`;
      } else if (
        tab === 'rules' &&
        !raw.toLowerCase().startsWith('avoid:') &&
        !raw.toLowerCase().startsWith('rule:') &&
        !raw.toLowerCase().startsWith('no ')
      ) {
        bullet = `Avoid: ${raw}`;
      }
      void addTasteBullet(bullet);
    },
    [newBullet, tab, addTasteBullet],
  );

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
        {/* Navigation Bar: ‹ {workspaceName}   [Publish / Live ↗] */}
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
            <View style={styles.navTitleWrap}>
              <Text style={styles.navTitle} numberOfLines={1}>
                {workspaceName || 'Online Store'}
              </Text>
              <TouchableOpacity onPress={handleCopyLink} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                <Text style={styles.navSubtitle} numberOfLines={1}>
                  {displayDomain}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Top-Right Action Button: Publish / Live ↗ */}
          <TouchableOpacity
            style={[
              styles.navActionBtn,
              isLive ? styles.navActionBtnLive : styles.navActionBtnDraft,
              busy && styles.navActionBtnBusy,
            ]}
            onPress={isLive ? openInBrowser : () => void publishSite()}
            onLongPress={isLive ? () => void publishSite() : undefined}
            disabled={busy}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={isLive ? 'Open live store' : 'Publish store'}
          >
            {busy ? (
              <View style={styles.navActionContent}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="sync" size={13} color="#ffffff" />
                </Animated.View>
                <Text style={styles.navActionTextBusy}>Publishing</Text>
              </View>
            ) : isLive ? (
              <View style={styles.navActionContent}>
                <Text style={styles.navActionTextLive}>Live</Text>
                <Ionicons name="open-outline" size={13} color="#2563eb" />
              </View>
            ) : (
              <View style={styles.navActionContent}>
                <Text style={styles.navActionTextDraft}>Publish</Text>
              </View>
            )}
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

            {/* Busy Banner (only for non-publish messages like taste updates) */}
            {busy && busyMessage && !busyMessage.toLowerCase().includes('publishing') ? (
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

            {/* 3. SECTIONS (Dynamic Jev Blueprint List) */}
            <View style={styles.sectionsContainer}>
              <Text style={styles.sectionLabel}>SECTIONS</Text>
              <View style={styles.sectionsList}>
                {displaySections.map((sec, idx) => {
                  const isLast = idx === displaySections.length - 1;
                  const isNotice = sec.purpose === 'notice';
                  if (isNotice) {
                    return (
                      <TouchableOpacity
                        key={sec.id || `notice-${idx}`}
                        style={[
                          styles.sectionRow,
                          activeNotice ? styles.sectionRowActiveNotice : null,
                          isLast ? styles.sectionRowLast : null,
                        ]}
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
                          <Text
                            style={[
                              styles.sectionRowTitle,
                              activeNotice ? styles.sectionRowActiveNoticeText : null,
                            ]}
                            numberOfLines={1}
                          >
                            {activeNotice ? `"${activeNotice}"` : 'Announcement Banner'}
                          </Text>
                        </View>
                        <Text style={styles.plusActionText}>{activeNotice ? '›' : '+'}</Text>
                      </TouchableOpacity>
                    );
                  }

                  const meta = sectionMeta(sec.purpose);
                  const isContact = sec.purpose === 'contact';
                  return (
                    <View
                      key={sec.id || `${sec.purpose}-${idx}`}
                      style={[styles.sectionRow, isLast ? styles.sectionRowLast : null]}
                    >
                      <View style={styles.sectionRowLeft}>
                        <Ionicons
                          name={meta.icon}
                          size={18}
                          color={isContact ? '#16a34a' : '#0f172a'}
                        />
                        <Text style={styles.sectionRowTitle}>{meta.title}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {site && site.revision > 1 ? (
              <TouchableOpacity
                onPress={() => void undoLastChange()}
                disabled={busy}
                style={styles.subtleLink}
                accessibilityRole="button"
                accessibilityLabel="Undo last change"
              >
                <Text style={styles.subtleLinkText}>Undo change (rev {site.revision})</Text>
              </TouchableOpacity>
            ) : null}

            {/* Subtle Reset Storefront Link */}
            <TouchableOpacity
              onPress={resetStore}
              disabled={busy}
              style={styles.subtleLink}
              accessibilityRole="button"
              accessibilityLabel="Reset Storefront"
            >
              <Text style={styles.subtleLinkText}>Reset Storefront to Default</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* TASTE SCREEN (FULL SCREEN REWORKED TO TASTE WITH SMOOTH TRANSITIONS) */}
        <Modal
          visible={tasteDrawerOpen}
          animationType="slide"
          onRequestClose={() => setTasteDrawerOpen(false)}
        >
          <View style={[drawer.root, { paddingTop: Math.max(insets.top, 12) }]}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={drawer.keyboard}
            >
              {/* TOP HEADER BAR */}
              <View style={drawer.header}>
                {/* Left: Circular Back Button */}
                <TouchableOpacity
                  style={drawer.menu}
                  onPress={() => setTasteDrawerOpen(false)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Back to store"
                >
                  <Ionicons name="chevron-back" size={22} color="#0f172a" />
                </TouchableOpacity>

                {/* Center: Segmented Pill (Style | Voice | Rules) with Smooth Animated Slider */}
                <View
                  style={drawer.segment}
                  onLayout={(e) => {
                    const w = e.nativeEvent.layout.width;
                    if (w > 0) setSegwidth(w);
                  }}
                >
                  {/* Smooth sliding pill indicator */}
                  <Animated.View
                    style={[
                      drawer.indicator,
                      {
                        width: Math.max(20, (segwidth - 6) / 3),
                        transform: [
                          {
                            translateX: tabAnim.interpolate({
                              inputRange: [0, 1, 2],
                              outputRange: [0, (segwidth - 6) / 3, ((segwidth - 6) / 3) * 2],
                            }),
                          },
                        ],
                      },
                    ]}
                  />

                  <TouchableOpacity
                    style={drawer.tab}
                    onPress={() => switchTab('style')}
                    activeOpacity={0.8}
                  >
                    <Text style={[drawer.label, tab === 'style' && drawer.active]}>
                      Style
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={drawer.tab}
                    onPress={() => switchTab('voice')}
                    activeOpacity={0.8}
                  >
                    <Text style={[drawer.label, tab === 'voice' && drawer.active]}>
                      Voice
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={drawer.tab}
                    onPress={() => switchTab('rules')}
                    activeOpacity={0.8}
                  >
                    <Text style={[drawer.label, tab === 'rules' && drawer.active]}>
                      Rules
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Right: Circular Avatar Button with TAR Assistant Avatar */}
                <TouchableOpacity
                  style={drawer.avatar}
                  activeOpacity={0.8}
                  onPress={handleVoiceOrPromptAdd}
                  accessibilityRole="button"
                  accessibilityLabel="AI Taste Assistant"
                >
                  <TarAvatar size={30} bgColor="#d8b4fe" expression="happy" />
                </TouchableOpacity>
              </View>

              {/* CONTENT BODY WITH SMOOTH FADE TRANSITION */}
              <Animated.View style={[drawer.body, { opacity: fadeAnim }]}>
                <ScrollView
                  style={drawer.scroll}
                  contentContainerStyle={drawer.content}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {tabBullets.length === 0 ? (
                    <View style={drawer.empty}>
                      <Text style={drawer.title}>
                        {tab === 'style'
                          ? 'No style bullets yet'
                          : tab === 'voice'
                          ? 'No voice guidelines yet'
                          : 'No rules or constraints yet'}
                      </Text>
                      <Text style={drawer.sub}>
                        {tab === 'style'
                          ? 'Tap style suggestions below or type your visual preferences.'
                          : tab === 'voice'
                          ? 'Define your brand tone, customer dialogue, or storytelling style.'
                          : 'Set boundaries on what the AI storefront should avoid.'}
                      </Text>
                    </View>
                  ) : (
                    tabBullets.map((block, idx) => {
                      const display = block.replace(/^(voice|tone|avoid|rule):\s*/i, '');
                      return (
                        <React.Fragment key={block + idx}>
                          <SlideItem
                            text={display}
                            onDelete={() => void removeTasteBullet(block)}
                            disabled={busy}
                          />
                          {idx < tabBullets.length - 1 && <View style={item.line} />}
                        </React.Fragment>
                      );
                    })
                  )}
                </ScrollView>
              </Animated.View>

              {/* QUICK SUGGESTIONS (Smooth fade matching tab) */}
              <Animated.View style={[drawer.chips, { opacity: fadeAnim }]}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={drawer.row}
                >
                  {tabSuggestions
                    .filter((s) => !tasteBullets.some((b) => b.includes(s)))
                    .map((sugg) => (
                      <TouchableOpacity
                        key={sugg}
                        onPress={() => void handleAddTaste(sugg)}
                        disabled={busy}
                        style={drawer.chip}
                        activeOpacity={0.7}
                      >
                        <Text style={drawer.tag}>+ {sugg}</Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </Animated.View>

              {/* FLOATING PILL INPUT BAR */}
              <View
                style={[
                  drawer.footer,
                  { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 24 },
                ]}
              >
                <View style={drawer.pill}>
                  <TextInput
                    style={drawer.field}
                    placeholder={placeholder}
                    placeholderTextColor="#94a3b8"
                    value={newBullet}
                    onChangeText={setNewBullet}
                    onSubmitEditing={() => void handleAddTaste()}
                    returnKeyType="send"
                    editable={!busy}
                  />
                  <View style={drawer.icons}>
                    <TouchableOpacity
                      style={drawer.btn}
                      onPress={() => {
                        if (newBullet.trim()) {
                          void handleAddTaste();
                        } else {
                          handleVoiceOrPromptAdd();
                        }
                      }}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel="Add fact"
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                      <Ionicons name="add" size={24} color="#64748b" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={drawer.btn}
                      onPress={handleVoiceOrPromptAdd}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel="Voice input"
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                    >
                      <Ionicons name="mic-outline" size={21} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
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
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  navBackBtn: {
    padding: 2,
  },
  navTitleWrap: {
    flex: 1,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  navSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 1,
  },
  navActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 68,
  },
  navActionBtnDraft: {
    backgroundColor: '#2563eb',
  },
  navActionBtnLive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  navActionBtnBusy: {
    backgroundColor: '#2563eb',
    opacity: 0.9,
  },
  navActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navActionTextDraft: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  navActionTextLive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  navActionTextBusy: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
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

const item = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  under: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ef4444',
  },
  action: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  label: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  front: {
    backgroundColor: '#ffffff',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: '#ffffff',
  },
  dot: {
    fontSize: 16,
    lineHeight: 22,
    color: '#94a3b8',
  },
  text: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#0f172a',
    fontWeight: '400',
  },
  line: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#f1f5f9',
    marginLeft: 16,
    marginRight: 16,
  },
});

const drawer = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboard: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  menu: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#edf2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    flex: 1,
    maxWidth: 240,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#edf2f7',
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginHorizontal: 8,
  },
  indicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    backgroundColor: '#18181b',
    borderRadius: 19,
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  active: {
    color: '#ffffff',
    fontWeight: '600',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#edf2f7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingVertical: 8,
  },
  empty: {
    paddingHorizontal: 20,
    paddingTop: 48,
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
  },
  sub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  chips: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  row: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tag: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  pill: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#edf2f7',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 12,
  },
  field: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    height: '100%',
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btn: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
