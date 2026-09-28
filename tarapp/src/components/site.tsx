/** Site Studio is an authenticated TAR Harness client. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { harness, HARNESS_URL, type HarnessRecord } from '@/lib/harness';
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
type CardEditor = { page: string; card: CardDefinition; values: Record<string, string>; records: string[] };
type Candidate = { releaseId: string; hash: string; previewUrl: string; version: number };
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

export default function SiteScreen({ visible, onClose, workspaceName, scope }: SiteScreenProps) {
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
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [catalog, setCatalog] = useState<HarnessRecord[]>([]);
  const [group, setGroup] = useState<'variant' | 'pos.product'>('variant');
  const [search, setSearch] = useState('');
  const [next, setNext] = useState<number | null>(null);
  const [waiting, setWaiting] = useState(false);
  const revision = useRef(0);
  const closed = useRef(false);

  const slug = useMemo(() => scope.replace(/^w:/, '').trim(), [scope]);
  useEffect(() => { closed.current = !visible; }, [visible]);

  const reload = useCallback(async () => {
    const res = await harness.site.get(slug);
    if (closed.current) return;
    setSite(res.site?.data || null);
    setSiteId(res.site?.id || null);
    setVersion(res.site?.version || 0);
    setState(res.site?.state || 'draft');
    setLiveUrl(res.publicUrl || null);
  }, [slug]);

  useEffect(() => {
    if (!visible || !slug) return;
    void reload().then(() => { if (!closed.current) setPhase('idle'); })
      .catch((error) => { if (!closed.current) { setMessage(errorText(error)); setPhase('error'); } });
  }, [visible, slug, reload]);

  useEffect(() => {
    if (!visible || editor?.card.kind !== 'collection') return;
    revision.current += 1;
    let stopped = false;
    setWaiting(true);
    setCatalog([]);
    setNext(null);
    void harness.records(slug, group, 0, search).then((result) => {
      if (stopped) return;
      setCatalog(result.records.filter((record) => record.state === 'active'));
      setNext(result.next);
    }).catch((error) => { if (!stopped) { setMessage(errorText(error)); setPhase('error'); } })
      .finally(() => { if (!stopped) setWaiting(false); });
    return () => { stopped = true; revision.current += 1; };
  }, [visible, editor?.card.kind, group, search, slug]);

  const more = useCallback(async () => {
    if (next === null || waiting) return;
    const token = revision.current;
    setWaiting(true);
    try {
      const result = await harness.records(slug, group, next, search);
      if (token !== revision.current || closed.current) return;
      setCatalog((rows) => [...rows, ...result.records.filter((record) => record.state === 'active' && !rows.some((row) => row.id === record.id))]);
      setNext(result.next);
    } catch (error) { if (token === revision.current && !closed.current) { setMessage(errorText(error)); setPhase('error'); } }
    finally { if (token === revision.current) setWaiting(false); }
  }, [next, waiting, slug, group, search]);

  const saveBrief = useCallback(async () => {
    if (!slug) return;
    const description = prompt.trim();
    if (!description) { setMessage('Enter the public description for this site.'); setPhase('error'); return; }
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
      setCandidate(null);
      setPrompt('');
      setMessage('Draft saved. Review every page before publishing.');
      setPhase('idle');
    } catch (error) {
      if (!closed.current) {
        setMessage(errorText(error));
        setPhase('error');
      }
    }
  }, [prompt, site, siteId, slug, version, workspaceName]);

  const openEditor = useCallback((page: PageDefinition, card: CardDefinition) => {
    const values: Record<string, string> = { title: card.title || '' };
    for (const field of editableFields[card.kind]) values[field.key] = fieldValue(card, field.key);
    const binding = card.bindings?.find((entry) => entry.query === 'catalog.public');
    values.channel = String(binding?.params?.channel || 'default');
    setSearch('');
    setEditor({ page: page.id, card, values, records: Array.isArray(binding?.params?.records) ? binding.params.records as string[] : [] });
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
        op: 'update_card', path: editor.page, value: { id: editor.card.id, title: editor.values.title.trim(), props,
          ...(editor.card.kind === 'collection' ? { bindings: [{ slot: 'items', query: 'catalog.public', version: 1, access: 'public', freshness: 300,
            params: { records: editor.records, channel: editor.values.channel.trim() || 'default' } }] } : {}),
        },
      }]);
      if (closed.current) return;
      setSite(result.site);
      setCandidate(null);
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
      if (!candidate || candidate.version !== version) {
        const compiled = await harness.site.compile(slug, siteId);
        if (closed.current) return;
        if (!compiled.previewUrl) throw new Error('Site preview is not configured.');
        setCandidate({ releaseId: compiled.releaseId, hash: compiled.hash, previewUrl: `${HARNESS_URL}${compiled.previewUrl}`, version });
        setMessage('Review the candidate pages, then confirm Publish. Any edit requires a new review.');
        setPhase('idle');
        return;
      }
      const res = await harness.site.publish(slug, siteId, candidate.releaseId, candidate.hash);
      if (closed.current) return;
      const targetUrl = res.publicUrl || (res.liveUrl.startsWith('http') ? res.liveUrl : `${HARNESS_URL}${res.liveUrl}`);
      setLiveUrl(targetUrl);
      await reload();
      setCandidate(null);
      setMessage('Site published. Open each page to review the live release.');
      setPhase('idle');
    } catch (error) {
      if (!closed.current) {
        setMessage(errorText(error));
        setPhase('error');
      }
    }
  }, [candidate, reload, siteId, slug, version]);

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

  const unpublish = useCallback(() => {
    if (!siteId || !slug) return;
    const run = async () => {
      setPhase('publishing');
      try {
        await harness.site.unpublish(slug, siteId);
        if (closed.current) return;
        await reload();
        setCandidate(null);
        setMessage('Site unpublished.');
        setPhase('idle');
      } catch (error) { if (!closed.current) { setMessage(errorText(error)); setPhase('error'); } }
    };
    const detail = 'Visitors will no longer be able to open this site. Releases remain available to restore.';
    if (Platform.OS === 'web') {
      if (window.confirm(`Unpublish site?\n\n${detail}`)) void run();
    } else Alert.alert('Unpublish site?', detail, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unpublish', style: 'destructive', onPress: () => { void run(); } },
    ]);
  }, [reload, siteId, slug]);

  const busy = phase !== 'idle' && phase !== 'error';
  const releases = [...(site?.releases || [])].reverse();
  const currentRelease = site?.releases?.find((release) => release.id === site.currentRelease);
  const siteStatus = currentRelease && version > currentRelease.version + 1 ? 'Draft changes' : state === 'live' ? 'Published site' : 'Draft';
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
            <Text style={styles.body}>{siteId ? `Definition v${version} · ${siteStatus}` : 'Create a site draft from facts you provide. Review every page before publishing.'}</Text>
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
            {editor.card.kind === 'collection' ? <View style={styles.editorField}>
              <Text style={styles.inputLabel}>Public catalog records ({editor.records.length}/100)</Text>
              <View style={styles.editorActions}>
                {(['variant', 'pos.product'] as const).map((value) => <TouchableOpacity key={value} accessibilityRole="tab" accessibilityState={{ selected: group === value }} onPress={() => setGroup(value)} style={[styles.pageLink, group === value && styles.chosen]}>
                  <Text style={styles.pageLinkText}>{value === 'variant' ? 'Variants' : 'POS products'}</Text>
                </TouchableOpacity>)}
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear public selection" disabled={busy} onPress={() => setEditor((current) => current ? { ...current, records: [] } : null)} style={styles.closeButton}><Ionicons name="trash-outline" size={18} color="#475569" /></TouchableOpacity>
              </View>
              <TextInput accessibilityLabel="Search catalog records" value={search} onChangeText={setSearch} placeholder="Search records" style={styles.input} editable={!busy} />
              {catalog.map((record) => <TouchableOpacity key={record.id} accessibilityRole="checkbox" accessibilityState={{ checked: editor.records.includes(record.id) }} disabled={busy} style={styles.row} onPress={() => {
                if (!editor.records.includes(record.id) && editor.records.length >= 100) { setMessage('A collection can include up to 100 approved records.'); return; }
                setEditor((current) => current ? { ...current, records: current.records.includes(record.id) ? current.records.filter((id) => id !== record.id) : [...current.records, record.id] } : null);
              }}>
                <Ionicons name={editor.records.includes(record.id) ? 'checkbox-outline' : 'square-outline'} size={20} color="#1d4ed8" />
                <Text style={[styles.rowTitle, styles.rowCopy]}>{record.title}</Text>
              </TouchableOpacity>)}
              {waiting ? <ActivityIndicator /> : next !== null ? <TouchableOpacity accessibilityRole="button" onPress={() => void more()} style={styles.pageLink}><Text style={styles.pageLinkText}>Load more</Text></TouchableOpacity> : null}
              <Text style={styles.inputLabel}>Price channel</Text>
              <TextInput value={editor.values.channel} onChangeText={(channel) => setEditor((current) => current ? { ...current, values: { ...current.values, channel } } : null)} style={styles.input} editable={!busy} />
            </View> : null}
            <View style={styles.editorActions}>
              <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => setEditor(null)} style={styles.pageLink}><Text style={styles.pageLinkText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void saveEditor()} style={[styles.publish, busy && styles.disabled]}><Text style={styles.publishText}>Save card</Text></TouchableOpacity>
            </View>
          </View> : null}
          {candidate && candidate.version === version ? <View style={styles.card}>
            <Text style={styles.eyebrow}>REVIEW CANDIDATE</Text>
            {site?.pages.map((page) => <TouchableOpacity key={page.id} accessibilityRole="link" onPress={() => {
              const target = page.path === '/' ? candidate.previewUrl : `${candidate.previewUrl}${page.path.replace(/^\//, '')}`;
              void Linking.openURL(target).catch((error) => { setMessage(errorText(error)); setPhase('error'); });
            }} style={styles.row}><Text style={styles.rowTitle}>{page.title}</Text><Ionicons name="open-outline" size={16} color="#64748b" /></TouchableOpacity>)}
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
          {liveUrl && <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={unpublish} style={[styles.refresh, busy && styles.disabled]}><Text style={styles.refreshText}>Unpublish site</Text></TouchableOpacity>}
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
            <Text style={styles.publishText}>{candidate && candidate.version === version ? 'Confirm Publish' : 'Compile for review'}</Text>
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
  chosen: { borderBottomWidth: 2, borderBottomColor: '#1d4ed8' },
  releaseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  refresh: { alignSelf: 'flex-start', borderRadius: 9, backgroundColor: '#eef2ff', padding: 12 },
  refreshText: { color: '#3730a3', fontWeight: '700', fontSize: 13 },
  inputLabel: { color: '#475569', fontSize: 12, fontWeight: '600' },
  editorField: { gap: 6 },
  editorMultiline: { minHeight: 90 },
  editorActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 9 },
});
