import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tar } from '@/lib/tar';

export interface PosSaleProps {
  visible: boolean;
  workspaceScope: string;
  initialParams?: { tableId?: string; tableNum?: number | string };
  onClose: () => void;
  onSuccess: () => void;
}

export function PosSaleScreen({ visible, workspaceScope, initialParams, onClose, onSuccess }: PosSaleProps) {
  const [customerName, setCustomerName] = useState('');
  const [tableNum, setTableNum] = useState(String(initialParams?.tableNum || ''));
  const [itemsText, setItemsText] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('upi');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const total = parseFloat(totalAmount) || 0;
    if (total <= 0) {
      setError('Please enter a valid sale total amount');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const cleanScope = workspaceScope.replace(/^w:/, '');
      // Record Sale motion in Turso Workspace DB
      await tar.tool('create', {
        table: 'motion',
        type: 101, // sale
        data: {
          title: `Sale Completed: ₹${total.toLocaleString()}`,
          customer: customerName.trim() || 'Walk-in Customer',
          table_no: tableNum.trim() || undefined,
          items: itemsText.trim() || 'General Items',
          amount: total,
          payment_method: paymentMethod,
          completed_at: Date.now(),
        },
        scope: cleanScope,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record sale');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="receipt-outline" size={20} color="#0f172a" />
              <Text style={styles.title}>Record Sale & Checkout</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
            <View style={styles.rowTwo}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Customer Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Walk-in Customer"
                  placeholderTextColor="#94a3b8"
                  value={customerName}
                  onChangeText={setCustomerName}
                />
              </View>

              <View style={[styles.formGroup, { width: 90 }]}>
                <Text style={styles.label}>Table / Floor</Text>
                <TextInput
                  style={styles.input}
                  placeholder="T1"
                  placeholderTextColor="#94a3b8"
                  value={tableNum}
                  onChangeText={setTableNum}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Items / Notes</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 2x Espresso, 1x Croissant"
                placeholderTextColor="#94a3b8"
                value={itemsText}
                onChangeText={setItemsText}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Total Amount (₹)</Text>
              <TextInput
                style={[styles.input, styles.amountInput]}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={totalAmount}
                onChangeText={setTotalAmount}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.paymentMethods}>
                {(['upi', 'card', 'cash'] as const).map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[styles.methodChip, paymentMethod === method && styles.methodChipActive]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text style={[styles.methodText, paymentMethod === method && styles.methodTextActive]}>
                      {method.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Complete & Record Sale</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginBottom: 10,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 10,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '700',
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 8,
  },
  methodChip: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  methodChipActive: {
    backgroundColor: '#0f172a',
  },
  methodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  methodTextActive: {
    color: '#ffffff',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
