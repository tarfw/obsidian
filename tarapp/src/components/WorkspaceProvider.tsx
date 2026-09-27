import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import CreateWorkspace from '@/components/CreateWorkspace';
import { tokens } from '@/components/ds/tokens';
import { HarnessRequestError, harness, type HarnessWorkspace } from '@/lib/harness';
import { cachedWorkspaces } from '@/lib/now-replica';

interface WorkspaceValue {
  current: HarnessWorkspace;
  workspaces: HarnessWorkspace[];
  selectWorkspace: (slug: string) => void;
  createWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);
const sameWorkspaces = (left: HarnessWorkspace[], right: HarnessWorkspace[]) => JSON.stringify(left) === JSON.stringify(right);

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider.');
  return value;
}

export function WorkspaceProvider({ children }: React.PropsWithChildren) {
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
      setWorkspaces((previous) => sameWorkspaces(previous, result.workspaces) ? previous : result.workspaces);
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
    let active = true;
    void cachedWorkspaces().then((saved) => {
      if (active && saved?.length) {
        setWorkspaces((previous) => sameWorkspaces(previous, saved) ? previous : saved);
        setCurrent(saved[0]);
        setLoaded(true);
        setLoading(false);
      }
    }).finally(() => { if (active) void reload(); });
    return () => { active = false; };
  }, [reload]);

  const value = useMemo<WorkspaceValue | null>(() => current ? ({
    current,
    workspaces,
    selectWorkspace: (slug) => {
      const workspace = workspaces.find((item) => item.slug === slug);
      if (workspace) setCurrent(workspace);
    },
    createWorkspace: () => setCreating(true),
  }) : null, [current, workspaces]);

  if (loading && !value) return <View style={styles.center}><ActivityIndicator size="large" color={tokens.color.accent} /></View>;
  if (error && !value) return <View style={styles.center}><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => { void reload(); }} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable></View>;
  if (loaded && workspaces.length === 0) return <CreateWorkspace visible canClose={false} existingSlugs={[]} onClose={() => undefined} onSuccess={async (slug) => { await reload(slug); }} />;
  if (!value) return <View style={styles.center}><ActivityIndicator size="large" color={tokens.color.accent} /></View>;

  return <WorkspaceContext.Provider value={value}>
    {children}
    <CreateWorkspace visible={creating} canClose existingSlugs={workspaces.map((workspace) => workspace.slug)} onClose={() => setCreating(false)} onSuccess={async (slug) => { setCreating(false); await reload(slug); }} />
  </WorkspaceContext.Provider>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, backgroundColor: '#FFFFFF' },
  error: { color: '#b42318', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18 },
  retryText: { color: tokens.color.accent, fontSize: 15, fontWeight: '700' },
});
