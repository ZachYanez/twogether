import { addHours, addMinutes } from 'date-fns';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Fonts, Layout } from '@/constants/theme';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { useTwogetherStore } from '@/src/store/twogether-store';

const presets = [
  {
    id: 'tonight',
    label: 'Tonight',
    detail: '2 hours, starts in 2h',
    startAt: addHours(new Date(), 2),
    endAt: addMinutes(addHours(new Date(), 2), 90),
    graceSeconds: 300,
  },
  {
    id: 'walk',
    label: 'Quick walk',
    detail: '45 min, starts in 30m',
    startAt: addMinutes(new Date(), 30),
    endAt: addMinutes(addMinutes(new Date(), 30), 45),
    graceSeconds: 0,
  },
  {
    id: 'date-night',
    label: 'Date night',
    detail: '2 hours, starts tomorrow',
    startAt: addHours(new Date(), 20),
    endAt: addHours(new Date(), 22),
    graceSeconds: 600,
  },
];

export default function NewSessionScreen() {
  const router = useRouter();
  const createSession = useTwogetherStore((s) => s.createSession);
  const [title, setTitle] = useState('Phone-free dinner');
  const [selectedId, setSelectedId] = useState(presets[0].id);

  const selected = presets.find((p) => p.id === selectedId) ?? presets[0];

  return (
    <ScreenShell title="New session">
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Session name"
        placeholderTextColor={Colors.dark.textTertiary}
        style={styles.input}
      />

      <View style={styles.presets}>
        {presets.map((preset) => {
          const active = preset.id === selectedId;
          return (
            <Pressable
              key={preset.id}
              onPress={() => setSelectedId(preset.id)}
              style={[styles.preset, active && styles.presetActive]}>
              <Text style={[styles.presetLabel, active && styles.presetLabelActive]}>
                {preset.label}
              </Text>
              <Text style={[styles.presetDetail, active && styles.presetDetailActive]}>
                {preset.detail}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton
        label="Create session"
        onPress={() => {
          void (async () => {
            const id = await createSession({
              title,
              startISO: selected.startAt.toISOString(),
              endISO: selected.endAt.toISOString(),
              graceSeconds: selected.graceSeconds,
            });
            if (id) router.replace(`/session/${id}`);
          })();
        }}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: Colors.dark.surface,
    borderRadius: Layout.radiusMd,
    color: Colors.dark.text,
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '400',
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  preset: {
    backgroundColor: Colors.dark.surface,
    borderColor: 'transparent',
    borderRadius: Layout.radiusMd,
    borderWidth: 1.5,
    gap: 4,
    padding: 16,
  },
  presetActive: {
    borderColor: Colors.dark.text,
  },
  presetDetail: {
    color: Colors.dark.textTertiary,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
  },
  presetDetailActive: {
    color: Colors.dark.textSecondary,
  },
  presetLabel: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 17,
    fontWeight: '600',
  },
  presetLabelActive: {
    color: Colors.dark.text,
  },
  presets: {
    gap: 8,
  },
});
