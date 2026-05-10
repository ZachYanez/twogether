import { addMinutes, format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors, Fonts, Layout } from '@/constants/theme';
import { GlassCard } from '@/src/components/glass-card';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { isShortSession, profileToCondition } from '@/src/lib/session-templates';
import { useTwogetherStore } from '@/src/store/twogether-store';
import type { SessionTemplate } from '@/src/lib/twogether-types';

const DURATIONS = [20, 25, 30, 45, 60, 90, 120];
const WARNING_OPTIONS = [5, 10, 15];
const DAY_OPTIONS = [
  { label: 'S', value: 0 },
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'T', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 },
];

type PlanMode = 'instant' | 'recurring';
type RecurrenceMode = SessionTemplate['schedule']['recurrence'];

function parseTimeToMinuteOfDay(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function recurrenceDays(recurrence: RecurrenceMode, customDays: number[]) {
  switch (recurrence) {
    case 'weekdays':
      return [1, 2, 3, 4, 5];
    case 'weekends':
      return [0, 6];
    case 'weekly':
      return [5];
    case 'custom':
      return customDays;
    default:
      return [];
  }
}

export default function NewSessionScreen() {
  const router = useRouter();
  const partner = useTwogetherStore((s) => s.partner);
  const savedSessionConditions = useTwogetherStore((s) => s.savedSessionConditions);
  const createSession = useTwogetherStore((s) => s.createSession);
  const createSessionTemplate = useTwogetherStore((s) => s.createSessionTemplate);
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<'shared' | 'solo'>(partner ? 'shared' : 'solo');
  const [planMode, setPlanMode] = useState<PlanMode>('instant');
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [warningMinutes, setWarningMinutes] = useState(10);
  const [recurrence, setRecurrence] = useState<RecurrenceMode>('weekdays');
  const [customDays, setCustomDays] = useState<number[]>([1, 3, 5]);
  const [timeValue, setTimeValue] = useState('19:00');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileOptions = useMemo(
    () =>
      savedSessionConditions.filter((entry) =>
        scope === 'shared' ? entry.sessionScope === 'shared' : entry.sessionScope === 'solo'
      ),
    [savedSessionConditions, scope]
  );
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    profileOptions[0]?.id ?? null
  );

  const profile =
    profileOptions.find((entry) => entry.id === selectedProfileId) ?? profileOptions[0] ?? null;
  const shortSessionMode = isShortSession(durationMinutes);
  const startMinuteOfDay = parseTimeToMinuteOfDay(timeValue);

  async function submit() {
    setSubmitting(true);
    setError(null);

    try {
      if (!title.trim()) {
        throw new Error('Enter a title before saving.');
      }

      if (!profile) {
        throw new Error(
          scope === 'shared'
            ? 'Create a shared profile first.'
            : 'Create a solo profile first.'
        );
      }

      if (planMode === 'instant') {
        const start = new Date();
        const end = addMinutes(start, durationMinutes);
        const sessionId = await createSession({
          title: title.trim(),
          startISO: start.toISOString(),
          endISO: end.toISOString(),
          graceSeconds: profile.graceSeconds,
          condition: profileToCondition(profile),
          scope,
          source: shortSessionMode ? 'quick_start' : 'manual',
          shortSessionMode,
          warningMinutesBefore: [warningMinutes],
          profile,
        });

        if (sessionId) {
          router.replace(`/session/${sessionId}`);
        }

        return;
      }

      if (startMinuteOfDay === null) {
        throw new Error('Enter a valid start time like 19:00.');
      }

      const templateId = await createSessionTemplate({
        title: title.trim(),
        sessionScope: scope,
        profileId: profile.id,
        durationMinutes,
        shortSessionMode,
        graceSeconds: profile.graceSeconds,
        profile,
        schedule: {
          recurrence,
          daysOfWeek: recurrenceDays(recurrence, customDays),
          startMinuteOfDay,
          startDate: new Date().toISOString().slice(0, 10),
          warningMinutes: [warningMinutes],
        },
      });

      if (templateId) {
        router.replace('/(tabs)/sessions');
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Could not save.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenShell
      title="Session planner"
      subtitle="Create a shared ritual, a solo focus block, or a short protected window.">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.segmentRow}>
          {[
            { label: 'Shared', value: 'shared' as const, disabled: !partner },
            { label: 'Solo', value: 'solo' as const, disabled: false },
          ].map((option) => (
            <Pressable
              key={option.value}
              disabled={option.disabled}
              onPress={() => {
                setScope(option.value);
                setSelectedProfileId(
                  savedSessionConditions.find((entry) =>
                    option.value === 'shared'
                      ? entry.sessionScope === 'shared'
                      : entry.sessionScope === 'solo'
                  )?.id ?? null
                );
              }}
              style={[
                styles.segment,
                scope === option.value ? styles.segmentActive : null,
                option.disabled ? styles.segmentDisabled : null,
              ]}>
              <Text
                style={[
                  styles.segmentText,
                  scope === option.value ? styles.segmentTextActive : null,
                ]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.segmentRow}>
          {[
            { label: 'Start now', value: 'instant' as const },
            { label: 'Recurring', value: 'recurring' as const },
          ].map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setPlanMode(option.value)}
              style={[
                styles.segment,
                planMode === option.value ? styles.segmentActive : null,
              ]}>
              <Text
                style={[
                  styles.segmentText,
                  planMode === option.value ? styles.segmentTextActive : null,
                ]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <GlassCard style={styles.card}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={scope === 'shared' ? 'Date night' : 'Study sesh'}
            placeholderTextColor={Colors.dark.textTertiary}
            style={styles.input}
          />
          {planMode === 'recurring' ? (
            <Text style={styles.hint}>
              Starts {format(new Date(), 'MMM d')} and will create real session entries ahead of
              time.
            </Text>
          ) : (
            <Text style={styles.hint}>
              Useful for quick coffee windows, walks, and short check-ins.
            </Text>
          )}
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.label}>Profile</Text>
          <View style={styles.optionWrap}>
            {profileOptions.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => setSelectedProfileId(entry.id)}
                style={[
                  styles.choice,
                  selectedProfileId === entry.id ? styles.choiceActive : null,
                ]}>
                <Text style={styles.choiceTitle}>{entry.label}</Text>
                <Text style={styles.choiceBody}>{entry.description ?? entry.defaultTitle}</Text>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.label}>Duration</Text>
          <View style={styles.inlineWrap}>
            {DURATIONS.map((minutes) => (
              <Pressable
                key={minutes}
                onPress={() => setDurationMinutes(minutes)}
                style={[
                  styles.inlineChip,
                  durationMinutes === minutes ? styles.inlineChipActive : null,
                ]}>
                <Text
                  style={[
                    styles.inlineChipText,
                    durationMinutes === minutes ? styles.inlineChipTextActive : null,
                  ]}>
                  {minutes}m
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>
            {shortSessionMode
              ? 'Short-session mode keeps the setup light and fast.'
              : 'Longer sessions are better for dinner, couch time, and movie nights.'}
          </Text>
        </GlassCard>

        {planMode === 'recurring' ? (
          <GlassCard style={styles.card}>
            <Text style={styles.label}>Schedule</Text>
            <View style={styles.inlineWrap}>
              {(['daily', 'weekdays', 'weekends', 'weekly', 'custom'] as RecurrenceMode[]).map(
                (value) => (
                  <Pressable
                    key={value}
                    onPress={() => setRecurrence(value)}
                    style={[
                      styles.inlineChip,
                      recurrence === value ? styles.inlineChipActive : null,
                    ]}>
                    <Text
                      style={[
                        styles.inlineChipText,
                        recurrence === value ? styles.inlineChipTextActive : null,
                      ]}>
                      {value}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
            {(recurrence === 'custom' || recurrence === 'weekly') ? (
              <View style={styles.inlineWrap}>
                {DAY_OPTIONS.map((day) => {
                  const selected = customDays.includes(day.value);
                  return (
                    <Pressable
                      key={`${day.label}-${day.value}`}
                      onPress={() =>
                        setCustomDays((current) =>
                          selected
                            ? current.filter((entry) => entry !== day.value)
                            : [...current, day.value]
                        )
                      }
                      style={[
                        styles.dayChip,
                        selected ? styles.inlineChipActive : null,
                      ]}>
                      <Text
                        style={[
                          styles.inlineChipText,
                          selected ? styles.inlineChipTextActive : null,
                        ]}>
                        {day.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            <TextInput
              value={timeValue}
              onChangeText={setTimeValue}
              placeholder="19:00"
              placeholderTextColor={Colors.dark.textTertiary}
              style={styles.input}
            />
            <Text style={styles.hint}>Use 24-hour time. Example: `18:30` for after work.</Text>
          </GlassCard>
        ) : null}

        <GlassCard style={styles.card}>
          <Text style={styles.label}>Heads-up reminder</Text>
          <View style={styles.inlineWrap}>
            {WARNING_OPTIONS.map((minutes) => (
              <Pressable
                key={minutes}
                onPress={() => setWarningMinutes(minutes)}
                style={[
                  styles.inlineChip,
                  warningMinutes === minutes ? styles.inlineChipActive : null,
                ]}>
                <Text
                  style={[
                    styles.inlineChipText,
                    warningMinutes === minutes ? styles.inlineChipTextActive : null,
                  ]}>
                  {minutes} min
                </Text>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label={planMode === 'recurring' ? 'Create recurring session' : 'Start session'}
          loading={submitting}
          onPress={() => {
            void submit();
          }}
        />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  choice: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: Colors.dark.border,
    borderRadius: Layout.radiusMd,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  choiceActive: {
    borderColor: Colors.dark.accent,
    backgroundColor: 'rgba(93, 26, 26, 0.08)',
  },
  choiceBody: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  choiceTitle: {
    color: Colors.dark.text,
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    gap: 14,
    paddingBottom: 32,
  },
  dayChip: {
    alignItems: 'center',
    borderColor: Colors.dark.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minWidth: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    color: Colors.dark.danger,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
  },
  hint: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  inlineChip: {
    borderColor: Colors.dark.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inlineChipActive: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  inlineChipText: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  inlineChipTextActive: {
    color: '#FFFFFF',
  },
  inlineWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  input: {
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.border,
    borderRadius: Layout.radiusMd,
    borderWidth: 1,
    color: Colors.dark.text,
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '400',
    minHeight: 50,
    paddingHorizontal: 16,
  },
  label: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  optionWrap: {
    gap: 8,
  },
  segment: {
    alignItems: 'center',
    borderColor: Colors.dark.border,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  segmentActive: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  segmentDisabled: {
    opacity: 0.45,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentText: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
});
