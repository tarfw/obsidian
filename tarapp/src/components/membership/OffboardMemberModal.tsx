import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { offboardMember, type WorkspaceMember } from '@/lib/membership';

export interface OffboardMemberModalProps {
  visible: boolean;
  workspaceScope: string;
  member: WorkspaceMember | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function OffboardMemberModal({ visible, workspaceScope, member, onClose, onSuccess }: OffboardMemberModalProps) {
  const [handoverTo, setHandoverTo] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!member) return null;

  const handleRevoke = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await offboardMember({
        workspaceScope,
        member_id: member.id,
        handover_to: handoverTo.trim(),
        reason: reason.trim() || 'Voluntary offboarding',
        confirmRevocation: true,
      });

      if (!result.success) {
        setError(result.error || 'Offboarding failed');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Offboarding failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-remove" size={28} color="#dc2626" />
          </View>

          <Text style={styles.title}>Offboard Member</Text>
          <Text style={styles.subtitle}>
            Revoke membership for <Text style={{ fontWeight: '700', color: '#0f172a' }}>{member.name}</Text> ({member.email}).
            Revocation stops token renewal, removes channel access, and creates projection tombstones.
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Handover Responsibilities To (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. manager@example.com"
              placeholderTextColor="#94a3b8"
              value={handoverTo}
              onChangeText={setHandoverTo}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Reason / Handover Note</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. End of contract, Department transfer"
              placeholderTextColor="#94a3b8"
              value={reason}
              onChangeText={setReason}
            />
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.revokeBtn, submitting && { opacity: 0.6 }]}
              onPress={handleRevoke}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.revokeBtnText}>Revoke Access</Text>
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
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  revokeBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  revokeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
