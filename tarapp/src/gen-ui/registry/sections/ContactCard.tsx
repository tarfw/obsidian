import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, TextInput } from 'react-native';
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

export default function ContactCard({ props, data = [], onExecuteAction }: SectionProps) {
  const [search, setSearch] = useState('');

  // Extract list of contacts safely
  const allContacts: ContactInfo[] = useMemo(() => {
    if (Array.isArray(props?.contacts) && props.contacts.length > 0) {
      return props.contacts;
    }
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    if (props?.contact && props.contact.name) {
      return [props.contact];
    }
    return [];
  }, [props?.contacts, props?.contact, data]);

  if (allContacts.length === 0) {
    return (
      <View style={styles.cardContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>{props?.title || 'Contact Directory'}</Text>
          <Text style={styles.countText}>0 contacts</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={24} color="#94a3b8" />
          <Text style={styles.emptyStateText}>No contacts found in workspace database.</Text>
        </View>
      </View>
    );
  }

  const isListMode = props?.mode === 'list' || allContacts.length > 1;
  const singleContact: ContactInfo | null = allContacts[0] || null;

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
      onExecuteAction('call_contact', { contactId, phone }).catch(() => null);
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
      onExecuteAction('message_contact', { contactId, phone: targetPhone }).catch(() => null);
    }
  };

  const handleDetails = (c: ContactInfo) => {
    if (onExecuteAction) {
      onExecuteAction('view_entity', { entity: c, id: c.id }).catch(() => null);
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

  // ── LIST / DIRECTORY MODE ────────────────────────────────────────────────
  if (isListMode) {
    return (
      <View style={styles.container}>
        {/* Header with count */}
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Contacts</Text>
          <Text style={styles.countText}>{allContacts.length}</Text>
        </View>

        {/* Minimal Search Bar (if more than 3 contacts) */}
        {allContacts.length > 3 ? (
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={14} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={15} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Clean minimal rows */}
        <View style={styles.listWrapper}>
          {filteredContacts.map((c, index) => {
            const subtext = [c.role, c.company, c.phone].filter(Boolean).join(' · ');
            const isLast = index === filteredContacts.length - 1;

            return (
              <TouchableOpacity
                key={c.id || `c_${index}`}
                activeOpacity={0.7}
                onPress={() => handleDetails(c)}
                style={[styles.contactRow, !isLast && styles.rowDivider]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(c.name)}</Text>
                </View>

                <View style={styles.infoCol}>
                  <Text style={styles.contactName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  {subtext ? (
                    <Text style={styles.contactSub} numberOfLines={1}>
                      {subtext}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.actionGroup}>
                  {c.phone ? (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleCall(c.phone, c.id)}
                      style={styles.actionBtn}
                    >
                      <Ionicons name="call-outline" size={15} color="#0f172a" />
                    </TouchableOpacity>
                  ) : null}

                  {c.phone || c.whatsapp ? (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleWhatsApp(c.phone, c.whatsapp, c.id)}
                      style={styles.actionBtn}
                    >
                      <Ionicons name="logo-whatsapp" size={15} color="#0f172a" />
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

  // ── SINGLE CONTACT ROW (Focused Minimal) ──────────────────────────────────
  if (!singleContact) return null;

  const profileSubtitle = [
    singleContact.role,
    singleContact.company,
    singleContact.phone,
  ].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => handleDetails(singleContact)}
      style={styles.singleRow}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(singleContact.name)}</Text>
      </View>

      <View style={styles.infoCol}>
        <Text style={styles.contactName} numberOfLines={1}>
          {singleContact.name}
        </Text>
        {profileSubtitle ? (
          <Text style={styles.contactSub} numberOfLines={1}>
            {profileSubtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.actionGroup}>
        {singleContact.phone ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleCall(singleContact.phone, singleContact.id)}
            style={styles.actionBtn}
          >
            <Ionicons name="call-outline" size={15} color="#0f172a" />
          </TouchableOpacity>
        ) : null}

        {singleContact.phone || singleContact.whatsapp ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleWhatsApp(singleContact.phone, singleContact.whatsapp, singleContact.id)}
            style={styles.actionBtn}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#0f172a" />
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 34,
    gap: 6,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 0,
  },
  listWrapper: {
    backgroundColor: 'transparent',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  singleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  contactName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  contactSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
  },
});
