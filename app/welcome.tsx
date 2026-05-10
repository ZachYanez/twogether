import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useLovelockStore } from '@/src/store/lovelock-store';

const TRANSITION_DELAY_MS = 3000;

export default function WelcomeScreen() {
  const router = useRouter();
  const authStatus = useLovelockStore((state) => state.authStatus);
  const enterPreviewMode = useLovelockStore((state) => state.enterPreviewMode);

  const titleTranslateY = useRef(new Animated.Value(24)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(12)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const orbScale = useRef(new Animated.Value(0.6)).current;
  const orbOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(orbScale, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(orbOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [titleTranslateY, titleOpacity, subtitleOpacity, subtitleTranslateY, orbScale, orbOpacity]);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        router.replace('/auth');
      });
    }, TRANSITION_DELAY_MS);

    return () => clearTimeout(timer);
  }, [router, screenOpacity]);

  if (authStatus === 'authenticated') {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <Animated.View
        style={[
          styles.orbPrimary,
          { opacity: orbOpacity, transform: [{ scale: orbScale }] },
        ]}
      />
      <Animated.View
        style={[
          styles.orbSecondary,
          { opacity: orbOpacity, transform: [{ scale: orbScale }] },
        ]}
      />

      <View style={styles.center}>
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}>
          Love Lock
        </Animated.Text>
        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            },
          ]}>
          More quality time.{'\n'}Less screen time.
        </Animated.Text>
      </View>

      {__DEV__ ? (
        <Animated.View style={[styles.devRow, { opacity: subtitleOpacity }]}>
          <Animated.Text
            style={styles.devLink}
            onPress={() => {
              enterPreviewMode();
              router.replace('/(tabs)');
            }}>
            Preview app
          </Animated.Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: 20,
  },
  container: {
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  devLink: {
    color: Colors.dark.textTertiary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  devRow: {
    bottom: 60,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  orbPrimary: {
    backgroundColor: 'rgba(93, 26, 26, 0.06)',
    borderRadius: 999,
    height: 320,
    position: 'absolute',
    right: -60,
    top: -40,
    width: 320,
  },
  orbSecondary: {
    backgroundColor: 'rgba(217, 197, 178, 0.20)',
    borderRadius: 999,
    bottom: -80,
    height: 260,
    left: -80,
    position: 'absolute',
    width: 260,
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 18,
    fontWeight: '400',
    letterSpacing: 0.2,
    lineHeight: 28,
    textAlign: 'center',
  },
  title: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 46,
    fontWeight: '700',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
});
