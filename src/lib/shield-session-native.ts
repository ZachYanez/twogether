import {
  applyRestrictionsNow,
  cancelScheduledSession,
  clearRestrictionsNow,
  scheduleSession,
} from '@/src/lib/lovelock-shield';
import type {
  AuthorizationStatus,
  SessionScope,
  SessionStatus,
} from '@/src/lib/lovelock-types';

export function deriveSessionStatusFromReadiness(params: {
  scope: SessionScope | undefined;
  authorizationStatus: AuthorizationStatus;
  selectionConfigured: boolean;
}): SessionStatus {
  const isReady = params.authorizationStatus === 'approved' && params.selectionConfigured;
  const scope = params.scope ?? 'shared';
  if (scope === 'solo') {
    return isReady ? 'armed' : 'draft';
  }
  return isReady ? 'armed' : 'pending_acceptance';
}

export async function armNativeTimedShieldIfArmed(params: {
  sessionStatus: SessionStatus;
  sessionId: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  authorizationStatus: AuthorizationStatus;
  selectionConfigured: boolean;
}): Promise<void> {
  if (params.sessionStatus !== 'armed') {
    return;
  }
  if (params.authorizationStatus !== 'approved' || !params.selectionConfigured) {
    return;
  }
  try {
    await scheduleSession(params.sessionId, params.scheduledStartAt, params.scheduledEndAt);
  } catch {}
}

export async function applyNativeShieldNowIfReady(params: {
  authorizationStatus: AuthorizationStatus;
  selectionConfigured: boolean;
}): Promise<void> {
  if (params.authorizationStatus !== 'approved' || !params.selectionConfigured) {
    return;
  }
  try {
    await applyRestrictionsNow();
  } catch {}
}

export async function activateNativeTimedShieldIfReady(params: {
  sessionId: string;
  scheduledEndAt: string;
  authorizationStatus: AuthorizationStatus;
  selectionConfigured: boolean;
}): Promise<void> {
  if (params.authorizationStatus !== 'approved' || !params.selectionConfigured) {
    return;
  }

  const now = new Date();
  const end = new Date(params.scheduledEndAt);

  if (!Number.isFinite(end.getTime()) || end <= now) {
    await tearDownNativeShieldForSession(params.sessionId);
    return;
  }

  try {
    await scheduleSession(params.sessionId, now.toISOString(), end.toISOString());
  } catch {}

  try {
    await applyRestrictionsNow();
  } catch {}
}

export async function tearDownNativeShieldForSession(sessionId: string): Promise<void> {
  try {
    await cancelScheduledSession(sessionId);
  } catch {}
  try {
    await clearRestrictionsNow();
  } catch {}
}
