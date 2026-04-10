import { addDays, addHours, addMinutes, subDays } from 'date-fns';
import { create } from 'zustand';

import {
  consumeSupabaseAuthCallback,
  deleteAccount,
  registerWithEmailPassword,
  sendPasswordReset,
  signInWithApple,
  signInWithGoogle,
  signInWithPassword,
  signOutProviderSession,
  updateAccountProfile,
} from '@/src/lib/auth-client';
import {
  purchaseRevenueCatPackage,
  resetRevenueCatSession,
  restoreRevenueCatPurchases,
  syncRevenueCatSubscription,
} from '@/src/lib/revenuecat';
import {
  getCurrentCoordinates,
  getLocationPermissionStatus,
  matchSavedPlace,
  requestLocationPermission as requestForegroundLocationPermission,
} from '@/src/lib/location-automation';
import {
  readStoredLocationAutomationState,
  writeStoredLocationAutomationState,
} from '@/src/lib/location-automation-storage';
import {
  clearStoredAuthSession,
  readStoredAuthSession,
  writeStoredAuthSession,
} from '@/src/lib/auth-storage';
import { getSupabaseAuthSession } from '@/src/lib/supabase-client';
import {
  readSavedSessionConditions,
  writeSavedSessionConditions,
} from '@/src/lib/session-condition-storage';
import {
  createDefaultSessionConditions,
  createDefaultSessionTemplates,
  profileToCondition,
} from '@/src/lib/session-templates';
import { getRewardMilestoneForTotal } from '@/src/lib/rewards';
import {
  archiveRemotePlace,
  createRemotePairing,
  createRemoteSession,
  createRemoteSessionTemplate,
  fetchRemoteLocationAutomationSnapshot,
  fetchRemoteSnapshot,
  hasSupabaseSync,
  joinRemotePairingByInviteCode,
  saveRemoteLocationAutomationSettings,
  saveRemotePlace,
  saveRemoteSessionPreset,
  syncRemoteSubscriptionSnapshot,
  updateRemoteSessionTemplateStatus,
  updateRemoteSessionState,
  updateRemotePlacePresence,
} from '@/src/lib/twogether-supabase';
import type {
  AuthSession,
  AuthStatus,
  AuthorizationStatus,
  Couple,
  EffectiveSubscriptionAccess,
  LocationAutomationMode,
  LocationPermissionStatus,
  LocationSuggestion,
  RewardMilestone,
  SavedSessionCondition,
  SavedPlace,
  SelectionPreview,
  Session,
  SessionCondition,
  SessionInterruptionReason,
  SessionStatus,
  SessionTemplate,
  ShieldState,
  SubscriptionPackageOption,
  SubscriptionStatus,
  User,
} from '@/src/lib/twogether-types';
import { createInviteCode } from '@/src/lib/time';

type OnboardingState = {
  accountCreated: boolean;
  inviteCode: string;
};

type StreakState = {
  current: number;
  best: number;
  totalCompleted: number;
};

type DraftPreset = {
  title: string;
  startISO: string;
  endISO: string;
  graceSeconds: number;
  condition?: SessionCondition | null;
  scope?: Session['scope'];
  source?: Session['source'];
  shortSessionMode?: boolean;
  warningMinutesBefore?: number[];
  profile?: SavedSessionCondition | null;
  templateId?: string | null;
};

type SessionConditionDraft = {
  label: string;
  defaultTitle: string;
  allowedMinutes: number;
  intervalHours: number;
  graceSeconds?: number;
  description?: string;
  intensity?: SavedSessionCondition['intensity'];
  essentialAppHints?: string[];
  shortSessionDurationMinutes?: number | null;
  sessionScope?: SavedSessionCondition['sessionScope'];
};

type SessionTemplateDraft = {
  title: string;
  sessionScope: Session['scope'];
  profileId: string | null;
  durationMinutes: number;
  shortSessionMode: boolean;
  graceSeconds: number;
  schedule: SessionTemplate['schedule'];
  profile?: SavedSessionCondition | null;
};

type RequestPairingInput =
  | string
  | {
      contact: string;
      partnerName?: string;
    };

type SavePlaceInput = {
  label: string;
  radiusMeters: number;
};

