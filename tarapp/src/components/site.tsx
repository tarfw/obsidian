import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  FlatList,
  Modal,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';

/**
 * Site Studio — drives the standalone siteagent worker (siteagent3.md).
 *
 *   styles     GET  /site/styles          (single source of truth — no local copy)
 *   generate   POST /site/generate        { site, description, style_hint?, fresh? }
 *   status     GET  /site/status?site=    (polled while a job runs)
 *   edit       POST /site/edit            { site, section_id, instruction }
 *   publish    POST /site/publish         { site }
 *
 * Pages open in the external browser (no in-app webview):
 *   draft  ${SITE_API}/site/preview/<site>/
 *   live   ${SITE_API}/site/page/<site>/
 */

const SITE_API = process.env.EXPO_PUBLIC_SITEAGENT_URL || 'https://siteagent.tar-54d.workers.dev';

/** Style catalog entry as served by GET /site/styles. */
export interface SiteStyleItem {
  id: string;
  name: string;
  theme: 'light' | 'dark' | 'mixed';
  tags: string;
  vibe: string;
}

interface SectionProgress {
  id: string;
  kind: string;
  state: 'pending' | 'done' | 'failed';
}

type Phase = 'idle' | 'generating' | 'publishing' | 'published' | 'error';

export interface SiteScreenProps {
  visible: boolean;
  onClose: () => void;
  workspaceName: string;
  subdomain: string;
  scope: string;
  products?: any[];
}

