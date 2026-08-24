import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TarLogo } from './TarLogo';
import { AnimatedTarLogoAgent, AgentStateMode, AgentRoleType } from './AnimatedTarLogoAgent';
import SiteScreen from './site';
import { tar, type AgentRate } from '@/lib/tar';

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

interface MicroAgentEntry {
  id: string;
  action: string;
  name: string;
  desc: string;
  credits: number;
  color: string;
  bg: string;
}

const MICRO_AGENTS_DIRECTORY: MicroAgentEntry[] = [
  {
    id: 'ocr_intake',
    action: 'ocr.scan',
    name: 'Tar Intake OCR',
    desc: 'Scans paper bills, vendor receipts, and delivery notes into stock',
    credits: 3,
    color: '#8B5CF6',
    bg: '#F5F3FF',
  },
  {
    id: 'lead_hunter',
    action: 'lead.batch',
    name: 'Supplier & Lead Hunter',
    desc: 'Finds verified wholesale suppliers, B2B buyers & direct contacts',
    credits: 50,
    color: '#10B981',
    bg: '#ECFDF5',
  },
  {
    id: 'price_monitor',
    action: 'price.check',
    name: 'Competitor Price Monitor',
    desc: 'Tracks live product prices across quick-commerce apps and local stores',
    credits: 2,
    color: '#F97316',
    bg: '#FFF7ED',
  },
  {
    id: 'gst_recon',
    action: 'tax.report',
    name: 'GST & Tax Estimator',
    desc: 'Calculates advance tax liabilities and input tax credits automatically',
    credits: 20,
    color: '#D97706',
    bg: '#FFFBEB',
  },
  {
    id: 'bill_auditor',
    action: 'bill.audit',
    name: 'Bank & Bill Margin Auditor',
    desc: 'Matches purchase orders with bills and flags supplier price hikes',
    credits: 5,
    color: '#2563EB',
    bg: '#EFF6FF',
  },
  {
    id: 'lapsed_recovery',
    action: 'retention.campaign',
    name: 'Lapsed Customer Retention',
    desc: 'Finds inactive customers and drafts tailored WhatsApp win-back offers',
    credits: 20,
    color: '#E11D48',
    bg: '#FFF1F2',
  },
  {
    id: 'image_clean',
    action: 'photo.clean',
    name: 'Product Photo AI Clean',
    desc: 'Removes messy backgrounds and formats studio-grade product photos',
    credits: 10,
    color: '#6366F1',
    bg: '#EEF2FF',
  },
  {
    id: 'voice_order',
    action: 'voice.order',
    name: 'Voice Note Order Parser',
    desc: 'Transcribes customer audio notes directly into checkout items',
    credits: 5,
    color: '#0D9488',
    bg: '#F0FDFA',
  },
  {
    id: 'research_swarm',
    action: 'research.task',
    name: 'Multi-Agent Research Swarm',
    desc: 'Deep multi-agent research across business registries, licenses & tenders',
    credits: 100,
    color: '#0891B2',
    bg: '#ECFEFF',
  },
];

