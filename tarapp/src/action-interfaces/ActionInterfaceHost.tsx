import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { HarnessAction, HarnessInterfaceContract } from '@/lib/harness';
import { resolveActionInterface } from './registry';

interface Props {
  action: HarnessAction | null;
  inline?: boolean;
  contracts: HarnessInterfaceContract[];
  scope: string;
  initialInput?: Record<string, unknown>;
  contextTitle?: string;
  onClose: () => void;
  onSuccess: (result: Record<string, unknown>) => void;
}

export default function ActionInterfaceHost({ action, inline, contracts, scope, initialInput, contextTitle, onClose, onSuccess }: Props) {
  if (!action) return null;
  const resolved = resolveActionInterface(action, contracts);
  if (!resolved) {
    const content = <View style={styles.page}>
      <Text style={styles.title}>Action unavailable</Text>
      <Text style={styles.message}>The interface for {action.title} is unavailable. Refresh and try again.</Text>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}><Text style={styles.closeText}>Back</Text></Pressable>
    </View>;
    return inline ? content : <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>{content}</Modal>;
  }
  const { Component, contract } = resolved;
  return <Component visible inline={inline} scope={scope} action={action} contract={contract} initialInput={initialInput} contextTitle={contextTitle} onClose={onClose} onSuccess={onSuccess} />;
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', padding: 24, gap: 14, backgroundColor: '#FFFFFF' },
  title: { fontSize: 22, fontWeight: '800', color: '#172033' },
  message: { fontSize: 15, lineHeight: 22, color: '#5F6672' },
  close: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#3157A8' },
  closeText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