type TwogetherState = {
  revision: number;
  onboarding: OnboardingState;
  authStatus: AuthStatus;
  authSession: AuthSession | null;
  pendingEmailConfirmationEmail: string | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPackages: SubscriptionPackageOption[];
  subscriptionOfferingIdentifier: string | null;
  subscriptionEntitlementIdentifier: string | null;
  subscriptionManagementUrl: string | null;
  subscriptionExpiresAt: string | null;
  subscriptionWillRenew: boolean;
  subscriptionUnsubscribeDetectedAt: string | null;
  subscriptionBillingIssueDetectedAt: string | null;
  subscriptionAppUserId: string | null;
  subscriptionHasIntroOfferConfigured: boolean;
  subscriptionBusy: boolean;
  subscriptionError: string | null;
  effectiveSubscriptionAccess: EffectiveSubscriptionAccess;
  currentUser: User | null;
  partner: User | null;
  couple: Couple | null;
  savedPlaces: SavedPlace[];
  locationPermissionStatus: LocationPermissionStatus;
  locationAutomationEnabled: boolean;
  locationAutomationMode: LocationAutomationMode;
  currentPlaceId: string | null;
  partnerPlaceId: string | null;
  activeLocationSuggestion: LocationSuggestion | null;
  locationBusy: boolean;
  locationError: string | null;
  authorizationStatus: AuthorizationStatus;
  selectionConfigured: boolean;
  selectionPreview: SelectionPreview[];
  localShieldState: ShieldState;
  savedSessionConditions: SavedSessionCondition[];
  sessionTemplates: SessionTemplate[];
  sessions: Session[];
  streak: StreakState;
  activeRewardMilestone: RewardMilestone | null;
  hydrateAuthSession: () => Promise<void>;
  syncSubscriptionState: () => Promise<void>;
  purchaseSubscriptionPackage: (packageIdentifier: string) => Promise<void>;
  restoreSubscriptionPurchases: () => Promise<void>;
  signInWithEmailPassword: (params: {
    email: string;
    password: string;
    displayName?: string;
  }) => Promise<void>;
  registerWithEmailPassword: (params: {
    email: string;
    password: string;
    displayName?: string;
  }) => Promise<void>;
  clearPendingEmailConfirmation: () => void;
  syncAuthenticatedSession: (session: AuthSession) => Promise<void>;
  consumeSupabaseAuthCallback: (url: string) => Promise<boolean>;
  enterPreviewMode: () => void;
  requestPasswordReset: (email: string) => Promise<string>;
  updateAccountDisplayName: (displayName: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  pairWithPartner: (partnerName?: string) => Promise<void>;
  requestPairing: (input: RequestPairingInput) => Promise<void>;
  joinPairingWithInviteCode: (inviteCode: string) => Promise<void>;
  requestLocationPermission: () => Promise<LocationPermissionStatus>;
  savePlaceFromCurrentLocation: (input: SavePlaceInput) => Promise<void>;
  deleteSavedPlace: (placeId: string) => Promise<void>;
  setLocationAutomationSettings: (input: {
    enabled: boolean;
    mode: LocationAutomationMode;
  }) => Promise<void>;
  refreshLocationAutomation: () => Promise<void>;
  startLocationSuggestedSession: () => Promise<string | null>;
  dismissLocationSuggestion: () => void;
  setAuthorizationStatus: (status: AuthorizationStatus) => void;
  setSelectionConfigured: (configured: boolean) => void;
  setLocalShieldState: (state: ShieldState) => void;
  saveSessionCondition: (draft: SessionConditionDraft) => Promise<string>;
  createSessionTemplate: (draft: SessionTemplateDraft) => Promise<string | null>;
  toggleSessionTemplate: (templateId: string, status: SessionTemplate['status']) => Promise<void>;
  startTemplateSession: (templateId: string) => Promise<string | null>;
  startQuickSession: (conditionId: string) => Promise<string | null>;
  createSession: (draft: DraftPreset) => Promise<string | null>;
  acceptSession: (sessionId: string) => Promise<void>;
  activateSession: (sessionId: string) => Promise<void>;
  completeSession: (sessionId: string) => Promise<void>;
  interruptSession: (sessionId: string, reason?: SessionInterruptionReason) => Promise<void>;
  cancelSession: (sessionId: string) => Promise<void>;
  dismissRewardMilestone: () => void;
  resetDemo: () => void;
};

type TwogetherActions = Pick<
  TwogetherState,
  | 'hydrateAuthSession'
  | 'syncSubscriptionState'
  | 'purchaseSubscriptionPackage'
  | 'restoreSubscriptionPurchases'
  | 'signInWithEmailPassword'
  | 'registerWithEmailPassword'
  | 'clearPendingEmailConfirmation'
  | 'syncAuthenticatedSession'
  | 'consumeSupabaseAuthCallback'
  | 'enterPreviewMode'
  | 'requestPasswordReset'
  | 'updateAccountDisplayName'
  | 'deleteAccount'
  | 'signInWithApple'
  | 'signInWithGoogle'
  | 'signOut'
  | 'pairWithPartner'
  | 'requestPairing'
  | 'joinPairingWithInviteCode'
  | 'requestLocationPermission'
  | 'savePlaceFromCurrentLocation'
  | 'deleteSavedPlace'
  | 'setLocationAutomationSettings'
  | 'refreshLocationAutomation'
  | 'startLocationSuggestedSession'
  | 'dismissLocationSuggestion'
  | 'setAuthorizationStatus'
  | 'setSelectionConfigured'
  | 'setLocalShieldState'
  | 'saveSessionCondition'
  | 'createSessionTemplate'
  | 'toggleSessionTemplate'
  | 'startTemplateSession'
  | 'startQuickSession'
  | 'createSession'
  | 'acceptSession'
  | 'activateSession'
  | 'completeSession'
  | 'interruptSession'
  | 'cancelSession'
  | 'dismissRewardMilestone'
  | 'resetDemo'
>;

const now = new Date();

function getDefaultSavedSessionConditions(): SavedSessionCondition[] {
  return createDefaultSessionConditions(new Date().toISOString());
}

function emptyEffectiveSubscriptionAccess(): EffectiveSubscriptionAccess {
  return {
    isPremium: false,
    source: 'none',
    ownerUserId: null,
    ownerDisplayName: null,
    entitlementIdentifier: null,
    expiresAt: null,
    willRenew: false,
  };
}

function getDefaultLocationAutomationState() {
  return {
    savedPlaces: [] as SavedPlace[],
    locationPermissionStatus: 'unknown' as LocationPermissionStatus,
    locationAutomationEnabled: false,
    locationAutomationMode: 'suggest' as LocationAutomationMode,
    currentPlaceId: null as string | null,
    partnerPlaceId: null as string | null,
    activeLocationSuggestion: null as LocationSuggestion | null,
    locationBusy: false,
    locationError: null as string | null,
  };
}

function hasCurrentAutomatedSession(sessions: Session[]) {
  return sessions.some((session) =>
    ['pending_acceptance', 'armed', 'active'].includes(session.status)
  );
}

function deriveLocationSuggestion(state: {
  activeLocationSuggestion: LocationSuggestion | null;
  currentPlaceId: string | null;
  partnerPlaceId: string | null;
  savedPlaces: SavedPlace[];
  sessions: Session[];
  locationAutomationEnabled: boolean;
  locationAutomationMode: LocationAutomationMode;
}): LocationSuggestion | null {
  if (
    !state.locationAutomationEnabled ||
    state.locationAutomationMode !== 'suggest' ||
    !state.currentPlaceId ||
    state.currentPlaceId !== state.partnerPlaceId ||
    hasCurrentAutomatedSession(state.sessions)
  ) {
    return null;
  }

  const matchedPlace = state.savedPlaces.find((place) => place.id === state.currentPlaceId);
  if (!matchedPlace) {
    return null;
  }

  if (state.activeLocationSuggestion?.placeId === matchedPlace.id) {
    return state.activeLocationSuggestion;
  }

  return {
    placeId: matchedPlace.id,
    placeLabel: matchedPlace.label,
    detectedAt: new Date().toISOString(),
  };
}

function createSessionRecord(params: {
  sessionId: string;
  draft: DraftPreset;
  currentUser: User;
  partner?: User | null;
  couple?: Couple | null;
  authorizationStatus: AuthorizationStatus;
  selectionConfigured: boolean;
}): Session {
  const {
    sessionId,
    draft,
    currentUser,
    partner,
    couple,
    authorizationStatus,
    selectionConfigured,
  } = params;
  const scope = draft.scope ?? 'shared';
  const isReady = authorizationStatus === 'approved' && selectionConfigured;
  const status: SessionStatus =
    scope === 'solo' ? (isReady ? 'armed' : 'draft') : isReady ? 'armed' : 'pending_acceptance';
  const profile = draft.profile ?? null;

  return {
    id: sessionId,
    coupleId: couple?.id ?? '',
    createdByUserId: currentUser.id,
    templateId: draft.templateId ?? null,
    source: draft.source ?? 'manual',
    scope,
    title: draft.title,
    scheduledStartAt: draft.startISO,
    scheduledEndAt: draft.endISO,
    timezone: currentUser.timezone,
    graceSeconds: draft.graceSeconds,
    shortSessionMode: draft.shortSessionMode ?? false,
    warningMinutesBefore: draft.warningMinutesBefore ?? [],
    condition: draft.condition ?? null,
    profile,
    status,
    createdAt: new Date().toISOString(),
    participants:
      scope === 'shared' && partner
        ? [
            {
              id: `${sessionId}-me`,
              userId: currentUser.id,
              displayName: currentUser.displayName,
              acceptanceStatus: 'accepted',
              authorizationStatusAtArmTime: authorizationStatus,
              localShieldState: isReady ? 'armed' : 'idle',
            },
            {
              id: `${sessionId}-partner`,
              userId: partner.id,
              displayName: partner.displayName,
              acceptanceStatus: 'pending',
              authorizationStatusAtArmTime: 'notDetermined',
              localShieldState: 'idle',
            },
          ]
        : [
            {
              id: `${sessionId}-me`,
              userId: currentUser.id,
              displayName: currentUser.displayName,
              acceptanceStatus: 'accepted',
              authorizationStatusAtArmTime: authorizationStatus,
              localShieldState: isReady ? 'armed' : 'idle',
            },
          ],
  };
}

function userFromSession(session: AuthSession): User {
  return {
    id: session.userId,
    displayName: session.displayName,
    email: session.email,
    authProvider: session.provider,
    timezone: 'America/Chicago',
  };
}

function createSeedSessions(user: User, partner: User, couple: Couple): Session[] {
  const upcomingStart = addHours(now, 4);
  const upcomingEnd = addHours(upcomingStart, 2);
  const inviteStart = addDays(now, 1);
  const inviteEnd = addHours(inviteStart, 1);
  const completedStart = subDays(now, 1);
  const completedEnd = addMinutes(completedStart, 90);
  const dateNightProfile = getDefaultSavedSessionConditions().find(
    (entry) => entry.label === 'Date night'
  );
  const walkProfile = getDefaultSavedSessionConditions().find((entry) => entry.label === 'Walk');

  return [
    {
      id: 'session-upcoming',
      coupleId: couple.id,
      createdByUserId: user.id,
      templateId: 'template-date-night',
      source: 'template',
      scope: 'shared',
      title: 'Phone-free dinner',
      scheduledStartAt: upcomingStart.toISOString(),
      scheduledEndAt: upcomingEnd.toISOString(),
      timezone: user.timezone,
      graceSeconds: 300,
      shortSessionMode: false,
      warningMinutesBefore: [15],
      condition: profileToCondition(dateNightProfile),
      profile: dateNightProfile ?? null,
      status: 'armed',
      createdAt: now.toISOString(),
      participants: [
        {
          id: 'session-upcoming-me',
          userId: user.id,
          displayName: user.displayName,
          acceptanceStatus: 'accepted',
          authorizationStatusAtArmTime: 'approved',
          localShieldState: 'armed',
        },
        {
          id: 'session-upcoming-partner',
          userId: partner.id,
          displayName: partner.displayName,
          acceptanceStatus: 'accepted',
          authorizationStatusAtArmTime: 'approved',
          localShieldState: 'armed',
        },
      ],
    },
    {
      id: 'session-invite',
      coupleId: couple.id,
      createdByUserId: partner.id,
      templateId: 'template-walk',
      source: 'template',
      scope: 'shared',
      title: 'Sunset walk',
      scheduledStartAt: inviteStart.toISOString(),
      scheduledEndAt: inviteEnd.toISOString(),
      timezone: user.timezone,
      graceSeconds: 0,
      shortSessionMode: true,
      warningMinutesBefore: [10],
      condition: profileToCondition(walkProfile),
      profile: walkProfile ?? null,
      status: 'pending_acceptance',
      createdAt: now.toISOString(),
      participants: [
        {
          id: 'session-invite-me',
          userId: user.id,
          displayName: user.displayName,
          acceptanceStatus: 'pending',
          authorizationStatusAtArmTime: 'notDetermined',
          localShieldState: 'idle',
        },
        {
          id: 'session-invite-partner',
          userId: partner.id,
          displayName: partner.displayName,
          acceptanceStatus: 'accepted',
          authorizationStatusAtArmTime: 'approved',
          localShieldState: 'armed',
        },
      ],
    },
    {
      id: 'session-history-complete',
      coupleId: couple.id,
      createdByUserId: user.id,
      source: 'manual',
      scope: 'shared',
      title: 'No-screen brunch',
      scheduledStartAt: completedStart.toISOString(),
      scheduledEndAt: completedEnd.toISOString(),
      timezone: user.timezone,
      graceSeconds: 0,
      shortSessionMode: false,
      warningMinutesBefore: [],
      condition: profileToCondition(dateNightProfile),
      profile: dateNightProfile ?? null,
      status: 'completed',
      createdAt: completedStart.toISOString(),
      participants: [
        {
          id: 'session-history-complete-me',
          userId: user.id,
          displayName: user.displayName,
          acceptanceStatus: 'accepted',
          authorizationStatusAtArmTime: 'approved',
          localShieldState: 'completed',
          completedSuccessfully: true,
        },
        {
          id: 'session-history-complete-partner',
          userId: partner.id,
          displayName: partner.displayName,
          acceptanceStatus: 'accepted',
          authorizationStatusAtArmTime: 'approved',
          localShieldState: 'completed',
          completedSuccessfully: true,
        },
      ],
    },
  ];
}

function getInitialSubscriptionState() {
  return {
    subscriptionStatus: 'idle' as SubscriptionStatus,
    subscriptionPackages: [] as SubscriptionPackageOption[],
    subscriptionOfferingIdentifier: null as string | null,
    subscriptionEntitlementIdentifier: null as string | null,
    subscriptionManagementUrl: null as string | null,
    subscriptionExpiresAt: null as string | null,
    subscriptionWillRenew: false,
    subscriptionUnsubscribeDetectedAt: null as string | null,
    subscriptionBillingIssueDetectedAt: null as string | null,
    subscriptionAppUserId: null as string | null,
    subscriptionHasIntroOfferConfigured: false,
    subscriptionBusy: false,
    subscriptionError: null as string | null,
    effectiveSubscriptionAccess: emptyEffectiveSubscriptionAccess(),
  };
}

function subscriptionPatch(
  snapshot: Awaited<ReturnType<typeof syncRevenueCatSubscription>>
) {
  return {
    subscriptionStatus: snapshot.status,
    subscriptionPackages: snapshot.packages,
    subscriptionOfferingIdentifier: snapshot.offeringIdentifier,
    subscriptionEntitlementIdentifier: snapshot.activeEntitlementIdentifier,
    subscriptionManagementUrl: snapshot.managementUrl,
    subscriptionExpiresAt: snapshot.expiresAt,
    subscriptionWillRenew: snapshot.willRenew,
    subscriptionUnsubscribeDetectedAt: snapshot.unsubscribeDetectedAt,
    subscriptionBillingIssueDetectedAt: snapshot.billingIssueDetectedAt,
    subscriptionAppUserId: snapshot.appUserId,
    subscriptionHasIntroOfferConfigured: snapshot.hasIntroOfferConfigured,
    subscriptionBusy: false,
    subscriptionError: snapshot.error,
  };
}

function makeInitialState() {
  return {
    revision: 0,
    onboarding: {
      accountCreated: false,
      inviteCode: createInviteCode(),
    },
    authStatus: 'restoring' as AuthStatus,
    authSession: null as AuthSession | null,
    pendingEmailConfirmationEmail: null as string | null,
    ...getInitialSubscriptionState(),
    ...getDefaultLocationAutomationState(),
    currentUser: null,
    partner: null,
    couple: null,
    authorizationStatus: 'notDetermined' as AuthorizationStatus,
    selectionConfigured: false,
    selectionPreview: [
      { label: 'Social', detail: 'Instagram, TikTok, X' },
      { label: 'Work', detail: 'Slack, Teams, Gmail' },
      { label: 'Streaming', detail: 'YouTube, Netflix' },
    ] as SelectionPreview[],
    localShieldState: 'idle' as ShieldState,
    savedSessionConditions: getDefaultSavedSessionConditions(),
    sessionTemplates: [] as SessionTemplate[],
    sessions: [] as Session[],
    streak: {
      current: 0,
      best: 0,
      totalCompleted: 0,
    },
    activeRewardMilestone: null as RewardMilestone | null,
  };
}

function getDefaultOrPersistedSessionConditions(conditions?: SavedSessionCondition[]) {
  if (!conditions || conditions.length === 0) {
    return getDefaultSavedSessionConditions();
  }

  return conditions.map((condition) => ({
    ...condition,
    description: condition.description,
    intensity: condition.intensity ?? 'balanced',
    essentialAppHints: condition.essentialAppHints ?? [],
    shortSessionDurationMinutes: condition.shortSessionDurationMinutes ?? null,
    sessionScope: condition.sessionScope ?? 'shared',
  }));
}

function buildRemoteStatePatch(
  state: TwogetherState,
  snapshot: Awaited<ReturnType<typeof fetchRemoteSnapshot>>
): Partial<TwogetherState> {
  return {
    onboarding: {
      ...state.onboarding,
      accountCreated: true,
      inviteCode: snapshot.inviteCode,
    },
    currentUser: snapshot.currentUser,
    partner: snapshot.partner,
    couple: snapshot.couple,
    effectiveSubscriptionAccess: snapshot.effectiveSubscriptionAccess,
    savedSessionConditions: snapshot.savedSessionConditions,
    sessionTemplates: snapshot.sessionTemplates,
    sessions: snapshot.sessions,
    streak: snapshot.streak,
  };
}

function sessionsMatch(left: AuthSession | null, right: AuthSession) {
  return (
    left?.userId === right.userId &&
    left?.accessToken === right.accessToken &&
    left?.refreshToken === right.refreshToken
  );
}

function isDevBypassCredential(email: string, password: string) {
  return (
    __DEV__ &&
    email.trim().toLowerCase() === 'zachyanez@gmail.com' &&
    password === 'Sandman#1'
  );
}

function bump(state: Omit<TwogetherState, keyof ReturnType<typeof actionsFactory>>) {
  return {
    ...state,
    revision: state.revision + 1,
  };
}

function actionsFactory(
  set: (partial: Partial<TwogetherState> | ((state: TwogetherState) => Partial<TwogetherState>)) => void
): TwogetherActions {
  async function syncRemoteAppState(
    session: AuthSession,
    defaults?: SavedSessionCondition[]
  ) {
    if (!hasSupabaseSync()) {
      return null;
    }

    const snapshot = await fetchRemoteSnapshot(
      session,
      getDefaultOrPersistedSessionConditions(defaults)
    );

    set((state) => ({
      ...bump(state),
      ...buildRemoteStatePatch(state, snapshot),
    }));

    return snapshot;
  }

  async function syncLocationAutomationState(session: AuthSession | null) {
    const fallbackPermissionStatus = await getLocationPermissionStatus().catch(
      () => useTwogetherStore.getState().locationPermissionStatus
    );

    if (session && hasSupabaseSync()) {
      const snapshot = await fetchRemoteLocationAutomationSnapshot(session);

      set((state) => {
        const patch = {
          savedPlaces: snapshot.savedPlaces,
          locationPermissionStatus: fallbackPermissionStatus,
          locationAutomationEnabled: snapshot.enabled,
          locationAutomationMode: snapshot.mode,
          currentPlaceId: snapshot.currentUserPresence?.placeId ?? null,
          partnerPlaceId: snapshot.partnerPresence?.placeId ?? null,
          locationBusy: false,
          locationError: null,
        };

        return {
          ...bump(state),
          ...patch,
          activeLocationSuggestion: deriveLocationSuggestion({
            ...state,
            ...patch,
          }),
        };
      });

      return;
    }

    const stored = await readStoredLocationAutomationState();
    set((state) => {
      const patch = {
        savedPlaces: stored.savedPlaces,
        locationPermissionStatus: fallbackPermissionStatus ?? stored.permissionStatus,
        locationAutomationEnabled: stored.enabled,
        locationAutomationMode: stored.mode,
        currentPlaceId: stored.currentPlaceId,
        partnerPlaceId: null,
        locationBusy: false,
        locationError: null,
      };

      return {
        ...bump(state),
        ...patch,
        activeLocationSuggestion: deriveLocationSuggestion({
          ...state,
          ...patch,
        }),
      };
    });
  }

  async function maybeRunLocationAutomation() {
    const state = useTwogetherStore.getState();

    if (
      !state.locationAutomationEnabled ||
      state.locationAutomationMode !== 'auto_arm' ||
      !state.currentPlaceId ||
      state.currentPlaceId !== state.partnerPlaceId ||
      hasCurrentAutomatedSession(state.sessions)
    ) {
      return null;
    }

    const place = state.savedPlaces.find((entry) => entry.id === state.currentPlaceId);
    if (!place) {
      return null;
    }

    const createdId = await useTwogetherStore.getState().createSession({
      title: `Together at ${place.label}`,
      startISO: new Date().toISOString(),
      endISO: addHours(new Date(), 1).toISOString(),
      graceSeconds: 300,
      scope: 'shared',
      source: 'quick_start',
      shortSessionMode: false,
      warningMinutesBefore: [5],
    });

    if (createdId) {
      set((currentState) => ({
        ...bump(currentState),
        activeLocationSuggestion: null,
      }));
    }

    return createdId;
  }

  async function commitAuthenticatedSession(session: AuthSession) {
    const state = useTwogetherStore.getState();
    const isDuplicateSession =
      state.authStatus === 'authenticated' &&
      state.pendingEmailConfirmationEmail === null &&
      sessionsMatch(state.authSession, session);

    await writeStoredAuthSession(session);

    if (isDuplicateSession) {
      return;
    }

    await applyAuthenticatedSession(session);
  }

  async function applyAuthenticatedSession(session: AuthSession) {
    set((state) => ({
      ...bump(state),
      authStatus: 'authenticated',
      authSession: session,
      pendingEmailConfirmationEmail: null,
      onboarding: {
        ...state.onboarding,
        accountCreated: true,
      },
      currentUser: userFromSession(session),
      subscriptionStatus: 'loading',
      subscriptionBusy: false,
      subscriptionError: null,
    }));

    const subscription = await syncRevenueCatSubscription(session.userId);

    if (hasSupabaseSync()) {
      await syncRemoteSubscriptionSnapshot(session, subscription);
    }

    await syncRemoteAppState(session);
    await syncLocationAutomationState(session);

    set((state) => ({
      ...bump(state),
      ...subscriptionPatch(subscription),
      effectiveSubscriptionAccess: hasSupabaseSync()
        ? state.effectiveSubscriptionAccess
        : {
            isPremium: subscription.status === 'active',
            source: subscription.status === 'active' ? 'self' : 'none',
            ownerUserId: subscription.status === 'active' ? session.userId : null,
            ownerDisplayName: null,
            entitlementIdentifier: subscription.activeEntitlementIdentifier,
            expiresAt: subscription.expiresAt,
            willRenew: subscription.willRenew,
          },
    }));
  }

  function clearSignedOutState(savedSessionConditions?: SavedSessionCondition[]) {
    resetRevenueCatSession();
    const initialState = makeInitialState();

    set({
      ...initialState,
      authStatus: 'signed_out',
      savedSessionConditions:
        savedSessionConditions && savedSessionConditions.length
          ? savedSessionConditions
          : initialState.savedSessionConditions,
    });
  }

function buildPreviewState(
  previewEmail = 'preview@twogether.local',
  options?: { includePartner?: boolean }
): Partial<TwogetherState> {
    const displayName =
      previewEmail.trim().toLowerCase() === 'zachyanez@gmail.com' ? 'Zach Yanez' : 'Preview User';
    const session: AuthSession = {
      userId: 'preview_user',
      provider: 'password',
      email: previewEmail,
      displayName,
      accessToken: 'preview_access_token',
      refreshToken: 'preview_refresh_token',
      tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      createdAt: new Date().toISOString(),
      providerSubject: 'preview_user',
    };
    const currentUser = userFromSession(session);
  const includePartner = options?.includePartner ?? true;
    const savedSessionConditions = getDefaultSavedSessionConditions();
    const partner: User = {
      id: 'preview_partner',
      displayName: 'Riley',
      timezone: currentUser.timezone,
    };
    const couple: Couple = {
      id: 'preview_couple',
      partnerAUserId: currentUser.id,
      partnerBUserId: partner.id,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    return {
      authStatus: 'authenticated',
      authSession: session,
      pendingEmailConfirmationEmail: null,
      ...getDefaultLocationAutomationState(),
      onboarding: {
        accountCreated: true,
        inviteCode: createInviteCode(),
      },
      currentUser,
      partner: includePartner ? partner : null,
      couple: includePartner ? couple : null,
      authorizationStatus: 'approved',
      selectionConfigured: true,
      localShieldState: 'armed',
      subscriptionStatus: 'active',
      subscriptionPackages: [],
      subscriptionOfferingIdentifier: 'preview-offering',
      subscriptionEntitlementIdentifier: 'preview-entitlement',
      subscriptionManagementUrl: null,
      subscriptionExpiresAt: null,
      subscriptionWillRenew: true,
      subscriptionUnsubscribeDetectedAt: null,
      subscriptionBillingIssueDetectedAt: null,
      subscriptionAppUserId: session.userId,
      subscriptionHasIntroOfferConfigured: false,
      subscriptionBusy: false,
      subscriptionError: null,
      effectiveSubscriptionAccess: {
        isPremium: true,
        source: 'self',
        ownerUserId: session.userId,
        ownerDisplayName: null,
        entitlementIdentifier: 'preview-entitlement',
        expiresAt: null,
        willRenew: true,
      },
      savedSessionConditions,
      sessionTemplates: createDefaultSessionTemplates({
        createdByUserId: currentUser.id,
        coupleId: includePartner ? couple.id : null,
        conditions: savedSessionConditions,
      }),
      sessions: includePartner ? createSeedSessions(currentUser, partner, couple) : [],
      streak: {
        current: includePartner ? 3 : 0,
        best: includePartner ? 8 : 0,
        totalCompleted: includePartner ? 14 : 0,
      },
    };
  }

  return {
    hydrateAuthSession: async () => {
      const persistedSessionConditions = hasSupabaseSync()
        ? []
        : await readSavedSessionConditions();
      const savedSessionConditions = getDefaultOrPersistedSessionConditions(
        persistedSessionConditions
      );
      const session = hasSupabaseSync()
        ? await getSupabaseAuthSession()
        : await readStoredAuthSession();

      if (!session) {
        clearSignedOutState(savedSessionConditions);
        return;
      }

      await writeStoredAuthSession(session);

      set((state) => ({
        ...bump(state),
        authStatus: 'authenticated',
        authSession: session,
        pendingEmailConfirmationEmail: null,
        onboarding: {
          ...state.onboarding,
          accountCreated: true,
        },
        currentUser: userFromSession(session),
        savedSessionConditions,
        subscriptionStatus: 'loading',
        subscriptionError: null,
      }));

      const subscription = await syncRevenueCatSubscription(session.userId);

      if (hasSupabaseSync()) {
        await syncRemoteSubscriptionSnapshot(session, subscription);
      }

      await syncRemoteAppState(session, savedSessionConditions);
      await syncLocationAutomationState(session);

      set((state) => ({
        ...bump(state),
        ...subscriptionPatch(subscription),
        effectiveSubscriptionAccess: hasSupabaseSync()
          ? state.effectiveSubscriptionAccess
          : {
              isPremium: subscription.status === 'active',
              source: subscription.status === 'active' ? 'self' : 'none',
              ownerUserId: subscription.status === 'active' ? session.userId : null,
              ownerDisplayName: null,
              entitlementIdentifier: subscription.activeEntitlementIdentifier,
              expiresAt: subscription.expiresAt,
              willRenew: subscription.willRenew,
            },
      }));
    },
    syncSubscriptionState: async () => {
      const session = useTwogetherStore.getState().authSession;

      if (!session) {
        set((state) => ({
          ...bump(state),
          ...getInitialSubscriptionState(),
        }));
        return;
      }

      set((state) => ({
        ...bump(state),
        subscriptionStatus: 'loading',
        subscriptionBusy: false,
        subscriptionError: null,
      }));

      const subscription = await syncRevenueCatSubscription(session.userId);

      if (hasSupabaseSync()) {
        await syncRemoteSubscriptionSnapshot(session, subscription);
        await syncRemoteAppState(session);
        await syncLocationAutomationState(session);
      }

      set((state) => ({
        ...bump(state),
        ...subscriptionPatch(subscription),
        effectiveSubscriptionAccess: hasSupabaseSync()
          ? state.effectiveSubscriptionAccess
          : {
              isPremium: subscription.status === 'active',
              source: subscription.status === 'active' ? 'self' : 'none',
              ownerUserId: subscription.status === 'active' ? session.userId : null,
              ownerDisplayName: null,
              entitlementIdentifier: subscription.activeEntitlementIdentifier,
              expiresAt: subscription.expiresAt,
              willRenew: subscription.willRenew,
            },
      }));
    },
    purchaseSubscriptionPackage: async (packageIdentifier) => {
      const session = useTwogetherStore.getState().authSession;

      if (!session) {
        throw new Error('You need to sign in before purchasing a subscription.');
      }

      set((state) => ({
        ...bump(state),
        subscriptionBusy: true,
        subscriptionError: null,
      }));

      try {
        const subscription = await purchaseRevenueCatPackage({
          appUserId: session.userId,
          packageIdentifier,
        });

        if (hasSupabaseSync()) {
          await syncRemoteSubscriptionSnapshot(session, subscription);
          await syncRemoteAppState(session);
        }

        set((state) => ({
          ...bump(state),
          ...subscriptionPatch(subscription),
          effectiveSubscriptionAccess: hasSupabaseSync()
            ? state.effectiveSubscriptionAccess
            : {
                isPremium: subscription.status === 'active',
                source: subscription.status === 'active' ? 'self' : 'none',
                ownerUserId: subscription.status === 'active' ? session.userId : null,
                ownerDisplayName: null,
                entitlementIdentifier: subscription.activeEntitlementIdentifier,
                expiresAt: subscription.expiresAt,
                willRenew: subscription.willRenew,
              },
        }));
      } catch (error) {
        set((state) => ({
          ...bump(state),
          subscriptionBusy: false,
          subscriptionError:
            error instanceof Error ? error.message : 'The subscription purchase failed.',
        }));
        throw error;
      }
    },
    restoreSubscriptionPurchases: async () => {
      const session = useTwogetherStore.getState().authSession;

      if (!session) {
        throw new Error('You need to sign in before restoring purchases.');
      }

      set((state) => ({
        ...bump(state),
        subscriptionBusy: true,
        subscriptionError: null,
      }));

      try {
        const subscription = await restoreRevenueCatPurchases(session.userId);

        if (hasSupabaseSync()) {
          await syncRemoteSubscriptionSnapshot(session, subscription);
          await syncRemoteAppState(session);
        }

        set((state) => ({
          ...bump(state),
          ...subscriptionPatch(subscription),
          effectiveSubscriptionAccess: hasSupabaseSync()
            ? state.effectiveSubscriptionAccess
            : {
                isPremium: subscription.status === 'active',
                source: subscription.status === 'active' ? 'self' : 'none',
                ownerUserId: subscription.status === 'active' ? session.userId : null,
                ownerDisplayName: null,
                entitlementIdentifier: subscription.activeEntitlementIdentifier,
                expiresAt: subscription.expiresAt,
                willRenew: subscription.willRenew,
              },
        }));
      } catch (error) {
        set((state) => ({
          ...bump(state),
          subscriptionBusy: false,
          subscriptionError:
            error instanceof Error ? error.message : 'Purchases could not be restored.',
        }));
        throw error;
      }
    },
    signInWithEmailPassword: async ({ email, password, displayName }) => {
      if (isDevBypassCredential(email, password)) {
        set((state) => ({
          ...bump(state),
          ...buildPreviewState(email.trim().toLowerCase(), { includePartner: false }),
        }));
        return;
      }

      const session = await signInWithPassword({
        email,
        password,
        displayName,
      });

      await commitAuthenticatedSession(session);
    },
    registerWithEmailPassword: async ({ email, password, displayName }) => {
      const result = await registerWithEmailPassword({
        email,
        password,
        displayName,
      });

      if (result.status === 'pending_email_confirmation') {
        set((state) => ({
          ...bump(state),
          pendingEmailConfirmationEmail: result.email,
        }));
        return;
      }

      await commitAuthenticatedSession(result.session);
    },
    clearPendingEmailConfirmation: () =>
      set((state) => ({
        ...bump(state),
        pendingEmailConfirmationEmail: null,
      })),
    syncAuthenticatedSession: async (session) => {
      await commitAuthenticatedSession(session);
    },
    consumeSupabaseAuthCallback: async (url) => {
      const session = await consumeSupabaseAuthCallback(url);

      if (!session) {
        return false;
      }

      await commitAuthenticatedSession(session);
      return true;
    },
    enterPreviewMode: () => {
      if (!__DEV__) {
        throw new Error('Preview mode is only available in development.');
      }

      set((state) => ({
        ...bump(state),
        ...buildPreviewState(),
      }));
    },
    requestPasswordReset: async (email) => {
      const response = await sendPasswordReset(email);
      return response.message;
    },
    updateAccountDisplayName: async (displayName) => {
      const existingSession = useTwogetherStore.getState().authSession;

      if (!existingSession) {
        throw new Error('You need to sign in before editing your account.');
      }

      const trimmedDisplayName = displayName.trim();
      if (!trimmedDisplayName) {
        throw new Error('Enter a display name before saving.');
      }

      const response = await updateAccountProfile(existingSession, {
        displayName: trimmedDisplayName,
      });
      await writeStoredAuthSession(response.session);

      if (hasSupabaseSync()) {
        await syncRemoteAppState(response.session);
      }

      set((state) => ({
        ...bump(state),
        authSession: response.session,
        currentUser: hasSupabaseSync()
          ? state.currentUser
            ? {
                ...state.currentUser,
                displayName: trimmedDisplayName,
              }
            : userFromSession(response.session)
          : userFromSession(response.session),
      }));
    },
    deleteAccount: async () => {
      const existingSession = useTwogetherStore.getState().authSession;
      const savedSessionConditions = hasSupabaseSync()
        ? getDefaultSavedSessionConditions()
        : useTwogetherStore.getState().savedSessionConditions;

      if (!existingSession) {
        clearSignedOutState(savedSessionConditions);
        return;
      }

      await deleteAccount(existingSession);
      await clearStoredAuthSession();
      clearSignedOutState(savedSessionConditions);
    },
    signInWithApple: async () => {
      const session = await signInWithApple();
      await commitAuthenticatedSession(session);
    },
    signInWithGoogle: async () => {
      const session = await signInWithGoogle();
      await commitAuthenticatedSession(session);
    },
    signOut: async () => {
      const existingSession = useTwogetherStore.getState().authSession;
      const savedSessionConditions = hasSupabaseSync()
        ? getDefaultSavedSessionConditions()
        : useTwogetherStore.getState().savedSessionConditions;
      await signOutProviderSession(existingSession);
      await clearStoredAuthSession();
      clearSignedOutState(savedSessionConditions);
    },
    pairWithPartner: async (partnerName = 'Riley') => {
      const session = useTwogetherStore.getState().authSession;
      const inviteCode = useTwogetherStore.getState().onboarding.inviteCode;

      if (session && hasSupabaseSync()) {
        await createRemotePairing(session, inviteCode);
        await syncRemoteAppState(session);
        await syncLocationAutomationState(session);
        return;
      }

      set((state) => {
        if (!state.currentUser) {
          return state;
        }

        const partner: User = {
          id: 'user-riley',
          displayName: partnerName,
          timezone: state.currentUser.timezone,
        };

        const couple: Couple = {
          id: 'couple-jordan-riley',
          partnerAUserId: state.currentUser.id,
          partnerBUserId: partner.id,
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        const sessionTemplates = createDefaultSessionTemplates({
          createdByUserId: state.currentUser.id,
          coupleId: couple.id,
          conditions: state.savedSessionConditions,
        });

        return {
          ...bump(state),
          partner,
          couple,
          sessionTemplates,
          sessions: createSeedSessions(state.currentUser, partner, couple),
          streak: {
            current: 3,
            best: 8,
            totalCompleted: 14,
          },
        };
      });
    },
    requestPairing: async (input) => {
      const pairingInput = typeof input === 'string' ? { contact: input } : input;
      const trimmedContact = pairingInput.contact.trim();
      const trimmedPartnerName = pairingInput.partnerName?.trim();
      const session = useTwogetherStore.getState().authSession;
      const inviteCode = useTwogetherStore.getState().onboarding.inviteCode;

      if (!trimmedContact) {
        throw new Error('Enter an email address or phone number.');
      }

      if (session && hasSupabaseSync()) {
        await createRemotePairing(session, inviteCode);
      }

      set((state) => {
        if (!state.currentUser) {
          return state;
        }

        const partner: User = {
          id: 'pending_partner',
          displayName: trimmedPartnerName || trimmedContact,
          timezone: state.currentUser.timezone,
          email: trimmedContact.includes('@') ? trimmedContact : undefined,
        };

        const couple: Couple = {
          id: 'pending_couple',
          partnerAUserId: state.currentUser.id,
          partnerBUserId: partner.id,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        return {
          ...bump(state),
          partner,
          couple,
          sessions: [],
          streak: {
            current: 0,
            best: 0,
            totalCompleted: 0,
          },
        };
      });
    },
    joinPairingWithInviteCode: async (inviteCode) => {
      const trimmedInviteCode = inviteCode.trim().toUpperCase();
      const session = useTwogetherStore.getState().authSession;

      if (!trimmedInviteCode) {
        throw new Error('Enter an invite code.');
      }

      if (session && hasSupabaseSync()) {
        await joinRemotePairingByInviteCode(session, trimmedInviteCode);
        await syncRemoteAppState(session);
        await syncLocationAutomationState(session);
        return;
      }

      set((state) => {
        if (!state.currentUser) {
          return state;
        }

        const partner: User = {
          id: `partner-${trimmedInviteCode.toLowerCase()}`,
          displayName: 'Partner',
          timezone: state.currentUser.timezone,
        };

        const couple: Couple = {
          id: `couple-${trimmedInviteCode.toLowerCase()}`,
          partnerAUserId: state.currentUser.id,
          partnerBUserId: partner.id,
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        const sessionTemplates = createDefaultSessionTemplates({
          createdByUserId: state.currentUser.id,
          coupleId: couple.id,
          conditions: state.savedSessionConditions,
        });

        return {
          ...bump(state),
          partner,
          couple,
          sessionTemplates,
          sessions: [],
          streak: {
            current: 0,
            best: 0,
            totalCompleted: 0,
          },
        };
      });
    },
    requestLocationPermission: async () => {
      const status = await requestForegroundLocationPermission();

      set((state) => ({
        ...bump(state),
        locationPermissionStatus: status,
        locationError: status === 'granted' ? null : state.locationError,
      }));

      await writeStoredLocationAutomationState({
        permissionStatus: status,
      });

      return status;
    },
    savePlaceFromCurrentLocation: async ({ label, radiusMeters }) => {
      const trimmedLabel = label.trim();
      const session = useTwogetherStore.getState().authSession;
      const state = useTwogetherStore.getState();

      if (!trimmedLabel) {
        throw new Error('Enter a place name before saving.');
      }

      if (radiusMeters < 25 || radiusMeters > 1000) {
        throw new Error('Choose a radius between 25 and 1000 meters.');
      }

      const permissionStatus =
        state.locationPermissionStatus === 'granted'
          ? 'granted'
          : await useTwogetherStore.getState().requestLocationPermission();

      if (permissionStatus !== 'granted') {
        throw new Error('Location access is required to save a place.');
      }

      set((currentState) => ({
        ...bump(currentState),
        locationBusy: true,
        locationError: null,
      }));

      try {
        const coordinates = await getCurrentCoordinates();

        if (session && hasSupabaseSync()) {
          await saveRemotePlace(session, {
            label: trimmedLabel,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            radiusMeters,
          });
          await syncLocationAutomationState(session);
        } else {
          const nextPlace: SavedPlace = {
            id: `place-${Date.now()}`,
            coupleId: state.couple?.id ?? 'local-couple',
            createdByUserId: state.currentUser?.id ?? 'local-user',
            label: trimmedLabel,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            radiusMeters,
            createdAt: new Date().toISOString(),
          };
          const nextPlaces = [nextPlace, ...useTwogetherStore.getState().savedPlaces];

          set((currentState) => ({
            ...bump(currentState),
            savedPlaces: nextPlaces,
            locationBusy: false,
            locationError: null,
          }));

          await writeStoredLocationAutomationState({
            savedPlaces: nextPlaces,
          });
        }
      } catch (error) {
        set((currentState) => ({
          ...bump(currentState),
          locationBusy: false,
          locationError: error instanceof Error ? error.message : 'That place could not be saved.',
        }));
        throw error;
      }
    },
    deleteSavedPlace: async (placeId) => {
      const session = useTwogetherStore.getState().authSession;

      set((state) => ({
        ...bump(state),
        locationBusy: true,
        locationError: null,
      }));

      try {
        if (session && hasSupabaseSync()) {
          await archiveRemotePlace(session, placeId);
          await syncLocationAutomationState(session);
        } else {
          const currentState = useTwogetherStore.getState();
          const nextPlaces = currentState.savedPlaces.filter((place) => place.id !== placeId);
          const nextCurrentPlaceId =
            currentState.currentPlaceId === placeId ? null : currentState.currentPlaceId;

          set((state) => ({
            ...bump(state),
            savedPlaces: nextPlaces,
            currentPlaceId: nextCurrentPlaceId,
            locationBusy: false,
            locationError: null,
            activeLocationSuggestion: deriveLocationSuggestion({
              ...state,
              savedPlaces: nextPlaces,
              currentPlaceId: nextCurrentPlaceId,
            }),
          }));

          await writeStoredLocationAutomationState({
            savedPlaces: nextPlaces,
            currentPlaceId: nextCurrentPlaceId,
          });
        }
      } catch (error) {
        set((state) => ({
          ...bump(state),
          locationBusy: false,
          locationError:
            error instanceof Error ? error.message : 'That saved place could not be removed.',
        }));
        throw error;
      }
    },
    setLocationAutomationSettings: async ({ enabled, mode }) => {
      const session = useTwogetherStore.getState().authSession;

      set((state) => ({
        ...bump(state),
        locationBusy: true,
        locationError: null,
      }));

      try {
        if (session && hasSupabaseSync()) {
          await saveRemoteLocationAutomationSettings(session, {
            enabled,
            mode,
          });
          await syncLocationAutomationState(session);
          await maybeRunLocationAutomation();
        } else {
          set((state) => {
            const patch = {
              locationAutomationEnabled: enabled,
              locationAutomationMode: mode,
              locationBusy: false,
              locationError: null,
            };

            return {
              ...bump(state),
              ...patch,
              activeLocationSuggestion: deriveLocationSuggestion({
                ...state,
                ...patch,
              }),
            };
          });

          await writeStoredLocationAutomationState({
            enabled,
            mode,
          });
        }
      } catch (error) {
        set((state) => ({
          ...bump(state),
          locationBusy: false,
          locationError:
            error instanceof Error ? error.message : 'Location automation settings could not update.',
        }));
        throw error;
      }
    },
    refreshLocationAutomation: async () => {
      const session = useTwogetherStore.getState().authSession;
      const permissionStatus = await getLocationPermissionStatus().catch(
        () => useTwogetherStore.getState().locationPermissionStatus
      );

      set((state) => ({
        ...bump(state),
        locationBusy: true,
        locationPermissionStatus: permissionStatus,
        locationError: null,
      }));

      if (permissionStatus !== 'granted') {
        await writeStoredLocationAutomationState({
          permissionStatus,
        });

        set((state) => ({
          ...bump(state),
          locationBusy: false,
          locationError: 'Allow location access to check whether you are at a saved place.',
        }));
        return;
      }

      try {
        const coordinates = await getCurrentCoordinates();
        const places = useTwogetherStore.getState().savedPlaces;
        const matchedPlace = matchSavedPlace(coordinates, places);
        const matchedPlaceId = matchedPlace?.id ?? null;

        if (session && hasSupabaseSync()) {
          await updateRemotePlacePresence(session, matchedPlaceId);
          await syncLocationAutomationState(session);
        } else {
          set((state) => {
            const patch = {
              currentPlaceId: matchedPlaceId,
              locationBusy: false,
              locationError: null,
            };

            return {
              ...bump(state),
              ...patch,
              activeLocationSuggestion: deriveLocationSuggestion({
                ...state,
                ...patch,
              }),
            };
          });

          await writeStoredLocationAutomationState({
            currentPlaceId: matchedPlaceId,
            permissionStatus,
          });
        }

        await maybeRunLocationAutomation();
      } catch (error) {
        set((state) => ({
          ...bump(state),
          locationBusy: false,
          locationError:
            error instanceof Error ? error.message : 'We could not refresh your saved-place status.',
        }));
        throw error;
      }
    },
    startLocationSuggestedSession: async () => {
      const state = useTwogetherStore.getState();
      const suggestion = state.activeLocationSuggestion;
      const place = suggestion
        ? state.savedPlaces.find((entry) => entry.id === suggestion.placeId)
        : null;

      if (!suggestion || !place) {
        return null;
      }

      const createdId = await useTwogetherStore.getState().createSession({
        title: `Together at ${place.label}`,
        startISO: new Date().toISOString(),
        endISO: addHours(new Date(), 1).toISOString(),
        graceSeconds: 300,
        scope: 'shared',
        source: 'quick_start',
        shortSessionMode: false,
        warningMinutesBefore: [5],
      });

      set((currentState) => ({
        ...bump(currentState),
        activeLocationSuggestion: null,
      }));

      return createdId;
    },
    dismissLocationSuggestion: () =>
      set((state) => ({
        ...bump(state),
        activeLocationSuggestion: null,
      })),
    setAuthorizationStatus: (status) =>
      set((state) => ({
        ...bump(state),
        authorizationStatus: status,
      })),
    setSelectionConfigured: (configured) =>
      set((state) => ({
        ...bump(state),
        selectionConfigured: configured,
      })),
    setLocalShieldState: (shieldState) =>
      set((state) => ({
        ...bump(state),
        localShieldState: shieldState,
      })),
    saveSessionCondition: async (draft) => {
      const trimmedLabel = draft.label.trim();
      const trimmedTitle = draft.defaultTitle.trim();

      if (!trimmedLabel || !trimmedTitle) {
        throw new Error('Enter both a label and a default session title.');
      }

      if (draft.allowedMinutes <= 0 || draft.intervalHours <= 0) {
        throw new Error('Minutes and hours both need to be greater than zero.');
      }

      const session = useTwogetherStore.getState().authSession;
      if (session && hasSupabaseSync()) {
        const createdId = await saveRemoteSessionPreset(session, draft);
        await syncRemoteAppState(session);
        return createdId;
      }

      const nextCondition: SavedSessionCondition = {
        id: `condition-${Date.now()}`,
        label: trimmedLabel,
        defaultTitle: trimmedTitle,
        allowedMinutes: draft.allowedMinutes,
        intervalHours: draft.intervalHours,
        graceSeconds: draft.graceSeconds ?? 0,
        description: draft.description,
        intensity: draft.intensity ?? 'balanced',
        essentialAppHints: draft.essentialAppHints ?? [],
        shortSessionDurationMinutes: draft.shortSessionDurationMinutes ?? null,
        sessionScope: draft.sessionScope ?? 'shared',
        createdAt: new Date().toISOString(),
      };

      let nextConditions: SavedSessionCondition[] = [];

      set((state) => {
        nextConditions = [nextCondition, ...state.savedSessionConditions];

        return {
          ...bump(state),
          savedSessionConditions: nextConditions,
        };
      });

      await writeSavedSessionConditions(nextConditions);
      return nextCondition.id;
    },
    createSessionTemplate: async (draft) => {
      const session = useTwogetherStore.getState().authSession;
      const trimmedTitle = draft.title.trim();

      if (!trimmedTitle) {
        throw new Error('Enter a title for the recurring session.');
      }

      if (session && hasSupabaseSync()) {
        const createdId = await createRemoteSessionTemplate(session, draft);
        await syncRemoteAppState(session);
        return createdId;
      }

      let createdId: string | null = null;

      set((currentState) => {
        if (!currentState.currentUser) {
          return currentState;
        }

        createdId = `template-${Date.now()}`;
        const template: SessionTemplate = {
          id: createdId,
          createdByUserId: currentState.currentUser.id,
          coupleId: draft.sessionScope === 'shared' ? currentState.couple?.id ?? null : null,
          title: trimmedTitle,
          sessionScope: draft.sessionScope,
          profileId: draft.profileId,
          durationMinutes: draft.durationMinutes,
          shortSessionMode: draft.shortSessionMode,
          graceSeconds: draft.graceSeconds,
          status: 'active',
          schedule: draft.schedule,
          createdAt: new Date().toISOString(),
          profile: draft.profile ?? null,
        };

        return {
          ...bump(currentState),
          sessionTemplates: [template, ...currentState.sessionTemplates],
        };
      });

      return createdId;
    },
    toggleSessionTemplate: async (templateId, status) => {
      const session = useTwogetherStore.getState().authSession;

      if (session && hasSupabaseSync()) {
        await updateRemoteSessionTemplateStatus(session, templateId, status);
        await syncRemoteAppState(session);
        return;
      }

      set((state) => ({
        ...bump(state),
        sessionTemplates: state.sessionTemplates.map((template) =>
          template.id === templateId ? { ...template, status } : template
        ),
      }));
    },
    startTemplateSession: async (templateId) => {
      const state = useTwogetherStore.getState();
      const template = state.sessionTemplates.find((entry) => entry.id === templateId);

      if (!template) {
        return null;
      }

      const start = new Date();
      const end = addMinutes(start, template.durationMinutes);

      return useTwogetherStore.getState().createSession({
        title: template.title,
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        graceSeconds: template.graceSeconds,
        condition: profileToCondition(template.profile),
        scope: template.sessionScope,
        source: 'template',
        shortSessionMode: template.shortSessionMode,
        warningMinutesBefore: template.schedule.warningMinutes,
        profile: template.profile ?? null,
        templateId: template.id,
      });
    },
    startQuickSession: async (conditionId) => {
      const session = useTwogetherStore.getState().authSession;
      const state = useTwogetherStore.getState();
      const condition = state.savedSessionConditions.find((entry) => entry.id === conditionId);

      if (!condition) {
        return null;
      }

      const scope = condition.sessionScope ?? 'shared';
      const durationMinutes = condition.shortSessionDurationMinutes ?? Math.max(
        20,
        condition.allowedMinutes
      );

      if (session && hasSupabaseSync()) {
        if (!state.currentUser) {
          return null;
        }

        const start = new Date();
        const end = addMinutes(start, durationMinutes);
        const createdId = await createRemoteSession(
          session,
          {
            title: condition.defaultTitle,
            startISO: start.toISOString(),
            endISO: end.toISOString(),
            graceSeconds: condition.graceSeconds,
            condition: profileToCondition(condition),
            scope,
            source: 'quick_start',
            shortSessionMode: true,
            warningMinutesBefore: [5],
            profile: condition,
          },
          {
            authorizationStatus: state.authorizationStatus,
            currentUser: state.currentUser,
            selectionConfigured: state.selectionConfigured,
          }
        );
        await syncRemoteAppState(session);
        return createdId;
      }

      let createdId: string | null = null;

      set((state) => {
        if (!state.currentUser) {
          return state;
        }

        createdId = `session-${Date.now()}`;
        const start = new Date();
        const end = addMinutes(start, durationMinutes);
        const session = createSessionRecord({
          sessionId: createdId,
          draft: {
            title: condition.defaultTitle,
            startISO: start.toISOString(),
            endISO: end.toISOString(),
            graceSeconds: condition.graceSeconds,
            condition: profileToCondition(condition),
            scope,
            source: 'quick_start',
            shortSessionMode: true,
            warningMinutesBefore: [5],
            profile: condition,
          },
          currentUser: state.currentUser,
          partner: scope === 'shared' ? state.partner : null,
          couple: scope === 'shared' ? state.couple : null,
          authorizationStatus: state.authorizationStatus,
          selectionConfigured: state.selectionConfigured,
        });

        return {
          ...bump(state),
          sessions: [session, ...state.sessions],
        };
      });

      return createdId;
    },
    createSession: async (draft) => {
      const session = useTwogetherStore.getState().authSession;
      const state = useTwogetherStore.getState();

      if (session && hasSupabaseSync()) {
        if (!state.currentUser) {
          return null;
        }

        const createdId = await createRemoteSession(
          session,
          draft,
          {
            authorizationStatus: state.authorizationStatus,
            currentUser: state.currentUser,
            selectionConfigured: state.selectionConfigured,
          }
        );
        await syncRemoteAppState(session);
        return createdId;
      }

      let createdId: string | null = null;

      set((state) => {
        if (!state.currentUser) {
          return state;
        }

        if ((draft.scope ?? 'shared') === 'shared' && (!state.partner || !state.couple)) {
          return state;
        }

        createdId = `session-${Date.now()}`;
        const session = createSessionRecord({
          sessionId: createdId,
          draft,
          currentUser: state.currentUser,
          partner: draft.scope === 'solo' ? null : state.partner,
          couple: draft.scope === 'solo' ? null : state.couple,
          authorizationStatus: state.authorizationStatus,
          selectionConfigured: state.selectionConfigured,
        });

        return {
          ...bump(state),
          sessions: [session, ...state.sessions],
        };
      });

      return createdId;
    },
    acceptSession: async (sessionId) => {
      const session = useTwogetherStore.getState().authSession;
      const state = useTwogetherStore.getState();
      const nextStatus =
        state.authorizationStatus === 'approved' && state.selectionConfigured
          ? 'armed'
          : 'pending_acceptance';

      if (session && hasSupabaseSync()) {
        await updateRemoteSessionState(session, sessionId, {
          authorizationStatus: state.authorizationStatus,
          selectionConfigured: state.selectionConfigured,
          status: nextStatus,
        });
        await syncRemoteAppState(session);
        return;
      }

      set((currentState) => ({
        ...bump(currentState),
        sessions: currentState.sessions.map((entry) =>
          entry.id !== sessionId
            ? entry
            : {
                ...entry,
                status: nextStatus,
                participants: entry.participants.map((participant) =>
                  participant.userId === currentState.currentUser?.id
                    ? {
                        ...participant,
                        acceptanceStatus: 'accepted',
                        authorizationStatusAtArmTime: currentState.authorizationStatus,
                        localShieldState:
                          currentState.authorizationStatus === 'approved' &&
                          currentState.selectionConfigured
                            ? 'armed'
                            : 'idle',
                      }
                    : participant
                ),
              }
        ),
      }));
    },
    activateSession: async (sessionId) => {
      const session = useTwogetherStore.getState().authSession;
      const state = useTwogetherStore.getState();

      if (session && hasSupabaseSync()) {
        await updateRemoteSessionState(session, sessionId, {
          authorizationStatus: state.authorizationStatus,
          selectionConfigured: state.selectionConfigured,
          status: 'active',
        });
        await syncRemoteAppState(session);
        set((currentState) => ({
          ...bump(currentState),
          localShieldState: 'active',
        }));
        return;
      }

      set((currentState) => ({
        ...bump(currentState),
        localShieldState: 'active',
        sessions: currentState.sessions.map((entry) =>
          entry.id !== sessionId
            ? entry
            : {
                ...entry,
                status: 'active',
                participants: entry.participants.map((participant) => ({
                  ...participant,
                  localShieldState: 'active',
                })),
              }
        ),
      }));
    },
    completeSession: async (sessionId) => {
      const session = useTwogetherStore.getState().authSession;
      const state = useTwogetherStore.getState();
      const targetSession = state.sessions.find((entry) => entry.id === sessionId);

      if (
        !targetSession ||
        targetSession.status === 'completed' ||
        targetSession.status === 'interrupted' ||
        targetSession.status === 'cancelled'
      ) {
        return;
      }

      const nextTotalCompleted = state.streak.totalCompleted + 1;
      const unlockedReward = getRewardMilestoneForTotal(nextTotalCompleted);

      if (session && hasSupabaseSync()) {
        await updateRemoteSessionState(session, sessionId, {
          authorizationStatus: state.authorizationStatus,
          selectionConfigured: state.selectionConfigured,
          status: 'completed',
        });
        await syncRemoteAppState(session);
        set((currentState) => ({
          ...bump(currentState),
          localShieldState: 'completed',
          activeRewardMilestone: unlockedReward,
        }));
        return;
      }

      set((currentState) => ({
        ...bump(currentState),
        localShieldState: 'completed',
        streak: {
          current: currentState.streak.current + 1,
          best: Math.max(currentState.streak.best, currentState.streak.current + 1),
          totalCompleted: nextTotalCompleted,
        },
        activeRewardMilestone: unlockedReward,
        sessions: currentState.sessions.map((entry) =>
          entry.id !== sessionId
            ? entry
            : {
                ...entry,
                status: 'completed',
                participants: entry.participants.map((participant) => ({
                  ...participant,
                  localShieldState: 'completed',
                  completedSuccessfully: true,
                })),
              }
        ),
      }));
    },
    interruptSession: async (sessionId, reason: SessionInterruptionReason = 'manual_disable') => {
      const session = useTwogetherStore.getState().authSession;
      const state = useTwogetherStore.getState();

      if (session && hasSupabaseSync()) {
        await updateRemoteSessionState(session, sessionId, {
          authorizationStatus: state.authorizationStatus,
          reason,
          selectionConfigured: state.selectionConfigured,
          status: 'interrupted',
        });
        await syncRemoteAppState(session);
        set((currentState) => ({
          ...bump(currentState),
          localShieldState: 'interrupted',
        }));
        return;
      }

      set((currentState) => ({
        ...bump(currentState),
        localShieldState: 'interrupted',
        streak: {
          ...currentState.streak,
          current: 0,
        },
        sessions: currentState.sessions.map((entry) =>
          entry.id !== sessionId
            ? entry
            : {
                ...entry,
                status: 'interrupted',
                participants: entry.participants.map((participant) => ({
                  ...participant,
                  localShieldState: 'interrupted',
                  completedSuccessfully: false,
                  interruptionReason: reason,
                  bypassCount:
                    participant.userId === currentState.currentUser?.id &&
                    reason === 'emergency_bypass'
                      ? (participant.bypassCount ?? 0) + 1
                      : participant.bypassCount,
                  lastBypassedAt:
                    participant.userId === currentState.currentUser?.id &&
                    reason === 'emergency_bypass'
                      ? new Date().toISOString()
                      : participant.lastBypassedAt,
                })),
              }
        ),
      }));
    },
    cancelSession: async (sessionId) => {
      const session = useTwogetherStore.getState().authSession;
      const state = useTwogetherStore.getState();

      if (session && hasSupabaseSync()) {
        await updateRemoteSessionState(session, sessionId, {
          authorizationStatus: state.authorizationStatus,
          selectionConfigured: state.selectionConfigured,
          status: 'cancelled',
        });
        await syncRemoteAppState(session);
        return;
      }

      set((currentState) => ({
        ...bump(currentState),
        sessions: currentState.sessions.map((entry) =>
          entry.id === sessionId
            ? {
                ...entry,
                status: 'cancelled',
              }
            : entry
        ),
      }));
    },
    dismissRewardMilestone: () =>
      set((state) => ({
        ...bump(state),
        activeRewardMilestone: null,
      })),
    resetDemo: () =>
      set((state) => {
        const initialState = makeInitialState();

        return {
          ...initialState,
          revision: state.revision + 1,
          authStatus: state.authStatus,
          authSession: state.authSession,
          subscriptionStatus: state.subscriptionStatus,
          subscriptionPackages: state.subscriptionPackages,
          subscriptionOfferingIdentifier: state.subscriptionOfferingIdentifier,
          subscriptionEntitlementIdentifier: state.subscriptionEntitlementIdentifier,
          subscriptionManagementUrl: state.subscriptionManagementUrl,
          subscriptionExpiresAt: state.subscriptionExpiresAt,
          subscriptionWillRenew: state.subscriptionWillRenew,
          subscriptionUnsubscribeDetectedAt: state.subscriptionUnsubscribeDetectedAt,
          subscriptionBillingIssueDetectedAt: state.subscriptionBillingIssueDetectedAt,
          subscriptionAppUserId: state.subscriptionAppUserId,
          subscriptionHasIntroOfferConfigured: state.subscriptionHasIntroOfferConfigured,
          subscriptionBusy: false,
          subscriptionError: state.subscriptionError,
          effectiveSubscriptionAccess: state.effectiveSubscriptionAccess,
          currentUser: state.currentUser,
          savedSessionConditions: state.savedSessionConditions,
          sessionTemplates: state.sessionTemplates,
          onboarding: {
            ...initialState.onboarding,
            accountCreated: Boolean(state.authSession),
          },
        };
      }),
  };
}

export const useTwogetherStore = create<TwogetherState>()((set) => ({
  ...makeInitialState(),
  ...actionsFactory(set),
}));
