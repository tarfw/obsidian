import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SectionProps } from '../ComponentRegistry';

export default function MetricCard({ props, data = [], designTokens }: SectionProps) {
  const rounded = designTokens?.rounded || {};

  const metric = useMemo(() => {
    // 1. If data array is provided from data_view (e.g. sales.today rows)
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      let totalVal = 0;
      const historyPoints: number[] = [];

      data.forEach((r: any) => {
        const val = typeof r.value === 'number' ? r.value : (Number(r.amount) || Number(r.total) || 0);
        totalVal += val;
        historyPoints.push(val);
      });

      return {
        title: props?.title || first.title || "Today's Pulse",
        subtitle: props?.subtitle || `${data.length} records today`,
        value: typeof first.displayValue === 'string' ? first.displayValue : `₹${totalVal.toLocaleString()}`,
        unit: props?.unit || `${data.length} activities`,
        trend: first.trend || undefined,
        trendPositive: first.trendPositive !== false,
        dataPoints: historyPoints.slice(-7),
      };
    }

    // 2. Props fallback
    return {
      title: props?.title || "Today's Metric",
      subtitle: props?.subtitle || 'Live Operations',
      value: props?.value ?? '—',
      unit: props?.unit || 'No live data',
      trend: props?.trend,
      trendPositive: props?.trendPositive !== false,
      dataPoints: Array.isArray(props?.data) ? props.data : [],
    };
  }, [data, props]);

  const maxVal = metric.dataPoints.length > 0 ? Math.max(...metric.dataPoints, 1) : 1;

  return (
    <View style={[styles.card, { borderRadius: rounded.lg || 16 }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.titleText}>{metric.title.toUpperCase()}</Text>
          <Text style={styles.subtitleText}>{metric.subtitle}</Text>
        </View>
        {metric.trend ? (
          <View style={[styles.trendBadge, metric.trendPositive ? styles.trendPos : styles.trendNeg]}>
            <Ionicons
              name={metric.trendPositive ? 'trending-up' : 'trending-down'}
              size={12}
              color={metric.trendPositive ? '#059669' : '#dc2626'}
            />
            <Text style={[styles.trendText, metric.trendPositive ? styles.trendTextPos : styles.trendTextNeg]}>
              {metric.trend}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Main Metric Value */}
      <View style={styles.metricRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.valueText} numberOfLines={1}>
            {metric.value}
          </Text>
          <Text style={styles.unitText}>{metric.unit}</Text>
        </View>

        {/* Sparkline */}
        {metric.dataPoints.length > 0 ? (
          <View style={styles.sparklineContainer}>
            {metric.dataPoints.map((val, idx) => {
              const heightPct = Math.max(18, (val / maxVal) * 100);
              const isLast = idx === metric.dataPoints.length - 1;
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
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleGroup: {
    flex: 1,
    marginRight: 8,
  },
  titleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  subtitleText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
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
    marginTop: 4,
  },
  valueText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  sparklineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 38,
    gap: 4,
    paddingLeft: 12,
  },
  sparkCol: {
    width: 6,
    height: 38,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sparkBar: {
    width: 6,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
  },
  sparkBarActive: {
    backgroundColor: '#0f172a',
  },
});
