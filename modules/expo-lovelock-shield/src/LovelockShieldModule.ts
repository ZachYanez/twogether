import { NativeModule, requireNativeModule } from 'expo';

import type {
  ActivitySelectionResult,
  ScheduledNativeSession,
  LovelockShieldModuleEvents,
} from './LovelockShield.types';

declare class LovelockShieldModule extends NativeModule<LovelockShieldModuleEvents> {
  getAuthorizationStatus(): Promise<string>;
  requestAuthorization(): Promise<string>;
  presentActivityPicker(): Promise<ActivitySelectionResult>;
  hasStoredSelection(): Promise<boolean>;
  clearStoredSelection(): Promise<void>;
  applyRestrictionsNow(): Promise<void>;
  clearRestrictionsNow(): Promise<void>;
  scheduleSession(sessionId: string, startISO: string, endISO: string): Promise<void>;
  cancelScheduledSession(sessionId: string): Promise<void>;
  getLocalShieldState(): Promise<string>;
  getActivitySelectionSummary(): Promise<ActivitySelectionResult>;
  getScheduledSessions(): Promise<ScheduledNativeSession[]>;
}

export default requireNativeModule<LovelockShieldModule>('LovelockShield');
