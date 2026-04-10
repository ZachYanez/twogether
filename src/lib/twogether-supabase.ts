import { addMinutes } from 'date-fns';

import { createInviteCode } from '@/src/lib/time';
import {
  createDefaultSessionTemplates,
  getUpcomingTemplateOccurrences,
  parseNumberArray,
  profileToCondition,
  UPCOMING_SESSION_HORIZON_DAYS,
} from '@/src/lib/session-templates';
import {
  getTwogetherSupabaseClient,
  hasSupabaseClientConfig,
} from '@/src/lib/supabase-client';
import type {
  AuthSession,
  AuthorizationStatus,
  Couple,
  EffectiveSubscriptionAccess,
  LocationAutomationMode,
  PlacePresence,
  SavedSessionCondition,
  SavedPlace,
  Session,
  SessionCondition,
  SessionInterruptionReason,
  SessionScope,
  SessionTemplate,
  ShieldState,
  SubscriptionSnapshot,
  User,
} from '@/src/lib/twogether-types';

type JsonRecord = Record<string, unknown>;

type StreakState = {
  best: number;
  current: number;
  totalCompleted: number;
};

type PresetDraft = {
  label: string;
  defaultTitle: string;
  allowedMinutes: number;
  intervalHours: number;
  graceSeconds?: number;
  description?: string;
  intensity?: SavedSessionCondition['intensity'];
  essentialAppHints?: string[];
  shortSessionDurationMinutes?: number | null;
  sessionScope?: SessionScope;
};

type SessionDraft = {
  title: string;
  startISO: string;
  endISO: string;
  graceSeconds: number;
  condition?: SessionCondition | null;
  scope?: SessionScope;
  source?: Session['source'];
  shortSessionMode?: boolean;
  warningMinutesBefore?: number[];
  profile?: SavedSessionCondition | null;
  templateId?: string | null;
};

type SessionTemplateDraft = {
  title: string;
  sessionScope: SessionScope;
  profileId: string | null;
  durationMinutes: number;
  shortSessionMode: boolean;
  graceSeconds: number;
  schedule: SessionTemplate['schedule'];
  profile?: SavedSessionCondition | null;
};

type RemoteSnapshot = {
  couple: Couple | null;
  currentUser: User;
  effectiveSubscriptionAccess: EffectiveSubscriptionAccess;
  inviteCode: string;
  partner: User | null;
  savedSessionConditions: SavedSessionCondition[];
  sessionTemplates: SessionTemplate[];
  sessions: Session[];
  streak: StreakState;
};

type RemoteLocationAutomationSnapshot = {
  currentUserPresence: PlacePresence | null;
  enabled: boolean;
  mode: LocationAutomationMode;
  partnerPresence: PlacePresence | null;
  savedPlaces: SavedPlace[];
};

type ProfileRow = {
  id: string;
  display_name: string;
  avatar_path: string | null;
  timezone: string;
  onboarding: JsonRecord;
  preferences: JsonRecord;
  created_at: string;
  updated_at: string;
};

type CoupleRow = {
  id: string;
  invite_code: string | null;
  status: Couple['status'];
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
};

type CoupleMemberRow = {
  id: string;
  couple_id: string;
  user_id: string;
  membership_status: 'pending' | 'active' | 'removed';
  joined_at: string | null;
  created_at: string;
  updated_at: string;
};

type CoupleLocationSettingsRow = {
  couple_id: string;
  enabled: boolean;
  mode: LocationAutomationMode;
  created_at: string;
  updated_at: string;
};

