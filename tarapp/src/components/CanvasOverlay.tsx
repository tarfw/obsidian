import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';

import { tar } from '@/lib/tar';
import { parseCanvasMarkdown, parseYamlFrontmatter } from '@/lib/layout-engine';
import { parseDesignTokens } from '@/lib/design-tokens';
import { TarLogoLoader } from '@/components/TarLogoLoader';
import { getComponent, hasComponent } from '@/gen-ui/registry/ComponentRegistry';
import ContactDetailsModal from '@/components/ContactDetailsModal';
import CanvasCustomizerModal from '@/components/CanvasCustomizerModal';

function filterActiveRows(rows: any[]) {
  return (rows || []).filter((r: any) => {
    if (!r) return false;
    const statusStr = String(r.status || '').toLowerCase();
    const typeStr = String(r.type || '').toLowerCase();
    return statusStr !== 'deleted' && statusStr !== 'archived' && typeStr !== 'deleted' && !r.deleted_at;
  });
}

interface CanvasOverlayProps {
  visible: boolean;
  onClose: () => void;
  theme: any;
  scope?: string;
  subdomain?: string;
  workspaceName?: string;
  onOpenAddProduct?: () => void;
  onOpenAddContact?: () => void;
}

export default function CanvasOverlay({
  visible,
  onClose,
  theme,
  scope: propScope,
  subdomain: propSubdomain,
  workspaceName: propWorkspaceName,
  onOpenAddProduct,
  onOpenAddContact,
}: CanvasOverlayProps) {
  const insets = useSafeAreaInsets();

  const [scope, setScope] = useState<string | null>(propScope ?? null);
  const [subdomain, setSubdomain] = useState(propSubdomain ?? '');
  const [canvasTitle, setCanvasTitle] = useState('Workspace Canvas');
  const [blocks, setBlocks] = useState<any[]>([]);
  const [designTokens, setDesignTokens] = useState<any>(null);
  const [tableData, setTableData] = useState<Record<string, any[]>>({});
  const [metricsData, setMetricsData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [showCustomizer, setShowCustomizer] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (propScope) {
      setScope(propScope);
      setSubdomain(propSubdomain ?? '');
      return;
    }
    (async () => {
      const sub = await SecureStore.getItemAsync('active_workspace_subdomain').catch(() => null);
      const data = await tar.listWorkspaces().catch(() => ({ workspaces: [] }));
      const list = data.workspaces || [];
      const found = list.find((w: any) => w.subdomain === sub) || list[0];
      setScope(found?.scope ?? null);
      setSubdomain(found?.subdomain ?? '');
    })();
  }, [visible, propScope, propSubdomain]);

  const loadData = useCallback(async () => {
    if (!scope) return;
    try {
      const [canvasRes, designRes, matterRes, motionRes] = await Promise.all([
        tar.okf.read(scope, 'team/canvas.md').catch(() => null),
        tar.okf.read(scope, 'DESIGN.md').catch(() => null),
        tar.tool('read', { table: 'matter', scope }).catch(() => ({ rows: [] })),
        tar.tool('read', { table: 'motion', scope }).catch(() => ({ rows: [] })),
      ]);

      if (designRes?.content) {
        const { frontmatter } = parseYamlFrontmatter(designRes.content);
        setDesignTokens(parseDesignTokens(frontmatter));
      }

      const activeMatter = filterActiveRows(matterRes?.rows || []);
      const activeMotion = filterActiveRows(motionRes?.rows || []);

      // Group table data by type
      const groupedData: Record<string, any[]> = {
        matter: activeMatter,
        motion: activeMotion,
        all: activeMatter,
      };

      for (const row of activeMatter) {
        const tStr = String(row.type || '').toLowerCase();
        let cat = tStr;
        if (row.type === 1 || row.type === 'person' || row.type === 'customer') cat = 'crm';
        if (row.type === 2 || row.type === 'company' || row.type === 'vendor') cat = 'company';
        if (row.type === 3 || row.type === 'product' || row.type === 'item') cat = 'product';
        if (row.type === 4 || row.type === 'service') cat = 'service';
        if (row.type === 14 || row.type === 'order') cat = 'order';

        if (!groupedData[cat]) groupedData[cat] = [];
        groupedData[cat].push(row);

        if (!groupedData[tStr]) groupedData[tStr] = [];
        groupedData[tStr].push(row);
      }

      // Group motions by type
      for (const row of activeMotion) {
        const tStr = String(row.type || '').toLowerCase();
        let cat = tStr;
        if (row.type === 101 || row.type === 124) cat = 'order';
        if (row.type === 112) cat = 'booking';

        if (!groupedData[cat]) groupedData[cat] = [];
        groupedData[cat].push(row);
      }

      // Populate aliases
      groupedData['inventory'] = groupedData['product'] || [];
      groupedData['bookings'] = groupedData['booking'] || [];
      groupedData['orders'] = groupedData['order'] || [];
      groupedData['contacts'] = groupedData['crm'] || [];

      setTableData(groupedData);

      setMetricsData({
        'Products': groupedData['product']?.length || 0,
        'Active Orders': groupedData['order']?.length || 0,
        'Bookings': groupedData['booking']?.length || 0,
        'Clients / Team': groupedData['crm']?.length || 0,
      });

      // Parse blocks directly from OKF team/canvas.md
      if (canvasRes?.content) {
        const parsed = parseCanvasMarkdown(canvasRes.content);
        setCanvasTitle(parsed.title || 'Workspace Canvas');
        const activeBlocks = parsed.blocks && parsed.blocks.length > 0
          ? parsed.blocks
          : (parsed.lifeModes?.[0]?.blocks || []);
        setBlocks(activeBlocks);
      } else {
        // Fallback default blocks if canvas.md doesn't exist yet
        setBlocks([
          { title: 'Inventory List', type: 'data-grid', props: { type: 'product', mode: 'table' } },
          { title: 'Orders List', type: 'data-grid', props: { type: 'order', mode: 'table' } },
          { title: 'CRM List', type: 'data-grid', props: { type: 'crm', mode: 'table' } },
        ]);
      }
    } catch (err) {
      console.warn('[Canvas] Failed to load data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [scope]);

  useEffect(() => {
    if (visible && scope) {
      setLoading(true);
      loadData();
    }
  }, [visible, scope, loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const displayName = propWorkspaceName || (subdomain ? subdomain.charAt(0).toUpperCase() + subdomain.slice(1) : 'Workspace');

  const effectiveTokens = designTokens || {
    colors: { primary: theme.primary || '#0f172a', secondary: '#3b82f6', background: '#ffffff' },
    rounded: { sm: 8, md: 12, lg: 16 },
    spacing: { sm: 8, md: 16 },
    typography: {},
  };

  const handleExecuteAction = async (actionName: string, params: Record<string, any>) => {
    if (actionName === 'create_item' || actionName === 'add_product') {
      const itemType = params?.type;
      if (itemType === 'crm' || itemType === 'person' || itemType === 'contact' || itemType === 'customer') {
        if (onOpenAddContact) onOpenAddContact();
      } else {
        if (onOpenAddProduct) onOpenAddProduct();
      }
      return { success: true };
    }
    if (actionName === 'view_entity' && params?.entity) {
      setSelectedEntity(params.entity);
      return { success: true };
    }
    handleRefresh();
    return { success: true };
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: '#ffffff', paddingTop: Math.max(insets.top, 12) }]}>
        
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{displayName}</Text>
            <Text style={styles.headerSubtitle}>{canvasTitle}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowCustomizer(true)}
              hitSlop={8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: '#f5f3ff',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Ionicons name="sparkles" size={14} color="#7c3aed" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#7c3aed' }}>Customize</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRefresh} hitSlop={12} style={styles.iconBtn}>
              <Ionicons name="refresh-outline" size={20} color="#0f172a" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.iconBtn}>
              <Ionicons name="close" size={22} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <TarLogoLoader size={36} color={theme.primary || '#2563eb'} />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 32 },
            ]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.primary || '#2563eb']} />}
          >
            {blocks.map((block, index) => {
              if (!hasComponent(block.type)) return null;
              const entry = getComponent(block.type);
              if (!entry) return null;
              const Component = entry.component;
              return (
                <View key={`canvas_b_${index}`} style={{ marginVertical: 6 }}>
                  <Component
                    type={block.type}
                    props={block.props || {}}
                    designTokens={effectiveTokens}
                    onExecuteAction={handleExecuteAction}
                  />
                </View>
              );
            })}
          </ScrollView>
        )}

        <ContactDetailsModal
          visible={selectedEntity !== null}
          entity={selectedEntity}
          scope={scope ?? undefined}
          theme={theme}
          onClose={() => setSelectedEntity(null)}
          onRefresh={loadData}
        />

        <CanvasCustomizerModal
          visible={showCustomizer}
          onClose={() => setShowCustomizer(false)}
          scope={scope || ''}
          workspaceName={displayName}
          activeBlocks={blocks}
          onUpdated={() => {
            loadData();
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
});
