import { Link } from 'expo-router';
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { FrostedCard } from '@/src/components/frosted-card';
import { GlassCard } from '@/src/components/glass-card';
import { StatusBadge } from '@/src/components/status-badge';
import { formatSessionRelative, formatSessionWindow } from '@/src/lib/time';
import type { Session } from '@/src/lib/lovelock-types';

type SessionCardProps = {
  session: Session;
  /** Matches home / immersive tab shells (frosted panel + light type). */
  variant?: 'solid' | 'frosted';
};

function wasCutShort(session: Session) {
  return (
    session.status === 'interrupted' &&
    session.participants.some(
      (participant) => participant.interruptionReason === 'emergency_bypass'
    )
  );
}

export function SessionCard({ session, variant = 'solid' }: SessionCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const frosted = variant === 'frosted';
  const cutShort = wasCutShort(session);

  function onPressIn() {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }

  function onPressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 28,
      bounciness: 6,
    }).start();
  }

  const body = (
    <>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={frosted ? styles.titleFrosted : styles.title}>{session.title}</Text>
          <Text style={frosted ? styles.timeFrosted : styles.time}>
            {formatSessionWindow(session)}
          </Text>
        </View>
        <StatusBadge
          label={session.status.replace('_', ' ')}
          status={session.status}
          appearance={frosted ? 'onFrosted' : 'default'}
        />
      </View>
      <View style={styles.footer}>
        <View style={styles.metaGroup}>
          <Text style={frosted ? styles.metaFrosted : styles.meta}>
            {session.scope === 'solo' ? 'Solo' : 'Shared'}
          </Text>
          {cutShort ? (
            <View style={frosted ? styles.cutShortPillFrosted : styles.cutShortPill}>
              <Text style={frosted ? styles.cutShortTextFrosted : styles.cutShortText}>
                Cut short
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={frosted ? styles.relativeFrosted : styles.relative}>
          {formatSessionRelative(session)}
        </Text>
      </View>
      {cutShort ? (
        <Text style={frosted ? styles.noteFrosted : styles.note}>
          Emergency bypass used before the planned end time.
        </Text>
      ) : null}
    </>
  );

  return (
    <Link href={`/session/${session.id}`} asChild>
      <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View style={{ transform: [{ scale }] }}>
          {frosted ? (
            <FrostedCard innerStyle={styles.frostedInnerSession}>{body}</FrostedCard>
          ) : (
            <GlassCard style={styles.card}>{body}</GlassCard>
          )}
        </Animated.View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  frostedInnerSession: {
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  meta: {
    color: Colors.dark.textTertiary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metaFrosted: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metaGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    flexWrap: 'wrap',
    gap: 8,
  },
  cutShortPill: {
    backgroundColor: 'rgba(192, 57, 43, 0.10)',
    borderColor: 'rgba(192, 57, 43, 0.22)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cutShortPillFrosted: {
    backgroundColor: 'rgba(255,180,170,0.18)',
    borderColor: 'rgba(255,180,170,0.26)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cutShortText: {
    color: Colors.dark.danger,
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  cutShortTextFrosted: {
    color: '#FFD1CC',
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  note: {
    color: Colors.dark.textTertiary,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '400',
  },
  noteFrosted: {
    color: 'rgba(255,255,255,0.66)',
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '400',
  },
  relative: {
    color: Colors.dark.textTertiary,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '400',
  },
  relativeFrosted: {
    color: 'rgba(255,255,255,0.62)',
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
  timeFrosted: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
  },
  title: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 26,
  },
  titleFrosted: {
    color: '#FFFFFF',
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 26,
  },
});
