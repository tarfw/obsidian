import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { harness, type ChatProvider, type HarnessMember, type HarnessRole, type TeamChatState, type WorkRole } from '@/lib/harness';

const roles: { label: string; role: Exclude<HarnessRole, 'owner'>; workRole: WorkRole }[] = [
  { label: 'Member', role: 'member', workRole: 'general' },
  { label: 'Cook', role: 'member', workRole: 'cook' },
  { label: 'Cashier', role: 'member', workRole: 'cashier' },
  { label: 'Manager', role: 'admin', workRole: 'general' },
  { label: 'Guest', role: 'guest', workRole: 'general' },
];
const roleLabel = (member: HarnessMember) => member.role === 'owner' ? 'Owner' : roles.find((item) => item.role === member.role && item.workRole === member.workRole)?.label || 'Member';

export default function WorkspaceTeam({ scope, name, onClose, onChanged }: { scope: string; name: string; onClose: () => void; onChanged: () => void }) {
  const insets = useSafeAreaInsets();
  const [chat, setChat] = useState<TeamChatState | null>(null);
  const [members, setMembers] = useState<HarnessMember[]>([]);
  const [self, setSelf] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [editing, setEditing] = useState<HarnessMember | null>(null);
  const [provider, setProvider] = useState<ChatProvider>('slack');
  const [command, setCommand] = useState('');
  const [invitation, setInvitation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(async () => {
    const next = await harness.teamChat(scope); setChat(next);
    if (next.connection) setProvider(next.connection.provider);
    if (next.canManage) { const roster = await harness.members(scope); setMembers(roster.members); setSelf(roster.currentUserId); }
    else { setMembers([]); setSelf(''); }
    setLoaded(true);
  }, [scope]);
  useEffect(() => { let alive = true; const timer = setTimeout(() => { void reload().catch((cause) => { if (alive) { setError(cause instanceof Error ? cause.message : 'Could not load workspace settings.'); setLoaded(true); } }); }, 0); return () => { alive = false; clearTimeout(timer); }; }, [reload]);
  const run = async (work: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await work(); await reload(); onChanged(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save. Try again.'); }
    finally { setBusy(false); }
  };
  const button = (title: string, onPress: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={busy || disabled} onPress={onPress} style={[styles.button, (busy || disabled) && styles.disabled]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
  const openUrl = (url: string) => { void run(async () => { if (!url.startsWith('https://')) throw new Error('A secure provider link is required.'); await Linking.openURL(url); }); };
  const selectedProvider = chat?.providers.find((item) => item.id === provider);
  const begin = (purpose: 'destination' | 'identity') => void run(async () => { const result = await harness.beginChatLink(scope, provider, purpose); setCommand(result.command); });
  const remove = (member: HarnessMember) => Alert.alert('Remove member?', `${member.email} will lose TAR access, including chat Actions. Their chat-platform membership is unchanged.`, [
    { text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void run(() => harness.updateMember(scope, member.id, { state: 'revoked' })) },
  ]);
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <View style={styles.header}><View style={styles.grow}><Text style={styles.title}>Members & chat</Text><Text style={styles.muted}>{name}</Text></View>{button('Close', onClose)}</View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {!loaded || busy ? <ActivityIndicator color="#3559e0" /> : null}
        {!chat && loaded ? button('Retry', () => void run(reload)) : null}
        {chat?.canManage ? <>
          <Text style={styles.heading}>Members</Text><Text style={styles.muted}>Manage workspace access here. Roles apply to Canvas, Inbox and chat.</Text>
          {members.map((member) => <View key={member.id} style={styles.row}>
            <View style={styles.grow}><Text style={styles.label}>{member.name || member.email}</Text><Text style={styles.muted}>{roleLabel(member)} · {member.state}{member.name ? ` · ${member.email}` : ''}</Text></View>
            {member.id !== self && member.role !== 'owner' && (member.role !== 'admin' || chat.role === 'owner') && member.state !== 'revoked' ? <>
              {button('Edit', () => { setEditing(member); setSelectedRole(roles.find((item) => item.role === member.role && item.workRole === member.workRole) || roles[0]); })}
              {button('Remove', () => remove(member))}
            </> : null}
          </View>)}
          <Text style={styles.subheading}>{editing ? `Edit ${editing.email}` : 'Add member'}</Text>
          {!editing ? <TextInput accessibilityLabel="Member Google email" placeholder="Member Google email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input} /> : null}
          <View style={styles.choices}>{roles.filter((item) => item.role !== 'admin' || chat.role === 'owner').map((item) => <Pressable key={item.label} accessibilityRole="radio" accessibilityState={{ selected: selectedRole.label === item.label }} disabled={busy} onPress={() => setSelectedRole(item)} style={[styles.choice, selectedRole.label === item.label && styles.selected]}><Text>{item.label}</Text></Pressable>)}</View>
          {button(editing ? 'Save role' : 'Add member', () => void run(async () => {
            if (editing) await harness.updateMember(scope, editing.id, selectedRole);
            else await harness.inviteMember(scope, email.trim(), selectedRole.role, selectedRole.workRole);
            setEmail(''); setEditing(null); setSelectedRole(roles[0]);
          }), !editing && !email.trim())}
          {editing ? button('Cancel edit', () => setEditing(null)) : <Text style={styles.muted}>Access activates when they sign in with this Google email. Share your TAR app link with them; no email is sent automatically.</Text>}
        </> : null}
        {chat ? <>
          <Text style={styles.heading}>Team chat</Text>
          <Text style={styles.muted}>One team destination. Your TAR role controls business Actions; channel roles control chat administration.</Text>
          {chat.connection ? <>
            <Text style={styles.subheading}>{selectedProvider?.name} · {chat.connection.name}</Text>
            {chat.connection.joinUrl ? button('Join team channel', () => openUrl(chat.connection!.joinUrl)) : <Text style={styles.muted}>Ask the channel owner for an invitation if you are not already a member.</Text>}
            <Text style={styles.label}>{chat.identity ? `Connected as ${chat.identity.name}` : 'Connect your chat identity'}</Text>
            {!chat.identity ? button('Connect my account', () => begin('identity'), !selectedProvider?.configured) : button('Unlink my account', () => void run(() => harness.disconnectChat(scope, false)))}
            {chat.canManage ? button('Disconnect team channel', () => Alert.alert('Disconnect team chat?', 'All members will need to link their chat accounts again. TAR access stays active.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Disconnect', style: 'destructive', onPress: () => void run(() => harness.disconnectChat(scope, true)) }])) : null}
          </> : chat.canManage ? <>
            <View style={styles.choices}>{chat.providers.map((item) => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ selected: provider === item.id }} disabled={busy} onPress={() => { setProvider(item.id); setCommand(''); }} style={[styles.choice, provider === item.id && styles.selected]}><Text>{item.name}</Text></Pressable>)}</View>
            {selectedProvider?.configured ? <>
              <Text style={styles.muted}>Add TAR to your existing channel or space, then verify it below. You can create a new destination in the provider first.</Text>
              {selectedProvider.installUrl ? button(`Open ${selectedProvider.name} setup`, () => openUrl(selectedProvider.installUrl)) : null}
              {button('Link team channel', () => begin('destination'))}
            </> : <Text style={styles.muted}>{selectedProvider?.name} needs deployment configuration before it can connect.</Text>}
          </> : <Text style={styles.muted}>An owner or manager can connect your team channel.</Text>}
          {command ? <View style={styles.instructions}><Text style={styles.label}>Send this command to TAR in your team channel</Text><Text selectable style={styles.command}>{command}</Text><Text style={styles.muted}>Expires after 10 minutes. For Google Chat, mention TAR before the command. For Discord, paste the text after /tar into its request field.</Text></View> : null}
          {chat.requests.filter((item) => item.provider === provider).map((item) => <View key={item.id} style={styles.instructions}>
            {item.candidate ? <><Text style={styles.label}>Confirm {item.candidate.userName || item.candidate.userId}</Text><Text style={styles.muted}>In {item.candidate.channelName || item.candidate.channelId}. Confirm only if this is your account and intended destination.</Text>
              {item.purpose === 'destination' ? <TextInput accessibilityLabel="Team invitation link" placeholder="Invitation link (optional)" autoCapitalize="none" value={invitation} onChangeText={setInvitation} style={styles.input} /> : null}
              {button('Confirm link', () => void run(async () => { await harness.confirmChatLink(scope, item.id, invitation); setCommand(''); }))}
            </> : <Text style={styles.muted}>Waiting for your command. Return here and refresh after sending it.</Text>}
          </View>)}
          {button('Refresh connection', () => void run(reload))}
          {chat.commands.length ? <Text style={styles.subheading}>Your recent chat requests</Text> : null}
          {chat.commands.map((item) => <View key={item.id} style={styles.row}><View style={styles.grow}><Text style={styles.label}>{item.state}</Text><Text style={styles.muted}>{item.result || 'Waiting to process'} · {new Date(item.createdAt).toLocaleString()}</Text></View></View>)}
        </> : null}
      </ScrollView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' }, header: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderColor: '#e7e9ed' },
  content: { padding: 18, gap: 12 }, grow: { flex: 1 }, title: { fontSize: 22, fontWeight: '700', color: '#171a21' }, heading: { fontSize: 19, fontWeight: '700', marginTop: 18 },
  subheading: { fontSize: 16, fontWeight: '600', marginTop: 8 }, label: { fontSize: 14, fontWeight: '600', color: '#171a21' }, muted: { color: '#667085', fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#e7e9ed' },
  input: { borderWidth: 1, borderColor: '#cbd0da', borderRadius: 8, padding: 12, minHeight: 44 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { padding: 12, minHeight: 44, borderWidth: 1, borderColor: '#e7e9ed', borderRadius: 8 }, selected: { borderColor: '#3559e0', backgroundColor: '#eef2ff' },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, alignSelf: 'flex-start' }, buttonText: { color: '#3559e0', fontSize: 14, fontWeight: '600' }, disabled: { opacity: 0.4 },
  instructions: { gap: 8, paddingVertical: 12, borderTopWidth: 1, borderColor: '#e7e9ed' }, command: { fontFamily: 'monospace', fontSize: 14, paddingVertical: 8 }, error: { color: '#b42318', lineHeight: 20 },
});
