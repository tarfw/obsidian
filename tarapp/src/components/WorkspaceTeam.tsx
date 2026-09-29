import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  harness,
  type ChatProvider,
  type HarnessMember,
  type HarnessRole,
  type TeamChatState,
  type WorkRole,
} from '@/lib/harness';

type TeamTab = 'members' | 'chat';

const baseRoles: { label: string; role: Exclude<HarnessRole, 'owner'>; workRole: WorkRole }[] = [
  { label: 'Member', role: 'member', workRole: 'general' },
  { label: 'Workspace admin', role: 'admin', workRole: 'general' },
  { label: 'Guest', role: 'guest', workRole: 'general' },
];

const dutyPresets = [
  { label: 'Cashier', duties: 'Cashier: record sales, checkout and register totals' },
  { label: 'Kitchen / Cook', duties: 'Kitchen chef: prepare food orders and handoff' },
  { label: 'Manager', duties: 'Manager: manage catalog items, stock adjustments and prices' },
  { label: 'Courier / Delivery', duties: 'Delivery driver: claim, collect and deliver orders' },
  { label: 'Warehouse', duties: 'Warehouse: pick items, pack shipments and transfer stock' },
  { label: 'Accountant', duties: 'Accounting: issue invoices, payments, expenses and bank reconciliation' },
];

const roleLabel = (member: HarnessMember) =>
  member.role === 'owner'
    ? 'Owner'
    : member.role === 'admin'
    ? 'Workspace admin'
    : member.role === 'guest'
    ? 'Guest'
    : (member.roles?.length ? member.roles : [member.workRole || 'general'])
        .map((role) =>
          role === 'general' ? 'Member' : role.replace(/\b\w/g, (l) => l.toUpperCase()),
        )
        .join(', ');

