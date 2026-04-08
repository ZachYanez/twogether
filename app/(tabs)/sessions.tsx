import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { SessionCard } from '@/src/components/session-card';
import { fetchSessionFeed } from '@/src/lib/mock-api';
import { useTwogetherStore } from '@/src/store/twogether-store';

export default function SessionsScreen() {
  const router = useRouter();
  const sessions = useTwogetherStore((s) => s.sessions);
  const revision = useTwogetherStore((s) => s.revision);

  const { data: feed = [] } = useQuery({
    queryKey: ['sessions', revision],
    queryFn: () => fetchSessionFeed(sessions),
  });

  return (
    <ScreenShell title="Sessions">
      <PrimaryButton
        label="New session"
        onPress={() => router.push('/session/new')}
      />

      {feed.length === 0 ? (
        <Text style={styles.empty}>No sessions yet. Create one to get started.</Text>
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
  list: {
    gap: 10,
  },
});
