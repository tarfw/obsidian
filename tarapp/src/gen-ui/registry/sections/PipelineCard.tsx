import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SectionProps } from '../ComponentRegistry';

export interface PipelineDeal {
  id: string;
  title: string;
  contactName: string;
  company?: string;
  value: number;
  stageIndex: number;
  stages: string[];
}

export default function PipelineCard({ props, designTokens, data = [], onExecuteAction, onOpenScreen }: SectionProps) {
  const title = props?.title || 'Pipeline Deals';
  const rounded = designTokens?.rounded || {};

  const defaultStages = useMemo(() => ['Lead', 'Contacted', 'Proposal', 'Won'], []);

  const dealsProp = props?.deals;
  const baseDeals: PipelineDeal[] = useMemo(() => {
    const sourceDeals = Array.isArray(data) && data.length > 0
      ? data
      : (Array.isArray(dealsProp) ? dealsProp : []);

    return sourceDeals.map((d: any) => ({
      id: d.id || `deal_${Math.random()}`,
      title: d.title || d.name || d.data?.name || 'Client Flow',
      contactName: d.contactName || d.contact || d.data?.customer || 'Client',
      company: d.company || d.data?.company || '',
      value: typeof d.value === 'number' ? d.value : (Number(d.amount) || 0),
      stageIndex: typeof d.stageIndex === 'number' ? d.stageIndex : (d.stage === 'Won' ? 3 : d.stage === 'Proposal' ? 2 : d.stage === 'Contacted' ? 1 : 0),
      stages: Array.isArray(d.stages) ? d.stages : defaultStages,
    }));
  }, [data, dealsProp, defaultStages]);

  const [stageOverrides, setStageOverrides] = useState<Record<string, number>>({});
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const activeDeals = useMemo(() => {
    return baseDeals.map((d) => {
      const override = stageOverrides[d.id];
      return override !== undefined ? { ...d, stageIndex: override } : d;
    });
  }, [baseDeals, stageOverrides]);

  const handleAdvanceStage = async (deal: PipelineDeal) => {
    if (deal.stageIndex >= deal.stages.length - 1) return;
    const nextIndex = deal.stageIndex + 1;
    const nextStage = deal.stages[nextIndex];

    setAdvancingId(deal.id);
    setStageOverrides((prev) => ({ ...prev, [deal.id]: nextIndex }));

    try {
      if (onExecuteAction) {
        await onExecuteAction('flow.advance', {
          flowId: deal.id,
          stage: nextStage,
          stageIndex: nextIndex,
        });
      }
    } catch (e) {
      console.warn('[PipelineCard] Stage advance error:', e);
    } finally {
      setAdvancingId(null);
    }
  };

  if (activeDeals.length === 0) {
    return (
      <View style={[styles.cardContainer, { borderRadius: rounded.lg || 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity
            style={styles.newDealBtn}
            onPress={() => onOpenScreen ? onOpenScreen('deal-pipeline') : onExecuteAction?.('deal.create', {})}
          >
            <Ionicons name="add-outline" size={13} color="#ffffff" />
            <Text style={styles.newDealBtnText}>Start Flow</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="git-network-outline" size={24} color="#94a3b8" />
          <Text style={styles.emptyStateText}>No active pipeline flows · Tap Start Flow to begin</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.cardContainer, { borderRadius: rounded.lg || 16 }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.dealCount}>{activeDeals.length} active deals</Text>
        </View>
        <TouchableOpacity
          style={styles.newDealBtn}
          onPress={() => onOpenScreen ? onOpenScreen('deal-pipeline') : onExecuteAction?.('deal.create', {})}
        >
          <Ionicons name="add-outline" size={13} color="#ffffff" />
          <Text style={styles.newDealBtnText}>New Flow</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dealList}>
        {activeDeals.slice(0, 3).map((deal) => {
          const currentStage = deal.stages[deal.stageIndex] || 'Lead';
          const isWon = deal.stageIndex === deal.stages.length - 1;
          const isBusy = advancingId === deal.id;

          return (
            <View key={deal.id} style={styles.dealCard}>
              <View style={styles.dealHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dealTitle} numberOfLines={1}>{deal.title}</Text>
                  <Text style={styles.dealContact}>{deal.contactName}{deal.company ? ` · ${deal.company}` : ''}</Text>
                </View>
                {deal.value > 0 && (
                  <Text style={styles.dealValue}>₹{deal.value.toLocaleString()}</Text>
                )}
              </View>

              <View style={styles.stageRow}>
                <View style={styles.stageBadge}>
                  <Text style={styles.stageBadgeText}>{currentStage}</Text>
                </View>
                {!isWon && (
                  <TouchableOpacity
                    style={[styles.advanceBtn, isBusy && { opacity: 0.6 }]}
                    onPress={() => handleAdvanceStage(deal)}
                    disabled={isBusy}
                  >
                    <Text style={styles.advanceBtnText}>{isBusy ? '...' : `Advance → ${deal.stages[deal.stageIndex + 1] || 'Next'}`}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  dealCount: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  newDealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  newDealBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  dealList: {
    gap: 8,
  },
  dealCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
  },
  dealHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dealTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  dealContact: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  dealValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  stageBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stageBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  advanceBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  advanceBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
});
