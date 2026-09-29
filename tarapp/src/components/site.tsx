/**
 * AI Sites Live Studio & Visual Preview (Phase 1).
 *
 * Full interactive visual studio for workspace site drafts:
 * - Live interactive preview of site.json with brand tokens, frame/header, sections, blocks & footer
 * - Multi-device responsive frames (Phone 360px, Tablet 768px, Desktop 1140px)
 * - Jev prompt bar with natural language edits and System One decision integration
 * - Interactive section inspector with visual block controls, reordering, insertion, and tone/layout picks
 * - Asset binding, illustration generator and 1-tap rights approval
 * - 1-tap publish pipeline with candidate checks, claim verification and live release status
 * - Non-destructive Undo / Redo revision history
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { harness, HARNESS_URL } from '@/lib/harness';
import {
  PREVIEW_FRAMES,
  type AskOutcome,
  type Asset,
  type AssetSummary,
  type Checks,
  type DiffEntry,
  type Node,
  type Page,
  type PatchOperation,
  type ReleaseManifest,
  type Section,
  type SiteDocument,
  type SiteSnapshot,
  type Style,
  type StyleSet,
} from '@/lib/site-schema';

export interface SiteScreenProps {
  visible: boolean;
  onClose: () => void;
  workspaceName: string;
  subdomain: string;
  scope: string;
  products?: { title?: string; name?: string }[];
}

type Tab = 'preview' | 'ask' | 'inspect' | 'assets' | 'design' | 'release';
type FrameKey = 'phone' | 'tablet' | 'desktop';
type Candidate = { releaseId: string; hash: string; previewUrl: string | null; checks: Checks | null; revision: number };

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'preview', label: 'Preview', icon: 'eye-outline' },
  { key: 'ask', label: 'Prompt', icon: 'sparkles-outline' },
  { key: 'inspect', label: 'Sections', icon: 'layers-outline' },
  { key: 'assets', label: 'Assets', icon: 'images-outline' },
  { key: 'design', label: 'Design', icon: 'color-palette-outline' },
  { key: 'release', label: 'Publish', icon: 'cloud-upload-outline' },
];

const THEME_PRESETS: { id: string; name: string; canvas: string; ink: string; accent: string; accentink: string; surface: string; border: string; muted: string }[] = [
  { id: 'editorial-chalk', name: 'Editorial Chalk', canvas: '#edebe4', ink: '#01273e', accent: '#000bfa', accentink: '#ffffff', surface: '#f6f5f0', border: '#dcd9cf', muted: '#617282' },
  { id: 'streetwear-dark', name: 'Streetwear Dark', canvas: '#111111', ink: '#f8fafc', accent: '#5e6ad2', accentink: '#ffffff', surface: '#1a1a1a', border: '#2a2a2a', muted: '#94a3b8' },
  { id: 'minimal-clean', name: 'Minimal Clean', canvas: '#ffffff', ink: '#18181b', accent: '#2563eb', accentink: '#ffffff', surface: '#fafafa', border: '#e4e4e7', muted: '#71717a' },
  { id: 'warm-ochre', name: 'Warm Ochre', canvas: '#fdfbf7', ink: '#292524', accent: '#d97706', accentink: '#ffffff', surface: '#f5f0e8', border: '#e7dfd5', muted: '#78716c' },
  { id: 'nordic-slate', name: 'Nordic Slate', canvas: '#f8fafc', ink: '#0f172a', accent: '#0284c7', accentink: '#ffffff', surface: '#ffffff', border: '#e2e8f0', muted: '#64748b' },
];

const PROMPT_SUGGESTIONS = [
  'Image left, text right, more breathing room. Keep the heading unchanged',
  'Make the hero background ink and text light',
  'Change layout to two columns with airy spacing',
  'Set accent color to royal blue',
  'Add more breathing room between sections',
  'Make cards raised with soft borders',
];

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'TAR could not complete this site action.';
}

function formatMoney(amount: number, currency = 'USD', locale = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
}

export default function SiteScreen({ visible, onClose, workspaceName, scope }: SiteScreenProps) {
  const insets = useSafeAreaInsets();
  const slug = useMemo(() => scope.replace(/^w:/, '').trim() || workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), [scope, workspaceName]);
  const closed = useRef(false);

  // Core Document & Server State
  const [snapshot, setSnapshot] = useState<SiteSnapshot | null>(null);
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [releases, setReleases] = useState<ReleaseManifest[]>([]);
  const [tab, setTab] = useState<Tab>('preview');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  // Visual Studio Navigation & Frame
  const [frame, setFrame] = useState<FrameKey>('phone');
  const [activePageId, setActivePageId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Interactive Live Preview State (accordion & tabs)
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});
  const [activeTabIndices, setActiveTabIndices] = useState<Record<string, number>>({});
  const [searchFilter, setSearchFilter] = useState('');

  // Prompt / Jev Edit State
  const [command, setCommand] = useState('');
  const [promptScope, setPromptScope] = useState<'section' | 'page' | 'site'>('section');
  const [proposal, setProposal] = useState<AskOutcome | null>(null);
  const [diff, setDiff] = useState<DiffEntry[]>([]);
  const [brief, setBrief] = useState('');

  // Inspector & Block Edit State
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [editNodeModalOpen, setEditNodeModalOpen] = useState(false);
  const [nodeEditKind, setNodeEditKind] = useState<string>('heading');
  const [nodeEditText, setNodeEditText] = useState('');
  const [nodeEditSubtext, setNodeEditSubtext] = useState('');
  const [nodeEditLevel, setNodeEditLevel] = useState<number>(2);
  const [nodeEditHref, setNodeEditHref] = useState('');
  const [nodeEditVariant, setNodeEditVariant] = useState<'primary' | 'secondary' | 'outline'>('primary');
  const [nodeEditAsset, setNodeEditAsset] = useState('');

  // Design Tokens & Provenance State
  const [designDraft, setDesignDraft] = useState('');
  const [decisions, setDecisions] = useState<{ area: string; question: string; choice: string }[]>([]);

  // Asset Generation State
  const [illustration, setIllustration] = useState('');
  const [uploadAlt, setUploadAlt] = useState('');

  // Release Candidate State
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [reviewed, setReviewed] = useState(false);

  const site: SiteDocument | null = snapshot?.site?.data ?? null;
  const siteId = snapshot?.site?.id ?? null;
  const locked = useMemo(() => new Set((site?.locks ?? []).map((lock) => lock.target)), [site]);
  const liveRelease = snapshot?.liveRelease ?? null;

  useEffect(() => { closed.current = !visible; }, [visible]);

  const load = useCallback(async () => {
    const next = await harness.site.get(slug);
    if (closed.current) return;
    setSnapshot(next);
    setDesignDraft(next.designMarkdown || '');
    if (next.site?.data?.pages?.length && !activePageId) {
      setActivePageId(next.site.data.pages[0].id);
    }
    if (!next.site) { setAssets([]); setReleases([]); return; }
    const id = next.site.id;
    const [assetList, releaseList] = await Promise.all([
      harness.site.assets(slug, id).catch(() => ({ assets: [] as AssetSummary[] })),
      harness.site.releases(slug, id).catch(() => ({ releases: [] as ReleaseManifest[] })),
    ]);
    if (closed.current) return;
    setAssets(assetList.assets);
    setReleases(releaseList.releases);
  }, [slug, activePageId]);

  const run = useCallback(async <T,>(work: () => Promise<T>, success?: string): Promise<T | null> => {
    setBusy(true); setFailed(false);
    try {
      const result = await work();
      if (!closed.current && success !== undefined) { setMessage(success); setFailed(false); }
      await load();
      return result;
    } catch (error) {
      if (!closed.current) { setMessage(errorText(error)); setFailed(true); }
      return null;
    } finally {
      if (!closed.current) setBusy(false);
    }
  }, [load]);

  const openSheet = useCallback(() => {
    setProposal(null); setDiff([]); setCandidate(null); setMessage(''); setFailed(false); setReviewed(false);
    setSelectedSectionId(null); setSelectedNodeId(null);
    setBusy(true);
    void load().catch(() => undefined).finally(() => { if (!closed.current) setBusy(false); });
  }, [load]);

  useEffect(() => {
    if (!visible || snapshot) return;
    void load().catch(() => undefined);
  }, [visible, snapshot, load]);

  useEffect(() => {
    if (!message || failed) return;
    const timer = setTimeout(() => {
      if (!closed.current) setMessage('');
    }, 4000);
    return () => clearTimeout(timer);
  }, [message, failed]);

  // Active Page & Active Section Resolution
  const activePage: Page | null = useMemo(() => {
    if (!site?.pages?.length) return null;
    return site.pages.find((p) => p.id === activePageId) || site.pages[0];
  }, [site, activePageId]);

  const activeSection: Section | null = useMemo(() => {
    if (!activePage || !selectedSectionId) return null;
    return activePage.sections.find((s) => s.id === selectedSectionId) || null;
  }, [activePage, selectedSectionId]);

  // Document Operations & Patching
  const applyOperations = useCallback(async (operations: PatchOperation[], summary: string) => {
    if (!siteId || !site || !operations.length) return;
    const edited = await run(() => harness.site.edit(slug, siteId, site.revision, operations, summary), `${summary}. Revision ${site.revision + 1} saved.`);
    if (edited && !closed.current) {
      setDiff(edited.diff);
      setCandidate(null);
    }
  }, [run, site, siteId, slug]);

  const generate = useCallback(async () => {
    if (!brief.trim()) { setMessage('Describe what the site should achieve.'); setFailed(true); return; }
    const created = await run(() => harness.site.generate(slug, { title: workspaceName || 'Workspace', prompt: brief.trim() }), 'Draft created. Explore pages & sections in preview.');
    if (!closed.current && created) {
      setBrief('');
      if (created.note) { setMessage(created.note); setFailed(true); }
      if (created.site?.pages?.length) setActivePageId(created.site.pages[0].id);
    }
  }, [brief, run, slug, workspaceName]);

  const ask = useCallback(async (customCommand?: string) => {
    const textCommand = (customCommand || command).trim();
    if (!siteId || !textCommand) return;
    const target = promptScope === 'section' && selectedSectionId ? selectedSectionId : undefined;
    const asked = await run(() => harness.site.ask(slug, siteId, textCommand, target), '');
    if (!asked || closed.current) return;
    setProposal(asked);
    if (asked.operations.length) {
      setMessage(`${asked.operations.length} proposed change${asked.operations.length === 1 ? '' : 's'} for ${asked.target || 'the site'}.`);
    } else {
      setMessage(asked.questions[0] || 'Describe the change with a section and a value.');
      setFailed(true);
    }
  }, [command, promptScope, run, selectedSectionId, siteId, slug]);

  const applyProposal = useCallback(async () => {
    if (!siteId || !proposal || !proposal.operations.length) return;
    const edited = await run(() => harness.site.edit(slug, siteId, proposal.base, proposal.operations, proposal.summary), 'Change applied.');
    if (!edited || closed.current) return;
    setDiff(edited.diff); setProposal(null); setCommand(''); setCandidate(null);
  }, [proposal, run, siteId, slug]);

  const undo = useCallback(async (revision?: number) => {
    if (!siteId) return;
    const restored = await run(() => harness.site.undo(slug, siteId, revision), 'Restored as a new revision.');
    if (restored && !closed.current) {
      setDiff(restored.diff);
      setCandidate(null);
    }
  }, [run, siteId, slug]);

  const toggleLock = useCallback(async (target: string, kind: 'section' | 'node') => {
    if (!siteId || !site) return;
    const isLocked = locked.has(target);
    await run(() => harness.site.edit(slug, siteId, site.revision, [
      isLocked ? { op: 'unlock', target } : { op: 'lock', target, kind },
    ]), isLocked ? 'Unlocked.' : 'Locked. Protected from AI modifications.');
  }, [locked, run, site, siteId, slug]);

  // Section Layout & Tone Mutations
  const setSectionTone = useCallback(async (sectionId: string, tone: 'canvas' | 'surface' | 'ink' | 'accent') => {
    const section = activePage?.sections.find((s) => s.id === sectionId);
    if (!section || !site) return;
    const existingBase = (section.style?.base || {}) as Style;
    const colorMap: Record<string, { bg: string; color: string }> = {
      canvas: { bg: 'token:color.canvas', color: 'token:color.ink' },
      surface: { bg: 'token:color.surface', color: 'token:color.ink' },
      ink: { bg: 'token:color.ink', color: 'token:color.canvas' },
      accent: { bg: 'token:color.accent', color: 'token:color.accentink' },
    };
    const nextBase: Style = { ...existingBase, background: colorMap[tone].bg, color: colorMap[tone].color };
    const nextStyle: StyleSet = { ...(section.style || {}), base: nextBase };
    await applyOperations([{ op: 'set_style', target: sectionId, value: nextStyle }], `Set ${sectionId} tone to ${tone}`);
  }, [activePage, applyOperations, site]);

  const setSectionColumns = useCallback(async (sectionId: string, columns: number) => {
    const section = activePage?.sections.find((s) => s.id === sectionId);
    if (!section || !site) return;
    const nextLayout = { ...section.layout, kind: (columns > 1 ? 'grid' : 'stack') as Section['layout']['kind'], columns };
    await applyOperations([{ op: 'set_props', target: sectionId, value: { layout: nextLayout } }], `Set ${sectionId} columns to ${columns}`);
  }, [activePage, applyOperations, site]);

  const setSectionSpacing = useCallback(async (sectionId: string, pad: 'none' | 'sm' | 'md' | 'lg' | 'xl') => {
    const section = activePage?.sections.find((s) => s.id === sectionId);
    if (!section || !site) return;
    const existingBase = (section.style?.base || {}) as Style;
    const nextBase: Style = { ...existingBase, pad: pad === 'none' ? undefined : pad };
    const nextStyle: StyleSet = { ...(section.style || {}), base: nextBase };
    await applyOperations([{ op: 'set_style', target: sectionId, value: nextStyle }], `Set ${sectionId} spacing to ${pad}`);
  }, [activePage, applyOperations, site]);

  const setSectionMobileColumns = useCallback(async (sectionId: string, mobileCols: number) => {
    const section = activePage?.sections.find((s) => s.id === sectionId);
    if (!section || !site) return;
    const existingSmall = (section.style?.small || {}) as Style;
    const nextSmall: Style = { ...existingSmall, columns: mobileCols };
    const nextStyle: StyleSet = { ...(section.style || {}), small: nextSmall };
    await applyOperations([{ op: 'set_style', target: sectionId, value: nextStyle }], `Set mobile columns for ${sectionId} to ${mobileCols}`);
  }, [activePage, applyOperations, site]);

  const setSectionMobileSpacing = useCallback(async (sectionId: string, pad: 'none' | 'sm' | 'md' | 'lg' | 'xl') => {
    const section = activePage?.sections.find((s) => s.id === sectionId);
    if (!section || !site) return;
    const existingSmall = (section.style?.small || {}) as Style;
    const nextSmall: Style = { ...existingSmall, pad: pad === 'none' ? undefined : pad };
    const nextStyle: StyleSet = { ...(section.style || {}), small: nextSmall };
    await applyOperations([{ op: 'set_style', target: sectionId, value: nextStyle }], `Set mobile spacing for ${sectionId} to ${pad}`);
  }, [activePage, applyOperations, site]);

  const moveSection = useCallback(async (sectionId: string, direction: 'up' | 'down') => {
    if (!activePage || !site) return;
    const index = activePage.sections.findIndex((s) => s.id === sectionId);
    if (index < 0) return;
    const nextIndex = direction === 'up' ? Math.max(0, index - 1) : Math.min(activePage.sections.length - 1, index + 1);
    if (index === nextIndex) return;
    await applyOperations([{ op: 'move_section', target: sectionId, index: nextIndex }], `Move ${sectionId} ${direction}`);
  }, [activePage, applyOperations, site]);

  const deleteSection = useCallback(async (sectionId: string) => {
    if (!activePage || !site) return;
    if (activePage.sections.length <= 1) {
      setMessage('A page keeps at least one section.');
      setFailed(true);
      return;
    }
    await applyOperations([{ op: 'remove_section', target: sectionId }], `Remove section ${sectionId}`);
    if (selectedSectionId === sectionId) setSelectedSectionId(null);
  }, [activePage, applyOperations, selectedSectionId, site]);

  // Block / Node Insert, Reorder & Edit
  const moveNode = useCallback(async (nodeId: string, direction: 'up' | 'down') => {
    if (!activeSection || !site) return;
    const index = activeSection.nodes.findIndex((n) => n.id === nodeId);
    if (index < 0) return;
    const targetNode = direction === 'up' ? activeSection.nodes[index - 1] : activeSection.nodes[index + 2];
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index >= activeSection.nodes.length - 1) return;
    const op: PatchOperation = direction === 'up'
      ? { op: 'move_node', target: nodeId, before: targetNode?.id }
      : targetNode
        ? { op: 'move_node', target: nodeId, before: targetNode.id }
        : { op: 'move_node', target: nodeId };
    await applyOperations([op], `Move block ${nodeId} ${direction}`);
  }, [activeSection, applyOperations, site]);

  const deleteNode = useCallback(async (nodeId: string) => {
    if (!site) return;
    await applyOperations([{ op: 'remove_node', target: nodeId }], `Remove block ${nodeId}`);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [applyOperations, selectedNodeId, site]);

  const insertBlock = useCallback(async (kind: string) => {
    if (!activeSection || !site) return;
    const id = `${kind}-${Date.now().toString(36).slice(-4)}`;
    let newNode: Node;
    switch (kind) {
      case 'heading':
        newNode = { id, kind: 'heading', props: { text: 'New Heading', level: 2 } };
        break;
      case 'text':
        newNode = { id, kind: 'text', props: { text: 'Describe your products, story, or services here with clear, grounded details.' } };
        break;
      case 'button':
      case 'buttons':
        newNode = { id, kind: 'button', props: { label: 'Get started', text: 'Get started', href: '#contact', variant: 'primary' } };
        break;
      case 'image':
        newNode = { id, kind: 'image', props: { asset: assets[0]?.id || '', alt: 'Feature illustration' } };
        break;
      case 'quote':
        newNode = { id, kind: 'quote', props: { text: 'Exceptional craft and uncompromising quality in every single batch.', author: 'Customer Testimonial' } };
        break;
      case 'stat':
        newNode = { id, kind: 'stat', props: { value: '100%', label: 'Craft Roasted' } };
        break;
      case 'video':
        newNode = { id, kind: 'video', props: { title: 'Process Overview', alt: 'Behind the scenes roasting process' } };
        break;
      case 'logos':
        newNode = { id, kind: 'logos', props: { items: ['Featured in Roaster Daily', 'Artisan Guild', 'Specialty Coffee Awards'] } };
        break;
      case 'list':
        newNode = { id, kind: 'list', props: { items: ['Fast local delivery', 'Authentic ingredients', 'Crafted with care'] } };
        break;
      case 'card':
        newNode = {
          id, kind: 'card', props: {},
          children: [
            { id: `${id}-h`, kind: 'heading', props: { text: 'Card Highlight', level: 3 } },
            { id: `${id}-t`, kind: 'text', props: { text: 'Brief feature or product overview.' } },
          ],
        };
        break;
      case 'divider':
        newNode = { id, kind: 'divider', props: {} };
        break;
      case 'spacer':
        newNode = { id, kind: 'spacer', props: {} };
        break;
      default:
        newNode = { id, kind: 'text', props: { text: 'New block content' } };
    }
    await applyOperations([{ op: 'add_node', parent: activeSection.id, node: newNode }], `Add ${kind} to ${activeSection.id}`);
    setBlockModalOpen(false);
  }, [activeSection, applyOperations, assets, site]);

  const saveNodeEdit = useCallback(async () => {
    if (!selectedNodeId || !site) return;
    let ops: PatchOperation[] = [];
    if (nodeEditKind === 'heading') {
      ops = [
        { op: 'set_text', target: selectedNodeId, value: nodeEditText },
        { op: 'set_props', target: selectedNodeId, value: { level: nodeEditLevel } },
      ];
    } else if (nodeEditKind === 'text') {
      ops = [{ op: 'set_text', target: selectedNodeId, value: nodeEditText }];
    } else if (nodeEditKind === 'button' || nodeEditKind === 'buttons') {
      ops = [{ op: 'set_props', target: selectedNodeId, value: { label: nodeEditText, text: nodeEditText, href: nodeEditHref, variant: nodeEditVariant } }];
    } else if (nodeEditKind === 'image') {
      ops = [{ op: 'set_props', target: selectedNodeId, value: { asset: nodeEditAsset, alt: nodeEditText } }];
    } else if (nodeEditKind === 'quote') {
      ops = [{ op: 'set_props', target: selectedNodeId, value: { text: nodeEditText, quote: nodeEditText, author: nodeEditSubtext } }];
    } else if (nodeEditKind === 'stat') {
      ops = [{ op: 'set_props', target: selectedNodeId, value: { value: nodeEditText, label: nodeEditSubtext } }];
    } else if (nodeEditKind === 'video') {
      ops = [{ op: 'set_props', target: selectedNodeId, value: { title: nodeEditText, alt: nodeEditText } }];
    }
    await applyOperations(ops, `Update ${selectedNodeId}`);
    setEditNodeModalOpen(false);
  }, [applyOperations, nodeEditAsset, nodeEditHref, nodeEditKind, nodeEditLevel, nodeEditSubtext, nodeEditText, nodeEditVariant, selectedNodeId, site]);

  const openNodeEditor = useCallback((node: Node) => {
    setSelectedNodeId(node.id);
    setNodeEditKind(node.kind);
    setNodeEditText(String(node.props.text || node.props.label || node.props.alt || node.props.quote || node.props.value || ''));
    setNodeEditSubtext(String(node.props.author || node.props.citation || node.props.label || ''));
    setNodeEditLevel(Number(node.props.level) || 2);
    setNodeEditHref(String(node.props.href || ''));
    setNodeEditVariant((node.props.variant as 'primary' | 'secondary' | 'outline') || 'primary');
    setNodeEditAsset(String(node.props.asset || ''));
    setEditNodeModalOpen(true);
  }, []);

  // Theme & Token Application
  const applyThemePreset = useCallback(async (presetId: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset || !site) return;
    const ops: PatchOperation[] = [
      { op: 'set_token', token: 'token:color.canvas', value: preset.canvas },
      { op: 'set_token', token: 'token:color.ink', value: preset.ink },
      { op: 'set_token', token: 'token:color.accent', value: preset.accent },
      { op: 'set_token', token: 'token:color.accentink', value: preset.accentink },
      { op: 'set_token', token: 'token:color.surface', value: preset.surface },
      { op: 'set_token', token: 'token:color.border', value: preset.border },
      { op: 'set_token', token: 'token:color.muted', value: preset.muted },
    ];
    await applyOperations(ops, `Apply theme preset ${preset.name}`);
  }, [applyOperations, site]);

  // Asset Management Actions
  const approveAsset = useCallback(async (asset: AssetSummary, approved: boolean) => {
    if (!siteId || !site) return;
    await applyOperations([
      { op: 'set_asset_rights', target: asset.id, value: { approved } },
    ], approved ? `Approved asset ${asset.id}` : `Revoked approval for ${asset.id}`);
  }, [applyOperations, site, siteId]);

  const illustrate = useCallback(async () => {
    if (!siteId || !illustration.trim()) return;
    await run(() => harness.site.assetGenerate(slug, siteId, illustration.trim()), 'Illustration generated. Approve its rights before publishing.');
    if (!closed.current) setIllustration('');
  }, [illustration, run, siteId, slug]);

  const uploadSimulatedAsset = useCallback(async () => {
    if (!siteId || !uploadAlt.trim()) return;
    const assetId = `img-${Date.now().toString(36)}`;
    const mockData = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMxNTdhOCIvPjwvc3ZnPg==';
    await run(() => harness.site.assetUpload(slug, {
      siteId,
      mime: 'image/svg+xml',
      kind: 'image',
      data: mockData,
      alt: uploadAlt.trim(),
      rights: { source: 'Workspace Studio', license: 'Owned', approved: true },
    }), 'Asset uploaded and approved.');
    if (!closed.current) setUploadAlt('');
  }, [run, siteId, slug, uploadAlt]);

  // Design Markdown Import
  const importDesign = useCallback(async () => {
    if (!siteId || !designDraft.trim()) return;
    const imported = await run(() => harness.site.designImport(slug, siteId, designDraft), '');
    if (!imported || closed.current) return;
    setDecisions(imported.decisions);
    setDesignDraft(imported.designMarkdown);
    setMessage(imported.decisions.length
      ? `Design imported with ${imported.decisions.length} recorded decision${imported.decisions.length === 1 ? '' : 's'}.`
      : 'Design imported.');
    setFailed(false);
  }, [designDraft, run, siteId, slug]);

  // Publishing Pipeline Actions
  const compile = useCallback(async () => {
    if (!siteId || !site) return;
    const compiled = await run(() => harness.site.compile(slug, siteId), '');
    if (!compiled || closed.current) return;
    const checked = await run(() => harness.site.checks(slug, siteId, compiled.releaseId), '');
    if (closed.current) return;
    const blocking = checked?.checks?.blocking.length ?? 0;
    setCandidate({
      releaseId: compiled.releaseId,
      hash: compiled.hash,
      previewUrl: compiled.previewUrl ? `${HARNESS_URL}${compiled.previewUrl}` : null,
      checks: checked?.checks ?? null,
      revision: site.revision,
    });
    setMessage(blocking
      ? `${blocking} blocking check${blocking === 1 ? '' : 's'} must be resolved before publishing.`
      : 'Candidate passed blocking checks. Review and confirm facts to publish.');
    setFailed(blocking > 0);
  }, [run, site, siteId, slug]);

  const publish = useCallback(async () => {
    if (!siteId || !candidate) return;
    if ((candidate.checks?.blocking.length ?? 0) > 0) {
      setMessage('Resolve blocking checks and compile again.');
      setFailed(true);
      return;
    }
    if (!reviewed) {
      setMessage('Confirm that you reviewed the factual content and this candidate.');
      setFailed(true);
      return;
    }
    const published = await run(() => harness.site.publish(slug, siteId, candidate.releaseId, candidate.hash), 'Published live! Visitors can now view your site.');
    if (published && !closed.current) {
      setCandidate(null);
      setReviewed(false);
    }
  }, [candidate, reviewed, run, siteId, slug]);

  const rollback = useCallback(async (releaseId: string) => {
    if (!siteId) return;
    await run(() => harness.site.rollback(slug, siteId, releaseId), 'Retained release restored and live.');
  }, [run, siteId, slug]);

  const refreshPublic = useCallback(async () => {
    if (!siteId) return;
    const refreshed = await run(() => harness.site.refresh(slug, siteId));
    if (refreshed && !closed.current) {
      setMessage(`Public data refreshed from published release (${refreshed.itemCount} item${refreshed.itemCount === 1 ? '' : 's'}).`);
    }
  }, [run, siteId, slug]);

  const unpublish = useCallback(() => {
    if (!siteId) return;
    const detail = 'Visitors stop receiving this site. The draft and retained releases stay available.';
    const act = async () => {
      await run(() => harness.site.unpublish(slug, siteId), 'Unpublished. Public serving blocked.');
      if (!closed.current) setCandidate(null);
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Unpublish site?\n\n${detail}`)) void act();
      return;
    }
    Alert.alert('Unpublish site?', detail, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unpublish', style: 'destructive', onPress: () => { void act(); } },
    ]);
  }, [run, siteId, slug]);

  // Computed Token Colors for Preview
  const colors = useMemo(() => ({
    canvas: site?.design?.color?.canvas || '#ffffff',
    ink: site?.design?.color?.ink || '#0f172a',
    accent: site?.design?.color?.accent || '#2563eb',
    accentink: site?.design?.color?.accentink || '#ffffff',
    surface: site?.design?.color?.surface || '#f8fafc',
    border: site?.design?.color?.border || '#e2e8f0',
    muted: site?.design?.color?.muted || '#64748b',
    success: site?.design?.color?.success || '#16a34a',
  }), [site]);

  const frameWidth = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    if (frame === 'phone') return Math.min(360, screenWidth - 32);
    if (frame === 'tablet') return Math.min(680, screenWidth - 32);
    return Math.min(960, screenWidth - 32);
  }, [frame]);

  const blockingCount = candidate?.checks?.blocking.length ?? 0;
  const advisoryCount = candidate?.checks?.advisory.length ?? 0;
  const candidateFresh = candidate !== null && site !== null && candidate.revision === site.revision;

  // Visual Node Renderer for Live Preview
  const renderVisualNode = (node: Node, sectionToneBg: string, sectionToneText: string) => {
    const isSelected = selectedNodeId === node.id;
    const isNodeLocked = locked.has(node.id);

    switch (node.kind) {
      case 'heading': {
        const level = Number(node.props.level) || 2;
        const fontSize = level === 1 ? 24 : level === 2 ? 19 : 16;
        const headingText = String(node.props.text || 'Heading');
        return (
          <TouchableOpacity
            key={node.id}
            activeOpacity={0.8}
            onPress={() => openNodeEditor(node)}
            style={[styles.nodeWrap, isSelected && styles.nodeSelected]}
          >
            <Text style={[styles.visualHeading, { fontSize, color: sectionToneText, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }) }]}>
              {headingText}
            </Text>
            {isNodeLocked ? <Ionicons name="lock-closed" size={12} color="#b45309" style={styles.lockBadge} /> : null}
          </TouchableOpacity>
        );
      }
      case 'text': {
        const textContent = String(node.props.text || '');
        return (
          <TouchableOpacity
            key={node.id}
            activeOpacity={0.8}
            onPress={() => openNodeEditor(node)}
            style={[styles.nodeWrap, isSelected && styles.nodeSelected]}
          >
            <Text style={[styles.visualText, { color: sectionToneText }]}>
              {textContent}
            </Text>
          </TouchableOpacity>
        );
      }
      case 'button':
      case 'buttons': {
        const label = String(node.props.label || node.props.text || 'Action');
        const variant = String(node.props.variant || 'primary');
        const btnBg = variant === 'secondary' ? colors.surface : variant === 'outline' ? 'transparent' : colors.accent;
        const btnTextColor = variant === 'secondary' ? colors.ink : variant === 'outline' ? colors.accent : colors.accentink;
        const btnBorderColor = variant === 'outline' ? colors.accent : variant === 'secondary' ? colors.border : 'transparent';
        return (
          <TouchableOpacity
            key={node.id}
            activeOpacity={0.8}
            onPress={() => openNodeEditor(node)}
            style={[styles.visualButton, { backgroundColor: btnBg, borderColor: btnBorderColor }, isSelected && styles.nodeSelected]}
          >
            <Text style={[styles.visualButtonText, { color: btnTextColor }]}>{label}</Text>
          </TouchableOpacity>
        );
      }
      case 'quote': {
        const quoteText = String(node.props.text || node.props.quote || 'Inspiring quote or customer testimonial');
        const author = String(node.props.author || node.props.citation || '');
        return (
          <TouchableOpacity
            key={node.id}
            activeOpacity={0.8}
            onPress={() => openNodeEditor(node)}
            style={[styles.visualQuoteCard, { borderColor: colors.accent, backgroundColor: colors.surface }, isSelected && styles.nodeSelected]}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.accent} style={{ marginBottom: 4 }} />
            <Text style={[styles.visualQuoteText, { color: colors.ink }]}>"{quoteText}"</Text>
            {author ? (
              <Text style={[styles.visualQuoteAuthor, { color: colors.muted }]}>— {author}</Text>
            ) : null}
            {isNodeLocked ? <Ionicons name="lock-closed" size={12} color="#b45309" style={styles.lockBadge} /> : null}
          </TouchableOpacity>
        );
      }
      case 'stat': {
        const value = String(node.props.value || '100%');
        const label = String(node.props.label || node.props.text || 'Metric');
        return (
          <TouchableOpacity
            key={node.id}
            activeOpacity={0.8}
            onPress={() => openNodeEditor(node)}
            style={[styles.visualStatCard, { backgroundColor: colors.surface, borderColor: colors.border }, isSelected && styles.nodeSelected]}
          >
            <Text style={[styles.visualStatValue, { color: colors.accent }]}>{value}</Text>
            <Text style={[styles.visualStatLabel, { color: colors.muted }]}>{label}</Text>
          </TouchableOpacity>
        );
      }
      case 'video': {
        const title = String(node.props.title || 'Video');
        const alt = String(node.props.alt || title);
        return (
          <TouchableOpacity
            key={node.id}
            activeOpacity={0.8}
            onPress={() => openNodeEditor(node)}
            style={[styles.visualVideoCard, { backgroundColor: colors.surface, borderColor: colors.border }, isSelected && styles.nodeSelected]}
          >
            <View style={[styles.videoPlayCircle, { backgroundColor: colors.accent }]}>
              <Ionicons name="play" size={20} color={colors.accentink} style={{ marginLeft: 2 }} />
            </View>
            <Text style={[styles.visualImageAlt, { color: colors.muted }]} numberOfLines={2}>{alt}</Text>
            <View style={styles.videoBadge}>
              <Text style={styles.videoBadgeText}>HD Video</Text>
            </View>
          </TouchableOpacity>
        );
      }
      case 'logos': {
        const items = Array.isArray(node.props.items) ? (node.props.items as string[]) : ['Acme', 'Nordic', 'Vanguard', 'Apex'];
        return (
          <View key={node.id} style={styles.visualLogosStrip}>
            {items.map((logo, idx) => (
              <View key={`${node.id}-${idx}`} style={[styles.logoItemBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.logoItemText, { color: colors.muted }]}>{String(logo)}</Text>
              </View>
            ))}
          </View>
        );
      }
      case 'image': {
        const assetId = String(node.props.asset || '');
        const asset = assets.find((a) => a.id === assetId);
        const alt = String(node.props.alt || asset?.alt || 'Image');
        return (
          <TouchableOpacity
            key={node.id}
            activeOpacity={0.8}
            onPress={() => openNodeEditor(node)}
            style={[styles.visualImageCard, { backgroundColor: colors.surface, borderColor: colors.border }, isSelected && styles.nodeSelected]}
          >
            <Ionicons name="image-outline" size={32} color={colors.accent} />
            <Text style={[styles.visualImageAlt, { color: colors.muted }]} numberOfLines={2}>{alt}</Text>
            {asset?.rights.approved ? (
              <View style={styles.approvedBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                <Text style={styles.approvedText}>Approved media</Text>
              </View>
            ) : (
              <View style={styles.unapprovedBadge}>
                <Ionicons name="alert-circle" size={12} color="#b45309" />
                <Text style={styles.unapprovedText}>Needs approval</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      }
      case 'list': {
        const items = Array.isArray(node.props.items) ? (node.props.items as string[]) : [];
        return (
          <View key={node.id} style={styles.visualList}>
            {items.map((item, idx) => (
              <View key={`${node.id}-${idx}`} style={styles.visualListItem}>
                <Ionicons name="checkmark" size={14} color={colors.accent} style={{ marginTop: 2 }} />
                <Text style={[styles.visualListText, { color: sectionToneText }]}>{String(item)}</Text>
              </View>
            ))}
          </View>
        );
      }
      case 'card': {
        const children = node.children || [];
        return (
          <View key={node.id} style={[styles.visualCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {children.map((child) => renderVisualNode(child, colors.surface, colors.ink))}
          </View>
        );
      }
      case 'stack':
      case 'flex':
      case 'grid': {
        const children = node.children || [];
        const isButtonsOnly = children.length > 0 && children.every((c) => c.kind === 'button' || c.kind === 'buttons');
        return (
          <View
            key={node.id}
            style={[
              styles.visualFlexContainer,
              isButtonsOnly && styles.visualButtonGroup,
            ]}
          >
            {children.map((child) => renderVisualNode(child, sectionToneBg, sectionToneText))}
          </View>
        );
      }
      case 'collection': {
        const title = String(node.props.title || 'Collection');
        const items = Array.isArray(node.props.items) ? (node.props.items as { title?: string; name?: string; price?: number; currency?: string; description?: string }[]) : [];
        return (
          <View key={node.id} style={styles.visualCollection}>
            {title ? <Text style={[styles.visualHeading, { fontSize: 18, color: sectionToneText }]}>{title}</Text> : null}
            <View style={styles.visualCollectionGrid}>
              {items.map((item, index) => (
                <View key={`${node.id}-${index}`} style={[styles.visualProductCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.visualProductHeader}>
                    <Text style={[styles.visualProductTitle, { color: colors.ink }]}>{item.title || item.name || 'Offering'}</Text>
                    {item.price !== undefined ? (
                      <Text style={[styles.visualProductPrice, { color: colors.accent }]}>
                        {formatMoney(item.price, item.currency || site?.currency || 'USD')}
                      </Text>
                    ) : null}
                  </View>
                  {item.description ? (
                    <Text style={[styles.visualProductDesc, { color: colors.muted }]} numberOfLines={2}>{item.description}</Text>
                  ) : null}
                  <View style={[styles.visualButton, { backgroundColor: colors.accent, paddingVertical: 6, marginTop: 8 }]}>
                    <Text style={[styles.visualButtonText, { color: colors.accentink, fontSize: 12 }]}>Order</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        );
      }
      case 'accordion': {
        const children = node.children || [];
        return (
          <View key={node.id} style={styles.visualAccordion}>
            {children.map((child) => {
              const label = String(child.props.label || 'Details');
              const isOpen = Boolean(expandedAccordions[child.id]);
              return (
                <View key={child.id} style={[styles.accordionItem, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <TouchableOpacity
                    onPress={() => setExpandedAccordions((prev) => ({ ...prev, [child.id]: !prev[child.id] }))}
                    style={styles.accordionHeader}
                  >
                    <Text style={[styles.accordionTitle, { color: colors.ink }]}>{label}</Text>
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
                  </TouchableOpacity>
                  {isOpen ? (
                    <View style={styles.accordionBody}>
                      {(child.children || []).map((grandChild) => renderVisualNode(grandChild, colors.surface, colors.ink))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      }
      case 'tabs': {
        const children = node.children || [];
        const activeIndex = activeTabIndices[node.id] || 0;
        const activeTabChild = children[activeIndex] || children[0];
        return (
          <View key={node.id} style={styles.visualTabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
              {children.map((child, idx) => (
                <TouchableOpacity
                  key={child.id}
                  onPress={() => setActiveTabIndices((prev) => ({ ...prev, [node.id]: idx }))}
                  style={[styles.tabButton, activeIndex === idx && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
                >
                  <Text style={[styles.tabButtonText, { color: activeIndex === idx ? colors.accent : colors.muted }]}>
                    {String(child.props.label || `Tab ${idx + 1}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {activeTabChild ? (
              <View style={styles.tabContent}>
                {(activeTabChild.children || []).map((grandChild) => renderVisualNode(grandChild, sectionToneBg, sectionToneText))}
              </View>
            ) : null}
          </View>
        );
      }
      case 'search': {
        return (
          <View key={node.id} style={[styles.visualSearchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={16} color={colors.muted} />
            <TextInput
              value={searchFilter}
              onChangeText={setSearchFilter}
              placeholder={String(node.props.placeholder || 'Search products & items...')}
              placeholderTextColor={colors.muted}
              style={[styles.visualSearchInput, { color: colors.ink }]}
            />
          </View>
        );
      }
      case 'form': {
        const journeyId = String(node.props.journey || 'enquiry');
        const journey = site?.journeys?.find((j) => j.id === journeyId) || site?.journeys?.[0];
        return (
          <View key={node.id} style={[styles.visualForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.visualHeading, { fontSize: 16, color: colors.ink }]}>{journey?.title || 'Contact & Enquiry'}</Text>
            {(journey?.fields || []).map((f) => (
              <View key={f.key} style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.ink }]}>{f.label}{f.required ? ' *' : ''}</Text>
                <View style={[styles.formInputMock, { borderColor: colors.border, backgroundColor: colors.canvas }]}>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>Enter {f.label.toLowerCase()}...</Text>
                </View>
              </View>
            ))}
            <View style={[styles.visualButton, { backgroundColor: colors.accent }]}>
              <Text style={[styles.visualButtonText, { color: colors.accentink }]}>{String(node.props.submitLabel || 'Submit')}</Text>
            </View>
          </View>
        );
      }
      case 'divider':
        return <View key={node.id} style={[styles.visualDivider, { backgroundColor: colors.border }]} />;
      case 'spacer':
        return <View key={node.id} style={{ height: 24 }} />;
      default:
        return null;
    }
  };

  // Section Visual Container
  const renderVisualSection = (section: Section) => {
    const isSelected = selectedSectionId === section.id;
    const isLocked = locked.has(section.id);
    const styleBase = (section.style?.base || {}) as Style;
    const bgToken = styleBase.background || 'token:color.canvas';
    const textToken = styleBase.color || 'token:color.ink';

    const bg = bgToken.includes('ink') ? colors.ink
      : bgToken.includes('surface') ? colors.surface
      : bgToken.includes('accent') ? colors.accent
      : colors.canvas;

    const textColor = textToken.includes('canvas') ? colors.canvas
      : textToken.includes('accentink') ? colors.accentink
      : bgToken.includes('ink') ? '#f8fafc'
      : colors.ink;

    const baseColumns = section.layout?.columns || 1;
    const mobileColumns = section.style?.small?.columns;
    const columns = frame === 'phone' ? (mobileColumns !== undefined ? mobileColumns : 1) : baseColumns;
    const isGrid = section.layout?.kind === 'grid' || columns > 1;

    const padSetting = (frame === 'phone' && section.style?.small?.pad) ? section.style.small.pad : (styleBase.pad || 'md');
    const padVertical = padSetting === 'none' ? 6 : padSetting === 'sm' ? 12 : padSetting === 'lg' ? 32 : padSetting === 'xl' ? 48 : 20;

    return (
      <View key={section.id} style={[styles.sectionContainer, isSelected && styles.sectionSelected]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            setSelectedSectionId(section.id === selectedSectionId ? null : section.id);
            setSelectedNodeId(null);
          }}
          style={[styles.sectionCanvas, { backgroundColor: bg, borderColor: isSelected ? colors.accent : colors.border, paddingVertical: padVertical }]}
        >
          {/* Section Toolbar when Selected */}
          {isSelected ? (
            <View style={styles.selectedSectionHeader}>
              <View style={styles.sectionBadge}>
                <Ionicons name="sparkles" size={12} color="#1d4ed8" />
                <Text style={styles.sectionBadgeText}>{section.purpose.toUpperCase()} · {section.id}</Text>
              </View>
              <View style={styles.sectionQuickActions}>
                <TouchableOpacity onPress={() => void toggleLock(section.id, 'section')} style={styles.quickActionBtn}>
                  <Ionicons name={isLocked ? 'lock-closed' : 'lock-open-outline'} size={14} color={isLocked ? '#b45309' : '#475569'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void moveSection(section.id, 'up')} style={styles.quickActionBtn}>
                  <Ionicons name="arrow-up" size={14} color="#475569" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void moveSection(section.id, 'down')} style={styles.quickActionBtn}>
                  <Ionicons name="arrow-down" size={14} color="#475569" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setBlockModalOpen(true)} style={[styles.quickActionBtn, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="add" size={14} color="#1d4ed8" />
                  <Text style={styles.quickActionLabel}>Block</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void deleteSection(section.id)} style={[styles.quickActionBtn, { backgroundColor: '#fef2f2' }]}>
                  <Ionicons name="trash-outline" size={14} color="#b91c1c" />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* Render Nodes within Section */}
          <View style={[styles.sectionNodesWrap, isGrid && { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }]}>
            {section.nodes.map((node) => (
              <View key={node.id} style={isGrid ? { width: `${100 / columns - 3}%` } : undefined}>
                {renderVisualNode(node, bg, textColor)}
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onShow={openSheet} onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
        {/* Studio Top Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Site Studio</Text>
              <View style={[styles.statusPill, snapshot?.publicationState === 'active' ? styles.statusPillLive : styles.statusPillDraft]}>
                <View style={[styles.statusDot, snapshot?.publicationState === 'active' ? styles.statusDotLive : styles.statusDotDraft]} />
                <Text style={styles.statusPillText}>
                  {snapshot?.publicationState === 'active' ? 'Live' : site ? `Draft · rev ${site.revision}` : 'Not created'}
                </Text>
              </View>
            </View>
            <Text style={styles.subtitle}>{workspaceName || 'Workspace'} · {slug}.workers.dev</Text>
          </View>

          <View style={styles.headerActions}>
            {site && (snapshot?.history?.length ?? 0) > 0 ? (
              <TouchableOpacity
                accessibilityLabel="Undo last change"
                onPress={() => void undo()}
                disabled={busy}
                style={styles.headerIconBtn}
              >
                <Ionicons name="arrow-undo-outline" size={18} color="#0f172a" />
              </TouchableOpacity>
            ) : null}

            {busy ? <ActivityIndicator size="small" color="#0f172a" style={{ marginLeft: 6 }} /> : null}

            <TouchableOpacity accessibilityLabel="Close Site Studio" onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation */}
        {site ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsRow}>
            {TABS.map((entry) => (
              <TouchableOpacity
                key={entry.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === entry.key }}
                onPress={() => setTab(entry.key)}
                style={[styles.tab, tab === entry.key && styles.tabActive]}
              >
                <Ionicons name={entry.icon} size={14} color={tab === entry.key ? '#0f172a' : '#64748b'} style={{ marginRight: 5 }} />
                <Text style={[styles.tabText, tab === entry.key && styles.tabTextActive]}>{entry.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        {/* Studio Body Content */}
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!site ? (
            <View style={styles.createSiteForm}>
              <Text style={styles.createTitle}>Describe your site</Text>
              <TextInput
                style={styles.createInput}
                value={brief}
                onChangeText={setBrief}
                placeholder="e.g. Specialty pet store in Tokyo with organic treats and accessories"
                placeholderTextColor="#94A3B8"
                multiline
                editable={!busy}
                autoFocus
              />
              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy || !brief.trim()}
                onPress={() => void generate()}
                style={[styles.createSubmitBtn, (busy || !brief.trim()) && styles.disabled]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.createSubmitText}>Create site draft</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {/* TAB 1: LIVE VISUAL PREVIEW */}
          {site && tab === 'preview' ? (
            <View style={styles.previewViewContainer}>
              {/* Preview Controls Bar: Centered Viewport Frame Switcher */}
              <View style={styles.previewControlsBar}>
                <View style={styles.framePicker}>
                  {(['phone', 'tablet', 'desktop'] as const).map((f) => (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setFrame(f)}
                      style={[styles.frameBtn, frame === f && styles.frameBtnActive]}
                    >
                      <Ionicons
                        name={f === 'phone' ? 'phone-portrait-outline' : f === 'tablet' ? 'tablet-portrait-outline' : 'desktop-outline'}
                        size={14}
                        color={frame === f ? '#0f172a' : '#64748b'}
                      />
                      <Text style={[styles.frameBtnText, frame === f && styles.frameBtnTextActive]}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Responsive Visual Canvas Frame */}
              <View style={styles.canvasWrapper}>
                <View style={[styles.canvasFrame, { width: frameWidth }]}>
                  {/* Site Header / Nav Frame */}
                  <View style={[styles.visualHeader, { backgroundColor: colors.canvas, borderColor: colors.border }]}>
                    <Text style={[styles.visualBrand, { color: colors.ink }]}>{activePage?.title || workspaceName || 'TAR'}</Text>
                    <View style={styles.visualNavLinks}>
                      {site.pages.map((p) => (
                        <TouchableOpacity key={p.id} onPress={() => setActivePageId(p.id)}>
                          <Text style={[styles.visualNavLink, { color: activePageId === p.id ? colors.accent : colors.muted }]}>
                            {p.title || p.path}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Sections List */}
                  {activePage?.sections.map((section) => renderVisualSection(section))}

                  {/* Site Footer Frame */}
                  <View style={[styles.visualFooter, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.visualFooterText, { color: colors.muted }]}>
                      © {new Date().getFullYear()} {workspaceName || 'TAR'}. Built with TAR AI Sites.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          {/* TAB 2: JEV PROMPT */}
          {site && tab === 'ask' ? (
            <>
              <View style={styles.card}>
                <Text style={styles.eyebrow}>PROMPT EDIT</Text>

                {/* Scope selector */}
                <View style={styles.segmentedRow}>
                  {(['section', 'page', 'site'] as const).map((sc) => (
                    <TouchableOpacity
                      key={sc}
                      onPress={() => setPromptScope(sc)}
                      style={[styles.segmentBtn, promptScope === sc && styles.segmentBtnActive]}
                    >
                      <Text style={[styles.segmentBtnText, promptScope === sc && styles.segmentBtnTextActive]}>
                        {sc === 'section' ? (selectedSectionId ? `Section (${selectedSectionId})` : 'Selected Section') : sc === 'page' ? 'Current Page' : 'Whole Site'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.input}
                  value={command}
                  onChangeText={setCommand}
                  placeholder="Describe a change (e.g. Image left, text right, more breathing room)..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  editable={!busy}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={busy || !command.trim()}
                  onPress={() => void ask()}
                  style={[styles.publishBtn, (busy || !command.trim()) && styles.disabled]}
                >
                  <Ionicons name="sparkles" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.publishBtnText}>Propose change</Text>
                </TouchableOpacity>
              </View>

              {proposal ? (
                <View style={[styles.card, styles.proposalCard]}>
                  <Text style={styles.eyebrow}>PROPOSED PATCH</Text>
                  <Text style={styles.cardTitle}>{proposal.summary || 'Resolved change'}</Text>
                  <Text style={styles.body}>
                    Target: {proposal.target || 'Resolved'} {proposal.targetKind ? `(${proposal.targetKind})` : ''} · Base revision {proposal.base}
                  </Text>
                  {proposal.questions.map((q) => (
                    <View key={q} style={styles.questionNotice}>
                      <Ionicons name="help-circle-outline" size={16} color="#b45309" />
                      <Text style={styles.questionText}>{q}</Text>
                    </View>
                  ))}
                  {proposal.operations.map((op, idx) => (
                    <View key={`${op.op}-${idx}`} style={styles.opRow}>
                      <Text style={styles.codeText}>{op.op}: {JSON.stringify(op).slice(0, 160)}</Text>
                    </View>
                  ))}
                  {proposal.operations.length ? (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        disabled={busy}
                        onPress={() => void applyProposal()}
                        style={[styles.publishBtn, busy && styles.disabled]}
                      >
                        <Text style={styles.publishBtnText}>Apply {proposal.operations.length} change{proposal.operations.length === 1 ? '' : 's'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setProposal(null)} style={styles.cancelBtn}>
                        <Text style={styles.cancelBtnText}>Discard</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {diff.length ? (
                <View style={styles.card}>
                  <Text style={styles.eyebrow}>LAST APPLIED DIFF</Text>
                  {diff.slice(0, 10).map((d, i) => (
                    <Text key={`${d.target}-${i}`} style={styles.codeText}>
                      {d.target} · {d.kind}: {d.from || '—'} → {d.to || '—'}
                    </Text>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          {/* TAB 3: SECTION INSPECTOR & BLOCK MANAGER */}
          {site && tab === 'inspect' ? (
            <>
              {/* Section Selector */}
              <View style={styles.card}>
                <Text style={styles.eyebrow}>SECTIONS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentedRow}>
                  {activePage?.sections.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setSelectedSectionId(s.id)}
                      style={[styles.segmentBtn, { flex: 0, paddingHorizontal: 12 }, selectedSectionId === s.id && styles.segmentBtnActive]}
                    >
                      <Text style={[styles.segmentBtnText, selectedSectionId === s.id && styles.segmentBtnTextActive]}>
                        {s.purpose} ({s.id})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {activeSection ? (
                <View style={styles.card}>
                  <View style={styles.inspectorHeader}>
                    <Text style={styles.cardTitle}>{activeSection.purpose.toUpperCase()} · {activeSection.id}</Text>
                    <TouchableOpacity onPress={() => void toggleLock(activeSection.id, 'section')} style={styles.lockBtn}>
                      <Ionicons name={locked.has(activeSection.id) ? 'lock-closed' : 'lock-open-outline'} size={18} color={locked.has(activeSection.id) ? '#b45309' : '#64748b'} />
                      <Text style={styles.lockBtnText}>{locked.has(activeSection.id) ? 'Locked' : 'Unlocked'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Tone Picker */}
                  <Text style={styles.fieldHeading}>SECTION TONE / COLOR</Text>
                  <View style={styles.toneGrid}>
                    {(['canvas', 'surface', 'ink', 'accent'] as const).map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => void setSectionTone(activeSection.id, t)}
                        style={[styles.toneBtn, { backgroundColor: t === 'canvas' ? colors.canvas : t === 'surface' ? colors.surface : t === 'ink' ? colors.ink : colors.accent }]}
                      >
                        <Text style={[styles.toneBtnText, { color: t === 'ink' ? '#ffffff' : t === 'accent' ? colors.accentink : colors.ink }]}>
                          {t.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Columns & Layout */}
                  <Text style={styles.fieldHeading}>COLUMNS & LAYOUT</Text>
                  <View style={styles.columnsRow}>
                    {[1, 2, 3, 4].map((col) => (
                      <TouchableOpacity
                        key={col}
                        onPress={() => void setSectionColumns(activeSection.id, col)}
                        style={[styles.columnBtn, (activeSection.layout.columns || 1) === col && styles.columnBtnActive]}
                      >
                        <Text style={[styles.columnBtnText, (activeSection.layout.columns || 1) === col && styles.columnBtnTextActive]}>
                          {col} {col === 1 ? 'Column' : 'Columns'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Spacing / Padding */}
                  <Text style={styles.fieldHeading}>SPACING & PADDING</Text>
                  <View style={styles.columnsRow}>
                    {(['none', 'sm', 'md', 'lg', 'xl'] as const).map((sp) => (
                      <TouchableOpacity
                        key={sp}
                        onPress={() => void setSectionSpacing(activeSection.id, sp)}
                        style={[styles.columnBtn, ((activeSection.style?.base?.pad || 'md') === sp) && styles.columnBtnActive]}
                      >
                        <Text style={[styles.columnBtnText, ((activeSection.style?.base?.pad || 'md') === sp) && styles.columnBtnTextActive]}>
                          {sp.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Mobile Responsive Rules */}
                  <Text style={styles.fieldHeading}>MOBILE RESPONSIVE LAYOUT</Text>
                  <View style={styles.columnsRow}>
                    <TouchableOpacity
                      onPress={() => void setSectionMobileColumns(activeSection.id, 1)}
                      style={[styles.columnBtn, (activeSection.style?.small?.columns === 1 || activeSection.style?.small?.columns === undefined) && styles.columnBtnActive]}
                    >
                      <Text style={[styles.columnBtnText, (activeSection.style?.small?.columns === 1 || activeSection.style?.small?.columns === undefined) && styles.columnBtnTextActive]}>
                        Stack (1 Col)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => void setSectionMobileColumns(activeSection.id, 2)}
                      style={[styles.columnBtn, activeSection.style?.small?.columns === 2 && styles.columnBtnActive]}
                    >
                      <Text style={[styles.columnBtnText, activeSection.style?.small?.columns === 2 && styles.columnBtnTextActive]}>
                        2 Columns
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.fieldHeading}>MOBILE SPACING OVERRIDE</Text>
                  <View style={styles.columnsRow}>
                    {(['none', 'sm', 'md', 'lg'] as const).map((sp) => (
                      <TouchableOpacity
                        key={`m-${sp}`}
                        onPress={() => void setSectionMobileSpacing(activeSection.id, sp)}
                        style={[styles.columnBtn, ((activeSection.style?.small?.pad || 'none') === sp) && styles.columnBtnActive]}
                      >
                        <Text style={[styles.columnBtnText, ((activeSection.style?.small?.pad || 'none') === sp) && styles.columnBtnTextActive]}>
                          {sp.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Blocks List in Section */}
                  <View style={styles.blocksHeader}>
                    <Text style={styles.fieldHeading}>BLOCKS ({activeSection.nodes.length})</Text>
                    <TouchableOpacity onPress={() => setBlockModalOpen(true)} style={styles.addBlockBtn}>
                      <Ionicons name="add" size={16} color="#1d4ed8" />
                      <Text style={styles.addBlockBtnText}>Insert block</Text>
                    </TouchableOpacity>
                  </View>

                  {activeSection.nodes.map((n, idx) => (
                    <View key={n.id} style={styles.blockRow}>
                      <View style={styles.blockRowInfo}>
                        <Text style={styles.blockKindBadge}>{n.kind.toUpperCase()}</Text>
                        <Text style={styles.blockRowTitle} numberOfLines={1}>
                          {String(n.props.text || n.props.label || n.props.alt || n.id)}
                        </Text>
                      </View>
                      <View style={styles.blockRowActions}>
                        <TouchableOpacity onPress={() => void moveNode(n.id, 'up')} disabled={idx === 0} style={styles.miniBtn}>
                          <Ionicons name="chevron-up" size={16} color={idx === 0 ? '#cbd5e1' : '#475569'} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => void moveNode(n.id, 'down')} disabled={idx === activeSection.nodes.length - 1} style={styles.miniBtn}>
                          <Ionicons name="chevron-down" size={16} color={idx === activeSection.nodes.length - 1 ? '#cbd5e1' : '#475569'} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openNodeEditor(n)} style={styles.miniBtn}>
                          <Ionicons name="pencil-outline" size={15} color="#1d4ed8" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => void deleteNode(n.id)} style={styles.miniBtn}>
                          <Ionicons name="trash-outline" size={15} color="#b91c1c" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.body}>Select a section above to inspect its layout, tone, and blocks.</Text>
                </View>
              )}
            </>
          ) : null}

          {/* TAB 4: ASSETS & MEDIA */}
          {site && tab === 'assets' ? (
            <>
              {/* AI Illustration Generator */}
              <View style={styles.card}>
                <Text style={styles.eyebrow}>GENERATE ILLUSTRATION</Text>
                <TextInput
                  style={styles.input}
                  value={illustration}
                  onChangeText={setIllustration}
                  placeholder="Describe an illustration (e.g. Minimalist coffee cups on oak wood)..."
                  placeholderTextColor="#94a3b8"
                  editable={!busy}
                />
                <TouchableOpacity
                  disabled={busy || !illustration.trim()}
                  onPress={() => void illustrate()}
                  style={[styles.publishBtn, (busy || !illustration.trim()) && styles.disabled]}
                >
                  <Ionicons name="color-wand-outline" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.publishBtnText}>Generate illustration</Text>
                </TouchableOpacity>
              </View>

              {/* Upload Media Asset */}
              <View style={styles.card}>
                <Text style={styles.eyebrow}>UPLOAD MEDIA ASSET</Text>
                <TextInput
                  style={styles.input}
                  value={uploadAlt}
                  onChangeText={setUploadAlt}
                  placeholder="Asset description and alt text"
                  placeholderTextColor="#94a3b8"
                  editable={!busy}
                />
                <TouchableOpacity
                  disabled={busy || !uploadAlt.trim()}
                  onPress={() => void uploadSimulatedAsset()}
                  style={[styles.actionBtn, (busy || !uploadAlt.trim()) && styles.disabled]}
                >
                  <Ionicons name="cloud-upload-outline" size={15} color="#0f172a" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>Add asset with rights</Text>
                </TouchableOpacity>
              </View>

              {/* Assets Grid */}
              <View style={styles.card}>
                <Text style={styles.eyebrow}>WORKSPACE ASSETS ({assets.length})</Text>
                {assets.length ? assets.map((asset) => (
                  <View key={asset.id} style={styles.assetCard}>
                    <View style={styles.assetHeader}>
                      <Text style={styles.assetTitle}>{asset.id}</Text>
                      <View style={[styles.rightsBadge, asset.rights.approved ? styles.rightsApproved : styles.rightsPending]}>
                        <Text style={[styles.rightsText, asset.rights.approved ? styles.rightsTextApproved : styles.rightsTextPending]}>
                          {asset.rights.approved ? 'Approved for Publish' : 'Unapproved'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.assetMeta}>
                      {asset.kind} · {asset.mime} · {Math.round(asset.bytes / 1024)}KB · {asset.rights.license}
                    </Text>
                    {asset.alt ? <Text style={styles.assetAlt}>Alt: "{asset.alt}"</Text> : <Text style={styles.warningText}>Needs alt text</Text>}
                    <TouchableOpacity
                      onPress={() => void approveAsset(asset, !asset.rights.approved)}
                      style={[styles.linkBtn, { alignSelf: 'flex-start', marginTop: 6 }]}
                    >
                      <Text style={styles.linkBtnText}>
                        {asset.rights.approved ? 'Revoke approval' : 'Approve for publication'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )) : <Text style={styles.body}>No media assets added yet.</Text>}
              </View>
            </>
          ) : null}

          {/* TAB 5: DESIGN TOKENS & DESIGN.MD */}
          {site && tab === 'design' ? (
            <>
              {/* Theme Presets */}
              <View style={styles.card}>
                <Text style={styles.eyebrow}>THEME PRESETS</Text>
                <View style={styles.presetGrid}>
                  {THEME_PRESETS.map((preset) => (
                    <TouchableOpacity
                      key={preset.id}
                      onPress={() => void applyThemePreset(preset.id)}
                      style={styles.presetCard}
                    >
                      <View style={styles.presetPalette}>
                        <View style={[styles.presetSwatch, { backgroundColor: preset.canvas }]} />
                        <View style={[styles.presetSwatch, { backgroundColor: preset.ink }]} />
                        <View style={[styles.presetSwatch, { backgroundColor: preset.accent }]} />
                        <View style={[styles.presetSwatch, { backgroundColor: preset.surface }]} />
                      </View>
                      <Text style={styles.presetName}>{preset.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Design.md Specification */}
              <View style={styles.card}>
                <Text style={styles.eyebrow}>DESIGN.MD SPECIFICATION</Text>
                <TextInput
                  style={[styles.input, styles.codeArea]}
                  value={designDraft}
                  onChangeText={setDesignDraft}
                  multiline
                  textAlignVertical="top"
                  editable={!busy}
                />
                <TouchableOpacity
                  disabled={busy || !designDraft.trim()}
                  onPress={() => void importDesign()}
                  style={[styles.publishBtn, (busy || !designDraft.trim()) && styles.disabled]}
                >
                  <Text style={styles.publishBtnText}>Import design.md</Text>
                </TouchableOpacity>
              </View>

              {decisions.length ? (
                <View style={styles.card}>
                  <Text style={styles.eyebrow}>RECORDED PROVENANCE DECISIONS</Text>
                  {decisions.map((d, i) => (
                    <Text key={`${d.question}-${i}`} style={styles.codeText}>
                      {d.area}: {d.question} → {d.choice}
                    </Text>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          {/* TAB 6: PUBLISH PIPELINE & RELEASES */}
          {site && tab === 'release' ? (
            <>
              {snapshot?.publicUrl ? (
                <View style={styles.card}>
                  <Text style={styles.eyebrow}>LIVE PUBLIC ADDRESS</Text>
                  <TouchableOpacity onPress={() => void Linking.openURL(snapshot.publicUrl!).catch(() => undefined)}>
                    <Text style={styles.liveUrlText}>{snapshot.publicUrl}</Text>
                  </TouchableOpacity>
                  <Text style={styles.body}>Live generation: {liveRelease ? liveRelease.slice(0, 14) : 'active'}</Text>
                  <TouchableOpacity onPress={unpublish} style={[styles.linkBtn, { marginTop: 8 }]}>
                    <Text style={[styles.linkBtnText, { color: '#b91c1c' }]}>Unpublish site</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.card}>
                <Text style={styles.eyebrow}>PUBLISH PIPELINE</Text>
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    disabled={busy}
                    onPress={() => void compile()}
                    style={[styles.publishBtn, busy && styles.disabled]}
                  >
                    <Ionicons name="shield-checkmark-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.publishBtnText}>Compile candidate</Text>
                  </TouchableOpacity>
                  {snapshot?.publicationState === 'active' ? (
                    <TouchableOpacity
                      disabled={busy}
                      onPress={() => void refreshPublic()}
                      style={styles.linkBtn}
                    >
                      <Text style={styles.linkBtnText}>Refresh public data</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {candidate ? (
                <View style={styles.card}>
                  <Text style={styles.eyebrow}>CANDIDATE {candidate.releaseId.slice(0, 14)}…</Text>
                  <Text style={styles.body}>
                    {blockingCount} blocking issues · {advisoryCount} advisory notices
                  </Text>

                  {!candidateFresh ? (
                    <Text style={styles.warningText}>The draft changed since this candidate was compiled. Compile again.</Text>
                  ) : null}

                  {(candidate.checks?.blocking ?? []).map((issue, idx) => (
                    <Text key={`b-${idx}`} style={styles.errorText}>[Blocking] {issue.path}: {issue.message}</Text>
                  ))}
                  {(candidate.checks?.advisory ?? []).slice(0, 6).map((issue, idx) => (
                    <Text key={`a-${idx}`} style={styles.warningText}>[Advisory] {issue.path}: {issue.message}</Text>
                  ))}

                  <TouchableOpacity
                    onPress={() => setReviewed(!reviewed)}
                    style={styles.reviewCheckRow}
                  >
                    <Ionicons name={reviewed ? 'checkbox' : 'square-outline'} size={20} color="#1d4ed8" />
                    <Text style={styles.reviewCheckLabel}>I reviewed the factual content and this candidate</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={busy || blockingCount > 0 || !candidateFresh || !reviewed}
                    onPress={() => void publish()}
                    style={[styles.publishBtn, (busy || blockingCount > 0 || !candidateFresh || !reviewed) && styles.disabled]}
                  >
                    <Ionicons name="cloud-upload" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.publishBtnText}>Publish Live</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Revision History & Timeline */}
              <View style={styles.card}>
                <Text style={styles.eyebrow}>REVISION TIMELINE</Text>
                {(snapshot?.history ?? []).slice().reverse().map((entry) => (
                  <View key={`${entry.revision}-${entry.at}`} style={styles.historyRow}>
                    <View style={styles.historyCopy}>
                      <Text style={styles.historyTitle}>Revision {entry.revision}</Text>
                      <Text style={styles.historyMeta}>
                        {new Date(entry.at).toLocaleString()} · {entry.summary || 'edit'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      disabled={busy}
                      onPress={() => void undo(entry.revision)}
                      style={styles.linkBtn}
                    >
                      <Text style={styles.linkBtnText}>Restore</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Published Releases */}
              <View style={styles.card}>
                <Text style={styles.eyebrow}>PUBLISHED RELEASES</Text>
                {releases.length ? releases.slice().reverse().map((rel) => (
                  <View key={rel.id} style={styles.historyRow}>
                    <View style={styles.historyCopy}>
                      <Text style={styles.historyTitle}>Release {rel.generation} {rel.id === liveRelease ? '· Live' : ''}</Text>
                      <Text style={styles.historyMeta}>
                        {new Date(rel.created).toLocaleString()} · compiler {rel.compiler || '2.0.0'}
                      </Text>
                    </View>
                    {rel.id === liveRelease ? null : (
                      <TouchableOpacity
                        disabled={busy}
                        onPress={() => void rollback(rel.id)}
                        style={styles.linkBtn}
                      >
                        <Text style={styles.linkBtnText}>Restore release</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )) : <Text style={styles.body}>No releases yet.</Text>}
              </View>
            </>
          ) : null}

          {/* Status Notifications */}
          {!!message && (
            <View style={[styles.statusNotice, failed && styles.statusNoticeError]}>
              <Ionicons name={failed ? 'alert-circle' : 'checkmark-circle'} size={18} color={failed ? '#b91c1c' : '#16a34a'} />
              <Text style={[styles.statusNoticeText, failed && styles.statusNoticeTextError]}>{message}</Text>
            </View>
          )}
        </ScrollView>

        {/* Floating Quick Prompt Bar when inside Preview */}
        {site && tab === 'preview' ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.floatingPromptBar, { paddingBottom: Math.max(insets.bottom, 10) + 6 }]}
          >
            <View style={styles.floatingPromptRow}>
              <TextInput
                style={styles.floatingPromptInput}
                value={command}
                onChangeText={setCommand}
                placeholder={selectedSectionId ? `Ask change for ${selectedSectionId}...` : "Describe a change (e.g. 'Image left, text right')..."}
                placeholderTextColor="#94a3b8"
                editable={!busy}
                onSubmitEditing={() => void ask()}
              />
              <TouchableOpacity
                disabled={busy || !command.trim()}
                onPress={() => void ask()}
                style={[styles.floatingPromptSend, (busy || !command.trim()) && styles.disabled]}
              >
                <Ionicons name="sparkles" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        ) : null}
      </View>

      {/* MODAL: INSERT BLOCK */}
      <Modal visible={blockModalOpen} transparent animationType="fade" onRequestClose={() => setBlockModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Insert Block into {activeSection?.id || 'Section'}</Text>
              <TouchableOpacity onPress={() => setBlockModalOpen(false)}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <View style={styles.blockChoicesGrid}>
              {[
                { kind: 'heading', label: 'Heading', icon: 'text' },
                { kind: 'text', label: 'Paragraph', icon: 'document-text-outline' },
                { kind: 'button', label: 'Button', icon: 'radio-button-on-outline' },
                { kind: 'image', label: 'Image', icon: 'image-outline' },
                { kind: 'quote', label: 'Quote', icon: 'chatbubble-ellipses-outline' },
                { kind: 'stat', label: 'Metric Stat', icon: 'analytics-outline' },
                { kind: 'video', label: 'Video Card', icon: 'videocam-outline' },
                { kind: 'logos', label: 'Logo Strip', icon: 'ribbon-outline' },
                { kind: 'list', label: 'List', icon: 'list-outline' },
                { kind: 'card', label: 'Card Container', icon: 'albums-outline' },
                { kind: 'divider', label: 'Divider', icon: 'remove-outline' },
                { kind: 'spacer', label: 'Spacer', icon: 'resize-outline' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.kind}
                  onPress={() => void insertBlock(item.kind)}
                  style={styles.blockChoiceBtn}
                >
                  <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={20} color="#1d4ed8" />
                  <Text style={styles.blockChoiceLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: EDIT NODE */}
      <Modal visible={editNodeModalOpen} transparent animationType="fade" onRequestClose={() => setEditNodeModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit {nodeEditKind.toUpperCase()} ({selectedNodeId})</Text>
              <TouchableOpacity onPress={() => setEditNodeModalOpen(false)}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, paddingVertical: 8 }}>
              {nodeEditKind === 'heading' || nodeEditKind === 'text' || nodeEditKind === 'button' || nodeEditKind === 'buttons' ? (
                <View>
                  <Text style={styles.fieldHeading}>{nodeEditKind === 'button' || nodeEditKind === 'buttons' ? 'Button Label' : 'Text Content'}</Text>
                  <TextInput
                    style={[styles.input, { minHeight: nodeEditKind === 'text' ? 80 : 44 }]}
                    value={nodeEditText}
                    onChangeText={setNodeEditText}
                    multiline={nodeEditKind === 'text'}
                  />
                </View>
              ) : null}

              {nodeEditKind === 'quote' ? (
                <>
                  <View>
                    <Text style={styles.fieldHeading}>Quote Content</Text>
                    <TextInput
                      style={[styles.input, { minHeight: 70 }]}
                      value={nodeEditText}
                      onChangeText={setNodeEditText}
                      multiline
                      placeholder="Quote or review text"
                    />
                  </View>
                  <View>
                    <Text style={styles.fieldHeading}>Author / Attribution</Text>
                    <TextInput
                      style={styles.input}
                      value={nodeEditSubtext}
                      onChangeText={setNodeEditSubtext}
                      placeholder="e.g. Maria Keller, Founder"
                    />
                  </View>
                </>
              ) : null}

              {nodeEditKind === 'stat' ? (
                <>
                  <View>
                    <Text style={styles.fieldHeading}>Metric Value</Text>
                    <TextInput
                      style={styles.input}
                      value={nodeEditText}
                      onChangeText={setNodeEditText}
                      placeholder="e.g. 99.9% or 10k+"
                    />
                  </View>
                  <View>
                    <Text style={styles.fieldHeading}>Metric Label</Text>
                    <TextInput
                      style={styles.input}
                      value={nodeEditSubtext}
                      onChangeText={setNodeEditSubtext}
                      placeholder="e.g. Uptime Guaranteed"
                    />
                  </View>
                </>
              ) : null}

              {nodeEditKind === 'video' ? (
                <View>
                  <Text style={styles.fieldHeading}>Video Title / Description</Text>
                  <TextInput
                    style={styles.input}
                    value={nodeEditText}
                    onChangeText={setNodeEditText}
                    placeholder="Video title"
                  />
                </View>
              ) : null}

              {nodeEditKind === 'heading' ? (
                <View>
                  <Text style={styles.fieldHeading}>Heading Level</Text>
                  <View style={styles.columnsRow}>
                    {[1, 2, 3].map((lvl) => (
                      <TouchableOpacity
                        key={lvl}
                        onPress={() => setNodeEditLevel(lvl)}
                        style={[styles.columnBtn, nodeEditLevel === lvl && styles.columnBtnActive]}
                      >
                        <Text style={[styles.columnBtnText, nodeEditLevel === lvl && styles.columnBtnTextActive]}>H{lvl}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}

              {nodeEditKind === 'button' || nodeEditKind === 'buttons' ? (
                <>
                  <View>
                    <Text style={styles.fieldHeading}>Target Link (href)</Text>
                    <TextInput style={styles.input} value={nodeEditHref} onChangeText={setNodeEditHref} placeholder="#contact or /menu or https://..." />
                  </View>
                  <View>
                    <Text style={styles.fieldHeading}>Button Variant</Text>
                    <View style={styles.columnsRow}>
                      {(['primary', 'secondary', 'outline'] as const).map((v) => (
                        <TouchableOpacity
                          key={v}
                          onPress={() => setNodeEditVariant(v)}
                          style={[styles.columnBtn, nodeEditVariant === v && styles.columnBtnActive]}
                        >
                          <Text style={[styles.columnBtnText, nodeEditVariant === v && styles.columnBtnTextActive]}>{v}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              ) : null}

              {nodeEditKind === 'image' ? (
                <>
                  <View>
                    <Text style={styles.fieldHeading}>Alt Text</Text>
                    <TextInput style={styles.input} value={nodeEditText} onChangeText={setNodeEditText} placeholder="Image description" />
                  </View>
                  <View>
                    <Text style={styles.fieldHeading}>Bound Asset ID</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentedRow}>
                      {assets.map((a) => (
                        <TouchableOpacity
                          key={a.id}
                          onPress={() => setNodeEditAsset(a.id)}
                          style={[styles.segmentBtn, { flex: 0, paddingHorizontal: 12 }, nodeEditAsset === a.id && styles.segmentBtnActive]}
                        >
                          <Text style={[styles.segmentBtnText, nodeEditAsset === a.id && styles.segmentBtnTextActive]}>{a.id}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              ) : null}

              <TouchableOpacity onPress={() => void saveNodeEdit()} style={styles.publishBtn}>
                <Text style={styles.publishBtnText}>Save block changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#f1f5f9' },
  headerLeft: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  subtitle: { marginTop: 2, color: '#64748b', fontSize: 12 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusPillDraft: { backgroundColor: '#f1f5f9' },
  statusPillLive: { backgroundColor: '#dcfce7' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotDraft: { backgroundColor: '#64748b' },
  statusDotLive: { backgroundColor: '#16a34a' },
  statusPillText: { fontSize: 11, fontWeight: '600', color: '#334155' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerIconBtn: { padding: 7, borderRadius: 8, backgroundColor: '#f1f5f9' },
  closeButton: { padding: 6, marginLeft: 4 },
  tabs: { maxHeight: 44, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#f1f5f9' },
  tabsRow: { gap: 16, paddingHorizontal: 16, paddingVertical: 0 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#0f172a' },
  tabText: { color: '#64748b', fontWeight: '500', fontSize: 13 },
  tabTextActive: { color: '#0f172a', fontWeight: '700' },
  content: { padding: 16, gap: 16, paddingBottom: 110, backgroundColor: '#ffffff' },

  /* Flat White Uncluttered Create Site Initial Form */
  createSiteForm: { gap: 16, backgroundColor: '#ffffff', paddingTop: 8 },
  createTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  createInput: { minHeight: 96, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, color: '#0f172a', backgroundColor: '#ffffff', fontSize: 14, textAlignVertical: 'top' },
  createSubmitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', paddingVertical: 13, paddingHorizontal: 18, borderRadius: 24 },
  createSubmitText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },

  card: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, gap: 8, backgroundColor: '#ffffff' },
  eyebrow: { color: '#64748b', fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  cardTitle: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  body: { color: '#475569', fontSize: 13, lineHeight: 18 },
  input: { minHeight: 42, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, color: '#0f172a', backgroundColor: '#ffffff', fontSize: 13 },
  codeArea: { minHeight: 180, fontSize: 12, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  publishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', paddingVertical: 11, paddingHorizontal: 16, borderRadius: 8 },
  publishBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  actionBtnText: { color: '#0f172a', fontWeight: '600', fontSize: 13 },
  linkBtn: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#eff6ff' },
  linkBtnText: { color: '#1d4ed8', fontSize: 12, fontWeight: '600' },
  disabled: { opacity: 0.4 },

  // Live Visual Preview Styles
  previewViewContainer: { gap: 10 },
  previewControlsBar: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  framePicker: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 8, padding: 3, gap: 4 },
  frameBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  frameBtnActive: { backgroundColor: '#0f172a' },
  frameBtnText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  frameBtnTextActive: { color: '#ffffff', fontWeight: '700' },
  canvasWrapper: { alignItems: 'center', width: '100%' },
  canvasFrame: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden', backgroundColor: '#ffffff' },
  visualHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  visualBrand: { fontSize: 15, fontWeight: '700' },
  visualNavLinks: { flexDirection: 'row', gap: 12 },
  visualNavLink: { fontSize: 12, fontWeight: '600' },
  sectionContainer: { width: '100%' },
  sectionSelected: { borderColor: '#2563eb' },
  sectionCanvas: { padding: 16, borderBottomWidth: 1 },
  selectedSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  sectionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sectionBadgeText: { fontSize: 10, fontWeight: '700', color: '#1d4ed8' },
  sectionQuickActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quickActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, padding: 5, borderRadius: 5, backgroundColor: '#f1f5f9' },
  quickActionLabel: { fontSize: 10, fontWeight: '600', color: '#1d4ed8' },
  sectionNodesWrap: { gap: 10 },
  nodeWrap: { paddingVertical: 2 },
  nodeSelected: { backgroundColor: '#eff6ff', borderRadius: 4 },
  visualHeading: { fontWeight: '700', lineHeight: 28 },
  visualText: { fontSize: 13, lineHeight: 20 },
  visualButton: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  visualButtonText: { fontWeight: '700', fontSize: 13 },
  visualImageCard: { padding: 14, borderRadius: 8, borderWidth: 1, alignItems: 'center', gap: 4 },
  visualImageAlt: { fontSize: 11, textAlign: 'center' },
  approvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  approvedText: { fontSize: 10, fontWeight: '600', color: '#16a34a' },
  unapprovedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  unapprovedText: { fontSize: 10, fontWeight: '600', color: '#b45309' },
  visualQuoteCard: { padding: 14, borderRadius: 8, borderWidth: 1, borderLeftWidth: 4, gap: 4 },
  visualQuoteText: { fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  visualQuoteAuthor: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  visualStatCard: { padding: 16, borderRadius: 8, borderWidth: 1, alignItems: 'center', gap: 4 },
  visualStatValue: { fontSize: 26, fontWeight: '800' },
  visualStatLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  visualVideoCard: { padding: 20, borderRadius: 8, borderWidth: 1, alignItems: 'center', gap: 8 },
  videoPlayCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  videoBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: '#f1f5f9' },
  videoBadgeText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  visualLogosStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 6 },
  logoItemBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1 },
  logoItemText: { fontSize: 12, fontWeight: '700' },
  visualList: { gap: 6 },
  visualListItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  visualListText: { fontSize: 13, flex: 1 },
  visualFlexContainer: { gap: 10 },
  visualButtonGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  visualCard: { padding: 12, borderRadius: 8, borderWidth: 1, gap: 6 },
  visualCollection: { gap: 8 },
  visualCollectionGrid: { gap: 8 },
  visualProductCard: { padding: 10, borderRadius: 8, borderWidth: 1 },
  visualProductHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  visualProductTitle: { fontSize: 13, fontWeight: '700' },
  visualProductPrice: { fontSize: 13, fontWeight: '700' },
  visualProductDesc: { fontSize: 11, marginTop: 2 },
  visualAccordion: { gap: 6 },
  accordionItem: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10 },
  accordionTitle: { fontSize: 13, fontWeight: '600' },
  accordionBody: { padding: 10, paddingTop: 0, gap: 6 },
  visualTabs: { gap: 8 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tabButton: { paddingHorizontal: 12, paddingVertical: 6 },
  tabButtonText: { fontSize: 12, fontWeight: '600' },
  tabContent: { paddingTop: 6 },
  visualSearchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, height: 38, borderWidth: 1, borderRadius: 8 },
  visualSearchInput: { flex: 1, height: '100%', fontSize: 13 },
  visualForm: { padding: 12, borderRadius: 8, borderWidth: 1, gap: 8 },
  formField: { gap: 3 },
  formLabel: { fontSize: 11, fontWeight: '600' },
  formInputMock: { padding: 8, borderWidth: 1, borderRadius: 6 },
  visualDivider: { height: 1, width: '100%', marginVertical: 6 },
  visualFooter: { padding: 16, borderTopWidth: 1, alignItems: 'center' },
  visualFooterText: { fontSize: 11 },
  lockBadge: { position: 'absolute', right: 0, top: 0 },

  // Clean Segmented Controls (Replaces Chips)
  segmentedRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 8, padding: 3, gap: 4 },
  segmentBtn: { flex: 1, paddingVertical: 7, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  segmentBtnActive: { backgroundColor: '#0f172a' },
  segmentBtnText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  segmentBtnTextActive: { color: '#ffffff', fontWeight: '700' },

  // Prompt / Proposals
  proposalCard: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  questionNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, backgroundColor: '#fef3c7', borderRadius: 6 },
  questionText: { fontSize: 12, color: '#92400e', flex: 1 },
  opRow: { padding: 4, backgroundColor: '#ffffff', borderRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  codeText: { fontSize: 11, color: '#334155', fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  actionsRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#f1f5f9' },
  cancelBtnText: { fontSize: 12, color: '#475569', fontWeight: '600' },

  // Inspector Styles
  inspectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lockBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6, borderRadius: 6, backgroundColor: '#f8fafc' },
  lockBtnText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  fieldHeading: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 6 },
  toneGrid: { flexDirection: 'row', gap: 6 },
  toneBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
  toneBtnText: { fontSize: 10, fontWeight: '700' },
  columnsRow: { flexDirection: 'row', gap: 6 },
  columnBtn: { flex: 1, paddingVertical: 7, borderRadius: 6, alignItems: 'center', backgroundColor: '#f1f5f9' },
  columnBtnActive: { backgroundColor: '#0f172a' },
  columnBtnText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  columnBtnTextActive: { color: '#ffffff' },
  blocksHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  addBlockBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#eff6ff', borderRadius: 6 },
  addBlockBtnText: { fontSize: 11, fontWeight: '700', color: '#1d4ed8' },
  blockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  blockRowInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  blockKindBadge: { fontSize: 9, fontWeight: '700', backgroundColor: '#e2e8f0', color: '#334155', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  blockRowTitle: { fontSize: 12, color: '#1e293b', flex: 1 },
  blockRowActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniBtn: { padding: 4 },

  // Asset Styles
  assetCard: { padding: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, gap: 3 },
  assetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assetTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  rightsBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  rightsApproved: { backgroundColor: '#dcfce7' },
  rightsPending: { backgroundColor: '#fef3c7' },
  rightsText: { fontSize: 10, fontWeight: '600' },
  rightsTextApproved: { color: '#166534' },
  rightsTextPending: { color: '#92400e' },
  assetMeta: { fontSize: 11, color: '#64748b' },
  assetAlt: { fontSize: 11, color: '#334155', fontStyle: 'italic' },
  warningText: { fontSize: 11, color: '#b45309' },
  errorText: { fontSize: 11, color: '#b91c1c' },

  // Design Presets Styles
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetCard: { width: '48%', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 8, gap: 6, backgroundColor: '#ffffff' },
  presetPalette: { flexDirection: 'row', height: 16, borderRadius: 4, overflow: 'hidden' },
  presetSwatch: { flex: 1, height: '100%' },
  presetName: { fontSize: 11, fontWeight: '700', color: '#1e293b' },

  // History Styles
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  historyCopy: { flex: 1 },
  historyTitle: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  historyMeta: { fontSize: 11, color: '#94a3b8' },

  // Release Styles
  reviewCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  reviewCheckLabel: { fontSize: 12, color: '#334155', fontWeight: '500', flex: 1 },
  liveUrlText: { fontSize: 13, fontWeight: '700', color: '#1d4ed8' },

  // Status & Floating Prompt Bar
  statusNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', padding: 12, borderRadius: 8 },
  statusNoticeError: { backgroundColor: '#ffffff', borderColor: '#fca5a5' },
  statusNoticeText: { fontSize: 13, color: '#166534', flex: 1 },
  statusNoticeTextError: { color: '#b91c1c' },
  floatingPromptBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', borderTopWidth: 1, borderColor: '#e2e8f0', padding: 10 },
  floatingPromptRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  floatingPromptInput: { flex: 1, height: 40, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 20, paddingHorizontal: 14, backgroundColor: '#f8fafc', color: '#0f172a', fontSize: 13 },
  floatingPromptSend: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalDialog: { width: '100%', maxWidth: 440, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  blockChoicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8 },
  blockChoiceBtn: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  blockChoiceLabel: { fontSize: 12, fontWeight: '600', color: '#1e293b' },
});
