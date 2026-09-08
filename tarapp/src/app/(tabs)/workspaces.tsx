import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import HarnessWorkspaceCanvas from '@/components/HarnessWorkspaceCanvas';
import CreateWorkspace from '@/components/CreateWorkspace';
import { harness, type HarnessWorkspace } from '@/lib/harness';

export default function WorkspacesScreen() {
  const [workspaces, setWorkspaces] = useState<HarnessWorkspace[]>([]);
  const [current, setCurrent] = useState<HarnessWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const reload = useCallback(async (preferredSlug?: string) => {
    setLoading(true);
    try {
      const result = await harness.listWorkspaces();
      setWorkspaces(result.workspaces);
      setCurrent((previous) => result.workspaces.find((item) => item.slug === preferredSlug)
        || result.workspaces.find((item) => item.id === previous?.id)
        || result.workspaces[0]
        || null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { const timer = setTimeout(() => { void reload(); }, 0); return () => clearTimeout(timer); }, [reload]);
  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#3559e0" /></View>;
  if (!current) return <CreateWorkspace visible canClose={false} existingSlugs={[]} onClose={() => undefined} onSuccess={async (slug) => { await reload(slug); }} />;
  return <View style={styles.page}>
    <HarnessWorkspaceCanvas
      scope={current.slug}
      workspaceName={current.mode === 'personal' ? 'Personal' : current.name}
      role={current.role}
      workspaces={workspaces}
      onSelectWorkspace={(slug) => { const workspace = workspaces.find((item) => item.slug === slug); if (workspace) setCurrent(workspace); }}
      onCreateWorkspace={() => setCreating(true)}
    />
    <CreateWorkspace visible={creating} canClose existingSlugs={workspaces.map((workspace) => workspace.slug)} onClose={() => setCreating(false)} onSuccess={async (slug) => { setCreating(false); await reload(slug); }} />
  </View>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#fff' }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' } });