const PLAN_AGENTS: PlanAgentItem[] = [
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
    id: 'tier_2',
    tabLabel: 'Credits',
    role: 'sales_agent',
    title: 'One Credit Wallet',
    description: 'Credits pay for owned workspaces and AI actions. No fixed plans.',
    features: () => [
      { title: '500 credits', value: '₹99' },
      { title: '2,500 credits', value: '₹449' },
      { title: '6,000 credits', value: '₹999' },
      { title: 'Expiry', value: 'None while account is active' },
      { title: 'Third-party fees', value: 'Separate' },
    ],
  },
  {
    id: 'tier_4',
    tabLabel: 'All Agents',
    role: 'lead_hunter',
    title: 'All Agents',
    description: 'Specialized AI tools called automatically in your workspace.',
  },
];

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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<string>('tier_1');
  const [siteGenMode] = useState<AgentStateMode>('active');
  const [workspacesExpanded, setWorkspacesExpanded] = useState<boolean>(false);
  const [showSiteScreen, setShowSiteScreen] = useState<boolean>(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<AgentRate[]>([]);

  useEffect(() => {
    if (!visible) return;
    Promise.all([tar.wallet(), tar.agents()]).then(([wallet, agents]) => {
      setWalletBalance(wallet.wallet?.balance ?? 0);
      setCatalog(agents.agents || []);
    }).catch(() => {});
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

  const handleOpenCreditPacks = () => {
    onClose();
    router.push('/credits');
  };

  const activeFeatures = currentAgent.features ? currentAgent.features(ownerCount, memberCount) : [];
  const agentDirectory = catalog.length > 0
    ? catalog.map((agent, index) => {
        const fallback = MICRO_AGENTS_DIRECTORY.find((item) => item.action === agent.action);
        const colors = ['#8B5CF6', '#10B981', '#F97316', '#2563EB', '#E11D48', '#0891B2'];
        return {
          id: agent.id,
          action: agent.action,
          name: agent.name,
          desc: fallback?.desc || agent.action.replace(/\./g, ' '),
          credits: agent.credits,
          color: fallback?.color || colors[index % colors.length],
          bg: fallback?.bg || '#F8FAFC',
        };
      })
    : MICRO_AGENTS_DIRECTORY;

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
          <View style={styles.workspacePill}>
            <Text style={styles.workspacePillText}>{cleanSub}</Text>
          </View>
        </View>

        {/* ── 2. FLAT SEGMENTED SELECTOR (Workspace | Sales Agent | All Agents) ── */}
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
          /* ── ALL AGENTS DIRECTORY ── */
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={[
              styles.contentScrollInside,
              { paddingBottom: Math.max(insets.bottom, 16) + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.directoryContainer}>
              {agentDirectory.map((item, idx) => (
                <View
                  key={item.id}
                  style={[
                    styles.directoryRow,
                    idx < agentDirectory.length - 1 && styles.directoryRowBorder,
                  ]}
                >
                  {/* Non-animated TarLogo Icon differing by work color */}
                  <View style={[styles.agentIconBox, { backgroundColor: item.bg }]}>
                    <TarLogo size={24} color={item.color} />
                  </View>

                  {/* Agent Info + Right Bottom Cost Text */}
                  <View style={styles.directoryContentCol}>
                    <Text style={styles.directoryName}>{item.name}</Text>
                    <Text style={styles.directoryDesc}>{item.desc}</Text>
                    <View style={styles.directoryCostRow}>
                      <Text style={styles.directoryCostText}>{item.credits} credits</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
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
              {currentAgent.id === 'tier_2' && walletBalance !== null ? (
                <Text style={styles.walletBalance}>{walletBalance.toLocaleString()} credits available</Text>
              ) : null}
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

        {activeTab === 'tier_2' && (
          /* Sales Agent Tab: Brand Logo with Left-Aligned Text & Top-Right Arrow for External Link */
          <View
            style={[
              styles.actionDockText,
              {
                paddingBottom: Math.max(insets.bottom, 16) + 8,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.actionTextRowBtn}
              onPress={handleOpenCreditPacks}
            >
              <View style={styles.actionLeftWithLogo}>
                <TarLogo size={18} color="#09090b" />
                <Text style={styles.actionTextRowLabel}>Buy Credit Pack</Text>
              </View>
              <Ionicons
                name="arrow-forward"
                size={17}
                color="#09090b"
                style={{ transform: [{ rotate: '-45deg' }] }}
              />
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
  workspacePill: {
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  workspacePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#52525b',
    fontFamily: 'monospace',
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
  walletBalance: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '800',
    color: '#09090b',
    letterSpacing: -0.4,
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
  directoryContainer: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f4f4f5',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  directoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  directoryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  agentIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  directoryContentCol: {
    flex: 1,
  },
  directoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#09090b',
    marginBottom: 2,
  },
  directoryDesc: {
    fontSize: 11.5,
    lineHeight: 15,
    color: '#52525b',
    marginBottom: 4,
  },
  directoryCostRow: {
    alignItems: 'flex-end',
  },
  directoryCostText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#09090b',
    fontFamily: 'monospace',
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
