import { useQuery } from '@tanstack/react-query';
import { startTransition, useDeferredValue, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Fonts, Layout } from '@/constants/theme';
import { GlassCard } from '@/src/components/glass-card';
import { ScreenShell } from '@/src/components/screen-shell';
import { SessionCard } from '@/src/components/session-card';
import { fetchHistoryFeed } from '@/src/lib/mock-api';
import { computeHistorySummary } from '@/src/lib/session-templates';
import { useTwogetherStore } from '@/src/store/twogether-store';

export default function HistoryScreen() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const sessions = useTwogetherStore((s) => s.sessions);
  const revision = useTwogetherStore((s) => s.revision);
  const streak = useTwogetherStore((s) => s.streak);
  const summary = computeHistorySummary(sessions);

  const { data: feed = [] } = useQuery({
    queryKey: ['history', revision, deferredSearch],
    queryFn: () => fetchHistoryFeed(sessions, deferredSearch),
  });

  return (
    <ScreenShell title="History">
      <GlassCard style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{streak.current}</Text>
          <Text style={styles.statLabel}>Current</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{streak.best}</Text>
          <Text style={styles.statLabel}>Best</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{streak.totalCompleted}</Text>
          <Text style={styles.statLabel}>All time</Text>
        </View>
      </GlassCard>

      <GlassCard style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.completedThisWeek}</Text>
          <Text style={styles.statLabel}>This week</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.shortSessionsCompleted}</Text>
          <Text style={styles.statLabel}>Short wins</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.bypassCount}</Text>
          <Text style={styles.statLabel}>Bypasses</Text>
        </View>
      </GlassCard>

      <TextInput
        value={search}
        onChangeText={(v) => startTransition(() => setSearch(v))}
        placeholder="Search sessions"
        placeholderTextColor={Colors.dark.textTertiary}
        style={styles.search}
      />

      {feed.length === 0 ? (
        <Text style={styles.empty}>No past sessions yet.</Text>
      ) : (
        <View style={styles.list}>
          {feed.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: Colors.dark.textTertiary,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
    paddingVertical: 40,
    textAlign: 'center',
  },
  list: { gap: 10 },
  search: {
    backgroundColor: Colors.dark.surface,
    borderRadius: Layout.radiusMd,
    color: Colors.dark.text,
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '400',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    paddingVertical: 16,
  },
});
