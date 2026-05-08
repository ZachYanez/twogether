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

export type SubscriptionAccessSource = 'none' | 'self' | 'partner';

export type CoupleStatus = 'pending' | 'active' | 'unpaired';

export type SessionScope = 'shared' | 'solo';

export type SessionSource = 'manual' | 'template' | 'quick_start';

export type SessionIntensity = 'light' | 'balanced' | 'deep';

export type SessionTemplateStatus = 'active' | 'paused';

export type SessionRecurrence = 'none' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom';

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
  | 'emergency_bypass'
  | 'manual_disable'
  | 'missed'
  | 'other';

export type SessionCondition = {
  allowedMinutes: number;
  intervalHours: number;
  presetId?: string;
  presetLabel?: string;
  intensity?: SessionIntensity;
  description?: string;
  essentialAppHints?: string[];
  shortSessionDurationMinutes?: number | null;
};

export type SavedSessionCondition = {
  id: string;
  label: string;
  defaultTitle: string;
  allowedMinutes: number;
  intervalHours: number;
  graceSeconds: number;
  description?: string;
  intensity: SessionIntensity;
  essentialAppHints: string[];
  shortSessionDurationMinutes: number | null;
  sessionScope: SessionScope;
  createdAt: string;
};

export type SessionTemplateSchedule = {
  recurrence: SessionRecurrence;
  daysOfWeek: number[];
  startMinuteOfDay: number;
  startDate: string;
  endDate?: string | null;
  warningMinutes: number[];
};

export type SessionTemplate = {
  id: string;
  createdByUserId: string;
  coupleId: string | null;
  title: string;
  sessionScope: SessionScope;
  profileId: string | null;
  durationMinutes: number;
  shortSessionMode: boolean;
  graceSeconds: number;
  status: SessionTemplateStatus;
  schedule: SessionTemplateSchedule;
  createdAt: string;
  profile?: SavedSessionCondition | null;
};

export type RewardMilestone = {
  id: string;
  threshold: number;
  name: string;
  body: string;
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

export type LocationAutomationMode = 'suggest' | 'auto_arm';

export type LocationPermissionStatus = 'unknown' | 'granted' | 'denied' | 'unavailable';

export type SavedPlace = {
  id: string;
  coupleId: string;
  createdByUserId: string;
  label: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  createdAt: string;
};

export type PlacePresence = {
  userId: string;
  coupleId: string;
  placeId: string | null;
  updatedAt: string | null;
};

export type LocationSuggestion = {
  placeId: string;
  placeLabel: string;
  detectedAt: string;
};

export type EffectiveSubscriptionAccess = {
  isPremium: boolean;
  source: SubscriptionAccessSource;
  ownerUserId: string | null;
  ownerDisplayName: string | null;
  entitlementIdentifier: string | null;
  expiresAt: string | null;
  willRenew: boolean;
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
  bypassCount?: number;
  lastBypassedAt?: string;
};

export type Session = {
  id: string;
  coupleId: string;
  createdByUserId: string;
  templateId?: string | null;
  source: SessionSource;
  scope: SessionScope;
  title: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  timezone: string;
  graceSeconds: number;
  shortSessionMode: boolean;
  warningMinutesBefore: number[];
  condition?: SessionCondition | null;
  profile?: SavedSessionCondition | null;
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

export type HistorySummary = {
  completedThisWeek: number;
  scheduledThisWeek: number;
  shortSessionsCompleted: number;
  bypassCount: number;
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
