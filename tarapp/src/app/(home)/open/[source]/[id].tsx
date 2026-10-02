import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionInterfaceHost from '@/action-interfaces/ActionInterfaceHost';
import OpenedRecord from '@/components/OpenedRecord';
import { createOperationKey, harness, type HarnessAction, type HarnessInterfaceContract, type HarnessRecord, type HarnessWorkspace, type Link, type NowRow } from '@/lib/harness';
import { requestNowReload } from '@/lib/now-navigation';

type Detail = { row: NowRow; record: HarnessRecord; workspace: HarnessWorkspace };
const blue = '#3157A8';

export default function OpenNowRow() {
  const { source, id } = useLocalSearchParams<{ source: string; id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [actions, setActions] = useState<HarnessAction[]>([]);
  const [contracts, setContracts] = useState<HarnessInterfaceContract[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [registryLoading, setRegistryLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [receivedQuantity, setReceivedQuantity] = useState('');
  const [openedAction, setOpenedAction] = useState<HarnessAction | null>(null);

  const load = useCallback(async () => {
    if (!source || !id) return;
    setLoading(true);
    setRegistryLoading(true);
    setError('');
    try {
      void harness.workspaceRegistry(source)
        .then((registry) => { setActions(registry.actions); setContracts(registry.interfaces); })
        .catch(() => { setActions([]); setContracts([]); })
        .finally(() => setRegistryLoading(false));
      const fresh = await harness.nowDetail(source, id);
      setDetail(fresh);
      setReceivedQuantity(fresh.row.quantity === null ? '' : String(fresh.row.quantity));
      setLoading(false);
      void harness.links(source, fresh.record.id).then((linked) => setLinks(linked.links)).catch(() => setLinks([]));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Source is unavailable. Refresh Now.'); setLoading(false); setRegistryLoading(false); }
  }, [source, id]);
  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load]);

  const beginAction = async (chosen: string) => {
    const row = detail?.row;
    if (!row) return;
    if (chosen === 'pos.order.item.update' || chosen === 'purchase.receive') {
      let input = row.input;
      if (chosen === 'purchase.receive') {
        const quantity = Number(receivedQuantity);
        const line = Array.isArray(row.input.lines) ? row.input.lines[0] as Record<string, unknown> | undefined : undefined;
        if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > (row.quantity || 0) || typeof line?.variant !== 'string') {
          Alert.alert('Choose a valid quantity', `Enter 1 to ${row.quantity || 0} units received.`);
          return;
        }
        input = { ...row.input, lines: [{ variant: line.variant, quantity }] };
      }
      setCommitting(true);
      try {
        await harness.executeAction(source, chosen, input, createOperationKey(`now:${row.id}:${row.version}`));
        requestNowReload(detail.workspace.id);
        router.back();
      } catch (cause) { Alert.alert('Action could not complete', cause instanceof Error ? cause.message : 'Refresh Now and try again.'); }
      finally { setCommitting(false); }
      return;
    }
    const action = actions.find((candidate) => candidate.id === chosen);
    if (!action) { Alert.alert('Action unavailable', 'The source action is unavailable for your role. Refresh and try again.'); return; }
    setOpenedAction(action);
  };

  const row = detail?.row;
  const flowAction = row?.kind === 'flow' ? actions.find((item) => item.id === row.action && item.interfaceKey === 'flow') : null;
  const artifactLinks = links.filter((link) => /artifact|guide|receipt|report|document|invoice/i.test(`${link.role} ${link.other.type}`));
  const buttonLabel = row?.action === 'pos.order.item.update' ? String(row.input.status) === 'ready' ? 'Mark ready' : 'Start preparing'
    : row?.action === 'purchase.receive' ? 'Receive line' : row?.action === 'pos.order.accept' ? 'Accept order'
    : row?.action === 'pos.order.handoff' ? 'Confirm handoff' : row?.kind === 'flow' ? 'Open Flow Book' : 'Open action';

  if (flowAction && detail) return <ActionInterfaceHost inline action={flowAction} contracts={contracts} scope={source} initialInput={row?.input} contextTitle={row?.title}
    onClose={() => router.back()} onSuccess={() => { requestNowReload(detail.workspace.id); router.back(); }} />;

  return <View style={[styles.page, { paddingTop: insets.top }]}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to Now" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color={blue} /><Text style={styles.backText}>Now</Text></Pressable><Text style={styles.kind}>{row?.kind?.toUpperCase() || 'WORK'}</Text></View>
    {loading ? <ActivityIndicator color={blue} style={styles.loading} /> : error ? <View style={styles.message}><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.link}>Try again</Text></Pressable></View> : detail ? <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{row?.quantity ? `${row.quantity}× ` : ''}{row?.title}</Text>
        <Text style={styles.meta}>{detail.workspace.name} / {row?.role}</Text>
        <Text style={styles.meta}>Owner: {detail.workspace.owner || 'Workspace owner'}</Text>
        {row?.parent ? <Text style={styles.meta}>Parent: {row.parent}</Text> : null}
        {row?.due ? <Text style={styles.meta}>Due: {new Date(row.due).toLocaleString()}</Text> : null}
        <OpenedRecord record={detail.record} />
        {artifactLinks.map((link) => <Pressable key={link.id} accessibilityRole="button" style={styles.linkRow} onPress={() => router.push({ pathname: '/(home)/record/[source]/[id]', params: { source, id: link.other.id } })}><Text style={styles.link}>{link.other.name}</Text><Ionicons name="chevron-forward" size={18} color={blue} /></Pressable>)}
        {row?.action === 'purchase.receive' ? <View style={styles.quantity}><Text style={styles.meta}>Received quantity</Text><TextInput accessibilityLabel="Received quantity" keyboardType="number-pad" value={receivedQuantity} onChangeText={setReceivedQuantity} style={styles.input} /></View> : null}
        {!row?.action ? <Text style={styles.meta}>This step is waiting for its source to become ready.</Text> : null}
      </ScrollView>
      {row?.action ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
          <Pressable
            accessibilityRole="button"
            disabled={committing || (registryLoading && row.action !== 'pos.order.item.update' && row.action !== 'purchase.receive')}
            onPress={() => void beginAction(row.action!)}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>
              {committing
                ? 'Working…'
                : registryLoading && row.action !== 'pos.order.item.update' && row.action !== 'purchase.receive'
                ? 'Loading action…'
                : buttonLabel}
            </Text>
          </Pressable>
          {row.action === 'pos.order.accept' ? (
            <Pressable
              accessibilityRole="button"
              disabled={committing}
              onPress={() => void beginAction('pos.order.reject')}
              style={styles.secondary}
            >
              <Text style={styles.link}>Reject order</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={{ height: Math.max(insets.bottom, 16), backgroundColor: '#FFFFFF' }} />
      )}
    </> : null}
    <ActionInterfaceHost action={openedAction} contracts={contracts} scope={source} initialInput={row?.input} contextTitle={row?.title}
      onClose={() => setOpenedAction(null)} onSuccess={() => { setOpenedAction(null); requestNowReload(detail?.workspace.id || source); router.back(); }} />
  </View>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#FFFFFF' }, header: { minHeight: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#D8DBE3' }, back: { flexDirection: 'row', alignItems: 'center', minHeight: 48 }, backText: { color: blue, fontSize: 16, fontWeight: '700' }, kind: { color: '#626671', fontSize: 11, fontWeight: '800', letterSpacing: 1 }, loading: { marginTop: 50 }, message: { padding: 22, gap: 18 }, error: { color: '#825500', fontSize: 15 }, link: { color: blue, fontSize: 15, fontWeight: '700' }, scroll: { flex: 1 }, content: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 40 }, title: { color: '#1B1C20', fontSize: 26, fontWeight: '800', marginBottom: 14 }, meta: { color: '#626671', fontSize: 14, lineHeight: 21, marginBottom: 5 }, linkRow: { minHeight: 52, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#D8DBE3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, quantity: { marginTop: 24 }, input: { minHeight: 48, borderWidth: 1, borderColor: '#D8DBE3', borderRadius: 8, paddingHorizontal: 12, fontSize: 16 }, footer: { backgroundColor: '#FFFFFF', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#D8DBE3', paddingHorizontal: 20, paddingTop: 12 }, primary: { minHeight: 48, backgroundColor: blue, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' }, secondary: { minHeight: 46, alignItems: 'center', justifyContent: 'center' } });
