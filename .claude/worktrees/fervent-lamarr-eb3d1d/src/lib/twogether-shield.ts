export type NativeAuthorizationStatus =
  | 'notDetermined'
  | 'approved'
  | 'denied'
  | 'unsupported'
  | 'error';

type TwogetherShieldModuleShape = {
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

const fallbackModule: TwogetherShieldModuleShape = {
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

let TwogetherShield: TwogetherShieldModuleShape = fallbackModule;

try {
  // Keep a JS fallback available so the app UI can run
  // even before the local Expo module has been linked natively.
  TwogetherShield = require('@/modules/expo-twogether-shield').default as TwogetherShieldModuleShape;
} catch {
  TwogetherShield = fallbackModule;
}

export async function getAuthorizationStatus(): Promise<NativeAuthorizationStatus> {
  return (await TwogetherShield.getAuthorizationStatus()) as NativeAuthorizationStatus;
}

export async function requestAuthorization(): Promise<NativeAuthorizationStatus> {
  return (await TwogetherShield.requestAuthorization()) as NativeAuthorizationStatus;
}

export async function presentActivityPicker() {
  return TwogetherShield.presentActivityPicker();
}

export async function getLocalShieldState() {
  return TwogetherShield.getLocalShieldState();
}

export async function applyRestrictionsNow() {
  return TwogetherShield.applyRestrictionsNow();
}

export async function clearRestrictionsNow() {
  return TwogetherShield.clearRestrictionsNow();
}
