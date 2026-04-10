import {
  addDays,
  endOfWeek,
  isAfter,
  isBefore,
  isSameDay,
  set,
  startOfDay,
  startOfWeek,
} from 'date-fns';

import type {
  HistorySummary,
  SavedSessionCondition,
  Session,
  SessionCondition,
  SessionScope,
  SessionTemplate,
} from '@/src/lib/twogether-types';

export const DEFAULT_WARNING_MINUTES = [15];
export const SHORT_SESSION_MAX_MINUTES = 30;
export const UPCOMING_SESSION_HORIZON_DAYS = 21;

export function createDefaultSessionConditions(now = new Date().toISOString()): SavedSessionCondition[] {
  return [
    {
      id: 'condition-date-night',
      label: 'Date night',
      defaultTitle: 'Date night',
      allowedMinutes: 5,
      intervalHours: 3,
      graceSeconds: 300,
      description: 'A stronger block for a longer evening together.',
      intensity: 'deep',
      essentialAppHints: ['Phone', 'Messages', 'Maps', 'Uber', 'Camera'],
      shortSessionDurationMinutes: null,
      sessionScope: 'shared',
      createdAt: now,
    },
    {
      id: 'condition-evening-walk',
      label: 'Walk',
      defaultTitle: 'Evening walk',
      allowedMinutes: 10,
      intervalHours: 2,
      graceSeconds: 180,
      description: 'Keep camera, music, and maps accessible while social and work stay quiet.',
      intensity: 'balanced',
      essentialAppHints: ['Camera', 'Maps', 'Music'],
      shortSessionDurationMinutes: 30,
      sessionScope: 'shared',
      createdAt: now,
    },
    {
      id: 'condition-coffee-check-in',
      label: 'Coffee',
      defaultTitle: 'Coffee check-in',
      allowedMinutes: 15,
      intervalHours: 1,
      graceSeconds: 120,
      description: 'A lighter profile for short daily windows.',
      intensity: 'light',
      essentialAppHints: ['Messages', 'Phone', 'Calendar'],
      shortSessionDurationMinutes: 20,
      sessionScope: 'shared',
      createdAt: now,
    },
    {
      id: 'condition-study-sesh',
      label: 'Study sesh',
      defaultTitle: 'Study sesh',
      allowedMinutes: 5,
      intervalHours: 2,
      graceSeconds: 0,
      description: 'Solo focus with minimal exceptions.',
      intensity: 'deep',
      essentialAppHints: ['Phone', 'Messages', 'Calendar'],
      shortSessionDurationMinutes: 25,
      sessionScope: 'solo',
      createdAt: now,
    },
  ];
}

export function createDefaultSessionTemplates(params: {
  createdByUserId: string;
  coupleId: string | null;
  conditions: SavedSessionCondition[];
  now?: Date;
}): SessionTemplate[] {
  const now = params.now ?? new Date();
  const today = startOfDay(now);
  const startDate = today.toISOString().slice(0, 10);
  const findCondition = (label: string) =>
    params.conditions.find((entry) => entry.label.toLowerCase() === label.toLowerCase()) ?? null;

  const walk = findCondition('Walk');
  const dateNight = findCondition('Date night');
  const coffee = findCondition('Coffee');
  const study = findCondition('Study sesh');

  const templates: SessionTemplate[] = [
    {
      id: 'template-walk',
      createdByUserId: params.createdByUserId,
      coupleId: params.coupleId,
      title: 'Walk',
      sessionScope: 'shared',
      profileId: walk?.id ?? null,
      durationMinutes: 30,
      shortSessionMode: true,
      graceSeconds: walk?.graceSeconds ?? 180,
      status: 'active',
      schedule: {
        recurrence: 'weekdays',
        daysOfWeek: [1, 2, 3, 4, 5],
        startMinuteOfDay: 18 * 60,
        startDate,
        warningMinutes: DEFAULT_WARNING_MINUTES,
      },
      createdAt: now.toISOString(),
      profile: walk,
    },
    {
      id: 'template-date-night',
      createdByUserId: params.createdByUserId,
      coupleId: params.coupleId,
      title: 'Date night',
      sessionScope: 'shared',
      profileId: dateNight?.id ?? null,
      durationMinutes: 120,
      shortSessionMode: false,
      graceSeconds: dateNight?.graceSeconds ?? 300,
      status: 'active',
      schedule: {
        recurrence: 'weekly',
        daysOfWeek: [5],
        startMinuteOfDay: 19 * 60,
        startDate,
        warningMinutes: DEFAULT_WARNING_MINUTES,
      },
      createdAt: now.toISOString(),
      profile: dateNight,
    },
    {
      id: 'template-coffee',
      createdByUserId: params.createdByUserId,
      coupleId: params.coupleId,
      title: 'Coffee check-in',
      sessionScope: 'shared',
      profileId: coffee?.id ?? null,
      durationMinutes: 20,
      shortSessionMode: true,
      graceSeconds: coffee?.graceSeconds ?? 120,
      status: 'active',
      schedule: {
        recurrence: 'daily',
        daysOfWeek: [],
        startMinuteOfDay: 7 * 60 + 30,
        startDate,
        warningMinutes: [10],
      },
      createdAt: now.toISOString(),
      profile: coffee,
    },
    {
      id: 'template-study',
      createdByUserId: params.createdByUserId,
      coupleId: null,
      title: 'Study sesh',
      sessionScope: 'solo',
      profileId: study?.id ?? null,
      durationMinutes: 25,
      shortSessionMode: true,
      graceSeconds: study?.graceSeconds ?? 0,
      status: 'active',
      schedule: {
        recurrence: 'weekdays',
        daysOfWeek: [1, 2, 3, 4, 5],
        startMinuteOfDay: 20 * 60,
        startDate,
        warningMinutes: [5],
      },
      createdAt: now.toISOString(),
      profile: study,
    },
  ];

  return templates.filter((template) => template.sessionScope === 'solo' || Boolean(params.coupleId));
}

