import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors, Fonts, Layout } from '@/constants/theme';
import { PrimaryButton } from '@/src/components/primary-button';
import { useTwogetherStore } from '@/src/store/twogether-store';

function isValidPairContact(value: string) {
  const trimmed = value.trim();
  const isEmail = /\S+@\S+\.\S+/.test(trimmed);
  const isPhone = /^[+]?[\d\s().-]{7,}$/.test(trimmed);
  return isEmail || isPhone;
}

type PairMode = 'invite' | 'join';

export default function PairScreen() {
  const router = useRouter();
  const requestPairing = useTwogetherStore((s) => s.requestPairing);
  const joinPairingWithInviteCode = useTwogetherStore((s) => s.joinPairingWithInviteCode);
  const [mode, setMode] = useState<PairMode>('invite');
  const [partnerName, setPartnerName] = useState('');
  const [contact, setContact] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleTranslateY = useRef(new Animated.Value(-36)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(16)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(formTranslateY, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, [formOpacity, formTranslateY, titleOpacity, titleTranslateY]);

  function resetError() {
    if (error) {
      setError(null);
    }
  }

  function toggleMode(nextMode: PairMode) {
    setMode(nextMode);
    setError(null);
  }

  async function submitInvite() {
    const trimmedPartnerName = partnerName.trim();

    if (!trimmedPartnerName) {
      setError("Enter the name of the person you're inviting.");
      return;
    }

    if (!isValidPairContact(contact)) {
      setError('Enter a valid email address or phone number.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await requestPairing({
        contact,
        partnerName: trimmedPartnerName,
      });
      router.replace('/(tabs)');
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : 'We could not send that invite.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submitJoin() {
    const trimmedInviteCode = inviteCode.trim();

    if (!trimmedInviteCode) {
      setError('Enter your invite code.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await joinPairingWithInviteCode(trimmedInviteCode);
      router.replace('/(tabs)');
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : 'We could not join that invite.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          }}>
          <Text style={styles.title}>Pair</Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: formOpacity,
              transform: [{ translateY: formTranslateY }],
            },
          ]}>
          {mode === 'invite' ? (
            <>
              <Text style={styles.hint}>
                Start by telling us who you&apos;re inviting, then add their phone number or
                email.
              </Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={partnerName}
                  onChangeText={(value) => {
                    setPartnerName(value);
                    resetError();
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  onSubmitEditing={() => {
                    void submitInvite();
                  }}
                  placeholder="Partner's name"
                  placeholderTextColor={Colors.dark.textTertiary}
                  returnKeyType="next"
                  style={styles.input}
                />
                <TextInput
                  value={contact}
                  onChangeText={(value) => {
                    setContact(value);
                    resetError();
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onSubmitEditing={() => {
                    void submitInvite();
                  }}
                  placeholder="Their email or phone"
                  placeholderTextColor={Colors.dark.textTertiary}
                  returnKeyType="done"
                  style={styles.input}
                />
              </View>
              <PrimaryButton
                label="Send invite"
                loading={submitting}
                onPress={() => {
                  void submitInvite();
                }}
              />
              <Pressable
                disabled={submitting}
                onPress={() => toggleMode('join')}
                style={({ pressed }) => [pressed ? styles.linkPressed : null]}>
                <Text style={styles.link}>My partner already has an account</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.hint}>
                If your partner already invited you, enter their invite code to join them
                directly.
              </Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={inviteCode}
                  onChangeText={(value) => {
                    setInviteCode(value.toUpperCase());
                    resetError();
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  onSubmitEditing={() => {
                    void submitJoin();
                  }}
                  placeholder="Invite code"
                  placeholderTextColor={Colors.dark.textTertiary}
                  returnKeyType="done"
                  style={styles.input}
                />
              </View>
              <PrimaryButton
                label="Join with invite code"
                loading={submitting}
                onPress={() => {
                  void submitJoin();
                }}
              />
              <Pressable
                disabled={submitting}
                onPress={() => toggleMode('invite')}
                style={({ pressed }) => [pressed ? styles.linkPressed : null]}>
                <Text style={styles.link}>I&apos;m inviting someone new</Text>
              </Pressable>
            </>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.border,
    borderRadius: Layout.radiusLg,
    borderWidth: 1,
    gap: 16,
    padding: 20,
    width: '100%',
  },
  center: {
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 28,
    width: '100%',
  },
  container: {
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    flex: 1,
    justifyContent: 'center',
  },
  error: {
    color: Colors.dark.danger,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.dark.background,
    borderColor: Colors.dark.border,
    borderRadius: 18,
    borderWidth: 1,
    color: Colors.dark.text,
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '400',
    minHeight: 58,
    paddingHorizontal: 20,
    width: '100%',
  },
  hint: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'center',
  },
  inputWrap: {
    gap: 14,
    width: '100%',
  },
  link: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  linkPressed: {
    opacity: 0.7,
  },
  title: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
