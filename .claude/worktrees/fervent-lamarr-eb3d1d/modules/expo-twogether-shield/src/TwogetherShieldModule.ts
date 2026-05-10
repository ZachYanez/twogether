import { NativeModule, requireNativeModule } from 'expo';

import type {
  ScheduledNativeSession,
  TwogetherShieldModuleEvents,
} from './TwogetherShield.types';

declare class TwogetherShieldModule extends NativeModule<TwogetherShieldModuleEvents> {
  getAuthorizationStatus(): Promise<string>;
  requestAuthorization(): Promise<string>;
  presentActivityPicker(): Promise<{ selectionConfigured: boolean }>;
  hasStoredSelection(): Promise<boolean>;
  clearStoredSelection(): Promise<void>;
  applyRestrictionsNow(): Promise<void>;
  clearRestrictionsNow(): Promise<void>;
  scheduleSession(sessionId: string, startISO: string, endISO: string): Promise<void>;
  cancelScheduledSession(sessionId: string): Promise<void>;
  getLocalShieldState(): Promise<string>;
  getScheduledSessions(): Promise<ScheduledNativeSession[]>;
}

export default requireNativeModule<TwogetherShieldModule>('TwogetherShield');
