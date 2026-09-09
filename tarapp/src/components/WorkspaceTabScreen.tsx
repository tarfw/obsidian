import { View } from 'react-native';

import HarnessWorkspaceCanvas, { type WorkspaceTab } from '@/components/HarnessWorkspaceCanvas';
import { useWorkspaceTabs } from '@/components/WorkspaceTabsProvider';

export default function WorkspaceTabScreen({ tab }: { tab: WorkspaceTab }) {
  const { current, workspaces, selectWorkspace, createWorkspace } = useWorkspaceTabs();
  return <View style={{ flex: 1, backgroundColor: '#fff' }}>
    <HarnessWorkspaceCanvas
      tab={tab}
      scope={current.slug}
      workspaceName={current.mode === 'personal' ? 'Personal' : current.name}
      role={current.role}
      workspaces={workspaces}
      onSelectWorkspace={selectWorkspace}
      onCreateWorkspace={createWorkspace}
    />
  </View>;
}
