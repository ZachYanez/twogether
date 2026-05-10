import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors, Fonts, Layout, Shadows } from '@/constants/theme';
import { PrimaryButton } from '@/src/components/primary-button';
import { useLovelockStore } from '@/src/store/lovelock-store';

type ExpoImagePicker = typeof import('expo-image-picker');

async function loadImagePicker(): Promise<ExpoImagePicker | null> {
  try {
    return await import('expo-image-picker');
  } catch {
    return null;
  }
}

export default function OnboardingScreen() {
  const router = useRouter();
  const authStatus = useLovelockStore((s) => s.authStatus);
  const authSession = useLovelockStore((s) => s.authSession);
  const currentUser = useLovelockStore((s) => s.currentUser);
  const pairingPromptAnswered = useLovelockStore((s) => s.onboarding.pairingPromptAnswered);
  const updateAccountProfilePhoto = useLovelockStore((s) => s.updateAccountProfilePhoto);
  const answerPairingPrompt = useLovelockStore((s) => s.answerPairingPrompt);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    currentUser?.avatarUrl ?? authSession?.avatarUrl ?? null
  );
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, contentTranslateY]);

  useEffect(() => {
    setAvatarUrl(currentUser?.avatarUrl ?? authSession?.avatarUrl ?? null);
  }, [authSession?.avatarUrl, currentUser?.avatarUrl]);

  const displayName = useMemo(
    () => currentUser?.displayName ?? authSession?.displayName ?? 'You',
    [authSession?.displayName, currentUser?.displayName]
  );

  async function pickProfilePhoto() {
    setBusyAction('photo');
    setError(null);

    try {
      const ImagePicker = await loadImagePicker();

      if (!ImagePicker) {
        throw new Error(
          'Photo picker is not available in this development build. Rebuild the app with expo-image-picker installed, then try again.'
        );
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        throw new Error('Allow photo access to choose a profile photo.');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ['images'],
        quality: 0.82,
      });

      if (!result.canceled) {
        const nextAvatarUrl = result.assets[0]?.uri ?? null;
        setAvatarUrl(nextAvatarUrl);
        await updateAccountProfilePhoto(nextAvatarUrl);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Profile photo could not be saved.');
    } finally {
      setBusyAction(null);
    }
  }

  async function finishOnboarding(destination: 'pair' | 'home') {
    setBusyAction(destination);
    setError(null);

    try {
      await answerPairingPrompt();
      router.replace(destination === 'pair' ? '/pair' : '/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Onboarding could not be completed.');
    } finally {
      setBusyAction(null);
    }
  }

  if (authStatus !== 'authenticated') {
    return <Redirect href="/welcome" />;
  }

  if (pairingPromptAnswered) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.orbPrimary} />
      <View style={styles.orbSecondary} />

      <Animated.ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Account setup</Text>
          <Text style={styles.title}>Make it recognizable</Text>
          <Text style={styles.subtitle}>
            Add a photo for shared invites, then choose whether to pair now or keep planning solo.
          </Text>
        </View>

        <Pressable
          onPress={() => {
            void pickProfilePhoto();
          }}
          style={({ pressed }) => [styles.photoPicker, pressed && styles.photoPickerPressed]}>
          <View style={styles.photoAvatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.photoImage} />
            ) : (
              <Ionicons name="camera-outline" size={30} color={Colors.dark.accent} />
            )}
          </View>
          <View style={styles.photoCopy}>
            <Text style={styles.photoTitle}>
              {avatarUrl ? 'Profile photo saved' : 'Upload profile photo'}
            </Text>
            <Text style={styles.photoBody}>
              {`This appears beside ${displayName}'s sessions and invites.`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.dark.textTertiary} />
        </Pressable>

        <View style={styles.pairCard}>
          <View style={styles.pairIcon}>
            <Ionicons name="heart-outline" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.pairTitle}>Have someone in mind?</Text>
          <Text style={styles.pairBody}>
            Invite them now so shared sessions can show both people, or skip and pair later.
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton
            label="Invite someone"
            loading={busyAction === 'pair'}
            onPress={() => {
              void finishOnboarding('pair');
            }}
          />
          <PrimaryButton
            label="Not right now"
            secondary
            loading={busyAction === 'home'}
            onPress={() => {
              void finishOnboarding('home');
            }}
          />
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
  },
  container: {
    backgroundColor: Colors.dark.background,
    flex: 1,
  },
  content: {
    gap: 22,
    paddingBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 92,
  },
  error: {
    color: Colors.dark.danger,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'center',
  },
  eyebrow: {
    color: Colors.dark.accentMuted,
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  header: {
    gap: 12,
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
  pairBody: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 23,
    textAlign: 'center',
  },
  pairCard: {
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.border,
    borderRadius: Layout.radiusLg,
    borderWidth: 1,
    gap: 10,
    padding: 22,
    ...Shadows.sm,
  },
  pairIcon: {
    alignItems: 'center',
    backgroundColor: Colors.dark.accent,
    borderRadius: 999,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  pairTitle: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 24,
    fontWeight: '700',
  },
  photoAvatar: {
    alignItems: 'center',
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 999,
    height: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 72,
  },
  photoBody: {
    color: Colors.dark.textTertiary,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  photoCopy: {
    flex: 1,
    gap: 4,
  },
  photoImage: {
    height: '100%',
    width: '100%',
  },
  photoPicker: {
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.border,
    borderRadius: Layout.radiusLg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    ...Shadows.sm,
  },
  photoPickerPressed: {
    opacity: 0.72,
  },
  photoTitle: {
    color: Colors.dark.text,
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 25,
  },
  title: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 46,
  },
});
