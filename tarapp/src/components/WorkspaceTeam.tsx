import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { harness, type ChatProvider, type HarnessMember, type HarnessRole, type TeamChatState, type WorkRole } from '@/lib/harness';

type TeamTab = 'members' | 'chat';
const roles: { label: string; role: Exclude<HarnessRole, 'owner'>; workRole: WorkRole }[] = [
  { label: 'Member', role: 'member', workRole: 'general' },
  { label: 'Cook', role: 'member', workRole: 'cook' },
  { label: 'Cashier', role: 'member', workRole: 'cashier' },
  { label: 'Manager', role: 'admin', workRole: 'general' },
  { label: 'Guest', role: 'guest', workRole: 'general' },
];
const roleLabel = (member: HarnessMember) => member.role === 'owner' ? 'Owner' : member.role === 'admin' ? 'Manager' : member.role === 'guest' ? 'Guest' : member.workRole && member.workRole !== 'general' ? member.workRole.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Member';

export default function WorkspaceTeam({ scope, name, onClose, onChanged }: { scope: string; name: string; onClose: () => void; onChanged: () => void }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TeamTab>('members');
  const [chat, setChat] = useState<TeamChatState | null>(null);
  const [members, setMembers] = useState<HarnessMember[]>([]);
  const [self, setSelf] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [workRole, setWorkRole] = useState('general');
  const [editing, setEditing] = useState<HarnessMember | null>(null);
  const [adding, setAdding] = useState(false);
  const [provider, setProvider] = useState<ChatProvider | null>(null);
  const [command, setCommand] = useState('');
  const [invitation, setInvitation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const next = await harness.teamChat(scope);
    setChat(next);
    setProvider((current) => next.connection?.provider ?? (current && next.providers.some((item) => item.id === current) ? current : next.providers[0]?.id ?? null));
    if (next.canManage) {
      const roster = await harness.members(scope);
      setMembers(roster.members);
      setSelf(roster.currentUserId);
    } else {
      setMembers([]);
      setSelf('');
    }
    setLoaded(true);
  }, [scope]);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      void reload().catch((cause) => {
        if (alive) { setError(cause instanceof Error ? cause.message : 'Could not load workspace settings.'); setLoaded(true); }
      });
    }, 0);
    return () => { alive = false; clearTimeout(timer); };
  }, [reload]);

  const run = async (work: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await work(); await reload(); onChanged(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save. Try again.'); }
    finally { setBusy(false); }
  };
  const button = (title: string, onPress: () => void, disabled = false, kind: 'primary' | 'quiet' | 'danger' = 'quiet') => (
    <Pressable accessibilityRole="button" disabled={busy || disabled} onPress={onPress} style={({ pressed }) => [styles.button, styles[kind], (busy || disabled) && styles.disabled, pressed && styles.pressed]}>
      <Text style={[styles.buttonText, kind === 'primary' && styles.primaryText, kind === 'danger' && styles.dangerText]}>{title}</Text>
    </Pressable>
  );
  const openUrl = (url: string) => void run(async () => {
    if (!url.startsWith('https://')) throw new Error('A secure provider link is required.');
    await Linking.openURL(url);
  });
  const selectedProvider = chat?.providers.find((item) => item.id === (provider ?? chat.connection?.provider ?? chat.providers[0]?.id));
  const selectedProviderId = provider ?? chat?.connection?.provider ?? chat?.providers[0]?.id ?? null;
  const begin = (purpose: 'destination' | 'identity') => void run(async () => {
    if (!provider) throw new Error('Choose a chat provider first.');
    const result = await harness.beginChatLink(scope, provider, purpose);
    setCommand(result.command);
  });
  const activeCount = useMemo(() => members.filter((member) => member.state === 'active').length, [members]);
  const remove = (member: HarnessMember) => Alert.alert('Remove member?', `${member.email} will lose TAR access, including chat Actions. Their chat-platform membership is unchanged.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => void run(() => harness.updateMember(scope, member.id, { state: 'revoked' })) },
  ]);
  const edit = (member: HarnessMember) => {
    setEditing(member);
    setAdding(true);
    setSelectedRole(roles.find((item) => item.role === member.role && item.workRole === member.workRole) || roles[0]);
    setWorkRole(member.workRole || 'general');
  };
  const saveMember = () => void run(async () => {
    const access = { role: selectedRole.role, workRole: selectedRole.role === 'member' ? workRole.trim() || 'general' : 'general' };
    if (editing) await harness.updateMember(scope, editing.id, access);
    else await harness.inviteMember(scope, email.trim(), access.role, access.workRole);
    setEmail(''); setEditing(null); setAdding(false); setSelectedRole(roles[0]); setWorkRole('general');
  });

  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{name}</Text>
          <Text style={styles.title}>Members & chat</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close members and chat" onPress={onClose} style={styles.close}>
          <Ionicons name="close" size={21} color={palette.ink} />
        </Pressable>
      </View>
      <View style={styles.tabs} accessibilityRole="tablist">
        {(['members', 'chat'] as const).map((item) => {
          const selected = tab === item;
          return <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setTab(item)} style={[styles.tab, selected && styles.tabSelected]}>
            <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{item === 'members' ? 'Members' : 'Chat'}</Text>
          </Pressable>;
        })}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        {error ? <View accessibilityRole="alert" style={styles.error}><Ionicons name="alert-circle-outline" size={18} color={palette.red} /><Text style={styles.errorText}>{error}</Text></View> : null}
        {!loaded ? <View style={styles.loading}><ActivityIndicator color={palette.blue} /><Text style={styles.muted}>Loading workspace access…</Text></View> : null}
        {loaded && !chat ? <View style={styles.empty}><Text style={styles.sectionTitle}>Couldn’t load this workspace</Text>{button('Try again', () => void run(reload), false, 'primary')}</View> : null}

        {loaded && chat && tab === 'members' ? <>
          {chat.canManage ? <>
            <View style={styles.sectionHeader}>
              <View><Text style={styles.sectionTitle}>Workspace access</Text><Text style={styles.muted}>{activeCount} active · {members.length} total</Text></View>
              {!adding ? button('Add member', () => { setEditing(null); setSelectedRole(roles[0]); setWorkRole('general'); setAdding(true); }, false, 'primary') : null}
            </View>
            <View style={styles.memberList}>
              {members.map((member) => <View key={member.id} style={styles.memberRow}>
                <View style={[styles.avatar, member.state === 'revoked' && styles.avatarMuted]}>
                  <Text style={[styles.avatarText, member.state === 'revoked' && styles.avatarTextMuted]}>{(member.name || member.email).trim().charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.memberIdentity}>
                  <Text numberOfLines={1} style={styles.memberName}>{member.name || member.email}</Text>
                  <Text numberOfLines={1} style={styles.memberMeta}>{member.name ? `${member.email} · ` : ''}{roleLabel(member)}</Text>
                </View>
                <View style={[styles.state, member.state === 'active' ? styles.stateActive : member.state === 'pending' ? styles.statePending : styles.stateRevoked]}>
                  <Text style={[styles.stateText, member.state === 'active' ? styles.stateActiveText : member.state === 'pending' ? styles.statePendingText : styles.stateRevokedText]}>{member.state}</Text>
                </View>
                {member.id !== self && member.role !== 'owner' && (member.role !== 'admin' || chat.role === 'owner') && member.state !== 'revoked' ? <View style={styles.rowActions}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${member.email}`} onPress={() => edit(member)} hitSlop={8} style={styles.iconButton}><Ionicons name="ellipsis-horizontal" size={18} color={palette.muted} /></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${member.email}`} onPress={() => remove(member)} hitSlop={8} style={styles.iconButton}><Ionicons name="person-remove-outline" size={17} color={palette.red} /></Pressable>
                </View> : null}
              </View>)}
              {members.length === 0 ? <View style={styles.emptyInline}><Text style={styles.muted}>No members to show.</Text></View> : null}
            </View>
            {adding ? <View style={styles.form}>
              <View style={styles.formHeading}><Text style={styles.sectionTitle}>{editing ? 'Edit access' : 'Invite a member'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={() => { setAdding(false); setEditing(null); }} hitSlop={8}><Ionicons name="close" size={20} color={palette.muted} /></Pressable></View>
              {!editing ? <TextInput accessibilityLabel="Member Google email" placeholder="Google account email" placeholderTextColor={palette.faint} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input} /> : <Text style={styles.formEmail}>{editing.email}</Text>}
              <View style={styles.roleOptions}>{roles.filter((item) => item.role !== 'admin' || chat.role === 'owner').map((item) => <Pressable key={item.label} accessibilityRole="radio" accessibilityState={{ selected: selectedRole.label === item.label }} disabled={busy} onPress={() => { setSelectedRole(item); setWorkRole(item.workRole); }} style={[styles.roleOption, selectedRole.label === item.label && styles.roleOptionSelected]}><Text style={[styles.roleText, selectedRole.label === item.label && styles.roleTextSelected]}>{item.label}</Text></Pressable>)}</View>
              {selectedRole.role === 'member' ? <TextInput accessibilityLabel="Work role" placeholder="Work role, for example courier" placeholderTextColor={palette.faint} value={workRole === 'general' ? '' : workRole} onChangeText={(value) => setWorkRole(value || 'general')} style={styles.input} /> : null}
              <Text style={styles.helper}>Access activates when they sign in with this Google email. Share your TAR app link; no email is sent automatically.</Text>
              <View style={styles.formFooter}>{button('Cancel', () => { setAdding(false); setEditing(null); }, false, 'quiet')}{button(editing ? 'Save changes' : 'Send invite', saveMember, !editing && !email.trim(), 'primary')}</View>
            </View> : null}
          </> : <View style={styles.accessNote}><Ionicons name="lock-closed-outline" size={18} color={palette.muted} /><Text style={styles.muted}>Workspace member management is available to an owner or manager.</Text></View>}
        </> : null}

        {loaded && chat && tab === 'chat' ? <>
          <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Team chat</Text><Text style={styles.muted}>Connect a workspace channel for TAR requests.</Text></View></View>
          {chat.connection ? <View style={styles.connection}>
            <View style={styles.connectionTop}>
              <View style={styles.providerMark}><Ionicons name="chatbubbles-outline" size={19} color={palette.blue} /></View>
              <View style={styles.connectionCopy}><Text style={styles.connectionName}>{selectedProvider?.name || chat.connection.provider}</Text><Text numberOfLines={1} style={styles.muted}>{chat.connection.name}</Text></View>
              <View style={styles.connected}><View style={styles.connectedDot} /><Text style={styles.connectedText}>Connected</Text></View>
            </View>
            {chat.connection.joinUrl ? button('Open team channel', () => openUrl(chat.connection!.joinUrl), false, 'primary') : <Text style={styles.helper}>Ask the channel owner for an invitation if you are not already a member.</Text>}
            <View style={styles.divider} />
            <Text style={styles.fieldLabel}>{chat.identity ? `Your account · ${chat.identity.name}` : 'Your chat account is not linked'}</Text>
            {chat.identity ? button('Unlink my account', () => void run(() => harness.disconnectChat(scope, false))) : button('Link my account', () => begin('identity'), !selectedProvider?.configured, 'primary')}
            {chat.canManage ? <View style={styles.adminLink}>{button('Disconnect workspace channel', () => Alert.alert('Disconnect team chat?', 'All members will need to link their chat accounts again. TAR access stays active.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Disconnect', style: 'destructive', onPress: () => void run(() => harness.disconnectChat(scope, true)) }]), false, 'danger')}</View> : null}
          </View> : chat.canManage ? <View style={styles.setup}>
            <Text style={styles.fieldLabel}>Choose a provider</Text>
            <View style={styles.providerOptions}>{chat.providers.map((item) => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ selected: selectedProviderId === item.id }} disabled={busy} onPress={() => { setProvider(item.id); setCommand(''); }} style={[styles.providerOption, selectedProviderId === item.id && styles.providerOptionSelected]}><Text style={[styles.providerText, selectedProviderId === item.id && styles.providerTextSelected]}>{item.name}</Text><Text style={styles.providerAvailability}>{item.configured ? 'Available' : 'Not configured'}</Text></Pressable>)}</View>
            {selectedProvider?.configured ? <>
              <Text style={styles.helper}>Add TAR to a channel or space, then verify the connection here.</Text>
              {selectedProvider.installUrl ? button(`Open ${selectedProvider.name} setup`, () => openUrl(selectedProvider.installUrl), false, 'quiet') : null}
              {button('Connect a team channel', () => begin('destination'), false, 'primary')}
            </> : <Text style={styles.helper}>{selectedProvider?.name || 'This provider'} needs deployment configuration before it can connect.</Text>}
          </View> : <View style={styles.accessNote}><Ionicons name="lock-closed-outline" size={18} color={palette.muted} /><Text style={styles.muted}>An owner or manager can connect the workspace channel.</Text></View>}

          {command ? <View style={styles.commandBox}><Text style={styles.fieldLabel}>Send this command to TAR in your channel</Text><Text selectable style={styles.commandText}>{command}</Text><Text style={styles.helper}>This link expires after 10 minutes. Follow your provider’s command format.</Text></View> : null}
          {chat.requests.filter((item) => item.provider === selectedProviderId).map((item) => <View key={item.id} style={styles.request}>
            {item.candidate ? <>
              <Text style={styles.fieldLabel}>Confirm {item.candidate.userName || item.candidate.userId}</Text>
              <Text style={styles.helper}>Found in {item.candidate.channelName || item.candidate.channelId}. Confirm only if this is the intended account or channel.</Text>
              {item.purpose === 'destination' ? <TextInput accessibilityLabel="Team invitation link" placeholder="Invitation link (optional)" placeholderTextColor={palette.faint} autoCapitalize="none" value={invitation} onChangeText={setInvitation} style={styles.input} /> : null}
              {button('Confirm connection', () => void run(async () => { await harness.confirmChatLink(scope, item.id, invitation); setCommand(''); setInvitation(''); }), false, 'primary')}
            </> : <Text style={styles.muted}>Waiting for your command. Refresh after sending it to TAR in the channel.</Text>}
          </View>)}
          {chat.commands.length > 0 ? <View style={styles.activity}><Text style={styles.fieldLabel}>Recent requests</Text>{chat.commands.map((item) => <View key={item.id} style={styles.activityRow}><View style={styles.activityCopy}><Text style={styles.activityState}>{item.state}</Text><Text numberOfLines={2} style={styles.muted}>{item.result || 'Waiting to process'} · {new Date(item.createdAt).toLocaleString()}</Text></View></View>)}</View> : null}
          <View style={styles.refreshRow}>{button('Refresh status', () => void run(reload))}</View>
        </> : null}
      </ScrollView>
    </View>
  </Modal>;
}

const palette = { ink: '#191C22', muted: '#656C78', faint: '#9298A3', line: '#E6E8ED', wash: '#F5F6F8', blue: '#3157A8', blueWash: '#EDF2FF', red: '#B54747', redWash: '#FFF0EF', green: '#19734D', greenWash: '#EAF6EF', amber: '#956300', amberWash: '#FFF5DB' };
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10 },
  headerCopy: { flex: 1, gap: 2 }, eyebrow: { color: palette.muted, fontSize: 12, fontWeight: '500' }, title: { color: palette.ink, fontSize: 21, fontWeight: '700', letterSpacing: -0.3 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: palette.wash },
  tabs: { flexDirection: 'row', gap: 4, paddingHorizontal: 18, borderBottomWidth: 1, borderColor: palette.line },
  tab: { minWidth: 88, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabSelected: { borderBottomColor: palette.blue }, tabText: { color: palette.muted, fontSize: 14, fontWeight: '600' }, tabTextSelected: { color: palette.blue },
  content: { paddingHorizontal: 18, paddingTop: 18, gap: 16 },
  sectionHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { color: palette.ink, fontSize: 16, fontWeight: '700' }, muted: { color: palette.muted, fontSize: 13, lineHeight: 18 },
  loading: { minHeight: 88, alignItems: 'center', justifyContent: 'center', gap: 8 },
  button: { minHeight: 44, paddingHorizontal: 14, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: palette.blue }, quiet: { backgroundColor: palette.wash }, danger: { backgroundColor: palette.redWash },
  buttonText: { color: palette.muted, fontSize: 13, fontWeight: '600' }, primaryText: { color: '#FFFFFF' }, dangerText: { color: palette.red }, disabled: { opacity: 0.46 }, pressed: { opacity: 0.78 },
  memberList: { borderTopWidth: 1, borderColor: palette.line }, memberRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: palette.line },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.blueWash, alignItems: 'center', justifyContent: 'center' }, avatarMuted: { backgroundColor: palette.wash }, avatarText: { color: palette.blue, fontSize: 14, fontWeight: '700' }, avatarTextMuted: { color: palette.faint },
  memberIdentity: { flex: 1, minWidth: 70, gap: 3 }, memberName: { color: palette.ink, fontSize: 14, fontWeight: '600' }, memberMeta: { color: palette.muted, fontSize: 12 },
  state: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 }, stateActive: { backgroundColor: palette.greenWash }, statePending: { backgroundColor: palette.amberWash }, stateRevoked: { backgroundColor: palette.wash },
  stateText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' }, stateActiveText: { color: palette.green }, statePendingText: { color: palette.amber }, stateRevokedText: { color: palette.muted },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 1 }, iconButton: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }, emptyInline: { paddingVertical: 18 },
  form: { padding: 14, gap: 12, borderWidth: 1, borderColor: palette.line, borderRadius: 12, backgroundColor: '#FBFBFC' }, formHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, formEmail: { color: palette.muted, fontSize: 14 },
  input: { minHeight: 46, paddingHorizontal: 12, borderWidth: 1, borderColor: palette.line, borderRadius: 9, color: palette.ink, fontSize: 14, backgroundColor: '#FFFFFF' },
  roleOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, roleOption: { minHeight: 38, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.line, borderRadius: 8, backgroundColor: '#FFFFFF' },
  roleOptionSelected: { borderColor: palette.blue, backgroundColor: palette.blueWash }, roleText: { color: palette.muted, fontSize: 12, fontWeight: '600' }, roleTextSelected: { color: palette.blue }, helper: { color: palette.muted, fontSize: 12, lineHeight: 17 },
  formFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }, accessNote: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 10, backgroundColor: palette.wash },
  connection: { padding: 14, gap: 12, borderWidth: 1, borderColor: palette.line, borderRadius: 12 }, connectionTop: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 }, providerMark: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blueWash },
  connectionCopy: { flex: 1, gap: 2 }, connectionName: { color: palette.ink, fontSize: 14, fontWeight: '700' }, connected: { flexDirection: 'row', alignItems: 'center', gap: 5 }, connectedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.green }, connectedText: { color: palette.green, fontSize: 11, fontWeight: '600' },
  divider: { height: 1, backgroundColor: palette.line, marginVertical: 2 }, fieldLabel: { color: palette.ink, fontSize: 13, fontWeight: '600' }, adminLink: { alignItems: 'flex-start', marginTop: 2 },
  setup: { padding: 14, gap: 13, borderWidth: 1, borderColor: palette.line, borderRadius: 12 }, providerOptions: { gap: 7 }, providerOption: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderWidth: 1, borderColor: palette.line, borderRadius: 9 },
  providerOptionSelected: { borderColor: palette.blue, backgroundColor: palette.blueWash }, providerText: { color: palette.ink, fontSize: 13, fontWeight: '600' }, providerTextSelected: { color: palette.blue }, providerAvailability: { color: palette.muted, fontSize: 11 },
  commandBox: { padding: 14, gap: 9, borderRadius: 10, backgroundColor: palette.wash }, commandText: { color: palette.ink, fontFamily: 'monospace', fontSize: 13, lineHeight: 19, padding: 10, borderRadius: 7, backgroundColor: '#FFFFFF' },
  request: { padding: 14, gap: 10, borderWidth: 1, borderColor: palette.line, borderRadius: 10 }, activity: { gap: 8, paddingTop: 4 }, activityRow: { minHeight: 54, justifyContent: 'center', paddingVertical: 8, borderTopWidth: 1, borderColor: palette.line }, activityCopy: { gap: 3 }, activityState: { color: palette.ink, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' }, refreshRow: { alignItems: 'flex-start' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 9, backgroundColor: palette.redWash }, errorText: { flex: 1, color: palette.red, fontSize: 13, lineHeight: 18 }, empty: { gap: 12, paddingVertical: 20 },
});
