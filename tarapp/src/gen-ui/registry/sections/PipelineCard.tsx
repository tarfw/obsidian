import React, { useState } from 'react';
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

export default function PipelineCard({ props, designTokens, data = [], onExecuteAction }: SectionProps) {
  const title = props?.title || 'Deal Pipeline';
  const rounded = designTokens?.rounded || {};

  const defaultStages = ['Lead', 'Contacted', 'Proposal', 'Won'];

  const sourceDeals = Array.isArray(data) && data.length > 0
    ? data
    : (Array.isArray(props?.deals) ? props.deals : []);

  const deals: PipelineDeal[] = sourceDeals.map((d: any) => ({
    id: d.id || 'deal-1',
    title: d.title || d.name || 'Sales Deal',
    contactName: d.contactName || d.contact || 'Client Contact',
    company: d.company || '',
    value: typeof d.value === 'number' ? d.value : (Number(d.amount) || 1000),
    stageIndex: typeof d.stageIndex === 'number' ? d.stageIndex : (d.stage === 'Won' ? 3 : d.stage === 'Proposal' ? 2 : d.stage === 'Contacted' ? 1 : 0),
    stages: Array.isArray(d.stages) ? d.stages : defaultStages,
  }));

  const [activeDeals, setActiveDeals] = useState<PipelineDeal[]>(deals);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  if (activeDeals.length === 0) {
    return null;
  }

  const handleAdvanceStage = async (deal: PipelineDeal) => {
    if (deal.stageIndex >= deal.stages.length - 1) return;
    const nextIndex = deal.stageIndex + 1;
    const nextStage = deal.stages[nextIndex];

    setAdvancingId(deal.id);
    setActiveDeals((prev) =>
      prev.map((d) => (d.id === deal.id ? { ...d, stageIndex: nextIndex } : d))
    );

    try {
      if (onExecuteAction) {
        await onExecuteAction('update_stage', {
          dealId: deal.id,
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.dealCount}>{activeDeals.length} active deals</Text>
      </View>

      <View style={styles.dealList}>
        {activeDeals.map((deal) => {
          const currentStage = deal.stages[deal.stageIndex] || 'Lead';
          const isWon = deal.stageIndex === deal.stages.length - 1;
          const isBusy = advancingId === deal.id;

          return (
            <View
              key={deal.id}
              style={[
                styles.dealCard,
                { borderRadius: rounded.lg || 18 },
                isWon && styles.dealCardWon,
              ]}
            >
              {/* Deal Header */}
              <View style={styles.dealHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dealTitle} numberOfLines={1}>
                    {deal.title}
                  </Text>
                  <Text style={styles.dealClient}>
                    {deal.contactName} {deal.company ? `· ${deal.company}` : ''}
                  </Text>
                </View>
                <Text style={styles.dealValue}>${deal.value.toLocaleString()}</Text>
              </View>

              {/* Visual Pipeline Stages */}
              <View style={styles.stagesBar}>
                {deal.stages.map((stg, sIdx) => {
                  const isCompleted = sIdx < deal.stageIndex;
                  const isCurrent = sIdx === deal.stageIndex;

                  return (
                    <View key={stg} style={styles.stageStep}>
                      <View
                        style={[
                          styles.stagePill,
                          isCompleted && styles.stagePillCompleted,
                          isCurrent && styles.stagePillCurrent,
                        ]}
                      />
                      <Text
                        style={[
                          styles.stageLabel,
                          isCurrent && styles.stageLabelCurrent,
                          isCompleted && styles.stageLabelCompleted,
                        ]}
                        numberOfLines={1}
                      >
                        {stg}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Bottom Action */}
              <View style={styles.dealFooter}>
                <View style={styles.currentStageTag}>
                  <Text style={styles.currentStageText}>Stage: {currentStage}</Text>
                </View>

                {!isWon ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    disabled={isBusy}
                    onPress={() => handleAdvanceStage(deal)}
                    style={styles.advanceBtn}
                  >
                    <Text style={styles.advanceBtnText}>
                      {isBusy ? 'Advancing...' : `Advance → ${deal.stages[deal.stageIndex + 1]}`}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.wonBadge}>
                    <Ionicons name="checkmark-done" size={14} color="#059669" />
                    <Text style={styles.wonBadgeText}>Deal Closed & Won</Text>
                  </View>
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
  container: {
    paddingVertical: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  dealCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  dealList: {
    gap: 12,
  },
  dealCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dealCardWon: {
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dealTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  dealClient: {
    fontSize: 12,
    color: '#64748b',
  },
  dealValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginLeft: 8,
  },
  stagesBar: {
    flexDirection: 'row',
    gap: 4,
    marginVertical: 10,
  },
  stageStep: {
    flex: 1,
  },
  stagePill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    marginBottom: 4,
  },
  stagePillCompleted: {
    backgroundColor: '#10b981',
  },
  stagePillCurrent: {
    backgroundColor: '#3b82f6',
  },
  stageLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
  },
  stageLabelCurrent: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  stageLabelCompleted: {
    color: '#10b981',
  },
  dealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  currentStageTag: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentStageText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  advanceBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  advanceBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  wonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  wonBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
});
