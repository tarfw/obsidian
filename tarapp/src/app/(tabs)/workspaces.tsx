import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import Ionicons from '@expo/vector-icons/Ionicons';
import { tar, type WorkspaceSummary } from '@/lib/tar';
import HarnessWorkspaceCanvas from '@/components/HarnessWorkspaceCanvas';
import CreateWorkspace from '@/components/CreateWorkspace';
import { signOutGoogle } from '@/lib/auth';
import { EphemeralPlanCanvas } from '@/components/plans';

const PERSONAL_WORKSPACE: WorkspaceSummary = {
  id: 'personal',
  name: 'My Work',
  slug: 'personal',
  subdomain: 'personal',
  scope: 'p',
  role: 'owner',
  state: 'active',
};
const CREDIT_BALANCE_KEY = 'cached_credit_balance';

export default function WorkspacesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ subdomain?: string }>();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showWorkspaceCreator, setShowWorkspaceCreator] = useState(false);
  const [showPlanManager, setShowPlanManager] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const loadWorkspaces = useCallback(async (preferredSubdomain?: string) => {
    setLoading(true);
    try {
      const result = await tar.listWorkspaces();
      const remoteWorkspaces = result.workspaces || [];
      const nextWorkspaces = remoteWorkspaces.some((workspace) => workspace.scope === 'p')
        ? remoteWorkspaces
        : [PERSONAL_WORKSPACE, ...remoteWorkspaces];
      const savedSubdomain = preferredSubdomain || await SecureStore.getItemAsync('active_workspace_subdomain');
      const selected = nextWorkspaces.find((workspace) => workspace.subdomain === savedSubdomain && workspace.state === 'active')
        || nextWorkspaces.find((workspace) => workspace.state === 'active')
        || nextWorkspaces[0]
        || PERSONAL_WORKSPACE;
      setWorkspaces(nextWorkspaces);
      setCurrentWorkspace(selected);
    } catch {
      setWorkspaces([PERSONAL_WORKSPACE]);
      setCurrentWorkspace(PERSONAL_WORKSPACE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadTimer = setTimeout(() => { void loadWorkspaces(params.subdomain); }, 0);
    return () => clearTimeout(loadTimer);
  }, [loadWorkspaces, params.subdomain]);

  useEffect(() => {
    if (!showSwitcher) return;
    void SecureStore.getItemAsync(CREDIT_BALANCE_KEY).then((cached) => {
      if (cached !== null && Number.isFinite(Number(cached))) setWalletBalance(Number(cached));
    });
    void tar.wallet().then((result) => {
      const balance = result.wallet?.balance ?? 0;
      setWalletBalance(balance);
      return SecureStore.setItemAsync(CREDIT_BALANCE_KEY, String(balance));
    }).catch(() => undefined);
  }, [showSwitcher]);

  const selectWorkspace = async (workspace: WorkspaceSummary) => {
    setCurrentWorkspace(workspace);
    setShowSwitcher(false);
    await SecureStore.setItemAsync('active_workspace_subdomain', workspace.subdomain).catch(() => null);
  };

  const signOut = () => {
    Alert.alert('Sign out?', 'You can sign in again at any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive', onPress: () => {
          void (async () => {
            await signOutGoogle();
            await SecureStore.deleteItemAsync('active_workspace_subdomain');
            setShowSwitcher(false);
            router.replace('/auth');
          })();
        },
      },
    ]);
  };

  if (loading || !currentWorkspace) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#1a73e8" /></View>;
  }

  return (
    <View style={styles.container}>
      <HarnessWorkspaceCanvas
        key={currentWorkspace.scope}
        scope={currentWorkspace.scope}
        workspaceName={currentWorkspace.name || currentWorkspace.subdomain}
        workspaceNames={Object.fromEntries(workspaces.flatMap((workspace) => [[workspace.id, workspace.name || workspace.subdomain], [workspace.scope, workspace.name || workspace.subdomain], [workspace.subdomain, workspace.name || workspace.subdomain]]))}
        onOpenWorkspace={(workspaceId) => { const workspace = workspaces.find((item) => item.id === workspaceId); if (workspace) void selectWorkspace(workspace); }}
        onOpenWorkspaceSwitcher={() => setShowSwitcher(true)}
      />

      <Modal visible={showSwitcher} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowSwitcher(false)}>
        <View style={[styles.switcher, { paddingTop: Math.max(insets.top, 12) }]}>
          <View style={styles.switcherHeader}>
            <TouchableOpacity onPress={() => setShowSwitcher(false)} style={styles.iconButton}><Ionicons name="arrow-back" size={20} color="#202124" /></TouchableOpacity>
            <Text style={styles.switcherTitle}>Workspaces</Text>
            <TouchableOpacity onPress={() => { setShowSwitcher(false); setShowWorkspaceCreator(true); }} style={styles.newButton}><Text style={styles.newButtonText}>New</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={[styles.workspaceList, { paddingBottom: 16 + insets.bottom }]}>
            {workspaces.map((workspace) => {
              const selected = workspace.scope === currentWorkspace.scope;
              return (
                <TouchableOpacity key={workspace.scope} disabled={workspace.state !== 'active'} onPress={() => { void selectWorkspace(workspace); }} style={[styles.workspaceRow, workspace.state !== 'active' && styles.workspaceRowPending]}>
                  <View style={styles.workspaceIcon}><Text style={styles.workspaceInitial}>{(workspace.name || workspace.subdomain).charAt(0).toUpperCase()}</Text></View>
                  <View style={styles.workspaceCopy}>
                    <Text style={styles.workspaceTitle}>{workspace.name || workspace.subdomain}</Text>
                    <Text style={styles.workspaceMeta}>{workspace.state === 'active' ? (workspace.role === 'owner' ? 'Owner' : 'Team member') : 'Preparing workspace'}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark" size={20} color="#1a73e8" />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={styles.creditsButton}
            onPress={() => { setShowSwitcher(false); setShowPlanManager(true); }}
          >
            <View style={styles.creditsCopy}>
              <Text style={styles.creditsLabel}>Credits</Text>
              <Text style={styles.creditsMeta}>{`${(walletBalance ?? 0).toLocaleString('en-IN')} available`}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#5f6368" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.signOutButton, { marginBottom: Math.max(insets.bottom, 16) }]} onPress={signOut}>
            <Ionicons name="log-out-outline" size={19} color="#5f6368" />
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <EphemeralPlanCanvas
        visible={showPlanManager}
        onClose={() => setShowPlanManager(false)}
        workspaceName={currentWorkspace.name}
        subdomain={currentWorkspace.subdomain}
        scope={currentWorkspace.scope}
        workspaces={workspaces}
      />

      <CreateWorkspace
        visible={showWorkspaceCreator}
        canClose={workspaces.length > 0}
        existingSubdomains={workspaces.map((workspace) => workspace.subdomain)}
        onClose={() => setShowWorkspaceCreator(false)}
        onSuccess={async (subdomain) => {
          setShowWorkspaceCreator(false);
          await loadWorkspaces(subdomain);
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  switcher: { flex: 1, backgroundColor: '#ffffff' },
  switcherHeader: { height: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e8eaed' },
  iconButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  switcherTitle: { color: '#202124', fontSize: 17, fontWeight: '700' },
  newButton: { width: 42, height: 34, alignItems: 'flex-end', justifyContent: 'center' },
  newButtonText: { color: '#1a73e8', fontSize: 14, fontWeight: '700' },
  workspaceList: { flexGrow: 1, paddingHorizontal: 16 },
  workspaceRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e8eaed' },
  workspaceRowPending: { opacity: 0.55 },
  workspaceIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8f0fe' },
  workspaceInitial: { color: '#1a73e8', fontSize: 17, fontWeight: '800' },
  workspaceCopy: { flex: 1 },
  workspaceTitle: { color: '#202124', fontSize: 15, fontWeight: '700' },
  workspaceMeta: { color: '#5f6368', fontSize: 12, marginTop: 2 },
  signOutButton: { minHeight: 52, marginHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e8eaed', flexDirection: 'row', alignItems: 'center', gap: 10 },
  signOutText: { color: '#5f6368', fontSize: 15, fontWeight: '600' },
  creditsButton: { minHeight: 62, marginHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e8eaed', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  creditsCopy: { gap: 3 },
  creditsLabel: { color: '#202124', fontSize: 15, fontWeight: '700' },
  creditsMeta: { color: '#5f6368', fontSize: 12 },
});
