import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { WorkspaceTabsProvider } from '@/components/WorkspaceTabsProvider';
import { tokens } from '@/components/ds/tokens';

export default function TabsLayout() {
  return <WorkspaceTabsProvider>
    <NativeTabs
      backgroundColor={tokens.color.surface}
      tintColor={tokens.color.accentSelected}
      iconColor={{ default: tokens.color.inkMuted, selected: tokens.color.accentSelected }}
      labelStyle={{ default: { color: tokens.color.inkMuted }, selected: { color: tokens.color.accentSelected, fontWeight: '700' } }}
      indicatorColor={tokens.color.accentSurface}
      rippleColor={tokens.color.accentSurface}
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
        <NativeTabs.Trigger.Label selectedStyle={{ color: tokens.color.accentSelected, fontWeight: '700' }}>Bots</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('../../../assets/images/splash-logo.png')} renderingMode="template" selectedColor={tokens.color.accentSelected} />
      </NativeTabs.Trigger>
    </NativeTabs>
  </WorkspaceTabsProvider>;
}
