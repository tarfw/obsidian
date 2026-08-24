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
import { TarLogoLoader } from '@/components/TarLogoLoader';
import { tar } from '@/lib/tar';
import * as SecureStore from 'expo-secure-store';

interface CreateWorkspaceProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (subdomain: string) => Promise<void>;
  canClose: boolean;
  existingSubdomains?: string[];
  onOpenCredits?: () => void;
}

export default function CreateWorkspace({
  visible,
  onClose,
  onSuccess,
  canClose,
  existingSubdomains = [],
  onOpenCredits,
}: CreateWorkspaceProps) {
  const insets = useSafeAreaInsets();

  const [workspaceName, setWorkspaceName] = useState('');
  const [description, setDescription] = useState('');

  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsCredits, setNeedsCredits] = useState(false);

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

  const handleCreate = async () => {
    if (isSynthesizing || !workspaceName.trim()) return;

    const finalName = workspaceName.trim();
    const finalDesc = description.trim();
    setIsSynthesizing(true);
    setErrorMessage(null);
    setNeedsCredits(false);
    setCurrentStep(1);

    try {
      await new Promise((res) => setTimeout(res, 150));
      setCurrentStep(2);

      let finalSlug = resolvedSlug;
      try {
        await tar.createWorkspace({
          name: finalName,
          subdomain: finalSlug,
          description: finalDesc || undefined,
          message: finalDesc ? `${finalName}: ${finalDesc}` : finalName,
        });
      } catch (createErr: any) {
        if (createErr?.message?.includes('already exists') || createErr?.message?.includes('duplicate')) {
          finalSlug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;
          await tar.createWorkspace({
            name: finalName,
            subdomain: finalSlug,
            description: finalDesc || undefined,
            message: finalDesc ? `${finalName}: ${finalDesc}` : finalName,
          });
        } else {
          throw createErr;
        }
      }

      await SecureStore.setItemAsync('active_workspace_subdomain', finalSlug).catch(() => null);

      setCurrentStep(3);
      await new Promise((res) => setTimeout(res, 150));

      setIsSynthesizing(false);
      setCurrentStep(0);
      setWorkspaceName('');
      setDescription('');
      await onSuccess(finalSlug);
    } catch (err: any) {
      console.error('[CreateWorkspace] Creation error:', err);
      const insufficientCredits = err?.status === 402 || /not enough credits/i.test(err?.message || '');
      setNeedsCredits(insufficientCredits);
      setErrorMessage(insufficientCredits ? 'You need 100 credits to start an owned workspace.' : (err?.message || 'Failed to create workspace. Please try again.'));
      setIsSynthesizing(false);
      setCurrentStep(0);
    }
  };

  const stepLabels = [
    'Setting up workspace...',
    'Creating database & tools...',
    'Finalizing...',
    'Ready!',
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      statusBarTranslucent
      onRequestClose={() => {
        if (canClose && !isSynthesizing) {
          setWorkspaceName('');
          setDescription('');
          onClose();
        }
      }}
    >
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Header Bar */}
          <View
            style={[
              styles.headerBar,
              {
                paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 16 : 12) + 12,
              },
            ]}
          >
            <Text style={styles.headerTitle}>New Workspace</Text>
            {canClose && !isSynthesizing && (
              <Pressable
                onPress={() => {
                  setWorkspaceName('');
                  setDescription('');
                  onClose();
                }}
                style={styles.closeBtn}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </Pressable>
            )}
          </View>

          {isSynthesizing ? (
            /* Synthesizing Progress State */
            <View style={styles.loaderContainer}>
              <TarLogoLoader size={34} color="#0f172a" style={{ marginBottom: 14 }} />
              <Text style={styles.loaderStatus}>
                {stepLabels[Math.min(currentStep - 1, stepLabels.length - 1)] || 'Creating Workspace...'}
              </Text>
            </View>
          ) : (
            /* Clean Minimal Form */
            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                {
                  paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16) + 20,
                },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={16} color="#dc2626" style={{ marginRight: 6 }} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                  {needsCredits && onOpenCredits && (
                    <Pressable onPress={onOpenCredits} style={styles.creditsButton}>
                      <Text style={styles.creditsButtonText}>Add credits</Text>
                    </Pressable>
                  )}
                </View>
              )}

              {/* WORKSPACE NAME */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Name</Text>
                <TextInput
                  style={styles.inputField}
                  value={workspaceName}
                  onChangeText={setWorkspaceName}
                  placeholder="Workspace name"
                  placeholderTextColor="#94a3b8"
                  autoFocus
                />
              </View>

              {/* OPTIONAL DESCRIPTION */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Description (Optional)</Text>
                <TextInput
                  style={[styles.inputField, styles.descField]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What is this workspace used for?"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Create Button */}
              <Pressable
                onPress={handleCreate}
                disabled={!workspaceName.trim()}
                style={({ pressed }) => [
                  styles.launchBtn,
                  {
                    opacity: !workspaceName.trim() ? 0.35 : pressed ? 0.85 : 1,
                  },
                ]}
              >
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
    backgroundColor: '#ffffff',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 18,
  },
  sectionBlock: {
    gap: 7,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  inputField: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  descField: {
    textAlignVertical: 'top',
    height: 80,
    lineHeight: 20,
  },
  launchBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    marginTop: 6,
  },
  launchBtnText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
    backgroundColor: '#ffffff',
  },
  loaderStatus: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0f172a',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  creditsButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  creditsButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  errorText: {
    flex: 1,
    color: '#dc2626',
    fontSize: 12.5,
    fontWeight: '500',
  },
});
