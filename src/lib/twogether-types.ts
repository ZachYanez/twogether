export type AuthorizationStatus =
  | 'notDetermined'
  | 'approved'
  | 'denied'
  | 'unsupported'
  | 'error';

export type AuthProvider = 'password' | 'apple' | 'google';

export type AuthStatus = 'restoring' | 'signed_out' | 'authenticated';

export type SubscriptionStatus =
  | 'idle'
  | 'loading'
  | 'inactive'
  | 'active'
  | 'configuration_required'
  | 'unsupported'
  | 'error';

export type ShieldState =
  | 'idle'
  | 'armed'
  | 'active'
  | 'completed'
  | 'interrupted';

export type CoupleStatus = 'pending' | 'active' | 'unpaired';

export type SessionStatus =
  | 'draft'
  | 'pending_acceptance'
  | 'armed'
  | 'active'
  | 'completed'
  | 'interrupted'
  | 'cancelled';

export type AcceptanceStatus = 'pending' | 'accepted' | 'declined';

export type SessionInterruptionReason =
  | 'authorization_revoked'
  | 'missing_selection'
  | 'scheduling_failed'
  | 'shield_apply_failed'
  | 'manual_disable'
  | 'other';

export type SessionCondition = {
  allowedMinutes: number;
  intervalHours: number;
  presetId?: string;
  presetLabel?: string;
};

export type SavedSessionCondition = {
  id: string;
  label: string;
  defaultTitle: string;
  allowedMinutes: number;
  intervalHours: number;
  graceSeconds: number;
  createdAt: string;
};

export type User = {
  id: string;
  displayName: string;
  email?: string;
  authProvider?: AuthProvider;
  timezone: string;
};

export type AuthSession = {
  userId: string;
  provider: AuthProvider;
  email: string;
  displayName: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  createdAt: string;
  providerSubject?: string;
};

export type Couple = {
  id: string;
  status: CoupleStatus;
  partnerAUserId: string;
  partnerBUserId: string;
  createdAt: string;
};

export type SessionParticipant = {
  id: string;
  userId: string;
  displayName: string;
  acceptanceStatus: AcceptanceStatus;
  authorizationStatusAtArmTime: AuthorizationStatus;
  localShieldState: ShieldState;
  completedSuccessfully?: boolean;
  interruptionReason?: SessionInterruptionReason;
};

export type Session = {
  id: string;
  coupleId: string;
  createdByUserId: string;
  title: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  timezone: string;
  graceSeconds: number;
  condition?: SessionCondition | null;
  status: SessionStatus;
  createdAt: string;
  participants: SessionParticipant[];
};

export type SelectionPreview = {
  label: string;
  detail: string;
};

export type ReadinessStep = {
  id: string;
  label: string;
  complete: boolean;
};

export type DashboardData = {
  readiness: {
    score: number;
    headline: string;
    body: string;
    steps: ReadinessStep[];
  };
  primarySession: Session | null;
  pendingSessionCount: number;
  streak: {
    current: number;
    best: number;
    totalCompleted: number;
  };
};

export type SubscriptionPackageOption = {
  packageIdentifier: string;
  packageType: string;
  productIdentifier: string;
  title: string;
  description: string;
  price: number;
  priceString: string;
  pricePerMonthString: string | null;
  subscriptionPeriod: string | null;
  hasIntroOffer: boolean;
};

export type SubscriptionSnapshot = {
  status: SubscriptionStatus;
  packages: SubscriptionPackageOption[];
  offeringIdentifier: string | null;
  activeEntitlementIdentifier: string | null;
  managementUrl: string | null;
  expiresAt: string | null;
  willRenew: boolean;
  unsubscribeDetectedAt: string | null;
  billingIssueDetectedAt: string | null;
  appUserId: string | null;
  hasIntroOfferConfigured: boolean;
  error: string | null;
};
