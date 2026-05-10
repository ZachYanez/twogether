import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ImmersiveText } from '@/constants/immersive-text';
import { Colors, Fonts } from '@/constants/theme';
import { FrostedCard } from '@/src/components/frosted-card';
import { ScreenShell } from '@/src/components/screen-shell';
import { SessionCard } from '@/src/components/session-card';
import { formatSessionWindow, lockedDurationMsForSession } from '@/src/lib/time';
import type { Session } from '@/src/lib/lovelock-types';
import { useLovelockStore } from '@/src/store/lovelock-store';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKS_BACK = 3;
const TOTAL_WEEKS = 4;

function getWeekStart(weekOffset: number) {
  const today = new Date();
  const base = startOfWeek(today, { weekStartsOn: 0 });
  if (weekOffset > 0) return addWeeks(base, weekOffset);
  if (weekOffset < 0) return subWeeks(base, Math.abs(weekOffset));
  return base;
}

function buildCalendarWeeks(weekOffset: number) {
  const anchor = getWeekStart(weekOffset);
  const weeks: Date[][] = [];
  for (let w = 0; w < TOTAL_WEEKS; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(addDays(anchor, w * 7 + d));
    }
    weeks.push(week);
  }
  return weeks;
}

function sessionsForDay(sessions: Session[], day: Date) {
  return sessions.filter((session) =>
    isSameDay(new Date(session.scheduledStartAt), day)
  );
}

function sessionDuration(session: Session) {
  return Math.max(0, Math.round(lockedDurationMsForSession(session) / 60_000));
}

function wasCutShort(session: Session) {
  return (
    session.status === 'interrupted' &&
    session.participants.some(
      (participant) => participant.interruptionReason === 'emergency_bypass'
    )
  );
}

