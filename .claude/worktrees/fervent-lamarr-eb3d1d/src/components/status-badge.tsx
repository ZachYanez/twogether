import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import type { SessionStatus, ShieldState } from '@/src/lib/twogether-types';

type BadgeTone = 'active' | 'success' | 'danger' | 'muted';

function toneForStatus(status: SessionStatus | ShieldState): BadgeTone {
  if (status === 'active' || status === 'armed') return 'active';
  if (status === 'completed') return 'success';
  if (status === 'interrupted' || status === 'cancelled') return 'danger';
  return 'muted';
}

export function StatusBadge({
  label,
  status,
}: {
  label: string;
  status: SessionStatus | ShieldState;
}) {
  const tone = toneForStatus(status);

  return (
    <View style={[styles.badge, badgeTones[tone]]}>
      <Text style={[styles.label, labelTones[tone]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

const badgeTones = StyleSheet.create({
  active: { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  danger: { backgroundColor: 'rgba(255, 69, 58, 0.15)' },
  muted: { backgroundColor: 'rgba(142, 142, 147, 0.15)' },
  success: { backgroundColor: 'rgba(52, 199, 89, 0.15)' },
});

const labelTones = StyleSheet.create({
  active: { color: Colors.dark.text },
  danger: { color: Colors.dark.danger },
  muted: { color: Colors.dark.textSecondary },
  success: { color: Colors.dark.success },
});
