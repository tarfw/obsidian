import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { WorkspaceTabsProvider } from '@/components/WorkspaceTabsProvider';

export default function TabsLayout() {
  return <WorkspaceTabsProvider>
    <NativeTabs
      backgroundColor="#FFFFFF"
      tintColor="#3559E0"
      iconColor={{ default: '#737985', selected: '#3559E0' }}
      labelStyle={{ default: { color: '#737985' }, selected: { color: '#3559E0', fontWeight: '700' } }}
      indicatorColor="#E8EEFF"
      rippleColor="#DCE5FF"
      backBehavior="history">
      <NativeTabs.Trigger name="canvas">
        <NativeTabs.Trigger.Label>Space</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.2.layers.3d', selected: 'square.2.layers.3d.fill' }} md="workspaces" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inbox">
        <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'tray', selected: 'tray.fill' }} md="inbox" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="records">
        <NativeTabs.Trigger.Label>Records</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'folder', selected: 'folder.fill' }} md="folder" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bots">
        <NativeTabs.Trigger.Label selectedStyle={{ color: '#13795B', fontWeight: '700' }}>Bots</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('../../../assets/images/splash-logo.png')} renderingMode="template" selectedColor="#13795B" />
      </NativeTabs.Trigger>
    </NativeTabs>
  </WorkspaceTabsProvider>;
}
