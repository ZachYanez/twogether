import { ThemeProvider, type Theme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { AppGate } from '@/src/components/app-gate';
import { AppProviders } from '@/src/providers/app-providers';
import { useTwogetherStore } from '@/src/store/twogether-store';

const navigationTheme: Theme = {
  dark: true,
  colors: {
    primary: Colors.dark.text,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.text,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

export default function RootLayout() {
  const hydrateAuthSession = useTwogetherStore((state) => state.hydrateAuthSession);

  useEffect(() => {
    void hydrateAuthSession();
  }, [hydrateAuthSession]);

  return (
    <AppProviders>
      <ThemeProvider value={navigationTheme}>
        <Stack
          screenOptions={{
            animation: 'fade',
            animationDuration: 250,
            headerShown: false,
            contentStyle: { backgroundColor: Colors.dark.background },
          }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="subscribe" />
          <Stack.Screen name="account" />
          <Stack.Screen name="pair" />
          <Stack.Screen name="authorization" />
          <Stack.Screen name="selection" />
          <Stack.Screen
            name="session/new"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="session/[sessionId]"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <AppGate />
        <StatusBar style="light" />
      </ThemeProvider>
    </AppProviders>
  );
}
