export type NativeAuthorizationStatus =
  | 'notDetermined'
  | 'approved'
  | 'denied'
  | 'unsupported'
  | 'error';

type LoveLockShieldModuleShape = {
  getAuthorizationStatus(): Promise<string>;
  requestAuthorization(): Promise<string>;
  presentActivityPicker(): Promise<{ selectionConfigured: boolean }>;
  getLocalShieldState(): Promise<string>;
  applyRestrictionsNow(): Promise<void>;
  clearRestrictionsNow(): Promise<void>;
};

type FallbackShieldState = {
  authorizationStatus: NativeAuthorizationStatus;
  selectionConfigured: boolean;
  shieldState: string;
};

const fallbackState: FallbackShieldState = {
  authorizationStatus: 'notDetermined',
  selectionConfigured: false,
  shieldState: 'idle',
};

const fallbackModule: LoveLockShieldModuleShape = {
  async getAuthorizationStatus() {
    return fallbackState.authorizationStatus;
  },
  async requestAuthorization() {
    fallbackState.authorizationStatus = 'approved';
    return fallbackState.authorizationStatus;
  },
  async presentActivityPicker() {
    fallbackState.selectionConfigured = true;
    return {
      selectionConfigured: true,
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
};

let LoveLockShield: LoveLockShieldModuleShape = fallbackModule;

try {
  // Keep a JS fallback available so the app UI can run
  // even before the local Expo module has been linked natively.
  LoveLockShield = require('@/modules/expo-love-lock-shield').default as LoveLockShieldModuleShape;
} catch {
  LoveLockShield = fallbackModule;
}

export async function getAuthorizationStatus(): Promise<NativeAuthorizationStatus> {
  return (await LoveLockShield.getAuthorizationStatus()) as NativeAuthorizationStatus;
}

export async function requestAuthorization(): Promise<NativeAuthorizationStatus> {
  return (await LoveLockShield.requestAuthorization()) as NativeAuthorizationStatus;
}

export async function presentActivityPicker() {
  return LoveLockShield.presentActivityPicker();
}

export async function getLocalShieldState() {
  return LoveLockShield.getLocalShieldState();
}

export async function applyRestrictionsNow() {
  return LoveLockShield.applyRestrictionsNow();
}

export async function clearRestrictionsNow() {
  return LoveLockShield.clearRestrictionsNow();
}
