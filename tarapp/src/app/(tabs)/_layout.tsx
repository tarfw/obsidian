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
      <NativeTabs.Trigger name="space">
        <NativeTabs.Trigger.Label>Space</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.2.layers.3d', selected: 'square.2.layers.3d.fill' }} md="workspaces" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inbox">
        <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'tray', selected: 'tray.fill' }} md="inbox" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ask">
        <NativeTabs.Trigger.Label>Ask TAR</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bubble.left', selected: 'bubble.left.fill' }} md="chat_bubble" />
      </NativeTabs.Trigger>
    </NativeTabs>
  </WorkspaceTabsProvider>;
}
