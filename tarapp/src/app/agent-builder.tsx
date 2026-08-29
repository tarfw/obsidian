import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AgentBuilder from '@/components/AgentBuilder';

export default function AgentBuilderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scope?: string; workspaceName?: string }>();

  return (
    <AgentBuilder
      visible={true}
      onClose={() => router.back()}
      scope={params.scope || 'p'}
      workspaceName={params.workspaceName || 'Workspace'}
      onSaved={() => {
        router.back();
      }}
    />
  );
}
