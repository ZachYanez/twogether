import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useTwogetherStore } from '@/src/store/twogether-store';

const TRANSITION_DELAY_MS = 3000;

export default function WelcomeScreen() {
  const router = useRouter();
  const authStatus = useTwogetherStore((state) => state.authStatus);
  const enterPreviewMode = useTwogetherStore((state) => state.enterPreviewMode);

  const titleTranslateY = useRef(new Animated.Value(-40)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [titleTranslateY, titleOpacity, subtitleOpacity]);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
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
      <View style={styles.center}>
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}>
          Twogether
        </Animated.Text>
        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
          More Quality Time. Less Screen Time.
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
    gap: 16,
  },
  container: {
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  devLink: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  devRow: {
    bottom: 60,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 18,
    fontWeight: '400',
    letterSpacing: 0.2,
    lineHeight: 26,
    textAlign: 'center',
  },
  title: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
