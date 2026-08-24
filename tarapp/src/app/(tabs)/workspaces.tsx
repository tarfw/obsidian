import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, TextInput, Modal, Platform, TouchableOpacity, Keyboard } from 'react-native';
import { KeyboardAwareScrollView, KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as SecureStore from 'expo-secure-store';
import { BlurView } from 'expo-blur';

import { useTheme } from '@/hooks/use-theme';
import { tar } from '@/lib/tar';
import { useSite } from '@/hooks/use-site';
import { generateSiteLayout } from '@/lib/site-ai';
import { parseDesignTokens } from '@/lib/design-tokens';
import { buildModuleLayout, parseYamlFrontmatter, parseCanvasMarkdown, type CanvasDocument, type CanvasBlock, type CanvasLifeMode } from '@/lib/layout-engine';
import { resolveIntent } from '@/lib/intent-resolver';
import { getCurrentUser } from '@/lib/auth';
import { filterModulesByRole } from '@/lib/role-filter';
import GenUIScreen from '@/gen-ui/GenUIScreen';
import { fetchInbox, markTaskDone } from '@/lib/inbox';

export interface LinearInboxItem {
  id: string;
  type: string;
  title: string;
  status: string;
  ref?: string;
  due?: number | string;
  created_at?: string;
  data?: any;
}
import EventComposeModal from '@/components/EventComposeModal';
import ContactDetailsModal from '@/components/ContactDetailsModal';
import ItemComposeModal from '@/components/ItemComposeModal';
import SiteScreen from '@/components/site';
import ContactCreateModal from '@/components/ContactCreateModal';
import { ContactMentionPicker, ContactMentionModal, ContactItem } from '@/components/ContactMentionPicker';
import ExploreOverlay from '@/components/ExploreOverlay';
import CanvasOverlay from '@/components/CanvasOverlay';
import CanvasCustomizerModal from '@/components/CanvasCustomizerModal';
import CreateWorkspace from '@/components/CreateWorkspace';
import { EphemeralPlanCanvas } from '@/components/plans';
import { TarLogoLoader } from '@/components/TarLogoLoader';
import { updateStock } from '@/lib/inventory';

interface Workspace {
  id?: string;
  scope: string;
  subdomain: string;
  role: string;
  name?: string;
  type?: string;
  state?: 'provisioning' | 'active' | 'grace' | 'readonly' | 'archived' | 'cold' | 'restoring' | 'error';
}

const PERSONAL_WORKSPACE: Workspace = {
  subdomain: 'personal',
  scope: 'p',
  name: 'Personal Workspace',
  role: 'owner',
  type: 'personal',
};

interface CardItem {
  id: string;
  type: 'user_text' | 'assistant_text' | 'error' | 'product_list' | 'product_created' | 'order_list' | 'stats' | 'site_card';
  text?: string;
  message?: string;
  products?: any[];
  product?: any;
  orders?: any[];
  title?: string;
  value?: string | number;
  subtitle?: string;
  layout?: any;
  isDirty?: boolean;
}

const WorkspaceThumbnail = ({ name, size = 36, theme }: { name: string; size?: number; theme: any }) => {
  const firstLetter = name ? name.charAt(0).toUpperCase() : 'W';
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];

  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: Math.round(size * 0.22),
      backgroundColor: color,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Text style={{
        color: '#ffffff',
        fontSize: size * 0.45,
        fontWeight: '700',
      }}>
        {firstLetter}
      </Text>
    </View>
  );
};

const BUSINESS_VERTICALS = [
  { id: 'business', label: 'General Business', icon: 'briefcase-outline' },
  { id: 'retail', label: 'Retail & Store', icon: 'cart-outline' },
  { id: 'restaurant', label: 'Restaurant & Cafe', icon: 'restaurant-outline' },
  { id: 'salon', label: 'Salon & Spa', icon: 'cut-outline' },
  { id: 'clinic', label: 'Clinic & Healthcare', icon: 'medical-outline' },
  { id: 'logistics', label: 'Logistics & Fleet', icon: 'car-outline' },
];

export const PLAN5_EVENT_MOTIONS = [
  { event: 'Add Contact', actionName: 'action_add_contact', whatHappened: 'Add a new person / contact', linksTo: 'Person', params: [{ name: 'name', type: 'text', required: true }, { name: 'phone', type: 'text', required: false }, { name: 'email', type: 'text', required: false }, { name: 'role', type: 'text', required: false }] },
  { event: 'Add Company', actionName: 'action_add_company', whatHappened: 'Add business account / partner', linksTo: 'Company', params: [{ name: 'name', type: 'text', required: true }, { name: 'industry', type: 'text', required: false }, { name: 'website', type: 'text', required: false }] },
  { event: 'Start Flow', actionName: 'action_add_flow', whatHappened: 'Add contact to a workflow', linksTo: 'Flow', params: [{ name: 'contact_id', type: 'text', required: true }, { name: 'pipeline', type: 'text', required: true }, { name: 'name', type: 'text', required: true }, { name: 'stage', type: 'text', required: false }, { name: 'value', type: 'number', required: false }] },
  { event: 'Advance Flow', actionName: 'action_update_flow_stage', whatHappened: 'Advance stage in workflow', linksTo: 'Flow', params: [{ name: 'flow_id', type: 'text', required: true }, { name: 'stage', type: 'text', required: true }] },
  { event: 'Sale', actionName: 'action_record_sale', whatHappened: 'Transaction completed', linksTo: 'Order', params: [{ name: 'customer_id', type: 'text', required: true }, { name: 'items', type: 'text', required: true }, { name: 'payment_method', type: 'text', required: true }, { name: 'total', type: 'number', required: true }] },
  { event: 'Refund', actionName: 'action_refund_order', whatHappened: 'Money returned', linksTo: 'Order', params: [{ name: 'customer_id', type: 'text', required: false }, { name: 'order_id', type: 'text', required: true }, { name: 'amount', type: 'number', required: true }, { name: 'reason', type: 'text', required: false }] },
  { event: 'Quote', actionName: 'action_create_quote', whatHappened: 'Quotation issued', linksTo: 'Order', params: [{ name: 'customer_id', type: 'text', required: true }, { name: 'items', type: 'text', required: true }, { name: 'total', type: 'number', required: true }, { name: 'valid_until', type: 'text', required: false }] },
  { event: 'Invoice', actionName: 'action_create_invoice', whatHappened: 'Customer invoice generated', linksTo: 'Order', params: [{ name: 'customer_id', type: 'text', required: true }, { name: 'items', type: 'text', required: true }, { name: 'amount', type: 'number', required: true }, { name: 'due_date', type: 'text', required: false }, { name: 'order_id', type: 'text', required: false }] },
  { event: 'Payment', actionName: 'action_record_payment', whatHappened: 'Payment logged', linksTo: 'Order', params: [{ name: 'customer_id', type: 'text', required: true }, { name: 'amount', type: 'number', required: true }, { name: 'payment_method', type: 'text', required: true }, { name: 'invoice_id', type: 'text', required: false }] },
  { event: 'Delivery', actionName: 'action_issue_delivery', whatHappened: 'Delivery order issued', linksTo: 'Order', params: [{ name: 'customer_id', type: 'text', required: true }, { name: 'order_id', type: 'text', required: true }, { name: 'carrier', type: 'text', required: false }, { name: 'tracking_no', type: 'text', required: false }] },
  { event: 'RFQ', actionName: 'action_create_rfq', whatHappened: 'Request for quotation sent', linksTo: 'Company', params: [{ name: 'vendor_id', type: 'text', required: true }, { name: 'items', type: 'text', required: true }, { name: 'valid_until', type: 'text', required: false }] },
  { event: 'Purchase Order', actionName: 'action_create_po', whatHappened: 'PO issued to vendor', linksTo: 'Company', params: [{ name: 'vendor_id', type: 'text', required: true }, { name: 'items', type: 'text', required: true }, { name: 'total', type: 'number', required: true }, { name: 'due_date', type: 'text', required: false }] },
  { event: 'Vendor Bill', actionName: 'action_log_vendor_bill', whatHappened: 'Supplier bill logged', linksTo: 'Company', params: [{ name: 'vendor_id', type: 'text', required: true }, { name: 'po_id', type: 'text', required: false }, { name: 'amount', type: 'number', required: true }, { name: 'due_date', type: 'text', required: false }] },
  { event: 'Stock Transfer', actionName: 'action_transfer_stock', whatHappened: 'Inventory moved', linksTo: 'Product', params: [{ name: 'product_id', type: 'text', required: true }, { name: 'from_loc', type: 'text', required: true }, { name: 'to_loc', type: 'text', required: true }, { name: 'qty', type: 'number', required: true }] },
  { event: 'Booking', actionName: 'action_book_slot', whatHappened: 'Appointment made', linksTo: 'Booking', params: [{ name: 'service', type: 'text', required: true }, { name: 'date', type: 'text', required: true }, { name: 'slot', type: 'text', required: true }, { name: 'customer_id', type: 'text', required: false }] },
  { event: 'Cancel', actionName: 'action_cancel_booking', whatHappened: 'Booking cancelled', linksTo: 'Booking', params: [{ name: 'booking_id', type: 'text', required: true }, { name: 'reason', type: 'text', required: false }] },
  { event: 'Clock In', actionName: 'action_clock_in', whatHappened: 'Staff arrived', linksTo: 'Person', params: [{ name: 'staff_id', type: 'text', required: true }] },
  { event: 'Clock Out', actionName: 'action_clock_out', whatHappened: 'Staff left', linksTo: 'Person', params: [{ name: 'staff_id', type: 'text', required: true }] },
  { event: 'Tracking', actionName: 'action_update_tracking', whatHappened: 'Shipment updated', linksTo: 'Shipment', params: [{ name: 'shipment_id', type: 'text', required: true }, { name: 'status', type: 'text', required: true }, { name: 'location', type: 'text', required: false }] },
  { event: 'Delivered', actionName: 'action_complete_delivery', whatHappened: 'Shipment fulfilled', linksTo: 'Shipment', params: [{ name: 'shipment_id', type: 'text', required: true }, { name: 'recipient_signature', type: 'text', required: false }] },
  { event: 'Activity', actionName: 'action_log_activity', whatHappened: 'Call/meeting logged', linksTo: 'Deal, Person', params: [{ name: 'type', type: 'text', required: true }, { name: 'description', type: 'text', required: true }, { name: 'contact_id', type: 'text', required: false }, { name: 'deal_id', type: 'text', required: false }] },
  { event: 'Adjust', actionName: 'action_adjust_stock', whatHappened: 'Stock changed', linksTo: 'Product', params: [{ name: 'product_id', type: 'text', required: true }, { name: 'qty', type: 'number', required: true }, { name: 'reason', type: 'text', required: false }] },
  { event: 'Write Off', actionName: 'action_write_off', whatHappened: 'Stock removed', linksTo: 'Product', params: [{ name: 'product_id', type: 'text', required: true }, { name: 'qty', type: 'number', required: true }, { name: 'reason', type: 'text', required: false }] },
  { event: 'Expense', actionName: 'action_record_expense', whatHappened: 'Cost recorded', linksTo: 'Expense', params: [{ name: 'category', type: 'text', required: true }, { name: 'amount', type: 'number', required: true }, { name: 'description', type: 'text', required: false }, { name: 'date', type: 'text', required: false }] },
  { event: 'Assignment', actionName: 'action_create_task', whatHappened: 'Task assigned', linksTo: 'Project', params: [{ name: 'title', type: 'text', required: true }, { name: 'description', type: 'text', required: false }, { name: 'assignee_id', type: 'text', required: false }, { name: 'due_date', type: 'text', required: false }] },
  { event: 'Receive Stock', actionName: 'action_receive_po', whatHappened: 'Stock added from supplier', linksTo: 'Product', params: [{ name: 'product_id', type: 'text', required: true }, { name: 'qty', type: 'number', required: true }, { name: 'po_id', type: 'text', required: false }] },
  { event: 'Site', actionName: 'action_open_site', whatHappened: 'View/edit live website storefront', linksTo: 'Storefront', params: [] },
  { event: 'New Workspace', actionName: 'action_create_workspace', whatHappened: 'Create a new AI-powered workspace', linksTo: 'Workspace', params: [] },
  { event: 'Add Item', actionName: 'action_add_product', whatHappened: 'Item cataloged', linksTo: 'Item', params: [{ name: 'title', type: 'text', required: true }, { name: 'item_subtype', type: 'text', required: true }, { name: 'price', type: 'number', required: false }, { name: 'stock', type: 'number', required: false }, { name: 'category', type: 'text', required: false }] },
];

