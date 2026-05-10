import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';

import { Fonts } from '@/constants/theme';
import { PrimaryButton } from '@/src/components/primary-button';
import { formatSessionRelative, formatSessionWindow } from '@/src/lib/time';
import { fetchDashboard } from '@/src/lib/mock-api';
import { getDailyQuote } from '@/src/lib/daily-quotes';
import { useTwogetherStore } from '@/src/store/twogether-store';

const FOREST_BACKGROUND_URL =
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80';

export default function HomeScreen() {
  const router = useRouter();
  const revision = useTwogetherStore((s) => s.revision);
  const authorizationStatus = useTwogetherStore((s) => s.authorizationStatus);
  const selectionConfigured = useTwogetherStore((s) => s.selectionConfigured);
  const couple = useTwogetherStore((s) => s.couple);
  const partner = useTwogetherStore((s) => s.partner);
  const localShieldState = useTwogetherStore((s) => s.localShieldState);
  const sessions = useTwogetherStore((s) => s.sessions);
  const streak = useTwogetherStore((s) => s.streak);
  const activeLocationSuggestion = useTwogetherStore((s) => s.activeLocationSuggestion);
  const startLocationSuggestedSession = useTwogetherStore((s) => s.startLocationSuggestedSession);
  const dismissLocationSuggestion = useTwogetherStore((s) => s.dismissLocationSuggestion);

  const dashboardSource = useMemo(
    () => ({
      revision,
      authorizationStatus,
      selectionConfigured,
      coupleReady: Boolean(couple && partner && couple.status === 'active'),
      localShieldState,
      sessions,
      streak,
    }),
    [
      revision,
      authorizationStatus,
      selectionConfigured,
      couple,
      partner,
      localShieldState,
      sessions,
      streak,
    ]
  );

  const { data } = useQuery({
    queryKey: ['dashboard', revision],
    queryFn: () => fetchDashboard(dashboardSource),
  });
  const isPairPending = couple?.status === 'pending' && Boolean(partner);
  const dailyQuote = getDailyQuote();

  return (
    <ImageBackground source={{ uri: FOREST_BACKGROUND_URL }} style={styles.background}>
      <View style={styles.scrim} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Home</Text>
            <Text style={styles.subtitle}>
              Presence feels better when the world gets quieter.
            </Text>
          </View>

          <FrostedCard>
            <Text style={styles.quoteText}>{`"${dailyQuote}"`}</Text>
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
              <Text style={styles.cardEyebrow}>Saved place match</Text>
              <Text style={styles.cardTitle}>
                {`You and ${partner?.displayName ?? 'your partner'} are at ${activeLocationSuggestion.placeLabel}`}
              </Text>
              <Text style={styles.cardBody}>
                Start a shared session now, or dismiss this suggestion and keep the moment flexible.
              </Text>
              <View style={styles.suggestionActions}>
                <PrimaryButton
                  label="Start now"
                  onPress={() => {
                    void startLocationSuggestedSession();
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

          {data?.primarySession ? (
            <FrostedCard>
              <Text style={styles.cardEyebrow}>Up next</Text>
              <Text style={styles.cardTitle}>{data.primarySession.title}</Text>
              <Text style={styles.cardBody}>{formatSessionWindow(data.primarySession)}</Text>
              <Text style={styles.secondaryBody}>
                {formatSessionRelative(data.primarySession)}
              </Text>
            </FrostedCard>
          ) : (
            <FrostedCard>
              <Text style={styles.cardEyebrow}>Ready when you are</Text>
              <Text style={styles.cardTitle}>Create a session to protect your next moment</Text>
              <Text style={styles.cardBody}>
                Set the time, lock in the boundary, and let Twogether do the rest.
              </Text>
            </FrostedCard>
          )}

          <PrimaryButton label="New session" onPress={() => router.push('/session/new')} />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

function FrostedCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <BlurView intensity={42} tint="light" style={[styles.frostedCard, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  cardBody: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  cardEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontFamily: Fonts.display,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  content: {
    gap: 18,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  frostedCard: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    overflow: 'hidden',
    padding: 18,
  },
  header: {
    gap: 6,
    paddingTop: 6,
  },
  quoteText: {
    color: 'rgba(255,255,255,0.92)',
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
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 18, 14, 0.28)',
  },
  suggestionActions: {
    gap: 10,
    marginTop: 6,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '400',
  },
  statValue: {
    color: '#FFFFFF',
    fontFamily: Fonts.display,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  statsCard: {
    flexDirection: 'row',
    paddingVertical: 22,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 24,
    maxWidth: '85%',
  },
  secondaryBody: {
    color: 'rgba(255,255,255,0.68)',
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
  },
  stats: {
    flexDirection: 'row',
    paddingVertical: 20,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: Fonts.display,
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 46,
  },
});
