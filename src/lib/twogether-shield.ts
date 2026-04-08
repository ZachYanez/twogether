import TwogetherShield from '@/modules/expo-twogether-shield';

export type NativeAuthorizationStatus =
  | 'notDetermined'
  | 'approved'
  | 'denied'
  | 'unsupported'
  | 'error';

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
