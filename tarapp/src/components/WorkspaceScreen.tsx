import { View } from 'react-native';

import HarnessWorkspaceCanvas, { type WorkspaceTab } from '@/components/HarnessWorkspaceCanvas';
import { useWorkspace } from '@/components/WorkspaceProvider';

export default function WorkspaceScreen({ tab }: { tab: WorkspaceTab }) {
  const { current, workspaces, selectWorkspace, createWorkspace } = useWorkspace();
  return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
    <HarnessWorkspaceCanvas
      tab={tab}
      underHeader
      scope={current.slug}
      workspaceName={current.mode === 'personal' ? 'Personal' : current.name}
      role={current.role}
      workspaces={workspaces}
      onSelectWorkspace={selectWorkspace}
      onCreateWorkspace={createWorkspace}
    />
  </View>;
}
