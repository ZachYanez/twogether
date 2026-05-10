import { useFocusEffect } from '@react-navigation/native';
import { addMinutes } from 'date-fns';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ActivitySelectionResult } from '@/modules/expo-lovelock-shield';
import { Fonts } from '@/constants/theme';
import { FrostedCard } from '@/src/components/frosted-card';
import { PrimaryButton } from '@/src/components/primary-button';
import {
  lockedAppLabelsFromSummary,
  readPersistedActivitySelection,
  writePersistedActivitySelection,
} from '@/src/lib/block-selection-preference-storage';
import {
  getActivitySelectionSummary,
  presentActivityPicker,
} from '@/src/lib/lovelock-shield';
import { profileToCondition } from '@/src/lib/session-templates';
import { useLovelockStore } from '@/src/store/lovelock-store';

const HOUR_OPTIONS = [0, 1, 2, 3, 4, 5, 6];
const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const emptySummary = (): ActivitySelectionResult => ({
  selectionConfigured: false,
  applicationCount: 0,
  categoryCount: 0,
  webDomainCount: 0,
});

function mergeSummaries(
  native: ActivitySelectionResult,
  persisted: ActivitySelectionResult | null
): ActivitySelectionResult {
  const nativeTotal =
    native.applicationCount + native.categoryCount + native.webDomainCount;
  if (nativeTotal > 0 || native.selectionConfigured) {
    return native;
  }
  if (persisted) {
    return persisted;
  }
  return native;
}

const planCardInner = { gap: 14, paddingHorizontal: 18, paddingVertical: 18 };

