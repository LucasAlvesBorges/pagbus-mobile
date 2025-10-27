import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="payment/index" options={{ headerShown: false }} />
      <Stack.Screen
        name="payment-detail"
        options={{
          presentation: 'card',
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="payment-success"
        options={{
          presentation: 'card',
          headerShown: false,
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      <StatusBar style="auto" />
    </Stack>
  );
}
