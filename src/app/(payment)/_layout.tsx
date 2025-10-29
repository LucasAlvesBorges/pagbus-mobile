import { Stack } from 'expo-router';

export default function PaymentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="select-busline" />
      <Stack.Screen name="select-vehicle" />
      <Stack.Screen
        name="payment-detail"
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="payment-success"
        options={{
          presentation: 'card',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}

