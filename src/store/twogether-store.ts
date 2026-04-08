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
  createRemotePairing,
  createRemoteSession,
  fetchRemoteSnapshot,
  hasSupabaseSync,
  saveRemoteSessionPreset,
  updateRemoteSessionState,
} from '@/src/lib/twogether-supabase';
import type {
  AuthSession,
  AuthStatus,
  AuthorizationStatus,
  Couple,
  SavedSessionCondition,
  SelectionPreview,
  Session,
  SessionCondition,
  SessionInterruptionReason,
  SessionStatus,
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
};

type SessionConditionDraft = {
  label: string;
  defaultTitle: string;
  allowedMinutes: number;
  intervalHours: number;
  graceSeconds?: number;
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
  currentUser: User | null;
  partner: User | null;
  couple: Couple | null;
  authorizationStatus: AuthorizationStatus;
  selectionConfigured: boolean;
  selectionPreview: SelectionPreview[];
  localShieldState: ShieldState;
  savedSessionConditions: SavedSessionCondition[];
  sessions: Session[];
  streak: StreakState;
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
  requestPasswordReset: (email: string) => Promise<string>;
  updateAccountDisplayName: (displayName: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  pairWithPartner: (partnerName?: string) => Promise<void>;
  setAuthorizationStatus: (status: AuthorizationStatus) => void;
  setSelectionConfigured: (configured: boolean) => void;
  setLocalShieldState: (state: ShieldState) => void;
  saveSessionCondition: (draft: SessionConditionDraft) => Promise<string>;
  startQuickSession: (conditionId: string) => Promise<string | null>;
  createSession: (draft: DraftPreset) => Promise<string | null>;
  acceptSession: (sessionId: string) => Promise<void>;
  activateSession: (sessionId: string) => Promise<void>;
  completeSession: (sessionId: string) => Promise<void>;
  interruptSession: (sessionId: string, reason?: SessionInterruptionReason) => Promise<void>;
  cancelSession: (sessionId: string) => Promise<void>;
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
  | 'requestPasswordReset'
  | 'updateAccountDisplayName'
  | 'deleteAccount'
  | 'signInWithApple'
  | 'signInWithGoogle'
  | 'signOut'
  | 'pairWithPartner'
  | 'setAuthorizationStatus'
  | 'setSelectionConfigured'
  | 'setLocalShieldState'
  | 'saveSessionCondition'
  | 'startQuickSession'
  | 'createSession'
  | 'acceptSession'
  | 'activateSession'
  | 'completeSession'
  | 'interruptSession'
  | 'cancelSession'
  | 'resetDemo'
>;

const now = new Date();

function getDefaultSavedSessionConditions(): SavedSessionCondition[] {
  const createdAt = new Date().toISOString();

  return [
    {
      id: 'condition-balance-reset',
      label: 'Balance reset',
      defaultTitle: 'Balance reset',
      allowedMinutes: 20,
      intervalHours: 2,
      graceSeconds: 300,
      createdAt,
    },
    {
      id: 'condition-tight-boundary',
      label: 'Tight boundary',
      defaultTitle: 'Tight boundary',
      allowedMinutes: 5,
      intervalHours: 1,
      graceSeconds: 0,
      createdAt,
    },
    {
      id: 'condition-evening-flex',
      label: 'Evening flex',
      defaultTitle: 'Evening flex',
      allowedMinutes: 45,
      intervalHours: 6,
      graceSeconds: 300,
      createdAt,
    },
  ];
}

function createSessionRecord(params: {
  sessionId: string;
  draft: DraftPreset;
  currentUser: User;
  partner: User;
  couple: Couple;
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
  const isReady = authorizationStatus === 'approved' && selectionConfigured;
  const status: SessionStatus = isReady ? 'armed' : 'pending_acceptance';

  return {
    id: sessionId,
    coupleId: couple.id,
    createdByUserId: currentUser.id,
    title: draft.title,
    scheduledStartAt: draft.startISO,
    scheduledEndAt: draft.endISO,
    timezone: currentUser.timezone,
    graceSeconds: draft.graceSeconds,
    condition: draft.condition ?? null,
    status,
    createdAt: new Date().toISOString(),
    participants: [
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

  return [
    {
      id: 'session-upcoming',
      coupleId: couple.id,
      createdByUserId: user.id,
      title: 'Phone-free dinner',
      scheduledStartAt: upcomingStart.toISOString(),
      scheduledEndAt: upcomingEnd.toISOString(),
      timezone: user.timezone,
      graceSeconds: 300,
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
      title: 'Sunset walk',
      scheduledStartAt: inviteStart.toISOString(),
      scheduledEndAt: inviteEnd.toISOString(),
      timezone: user.timezone,
      graceSeconds: 0,
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
      title: 'No-screen brunch',
      scheduledStartAt: completedStart.toISOString(),
      scheduledEndAt: completedEnd.toISOString(),
      timezone: user.timezone,
      graceSeconds: 0,
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
    sessions: [] as Session[],
    streak: {
      current: 0,
      best: 0,
      totalCompleted: 0,
    },
  };
}

function getDefaultOrPersistedSessionConditions(conditions?: SavedSessionCondition[]) {
  return conditions && conditions.length ? conditions : getDefaultSavedSessionConditions();
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
    savedSessionConditions: snapshot.savedSessionConditions,
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

    const [subscription] = await Promise.all([
      syncRevenueCatSubscription(session.userId),
      syncRemoteAppState(session),
    ]);

    set((state) => ({
      ...bump(state),
      ...subscriptionPatch(subscription),
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
        onboarding: {
          ...state.onboarding,
          accountCreated: true,
        },
        currentUser: userFromSession(session),
        savedSessionConditions,
        subscriptionStatus: 'loading',
        subscriptionError: null,
      }));

      const [subscription] = await Promise.all([
        syncRevenueCatSubscription(session.userId),
        syncRemoteAppState(session, savedSessionConditions),
      ]);

      set((state) => ({
        ...bump(state),
        ...subscriptionPatch(subscription),
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

      set((state) => ({
        ...bump(state),
        ...subscriptionPatch(subscription),
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

        set((state) => ({
          ...bump(state),
          ...subscriptionPatch(subscription),
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

        set((state) => ({
          ...bump(state),
          ...subscriptionPatch(subscription),
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
      const session = await signInWithPassword({
        email,
        password,
        displayName,
      });

      await writeStoredAuthSession(session);
      await applyAuthenticatedSession(session);
    },
    registerWithEmailPassword: async ({ email, password, displayName }) => {
      const session = await registerWithEmailPassword({
        email,
        password,
        displayName,
      });

      await writeStoredAuthSession(session);
      await applyAuthenticatedSession(session);
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
      await writeStoredAuthSession(session);
      await applyAuthenticatedSession(session);
    },
    signInWithGoogle: async () => {
      const session = await signInWithGoogle();
      await writeStoredAuthSession(session);
      await applyAuthenticatedSession(session);
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

        return {
          ...bump(state),
          partner,
          couple,
          sessions: createSeedSessions(state.currentUser, partner, couple),
          streak: {
            current: 3,
            best: 8,
            totalCompleted: 14,
          },
        };
      });
    },
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
    startQuickSession: async (conditionId) => {
      const session = useTwogetherStore.getState().authSession;
      const state = useTwogetherStore.getState();

      if (session && hasSupabaseSync()) {
        const condition = state.savedSessionConditions.find((entry) => entry.id === conditionId);

        if (!condition || !state.currentUser) {
          return null;
        }

        const start = new Date();
        const end = addHours(start, condition.intervalHours);
        const createdId = await createRemoteSession(
          session,
          {
            title: condition.defaultTitle,
            startISO: start.toISOString(),
            endISO: end.toISOString(),
            graceSeconds: condition.graceSeconds,
            condition: {
              allowedMinutes: condition.allowedMinutes,
              intervalHours: condition.intervalHours,
              presetId: condition.id,
              presetLabel: condition.label,
            },
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
        if (!state.currentUser || !state.partner || !state.couple) {
          return state;
        }

        const condition = state.savedSessionConditions.find((entry) => entry.id === conditionId);

        if (!condition) {
          return state;
        }

        createdId = `session-${Date.now()}`;
        const start = new Date();
        const end = addHours(start, condition.intervalHours);
        const session = createSessionRecord({
          sessionId: createdId,
          draft: {
            title: condition.defaultTitle,
            startISO: start.toISOString(),
            endISO: end.toISOString(),
            graceSeconds: condition.graceSeconds,
            condition: {
              allowedMinutes: condition.allowedMinutes,
              intervalHours: condition.intervalHours,
              presetId: condition.id,
              presetLabel: condition.label,
            },
          },
          currentUser: state.currentUser,
          partner: state.partner,
          couple: state.couple,
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
        if (!state.currentUser || !state.partner || !state.couple) {
          return state;
        }

        createdId = `session-${Date.now()}`;
        const session = createSessionRecord({
          sessionId: createdId,
          draft,
          currentUser: state.currentUser,
          partner: state.partner,
          couple: state.couple,
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
        }));
        return;
      }

      set((currentState) => ({
        ...bump(currentState),
        localShieldState: 'completed',
        streak: {
          current: currentState.streak.current + 1,
          best: Math.max(currentState.streak.best, currentState.streak.current + 1),
          totalCompleted: currentState.streak.totalCompleted + 1,
        },
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
          currentUser: state.currentUser,
          savedSessionConditions: state.savedSessionConditions,
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
