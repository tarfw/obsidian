import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWorkspaceMembers, type WorkspaceMember } from '@/lib/membership';
import { OnboardMemberModal } from './OnboardMemberModal';
import { OffboardMemberModal } from './OffboardMemberModal';

export interface TeamRosterModalProps {
  visible: boolean;
  workspaceScope: string;
  isOwner?: boolean;
  onClose: () => void;
}

export function TeamRosterModal({ visible, workspaceScope, isOwner = true, onClose }: TeamRosterModalProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboard, setShowOnboard] = useState(false);
  const [offboardTarget, setOffboardTarget] = useState<WorkspaceMember | null>(null);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const list = await getWorkspaceMembers(workspaceScope);
      setMembers(list);
    } catch (err) {
      console.warn('[TeamRoster] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadMembers();
    }
  }, [visible, workspaceScope]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="people-outline" size={20} color="#0f172a" />
              <Text style={styles.title}>Workspace Team & Access</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.actionHeader}>
            <Text style={styles.countText}>{members.length} members</Text>
            {isOwner && (
              <TouchableOpacity style={styles.inviteBtn} onPress={() => setShowOnboard(true)}>
                <Ionicons name="person-add-outline" size={13} color="#ffffff" />
                <Text style={styles.inviteBtnText}>Onboard Member</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#0f172a" size="small" />
              <Text style={styles.loadingText}>Fetching authoritative members...</Text>
            </View>
          ) : members.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={28} color="#94a3b8" />
              <Text style={styles.emptyText}>No additional members yet.</Text>
            </View>
          ) : (
            <FlatList
              data={members}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <View style={styles.memberCard}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{item.name}</Text>
                    <Text style={styles.memberEmail}>{item.email}</Text>
                  </View>

                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{item.role.toUpperCase()}</Text>
                  </View>

                  {isOwner && item.role !== 'owner' && (
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => setOffboardTarget(item)}
                      hitSlop={6}
                    >
                      <Ionicons name="trash-outline" size={16} color="#dc2626" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
          )}

          <OnboardMemberModal
            visible={showOnboard}
            workspaceScope={workspaceScope}
            onClose={() => setShowOnboard(false)}
            onSuccess={() => {
              setShowOnboard(false);
              loadMembers();
            }}
          />

          <OffboardMemberModal
            visible={offboardTarget !== null}
            workspaceScope={workspaceScope}
            member={offboardTarget}
            onClose={() => setOffboardTarget(null)}
            onSuccess={() => {
              setOffboardTarget(null);
              loadMembers();
            }}
          />
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
    marginBottom: 12,
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
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  countText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  inviteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  memberEmail: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  roleBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  removeBtn: {
    padding: 6,
  },
});
