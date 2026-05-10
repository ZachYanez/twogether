import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Layout, Shadows } from '@/constants/theme';
import { GlassCard } from '@/src/components/glass-card';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { presentActivityPicker } from '@/src/lib/lovelock-shield';
import { useLovelockStore } from '@/src/store/lovelock-store';

export default function SelectionScreen() {
  const router = useRouter();
  const selectionPreview = useLovelockStore((s) => s.selectionPreview);
  const selectionConfigured = useLovelockStore((s) => s.selectionConfigured);
  const savedSessionConditions = useLovelockStore((s) => s.savedSessionConditions);
  const setSelectionConfigured = useLovelockStore((s) => s.setSelectionConfigured);
  const [loading, setLoading] = useState(false);

  return (
    <ScreenShell
      title="Choose apps"
      subtitle="Pick the apps your session profiles can block. Profiles control when and how those rules apply."
      showBackButton>
      {selectionPreview.length > 0 ? (
        <View style={styles.list}>
          {selectionPreview.map((item) => (
            <View key={item.label} style={styles.row}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowDetail}>{item.detail}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <GlassCard>
        <Text style={styles.cardTitle}>Profiles in use</Text>
        {savedSessionConditions.length === 0 ? (
          <Text style={styles.emptyText}>No profiles configured yet.</Text>
        ) : (
          <View style={styles.profileList}>
            {savedSessionConditions.map((profile) => (
              <View key={profile.id} style={styles.profileRow}>
                <View style={styles.profileDot} />
                <Text style={styles.profileItem}>
                  {profile.label} · {profile.sessionScope}
                </Text>
              </View>
            ))}
          </View>
        )}
      </GlassCard>

      <GlassCard style={styles.stateCard}>
        <Text style={styles.stateLabel}>Selection</Text>
        <View style={styles.stateRow}>
          <View
            style={[
              styles.stateDot,
              selectionConfigured && styles.stateDotActive,
            ]}
          />
          <Text style={styles.stateValue}>
            {selectionConfigured ? 'Configured' : 'Not set'}
          </Text>
        </View>
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
  cardTitle: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  emptyText: {
    color: Colors.dark.textTertiary,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
  },
  list: {
    gap: 0,
  },
  profileDot: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  profileItem: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
    textTransform: 'capitalize',
  },
  profileList: {
    gap: 8,
  },
  profileRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  row: {
    borderBottomColor: Colors.dark.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 3,
    paddingVertical: 14,
  },
  rowDetail: {
    color: Colors.dark.textTertiary,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
  },
  rowLabel: {
    color: Colors.dark.text,
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '500',
  },
  stateCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  stateDot: {
    backgroundColor: Colors.dark.textTertiary,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  stateDotActive: {
    backgroundColor: Colors.dark.success,
  },
  stateLabel: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  stateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  stateValue: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '700',
  },
});
