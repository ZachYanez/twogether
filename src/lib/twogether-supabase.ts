import { createInviteCode } from '@/src/lib/time';
import {
  getTwogetherSupabaseClient,
  hasSupabaseClientConfig,
} from '@/src/lib/supabase-client';
import type {
  AuthSession,
  AuthorizationStatus,
  Couple,
  SavedSessionCondition,
  Session,
  SessionCondition,
  SessionInterruptionReason,
  ShieldState,
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
};

type SessionDraft = {
  title: string;
  startISO: string;
  endISO: string;
  graceSeconds: number;
  condition?: SessionCondition | null;
};

type RemoteSnapshot = {
  couple: Couple | null;
  currentUser: User;
  inviteCode: string;
  partner: User | null;
  savedSessionConditions: SavedSessionCondition[];
  sessions: Session[];
  streak: StreakState;
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

type SessionPresetRow = {
  id: string;
  user_id: string;
  label: string;
  default_title: string;
  allowed_minutes: number;
  interval_hours: number;
  grace_seconds: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

type SessionRow = {
  id: string;
  couple_id: string;
  created_by_user_id: string;
  title: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  timezone: string;
  grace_seconds: number;
  status: Session['status'];
  condition_preset_id: string | null;
  condition_snapshot: JsonRecord;
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
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_TIMEZONE = 'America/Chicago';

function assertSupabaseEnabled() {
  if (!hasSupabaseClientConfig()) {
    throw new Error('Supabase is not configured.');
  }
}

function assertNoError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function mapCouple(row: CoupleRow): Couple {
  return {
    id: row.id,
    partnerAUserId: row.created_by_user_id,
    partnerBUserId: '',
    status: row.status,
    createdAt: row.created_at,
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
    createdAt: row.created_at,
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
    .filter((session) => ['completed', 'interrupted'].includes(session.status))
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

  const totalCompleted = sessions.filter((session) => session.status === 'completed').length;

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

async function fetchSessions(coupleId: string): Promise<Session[]> {
  const supabase = getTwogetherSupabaseClient();
  const { data: sessionRows, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .eq('couple_id', coupleId)
    .order('scheduled_start_at', { ascending: true });

  assertNoError(sessionsError);

  const sessions = (sessionRows ?? []) as SessionRow[];
  if (sessions.length === 0) {
    return [];
  }

  const sessionIds = sessions.map((row) => row.id);
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

  return sessions.map((row) => ({
    id: row.id,
    coupleId: row.couple_id,
    createdByUserId: row.created_by_user_id,
    title: row.title,
    scheduledStartAt: row.scheduled_start_at,
    scheduledEndAt: row.scheduled_end_at,
    timezone: row.timezone,
    graceSeconds: row.grace_seconds,
    condition: normalizeConditionSnapshot(row.condition_snapshot),
    status: row.status,
    createdAt: row.created_at,
    participants: participants
      .filter((participant) => participant.session_id === row.id)
      .map((participant) => {
        const profile = profileMap.get(participant.user_id);
        return {
          id: participant.id,
          userId: participant.user_id,
          displayName: profile?.display_name ?? 'Partner',
          acceptanceStatus: participant.acceptance_status,
          authorizationStatusAtArmTime: participant.authorization_status_at_arm_time,
          localShieldState: participant.last_reported_device_state,
          completedSuccessfully: participant.completed_successfully ?? undefined,
          interruptionReason: participant.interruption_reason ?? undefined,
        };
      }),
  }));
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

  const [profile, presets, currentCouple] = await Promise.all([
    fetchProfile(session),
    ensureDefaultPresets(session, defaults),
    fetchCurrentCouple(session.userId),
  ]);

  const currentUser: User = {
    id: profile.id,
    displayName: profile.display_name,
    email: session.email,
    authProvider: session.provider,
    timezone: profile.timezone || DEFAULT_TIMEZONE,
  };

  if (!currentCouple) {
    return {
      currentUser,
      couple: null,
      partner: null,
      inviteCode: createInviteCode(),
      savedSessionConditions: presets.map(mapPreset),
      sessions: [],
      streak: {
        best: 0,
        current: 0,
        totalCompleted: 0,
      },
    };
  }

  const couple = mapCouple(currentCouple.couple);
  const otherMemberIds = currentCouple.members
    .filter((member) => member.user_id !== session.userId)
    .map((member) => member.user_id);
  const partnerProfiles = await fetchProfilesByIds(otherMemberIds);
  const firstPartnerProfile = otherMemberIds
    .map((id) => partnerProfiles.get(id))
    .find(Boolean);
  const partner = firstPartnerProfile
    ? {
        id: firstPartnerProfile.id,
        displayName: firstPartnerProfile.display_name,
        timezone: firstPartnerProfile.timezone || currentUser.timezone,
      }
    : buildPartnerPlaceholder(couple.id, currentUser.timezone);
  const sessions = await fetchSessions(couple.id);

  return {
    currentUser,
    couple,
    partner,
    inviteCode: currentCouple.couple.invite_code ?? createInviteCode(),
    savedSessionConditions: presets.map(mapPreset),
    sessions,
    streak: buildStreak(sessions),
  };
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
    })
    .select('id')
    .single();

  assertNoError(error);
  return (data as { id: string }).id;
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

  const currentCouple = await fetchCurrentCouple(session.userId);
  if (!currentCouple) {
    throw new Error('Pair with your partner before creating a session.');
  }

  const supabase = getTwogetherSupabaseClient();
  const isReady =
    localState.authorizationStatus === 'approved' && localState.selectionConfigured;
  const status: Session['status'] = isReady ? 'armed' : 'pending_acceptance';
  const conditionSnapshot = draft.condition
    ? {
        allowedMinutes: draft.condition.allowedMinutes,
        intervalHours: draft.condition.intervalHours,
        presetId: draft.condition.presetId,
        presetLabel: draft.condition.presetLabel,
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
      couple_id: currentCouple.couple.id,
      created_by_user_id: session.userId,
      title: draft.title.trim(),
      scheduled_start_at: draft.startISO,
      scheduled_end_at: draft.endISO,
      timezone: localState.currentUser.timezone,
      grace_seconds: draft.graceSeconds,
      status,
      condition_preset_id: draft.condition?.presetId ?? null,
      condition_snapshot: conditionSnapshot,
      ...lifecyclePatch,
    })
    .select('id')
    .single();

  assertNoError(sessionError);

  const participantRows = currentCouple.members.map((member) => ({
    session_id: (createdSession as { id: string }).id,
    user_id: member.user_id,
    acceptance_status: member.user_id === session.userId ? 'accepted' : 'pending',
    authorization_status_at_arm_time:
      member.user_id === session.userId ? localState.authorizationStatus : 'notDetermined',
    last_reported_device_state:
      member.user_id === session.userId && isReady ? 'armed' : 'idle',
  }));

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

  const participantPatch: Record<string, string | boolean | null> = {
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
    event_type: `session_${params.status}`,
    payload:
      params.reason && params.status === 'interrupted'
        ? {
            reason: params.reason,
          }
        : {},
  });

  assertNoError(logError);
}