export function isShortSession(durationMinutes: number) {
  return durationMinutes <= SHORT_SESSION_MAX_MINUTES;
}

export function profileToCondition(profile: SavedSessionCondition | null | undefined): SessionCondition | null {
  if (!profile) {
    return null;
  }

  return {
    allowedMinutes: profile.allowedMinutes,
    intervalHours: profile.intervalHours,
    presetId: profile.id,
    presetLabel: profile.label,
    intensity: profile.intensity,
    description: profile.description,
    essentialAppHints: profile.essentialAppHints,
    shortSessionDurationMinutes: profile.shortSessionDurationMinutes,
  };
}

export function parseNumberArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'number' ? entry : Number(entry)))
      .filter((entry) => Number.isFinite(entry));
  }

  return [];
}

export function buildTemplateOccurrenceKey(templateId: string, startAt: Date) {
  return `${templateId}:${startAt.toISOString()}`;
}

export function getTemplateStartAt(template: SessionTemplate, anchorDate: Date) {
  const hours = Math.floor(template.schedule.startMinuteOfDay / 60);
  const minutes = template.schedule.startMinuteOfDay % 60;
  return set(startOfDay(anchorDate), {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0,
  });
}

function includesWeekday(template: SessionTemplate, day: number) {
  if (template.schedule.recurrence === 'daily') {
    return true;
  }

  if (template.schedule.recurrence === 'weekdays') {
    return day >= 1 && day <= 5;
  }

  if (template.schedule.recurrence === 'weekends') {
    return day === 0 || day === 6;
  }

  if (template.schedule.recurrence === 'weekly') {
    return (template.schedule.daysOfWeek[0] ?? 0) === day;
  }

  if (template.schedule.recurrence === 'custom') {
    return template.schedule.daysOfWeek.includes(day);
  }

  return false;
}

export function getUpcomingTemplateOccurrences(params: {
  template: SessionTemplate;
  from?: Date;
  horizonDays?: number;
}): Date[] {
  const from = params.from ?? new Date();
  const horizonDays = params.horizonDays ?? UPCOMING_SESSION_HORIZON_DAYS;
  const template = params.template;
  const startsOn = startOfDay(new Date(template.schedule.startDate));
  const endsOn = template.schedule.endDate ? startOfDay(new Date(template.schedule.endDate)) : null;
  const candidates: Date[] = [];

  if (template.status !== 'active') {
    return candidates;
  }

  if (template.schedule.recurrence === 'none') {
    const single = getTemplateStartAt(template, startsOn);
    if (!isBefore(single, from) && (endsOn === null || !isAfter(startOfDay(single), endsOn))) {
      return [single];
    }
    return [];
  }

  for (let offset = 0; offset <= horizonDays; offset += 1) {
    const candidateDay = addDays(startOfDay(from), offset);
    if (isBefore(candidateDay, startsOn)) {
      continue;
    }
    if (endsOn && isAfter(candidateDay, endsOn)) {
      continue;
    }
    if (!includesWeekday(template, candidateDay.getDay())) {
      continue;
    }

    const startAt = getTemplateStartAt(template, candidateDay);
    if (isBefore(startAt, from) && !isSameDay(startAt, from)) {
      continue;
    }
    if (isBefore(startAt, from) && isSameDay(startAt, from)) {
      continue;
    }
    candidates.push(startAt);
  }

  return candidates;
}

export function computeHistorySummary(sessions: Session[]): HistorySummary {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  return sessions.reduce<HistorySummary>(
    (summary, session) => {
      const startsAt = new Date(session.scheduledStartAt);
      const inWeek = !isBefore(startsAt, weekStart) && !isAfter(startsAt, weekEnd);

      if (inWeek) {
        summary.scheduledThisWeek += 1;
      }

      if (session.status === 'completed') {
        if (inWeek) {
          summary.completedThisWeek += 1;
        }
        if (session.shortSessionMode) {
          summary.shortSessionsCompleted += 1;
        }
      }

      summary.bypassCount += session.participants.reduce(
        (total, participant) => total + (participant.bypassCount ?? 0),
        0
      );

      return summary;
    },
    {
      completedThisWeek: 0,
      scheduledThisWeek: 0,
      shortSessionsCompleted: 0,
      bypassCount: 0,
    }
  );
}

export function getScopeLabel(scope: SessionScope) {
  return scope === 'solo' ? 'Solo' : 'Shared';
}

export function formatTemplateDays(template: SessionTemplate) {
  const days = template.schedule.daysOfWeek;

  switch (template.schedule.recurrence) {
    case 'daily':
      return 'Every day';
    case 'weekdays':
      return 'Weekdays';
    case 'weekends':
      return 'Weekends';
    case 'weekly':
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][days[0] ?? 0];
    case 'custom':
      return days
        .sort((left, right) => left - right)
        .map((day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] ?? 'Day')
        .join(', ');
    default:
      return 'One time';
  }
}