function computeBestDayStreak(completedSessions: Session[]): number {
  if (completedSessions.length === 0) {
    return 0;
  }

  const dayMillis = [
    ...new Set(
      completedSessions.map((session) => startOfDay(new Date(session.scheduledStartAt)).getTime())
    ),
  ].sort((left, right) => left - right);

  let best = 1;
  let run = 1;

  for (let index = 1; index < dayMillis.length; index += 1) {
    const prev = new Date(dayMillis[index - 1]);
    const next = new Date(dayMillis[index]);
    if (differenceInCalendarDays(next, prev) === 1) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  return best;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const sessions = useLovelockStore((s) => s.sessions);

  const pastSessions = useMemo(
    () =>
      sessions
        .filter((session) => ['completed', 'interrupted'].includes(session.status))
        .sort(
          (left, right) =>
            new Date(right.scheduledStartAt).getTime() -
            new Date(left.scheduledStartAt).getTime()
        ),
    [sessions]
  );

  const completedSessions = useMemo(
    () => pastSessions.filter((session) => session.status === 'completed'),
    [pastSessions]
  );

  const historyTotals = useMemo(() => {
    const totalSessions = pastSessions.length;
    const totalMinutes = pastSessions.reduce((sum, session) => sum + sessionDuration(session), 0);
    const totalHours = totalMinutes / 60;
    const hoursDisplay =
      totalHours >= 1
        ? totalHours >= 10
          ? String(Math.round(totalHours))
          : (Math.round(totalHours * 10) / 10).toFixed(1)
        : String(Math.max(0, Math.round(totalMinutes)));

    const bestDayStreak = computeBestDayStreak(completedSessions);

    return {
      totalSessions,
      totalHours,
      hoursDisplay,
      hoursUnit: totalHours >= 1 ? 'hours' : 'minutes',
      bestDayStreak,
    };
  }, [pastSessions, completedSessions]);
  const calendarWeeks = useMemo(() => buildCalendarWeeks(weekOffset), [weekOffset]);
  const today = useMemo(() => new Date(), []);
  const rangeLabel = useMemo(() => {
    const first = calendarWeeks[0][0];
    const last = calendarWeeks[TOTAL_WEEKS - 1][6];
    return `${format(first, 'MMM d')} - ${format(last, 'MMM d')}`;
  }, [calendarWeeks]);
  const selectedDaySessions = useMemo(() => {
    if (!selectedDay) return [];
    return sessionsForDay(sessions, selectedDay).sort(
      (left, right) =>
        new Date(left.scheduledStartAt).getTime() -
        new Date(right.scheduledStartAt).getTime()
    );
  }, [sessions, selectedDay]);
  const canGoBack = weekOffset > -WEEKS_BACK;
  const canGoForward = weekOffset < WEEKS_BACK;
  const goBack = useCallback(() => {
    if (!canGoBack) return;
    setWeekOffset((current) => current - 1);
    setSelectedDay(null);
  }, [canGoBack]);
  const goForward = useCallback(() => {
    if (!canGoForward) return;
    setWeekOffset((current) => current + 1);
    setSelectedDay(null);
  }, [canGoForward]);

  return (
    <ScreenShell immersive showMenuButton title="History">
      <FrostedCard innerStyle={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{historyTotals.totalSessions}</Text>
            <Text style={styles.summaryLabel}>Total sessions</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{historyTotals.hoursDisplay}</Text>
            <Text style={styles.summaryLabel}>
              {historyTotals.hoursUnit === 'hours' ? 'Hours locked' : 'Minutes locked'}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{historyTotals.bestDayStreak}</Text>
            <Text style={styles.summaryLabel}>Best days in a row</Text>
          </View>
        </View>
      </FrostedCard>

      <FrostedCard innerStyle={styles.calendarCard}>
        <View style={styles.calendarNav}>
          <Pressable
            onPress={goBack}
            hitSlop={12}
            style={({ pressed }) => [
              styles.navArrow,
              !canGoBack && styles.navArrowDisabled,
              pressed && canGoBack && styles.navArrowPressed,
            ]}>
            <Ionicons
              name="chevron-back"
              size={16}
              color={canGoBack ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.32)'}
            />
          </Pressable>
          <Text style={styles.calendarRange}>{rangeLabel}</Text>
          <Pressable
            onPress={goForward}
            hitSlop={12}
            style={({ pressed }) => [
              styles.navArrow,
              !canGoForward && styles.navArrowDisabled,
              pressed && canGoForward && styles.navArrowPressed,
            ]}>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={canGoForward ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.32)'}
            />
          </Pressable>
        </View>

        <View style={styles.dayLabelsRow}>
          {DAY_LABELS.map((label, index) => (
            <View key={`label-${index}`} style={styles.dayCell}>
              <Text style={styles.dayLabelText}>{label}</Text>
            </View>
          ))}
        </View>

        {calendarWeeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekRow}>
            {week.map((day) => {
              const isToday = isSameDay(day, today);
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
              const hasSessions = sessionsForDay(sessions, day).length > 0;

              return (
                <Pressable
                  key={day.toISOString()}
                  onPress={() => setSelectedDay(isSelected ? null : day)}
                  style={styles.dayCell}>
                  <View
                    style={[
                      styles.dayCircle,
                      isToday && styles.dayCircleToday,
                      isSelected && styles.dayCircleSelected,
                    ]}>
                    <Text
                      style={[
                        styles.dayNumber,
                        isToday && styles.dayNumberToday,
                        isSelected && styles.dayNumberSelected,
                      ]}>
                      {format(day, 'd')}
                    </Text>
                  </View>
                  {hasSessions ? (
                    <View style={styles.sessionDot} />
                  ) : (
                    <View style={styles.sessionDotSpacer} />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </FrostedCard>

      {selectedDay ? (
        <FrostedCard innerStyle={styles.selectedDayCard}>
          <Text style={styles.sectionLabel}>{format(selectedDay, 'EEEE, MMM d')}</Text>
          {selectedDaySessions.length > 0 ? (
            selectedDaySessions.map((session) => (
              <Pressable
                key={session.id}
                onPress={() => router.push(`/session/${session.id}`)}>
                <View style={styles.sessionRow}>
                  <View style={styles.sessionRowCopy}>
                    <Text style={styles.sessionRowTitle}>
                      {session.title || 'Untitled session'}
                    </Text>
                    <View style={styles.sessionRowMetaWrap}>
                      <Text style={styles.sessionRowMeta}>
                        {formatSessionWindow(session)}
                        {' \u00B7 '}
                        {sessionDuration(session)}m
                        {' \u00B7 '}
                        {session.scope === 'solo' ? 'Solo' : 'Shared'}
                      </Text>
                      {wasCutShort(session) ? (
                        <View style={styles.cutShortPill}>
                          <Text style={styles.cutShortText}>Cut short</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View
                    style={[
                      styles.sessionStatusDot,
                      session.status === 'completed'
                        ? styles.sessionStatusCompleted
                        : session.status === 'interrupted'
                          ? styles.sessionStatusInterrupted
                          : styles.sessionStatusOther,
                    ]}
                  />
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyDayText}>No sessions on this day.</Text>
          )}
        </FrostedCard>
      ) : null}

      {pastSessions.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No past sessions</Text>
          <Text style={styles.emptyBody}>Completed sessions will appear here.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {pastSessions.map((session) => (
            <SessionCard key={session.id} session={session} variant="frosted" />
          ))}
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  calendarCard: {
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  calendarNav: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarRange: {
    color: ImmersiveText.primary,
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  dayCell: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    minWidth: 0,
    paddingVertical: 3,
  },
  dayCircle: {
    alignItems: 'center',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  dayCircleSelected: {
    backgroundColor: Colors.dark.accent,
  },
  dayCircleToday: {
    borderColor: Colors.dark.accentMuted,
    borderWidth: 1.5,
  },
  dayLabelText: {
    color: ImmersiveText.muted,
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    fontWeight: '600',
  },
  dayLabelsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  dayNumber: {
    color: ImmersiveText.primary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    fontWeight: '600',
  },
  dayNumberSelected: {
    color: '#FFFFFF',
  },
  dayNumberToday: {
    color: Colors.dark.accent,
    fontWeight: '700',
  },
  emptyBody: {
    color: ImmersiveText.tertiary,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
  },
  emptyTitle: {
    color: ImmersiveText.secondary,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyWrap: {
    gap: 8,
    paddingVertical: 40,
  },
  emptyDayText: {
    color: ImmersiveText.muted,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
  },
  list: { gap: 12 },
  navArrow: {
    alignItems: 'center',
    backgroundColor: ImmersiveText.chipBg,
    borderColor: ImmersiveText.chipBorder,
    borderRadius: 999,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  navArrowDisabled: {
    opacity: 0.45,
  },
  navArrowPressed: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  summaryCard: {
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  summaryDivider: {
    backgroundColor: ImmersiveText.divider,
    width: StyleSheet.hairlineWidth,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
  },
  summaryLabel: {
    color: ImmersiveText.tertiary,
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '400',
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryValue: {
    color: ImmersiveText.primary,
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  sectionLabel: {
    color: ImmersiveText.tertiary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  selectedDayCard: {
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sessionDot: {
    backgroundColor: Colors.dark.success,
    borderRadius: 999,
    height: 5,
    width: 5,
  },
  sessionDotSpacer: {
    height: 5,
    width: 5,
  },
  sessionRow: {
    alignItems: 'center',
    borderTopColor: ImmersiveText.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 4,
    paddingTop: 10,
  },
  sessionRowCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  sessionRowMeta: {
    color: ImmersiveText.tertiary,
    flexShrink: 1,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '400',
  },
  sessionRowMetaWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sessionRowTitle: {
    color: ImmersiveText.primary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    fontWeight: '600',
  },
  sessionStatusCompleted: {
    backgroundColor: Colors.dark.success,
  },
  sessionStatusDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  sessionStatusInterrupted: {
    backgroundColor: Colors.dark.danger,
  },
  sessionStatusOther: {
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  cutShortPill: {
    backgroundColor: 'rgba(255,180,170,0.18)',
    borderColor: 'rgba(255,180,170,0.28)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cutShortText: {
    color: '#FFD1CC',
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  weekRow: {
    flexDirection: 'row',
  },
});
