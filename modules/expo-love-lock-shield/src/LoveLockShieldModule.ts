import { NativeModule, requireNativeModule } from 'expo';

import type {
  ScheduledNativeSession,
  LoveLockShieldModuleEvents,
} from './LoveLockShield.types';

declare class LoveLockShieldModule extends NativeModule<LoveLockShieldModuleEvents> {
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

export default requireNativeModule<LoveLockShieldModule>('LoveLockShield');
