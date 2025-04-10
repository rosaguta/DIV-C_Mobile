import { Tabs } from 'expo-router';

import Ionicons from '@expo/vector-icons/Ionicons';


export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#000000',
        headerStyle: {
          // backgroundColor: '#25292e',
        },
        headerShadowVisible: false,
        // headerTintColor: '#fff',
        tabBarStyle: {
          // backgroundColor: '#25292e',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'DIV-Communications',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home-sharp' : 'home-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="room"
        options={{
          title: 'Room',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbox' : 'chatbox-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name='createRoom'
        options={{
          title: "Create a room",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'add-outline' : 'add-circle-outline'} color={color} size={24} />
          ),
        }}
      />
        
    </Tabs>
  );
}
