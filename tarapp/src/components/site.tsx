import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { harness } from '@/lib/harness';
import type { AskOutcome, Node, Section, SiteSnapshot } from '@/lib/site-schema';

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

/** Contextual quick action prompts tailored to the focused visual target (siteai.md §7). */
function getContextPrompts(purpose?: string | null): string[] {
  if (!purpose || purpose === 'all') {
    return ['Darker Theme', 'Run Festive Sale', 'Photo Bigger', 'Add Location', 'Light Theme'];
  }
  switch (purpose) {
    case 'collection':
    case 'services':
    case 'recommendations':
      return ['Photo Bigger', '3 Columns', '4 Columns', 'List View', 'Dark Cards', 'Airy Spacing'];
    case 'introduction':
      return ['Run Festive Sale', 'Split Layout', 'Full Bleed', 'Dark Tone', 'Bold Title', 'Airy Spacing'];
    case 'promo':
      return ['Run Festive Sale', 'Accent Tone', 'Dark Tone', 'Airy Spacing'];
    case 'categories':
      return ['Pill Tabs', 'Underline Style', 'Center Align', 'Dark Surface'];
    case 'split':
      return ['Photo Bigger', '2 Columns', 'Airy Spacing', 'Dark Tone'];
    case 'contact':
    case 'hours':
      return ['Add Location', 'Dark Surface', 'Airy Spacing', 'Center Align'];
    case 'story':
    case 'features':
    case 'proof':
    case 'questions':
      return ['Dark Surface', 'Airy Spacing', 'Center Align', 'Compact Layout'];
    default:
      return ['Dark Tone', 'Airy Spacing', 'Compact Layout', 'Light Tone'];
  }
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
  const [initialLoading, setInitialLoading] = useState<boolean>(!initialCached);
  const [busy, setBusy] = useState(false);
  const [busyStep, setBusyStep] = useState<string>('');

  // Active page & Visual selection
  const [activePageId, setActivePageId] = useState<string>(
    initialCached?.site?.data?.pages?.[0]?.id || 'home',
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Modals & UI sheets
  const [pagePickerOpen, setPagePickerOpen] = useState(false);
  const [layersSheetOpen, setLayersSheetOpen] = useState(false);
  const [contentEditorOpen, setContentEditorOpen] = useState(false);
  const [contentEditorSection, setContentEditorSection] = useState<Section | null>(null);
  const [editableFields, setEditableFields] = useState<
    { id: string; label: string; kind: 'heading' | 'text' | 'button'; value: string }[]
  >([]);

  // Floating Director Pill input & Toast
  const [command, setCommand] = useState('');
  const [toast, setToast] = useState<ToastInfo | null>(null);

  const site = snapshot?.site?.data ?? null;
  const siteId = snapshot?.site?.id ?? '';
  const isLive = snapshot?.publicationState === 'active' || snapshot?.site?.state === 'live';
  const publicUrl = snapshot?.publicUrl ?? null;
  const revision = site?.revision ?? 1;

  // Active page for visual canvas
  const activePage = useMemo(() => {
    if (!site?.pages?.length) return null;
    return site.pages.find((p) => p.id === activePageId) || site.pages[0];
  }, [site, activePageId]);

  // Selected section object
  const selectedSection = useMemo(() => {
    if (!selectedSectionId || selectedSectionId === 'all' || !activePage?.sections) return null;
    return activePage.sections.find((s) => s.id === selectedSectionId) || null;
  }, [activePage, selectedSectionId]);

  // Dynamic context action chips
  const dynamicChips = useMemo(() => {
    return getContextPrompts(selectedSection?.purpose);
  }, [selectedSection]);

  // Open Section Content Editor Modal
  const openSectionContentEditor = useCallback((section: Section) => {
    const fields: { id: string; label: string; kind: 'heading' | 'text' | 'button'; value: string }[] = [];
    const walk = (nodes: Node[]) => {
      for (const node of nodes) {
        if (node.kind === 'heading') {
          fields.push({
            id: node.id,
            label: `Heading (H${node.props?.level || 2})`,
            kind: 'heading',
            value: String(node.props?.text || ''),
          });
        } else if (node.kind === 'text') {
          fields.push({
            id: node.id,
            label: 'Body Text',
            kind: 'text',
            value: String(node.props?.text || ''),
          });
        } else if (node.kind === 'button') {
          fields.push({
            id: node.id,
            label: 'Button Label',
            kind: 'button',
            value: String(node.props?.label || node.props?.text || ''),
          });
        }
        if (node.children) walk(node.children);
      }
    };
    walk(section.nodes || []);
    setContentEditorSection(section);
    setEditableFields(fields);
    setContentEditorOpen(true);
  }, []);

  // Save Section Content Changes
  const saveSectionContentEdits = useCallback(async () => {
    if (!slug || !siteId || !site || busy || !editableFields.length) {
      setContentEditorOpen(false);
      return;
    }
    setBusy(true);
    setBusyStep('Saving content updates...');
    try {
      const ops = editableFields.map((f) => {
        if (f.kind === 'button') {
          return { op: 'set_props' as const, target: f.id, value: { label: f.value } };
        }
        return { op: 'set_text' as const, target: f.id, value: f.value };
      });
      const edited = await harness.site.edit(
        slug,
        siteId,
        site.revision,
        ops,
        `Updated ${contentEditorSection?.purpose || 'section'} content`,
      );
      if (mountedRef.current) {
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
        setToast({ text: `Updated content (rev ${edited.revision})`, revision: edited.revision });
        setContentEditorOpen(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        Alert.alert('Save failed', err instanceof Error ? err.message : 'Could not save content changes.');
      }
    } finally {
      if (mountedRef.current) {
        setBusy(false);
        setBusyStep('');
      }
    }
  }, [slug, siteId, site, busy, editableFields, contentEditorSection]);

  // Auto-dismiss toast after 8 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [toast]);

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
        const firstPageId = siteData.pages?.[0]?.id;
        if (firstPageId) setActivePageId((curr) => curr || firstPageId);
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
                  const storedData = stored.site.data;
                  siteSnapshotCache.set(slug, stored);
                  setSnapshot(stored);
                  const firstPageId = storedData.pages?.[0]?.id;
                  if (firstPageId) setActivePageId((curr) => curr || firstPageId);
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

  // Apply visual director edit (Shopify Mobile Model)
  const applyJevEdit = useCallback(async (promptText?: string) => {
    const instruction = (promptText || command).trim();
    if (!slug || !siteId || !instruction || busy || !site) return;

    setBusy(true);
    setBusyStep('Applying changes...');
    const targetParam = selectedSectionId && selectedSectionId !== 'all' ? selectedSectionId : undefined;
    setCommand('');

    // Check if full rebuild is requested
    const isFullGeneration = targetParam === undefined
      && (/^(build|create|generate|rebuild|make|design|setup|adanola|lookbook)\b/i.test(instruction)
          || /editorial|lookbook|activewear|storefront|4-column|monochrome|adanola/i.test(instruction)
          || instruction.length > 80);

    if (isFullGeneration) {
      setBusyStep('Generating storefront...');
      try {
        const isLookbookBrief = /editorial|lookbook|activewear|adanola/i.test(instruction);
        const genRes = await harness.site.generate(slug, {
          prompt: instruction,
          title: workspaceName,
          ...(isLookbookBrief ? { category: 'retail', theme: 'editorial-lookbook' } : {}),
        });
        if (mountedRef.current) {
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
          setToast({
            text: `Storefront updated (rev ${genRes.version})`,
            revision: genRes.version,
          });
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

    try {
      const proposal: AskOutcome = await harness.site.ask(slug, siteId, instruction, targetParam);

      if (!proposal.operations?.length) {
        setToast({
          text: proposal.questions?.[0] || 'No changes needed for this request.',
        });
        return;
      }

      const summaryText = proposal.summary || instruction;
      const edited = await harness.site.edit(
        slug,
        siteId,
        proposal.base,
        proposal.operations,
        summaryText,
      );

      if (mountedRef.current) {
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

        setToast({
          text: `Updated to rev ${edited.revision}`,
          revision: edited.revision,
        });
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
  }, [slug, siteId, command, busy, site, selectedSectionId, workspaceName, loadSite]);

  // Undo last revision
  const undoLastEdit = useCallback(async () => {
    if (!slug || !siteId || busy) return;
    setBusy(true);
    setBusyStep('Restoring previous state...');
    try {
      const undone = await harness.site.undo(slug, siteId);
      if (mountedRef.current) {
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

        setToast({
          text: `Restored previous state (rev ${undone.revision})`,
          revision: undone.revision,
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

  // Reorder sections on the active page
  const moveSection = useCallback(async (sectionId: string, direction: 'up' | 'down') => {
    if (!slug || !siteId || !activePage || busy || !site) return;
    const currentIndex = activePage.sections.findIndex((s) => s.id === sectionId);
    if (currentIndex < 0) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= activePage.sections.length) return;

    setBusy(true);
    setBusyStep('Reordering sections...');
    try {
      const edited = await harness.site.edit(
        slug,
        siteId,
        site.revision,
        [{ op: 'move_section', target: sectionId, index: targetIndex }],
        `Moved section ${direction}`,
      );
      if (mountedRef.current) {
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
        setToast({ text: `Reordered section (rev ${edited.revision})`, revision: edited.revision });
      }
    } catch (err) {
      if (mountedRef.current) {
        Alert.alert('Reorder failed', err instanceof Error ? err.message : 'Could not reorder section.');
      }
    } finally {
      if (mountedRef.current) {
        setBusy(false);
        setBusyStep('');
      }
    }
  }, [slug, siteId, activePage, busy, site]);

  // 1-Tap Publish
  const publishSite = useCallback(async () => {
    if (!slug || !siteId || busy) return;
    setBusy(true);
    setBusyStep('Publishing live...');
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

        setToast({ text: `Live storefront published at ${livePublicUrl}` });
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

  // Open storefront in browser
  const openInBrowser = useCallback(async () => {
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
  }, [publicUrl, slug]);

  // Visual Node Renderer
  const renderVisualNode = (
    node: Node,
    toneColors: { ink: string; canvas: string; surface: string; border: string; accent: string; accentink: string },
    sectionColumns: number = 1,
  ) => {
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
            <Text style={[styles.previewButtonText, { color: toneColors.accentink }]}>
              {String(node.props?.label || node.props?.text || 'Explore')}
            </Text>
          </View>
        );
      case 'image': {
        const imageUri = typeof node.props?.src === 'string' ? node.props.src
          : typeof node.props?.url === 'string' ? node.props.url
          : null;
        return (
          <View key={node.id} style={[styles.previewImageContainer, { borderColor: toneColors.border }]}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: toneColors.surface }]}>
                <Ionicons name="image-outline" size={24} color={toneColors.ink} />
              </View>
            )}
          </View>
        );
      }
      case 'link':
        return (
          <Text key={node.id} style={[styles.previewLink, { color: toneColors.accent }]}>
            {String(node.props?.label || node.props?.text || 'Learn more')} →
          </Text>
        );
      case 'divider':
        return <View key={node.id} style={[styles.previewDivider, { backgroundColor: toneColors.border }]} />;
      case 'spacer':
        return <View key={node.id} style={{ height: 16 }} />;
      case 'list': {
        const items = Array.isArray(node.props?.items) ? node.props.items : [];
        return (
          <View key={node.id} style={styles.previewList}>
            {items.map((item, idx) => (
              <View key={idx} style={styles.previewListItem}>
                <Text style={[styles.previewBullet, { color: toneColors.accent }]}>•</Text>
                <Text style={[styles.previewBody, { color: toneColors.ink, flex: 1, marginBottom: 4 }]}>
                  {typeof item === 'string' ? item : String((item as Record<string, unknown>)?.text || '')}
                </Text>
              </View>
            ))}
          </View>
        );
      }
      case 'tabs': {
        const tabs = Array.isArray(node.props?.tabs) ? node.props.tabs : [];
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} key={node.id} contentContainerStyle={styles.previewTabsRow}>
            {tabs.map((tab, idx) => (
              <View key={idx} style={[styles.previewTabPill, idx === 0 && { backgroundColor: toneColors.ink }]}>
                <Text style={[styles.previewTabText, idx === 0 ? { color: toneColors.canvas } : { color: toneColors.ink }]}>
                  {typeof tab === 'string' ? tab : String((tab as Record<string, unknown>)?.label || `Tab ${idx + 1}`)}
                </Text>
              </View>
            ))}
          </ScrollView>
        );
      }
      case 'accordion': {
        const items = Array.isArray(node.props?.items) ? node.props.items : [];
        return (
          <View key={node.id} style={styles.previewAccordion}>
            {items.map((item: Record<string, unknown>, idx: number) => (
              <View key={idx} style={[styles.previewAccordionItem, { borderColor: toneColors.border }]}>
                <Text style={[styles.previewAccordionQuestion, { color: toneColors.ink }]}>
                  {String(item.question || item.title || `Question ${idx + 1}`)}
                </Text>
                {item.answer ? (
                  <Text style={[styles.previewAccordionAnswer, { color: toneColors.ink }]}>
                    {String(item.answer || '')}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        );
      }
      case 'card':
        return (
          <View
            key={node.id}
            style={[
              styles.previewCard,
              { backgroundColor: toneColors.surface, borderColor: toneColors.border },
            ]}
          >
            {node.children?.map((child) => renderVisualNode(child, toneColors, sectionColumns))}
          </View>
        );
      case 'collection': {
        const items = Array.isArray(node.props?.items) ? node.props.items : [];
        const cols = (node.props?.columns as number) || (sectionColumns > 1 ? sectionColumns : 2);
        const cardWidth = cols === 1 ? '100%' : cols === 3 ? '31%' : cols === 4 ? '23%' : '48%';
        return (
          <View key={node.id} style={styles.previewCollectionGrid}>
            {items.map((item: Record<string, unknown>, idx: number) => {
              const itemTitle = String(item.title || `Item ${idx + 1}`);
              const rawPrice = Number(item.price);
              const itemPrice = Number.isFinite(rawPrice)
                ? (rawPrice >= 100 ? `$${(rawPrice / 100).toFixed(2)}` : `$${rawPrice}`)
                : '';
              const imageUrl = typeof item.image === 'string' ? item.image : typeof item.image2 === 'string' ? item.image2 : null;
              return (
                <View
                  key={String(item.id || idx)}
                  style={[
                    styles.previewProductCard,
                    { width: cardWidth, backgroundColor: toneColors.surface, borderColor: toneColors.border },
                    cols === 1 && { flexDirection: 'row', alignItems: 'center', gap: 12 },
                  ]}
                >
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={[
                        styles.productImageMock,
                        cols === 1 && { width: 70, height: 90, aspectRatio: undefined, marginBottom: 0 },
                      ]}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.productImageMock,
                        { backgroundColor: toneColors.border },
                        cols === 1 && { width: 70, height: 90, aspectRatio: undefined, marginBottom: 0 },
                      ]}
                    />
                  )}
                  <View style={cols === 1 ? { flex: 1, justifyContent: 'center' } : undefined}>
                    <Text style={[styles.productTitle, { color: toneColors.ink }]} numberOfLines={2}>
                      {itemTitle}
                    </Text>
                    {itemPrice ? (
                      <Text style={[styles.productPrice, { color: toneColors.accent }]}>{itemPrice}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        );
      }
      case 'flex':
        return (
          <View key={node.id} style={styles.previewFlexRow}>
            {node.children?.map((child) => renderVisualNode(child, toneColors, sectionColumns))}
          </View>
        );
      case 'stack':
        return (
          <View key={node.id} style={styles.previewStack}>
            {node.children?.map((child) => renderVisualNode(child, toneColors, sectionColumns))}
          </View>
        );
      default:
        return (
          <View key={node.id} style={{ marginVertical: 2 }}>
            {node.children?.map((child) => renderVisualNode(child, toneColors, sectionColumns))}
          </View>
        );
    }
  };

  // Visual Interactive Section Renderer (Tap-to-Target Directing)
  const renderVisualSection = (section: Section) => {
    const isSelected = selectedSectionId === section.id;
    const sectionColumns = section.layout?.kind === 'grid' ? (Number(section.layout.columns) || 2) : 1;
    const tone = section.style?.base?.background?.includes('ink') ? 'ink'
      : section.style?.base?.background?.includes('surface') ? 'surface'
      : section.style?.base?.background?.includes('accent') ? 'accent' : 'canvas';

    const canvasColor = site?.design?.color?.canvas || '#ffffff';
    const surfaceColor = site?.design?.color?.surface || '#f4f4f5';
    const inkColor = site?.design?.color?.ink || '#09090b';
    const accentColor = site?.design?.color?.accent || '#18181b';
    const accentInkColor = site?.design?.color?.accentink || '#ffffff';
    const borderColor = site?.design?.color?.border || '#e4e4e7';

    const isInk = tone === 'ink';
    const isAccent = tone === 'accent';
    const isSurface = tone === 'surface';

    const toneColors = {
      ink: isInk ? canvasColor : isAccent ? accentInkColor : inkColor,
      canvas: isInk ? inkColor : isSurface ? surfaceColor : isAccent ? accentColor : canvasColor,
      surface: isInk ? '#18181b' : surfaceColor,
      border: isInk ? '#27272a' : borderColor,
      accent: isInk ? canvasColor : accentColor,
      accentink: isInk ? inkColor : accentInkColor,
    };

    return (
      <TouchableOpacity
        key={section.id}
        activeOpacity={0.92}
        onPress={() => setSelectedSectionId(isSelected ? null : section.id)}
        style={[
          styles.previewSectionContainer,
          { backgroundColor: toneColors.canvas, borderColor: isSelected ? '#18181b' : toneColors.border },
          isSelected && styles.sectionSelectedOutline,
        ]}
      >
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.sectionBadgePill, isSelected && styles.sectionBadgePillSelected]}>
            <Text style={[styles.sectionBadgeText, isSelected && styles.sectionBadgeTextSelected]}>
              {section.purpose.toUpperCase()}
            </Text>
          </View>
          {isSelected ? (
            <View style={styles.selectedActionsHeaderRow}>
              <TouchableOpacity
                onPress={() => openSectionContentEditor(section)}
                style={styles.editContentPillBtn}
                accessibilityLabel="Edit Section Content"
              >
                <Ionicons name="pencil" size={11} color="#ffffff" />
                <Text style={styles.editContentPillText}>Edit Content</Text>
              </TouchableOpacity>
              <View style={styles.selectedTagBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#18181b" />
                <Text style={styles.selectedTagText}>Target Focused</Text>
              </View>
            </View>
          ) : null}
        </View>
        {section.nodes?.map((node) => renderVisualNode(node, toneColors, sectionColumns))}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
        {/* Top Sticky Navigation Bar (Shopify Mobile Editor Model) */}
        <View style={styles.topNavBar}>
          {/* Back button */}
          <TouchableOpacity
            accessibilityLabel="Back"
            onPress={onClose}
            style={styles.navIconBtn}
          >
            <Ionicons name="arrow-back" size={20} color="#18181b" />
          </TouchableOpacity>

          {/* Page Selector Dropdown Pill */}
          <TouchableOpacity
            onPress={() => setPagePickerOpen(true)}
            style={styles.pagePickerPill}
            accessibilityLabel="Select Page"
          >
            <Ionicons name="home-outline" size={13} color="#18181b" />
            <Text style={styles.pagePickerText} numberOfLines={1}>
              {activePage?.title || 'Home page'}
            </Text>
            <Ionicons name="chevron-down" size={12} color="#71717a" />
          </TouchableOpacity>

          {/* Store status badge */}
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, isLive ? styles.statusDotLive : styles.statusDotDraft]} />
            <Text style={styles.statusText}>
              {isLive ? 'Live' : 'Draft'} · rev {revision}
            </Text>
          </View>

          {/* Top Action Buttons */}
          <View style={styles.topActionsRow}>
            <TouchableOpacity
              onPress={() => void openInBrowser()}
              style={styles.browserBtn}
              accessibilityLabel="Open in Browser"
            >
              <Ionicons name="open-outline" size={15} color="#18181b" />
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

        {/* Live Visual Canvas (Root Interactive Preview) */}
        {initialLoading && !site ? (
          <View style={styles.loadingFeed}>
            <ActivityIndicator size="small" color="#18181b" />
            <Text style={styles.loadingFeedText}>Connecting to storefront...</Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.canvasContainer}
          >
            {/* Scrollable Live Storefront Surface */}
            <ScrollView
              style={styles.visualCanvasScroll}
              contentContainerStyle={[
                styles.visualCanvasContent,
                { paddingBottom: Math.max(insets.bottom + 120, 140) },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Background deselect hit box */}
              <Pressable
                onPress={() => setSelectedSectionId(null)}
                style={styles.canvasBackgroundArea}
              >
                {/* Store Header Bar */}
                <View style={styles.storeHeaderBar}>
                  <Text style={styles.storeBrandTitle}>{workspaceName}</Text>
                  <View style={styles.storeNavRow}>
                    {(site?.pages || []).slice(0, 3).map((p) => (
                      <TouchableOpacity key={p.id} onPress={() => setActivePageId(p.id)}>
                        <Text style={[styles.storeNavLink, p.id === activePageId && styles.storeNavLinkActive]}>
                          {p.title || p.path}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Interactive Rendered Sections */}
                {(activePage?.sections || []).map((sec) => renderVisualSection(sec))}

                {/* Store Footer Bar */}
                <View style={styles.storeFooterBar}>
                  <Text style={styles.storeFooterText}>
                    © {new Date().getFullYear()} {workspaceName} · Powered by TAR
                  </Text>
                </View>
              </Pressable>
            </ScrollView>

            {/* Floating Jev Director Dock (Anchored at Bottom) */}
            <View
              style={[
                styles.floatingDirectorDock,
                { paddingBottom: Math.max(insets.bottom, 12) },
              ]}
            >
              {/* Revision / Undo Toast Notification */}
              {toast ? (
                <View style={styles.toastCard}>
                  <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
                  <Text style={styles.toastCardText} numberOfLines={1}>
                    {toast.text}
                  </Text>
                  {toast.revision && toast.revision > 1 ? (
                    <TouchableOpacity
                      onPress={() => void undoLastEdit()}
                      disabled={busy}
                      style={styles.toastUndoBtn}
                    >
                      <Text style={styles.toastUndoBtnText}>Undo</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    onPress={() => setToast(null)}
                    style={styles.toastDismissBtn}
                  >
                    <Ionicons name="close" size={14} color="#71717a" />
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Busy Indicator Banner */}
              {busy && busyStep ? (
                <View style={styles.busyCard}>
                  <ActivityIndicator size="small" color="#18181b" />
                  <Text style={styles.busyCardText}>{busyStep}</Text>
                </View>
              ) : null}

              {/* Dynamic Contextual Action Chips (Floats Directly Above Input) */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.contextChipsScroll}
              >
                {dynamicChips.map((chipPrompt) => (
                  <TouchableOpacity
                    key={chipPrompt}
                    onPress={() => void applyJevEdit(chipPrompt)}
                    disabled={busy}
                    style={styles.contextChip}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.contextChipText}>{chipPrompt}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Floating Director Pill Bar */}
              <View style={styles.directorBar}>
                {/* Section Layers Button */}
                <TouchableOpacity
                  onPress={() => setLayersSheetOpen(true)}
                  style={styles.layersBtn}
                  accessibilityLabel="Page Sections Layers"
                >
                  <Ionicons name="layers-outline" size={18} color="#18181b" />
                </TouchableOpacity>

                {/* Floating Pill Input Box */}
                <View style={styles.directorPill}>
                  {/* Jev Avatar Badge */}
                  <View style={styles.jevAvatar}>
                    {busy ? (
                      <ActivityIndicator size="small" color="#18181b" />
                    ) : (
                      <Text style={styles.jevAvatarText}>J</Text>
                    )}
                  </View>

                  {/* Focused Target Tag */}
                  {selectedSection ? (
                    <TouchableOpacity
                      onPress={() => setSelectedSectionId(null)}
                      style={styles.focusedTargetPill}
                    >
                      <Text style={styles.focusedTargetText}>
                        {selectedSection.purpose}
                      </Text>
                      <Ionicons name="close" size={11} color="#18181b" />
                    </TouchableOpacity>
                  ) : null}

                  {/* Input Field */}
                  <TextInput
                    style={styles.directorInput}
                    value={command}
                    onChangeText={setCommand}
                    placeholder={
                      selectedSection
                        ? `Ask Jev to change ${selectedSection.purpose}...`
                        : 'Ask Jev to change site...'
                    }
                    placeholderTextColor="#a1a1aa"
                    editable={!busy}
                    returnKeyType="send"
                    onSubmitEditing={() => void applyJevEdit()}
                  />

                  {/* Send Action Button */}
                  <TouchableOpacity
                    disabled={busy || !command.trim()}
                    onPress={() => void applyJevEdit()}
                    style={[
                      styles.sendActionBtn,
                      command.trim() ? styles.sendActionBtnActive : styles.sendActionBtnDisabled,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="arrow-up"
                      size={16}
                      color={command.trim() ? '#ffffff' : '#a1a1aa'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* Page Switcher Modal Bottom Sheet */}
        <Modal
          visible={pagePickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setPagePickerOpen(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setPagePickerOpen(false)}
          >
            <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Switch Page</Text>
                <TouchableOpacity onPress={() => setPagePickerOpen(false)}>
                  <Ionicons name="close" size={20} color="#18181b" />
                </TouchableOpacity>
              </View>
              {(site?.pages || []).map((page) => {
                const isSelected = activePageId === page.id;
                return (
                  <TouchableOpacity
                    key={page.id}
                    onPress={() => {
                      setActivePageId(page.id);
                      setSelectedSectionId(null);
                      setPagePickerOpen(false);
                    }}
                    style={[styles.sheetItem, isSelected && styles.sheetItemSelected]}
                  >
                    <Ionicons
                      name={page.id === 'home' ? 'home' : 'document-text-outline'}
                      size={18}
                      color={isSelected ? '#18181b' : '#71717a'}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sheetItemTitle, isSelected && styles.sheetItemTitleSelected]}>
                        {page.title || page.path}
                      </Text>
                      <Text style={styles.sheetItemSubtitle}>{page.path}</Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={18} color="#18181b" />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Modal>

        {/* Section Layers Sheet Modal */}
        <Modal
          visible={layersSheetOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setLayersSheetOpen(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setLayersSheetOpen(false)}
          >
            <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Page Sections</Text>
                  <Text style={styles.sheetSubtitle}>{activePage?.title || 'Home page'}</Text>
                </View>
                <TouchableOpacity onPress={() => setLayersSheetOpen(false)}>
                  <Ionicons name="close" size={20} color="#18181b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {(activePage?.sections || []).map((sec, idx) => {
                  const isFocused = selectedSectionId === sec.id;
                  const canMoveUp = idx > 0;
                  const canMoveDown = idx < (activePage?.sections.length || 0) - 1;
                  return (
                    <View
                      key={sec.id}
                      style={[styles.layerRow, isFocused && styles.layerRowFocused]}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedSectionId(sec.id);
                          setLayersSheetOpen(false);
                        }}
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                      >
                        <View style={styles.layerIndexBadge}>
                          <Text style={styles.layerIndexText}>{idx + 1}</Text>
                        </View>
                        <View>
                          <Text style={[styles.layerTitle, isFocused && styles.layerTitleFocused]}>
                            {sec.purpose.toUpperCase()}
                          </Text>
                          <Text style={styles.layerIdText}>{sec.id}</Text>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.layerActionsRow}>
                        <TouchableOpacity
                          disabled={!canMoveUp || busy}
                          onPress={() => void moveSection(sec.id, 'up')}
                          style={[styles.layerOrderBtn, !canMoveUp && styles.disabled]}
                        >
                          <Ionicons name="arrow-up" size={14} color="#18181b" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          disabled={!canMoveDown || busy}
                          onPress={() => void moveSection(sec.id, 'down')}
                          style={[styles.layerOrderBtn, !canMoveDown && styles.disabled]}
                        >
                          <Ionicons name="arrow-down" size={14} color="#18181b" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        {/* Quick Edit Section Content Modal */}
        <Modal
          visible={contentEditorOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setContentEditorOpen(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Edit Section Content</Text>
                  <Text style={styles.sheetSubtitle}>
                    {contentEditorSection?.purpose.toUpperCase()} ({contentEditorSection?.id})
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setContentEditorOpen(false)}>
                  <Ionicons name="close" size={20} color="#18181b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {editableFields.length > 0 ? (
                  editableFields.map((field, idx) => (
                    <View key={field.id} style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>{field.label}</Text>
                      <TextInput
                        style={styles.editFieldInput}
                        value={field.value}
                        onChangeText={(val) => {
                          setEditableFields((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], value: val };
                            return next;
                          });
                        }}
                        multiline={field.kind === 'text'}
                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                        placeholderTextColor="#a1a1aa"
                      />
                    </View>
                  ))
                ) : (
                  <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#71717a' }}>
                      No direct text fields found in this section. Use the Director Dock to adjust layout or styling.
                    </Text>
                  </View>
                )}
              </ScrollView>

              {editableFields.length > 0 ? (
                <TouchableOpacity
                  disabled={busy}
                  onPress={() => void saveSectionContentEdits()}
                  style={[styles.saveContentBtn, busy && styles.disabled]}
                >
                  <Text style={styles.saveContentBtnText}>
                    {busy ? 'Saving...' : 'Save Content Changes'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },

  // Top Sticky Navigation Bar
  topNavBar: {
    height: 52,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e4e4e7',
    backgroundColor: '#ffffff',
    zIndex: 10,
  },
  navIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f4f5',
  },
  pagePickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    maxWidth: 140,
  },
  pagePickerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#18181b',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotLive: { backgroundColor: '#16a34a' },
  statusDotDraft: { backgroundColor: '#a1a1aa' },
  statusText: { fontSize: 11, color: '#71717a', fontWeight: '500' },

  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  browserBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishPill: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 16,
  },
  publishPillDraft: { backgroundColor: '#18181b' },
  publishPillLive: { backgroundColor: '#f4f4f5', borderWidth: 1, borderColor: '#e4e4e7' },
  publishPillText: { fontSize: 12, fontWeight: '700' },
  publishPillTextDraft: { color: '#ffffff' },
  publishPillTextLive: { color: '#18181b' },
  disabled: { opacity: 0.35 },

  // Live Canvas Container
  canvasContainer: { flex: 1, backgroundColor: '#fafafa' },
  visualCanvasScroll: { flex: 1 },
  visualCanvasContent: { paddingHorizontal: 12, paddingTop: 12 },
  canvasBackgroundArea: { flex: 1 },

  loadingFeed: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingFeedText: { fontSize: 13, color: '#71717a' },

  // Store Layout Elements
  storeHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  storeBrandTitle: { fontSize: 16, fontWeight: '800', color: '#09090b', letterSpacing: -0.3 },
  storeNavRow: { flexDirection: 'row', gap: 12 },
  storeNavLink: { fontSize: 12, color: '#71717a', fontWeight: '500' },
  storeNavLinkActive: { color: '#09090b', fontWeight: '700' },

  // Interactive Section Container
  previewSectionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginVertical: 4,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  sectionSelectedOutline: {
    borderColor: '#18181b',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionBadgePill: {
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sectionBadgePillSelected: {
    backgroundColor: '#18181b',
  },
  sectionBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#71717a',
    letterSpacing: 0.6,
  },
  sectionBadgeTextSelected: {
    color: '#ffffff',
  },
  selectedTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e4e4e7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedTagText: { fontSize: 10, fontWeight: '700', color: '#18181b' },

  previewHeading: { fontWeight: '800', marginBottom: 8, letterSpacing: -0.3 },
  previewBody: { fontSize: 14, lineHeight: 21, marginBottom: 12 },
  previewButton: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, marginVertical: 4 },
  previewButtonText: { fontSize: 12, fontWeight: '700' },
  previewImageContainer: { width: '100%', borderRadius: 8, overflow: 'hidden', marginVertical: 6, borderWidth: StyleSheet.hairlineWidth },
  previewImage: { width: '100%', aspectRatio: 16 / 9 },
  imagePlaceholder: { width: '100%', aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center' },
  previewLink: { fontSize: 13, fontWeight: '600', marginVertical: 4 },
  previewDivider: { height: StyleSheet.hairlineWidth, marginVertical: 12, width: '100%' },
  previewList: { marginVertical: 4 },
  previewListItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  previewBullet: { fontSize: 16, lineHeight: 20 },
  previewTabsRow: { flexDirection: 'row', gap: 8, paddingVertical: 6 },
  previewTabPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#f4f4f5' },
  previewTabText: { fontSize: 12, fontWeight: '600' },
  previewAccordion: { marginVertical: 6 },
  previewAccordionItem: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  previewAccordionQuestion: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  previewAccordionAnswer: { fontSize: 12, lineHeight: 18, opacity: 0.85 },
  previewCard: { padding: 12, borderRadius: 8, borderWidth: 1, marginVertical: 4 },
  previewCollectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6, width: '100%', justifyContent: 'space-between' },
  previewProductCard: { width: '48%', padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 4 },
  productImageMock: { width: '100%', aspectRatio: 3 / 4, borderRadius: 4, marginBottom: 8 },
  productTitle: { fontSize: 12, fontWeight: '600', marginBottom: 3, lineHeight: 16 },
  productPrice: { fontSize: 12, fontWeight: '700' },
  previewFlexRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 4 },
  previewStack: { gap: 8 },

  storeFooterBar: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f5',
    marginTop: 4,
  },
  storeFooterText: { fontSize: 11, color: '#a1a1aa' },

  // Floating Jev Director Dock
  floatingDirectorDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingTop: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e4e4e7',
  },

  // Toast Pill Card
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 8,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  toastCardText: { flex: 1, fontSize: 12, fontWeight: '500', color: '#18181b' },
  toastUndoBtn: {
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  toastUndoBtnText: { fontSize: 11, fontWeight: '700', color: '#18181b' },
  toastDismissBtn: { padding: 2 },

  // Busy Card
  busyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f4f4f5',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 6,
  },
  busyCardText: { fontSize: 12, color: '#71717a', fontStyle: 'italic' },

  // Context Chips Scroll
  contextChipsScroll: { gap: 6, paddingBottom: 8 },
  contextChip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  contextChipText: { fontSize: 12, color: '#18181b', fontWeight: '500' },

  // Director Bar
  directorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  layersBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  directorPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f6',
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 44,
  },
  jevAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  jevAvatarText: { fontSize: 11, fontWeight: '800', color: '#18181b' },
  focusedTargetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e4e4e7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
    gap: 3,
  },
  focusedTargetText: { fontSize: 10, color: '#18181b', fontWeight: '700' },
  directorInput: {
    flex: 1,
    fontSize: 13,
    color: '#18181b',
    paddingVertical: 4,
  },
  sendActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  sendActionBtnActive: { backgroundColor: '#18181b' },
  sendActionBtnDisabled: { backgroundColor: '#e4e4e7' },

  // Bottom Sheet Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e4e4e7',
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#18181b' },
  sheetSubtitle: { fontSize: 12, color: '#71717a' },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 12,
  },
  sheetItemSelected: { backgroundColor: '#f4f4f5' },
  sheetItemTitle: { fontSize: 14, fontWeight: '600', color: '#18181b' },
  sheetItemTitleSelected: { fontWeight: '700' },
  sheetItemSubtitle: { fontSize: 11, color: '#71717a' },

  // Layer Row
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f4f4f5',
  },
  layerRowFocused: { backgroundColor: '#f4f4f5', borderRadius: 8 },
  layerIndexBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e4e4e7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layerIndexText: { fontSize: 10, fontWeight: '700', color: '#18181b' },
  layerTitle: { fontSize: 13, fontWeight: '700', color: '#18181b' },
  layerTitleFocused: { color: '#09090b' },
  layerIdText: { fontSize: 10, color: '#a1a1aa' },
  layerActionsRow: { flexDirection: 'row', gap: 6 },
  layerOrderBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },

  // Content Editor Modal
  selectedActionsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editContentPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#18181b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  editContentPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  editFieldGroup: {
    marginBottom: 14,
  },
  editFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18181b',
    marginBottom: 4,
  },
  editFieldInput: {
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#18181b',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  saveContentBtn: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveContentBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
