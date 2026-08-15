import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generatePairingCode, getConnectedChannels, disconnectChannel, ConnectedChannel, PairingCodeResponse } from '../lib/channels';

interface Props {
  visible: boolean;
  onClose: () => void;
  subdomain: string;
  workspaceName: string;
  userId?: string;
}

export default function ChannelConnectModal({
  visible,
  onClose,
  subdomain,
  workspaceName,
  userId,
}: Props) {
  const [pairingData, setPairingData] = useState<PairingCodeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<ConnectedChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);

  useEffect(() => {
    if (visible && subdomain) {
      loadPairingCode();
      loadChannels();
    } else {
      setPairingData(null);
      setChannels([]);
    }
  }, [visible, subdomain]);

  async function loadPairingCode() {
    setLoading(true);
    try {
      const data = await generatePairingCode(subdomain, userId);
      setPairingData(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to generate code');
    } finally {
      setLoading(false);
    }
  }

  async function loadChannels() {
    setLoadingChannels(true);
    try {
      const list = await getConnectedChannels(subdomain);
      setChannels(list);
    } finally {
      setLoadingChannels(false);
    }
  }

  async function handleDisconnect(chatId: string) {
    Alert.alert('Disconnect Group', 'Are you sure you want to disconnect this chat group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          await disconnectChannel(chatId);
          loadChannels();
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="chatbubbles-outline" size={22} color="#111827" />
              <Text style={styles.title}>Connect Team Chat</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Connect your Telegram or Discord group to <Text style={styles.bold}>{workspaceName}</Text>
          </Text>

          {/* Code Box */}
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Type this command in your chat group:</Text>
            {loading ? (
              <ActivityIndicator color="#4F46E5" style={{ marginVertical: 12 }} />
            ) : pairingData ? (
              <View style={styles.codeRow}>
                <Text style={styles.codeText}>/link {pairingData.code}</Text>
              </View>
            ) : null}
            <Text style={styles.expiryNote}>⏱️ Code expires in 10 minutes (single-use)</Text>
          </View>

          {/* Connected Groups Section */}
          <View style={styles.channelsSection}>
            <View style={styles.channelsSectionHeader}>
              <Text style={styles.sectionTitle}>Connected Groups ({channels.length})</Text>
              <TouchableOpacity onPress={loadChannels}>
                <Ionicons name="refresh" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {loadingChannels ? (
              <ActivityIndicator size="small" color="#9CA3AF" />
            ) : channels.length === 0 ? (
              <Text style={styles.emptyText}>No chat groups connected yet.</Text>
            ) : (
              <FlatList
                data={channels}
                keyExtractor={(item) => item.chat_id}
                renderItem={({ item }) => (
                  <View style={styles.channelItem}>
                    <View style={styles.channelInfo}>
                      <Ionicons
                        name={item.platform === 'telegram' ? 'paper-plane-outline' : 'logo-discord'}
                        size={18}
                        color="#4F46E5"
                      />
                      <Text style={styles.channelName}>{item.name || item.chat_id}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDisconnect(item.chat_id)}
                      style={styles.disconnectBtn}
                    >
                      <Text style={styles.disconnectText}>Unlink</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
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
    marginBottom: 20,
  },
  bold: {
    fontWeight: '600',
    color: '#111827',
  },
  codeBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  codeLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  codeRow: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 8,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4F46E5',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  expiryNote: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  channelsSection: {
    marginBottom: 20,
  },
  channelsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  channelName: {
    fontSize: 14,
    color: '#1F2937',
  },
  disconnectBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  disconnectText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  doneBtn: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
