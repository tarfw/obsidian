import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { TarLogo } from './TarLogo';
import { AnimatedTarLogoAgent, AgentStateMode, AgentRoleType } from './AnimatedTarLogoAgent';
import SiteScreen from './site';
import { tar, type CreditPack } from '@/lib/tar';

interface FeatureRow {
  title: string;
  value: string;
  isExpandable?: boolean;
}

interface PlanAgentItem {
  id: string;
  tabLabel: string;
  role: AgentRoleType;
  title: string;
  description: string;
  features?: (ownedWorkspaces?: number, joinedWorkspaces?: number) => FeatureRow[];
}

const PLAN_AGENT_GROUPS = [
  {
    id: 'agents_workspace',
    name: 'Workspace Agent',
    cost: '2 credits / query',
    description: 'Instant summaries, document queries, and memory synthesis across your portable .md and SQLite workspace files.',
    actions: ['Workspace answer or summary (2 cr)', 'Personal workspace storage (0 cr)'],
    color: '#2563EB',
  },
  {
    id: 'agents_messaging',
    name: 'Messaging & CRM',
    cost: '2–5 credits / action',
    description: 'Automated customer support and sales replies on WhatsApp & Telegram, plus voice note transcription directly to orders.',
    actions: ['Sales or support reply (2 cr)', 'Voice note to order (5 cr)'],
    color: '#059669',
  },
  {
    id: 'agents_sales',
    name: 'Sales & Growth',
    cost: '10–50 credits / task',
    description: 'Generate structured quotes and commercial proposals, run customer retention campaigns, and extract verified lead batches.',
    actions: ['Quote or proposal (10 cr)', 'Customer retention campaign (20 cr)', 'Verified lead batch (50 cr)'],
    color: '#8B5CF6',
  },
  {
    id: 'agents_ops',
    name: 'Operations & Finance',
    cost: '3–20 credits / action',
    description: 'Scan receipts and invoices with OCR, run automated bill audits, execute workflow pipelines, and produce tax reports.',
    actions: ['OCR document scan (3 cr / page)', 'Bill audit (5 cr / bill)', 'Operations workflow (10 cr)', 'Analyst or tax report (20 cr)'],
    color: '#F97316',
  },
  {
    id: 'agents_sites',
    name: 'Site Builder & Stores',
    cost: '5–100 credits / run',
    description: 'Generate full website drafts from prompts, edit individual sections via plain language, and publish updates live.',
    actions: ['Publish or update site (5 cr)', 'Edit a site section (10 cr)', 'Keep site active (50 cr / mo)', 'Generate site draft (100 cr)'],
    color: '#0891B2',
  },
  {
    id: 'agents_research',
    name: 'Research & Intelligence',
    cost: '2–100 credits / task',
    description: 'Track competitor pricing across multiple sources, clean up product catalogue photos, and dispatch deep research swarms.',
    actions: ['Competitor price check (2 cr / item)', 'Product photo cleanup (10 cr / img)', 'Deep research swarm (100 cr)'],
    color: '#D97706',
  },
];

const PLAN_AGENTS: PlanAgentItem[] = [
  {
    id: 'tier_2',
    tabLabel: 'Credits',
    role: 'sales_agent',
    title: 'Credits',
    description: '1 credit = ₹0.10. Pure pass-through rates with 0% token markup.',
    features: () => [
      { title: 'Base Activation', value: '₹500 (1,000 credits)' },
      { title: 'Top-Up: Starter', value: '₹100 (1,000 credits)' },
      { title: 'Top-Up: Growth', value: '₹500 (5,000 credits)' },
      { title: 'Top-Up: Scale', value: '₹1,000 (10,000 credits)' },
      { title: 'Expiry', value: 'None while account is active' },
    ],
  },
  {
    id: 'tier_1',
    tabLabel: 'Workspace',
    role: 'workspace_agent',
    title: 'Workspace',
    description: 'Local business OS funded by public & sponsors.',
    features: (ownedWorkspaces = 0, joinedWorkspaces = 0) => [
      { title: 'Owned workspaces', value: `${ownedWorkspaces} · 100 credits/month each`, isExpandable: true },
      { title: 'Joined workspaces', value: `${joinedWorkspaces} · free` },
      { title: 'Personal workspace', value: 'Free' },
      { title: 'Manual database actions', value: 'Free' },
      { title: 'Public browsing & ordering', value: 'Free' },
      { title: 'Workspace limit', value: 'None' },
    ],
  },
  {
    id: 'tier_4',
    tabLabel: 'Agents',
    role: 'lead_hunter',
    title: 'Agents',
    description: 'Autonomous agents and workflows orchestrated for real business tasks.',
  },
];