export default function WorkspacesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const paramSubdomain = typeof params.subdomain === 'string' ? params.subdomain : undefined;
  const paramAction = typeof params.action === 'string' ? params.action : undefined;

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  const [sessionId] = useState(() => 'sess_' + Date.now());
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [agentFeedback, setAgentFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Auto-dismiss feedback toast after 4 seconds
  useEffect(() => {
    if (agentFeedback) {
      const timer = setTimeout(() => setAgentFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [agentFeedback]);
  const [input, setInput] = useState('');
  const [executing, setExecuting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPlanCanvas, setShowPlanCanvas] = useState(false);
  
  // Dynamic workspace blueprints/modules
  const [loadingIndex, setLoadingIndex] = useState(false);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [detectedVertical, setDetectedVertical] = useState('general');
  const [parsedToolsList, setParsedToolsList] = useState<any[]>([]);
  const [workspaceName, setWorkspaceName] = useState('');
  
  const [designTokens, setDesignTokens] = useState<any>(null);
  const [canvasLayouts, setCanvasLayouts] = useState<any[]>([]);
  const [canvasBlocks, setCanvasBlocks] = useState<any[]>([]);
  const [canvasDoc, setCanvasDoc] = useState<CanvasDocument | null>(null);
  const [loadingCanvas, setLoadingCanvas] = useState(false);
  const [showCanvasCustomizer, setShowCanvasCustomizer] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsCreating, setNewWsCreating] = useState(false);
  const [selectedVertical, setSelectedVertical] = useState<string>('business');
  const [selectedEntityDetails, setSelectedEntityDetails] = useState<any | null>(null);
  const [entityHistory, setEntityHistory] = useState<any[]>([]);
  const [inboxTasks, setInboxTasks] = useState<LinearInboxItem[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [allEntities, setAllEntities] = useState<any[]>([]);
  const [queryResults, setQueryResults] = useState<Record<string, any[]>>({});

  const [selectedAction, setSelectedAction] = useState<any | null>(null);
  const [formParams, setFormParams] = useState<Record<string, string>>({});
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionResultMessage, setActionResultMessage] = useState<string | null>(null);
  const [activeChipField, setActiveChipField] = useState<string | null>(null);
  const chipInputRef = useRef<TextInput>(null);

  // Dedicated Item & Contact Modal state
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemInitialData, setItemInitialData] = useState<any>(null);
  const [submittingItem, setSubmittingItem] = useState(false);
  const [itemResultMessage, setItemResultMessage] = useState<string | null>(null);

  const [showContactModal, setShowContactModal] = useState(false);
  const [showSiteScreen, setShowSiteScreen] = useState(false);
  const [initialContactType, setInitialContactType] = useState('Customer');
  const [submittingContact, setSubmittingContact] = useState(false);
  const [contactResultMessage, setContactResultMessage] = useState<string | null>(null);
  const [editContactEntity, setEditContactEntity] = useState<any | null>(null);

  // Mention (@ / #) state
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const [showMentionModal, setShowMentionModal] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPrefix, setMentionPrefix] = useState<'@' | '#'>('@');

  const handleInputChange = (text: string) => {
    setInput(text);
    const match = text.match(/([@#])([a-zA-Z0-9_\s.-]*)$/);
    if (match) {
      setMentionPrefix(match[1] as '@' | '#');
      setShowMentionPopover(true);
      setMentionQuery(match[2]);
    } else {
      setShowMentionPopover(false);
      setMentionQuery('');
    }
  };

  const handleAtButtonPress = () => {
    setInput(prev => {
      const next = prev.endsWith('@') ? prev : prev ? prev + ' @' : '@';
      return next;
    });
    setShowMentionPopover(true);
    setMentionQuery('');
  };

  const handleSelectMentionContact = (contact: ContactItem) => {
    const raw = (contact as any).rawEntity || contact;
    if (raw?.isPersonalContact && currentWorkspace?.scope && currentWorkspace.scope !== 'p') {
      autoBridgeContactToWorkspace(raw, currentWorkspace.scope).catch(() => null);
    }
    setInput(prev => {
      const match = prev.match(/([@#])([a-zA-Z0-9_\s.-]*)$/);
      if (match) {
        const prefix = match[1];
        const atIdx = prev.lastIndexOf(prefix + match[2]);
        return prev.substring(0, atIdx) + `${prefix}${contact.name} `;
      }
      return prev ? prev + ` @${contact.name} ` : `@${contact.name} `;
    });
    setShowMentionPopover(false);
    setShowMentionModal(false);
  };

  const handleOpenEntityOrItemDetails = (entity: any) => {
    setShowMentionPopover(false);
    setShowMentionModal(false);
    if (!entity) return;
    const raw = entity.rawEntity || entity;
    if (raw?.isPersonalContact && currentWorkspace?.scope && currentWorkspace.scope !== 'p') {
      autoBridgeContactToWorkspace(raw, currentWorkspace.scope).catch(() => null);
    }

    const typeCode = typeof entity.type === 'number' ? entity.type : undefined;
    const typeLower = String(entity.type || entity.category || '').toLowerCase();
    const isItem =
      entity.kind === 'item' ||
      typeCode === 3 ||
      typeCode === 4 ||
      typeCode === 5 ||
      typeCode === 6 ||
      typeCode === 7 ||
      typeLower.includes('product') ||
      typeLower.includes('item') ||
      typeLower.includes('service') ||
      typeLower.includes('asset') ||
      typeLower.includes('listing') ||
      typeLower.includes('document') ||
      entity.data?.item_subtype;

    if (isItem) {
      setItemInitialData(raw);
      setShowItemModal(true);
    } else {
      setSelectedEntityDetails(raw);
    }
  };

  // Inbox Task Resolution State
  const [resolvingTaskId, setResolvingTaskId] = useState<string | null>(null);

  // Overlay panel state (bottom bar triggers)
  const [showExploreOverlay, setShowExploreOverlay] = useState(false);
  const [showCanvasOverlay, setShowCanvasOverlay] = useState(false);

  const hasAnyValue = selectedAction?.params?.some((p: any) => {
    const paramName = typeof p === 'string' ? p : p.name;
    return formParams[paramName]?.trim();
  }) ?? false;

  const scrollViewRef = useRef<any>(null);
  const workspaceToolsCache = useRef<Record<string, { workspaceName: string; detectedVertical: string; activeModules: string[]; parsedToolsList: any[] }>>({});

  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.subdomain ? currentWorkspace.subdomain.charAt(0).toUpperCase() + currentWorkspace.subdomain.slice(1) : '');
    } else {
      setWorkspaceName('');
    }
  }, [currentWorkspace]);
  
  // Custom scope resolution to feed into useSite
  const activeScope = currentWorkspace?.scope ?? undefined;
  const { draft, publish, saveDraft, refresh: refreshSite } = useSite(activeScope);

  // Load workspace index.md and dynamic module files from S3 when workspace changes
  useEffect(() => {
    if (currentWorkspace?.scope) {
      const scope = currentWorkspace.scope;
      const cached = workspaceToolsCache.current[scope];

      if (cached) {
        // Load immediately from cache (no loading screen)
        setDetectedVertical(cached.detectedVertical);
        setActiveModules(cached.activeModules);
        setParsedToolsList(cached.parsedToolsList);
        if (cached.workspaceName) {
          setWorkspaceName(cached.workspaceName);
        }
        setLoadingIndex(false);
      } else {
        // First-time loading indicator
        setLoadingIndex(true);
      }

      Promise.all([
        tar.okf.readIndex(scope).catch(() => null),
        tar.okf.read(scope, 'team/members.md').catch(() => null),
        getCurrentUser().catch(() => null)
      ]).then(async ([indexRes, membersRes, currentUser]) => {
        if (indexRes && indexRes.content) {
          const { name, type, modules } = parseIndexMarkdown(indexRes.content);
          
          const userEmail = currentUser?.email || 'owner@gmail.com';
          const allowedModules = filterModulesByRole(userEmail, modules, membersRes?.content || null);

          try {
            const fetchedTools = await Promise.all(
              allowedModules.map(async (mod) => {
                try {
                  const fileRes = await tar.okf.read(scope, `skills/${mod}.md`);
                  if (fileRes && fileRes.content) {
                    return parseModuleMarkdown(mod, fileRes.content);
                  }
                } catch (e) {
                  console.warn(`[OKF] Failed to fetch module skills/${mod}.md:`, e);
                }
                return null;
              })
            );

            const validTools = fetchedTools.filter(t => t !== null) as any[];

            workspaceToolsCache.current[scope] = {
              workspaceName: name || '',
              detectedVertical: type,
              activeModules: allowedModules,
              parsedToolsList: validTools
            };

            setDetectedVertical(type);
            setActiveModules(allowedModules);
            setParsedToolsList(validTools);
            if (name) {
              setWorkspaceName(name);
            }
          } catch (err) {
            console.warn('[OKF] Failed to load module details:', err);
          }
        }
      })
      .catch((err: any) => {
        console.warn('[OKF] Failed to fetch workspace index.md:', err);
        if (!cached) {
          setDetectedVertical(currentWorkspace.type || 'business');
          setActiveModules([]);
          setParsedToolsList([]);
        }
      })
      .finally(() => {
        setLoadingIndex(false);
      });
    }
  }, [currentWorkspace?.scope]);

  // Fetch workspaces list on mount with Google email matching (genuiteam.md §3)
  const fetchWorkspacesList = useCallback(async (silent = false): Promise<Workspace[]> => {
    if (!silent) setLoadingWorkspaces(true);
    try {
      const user = await getCurrentUser().catch(() => null);
      if (user?.email) {
        import('@/lib/tar').then(({ setUserEmail }) => setUserEmail(user.email));
      }
      const data = await tar.listWorkspaces(user?.email);
      const rawList: Workspace[] = data.workspaces || [];
      const list: Workspace[] = [
        PERSONAL_WORKSPACE,
        ...rawList.filter((w) => w.subdomain !== 'personal'),
      ];
      setWorkspaces(list);

      // Prioritize route parameters (deep-linking), fallback to SecureStore, default to Personal
      const targetSub = paramSubdomain || await SecureStore.getItemAsync('active_workspace_subdomain').catch(() => null);
      const found = list.find((w) => w.subdomain === targetSub);
      if (found) {
        setCurrentWorkspace(found);
      } else {
        setCurrentWorkspace(PERSONAL_WORKSPACE);
      }
      return list;
    } catch (e) {
      console.warn('[Workspaces] Failed to fetch workspaces:', e);
      setWorkspaces([PERSONAL_WORKSPACE]);
      setCurrentWorkspace(PERSONAL_WORKSPACE);
      return [PERSONAL_WORKSPACE];
    } finally {
      if (!silent) setLoadingWorkspaces(false);
    }
  }, [paramSubdomain]);

  useEffect(() => {
    fetchWorkspacesList();
  }, [fetchWorkspacesList]);

  useEffect(() => {
    if (!showDropdown) return;
    tar.wallet().then(({ wallet }) => setCreditBalance(wallet?.balance ?? 0)).catch(() => setCreditBalance(null));
  }, [showDropdown]);

  useEffect(() => {
    if (!workspaces.some((workspace) => workspace.state === 'provisioning' || workspace.state === 'restoring')) return;
    const timer = setInterval(() => { fetchWorkspacesList(true).catch(() => {}); }, 2000);
    return () => clearInterval(timer);
  }, [fetchWorkspacesList, workspaces]);

  const [newWsDesc, setNewWsDesc] = useState('');

  const closeCreateModal = useCallback(() => {
    setIsCreatingWorkspace(false);
    if (paramAction === 'new') {
      router.setParams({ action: undefined });
    }
  }, [paramAction, router]);

  const handleCreateInlineWorkspace = async () => {
    if (!newWsName.trim() || newWsCreating) return;
    setNewWsCreating(true);
    try {
      const name = newWsName.trim();
      const desc = newWsDesc.trim() || name;
      let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
      if (!slug) {
        slug = `ws-${Date.now().toString(36)}`;
      }
      await tar.createWorkspace({
        name,
        subdomain: slug,
        description: desc,
        type: selectedVertical,
      });
      await SecureStore.setItemAsync('active_workspace_subdomain', slug).catch(() => null);
      setNewWsName('');
      setNewWsDesc('');
      closeCreateModal();
      await fetchWorkspacesList();
    } catch (err: any) {
      setAgentFeedback({ text: err.message || 'Failed to create workspace', type: 'error' });
    } finally {
      setNewWsCreating(false);
    }
  };

  // Update current workspace if the route parameter changes while screen is mounted
  useEffect(() => {
    if (paramSubdomain && workspaces.length > 0) {
      const found = workspaces.find((w) => w.subdomain === paramSubdomain);
      if (found && found.subdomain !== currentWorkspace?.subdomain) {
        setCurrentWorkspace(found);
        SecureStore.setItemAsync('active_workspace_subdomain', paramSubdomain).catch(() => null);
        setAgentFeedback(null);
      }
    }
  }, [paramSubdomain, workspaces]);

  const filterActiveRows = (rows: any[]) => {
    return (rows || []).filter((r: any) => {
      if (!r) return false;
      const statusStr = String(r.status || '').toLowerCase();
      const typeStr = String(r.type || '').toLowerCase();
      return (
        statusStr !== 'deleted' &&
        statusStr !== 'archived' &&
        typeStr !== 'deleted' &&
        !r.deleted &&
        r.deleted !== 'true' &&
        r.is_deleted !== 1
      );
    });
  };

  const refreshProducts = async (scope: string) => {
    try {
      const result = await tar.tool('read', {
        table: 'matter',
        type: 'product',
        scope
      });
      setProducts(filterActiveRows(result?.rows || []));
    } catch (e) {
      console.warn('[Workspace] Failed to fetch products:', e);
    }
  };

  const refreshOrders = async (scope: string) => {
    try {
      const result = await tar.tool('read', { table: 'matter', type: 'order', scope });
      if (result?.rows && result.rows.length > 0) {
        setOrders(filterActiveRows(result.rows));
      } else {
        const motionRes = await tar.tool('read', { table: 'motion', scope });
        setOrders(filterActiveRows(motionRes?.rows || []));
      }
    } catch (e) {
      console.warn('[Workspace] Failed to fetch orders:', e);
    }
  };

  const autoBridgeContactToWorkspace = async (personalContact: any, workspaceScope: string) => {
    if (!personalContact || !workspaceScope || workspaceScope === 'p') return personalContact;
    const name = personalContact.title || personalContact.name || personalContact.data?.fn || 'Contact';
    const phone = personalContact.data?.ph || personalContact.data?.phone || personalContact.phone || '';
    const email = personalContact.data?.em || personalContact.data?.email || personalContact.email || '';

    try {
      // 1. Insert into Workspace DB as client
      const res = await tar.tool('create', {
        table: 'matter',
        type: 1, // Person
        title: name,
        role: 'client',
        scope: workspaceScope,
        data: {
          fn: name,
          ph: phone,
          em: email,
          src_personal_id: personalContact.id,
        },
      });

      // 2. Link in Personal DB graph (rel=13 linked_to)
      if (res?.id && personalContact.id) {
        await tar.tool('create', {
          table: 'graph',
          src: personalContact.id,
          rel: 13,
          tgt: res.id,
          scope: 'p',
        }).catch(() => null);
      }

      await refreshEntities(workspaceScope);
      return res;
    } catch (err) {
      console.warn('[AutoBridge] Error auto-bridging contact:', err);
      return personalContact;
    }
  };

  const refreshEntities = async (scope: string) => {
    try {
      // 1. Fetch active workspace entities
      const wsResult = await tar.tool('read', { table: 'matter', scope }).catch(() => null);
      const wsRows = filterActiveRows(wsResult?.rows || []);

      // 2. If inside a commercial workspace, also load personal contacts for zero-switching
      let personalRows: any[] = [];
      if (scope !== 'p') {
        const pResult = await tar.tool('read', { table: 'matter', scope: 'p' }).catch(() => null);
        personalRows = filterActiveRows(pResult?.rows || []).filter((r: any) => {
          const typeCode = typeof r.type === 'number' ? r.type : undefined;
          const typeStr = String(r.type || r.role || '').toLowerCase();
          return typeCode === 1 || typeStr === 'person' || typeStr === 'customer' || typeStr === 'contact';
        });
      }

      // 3. Smart Deduplication by phone, email, and name
      const seenPhones = new Set<string>();
      const seenEmails = new Set<string>();
      const seenNames = new Set<string>();

      wsRows.forEach((r: any) => {
        const ph = String(r.data?.ph || r.data?.phone || r.phone || '').trim().toLowerCase();
        const em = String(r.data?.em || r.data?.email || r.email || '').trim().toLowerCase();
        const nm = String(r.title || r.name || r.data?.fn || '').trim().toLowerCase();
        if (ph) seenPhones.add(ph);
        if (em) seenEmails.add(em);
        if (nm) seenNames.add(nm);
      });

      const deduplicatedPersonal: any[] = [];
      personalRows.forEach((pr: any) => {
        const ph = String(pr.data?.ph || pr.data?.phone || pr.phone || '').trim().toLowerCase();
        const em = String(pr.data?.em || pr.data?.email || pr.email || '').trim().toLowerCase();
        const nm = String(pr.title || pr.name || pr.data?.fn || '').trim().toLowerCase();

        const isDuplicate = (ph && seenPhones.has(ph)) || (em && seenEmails.has(em)) || (nm && seenNames.has(nm));
        if (!isDuplicate) {
          deduplicatedPersonal.push({
            ...pr,
            isPersonalContact: true,
            role: 'Personal Contact',
          });
        }
      });

      setAllEntities([...wsRows, ...deduplicatedPersonal]);
    } catch (e) {
      console.warn('[Workspace] Failed to fetch directory entities:', e);
    }
  };

  const refreshInboxTasks = useCallback(async (scope: string) => {
    setLoadingInbox(true);
    try {
      // 1. Query Turso `inbox` table directly
      const inboxRes = await tar.tool('read', { table: 'inbox', scope }).catch(() => null);
      const dbInboxRows = (inboxRes?.rows || []).filter((r: any) => !r.status || r.status === 'open' || r.status === 'pending');

      if (dbInboxRows.length > 0) {
        setInboxTasks(dbInboxRows.map((t: any) => {
          let parsedData = t.data;
          if (typeof t.data === 'string') {
            try { parsedData = JSON.parse(t.data); } catch (e) { parsedData = t.data; }
          }
          let rawTitle = t.title || t.name || 'Inbox Event';
          if (rawTitle.startsWith('New Order:')) rawTitle = 'New Order';
          else if (rawTitle.startsWith('Appointment Booked:')) rawTitle = 'Appointment Booked';
          else if (rawTitle.includes('Low Stock Alert:')) {
            const m = rawTitle.match(/Low Stock Alert:\s*([^(]+)/i);
            if (m) rawTitle = `Low Stock Alert: ${m[1].trim()}`;
          }

          return {
            id: t.id,
            type: t.type || 'task',
            title: rawTitle,
            status: t.status || 'open',
            ref: t.ref,
            due: t.due,
            created_at: t.at ? new Date(t.at * (t.at > 1e10 ? 1 : 1000)).toISOString() : undefined,
            data: parsedData,
          };
        }));
        return;
      }

      // 2. Fallback to fetchInbox worker endpoint
      const fetched = await fetchInbox(scope).catch(() => []);
      if (fetched && fetched.length > 0) {
        setInboxTasks(fetched.map((t: any) => ({
          id: t.id,
          type: t.typeName || t.event_type || 'task',
          title: t.title,
          status: t.status === 2 || t.status === 'done' ? 'done' : 'open',
          created_at: String(t.created_at || ''),
          data: t.data || t.event_data,
        })));
        return;
      }

      // 3. Fallback to open orders & stock alerts from matter table
      const res = await tar.tool('read', { table: 'matter', scope }).catch(() => null);
      const rows = res?.rows || [];
      const synthesized: LinearInboxItem[] = [];
      rows.filter((r: any) => r.type === 'order' && (r.status === 'open' || r.status === 'pending' || !r.status)).slice(0, 10).forEach((o: any, i: number) => {
        synthesized.push({
          id: o.id || `ibx_ord_${i}`,
          type: 'order',
          title: `Order #${o.id?.slice(-4) || i + 1} — ${o.title || o.name || 'Items'}`,
          status: o.status || 'open',
          created_at: o.created_at,
        });
      });
      rows.filter((r: any) => r.type === 'product' && (r.stock ?? 10) < 5).forEach((p: any, i: number) => {
        synthesized.push({
          id: p.id || `ibx_stk_${i}`,
          type: 'stock',
          title: `Low Stock Alert: ${p.title || p.name} (${p.stock ?? 0} remaining)`,
          status: 'open',
        });
      });
      setInboxTasks(synthesized);
    } catch (e) {
      console.warn('[Workspace] Failed to fetch inbox tasks:', e);
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  // Load products, orders, entities, and inbox when workspace changes
  useEffect(() => {
    if (currentWorkspace?.scope) {
      const scope = currentWorkspace.scope;
      refreshProducts(scope);
      refreshOrders(scope);
      refreshEntities(scope);
      refreshInboxTasks(scope);
      setAgentFeedback(null);
    }
  }, [currentWorkspace?.scope]);

  // Load DESIGN.md + modules SKILL.md specs from S3 whenever workspace changes
  useEffect(() => {
    if (currentWorkspace?.scope) {
      const scope = currentWorkspace.scope;
      setLoadingCanvas(true);
      
      Promise.all([
        tar.okf.read(scope, 'DESIGN.md').catch(() => null),
        tar.okf.readIndex(scope).catch(() => null),
        tar.okf.read(scope, scope === 'p' ? 'personal/canvas.md' : 'team/canvas.md')
          .catch(() => tar.okf.read(scope, 'team/canvas.md'))
          .catch(() => tar.okf.read(scope, 'canvas.md'))
          .catch(() => null)
      ]).then(async ([designRes, indexRes, canvasRes]) => {
        let tokens = null;
        if (designRes && designRes.content) {
          try {
            const { frontmatter } = parseYamlFrontmatter(designRes.content);
            tokens = parseDesignTokens(frontmatter);
            setDesignTokens(tokens);
          } catch (err) {
            console.warn('[Canvas] Failed to parse DESIGN.md:', err);
          }
        }
        
        let modulesList: string[] = [];
        if (indexRes && indexRes.content) {
          const { name, modules } = parseIndexMarkdown(indexRes.content);
          modulesList = modules;
          if (name) {
            setWorkspaceName(name);
          }
          const fetchedLayouts = await Promise.all(
            modules.map(async (mod) => {
              try {
                const fileRes = await tar.okf.read(scope, `skills/${mod}.md`);
                if (fileRes && fileRes.content) {
                  return buildModuleLayout(mod, fileRes.content);
                }
              } catch (e) {
                console.warn(`[Canvas] Failed to fetch skill ${mod}.md:`, e);
              }
              return null;
            })
          );
          setCanvasLayouts(fetchedLayouts.filter(Boolean) as any[]);
        }

        if (canvasRes && canvasRes.content) {
          try {
            const parsedDoc = parseCanvasMarkdown(canvasRes.content);
            setCanvasDoc(parsedDoc);
            setCanvasBlocks(parsedDoc.blocks || []);
          } catch (err) {
            console.warn('[Canvas] Failed to parse team/canvas.md:', err);
            setCanvasDoc(null);
            setCanvasBlocks([]);
          }
        } else {
          setCanvasDoc(null);
          setCanvasBlocks([]);
        }
      }).catch(err => {
        console.warn('[Canvas] Failed to load workspace specs:', err);
        setCanvasDoc(null);
        setCanvasBlocks([]);
      }).finally(() => {
        setLoadingCanvas(false);
      });
    }
  }, [currentWorkspace?.scope]);

  // Execute parametric SQL queries across registered native components via Turso API (genuiteam.md §1, §4)
  useEffect(() => {
    if (!currentWorkspace?.scope || !canvasBlocks || canvasBlocks.length === 0) return;
    const scope = currentWorkspace.scope;
    const currentRole = currentWorkspace.role || 'staff';

    const runBlockQueries = async () => {
      const resultsMap: Record<string, any[]> = {};
      await Promise.all(
        canvasBlocks.map(async (b, idx) => {
          if (b.props && typeof b.props.query === 'string' && b.props.query.trim()) {
            try {
              let sql = b.props.query;
              sql = sql.replace(/:current_role/g, `'${currentRole}'`);
              sql = sql.replace(/:scope/g, `'${scope}'`);
              sql = sql.replace(/:subdomain/g, `'${currentWorkspace.subdomain}'`);
              
              const rows = await tar.db.query(sql, [], scope);
              const key = b.id || b.title || b.type || `blk_${idx}`;
              resultsMap[key] = rows || [];
            } catch (qErr) {
              console.warn('[workspaces.tsx] Error executing block query:', b.props.query, qErr);
            }
          }
        })
      );
      setQueryResults(resultsMap);
    };

    runBlockQueries();
  }, [canvasBlocks, currentWorkspace?.scope, currentWorkspace?.role]);

  const handleSelectWorkspace = async (item: Workspace) => {
    if (item.state === 'provisioning' || item.state === 'restoring') {
      setAgentFeedback({ text: `${item.name || item.subdomain} is still creating its private database.`, type: 'info' });
      return;
    }
    setShowDropdown(false);
    if (item.subdomain === currentWorkspace?.subdomain) return;
    
    setCanvasDoc(null);
    setCanvasBlocks([]);
    setCurrentWorkspace(item);
    await SecureStore.setItemAsync('active_workspace_subdomain', item.subdomain).catch(() => null);
    setAgentFeedback(null);
  };


  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || !currentWorkspace) return;

    if (!messageText) setInput('');

    setExecuting(true);
    setAgentFeedback(null);

    try {
      const cleanText = textToSend.trim().toLowerCase();
      const scope = currentWorkspace.scope;
      const name = currentWorkspace.name || currentWorkspace.subdomain;
      const subdomain = currentWorkspace.subdomain;
      const workspaceType = currentWorkspace.type || 'business';

      // 1. Resolve Intent via in-memory intent resolver
      const resolved = resolveIntent(textToSend, activeModules);
      if (resolved.match) {
        if (resolved.action === 'clear') {
          setExecuting(false);
          setAgentFeedback({ text: resolved.feedbackText || 'Cleared workspace state.', type: 'success' });
          return;
        } else if (resolved.action === 'show_module' && resolved.moduleName) {
          if (resolved.moduleName === 'site' || resolved.moduleName === 'storefront' || resolved.moduleName === 'website') {
            setShowSiteScreen(true);
            setExecuting(false);
            setAgentFeedback({ text: 'Opened workspace site manager.', type: 'success' });
            return;
          } else if (resolved.moduleName === 'workspace' || resolved.moduleName === 'new_workspace' || cleanText.includes('new workspace') || cleanText.includes('create workspace')) {
            setIsCreatingWorkspace(true);
            setExecuting(false);
            setAgentFeedback({ text: 'Opened AI workspace creator.', type: 'success' });
            return;
          } else if (resolved.moduleName === 'inventory') {
            await refreshProducts(scope);
          } else if (resolved.moduleName === 'orders') {
            await refreshOrders(scope);
          }
          setExecuting(false);
          setAgentFeedback({ text: resolved.feedbackText || `Updated ${resolved.moduleName}.`, type: 'success' });
          return;
        } else if (resolved.action === 'add_module' && resolved.moduleName) {
          await tar.canvas.add(scope, resolved.moduleName);
          const canvasRes = await tar.okf.read(scope, 'team/canvas.md').catch(() => null);
          if (canvasRes && canvasRes.content) {
            const { blocks } = parseCanvasMarkdown(canvasRes.content);
            setCanvasBlocks(blocks);
          }
          setExecuting(false);
          setAgentFeedback({ text: resolved.feedbackText || `Added ${resolved.moduleName} card to Canvas. Tap the Canvas button to view.`, type: 'success' });
          return;
        } else if (resolved.action === 'remove_module' && resolved.moduleName) {
          await tar.canvas.remove(scope, resolved.moduleName);
          const canvasRes = await tar.okf.read(scope, 'team/canvas.md').catch(() => null);
          if (canvasRes && canvasRes.content) {
            const { blocks } = parseCanvasMarkdown(canvasRes.content);
            setCanvasBlocks(blocks);
          }
          setExecuting(false);
          setAgentFeedback({ text: resolved.feedbackText || `Removed ${resolved.moduleName} card from Canvas.`, type: 'success' });
          return;
        } else if (resolved.action === 'compose_item' && resolved.itemData) {
          setItemInitialData(resolved.itemData);
          setShowItemModal(true);
          setExecuting(false);
          setAgentFeedback({ text: resolved.feedbackText || `Opening Item Compose...`, type: 'success' });
          return;
        }
      }

      if (/^(open|show|go\s+to\s+)?settings$/i.test(cleanText)) {
        router.push('/settings');
        setExecuting(false);
        return;
      }
      else if (/^(open\s+|show\s+|view\s+|get\s+)?(site|storefront|web|website)$/i.test(cleanText) || /^publish\s+(site|storefront|website)/i.test(cleanText)) {
        setShowSiteScreen(true);
        setAgentFeedback({ text: 'Opened workspace site manager.', type: 'success' });
      }
      else if (/^(make|edit|change|update|design|customize)\s+(site|storefront|web|website)(.+)/i.test(cleanText)) {
        const match = textToSend.match(/^(make|edit|change|update|design|customize)\s+(site|storefront|web|website)\s+(.+)/i);
        const instruction = match ? match[3] : textToSend;

        const currentProducts = await tar.tool('read', { table: 'matter', type: 'product', active: 1, scope }).then(r => r.rows || []).catch(() => []);
        const newLayout = await generateSiteLayout(name, currentProducts, instruction, draft);
        await saveDraft(newLayout);
        await refreshSite();

        setAgentFeedback({ text: 'Updated your website theme and draft layout! Click Publish to set it live.', type: 'success' });
      }
      else if (/^add\s+(.+?)\s+at\s+(\d+)/i.test(cleanText) || /^create\s+product\s+(.+?)\s+(\d+)/i.test(cleanText) || /^add\s+product\s+(.+?)\s+(\d+)/i.test(cleanText)) {
        const addMatch = textToSend.match(/^add\s+(.+?)\s+at\s+(\d+)/i) || 
                         textToSend.match(/^create\s+product\s+(.+?)\s+(\d+)/i) ||
                         textToSend.match(/^add\s+product\s+(.+?)\s+(\d+)/i);
        if (addMatch) {
          const title = addMatch[1].trim();
          const val = parseFloat(addMatch[2]);
          await tar.tool('create', {
            table: 'matter',
            scope,
            type: 'product',
            title,
            value: val,
            qty: 10,
            data: { category: 'General' }
          });
          await refreshProducts(scope);
          setAgentFeedback({ text: `Successfully added "${title}" at ₹${val} to your inventory.`, type: 'success' });
        }
      }
      else {
        const response = await tar.chat(sessionId, textToSend, scope);
        setAgentFeedback({ text: response.reply, type: 'info' });
        
        // Refresh states if the agent executed database modifications
        if (response.executorResult?.success || cleanText.includes('product') || cleanText.includes('item') || cleanText.includes('add') || cleanText.includes('create') || cleanText.includes('order')) {
          await refreshProducts(scope);
          await refreshOrders(scope);
          await refreshEntities(scope);
          await refreshSite();
        }
      }
    } catch (e: any) {
      setAgentFeedback({ text: e.message || 'Something went wrong while executing the command.', type: 'error' });
    } finally {
      setExecuting(false);
    }
  };

  const handlePublishFromCard = async () => {
    if (!currentWorkspace) return;
    setExecuting(true);
    setAgentFeedback(null);
    try {
      // Always pass subdomain and workspaceName explicitly so publishToWorker uses the correct URL and site title
      await publish(currentWorkspace.subdomain, currentWorkspace.name || currentWorkspace.subdomain);
      setAgentFeedback({ text: `Site published successfully! It is live at: https://${currentWorkspace.subdomain}.tarai.space`, type: 'success' });
    } catch (e: any) {
      setAgentFeedback({ text: e.message || 'Failed to publish site.', type: 'error' });
    } finally {
      setExecuting(false);
    }
  };

  const handleTriggerAction = (action: any, defaultParams?: Record<string, string>) => {
    if (action.name === 'action_open_site' || action.actionName === 'action_open_site') {
      setShowSiteScreen(true);
      return;
    }
    if (action.name === 'action_create_workspace' || action.actionName === 'action_create_workspace' || action.name === 'action_open_create_workspace') {
      setIsCreatingWorkspace(true);
      return;
    }
    if (action.params && action.params.length > 0) {
      const initialParams: Record<string, string> = {};
      action.params.forEach((p: any) => {
        const paramName = typeof p === 'string' ? p : p.name;
        const defaultVal = typeof p === 'object' ? p.default || '' : '';
        initialParams[paramName] = defaultParams?.[paramName] ?? defaultVal ?? '';
      });
      if (action.name === 'action_add_contact') {
        setInitialContactType('Customer');
        setEditContactEntity(null);
        setShowContactModal(true);
        return;
      }
      if (action.name === 'action_add_company') {
        setInitialContactType('Company');
        setEditContactEntity(null);
        setShowContactModal(true);
        return;
      }
      if (action.name === 'action_add_product') {
        setItemInitialData({ item_subtype: 'Product' });
        setShowItemModal(true);
        return;
      }

      setFormParams({ ...initialParams, ...(defaultParams || {}) });
      setSelectedAction(action);
      setActionResultMessage(null);
    } else {
      // Execute directly
      setExecuting(true);
      const actionName = action.name || action.actionId;
      console.log(`[Agent] Executing action "${actionName}" locally for scope: ${currentWorkspace?.scope}`);
      if (currentWorkspace?.scope) {
        Promise.all([
          refreshProducts(currentWorkspace.scope),
          refreshOrders(currentWorkspace.scope),
          refreshEntities(currentWorkspace.scope),
          refreshInboxTasks(currentWorkspace.scope),
        ]).catch(() => null);
      }
      setExecuting(false);
    }
  };

  const handleActionFormSubmit = async (submittedParams?: Record<string, string>) => {
    if (!selectedAction || !currentWorkspace) return;
    setSubmittingAction(true);
    setActionResultMessage(null);
    try {
      const activeParams = submittedParams || formParams;
      const cleanParams: Record<string, any> = {};
      selectedAction.params.forEach((p: any) => {
        const paramName = typeof p === 'string' ? p : p.name;
        const paramType = typeof p === 'string' ? 'text' : p.type;
        const val = activeParams[paramName] || '';
        if (paramType === 'number') {
          cleanParams[paramName] = parseFloat(val) || 0;
        } else {
          cleanParams[paramName] = val;
        }
      });
      if (activeParams.notes) {
        cleanParams.notes = activeParams.notes;
        cleanParams.description = activeParams.notes;
      }

      console.log(`[Workspace] ⚡ handleActionFormSubmit — action: "${selectedAction.name}", scope: "${currentWorkspace?.scope}", params:`, cleanParams);

      if (
        selectedAction.name === 'action_add_flow' ||
        selectedAction.actionName === 'action_add_flow'
      ) {
        const titleVal = cleanParams.name || cleanParams.title || 'New Flow';
        const rawContact = cleanParams.contact_id || cleanParams.customer_id || '';
        const matchedContact = (allEntities || []).find((e: any) => e.id === rawContact || e.title === rawContact || e.name === rawContact || e.data?.fn === rawContact);
        const contactId = matchedContact?.id || rawContact;
        const contactName = matchedContact?.title || matchedContact?.name || matchedContact?.data?.fn || rawContact;

        const stageVal = cleanParams.stage || 'New / Intake';
        const pipelineVal = cleanParams.pipeline || 'Sales & Client Deals';
        const valueNum = cleanParams.value || cleanParams.amount || 0;
        try {
          const flowRes = await tar.tool('create', {
            table: 'matter',
            type: 10,
            title: titleVal,
            value: valueNum,
            data: {
              ...cleanParams,
              name: titleVal,
              contact_id: contactId,
              customer_id: contactId,
              customer: contactName,
              stage: stageVal,
              pipeline: pipelineVal,
            },
            scope: currentWorkspace.scope,
          });

          if (flowRes?.id && contactId) {
            await tar.tool('create', {
              table: 'graph',
              src: flowRes.id,
              rel: 8,
              tgt: contactId,
              scope: currentWorkspace.scope,
            }).catch(() => null);
          }

          if (flowRes?.id) {
            await tar.tool('create', {
              table: 'motion',
              type: 120,
              ref: flowRes.id,
              data: {
                title: `Started flow: ${titleVal}`,
                stage: stageVal,
                pipeline: pipelineVal,
                flow_id: flowRes.id,
                date_str: new Date().toLocaleDateString(),
              },
              scope: currentWorkspace.scope,
            }).catch(() => null);
          }

          await refreshEntities(currentWorkspace.scope);
        } catch (errFlow) {
          console.warn('[Workspace] Flow creation error:', errFlow);
        }
      } else if (
        selectedAction.name === 'action_update_flow_stage' ||
        selectedAction.name === 'action_update_deal_stage'
      ) {
        try {
          const flowId = cleanParams.flow_id || cleanParams.deal_id;
          if (flowId && currentWorkspace?.scope) {
            const newStage = cleanParams.stage || 'In Progress';
            let motionType = 120;
            if (newStage.toLowerCase().includes('complete') || newStage.toLowerCase().includes('won')) {
              motionType = 121;
            } else if (newStage.toLowerCase().includes('drop') || newStage.toLowerCase().includes('cancel') || newStage.toLowerCase().includes('lost')) {
              motionType = 122;
            }

            await tar.tool('update', {
              table: 'matter',
              id: flowId,
              scope: currentWorkspace.scope,
              patch: {
                data: { stage: newStage },
              },
            });
            await tar.tool('create', {
              table: 'motion',
              type: motionType,
              ref: flowId,
              data: {
                title: `Advanced to ${newStage}`,
                stage: newStage,
                flow_id: flowId,
                date_str: new Date().toLocaleDateString(),
              },
              scope: currentWorkspace.scope,
            });
            await refreshEntities(currentWorkspace.scope);
          }
        } catch (eStage) {
          console.warn('[Workspace] Flow stage update error:', eStage);
        }
      } else if (selectedAction.name === 'action_add_contact' ||
        selectedAction.name === 'action_add_company' ||
        selectedAction.name === 'action_add_deal' ||
        selectedAction.name === 'action_add_product' ||
        selectedAction.name === 'create_entity'
      ) {
        const titleVal = cleanParams.title || cleanParams.name || cleanParams.to || 'New Entity';
        const typeVal = cleanParams.role || cleanParams.type || (
          selectedAction.name === 'action_add_company' ? 'company' :
          selectedAction.name === 'action_add_deal' ? 'deal' :
          selectedAction.name === 'action_add_product' ? 'product' : 'customer'
        );
        const payloadData = {
          ...cleanParams,
          item_subtype: cleanParams.item_subtype || (selectedAction.name === 'action_add_product' ? 'product' : undefined),
        };
        try {
          await tar.tool('create', {
            table: 'matter',
            type: typeVal,
            title: titleVal,
            value: cleanParams.value || cleanParams.price || 0,
            data: payloadData,
            scope: currentWorkspace.scope,
          });
          await refreshEntities(currentWorkspace.scope);

          // Auto-sync staff roles to team.md (genuiteam.md §3)
          if (currentWorkspace.scope && currentWorkspace.scope !== 'p') {
            const staffRole = (cleanParams.role || '').toLowerCase();
            if (staffRole && !['customer', 'client', 'vendor', 'lead', 'supplier'].includes(staffRole)) {
              tar.team.sync(currentWorkspace.scope, {
                name: titleVal,
                email: cleanParams.email,
                handle: cleanParams.handle || cleanParams.telegram,
                role: staffRole,
                status: 'active',
              }).catch((e: any) => console.warn('[team.sync] auto-sync staff warning:', e));
            }
          }
        } catch (errCreate) {
          console.warn('[Workspace] Fallback matter creation:', errCreate);
        }
      } else if (selectedAction.name === 'action_update_deal_stage') {
        try {
          if (cleanParams.deal_id && currentWorkspace?.scope) {
            await tar.tool('update', {
              table: 'matter',
              id: cleanParams.deal_id,
              scope: currentWorkspace.scope,
              patch: {
                data: { stage: cleanParams.stage, win_loss_reason: cleanParams.win_loss_reason },
              },
            });
            await tar.tool('create', {
              table: 'motion',
              type: 'stage',
              ref: cleanParams.deal_id,
              data: { stage: cleanParams.stage, win_loss_reason: cleanParams.win_loss_reason },
              scope: currentWorkspace.scope,
            });
            await refreshEntities(currentWorkspace.scope);
          }
        } catch (eStage) {
          console.warn('[Workspace] Update deal stage warning:', eStage);
        }
      } else if (selectedAction.name === 'action_log_activity') {
        try {
          const targetRef = cleanParams.deal_id || cleanParams.contact_id || cleanParams.customer_id;
          if (targetRef && currentWorkspace?.scope) {
            await tar.tool('create', {
              table: 'motion',
              type: 'activity',
              ref: targetRef,
              data: {
                activity_type: cleanParams.type || 'Call / Meeting',
                description: cleanParams.description || cleanParams.notes || '',
                deal_id: cleanParams.deal_id,
                contact_id: cleanParams.contact_id,
              },
              scope: currentWorkspace.scope,
            });
            await refreshEntities(currentWorkspace.scope);
          }
        } catch (eAct) {
          console.warn('[Workspace] Log activity error:', eAct);
        }
      } else if (selectedAction.name === 'action_record_sale') {
        const titleVal = 'New Order';
        try {
          await tar.tool('create', {
            table: 'matter',
            type: 'order',
            title: titleVal,
            value: cleanParams.total || 0,
            data: cleanParams,
            scope: currentWorkspace.scope,
          });
          await tar.tool('create', {
            table: 'inbox',
            type: 'order',
            title: titleVal,
            status: 'open',
            data: cleanParams,
            scope: currentWorkspace.scope,
          });
          if (cleanParams.items && currentWorkspace?.scope) {
            let itemList: any[] = [];
            try {
              itemList = typeof cleanParams.items === 'string' ? JSON.parse(cleanParams.items) : cleanParams.items;
            } catch (_) {}
            if (Array.isArray(itemList)) {
              for (const item of itemList) {
                if (item.productId || item.id) {
                  await updateStock(
                    currentWorkspace.scope,
                    item.productId || item.id,
                    -Math.abs(Number(item.qty || 1)),
                    'sale',
                    `Sold in Order (${cleanParams.customer_id || 'Retail'})`
                  ).catch((e) => console.warn('Sale stock update warn:', e));
                }
              }
            }
          }
        } catch (e) {
          console.warn('[Workspace] Direct sale creation fallback:', e);
        }
      } else if (selectedAction.name === 'action_adjust_stock') {
        if (cleanParams.product_id && currentWorkspace?.scope) {
          await updateStock(
            currentWorkspace.scope,
            cleanParams.product_id,
            Number(cleanParams.qty || 0),
            'adjust',
            cleanParams.reason || 'Manual Adjustment'
          ).catch((e) => console.warn('Stock adjust error:', e));
        }
      } else if (selectedAction.name === 'action_write_off') {
        if (cleanParams.product_id && currentWorkspace?.scope) {
          await updateStock(
            currentWorkspace.scope,
            cleanParams.product_id,
            -Math.abs(Number(cleanParams.qty || 0)),
            'write_off',
            cleanParams.reason || 'Write Off / Damaged'
          ).catch((e) => console.warn('Stock write off error:', e));
        }
      } else if (selectedAction.name === 'action_transfer_stock') {
        if (currentWorkspace?.scope) {
          const targetId = cleanParams.product_id || cleanParams.from_loc;
          const qtyVal = Math.abs(Number(cleanParams.qty || 0));
          const fromLoc = cleanParams.from_loc || 'Main Storage';
          const toLoc = cleanParams.to_loc || 'Front Counter';

          const isInternal = !toLoc.toLowerCase().startsWith('w:') && !toLoc.toLowerCase().includes('workspace');

          if (targetId) {
            await updateStock(
              currentWorkspace.scope,
              targetId,
              isInternal ? qtyVal : -qtyVal,
              'transfer',
              `Transferred ${qtyVal} pcs from ${fromLoc} to ${toLoc}`,
              {
                fromLoc,
                toLoc,
                isInternal,
              }
            ).catch((e) => console.warn('Transfer stock error:', e));
          }
        }
      } else if (selectedAction.name === 'action_receive_po') {
        if (cleanParams.product_id && currentWorkspace?.scope) {
          await updateStock(
            currentWorkspace.scope,
            cleanParams.product_id,
            Math.abs(Number(cleanParams.qty || 0)),
            'restock',
            `Received PO ${cleanParams.po_id ? ': ' + cleanParams.po_id : ''}`
          ).catch((e) => console.warn('Receive PO error:', e));
        }
      } else if (selectedAction.name === 'action_book_slot') {
        const titleVal = 'Appointment Booked';
        try {
          await tar.tool('create', {
            table: 'matter',
            type: 'booking',
            title: titleVal,
            data: cleanParams,
            scope: currentWorkspace.scope,
          });
          await tar.tool('create', {
            table: 'inbox',
            type: 'booking',
            title: titleVal,
            status: 'open',
            data: cleanParams,
            scope: currentWorkspace.scope,
          });
        } catch (e) {
          console.warn('[Workspace] Direct booking creation fallback:', e);
        }
      } else if (selectedAction.name === 'action_create_task') {
        const titleVal = cleanParams.title || 'New Task Assignment';
        try {
          await tar.tool('create', {
            table: 'inbox',
            type: 'task',
            title: titleVal,
            status: 'open',
            data: cleanParams,
            scope: currentWorkspace.scope,
          });
        } catch (e) {
          console.warn('[Workspace] Direct task creation fallback:', e);
        }
      }

      console.log(`[Workspace] ⚡ Action "${selectedAction.name}" submit completed deterministically — 0 LLM network calls.`);

      // Auto-complete resolved Inbox Task if triggered from Inbox row
      if (resolvingTaskId) {
        setInboxTasks((prev) => prev.filter((t) => t.id !== resolvingTaskId));
        markTaskDone(currentWorkspace.scope, resolvingTaskId).catch(() => null);
        setResolvingTaskId(null);
        setActionResultMessage(`Task completed & Event recorded: ${selectedAction.name.replace(/_/g, ' ')}`);
      } else {
        setActionResultMessage(`Successfully recorded event: ${selectedAction.name.replace(/_/g, ' ')}`);
      }

      // Fast parallel refresh without blocking UI close
      Promise.all([
        refreshProducts(currentWorkspace.scope),
        refreshOrders(currentWorkspace.scope),
        refreshEntities(currentWorkspace.scope),
        refreshInboxTasks(currentWorkspace.scope),
      ]).catch((e) => console.warn('[Workspace] Background parallel refresh note:', e));

      setTimeout(() => {
        setSelectedAction(null);
        setFormParams({});
        setActionResultMessage(null);
        if (itemInitialData) {
          setShowItemModal(true);
        }
      }, 350);
    } catch (err: any) {
      setActionResultMessage(`Error: ${err.message || 'Execution failed'}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const getFilteredActions = () => {
    return [
{
        label: '🎨 Canvas Studio / AI Customizer',
        subtitle: 'Configure tools, modules, and role layout with AI',
        icon: 'sparkles',
        openModal: 'canvas_customizer' as const,
      }
    ];
  };

  const handleGenUIAction = async (actionName: string, params: Record<string, any>) => {
    const scope = currentWorkspace?.scope;
    if (!scope) return { success: false };

    if (actionName === 'record_sale' || actionName === 'confirm_order' || actionName === 'confirm_action') {
      try {
        await tar.tool('insert', {
          table: 'motion',
          record: {
            type: 101,
            title: params.tableName ? `Sale - ${params.tableName}` : (params.payload?.title || 'Order Sale'),
            amount: params.total || params.payload?.totalAmount || 0,
            data: JSON.stringify(params),
          },
          scope,
        });
        refreshOrders(scope);
        setAgentFeedback({ text: 'Sale recorded successfully', type: 'success' });
        return { success: true };
      } catch (e) {
        console.warn('[GenUI] record_sale error:', e);
      }
    }

    if (actionName === 'adjust_stock') {
      try {
        if (params.itemId && typeof params.delta === 'number') {
          await updateStock(scope, params.itemId, params.delta, 'adjust_stock', 'GenUI adjustment');
        }
        refreshProducts(scope);
        return { success: true };
      } catch (e) {
        console.warn('[GenUI] adjust_stock error:', e);
      }
    }

    if (actionName === 'create_item') {
      setItemInitialData({ item_subtype: params.type || 'product' });
      setShowItemModal(true);
      return { success: true };
    }

    if (actionName === 'create_contact') {
      setShowContactModal(true);
      return { success: true };
    }

    if (actionName === 'view_entity' || actionName === 'select_row') {
      if (params.row || params.entity) {
        setSelectedEntityDetails(params.row || params.entity);
      }
      return { success: true };
    }

    if (actionName === 'open_site') {
      setShowSiteScreen(true);
      return { success: true };
    }

    if (actionName === 'create_workspace') {
      setIsCreatingWorkspace(true);
      return { success: true };
    }

    return { success: true };
  };

  const liveCanvasDoc = useMemo<CanvasDocument | undefined>(() => {
    if (!canvasDoc && !currentWorkspace) return undefined;

    // 1. Compute today's sales from orders / motion table
    const todaySales = (orders || []).reduce((acc: number, o: any) => acc + (Number(o.total || o.amount || o.value) || 0), 0);

    // 2. Low stock products for stock sheet
    const lowStockItems = (products || [])
      .filter((p: any) => (Number(p.stock ?? p.value ?? 10)) <= 8)
      .map((p: any) => ({
        id: p.id,
        name: p.title || p.name || 'Product',
        unit: p.unit || 'units',
        stock: Number(p.stock ?? p.value ?? 0),
        threshold: p.threshold || 5,
        reorderPrice: (Number(p.price) || 5) * 5,
        category: p.category || 'Stock',
      }));

    // 3. Contacts for contact card — robust extraction from root and nested .data fields
    const liveContacts = (allEntities || [])
      .filter((e: any) => {
        if (!e) return false;
        let d = e.data;
        if (typeof d === 'string') {
          try { d = JSON.parse(d); } catch (_) {}
        }
        const typeStr = String(e.type || e.role || d?.role || '').toLowerCase();
        return (
          e.type === 1 ||
          typeStr === 'person' ||
          typeStr === 'customer' ||
          typeStr === 'supplier' ||
          typeStr === 'contact' ||
          typeStr === 'vendor' ||
          typeStr === 'lead' ||
          e.role ||
          d?.role ||
          d?.phone ||
          d?.ph ||
          e.phone ||
          e.isPersonalContact
        );
      })
      .map((e: any) => {
        let d = e.data;
        if (typeof d === 'string') {
          try { d = JSON.parse(d); } catch (_) {}
        }
        const name = e.title || e.name || d?.name || d?.fn || 'Contact';
        const phone = d?.phone || d?.ph || e.phone || '';
        const whatsapp = d?.whatsapp || d?.phone || d?.ph || e.whatsapp || e.phone || '';
        const company = d?.company || d?.org || e.company || '';
        const role = d?.role || e.role || (e.isPersonalContact ? 'Personal Contact' : 'Contact');
        const balance = d?.balance !== undefined ? `$${d.balance}` : e.balance;
        return {
          id: e.id,
          name,
          phone,
          whatsapp,
          company,
          role,
          balance,
        };
      });

    // 4. Enrich blocks with live database values and parametric SQL queries (genuiteam.md §1, §4)
    const enrichBlock = (b: CanvasBlock, index: number): CanvasBlock => {
      const type = b.type;
      const key = b.id || b.title || b.type || `blk_${index}`;
      const queryRows = queryResults[key];

      // If parametric query results exist, bind data directly
      if (queryRows && Array.isArray(queryRows) && queryRows.length > 0) {
        if (type === 'metric-card' || type === 'stat-counter') {
          const firstRow = queryRows[0];
          const rawVal = firstRow.value !== undefined ? firstRow.value : firstRow.total !== undefined ? firstRow.total : firstRow.amount !== undefined ? firstRow.amount : (firstRow.count ?? 0);
          const formattedVal = b.props?.valueFormat === 'currency'
            ? `$${Number(rawVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : String(rawVal);
          return {
            ...b,
            props: {
              ...b.props,
              value: formattedVal,
              unit: firstRow.count !== undefined ? `${firstRow.count} records` : b.props?.unit,
              data: queryRows,
            },
          };
        }
        if (type === 'data-grid' || type === 'data-table') {
          return {
            ...b,
            props: {
              ...b.props,
              data: queryRows,
              columns: b.props?.columns || Object.keys(queryRows[0] || {}).slice(0, 5),
            },
          };
        }
        if (type === 'stock-sheet') {
          const mappedItems = queryRows.map((r: any) => ({
            id: r.id,
            name: r.title || r.name || 'Item',
            stock: Number(r.qty ?? r.stock ?? 0),
            threshold: Number(r.min_qty ?? r.threshold ?? 5),
            price: Number(r.price || 0),
          }));
          return {
            ...b,
            props: {
              ...b.props,
              items: mappedItems,
            },
          };
        }
        if (type === 'task-inbox') {
          const mappedTasks = queryRows.map((r: any) => ({
            id: r.id,
            title: r.title || r.name || 'Task',
            status: r.status || 'pending',
            data: r.data,
          }));
          return {
            ...b,
            props: {
              ...b.props,
              tasks: mappedTasks,
            },
          };
        }
        if (type === 'contact-card') {
          return {
            ...b,
            props: {
              ...b.props,
              contacts: queryRows,
              contact: queryRows[0],
            },
          };
        }
        if (type === 'pipeline-card') {
          return {
            ...b,
            props: {
              ...b.props,
              deals: queryRows,
            },
          };
        }
        if (type === 'action-confirm') {
          return {
            ...b,
            props: {
              ...b.props,
              payload: queryRows[0],
            },
          };
        }
      }

      // Default state enrichment fallbacks
      if (type === 'task-inbox') {
        return { ...b, props: { ...b.props, tasks: inboxTasks } };
      }
      if (type === 'metric-card' || type === 'stat-counter') {
        return {
          ...b,
          props: {
            ...b.props,
            title: b.props?.title || (workspaceName ? `${workspaceName} Sales` : "Today's Sales"),
            value: todaySales > 0 ? `$${todaySales.toLocaleString()}` : (b.props?.value || "$0.00"),
            unit: b.props?.unit || `${orders?.length || 0} Total Orders`,
          },
        };
      }
      if (type === 'stock-sheet') {
        return {
          ...b,
          props: {
            ...b.props,
            items: lowStockItems.length > 0 ? lowStockItems : b.props?.items,
          },
        };
      }
      if (type === 'contact-card') {
        return {
          ...b,
          props: {
            ...b.props,
            contact: liveContacts.length > 0 ? liveContacts[0] : (b.props?.contact || null),
            contacts: liveContacts,
          },
        };
      }
      if (type === 'data-grid' || type === 'data-table') {
        return {
          ...b,
          props: {
            ...b.props,
            data: b.props?.type === 'order' ? orders : products,
          },
        };
      }
      return b;
    };

    const rawDoc: CanvasDocument = canvasDoc || {
      title: workspaceName || 'Workspace',
      blocks: canvasBlocks,
      lifeModes: [],
    };

    // Role-Based Canvas Resolution & Filtering (genuiteam.md §7)
    const userRole = (currentWorkspace?.role || 'staff').toLowerCase();
    const isOwner = userRole === 'owner' || userRole === 'admin';

    const roleFilteredBlocks = (rawDoc.blocks || []).filter((b: CanvasBlock) => {
      if (isOwner) return true; // Owner superview
      if (!b.roles || b.roles.length === 0) return true; // Public block
      return b.roles.map(r => r.toLowerCase()).includes(userRole);
    });

    const enrichedBlocks = roleFilteredBlocks.map(enrichBlock);

    const isPersonal = currentWorkspace?.scope === 'p' || currentWorkspace?.subdomain === 'personal' || !currentWorkspace || (currentWorkspace?.name || '').toLowerCase().includes('personal');

    const defaultPersonalBlocks: CanvasBlock[] = [];
    if (inboxTasks.length > 0) {
      defaultPersonalBlocks.push({
        title: 'Personal Inbox',
        type: 'task-inbox',
        props: {
          title: 'Personal Inbox',
          tasks: inboxTasks,
        },
      });
    }
    if (liveContacts.length > 0) {
      defaultPersonalBlocks.push({
        title: 'Personal Contacts',
        type: 'contact-card',
        props: {
          contact: liveContacts[0] || null,
          contacts: liveContacts,
        },
      });
    }

    const hasCustomCanvasDoc = Boolean(canvasDoc && canvasDoc.blocks && canvasDoc.blocks.length > 0);
    const activeBlocks = isPersonal
      ? (hasCustomCanvasDoc ? enrichedBlocks : defaultPersonalBlocks)
      : (hasCustomCanvasDoc ? enrichedBlocks : []);

    const activeChips = (canvasDoc?.chips && canvasDoc.chips.length > 0)
      ? canvasDoc.chips
      : [];

    return {
      title: rawDoc.title || workspaceName || 'Workspace',
      blocks: activeBlocks,
      lifeModes: canvasDoc?.lifeModes || [],
      chips: activeChips,
    };
  }, [canvasDoc, currentWorkspace, orders, products, inboxTasks, allEntities, workspaceName, canvasBlocks, queryResults]);

  if (loadingWorkspaces) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <TarLogoLoader size={44} color={theme.primary} />
      </View>
    );
  }

  // Determine if workspace creation modal should be visible
  const showCreateModal = isCreatingWorkspace;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GenUIScreen
        canvasDoc={liveCanvasDoc}
        onExecuteAction={handleGenUIAction}
        theme={theme}
        designTokens={designTokens}
        infoBarText={
          currentWorkspace?.name
            ? `★ ${currentWorkspace.name} · ${currentWorkspace.role === 'owner' ? 'Owner Mode' : currentWorkspace.scope === 'p' ? 'Personal Mode' : 'Staff Mode'} · Tap to switch`
            : '★ Partner Offer: 0% POS processing fees today · Tap for details'
        }
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
        onCreateWorkspace={() => setIsCreatingWorkspace(true)}
        onOpenSwitcher={() => setShowDropdown(true)}
        onOpenCanvasCustomizer={() => setShowCanvasCustomizer(true)}
      />



      {/* Workspace Switcher Selector Modal (Full Screen Top-Down Sheet) */}
      <Modal
        visible={showDropdown}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowDropdown(false)}
      >
        <View style={[styles.switcherContainer, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 16 : 12) + 8, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          {/* Header */}
          <View style={styles.switcherHeader}>
            <Text style={styles.switcherTitle}>Workspaces</Text>

            <View style={styles.switcherHeaderRight}>
              <TouchableOpacity
                onPress={() => setShowDropdown(false)}
                style={styles.switcherCloseBtn}
                hitSlop={8}
              >
                <Ionicons name="chevron-up" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
          </View>

          {/* List of Workspaces (Clean, Uncluttered, Divided by Light Lines) */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.switcherScroll}
            contentContainerStyle={styles.switcherScrollContent}
          >
            {workspaces.map((w, idx) => {
              const isActive = w.subdomain === currentWorkspace?.subdomain;
              const name = w.name || w.subdomain;
              const isPersonal = w.scope === 'p' || w.subdomain === 'personal' || (w.name || '').toLowerCase().includes('personal');
              const roleLabel = isPersonal
                ? 'Personal'
                : w.state === 'provisioning'
                  ? 'Creating private database…'
                  : w.state === 'restoring'
                    ? 'Restoring private database…'
                    : w.state === 'error'
                      ? 'Database setup failed'
                      : w.role === 'owner' ? 'Owner' : 'Collaborator';
              const isLast = idx === workspaces.length - 1;

              return (
                <View key={w.scope}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      handleSelectWorkspace(w);
                      setShowDropdown(false);
                    }}
                    style={[
                      styles.switcherItem,
                      isActive && styles.switcherItemActive,
                    ]}
                  >
                    <View style={styles.switcherItemLeft}>
                      <Text
                        style={[
                          styles.switcherItemName,
                          isActive && styles.switcherItemNameActive,
                        ]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                      <Text style={styles.switcherItemSub}>
                        {roleLabel}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {!isLast && <View style={styles.switcherDivider} />}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.switcherAccountSection}>
            <TouchableOpacity
              onPress={() => {
                setShowDropdown(false);
                setShowPlanCanvas(true);
              }}
              style={styles.creditBalanceRow}
              accessibilityLabel="Open credits and billing"
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.switcherAccountTitle}>Credits & Agents</Text>
                <Text style={styles.creditBalanceLabel}>
                  {creditBalance === null ? '—' : creditBalance.toLocaleString('en-IN')} available
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color="#64748b" />
            </TouchableOpacity>
            <View style={styles.switcherQuickActions}>
              <TouchableOpacity onPress={() => { setShowDropdown(false); setIsCreatingWorkspace(true); }} style={styles.switcherQuickAction}>
                <Text style={styles.switcherQuickActionText}>Create workspace</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowDropdown(false); setShowCanvasCustomizer(true); }} style={styles.switcherQuickAction}>
                <Text style={styles.switcherQuickActionText}>Edit canvas</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowDropdown(false); setShowSiteScreen(true); }} style={styles.switcherQuickAction}>
                <Text style={styles.switcherQuickActionText}>Edit storefront</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </Modal>

      {/* Agentic Full Screen AI Workspace Creation Experience */}
      <CreateWorkspace
        visible={showCreateModal}
        canClose={workspaces.length > 0}
        existingSubdomains={workspaces.map((w) => w.subdomain)}
        onClose={closeCreateModal}
        onOpenCredits={() => {
          closeCreateModal();
          setShowPlanCanvas(true);
        }}
        onSuccess={async (slug) => {
          closeCreateModal();
           const refreshed = await fetchWorkspacesList();
           const found = refreshed.find((w) => w.subdomain === slug);
          if (found) {
            setCurrentWorkspace(found);
          }
        }}
      />

      {/* Full-Screen Gmail Mobile App Style Event Compose Modal */}
      <EventComposeModal
        visible={selectedAction !== null}
        action={selectedAction}
        formParams={formParams}
        theme={theme}
        submitting={submittingAction}
        resultMessage={actionResultMessage}
        allEntities={allEntities}
        onClose={() => {
          setSelectedAction(null);
          setFormParams({});
          setActionResultMessage(null);
        }}
        onSubmit={(submittedParams) => {
          handleActionFormSubmit(submittedParams);
        }}
        onSelectEvent={(newAction) => {
          handleTriggerAction(newAction);
        }}
      />

      {/* Full-Screen Entity Details Modal */}
      <ContactDetailsModal
        visible={selectedEntityDetails !== null}
        entity={selectedEntityDetails}
        scope={currentWorkspace?.scope}
        theme={theme}
        allEntities={allEntities}
        onClose={() => {
          if (entityHistory.length > 0) {
            const prev = entityHistory[entityHistory.length - 1];
            setEntityHistory((h) => h.slice(0, -1));
            setSelectedEntityDetails(prev);
          } else {
            setSelectedEntityDetails(null);
          }
        }}
        onRefresh={async () => {
          if (currentWorkspace?.scope) {
            await refreshProducts(currentWorkspace.scope);
            await refreshOrders(currentWorkspace.scope);
            await refreshEntities(currentWorkspace.scope);
          }
        }}
        onLogEventForEntity={(ent, eventKind) => {
          setSelectedEntityDetails(null);
          const entityName = ent.title || ent.name || ent.id || '';
          const typeCode = typeof ent.type === 'number' ? ent.type : undefined;
          const rawType = typeof ent.type === 'string' ? ent.type : typeCode === 10 ? 'flow' : typeCode === 2 ? 'company' : typeCode === 1 ? 'customer' : '';
          const entityCategory = String(ent.category || rawType || '').toLowerCase();

          let targetAction: any = null;
          let initialParams: Record<string, string> = {};

          if (entityCategory.includes('flow') || entityCategory.includes('deal') || typeCode === 10) {
            if (eventKind === 'activity') {
              targetAction = PLAN5_EVENT_MOTIONS.find(m => m.actionName === 'action_log_activity') || {
                name: 'action_log_activity',
                purpose: 'Log Call, Meeting or Note',
                params: [
                  { name: 'type', type: 'text', required: true },
                  { name: 'description', type: 'text', required: true },
                  { name: 'contact_id', type: 'text', required: false },
                  { name: 'flow_id', type: 'text', required: false },
                ],
              };
              initialParams = { flow_id: ent.id, type: 'Call / Meeting', description: '' };
            } else {
              targetAction = {
                name: 'action_update_flow_stage',
                purpose: 'Advance Flow Stage',
                params: [
                  { name: 'flow_id', type: 'text', required: true },
                  { name: 'stage', type: 'text', required: true },
                ],
              };
              initialParams = { flow_id: ent.id, stage: ent.data?.stage || 'In Progress' };
            }
          } else if (entityCategory.includes('item') || entityCategory.includes('product') || (typeCode && typeCode >= 3 && typeCode <= 7)) {
            targetAction = PLAN5_EVENT_MOTIONS.find(m => m.actionName === 'action_adjust_stock');
            initialParams = { product_id: entityName, qty: '1', reason: 'Manual Adjustment' };
          } else if (entityCategory.includes('order') || entityCategory.includes('booking')) {
            targetAction = PLAN5_EVENT_MOTIONS.find(m => m.actionName === 'action_record_sale');
            initialParams = { customer_id: entityName, total: '0' };
          } else {
            // Customer / Person / Contact / Company -> Open Add Flow for this contact
            targetAction = PLAN5_EVENT_MOTIONS.find(m => m.actionName === 'action_add_flow') || {
              name: 'action_add_flow',
              purpose: 'Add contact to a workflow',
              params: [
                { name: 'contact_id', type: 'text', required: true, default: ent.id },
                { name: 'pipeline', type: 'text', required: true, default: 'Sales & Client Deals' },
                { name: 'name', type: 'text', required: true, default: '' },
                { name: 'stage', type: 'text', required: false, default: 'New / Intake' },
                { name: 'value', type: 'number', required: false, default: '' },
              ],
            };
            initialParams = { contact_id: ent.id, pipeline: 'Sales & Client Deals', name: '', stage: 'New / Intake', value: '' };
          }

          if (targetAction) {
            handleTriggerAction(
              {
                name: targetAction.name || targetAction.actionName,
                purpose: targetAction.purpose || targetAction.whatHappened,
                params: targetAction.params,
              },
              initialParams
            );
          }
        }}
        onEditEntity={(entity) => {
          setEditContactEntity(entity);
          setShowContactModal(true);
        }}
        onSelectDeal={(deal) => {
          setEntityHistory((prev) => [...prev, selectedEntityDetails]);
          setSelectedEntityDetails(deal);
        }}
      />

      {/* Standalone Dedicated Item Compose Modal (Product, Listing, Service, Document, Asset) */}
      <ItemComposeModal
        visible={showItemModal}
        theme={theme}
        submitting={submittingItem}
        resultMessage={itemResultMessage}
        initialData={itemInitialData}
        scope={currentWorkspace?.scope}
        onClose={() => {
          setShowItemModal(false);
          setItemResultMessage(null);
          setItemInitialData(null);
        }}
        onDelete={async (id) => {
          if (!currentWorkspace?.scope || !id) return;
          try {
            await tar.tool('delete', { table: 'matter', id, scope: currentWorkspace.scope }).catch(() => null);
            await tar.tool('update', { table: 'matter', id, scope: currentWorkspace.scope, patch: { status: 'deleted' } }).catch(() => null);
            setShowItemModal(false);
            setItemInitialData(null);
            await refreshProducts(currentWorkspace.scope);
            await refreshEntities(currentWorkspace.scope);
          } catch (err) {
            console.warn('[Workspace] Delete item error:', err);
          }
        }}
        onLogEventForEntity={(actionName, initialParams) => {
          setShowItemModal(false);
          const targetAction = PLAN5_EVENT_MOTIONS.find(m => m.actionName === actionName);
          if (targetAction) {
            handleTriggerAction({
              name: targetAction.actionName,
              purpose: targetAction.whatHappened,
              params: targetAction.params,
            });
            setFormParams(initialParams);
          }
        }}
        onSave={async (itemData) => {
          if (!currentWorkspace?.scope) return;
          setSubmittingItem(true);
          try {
            const itemType = (itemData.item_subtype || 'Product').toLowerCase();

            const primitiveData = {
              price: itemData.price || 0,
              category: itemData.category || '',
              sku: itemData.sku || '',
              min: itemData.min || 0,
              unit: itemData.unit || 'pcs',
              image_url: itemData.image_url || '',
              refUrl: itemData.refUrl || '',
              description: itemData.description || '',
              notes: itemData.notes || '',
              committed: itemData.committed || 0,
            };

            if (itemData.id) {
              await tar.tool('update', {
                table: 'matter',
                id: itemData.id,
                scope: currentWorkspace.scope,
                type: itemType,
                patch: {
                  title: itemData.title,
                  data: primitiveData,
                },
              });
            } else {
              await tar.tool('create', {
                table: 'matter',
                type: itemType,
                title: itemData.title,
                value: itemData.stock || 0,
                data: primitiveData,
                scope: currentWorkspace.scope,
              });

              // Low Stock Inbox Trigger: If stock <= min threshold
              if (itemData.min > 0 && (itemData.stock || 0) <= itemData.min) {
                await tar.tool('create', {
                  table: 'inbox',
                  type: 'stock',
                  title: `Low stock: ${itemData.title} (${itemData.stock || 0} ${itemData.unit || 'pcs'} left)`,
                  status: 'open',
                  scope: currentWorkspace.scope,
                  due: Math.floor(Date.now() / 1000),
                }).catch((e: any) => console.warn('[Workspace] Low stock inbox trigger note:', e));
              }
            }

            await refreshProducts(currentWorkspace.scope);
            await refreshEntities(currentWorkspace.scope);
            setItemResultMessage(itemData.id ? 'Item updated successfully!' : 'Item saved successfully!');
            setTimeout(() => {
              setShowItemModal(false);
              setSubmittingItem(false);
              setItemResultMessage(null);
              setItemInitialData(null);
            }, 1000);
          } catch (errItem) {
            console.error('[Workspace] Item save failed:', errItem);
            setItemResultMessage('Failed to save item.');
            setSubmittingItem(false);
          }
        }}
      />

      {/* Standalone Dedicated Contact Create Modal (People & Companies) */}
      <ContactCreateModal
        visible={showContactModal}
        theme={theme}
        submitting={submittingContact}
        resultMessage={contactResultMessage}
        initialType={initialContactType}
        allEntities={allEntities}
        editEntity={editContactEntity}
        onClose={() => {
          Keyboard.dismiss();
          setShowContactModal(false);
          setContactResultMessage(null);
          setEditContactEntity(null);
        }}
        onSave={async (contactData: { name: string; role: string; email: string; phone: string; org: string; notes?: string }) => {
          if (!currentWorkspace?.scope) return;
          Keyboard.dismiss();
          setShowContactModal(false);
          setContactResultMessage(null);
          setEditContactEntity(null);
          try {
            let matterType = 'customer';
            if (['Company', 'Vendor', 'Partner'].includes(contactData.role)) {
              matterType = 'company';
            }
            await tar.tool('create', {
              table: 'matter',
              type: matterType,
              title: contactData.name,
              data: contactData,
              scope: currentWorkspace.scope,
            });
            await refreshEntities(currentWorkspace.scope);
          } catch (errContact) {
            console.error('[Workspace] Contact creation failed:', errContact);
          }
        }}
        onUpdate={async (contactData: { name: string; role: string; email: string; phone: string; org: string; notes?: string }) => {
          if (!currentWorkspace?.scope || !editContactEntity?.id) return;
          Keyboard.dismiss();
          setSelectedEntityDetails(null);
          setShowContactModal(false);
          setContactResultMessage(null);
          setEditContactEntity(null);
          try {
            let matterType = 'customer';
            if (['Company', 'Vendor', 'Partner'].includes(contactData.role)) {
              matterType = 'company';
            }
            await tar.tool('update', {
              table: 'matter',
              id: editContactEntity.id,
              scope: currentWorkspace.scope,
              patch: {
                title: contactData.name,
                type: matterType,
                data: contactData,
              },
            });
            await refreshEntities(currentWorkspace.scope);
          } catch (errContact) {
            console.error('[Workspace] Contact update failed:', errContact);
          }
        }}
      />

      {/* Dedicated Contact Mention Modal */}
      <ContactMentionModal
        visible={showMentionModal}
        entities={allEntities}
        theme={theme}
        onSelectContact={handleSelectMentionContact}
        onOpenContactDetails={handleOpenEntityOrItemDetails}
        onClose={() => setShowMentionModal(false)}
        onAddNewContact={() => {
          setShowMentionModal(false);
          setInitialContactType('Customer');
          setEditContactEntity(null);
          setShowContactModal(true);
        }}
      />
      <SiteScreen
        visible={showSiteScreen}
        onClose={() => setShowSiteScreen(false)}
        workspaceName={currentWorkspace?.name || currentWorkspace?.subdomain || ''}
        subdomain={currentWorkspace?.subdomain || ''}
        scope={activeScope || ''}
        products={products}
      />

      {/* Credits & Agents Plan Canvas */}
      <EphemeralPlanCanvas
        visible={showPlanCanvas}
        onClose={() => setShowPlanCanvas(false)}
        workspaces={workspaces}
        workspaceName={currentWorkspace?.name || currentWorkspace?.subdomain || 'Workspace'}
        subdomain={currentWorkspace?.subdomain}
        scope={activeScope || ''}
        onOpenCanvasCustomizer={() => {
          setShowPlanCanvas(false);
          setShowCanvasCustomizer(true);
        }}
      />

      {/* Overlay Panels — Bottom Bar triggers */}
      <ExploreOverlay
        visible={showExploreOverlay}
        onClose={() => setShowExploreOverlay(false)}
        theme={theme}
      />

      <CanvasOverlay
        visible={showCanvasOverlay}
        onClose={() => setShowCanvasOverlay(false)}
        theme={theme}
        scope={currentWorkspace?.scope}
        subdomain={currentWorkspace?.subdomain}
        workspaceName={currentWorkspace?.name || currentWorkspace?.subdomain || 'Workspace'}
        onOpenAddProduct={() => {
          setShowCanvasOverlay(false);
          setItemInitialData({ item_subtype: 'Product' });
          setShowItemModal(true);
        }}
        onOpenAddContact={() => {
          setShowCanvasOverlay(false);
          setInitialContactType('Customer');
          setEditContactEntity(null);
          setShowContactModal(true);
        }}
      />

      <CanvasCustomizerModal
        visible={showCanvasCustomizer}
        onClose={() => setShowCanvasCustomizer(false)}
        scope={currentWorkspace?.scope || ''}
        workspaceName={currentWorkspace?.name || currentWorkspace?.subdomain || 'Workspace'}
        vertical={selectedVertical || currentWorkspace?.type || 'business'}
        activeBlocks={canvasBlocks}
        onUpdated={async () => {
          if (currentWorkspace?.scope) {
            const canvasRes = await tar.okf.read(currentWorkspace.scope, 'team/canvas.md').catch(() => null);
            if (canvasRes?.content) {
              const { blocks } = parseCanvasMarkdown(canvasRes.content);
              setCanvasBlocks(blocks);
            }
          }
        }}
      />
    </View>
  );
}


