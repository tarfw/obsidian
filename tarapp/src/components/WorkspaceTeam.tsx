import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import {
  harness,
  type ChatProvider,
  type HarnessMember,
  type HarnessRole,
  type TeamChatState,
  type WorkRole,
} from '@/lib/harness';

type TeamTab = 'members' | 'chat';

interface MemberToolItem {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const MEMBER_TOOLS_CATALOG: MemberToolItem[] = [
  { id: 'pos', name: 'Point of sale', icon: 'cart-outline' },
  { id: 'register', name: 'Cash drawer', icon: 'cash-outline' },
  { id: 'item', name: 'Products', icon: 'pricetag-outline' },
  { id: 'inventory', name: 'Inventory', icon: 'cube-outline' },
  { id: 'order', name: 'Orders', icon: 'receipt-outline' },
  { id: 'invoice', name: 'Invoices', icon: 'document-text-outline' },
  { id: 'payment', name: 'Payments', icon: 'card-outline' },
  { id: 'expense', name: 'Expenses', icon: 'wallet-outline' },
  { id: 'site', name: 'Online store', icon: 'globe-outline' },
  { id: 'members', name: 'Team', icon: 'people-outline' },
];

const baseRoles: { label: string; role: Exclude<HarnessRole, 'owner'>; workRole: WorkRole }[] = [
  { label: 'Member', role: 'member', workRole: 'general' },
  { label: 'Workspace admin', role: 'admin', workRole: 'general' },
  { label: 'Guest', role: 'guest', workRole: 'general' },
];

function formatRoleName(role: string, context = ''): string {
  const r = role.toLowerCase().trim();
  const text = context.toLowerCase();
  if (r === 'cashier' || r === 'sales') return 'Sales / Cashier';
  if (r === 'chef' || r === 'cook' || r === 'kitchen' || r === 'operations' || r === 'production') {
    if (/\b(chef|cook|kitchen|food|baking|bakery|restaurant|cafe|dining|mess)\b/i.test(text)) {
      return 'Kitchen / Cook';
    }
    return 'Operations / Production';
  }
  if (r === 'manager') return 'Store Manager';
  if (r === 'courier' || r === 'delivery' || r === 'logistics' || r === 'driver') return 'Fulfillment / Delivery';
  if (r === 'warehouse' || r === 'inventory') return 'Inventory / Warehouse';
  if (r === 'accountant' || r === 'finance') return 'Finance / Accountant';
  if (r === 'server' || r === 'waiter' || r === 'service' || r === 'floor') return 'Customer Service / Floor';
  if (r === 'buyer' || r === 'procurement') return 'Purchasing / Procurement';
  if (r === 'admin') return 'Workspace Admin';
  if (r === 'general' || !r) return 'General Team';
  return r.charAt(0).toUpperCase() + r.slice(1);
}

function stripNegations(text: string): { cleanText: string; deniedTools: Set<string> } {
  const deniedTools = new Set<string>();
  const lower = text.toLowerCase();

  if (/\b(no access to|not? for|no|not|never|without)\s+(sales?|pos|counter|selling|checkout)\b/i.test(lower)) {
    deniedTools.add('pos');
    deniedTools.add('cashier');
  }
  if (/\b(no access to|not? for|no|not|never|without)\s+(cash|drawer|register|cash box)\b/i.test(lower)) {
    deniedTools.add('register');
  }
  if (/\b(no access to|not? for|no|not|never|without)\s+(money|payments?|upi|refunds?)\b/i.test(lower)) {
    deniedTools.add('payment');
  }
  if (/\b(no access to|not? for|no|not|never|without)\s+(stock|inventory|ingredients?|materials?)\b/i.test(lower)) {
    deniedTools.add('inventory');
  }
  if (/\b(no access to|not? for|no|not|never|without)\s+(orders?)\b/i.test(lower)) {
    deniedTools.add('order');
  }
  if (/\b(no access to|not? for|no|not|never|without)\s+(billing|invoices?|bills?)\b/i.test(lower)) {
    deniedTools.add('invoice');
  }

  const cleanText = lower.replace(/\b(no access to|not? for|no|not|never|without)\s+[^.,;\n]+/gi, ' ');
  return { cleanText, deniedTools };
}

function computeDefaultMemberRoleAndTools(briefText: string): { workRole: string; tools: string[] } {
  const text = briefText.trim();
  if (!text) {
    return { workRole: '', tools: [] };
  }

  const { cleanText, deniedTools } = stripNegations(text);

  let role = 'general';
  const tools: string[] = [];

  if (/\b(chef|cook|kitchen|food|prep|prepare|prepares|cooking|baker|bakery|tailor|tailoring|sew|sewing|weave|weaves|weaving|loom|craft|artisan|assemble|assembly|production|manufacture|maker)\b/i.test(cleanText)) {
    role = 'chef';
    tools.push('order', 'inventory');
  } else if (!deniedTools.has('cashier') && /\b(cashier|checkout|counter|register|cash drawer|cash box|sales?|sell|billing point|clerk)\b/i.test(cleanText)) {
    role = 'cashier';
    tools.push('pos', 'register', 'payment');
  } else if (/\b(manager|manage|supervisor|store manager)\b/i.test(cleanText)) {
    role = 'manager';
    tools.push('item', 'inventory', 'order', 'members');
  } else if (/\b(courier|delivery|driver|dispatch|dropoff|pickup|rider|transit|shipment)\b/i.test(cleanText)) {
    role = 'courier';
    tools.push('order');
  } else if (/\b(warehouse|godown|packer|picker|storage|stockroom)\b/i.test(cleanText)) {
    role = 'warehouse';
    tools.push('inventory', 'order');
  } else if (/\b(accountant|accounting|finance|invoice|billing|gst|tax|expenses?|bookkeeper)\b/i.test(cleanText)) {
    role = 'accountant';
    tools.push('invoice', 'payment', 'expense', 'register');
  } else if (/\b(customer service|reception|front desk|service|intake|hospitality|floor)\b/i.test(cleanText)) {
    role = 'server';
    tools.push('order');
  } else if (/\b(buyer|procurement|purchase|purchases|purchasing|sourcing|quote|quotes|supplier)\b/i.test(cleanText)) {
    role = 'buyer';
    tools.push('order');
  }

  // Keywords on cleanText
  if (!deniedTools.has('pos') && /\b(pos|counter sales?|sell)\b/i.test(cleanText)) tools.push('pos');
  if (!deniedTools.has('register') && /\b(register|cash drawer|cash in|cash out)\b/i.test(cleanText)) tools.push('register');
  if (!deniedTools.has('item') && /\b(product|catalog|item|items|price)\b/i.test(cleanText)) tools.push('item');
  if (!deniedTools.has('inventory') && /\b(inventory|stock|ingredients?)\b/i.test(cleanText)) tools.push('inventory');
  if (!deniedTools.has('order') && /\b(order|orders)\b/i.test(cleanText)) tools.push('order');
  if (!deniedTools.has('invoice') && /\b(invoice|bill|billing|gst)\b/i.test(cleanText)) tools.push('invoice');
  if (!deniedTools.has('payment') && /\b(payment|upi|card|refund)\b/i.test(cleanText)) tools.push('payment');
  if (!deniedTools.has('expense') && /\b(expense|expenses|petty cash)\b/i.test(cleanText)) tools.push('expense');
  if (!deniedTools.has('members') && /\b(team|members|staff)\b/i.test(cleanText)) tools.push('members');
  if (!deniedTools.has('site') && /\b(site|website|storefront|online)\b/i.test(cleanText)) tools.push('site');

  const validToolIds = new Set(MEMBER_TOOLS_CATALOG.map((t) => t.id));
  return {
    workRole: role,
    tools: Array.from(new Set(tools)).filter((id) => validToolIds.has(id) && !deniedTools.has(id)),
  };
}

const roleLabel = (member: HarnessMember) =>
  member.role === 'owner'
    ? 'Owner'
    : member.role === 'admin'
    ? 'Admin'
    : member.role === 'guest'
    ? 'Guest'
    : formatRoleName(member.workRole || member.roles?.[0] || 'Member', member.brief || '');

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

