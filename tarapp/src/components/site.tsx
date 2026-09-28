/**
 * Site Studio: the conversational-first review surface.
 *
 * Prompts propose a patch. This screen selects the target, shows the diff and
 * owns the human-only acts: asset rights, locks, choosing a candidate and
 * publishing. Deterministic edits never need a model call.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { harness, HARNESS_URL } from '@/lib/harness';
import { PREVIEW_FRAMES, type AskOutcome, type AssetSummary, type Checks, type DiffEntry, type ReleaseManifest, type SiteDocument, type SiteSnapshot } from '@/lib/site-schema';

export interface SiteScreenProps { visible: boolean; onClose: () => void; workspaceName: string; subdomain: string; scope: string; products?: { title?: string; name?: string }[] }

type Tab = 'ask' | 'pages' | 'assets' | 'design' | 'history' | 'release';
type Candidate = { releaseId: string; hash: string; previewUrl: string | null; checks: Checks | null; revision: number };

const TABS: { key: Tab; label: string }[] = [
  { key: 'ask', label: 'Ask' },
  { key: 'pages', label: 'Pages' },
  { key: 'assets', label: 'Assets' },
  { key: 'design', label: 'Design' },
  { key: 'history', label: 'History' },
  { key: 'release', label: 'Release' },
];

function errorText(error: unknown): string { return error instanceof Error ? error.message : 'TAR could not complete this site action.'; }

function sectionTitle(section: { id: string; nodes: { kind: string; props: Record<string, unknown> }[] }): string {
  const heading = section.nodes.find((node) => node.kind === 'heading');
  const text = heading && typeof heading.props.text === 'string' ? heading.props.text.trim() : '';
  return text || section.id;
}

function frameUrl(base: string, path: string, frame?: string): string {
  const suffix = path === '/' ? '' : path.replace(/^\//, '');
  return `${base}${suffix}${frame ? `?frame=${frame}` : ''}`;
}

export default function SiteScreen({ visible, onClose, workspaceName, scope }: SiteScreenProps) {
  const insets = useSafeAreaInsets();
  const slug = useMemo(() => scope.replace(/^w:/, '').trim() || workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), [scope, workspaceName]);
  const closed = useRef(false);
  const [snapshot, setSnapshot] = useState<SiteSnapshot | null>(null);
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [releases, setReleases] = useState<ReleaseManifest[]>([]);
  const [tab, setTab] = useState<Tab>('ask');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [brief, setBrief] = useState('');
  const [command, setCommand] = useState('');
  const [proposal, setProposal] = useState<AskOutcome | null>(null);
  const [diff, setDiff] = useState<DiffEntry[]>([]);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [designDraft, setDesignDraft] = useState('');
  const [decisions, setDecisions] = useState<{ area: string; question: string; choice: string }[]>([]);
  const [illustration, setIllustration] = useState('');
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
    if (!next.site) { setAssets([]); setReleases([]); return; }
    const id = next.site.id;
    const [assetList, releaseList] = await Promise.all([
      harness.site.assets(slug, id).catch(() => ({ assets: [] as AssetSummary[] })),
      harness.site.releases(slug, id).catch(() => ({ releases: [] as ReleaseManifest[] })),
    ]);
    if (closed.current) return;
    setAssets(assetList.assets);
    setReleases(releaseList.releases);
  }, [slug]);

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

  /** Runs when the sheet opens: clears transient review state, then reloads. */
  const openSheet = useCallback(() => {
    setProposal(null); setDiff([]); setCandidate(null); setMessage(''); setFailed(false); setReviewed(false);
    setBusy(true);
    void load().catch(() => undefined).finally(() => { if (!closed.current) setBusy(false); });
  }, [load]);

  // A one-shot fetch when the sheet opens is the intended external-system effect.
  // The rule's cascading-render concern does not apply, and without it a platform
  // that does not fire Modal.onShow would show "Not created" for an existing site.
  useEffect(() => {
    if (!visible || snapshot) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch(() => undefined);
  }, [visible, snapshot, load]);

  const generate = useCallback(async () => {
    if (!brief.trim()) { setMessage('Describe what the site should achieve.'); setFailed(true); return; }
    const created = await run(() => harness.site.generate(slug, { title: workspaceName || 'Workspace', prompt: brief.trim() }), 'Draft created. Review the pages, then compile a candidate.');
    if (!closed.current && created) { setBrief(''); if (created.note) { setMessage(created.note); setFailed(true); } }
  }, [brief, run, slug, workspaceName]);

  const ask = useCallback(async () => {
    if (!siteId || !command.trim()) return;
    const asked = await run(() => harness.site.ask(slug, siteId, command.trim()), '');
    if (!asked || closed.current) return;
    setProposal(asked);
    if (asked.operations.length) setMessage(`${asked.operations.length} proposed change${asked.operations.length === 1 ? '' : 's'} for ${asked.target || 'an unresolved target'}.`);
    else { setMessage(asked.questions[0] || 'Describe the change with a section and a value.'); setFailed(true); }
  }, [command, run, siteId, slug]);

  const apply = useCallback(async () => {
    if (!siteId || !proposal || !proposal.operations.length) return;
    const edited = await run(() => harness.site.edit(slug, siteId, proposal.base, proposal.operations, proposal.summary), 'Change applied.');
    if (!edited || closed.current) return;
    setDiff(edited.diff); setProposal(null); setCommand(''); setCandidate(null);
  }, [proposal, run, siteId, slug]);

  const undo = useCallback(async (revision?: number) => {
    if (!siteId) return;
    const restored = await run(() => harness.site.undo(slug, siteId, revision), 'Restored as a new revision.');
    if (restored && !closed.current) { setDiff(restored.diff); setCandidate(null); }
  }, [run, siteId, slug]);

  const toggleLock = useCallback(async (target: string, kind: 'section' | 'node') => {
    if (!siteId || !site) return;
    const isLocked = locked.has(target);
    await run(() => harness.site.edit(slug, siteId, site.revision, [
      isLocked ? { op: 'unlock', target } : { op: 'lock', target, kind },
    ]), isLocked ? 'Unlocked.' : 'Locked. Regeneration leaves this part unchanged.');
  }, [locked, run, site, siteId, slug]);

  const compile = useCallback(async () => {
    if (!siteId || !site) return;
    const compiled = await run(() => harness.site.compile(slug, siteId), '');
    if (!compiled || closed.current) return;
    const checked = await run(() => harness.site.checks(slug, siteId, compiled.releaseId), '');
    if (closed.current) return;
    const blocking = checked?.checks?.blocking.length ?? 0;
    setCandidate({
      releaseId: compiled.releaseId, hash: compiled.hash,
      previewUrl: compiled.previewUrl ? `${HARNESS_URL}${compiled.previewUrl}` : null,
      checks: checked?.checks ?? null, revision: site.revision,
    });
    setMessage(blocking
      ? `${blocking} blocking check${blocking === 1 ? '' : 's'} must be resolved before publishing.`
      : 'Candidate passed its blocking checks. Open every route, then confirm the facts to publish.');
    setFailed(blocking > 0);
  }, [run, site, siteId, slug]);

  const publish = useCallback(async () => {
    if (!siteId || !candidate) return;
    if ((candidate.checks?.blocking.length ?? 0) > 0) { setMessage('Resolve the blocking checks and compile again.'); setFailed(true); return; }
    if (!reviewed) { setMessage('Confirm that you reviewed the factual content and this exact candidate.'); setFailed(true); return; }
    const published = await run(() => harness.site.publish(slug, siteId, candidate.releaseId, candidate.hash), 'Published. Open the live address to review it.');
    if (published && !closed.current) { setCandidate(null); setReviewed(false); }
  }, [candidate, reviewed, run, siteId, slug]);

  const rollback = useCallback(async (releaseId: string) => {
    if (!siteId) return;
    await run(() => harness.site.rollback(slug, siteId, releaseId), 'Retained release restored and live.');
  }, [run, siteId, slug]);

  const refresh = useCallback(async () => {
    if (!siteId) return;
    const refreshed = await run(() => harness.site.refresh(slug, siteId));
    if (refreshed && !closed.current) setMessage(`Public data refreshed from the published release (${refreshed.itemCount} item${refreshed.itemCount === 1 ? '' : 's'}).`);
  }, [run, siteId, slug]);

  const unpublish = useCallback(() => {
    if (!siteId) return;
    const detail = 'Visitors stop receiving this site. The draft and retained releases stay available.';
    const act = async () => {
      await run(() => harness.site.unpublish(slug, siteId), 'Unpublished. Public serving is blocked.');
      if (!closed.current) setCandidate(null);
    };
    if (Platform.OS === 'web') { if (window.confirm(`Unpublish site?\n\n${detail}`)) void act(); return; }
    Alert.alert('Unpublish site?', detail, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unpublish', style: 'destructive', onPress: () => { void act(); } },
    ]);
  }, [run, siteId, slug]);

  const approveAsset = useCallback(async (asset: AssetSummary, approved: boolean) => {
    if (!siteId || !site) return;
    await run(() => harness.site.edit(slug, siteId, site.revision, [
      { op: 'set_asset_rights', target: asset.id, value: { approved } },
    ]), approved ? 'Asset approved for publication.' : 'Asset approval removed.');
  }, [run, site, siteId, slug]);

  const illustrate = useCallback(async () => {
    if (!siteId || !illustration.trim()) return;
    await run(() => harness.site.assetGenerate(slug, siteId, illustration.trim()), 'Illustration added. Approve its rights before publishing.');
    if (!closed.current) setIllustration('');
  }, [illustration, run, siteId, slug]);

  const importDesign = useCallback(async () => {
    if (!siteId || !designDraft.trim()) return;
    const imported = await run(() => harness.site.designImport(slug, siteId, designDraft), '');
    if (!imported || closed.current) return;
    setDecisions(imported.decisions); setDesignDraft(imported.designMarkdown);
    setMessage(imported.decisions.length
      ? `Design imported with ${imported.decisions.length} recorded decision${imported.decisions.length === 1 ? '' : 's'}.`
      : 'Design imported.');
    setFailed(false);
  }, [designDraft, run, siteId, slug]);

  const openPage = useCallback((path: string, frame?: string) => {
    const base = candidate?.previewUrl || snapshot?.publicUrl;
    if (!base) { setMessage('Compile a candidate or publish the site to open a page.'); setFailed(true); return; }
    void Linking.openURL(frameUrl(base, path, frame)).catch((error) => { setMessage(errorText(error)); setFailed(true); });
  }, [candidate, snapshot]);

  const blocking = candidate?.checks?.blocking.length ?? 0;
  const advisory = candidate?.checks?.advisory.length ?? 0;
  const candidateFresh = candidate !== null && site !== null && candidate.revision === site.revision;
  const busyOr = (extra: boolean) => busy || extra;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onShow={openSheet} onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Site Studio</Text>
            <Text style={styles.subtitle}>
              {workspaceName || 'Workspace'} · {snapshot?.publicationState === 'active' ? 'Live' : site ? 'Draft' : 'Not created'}{site ? ` · revision ${site.revision}` : ''}
            </Text>
          </View>
          {busy ? <ActivityIndicator size="small" color="#0f172a" /> : null}
          <TouchableOpacity accessibilityLabel="Close Site Studio" onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {site ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsRow}>
            {TABS.map((entry) => (
              <TouchableOpacity key={entry.key} accessibilityRole="tab" accessibilityState={{ selected: tab === entry.key }} onPress={() => setTab(entry.key)} style={[styles.tab, tab === entry.key && styles.tabActive]}>
                <Text style={[styles.tabText, tab === entry.key && styles.tabTextActive]}>{entry.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!site ? (
            <View style={styles.card}>
              <Text style={styles.eyebrow}>CREATE A DRAFT</Text>
              <Text style={styles.body}>Describe the goal. TAR plans pages from approved facts, drafts a typed site, and shows its assumptions. Nothing is public until you publish a reviewed candidate.</Text>
              <TextInput style={styles.input} value={brief} onChangeText={setBrief} placeholder="What should this site achieve, and for whom?" placeholderTextColor="#94a3b8" multiline editable={!busy} />
              <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void generate()} style={[styles.publish, busy && styles.disabled]}>
                <Text style={styles.publishText}>Create draft</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {site && tab === 'ask' ? (
            <>
              <View style={styles.card}>
                <Text style={styles.eyebrow}>ASK FOR A CHANGE</Text>
                <Text style={styles.body}>Name a section and a value (“make the hero background ink”). Exact names and values resolve without a model; anything ambiguous comes back as a question. Nothing changes until you confirm.</Text>
                <TextInput style={styles.input} value={command} onChangeText={setCommand} placeholder="Make the hero background ink" placeholderTextColor="#94a3b8" multiline editable={!busy} />
                <TouchableOpacity accessibilityRole="button" disabled={busyOr(!command.trim())} onPress={() => void ask()} style={[styles.publish, busyOr(!command.trim()) && styles.disabled]}>
                  <Text style={styles.publishText}>Propose change</Text>
                </TouchableOpacity>
              </View>

              {proposal ? (
                <View style={styles.card}>
                  <Text style={styles.eyebrow}>PROPOSED PATCH</Text>
                  <Text style={styles.cardTitle}>{proposal.summary || 'Resolved change'}</Text>
                  <Text style={styles.body}>Target: {proposal.target || 'not resolved'}{proposal.targetKind ? ` (${proposal.targetKind})` : ''} · base revision {proposal.base}</Text>
                  {proposal.questions.map((question) => <Text key={question} style={styles.warning}>{question}</Text>)}
                  {proposal.operations.map((operation, index) => (
                    <Text key={`${operation.op}-${index}`} style={styles.code}>{JSON.stringify(operation).slice(0, 200)}</Text>
                  ))}
                  {proposal.operations.length ? (
                    <View style={styles.actions}>
                      <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void apply()} style={[styles.publish, busy && styles.disabled]}>
                        <Text style={styles.publishText}>Apply {proposal.operations.length} change{proposal.operations.length === 1 ? '' : 's'}</Text>
                      </TouchableOpacity>
                      {proposal.target ? (
                        <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void toggleLock(proposal.target!, proposal.targetKind === 'node' ? 'node' : 'section')} style={styles.pageLink}>
                          <Text style={styles.pageLinkText}>{locked.has(proposal.target) ? 'Unlock this part' : 'Lock this part'}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {diff.length ? (
                <View style={styles.card}>
                  <Text style={styles.eyebrow}>LAST CHANGE</Text>
                  {diff.slice(0, 14).map((entry, index) => (
                    <Text key={`${entry.target}-${index}`} style={styles.code}>{entry.target} · {entry.kind}: {entry.from || '—'} → {entry.to || '—'}</Text>
                  ))}
                  <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void undo()} style={styles.pageLink}>
                    <Text style={styles.pageLinkText}>Undo (writes a new revision)</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          ) : null}

          {site && tab === 'pages' ? (
            <>
              {site.pages.map((page) => (
                <View key={page.id} style={styles.card}>
                  <Text style={styles.eyebrow}>{page.path}</Text>
                  <Text style={styles.cardTitle}>{page.title}</Text>
                  {page.meta?.description ? <Text style={styles.body}>{page.meta.description}</Text> : null}
                  <View style={styles.actions}>
                    {PREVIEW_FRAMES.map((frame) => (
                      <TouchableOpacity key={frame.key} accessibilityRole="link" onPress={() => openPage(page.path, frame.key)} style={styles.pageLink}>
                        <Text style={styles.pageLinkText}>{frame.label} {frame.width}px</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {page.sections.map((section) => (
                    <View key={section.id} style={styles.sectionRow}>
                      <View style={styles.rowCopy}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{sectionTitle(section)}</Text>
                        <Text style={styles.rowMeta}>{section.purpose} · {section.nodes.length} node{section.nodes.length === 1 ? '' : 's'}{section.bindings?.length ? ' · live data' : ''}</Text>
                      </View>
                      <TouchableOpacity accessibilityRole="button" accessibilityLabel={locked.has(section.id) ? `Unlock ${section.id}` : `Lock ${section.id}`} onPress={() => void toggleLock(section.id, 'section')} style={styles.lockButton}>
                        <Ionicons name={locked.has(section.id) ? 'lock-closed' : 'lock-open-outline'} size={18} color={locked.has(section.id) ? '#b45309' : '#64748b'} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ))}
              {site.journeys.length ? (
                <View style={styles.card}>
                  <Text style={styles.eyebrow}>JOURNEYS</Text>
                  {site.journeys.map((journey) => (
                    <Text key={journey.id} style={styles.body}>{journey.title} · {journey.kind} → {journey.target} · {journey.enabled ? 'enabled' : 'disabled until policy and adapters allow it'}</Text>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          {site && tab === 'assets' ? (
            <>
              <View style={styles.card}>
                <Text style={styles.eyebrow}>ILLUSTRATIONS</Text>
                <Text style={styles.body}>Only approved media is copied into a release, and generated imagery never stands in for product evidence.</Text>
                <TextInput style={styles.input} value={illustration} onChangeText={setIllustration} placeholder="Describe an illustration (not a product photo)" placeholderTextColor="#94a3b8" editable={!busy} />
                <TouchableOpacity accessibilityRole="button" disabled={busyOr(!illustration.trim())} onPress={() => void illustrate()} style={[styles.action, busyOr(!illustration.trim()) && styles.disabled]}>
                  <Text style={styles.actionText}>Generate illustration</Text>
                </TouchableOpacity>
              </View>
              {assets.length ? assets.map((asset) => (
                <View key={asset.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{asset.id}</Text>
                  <Text style={styles.rowMeta}>{asset.kind} · {asset.mime} · {Math.round(asset.bytes / 1024)}KB{asset.width ? ` · ${asset.width}×${asset.height}` : ''} · {asset.used ? 'used on a page' : 'unused'}</Text>
                  <Text style={styles.rowMeta}>Rights: {asset.rights.source} · {asset.rights.license} · {asset.rights.approved ? 'approved' : 'not approved'}{asset.generated ? ' · generated illustration' : ''}</Text>
                  {asset.alt ? <Text style={styles.rowMeta}>Alt text: {asset.alt}</Text> : <Text style={styles.warning}>Images need alt text before publishing.</Text>}
                  <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void approveAsset(asset, !asset.rights.approved)} style={styles.pageLink}>
                    <Text style={styles.pageLinkText}>{asset.rights.approved ? 'Remove approval' : 'Approve for publication'}</Text>
                  </TouchableOpacity>
                </View>
              )) : <View style={styles.card}><Text style={styles.body}>No assets yet.</Text></View>}
            </>
          ) : null}

          {site && tab === 'design' ? (
            <>
              <View style={styles.card}>
                <Text style={styles.eyebrow}>DESIGN.MD</Text>
                <Text style={styles.body}>This is the readable view of the typed design. Importing records the reference, its hash and every decision it had to make; imported text can never change policy or grant permission.</Text>
                <TextInput style={[styles.input, styles.design]} value={designDraft} onChangeText={setDesignDraft} multiline textAlignVertical="top" editable={!busy} />
                <TouchableOpacity accessibilityRole="button" disabled={busyOr(!designDraft.trim())} onPress={() => void importDesign()} style={[styles.publish, busyOr(!designDraft.trim()) && styles.disabled]}>
                  <Text style={styles.publishText}>Import design reference</Text>
                </TouchableOpacity>
              </View>
              {decisions.length ? (
                <View style={styles.card}>
                  <Text style={styles.eyebrow}>RECORDED DECISIONS</Text>
                  {decisions.map((decision, index) => (
                    <Text key={`${decision.question}-${index}`} style={styles.code}>{decision.area}: {decision.question} → {decision.choice}</Text>
                  ))}
                </View>
              ) : null}
              {site.design.source ? (
                <View style={styles.card}>
                  <Text style={styles.eyebrow}>PROVENANCE</Text>
                  <Text style={styles.rowMeta}>Reference revision {site.design.source.revision} · hash {site.design.source.hash.slice(0, 16)}…</Text>
                  <Text style={styles.rowMeta}>{site.design.source.decisions.length} recorded decision{site.design.source.decisions.length === 1 ? '' : 's'}</Text>
                </View>
              ) : null}
            </>
          ) : null}

          {site && tab === 'history' ? (
            <>
              <View style={styles.card}>
                <Text style={styles.eyebrow}>REVISIONS</Text>
                <Text style={styles.body}>Undo never rewrites the past: it restores an earlier revision by writing a new one.</Text>
                <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void undo()} style={styles.pageLink}>
                  <Text style={styles.pageLinkText}>Undo the last change</Text>
                </TouchableOpacity>
                {(snapshot?.history ?? []).slice().reverse().map((entry) => (
                  <View key={`${entry.revision}-${entry.at}`} style={styles.sectionRow}>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>Revision {entry.revision}</Text>
                      <Text style={styles.rowMeta}>{new Date(entry.at).toLocaleString()} · {entry.summary || 'edit'}</Text>
                    </View>
                    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void undo(entry.revision)} style={styles.pageLink}>
                      <Text style={styles.pageLinkText}>Restore</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={styles.card}>
                <Text style={styles.eyebrow}>RELEASES</Text>
                {releases.length ? releases.slice().reverse().map((release) => (
                  <View key={release.id} style={styles.sectionRow}>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>Release {release.generation}{release.id === liveRelease ? ' · Live' : ''}</Text>
                      <Text style={styles.rowMeta}>{new Date(release.created).toLocaleString()} · compiler {release.compiler || '1.0.0'}{release.checks ? ` · ${release.checks.blocking} blocking, ${release.checks.advisory} advisory` : ''}</Text>
                    </View>
                    {release.id === liveRelease ? null : (
                      <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void rollback(release.id)} style={styles.pageLink}>
                        <Text style={styles.pageLinkText}>Restore</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )) : <Text style={styles.body}>No releases yet.</Text>}
              </View>
            </>
          ) : null}

          {site && tab === 'release' ? (
            <>
              <View style={styles.card}>
                <Text style={styles.eyebrow}>REVIEW AND PUBLISH</Text>
                <Text style={styles.body}>Compiling freezes this revision into a candidate. Read the checks, open every route below, then confirm the facts. Publishing promotes exactly that candidate.</Text>
                <View style={styles.actions}>
                  <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void compile()} style={[styles.publish, busy && styles.disabled]}>
                    <Text style={styles.publishText}>Compile candidate</Text>
                  </TouchableOpacity>
                  {snapshot?.publicationState === 'active' ? (
                    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void refresh()} style={styles.pageLink}>
                      <Text style={styles.pageLinkText}>Refresh public data</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {candidate ? (
                <View style={styles.card}>
                  <Text style={styles.eyebrow}>CANDIDATE {candidate.releaseId.slice(0, 14)}…</Text>
                  <Text style={styles.rowMeta}>{blocking} blocking · {advisory} advisory{candidate.checks?.claims ? ` · ${candidate.checks.claims} claim${candidate.checks.claims === 1 ? '' : 's'} checked` : ''}</Text>
                  {!candidateFresh ? <Text style={styles.warning}>The draft changed after this candidate was compiled. Compile again before publishing.</Text> : null}
                  {(candidate.checks?.blocking ?? []).map((issue, index) => (
                    <Text key={`b-${index}`} style={styles.errorText}>{issue.path}: {issue.message}</Text>
                  ))}
                  {(candidate.checks?.advisory ?? []).slice(0, 8).map((issue, index) => (
                    <Text key={`a-${index}`} style={styles.warning}>{issue.path}: {issue.message}</Text>
                  ))}
                  <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: reviewed }} onPress={() => setReviewed(!reviewed)} style={styles.checkRow}>
                    <Ionicons name={reviewed ? 'checkbox' : 'square-outline'} size={18} color="#1d4ed8" />
                    <Text style={styles.checkLabel}>I reviewed the factual content and this exact candidate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" disabled={busy || blocking > 0 || !candidateFresh} onPress={() => void publish()} style={[styles.publish, (busy || blocking > 0 || !candidateFresh) && styles.disabled]}>
                    <Text style={styles.publishText}>Publish</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {snapshot?.publicUrl ? (
                <View style={styles.card}>
                  <Text style={styles.eyebrow}>PUBLIC ADDRESS</Text>
                  <TouchableOpacity accessibilityRole="link" onPress={() => void Linking.openURL(snapshot.publicUrl!).catch(() => undefined)}>
                    <Text style={styles.link}>{snapshot.publicUrl}</Text>
                  </TouchableOpacity>
                  <Text style={styles.rowMeta}>Live release {liveRelease ? `${liveRelease.slice(0, 14)}…` : 'none'}</Text>
                  <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={unpublish} style={styles.pageLink}>
                    <Text style={styles.pageLinkText}>Unpublish</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {site.claims?.length ? (
                <View style={styles.card}>
                  <Text style={styles.eyebrow}>CLAIMS CHECKED AGAINST SUPPLIED FACTS</Text>
                  {site.claims.map((claim, index) => (
                    <Text key={`claim-${index}`} style={claim.verdict === 'contradicted' ? styles.errorText : styles.rowMeta}>[{claim.verdict}] {claim.text}</Text>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          {!!message && (
            <View style={[styles.status, failed && styles.statusError]}>
              <Text style={styles.statusText}>{message}</Text>
            </View>
          )}
        </ScrollView>

        {site ? (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.composer}>
            <Text style={styles.inputLabel}>Ask for a change</Text>
            <View style={styles.composerRow}>
              <TextInput
                style={[styles.input, styles.composerInput]}
                value={command}
                onChangeText={setCommand}
                placeholder="Make this warmer, keep the logo, simplify the first page"
                placeholderTextColor="#94a3b8"
                editable={!busy}
                onSubmitEditing={() => void ask()}
              />
              <TouchableOpacity accessibilityRole="button" disabled={busyOr(!command.trim())} onPress={() => void ask()} style={[styles.publish, busyOr(!command.trim()) && styles.disabled]}>
                <Text style={styles.publishText}>Ask</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#ffffff' },
  headerCopy: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  subtitle: { marginTop: 2, color: '#64748b', fontSize: 12 },
  closeButton: { padding: 8 },
  tabs: { maxHeight: 46, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tabsRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  tab: { borderRadius: 999, backgroundColor: '#eef2f7', paddingHorizontal: 14, paddingVertical: 7 },
  tabActive: { backgroundColor: '#1d4ed8' },
  tabText: { color: '#334155', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#ffffff' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 15, gap: 9, backgroundColor: '#ffffff' },
  eyebrow: { color: '#64748b', fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  cardTitle: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
  body: { color: '#475569', fontSize: 13, lineHeight: 19 },
  rowCopy: { flex: 1 },
  rowTitle: { color: '#1e293b', fontWeight: '600' },
  rowMeta: { marginTop: 2, color: '#94a3b8', fontSize: 11 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderColor: '#f1f5f9' },
  lockButton: { padding: 6 },
  input: { minHeight: 42, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, color: '#0f172a', textAlignVertical: 'top', backgroundColor: '#ffffff' },
  design: { minHeight: 220, fontSize: 12, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, alignItems: 'center' },
  publish: { alignItems: 'center', borderRadius: 9, backgroundColor: '#0f172a', paddingVertical: 12, paddingHorizontal: 16 },
  publishText: { color: '#ffffff', fontWeight: '700' },
  action: { alignItems: 'center', borderRadius: 9, backgroundColor: '#e2e8f0', paddingVertical: 12, paddingHorizontal: 16 },
  actionText: { color: '#0f172a', fontWeight: '700' },
  pageLink: { borderRadius: 8, backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 9 },
  pageLinkText: { color: '#1d4ed8', fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  code: { color: '#334155', fontSize: 12, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
  warning: { color: '#b45309', fontSize: 12 },
  errorText: { color: '#b91c1c', fontSize: 12 },
  link: { color: '#1d4ed8', fontSize: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  checkLabel: { flex: 1, color: '#334155', fontSize: 13 },
  status: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 13 },
  statusError: { backgroundColor: '#fef2f2' },
  statusText: { color: '#475569', fontSize: 13, lineHeight: 18 },
  composer: { borderTopWidth: 1, borderColor: '#e2e8f0', padding: 12, gap: 8, backgroundColor: '#ffffff' },
  composerRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-end' },
  composerInput: { flex: 1, minHeight: 44 },
  inputLabel: { color: '#475569', fontSize: 12, fontWeight: '600' },
});
