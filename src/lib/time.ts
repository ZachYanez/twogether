import { format, formatDistanceToNowStrict, isToday, isTomorrow } from 'date-fns';

import type { SavedSessionCondition, Session, SessionCondition } from '@/src/lib/twogether-types';

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

export function createInviteCode() {
  return 'TWO-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}