type SavedPlaceRow = {
  id: string;
  couple_id: string;
  created_by_user_id: string;
  label: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

type UserPlacePresenceRow = {
  user_id: string;
  couple_id: string;
  place_id: string | null;
  updated_at: string;
};

type SessionPresetRow = {
  id: string;
  user_id: string;
  label: string;
  default_title: string;
  allowed_minutes: number;
  interval_hours: number;
  grace_seconds: number;
  description: string | null;
  intensity: SavedSessionCondition['intensity'];
  essential_app_hints: unknown;
  short_session_duration_minutes: number | null;
  session_scope: SessionScope;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

type SessionTemplateRow = {
  id: string;
  created_by_user_id: string;
  couple_id: string | null;
  title: string;
  session_scope: SessionScope;
  profile_id: string | null;
  profile_snapshot: JsonRecord;
  duration_minutes: number;
  short_session_mode: boolean;
  grace_seconds: number;
  recurrence: SessionTemplate['schedule']['recurrence'];
  schedule_days: unknown;
  start_minute_of_day: number;
  starts_on: string;
  ends_on: string | null;
  warning_minutes: unknown;
  status: SessionTemplate['status'];
  created_at: string;
  updated_at: string;
};

type SessionRow = {
  id: string;
  couple_id: string | null;
  created_by_user_id: string;
  template_id: string | null;
  template_occurrence_key: string | null;
  source: Session['source'];
  scope: SessionScope;
  title: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  timezone: string;
  grace_seconds: number;
  short_session_mode: boolean;
  warning_minutes_before: unknown;
  status: Session['status'];
  condition_preset_id: string | null;
  condition_snapshot: JsonRecord;
  profile_snapshot: JsonRecord;
  armed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  interrupted_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type SessionParticipantRow = {
  id: string;
  session_id: string;
  user_id: string;
  acceptance_status: 'pending' | 'accepted' | 'declined';
  authorization_status_at_arm_time: AuthorizationStatus;
  last_reported_device_state: ShieldState;
  completed_successfully: boolean | null;
  interruption_reason: SessionInterruptionReason | null;
  bypass_count: number;
  last_bypassed_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

type UserSubscriptionRow = {
  user_id: string;
  revenuecat_app_user_id: string | null;
  status: SubscriptionSnapshot['status'];
  entitlement_identifier: string | null;
  management_url: string | null;
  expires_at: string | null;
  will_renew: boolean;
  unsubscribe_detected_at: string | null;
  billing_issue_detected_at: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
};

const DEFAULT_TIMEZONE = 'America/Chicago';

function assertSupabaseEnabled() {
  if (!hasSupabaseClientConfig()) {
    throw new Error('Supabase is not configured.');
  }
}

function assertNoError(error: { message: string; code?: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function isDuplicateError(error: { code?: string; message: string } | null) {
  return error?.code === '23505' || error?.message.toLowerCase().includes('duplicate');
}

function mapCouple(row: CoupleRow, members: CoupleMemberRow[]): Couple {
  const activeMembers = members.filter((member) => member.membership_status === 'active');
  return {
    id: row.id,
    partnerAUserId: activeMembers[0]?.user_id ?? row.created_by_user_id,
    partnerBUserId: activeMembers[1]?.user_id ?? '',
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapSavedPlace(row: SavedPlaceRow): SavedPlace {
  return {
    id: row.id,
    coupleId: row.couple_id,
    createdByUserId: row.created_by_user_id,
    label: row.label,
    latitude: row.latitude,
    longitude: row.longitude,
    radiusMeters: row.radius_meters,
    createdAt: row.created_at,
  };
}

function mapPlacePresence(row: UserPlacePresenceRow): PlacePresence {
  return {
    userId: row.user_id,
    coupleId: row.couple_id,
    placeId: row.place_id,
    updatedAt: row.updated_at,
  };
}

function normalizeProfileSnapshot(
  value: JsonRecord | null | undefined,
  fallback?: Partial<SavedSessionCondition>
): SavedSessionCondition | null {
  if (!value || typeof value !== 'object') {
    if (!fallback?.id || !fallback.label || !fallback.defaultTitle) {
      return null;
    }

    return {
      id: fallback.id,
      label: fallback.label,
      defaultTitle: fallback.defaultTitle,
      allowedMinutes: fallback.allowedMinutes ?? 15,
      intervalHours: fallback.intervalHours ?? 1,
      graceSeconds: fallback.graceSeconds ?? 0,
      description: fallback.description,
      intensity: fallback.intensity ?? 'balanced',
      essentialAppHints: fallback.essentialAppHints ?? [],
      shortSessionDurationMinutes: fallback.shortSessionDurationMinutes ?? null,
      sessionScope: fallback.sessionScope ?? 'shared',
      createdAt: fallback.createdAt ?? new Date().toISOString(),
    };
  }

  const id = typeof value.id === 'string' ? value.id : fallback?.id;
  const label = typeof value.label === 'string' ? value.label : fallback?.label;
  const defaultTitle =
    typeof value.defaultTitle === 'string'
      ? value.defaultTitle
      : fallback?.defaultTitle ?? label;

  if (!id || !label || !defaultTitle) {
    return null;
  }

  return {
    id,
    label,
    defaultTitle,
    allowedMinutes:
      typeof value.allowedMinutes === 'number' ? value.allowedMinutes : fallback?.allowedMinutes ?? 15,
    intervalHours:
      typeof value.intervalHours === 'number' ? value.intervalHours : fallback?.intervalHours ?? 1,
    graceSeconds:
      typeof value.graceSeconds === 'number' ? value.graceSeconds : fallback?.graceSeconds ?? 0,
    description:
      typeof value.description === 'string'
        ? value.description
        : fallback?.description,
    intensity:
      value.intensity === 'light' || value.intensity === 'balanced' || value.intensity === 'deep'
        ? value.intensity
        : fallback?.intensity ?? 'balanced',
    essentialAppHints:
      Array.isArray(value.essentialAppHints)
        ? value.essentialAppHints.filter((entry): entry is string => typeof entry === 'string')
        : fallback?.essentialAppHints ?? [],
    shortSessionDurationMinutes:
      typeof value.shortSessionDurationMinutes === 'number'
        ? value.shortSessionDurationMinutes
        : fallback?.shortSessionDurationMinutes ?? null,
    sessionScope:
      value.sessionScope === 'solo' || value.sessionScope === 'shared'
        ? value.sessionScope
        : fallback?.sessionScope ?? 'shared',
    createdAt:
      typeof value.createdAt === 'string' ? value.createdAt : fallback?.createdAt ?? new Date().toISOString(),
  };
}

function mapPreset(row: SessionPresetRow): SavedSessionCondition {
  return {
    id: row.id,
    label: row.label,
    defaultTitle: row.default_title,
    allowedMinutes: row.allowed_minutes,
    intervalHours: row.interval_hours,
    graceSeconds: row.grace_seconds,
    description: row.description ?? undefined,
    intensity: row.intensity ?? 'balanced',
    essentialAppHints: Array.isArray(row.essential_app_hints)
      ? row.essential_app_hints.filter((entry): entry is string => typeof entry === 'string')
      : [],
    shortSessionDurationMinutes: row.short_session_duration_minutes,
    sessionScope: row.session_scope ?? 'shared',
    createdAt: row.created_at,
  };
}

function profileSnapshot(profile: SavedSessionCondition | null | undefined) {
  if (!profile) {
    return {};
  }

  return {
    id: profile.id,
    label: profile.label,
    defaultTitle: profile.defaultTitle,
    allowedMinutes: profile.allowedMinutes,
    intervalHours: profile.intervalHours,
    graceSeconds: profile.graceSeconds,
    description: profile.description,
    intensity: profile.intensity,
    essentialAppHints: profile.essentialAppHints,
    shortSessionDurationMinutes: profile.shortSessionDurationMinutes,
    sessionScope: profile.sessionScope,
    createdAt: profile.createdAt,
  };
}

function normalizeConditionSnapshot(value: JsonRecord | null | undefined): SessionCondition | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const allowedMinutes = value.allowedMinutes;
  const intervalHours = value.intervalHours;

  if (typeof allowedMinutes !== 'number' || typeof intervalHours !== 'number') {
    return null;
  }

  return {
    allowedMinutes,
    intervalHours,
    presetId: typeof value.presetId === 'string' ? value.presetId : undefined,
    presetLabel: typeof value.presetLabel === 'string' ? value.presetLabel : undefined,
    intensity:
      value.intensity === 'light' || value.intensity === 'balanced' || value.intensity === 'deep'
        ? value.intensity
        : undefined,
    description: typeof value.description === 'string' ? value.description : undefined,
    essentialAppHints: Array.isArray(value.essentialAppHints)
      ? value.essentialAppHints.filter((entry): entry is string => typeof entry === 'string')
      : undefined,
    shortSessionDurationMinutes:
      typeof value.shortSessionDurationMinutes === 'number'
        ? value.shortSessionDurationMinutes
        : undefined,
  };
}

function buildPartnerPlaceholder(coupleId: string, timezone: string): User {
  return {
    id: `pending-${coupleId}`,
    displayName: 'Partner pending',
    timezone,
  };
}

function buildStreak(sessions: Session[]): StreakState {
  const finished = [...sessions]
    .filter((entry) => ['completed', 'interrupted'].includes(entry.status))
    .sort(
      (left, right) =>
        new Date(right.scheduledStartAt).getTime() - new Date(left.scheduledStartAt).getTime()
    );

  let current = 0;
  for (const session of finished) {
    if (session.status === 'completed') {
      current += 1;
      continue;
    }
    break;
  }

  const totalCompleted = sessions.filter((entry) => entry.status === 'completed').length;

  return {
    current,
    best: Math.max(current, totalCompleted),
    totalCompleted,
  };
}

async function ensureProfile(session: AuthSession) {
  const supabase = getTwogetherSupabaseClient();
  const { error } = await supabase.from('profiles').upsert(
    {
      id: session.userId,
      display_name: session.displayName,
      timezone: DEFAULT_TIMEZONE,
    },
    {
      onConflict: 'id',
    }
  );

  assertNoError(error);
}

async function fetchProfile(session: AuthSession): Promise<ProfileRow> {
  const supabase = getTwogetherSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.userId)
    .single();

  assertNoError(error);
  return data as ProfileRow;
}

async function ensureDefaultPresets(
  session: AuthSession,
  defaults: SavedSessionCondition[]
): Promise<SessionPresetRow[]> {
  const supabase = getTwogetherSupabaseClient();
  const { data, error } = await supabase
    .from('session_presets')
    .select('*')
    .eq('user_id', session.userId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  assertNoError(error);

  const rows = (data ?? []) as SessionPresetRow[];
  if (rows.length > 0 || defaults.length === 0) {
    return rows;
  }

  const { error: insertError } = await supabase.from('session_presets').insert(
    defaults.map((preset) => ({
      user_id: session.userId,
      label: preset.label,
      default_title: preset.defaultTitle,
      allowed_minutes: preset.allowedMinutes,
      interval_hours: preset.intervalHours,
      grace_seconds: preset.graceSeconds,
      description: preset.description ?? null,
      intensity: preset.intensity,
      essential_app_hints: preset.essentialAppHints,
      short_session_duration_minutes: preset.shortSessionDurationMinutes,
      session_scope: preset.sessionScope,
    }))
  );

  assertNoError(insertError);

  const { data: inserted, error: refetchError } = await supabase
    .from('session_presets')
    .select('*')
    .eq('user_id', session.userId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  assertNoError(refetchError);
  return (inserted ?? []) as SessionPresetRow[];
}

async function fetchCurrentCouple(
  userId: string
): Promise<{ couple: CoupleRow; members: CoupleMemberRow[] } | null> {
  const supabase = getTwogetherSupabaseClient();
  const { data, error } = await supabase
    .from('couple_members')
    .select('*')
    .eq('user_id', userId)
    .in('membership_status', ['pending', 'active'])
    .order('created_at', { ascending: false });

  assertNoError(error);

  const membershipRows = (data ?? []) as CoupleMemberRow[];
  if (membershipRows.length === 0) {
    return null;
  }

  const preferred =
    membershipRows.find((row) => row.membership_status === 'active') ?? membershipRows[0];

  const { data: coupleData, error: coupleError } = await supabase
    .from('couples')
    .select('*')
    .eq('id', preferred.couple_id)
    .single();

  assertNoError(coupleError);

  const { data: allMembers, error: membersError } = await supabase
    .from('couple_members')
    .select('*')
    .eq('couple_id', preferred.couple_id)
    .in('membership_status', ['pending', 'active'])
    .order('created_at', { ascending: true });

  assertNoError(membersError);

  return {
    couple: coupleData as CoupleRow,
    members: (allMembers ?? []) as CoupleMemberRow[],
  };
}

async function fetchProfilesByIds(userIds: string[]): Promise<Map<string, ProfileRow>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const supabase = getTwogetherSupabaseClient();
  const { data, error } = await supabase.from('profiles').select('*').in('id', userIds);

  assertNoError(error);
  return new Map(((data ?? []) as ProfileRow[]).map((row) => [row.id, row]));
}

async function fetchSessionTemplatesForUser(
  userId: string,
  coupleId: string | null,
  presetMap: Map<string, SavedSessionCondition>
): Promise<SessionTemplate[]> {
  const supabase = getTwogetherSupabaseClient();
  const templateMap = new Map<string, SessionTemplateRow>();

  const { data: ownRows, error: ownError } = await supabase
    .from('session_templates')
    .select('*')
    .eq('created_by_user_id', userId)
    .order('created_at', { ascending: false });

  assertNoError(ownError);
  ((ownRows ?? []) as SessionTemplateRow[]).forEach((row) => templateMap.set(row.id, row));

  if (coupleId) {
    const { data: sharedRows, error: sharedError } = await supabase
      .from('session_templates')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });

    assertNoError(sharedError);
    ((sharedRows ?? []) as SessionTemplateRow[]).forEach((row) => templateMap.set(row.id, row));
  }

  return [...templateMap.values()].map((row) => {
    const fallbackProfile = row.profile_id ? presetMap.get(row.profile_id) : undefined;
    return {
      id: row.id,
      createdByUserId: row.created_by_user_id,
      coupleId: row.couple_id,
      title: row.title,
      sessionScope: row.session_scope,
      profileId: row.profile_id,
      durationMinutes: row.duration_minutes,
      shortSessionMode: row.short_session_mode,
      graceSeconds: row.grace_seconds,
      status: row.status,
      createdAt: row.created_at,
      schedule: {
        recurrence: row.recurrence,
        daysOfWeek: parseNumberArray(row.schedule_days),
        startMinuteOfDay: row.start_minute_of_day,
        startDate: row.starts_on,
        endDate: row.ends_on,
        warningMinutes: parseNumberArray(row.warning_minutes),
      },
      profile: normalizeProfileSnapshot(row.profile_snapshot, fallbackProfile) ?? fallbackProfile ?? null,
    };
  });
}

async function ensureDefaultTemplates(
  session: AuthSession,
  currentCouple: { couple: CoupleRow; members: CoupleMemberRow[] } | null,
  presets: SavedSessionCondition[]
) {
  const supabase = getTwogetherSupabaseClient();
  const { data, error } = await supabase
    .from('session_templates')
    .select('id, session_scope, couple_id')
    .eq('created_by_user_id', session.userId);

  assertNoError(error);

  const rows = (data ?? []) as {
    id: string;
    session_scope: SessionScope;
    couple_id: string | null;
  }[];
  const hasSoloTemplate = rows.some((row) => row.session_scope === 'solo');
  const hasSharedTemplate = currentCouple
    ? rows.some((row) => row.session_scope === 'shared' && row.couple_id === currentCouple.couple.id)
    : true;

  const defaults = createDefaultSessionTemplates({
    createdByUserId: session.userId,
    coupleId: currentCouple?.couple.id ?? null,
    conditions: presets,
  }).filter((template) => {
    if (template.sessionScope === 'solo') {
      return !hasSoloTemplate;
    }

    return currentCouple !== null && !hasSharedTemplate;
  });

  if (defaults.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from('session_templates').insert(
    defaults.map((template) => ({
      created_by_user_id: session.userId,
      couple_id: template.sessionScope === 'shared' ? currentCouple?.couple.id ?? null : null,
      title: template.title,
      session_scope: template.sessionScope,
      profile_id: template.profileId,
      profile_snapshot: profileSnapshot(template.profile),
      duration_minutes: template.durationMinutes,
      short_session_mode: template.shortSessionMode,
      grace_seconds: template.graceSeconds,
      recurrence: template.schedule.recurrence,
      schedule_days: template.schedule.daysOfWeek,
      start_minute_of_day: template.schedule.startMinuteOfDay,
      starts_on: template.schedule.startDate,
      ends_on: template.schedule.endDate ?? null,
      warning_minutes: template.schedule.warningMinutes,
      status: template.status,
    }))
  );

  assertNoError(insertError);
}

async function fetchSessionsForUser(userId: string): Promise<Session[]> {
  const supabase = getTwogetherSupabaseClient();
  const { data: membershipRows, error: membershipError } = await supabase
    .from('session_participants')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  assertNoError(membershipError);

  const myParticipantRows = (membershipRows ?? []) as SessionParticipantRow[];
  const sessionIds = [...new Set(myParticipantRows.map((row) => row.session_id))];

  if (sessionIds.length === 0) {
    return [];
  }

  const { data: sessionRows, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .in('id', sessionIds)
    .order('scheduled_start_at', { ascending: true });

  assertNoError(sessionsError);

  const rows = (sessionRows ?? []) as SessionRow[];
  const { data: participantRows, error: participantsError } = await supabase
    .from('session_participants')
    .select('*')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: true });

  assertNoError(participantsError);

  const participants = (participantRows ?? []) as SessionParticipantRow[];
  const profileMap = await fetchProfilesByIds([
    ...new Set(participants.map((participant) => participant.user_id)),
  ]);

  return rows.map((row) => {
    const profile = normalizeProfileSnapshot(row.profile_snapshot);
    return {
      id: row.id,
      coupleId: row.couple_id ?? '',
      createdByUserId: row.created_by_user_id,
      templateId: row.template_id,
      source: row.source ?? 'manual',
      scope: row.scope ?? (row.couple_id ? 'shared' : 'solo'),
      title: row.title,
      scheduledStartAt: row.scheduled_start_at,
      scheduledEndAt: row.scheduled_end_at,
      timezone: row.timezone,
      graceSeconds: row.grace_seconds,
      shortSessionMode: row.short_session_mode,
      warningMinutesBefore: parseNumberArray(row.warning_minutes_before),
      condition: normalizeConditionSnapshot(row.condition_snapshot),
      profile,
      status: row.status,
      createdAt: row.created_at,
      participants: participants
        .filter((participant) => participant.session_id === row.id)
        .map((participant) => ({
          id: participant.id,
          userId: participant.user_id,
          displayName: profileMap.get(participant.user_id)?.display_name ?? 'Partner',
          acceptanceStatus: participant.acceptance_status,
          authorizationStatusAtArmTime: participant.authorization_status_at_arm_time,
          localShieldState: participant.last_reported_device_state,
          completedSuccessfully: participant.completed_successfully ?? undefined,
          interruptionReason: participant.interruption_reason ?? undefined,
          bypassCount: participant.bypass_count,
          lastBypassedAt: participant.last_bypassed_at ?? undefined,
        })),
    };
  });
}

async function fetchSubscriptions(userIds: string[]) {
  if (userIds.length === 0) {
    return [];
  }

  const supabase = getTwogetherSupabaseClient();
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .in('user_id', userIds);

  assertNoError(error);
  return (data ?? []) as UserSubscriptionRow[];
}

export async function fetchRemoteLocationAutomationSnapshot(
  session: AuthSession
): Promise<RemoteLocationAutomationSnapshot> {
  assertSupabaseEnabled();

  const currentCouple = await fetchCurrentCouple(session.userId);
  if (!currentCouple || currentCouple.couple.status !== 'active') {
    return {
      currentUserPresence: null,
      enabled: false,
      mode: 'suggest',
      partnerPresence: null,
      savedPlaces: [],
    };
  }

  const supabase = getTwogetherSupabaseClient();
  const activeMemberIds = currentCouple.members
    .filter((member) => member.membership_status === 'active')
    .map((member) => member.user_id);
  const partnerUserId = activeMemberIds.find((userId) => userId !== session.userId) ?? null;

  const [
    { data: settingsRow, error: settingsError },
    { data: placeRows, error: placesError },
    { data: presenceRows, error: presenceError },
  ] = await Promise.all([
    supabase
      .from('couple_location_settings')
      .select('*')
      .eq('couple_id', currentCouple.couple.id)
      .maybeSingle(),
    supabase
      .from('saved_places')
      .select('*')
      .eq('couple_id', currentCouple.couple.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_place_presence')
      .select('*')
      .eq('couple_id', currentCouple.couple.id)
      .in('user_id', activeMemberIds),
  ]);

  assertNoError(settingsError);
  assertNoError(placesError);
  assertNoError(presenceError);

  const presence = (presenceRows ?? []) as UserPlacePresenceRow[];

  return {
    currentUserPresence:
      presence.find((row) => row.user_id === session.userId) ? mapPlacePresence(
        presence.find((row) => row.user_id === session.userId) as UserPlacePresenceRow
      ) : null,
    enabled: (settingsRow as CoupleLocationSettingsRow | null)?.enabled ?? false,
    mode: (settingsRow as CoupleLocationSettingsRow | null)?.mode ?? 'suggest',
    partnerPresence:
      partnerUserId && presence.find((row) => row.user_id === partnerUserId)
        ? mapPlacePresence(
            presence.find((row) => row.user_id === partnerUserId) as UserPlacePresenceRow
          )
        : null,
    savedPlaces: ((placeRows ?? []) as SavedPlaceRow[]).map(mapSavedPlace),
  };
}

export async function saveRemoteLocationAutomationSettings(
  session: AuthSession,
  settings: {
    enabled: boolean;
    mode: LocationAutomationMode;
  }
) {
  assertSupabaseEnabled();

  const currentCouple = await fetchCurrentCouple(session.userId);
  if (!currentCouple || currentCouple.couple.status !== 'active') {
    throw new Error('Pair with your partner before enabling saved-place automation.');
  }

  const supabase = getTwogetherSupabaseClient();
  const { error } = await supabase.from('couple_location_settings').upsert(
    {
      couple_id: currentCouple.couple.id,
      enabled: settings.enabled,
      mode: settings.mode,
    },
    {
      onConflict: 'couple_id',
    }
  );

  assertNoError(error);
}

export async function saveRemotePlace(
  session: AuthSession,
  place: {
    label: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  }
) {
  assertSupabaseEnabled();

  const currentCouple = await fetchCurrentCouple(session.userId);
  if (!currentCouple || currentCouple.couple.status !== 'active') {
    throw new Error('Pair with your partner before saving places.');
  }

  const supabase = getTwogetherSupabaseClient();
  const { error } = await supabase.from('saved_places').insert({
    couple_id: currentCouple.couple.id,
    created_by_user_id: session.userId,
    label: place.label.trim(),
    latitude: place.latitude,
    longitude: place.longitude,
    radius_meters: place.radiusMeters,
  });

  assertNoError(error);
}

export async function archiveRemotePlace(session: AuthSession, placeId: string) {
  assertSupabaseEnabled();

  const supabase = getTwogetherSupabaseClient();
  const { error } = await supabase
    .from('saved_places')
    .update({ is_archived: true })
    .eq('id', placeId);

  assertNoError(error);
}

export async function updateRemotePlacePresence(
  session: AuthSession,
  placeId: string | null
) {
  assertSupabaseEnabled();

  const currentCouple = await fetchCurrentCouple(session.userId);
  if (!currentCouple || currentCouple.couple.status !== 'active') {
    return;
  }

  const supabase = getTwogetherSupabaseClient();
  const { error } = await supabase.from('user_place_presence').upsert(
    {
      user_id: session.userId,
      couple_id: currentCouple.couple.id,
      place_id: placeId,
    },
    {
      onConflict: 'user_id',
    }
  );

  assertNoError(error);
}

function buildEffectiveSubscriptionAccess(params: {
  currentUserId: string;
  partner: User | null;
  rows: UserSubscriptionRow[];
}): EffectiveSubscriptionAccess {
  const rowsByUserId = new Map(params.rows.map((row) => [row.user_id, row]));
  const current = rowsByUserId.get(params.currentUserId);
  const partnerRow = params.partner ? rowsByUserId.get(params.partner.id) : undefined;

  if (current?.status === 'active') {
    return {
      isPremium: true,
      source: 'self',
      ownerUserId: params.currentUserId,
      ownerDisplayName: null,
      entitlementIdentifier: current.entitlement_identifier,
      expiresAt: current.expires_at,
      willRenew: current.will_renew,
    };
  }

  if (partnerRow?.status === 'active') {
    return {
      isPremium: true,
      source: 'partner',
      ownerUserId: partnerRow.user_id,
      ownerDisplayName: params.partner?.displayName ?? null,
      entitlementIdentifier: partnerRow.entitlement_identifier,
      expiresAt: partnerRow.expires_at,
      willRenew: partnerRow.will_renew,
    };
  }

  return {
    isPremium: false,
    source: 'none',
    ownerUserId: null,
    ownerDisplayName: null,
    entitlementIdentifier: current?.entitlement_identifier ?? null,
    expiresAt: current?.expires_at ?? null,
    willRenew: current?.will_renew ?? false,
  };
}

async function materializeTemplateSessions(params: {
  session: AuthSession;
  currentUser: User;
  currentCouple: { couple: CoupleRow; members: CoupleMemberRow[] } | null;
  templates: SessionTemplate[];
  existingSessions: Session[];
}) {
  const supabase = getTwogetherSupabaseClient();
  const existingKeys = new Set(
    params.existingSessions
      .filter((entry) => entry.templateId)
      .map((entry) => `${entry.templateId}:${entry.scheduledStartAt}`)
  );

  for (const template of params.templates) {
    if (template.status !== 'active') {
      continue;
    }

    if (template.sessionScope === 'shared' && !params.currentCouple) {
      continue;
    }

    const occurrences = getUpcomingTemplateOccurrences({
      template,
      from: new Date(),
      horizonDays: UPCOMING_SESSION_HORIZON_DAYS,
    });

    for (const occurrence of occurrences) {
      const key = `${template.id}:${occurrence.toISOString()}`;

      if (existingKeys.has(key)) {
        continue;
      }

      const endAt = addMinutes(occurrence, template.durationMinutes);
      const participants =
        template.sessionScope === 'shared'
          ? (params.currentCouple?.members ?? []).map((member) => ({
              user_id: member.user_id,
              acceptance_status:
                member.user_id === params.session.userId ? 'accepted' : 'pending',
              authorization_status_at_arm_time:
                member.user_id === params.session.userId ? 'notDetermined' : 'notDetermined',
              last_reported_device_state: 'idle',
            }))
          : [
              {
                user_id: params.session.userId,
                acceptance_status: 'accepted',
                authorization_status_at_arm_time: 'notDetermined',
                last_reported_device_state: 'idle',
              },
            ];

      const { data: createdSession, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          couple_id: template.sessionScope === 'shared' ? params.currentCouple?.couple.id ?? null : null,
          created_by_user_id: template.createdByUserId,
          template_id: template.id,
          template_occurrence_key: occurrence.toISOString(),
          source: 'template',
          scope: template.sessionScope,
          title: template.title,
          scheduled_start_at: occurrence.toISOString(),
          scheduled_end_at: endAt.toISOString(),
          timezone: params.currentUser.timezone,
          grace_seconds: template.graceSeconds,
          short_session_mode: template.shortSessionMode,
          warning_minutes_before: template.schedule.warningMinutes,
          status: template.sessionScope === 'shared' ? 'pending_acceptance' : 'draft',
          condition_preset_id: template.profileId,
          condition_snapshot: profileToCondition(template.profile),
          profile_snapshot: profileSnapshot(template.profile),
        })
        .select('id')
        .single();

      if (sessionError && isDuplicateError(sessionError)) {
        existingKeys.add(key);
        continue;
      }

      assertNoError(sessionError);
      const createdSessionId = (createdSession as { id: string }).id;

      const { error: participantError } = await supabase.from('session_participants').insert(
        participants.map((participant) => ({
          session_id: createdSessionId,
          ...participant,
        }))
      );

      assertNoError(participantError);

      const { error: logError } = await supabase.from('session_logs').insert({
        session_id: createdSessionId,
        actor_user_id: template.createdByUserId,
        event_type: 'template_materialized',
        payload: {
          templateId: template.id,
          sessionScope: template.sessionScope,
        },
      });

      assertNoError(logError);
      existingKeys.add(key);
    }
  }
}

export function hasSupabaseSync() {
  return hasSupabaseClientConfig();
}

export async function fetchRemoteSnapshot(
  session: AuthSession,
  defaults: SavedSessionCondition[]
): Promise<RemoteSnapshot> {
  assertSupabaseEnabled();
  await ensureProfile(session);

  const [profile, presetRows, currentCouple] = await Promise.all([
    fetchProfile(session),
    ensureDefaultPresets(session, defaults),
    fetchCurrentCouple(session.userId),
  ]);

  const savedSessionConditions = presetRows.map(mapPreset);
  const presetMap = new Map(savedSessionConditions.map((preset) => [preset.id, preset]));
  const currentUser: User = {
    id: profile.id,
    displayName: profile.display_name,
    email: session.email,
    authProvider: session.provider,
    timezone: profile.timezone || DEFAULT_TIMEZONE,
  };

  const couple = currentCouple ? mapCouple(currentCouple.couple, currentCouple.members) : null;
  const otherMemberIds = currentCouple
    ? currentCouple.members.filter((member) => member.user_id !== session.userId).map((member) => member.user_id)
    : [];
  const partnerProfiles = await fetchProfilesByIds(otherMemberIds);
  const firstPartnerProfile = otherMemberIds.map((id) => partnerProfiles.get(id)).find(Boolean);
  const partner = firstPartnerProfile
    ? {
        id: firstPartnerProfile.id,
        displayName: firstPartnerProfile.display_name,
        timezone: firstPartnerProfile.timezone || currentUser.timezone,
      }
    : currentCouple
      ? buildPartnerPlaceholder(couple?.id ?? currentCouple.couple.id, currentUser.timezone)
      : null;

  await ensureDefaultTemplates(session, currentCouple, savedSessionConditions);
  const sessionTemplates = await fetchSessionTemplatesForUser(
    session.userId,
    currentCouple?.couple.id ?? null,
    presetMap
  );

  const existingSessions = await fetchSessionsForUser(session.userId);
  await materializeTemplateSessions({
    session,
    currentUser,
    currentCouple,
    templates: sessionTemplates,
    existingSessions,
  });

  const sessions = await fetchSessionsForUser(session.userId);
  const subscriptionRows = await fetchSubscriptions(
    [session.userId, ...(partner ? [partner.id] : [])]
  );
  const effectiveSubscriptionAccess = buildEffectiveSubscriptionAccess({
    currentUserId: session.userId,
    partner,
    rows: subscriptionRows,
  });

  return {
    currentUser,
    couple,
    effectiveSubscriptionAccess,
    partner,
    inviteCode: currentCouple?.couple.invite_code ?? createInviteCode(),
    savedSessionConditions,
    sessionTemplates,
    sessions,
    streak: buildStreak(sessions),
  };
}

export async function syncRemoteSubscriptionSnapshot(
  session: AuthSession,
  snapshot: SubscriptionSnapshot
) {
  assertSupabaseEnabled();
  await ensureProfile(session);

  const supabase = getTwogetherSupabaseClient();
  const { error } = await supabase.from('user_subscriptions').upsert(
    {
      user_id: session.userId,
      source: 'revenuecat',
      revenuecat_app_user_id: snapshot.appUserId,
      status: snapshot.status,
      entitlement_identifier: snapshot.activeEntitlementIdentifier,
      management_url: snapshot.managementUrl,
      expires_at: snapshot.expiresAt,
      will_renew: snapshot.willRenew,
      unsubscribe_detected_at: snapshot.unsubscribeDetectedAt,
      billing_issue_detected_at: snapshot.billingIssueDetectedAt,
      synced_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
    }
  );

  assertNoError(error);
}

export async function createRemotePairing(session: AuthSession, inviteCode: string) {
  assertSupabaseEnabled();
  await ensureProfile(session);

  const existing = await fetchCurrentCouple(session.userId);
  if (existing) {
    return;
  }

  const supabase = getTwogetherSupabaseClient();
  const { data: coupleData, error: coupleError } = await supabase
    .from('couples')
    .insert({
      invite_code: inviteCode,
      status: 'pending',
      created_by_user_id: session.userId,
    })
    .select('*')
    .single();

  assertNoError(coupleError);

  const { error: memberError } = await supabase.from('couple_members').insert({
    couple_id: (coupleData as CoupleRow).id,
    user_id: session.userId,
    membership_status: 'active',
    joined_at: new Date().toISOString(),
  });

  assertNoError(memberError);
}

export async function joinRemotePairingByInviteCode(
  session: AuthSession,
  inviteCode: string
) {
  assertSupabaseEnabled();
  await ensureProfile(session);

  const trimmedInviteCode = inviteCode.trim().toUpperCase();
  if (!trimmedInviteCode) {
    throw new Error('Enter an invite code.');
  }

  const existing = await fetchCurrentCouple(session.userId);
  if (existing) {
    return;
  }

  const supabase = getTwogetherSupabaseClient();
  const { data: coupleRows, error: coupleError } = await supabase
    .from('couples')
    .select('*')
    .eq('invite_code', trimmedInviteCode)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1);

  assertNoError(coupleError);

  const coupleRow = ((coupleRows ?? []) as CoupleRow[])[0];
  if (!coupleRow) {
    throw new Error('That invite code could not be found.');
  }

  if (coupleRow.created_by_user_id === session.userId) {
    throw new Error("You can't join your own invite code.");
  }

  const { data: memberRows, error: membersError } = await supabase
    .from('couple_members')
    .select('*')
    .eq('couple_id', coupleRow.id)
    .in('membership_status', ['pending', 'active'])
    .order('created_at', { ascending: true });

  assertNoError(membersError);

  const activeMembers = (memberRows ?? []) as CoupleMemberRow[];
  if (activeMembers.some((member) => member.user_id === session.userId)) {
    return;
  }

  if (activeMembers.length >= 2) {
    throw new Error('That invite code has already been used.');
  }

  const { error: joinError } = await supabase.from('couple_members').insert({
    couple_id: coupleRow.id,
    user_id: session.userId,
    membership_status: 'active',
    joined_at: new Date().toISOString(),
  });

  assertNoError(joinError);

  const { error: updateError } = await supabase
    .from('couples')
    .update({ status: 'active' })
    .eq('id', coupleRow.id);

  assertNoError(updateError);
}

export async function saveRemoteSessionPreset(session: AuthSession, draft: PresetDraft) {
  assertSupabaseEnabled();
  const supabase = getTwogetherSupabaseClient();
  const { data, error } = await supabase
    .from('session_presets')
    .insert({
      user_id: session.userId,
      label: draft.label.trim(),
      default_title: draft.defaultTitle.trim(),
      allowed_minutes: draft.allowedMinutes,
      interval_hours: draft.intervalHours,
      grace_seconds: draft.graceSeconds ?? 0,
      description: draft.description ?? null,
      intensity: draft.intensity ?? 'balanced',
      essential_app_hints: draft.essentialAppHints ?? [],
      short_session_duration_minutes: draft.shortSessionDurationMinutes ?? null,
      session_scope: draft.sessionScope ?? 'shared',
    })
    .select('id')
    .single();

  assertNoError(error);
  return (data as { id: string }).id;
}

export async function createRemoteSessionTemplate(
  session: AuthSession,
  draft: SessionTemplateDraft
) {
  assertSupabaseEnabled();
  const currentCouple = await fetchCurrentCouple(session.userId);

  if (draft.sessionScope === 'shared' && !currentCouple) {
    throw new Error('Pair with your partner before creating a shared recurring session.');
  }

  const supabase = getTwogetherSupabaseClient();
  const { data, error } = await supabase
    .from('session_templates')
    .insert({
      created_by_user_id: session.userId,
      couple_id: draft.sessionScope === 'shared' ? currentCouple?.couple.id ?? null : null,
      title: draft.title.trim(),
      session_scope: draft.sessionScope,
      profile_id: draft.profileId,
      profile_snapshot: profileSnapshot(draft.profile),
      duration_minutes: draft.durationMinutes,
      short_session_mode: draft.shortSessionMode,
      grace_seconds: draft.graceSeconds,
      recurrence: draft.schedule.recurrence,
      schedule_days: draft.schedule.daysOfWeek,
      start_minute_of_day: draft.schedule.startMinuteOfDay,
      starts_on: draft.schedule.startDate,
      ends_on: draft.schedule.endDate ?? null,
      warning_minutes: draft.schedule.warningMinutes,
      status: 'active',
    })
    .select('id')
    .single();

  assertNoError(error);
  return (data as { id: string }).id;
}

export async function updateRemoteSessionTemplateStatus(
  session: AuthSession,
  templateId: string,
  status: SessionTemplate['status']
) {
  assertSupabaseEnabled();
  const supabase = getTwogetherSupabaseClient();
  const { error } = await supabase
    .from('session_templates')
    .update({ status })
    .eq('id', templateId)
    .eq('created_by_user_id', session.userId);

  assertNoError(error);
}

export async function createRemoteSession(
  session: AuthSession,
  draft: SessionDraft,
  localState: {
    authorizationStatus: AuthorizationStatus;
    currentUser: User;
    selectionConfigured: boolean;
  }
) {
  assertSupabaseEnabled();

  const scope = draft.scope ?? 'shared';
  const currentCouple = scope === 'shared' ? await fetchCurrentCouple(session.userId) : null;
  if (scope === 'shared' && !currentCouple) {
    throw new Error('Pair with your partner before creating a shared session.');
  }

  const supabase = getTwogetherSupabaseClient();
  const isReady =
    localState.authorizationStatus === 'approved' && localState.selectionConfigured;
  const status: Session['status'] =
    scope === 'solo' ? (isReady ? 'armed' : 'draft') : isReady ? 'armed' : 'pending_acceptance';
  const profile = draft.profile ?? null;
  const conditionSnapshot = draft.condition
    ? {
        allowedMinutes: draft.condition.allowedMinutes,
        intervalHours: draft.condition.intervalHours,
        presetId: draft.condition.presetId,
        presetLabel: draft.condition.presetLabel,
        intensity: draft.condition.intensity,
        description: draft.condition.description,
        essentialAppHints: draft.condition.essentialAppHints,
        shortSessionDurationMinutes: draft.condition.shortSessionDurationMinutes,
      }
    : {};
  const lifecyclePatch =
    status === 'armed'
      ? {
          armed_at: new Date().toISOString(),
        }
      : {};

  const { data: createdSession, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      couple_id: scope === 'shared' ? currentCouple?.couple.id ?? null : null,
      created_by_user_id: session.userId,
      template_id: draft.templateId ?? null,
      source: draft.source ?? 'manual',
      scope,
      title: draft.title.trim(),
      scheduled_start_at: draft.startISO,
      scheduled_end_at: draft.endISO,
      timezone: localState.currentUser.timezone,
      grace_seconds: draft.graceSeconds,
      short_session_mode: draft.shortSessionMode ?? false,
      warning_minutes_before: draft.warningMinutesBefore ?? [],
      status,
      condition_preset_id: draft.condition?.presetId ?? null,
      condition_snapshot: conditionSnapshot,
      profile_snapshot: profileSnapshot(profile ?? draft.profile ?? null),
      ...lifecyclePatch,
    })
    .select('id')
    .single();

  assertNoError(sessionError);

  const participantRows =
    scope === 'shared'
      ? (currentCouple?.members ?? []).map((member) => ({
          session_id: (createdSession as { id: string }).id,
          user_id: member.user_id,
          acceptance_status: member.user_id === session.userId ? 'accepted' : 'pending',
          authorization_status_at_arm_time:
            member.user_id === session.userId ? localState.authorizationStatus : 'notDetermined',
          last_reported_device_state:
            member.user_id === session.userId && isReady ? 'armed' : 'idle',
        }))
      : [
          {
            session_id: (createdSession as { id: string }).id,
            user_id: session.userId,
            acceptance_status: 'accepted',
            authorization_status_at_arm_time: localState.authorizationStatus,
            last_reported_device_state: isReady ? 'armed' : 'idle',
          },
        ];

  const { error: participantError } = await supabase
    .from('session_participants')
    .insert(participantRows);

  assertNoError(participantError);

  const { error: logError } = await supabase.from('session_logs').insert({
    session_id: (createdSession as { id: string }).id,
    actor_user_id: session.userId,
    event_type: 'session_created',
    payload: {
      status,
      scope,
      source: draft.source ?? 'manual',
    },
  });

  assertNoError(logError);

  return (createdSession as { id: string }).id;
}

export async function updateRemoteSessionState(
  session: AuthSession,
  sessionId: string,
  params: {
    authorizationStatus: AuthorizationStatus;
    reason?: SessionInterruptionReason;
    selectionConfigured: boolean;
    status: Session['status'];
  }
) {
  assertSupabaseEnabled();

  const supabase = getTwogetherSupabaseClient();
  const now = new Date().toISOString();
  const sessionPatch: Record<string, string> = {
    status: params.status,
  };

  if (params.status === 'armed') {
    sessionPatch.armed_at = now;
  }

  if (params.status === 'active') {
    sessionPatch.started_at = now;
  }

  if (params.status === 'completed') {
    sessionPatch.completed_at = now;
  }

  if (params.status === 'interrupted') {
    sessionPatch.interrupted_at = now;
  }

  if (params.status === 'cancelled') {
    sessionPatch.cancelled_at = now;
  }

  const { error: updateError } = await supabase
    .from('sessions')
    .update(sessionPatch)
    .eq('id', sessionId);

  assertNoError(updateError);

  const participantPatch: Record<string, string | boolean | number | null> = {
    last_seen_at: now,
  };

  if (params.status === 'pending_acceptance' || params.status === 'armed') {
    participantPatch.acceptance_status = 'accepted';
    participantPatch.authorization_status_at_arm_time = params.authorizationStatus;
    participantPatch.last_reported_device_state =
      params.authorizationStatus === 'approved' && params.selectionConfigured ? 'armed' : 'idle';
  }

  if (params.status === 'active') {
    participantPatch.last_reported_device_state = 'active';
  }

  if (params.status === 'completed') {
    participantPatch.last_reported_device_state = 'completed';
    participantPatch.completed_successfully = true;
    participantPatch.interruption_reason = null;
  }

  if (params.status === 'interrupted') {
    participantPatch.last_reported_device_state = 'interrupted';
    participantPatch.completed_successfully = false;
    participantPatch.interruption_reason = params.reason ?? 'manual_disable';

    if (params.reason === 'emergency_bypass') {
      const { data: currentParticipant, error: currentParticipantError } = await supabase
        .from('session_participants')
        .select('bypass_count')
        .eq('session_id', sessionId)
        .eq('user_id', session.userId)
        .single();

      assertNoError(currentParticipantError);
      participantPatch.bypass_count = ((currentParticipant as { bypass_count?: number })?.bypass_count ?? 0) + 1;
      participantPatch.last_bypassed_at = now;
    }
  }

  const { error: participantError } = await supabase
    .from('session_participants')
    .update(participantPatch)
    .eq('session_id', sessionId)
    .eq('user_id', session.userId);

  assertNoError(participantError);

  const { error: logError } = await supabase.from('session_logs').insert({
    session_id: sessionId,
    actor_user_id: session.userId,
    event_type: params.status === 'interrupted' && params.reason === 'emergency_bypass'
      ? 'session_bypass_used'
      : `session_${params.status}`,
    payload: {
      status: params.status,
      reason: params.reason ?? null,
    },
  });

  assertNoError(logError);
}
