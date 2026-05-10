import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import type { DashboardData } from '@/src/lib/twogether-types';
import { GlassCard } from '@/src/components/glass-card';

export function ReadinessMeter({
  readiness,
}: {
  readiness: DashboardData['readiness'];
}) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.score}>{readiness.score}%</Text>
        <Text style={styles.label}>ready</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${readiness.score}%` }]} />
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
    gap: 16,
  },
  dot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  dotComplete: {
    backgroundColor: Colors.dark.success,
  },
  dotPending: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderColor: Colors.dark.textTertiary,
    borderWidth: 1,
  },
  fill: {
    backgroundColor: Colors.dark.text,
    borderRadius: 3,
    height: '100%',
  },
  header: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 6,
  },
  label: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
  },
  score: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 52,
  },
  stepComplete: {
    color: Colors.dark.textSecondary,
  },
  stepLabel: {
    color: Colors.dark.textTertiary,
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
  },
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  steps: {
    gap: 12,
  },
  track: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 3,
    height: 6,
    overflow: 'hidden',
  },
});