  // Member form state (Exact Workspace Brief Method)
  const [email, setEmail] = useState('');
  const [workRole, setWorkRole] = useState('');
  const [briefBlocks, setBriefBlocks] = useState<string[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [newBlock, setNewBlock] = useState('');
  const [selectedRole, setSelectedRole] = useState(baseRoles[0]);
  const [selectedAccess, setSelectedAccess] = useState<string[]>([]);

  const [editing, setEditing] = useState<HarnessMember | null>(null);
  const [adding, setAdding] = useState(false);
  const [provider, setProvider] = useState<ChatProvider | null>(null);
  const [command, setCommand] = useState('');
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

  // JEV System One live classification: driven strictly from Brief blocks (Same as Workspace)
  useEffect(() => {
    const prompt = briefBlocks.join('. ').trim();
    if (!prompt) {
      setWorkRole('');
      setSelectedAccess([]);
      return;
    }

    // Fast local estimation (0ms instant UI update)
    const local = computeDefaultMemberRoleAndTools(prompt);
    setWorkRole(local.workRole);
    setSelectedAccess(local.tools);

    // Live TypeSafe JEV System One judgment via server (exact same autonomous pattern as CreateWorkspace)
    const timer = setTimeout(() => {
      harness
        .suggestMember(scope, prompt)
        .then((res) => {
          if (res) {
            if (res.workRole) {
              setWorkRole(res.workRole);
            }
            if (Array.isArray(res.tools) && res.tools.length > 0) {
              const validToolIds = new Set(MEMBER_TOOLS_CATALOG.map((t) => t.id));
              const { deniedTools } = stripNegations(prompt);
              setSelectedAccess(res.tools.filter((id) => validToolIds.has(id) && !deniedTools.has(id)));
            }
          }
        })
        .catch(() => undefined);
    }, 250);

    return () => clearTimeout(timer);
  }, [briefBlocks, scope]);

  const addBlock = () => {
    const text = newBlock.trim();
    if (!text) return;
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      setBriefBlocks((prev) => [...prev, ...lines]);
    }
    setNewBlock('');
  };

