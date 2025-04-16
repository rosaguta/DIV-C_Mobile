import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {},
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'DIV-Communications',
        }}
      />
      <Stack.Screen
        name='createRoom'
        options={{
          title: "Create a meeting",
        }}
      />
      <Stack.Screen
        name="meeting"
        options={({route})=>({
          title: route.params?.meetingName || "New meeting"
        })}
      />
    </Stack>
  );
}