import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import {
  Inter_500Medium,
} from '@expo-google-fonts/inter';
import { ThemeProvider, type Theme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { AppGate } from '@/src/components/app-gate';
import { AppProviders } from '@/src/providers/app-providers';
import {
  getTwogetherSupabaseClient,
  hasSupabaseClientConfig,
  mapSupabaseSession,
} from '@/src/lib/supabase-client';
import { useTwogetherStore } from '@/src/store/twogether-store';

SplashScreen.preventAutoHideAsync();

const navigationTheme: Theme = {
  dark: false,
  colors: {
    primary: Colors.dark.accent,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.accent,
  },
  fonts: {
    regular: { fontFamily: 'Manrope_400Regular', fontWeight: '400' },
    medium: { fontFamily: 'Inter_500Medium', fontWeight: '500' },
    bold: { fontFamily: 'Manrope_700Bold', fontWeight: '700' },
    heavy: { fontFamily: 'Manrope_700Bold', fontWeight: '800' },
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Inter_500Medium,
  });
  const hydrateAuthSession = useTwogetherStore((state) => state.hydrateAuthSession);
  const consumeSupabaseAuthCallback = useTwogetherStore((state) => state.consumeSupabaseAuthCallback);
  const syncAuthenticatedSession = useTwogetherStore((state) => state.syncAuthenticatedSession);
  const authStatus = useTwogetherStore((state) => state.authStatus);
  const savedPlacesCount = useTwogetherStore((state) => state.savedPlaces.length);
  const locationAutomationEnabled = useTwogetherStore((state) => state.locationAutomationEnabled);
  const refreshLocationAutomation = useTwogetherStore((state) => state.refreshLocationAutomation);

  const onLayoutReady = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    let mounted = true;
    let urlSubscription: { remove: () => void } | null = null;
    let authSubscription: { unsubscribe: () => void } | null = null;

    async function bootstrap() {
      const supabaseEnabled = hasSupabaseClientConfig();

      if (hasSupabaseClientConfig()) {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const handled = await consumeSupabaseAuthCallback(initialUrl);
          if (handled || !mounted) {
            return true;
          }
        }
      }

      if (mounted) {
        await hydrateAuthSession();
      }

      if (!mounted || !supabaseEnabled) {
        return false;
      }

      urlSubscription = Linking.addEventListener('url', ({ url }) => {
        void consumeSupabaseAuthCallback(url);
      });

      authSubscription = getTwogetherSupabaseClient().auth.onAuthStateChange((_event, session) => {
        if (!session) {
          return;
        }

        void syncAuthenticatedSession(mapSupabaseSession(session));
      }).data.subscription;

      return false;
    }

    void bootstrap();

    return () => {
      mounted = false;
      urlSubscription?.remove();
      authSubscription?.unsubscribe();
    };
  }, [consumeSupabaseAuthCallback, hydrateAuthSession, syncAuthenticatedSession]);

  useEffect(() => {
    void onLayoutReady();
  }, [onLayoutReady]);

  useEffect(() => {
    if (
      authStatus !== 'authenticated' ||
      !locationAutomationEnabled ||
      savedPlacesCount === 0
    ) {
      return;
    }

    void refreshLocationAutomation();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshLocationAutomation();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [
    authStatus,
    locationAutomationEnabled,
    refreshLocationAutomation,
    savedPlacesCount,
  ]);

  if (!fontsLoaded) {
    return null;
  }

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
          <Stack.Screen name="places" />
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
        <StatusBar style="dark" />
      </ThemeProvider>
    </AppProviders>
  );
}