export function SiteScreen({
  visible,
  onClose,
  workspaceName,
  subdomain,
  scope,
  products = [],
}: SiteScreenProps) {
  const insets = useSafeAreaInsets();
  const site = slugify(subdomain || workspaceName || 'store');

  const [styles, setStyles] = useState<SiteStyleItem[]>([]);
  const [stylesLoaded, setStylesLoaded] = useState(false);
  const [activeStyleId, setActiveStyleId] = useState<string>('');
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogTag, setCatalogTag] = useState('All');

  const [phase, setPhase] = useState<Phase>('idle');
  const [progressText, setProgressText] = useState('');
  const [sections, setSections] = useState<SectionProgress[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [editSection, setEditSection] = useState<SectionProgress | null>(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [liveReady, setLiveReady] = useState(false);
  const [previewStamp, setPreviewStamp] = useState(Date.now());

  const lastDescriptionRef = useRef<string>('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const statusUrl = `${SITE_API}/site/status?site=${encodeURIComponent(site)}`;
  const previewUrl = `${SITE_API}/site/preview/${site}/?t=${previewStamp}`;
  const liveUrl = `${SITE_API}/site/page/${site}/`;

  const activeStyle = useMemo(
    () => styles.find(s => s.id === activeStyleId) || null,
    [styles, activeStyleId]
  );

  // catalog filtering: categories derived from the worker's tags
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of styles) for (const t of s.tags.split(',').map(x => x.trim()).filter(Boolean)) {
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    return ['All', ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(e => titleize(e[0]))];
  }, [styles]);

  const filteredStyles = useMemo(() => {
    const q = catalogSearch.toLowerCase().trim();
    return styles.filter(s => {
      const tagList = s.tags.split(',').map(t => titleize(t.trim()));
      const matchCat = catalogTag === 'All' || tagList.includes(catalogTag);
      const matchQuery = !q || s.name.toLowerCase().includes(q) || s.vibe.toLowerCase().includes(q) || s.tags.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [styles, catalogTag, catalogSearch]);

  // ── catalog: fetched from the worker, never duplicated here ──────
  useEffect(() => {
    if (!visible || stylesLoaded) return;
    let cancelled = false;
    fetch(`${SITE_API}/site/styles`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`styles ${r.status}`))))
      .then((data: any) => {
        if (cancelled) return;
        const list: SiteStyleItem[] = (data?.styles || []).map((s: any) => ({
          id: String(s.id),
          name: String(s.name || s.id),
          theme: s.theme === 'dark' || s.theme === 'mixed' ? s.theme : 'light',
          tags: String(s.tags || ''),
          vibe: String(s.vibe || ''),
        }));
        setStyles(list);
        setStylesLoaded(true);
      })
      .catch(() => { if (!cancelled) setStylesLoaded(false); });
    return () => { cancelled = true; };
  }, [visible, stylesLoaded]);

  // ── hydrate the last job on open; attach if one is in flight ─────
  useEffect(() => {
    if (!visible || !site) return;
    let cancelled = false;
    fetch(statusUrl)
      .then(r => (r.ok ? r.json() : null))
      .then((st: any) => {
        if (cancelled || !st || st.error) return;
        if (st.style) setActiveStyleId(String(st.style).toLowerCase());
        if (st.description) lastDescriptionRef.current = st.description;
        if (Array.isArray(st.section_kinds) && st.section_kinds.length) setSections(st.section_kinds);
        if (Array.isArray(st.pages) && st.pages.length) setLiveReady(true);
        const running = ['queued', 'matching', 'briefing', 'synthesizing', 'assembling'].includes(st.status);
        if (running) {
          setPhase('generating');
          setProgressText(progressLine(st));
          startPolling();
        }
      })
      .catch(() => null);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, site]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const defaultDescription = useMemo(() => {
    const items = (products || []).slice(0, 8).map((p: any) => p.title || p.name).filter(Boolean);
    return `${workspaceName || 'storefront'} — a business workspace${items.length ? ` offering: ${items.join(', ')}` : ''}.`;
  }, [products, workspaceName]);

  // ── publish: promote the finished draft (no generation) ──────────
  const publishNow = useCallback(async () => {
    setPhase('publishing');
    setProgressText('Publishing…');
    try {
      const res = await fetch(`${SITE_API}/site/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        setLiveReady(true);
        setPreviewStamp(Date.now());
        setProgressText('');
        setPhase('published');
        setTimeout(() => setPhase('idle'), 2500);
      } else {
        setProgressText(body?.error || 'Publish failed — tap Publish to retry');
        setPhase('error');
      }
    } catch (e: any) {
      setProgressText(e?.message || 'Network error');
      setPhase('error');
    }
  }, [site]);

  // ── poll the running job; auto-publish the moment it lands ───────
  const startPolling = useCallback(() => {
    stopPolling();
    const deadline = Date.now() + 10 * 60 * 1000;
    pollRef.current = setInterval(async () => {
      try {
        if (Date.now() > deadline) {
          stopPolling();
          setProgressText('Still working — the worker resumes automatically; tap Publish to re-attach');
          setPhase('error');
          return;
        }
        const r = await fetch(statusUrl);
        if (!r.ok) return;
        const st = await r.json();
        if (Array.isArray(st.section_kinds)) setSections(st.section_kinds);
        if (st.status === 'failed') {
          stopPolling();
          setProgressText(st.error || 'Generation failed — tap Publish to resume from the checkpoint');
          setPhase('error');
          return;
        }
        if (st.status === 'done') {
          stopPolling();
          await publishNow();
          return;
        }
        setProgressText(progressLine(st));
      } catch {}
    }, 3000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusUrl, publishNow]);

  // ── kick off (or resume) a generation job, then poll ─────────────
  const startGeneration = async (description: string, styleId: string | undefined, fresh: boolean) => {
    setPhase('generating');
    setProgressText(fresh ? 'Planning…' : 'Resuming…');
    try {
      const res = await fetch(`${SITE_API}/site/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site, description, style_hint: styleId, fresh }),
      });
      const started = await res.json().catch(() => null);
      if (!res.ok) {
        setProgressText(started?.error || 'Failed to start generation');
        setPhase('error');
        return;
      }
      if (started?.status === 'done' || started?.url) {
        setLiveReady(true);
        setPreviewStamp(Date.now());
        setProgressText('');
        setPhase('published');
        setTimeout(() => setPhase('idle'), 2500);
        return;
      }
      startPolling();
    } catch (e: any) {
      setProgressText(e?.message || 'Network error');
      setPhase('error');
    }
  };

  // Publish never regenerates: it promotes a finished draft, attaches to
  // a running job, or resumes a failed one. Fresh generation only on
  // explicit intent — an AI prompt or a different style.
  const handlePublish = async (promptText?: string, styleId?: string, forceGenerate = false) => {
    stopPolling();
    if (promptText || forceGenerate) {
      const description = promptText
        ? (lastDescriptionRef.current
            ? `${lastDescriptionRef.current}\n\nChange request: ${promptText}`
            : promptText)
        : (lastDescriptionRef.current || defaultDescription);
      lastDescriptionRef.current = description;
      await startGeneration(description, styleId || activeStyleId || undefined, true);
      return;
    }

    let job: any = null;
    try {
      const st = await fetch(statusUrl);
      if (st.ok) job = await st.json().catch(() => null);
    } catch {}

    if (job?.status === 'done') { await publishNow(); return; }

    if (job && job.status !== 'failed' && job.status !== 'error') {
      setPhase('generating');
      setProgressText(progressLine(job));
      startPolling();
      return;
    }

    if (job?.status === 'failed') {
      setProgressText('Resuming from checkpoint…');
      await startGeneration(String(job.description || defaultDescription), activeStyleId || undefined, false);
      return;
    }

    const description = lastDescriptionRef.current || defaultDescription;
    lastDescriptionRef.current = description;
    await startGeneration(description, activeStyleId || undefined, false);
  };

  const handleSelectStyle = (item: SiteStyleItem) => {
    const unchanged = item.id === activeStyleId;
    setActiveStyleId(item.id);
    setShowCatalogModal(false);
    if (!unchanged) handlePublish(undefined, item.id, true);
  };

  // ── per-section edit (single-section regeneration) ───────────────
  const submitSectionEdit = async () => {
    if (!editSection || !editInstruction.trim()) return;
    const target = editSection;
    const instruction = editInstruction.trim();
    setEditSection(null);
    setEditInstruction('');
    setPhase('generating');
    setProgressText(`Rebuilding ${target.kind}…`);
    try {
      const res = await fetch(`${SITE_API}/site/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site, section_id: target.id, instruction }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setProgressText(body?.error || 'Edit failed');
        setPhase('error');
        return;
      }
      setPreviewStamp(Date.now());
      setPhase('published');
      setProgressText(body?.used_fallback ? `${target.kind} rebuilt (simplified)` : `${target.kind} rebuilt`);
      setTimeout(() => setPhase('idle'), 2500);
      const st = await fetch(statusUrl).then(r => r.ok ? r.json() : null).catch(() => null);
      if (st?.section_kinds) setSections(st.section_kinds);
    } catch (e: any) {
      setProgressText(e?.message || 'Network error');
      setPhase('error');
    }
  };

  if (!visible) return null;

  const busy = phase === 'generating' || phase === 'publishing';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles_.container, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 12) }]}>

        {/* Header */}
        <View style={styles_.header}>
          <View style={styles_.headerTitleWrap}>
            <Text style={styles_.headerTitle} numberOfLines={1}>{site}</Text>
            <Text style={styles_.headerSub} numberOfLines={1}>siteagent studio</Text>
            {busy && (
              <View style={styles_.headerProgressRow}>
                <ActivityIndicator size="small" color="#0f172a" />
                <Text style={styles_.headerProgressText} numberOfLines={1}>{progressText || 'Working…'}</Text>
              </View>
            )}
            {phase === 'error' && !!progressText && (
              <Text style={[styles_.headerProgressText, { color: '#dc2626' }]} numberOfLines={2}>{progressText}</Text>
            )}
          </View>

          <View style={styles_.headerRightActions}>
            <TouchableOpacity onPress={() => handlePublish()} disabled={busy} style={styles_.publishTextBtn} activeOpacity={0.7}>
              <Text style={[styles_.publishTextBtnLabel, phase === 'published' && { color: '#16a34a' }]}>
                {phase === 'generating' ? 'Generating…' : phase === 'publishing' ? 'Publishing…' : phase === 'published' ? 'Published' : 'Publish'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Linking.openURL(previewUrl)}
              style={styles_.arrowOnlyBtn}
              activeOpacity={0.7}
              accessibilityLabel="Open preview in browser"
            >
              <Text style={styles_.arrowOnlyGlyph}>↗</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles_.mainScroll} contentContainerStyle={styles_.mainScrollContent}>

          {/* Design System */}
          <View style={styles_.sectionBlock}>
            <Text style={styles_.sectionLabel}>Design System</Text>
            <TouchableOpacity onPress={() => setShowCatalogModal(true)} style={styles_.styleCard} activeOpacity={0.75}>
              <View style={styles_.styleCardLeft}>
                <View style={[styles_.styleColorDot, { backgroundColor: themeDot(activeStyle?.theme) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles_.styleCardName}>{activeStyle ? activeStyle.name : 'Auto (matched to your business)'}</Text>
                  <Text style={styles_.styleCardVibe} numberOfLines={1}>
                    {activeStyle ? activeStyle.vibe : 'siteagent picks the best of 25 references'}
                  </Text>
                </View>
              </View>
              <View style={styles_.changeStylePill}>
                <Text style={styles_.changeStylePillText}>Change</Text>
                <Ionicons name="chevron-forward" size={13} color="#64748b" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Site Structure — live from the job; tap a section to edit it */}
          <View style={styles_.sectionBlock}>
            <View style={styles_.sectionLabelRow}>
              <Text style={styles_.sectionLabel}>Site Structure</Text>
              <Text style={styles_.sectionCountText}>
                {sections.length ? `${sections.length} Sections · tap to edit` : 'AI-planned'}
              </Text>
            </View>

            <View style={styles_.sectionsContainer}>
              {sections.length === 0 ? (
                <View style={styles_.sectionRow}>
                  <Text style={styles_.sectionIndex}>·</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles_.sectionRowTitle}>Tap Publish to generate</Text>
                    <Text style={styles_.sectionRowSub}>siteagent plans every section from your business</Text>
                  </View>
                </View>
              ) : (
                sections.map((sec, idx) => (
                  <TouchableOpacity
                    key={sec.id || idx}
                    onPress={() => { setEditSection(sec); setEditInstruction(''); }}
                    disabled={busy}
                    style={[styles_.sectionRow, idx === sections.length - 1 && { borderBottomWidth: 0 }]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles_.sectionIndex}>{idx + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles_.sectionRowTitle}>{titleize(sec.kind)}</Text>
                      <Text style={styles_.sectionRowSub}>{sec.id}</Text>
                    </View>
                    {sec.state === 'done' ? (
                      <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
                    ) : sec.state === 'failed' ? (
                      <Ionicons name="alert-circle" size={15} color="#f59e0b" />
                    ) : (
                      <ActivityIndicator size="small" color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>

          {/* Links */}
          <View style={styles_.linksRow}>
            <TouchableOpacity style={styles_.linkChip} onPress={() => Linking.openURL(previewUrl)} activeOpacity={0.7}>
              <Ionicons name="eye-outline" size={13} color="#475569" />
              <Text style={styles_.linkChipText}>Preview draft ↗</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles_.linkChip, liveReady && styles_.linkChipLive]}
              onPress={() => Linking.openURL(liveUrl)}
              activeOpacity={0.7}
            >
              <Ionicons name="globe-outline" size={13} color={liveReady ? '#16a34a' : '#94a3b8'} />
              <Text style={[styles_.linkChipText, liveReady && { color: '#16a34a' }]}>Live page ↗</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* AI prompt */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles_.bottomBarContainer}>
            <View style={styles_.bottomInputBox}>
              <TextInput
                style={styles_.bottomInput}
                value={aiPrompt}
                onChangeText={setAiPrompt}
                placeholder="Describe your business, ask for a redesign, or add sections…"
                placeholderTextColor="#94a3b8"
                returnKeyType="send"
                onSubmitEditing={() => {
                  if (aiPrompt.trim() && !busy) {
                    handlePublish(aiPrompt.trim());
                    setAiPrompt('');
                  }
                }}
              />
              <TouchableOpacity
                onPress={() => {
                  if (aiPrompt.trim() && !busy) {
                    handlePublish(aiPrompt.trim());
                    setAiPrompt('');
                  }
                }}
                style={[styles_.sendBtn, (!aiPrompt.trim() || busy) && { opacity: 0.4 }]}
                disabled={!aiPrompt.trim() || busy}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-up" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Section edit modal */}
        <Modal
          visible={!!editSection}
          transparent
          animationType="fade"
          onRequestClose={() => setEditSection(null)}
        >
          <View style={styles_.editOverlay}>
            <View style={styles_.editCard}>
              <Text style={styles_.editTitle}>Edit “{editSection ? titleize(editSection.kind) : ''}”</Text>
              <Text style={styles_.editSub}>
                siteagent rebuilds just this section and re-verifies it — seconds, not minutes.
              </Text>
              <TextInput
                style={styles_.editInput}
                value={editInstruction}
                onChangeText={setEditInstruction}
                placeholder={
                  editSection?.state === 'failed'
                    ? 'e.g. Rebuild simply: cards with prices, all colors via tokens'
                    : 'e.g. Make prices bigger, add a third column, change the copy…'
                }
                placeholderTextColor="#94a3b8"
                multiline
                autoFocus
              />
              <View style={styles_.editActions}>
                <TouchableOpacity style={styles_.editCancelBtn} onPress={() => setEditSection(null)} activeOpacity={0.7}>
                  <Text style={styles_.editCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles_.editApplyBtn, !editInstruction.trim() && { opacity: 0.4 }]}
                  disabled={!editInstruction.trim()}
                  onPress={submitSectionEdit}
                  activeOpacity={0.7}
                >
                  <Text style={styles_.editApplyText}>Rebuild section</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Design-system catalog — straight from the worker */}
        <Modal
          visible={showCatalogModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCatalogModal(false)}
        >
          <View style={[styles_.modalContainer, { paddingTop: Math.max(insets.top, 16) }]}>
            <View style={styles_.modalHeader}>
              <View>
                <Text style={styles_.modalTitle}>Design Systems</Text>
                <Text style={styles_.modalSubtitle}>
                  {stylesLoaded ? `${styles.length} styles · live from siteagent` : 'Loading catalog…'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowCatalogModal(false)} style={styles_.modalCloseBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {!stylesLoaded ? (
              <View style={styles_.catalogLoading}>
                <ActivityIndicator size="small" color="#94a3b8" />
                <Text style={styles_.catalogLoadingText}>Fetching styles from the worker…</Text>
              </View>
            ) : (
              <>
                <View style={styles_.searchContainer}>
                  <Ionicons name="search" size={16} color="#94a3b8" />
                  <TextInput
                    style={styles_.searchInput}
                    value={catalogSearch}
                    onChangeText={setCatalogSearch}
                    placeholder="Search styles, vibes, industries…"
                    placeholderTextColor="#94a3b8"
                    clearButtonMode="while-editing"
                  />
                </View>

                <View style={styles_.categoryPillsWrapper}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles_.categoryPillsScroll}>
                    {allTags.map((tag) => {
                      const isSelected = catalogTag === tag;
                      return (
                        <TouchableOpacity
                          key={tag}
                          onPress={() => setCatalogTag(tag)}
                          style={[styles_.categoryPill, isSelected && styles_.categoryPillActive]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles_.categoryPillText, isSelected && styles_.categoryPillTextActive]}>{tag}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <FlatList
                  data={filteredStyles}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles_.directoryListContent}
                  renderItem={({ item }) => {
                    const isSelected = item.id === activeStyleId;
                    return (
                      <TouchableOpacity
                        onPress={() => handleSelectStyle(item)}
                        activeOpacity={0.7}
                        style={[styles_.directoryItem, isSelected && styles_.directoryItemSelected]}
                      >
                        <View style={[styles_.directoryItemColorDot, { backgroundColor: themeDot(item.theme) }]} />
                        <View style={styles_.directoryItemBody}>
                          <View style={styles_.directoryItemTopRow}>
                            <Text style={[styles_.directoryItemName, isSelected && { fontWeight: '700', color: '#0f172a' }]}>
                              {item.name}
                            </Text>
                            <Text style={styles_.directoryItemTheme}>{item.theme}</Text>
                          </View>
                          <Text style={styles_.directoryItemVibe} numberOfLines={2}>{item.vibe}</Text>
                          {!!item.tags && <Text style={styles_.directoryItemFonts} numberOfLines={1}>{item.tags}</Text>}
                        </View>
                        {isSelected && <Ionicons name="checkmark-circle" size={18} color="#0f172a" style={{ marginLeft: 6 }} />}
                      </TouchableOpacity>
                    );
                  }}
                />
              </>
            )}
          </View>
        </Modal>

      </View>
    </Modal>
  );
}

/** Mirror the worker's siteSlug so KV keys line up exactly. */
function slugify(s: string): string {
  return (s || 'store')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63) || 'store';
}

function titleize(kind: string): string {
  return (kind || '').split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function progressLine(st: any): string {
  const done = st?.sections_done || 0;
  const total = st?.sections_total || 0;
  if (st?.status === 'briefing') return 'Planning the site…';
  if (st?.status === 'matching') return 'Matching a design reference…';
  if (st?.status === 'assembling') return 'Assembling pages…';
  return st?.style ? `${st.style} — ${done}/${total} sections` : `${done}/${total} sections`;
}

function themeDot(theme?: string): string {
  if (theme === 'dark') return '#0f172a';
  if (theme === 'mixed') return '#0891b2';
  return '#0f172a';
}

export default SiteScreen;

const styles_ = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleWrap: { flex: 1, marginRight: 12 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  headerSub: { fontSize: 10, color: '#94a3b8', marginTop: 1, letterSpacing: 0.03 },
  headerProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  headerProgressText: { fontSize: 11, color: '#64748b', marginTop: 2 },
  headerRightActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  publishTextBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  publishTextBtnLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  arrowOnlyBtn: { paddingVertical: 2, paddingHorizontal: 4 },
  arrowOnlyGlyph: { fontSize: 20, fontWeight: '900', color: '#0f172a', lineHeight: 22 },
  mainScroll: { flex: 1, backgroundColor: '#ffffff' },
  mainScrollContent: { padding: 18, gap: 22 },
  sectionBlock: { gap: 8 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: 0.05,
  },
  sectionCountText: { fontSize: 11, color: '#94a3b8' },
  styleCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 10, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  styleCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  styleColorDot: { width: 12, height: 12, borderRadius: 6 },
  styleCardName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  styleCardVibe: { fontSize: 12, color: '#64748b', marginTop: 1 },
  changeStylePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
  },
  changeStylePillText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  sectionsContainer: {
    backgroundColor: '#ffffff', borderRadius: 10,
    borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden',
  },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12,
  },
  sectionIndex: { fontSize: 12, fontWeight: '700', color: '#94a3b8', width: 16 },
  sectionRowTitle: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  sectionRowSub: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  linksRow: { flexDirection: 'row', gap: 10 },
  linkChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
  },
  linkChipLive: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  linkChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  bottomBarContainer: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6,
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  bottomInputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 24,
    borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 14, paddingVertical: 4,
  },
  bottomInput: { flex: 1, fontSize: 13, color: '#0f172a', paddingVertical: 8 },
  sendBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#0f172a',
    alignItems: 'center', justifyContent: 'center', marginLeft: 6,
  },
  editOverlay: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  editCard: {
    width: '100%', backgroundColor: '#ffffff', borderRadius: 14, padding: 18, gap: 10,
  },
  editTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  editSub: { fontSize: 12, color: '#64748b' },
  editInput: {
    minHeight: 84, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    padding: 12, fontSize: 13, color: '#0f172a', backgroundColor: '#f8fafc',
    textAlignVertical: 'top',
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 2 },
  editCancelBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  editCancelText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  editApplyBtn: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  editApplyText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  modalContainer: { flex: 1, backgroundColor: '#ffffff' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  modalSubtitle: { fontSize: 12, color: '#64748b', marginTop: 1 },
  modalCloseBtn: { padding: 6, borderRadius: 8, backgroundColor: '#f1f5f9' },
  catalogLoading: { alignItems: 'center', gap: 8, padding: 32 },
  catalogLoadingText: { fontSize: 12, color: '#94a3b8' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a', padding: 0 },
  categoryPillsWrapper: { paddingVertical: 4, marginBottom: 8 },
  categoryPillsScroll: { paddingHorizontal: 16, gap: 6 },
  categoryPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
  },
  categoryPillActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  categoryPillText: { fontSize: 12, fontWeight: '500', color: '#64748b' },
  categoryPillTextActive: { color: '#ffffff', fontWeight: '600' },
  directoryListContent: { padding: 16, gap: 10 },
  directoryItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 10, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  directoryItemSelected: { borderWidth: 1.5, backgroundColor: '#f8fafc' },
  directoryItemColorDot: { width: 14, height: 14, borderRadius: 7 },
  directoryItemBody: { flex: 1 },
  directoryItemTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 2,
  },
  directoryItemName: { fontSize: 14, fontWeight: '600', color: '#334155' },
  directoryItemTheme: { fontSize: 10, color: '#94a3b8', textTransform: 'capitalize' },
  directoryItemVibe: { fontSize: 12, color: '#64748b', marginBottom: 2 },
  directoryItemFonts: {
    fontSize: 10, color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
