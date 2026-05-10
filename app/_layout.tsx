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
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { AppGate } from '@/src/components/app-gate';
import { AppProviders } from '@/src/providers/app-providers';
import { hasSupabaseSync } from '@/src/lib/lovelock-supabase';
import {
  getLovelockSupabaseClient,
  hasSupabaseClientConfig,
  mapSupabaseSession,
} from '@/src/lib/supabase-client';
import { useLovelockStore } from '@/src/store/lovelock-store';

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

const SESSION_TIMER_STATUSES = new Set(['armed', 'active']);
const MAX_TIMEOUT_DELAY_MS = 2_147_483_647;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Inter_500Medium,
  });
  const hydrateAuthSession = useLovelockStore((state) => state.hydrateAuthSession);
  const consumeSupabaseAuthCallback = useLovelockStore((state) => state.consumeSupabaseAuthCallback);
  const syncAuthenticatedSession = useLovelockStore((state) => state.syncAuthenticatedSession);
  const authStatus = useLovelockStore((state) => state.authStatus);
  const savedPlacesCount = useLovelockStore((state) => state.savedPlaces.length);
  const locationAutomationEnabled = useLovelockStore((state) => state.locationAutomationEnabled);
  const refreshLocationAutomation = useLovelockStore((state) => state.refreshLocationAutomation);
  const pulseSelfAppActivity = useLovelockStore((state) => state.pulseSelfAppActivity);
  const sessions = useLovelockStore((state) => state.sessions);
  const completeSession = useLovelockStore((state) => state.completeSession);
  const completingExpiredSessionIds = useRef(new Set<string>());

  const onLayoutReady = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const completeExpiredSessions = useCallback(() => {
    const now = Date.now();
    const expiredSessions = useLovelockStore
      .getState()
      .sessions
      .filter((session) => {
        if (!SESSION_TIMER_STATUSES.has(session.status)) {
          return false;
        }

        const endAt = new Date(session.scheduledEndAt).getTime();
        return Number.isFinite(endAt) && endAt <= now;
      });

    for (const session of expiredSessions) {
      if (completingExpiredSessionIds.current.has(session.id)) {
        continue;
      }

      completingExpiredSessionIds.current.add(session.id);
      void completeSession(session.id)
        .catch(() => {})
        .finally(() => {
          completingExpiredSessionIds.current.delete(session.id);
        });
    }
  }, [completeSession]);

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

      authSubscription = getLovelockSupabaseClient().auth.onAuthStateChange((_event, session) => {
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

  useEffect(() => {
    if (authStatus !== 'authenticated' || !hasSupabaseSync()) {
      return;
    }

    void pulseSelfAppActivity();
    const interval = setInterval(() => {
      void pulseSelfAppActivity();
    }, 45_000);

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void pulseSelfAppActivity();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [authStatus, pulseSelfAppActivity]);

  useEffect(() => {
    completeExpiredSessions();

    const nextEndAt = sessions.reduce<number | null>((earliest, session) => {
      if (!SESSION_TIMER_STATUSES.has(session.status)) {
        return earliest;
      }

      const endAt = new Date(session.scheduledEndAt).getTime();
      if (!Number.isFinite(endAt)) {
        return earliest;
      }

      return earliest === null ? endAt : Math.min(earliest, endAt);
    }, null);

    if (nextEndAt === null) {
      return;
    }

    const delay = Math.min(
      Math.max(0, nextEndAt - Date.now() + 250),
      MAX_TIMEOUT_DELAY_MS
    );
    const timeout = setTimeout(completeExpiredSessions, delay);

    return () => {
      clearTimeout(timeout);
    };
  }, [completeExpiredSessions, sessions]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        completeExpiredSessions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [completeExpiredSessions]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppProviders>
      <ThemeProvider value={navigationTheme}>
        <Stack
          screenOptions={{
            animation: 'fade',
            animationDuration: 300,
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
