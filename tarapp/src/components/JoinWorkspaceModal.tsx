import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { TarLogoLoader } from './TarLogoLoader';
import { Ionicons } from '@expo/vector-icons';
import { claimMemberInvite, ClaimMemberResponse } from '../lib/channels';
import { getCurrentUser } from '../lib/auth';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (workspace: ClaimMemberResponse['workspace']) => void;
}

export default function JoinWorkspaceModal({ visible, onClose, onSuccess }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleClaim() {
    if (!code.trim() || code.trim().length < 4) {
      Alert.alert('Invalid Code', 'Please enter the 4-digit join code sent to your Telegram DM.');
      return;
    }

    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user || !user.email) {
        Alert.alert('Sign In Required', 'Please sign in with Google first before joining a workspace.');
        return;
      }

      const res = await claimMemberInvite(code.trim(), user);
      Alert.alert(
        'Workspace Joined! 🎉',
        `You have successfully joined ${res.workspace.subdomain} as ${res.workspace.role}.`,
        [
          {
            text: 'Open Workspace',
            onPress: () => {
              setCode('');
              onSuccess(res.workspace);
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Join Failed', err.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="key-outline" size={22} color="#111827" />
              <Text style={styles.title}>Join Team Workspace</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Enter the 4-digit code sent to your private Telegram DM by your team manager.
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 7491"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              autoFocus
            />
          </View>

          <Text style={styles.authNote}>
            🔒 Your verified Google Account will be linked to this workspace.
          </Text>

          <TouchableOpacity
            style={[styles.claimBtn, loading && styles.disabledBtn]}
            onPress={handleClaim}
            disabled={loading}
          >
            {loading ? (
              <TarLogoLoader size={20} color="#FFFFFF" />
            ) : (
              <Text style={styles.claimBtnText}>Claim & Join Workspace</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 4,
    color: '#111827',
  },
  authNote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  claimBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  claimBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
