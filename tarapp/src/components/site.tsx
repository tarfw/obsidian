/** Site Studio is an authenticated TAR Harness client. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { harness, HARNESS_URL } from '@/lib/harness';
import type { CardDefinition, PageDefinition, SiteDefinition, SitePatchOperation } from '@/lib/site-schema';

type Phase = 'idle' | 'loading' | 'saving' | 'publishing' | 'refreshing' | 'rollingback' | 'error';
export interface SiteScreenProps { visible: boolean; onClose: () => void; workspaceName: string; subdomain: string; scope: string; products?: { title?: string; name?: string }[]; }

function errorText(error: unknown): string { return error instanceof Error ? error.message : 'TAR Harness could not complete this site action.'; }
function cardSummary(card: CardDefinition): string {
  const props = card.props;
  for (const key of ['headline', 'subtext', 'body', 'text', 'address', 'phone', 'email']) {
    const value = props[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  const entries = ['features', 'testimonials', 'items', 'schedule', 'links'].filter((key) => Array.isArray(props[key]));
  if (entries.length) return entries.map((key) => `${(props[key] as unknown[]).length} ${key}`).join(' · ');
  return card.bindings?.length ? card.bindings.map((binding) => binding.query).join(', ') : 'No public content supplied';
}
function releaseDate(value: number): string { return new Date(value).toLocaleString(); }
type EditorField = { key: string; label: string; multiline?: boolean };
type CardEditor = { page: string; card: CardDefinition; values: Record<string, string> };
const rowFields: Record<string, readonly [string, string]> = {
  links: ['label', 'href'], features: ['title', 'description'], testimonials: ['quote', 'author'],
  items: ['q', 'a'], schedule: ['days', 'hours'],
};
const editableFields: Record<CardDefinition['kind'], EditorField[]> = {
  navigation: [{ key: 'brand', label: 'Brand' }, { key: 'links', label: 'Links · label | path', multiline: true }],
  hero: [{ key: 'headline', label: 'Headline' }, { key: 'subtext', label: 'Description', multiline: true }, { key: 'badge', label: 'Badge' }],
  content: [{ key: 'body', label: 'Body', multiline: true }],
  collection: [],
  features: [{ key: 'features', label: 'Features · title | description', multiline: true }],
  proof: [{ key: 'testimonials', label: 'Verified quotes · quote | author', multiline: true }],
  faq: [{ key: 'items', label: 'Questions · question | answer', multiline: true }],
  hours: [{ key: 'schedule', label: 'Hours · days | hours', multiline: true }],
  contact: [{ key: 'address', label: 'Address' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }],
  form: [],
  cta: [{ key: 'headline', label: 'Headline' }, { key: 'text', label: 'Description', multiline: true }, { key: 'buttonLabel', label: 'Button label' }, { key: 'href', label: 'Button path or HTTPS URL' }],
  footer: [{ key: 'brand', label: 'Brand' }, { key: 'text', label: 'Footer text' }, { key: 'links', label: 'Links · label | path', multiline: true }],
};
function fieldValue(card: CardDefinition, key: string): string {
  const value = card.props[key];
  const parts = rowFields[key];
  if (parts && Array.isArray(value)) return value.map((item) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return `${String(row[parts[0]] || '')} | ${String(row[parts[1]] || '')}`;
  }).join('\n');
  return typeof value === 'string' ? value : '';
}
function parseRows(value: string, key: string): Record<string, string>[] {
  const parts = rowFields[key];
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const divider = line.indexOf('|');
    const first = line.slice(0, divider).trim();
    const second = line.slice(divider + 1).trim();
    if (divider < 0 || !first || !second) throw new Error(`Each ${key} line needs both values separated by |.`);
    return { [parts[0]]: first, [parts[1]]: second };
  });
}

export default function SiteScreen({ visible, onClose, workspaceName, scope, products = [] }: SiteScreenProps) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [prompt, setPrompt] = useState('');
  const [site, setSite] = useState<SiteDefinition | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState('draft');
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [editor, setEditor] = useState<CardEditor | null>(null);
  const closed = useRef(false);

  const slug = useMemo(() => scope.replace(/^w:/, '').trim(), [scope]);
  const defaultDescription = useMemo(() => {
    const items = products.slice(0, 8).map((item) => item.title || item.name).filter(Boolean);
    return items.length ? `${workspaceName || 'This workspace'} offers ${items.join(', ')}.` : '';
  }, [products, workspaceName]);

  useEffect(() => { closed.current = !visible; }, [visible]);

  const reload = useCallback(async () => {
    const res = await harness.site.get(slug);
    if (closed.current) return;
    setSite(res.site?.data || null);
    setSiteId(res.site?.id || null);
    setVersion(res.site?.version || 0);
    setState(res.site?.state || 'draft');
    setLiveUrl(res.site?.data.currentRelease ? `${HARNESS_URL}/v1/sites/${encodeURIComponent(slug)}` : null);
  }, [slug]);

  useEffect(() => {
    if (!visible || !slug) return;
    void reload().then(() => { if (!closed.current) setPhase('idle'); })
      .catch((error) => { if (!closed.current) { setMessage(errorText(error)); setPhase('error'); } });
  }, [visible, slug, reload]);

  const saveBrief = useCallback(async () => {
    if (!slug) return;
    const description = prompt.trim() || defaultDescription;
    if (siteId && !prompt.trim()) { setMessage('Enter a description to update this site.'); setPhase('error'); return; }
    setPhase('saving');
    setMessage(siteId ? 'Updating the typed draft…' : 'Creating a typed draft…');
    try {
      let result: { siteId: string; version: number; site: SiteDefinition };
      if (siteId && site) {
        const operations: SitePatchOperation[] = [
          { op: 'update_page', path: 'home', value: { meta: { description } } },
          { op: 'update_page', path: 'about', value: { meta: { description } } },
          { op: 'update_card', path: 'home', value: { id: 'hero', props: { subtext: description } } },
          { op: 'update_card', path: 'home', value: { id: 'cta', props: { text: description } } },
          { op: 'update_card', path: 'about', value: { id: 'about', props: { body: description } } },
        ];
        result = await harness.site.update(slug, siteId, version, operations);
      } else {
        result = await harness.site.generate(slug, { title: workspaceName || 'Workspace', prompt: description });
      }
      if (closed.current) return;
      setSiteId(result.siteId);
      setVersion(result.version);
      setSite(result.site);
      setPrompt('');
      setMessage('Draft saved. Review every page before publishing.');
      setPhase('idle');
    } catch (error) {
      if (!closed.current) {
        setMessage(errorText(error));
        setPhase('error');
      }
    }
  }, [defaultDescription, prompt, site, siteId, slug, version, workspaceName]);

  const openEditor = useCallback((page: PageDefinition, card: CardDefinition) => {
    const values: Record<string, string> = { title: card.title || '' };
    for (const field of editableFields[card.kind]) values[field.key] = fieldValue(card, field.key);
    setEditor({ page: page.id, card, values });
  }, []);

  const saveEditor = useCallback(async () => {
    if (!editor || !siteId || !slug) return;
    let props: Record<string, unknown>;
    try {
      props = Object.fromEntries(editableFields[editor.card.kind].map((field) => [field.key,
        rowFields[field.key] ? parseRows(editor.values[field.key] || '', field.key) : (editor.values[field.key] || '').trim()]));
    } catch (error) { setMessage(errorText(error)); setPhase('error'); return; }
    setPhase('saving');
    setMessage('Saving card…');
    try {
      const result = await harness.site.update(slug, siteId, version, [{
        op: 'update_card', path: editor.page, value: { id: editor.card.id, title: editor.values.title.trim(), props },
      }]);
      if (closed.current) return;
      setSite(result.site);
      setVersion(result.version);
      setEditor(null);
      setMessage('Card saved. Publish to update the public site.');
      setPhase('idle');
    } catch (error) { if (!closed.current) { setMessage(errorText(error)); setPhase('error'); } }
  }, [editor, siteId, slug, version]);

  const publish = useCallback(async () => {
    if (!slug) return;
    if (!siteId) {
      setMessage('Create a draft before publishing.');
      setPhase('error');
      return;
    }
    setPhase('publishing');
    setMessage('Verifying and publishing your site…');
    try {
      const res = await harness.site.publish(slug, siteId);
      if (closed.current) return;
      const targetUrl = res.liveUrl.startsWith('http') ? res.liveUrl : `${HARNESS_URL}${res.liveUrl}`;
      setLiveUrl(targetUrl);
      await reload();
      setMessage('Site published. Open each page to review the live release.');
      setPhase('idle');
    } catch (error) {
      if (!closed.current) {
        setMessage(errorText(error));
        setPhase('error');
      }
    }
  }, [reload, siteId, slug]);

  const refresh = useCallback(async () => {
    if (!siteId || !slug) return;
    setPhase('refreshing');
    setMessage('Resolving current catalog facts and publishing a new release…');
    try {
      const result = await harness.site.refresh(slug, siteId);
      if (closed.current) return;
      await reload();
      setMessage(`Catalog refreshed with ${result.itemCount} public ${result.itemCount === 1 ? 'item' : 'items'}.`);
      setPhase('idle');
    } catch (error) {
      if (!closed.current) { setMessage(errorText(error)); setPhase('error'); }
    }
  }, [reload, siteId, slug]);

  const rollback = useCallback(async (releaseId: string) => {
    if (!siteId || !slug) return;
    setPhase('rollingback');
    setMessage('Restoring the selected release…');
    try {
      await harness.site.rollback(slug, siteId, releaseId);
      if (closed.current) return;
      await reload();
      setMessage('The selected release is live.');
      setPhase('idle');
    } catch (error) {
      if (!closed.current) { setMessage(errorText(error)); setPhase('error'); }
    }
  }, [reload, siteId, slug]);

  const busy = phase !== 'idle' && phase !== 'error';
  const releases = [...(site?.releases || [])].reverse();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Site Studio</Text>
            <Text style={styles.subtitle}>Build and publish a versioned business site</Text>
          </View>
          <TouchableOpacity accessibilityLabel="Close Site Studio" onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.eyebrow}>BUSINESS BRIEF</Text>
            <Text style={styles.cardTitle}>{workspaceName || 'Your workspace'}</Text>
            <Text style={styles.body}>{siteId ? `Definition v${version} · ${state === 'live' ? 'Published site' : 'Draft'}` : 'Create a four-page site from facts you provide. You can review the whole structure before publishing.'}</Text>
            {site?.currentRelease ? <Text style={styles.body}>Live release: {site.currentRelease}</Text> : null}
          </View>
          {editor ? <View style={styles.card}>
            <Text style={styles.eyebrow}>EDIT CARD · {editor.page.toUpperCase()}</Text>
            <Text style={styles.cardTitle}>{titleize(editor.card.kind)}</Text>
            <Text style={styles.inputLabel}>Card title</Text>
            <TextInput value={editor.values.title} onChangeText={(title) => setEditor((current) => current ? { ...current, values: { ...current.values, title } } : null)} style={styles.input} editable={!busy} />
            {editableFields[editor.card.kind].map((field) => <View key={field.key} style={styles.editorField}>
              <Text style={styles.inputLabel}>{field.label}</Text>
              <TextInput
                value={editor.values[field.key] || ''}
                onChangeText={(value) => setEditor((current) => current ? { ...current, values: { ...current.values, [field.key]: value } } : null)}
                multiline={field.multiline}
                style={[styles.input, field.multiline && styles.editorMultiline]}
                textAlignVertical="top"
                editable={!busy}
              />
            </View>)}
            <View style={styles.editorActions}>
              <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => setEditor(null)} style={styles.pageLink}><Text style={styles.pageLinkText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void saveEditor()} style={[styles.publish, busy && styles.disabled]}><Text style={styles.publishText}>Save card</Text></TouchableOpacity>
            </View>
          </View> : null}
          {site ? site.pages.map((page: PageDefinition) => (
            <View key={page.id} style={styles.card}>
              <View style={styles.pageHeader}>
                <View style={styles.rowCopy}>
                  <Text style={styles.eyebrow}>{page.path}</Text>
                  <Text style={styles.cardTitle}>{page.title}</Text>
                </View>
                {liveUrl ? <TouchableOpacity accessibilityRole="link" accessibilityLabel={`Open ${page.title} page`} onPress={() => {
                  const target = page.path === '/' ? liveUrl : `${liveUrl}${page.path}`;
                  void Linking.openURL(target).catch((error) => { setMessage(errorText(error)); setPhase('error'); });
                }} style={styles.pageLink}><Text style={styles.pageLinkText}>Open page</Text></TouchableOpacity> : null}
              </View>
              {page.meta?.description ? <Text style={styles.body}>{page.meta.description}</Text> : null}
              {page.cards.map((card: CardDefinition, index: number) => (
                <TouchableOpacity key={card.id} accessibilityRole="button" accessibilityLabel={`Edit ${page.title} ${card.title || titleize(card.kind)} card`} disabled={busy} onPress={() => openEditor(page, card)} style={styles.row}>
                  <Text style={styles.index}>{index + 1}</Text>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>{card.title || titleize(card.kind)}</Text>
                    <Text style={styles.rowMeta}>{card.kind} · {cardSummary(card)}</Text>
                    {card.bindings?.length ? <Text style={styles.rowMeta}>Live binding: {card.bindings.map((binding) => binding.query).join(', ')}</Text> : null}
                    {card.kind === 'form' && !site.policy.publicEnquiry ? <Text style={styles.rowMeta}>Public enquiry is disabled</Text> : null}
                  </View>
                  <Ionicons name="create-outline" size={16} color="#64748b" />
                </TouchableOpacity>
              ))}
            </View>
          )) : <View style={styles.card}><Text style={styles.eyebrow}>SITE STRUCTURE</Text><Text style={styles.body}>Create a draft to inspect its pages and cards.</Text></View>}
          {releases.length ? <View style={styles.card}>
            <Text style={styles.eyebrow}>RELEASES</Text>
            {releases.map((release) => <View key={release.id} style={styles.releaseRow}>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>Release {release.generation}{site?.currentRelease === release.id ? ' · Live' : ''}</Text>
                <Text style={styles.rowMeta}>Definition v{release.version} · {releaseDate(release.created)}</Text>
              </View>
              {site?.currentRelease !== release.id ? <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void rollback(release.id)} style={[styles.pageLink, busy && styles.disabled]}><Text style={styles.pageLinkText}>Restore</Text></TouchableOpacity> : null}
            </View>)}
          </View> : null}
          {!!message && (
            <View style={[styles.status, phase === 'error' && styles.statusError]}>
              {busy && <ActivityIndicator size="small" color="#0f172a" />}
              <Text style={styles.statusText}>{message}</Text>
            </View>
          )}
          {liveUrl && (
            <TouchableOpacity accessibilityRole="link" style={styles.liveLink} onPress={() => void Linking.openURL(liveUrl).catch((error) => { setMessage(errorText(error)); setPhase('error'); })}>
              <Ionicons name="globe-outline" size={16} color="#166534" />
              <Text style={styles.liveLinkText}>Open live site</Text>
            </TouchableOpacity>
          )}
          {liveUrl && <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void refresh()} style={[styles.refresh, busy && styles.disabled]}><Text style={styles.refreshText}>Refresh catalog and publish release</Text></TouchableOpacity>}
        </ScrollView>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.composer}>
          <Text style={styles.inputLabel}>{siteId ? 'Update the business description' : 'Describe your business with verified facts'}</Text>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder={siteId ? 'Enter an updated description…' : 'What should visitors know about this business?'}
            placeholderTextColor="#94a3b8"
            style={styles.input}
            multiline
            editable={!busy}
          />
          <TouchableOpacity
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void saveBrief()}
            style={[styles.action, busy && styles.disabled]}
          >
            <Text style={styles.actionText}>{siteId ? 'Save description' : 'Create draft'}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" disabled={busy || !siteId} onPress={() => void publish()} style={[styles.publish, (busy || !siteId) && styles.disabled]}>
            <Text style={styles.publishText}>Publish</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
function titleize(value: string): string { return (value || 'section').split(/[-_]/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); }
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' }, header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#e2e8f0', padding: 16 }, headerCopy: { flex: 1 }, title: { fontSize: 18, fontWeight: '700', color: '#0f172a' }, subtitle: { marginTop: 2, color: '#64748b', fontSize: 12 }, closeButton: { padding: 8 }, content: { padding: 16, gap: 14 }, card: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 15, gap: 9 }, eyebrow: { color: '#64748b', fontSize: 11, fontWeight: '700', letterSpacing: .6 }, cardTitle: { color: '#0f172a', fontSize: 16, fontWeight: '700' }, body: { color: '#475569', fontSize: 13, lineHeight: 19 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderColor: '#f1f5f9' }, index: { width: 18, color: '#94a3b8', fontWeight: '700' }, rowCopy: { flex: 1 }, rowTitle: { color: '#1e293b', fontWeight: '600' }, rowMeta: { marginTop: 2, color: '#94a3b8', fontSize: 11 }, status: { flexDirection: 'row', gap: 9, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, padding: 13 }, statusError: { backgroundColor: '#fef2f2' }, statusText: { flex: 1, color: '#475569', fontSize: 13, lineHeight: 18 }, liveLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, padding: 11, borderRadius: 9, backgroundColor: '#f0fdf4' }, liveLinkText: { color: '#166534', fontWeight: '700', fontSize: 13 }, composer: { borderTopWidth: 1, borderColor: '#e2e8f0', padding: 14, gap: 9 }, input: { minHeight: 42, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, color: '#0f172a', textAlignVertical: 'top' }, action: { alignItems: 'center', borderRadius: 9, backgroundColor: '#e2e8f0', padding: 12 }, actionText: { color: '#0f172a', fontWeight: '700' }, publish: { alignItems: 'center', borderRadius: 9, backgroundColor: '#0f172a', padding: 12 }, publishText: { color: '#fff', fontWeight: '700' }, disabled: { opacity: .5 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageLink: { borderRadius: 8, backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 8 },
  pageLinkText: { color: '#1d4ed8', fontSize: 12, fontWeight: '700' },
  releaseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  refresh: { alignSelf: 'flex-start', borderRadius: 9, backgroundColor: '#eef2ff', padding: 12 },
  refreshText: { color: '#3730a3', fontWeight: '700', fontSize: 13 },
  inputLabel: { color: '#475569', fontSize: 12, fontWeight: '600' },
  editorField: { gap: 6 },
  editorMultiline: { minHeight: 90 },
  editorActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 9 },
});
