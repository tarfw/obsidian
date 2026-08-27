import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tar } from '@/lib/tar';

export interface FlowPipelineProps {
  visible: boolean;
  workspaceScope: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function FlowPipelineScreen({ visible, workspaceScope, onClose, onSuccess }: FlowPipelineProps) {
  const [dealTitle, setDealTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [pipeline, setPipeline] = useState('Sales & Client Deals');
  const [stage, setStage] = useState('Lead');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!dealTitle.trim()) {
      setError('Flow / Deal title is required');
      return;
    }
    const val = parseFloat(dealValue) || 0;
    setSubmitting(true);
    setError(null);

    try {
      const cleanScope = workspaceScope.replace(/^w:/, '');
      const flowRes = await tar.tool('create', {
        table: 'matter',
        type: 10, // Flow
        title: dealTitle.trim(),
        value: val,
        data: {
          name: dealTitle.trim(),
          customer: clientName.trim() || 'Client',
          pipeline,
          stage,
          value: val,
        },
        scope: cleanScope,
      });

      if (flowRes?.id) {
        await tar.tool('create', {
          table: 'motion',
          type: 120, // flow_stage_changed
          ref: flowRes.id,
          data: {
            title: `Started Flow: ${dealTitle.trim()}`,
            stage,
            pipeline,
            flow_id: flowRes.id,
          },
          scope: cleanScope,
        }).catch(() => null);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to start flow');
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
              <Ionicons name="git-network-outline" size={20} color="#0f172a" />
              <Text style={styles.title}>Start New Pipeline Flow</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Flow / Deal Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Enterprise Onboarding · ABC Corp"
              placeholderTextColor="#94a3b8"
              value={dealTitle}
              onChangeText={setDealTitle}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Client / Contact Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Maya Lin"
              placeholderTextColor="#94a3b8"
              value={clientName}
              onChangeText={setClientName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Expected Deal Value (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="50000"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={dealValue}
              onChangeText={setDealValue}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Initial Stage</Text>
            <View style={styles.stagePicker}>
              {['Lead', 'Contacted', 'Proposal'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.stageChip, stage === s && styles.stageChipActive]}
                  onPress={() => setStage(s)}
                >
                  <Text style={[styles.stageText, stage === s && styles.stageTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
                <Text style={styles.submitBtnText}>Start Workflow</Text>
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
  stagePicker: {
    flexDirection: 'row',
    gap: 8,
  },
  stageChip: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  stageChipActive: {
    backgroundColor: '#0f172a',
  },
  stageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  stageTextActive: {
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
