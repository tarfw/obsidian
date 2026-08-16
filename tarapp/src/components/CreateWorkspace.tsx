import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { TarLogoLoader } from '@/components/TarLogoLoader';
import { tar } from '@/lib/tar';
import * as SecureStore from 'expo-secure-store';

// ── 1. Business Categories ───────────────────────────────────────────
const BUSINESS_CATEGORIES = [
  { id: 'restaurant', label: 'Restaurant & Cafe', icon: 'restaurant-outline', starterName: 'Al Noor' },
  { id: 'retail', label: 'Fashion & Retail', icon: 'shirt-outline', starterName: 'Metro Store' },
  { id: 'salon', label: 'Salon & Spa', icon: 'sparkles-outline', starterName: 'Glow Studio' },
  { id: 'clinic', label: 'Clinic & Health', icon: 'medkit-outline', starterName: 'Care Clinic' },
  { id: 'logistics', label: 'Logistics & Delivery', icon: 'cube-outline', starterName: 'Swift Express' },
  { id: 'business', label: 'General Business', icon: 'business-outline', starterName: 'Apex Enterprises' },
];

interface CreateWorkspaceProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (subdomain: string) => Promise<void>;
  canClose: boolean;
  existingSubdomains?: string[];
}

export default function CreateWorkspace({
  visible,
  onClose,
  onSuccess,
  canClose,
  existingSubdomains = [],
}: CreateWorkspaceProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [selectedCategory, setSelectedCategory] = useState(BUSINESS_CATEGORIES[0]);
  const [workspaceName, setWorkspaceName] = useState(BUSINESS_CATEGORIES[0].starterName);

  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subdomain / Scope Calculation
  const rawName = workspaceName.trim() || 'workspace';
  let baseSlug = rawName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'workspace';

  let resolvedSlug = baseSlug;
  if (existingSubdomains.includes(resolvedSlug)) {
    let counter = 2;
    while (existingSubdomains.includes(`${baseSlug}-${counter}`)) {
      counter++;
    }
    resolvedSlug = `${baseSlug}-${counter}`;
  }

  const handleSelectCategory = (cat: typeof BUSINESS_CATEGORIES[0]) => {
    setSelectedCategory(cat);
    setWorkspaceName(cat.starterName);
  };

  const handleCreate = async () => {
    if (isSynthesizing || !workspaceName.trim()) return;

    const finalName = workspaceName.trim();
    setIsSynthesizing(true);
    setErrorMessage(null);
    setCurrentStep(1);

    try {
      await new Promise((res) => setTimeout(res, 200));
      setCurrentStep(2);

      let finalSlug = resolvedSlug;
      try {
        await tar.createWorkspace({
          name: finalName,
          subdomain: finalSlug,
          description: `${selectedCategory.label} workspace`,
          type: selectedCategory.id,
        });
      } catch (createErr: any) {
        if (createErr?.message?.includes('already exists') || createErr?.message?.includes('duplicate')) {
          finalSlug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;
          await tar.createWorkspace({
            name: finalName,
            subdomain: finalSlug,
            description: `${selectedCategory.label} workspace`,
            type: selectedCategory.id,
          });
        } else {
          throw createErr;
        }
      }

      await SecureStore.setItemAsync('active_workspace_subdomain', finalSlug).catch(() => null);

      setCurrentStep(3);
      await new Promise((res) => setTimeout(res, 200));

      setIsSynthesizing(false);
      setCurrentStep(0);
      await onSuccess(finalSlug);
    } catch (err: any) {
      console.error('[CreateWorkspace] Creation error:', err);
      setErrorMessage(err?.message || 'Failed to create workspace. Please try again.');
      setIsSynthesizing(false);
      setCurrentStep(0);
    }
  };

  const stepLabels = [
    'Setting up workspace...',
    'Initializing database...',
    'Configuring tools & roles...',
    'Ready!',
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      statusBarTranslucent
      onRequestClose={() => {
        if (canClose && !isSynthesizing) onClose();
      }}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Header Bar */}
          <View style={[styles.headerBar, { paddingTop: Math.max(insets.top + 6, 14) }]}>
            <View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>New Workspace</Text>
              <Text style={[styles.headerSub, { color: theme.textMuted }]}>Business operating system</Text>
            </View>
            {canClose && !isSynthesizing && (
              <Pressable onPress={onClose} style={[styles.closeBtn, { borderColor: theme.border + '60' }]} hitSlop={8}>
                <Ionicons name="close" size={18} color={theme.textSecondary} />
              </Pressable>
            )}
          </View>

          {isSynthesizing ? (
            /* Loader State */
            <View style={styles.loaderContainer}>
              <TarLogoLoader size={40} color="#2563EB" style={{ marginBottom: 16 }} />
              <Text style={[styles.loaderStatus, { color: theme.text }]}>
                {stepLabels[Math.min(currentStep - 1, stepLabels.length - 1)] || 'Initializing...'}
              </Text>
              <Text style={[styles.loaderSub, { color: theme.textMuted }]}>
                {resolvedSlug}
              </Text>
            </View>
          ) : (
            /* Clean Compact Form */
            <ScrollView
              contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* STEP 1: BUSINESS TYPE */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>1. BUSINESS TYPE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowList}>
                  {BUSINESS_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory.id === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => handleSelectCategory(cat)}
                        style={[
                          styles.catPill,
                          {
                            backgroundColor: isSelected ? '#2563EB15' : theme.backgroundElement,
                            borderColor: isSelected ? '#2563EB' : theme.border + '50',
                          },
                        ]}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={15}
                          color={isSelected ? '#2563EB' : theme.textSecondary}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.catText, { color: isSelected ? '#2563EB' : theme.text }]}>
                          {cat.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* STEP 2: WORKSPACE NAME */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>2. WORKSPACE NAME</Text>
                <View style={[styles.inputContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.border + '60' }]}>
                  <Ionicons name="business-outline" size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.inputField, { color: theme.text }]}
                    value={workspaceName}
                    onChangeText={setWorkspaceName}
                    placeholder="Workspace Name"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                <View style={[styles.urlBadge, { backgroundColor: '#2563EB0D', borderColor: '#2563EB25' }]}>
                  <Ionicons name="server-outline" size={13} color="#2563EB" style={{ marginRight: 5 }} />
                  <Text style={[styles.urlLabel, { color: theme.textMuted }]}>
                    Identifier: <Text style={{ color: '#2563EB', fontWeight: '700' }}>w:{resolvedSlug}</Text>
                  </Text>
                </View>
              </View>

              {/* Create Button */}
              <Pressable
                onPress={handleCreate}
                style={({ pressed }) => [
                  styles.launchBtn,
                  {
                    backgroundColor: '#0F172A',
                    opacity: pressed || !workspaceName.trim() ? 0.8 : 1,
                  },
                ]}
                disabled={!workspaceName.trim()}
              >
                <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.launchBtnText}>Create Workspace</Text>
              </Pressable>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.02,
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 18,
  },
  sectionBlock: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.06,
    textTransform: 'uppercase',
  },
  rowList: {
    gap: 8,
    paddingVertical: 2,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
  },
  catText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
  },
  urlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  urlLabel: {
    fontSize: 11.5,
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  launchBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  loaderStatus: {
    fontSize: 15,
    fontWeight: '700',
  },
  loaderSub: {
    fontSize: 12,
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: '#EF444415',
    borderColor: '#EF444440',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '500',
  },
});
