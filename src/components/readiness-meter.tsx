import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Shadows } from '@/constants/theme';
import type { DashboardData } from '@/src/lib/lovelock-types';
import { GlassCard } from '@/src/components/glass-card';

export function ReadinessMeter({
  readiness,
}: {
  readiness: DashboardData['readiness'];
}) {
  const fillWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fillWidth, {
      toValue: readiness.score,
      useNativeDriver: false,
      speed: 6,
      bounciness: 3,
    }).start();
  }, [readiness.score, fillWidth]);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.score}>{readiness.score}</Text>
        <Text style={styles.percent}>%</Text>
        <Text style={styles.label}>ready</Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: fillWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <View style={styles.steps}>
        {readiness.steps.map((step) => (
          <View key={step.id} style={styles.stepRow}>
            <View
              style={[
                styles.dot,
                step.complete ? styles.dotComplete : styles.dotPending,
              ]}
            />
            <Text
              style={[
                styles.stepLabel,
                step.complete ? styles.stepComplete : null,
              ]}>
              {step.label}
            </Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 18,
  },
  dot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  dotComplete: {
    backgroundColor: Colors.dark.success,
    ...Shadows.sm,
  },
  dotPending: {
    backgroundColor: 'transparent',
    borderColor: Colors.dark.textTertiary,
    borderWidth: 1.5,
  },
  fill: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 4,
    height: '100%',
  },
  header: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 2,
  },
  label: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '400',
    marginLeft: 6,
  },
  percent: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.display,
    fontSize: 24,
    fontWeight: '700',
  },
  score: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 52,
  },
  stepComplete: {
    color: Colors.dark.textSecondary,
    textDecorationLine: 'line-through',
    textDecorationColor: Colors.dark.textTertiary,
  },
  stepLabel: {
    color: Colors.dark.text,
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
  },
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  steps: {
    gap: 14,
  },
  track: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 4,
    height: 6,
    overflow: 'hidden',
  },
});
