import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createOperationKey, harness } from '@/lib/harness';
import type { ActionInterfaceProps } from './types';

export default function ConfirmationInterface(props: ActionInterfaceProps) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [operationKey] = useState(() => createOperationKey(props.action.id));

  if (!props.visible) return null;

  const payload = {
    ...Object.fromEntries(
      props.action.fields
        .filter((f) => f.defaultValue !== undefined)
        .map((f) => [f.key, f.kind === 'number' ? Number(f.defaultValue) : f.defaultValue]),
    ),
    ...(props.initialInput || {}),
  };

  const submit = async () => {
    setSaving(true);
    try {
      const result = await harness.executeAction(
        props.scope,
        props.action.id,
        payload,
        operationKey,
      );
      props.onSuccess(result);
    } catch (cause) {
      Alert.alert('Could not complete', cause instanceof Error ? cause.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const initialEntries = Object.entries(payload).filter(
    ([k, v]) => v !== undefined && v !== null && v !== '' && k !== 'baseVersion',
  );

  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          {/* Action Badge */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, props.action.type === 'human' ? styles.humanBadge : styles.appBadge]}>
              <Ionicons
                name={props.action.type === 'human' ? 'hand-right-outline' : 'flash-outline'}
                size={12}
                color={props.action.type === 'human' ? '#C2410C' : '#3157A8'}
              />
              <Text
                style={[
                  styles.badgeText,
                  props.action.type === 'human' ? styles.humanBadgeText : styles.appBadgeText,
                ]}
              >
                {props.action.type === 'human' ? 'HUMAN STEP' : '1-TAP ACTION'}
              </Text>
            </View>
            <Text style={styles.actionId}>{props.action.id}</Text>
          </View>

          {/* Title & Description */}
          <Text style={styles.title}>{props.contextTitle || props.action.title}</Text>
          <Text style={styles.body}>{props.action.description}</Text>

          {/* Context Token Cards (if initial inputs provided) */}
          {initialEntries.length > 0 ? (
            <View style={styles.contextCard}>
              <Text style={styles.contextCardTitle}>ACTION CONTEXT</Text>
              {initialEntries.map(([key, val]) => (
                <View key={key} style={styles.contextRow}>
                  <Text style={styles.contextKey}>{key}</Text>
                  <Text numberOfLines={2} style={styles.contextVal}>
                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* 1-Tap Action Controls */}
          <View style={styles.actions}>
            <TouchableOpacity
              disabled={saving}
              onPress={props.onClose}
              style={styles.cancelButton}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={saving}
              style={[styles.confirmButton, saving && styles.disabled]}
              onPress={() => void submit()}
              accessibilityRole="button"
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.confirmContent}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.confirmText}>{props.contract.submitLabel || 'Confirm'}</Text>
                </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0F172A77',
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  appBadge: { backgroundColor: '#EFF6FF' },
  humanBadge: { backgroundColor: '#FFF7ED' },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  appBadgeText: { color: '#3157A8' },
  humanBadgeText: { color: '#C2410C' },
  actionId: { fontSize: 11, fontFamily: 'monospace', color: '#64748B' },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.4 },
  body: { fontSize: 14, lineHeight: 20, color: '#475569' },
  contextCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 6,
    marginTop: 4,
  },
  contextCardTitle: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8 },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  contextKey: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  contextVal: { fontSize: 12, fontWeight: '700', color: '#0F172A', flex: 1, textAlign: 'right', marginLeft: 12 },
  actions: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  confirmButton: {
    minWidth: 120,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  disabled: { opacity: 0.6 },
  confirmText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});
