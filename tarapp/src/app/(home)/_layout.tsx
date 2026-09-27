import { Stack } from 'expo-router';

import { WorkspaceProvider } from '@/components/WorkspaceProvider';

export default function HomeLayout() {
  return <WorkspaceProvider>
    <Stack screenOptions={{ contentStyle: { backgroundColor: '#FFFFFF' }, animation: 'slide_from_right' }}>
      <Stack.Screen name="now" options={{ headerShown: false }} />
      <Stack.Screen name="workspace" options={{ title: 'Workspace', headerShadowVisible: false }} />
      <Stack.Screen name="open/[source]/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="record/[source]/[id]" options={{ headerShown: false }} />
    </Stack>
  </WorkspaceProvider>;
}
