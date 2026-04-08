import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Layout } from '@/constants/theme';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { StatusBadge } from '@/src/components/status-badge';
import { formatSessionWindow } from '@/src/lib/time';
import { useTwogetherStore } from '@/src/store/twogether-store';

export default function SessionDetailScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const session = useTwogetherStore((s) =>
    s.sessions.find((e) => e.id === sessionId)
  );
  const acceptSession = useTwogetherStore((s) => s.acceptSession);
  const activateSession = useTwogetherStore((s) => s.activateSession);
  const completeSession = useTwogetherStore((s) => s.completeSession);
  const interruptSession = useTwogetherStore((s) => s.interruptSession);

  if (!session) {
    return (
      <ScreenShell title="Not found">
        <PrimaryButton
          label="Back to sessions"
          onPress={() => router.replace('/(tabs)/sessions')}
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title={session.title}
      subtitle={formatSessionWindow(session)}
      accessory={
        <StatusBadge
          label={session.status.replace('_', ' ')}
          status={session.status}
        />
      }>
      <View style={styles.participants}>
        {session.participants.map((p) => (
          <View key={p.id} style={styles.participant}>
            <Text style={styles.participantName}>{p.displayName}</Text>
            <Text style={styles.participantStatus}>
              {p.acceptanceStatus} · {p.localShieldState}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Accept"
          secondary
          onPress={() => {
            void acceptSession(session.id);
          }}
        />
        <PrimaryButton
          label="Activate"
          onPress={() => {
            void activateSession(session.id);
          }}
        />
        <PrimaryButton
          label="Complete"
          onPress={() => {
            void completeSession(session.id);
          }}
        />
        <PrimaryButton
          label="Interrupt"
          destructive
          onPress={() => {
            void interruptSession(session.id);
          }}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 8 },
  participant: {
    backgroundColor: Colors.dark.surface,
    borderRadius: Layout.radiusMd,
    gap: 2,
    padding: 14,
  },
  participantName: {
    color: Colors.dark.text,
    fontFamily: Fonts.bodyMedium,
    fontSize: 17,
    fontWeight: '600',
  },
  participantStatus: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
    textTransform: 'capitalize',
  },
  participants: { gap: 8 },
});
