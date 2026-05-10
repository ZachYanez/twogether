import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ImageBackground,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

import { Fonts } from '@/constants/theme';
import { DrawerMenuButton } from '@/src/components/drawer-menu-button';
import { FrostedCard } from '@/src/components/frosted-card';
import { PrimaryButton } from '@/src/components/primary-button';
import {
  computeSharedLockedDurationMs,
  computeTotalLockedDurationMs,
  formatTogetherLockedDisplay,
  formatTotalLockedDisplay,
} from '@/src/lib/time';
import type { Couple, User } from '@/src/lib/lovelock-types';
import { getDailyQuote } from '@/src/lib/daily-quotes';
import { useLovelockStore } from '@/src/store/lovelock-store';

const HOME_BACKGROUND_URL =
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80';

const LIVE_PRESENCE_MS = 120_000;

function hasActiveCompanion(couple: Couple | null, partner: User | null): partner is User {
  return Boolean(
    couple?.status === 'active' && partner && !partner.id.startsWith('pending-')
  );
}

function isPartnerAppLive(lastAppActiveAt: string | null | undefined) {
  if (!lastAppActiveAt) {
    return false;
  }
  const t = new Date(lastAppActiveAt).getTime();
  if (!Number.isFinite(t)) {
    return false;
  }
  return Date.now() - t < LIVE_PRESENCE_MS;
}

