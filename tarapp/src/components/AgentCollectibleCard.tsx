import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedTarLogoAgent, AgentRoleType, AgentStateMode } from './AnimatedTarLogoAgent';

export interface AgentCardData {
  id: string;
  edition: string;
  category: string;
  role: AgentRoleType;
  title: string;
  description: string;
  goodForLabel?: string;
  goodForContent: string;
  vibesLabel?: string;
  vibesContent: string;
  priceTag?: string;
  pricePeriod?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  isPrimaryActive?: boolean;
}

interface AgentCollectibleCardProps {
  card: AgentCardData;
  mode?: AgentStateMode;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AgentCollectibleCard({
  card,
  mode = 'active',
  onPrimaryAction,
  onSecondaryAction,
  loading = false,
  style,
}: AgentCollectibleCardProps) {
  return (
    <View style={[styles.cardContainer, style]}>
      {/* ── TOP METADATA BAR ────────────────────────────────────────── */}
      <View style={styles.topHeader}>
        <Text style={styles.topCategory}>{card.category || 'TAR AGENT'}</Text>
        <Text style={styles.topEdition}>{card.edition || '0001'}</Text>
      </View>

      {/* ── CENTER HERO: ANIMATED TARLOGO MASCOT ────────────────────── */}
      <View style={styles.heroCenter}>
        <AnimatedTarLogoAgent size={105} role={card.role} mode={mode} />
      </View>

      {/* ── HEADLINE & DESCRIPTION ──────────────────────────────────── */}
      <View style={styles.bodySection}>
        <Text style={styles.titleText}>{card.title}</Text>
        <Text style={styles.descriptionText}>{card.description}</Text>
      </View>

      {/* ── 2-COLUMN METADATA FOOTER (Good for vs Vibes / Economics) ── */}
      <View style={styles.metaColumnsContainer}>
        {/* Left Column: Good for / Included */}
        <View style={styles.metaColLeft}>
          <Text style={styles.metaColLabel}>{card.goodForLabel || 'Good for:'}</Text>
          <Text style={styles.metaColText}>{card.goodForContent}</Text>
        </View>

        {/* Vertical Divider */}
        <View style={styles.verticalDivider} />

        {/* Right Column: Vibes / Economics */}
        <View style={styles.metaColRight}>
          <Text style={styles.metaColLabel}>{card.vibesLabel || 'Vibes:'}</Text>
          <Text style={styles.metaColText}>{card.vibesContent}</Text>
        </View>
      </View>

      {/* ── INTERACTIVE ACTIONS ──────────────────────────────────────── */}
      {(onPrimaryAction || onSecondaryAction) && (
        <View style={styles.actionRow}>
          {onPrimaryAction && (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.primaryBtn,
                card.role === 'sales_agent' && styles.primaryBtnEmerald,
              ]}
              onPress={onPrimaryAction}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="flash" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>
                    {card.primaryActionLabel || '⚡ Activate Agent'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {onSecondaryAction && (
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.secondaryBtn}
              onPress={onSecondaryAction}
            >
              <Text style={styles.secondaryBtnText}>
                {card.secondaryActionLabel || 'Details'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  topCategory: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#71717a',
    fontFamily: 'monospace',
  },
  topEdition: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#71717a',
    fontFamily: 'monospace',
  },
  heroCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  bodySection: {
    marginTop: 6,
    marginBottom: 16,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#09090b',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#52525b',
  },
  metaColumnsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f4f4f5',
    marginBottom: 16,
  },
  metaColLeft: {
    flex: 1,
    paddingRight: 10,
  },
  verticalDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#e4e4e7',
    marginHorizontal: 4,
  },
  metaColRight: {
    flex: 1,
    paddingLeft: 10,
  },
  metaColLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#18181b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaColText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#52525b',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181b',
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnEmerald: {
    backgroundColor: '#10B981',
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f4f4f5',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#27272a',
  },
});

export default AgentCollectibleCard;
