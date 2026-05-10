import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Fonts, Layout, Shadows } from '@/constants/theme';
import { GlassCard } from '@/src/components/glass-card';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { useLovelockStore } from '@/src/store/lovelock-store';

const RADIUS_OPTIONS = [100, 150, 250, 400];

export default function PlacesScreen() {
  const router = useRouter();
  const savedPlaces = useLovelockStore((s) => s.savedPlaces);
  const currentPlaceId = useLovelockStore((s) => s.currentPlaceId);
  const partnerPlaceId = useLovelockStore((s) => s.partnerPlaceId);
  const locationPermissionStatus = useLovelockStore((s) => s.locationPermissionStatus);
  const locationBusy = useLovelockStore((s) => s.locationBusy);
  const locationError = useLovelockStore((s) => s.locationError);
  const requestLocationPermission = useLovelockStore((s) => s.requestLocationPermission);
  const savePlaceFromCurrentLocation = useLovelockStore((s) => s.savePlaceFromCurrentLocation);
  const deleteSavedPlace = useLovelockStore((s) => s.deleteSavedPlace);
  const refreshLocationAutomation = useLovelockStore((s) => s.refreshLocationAutomation);
  const [label, setLabel] = useState('');
  const [radiusMeters, setRadiusMeters] = useState(150);
  const [error, setError] = useState<string | null>(null);

  async function savePlace() {
    try {
      setError(null);
      await savePlaceFromCurrentLocation({
        label,
        radiusMeters,
      });
      setLabel('');
      await refreshLocationAutomation();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'That place could not be saved.');
    }
  }

  return (
    <ScreenShell
      title="Saved places"
      subtitle="Save places that matter, then let Love Lock detect when you are there together."
      showBackButton
      accessory={
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.done}>Done</Text>
        </Pressable>
      }>
      {locationPermissionStatus !== 'granted' ? (
        <GlassCard style={styles.permissionCard}>
          <View style={styles.permissionDot} />
          <View style={styles.permissionCopy}>
            <Text style={styles.permissionTitle}>Location access needed</Text>
            <Text style={styles.permissionBody}>
              Required to save and check shared places.
            </Text>
          </View>
          <PrimaryButton
            label="Allow"
            compact
            onPress={() => {
              void requestLocationPermission();
            }}
          />
        </GlassCard>
      ) : null}

      <GlassCard style={styles.addCard}>
        <Text style={styles.sectionTitle}>Add current place</Text>
        <TextInput
          value={label}
          onChangeText={(value) => {
            setLabel(value);
            if (error) {
              setError(null);
            }
          }}
          placeholder="Place name"
          placeholderTextColor={Colors.dark.textTertiary}
          style={styles.input}
        />
        <View style={styles.radiusRow}>
          {RADIUS_OPTIONS.map((option) => {
            const selected = option === radiusMeters;
            return (
              <Pressable
                key={option}
                onPress={() => setRadiusMeters(option)}
                style={[styles.radiusChip, selected && styles.radiusChipSelected]}>
                <Text style={[styles.radiusChipText, selected && styles.radiusChipTextSelected]}>
                  {option}m
                </Text>
              </Pressable>
            );
          })}
        </View>
        <PrimaryButton
          label="Save this place"
          loading={locationBusy}
          onPress={() => {
            void savePlace();
          }}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {locationError ? <Text style={styles.error}>{locationError}</Text> : null}
      </GlassCard>

      <View style={styles.listSection}>
        <Text style={styles.listHeader}>Your places</Text>
        {savedPlaces.length === 0 ? (
          <Text style={styles.emptyText}>No places saved yet.</Text>
        ) : (
          <View style={styles.placesList}>
            {savedPlaces.map((place) => (
              <View key={place.id} style={styles.placeRow}>
                <View style={styles.placeCopy}>
                  <Text style={styles.placeLabel}>{place.label}</Text>
                  <Text style={styles.placeMeta}>{`${place.radiusMeters}m radius`}</Text>
                  {currentPlaceId === place.id ? (
                    <View style={styles.presenceBadge}>
                      <View style={styles.presenceDot} />
                      <Text style={styles.presenceText}>You are here</Text>
                    </View>
                  ) : null}
                  {partnerPlaceId === place.id ? (
                    <View style={styles.presenceBadge}>
                      <View style={styles.presenceDotPartner} />
                      <Text style={styles.presenceText}>Partner is here</Text>
                    </View>
                  ) : null}
                </View>
                <Pressable
                  hitSlop={12}
                  onPress={() => {
                    void deleteSavedPlace(place.id);
                  }}>
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      <PrimaryButton
        label="Refresh check-in"
        secondary
        loading={locationBusy}
        onPress={() => {
          void refreshLocationAutomation();
        }}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  addCard: {
    gap: 16,
  },
  done: {
    color: Colors.dark.accent,
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: Colors.dark.textTertiary,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
    paddingVertical: 20,
    textAlign: 'center',
  },
  error: {
    color: Colors.dark.danger,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  input: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderColor: Colors.dark.border,
    borderRadius: Layout.radiusMd,
    borderWidth: 1,
    color: Colors.dark.text,
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '400',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  listHeader: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  listSection: {
    gap: 12,
  },
  permissionBody: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  permissionCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  permissionCopy: {
    flex: 1,
    gap: 2,
  },
  permissionDot: {
    backgroundColor: Colors.dark.warning,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  permissionTitle: {
    color: Colors.dark.text,
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    fontWeight: '600',
  },
  placeCopy: {
    flex: 1,
    gap: 4,
  },
  placeLabel: {
    color: Colors.dark.text,
    fontFamily: Fonts.bodyMedium,
    fontSize: 17,
    fontWeight: '600',
  },
  placeMeta: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
  },
  placeRow: {
    alignItems: 'center',
    borderBottomColor: Colors.dark.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 14,
  },
  placesList: {
    gap: 0,
  },
  presenceBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  presenceDot: {
    backgroundColor: Colors.dark.success,
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  presenceDotPartner: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  presenceText: {
    color: Colors.dark.success,
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    fontWeight: '600',
  },
  radiusChip: {
    borderColor: Colors.dark.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  radiusChipSelected: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
    ...Shadows.sm,
  },
  radiusChipText: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    fontWeight: '600',
  },
  radiusChipTextSelected: {
    color: '#FFFFFF',
  },
  radiusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  remove: {
    color: Colors.dark.danger,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