function parseIndexMarkdown(md?: string | null) {
  let name = '';
  let type = 'business';
  let modules: string[] = [];

  if (!md || typeof md !== 'string') {
    return { name, type, modules };
  }

  const nameMatch = md.match(/^#\s*(.+)$/m);
  if (nameMatch && nameMatch[1]) {
    name = nameMatch[1].trim();
  }

  const typeMatch = md.match(/\*\*Type:\*\*\s*(.+)/i);
  if (typeMatch && typeMatch[1]) {
    type = typeMatch[1].trim().toLowerCase();
  }

  const modulesMatch = md.match(/\*\*Modules:\*\*\s*(.+)/i);
  if (modulesMatch && modulesMatch[1]) {
    modules = modulesMatch[1]
      .split(',')
      .map(m => m.trim().toLowerCase())
      .filter(m => m.length > 0);
  }

  return { name, type, modules };
}

function buildGitHubSentence(
  action: any,
  formParams: Record<string, string>,
  theme: any,
  activeChipField: string | null,
  onChange: (field: string, val: string) => void,
  setActive: (field: string | null) => void,
  inputRef: React.RefObject<TextInput | null>
): React.ReactNode {
  if (!action?.params || action.params.length === 0) {
    return <Text style={{ color: theme.text, fontSize: 16 }}>{action?.name?.replace(/_/g, ' ') || 'action'}</Text>;
  }

  const parts: React.ReactNode[] = [];
  const actionName = action.name?.replace(/_/g, ' ') || 'action';

  parts.push(<Text key="action" style={{ color: theme.text, fontSize: 18, lineHeight: 34 }}>{actionName}</Text>);

  const connectors = [' with ', ' for ', ' using ', ' to '];

  action.params.forEach((p: any, idx: number) => {
    const paramName = typeof p === 'string' ? p : p.name;
    const hasValue = formParams[paramName]?.trim();
    const displayName = paramName.replace(/_/g, ' ');
    const isActive = activeChipField === paramName;
    const connector = connectors[idx % connectors.length];

    parts.push(<Text key={`conn-${idx}`} style={{ color: theme.text, fontSize: 18, lineHeight: 34 }}>{connector}</Text>);

    if (isActive) {
      parts.push(
        <TextInput
          key={`chip-${paramName}`}
          ref={inputRef}
          style={{
            color: theme.text,
            backgroundColor: theme.primary + '25',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 10,
            fontSize: 17,
            fontWeight: '600',
            minWidth: 80,
            marginVertical: 4,
            borderBottomWidth: 2,
            borderBottomColor: theme.primary,
          }}
          value={formParams[paramName]}
          onChangeText={val => onChange(paramName, val)}
          placeholder={displayName}
          placeholderTextColor={theme.textMuted + '80'}
          autoFocus
          onBlur={() => setActive(null)}
          returnKeyType="next"
        />
      );
    } else {
      parts.push(
        <Text
          key={`chip-${paramName}`}
          onPress={() => {
            setActive(paramName);
          }}
          style={{
            color: hasValue ? '#fff' : theme.textMuted,
            backgroundColor: hasValue ? theme.primary : theme.backgroundElement,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 10,
            fontSize: 17,
            fontWeight: '600',
            marginVertical: 4,
            overflow: 'hidden',
          }}
        >
          {hasValue ? formParams[paramName] : displayName}
        </Text>
      );
    }
  });

  parts.push(<Text key="end" style={{ color: theme.text, fontSize: 18, lineHeight: 34 }}>.</Text>);

  return parts;
}

function cleanUserSays(phrase: string, actionId: string): string {
  let clean = phrase.split('/')[0].trim();
  
  const lowerClean = clean.toLowerCase();
  const lowerAction = actionId.toLowerCase();
  
  if (lowerAction.includes('booking') && (lowerClean === 'book' || lowerClean === 'reserve')) {
    return 'book a table';
  }
  if (lowerAction.includes('reschedule') && lowerClean === 'reschedule') {
    return 'reschedule booking';
  }
  if (lowerAction.includes('create') && lowerClean === 'add') {
    return 'add product';
  }
  if (lowerClean.endsWith('for')) {
    return clean + ' 4 people';
  }
  if (lowerClean.endsWith('at')) {
    return clean + ' 150';
  }
  
  return clean;
}

function parseModuleMarkdown(filename: string, content: string) {
  // Find title and clean it up (e.g. "Inventory module" -> "Inventory Skill")
  let categoryName = filename.charAt(0).toUpperCase() + filename.slice(1) + ' Skill';
  const h1Match = content.match(/^#\s*(.+)$/m);
  if (h1Match) {
    categoryName = h1Match[1].trim();
  }
  categoryName = categoryName.replace(/module/i, 'Skill');

  const lines = content.split('\n');
  const actionMap: Record<string, { name: string; desc: string; example: string }> = {};
  const intents: Record<string, string> = {};

  // First pass: scan for table rows to find actions and intents
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    
    const cols = trimmed.split('|').map(c => c.trim()).filter(c => c.length > 0);
    // Ignore markdown dividers like |---|---|
    if (cols.some(c => c.startsWith('---') || c.startsWith('- -'))) continue;
    
    let actionId = '';
    let otherText = '';
    let isIntentRow = false;

    // Check if this row is from an Intent matching table or action definition
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      const cleanCol = col.replace(/[`"']/g, '').trim();
      if (cleanCol.startsWith('action_')) {
        actionId = cleanCol;
        otherText = cols[i === 0 ? 1 : 0] || '';
        break;
      }
    }

    if (actionId) {
      const cleanOther = otherText.replace(/[`"']/g, '').trim();
      
      // Determine if this is an intent row (contains queries or is in intent section)
      if (content.toLowerCase().indexOf('intent') !== -1 && 
          content.toLowerCase().indexOf(otherText.toLowerCase()) > content.toLowerCase().indexOf('intent')) {
        isIntentRow = true;
      } else if (cleanOther.includes('sold') || cleanOther.includes('value') || cleanOther.includes('worth') || cleanOther.includes('sales') || cleanOther.includes('low') || cleanOther.includes('expiring')) {
        isIntentRow = true;
      }

      if (isIntentRow) {
        intents[actionId] = cleanUserSays(otherText, actionId);
      } else {
        // Table-based action definition (like in inventory or orders)
        const displayName = actionId
          .replace('action_report_', '')
          .replace('action_', '')
          .split('_')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        
        actionMap[actionId] = {
          name: displayName,
          desc: cleanOther,
          example: intents[actionId] || ''
        };
      }
    }
  }

  // Second pass: scan for Header-based actions (like ### action_...)
  const actionBlocks = content.split(/###\s+/);
  for (let i = 1; i < actionBlocks.length; i++) {
    const block = actionBlocks[i];
    const blockLines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (blockLines.length === 0) continue;
    
    const actionId = blockLines[0].replace(/[`"']/g, '').trim();
    if (!actionId.startsWith('action_')) continue;
    
    const desc = blockLines[1] || 'Execute ' + actionId;
    const displayName = actionId
      .replace('action_report_', '')
      .replace('action_', '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    actionMap[actionId] = {
      name: displayName,
      desc,
      example: intents[actionId] || ''
    };
  }

  // Third pass: if we have intents (like reports) but no action definitions yet, create them dynamically
  Object.entries(intents).forEach(([actionId, example]) => {
    if (!actionMap[actionId]) {
      const displayName = actionId
        .replace('action_report_', '')
        .replace('action_', '')
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
        
      actionMap[actionId] = {
        name: displayName,
        desc: `Run the ${displayName.toLowerCase()} report query.`,
        example: example
      };
    }
  });

  // Consolidate list of actions
  const items = Object.entries(actionMap).map(([actionId, act]) => {
    let example = act.example || intents[actionId];
    if (!example) {
      const base = actionId.replace('action_report_', '').replace('action_', '').replace(/_/g, ' ');
      example = base;
    }
    return {
      name: act.name,
      desc: act.desc,
      example: example
    };
  });

  // Fallback if no actions found
  if (items.length === 0) {
    items.push({
      name: `View ${categoryName}`,
      desc: `Displays active records for ${categoryName.toLowerCase()}.`,
      example: `show ${filename}`
    });
  }

  return {
    category: categoryName,
    items
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  switcherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  switcherText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    maxWidth: 160,
  },
  headerTextButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultsArea: {
    flex: 1,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputContainer: {
    width: '100%',
    paddingHorizontal: 0,
    paddingTop: 8,
    minHeight: 52,
  },
  hintsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  hintChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderRadius: 0,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 10,
    marginHorizontal: 0,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    maxHeight: 120,
    paddingVertical: 4,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dropdownContent: {
    width: '88%',
    maxWidth: 360,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    elevation: 0,
    shadowOpacity: 0,
  },
  drawerHandle: {
    width: 38,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 16,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  dropdownAddBtn: {
    padding: 4,
  },
  workspaceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  workspaceOptionName: {
    fontSize: 15,
  },
  workspaceOptionSubdomain: {
    fontSize: 12,
    marginTop: 2,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  modalCloseButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  toolsCategory: {
    marginTop: 16,
    marginBottom: 8,
  },
  toolsCategoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  toolCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  toolName: {
    fontSize: 14,
    fontWeight: '600',
  },
  toolDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  toolExampleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
  },
  toolExampleText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11,
    flex: 1,
    marginRight: 8,
  },
  toolTryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  toolTryBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  feedbackContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  submitBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  // ── Action Modal — GitHub notification style ────────────────────
  githubModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  githubModalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  githubHandleBarContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  githubHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  githubModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  githubModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: -0.3,
  },
  githubModalBody: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  githubSubmitRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  githubSubmitText: {
    fontSize: 15,
    fontWeight: '600',
  },
  githubResultBanner: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginHorizontal: 24,
    borderRadius: 10,
  },
  // ── Welcome Placeholder Card ─────────────────────────────────────
  welcomeCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  welcomeSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  atButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  // ── Full-Screen Top-Down Workspace Switcher ──────────────────────
  switcherContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  switcherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  switcherTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  switcherHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  switcherCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherScroll: {
    flex: 1,
  },
  switcherScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  switcherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  switcherItemActive: {
    backgroundColor: '#f8fafc', // Very light grey highlight
  },
  switcherItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  switcherItemName: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  switcherItemNameActive: {
    fontWeight: '700',
    color: '#0f172a',
  },
  switcherItemSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  switcherDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 14,
  },
  switcherAccountSection: {
    marginHorizontal: 16,
    marginBottom: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  switcherAccountTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  creditBalanceRow: {
    minHeight: 58,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creditBalanceLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  creditBalanceValue: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 1,
  },
  switcherQuickActions: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 4,
    paddingTop: 12,
  },
  switcherQuickAction: { paddingVertical: 4 },
  switcherQuickActionText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
});

