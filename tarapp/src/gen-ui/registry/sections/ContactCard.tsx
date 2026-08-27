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
}

export default function ContactCard({ props, data = [], designTokens, onExecuteAction, onOpenScreen }: SectionProps) {
  const rounded = designTokens?.rounded || {};
  const [search, setSearch] = useState('');

  const allContacts: ContactInfo[] = useMemo(() => {
    const raw = Array.isArray(data) && data.length > 0 ? data : (Array.isArray(props?.contacts) ? props.contacts : []);
    return raw.map((c: any) => ({
      id: c.id || `ct_${Math.random()}`,
      name: c.name || c.title || c.data?.fn || c.data?.name || 'Contact',
      phone: c.phone || c.data?.ph || c.data?.phone || '',
      whatsapp: c.whatsapp || c.data?.whatsapp || c.phone || c.data?.ph || '',
      email: c.email || c.data?.em || c.data?.email || '',
      company: c.company || c.data?.company || '',
      role: c.role || c.data?.role || 'Customer',
    }));
  }, [data, props?.contacts]);

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return allContacts;
    const q = search.toLowerCase().trim();
    return allContacts.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q))
    );
  }, [allContacts, search]);

  const handleCall = (phone?: string) => {
    if (phone) {
      const clean = phone.replace(/[^0-9+]/g, '');
      Linking.openURL(`tel:${clean}`).catch(() => {});
    }
  };

  const handleWhatsApp = (phone?: string) => {
    if (phone) {
      const clean = phone.replace(/[^0-9]/g, '');
      Linking.openURL(`https://wa.me/${clean}`).catch(() => {});
    }
  };

  if (allContacts.length === 0) {
    return (
      <View style={[styles.cardContainer, { borderRadius: rounded.lg || 16 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>{props?.title || 'Contact Directory'}</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => onOpenScreen ? onOpenScreen('contact-add') : onExecuteAction?.('contact.create', {})}
          >
            <Ionicons name="person-add-outline" size={13} color="#ffffff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={24} color="#94a3b8" />
          <Text style={styles.emptyStateText}>No contacts found in directory</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.cardContainer, { borderRadius: rounded.lg || 16 }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionTitle}>{props?.title || 'Contacts'}</Text>
          <Text style={styles.countText}>{allContacts.length} contacts</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => onOpenScreen ? onOpenScreen('contact-add') : onExecuteAction?.('contact.create', {})}
        >
          <Ionicons name="person-add-outline" size={13} color="#ffffff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={14} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.contactList}>
        {filteredContacts.slice(0, 3).map((c) => (
          <View key={c.id} style={styles.contactRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{c.name.charAt(0).toUpperCase()}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.contactName} numberOfLines={1}>{c.name}</Text>
              <Text style={styles.contactRole}>{c.company ? `${c.company} · ` : ''}{c.phone || c.email || c.role}</Text>
            </View>

            <View style={styles.actionButtons}>
              {c.phone ? (
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleCall(c.phone)}>
                  <Ionicons name="call-outline" size={16} color="#0f172a" />
                </TouchableOpacity>
              ) : null}
              {c.phone || c.whatsapp ? (
                <TouchableOpacity style={[styles.iconBtn, styles.waBtn]} onPress={() => handleWhatsApp(c.whatsapp || c.phone)}>
                  <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  countText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    padding: 0,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  contactList: {
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  contactName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  contactRole: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waBtn: {
    backgroundColor: '#f0fdf4',
  },
});
