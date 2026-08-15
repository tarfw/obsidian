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
  Share,
  Linking,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  generatePairingCode,
  getConnectedChannels,
  disconnectChannel,
  ConnectedChannel,
  PairingCodeResponse,
} from '../lib/channels';

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
  const insets = useSafeAreaInsets();
  const [pairingData, setPairingData] = useState<PairingCodeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<ConnectedChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible && subdomain) {
      loadPairingCode();
      loadChannels();
      setCopied(false);
    } else {
      setPairingData(null);
      setChannels([]);
      setCopied(false);
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

  async function handleCopyCommand() {
    if (!pairingData) return;
    const commandText = `/link ${pairingData.code}`;
    try {
      await Share.share({
        message: commandText,
        title: 'Tar Bot Link Command',
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }

  async function handleOpenTelegram() {
    const tgUrl = 'tg://resolve?domain=tarbee_bot';
    const webUrl = 'https://t.me/tarbee_bot';
    try {
      const supported = await Linking.canOpenURL(tgUrl);
      if (supported) {
        await Linking.openURL(tgUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch {
      await Linking.openURL(webUrl);
    }
  }

  async function handleDisconnect(chatId: string) {
    Alert.alert('Unlink Group', 'Are you sure you want to disconnect this chat group?', [
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
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 28) }]}>
          {/* Top Drag Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="chatbubbles" size={18} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.title}>Connect Team Chat</Text>
                <Text style={styles.subTitle} numberOfLines={1}>
                  Link Telegram group to <Text style={styles.bold}>{workspaceName}</Text>
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Main Action Box */}
          <View style={styles.commandCard}>
            <Text style={styles.cardHeaderLabel}>COMMAND TO PAIR</Text>

            {loading ? (
              <ActivityIndicator color="#2563EB" style={{ marginVertical: 14 }} />
            ) : pairingData ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleCopyCommand}
                style={styles.codeButton}
              >
                <Text style={styles.commandText}>/link {pairingData.code}</Text>
                <View style={[styles.copyBadge, copied && styles.copiedBadge]}>
                  <Ionicons
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={14}
                    color={copied ? '#059669' : '#2563EB'}
                  />
                  <Text style={[styles.copyBadgeText, copied && styles.copiedBadgeText]}>
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.tgBtn} onPress={handleOpenTelegram}>
                <Ionicons name="paper-plane" size={14} color="#FFFFFF" />
                <Text style={styles.tgBtnText}>Open Telegram Bot</Text>
              </TouchableOpacity>
              <Text style={styles.timerNote}>⏱️ Expires in 10 mins</Text>
            </View>
          </View>

          {/* Connected Channels List */}
          <View style={styles.listContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>CONNECTED GROUPS ({channels.length})</Text>
              <TouchableOpacity onPress={loadChannels} hitSlop={8}>
                <Ionicons name="refresh" size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {loadingChannels ? (
              <ActivityIndicator size="small" color="#9CA3AF" style={{ marginVertical: 8 }} />
            ) : channels.length === 0 ? (
              <Text style={styles.emptyNote}>No groups connected yet. Type the command above in your group.</Text>
            ) : (
              <FlatList
                data={channels}
                keyExtractor={(item) => item.chat_id}
                style={{ maxHeight: 120 }}
                renderItem={({ item }) => (
                  <View style={styles.channelRow}>
                    <View style={styles.channelLeft}>
                      <Ionicons
                        name={item.platform === 'telegram' ? 'paper-plane' : 'logo-discord'}
                        size={15}
                        color="#2563EB"
                      />
                      <Text style={styles.channelTitle} numberOfLines={1}>
                        {item.name || item.chat_id}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDisconnect(item.chat_id)}
                      style={styles.unlinkBtn}
                    >
                      <Text style={styles.unlinkText}>Unlink</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>

          {/* Done Button */}
          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
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
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 14,
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
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  subTitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 1,
  },
  bold: {
    fontWeight: '600',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  commandCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  codeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 10,
  },
  commandText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2563EB',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  copyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 6,
  },
  copiedBadge: {
    backgroundColor: '#ECFDF5',
  },
  copyBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#2563EB',
  },
  copiedBadgeText: {
    color: '#059669',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tgBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timerNote: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
  listContainer: {
    marginBottom: 16,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  emptyNote: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  channelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  channelTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
  },
  unlinkBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  unlinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  doneButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '600',
  },
});
