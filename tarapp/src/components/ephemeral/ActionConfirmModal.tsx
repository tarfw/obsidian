import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tar } from '@/lib/tar';

export interface ActionConfirmModalProps {
  visible: boolean;
  workspaceScope: string;
  actionId: string;
  actionLabel: string;
  params?: Record<string, any>;
  onClose: () => void;
  onSuccess: () => void;
}

export function ActionConfirmModal({
  visible,
  workspaceScope,
  actionId,
  actionLabel,
  params = {},
  onClose,
  onSuccess,
}: ActionConfirmModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const cleanScope = workspaceScope.replace(/^w:/, '');
      await tar.executeAITask(actionId, params, cleanScope);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Action execution failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={28} color="#2563eb" />
          </View>

          <Text style={styles.title}>Confirm Action</Text>
          <Text style={styles.subtitle}>
            Are you sure you want to execute <Text style={{ fontWeight: '700', color: '#0f172a' }}>{actionLabel}</Text>?
          </Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {Object.keys(params).length > 0 && (
            <View style={styles.paramsBox}>
              {Object.entries(params).map(([k, v]) => (
                <View key={k} style={styles.paramRow}>
                  <Text style={styles.paramKey}>{k}:</Text>
                  <Text style={styles.paramVal}>{String(v)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, submitting && { opacity: 0.6 }]}
              onPress={handleConfirm}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirm & Execute</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
  },
  paramsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginBottom: 16,
    gap: 4,
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paramKey: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  paramVal: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
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
  confirmBtn: {
    flex: 2,
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
