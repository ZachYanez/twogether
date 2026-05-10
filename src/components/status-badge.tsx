import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Layout } from '@/constants/theme';
import type { SessionStatus, ShieldState } from '@/src/lib/lovelock-types';

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
  appearance = 'default',
}: {
  label: string;
  status: SessionStatus | ShieldState;
  appearance?: 'default' | 'onFrosted';
}) {
  const tone = toneForStatus(status);
  const isFrosted = appearance === 'onFrosted';

  return (
    <View style={[styles.badge, isFrosted ? badgeTonesFrosted[tone] : badgeTones[tone]]}>
      <View style={[styles.dot, isFrosted ? dotTonesFrosted[tone] : dotTones[tone]]} />
      <Text style={[styles.label, isFrosted ? labelTonesFrosted[tone] : labelTones[tone]]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: {
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});

const badgeTones = StyleSheet.create({
  active: { backgroundColor: 'rgba(93, 26, 26, 0.08)' },
  danger: { backgroundColor: 'rgba(192, 57, 43, 0.08)' },
  muted: { backgroundColor: 'rgba(142, 136, 130, 0.10)' },
  success: { backgroundColor: 'rgba(45, 155, 78, 0.08)' },
});

const dotTones = StyleSheet.create({
  active: { backgroundColor: Colors.dark.accent },
  danger: { backgroundColor: Colors.dark.danger },
  muted: { backgroundColor: Colors.dark.textTertiary },
  success: { backgroundColor: Colors.dark.success },
});

const badgeTonesFrosted = StyleSheet.create({
  active: { backgroundColor: 'rgba(255,255,255,0.14)' },
  danger: { backgroundColor: 'rgba(255,180,170,0.18)' },
  muted: { backgroundColor: 'rgba(255,255,255,0.1)' },
  success: { backgroundColor: 'rgba(180,240,200,0.16)' },
});

const dotTonesFrosted = StyleSheet.create({
  active: { backgroundColor: '#FFD4D0' },
  danger: { backgroundColor: '#FFB0A8' },
  muted: { backgroundColor: 'rgba(255,255,255,0.45)' },
  success: { backgroundColor: '#C8F5D4' },
});

const labelTones = StyleSheet.create({
  active: { color: Colors.dark.accent },
  danger: { color: Colors.dark.danger },
  muted: { color: Colors.dark.textSecondary },
  success: { color: Colors.dark.success },
});

const labelTonesFrosted = StyleSheet.create({
  active: { color: '#FFFFFF' },
  danger: { color: '#FFE8E4' },
  muted: { color: 'rgba(255,255,255,0.78)' },
  success: { color: '#F0FFF4' },
});
