import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface MetricCardProps {
  props?: {
    title?: string;
    subtitle?: string;
    value?: string | number;
    unit?: string;
    trend?: string;
    trendPositive?: boolean;
    data?: number[];
  };
  designTokens?: any;
}

export default function MetricCard({ props }: MetricCardProps) {
  const title = props?.title || "Today's Revenue";
  const subtitle = props?.subtitle || 'Live Operations';
  const value = props?.value ?? '$0.00';
  const unit = props?.unit || '0 Orders Today';
  const trend = props?.trend;
  const trendPositive = props?.trendPositive !== false;

  const dataPoints = Array.isArray(props?.data) ? props.data : [];
  const maxVal = dataPoints.length > 0 ? Math.max(...dataPoints, 1) : 1;

  return (
    <View style={styles.card}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.titleText}>{title.toUpperCase()}</Text>
          <Text style={styles.subtitleText}>{subtitle}</Text>
        </View>
        {trend ? (
          <View style={[styles.trendBadge, trendPositive ? styles.trendPos : styles.trendNeg]}>
            <Ionicons
              name={trendPositive ? 'trending-up' : 'trending-down'}
              size={12}
              color={trendPositive ? '#059669' : '#dc2626'}
            />
            <Text style={[styles.trendText, trendPositive ? styles.trendTextPos : styles.trendTextNeg]}>
              {trend}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Main Metric Value & Trend/Unit */}
      <View style={styles.metricRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.valueText} numberOfLines={1}>
            {value}
          </Text>
          <Text style={styles.unitText}>{unit}</Text>
        </View>

        {/* Compact Clean Sparkline (only rendered if real data is provided) */}
        {dataPoints.length > 0 ? (
          <View style={styles.sparklineContainer}>
            {dataPoints.map((val, idx) => {
              const heightPct = Math.max(18, (val / maxVal) * 100);
              const isLast = idx === dataPoints.length - 1;
              return (
                <View key={idx} style={styles.sparkCol}>
                  <View style={[styles.sparkBar, { height: `${heightPct}%` }, isLast && styles.sparkBarActive]} />
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleGroup: {
    flex: 1,
    marginRight: 8,
  },
  titleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  subtitleText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  trendPos: {
    backgroundColor: '#ecfdf5',
  },
  trendNeg: {
    backgroundColor: '#fef2f2',
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  trendTextPos: {
    color: '#059669',
  },
  trendTextNeg: {
    color: '#dc2626',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  valueText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  unitText: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  sparklineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 32,
    width: 64,
    gap: 4,
    paddingBottom: 2,
  },
  sparkCol: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  sparkBar: {
    width: '100%',
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
  },
  sparkBarActive: {
    backgroundColor: '#0f172a',
  },
});