const MIN_CREDITS = 1000;
const MAX_CREDITS = 10000;
const STEP_CREDITS = 1000;

interface EphemeralPlanCanvasProps {
  visible: boolean;
  onClose: () => void;
  workspaceName?: string;
  subdomain?: string;
  scope?: string;
  workspaces?: any[];
  onOpenCanvasCustomizer?: () => void;
  theme?: any;
}

export function EphemeralPlanCanvas({
  visible,
  onClose,
  workspaceName = 'Workspace',
  subdomain = 'site',
  workspaces,
  onOpenCanvasCustomizer,
}: EphemeralPlanCanvasProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<string>('tier_2');
  const [siteGenMode] = useState<AgentStateMode>('active');
  const [workspacesExpanded, setWorkspacesExpanded] = useState<boolean>(false);
  const [showSiteScreen, setShowSiteScreen] = useState<boolean>(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [selectedCredits, setSelectedCredits] = useState(1000);
  const [buying, setBuying] = useState(false);
  const [granting, setGranting] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    Promise.all([tar.wallet(), tar.packs()]).then(([wallet, packsResult]) => {
      setWalletBalance(wallet.wallet?.balance ?? 0);
      setPacks(packsResult.packs);
    }).catch((caught: any) => {
      setCreditError(caught?.message || 'Could not load credits.');
    });
  }, [visible]);

  const cleanSub = (subdomain || 'site').replace(/^w:/, '');

  const nonPersonalWorkspaces = (workspaces || []).filter(
    (w) => w.subdomain !== 'personal' && w.id !== 'personal'
  );
  const ownerCount = nonPersonalWorkspaces.filter(
    (w) => w.role === 'owner' || w.role === 'admin' || !w.role
  ).length;
  const memberCount = nonPersonalWorkspaces.filter(
    (w) => w.role === 'member'
  ).length;

  const currentAgent = PLAN_AGENTS.find((a) => a.id === activeTab) || PLAN_AGENTS[0];

  const incrementCredits = () => setSelectedCredits((prev) => Math.min(MAX_CREDITS, prev + STEP_CREDITS));
  const decrementCredits = () => setSelectedCredits((prev) => Math.max(MIN_CREDITS, prev - STEP_CREDITS));

  const selectedPrice = Math.round(selectedCredits * 0.1);
  const selectedPriceFormatted = `₹${selectedPrice.toLocaleString('en-IN')}`;

  const resolvedPackId = packs.find((p) => p.credits === selectedCredits && p.id.startsWith('topup-'))?.id
    ?? (selectedCredits <= 1000 ? 'topup-starter-1000' : selectedCredits <= 5000 ? 'topup-growth-5000' : 'topup-scale-10000');

  const reloadWallet = async () => {
    try {
      const result = await tar.wallet();
      setWalletBalance(result.wallet?.balance ?? 0);
    } catch {}
  };

  const buySelected = async () => {
    setBuying(true);
    setCreditError(null);
    try {
      const order = await tar.createPaymentOrder(resolvedPackId);
      if (!order.checkoutUrl) throw new Error('Checkout is unavailable.');
      await WebBrowser.openBrowserAsync(order.checkoutUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
      await reloadWallet();
    } catch (caught: any) {
      setCreditError(caught?.message || 'Could not start checkout.');
    } finally {
      setBuying(false);
    }
  };

  const grantDevelopmentCredits = async () => {
    setGranting(true);
    setCreditError(null);
    try {
      await tar.grantDevelopmentCredits(selectedCredits);
      await reloadWallet();
    } catch (caught: any) {
      setCreditError(caught?.message || 'Could not add test credits.');
    } finally {
      setGranting(false);
    }
  };

  const activeFeatures = currentAgent.features ? currentAgent.features(ownerCount, memberCount) : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 12) + 4,
            paddingBottom: 0,
          },
        ]}
      >
        {/* ── 1. CLEAN TOP BAR ── */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.backBtn}>
              <Ionicons name="close" size={22} color="#09090b" />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>Credits & Agents</Text>
          </View>
        </View>

        {/* ── 2. FLAT SEGMENTED SELECTOR (Credits | Workspace | Agents) ── */}
        <View style={styles.tabsRow}>
          {PLAN_AGENTS.map((agent) => {
            const isActive = agent.id === activeTab;
            return (
              <TouchableOpacity
                key={agent.id}
                activeOpacity={0.7}
                onPress={() => {
                  setActiveTab(agent.id);
                }}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
              >
                <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]}>
                  {agent.tabLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── 3. CONTENT VIEW ── */}
        {activeTab === 'tier_4' ? (
          /* ── ALL AGENTS (brandsite-style cards) ── */
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={[
              styles.contentScrollInside,
              { paddingBottom: Math.max(insets.bottom, 16) + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.agentCardsWrap}>
              {PLAN_AGENT_GROUPS.map((agent) => (
                <View key={agent.id} style={styles.agentCard}>
                  <View style={styles.agentCardHead}>
                    <View style={styles.agentCardTitleRow}>
                      <TarLogo size={20} color={agent.color} />
                      <Text style={styles.agentCardName}>{agent.name}</Text>
                    </View>
                    <Text style={styles.agentCardCost}>{agent.cost}</Text>
                  </View>
                  <Text style={styles.agentCardDesc}>{agent.description}</Text>
                  <View style={styles.agentCardActions}>
                    <Text style={styles.agentCardActionsLabel}>Key Actions</Text>
                    {agent.actions.map((act, i) => (
                      <View key={i} style={styles.agentCardActionRow}>
                        <Text style={styles.agentCardActionBullet}>•</Text>
                        <Text style={styles.agentCardActionText}>{act}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : activeTab === 'tier_2' ? (
          /* ── CREDITS TAB: BALANCE + TOP-UP ── */
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={[
              styles.contentScrollInside,
              { paddingBottom: Math.max(insets.bottom, 16) + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Main Upper Balance */}
            <View style={styles.balanceSection}>
              <Text style={styles.balanceNumber}>
                {walletBalance === null ? '—' : walletBalance.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.balanceSubtitle}>credits</Text>
              {creditError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{creditError}</Text>
                </View>
              )}
            </View>

            {/* Stepper + Actions */}
            <View style={styles.creditsBottomSection}>
              {/* Stepper Row */}
              <View style={styles.stepperRow}>
                <Pressable
                  onPress={decrementCredits}
                  disabled={selectedCredits <= MIN_CREDITS}
                  hitSlop={12}
                  style={({ pressed }) => [
                    styles.stepperButton,
                    {
                      borderColor: '#e4e4e7',
                      opacity: selectedCredits <= MIN_CREDITS ? 0.25 : pressed ? 0.6 : 1,
                    },
                  ]}
                  accessibilityLabel="Decrease amount"
                >
                  <Ionicons name="remove" size={22} color="#09090b" />
                </Pressable>

                <Text style={styles.stepperValueText}>
                  +{selectedCredits.toLocaleString('en-IN')}
                </Text>

                <Pressable
                  onPress={incrementCredits}
                  disabled={selectedCredits >= MAX_CREDITS}
                  hitSlop={12}
                  style={({ pressed }) => [
                    styles.stepperButton,
                    {
                      borderColor: '#e4e4e7',
                      opacity: selectedCredits >= MAX_CREDITS ? 0.25 : pressed ? 0.6 : 1,
                    },
                  ]}
                  accessibilityLabel="Increase amount"
                >
                  <Ionicons name="add" size={22} color="#09090b" />
                </Pressable>
              </View>

              {/* Action Row: Pay and Add Test */}
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => void buySelected()}
                  disabled={buying || granting}
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor: '#09090b',
                      opacity: buying ? 0.7 : pressed ? 0.88 : 1,
                      flex: 1,
                    },
                  ]}
                >
                  {buying ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={[styles.actionButtonText, { color: '#ffffff' }]}>
                      Pay {selectedPriceFormatted}
                    </Text>
                  )}
                </Pressable>

                {__DEV__ && (
                  <Pressable
                    onPress={() => void grantDevelopmentCredits()}
                    disabled={granting || buying}
                    style={({ pressed }) => [
                      styles.testButton,
                      {
                        borderColor: '#e4e4e7',
                        opacity: granting ? 0.7 : pressed ? 0.6 : 1,
                      },
                    ]}
                    accessibilityLabel="Add test credits"
                  >
                    {granting ? (
                      <ActivityIndicator color="#09090b" size="small" />
                    ) : (
                      <Text style={styles.testButtonText}>+Test</Text>
                    )}
                  </Pressable>
                )}
              </View>
            </View>

            {/* Credit pack reference */}
            <Text style={styles.creditsReferenceLabel}>Credit Packs</Text>
            {activeFeatures.length > 0 && (
              <View style={styles.pointsBox}>
                {activeFeatures.map((feat, index) => (
                  <View
                    key={`feat_wrap_${index}`}
                    style={[
                      styles.featureRow,
                      index < activeFeatures.length - 1 && styles.featureRowBorder,
                    ]}
                  >
                    <Text style={styles.featureTitleText}>{feat.title}</Text>
                    <View style={styles.featureValueRow}>
                      <Text style={styles.featureValueText}>{feat.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        ) : (
          /* ── WORKSPACE TAB ── */
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={[
              styles.contentScrollInside,
              { paddingBottom: Math.max(insets.bottom, 16) + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Centered Animated TarLogo with compact, perfectly balanced breathing room */}
            <View style={styles.logoCenter}>
              <AnimatedTarLogoAgent
                size={82}
                role={currentAgent.role}
                mode={siteGenMode}
              />
            </View>

            {/* Headline & Description */}
            <View style={styles.titleSection}>
              <Text style={styles.agentTitle}>{currentAgent.title}</Text>
              <Text style={styles.agentDesc} numberOfLines={1}>
                {currentAgent.description}
              </Text>
            </View>

            {/* ── 2-COLUMN KEY-VALUE FEATURE SPECS ── */}
            {activeFeatures.length > 0 && (
              <View style={styles.pointsBox}>
                {activeFeatures.map((feat, index) => {
                  const isExpandableRow = feat.isExpandable && currentAgent.id === 'tier_1';
                  return (
                    <View key={`feat_wrap_${index}`}>
                      <TouchableOpacity
                        activeOpacity={isExpandableRow ? 0.7 : 1}
                        onPress={
                          isExpandableRow
                            ? () => setWorkspacesExpanded(!workspacesExpanded)
                            : undefined
                        }
                        style={[
                          styles.featureRow,
                          index < activeFeatures.length - 1 &&
                            (!isExpandableRow || !workspacesExpanded) &&
                            styles.featureRowBorder,
                        ]}
                      >
                        <Text style={styles.featureTitleText}>{feat.title}</Text>
                        <View style={styles.featureValueRow}>
                          <Text style={styles.featureValueText}>{feat.value}</Text>
                        </View>
                      </TouchableOpacity>

                      {/* Owned workspaces reserve credits; joined workspaces are free for members. */}
                      {isExpandableRow && workspacesExpanded && (
                        <View style={styles.workspaceBreakdownBox}>
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownTitle}>Personal</Text>
                            <Text style={styles.breakdownQuota}>Always free</Text>
                          </View>
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownTitle}>Owner</Text>
                            <Text style={styles.breakdownQuota}>{ownerCount} active</Text>
                          </View>
                          <View style={[styles.breakdownRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.breakdownTitle}>Member</Text>
                            <Text style={styles.breakdownQuota}>{memberCount} joined · free</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}

        {/* ── 4. BOTTOM ACTION DOCK ── */}
        {activeTab === 'tier_1' && (
          /* Workspace Tab: Clean text buttons (Edit Canvas + Edit Storefront) */
          <View
            style={[
              styles.actionDockText,
              {
                paddingBottom: Math.max(insets.bottom, 16) + 8,
                flexDirection: 'column',
                gap: 2,
              },
            ]}
          >
            {onOpenCanvasCustomizer && (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.actionTextRowBtn}
                onPress={() => {
                  onClose();
                  onOpenCanvasCustomizer();
                }}
              >
                <Text style={styles.actionTextRowLabel}>Edit Canvas</Text>
                <Ionicons name="arrow-forward" size={17} color="#09090b" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.actionTextRowBtn}
              onPress={() => setShowSiteScreen(true)}
            >
              <Text style={styles.actionTextRowLabel}>Edit Storefront</Text>
              <Ionicons name="arrow-forward" size={17} color="#09090b" />
            </TouchableOpacity>
          </View>
        )}

        {/* Live Site Manager & Theme Editor Modal */}
        <SiteScreen
          visible={showSiteScreen}
          onClose={() => setShowSiteScreen(false)}
          workspaceName={workspaceName}
          subdomain={subdomain}
          scope={cleanSub}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#09090b',
    letterSpacing: -0.3,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    padding: 2.5,
    marginTop: 8,
    marginBottom: 8,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  tabItemActive: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  tabItemText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#71717a',
  },
  tabItemTextActive: {
    color: '#09090b',
    fontWeight: '800',
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollInside: {
    paddingBottom: 16,
  },
  logoCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleSection: {
    marginBottom: 10,
  },
  agentTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#09090b',
    letterSpacing: -0.4,
    marginBottom: 3,
  },
  agentDesc: {
    fontSize: 12.5,
    lineHeight: 17,
    color: '#52525b',
  },
  balanceSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 28,
    paddingBottom: 8,
    gap: 4,
  },
  balanceNumber: {
    fontSize: 56,
    lineHeight: 60,
    fontWeight: '800',
    letterSpacing: -2,
    color: '#09090b',
  },
  balanceSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
    color: '#52525b',
  },
  errorBox: {
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    textAlign: 'center',
  },
  creditsBottomSection: {
    gap: 16,
    paddingTop: 12,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    paddingBottom: 8,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    minWidth: 130,
    textAlign: 'center',
    color: '#09090b',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  testButton: {
    height: 54,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#09090b',
  },
  creditsReferenceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#09090b',
    letterSpacing: -0.3,
    marginTop: 24,
    marginBottom: 8,
  },
  billingToggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#f4f4f5',
    marginBottom: 10,
    gap: 4,
  },
  billingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6.5,
    borderRadius: 6,
  },
  billingBtnActive: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  billingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
  },
  billingTextActive: {
    color: '#09090b',
    fontWeight: '800',
  },
  saveBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 5,
    borderWidth: 0.5,
    borderColor: '#a7f3d0',
  },
  saveBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.2,
  },
  pointsBox: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f4f4f5',
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8.5,
  },
  featureRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  featureTitleText: {
    fontSize: 12.5,
    color: '#18181b',
    fontWeight: '500',
    flex: 1,
    paddingRight: 8,
  },
  featureValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureValueText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#09090b',
    fontFamily: 'monospace',
    textAlign: 'right',
  },
  workspaceBreakdownBox: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
    marginTop: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5.5,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  breakdownTitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#52525b',
  },
  breakdownQuota: {
    fontSize: 11,
    fontWeight: '700',
    color: '#09090b',
    fontFamily: 'monospace',
  },
  agentCardsWrap: {
    gap: 12,
    paddingVertical: 4,
  },
  agentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  agentCardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  agentCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  agentCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#09090b',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  agentCardCost: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  agentCardDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#52525b',
    marginBottom: 14,
  },
  agentCardActions: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
    gap: 6,
  },
  agentCardActionsLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#6b7280',
    marginBottom: 2,
  },
  agentCardActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  agentCardActionBullet: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 17,
  },
  agentCardActionText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#374151',
    flex: 1,
  },
  actionDockText: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f5',
    backgroundColor: '#ffffff',
  },
  actionTextRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    width: '100%',
  },
  actionLeftWithLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionTextRowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#09090b',
    letterSpacing: -0.2,
  },
});

export default EphemeralPlanCanvas;
