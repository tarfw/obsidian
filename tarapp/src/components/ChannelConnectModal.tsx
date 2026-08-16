import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Share,
  Pressable,
} from 'react-native';
import { TarLogoLoader } from './TarLogoLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  generatePairingCode,
  getConnectedChannels,
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
    } catch {
      // Fallback display
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
        title: 'Pairing Command',
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
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
                  Link Telegram, Discord, or Slack to <Text style={styles.bold}>{workspaceName}</Text>
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Command Card */}
          <View style={styles.commandCard}>
            <Text style={styles.cardHeaderLabel}>TYPE IN YOUR CHAT GROUP</Text>

            {loading ? (
              <TarLogoLoader size={28} color="#2563EB" style={{ marginVertical: 14 }} />
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

            <Text style={styles.timerNote}>⏱️ Single-use code • Expires in 10 minutes</Text>
          </View>

          {/* Connected Channels List */}
          {channels.length > 0 && (
            <View style={styles.listContainer}>
              <Text style={styles.listTitle}>CONNECTED GROUPS ({channels.length})</Text>

              {loadingChannels ? (
                <TarLogoLoader size={20} color="#9CA3AF" style={{ marginVertical: 6 }} />
              ) : (
                <FlatList
                  data={channels}
                  keyExtractor={(item) => item.chat_id}
                  style={{ maxHeight: 100 }}
                  renderItem={({ item }) => (
                    <View style={styles.channelRow}>
                      <View style={styles.channelLeft}>
                        <View style={styles.greenDot} />
                        <Text style={styles.channelTitle} numberOfLines={1}>
                          {item.name || item.chat_id}
                        </Text>
                      </View>
                      <Text style={styles.platformBadge}>
                        {item.platform === 'telegram' ? 'Telegram' : item.platform === 'discord' ? 'Discord' : 'Chat'}
                      </Text>
                    </View>
                  )}
                />
              )}
            </View>
          )}

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
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 8,
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
  timerNote: {
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
  },
  listContainer: {
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  channelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  channelTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
  },
  platformBadge: {
    fontSize: 11,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
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
