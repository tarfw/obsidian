import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import CreateWorkspace from '@/components/CreateWorkspace';
import { HarnessRequestError, harness, type HarnessWorkspace } from '@/lib/harness';

interface WorkspaceTabsValue {
  current: HarnessWorkspace;
  workspaces: HarnessWorkspace[];
  selectWorkspace: (slug: string) => void;
  createWorkspace: () => void;
}

const WorkspaceTabsContext = createContext<WorkspaceTabsValue | null>(null);

export function useWorkspaceTabs() {
  const value = useContext(WorkspaceTabsContext);
  if (!value) throw new Error('useWorkspaceTabs must be used inside WorkspaceTabsProvider.');
  return value;
}

export function WorkspaceTabsProvider({ children }: React.PropsWithChildren) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<HarnessWorkspace[]>([]);
  const [current, setCurrent] = useState<HarnessWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async (preferredSlug?: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await harness.listWorkspaces();
      setWorkspaces(result.workspaces);
      setCurrent((previous) => result.workspaces.find((item) => item.slug === preferredSlug)
        || result.workspaces.find((item) => item.id === previous?.id)
        || result.workspaces[0]
        || null);
      setLoaded(true);
    } catch (cause) {
      if (cause instanceof HarnessRequestError && cause.status === 401) {
        router.replace('/auth');
        return;
      }
      setError(cause instanceof Error ? cause.message : 'Could not load your workspaces.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => { void reload(); }, 0);
    return () => clearTimeout(timer);
  }, [reload]);

  const value = useMemo<WorkspaceTabsValue | null>(() => current ? ({
    current,
    workspaces,
    selectWorkspace: (slug) => {
      const workspace = workspaces.find((item) => item.slug === slug);
      if (workspace) setCurrent(workspace);
    },
    createWorkspace: () => setCreating(true),
  }) : null, [current, workspaces]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3559e0" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => { void reload(); }} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable></View>;
  if (loaded && workspaces.length === 0) return <CreateWorkspace visible canClose={false} existingSlugs={[]} onClose={() => undefined} onSuccess={async (slug) => { await reload(slug); }} />;
  if (!value) return <View style={styles.center}><ActivityIndicator size="large" color="#3559e0" /></View>;

  return <WorkspaceTabsContext.Provider value={value}>
    {children}
    <CreateWorkspace visible={creating} canClose existingSlugs={workspaces.map((workspace) => workspace.slug)} onClose={() => setCreating(false)} onSuccess={async (slug) => { setCreating(false); await reload(slug); }} />
  </WorkspaceTabsContext.Provider>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, backgroundColor: '#fff' },
  error: { color: '#b42318', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18 },
  retryText: { color: '#3559e0', fontSize: 15, fontWeight: '700' },
});
