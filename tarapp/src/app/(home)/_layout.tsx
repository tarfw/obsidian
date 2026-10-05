import { Stack } from 'expo-router';

import { WorkspaceProvider } from '@/components/WorkspaceProvider';

export default function HomeLayout() {
  return <WorkspaceProvider>
    <Stack screenOptions={{ contentStyle: { backgroundColor: '#FFFFFF' }, animation: 'slide_from_right' }}>
      <Stack.Screen name="now" options={{ headerShown: false }} />
      <Stack.Screen name="tools" options={{ headerShown: false }} />
      <Stack.Screen name="ask" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="records" options={{ headerShown: false }} />
      <Stack.Screen name="routines" options={{ headerShown: false }} />
      <Stack.Screen name="open/[source]/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="record/[source]/[id]" options={{ headerShown: false }} />
    </Stack>
  </WorkspaceProvider>;
}
