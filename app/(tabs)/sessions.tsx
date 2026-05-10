import { useQuery } from '@tanstack/react-query';
import { Text, View, StyleSheet } from 'react-native';

import { ImmersiveText } from '@/constants/immersive-text';
import { Fonts } from '@/constants/theme';
import { ScreenShell } from '@/src/components/screen-shell';
import { SessionCard } from '@/src/components/session-card';
import { SessionsPlanBody } from '@/src/components/sessions-plan-body';
import { fetchSessionFeed } from '@/src/lib/mock-api';
import { useLovelockStore } from '@/src/store/lovelock-store';

export default function SessionsScreen() {
  const sessions = useLovelockStore((s) => s.sessions);
  const revision = useLovelockStore((s) => s.revision);

  const { data: feed = [] } = useQuery({
    queryKey: ['sessions', revision],
    queryFn: () => fetchSessionFeed(sessions),
  });

  return (
    <ScreenShell
      immersive
      showMenuButton
      title="Sessions"
      subtitle="Set how long you are protecting time, then choose what Screen Time should block. Your session starts when you tap Start session.">
      <SessionsPlanBody />

      {feed.length > 0 ? (
        <View style={styles.feedSection}>
          <Text style={styles.feedHeading}>Your sessions</Text>
          <View style={styles.list}>
            {feed.map((session) => (
              <SessionCard key={session.id} session={session} variant="frosted" />
            ))}
          </View>
        </View>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  feedHeading: {
    color: ImmersiveText.tertiary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  feedSection: {
    gap: 12,
  },
  list: {
    gap: 12,
  },
});
