import type { ActivitySelectionResult } from '@/modules/expo-lovelock-shield';

export type NativeAuthorizationStatus =
  | 'notDetermined'
  | 'approved'
  | 'denied'
  | 'unsupported'
  | 'error';

type LovelockShieldModuleShape = {
  getAuthorizationStatus(): Promise<string>;
  requestAuthorization(): Promise<string>;
  presentActivityPicker(): Promise<ActivitySelectionResult>;
  getActivitySelectionSummary(): Promise<ActivitySelectionResult>;
  getLocalShieldState(): Promise<string>;
  applyRestrictionsNow(): Promise<void>;
  clearRestrictionsNow(): Promise<void>;
  scheduleSession(sessionId: string, startISO: string, endISO: string): Promise<void>;
  cancelScheduledSession(sessionId: string): Promise<void>;
};

type FallbackShieldState = {
  authorizationStatus: NativeAuthorizationStatus;
  selectionConfigured: boolean;
  shieldState: string;
  applicationCount: number;
  categoryCount: number;
  webDomainCount: number;
};

const fallbackState: FallbackShieldState = {
  authorizationStatus: 'notDetermined',
  selectionConfigured: false,
  shieldState: 'idle',
  applicationCount: 0,
  categoryCount: 0,
  webDomainCount: 0,
};

const fallbackModule: LovelockShieldModuleShape = {
  async getAuthorizationStatus() {
    return fallbackState.authorizationStatus;
  },
  async requestAuthorization() {
    fallbackState.authorizationStatus = 'approved';
    return fallbackState.authorizationStatus;
  },
  async presentActivityPicker() {
    fallbackState.selectionConfigured = true;
    fallbackState.applicationCount = 3;
    fallbackState.categoryCount = 0;
    fallbackState.webDomainCount = 0;
    return {
      selectionConfigured: true,
      applicationCount: 3,
      categoryCount: 0,
      webDomainCount: 0,
    };
  },
  async getActivitySelectionSummary() {
    return {
      selectionConfigured: fallbackState.selectionConfigured,
      applicationCount: fallbackState.applicationCount,
      categoryCount: fallbackState.categoryCount,
      webDomainCount: fallbackState.webDomainCount,
    };
  },
  async getLocalShieldState() {
    return fallbackState.shieldState;
  },
  async applyRestrictionsNow() {
    fallbackState.shieldState = fallbackState.selectionConfigured ? 'active' : 'interrupted';
  },
  async clearRestrictionsNow() {
    fallbackState.shieldState = 'completed';
  },
  async scheduleSession(_sessionId: string, _startISO: string, _endISO: string) {
    fallbackState.shieldState = 'armed';
  },
  async cancelScheduledSession(_sessionId: string) {},
};

const SHIELD_METHOD_KEYS: (keyof LovelockShieldModuleShape)[] = [
  'getAuthorizationStatus',
  'requestAuthorization',
  'presentActivityPicker',
  'getActivitySelectionSummary',
  'getLocalShieldState',
  'applyRestrictionsNow',
  'clearRestrictionsNow',
  'scheduleSession',
  'cancelScheduledSession',
];

function mergeShieldWithFallback(native: unknown): LovelockShieldModuleShape {
  if (!native || typeof native !== 'object') {
    return fallbackModule;
  }

  const record = native as Record<string, unknown>;
  const merged: LovelockShieldModuleShape = { ...fallbackModule };

  for (const key of SHIELD_METHOD_KEYS) {
    const fn = record[key as string];
    if (typeof fn === 'function') {
      (merged as Record<string, unknown>)[key as string] = (fn as (...args: unknown[]) => unknown).bind(
        native
      );
    }
  }

  return merged;
}

let LovelockShield: LovelockShieldModuleShape = fallbackModule;

try {
  const native = require('@/modules/expo-lovelock-shield').default;
  LovelockShield = mergeShieldWithFallback(native);
} catch {
  LovelockShield = fallbackModule;
}

export async function getAuthorizationStatus(): Promise<NativeAuthorizationStatus> {
  return (await LovelockShield.getAuthorizationStatus()) as NativeAuthorizationStatus;
}

export async function requestAuthorization(): Promise<NativeAuthorizationStatus> {
  return (await LovelockShield.requestAuthorization()) as NativeAuthorizationStatus;
}

export async function presentActivityPicker() {
  return LovelockShield.presentActivityPicker();
}

export async function getActivitySelectionSummary(): Promise<ActivitySelectionResult> {
  return LovelockShield.getActivitySelectionSummary();
}

export async function getLocalShieldState() {
  return LovelockShield.getLocalShieldState();
}

export async function applyRestrictionsNow() {
  return LovelockShield.applyRestrictionsNow();
}

export async function clearRestrictionsNow() {
  return LovelockShield.clearRestrictionsNow();
}

export async function scheduleSession(sessionId: string, startISO: string, endISO: string) {
  return LovelockShield.scheduleSession(sessionId, startISO, endISO);
}

export async function cancelScheduledSession(sessionId: string) {
  return LovelockShield.cancelScheduledSession(sessionId);
}
