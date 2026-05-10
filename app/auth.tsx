import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors, Fonts, Layout, Shadows } from '@/constants/theme';
import { BackButton } from '@/src/components/back-button';
import { PrimaryButton } from '@/src/components/primary-button';
import { useLovelockStore } from '@/src/store/lovelock-store';

export default function AuthScreen() {
  const router = useRouter();
  const signInWithEmailPassword = useLovelockStore((s) => s.signInWithEmailPassword);
  const registerWithEmailPassword = useLovelockStore((s) => s.registerWithEmailPassword);
  const pendingEmailConfirmationEmail = useLovelockStore((s) => s.pendingEmailConfirmationEmail);
  const clearPendingEmailConfirmation = useLovelockStore((s) => s.clearPendingEmailConfirmation);
  const requestPasswordReset = useLovelockStore((s) => s.requestPasswordReset);
  const signInWithApple = useLovelockStore((s) => s.signInWithApple);
  const signInWithGoogle = useLovelockStore((s) => s.signInWithGoogle);
  const authStatus = useLovelockStore((s) => s.authStatus);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [mode, setMode] = useState<'sign_in' | 'create_account'>('create_account');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, contentTranslateY]);

  useEffect(() => {
    let mounted = true;
    async function check() {
      const available =
        Platform.OS === 'ios' ? await AppleAuthentication.isAvailableAsync() : false;
      if (mounted) setAppleAvailable(available);
    }
    void check();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated') router.replace('/onboarding');
  }, [authStatus, router]);

  async function runProvider(
    provider: string,
    action: () => Promise<void>
  ) {
    setLoadingProvider(provider);
    clearPendingEmailConfirmation();
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed.');
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.orbPrimary} />
      <View style={styles.orbSecondary} />
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>
        <BackButton />
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === 'create_account' ? 'Create\naccount' : 'Welcome\nback'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'create_account'
              ? 'Start protecting your quality time together.'
              : 'Sign in to pick up where you left off.'}
          </Text>
        </View>

        <View style={styles.segmentRow}>
          {(['create_account', 'sign_in'] as const).map((id) => {
            const selected = id === mode;
            return (
              <Pressable
                key={id}
                onPress={() => {
                  setMode(id);
                  clearPendingEmailConfirmation();
                  setError(null);
                  setNotice(null);
                }}
                style={[styles.segment, selected && styles.segmentActive]}>
                <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
                  {id === 'create_account' ? 'Create' : 'Sign in'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.form}>
          {mode === 'create_account' ? (
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Display name"
              placeholderTextColor={Colors.dark.textTertiary}
              style={styles.input}
            />
          ) : null}
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor={Colors.dark.textTertiary}
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
            placeholderTextColor={Colors.dark.textTertiary}
            style={styles.input}
          />
          <PrimaryButton
            label={mode === 'create_account' ? 'Create account' : 'Sign in'}
            loading={loadingProvider === 'password'}
            onPress={() =>
              runProvider('password', () =>
                mode === 'create_account'
                  ? registerWithEmailPassword({ email, password, displayName })
                  : signInWithEmailPassword({ email, password, displayName })
              )
            }
          />
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.providers}>
          {appleAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={Layout.radiusMd}
              style={styles.appleButton}
              onPress={() => runProvider('apple', signInWithApple)}
            />
          ) : null}
          <PrimaryButton
            label="Continue with Google"
            secondary
            loading={loadingProvider === 'google'}
            onPress={() => runProvider('google', signInWithGoogle)}
          />
        </View>

        <Pressable
          onPress={() =>
            runProvider('password_reset', async () => {
              const message = await requestPasswordReset(email);
              setNotice(message);
            })
          }>
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {pendingEmailConfirmationEmail ? (
          <View style={styles.noticeCard}>
            <Text style={styles.notice}>
              {`Check ${pendingEmailConfirmationEmail} for a confirmation link. Opening it will finish signing you in.`}
            </Text>
          </View>
        ) : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  appleButton: {
    height: 52,
    width: '100%',
  },
  container: {
    backgroundColor: Colors.dark.background,
    flex: 1,
  },
  divider: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 4,
  },
  dividerLine: {
    backgroundColor: Colors.dark.separator,
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    color: Colors.dark.textTertiary,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '500',
  },
  error: {
    color: Colors.dark.danger,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
  },
  form: {
    gap: 14,
  },
  header: {
    gap: 12,
    paddingTop: 8,
  },
  input: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderColor: Colors.dark.border,
    borderRadius: Layout.radiusMd,
    borderWidth: 1,
    color: Colors.dark.text,
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '400',
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  link: {
    color: Colors.dark.accentMuted,
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  notice: {
    color: Colors.dark.success,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'center',
  },
  noticeCard: {
    backgroundColor: 'rgba(45, 155, 78, 0.06)',
    borderColor: 'rgba(45, 155, 78, 0.12)',
    borderRadius: Layout.radiusMd,
    borderWidth: 1,
    padding: 16,
  },
  orbPrimary: {
    backgroundColor: 'rgba(93, 26, 26, 0.05)',
    borderRadius: 999,
    height: 280,
    position: 'absolute',
    right: -80,
    top: -60,
    width: 280,
  },
  orbSecondary: {
    backgroundColor: 'rgba(217, 197, 178, 0.15)',
    borderRadius: 999,
    bottom: -60,
    height: 220,
    left: -60,
    position: 'absolute',
    width: 220,
  },
  providers: {
    gap: 12,
  },
  scrollContent: {
    gap: 24,
    paddingBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  segment: {
    borderRadius: Layout.radiusSm,
    flex: 1,
    paddingVertical: 11,
  },
  segmentActive: {
    backgroundColor: Colors.dark.accent,
    ...Shadows.sm,
  },
  segmentRow: {
    backgroundColor: Colors.dark.surface,
    borderRadius: Layout.radiusSm,
    flexDirection: 'row',
    padding: 3,
  },
  segmentText: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: 0.1,
    lineHeight: 26,
  },
  title: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 44,
  },
});