export function SessionsPlanBody() {
  const router = useRouter();
  const partner = useLovelockStore((s) => s.partner);
  const savedSessionConditions = useLovelockStore((s) => s.savedSessionConditions);
  const createSession = useLovelockStore((s) => s.createSession);
  const activateSession = useLovelockStore((s) => s.activateSession);
  const setSelectionConfigured = useLovelockStore((s) => s.setSelectionConfigured);

  const [scope, setScope] = useState<'shared' | 'solo'>(partner ? 'shared' : 'solo');
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [selectionSummary, setSelectionSummary] = useState<ActivitySelectionResult | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile = useMemo(() => {
    const forScope = savedSessionConditions.filter((entry) =>
      scope === 'shared' ? entry.sessionScope === 'shared' : entry.sessionScope === 'solo'
    );
    return forScope[0] ?? null;
  }, [savedSessionConditions, scope]);

  const durationHours = Math.floor(durationMinutes / 60);
  const durationMinuteRemainder = durationMinutes % 60;

  const refreshSelectionSummary = useCallback(async () => {
    const [native, persisted] = await Promise.all([
      getActivitySelectionSummary(),
      readPersistedActivitySelection(),
    ]);
    const mergedSummary = mergeSummaries(native, persisted);
    setSelectionConfigured(mergedSummary.selectionConfigured);
    setSelectionSummary(mergedSummary);
  }, [setSelectionConfigured]);

  useFocusEffect(
    useCallback(() => {
      void refreshSelectionSummary();
    }, [refreshSelectionSummary])
  );

  function setDurationFromWheel(nextHours: number, nextMinutes: number) {
    const nextDuration = nextHours * 60 + nextMinutes;
    setDurationMinutes(Math.max(5, nextDuration));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);

    try {
      if (!profile) {
        throw new Error(
          scope === 'shared'
            ? 'Create a shared profile first.'
            : 'Create a solo profile first.'
        );
      }

      const sessionTitle = profile.label.trim() || profile.defaultTitle;
      const summary = selectionSummary ?? emptySummary();
      setSelectionConfigured(summary.selectionConfigured);
      const lockedAppLabels = lockedAppLabelsFromSummary(summary);

      const start = new Date();
      const end = addMinutes(start, durationMinutes);
      const condition = profileToCondition(profile);
      const sessionId = await createSession({
        title: sessionTitle,
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        graceSeconds: profile.graceSeconds,
        condition: condition
          ? {
              ...condition,
              lockedAppLabels,
            }
          : null,
        scope,
        source: 'manual',
        shortSessionMode: false,
        warningMinutesBefore: [],
        profile,
      });

      if (sessionId) {
        await activateSession(sessionId);
        router.replace(`/session/${sessionId}`);
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Could not save.');
    } finally {
      setSubmitting(false);
    }
  }

  const summary = selectionSummary ?? emptySummary();
  const lockedLines = lockedAppLabelsFromSummary(summary);

  return (
    <View style={styles.planRoot}>
      {partner ? (
        <View style={styles.scopeChipRow}>
          <ScopeChip
            label={`With ${partner.displayName ?? 'partner'}`}
            active={scope === 'shared'}
            onPress={() => setScope('shared')}
          />
          <ScopeChip label="Just me" active={scope === 'solo'} onPress={() => setScope('solo')} />
        </View>
      ) : null}

      <FrostedCard innerStyle={planCardInner}>
        <Text style={styles.eyebrow}>Step 1 · Duration</Text>
        <View style={styles.durationSummary}>
          <Text style={styles.durationSummaryValue}>
            {durationHours}
            <Text style={styles.durationSummaryUnit}>h</Text>
          </Text>
          <Text style={styles.durationSummaryValue}>
            {String(durationMinuteRemainder).padStart(2, '0')}
            <Text style={styles.durationSummaryUnit}>m</Text>
          </Text>
        </View>
        <View style={styles.pickerRow}>
          <DurationWheel
            label="Hours"
            options={HOUR_OPTIONS}
            selected={durationHours}
            format={(value) => String(value)}
            onSelect={(value) => setDurationFromWheel(value, durationMinuteRemainder)}
          />
          <DurationWheel
            label="Minutes"
            options={MINUTE_OPTIONS}
            selected={durationMinuteRemainder}
            format={(value) => String(value).padStart(2, '0')}
            onSelect={(value) => setDurationFromWheel(durationHours, value)}
          />
        </View>
        <Text style={styles.hint}>
          Chosen apps stay limited for this entire window. End time is when the session ends.
        </Text>
      </FrostedCard>

      <FrostedCard innerStyle={planCardInner}>
        <Text style={styles.eyebrow}>Step 2 · What to block</Text>
        <Text style={styles.hint}>
          Apple does not expose real app names or icons to third-party apps for privacy. Your choices
          are stored on-device and enforced by Screen Time.
        </Text>
        <View style={styles.selectionList}>
          {lockedLines.map((line) => (
            <View key={line} style={styles.selectionRow}>
              <View style={styles.selectionDot} />
              <Text style={styles.selectionText}>{line}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.metaLine}>
          {summary.selectionConfigured ? 'Selection saved on this device.' : 'No selection yet.'}
        </Text>
        <PrimaryButton
          label="Choose apps, categories & websites"
          loading={pickerLoading}
          onPress={async () => {
            setPickerLoading(true);
            try {
              const result = await presentActivityPicker();
              await writePersistedActivitySelection(result);
              setSelectionConfigured(result.selectionConfigured);
              setSelectionSummary(result);
            } finally {
              setPickerLoading(false);
            }
          }}
        />
      </FrostedCard>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        label="Start session"
        loading={submitting}
        onPress={() => {
          void submit();
        }}
      />
    </View>
  );
}

const WHEEL_ITEM_HEIGHT = 44;
const WHEEL_VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS;
const WHEEL_PADDING = WHEEL_ITEM_HEIGHT * ((WHEEL_VISIBLE_ITEMS - 1) / 2);

function DurationWheel({
  label,
  options,
  selected,
  format,
  onSelect,
}: {
  label: string;
  options: number[];
  selected: number;
  format: (value: number) => string;
  onSelect: (value: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(0, options.indexOf(selected));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [layoutReady, setLayoutReady] = useState(false);

  useEffect(() => {
    if (!layoutReady) return;
    scrollRef.current?.scrollTo({
      y: selectedIndex * WHEEL_ITEM_HEIGHT,
      animated: false,
    });
    setActiveIndex(selectedIndex);
  }, [selectedIndex, layoutReady]);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.max(
      0,
      Math.min(options.length - 1, Math.round(y / WHEEL_ITEM_HEIGHT))
    );
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  }

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.max(
      0,
      Math.min(options.length - 1, Math.round(y / WHEEL_ITEM_HEIGHT))
    );
    if (options[index] !== selected) {
      onSelect(options[index]);
    }
  }

  return (
    <View style={styles.pickerSurface}>
      <Text style={styles.pickerColLabel}>{label}</Text>
      <View style={styles.wheelViewport}>
        <View pointerEvents="none" style={styles.wheelHighlight} />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={WHEEL_ITEM_HEIGHT}
          decelerationRate="fast"
          nestedScrollEnabled
          onLayout={() => setLayoutReady(true)}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleMomentumEnd}
          contentContainerStyle={styles.wheelScrollContent}>
          {options.map((value, index) => {
            const distance = Math.abs(index - activeIndex);
            const opacity =
              distance === 0 ? 1 : distance === 1 ? 0.55 : distance === 2 ? 0.28 : 0.15;
            return (
              <Pressable
                key={`${label}-${value}`}
                onPress={() => {
                  scrollRef.current?.scrollTo({
                    y: index * WHEEL_ITEM_HEIGHT,
                    animated: true,
                  });
                  if (options[index] !== selected) {
                    onSelect(options[index]);
                  }
                }}
                style={styles.wheelItem}>
                <Text style={[styles.wheelValue, { opacity }]}>{format(value)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

function ScopeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.scopeChip, active && styles.scopeChipActive]}>
      <Text style={[styles.scopeChipText, active && styles.scopeChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  planRoot: {
    gap: 16,
  },
  error: {
    color: '#FFD8D2',
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.95)',
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  hint: {
    color: 'rgba(255,255,255,0.92)',
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
  },
  metaLine: {
    color: 'rgba(255,255,255,0.92)',
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    fontWeight: '600',
  },
  durationSummary: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 12,
  },
  durationSummaryUnit: {
    color: 'rgba(255,255,255,0.95)',
    fontFamily: Fonts.bodyMedium,
    fontSize: 18,
    fontWeight: '500',
  },
  durationSummaryValue: {
    color: '#FFFFFF',
    fontFamily: Fonts.display,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  pickerColLabel: {
    color: 'rgba(255,255,255,0.95)',
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingTop: 10,
    paddingBottom: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerSurface: {
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderColor: 'rgba(255,255,255,0.20)',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  wheelHighlight: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderBottomColor: 'rgba(255,255,255,0.28)',
    borderBottomWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.28)',
    borderTopWidth: 1,
    height: WHEEL_ITEM_HEIGHT,
    left: 0,
    position: 'absolute',
    right: 0,
    top: WHEEL_PADDING,
  },
  wheelItem: {
    alignItems: 'center',
    height: WHEEL_ITEM_HEIGHT,
    justifyContent: 'center',
  },
  wheelScrollContent: {
    paddingVertical: WHEEL_PADDING,
  },
  wheelValue: {
    color: '#FFFFFF',
    fontFamily: Fonts.display,
    fontSize: 24,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  wheelViewport: {
    height: WHEEL_HEIGHT,
    position: 'relative',
  },
  scopeChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  scopeChipActive: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(255,255,255,0.92)',
  },
  scopeChipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  scopeChipText: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    fontWeight: '600',
  },
  scopeChipTextActive: {
    color: '#1F1F1F',
  },
  selectionDot: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 999,
    height: 6,
    marginTop: 7,
    width: 6,
  },
  selectionList: {
    gap: 8,
  },
  selectionRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  selectionText: {
    color: '#FFFFFF',
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
});