  const removeBlock = (index: number) => {
    setBriefBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const closeDrawer = () => {
    if (newBlock.trim()) {
      addBlock();
    }
    setDrawerVisible(false);
  };

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

  const remove = (member: HarnessMember) =>
    Alert.alert(
      'Remove member?',
      `${member.email} will lose TAR access, including chat tools.`,
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
    setSelectedRole(baseRoles.find((r) => r.role === member.role) || baseRoles[0]);
    const wr = member.workRole || (member.roles?.[0] as string) || 'general';
    setWorkRole(wr);
    const existingBrief = member.brief || '';
    const initialBlocks = existingBrief
      ? existingBrief.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      : [];
    setBriefBlocks(initialBlocks);
    const validToolIds = new Set(MEMBER_TOOLS_CATALOG.map((t) => t.id));
    const access = member.access?.length
      ? member.access.filter((id) => validToolIds.has(id))
      : computeDefaultMemberRoleAndTools(existingBrief || wr).tools;
    setSelectedAccess(access);
    setDrawerVisible(false);
    setNewBlock('');
    setAdding(true);
  };

  const startAddMember = () => {
    setEditing(null);
    setEmail('');
    setBriefBlocks([]);
    setWorkRole('');
    setSelectedRole(baseRoles[0]);
    setSelectedAccess([]);
    setDrawerVisible(false);
    setNewBlock('');
    setAdding(true);
  };

  const closeEditor = () => {
    if (busy) return;
    setAdding(false);
    setEditing(null);
    setError('');
  };

  const saveMember = () =>
    void run(async () => {
      if (!editing && !email.trim()) {
        throw new Error('Enter a Google account email.');
      }
      const role = selectedRole.role;
      const wr = workRole.trim().toLowerCase() || 'general';
      const rolesList = [wr];
      const briefClean = briefBlocks.join('\n');
      const accessList = [...selectedAccess];

      if (editing) {
        await harness.updateMember(scope, editing.id, {
          role,
          workRole: wr,
          roles: rolesList,
          brief: briefClean,
          access: accessList,
          email: editing.email,
        });
      } else {
        await harness.inviteMember(
          scope,
          email.trim(),
          role,
          wr,
          rolesList,
          briefClean,
          accessList,
        );
      }

      setEmail('');
      setBriefBlocks([]);
      setWorkRole('');
      setSelectedAccess([]);
      setEditing(null);
      setAdding(false);
    });

  const activeToolItems = MEMBER_TOOLS_CATALOG.filter((tool) => selectedAccess.includes(tool.id));
  const isEditing = Boolean(editing);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      {adding ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.page}
        >
          {/* Top Header: Title on left, Action on right (Exact CreateWorkspace pattern) */}
          <View style={[styles.formHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={closeEditor} style={styles.formHeaderBackBtn} hitSlop={8}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>

            <Text numberOfLines={1} style={styles.formHeaderTitle}>
              {isEditing ? (editing?.name || editing?.email || 'Member') : 'New Member'}
            </Text>

            <TouchableOpacity
              disabled={busy || (!isEditing && !email.trim())}
              style={styles.formHeaderActionBtn}
              onPress={saveMember}
              accessibilityRole="button"
              accessibilityLabel={isEditing ? 'Save Member' : 'Invite Member'}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Text
                  style={[
                    styles.formHeaderActionText,
                    !isEditing && !email.trim() && styles.formHeaderActionDisabled,
                  ]}
                >
                  {isEditing ? 'Save' : 'Invite'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* One Column Full-Width Scroll Content (Exact CreateWorkspace layout) */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.memberFormScroll,
              { paddingBottom: insets.bottom + 80 },
            ]}
          >
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Section 1: EMAIL */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>EMAIL</Text>
              {!isEditing ? (
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. ravi@example.com"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  editable={!busy}
                  autoFocus={!isEditing}
                />
              ) : (
                <View style={styles.tradeBox}>
                  <Text style={styles.tradeText}>{editing?.email}</Text>
                </View>
              )}
            </View>

            <View style={styles.divider} />

            {/* Section 2: BRIEF (Exact same Brief method container as Workspace) */}
            <TouchableOpacity
              style={styles.briefContainer}
              onPress={() => setDrawerVisible(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Brief"
            >
              <Text style={styles.sectionLabel}>BRIEF</Text>
              {briefBlocks.length > 0 ? (
                <View style={styles.bulletsWrap}>
                  {briefBlocks.map((block, idx) => (
                    <View key={idx} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{block}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </TouchableOpacity>

            {workRole ? (
              <>
                <View style={styles.divider} />
                {/* Section 3: ROLE (JEV Classified from Brief) */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>ROLE</Text>
                  <View style={styles.tradeBox}>
                    <Text style={styles.tradeText}>{formatRoleName(workRole, briefBlocks.join(' '))}</Text>
                  </View>
                </View>
              </>
            ) : null}

            {activeToolItems.length > 0 ? (
              <>
                <View style={styles.divider} />
                {/* Section 4: TOOLS (Autonomous flat list matching Brief) */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>TOOLS</Text>
                  <View style={styles.toolsList}>
                    {activeToolItems.map((tool) => (
                      <View key={tool.id} style={styles.toolRow}>
                        <View style={styles.toolLeft}>
                          <Ionicons
                            name={tool.icon}
                            size={20}
                            color="#0F172A"
                            style={styles.toolIcon}
                          />
                          <Text style={styles.toolName}>{tool.name}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            ) : null}

            {isEditing ? (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  onPress={() => {
                    const target = editing;
                    closeEditor();
                    if (target) remove(target);
                  }}
                  style={styles.removeMemberBtn}
                >
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  <Text style={styles.removeMemberText}>Remove member</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </ScrollView>

          {/* DETACHED BRIEF DRAWER (>70% Height - Exact same as Workspace) */}
          <Modal
            visible={drawerVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={closeDrawer}
          >
            <TouchableOpacity
              style={styles.drawerBackdrop}
              activeOpacity={1}
              onPress={closeDrawer}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.drawerSheetWrap}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  style={[
                    styles.drawerSheet,
                    { paddingBottom: Math.max(insets.bottom, 16) },
                  ]}
                >
                  {/* Drawer Header */}
                  <View style={styles.drawerHeader}>
                    <Text style={styles.drawerTitle}>Brief</Text>
                    <TouchableOpacity
                      style={styles.drawerDoneBtn}
                      onPress={closeDrawer}
                      accessibilityRole="button"
                      accessibilityLabel="Done"
                    >
                      <Text style={styles.drawerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Input row */}
                  <View style={styles.drawerInputRow}>
                    <TextInput
                      style={styles.drawerInput}
                      placeholder="Describe role duties or tasks..."
                      placeholderTextColor="#94A3B8"
                      value={newBlock}
                      onChangeText={setNewBlock}
                      onSubmitEditing={addBlock}
                      returnKeyType="done"
                      autoFocus={true}
                    />
                    <TouchableOpacity
                      style={styles.drawerAddBtn}
                      onPress={addBlock}
                      accessibilityRole="button"
                      accessibilityLabel="Add duty"
                    >
                      <Ionicons name="arrow-up-circle" size={26} color="#2563EB" />
                    </TouchableOpacity>
                  </View>

                  {/* Blocks List */}
                  <ScrollView
                    style={styles.drawerScroll}
                    contentContainerStyle={styles.drawerScrollContent}
                    keyboardShouldPersistTaps="handled"
                  >
                    {briefBlocks.map((block, idx) => (
                      <View key={idx} style={styles.drawerBlockRow}>
                        <Text style={styles.drawerBulletDot}>•</Text>
                        <Text style={styles.drawerItemText}>{block}</Text>
                        <TouchableOpacity
                          style={styles.drawerRemoveBtn}
                          onPress={() => removeBlock(idx)}
                          accessibilityRole="button"
                          accessibilityLabel="Remove note"
                        >
                          <Ionicons name="close-circle-outline" size={20} color="#94A3B8" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </TouchableOpacity>
          </Modal>
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.page, { paddingTop: insets.top }]}>
          {/* Uncluttered Team Header */}
          <View style={styles.header}>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {name ? `${name} · Team` : 'Team'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color="#0F172A" />
            </Pressable>
          </View>

          {/* Clean Underline Tab Bar */}
          <View style={styles.tabBar}>
            {(['members', 'chat'] as const).map((item) => {
              const selected = tab === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setTab(item)}
                  style={[styles.tabItem, selected && styles.tabItemSelected]}
                >
                  <Text style={[styles.tabItemText, selected && styles.tabItemTextSelected]}>
                    {item === 'members' ? 'Members' : 'Team Chat'}
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
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {!loaded ? (
              <View style={styles.loading}>
                <ActivityIndicator color="#2563EB" />
                <Text style={styles.muted}>Loading team access…</Text>
              </View>
            ) : null}

            {loaded && !chat ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Couldn’t load this workspace</Text>
                <Pressable onPress={() => void run(reload)} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Try again</Text>
                </Pressable>
              </View>
            ) : null}

            {loaded && chat && tab === 'members' ? (
              <>
                {chat.canManage ? (
                  <>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionLabel}>MEMBERS</Text>
                      <Pressable
                        onPress={startAddMember}
                        hitSlop={8}
                        style={styles.addMemberBtn}
                      >
                        <Ionicons name="add" size={16} color="#2563EB" />
                        <Text style={styles.addMemberText}>Add member</Text>
                      </Pressable>
                    </View>

                    <View style={styles.memberList}>
                      {members.map((member) => {
                        const editable =
                          member.id !== self &&
                          member.role !== 'owner' &&
                          (member.role !== 'admin' || chat.role === 'owner') &&
                          member.state !== 'revoked';
                        const isOwner = member.role === 'owner';
                        const displayRole = roleLabel(member);

                        return (
                          <Pressable
                            key={member.id}
                            accessibilityRole={editable ? 'button' : undefined}
                            accessibilityLabel={editable ? `Edit ${member.email}` : undefined}
                            onPress={editable ? () => edit(member) : undefined}
                            style={({ pressed }) => [
                              styles.memberRow,
                              pressed && editable && styles.rowPressed,
                            ]}
                          >
                            <View style={styles.avatar}>
                              <Text style={styles.avatarText}>
                                {(member.name || member.email).trim().charAt(0).toUpperCase()}
                              </Text>
                            </View>

                            <View style={styles.memberInfo}>
                              <Text numberOfLines={1} style={styles.memberName}>
                                {member.name || member.email}
                              </Text>
                              <Text numberOfLines={1} style={styles.memberEmail}>
                                {member.name ? `${member.email} · ` : ''}
                                {member.access?.length ? `${member.access.length} tools` : 'Full workspace access'}
                              </Text>
                            </View>

                            <View style={styles.memberRight}>
                              <Text style={[styles.memberRoleText, isOwner && styles.ownerRoleText]}>
                                {displayRole}
                              </Text>
                              {member.state === 'pending' ? (
                                <View style={styles.pendingBadge}>
                                  <Text style={styles.pendingBadgeText}>Pending</Text>
                                </View>
                              ) : null}
                              {editable ? (
                                <Ionicons
                                  name="chevron-forward"
                                  size={16}
                                  color="#94A3B8"
                                  style={{ marginLeft: 6 }}
                                />
                              ) : null}
                            </View>
                          </Pressable>
                        );
                      })}
                      {members.length === 0 ? (
                        <View style={styles.emptyInline}>
                          <Text style={styles.muted}>No members to show.</Text>
                        </View>
                      ) : null}
                    </View>
                  </>
                ) : (
                  <View style={styles.accessNote}>
                    <Ionicons name="lock-closed-outline" size={18} color="#64748B" />
                    <Text style={styles.muted}>
                      Workspace member management is available to the owner or a workspace admin.
                    </Text>
                  </View>
                )}
              </>
            ) : null}

            {loaded && chat && tab === 'chat' ? (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionLabel}>TEAM CHAT</Text>
                </View>
                {chat.connection ? (
                  <View style={styles.chatCard}>
                    <View style={styles.chatCardLeft}>
                      <View style={styles.chatIconBox}>
                        <Ionicons
                          name={
                            (chat.connection.provider as string) === 'telegram'
                              ? 'paper-plane-outline'
                              : 'chatbubble-ellipses-outline'
                          }
                          size={22}
                          color="#2563EB"
                        />
                      </View>
                      <View style={styles.chatCardInfo}>
                        <Text style={styles.chatProviderName}>{chat.connection.name}</Text>
                        <View style={styles.connectedRow}>
                          <View style={styles.connectedDot} />
                          <Text style={styles.connectedText}>Connected</Text>
                        </View>
                      </View>
                    </View>
                    {chat.canManage ? (
                      <Pressable
                        onPress={() =>
                          Alert.alert(
                            'Disconnect team chat?',
                            'All members will need to link their chat accounts again. TAR access stays active.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Disconnect',
                                style: 'destructive',
                                onPress: () => void run(() => harness.disconnectChat(scope, true)),
                              },
                            ],
                          )
                        }
                        hitSlop={8}
                      >
                        <Text style={styles.disconnectText}>Disconnect</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.setupCard}>
                    <Text style={styles.setupHeading}>Connect team alerts</Text>
                    <Text style={styles.setupSub}>
                      Receive low-stock notices, closing summaries, and team task updates directly in your team channel.
                    </Text>
                    <View style={styles.providerList}>
                      {chat.providers.map((item) => (
                        <Pressable
                          key={item.id}
                          onPress={() => setProvider(item.id)}
                          style={[
                            styles.providerRow,
                            selectedProviderId === item.id && styles.providerRowSelected,
                          ]}
                        >
                          <Text style={styles.providerNameText}>{item.name}</Text>
                          <Text style={styles.providerStatusText}>
                            {item.configured ? 'Ready' : 'Setup needed'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    {command ? (
                      <View style={styles.commandBox}>
                        <Text style={styles.commandLabel}>Link command:</Text>
                        <Text selectable style={styles.commandCode}>{command}</Text>
                      </View>
                    ) : null}
                    <Pressable
                      disabled={busy || !selectedProvider?.configured}
                      onPress={() => begin('destination')}
                      style={[
                        styles.connectBtn,
                        (!selectedProvider?.configured || busy) && styles.connectBtnDisabled,
                      ]}
                    >
                      <Text style={styles.connectBtnText}>Connect chat</Text>
                    </Pressable>
                  </View>
                )}
              </>
            ) : null}
          </ScrollView>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },

  // Top Roster Header
  header: {
    minHeight: 56,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },

  // Underline Tab Bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 20,
    gap: 24,
    backgroundColor: '#FFFFFF',
  },
  tabItem: {
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemSelected: {
    borderBottomColor: '#2563EB',
  },
  tabItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabItemTextSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addMemberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },

  // Member Roster List
  memberList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  memberRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  rowPressed: {
    backgroundColor: '#F8FAFC',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  memberEmail: {
    fontSize: 13,
    color: '#64748B',
  },
  memberRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberRoleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  ownerRoleText: {
    color: '#0F172A',
  },
  pendingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FEF3C7',
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },

  // Member Form (Exact Workspace Brief Pattern)
  formHeader: {
    minHeight: 56,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  formHeaderBackBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  formHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginLeft: 12,
  },
  formHeaderActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  formHeaderActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  formHeaderActionDisabled: {
    color: '#94A3B8',
  },

  memberFormScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  section: {
    gap: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
    marginVertical: 18,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },

  // Brief Bullets & Container (Identical to CreateWorkspace)
  bulletsWrap: {
    gap: 8,
    paddingVertical: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 22,
    color: '#334155',
    fontWeight: '700',
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#1E293B',
  },
  briefContainer: {
    paddingVertical: 4,
    minHeight: 36,
    gap: 8,
  },

  // Trade / Role Box (Identical to CreateWorkspace)
  tradeBox: {
    paddingVertical: 6,
  },
  tradeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },

  // Tools List (Identical to CreateWorkspace)
  toolsList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  toolRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  toolLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toolIcon: {
    width: 24,
    textAlign: 'center',
  },
  toolName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },

  removeMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  removeMemberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },

  // Detached Brief Drawer (>70% Height - Identical to CreateWorkspace)
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  drawerSheetWrap: {
    height: '76%',
    maxHeight: '80%',
    width: '100%',
  },
  drawerSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  drawerDoneBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  drawerDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  drawerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  drawerInput: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: '#0F172A',
  },
  drawerAddBtn: {
    paddingLeft: 8,
    paddingVertical: 8,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollContent: {
    paddingVertical: 10,
    gap: 10,
  },
  drawerBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  drawerBulletDot: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '700',
  },
  drawerItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#1E293B',
  },
  drawerRemoveBtn: {
    padding: 2,
  },

  // Chat Tab Cards
  chatCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatCardInfo: {
    gap: 2,
  },
  chatProviderName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  connectedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  connectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  disconnectText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },

  setupCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  setupHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  setupSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  providerList: {
    gap: 8,
  },
  providerRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  providerRowSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  providerNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  providerStatusText: {
    fontSize: 12,
    color: '#64748B',
  },
  commandBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  commandLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  commandCode: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#0F172A',
  },
  connectBtn: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  connectBtnDisabled: {
    opacity: 0.5,
  },
  connectBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Feedback & Common
  errorBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
  },
  loading: {
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  muted: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
  },
  empty: {
    gap: 12,
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyInline: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  accessNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
