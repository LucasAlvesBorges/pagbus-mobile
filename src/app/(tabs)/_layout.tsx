import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        headerShown: false,
      }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Pagamento',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="explore" 
        options={{ 
          title: 'Outros',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="apps" size={size} color={color} />
          ),
        }} 
      />
    </Tabs>
  );
}
