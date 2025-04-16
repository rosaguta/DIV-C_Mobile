import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ModalPortal } from 'react-native-modals';

export default function RootLayout() {
  return (
    <>
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
    <StatusBar style="dark" />
    <ModalPortal/>
    </>
  );
}