export default function WorkspaceTeam({
  scope,
  name,
  onClose,
  onChanged,
}: {
  scope: string;
  name: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TeamTab>('members');
  const [chat, setChat] = useState<TeamChatState | null>(null);
  const [members, setMembers] = useState<HarnessMember[]>([]);
  const [self, setSelf] = useState('');

  // 2-Step Member Onboarding state
  const [memberStep, setMemberStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [duties, setDuties] = useState('');
  const [selectedRole, setSelectedRole] = useState(baseRoles[0]);
  const [workRole, setWorkRole] = useState('general');
  const [grantedRoles, setGrantedRoles] = useState<string[]>(['general']);
  const [suggestedPermissions, setSuggestedPermissions] = useState<string[]>([]);
  const [matching, setMatching] = useState(false);

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
    setProvider(
      (current) =>
        next.connection?.provider ??
        (current && next.providers.some((item) => item.id === current)
          ? current
          : next.providers[0]?.id ?? null),
    );
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
        if (alive) {
          setError(
            cause instanceof Error ? cause.message : 'Could not load workspace settings.',
          );
          setLoaded(true);
        }
      });
    }, 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [reload]);

  const run = async (work: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await work();
      await reload();
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const button = (
    title: string,
    onPress: () => void,
    disabled = false,
    kind: 'primary' | 'quiet' | 'danger' = 'quiet',
  ) => (
    <Pressable
      accessibilityRole="button"
      disabled={busy || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[kind],
        (busy || disabled) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          kind === 'primary' && styles.primaryText,
          kind === 'danger' && styles.dangerText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );

  const openUrl = (url: string) =>
    void run(async () => {
      if (!url.startsWith('https://')) throw new Error('A secure provider link is required.');
      await Linking.openURL(url);
    });

  const selectedProvider = chat?.providers.find(
    (item) => item.id === (provider ?? chat.connection?.provider ?? chat.providers[0]?.id),
  );
  const selectedProviderId =
    provider ?? chat?.connection?.provider ?? chat?.providers[0]?.id ?? null;

  const begin = (purpose: 'destination' | 'identity') =>
    void run(async () => {
      if (!provider) throw new Error('Choose a chat provider first.');
      const result = await harness.beginChatLink(scope, provider, purpose);
      setCommand(result.command);
    });

  const activeCount = useMemo(
    () => members.filter((member) => member.state === 'active').length,
    [members],
  );

  const remove = (member: HarnessMember) =>
    Alert.alert(
      'Remove member?',
      `${member.email} will lose TAR access, including chat Actions. Their chat-platform membership is unchanged.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => void run(() => harness.updateMember(scope, member.id, { state: 'revoked' })),
        },
      ],
    );

  const edit = (member: HarnessMember) => {
    setEditing(member);
    setEmail(member.email);
    setAdding(true);
    setMemberStep(1);
    setSelectedRole(baseRoles.find((r) => r.role === member.role) || baseRoles[0]);
    const existingGrants = member.roles?.length ? member.roles : [member.workRole || 'general'];
    setGrantedRoles(existingGrants);
    setWorkRole(existingGrants[0] || 'general');
    setDuties(existingGrants.join(', '));
  };

  const reviewPermissions = async () => {
    if (!editing && !email.trim()) {
      setError('Enter a Google account email.');
      return;
    }
    setError('');
    setMatching(true);
    try {
      if (selectedRole.role === 'member') {
        const suggestion = await harness.suggestMember(scope, duties || 'General work');
        if (suggestion) {
          const roles = suggestion.roles?.length ? suggestion.roles : [suggestion.workRole || 'general'];
          setGrantedRoles(roles);
          setWorkRole(suggestion.workRole || roles[0] || 'general');
          setSuggestedPermissions(suggestion.permissions || []);
        }
      } else {
        setGrantedRoles(['general']);
        setWorkRole('general');
        setSuggestedPermissions([]);
      }
      setMemberStep(2);
    } catch {
      // Fallback: parse duties string
      const parsed = duties
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const roles = parsed.length ? parsed : ['general'];
      setGrantedRoles(roles);
      setWorkRole(roles[0] || 'general');
      setMemberStep(2);
    } finally {
      setMatching(false);
    }
  };

  const toggleGrant = (grant: string) => {
    setGrantedRoles((curr) => {
      if (curr.includes(grant)) {
        const filtered = curr.filter((g) => g !== grant);
        return filtered.length ? filtered : ['general'];
      }
      return [...curr.filter((g) => g !== 'general'), grant];
    });
  };

  const saveMember = () =>
    void run(async () => {
      const grants =
        selectedRole.role === 'member'
          ? grantedRoles.map((v) => v.trim().toLowerCase()).filter(Boolean)
          : ['general'];
      if (!grants.length) grants.push('general');
      const access = { role: selectedRole.role, workRole: grants[0], roles: grants };
      if (editing) await harness.updateMember(scope, editing.id, access);
      else await harness.inviteMember(scope, email.trim(), access.role, access.workRole, access.roles);

      setEmail('');
      setDuties('');
      setEditing(null);
      setAdding(false);
      setMemberStep(1);
      setSelectedRole(baseRoles[0]);
      setWorkRole('general');
      setGrantedRoles(['general']);
    });

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.page, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{name}</Text>
            <Text style={styles.title}>Members & chat</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close members and chat"
            onPress={onClose}
            style={styles.close}
          >
            <Ionicons name="close" size={22} color={palette.muted} />
          </Pressable>
        </View>

        <View style={styles.tabs} accessibilityRole="tablist">
          {(['members', 'chat'] as const).map((item) => {
            const selected = tab === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setTab(item)}
                style={[styles.tab, selected && styles.tabSelected]}
              >
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
                  {item === 'members' ? 'Members' : 'Chat'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View accessibilityRole="alert" style={styles.error}>
              <Ionicons name="alert-circle-outline" size={18} color={palette.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {!loaded ? (
            <View style={styles.loading}>
              <ActivityIndicator color={palette.blue} />
              <Text style={styles.muted}>Loading workspace access…</Text>
            </View>
          ) : null}

          {loaded && !chat ? (
            <View style={styles.empty}>
              <Text style={styles.sectionTitle}>Couldn’t load this workspace</Text>
              {button('Try again', () => void run(reload), false, 'primary')}
            </View>
          ) : null}

          {loaded && chat && tab === 'members' ? (
            <>
              {chat.canManage ? (
                <>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={styles.sectionTitle}>Workspace access</Text>
                      <Text style={styles.muted}>
                        {activeCount} active · {members.length} total
                      </Text>
                    </View>
                    {!adding
                      ? button(
                          'Add member',
                          () => {
                            setEditing(null);
                            setEmail('');
                            setDuties('');
                            setSelectedRole(baseRoles[0]);
                            setWorkRole('general');
                            setGrantedRoles(['general']);
                            setMemberStep(1);
                            setAdding(true);
                          },
                          false,
                          'primary',
                        )
                      : null}
                  </View>

                  <View style={styles.memberList}>
                    {members.map((member) => {
                      const editable =
                        member.id !== self &&
                        member.role !== 'owner' &&
                        (member.role !== 'admin' || chat.role === 'owner') &&
                        member.state !== 'revoked';
                      return (
                        <Pressable
                          key={member.id}
                          accessibilityRole={editable ? 'button' : undefined}
                          accessibilityLabel={editable ? `Edit ${member.email}` : undefined}
                          onPress={editable ? () => edit(member) : undefined}
                          style={styles.memberRow}
                        >
                          <View
                            style={[
                              styles.avatar,
                              member.state === 'revoked' && styles.avatarMuted,
                            ]}
                          >
                            <Text
                              style={[
                                styles.avatarText,
                                member.state === 'revoked' && styles.avatarTextMuted,
                              ]}
                            >
                              {(member.name || member.email).trim().charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.memberIdentity}>
                            <Text numberOfLines={1} style={styles.memberName}>
                              {member.name || member.email}
                            </Text>
                            <Text numberOfLines={1} style={styles.memberMeta}>
                              {member.name ? `${member.email} · ` : ''}
                              {roleLabel(member)}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.state,
                              member.state === 'active'
                                ? styles.stateActive
                                : member.state === 'pending'
                                ? styles.statePending
                                : styles.stateRevoked,
                            ]}
                          >
                            <Text
                              style={[
                                styles.stateText,
                                member.state === 'active'
                                  ? styles.stateActiveText
                                  : member.state === 'pending'
                                  ? styles.statePendingText
                                  : styles.stateRevokedText,
                              ]}
                            >
                              {member.state}
                            </Text>
                          </View>
                          {editable ? (
                            <View style={styles.rowActions}>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Remove ${member.email}`}
                                onPress={() => remove(member)}
                                hitSlop={8}
                                style={styles.iconButton}
                              >
                                <Ionicons
                                  name="person-remove-outline"
                                  size={17}
                                  color={palette.red}
                                />
                              </Pressable>
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    })}
                    {members.length === 0 ? (
                      <View style={styles.emptyInline}>
                        <Text style={styles.muted}>No members to show.</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* 2-Step Member Flow */}
                  {adding ? (
                    <View style={styles.form}>
                      <View style={styles.formHeading}>
                        <View>
                          <Text style={styles.sectionTitle}>
                            {editing ? 'Edit member access' : 'Invite a member'}
                          </Text>
                          <Text style={styles.stepIndicator}>
                            Step {memberStep} of 2: {memberStep === 1 ? 'Describe duties' : 'Review grants with Jev'}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Cancel"
                          onPress={() => {
                            setAdding(false);
                            setEditing(null);
                          }}
                          hitSlop={8}
                        >
                          <Ionicons name="close" size={20} color={palette.muted} />
                        </Pressable>
                      </View>

                      {memberStep === 1 ? (
                        <>
                          {!editing ? (
                            <TextInput
                              accessibilityLabel="Member Google email"
                              placeholder="Google account email (e.g. ravi@example.com)"
                              placeholderTextColor={palette.faint}
                              autoCapitalize="none"
                              keyboardType="email-address"
                              value={email}
                              onChangeText={setEmail}
                              style={styles.input}
                              autoFocus
                            />
                          ) : (
                            <Text style={styles.formEmail}>{editing.email}</Text>
                          )}

                          <Text style={styles.fieldLabel}>Membership Tier</Text>
                          <View style={styles.roleOptions}>
                            {baseRoles
                              .filter((item) => item.role !== 'admin' || chat.role === 'owner')
                              .map((item) => (
                                <Pressable
                                  key={item.label}
                                  accessibilityRole="radio"
                                  accessibilityState={{
                                    selected: selectedRole.label === item.label,
                                  }}
                                  disabled={busy}
                                  onPress={() => setSelectedRole(item)}
                                  style={[
                                    styles.roleOption,
                                    selectedRole.label === item.label &&
                                      styles.roleOptionSelected,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.roleText,
                                      selectedRole.label === item.label &&
                                        styles.roleTextSelected,
                                    ]}
                                  >
                                    {item.label}
                                  </Text>
                                </Pressable>
                              ))}
                          </View>

                          {selectedRole.role === 'member' ? (
                            <>
                              <Text style={styles.fieldLabel}>What can this person do?</Text>
                              <TextInput
                                accessibilityLabel="Duties description"
                                placeholder="e.g. Cashier and manage products, or kitchen cook"
                                placeholderTextColor={palette.faint}
                                value={duties}
                                onChangeText={setDuties}
                                multiline
                                numberOfLines={2}
                                style={styles.textArea}
                              />
                              <View style={styles.presetChips}>
                                {dutyPresets.map((preset) => (
                                  <Pressable
                                    key={preset.label}
                                    onPress={() => setDuties(preset.duties)}
                                    style={styles.presetChip}
                                  >
                                    <Text style={styles.presetChipText}>{preset.label}</Text>
                                  </Pressable>
                                ))}
                              </View>
                            </>
                          ) : null}

                          <Text style={styles.helper}>
                            Access activates when they sign in with this Google account.
                          </Text>

                          <View style={styles.formFooter}>
                            {button(
                              'Cancel',
                              () => {
                                setAdding(false);
                                setEditing(null);
                              },
                              false,
                              'quiet',
                            )}
                            {button(
                              matching ? 'Analyzing with Jev…' : 'Review permissions ›',
                              () => void reviewPermissions(),
                              matching || (!editing && !email.trim()),
                              'primary',
                            )}
                          </View>
                        </>
                      ) : (
                        /* Step 2: Jev Suggested Permissions & Grants */
                        <>
                          <View style={styles.step2Header}>
                            <Text style={styles.step2Summary}>
                              {name} · {email || editing?.email} · {selectedRole.label}
                            </Text>
                          </View>

                          {selectedRole.role === 'member' ? (
                            <>
                              <Text style={styles.fieldLabel}>Suggested permissions by Jev:</Text>
                              <View style={styles.grantList}>
                                {suggestedPermissions.map((perm) => (
                                  <View key={perm} style={styles.grantRow}>
                                    <Ionicons name="checkmark-circle" size={18} color={palette.green} />
                                    <Text style={styles.grantText}>{perm}</Text>
                                  </View>
                                ))}
                              </View>

                              <Text style={styles.fieldLabel}>Granted Work Roles:</Text>
                              <View style={styles.rolePillsRow}>
                                {['cashier', 'chef', 'manager', 'courier', 'warehouse', 'accountant', 'buyer', 'general'].map(
                                  (r) => {
                                    const active = grantedRoles.includes(r);
                                    return (
                                      <Pressable
                                        key={r}
                                        onPress={() => toggleGrant(r)}
                                        style={[
                                          styles.grantPill,
                                          active && styles.grantPillActive,
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.grantPillText,
                                            active && styles.grantPillTextActive,
                                          ]}
                                        >
                                          {r}
                                        </Text>
                                      </Pressable>
                                    );
                                  },
                                )}
                              </View>
                            </>
                          ) : (
                            <Text style={styles.helper}>
                              Full administrative access to manage workspace tools and members.
                            </Text>
                          )}

                          <View style={styles.formFooter}>
                            {button('‹ Change duties', () => setMemberStep(1), false, 'quiet')}
                            {button(
                              editing ? 'Save changes' : 'Save and invite',
                              saveMember,
                              false,
                              'primary',
                            )}
                          </View>
                        </>
                      )}
                    </View>
                  ) : null}
                </>
              ) : (
                <View style={styles.accessNote}>
                  <Ionicons name="lock-closed-outline" size={18} color={palette.muted} />
                  <Text style={styles.muted}>
                    Workspace member management is available to the owner or a workspace admin.
                  </Text>
                </View>
              )}
            </>
          ) : null}

          {loaded && chat && tab === 'chat' ? (
            <>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Team chat</Text>
                  <Text style={styles.muted}>
                    Connect a workspace channel for TAR requests.
                  </Text>
                </View>
              </View>
              {chat.connection ? (
                <View style={styles.connection}>
                  <View style={styles.connectionTop}>
                    <View style={styles.providerMark}>
                      <Ionicons
                        name="chatbubbles-outline"
                        size={19}
                        color={palette.blue}
                      />
                    </View>
                    <View style={styles.connectionCopy}>
                      <Text style={styles.connectionName}>
                        {selectedProvider?.name || chat.connection.provider}
                      </Text>
                      <Text numberOfLines={1} style={styles.muted}>
                        {chat.connection.name}
                      </Text>
                    </View>
                    <View style={styles.connected}>
                      <View style={styles.connectedDot} />
                      <Text style={styles.connectedText}>Connected</Text>
                    </View>
                  </View>
                  {chat.connection.joinUrl ? (
                    button(
                      'Open team channel',
                      () => openUrl(chat.connection!.joinUrl),
                      false,
                      'primary',
                    )
                  ) : (
                    <Text style={styles.helper}>
                      Ask the channel owner for an invitation if you are not already a member.
                    </Text>
                  )}
                  <View style={styles.divider} />
                  <Text style={styles.fieldLabel}>
                    {chat.identity
                      ? `Your account · ${chat.identity.name}`
                      : 'Your chat account is not linked'}
                  </Text>
                  {chat.identity
                    ? button('Unlink my account', () =>
                        void run(() => harness.disconnectChat(scope, false)),
                      )
                    : button(
                        'Link my account',
                        () => begin('identity'),
                        !selectedProvider?.configured,
                        'primary',
                      )}
                  {chat.canManage ? (
                    <View style={styles.adminLink}>
                      {button(
                        'Disconnect workspace channel',
                        () =>
                          Alert.alert(
                            'Disconnect team chat?',
                            'All members will need to link their chat accounts again. TAR access stays active.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Disconnect',
                                style: 'destructive',
                                onPress: () =>
                                  void run(() => harness.disconnectChat(scope, true)),
                              },
                            ],
                          ),
                        false,
                        'danger',
                      )}
                    </View>
                  ) : null}
                </View>
              ) : chat.canManage ? (
                <View style={styles.setup}>
                  <Text style={styles.fieldLabel}>Choose a provider</Text>
                  <View style={styles.providerOptions}>
                    {chat.providers.map((item) => (
                      <Pressable
                        key={item.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: selectedProviderId === item.id }}
                        disabled={busy}
                        onPress={() => {
                          setProvider(item.id);
                          setCommand('');
                        }}
                        style={[
                          styles.providerOption,
                          selectedProviderId === item.id &&
                            styles.providerOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.providerText,
                            selectedProviderId === item.id &&
                              styles.providerTextSelected,
                          ]}
                        >
                          {item.name}
                        </Text>
                        <Text style={styles.providerAvailability}>
                          {item.configured ? 'Available' : 'Not configured'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {selectedProvider?.configured ? (
                    <>
                      <Text style={styles.helper}>
                        Add TAR to a channel or space, then verify the connection here.
                      </Text>
                      {selectedProvider.installUrl
                        ? button(
                            `Open ${selectedProvider.name} setup`,
                            () => openUrl(selectedProvider.installUrl),
                            false,
                            'quiet',
                          )
                        : null}
                      {button('Connect a team channel', () => begin('destination'), false, 'primary')}
                    </>
                  ) : (
                    <Text style={styles.helper}>
                      {selectedProvider?.name || 'This provider'} needs deployment configuration
                      before it can connect.
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.accessNote}>
                  <Ionicons name="lock-closed-outline" size={18} color={palette.muted} />
                  <Text style={styles.muted}>
                    The owner or a workspace admin can connect the workspace channel.
                  </Text>
                </View>
              )}

              {command ? (
                <View style={styles.commandBox}>
                  <Text style={styles.fieldLabel}>
                    Send this command to TAR in your channel
                  </Text>
                  <Text selectable style={styles.commandText}>
                    {command}
                  </Text>
                  <Text style={styles.helper}>
                    This link expires after 10 minutes. Follow your provider’s command format.
                  </Text>
                </View>
              ) : null}
              {chat.requests
                .filter((item) => item.provider === selectedProviderId)
                .map((item) => (
                  <View key={item.id} style={styles.request}>
                    {item.candidate ? (
                      <>
                        <Text style={styles.fieldLabel}>
                          Confirm {item.candidate.userName || item.candidate.userId}
                        </Text>
                        <Text style={styles.helper}>
                          Found in {item.candidate.channelName || item.candidate.channelId}.
                          Confirm only if this is the intended account or channel.
                        </Text>
                        {item.purpose === 'destination' ? (
                          <TextInput
                            accessibilityLabel="Team invitation link"
                            placeholder="Invitation link (optional)"
                            placeholderTextColor={palette.faint}
                            autoCapitalize="none"
                            value={invitation}
                            onChangeText={setInvitation}
                            style={styles.input}
                          />
                        ) : null}
                        {button(
                          'Confirm connection',
                          () =>
                            void run(async () => {
                              await harness.confirmChatLink(scope, item.id, invitation);
                              setCommand('');
                              setInvitation('');
                            }),
                          false,
                          'primary',
                        )}
                      </>
                    ) : (
                      <Text style={styles.muted}>
                        Waiting for your command. Refresh after sending it to TAR in the channel.
                      </Text>
                    )}
                  </View>
                ))}
              {chat.commands.length > 0 ? (
                <View style={styles.activity}>
                  <Text style={styles.fieldLabel}>Recent requests</Text>
                  {chat.commands.map((item) => (
                    <View key={item.id} style={styles.activityRow}>
                      <View style={styles.activityCopy}>
                        <Text style={styles.activityState}>{item.state}</Text>
                        <Text numberOfLines={2} style={styles.muted}>
                          {item.result || 'Waiting to process'} ·{' '}
                          {new Date(item.createdAt).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.refreshRow}>
                {button('Refresh status', () => void run(reload))}
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const palette = {
  ink: '#1B1C20',
  muted: '#626671',
  faint: '#8B8F99',
  line: '#E3E7EF',
  wash: '#F1F3F8',
  container: '#EAEFF7',
  blue: '#3157A8',
  selected: '#173673',
  selectedWash: '#DCE5FF',
  red: '#B42318',
  redWash: '#FFF1F0',
  green: '#18865B',
  greenWash: '#E8F7F0',
  amber: '#A66D00',
  amberWash: '#FFF7E6',
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  headerCopy: { flex: 1, gap: 1 },
  eyebrow: { color: palette.muted, fontSize: 12, fontWeight: '600' },
  title: { color: palette.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    alignSelf: 'flex-start',
    marginLeft: 18,
    marginBottom: 4,
    padding: 4,
    borderRadius: 22,
    backgroundColor: palette.container,
  },
  tab: { minHeight: 38, paddingHorizontal: 22, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tabSelected: { backgroundColor: palette.blue },
  tabText: { color: palette.muted, fontSize: 14, fontWeight: '700' },
  tabTextSelected: { color: '#FFFFFF' },
  content: { paddingHorizontal: 18, paddingTop: 16, gap: 14 },
  sectionHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { color: palette.ink, fontSize: 16, fontWeight: '800' },
  stepIndicator: { fontSize: 12, fontWeight: '600', color: palette.blue, marginTop: 2 },
  muted: { color: palette.muted, fontSize: 13, lineHeight: 18 },
  loading: { minHeight: 88, alignItems: 'center', justifyContent: 'center', gap: 8 },
  button: { minHeight: 42, paddingHorizontal: 18, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: palette.blue },
  quiet: { backgroundColor: palette.container },
  danger: { backgroundColor: palette.redWash },
  buttonText: { color: palette.ink, fontSize: 13, fontWeight: '700' },
  primaryText: { color: '#FFFFFF' },
  dangerText: { color: palette.red },
  disabled: { opacity: 0.46 },
  pressed: { opacity: 0.78 },
  memberList: { gap: 2 },
  memberRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, borderRadius: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.selectedWash, alignItems: 'center', justifyContent: 'center' },
  avatarMuted: { backgroundColor: palette.wash },
  avatarText: { color: palette.selected, fontSize: 15, fontWeight: '800' },
  avatarTextMuted: { color: palette.faint },
  memberIdentity: { flex: 1, minWidth: 70, gap: 2 },
  memberName: { color: palette.ink, fontSize: 15, fontWeight: '700' },
  memberMeta: { color: palette.muted, fontSize: 12 },
  state: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  stateActive: { backgroundColor: palette.greenWash },
  statePending: { backgroundColor: palette.amberWash },
  stateRevoked: { backgroundColor: palette.wash },
  stateText: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  stateActiveText: { color: palette.green },
  statePendingText: { color: palette.amber },
  stateRevokedText: { color: palette.muted },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  emptyInline: { paddingVertical: 18 },
  form: { padding: 16, gap: 12, borderRadius: 24, backgroundColor: palette.wash },
  formHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  formEmail: { color: palette.ink, fontSize: 15, fontWeight: '700' },
  fieldLabel: { color: palette.ink, fontSize: 13, fontWeight: '700', marginTop: 4 },
  input: { minHeight: 48, paddingHorizontal: 14, borderRadius: 14, color: palette.ink, fontSize: 14, backgroundColor: '#FFFFFF' },
  textArea: { minHeight: 64, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, color: palette.ink, fontSize: 14, backgroundColor: '#FFFFFF', textAlignVertical: 'top' },
  presetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  presetChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: palette.line },
  presetChipText: { fontSize: 11, fontWeight: '600', color: palette.muted },
  roleOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleOption: { minHeight: 38, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#FFFFFF' },
  roleOptionSelected: { backgroundColor: palette.selectedWash },
  roleText: { color: palette.muted, fontSize: 13, fontWeight: '700' },
  roleTextSelected: { color: palette.selected },
  helper: { color: palette.muted, fontSize: 12, lineHeight: 17 },
  formFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  accessNote: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: palette.container },
  step2Header: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: palette.line },
  step2Summary: { fontSize: 13, fontWeight: '700', color: palette.ink },
  grantList: { gap: 6, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: palette.line },
  grantRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grantText: { fontSize: 13, color: palette.ink, fontWeight: '600' },
  rolePillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  grantPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: palette.line },
  grantPillActive: { backgroundColor: palette.selectedWash, borderColor: palette.blue },
  grantPillText: { fontSize: 12, fontWeight: '700', color: palette.muted },
  grantPillTextActive: { color: palette.selected },
  connection: { padding: 16, gap: 12, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth, borderColor: palette.line },
  connectionTop: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  providerMark: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.selectedWash },
  connectionCopy: { flex: 1, gap: 2 },
  connectionName: { color: palette.ink, fontSize: 15, fontWeight: '800' },
  connected: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  connectedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.green },
  connectedText: { color: palette.green, fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: palette.line, marginVertical: 2 },
  adminLink: { alignItems: 'flex-start', marginTop: 2 },
  setup: { padding: 16, gap: 13, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth, borderColor: palette.line },
  providerOptions: { gap: 8 },
  providerOption: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: palette.line },
  providerOptionSelected: { borderColor: palette.selectedWash, backgroundColor: palette.selectedWash },
  providerText: { color: palette.ink, fontSize: 14, fontWeight: '700' },
  providerTextSelected: { color: palette.selected },
  providerAvailability: { color: palette.muted, fontSize: 11 },
  commandBox: { padding: 16, gap: 9, borderRadius: 24, backgroundColor: palette.container },
  commandText: { color: palette.ink, fontFamily: 'monospace', fontSize: 13, lineHeight: 19, padding: 12, borderRadius: 14, backgroundColor: '#FFFFFF' },
  request: { padding: 16, gap: 10, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth, borderColor: palette.line },
  activity: { gap: 6, paddingTop: 4 },
  activityRow: { minHeight: 52, justifyContent: 'center', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: palette.line },
  activityCopy: { gap: 3 },
  activityState: { color: palette.ink, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  refreshRow: { alignItems: 'flex-start' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 16, backgroundColor: palette.redWash },
  errorText: { flex: 1, color: palette.red, fontSize: 13, lineHeight: 18 },
  empty: { gap: 12, paddingVertical: 20 },
});
