import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar, setStatusBarHidden } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';

export default function RootLayout() {
  useEffect(() => {
    setStatusBarHidden(true, 'fade');

    if (Platform.OS === 'android') {
      void NavigationBar.setBehaviorAsync('overlay-swipe');
      void NavigationBar.setBackgroundColorAsync('transparent');
      void NavigationBar.setVisibilityAsync('hidden');
    }

    return () => {
      setStatusBarHidden(false, 'fade');
      if (Platform.OS === 'android') {
        void NavigationBar.setVisibilityAsync('visible');
      }
    };
  }, []);

  return (
    <>
      <StatusBar hidden style="light" translucent />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(payment)" />
      </Stack>
    </>
  );
}
