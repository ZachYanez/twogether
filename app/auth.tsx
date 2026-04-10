import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Fonts, Layout } from '@/constants/theme';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { useTwogetherStore } from '@/src/store/twogether-store';

export default function AuthScreen() {
  const router = useRouter();
  const signInWithEmailPassword = useTwogetherStore((s) => s.signInWithEmailPassword);
  const registerWithEmailPassword = useTwogetherStore((s) => s.registerWithEmailPassword);
  const pendingEmailConfirmationEmail = useTwogetherStore((s) => s.pendingEmailConfirmationEmail);
  const clearPendingEmailConfirmation = useTwogetherStore((s) => s.clearPendingEmailConfirmation);
  const requestPasswordReset = useTwogetherStore((s) => s.requestPasswordReset);
  const signInWithApple = useTwogetherStore((s) => s.signInWithApple);
  const signInWithGoogle = useTwogetherStore((s) => s.signInWithGoogle);
  const authStatus = useTwogetherStore((s) => s.authStatus);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [mode, setMode] = useState<'sign_in' | 'create_account'>('create_account');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    if (authStatus === 'authenticated') router.replace('/(tabs)');
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
    <ScreenShell title={mode === 'create_account' ? 'Create account' : 'Sign in'}>
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
            cornerRadius={12}
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
        <Text style={styles.notice}>
          {`Check ${pendingEmailConfirmationEmail} for a confirmation link. Opening it will finish signing you in.`}
        </Text>
      ) : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  appleButton: {
    height: 50,
    width: '100%',
  },
  divider: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  dividerLine: {
    backgroundColor: Colors.dark.border,
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
    gap: 12,
  },
  input: {
    backgroundColor: Colors.dark.surface,
    borderRadius: Layout.radiusMd,
    color: Colors.dark.text,
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '400',
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  link: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
  },
  notice: {
    color: Colors.dark.success,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
  },
  providers: {
    gap: 12,
  },
  segment: {
    borderRadius: Layout.radiusSm,
    flex: 1,
    paddingVertical: 10,
  },
  segmentActive: {
    backgroundColor: Colors.dark.accent,
    borderRadius: Layout.radiusSm,
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
});
