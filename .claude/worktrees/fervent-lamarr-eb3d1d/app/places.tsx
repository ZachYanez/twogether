import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Fonts, Layout } from '@/constants/theme';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { useTwogetherStore } from '@/src/store/twogether-store';

const RADIUS_OPTIONS = [100, 150, 250, 400];

export default function PlacesScreen() {
  const router = useRouter();
  const savedPlaces = useTwogetherStore((s) => s.savedPlaces);
  const currentPlaceId = useTwogetherStore((s) => s.currentPlaceId);
  const partnerPlaceId = useTwogetherStore((s) => s.partnerPlaceId);
  const locationPermissionStatus = useTwogetherStore((s) => s.locationPermissionStatus);
  const locationBusy = useTwogetherStore((s) => s.locationBusy);
  const locationError = useTwogetherStore((s) => s.locationError);
  const requestLocationPermission = useTwogetherStore((s) => s.requestLocationPermission);
  const savePlaceFromCurrentLocation = useTwogetherStore((s) => s.savePlaceFromCurrentLocation);
  const deleteSavedPlace = useTwogetherStore((s) => s.deleteSavedPlace);
  const refreshLocationAutomation = useTwogetherStore((s) => s.refreshLocationAutomation);
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
      subtitle="Save places that matter to both of you, then let Twogether detect when you are there together."
      accessory={
        <Pressable onPress={() => router.back()}>
          <Text style={styles.done}>Done</Text>
        </Pressable>
      }>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Current access</Text>
        <Text style={styles.body}>
          {locationPermissionStatus === 'granted'
            ? 'Location access is enabled.'
            : 'Location access is required to save and check shared places.'}
        </Text>
        {locationPermissionStatus !== 'granted' ? (
          <PrimaryButton
            label="Allow location access"
            onPress={() => {
              void requestLocationPermission();
            }}
          />
        ) : null}
      </View>

      <View style={styles.card}>
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
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Saved places</Text>
        {savedPlaces.length === 0 ? (
          <Text style={styles.body}>No places saved yet.</Text>
        ) : (
          savedPlaces.map((place) => (
            <View key={place.id} style={styles.placeRow}>
              <View style={styles.placeCopy}>
                <Text style={styles.placeLabel}>{place.label}</Text>
                <Text style={styles.placeMeta}>{`${place.radiusMeters}m radius`}</Text>
                {currentPlaceId === place.id ? <Text style={styles.status}>You are here</Text> : null}
                {partnerPlaceId === place.id ? (
                  <Text style={styles.status}>Your partner is here</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => {
                  void deleteSavedPlace(place.id);
                }}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          ))
        )}
        <PrimaryButton
          label="Refresh place check-in"
          secondary
          loading={locationBusy}
          onPress={() => {
            void refreshLocationAutomation();
          }}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.border,
    borderRadius: Layout.radiusMd,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  done: {
    color: Colors.dark.accent,
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    color: Colors.dark.danger,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  input: {
    backgroundColor: Colors.dark.background,
    borderColor: Colors.dark.border,
    borderRadius: Layout.radiusMd,
    borderWidth: 1,
    color: Colors.dark.text,
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '400',
    minHeight: 52,
    paddingHorizontal: 16,
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
    paddingBottom: 12,
  },
  radiusChip: {
    borderColor: Colors.dark.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  radiusChipSelected: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
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
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  status: {
    color: Colors.dark.success,
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    fontWeight: '600',
  },
});
