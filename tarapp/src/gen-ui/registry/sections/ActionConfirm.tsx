import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SectionProps } from '../ComponentRegistry';

export interface ActionConfirmPayload {
  intentType?: 'order' | 'delivery' | 'booking' | 'payment' | 'generic';
  title: string;
  subtitle?: string;
  recipient?: string;
  totalAmount?: string | number;
  items?: Array<{ name: string; qty: number | string; price?: string | number }>;
  notes?: string;
  actionName?: string;
  params?: Record<string, any>;
}

export default function ActionConfirm({ props, designTokens, data = [], onExecuteAction }: SectionProps) {
  const rounded = designTokens?.rounded || {};

  const payload: ActionConfirmPayload | null = data.length > 0 ? data[0] : (props?.payload || null);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!payload) {
    return (
      <View style={[styles.card, { borderRadius: rounded.lg || 16 }]}>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#64748b" />
          <Text style={styles.title}>Action Confirmation</Text>
        </View>
        <Text style={styles.emptyText}>No pending action requiring review.</Text>
      </View>
    );
  }

  const handleConfirm = async () => {
    setBusy(true);
    try {
      if (onExecuteAction) {
        await onExecuteAction(payload.actionName || 'action.confirm', payload.params || { payload });
      }
      setConfirmed(true);
    } catch (e) {
      console.warn('[ActionConfirm] Confirm error:', e);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (onExecuteAction) {
      await onExecuteAction('action.cancel', { payload });
    }
  };

  if (confirmed) {
    return (
      <View style={[styles.card, styles.cardSuccess, { borderRadius: rounded.lg || 16 }]}>
        <Ionicons name="checkmark-circle" size={36} color="#10b981" />
        <Text style={styles.successTitle}>Confirmed Successfully</Text>
        <Text style={styles.successSubtitle}>The action was authorized and submitted.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderRadius: rounded.lg || 16 }]}>
      <View style={styles.header}>
        <View style={styles.shieldBadge}>
          <Ionicons name="shield-checkmark" size={12} color="#1d4ed8" />
          <Text style={styles.shieldBadgeText}>Safety Review</Text>
        </View>
        <Text style={styles.title}>{payload.title}</Text>
        {payload.subtitle && <Text style={styles.subtitle}>{payload.subtitle}</Text>}
      </View>

      {payload.items && payload.items.length > 0 && (
        <View style={styles.breakdownBox}>
          {payload.items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQty}>{item.qty}</Text>
              </View>
              {item.price && <Text style={styles.itemPrice}>{String(item.price)}</Text>}
            </View>
          ))}
        </View>
      )}

      {payload.totalAmount && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalVal}>{String(payload.totalAmount)}</Text>
        </View>
      )}

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={busy}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, busy && { opacity: 0.6 }]}
          onPress={handleConfirm}
          disabled={busy}
        >
          <Text style={styles.confirmBtnText}>{busy ? 'Submitting...' : 'Confirm & Execute'}</Text>
        </TouchableOpacity>
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
  cardSuccess: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  successTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  successSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  header: {
    marginBottom: 12,
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
    marginBottom: 6,
  },
  shieldBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 8,
  },
  breakdownBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  itemQty: {
    fontSize: 11,
    color: '#64748b',
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  totalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
