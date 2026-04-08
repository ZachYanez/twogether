import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { formatSessionRelative, formatSessionWindow } from '@/src/lib/time';
import type { Session } from '@/src/lib/twogether-types';
import { GlassCard } from '@/src/components/glass-card';
import { StatusBadge } from '@/src/components/status-badge';

export function SessionCard({ session }: { session: Session }) {
  return (
    <Link href={`/session/${session.id}`} asChild>
      <View>
        <GlassCard style={styles.card}>
          <View style={styles.row}>
            <View style={styles.copy}>
              <Text style={styles.title}>{session.title}</Text>
              <Text style={styles.time}>{formatSessionWindow(session)}</Text>
            </View>
            <StatusBadge
              label={session.status.replace('_', ' ')}
              status={session.status}
            />
          </View>
          <Text style={styles.relative}>{formatSessionRelative(session)}</Text>
        </GlassCard>
      </View>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  relative: {
    color: Colors.dark.textTertiary,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '400',
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  time: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
  },
  title: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 25,
  },
});
