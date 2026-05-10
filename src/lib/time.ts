import { format, formatDistanceToNowStrict, isToday, isTomorrow } from 'date-fns';

import { formatTemplateDays } from '@/src/lib/session-templates';
import type {
  SavedSessionCondition,
  Session,
  SessionCondition,
  SessionTemplate,
} from '@/src/lib/lovelock-types';

export function formatSessionWindow(session: Session) {
  const start = new Date(session.scheduledStartAt);
  const end = new Date(session.scheduledEndAt);
  const dayLabel = isToday(start)
    ? 'Today'
    : isTomorrow(start)
      ? 'Tomorrow'
      : format(start, 'EEE, MMM d');

  return `${dayLabel} · ${format(start, 'h:mm a')}–${format(end, 'h:mm a')}`;
}

export function formatSessionRelative(session: Session) {
  return formatDistanceToNowStrict(new Date(session.scheduledStartAt), {
    addSuffix: true,
  });
}

export function formatShortDate(iso: string) {
  return format(new Date(iso), 'MMM d');
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function formatSessionCondition(
  condition: Pick<SessionCondition, 'allowedMinutes' | 'intervalHours'>
) {
  if (condition.allowedMinutes <= 0) {
    return 'Blocked for the full session';
  }
  return `${pluralize(condition.allowedMinutes, 'minute')} every ${pluralize(
    condition.intervalHours,
    'hour'
  )}`;
}

export function formatSavedSessionCondition(
  condition: Pick<SavedSessionCondition, 'allowedMinutes' | 'intervalHours'>
) {
  return formatSessionCondition(condition);
}

export function formatTemplateSchedule(template: SessionTemplate) {
  const hour = Math.floor(template.schedule.startMinuteOfDay / 60);
  const minutes = template.schedule.startMinuteOfDay % 60;
  const start = new Date();
  start.setHours(hour, minutes, 0, 0);

  return `${formatTemplateDays(template)} · ${format(start, 'h:mm a')}`;
}

export function formatTemplateDuration(template: SessionTemplate) {
  const duration = template.durationMinutes;

  if (duration >= 60) {
    const hours = duration / 60;
    return Number.isInteger(hours) ? `${hours} hr` : `${hours.toFixed(1)} hr`;
  }

  return `${duration} min`;
}

export function createInviteCode() {
  return 'TWO-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function clampTimestamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function interruptedEndMsForSession(session: Session, startMs: number, endMs: number): number {
  const interruptionMs = session.interruptedAt
    ? new Date(session.interruptedAt).getTime()
    : NaN;

  if (Number.isFinite(interruptionMs)) {
    return clampTimestamp(interruptionMs, startMs, endMs);
  }

  const bypassTimes = session.participants
    .map((participant) =>
      participant.lastBypassedAt ? new Date(participant.lastBypassedAt).getTime() : NaN
    )
    .filter(Number.isFinite);

  if (bypassTimes.length > 0) {
    return clampTimestamp(Math.min(...bypassTimes), startMs, endMs);
  }

  return endMs;
}

/** Time inside the scheduled window while apps were locked. Interrupted sessions stop at the recorded interruption time. */
export function lockedDurationMsForSession(session: Session, referenceNow: Date = new Date()): number {
  const startMs = new Date(session.scheduledStartAt).getTime();
  const endMs = new Date(session.scheduledEndAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }

  switch (session.status) {
    case 'completed':
      return endMs - startMs;
    case 'interrupted':
      return interruptedEndMsForSession(session, startMs, endMs) - startMs;
    case 'active':
    case 'armed': {
      const nowMs = referenceNow.getTime();
      return Math.max(0, Math.min(endMs, nowMs) - startMs);
    }
    default:
      return 0;
  }
}

export function computeTotalLockedDurationMs(
  sessions: Session[],
  referenceNow: Date = new Date()
): number {
  return sessions.reduce(
    (sum, session) => sum + lockedDurationMsForSession(session, referenceNow),
    0
  );
}

/** Locked time for shared sessions only (counts time you protected together on couple sessions). */
export function computeSharedLockedDurationMs(
  sessions: Session[],
  referenceNow: Date = new Date()
): number {
  return sessions
    .filter((session) => session.scope === 'shared')
    .reduce((sum, session) => sum + lockedDurationMsForSession(session, referenceNow), 0);
}

export function formatTotalLockedDisplay(durationMs: number): {
  value: string;
  unitLine: string;
} {
  if (durationMs <= 0) {
    return { value: '0', unitLine: 'hours with apps locked' };
  }

  const hours = durationMs / 3_600_000;
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(durationMs / 60_000));
    return {
      value: String(minutes),
      unitLine: minutes === 1 ? 'minute with apps locked' : 'minutes with apps locked',
    };
  }

  const value =
    hours >= 100
      ? Math.round(hours).toLocaleString()
      : hours >= 10
        ? String(Math.round(hours))
        : String(Math.round(hours * 10) / 10).replace(/\.0$/, '');

  return { value, unitLine: 'hours with apps locked' };
}

export function formatTogetherLockedDisplay(durationMs: number): {
  value: string;
  unitLine: string;
} {
  const base = formatTotalLockedDisplay(durationMs);
  return {
    value: base.value,
    unitLine: base.unitLine.replace('with apps locked', 'with apps locked together'),
  };
}
