/** Site Studio is an authenticated TAR Harness client. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { harness, HARNESS_URL } from '@/lib/harness';

type Phase = 'idle' | 'generating' | 'publishing' | 'error';
interface SiteSection { id: string; kind: string; title?: string; }
export interface SiteScreenProps { visible: boolean; onClose: () => void; workspaceName: string; subdomain: string; scope: string; products?: Array<{ title?: string; name?: string }>; }

function errorText(error: unknown): string { return error instanceof Error ? error.message : 'TAR Harness could not complete this site action.'; }

export default function SiteScreen({ visible, onClose, workspaceName, subdomain, scope, products = [] }: SiteScreenProps) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [prompt, setPrompt] = useState('');
  const [sections, setSections] = useState<SiteSection[]>([]);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const closed = useRef(false);

  const slug = useMemo(() => scope.replace(/^w:/, '').trim(), [scope]);
  const defaultDescription = useMemo(() => {
    const items = products.slice(0, 8).map((item) => item.title || item.name).filter(Boolean);
    return `${workspaceName || 'This workspace'}${items.length ? ` offers ${items.join(', ')}` : ''}.`;
  }, [products, workspaceName]);

  useEffect(() => { closed.current = !visible; }, [visible]);

  // Load existing site status when opened
  useEffect(() => {
    if (!visible || !slug) return;
    let active = true;
    (async () => {
      try {
        const res = await harness.site.get(slug);
        if (!active || closed.current) return;
        if (res.site && res.site.data) {
          const cards = res.site.data.pages[0]?.cards || [];
          setSections(cards.map((c) => ({ id: c.id, kind: c.kind, title: c.title })));
          setSiteId(res.site.id);
          if (res.site.state === 'live') {
            setLiveUrl(`${HARNESS_URL}/v1/sites/${encodeURIComponent(subdomain || slug)}`);
            setMessage('Your site is live.');
          } else {
            setMessage('Draft ready. Review its structure, then publish when you are ready.');
          }
        }
      } catch (err) {
        // Non-blocking initial fetch
      }
    })();
    return () => { active = false; };
  }, [visible, slug, subdomain]);

  const generate = useCallback(async (instruction?: string) => {
    if (!slug) return;
    setPhase('generating');
    setMessage('Preparing a verified site draft…');
    try {
      const res = await harness.site.generate(slug, {
        title: workspaceName || 'Workspace',
        prompt: instruction?.trim() || defaultDescription,
      });
      if (closed.current) return;
      setSiteId(res.siteId);
      const cards = res.site.pages[0]?.cards || [];
      setSections(cards.map((c) => ({ id: c.id, kind: c.kind, title: c.title })));
      setMessage('Draft is ready. Review its structure, then publish when you are ready.');
      setPhase('idle');
    } catch (error) {
      if (!closed.current) {
        setMessage(errorText(error));
        setPhase('error');
      }
    }
  }, [defaultDescription, slug, workspaceName]);

  const publish = useCallback(async () => {
    if (!slug) return;
    if (!siteId) {
      await generate();
      return;
    }
    setPhase('publishing');
    setMessage('Verifying and publishing your site…');
    try {
      const res = await harness.site.publish(slug, siteId, subdomain || slug);
      if (closed.current) return;
      const targetUrl = res.liveUrl.startsWith('http') ? res.liveUrl : `${HARNESS_URL}${res.liveUrl}`;
      setLiveUrl(targetUrl);
      setMessage('Your verified site is live.');
      setPhase('idle');
    } catch (error) {
      if (!closed.current) {
        setMessage(errorText(error));
        setPhase('error');
      }
    }
  }, [generate, siteId, slug, subdomain]);

  const busy = phase === 'generating' || phase === 'publishing';
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Site Studio</Text>
            <Text style={styles.subtitle}>Generated and published cleanly by TAR Site Bot</Text>
          </View>
          <TouchableOpacity accessibilityLabel="Close Site Studio" onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.eyebrow}>BUSINESS BRIEF</Text>
            <Text style={styles.cardTitle}>{workspaceName || 'Your workspace'}</Text>
            <Text style={styles.body}>TAR uses verified workspace facts to build a versioned, sanitized site with 12 semantic Card families and zero client-side JavaScript.</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>SITE STRUCTURE</Text>
            {sections.length ? (
              sections.map((section, index) => (
                <View key={`${section.id}-${index}`} style={styles.row}>
                  <Text style={styles.index}>{index + 1}</Text>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>{section.title || titleize(section.kind)}</Text>
                    <Text style={styles.rowMeta}>{section.kind}</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={17} color="#16a34a" />
                </View>
              ))
            ) : (
              <Text style={styles.body}>Create a draft to let TAR Site Bot construct a useful structure from your workspace data.</Text>
            )}
          </View>
          {!!message && (
            <View style={[styles.status, phase === 'error' && styles.statusError]}>
              {busy && <ActivityIndicator size="small" color="#0f172a" />}
              <Text style={styles.statusText}>{message}</Text>
            </View>
          )}
          {liveUrl && (
            <TouchableOpacity style={styles.liveLink} onPress={() => Linking.openURL(liveUrl)}>
              <Ionicons name="globe-outline" size={16} color="#166534" />
              <Text style={styles.liveLinkText}>Open live site</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.composer}>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Describe your business or a change…"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            multiline
            editable={!busy}
          />
          <TouchableOpacity
            disabled={busy}
            onPress={() => {
              const instruction = prompt;
              setPrompt('');
              generate(instruction);
            }}
            style={[styles.action, busy && styles.disabled]}
          >
            <Text style={styles.actionText}>{siteId ? 'Regenerate' : 'Create draft'}</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={busy} onPress={publish} style={[styles.publish, busy && styles.disabled]}>
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
});
