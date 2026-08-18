import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, TextInput, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SectionProps } from '../ComponentRegistry';

export interface ContactInfo {
  id: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  company?: string;
  role?: string;
  balance?: string | number;
  totalOrders?: number;
}

export default function ContactCard({ props, designTokens, data = [], onExecuteAction }: SectionProps) {
  const rounded = designTokens?.rounded || {};
  const [search, setSearch] = useState('');

  // Extract list of contacts
  const allContacts: ContactInfo[] = useMemo(() => {
    if (Array.isArray(props?.contacts) && props.contacts.length > 0) {
      return props.contacts;
    }
    if (data.length > 0) {
      return data;
    }
    if (props?.contact && props.contact.name) {
      return [props.contact];
    }
    return [];
  }, [props?.contacts, props?.contact, data]);

  const isListMode = props?.mode === 'list' || allContacts.length > 1;
  const singleContact: ContactInfo | null = allContacts.length > 0 ? allContacts[0] : (props?.contact || null);

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return allContacts;
    const q = search.toLowerCase().trim();
    return allContacts.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q)) ||
      (c.role && c.role.toLowerCase().includes(q))
    );
  }, [allContacts, search]);

  const handleCall = (phone?: string, contactId?: string) => {
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9+]/g, '');
      Linking.openURL(`tel:${cleanPhone}`).catch(() => {});
    }
    if (onExecuteAction) {
      onExecuteAction('call_contact', { contactId, phone });
    }
  };

  const handleWhatsApp = (phone?: string, whatsapp?: string, contactId?: string) => {
    const targetPhone = whatsapp || phone;
    if (targetPhone) {
      const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
      Linking.openURL(`whatsapp://send?phone=${cleanPhone}`).catch(() => {
        Linking.openURL(`https://wa.me/${cleanPhone}`).catch(() => {});
      });
    }
    if (onExecuteAction) {
      onExecuteAction('message_contact', { contactId, phone: targetPhone });
    }
  };

  const handleDetails = (c: ContactInfo) => {
    if (onExecuteAction) {
      onExecuteAction('view_entity', { entity: c, id: c.id });
    }
  };

  const getInitials = (name: string) => {
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'U';
  };

  const getAvatarTheme = (name: string) => {
    const palette = [
      { bg: '#eff6ff', text: '#2563eb' }, // blue
      { bg: '#ecfdf5', text: '#059669' }, // emerald
      { bg: '#f5f3ff', text: '#7c3aed' }, // violet
      { bg: '#fffbeb', text: '#d97706' }, // amber
      { bg: '#fdf2f8', text: '#db2777' }, // pink
      { bg: '#f0fdfa', text: '#0d9488' }, // teal
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  };

  // ── EMPTY STATE ──────────────────────────────────────────────────────────
  if (allContacts.length === 0) {
    return (
      <View style={[styles.card, styles.emptyCard, { borderRadius: rounded.lg || 16 }]}>
        <View style={styles.emptyInfo}>
          <Text style={styles.emptyTitle}>Personal Contacts</Text>
          <Text style={styles.emptySubtitle}>No contacts saved yet</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onExecuteAction && onExecuteAction('create_contact', {})}
          style={styles.emptyAddBtn}
        >
          <Ionicons name="add" size={15} color="#0f172a" />
          <Text style={styles.emptyAddBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── LIST / DRAWER MODE (Full Contact Directory) ──────────────────────────
  if (isListMode) {
    return (
      <View style={[styles.listContainer, { borderRadius: rounded.lg || 16 }]}>
        {/* Header & Quick Search Bar */}
        <View style={styles.listHeader}>
          <View style={styles.listTitleRow}>
            <View style={styles.titleWithBadge}>
              <Text style={styles.listTitle}>Contacts</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{allContacts.length}</Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onExecuteAction && onExecuteAction('create_contact', {})}
              style={styles.headerAddBtn}
            >
              <Ionicons name="add" size={14} color="#0f172a" />
              <Text style={styles.headerAddBtnText}>New Contact</Text>
            </TouchableOpacity>
          </View>

          {allContacts.length > 3 ? (
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={15} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search name, phone, or company..."
                placeholderTextColor="#94a3b8"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Contacts List Items */}
        <View style={styles.itemsWrapper}>
          {filteredContacts.map((c, index) => {
            const subtitle = [c.role, c.company, c.phone].filter(Boolean).join(' · ') || 'Contact';
            const isLast = index === filteredContacts.length - 1;
            const theme = getAvatarTheme(c.name || 'User');

            return (
              <TouchableOpacity
                key={c.id || `c_${index}`}
                activeOpacity={0.7}
                onPress={() => handleDetails(c)}
                style={[styles.rowItem, isLast && styles.rowItemLast]}
              >
                <View style={[styles.avatar, { backgroundColor: theme.bg }]}>
                  <Text style={[styles.avatarText, { color: theme.text }]}>{getInitials(c.name)}</Text>
                </View>

                <View style={styles.infoCol}>
                  <Text style={styles.name} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {subtitle}
                  </Text>
                </View>

                <View style={styles.quickActions}>
                  {c.phone ? (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleCall(c.phone, c.id)}
                      style={styles.iconBtn}
                    >
                      <Ionicons name="call-outline" size={16} color="#334155" />
                    </TouchableOpacity>
                  ) : null}

                  {c.phone || c.whatsapp ? (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleWhatsApp(c.phone, c.whatsapp, c.id)}
                      style={[styles.iconBtn, styles.waBtn]}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // ── SINGLE CONTACT CARD MODE (Zone 2 Pinned) ─────────────────────────────
  if (!singleContact) return null;

  const profileSubtitle = [
    singleContact.role,
    singleContact.company,
    singleContact.phone,
  ].filter(Boolean).join(' · ') || 'Contact';

  const singleTheme = getAvatarTheme(singleContact.name || 'User');

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleDetails(singleContact)}
      style={[styles.card, { borderRadius: rounded.lg || 16 }]}
    >
      <View style={styles.contentRow}>
        <View style={[styles.avatar, { backgroundColor: singleTheme.bg }]}>
          <Text style={[styles.avatarText, { color: singleTheme.text }]}>{getInitials(singleContact.name)}</Text>
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.name} numberOfLines={1}>
            {singleContact.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {profileSubtitle}
          </Text>
        </View>

        {/* Minimal Quick Actions on right */}
        <View style={styles.quickActions}>
          {singleContact.phone ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleCall(singleContact.phone, singleContact.id)}
              style={styles.iconBtn}
            >
              <Ionicons name="call-outline" size={16} color="#334155" />
            </TouchableOpacity>
          ) : null}

          {singleContact.phone || singleContact.whatsapp ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleWhatsApp(singleContact.phone, singleContact.whatsapp, singleContact.id)}
              style={[styles.iconBtn, styles.waBtn]}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Single Card
  card: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // List Container (Drawer / BottomSheet)
  listContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 4,
  },
  listHeader: {
    marginBottom: 8,
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  countBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  headerAddBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    height: 36,
    gap: 6,
    marginTop: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 0,
  },
  itemsWrapper: {
    marginTop: 2,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  rowItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waBtn: {
    backgroundColor: '#ecfdf5',
    borderColor: '#dcfce7',
  },
  // Empty State
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  emptyInfo: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
});
