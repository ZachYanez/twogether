import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { GlassCard } from '@/src/components/glass-card';
import { PrimaryButton } from '@/src/components/primary-button';
import { ReadinessMeter } from '@/src/components/readiness-meter';
import { ScreenShell } from '@/src/components/screen-shell';
import { SessionCard } from '@/src/components/session-card';
import { fetchDashboard } from '@/src/lib/mock-api';
import { useTwogetherStore } from '@/src/store/twogether-store';

export default function HomeScreen() {
  const router = useRouter();
  const dashboardSource = useTwogetherStore((s) => ({
    revision: s.revision,
    authorizationStatus: s.authorizationStatus,
    selectionConfigured: s.selectionConfigured,
    coupleReady: Boolean(s.couple && s.partner),
    localShieldState: s.localShieldState,
    sessions: s.sessions,
    streak: s.streak,
  }));

  const { data } = useQuery({
    queryKey: ['dashboard', dashboardSource.revision],
    queryFn: () => fetchDashboard(dashboardSource),
  });

  return (
    <ScreenShell title="Home">
      {data ? <ReadinessMeter readiness={data.readiness} /> : null}

      <GlassCard style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data?.streak.current ?? 0}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data?.pendingSessionCount ?? 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data?.streak.totalCompleted ?? 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </GlassCard>

      <PrimaryButton
        label="New session"
        onPress={() => router.push('/session/new')}
      />

      {data?.primarySession ? (
        <View style={styles.nextSession}>
          <Text style={styles.nextLabel}>Up next</Text>
          <SessionCard session={data.primarySession} />
        </View>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  nextLabel: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  nextSession: {
    gap: 10,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  statLabel: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '400',
  },
  statValue: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  stats: {
    flexDirection: 'row',
    paddingVertical: 20,
  },
});
