import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tar } from '@/lib/tar';

export interface StockAdjustProps {
  visible: boolean;
  workspaceScope: string;
  initialItem?: { id?: string; name?: string; quantity?: number };
  onClose: () => void;
  onSuccess: () => void;
}

export function StockAdjustScreen({ visible, workspaceScope, initialItem, onClose, onSuccess }: StockAdjustProps) {
  const [productTitle, setProductTitle] = useState(initialItem?.name || '');
  const [quantity, setQuantity] = useState(String(initialItem?.quantity || '10'));
  const [reason, setReason] = useState('Stock Count Update');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!productTitle.trim()) {
      setError('Product title is required');
      return;
    }
    const qtyNum = parseFloat(quantity) || 0;
    setSubmitting(true);
    setError(null);

    try {
      const cleanScope = workspaceScope.replace(/^w:/, '');
      // Submit typed action to Tarai
      await tar.tool('create', {
        table: 'motion',
        type: 110, // stock_adjusted
        data: {
          title: `Stock Adjusted: ${productTitle.trim()}`,
          product: productTitle.trim(),
          product_id: initialItem?.id,
          qty: qtyNum,
          reason,
        },
        scope: cleanScope,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock');
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
              <Ionicons name="cube-outline" size={20} color="#0f172a" />
              <Text style={styles.title}>Adjust Inventory Stock</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Product / Item Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Arabica Coffee Beans"
              placeholderTextColor="#94a3b8"
              value={productTitle}
              onChangeText={setProductTitle}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>New Quantity / Adjustment</Text>
            <TextInput
              style={styles.input}
              placeholder="10"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Reason for Adjustment</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Physical inventory count, Restock"
              placeholderTextColor="#94a3b8"
              value={reason}
              onChangeText={setReason}
            />
          </View>

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
                <Text style={styles.submitBtnText}>Commit Stock Adjustment</Text>
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
