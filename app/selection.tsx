import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { GlassCard } from '@/src/components/glass-card';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { presentActivityPicker } from '@/src/lib/twogether-shield';
import { useTwogetherStore } from '@/src/store/twogether-store';

export default function SelectionScreen() {
  const router = useRouter();
  const selectionPreview = useTwogetherStore((s) => s.selectionPreview);
  const selectionConfigured = useTwogetherStore((s) => s.selectionConfigured);
  const setSelectionConfigured = useTwogetherStore((s) => s.setSelectionConfigured);
  const [loading, setLoading] = useState(false);

  return (
    <ScreenShell
      title="Choose apps"
      subtitle="Select which apps to restrict during sessions.">
      <View style={styles.list}>
        {selectionPreview.map((item) => (
          <View key={item.label} style={styles.row}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.detail}>{item.detail}</Text>
          </View>
        ))}
      </View>

      <GlassCard style={styles.stateCard}>
        <Text style={styles.stateLabel}>Selection</Text>
        <Text style={styles.stateValue}>
          {selectionConfigured ? 'Configured' : 'Not set'}
        </Text>
      </GlassCard>

      <PrimaryButton
        label="Open activity picker"
        loading={loading}
        onPress={async () => {
          setLoading(true);
          try {
            const result = await presentActivityPicker();
            setSelectionConfigured(result.selectionConfigured);
            router.back();
          } finally {
            setLoading(false);
          }
        }}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  detail: {
    color: Colors.dark.textTertiary,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
  },
  label: {
    color: Colors.dark.text,
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '500',
  },
  list: {
    gap: 0,
  },
  row: {
    borderBottomColor: Colors.dark.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
    paddingVertical: 14,
  },
  stateCard: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 20,
  },
  stateLabel: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  stateValue: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '700',
  },
});
