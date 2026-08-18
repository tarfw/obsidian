import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SectionProps } from '../ComponentRegistry';

export interface ActionConfirmPayload {
  intentType: 'order' | 'delivery' | 'booking' | 'payment' | 'generic';
  title: string;
  subtitle?: string;
  recipient?: string;
  totalAmount?: string | number;
  items?: Array<{ name: string; qty: number | string; price?: string | number }>;
  notes?: string;
  actionName?: string;
}

export default function ActionConfirm({ props, designTokens, data = [], onExecuteAction }: SectionProps) {
  const rounded = designTokens?.rounded || {};

  const defaultPayload: ActionConfirmPayload = {
    intentType: 'order',
    title: 'Confirm Supplier Order',
    subtitle: 'Dairy Direct Logistics · 2-Day Delivery',
    recipient: 'Dairy Direct Supplies',
    totalAmount: '$32.00',
    items: [
      { name: 'Whole Milk (1L)', qty: '12 units', price: '$18.00' },
      { name: 'Salted Butter (500g)', qty: '4 packs', price: '$14.00' },
    ],
    notes: 'Payment term: Net 7 days on delivery',
    actionName: 'confirm_order',
  };

  const payload: ActionConfirmPayload = data.length > 0 ? data[0] : (props?.payload || defaultPayload);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      if (onExecuteAction) {
        await onExecuteAction(payload.actionName || 'confirm_action', { payload });
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
      await onExecuteAction('cancel_action', { payload });
    }
  };

  if (confirmed) {
    return (
      <View style={[styles.card, styles.cardSuccess, { borderRadius: rounded.lg || 20 }]}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={44} color="#10b981" />
        </View>
        <Text style={styles.successTitle}>Confirmed Successfully</Text>
        <Text style={styles.successSubtitle}>The action has been safely executed.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderRadius: rounded.lg || 20 }]}>
      {/* Header with Safeguard Notice */}
      <View style={styles.header}>
        <View style={styles.shieldBadge}>
          <Ionicons name="shield-checkmark" size={14} color="#2563eb" />
          <Text style={styles.shieldBadgeText}>Safety Review</Text>
        </View>
        <Text style={styles.title}>{payload.title}</Text>
        {payload.subtitle ? (
          <Text style={styles.subtitle}>{payload.subtitle}</Text>
        ) : null}
      </View>

      {/* Itemized Breakdown */}
      {payload.items && payload.items.length > 0 ? (
        <View style={styles.breakdownBox}>
          {payload.items.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.itemRow,
                idx < payload.items!.length - 1 && styles.itemRowBorder,
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQty}>{item.qty}</Text>
              </View>
              {item.price ? (
                <Text style={styles.itemPrice}>{String(item.price)}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {/* Total Amount Row */}
      {payload.totalAmount ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Payable</Text>
          <Text style={styles.totalValue}>{String(payload.totalAmount)}</Text>
        </View>
      ) : null}

      {/* Notes / Terms */}
      {payload.notes ? (
        <View style={styles.notesRow}>
          <Ionicons name="information-circle-outline" size={14} color="#64748b" />
          <Text style={styles.notesText}>{payload.notes}</Text>
        </View>
      ) : null}

      {/* 1-Tap Action Confirmation Buttons */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={busy}
          onPress={handleCancel}
          style={[styles.btn, styles.cancelBtn]}
        >
          <Text style={styles.cancelBtnText}>Dismiss</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={busy}
          onPress={handleConfirm}
          style={[styles.btn, styles.confirmBtn]}
        >
          <Ionicons name="checkmark-sharp" size={16} color="#ffffff" />
          <Text style={styles.confirmBtnText}>{busy ? 'Confirming...' : 'Confirm Now'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 4,
  },
  cardSuccess: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  successIcon: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#065f46',
  },
  successSubtitle: {
    fontSize: 13,
    color: '#047857',
    marginTop: 4,
  },
  header: {
    marginBottom: 16,
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  shieldBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  breakdownBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemQty: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  notesText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    backgroundColor: '#0f172a',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