function companionInitial(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

export default function HomeScreen() {
  const router = useRouter();
  const couple = useLovelockStore((s) => s.couple);
  const partner = useLovelockStore((s) => s.partner);
  const currentUser = useLovelockStore((s) => s.currentUser);
  const pairingPromptAnswered = useLovelockStore((s) => s.onboarding.pairingPromptAnswered);
  const answerPairingPrompt = useLovelockStore((s) => s.answerPairingPrompt);
  const sessions = useLovelockStore((s) => s.sessions);
  const activeLocationSuggestion = useLovelockStore((s) => s.activeLocationSuggestion);
  const startLocationSuggestedSession = useLovelockStore((s) => s.startLocationSuggestedSession);
  const dismissLocationSuggestion = useLovelockStore((s) => s.dismissLocationSuggestion);
  const refreshPartnerPresence = useLovelockStore((s) => s.refreshPartnerPresence);

  const [pairPromptVisible, setPairPromptVisible] = useState(false);
  const [lockedStatTick, setLockedStatTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLockedStatTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(16)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;
  const cardsTranslateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(cardsOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardsTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [headerOpacity, headerTranslateY, cardsOpacity, cardsTranslateY]);

  useEffect(() => {
    if (currentUser && !partner && !couple && !pairingPromptAnswered) {
      setPairPromptVisible(true);
    }
  }, [couple, currentUser, pairingPromptAnswered, partner]);

  const isPairPending = couple?.status === 'pending' && Boolean(partner);
  const dailyQuote = getDailyQuote();
  const activeCompanion = hasActiveCompanion(couple, partner);
  const partnerLive = activeCompanion && isPartnerAppLive(partner.lastAppActiveAt);

  useFocusEffect(
    useCallback(() => {
      if (!activeCompanion) {
        return;
      }
      void refreshPartnerPresence();
      const id = setInterval(() => {
        void refreshPartnerPresence();
      }, 30_000);
      return () => clearInterval(id);
    }, [activeCompanion, refreshPartnerPresence])
  );

  const totalLockedDisplay = useMemo(
    () =>
      formatTotalLockedDisplay(
        computeTotalLockedDurationMs(sessions, new Date())
      ),
    [lockedStatTick, sessions]
  );

  const togetherLockedDisplay = useMemo(
    () =>
      formatTogetherLockedDisplay(
        computeSharedLockedDurationMs(sessions, new Date())
      ),
    [lockedStatTick, sessions]
  );

  const startSuggestedSession = useCallback(async () => {
    const sessionId = await startLocationSuggestedSession();
    if (sessionId) {
      router.push(`/session/${sessionId}`);
    }
  }, [router, startLocationSuggestedSession]);

  return (
    <ImageBackground source={{ uri: HOME_BACKGROUND_URL }} style={styles.background}>
      <View style={styles.scrim} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <DrawerMenuButton tint="dark" />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              styles.header,
              { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] },
            ]}>
            <Text style={styles.subtitle}>
              Presence feels better when the world gets quieter.
            </Text>
          </Animated.View>

          <Animated.View
            style={{
              gap: 16,
              opacity: cardsOpacity,
              transform: [{ translateY: cardsTranslateY }],
            }}>
            <FrostedCard>
              <View style={styles.lockedCardHeader}>
                <View style={styles.lockedIconWrap}>
                  <Ionicons name="lock-closed-outline" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.cardEyebrow}>Total hours locked</Text>
              </View>
              <Text style={styles.lockedStatValue}>{totalLockedDisplay.value}</Text>
              <Text style={styles.lockedStatUnit}>{totalLockedDisplay.unitLine}</Text>
              <Text style={styles.cardBody}>
                Time in sessions where restrictions were active on your device, including any
                session in progress right now.
              </Text>
            </FrostedCard>

            {!activeCompanion && !isPairPending ? (
              <Pressable
                accessibilityLabel="Add a companion. Opens pairing to invite or join."
                accessibilityRole="button"
                onPress={() => router.push('/pair')}>
                <FrostedCard>
                  <View style={styles.companionInviteHeader}>
                    <View style={styles.companionInviteTitleRow}>
                      <View style={styles.companionInviteIcon}>
                        <Ionicons name="people-outline" size={22} color="#FFFFFF" />
                      </View>
                      <Text style={styles.cardEyebrow}>Your companion</Text>
                    </View>
                    <View style={styles.companionAddButton} importantForAccessibility="no">
                      <Ionicons name="add" size={26} color="#FFFFFF" />
                    </View>
                  </View>
                  <Text style={styles.cardTitle}>Add someone you protect time with</Text>
                  <Text style={styles.cardBody}>
                    Pair in Love Lock to share sessions, see time locked together, and know when
                    they are here in the app with you.
                  </Text>
                  <Text style={styles.companionInviteCta}>Tap to invite or join</Text>
                </FrostedCard>
              </Pressable>
            ) : null}

            {activeCompanion ? (
              <FrostedCard>
                <Text style={styles.cardEyebrow}>Together</Text>
                <View style={styles.companionRow}>
                  <View style={styles.companionAvatarWrap}>
                    {partner.avatarUrl ? (
                      <Image
                        source={{ uri: partner.avatarUrl }}
                        style={styles.companionAvatar}
                        contentFit="cover"
                        accessibilityLabel={partner.displayName}
                      />
                    ) : (
                      <View style={[styles.companionAvatar, styles.companionAvatarFallback]}>
                        <Text style={styles.companionAvatarInitial}>
                          {companionInitial(partner.displayName)}
                        </Text>
                      </View>
                    )}
                    {partnerLive ? <View style={styles.companionLiveDot} /> : null}
                  </View>
                  <View style={styles.companionMeta}>
                    <Text style={styles.companionName}>{partner.displayName}</Text>
                    <Text style={styles.companionStatValue}>{togetherLockedDisplay.value}</Text>
                    <Text style={styles.companionStatUnit}>{togetherLockedDisplay.unitLine}</Text>
                  </View>
                </View>
                <Text style={styles.cardBody}>
                  Shared sessions only. The green dot appears when they have Love Lock open on
                  their phone right now.
                </Text>
              </FrostedCard>
            ) : null}

            <FrostedCard>
              <Text style={styles.quoteText}>{`\u201C${dailyQuote}\u201D`}</Text>
            </FrostedCard>

            {isPairPending ? (
              <FrostedCard>
                <Text style={styles.cardEyebrow}>Pending invite</Text>
                <Text style={styles.cardTitle}>Waiting for them to accept</Text>
                <Text style={styles.cardBody}>
                  {`We notified ${partner?.displayName ?? 'your person'}. Once they accept, your shared sessions will show up here.`}
                </Text>
              </FrostedCard>
            ) : null}

            {activeLocationSuggestion ? (
              <FrostedCard>
                <View style={styles.suggestionHeader}>
                  <View style={styles.suggestionDot} />
                  <Text style={styles.cardEyebrow}>Same place detected</Text>
                </View>
                <Text style={styles.cardTitle}>
                  {`You and ${partner?.displayName ?? 'your partner'} are at ${activeLocationSuggestion.placeLabel}`}
                </Text>
                <Text style={styles.cardBody}>
                  Start a shared session now, or dismiss and keep the moment flexible.
                </Text>
                <View style={styles.suggestionActions}>
                  <PrimaryButton
                    label="Start now"
                    onPress={() => {
                      void startSuggestedSession();
                    }}
                  />
                  <PrimaryButton
                    label="Dismiss"
                    secondary
                    onPress={dismissLocationSuggestion}
                  />
                </View>
              </FrostedCard>
            ) : null}

          </Animated.View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <PrimaryButton label="New session" onPress={() => router.push('/(tabs)/sessions')} />
        </View>
      </SafeAreaView>

      <Modal
        animationType="fade"
        transparent
        visible={pairPromptVisible}
        onRequestClose={() => setPairPromptVisible(false)}>
        <View style={styles.modalBackdrop}>
          <BlurView intensity={52} tint="light" style={styles.pairPromptCard}>
            <View style={styles.pairPromptInner}>
              <View style={styles.pairPromptIcon}>
                <Ionicons name="heart-outline" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.pairPromptEyebrow}>First session setup</Text>
              <Text style={styles.pairPromptTitle}>Have someone in mind?</Text>
              <Text style={styles.pairPromptBody}>
                Invite them now so shared sessions can show both people, or keep planning solo
                and pair later.
              </Text>
              <View style={styles.pairPromptActions}>
                <PrimaryButton
                  label="Invite someone"
                  onPress={() => {
                    setPairPromptVisible(false);
                    void answerPairingPrompt().then(() => router.push('/pair'));
                  }}
                />
                <PrimaryButton
                  label="Not right now"
                  secondary
                  onPress={() => {
                    setPairPromptVisible(false);
                    void answerPairingPrompt();
                  }}
                />
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(activeLocationSuggestion)}
        onRequestClose={dismissLocationSuggestion}>
        <View style={styles.modalBackdrop}>
          <BlurView intensity={56} tint="light" style={styles.pairPromptCard}>
            <View style={styles.pairPromptInner}>
              <View style={styles.locationPromptIcon}>
                <Ionicons name="location-outline" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.pairPromptEyebrow}>You are together</Text>
              <Text style={styles.pairPromptTitle}>Start a shared session?</Text>
              <Text style={styles.pairPromptBody}>
                {`You and ${partner?.displayName ?? 'your partner'} are both at ${
                  activeLocationSuggestion?.placeLabel ?? 'the same place'
                }. Lock distracting apps and keep this time protected.`}
              </Text>
              <View style={styles.pairPromptActions}>
                <PrimaryButton
                  label="Start together"
                  onPress={() => {
                    void startSuggestedSession();
                  }}
                />
                <PrimaryButton
                  label="Not now"
                  secondary
                  onPress={dismissLocationSuggestion}
                />
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  bottomBar: {
    paddingBottom: 8,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  cardBody: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 23,
  },
  cardEyebrow: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  content: {
    gap: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  lockedCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  lockedIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  lockedStatUnit: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: -4,
  },
  lockedStatValue: {
    color: '#FFFFFF',
    fontFamily: Fonts.display,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 44,
  },
  greeting: {
    color: '#FFFFFF',
    fontFamily: Fonts.display,
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 44,
  },
  header: {
    gap: 8,
    paddingTop: 8,
  },
  locationPromptIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(124, 224, 163, 0.22)',
    borderRadius: 999,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(12, 18, 14, 0.42)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  pairPromptActions: {
    gap: 10,
    width: '100%',
  },
  pairPromptBody: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 23,
    textAlign: 'center',
  },
  pairPromptCard: {
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 360,
    overflow: 'hidden',
    width: '100%',
  },
  pairPromptEyebrow: {
    color: 'rgba(255,255,255,0.62)',
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  pairPromptIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  pairPromptInner: {
    alignItems: 'center',
    backgroundColor: 'rgba(22, 29, 24, 0.58)',
    gap: 12,
    padding: 24,
  },
  pairPromptTitle: {
    color: '#FFFFFF',
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  quoteText: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: Fonts.body,
    fontSize: 17,
    fontStyle: 'italic',
    fontWeight: '400',
    lineHeight: 26,
    textAlign: 'center',
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 18, 14, 0.34)',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: 0.1,
    lineHeight: 26,
    maxWidth: '85%',
  },
  suggestionActions: {
    gap: 10,
    marginTop: 4,
  },
  suggestionDot: {
    backgroundColor: '#2D9B4E',
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  suggestionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  companionInviteCta: {
    color: 'rgba(255,255,255,0.92)',
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  companionInviteHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  companionInviteTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: 10,
    minWidth: 0,
  },
  companionAddButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  companionInviteIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  companionAvatar: {
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
    borderWidth: 2,
    height: 64,
    width: 64,
  },
  companionAvatarFallback: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
  },
  companionAvatarInitial: {
    color: '#FFFFFF',
    fontFamily: Fonts.display,
    fontSize: 26,
    fontWeight: '700',
  },
  companionAvatarWrap: {
    position: 'relative',
  },
  companionLiveDot: {
    backgroundColor: '#3DDC84',
    borderColor: 'rgba(12, 18, 14, 0.5)',
    borderRadius: 999,
    borderWidth: 2,
    bottom: 2,
    height: 16,
    position: 'absolute',
    right: 2,
    width: 16,
  },
  companionMeta: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  companionName: {
    color: '#FFFFFF',
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    fontWeight: '700',
  },
  companionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  companionStatUnit: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  companionStatValue: {
    color: '#FFFFFF',
    fontFamily: Fonts.display,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
});
