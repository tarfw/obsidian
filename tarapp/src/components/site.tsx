import Ionicons from '@expo/vector-icons/Ionicons';
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
import { harness } from '@/lib/harness';
import type { AskOutcome, SiteSnapshot } from '@/lib/site-schema';

export interface SiteScreenProps {
  visible: boolean;
  onClose: () => void;
  workspaceName: string;
  subdomain: string;
  scope: string;
  workspaceDescription?: string;
}

const PROMPT_SUGGESTIONS = [
  'Two columns with airy spacing',
  'Make hero background dark with light text',
  'Add more breathing room between sections',
  'Set accent color to royal blue',
  'Change headline and subtitle',
  'Make cards raised with soft borders',
];

const siteSnapshotCache = new Map<string, SiteSnapshot>();
const siteStorageKey = (slug: string) => `tar_site_snap_${slug}`;

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

  // Navigation
  const [activePageId, setActivePageId] = useState<string>(
    initialCached?.site?.data?.pages?.[0]?.id || '',
  );

  // Jev Prompt Editing State
  const [command, setCommand] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('all');

  const site = snapshot?.site?.data ?? null;
  const siteId = snapshot?.site?.id ?? '';
  const isLive = snapshot?.publicationState === 'active' || snapshot?.site?.state === 'live';
  const publicUrl = snapshot?.publicUrl ?? null;

  // Active page
  const activePage = useMemo(() => {
    if (!site?.pages?.length) return null;
    return site.pages.find((p) => p.id === activePageId) || site.pages[0];
  }, [site, activePageId]);

  // Load site snapshot (with auto-initialization from server)
  const loadSite = useCallback(async () => {
    if (!slug) return;
    try {
      const snap = await harness.site.get(slug);
      if (mountedRef.current && snap?.site?.data) {
        siteSnapshotCache.set(slug, snap);
        void SecureStore.setItemAsync(siteStorageKey(slug), JSON.stringify(snap)).catch(() => undefined);
        setSnapshot(snap);
        if (snap.html) setHtml(snap.html);
        if (snap.site.data.pages?.[0]?.id) {
          setActivePageId((curr) => curr || snap.site.data.pages[0].id);
        }
      }
    } catch {
      // Retain existing snapshot if in memory
    } finally {
      if (mountedRef.current) {
        setInitialLoading(false);
        setBusy(false);
        setBusyStep('');
      }
    }
  }, [slug]);

  useEffect(() => {
    mountedRef.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (visible && slug) {
      if (!initialCached) {
        void SecureStore.getItemAsync(siteStorageKey(slug))
          .then((raw) => {
            if (raw && mountedRef.current) {
              try {
                const stored = JSON.parse(raw) as SiteSnapshot;
                if (stored?.site?.data) {
                  siteSnapshotCache.set(slug, stored);
                  setSnapshot(stored);
                  if (stored.html) setHtml(stored.html);
                  if (stored.site.data.pages?.[0]?.id) {
                    setActivePageId((curr) => curr || stored.site.data.pages[0].id);
                  }
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
  }, [visible, slug, initialCached, loadSite]);

  // 1. Edit Site purely using Jev Decision System
  const applyJevEdit = useCallback(async () => {
    if (!slug || !siteId || !command.trim() || busy || !site) return;
    const instruction = command.trim();
    setBusy(true);
    setBusyStep('Resolving edit with Jev...');
    try {
      const targetParam = selectedSectionId !== 'all' ? selectedSectionId : undefined;
      const proposal: AskOutcome = await harness.site.ask(slug, siteId, instruction, targetParam);

      if (!proposal.operations?.length) {
        Alert.alert('No change needed', 'Jev could not find any necessary edits for this prompt.');
        return;
      }

      setBusyStep(`Applying ${proposal.operations.length} change(s)...`);
      const edited = await harness.site.edit(
        slug,
        siteId,
        proposal.base,
        proposal.operations,
        proposal.summary || instruction,
      );

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
        setCommand('');
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
  }, [slug, siteId, command, busy, site, selectedSectionId, loadSite]);

  // 2. Undo last change
  const undoLastEdit = useCallback(async () => {
    if (!slug || !siteId || busy) return;
    setBusy(true);
    setBusyStep('Reverting revision...');
    try {
      const undone = await harness.site.undo(slug, siteId);
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

  // 3. One-Tap Publish Live
  const publishSite = useCallback(async () => {
    if (!slug || !siteId || busy) return;
    setBusy(true);
    setBusyStep('Publishing live release...');
    try {
      const compiled = await harness.site.compile(slug, siteId);
      const published = await harness.site.publish(slug, siteId, compiled.releaseId, compiled.hash);
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
        Alert.alert('Site Published', `Live at ${livePublicUrl}`);
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
  }, [slug, siteId, busy, loadSite]);

  // Clean HTML renderer for preview
  const renderedHtmlDoc = useMemo(() => {
    if (html.trim()) return html;
    if (!site) return '';

    const primaryColor = site.design?.color?.accent || '#2563eb';
    const bg = site.design?.color?.canvas || '#ffffff';
    const textInk = site.design?.color?.ink || '#18181b';
    const surface = site.design?.color?.surface || '#f4f4f5';
    const border = site.design?.color?.border || '#e4e4e7';

    const sectionsHtml = (activePage?.sections || [])
      .map((sec) => {
        const cols = sec.layout?.columns || 1;
        const nodesHtml = (sec.nodes || [])
          .map((n) => {
            if (n.kind === 'heading') return `<h${n.props?.level || 2} style="margin:0 0 12px 0;">${n.props?.text || ''}</h${n.props?.level || 2}>`;
            if (n.kind === 'text') return `<p style="margin:0 0 16px 0; line-height:1.6;">${n.props?.text || ''}</p>`;
            if (n.kind === 'button') {
              return `<a href="${n.props?.href || '#'}" style="display:inline-block; padding:10px 20px; background:${primaryColor}; color:#fff; border-radius:6px; text-decoration:none; font-weight:600; margin:4px 0;">${n.props?.text || 'Learn more'}</a>`;
            }
            if (n.kind === 'card') {
              return `<div style="background:${surface}; border:1px solid ${border}; border-radius:8px; padding:20px; margin:8px 0;"><h3 style="margin:0 0 8px 0;">${n.props?.title || ''}</h3><p style="margin:0 0 12px 0; color:#52525b;">${n.props?.body || ''}</p></div>`;
            }
            return '';
          })
          .join('\n');

        return `
        <section id="${sec.id}" style="padding:32px 20px; border-bottom:1px solid ${border};">
          <div style="display:${cols > 1 ? 'grid' : 'block'}; grid-template-columns:repeat(${cols}, 1fr); gap:16px;">
            ${nodesHtml}
          </div>
        </section>
      `;
      })
      .join('\n');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>${site.brief?.goal || workspaceName}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:${bg}; color:${textInk}; }
          header { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid ${border}; }
          header h1 { margin:0; font-size:17px; font-weight:700; }
          nav a { margin-left:14px; color:#52525b; text-decoration:none; font-size:13px; font-weight:500; }
          nav a.active { color:${primaryColor}; font-weight:700; }
        </style>
      </head>
      <body>
        <header>
          <h1>${workspaceName}</h1>
          <nav>
            ${(site.pages || []).map((p) => `<a href="#" class="${p.id === activePageId ? 'active' : ''}">${p.title || p.path}</a>`).join('')}
          </nav>
        </header>
        ${sectionsHtml}
      </body>
      </html>
    `;
  }, [html, site, activePage, activePageId, workspaceName]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { paddingTop: Math.max(insets.top, 12) }]}>
        {/* Clean, Uncluttered Modern Top Bar */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title} numberOfLines={1}>{workspaceName}</Text>
            <TouchableOpacity
              accessibilityRole="link"
              onPress={() => {
                if (publicUrl) void Linking.openURL(publicUrl);
                else void Linking.openURL(`https://${slug}.workers.dev`);
              }}
              style={styles.urlCapsule}
            >
              <View style={[styles.dot, isLive ? styles.dotLive : styles.dotDraft]} />
              <Text style={styles.urlText} numberOfLines={1}>
                {slug}.workers.dev
              </Text>
              <Ionicons name="open-outline" size={10} color={isLive ? '#0284c7' : '#94a3b8'} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerRight}>
            {site && (site.revision > 1 || (snapshot?.history?.length ?? 0) > 0) ? (
              <TouchableOpacity
                accessibilityLabel="Undo last change"
                onPress={() => void undoLastEdit()}
                disabled={busy}
                style={styles.iconBtn}
              >
                <Ionicons name="arrow-undo-outline" size={16} color="#0f172a" />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              accessibilityRole="button"
              disabled={busy || !site}
              onPress={() => void publishSite()}
              style={[styles.publishBtn, isLive ? styles.republishBtn : null, (busy || !site) && styles.disabled]}
            >
              <Ionicons name="cloud-upload-outline" size={13} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.publishBtnText}>{isLive ? 'Republish' : 'Publish'}</Text>
            </TouchableOpacity>

            <TouchableOpacity accessibilityLabel="Close Studio" onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Unified Mobile Site Studio View */}
        {initialLoading && !site ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0f172a" />
            <Text style={styles.loadingText}>Opening Site Studio...</Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.studioLayout}
          >
            {/* Minimal Underline Page Tabs */}
            {site?.pages && site.pages.length > 1 ? (
              <View style={styles.pageBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pageBarScroll}>
                  {site.pages.map((p) => {
                    const isActive = activePage?.id === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => setActivePageId(p.id)}
                        style={styles.pageTab}
                      >
                        <Text style={[styles.pageTabText, isActive && styles.pageTabTextActive]}>
                          {p.title || p.path}
                        </Text>
                        {isActive ? <View style={styles.activeIndicator} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* Central Full-Bleed Live Preview */}
            <View style={styles.canvasArea}>
              {Platform.OS === 'web' ? (
                React.createElement('iframe', {
                  srcDoc: renderedHtmlDoc,
                  title: 'Live Site',
                  style: {
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    backgroundColor: '#ffffff',
                  },
                })
              ) : (
                <ScrollView style={styles.nativeFallbackScroll}>
                  {(activePage?.sections || []).map((sec) => (
                    <View key={sec.id} style={styles.fallbackSection}>
                      <Text style={styles.fallbackBadge}>{sec.purpose.toUpperCase()}</Text>
                      {(sec.nodes || []).map((n) => (
                        <Text key={n.id} style={styles.fallbackNodeText}>
                          {String(n.props?.text || n.props?.title || n.kind)}
                        </Text>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Clean Bottom Edit Dock with Safe Area */}
            <View style={[styles.editDock, { paddingBottom: Math.max(insets.bottom + 8, 22) }]}>
              {/* Target Section Selector Pills */}
              <View style={styles.sectionPillsRow}>
                <Text style={styles.dockEyebrow}>TARGET</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => setSelectedSectionId('all')}
                    style={[styles.targetPill, selectedSectionId === 'all' && styles.targetPillActive]}
                  >
                    <Text style={[styles.targetPillText, selectedSectionId === 'all' && styles.targetPillTextActive]}>
                      Whole Page
                    </Text>
                  </TouchableOpacity>
                  {(activePage?.sections || []).map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setSelectedSectionId(s.id)}
                      style={[styles.targetPill, selectedSectionId === s.id && styles.targetPillActive]}
                    >
                      <Text style={[styles.targetPillText, selectedSectionId === s.id && styles.targetPillTextActive]}>
                        {s.purpose}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Quick Suggestion Chips (Clean pills without AI icons) */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
                {PROMPT_SUGGESTIONS.map((sug) => (
                  <TouchableOpacity
                    key={sug}
                    onPress={() => setCommand(sug)}
                    style={styles.suggestionChip}
                  >
                    <Text style={styles.suggestionText}>{sug}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Jev Prompt Input & Apply Action */}
              <View style={styles.promptInputRow}>
                <TextInput
                  style={styles.promptInput}
                  value={command}
                  onChangeText={setCommand}
                  placeholder="Describe a change (e.g. 2 columns with airy spacing)..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  editable={!busy}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={busy || !command.trim()}
                  onPress={() => void applyJevEdit()}
                  style={[styles.applyBtn, (busy || !command.trim()) && styles.disabled]}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.applyBtnText}>Apply</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Transient Step Notice during active network processing only */}
              {busy && busyStep ? (
                <View style={styles.stepNotice}>
                  <ActivityIndicator size="small" color="#2563eb" style={{ marginRight: 6 }} />
                  <Text style={styles.stepNoticeText}>{busyStep}</Text>
                </View>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },

  // Header
  header: {
    height: 54,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flex: 1, marginRight: 10 },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a', letterSpacing: -0.2 },
  urlCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    gap: 5,
    marginTop: 3,
  },
  urlText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotLive: { backgroundColor: '#16a34a' },
  dotDraft: { backgroundColor: '#94a3b8' },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  republishBtn: {
    backgroundColor: '#334155',
  },
  publishBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },

  // Studio Layout
  studioLayout: { flex: 1, flexDirection: 'column' },
  pageBar: {
    height: 40,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  pageBarScroll: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageTab: {
    paddingHorizontal: 12,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pageTabText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  pageTabTextActive: { color: '#0f172a', fontWeight: '600' },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: '#0f172a',
    borderRadius: 1,
  },

  // Canvas
  canvasArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  nativeFallbackScroll: { flex: 1, padding: 16 },
  fallbackSection: { marginBottom: 14, padding: 12, backgroundColor: '#f8fafc', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  fallbackBadge: { fontSize: 10, fontWeight: '700', color: '#475569', marginBottom: 4 },
  fallbackNodeText: { fontSize: 13, color: '#0f172a', marginBottom: 4 },

  // Edit Dock
  editDock: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionPillsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  dockEyebrow: { fontSize: 9, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.5 },
  targetPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: '#f1f5f9',
  },
  targetPillActive: { backgroundColor: '#e2e8f0' },
  targetPillText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  targetPillTextActive: { color: '#0f172a', fontWeight: '600' },

  suggestionsScroll: { marginBottom: 8 },
  suggestionChip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
  },
  suggestionText: { fontSize: 11, color: '#475569' },

  promptInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  promptInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 70,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#0f172a',
  },
  applyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  applyBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },

  stepNotice: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  stepNoticeText: { fontSize: 11, color: '#2563eb', fontWeight: '500' },

  disabled: { opacity: 0.5 },
});
